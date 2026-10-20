/* ═══════════════════════════════════════════════════════════════════
   simulation.js — Automated Warehouse Core ABM Simulation Engine
   Author: Atif Ali Shah (@AtifAliShah)
   Manages fleet orchestration, order queues, dynamic task allocation
   (Nearest Robot vs Priority & Battery-Aware), and metrics logging.
   ═══════════════════════════════════════════════════════════════════ */

class WarehouseSimulation {
    constructor(config, seed) {
        this.seed = seed || 42;
        this.rng = createRNG(this.seed);
        this.config = Object.assign({
            robotCount: 12,
            orderRate: 1.0,
            strategy: 'priority_battery', // 'nearest' or 'priority_battery'
            robotSpeed: 1.0,
            batteryCapacity: 100
        }, config);

        this.world = new WarehouseWorld();
        this.robots = [];
        this.orderQueue = [];
        this.tick = 0;
        this.running = false;
        this.paused = false;
        this.speed = 1.0;

        this.stats = {};
        this.history = [];
        this.events = [];
        this.totalDelivered = 0;
        this.totalDistanceM = 0;
        this.totalEnergyKWh = 0;
        this.deliveryTimes = [];

        this._init();
    }

    _init() {
        this.robots = [];
        this.orderQueue = [];
        this.tick = 0;
        this.history = [];
        this.events = [];
        this.totalDelivered = 0;
        this.totalDistanceM = 0;
        this.totalEnergyKWh = 0;
        this.deliveryTimes = [];

        const rng = this.rng;

        // Spawn Fleet of Autonomous Mobile Robots (AMRs)
        const roles = ['transport', 'shelf_lifter', 'transport', 'sorting'];
        for (let i = 0; i < this.config.robotCount; i++) {
            const dock = this.world.chargingDocks[i % this.world.chargingDocks.length];
            const role = roles[i % roles.length];
            const isWest = dock.x < WAREHOUSE_W / 2;
            const spawnX = isWest ? dock.x + 36 : dock.x - 36;
            const bot = new RobotAgent(
                `AMR-${String(i + 1).padStart(2, '0')}`,
                spawnX,
                dock.y,
                role,
                createRNG(this.seed + i + 1000)
            );
            bot.angle = isWest ? 0 : Math.PI;
            this.robots.push(bot);
        }

        // Initialize pending orders from available in-stock warehouse packages
        this._replenishOrders();

        this._calcStats();
        this._addEvent('info', 'Fulfillment Center systems online. Robot fleet initialized.');
    }

    start() {
        this.running = true;
        this.paused = false;
        if (this.tick === 0) {
            this._addEvent('good', `Autonomous dispatch active using strategy: ${this.config.strategy.toUpperCase()}`);
        }
    }

    pause() { this.paused = !this.paused; }

    step() {
        this._tick();
    }

    _tick() {
        this.tick++;

        // 1. Task Dispatching: Assign pending orders to idle AMRs
        this._dispatchOrders();

        // 2. Update All Robot Agents
        for (const bot of this.robots) {
            bot.update(this.world, this.robots, this.config.strategy);
        }

        // 3. Update Human Warehouse Staff
        this.world.updateStaff(this.tick);

        // 4. Periodically replenish incoming customer shipment orders
        if (this.tick % 120 === 0) {
            this._replenishOrders();
        }

        // 4. Calculate real-time operational metrics
        this._calcStats();

        // 5. Record telemetry history for Chart.js
        if (this.tick % 15 === 0) {
            this.history.push({
                tick: this.tick,
                delivered: this.stats.completedDeliveries,
                activeRobots: this.stats.activeRobots,
                chargingRobots: this.stats.robotsCharging,
                pendingOrders: this.stats.pendingOrders,
                avgBattery: this.stats.avgBattery
            });
            if (this.history.length > 150) this.history.shift();
        }
    }

    _dispatchOrders() {
        const availableOrders = this.world.packages.filter(p => p.status === 'IN_STOCK' && !p.carriedBy);
        let idleRobots = this.robots.filter(r => r.state === 'IDLE' && r.battery > 25);

        if (availableOrders.length === 0 || idleRobots.length === 0) return;

        if (this.config.strategy === 'nearest') {
            // Strategy A: Nearest Robot
            for (const pkg of availableOrders) {
                if (idleRobots.length === 0) break;
                let closestBot = null;
                let minDist = Infinity;
                let closestIdx = -1;
                for (let i = 0; i < idleRobots.length; i++) {
                    const bot = idleRobots[i];
                    const d = dist(bot, pkg);
                    if (d < minDist) {
                        minDist = d;
                        closestBot = bot;
                        closestIdx = i;
                    }
                }
                if (closestBot && closestIdx >= 0) {
                    closestBot.assignOrder(pkg, this.world);
                    idleRobots.splice(closestIdx, 1);
                    this._addEvent('info', `Dispatched ${closestBot.id} (Nearest) to pick up parcel ${pkg.id}`);
                }
            }
        } else {
            // Strategy B: Priority & Battery Aware Strategy
            for (const pkg of availableOrders) {
                if (idleRobots.length === 0) break;
                let bestBot = null;
                let bestScore = -Infinity;
                let bestIdx = -1;

                const priorityWeight = pkg.priority === 'EXPRESS' ? 120 : (pkg.priority === 'STANDARD' ? 60 : 30);

                for (let i = 0; i < idleRobots.length; i++) {
                    const bot = idleRobots[i];
                    const travelDist = dist(bot, pkg);
                    const score = (bot.battery * 2.0) - (travelDist * 0.4) + priorityWeight;
                    if (score > bestScore) {
                        bestScore = score;
                        bestBot = bot;
                        bestIdx = i;
                    }
                }
                if (bestBot && bestIdx >= 0) {
                    bestBot.assignOrder(pkg, this.world);
                    idleRobots.splice(bestIdx, 1);
                    this._addEvent('good', `Optimized Dispatch: ${bestBot.id} assigned [${pkg.priority}] parcel ${pkg.id}`);
                }
            }
        }
    }

