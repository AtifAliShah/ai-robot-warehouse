/* ═══════════════════════════════════════════════════════════════════
   agents.js — Autonomous Mobile Robots (AMRs) & Physical Package Logistics
   Author: Atif Ali Shah (@AtifAliShah)
   Detailed autonomous logistics agents featuring:
   - Kinematic driving with heading orientation & speed acceleration
   - Battery consumption & autonomous recharge thresholds
   - Multi-role robot models (Transport, Shelf Lifter, Sorting, Maintenance)
   - Real physical package attachment & release mechanics
   - Proximity radar collision avoidance & dynamic A* route tracking
   ═══════════════════════════════════════════════════════════════════ */

function createRNG(seed) {
    let s = (seed | 0) || 98765;
    return function() {
        s |= 0; s = s + 0x6D2B79F5 | 0;
        let t = Math.imul(s ^ s >>> 15, 1 | s);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function angleBetween(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }

class RobotAgent {
    constructor(id, x, y, role, rng) {
        this.id = id;
        this.role = role || 'transport'; // 'transport', 'shelf_lifter', 'sorting', 'maintenance'
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.targetAngle = 0;
        this.speed = 0;
        this.maxSpeed = this.role === 'sorting' ? 2.6 : (this.role === 'shelf_lifter' ? 1.6 : 2.1);
        this.accel = 0.08;
        this.rng = rng;

        // Visual Chassis Specs
        this.w = 34;
        this.h = 24;
        this.chassisColor = this.role === 'transport' ? '#eab308' : (this.role === 'sorting' ? '#0284c7' : (this.role === 'shelf_lifter' ? '#ea580c' : '#10b981'));
        this.accentColor = '#1e293b';

        // Battery System
        this.battery = 75 + rng() * 25; // 0 - 100%
        this.maxBattery = 100;
        this.lowBatteryThreshold = 22; // Triggers autonomous dock search
        this.chargingDock = null;

        // Task & Operational State
        // 'IDLE', 'NAVIGATING_PICKUP', 'LIFTING', 'NAVIGATING_DELIVERY', 'DEPOSITING', 'SEEKING_CHARGER', 'CHARGING', 'BLOCKED'
        this.state = 'IDLE';
        this.currentTask = null;
        this.carriedPackage = null;
        this.destination = null;
        this.path = []; // A* waypoints
        this.currentWaypointIndex = 0;

        // Telemetry & Metrics
        this.totalDistanceMeters = 0;
        this.completedDeliveries = 0;
        this.blockedTicks = 0;
        this.statusLed = '#38bdf8'; // Blue active, Green charging, Amber waiting, Red fault
        this.statusMessage = "Online: Standby for dispatch";
        this.actionTimer = 0;
    }

    update(world, allRobots, taskAssignmentStrategy) {
        // 1. Battery Drain (Higher drain when carrying heavy packages)
        if (this.state !== 'CHARGING') {
            const payloadDrain = this.carriedPackage ? 0.015 : 0.008;
            this.battery = Math.max(0, this.battery - (this.speed > 0 ? payloadDrain : 0.002));
        }

        // 2. Critical Battery Protocol -> Seek Charging Station
        if (this.battery <= this.lowBatteryThreshold && this.state !== 'CHARGING' && this.state !== 'SEEKING_CHARGER') {
            const dock = world.getClosestAvailableCharger(this);
            if (dock) {
                this.chargingDock = dock;
                dock.occupiedBy = this;
                this.state = 'SEEKING_CHARGER';
                this.statusMessage = `Battery Low (${Math.round(this.battery)}%): Routing to Dock ${dock.id}`;
                this.path = world.findPath(this.x, this.y, dock.x, dock.y);
                this.currentWaypointIndex = 0;
            }
        }

        // 3. Finite State Machine Logic
        switch (this.state) {
            case 'IDLE':
                this.statusLed = '#38bdf8';
                this.speed = 0;
                this.statusMessage = "Standing by for orders";
                break;

            case 'NAVIGATING_PICKUP':
                this.statusLed = '#38bdf8';
                this._followPath(world, allRobots, () => {
                    this.state = 'LIFTING';
                    this.actionTimer = 35; // 35 ticks to load package
                    this.statusMessage = `Lifting parcel ${this.currentTask.id}`;
                });
                break;

            case 'LIFTING':
                this.statusLed = '#facc15';
                this.speed = 0;
                this.actionTimer--;
                if (this.actionTimer <= 0) {
                    // Attach package
                    this.carriedPackage = this.currentTask;
                    this.carriedPackage.status = 'IN_TRANSIT';
                    this.carriedPackage.carriedBy = this;

                    // Plan route to Outbound Dispatch Station
                    const dest = this.carriedPackage.destination;
                    this.destination = dest;
                    this.state = 'NAVIGATING_DELIVERY';
                    this.statusMessage = `Transporting ${this.carriedPackage.id} to ${dest.name}`;
                    this.path = world.findPath(this.x, this.y, dest.x, dest.y);
                    this.currentWaypointIndex = 0;
                }
                break;

            case 'NAVIGATING_DELIVERY':
                this.statusLed = '#38bdf8';
                // Move carried package with robot
                if (this.carriedPackage) {
                    this.carriedPackage.x = this.x;
                    this.carriedPackage.y = this.y;
                }
                this._followPath(world, allRobots, () => {
                    this.state = 'DEPOSITING';
                    this.actionTimer = 30; // 30 ticks to offload onto conveyor
                    this.statusMessage = `Offloading parcel onto conveyor`;
                });
                break;

            case 'DEPOSITING':
                this.statusLed = '#4ade80';
                this.speed = 0;
                this.actionTimer--;
                if (this.actionTimer <= 0) {
                    if (this.carriedPackage) {
                        this.carriedPackage.status = 'DELIVERED';
                        this.carriedPackage.carriedBy = null;
                        this.carriedPackage = null;
                        this.completedDeliveries++;
                    }
                    this.currentTask = null;
                    this.destination = null;
                    this.state = 'IDLE';
                    this.statusMessage = "Order complete. Ready for next task.";
                }
                break;

            case 'SEEKING_CHARGER':
                this.statusLed = '#f59e0b';
                this._followPath(world, allRobots, () => {
                    this.state = 'CHARGING';
                    this.speed = 0;
                    this.statusMessage = `Fast-Charging active on ${this.chargingDock.id}`;
                });
                break;

            case 'CHARGING':
                this.statusLed = '#22c55e'; // Bright green
                this.speed = 0;
                if (this.chargingDock) {
                    this.battery = Math.min(100, this.battery + this.chargingDock.chargeRate);
                }
                if (this.battery >= 98) {
                    if (this.chargingDock) {
                        this.chargingDock.occupiedBy = null;
                        this.chargingDock = null;
                    }
                    this.state = 'IDLE';
                    this.statusMessage = "Battery 100% full. Resuming active logistics.";
                }
                break;

            case 'BLOCKED':
                this.statusLed = '#ef4444';
                this.speed = 0;
                this.blockedTicks++;
                if (this.blockedTicks > 40) {
                    // Attempt dynamic reroute via A*
                    if (this.destination) {
                        this.path = world.findPath(this.x, this.y, this.destination.x, this.destination.y);
                        this.currentWaypointIndex = 0;
                        this.state = this.carriedPackage ? 'NAVIGATING_DELIVERY' : 'NAVIGATING_PICKUP';
                        this.statusMessage = "Recalculating alternative route around blockage...";
                    } else {
                        this.state = 'IDLE';
                    }
                    this.blockedTicks = 0;
                }
                break;
        }
    }

    _followPath(world, allRobots, onArrive) {
        if (!this.path || this.currentWaypointIndex >= this.path.length) {
            if (onArrive) onArrive();
            return;
        }

        const targetWp = this.path[this.currentWaypointIndex];
        const d = dist(this, targetWp);

        // Advance to next waypoint if reached
        if (d < 14) {
            this.currentWaypointIndex++;
            if (this.currentWaypointIndex >= this.path.length) {
                if (onArrive) onArrive();
                return;
            }
        }

        // 4. Proximity Radar Collision Avoidance with other AMRs
        for (const other of allRobots) {
            if (other === this || other.state === 'CHARGING') continue;
            const rDist = dist(this, other);
            if (rDist < 36) {
                // If heading into each other, yield priority based on robot ID
                const toOtherAngle = angleBetween(this, other);
                const angleDiff = Math.abs(toOtherAngle - this.angle);
                if (angleDiff < 1.0) {
                    if (this.id > other.id) {
                        // Yield & wait
                        this.speed = Math.max(0, this.speed - 0.2);
                        this.statusLed = '#f59e0b';
                        this.statusMessage = `Yielding right-of-way to ${other.id}`;
                        return;
                    }
                }
            }
        }

        // Steer towards target waypoint
        this.targetAngle = angleBetween(this, targetWp);

        let diff = this.targetAngle - this.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.angle += diff * 0.15;

        // Accelerate
        this.speed = Math.min(this.maxSpeed, this.speed + this.accel);

        const vx = Math.cos(this.angle) * this.speed;
        const vy = Math.sin(this.angle) * this.speed;
        const nx = this.x + vx;
        const ny = this.y + vy;

        if (world.isNavigable(nx, ny)) {
            this.x = nx;
            this.y = ny;
            this.totalDistanceMeters += (this.speed * 0.1);
        } else {
            // Blocked by rack or user obstacle
            this.state = 'BLOCKED';
            this.statusMessage = "Aisle blocked! Waiting for clearance.";
        }
    }

    assignOrder(pkg, world) {
        this.currentTask = pkg;
        pkg.status = 'ASSIGNED';
        this.destination = { x: pkg.x, y: pkg.y };
        this.state = 'NAVIGATING_PICKUP';
        this.statusMessage = `Assigned parcel ${pkg.id}. Routing to pickup at ${pkg.rackId}`;
        this.path = world.findPath(this.x, this.y, pkg.x, pkg.y);
        this.currentWaypointIndex = 0;
    }
}