    _replenishOrders() {
        const inStockCount = this.world.packages.filter(p => p.status === 'IN_STOCK').length;
        if (inStockCount < 18) {
            // Add new shipment from Inbound Receiving Dock
            const dock = this.world.pickupStations[Math.floor(this.rng() * this.world.pickupStations.length)];
            const rack = this.world.racks[Math.floor(this.rng() * this.world.racks.length)];
            const dest = this.world.deliveryStations[Math.floor(this.rng() * this.world.deliveryStations.length)];

            const newPkg = {
                id: `PKG-${Math.floor(1000 + this.rng() * 9000)}`,
                name: "High-Priority Freight Consignment",
                x: rack.rect.x + 20 + Math.random() * (rack.rect.w - 40),
                y: rack.rect.y + 20 + Math.random() * (rack.rect.h - 40),
                rackId: rack.id,
                weightKg: (3 + Math.random() * 15).toFixed(1),
                priority: Math.random() < 0.35 ? 'EXPRESS' : 'STANDARD',
                status: 'IN_STOCK',
                carriedBy: null,
                destination: dest
            };
            this.world.packages.push(newPkg);
        }
    }

    _calcStats() {
        let active = 0, charging = 0, waiting = 0, blocked = 0;
        let totalBatt = 0, totalDist = 0, totalDeliv = 0;

        for (const b of this.robots) {
            totalBatt += b.battery;
            totalDist += b.totalDistanceMeters;
            totalDeliv += b.completedDeliveries;

            if (b.state === 'CHARGING') charging++;
            else if (b.state === 'SEEKING_CHARGER' || b.state === 'NAVIGATING_PICKUP' || b.state === 'NAVIGATING_DELIVERY') active++;
            else if (b.state === 'BLOCKED') blocked++;
            else waiting++;
        }

        const pending = this.world.packages.filter(p => p.status === 'IN_STOCK' || p.status === 'ASSIGNED').length;
        const n = Math.max(1, this.robots.length);

        this.stats = {
            totalRobots: n,
            activeRobots: active,
            robotsCharging: charging,
            robotsWaiting: waiting,
            robotsBlocked: blocked,
            pendingOrders: pending,
            completedDeliveries: totalDeliv,
            avgBattery: Math.round(totalBatt / n),
            totalDistanceM: Math.round(totalDist),
            totalEnergyKWh: (totalDist * 0.008).toFixed(2),
            avgDeliveryTimeSec: totalDeliv > 0 ? (this.tick / (totalDeliv * 60)).toFixed(1) : "0.0",
            strategy: this.config.strategy
        };
    }

    triggerNewOrder() {
        this._replenishOrders();
        this._addEvent('good', 'Manual order received! Registered to dispatch queue.');
    }

    triggerEmergencyCharge() {
        for (const b of this.robots) {
            b.battery = 15; // Force low battery protocol
        }
        this._addEvent('danger', 'Low-Battery Emergency Alert: All robots routing to docking pads.');
    }

    _addEvent(type, msg) {
        const mins = Math.floor(this.tick / 60 / 60);
        const secs = Math.floor(this.tick / 60) % 60;
        const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;
        this.events.unshift({ time: timeStr, type, msg });
        if (this.events.length > 50) this.events.length = 50;
    }

    reset(config) {
        if (config) this.config = Object.assign(this.config, config);
        this.rng = createRNG(this.seed);
        this.world = new WarehouseWorld();
        this.running = false;
        this.paused = false;
        this._init();
    }
}

// ═══════════════════════════════════════════════════════════════════
// Headless runner for ABM strategy comparisons
// ═══════════════════════════════════════════════════════════════════
function runWarehouseHeadless(config, seed, maxTicks) {
    const sim = new WarehouseSimulation(config, seed);
    sim.start();
    for (let i = 0; i < maxTicks; i++) {
        sim.step();
    }
    return {
        stats: { ...sim.stats },
        history: [...sim.history],
        ticks: sim.tick
    };
}
