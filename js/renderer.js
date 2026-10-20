/* ═══════════════════════════════════════════════════════════════════
   renderer.js — Ultra-Realistic Industrial Logistics Digital Twin
   Author: Atif Ali Shah (@AtifAliShah) — Agent-Based Modeling
   
   Renders a state-of-the-art automated fulfillment logistics center:
   • Polished epoxy concrete floor with slab expansion joints, wear marks
   • Yellow & black diagonal chevron hazard lines & green safety walkways
   • Inbound freight receiving docks with realistic semi-trailer trucks
   • High-bay multi-tier industrial steel pallet racks with Euro-pallets
   • Cardboard shipping parcels with barcodes, tape, and fragile markings
   • Specialized Autonomous Mobile Robots (AMRs / AGVs):
     - Kiva-style Drive Units with 3D chassis, headlights, brake lights, LiDAR
     - Robotic Pallet Forklifts with hydraulic masts and safety strobe beacons
     - Motorized scissor lift mechanism with dynamic shadow elevation
     - Real-time turn signal blinkers and directional headlights
   • Human warehouse staff (Supervisors & Packing Station Operators)
   • Motorized conveyor rollers with rotating reflections
   • Overhead high-bay industrial LED illumination & volumetric floor glow
   • Interactive holographic telemetry HUD & target reticle
   ═══════════════════════════════════════════════════════════════════ */

class WarehouseRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Camera Pan & Zoom (0.4x to 3.0x)
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.targetPanX = 0;
        this.targetPanY = 0;
        this.selectedRobot = null;
        this.followSelected = false;

        // Render animation ticks
        this.renderTick = 0;

        this._resize();
    }

    _resize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth || 1200;
        this.canvas.height = container.clientHeight || 750;
    }

    render(sim) {
        this.renderTick++;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const tick = sim.tick || this.renderTick;

        ctx.clearRect(0, 0, w, h);

        // Smooth camera follow target
        if (this.followSelected && this.selectedRobot) {
            this.targetPanX = w / 2 - this.selectedRobot.x * this.zoom;
            this.targetPanY = h / 2 - this.selectedRobot.y * this.zoom;
        }

        this.panX += (this.targetPanX - this.panX) * 0.16;
        this.panY += (this.targetPanY - this.panY) * 0.16;

        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);

        // 1. Polished Concrete Warehouse Floor & Structural Markings
        this._drawConcreteFloor(ctx, sim.world);

        // 2. Optical Navigation Fiducial QR Tags on Floor
        this._drawFloorFiducials(ctx, sim.world);

        // 3. Green Pedestrian Safety Walkways & Zebra Crossings
        this._drawPedestrianWalkways(ctx, sim.world);

        // 4. Inbound Freight Docks with Semi-Trailer Trucks
        this._drawInboundDocksAndTrucks(ctx, sim.world, tick);

        // 5. Charging Pad Banks (West & East Walls)
        this._drawChargingDocks(ctx, sim.world, tick);

        // 6. Outbound Packing Stations & Motorized Conveyors
        this._drawOutboundStationsAndConveyors(ctx, sim.world, tick);

        // 7. High-Bay Industrial Pallet Racks & Stocked Freight
        this._drawHighBayRacksAndFreight(ctx, sim.world);

        // 8. Ground Safety Bollards
        this._drawSafetyBollards(ctx, sim.world);

        // 9. Blocked Aisle Hazard Barricades & Traffic Cones
        this._drawBlockadesAndCones(ctx, sim.world, tick);

        // 10. Human Warehouse Staff (Supervisors & Packers)
        this._drawHumanStaff(ctx, sim.world, tick);

        // 11. Planned Route Navigation Breadcrumbs for Selected AMR
        this._drawRouteLine(ctx, tick);

        // 12. Autonomous Mobile Robots (AMRs / AGVs) with Headlights & Lifts
        this._drawRobots(ctx, sim.robots, tick);

        // 13. Overhead High-Bay LED Lighting Volumetric Sheen
        this._drawOverheadLighting(ctx, sim.world);

        // 14. Holographic Telemetry HUD Reticle
        this._drawSelectionHUD(ctx, tick);

        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════
    // 1. CONCRETE FLOOR & SAFETY MARKINGS
    // ═══════════════════════════════════════════════════════════════════
    _drawConcreteFloor(ctx, world) {
        // Base industrial epoxy floor with gradient
        const bgGrad = ctx.createLinearGradient(0, 0, WAREHOUSE_W, WAREHOUSE_H);
        bgGrad.addColorStop(0, '#1a202c');
        bgGrad.addColorStop(0.5, '#151b26');
        bgGrad.addColorStop(1, '#111722');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, WAREHOUSE_W, WAREHOUSE_H);

        // Concrete Slab Expansion Joints (100px x 100px grid tiles)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= WAREHOUSE_W; x += 100) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, WAREHOUSE_H);
            ctx.stroke();
        }
        for (let y = 0; y <= WAREHOUSE_H; y += 100) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(WAREHOUSE_W, y);
            ctx.stroke();
        }

        // Forklift Tire Wear & Skid Marks along busy highway intersections
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.lineWidth = 4;
        const skidSpots = [
            { x: 300, y: 150, r: 40 }, { x: 750, y: 450, r: 50 },
            { x: 1050, y: 450, r: 45 }, { x: 450, y: 750, r: 40 }
        ];
        for (const spot of skidSpots) {
            ctx.beginPath();
            ctx.arc(spot.x, spot.y, spot.r, 0.2, 1.8);
            ctx.stroke();
        }
        ctx.restore();

        // High-Traffic AMR Travel Highway Lanes
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (world.grid[r][c] === T_CELL.LANE) {
                    const lx = c * TILE;
                    const ly = r * TILE;

                    // Smooth dark epoxy travel strip
                    ctx.fillStyle = '#0f141d';
                    ctx.fillRect(lx, ly, TILE, TILE);

                    // Subtle center guide dash
                    if ((r % 2 === 0 && c % 2 === 0)) {
                        ctx.fillStyle = 'rgba(234, 179, 8, 0.3)';
                        ctx.fillRect(lx + TILE / 2 - 1, ly + TILE / 2 - 1, 2, 2);
                    }
                }
            }
        }

        // Yellow and Black Diagonal Hazard Striping along Facility Perimeter
        this._drawHazardStripeRect(ctx, 35, 35, WAREHOUSE_W - 70, WAREHOUSE_H - 70, 6);
    }

    _drawHazardStripeRect(ctx, x, y, w, h, thickness) {
        ctx.save();
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.35)';
        ctx.lineWidth = thickness;
        ctx.setLineDash([12, 12]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════
    // 2. FLOOR NAVIGATION FIDUCIAL MATRIX QR TAGS
    // ═══════════════════════════════════════════════════════════════════
    _drawFloorFiducials(ctx, world) {
        if (!world.floorFiducials) return;
        ctx.save();
        for (const tag of world.floorFiducials) {
            // White reflective square plate
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(tag.x - 4, tag.y - 4, 8, 8);

            // Black 2D QR matrix core
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(tag.x - 2, tag.y - 2, 4, 4);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(tag.x - 1, tag.y - 1, 2, 2);
        }
        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════
    // 3. GREEN PEDESTRIAN SAFETY WALKWAYS & CROSSINGS
    // ═══════════════════════════════════════════════════════════════════
    _drawPedestrianWalkways(ctx, world) {
        if (!world.pedestrianWalkways) return;
        ctx.save();

        for (const p of world.pedestrianWalkways) {
            // High-vis green epoxy coating
            ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
            ctx.fillRect(p.x, p.y, p.w, p.h);

            // Yellow warning side rails
            ctx.fillStyle = '#eab308';
            if (p.orientation === 'H') {
                ctx.fillRect(p.x, p.y, p.w, 1.5);
                ctx.fillRect(p.x, p.y + p.h - 1.5, p.w, 1.5);
            } else {
                ctx.fillRect(p.x, p.y, 1.5, p.h);
                ctx.fillRect(p.x + p.w - 1.5, p.y, 1.5, p.h);
            }

            // Pedestrian silhouette icon every 120px
            if (p.x % 150 === 0 && p.y % 100 < 30) {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 9px sans-serif';
                ctx.fillText('🚶', p.x + 6, p.y + 16);
            }
        }
        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════
    // 4. INBOUND FREIGHT DOCKS & LOGISTICS SEMI-TRUCKS
    // ═══════════════════════════════════════════════════════════════════
    _drawInboundDocksAndTrucks(ctx, world, tick) {
        // Semi-Trailer Trucks backed into the dock bays
        if (world.logisticsTrucks) {
            for (const truck of world.logisticsTrucks) {
                ctx.save();
                // Truck trailer body
                ctx.fillStyle = truck.color;
                ctx.beginPath();
                ctx.roundRect(truck.x - truck.w / 2, truck.y, truck.w, truck.h, [0, 0, 6, 6]);
                ctx.fill();

                // Stainless steel roof & aerodynamic ribbing
                ctx.fillStyle = '#cbd5e1';
                ctx.fillRect(truck.x - truck.w / 2 + 4, truck.y + 2, truck.w - 8, truck.h - 14);

                // Truck branding text
                ctx.save();
                ctx.fillStyle = '#0f172a';
                ctx.font = 'bold 8px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(truck.brand, truck.x, truck.y + 40);
                ctx.restore();

                // Red rear hazard lights
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(truck.x - truck.w / 2 + 4, truck.y + truck.h - 6, 8, 4);
                ctx.fillRect(truck.x + truck.w / 2 - 12, truck.y + truck.h - 6, 8, 4);

                ctx.restore();
            }
        }

        // Receiving Bay Platforms & Roll-up Sectional Garage Doors
        for (const dock of world.pickupStations) {
            const r = dock.rect;

            // Dock platform shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(r.x + 4, r.y + 4, r.w, r.h);

            // Heavy industrial steel dock plate
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(r.x, r.y, r.w, r.h);

            // Corrugated Steel Roll-up Door (slats)
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1;
            for (let y = r.y; y < r.y + 14; y += 3) {
                ctx.beginPath();
                ctx.moveTo(r.x, y);
                ctx.lineTo(r.x + r.w, y);
                ctx.stroke();
            }

            // Hydraulic Dock Leveler (Yellow bevel edge)
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(r.x + 12, r.y + 16, r.w - 24, r.h - 20);
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 2;
            ctx.strokeRect(r.x + 12, r.y + 16, r.w - 24, r.h - 20);

            // Dock Identification Plaque
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 9px monospace';
            ctx.fillText(dock.id, r.x + 16, r.y + 30);

            // Inbound Pallet Staging: Wooden Pallet with stacked cartons
            this._drawEuroPallet(ctx, r.x + r.w - 24, r.y + 26, 20, 16);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 5. CHARGING DOCKS (WEST & EAST PERIMETERS)
    // ═══════════════════════════════════════════════════════════════════
    _drawChargingDocks(ctx, world, tick) {
        for (const dock of world.chargingDocks) {
            const r = dock.rect;
            const isOcc = !!dock.occupiedBy;

            // Metallic floor indentation
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(r.x, r.y, r.w, r.h);

            // Yellow safety border
            ctx.strokeStyle = isOcc ? '#3b82f6' : '#eab308';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(r.x, r.y, r.w, r.h);

            // Dual Copper Induction Plates
            ctx.fillStyle = isOcc ? '#38bdf8' : '#b45309';
            ctx.fillRect(r.x + 6, r.y + 6, 12, r.h - 12);
            ctx.fillRect(r.x + r.w - 18, r.y + 6, 12, r.h - 12);

            // Animated Charging Energy Coils
            if (isOcc) {
                ctx.save();
                ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + 0.5 * Math.sin(tick * 0.2)})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(dock.x, dock.y, 16 + 4 * Math.sin(tick * 0.2), 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // Dock status LED & Voltage display
            ctx.fillStyle = isOcc ? '#38bdf8' : '#22c55e';
            ctx.beginPath();
            ctx.arc(r.x + r.w / 2, r.y + 6, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#94a3b8';
            ctx.font = '8px monospace';
            ctx.fillText(dock.id, r.x + r.w / 2 - 14, r.y + r.h - 4);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 6. OUTBOUND STATIONS & MOTORIZED CONVEYORS
    // ═══════════════════════════════════════════════════════════════════
    _drawOutboundStationsAndConveyors(ctx, world, tick) {
        // Motorized Steel Roller Conveyor Belts
        for (const conv of world.conveyors) {
            // Conveyor frame
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(conv.x, conv.y, conv.w, conv.h);
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(conv.x, conv.y, conv.w, conv.h);

            // Individual animated rollers with 3D reflection
            const rollerSpacing = 9;
            const rollerOffset = (tick * conv.speed) % rollerSpacing;

            for (let x = conv.x + rollerOffset; x < conv.x + conv.w; x += rollerSpacing) {
                // Steel cylindrical gradient
                const rGrad = ctx.createLinearGradient(x, conv.y, x + 3, conv.y);
                rGrad.addColorStop(0, '#64748b');
                rGrad.addColorStop(0.5, '#f1f5f9');
                rGrad.addColorStop(1, '#334155');
                ctx.fillStyle = rGrad;
                ctx.fillRect(x, conv.y + 2, 3, conv.h - 4);
            }
        }

        // Outbound Packing Benches & Barcode Laser Scanners
        for (const station of world.deliveryStations) {
            const r = station.rect;

            // Packing table base
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(r.x, r.y, r.w, r.h);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(r.x, r.y, r.w, r.h);

            // Computer monitor & dispatch manifest terminal
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(r.x + 6, r.y + 4, 18, 12);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(r.x + 8, r.y + 6, 14, 8); // Glowing green CRT screen

            // Overhead Barcode Scanner Gantry & Pulsing Laser Line
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(r.x + r.w / 2, r.y - 6);
            ctx.lineTo(r.x + r.w / 2, r.y);
            ctx.stroke();

            // Active Red Laser Scanner Targeting Beam
            const laserPhase = Math.sin(tick * 0.15);
            ctx.save();
            ctx.strokeStyle = `rgba(239, 68, 68, ${0.6 + 0.4 * laserPhase})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            const beamX = r.x + r.w / 2 + laserPhase * 14;
            ctx.moveTo(beamX, r.y);
            ctx.lineTo(beamX, r.y + r.h);
            ctx.stroke();
            ctx.restore();

            // Station Name Tag
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 8px monospace';
            ctx.fillText(station.id, r.x + 28, r.y + 14);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '7px sans-serif';
            ctx.fillText(`Pks: ${station.completedDeliveries}`, r.x + 28, r.y + 24);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 7. HIGH-BAY INDUSTRIAL PALLET RACKS & FREIGHT
    // ═══════════════════════════════════════════════════════════════════
    _drawHighBayRacksAndFreight(ctx, world) {
        for (const rack of world.racks) {
            const r = rack.rect;

            // Deep Rack Drop Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.fillRect(r.x + 8, r.y + 8, r.w, r.h);

            // High-Bay Rack Bay Footprint (Dark slate industrial floor)
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(r.x, r.y, r.w, r.h);

            // Blue Powder-Coated Steel Upright Columns (Heavy omega steel)
            ctx.fillStyle = '#1e3a8a';
            ctx.fillRect(r.x, r.y, 7, r.h);
            ctx.fillRect(r.x + r.w - 7, r.y, 7, r.h);

            // Safety Yellow Base Impact Protectors (Rack leg bumpers)
            ctx.fillStyle = '#eab308';
            ctx.fillRect(r.x - 2, r.y - 2, 11, 7);
            ctx.fillRect(r.x - 2, r.y + r.h - 5, 11, 7);
            ctx.fillRect(r.x + r.w - 9, r.y - 2, 11, 7);
            ctx.fillRect(r.x + r.w - 9, r.y + r.h - 5, 11, 7);

            // Safety Orange Horizontal Load Beams (Cross members)
            ctx.strokeStyle = '#ea580c';
            ctx.lineWidth = 3;
            for (let y = r.y + 24; y < r.y + r.h; y += 26) {
                ctx.beginPath();
                ctx.moveTo(r.x, y);
                ctx.lineTo(r.x + r.w, y);
                ctx.stroke();

                // Diagonal Truss Cross-Bracing
                ctx.save();
                ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(r.x + 8, y - 24);
                ctx.lineTo(r.x + r.w - 8, y);
                ctx.stroke();
                ctx.restore();
            }

            // Galvanized Wire Mesh Decking (Fine crosshatch)
            ctx.save();
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
            ctx.lineWidth = 0.8;
            for (let x = r.x + 12; x < r.x + r.w - 10; x += 12) {
                ctx.beginPath();
                ctx.moveTo(x, r.y + 4);
                ctx.lineTo(x, r.y + r.h - 4);
                ctx.stroke();
            }
            ctx.restore();

            // Aisle Location Identifier Plaque with Barcode
            ctx.fillStyle = '#eab308';
            ctx.fillRect(r.x + 4, r.y + 3, 64, 15);
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 9px monospace';
            ctx.fillText(rack.label, r.x + 8, r.y + 14);

            // Barcode lines on plaque
            ctx.fillStyle = '#0f172a';
            for (let b = 0; b < 6; b++) {
                ctx.fillRect(r.x + 50 + b * 2, r.y + 5, 1.2, 11);
            }
        }

        // Draw In-Stock Cardboard Packages & Pallets on shelves
        for (const pkg of world.packages) {
            if (pkg.status === 'IN_STOCK' && !pkg.carriedBy) {
                this._drawStockedFreight(ctx, pkg);
            }
        }
    }

    _drawStockedFreight(ctx, pkg) {
        if (pkg.type === 'euro_pallet') {
            this._drawEuroPallet(ctx, pkg.x, pkg.y, 22, 18);
            // Multi-box stacked cargo on pallet
            this._drawCardboardBox(ctx, pkg.x - 3, pkg.y - 3, 14, 12, pkg.priority, pkg.fragile);
            this._drawCardboardBox(ctx, pkg.x + 3, pkg.y + 2, 12, 10, pkg.priority, pkg.fragile);
        } else if (pkg.type === 'heavy_tote') {
            // Blue industrial plastic tote container
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.roundRect(pkg.x - 9, pkg.y - 7, 18, 14, 2);
            ctx.fill();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1;
            ctx.stroke();
        } else {
            // Cardboard Parcel Box
            this._drawCardboardBox(ctx, pkg.x, pkg.y, 16, 14, pkg.priority, pkg.fragile);
        }
    }

    _drawEuroPallet(ctx, x, y, pw, ph) {
        // Standard Wooden Euro-Pallet (3 longitudinal deck boards)
        ctx.save();
        ctx.fillStyle = '#b45309'; // Natural pine wood
        ctx.beginPath();
        ctx.roundRect(x - pw / 2, y - ph / 2, pw, ph, 2);
        ctx.fill();

        // Wooden Deck Board Planks
        ctx.fillStyle = '#d97706';
        ctx.fillRect(x - pw / 2 + 1, y - ph / 2 + 1, pw - 2, 3);
        ctx.fillRect(x - pw / 2 + 1, y - 1.5, pw - 2, 3);
        ctx.fillRect(x - pw / 2 + 1, y + ph / 2 - 4, pw - 2, 3);

        // Black corner blocks & fork notches
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x - pw / 2 + 2, y - ph / 2 + 4, 3, ph - 8);
        ctx.fillRect(x + pw / 2 - 5, y - ph / 2 + 4, 3, ph - 8);
        ctx.restore();
    }

    _drawCardboardBox(ctx, x, y, bw, bh, priority, fragile) {
        ctx.save();
        // Brown Corrugated Cardboard Base
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, 2);
        ctx.fill();

        // Brown Gummed Reinforced Packing Tape Strip
        ctx.fillStyle = '#d97706';
        ctx.fillRect(x - bw / 2, y - 1.5, bw, 3);

        // White Barcode Shipping Label
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(x - bw / 2 + 2, y - bh / 2 + 2, 6, 4.5);

        // Priority Badge Dot (Express = Red, Standard = Green, Bulk = Blue)
        ctx.fillStyle = priority === 'EXPRESS' ? '#ef4444' : (priority === 'STANDARD' ? '#22c55e' : '#3b82f6');
        ctx.beginPath();
        ctx.arc(x + bw / 2 - 3, y - bh / 2 + 3, 2, 0, Math.PI * 2);
        ctx.fill();

        // Fragile Glass Icon Stamp
        if (fragile) {
            ctx.fillStyle = '#ef4444';
            ctx.font = '7px sans-serif';
            ctx.fillText('🍷', x - 2, y + bh / 2 - 2);
        }
        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════
    // 8. GROUND SAFETY BOLLARDS
    // ═══════════════════════════════════════════════════════════════════
    _drawSafetyBollards(ctx, world) {
        if (!world.safetyBollards) return;
        for (const b of world.safetyBollards) {
            // Drop shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.arc(b.x + 2, b.y + 2, b.radius, 0, Math.PI * 2);
            ctx.fill();

            // Safety Yellow Steel Bollard
            ctx.fillStyle = '#eab308';
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();

            // Black reflective hazard band
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.8;
            ctx.stroke();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 9. AISLE BARRICADES & TRAFFIC CONES
    // ═══════════════════════════════════════════════════════════════════
    _drawBlockadesAndCones(ctx, world, tick) {
        for (const key of world.blockedAisles) {
            const [c, r] = key.split(',').map(Number);
            const bx = c * TILE;
            const by = r * TILE;

            // Hazard Crosshatch Zone
            ctx.save();
            ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
            ctx.fillRect(bx, by, TILE, TILE);

            // Orange & White Traffic Cones at corners
            this._drawTrafficCone(ctx, bx + 6, by + 6);
            this._drawTrafficCone(ctx, bx + TILE - 6, by + TILE - 6);

            // Striped Warning Barricade Rail
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(bx + 3, by + 3); ctx.lineTo(bx + TILE - 3, by + TILE - 3);
            ctx.moveTo(bx + TILE - 3, by + 3); ctx.lineTo(bx + 3, by + TILE - 3);
            ctx.stroke();
            ctx.restore();
        }
    }

    _drawTrafficCone(ctx, x, y) {
        ctx.save();
        // Cone base
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(x - 4, y - 4, 8, 8);
        // Orange body with white reflective ring
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════
    // 10. HUMAN WAREHOUSE STAFF (SUPERVISORS & PACKERS)
    // ═══════════════════════════════════════════════════════════════════
    _drawHumanStaff(ctx, world, tick) {
        // Walking Safety Supervisors
        if (world.supervisors) {
            for (const sup of world.supervisors) {
                this._drawHumanFigure(ctx, sup.x, sup.y, sup.dir === 1 ? 0 : Math.PI, sup.vestColor, sup.helmetColor, true, sup.walkCycle);
            }
        }

        // Packing Station Operators
        if (world.stationWorkers) {
            for (const op of world.stationWorkers) {
                this._drawHumanFigure(ctx, op.x, op.y, op.angle, op.vestColor, op.helmetColor, false, 0);
            }
        }
    }

    _drawHumanFigure(ctx, x, y, angle, vestColor, helmetColor, isWalking, walkCycle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Animated leg swing if walking
        const legSwing = isWalking ? Math.sin(walkCycle) * 4 : 0;
        ctx.fillStyle = '#1e293b'; // Navy work trousers
        ctx.fillRect(-4 + legSwing, -6, 3, 5);
        ctx.fillRect(1 - legSwing, -6, 3, 5);

        // Torso with High-Visibility Safety Vest
        ctx.fillStyle = vestColor || '#22c55e';
        ctx.beginPath();
        ctx.roundRect(-6, -6, 12, 12, 3);
        ctx.fill();

        // Silver reflective vest stripes
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-5, -3, 10, 1.5);
        ctx.fillRect(-5, 2, 10, 1.5);

        // Safety Hard Hat / Head
        ctx.fillStyle = helmetColor || '#facc15';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Hard hat brim
        ctx.fillRect(0, -3.5, 4, 7);

        // Inspection tablet or scanner in hand
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(5, -2, 4, 3);

        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════
    // 11. ROUTE NAVIGATION LINE FOR SELECTED ROBOT
    // ═══════════════════════════════════════════════════════════════════
    _drawRouteLine(ctx, tick) {
        if (!this.selectedRobot || !this.selectedRobot.path || this.selectedRobot.path.length === 0) return;
        const bot = this.selectedRobot;

        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -tick * 0.8;
        ctx.beginPath();
        ctx.moveTo(bot.x, bot.y);
        for (let i = bot.currentWaypointIndex; i < bot.path.length; i++) {
            ctx.lineTo(bot.path[i].x, bot.path[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════
    // 12. AUTONOMOUS MOBILE ROBOTS (AMRs / AGVs)
    // ═══════════════════════════════════════════════════════════════════
    _drawRobots(ctx, robots, tick) {
        for (const bot of robots) {
            ctx.save();
            ctx.translate(bot.x, bot.y);
            ctx.rotate(bot.angle);

            // 1. Dynamic Directional Headlight Light Cones onto Floor
            this._drawRobotHeadlights(ctx, bot);

            // 2. Dynamic Drop Shadow (Scales with lift altitude)
            const shadowOffset = 4 + bot.liftProgress * 3;
            ctx.fillStyle = `rgba(0, 0, 0, ${0.45 - bot.liftProgress * 0.1})`;
            ctx.beginPath();
            ctx.roundRect(-bot.w / 2 + shadowOffset, -bot.h / 2 + shadowOffset, bot.w, bot.h, 6);
            ctx.fill();

            // 3. Render Robot by Model Type
            if (bot.modelType === 'forklift') {
                this._drawForkliftAGV(ctx, bot, tick);
            } else if (bot.modelType === 'sorting') {
                this._drawSortingAMR(ctx, bot, tick);
            } else {
                this._drawKivaDriveUnit(ctx, bot, tick);
            }

            // 4. Carried Payload with Elevation Altitude & Physical Shadows
            if (bot.carriedPackage) {
                this._drawCarriedPayload(ctx, bot);
            }

            // 5. Rear Brake Lights (Flare crimson red when decelerating or blocked)
            this._drawBrakeAndTailLights(ctx, bot);

            // 6. Turn Blinkers (Amber flashing when cornering)
            this._drawTurnBlinkers(ctx, bot, tick);

            ctx.restore();
        }
    }

    _drawRobotHeadlights(ctx, bot) {
        // High-intensity forward LED headlights casting light cone
        ctx.save();
        const beamGrad = ctx.createRadialGradient(bot.w / 2, 0, 2, bot.w / 2 + 55, 0, 65);
        beamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        beamGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.25)');
        beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');

        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(bot.w / 2, -bot.h / 2 + 3);
        ctx.lineTo(bot.w / 2 + 75, -28);
        ctx.lineTo(bot.w / 2 + 75, 28);
        ctx.lineTo(bot.w / 2, bot.h / 2 - 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    _drawKivaDriveUnit(ctx, bot, tick) {
        // Dual heavy-duty rubber drive wheels with tread
        ctx.fillStyle = '#090d16';
        ctx.fillRect(-bot.w / 2 + 9, -bot.h / 2 - 3, 12, 3.5);
        ctx.fillRect(-bot.w / 2 + 9, bot.h / 2 - 0.5, 12, 3.5);

        // Tread grooves
        ctx.fillStyle = '#475569';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(-bot.w / 2 + 10 + i * 4, -bot.h / 2 - 3, 1.5, 3.5);
            ctx.fillRect(-bot.w / 2 + 10 + i * 4, bot.h / 2 - 0.5, 1.5, 3.5);
        }

        // Main Industrial Kiva Chassis (Curved high-grade polymer)
        const chassisGrad = ctx.createLinearGradient(-bot.w / 2, -bot.h / 2, bot.w / 2, bot.h / 2);
        chassisGrad.addColorStop(0, '#f97316'); // Bright safety orange
        chassisGrad.addColorStop(0.5, '#ea580c');
        chassisGrad.addColorStop(1, '#c2410c');
        ctx.fillStyle = chassisGrad;
        ctx.beginPath();
        ctx.roundRect(-bot.w / 2, -bot.h / 2, bot.w, bot.h, 6);
        ctx.fill();

        // 360-Degree Glowing Perimeter Status Halo Ring
        ctx.strokeStyle = bot.statusLed;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-bot.w / 2 + 1, -bot.h / 2 + 1, bot.w - 2, bot.h - 2, 5);
        ctx.stroke();

        // Flat Motorized Scissor Lift Bed (Matte black friction rubber)
        const liftElev = bot.liftProgress * 3;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(-bot.w / 2 + 5 - liftElev, -bot.h / 2 + 4, bot.w - 10, bot.h - 8, 3);
        ctx.fill();

        // Rotating LiDAR Sensor Turret with Sweeping Arc Beam
        this._drawLidarTurret(ctx, bot.w / 2 - 5, 0, bot.lidarAngle, bot.statusLed);

        // Emergency Stop Red Mushroom Button
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(-bot.w / 2 + 8, -bot.h / 2 + 7, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Battery State-of-Charge LED Bar
        this._drawBatteryBar(ctx, -bot.w / 2 + 6, bot.h / 2 - 7, 14, 3, bot.battery);
    }

    _drawForkliftAGV(ctx, bot, tick) {
        // Dual Chrome Steel Lifting Forks extending forward
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(bot.w / 2 - 6, -bot.h / 2 + 4, 16, 3.5);
        ctx.fillRect(bot.w / 2 - 6, bot.h / 2 - 7.5, 16, 3.5);

        // Vertical Hydraulic Mast Rails
        ctx.fillStyle = '#475569';
        ctx.fillRect(bot.w / 2 - 10, -bot.h / 2 + 2, 5, bot.h - 4);

        // Main Heavy Counterweight Chassis (Safety Yellow)
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.roundRect(-bot.w / 2, -bot.h / 2, bot.w - 8, bot.h, 5);
        ctx.fill();

        // Rear Cast Iron Counterweight
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-bot.w / 2 + 2, -bot.h / 2 + 3, 10, bot.h - 6);

        // Flashing Amber Rotating Strobe Beacon on Roof
        const strobeGlow = Math.sin(tick * 0.3) > 0 ? 1 : 0.2;
        ctx.fillStyle = `rgba(245, 158, 11, ${strobeGlow})`;
        ctx.beginPath();
        ctx.arc(-2, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 360-degree Status Halo
        ctx.strokeStyle = bot.statusLed;
        ctx.lineWidth = 1.8;
        ctx.strokeRect(-bot.w / 2 + 1, -bot.h / 2 + 1, bot.w - 10, bot.h - 2);

        // Battery Gauge
        this._drawBatteryBar(ctx, -bot.w / 2 + 14, bot.h / 2 - 7, 14, 3, bot.battery);
    }

    _drawSortingAMR(ctx, bot, tick) {
        // High-Tech Cyan Body
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.roundRect(-bot.w / 2, -bot.h / 2, bot.w, bot.h, 5);
        ctx.fill();

        // Motorized Roller Bed on top
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-bot.w / 2 + 4, -bot.h / 2 + 3, bot.w - 8, bot.h - 6);

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        for (let x = -bot.w / 2 + 6; x < bot.w / 2 - 4; x += 4) {
            ctx.beginPath();
            ctx.moveTo(x, -bot.h / 2 + 4);
            ctx.lineTo(x, bot.h / 2 - 4);
            ctx.stroke();
        }

        // Status Halo & Battery
        ctx.strokeStyle = bot.statusLed;
        ctx.lineWidth = 1.8;
        ctx.strokeRect(-bot.w / 2 + 1, -bot.h / 2 + 1, bot.w - 2, bot.h - 2);
        this._drawBatteryBar(ctx, -bot.w / 2 + 6, bot.h / 2 - 7, 14, 3, bot.battery);
    }

    _drawLidarTurret(ctx, x, y, angle, statusLed) {
        ctx.save();
        // Turret housing
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Sweeping LiDAR Laser Arc
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, 22, angle - 0.35, angle + 0.35);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    _drawCarriedPayload(ctx, bot) {
        const pkg = bot.carriedPackage;
        // Dynamic elevation altitude (Box lifts off robot bed with lift progress)
        const altitude = bot.liftProgress * 5;

        ctx.save();
        ctx.translate(-altitude, 0); // Elevation offset

        if (pkg.type === 'euro_pallet') {
            this._drawEuroPallet(ctx, 0, 0, 24, 18);
            this._drawCardboardBox(ctx, -2, -2, 14, 12, pkg.priority, pkg.fragile);
        } else {
            this._drawCardboardBox(ctx, 0, 0, 18, 15, pkg.priority, pkg.fragile);
        }
        ctx.restore();
    }

    _drawBrakeAndTailLights(ctx, bot) {
        // Red Tail/Brake LEDs on rear corners
        const brakeGlow = bot.isBraking ? 1.0 : 0.4;
        ctx.fillStyle = `rgba(239, 68, 68, ${brakeGlow})`;
        ctx.fillRect(-bot.w / 2, -bot.h / 2 + 3, 2.5, 4);
        ctx.fillRect(-bot.w / 2, bot.h / 2 - 7, 2.5, 4);

        if (bot.isBraking) {
            // Bright red brake flare on ground
            ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
            ctx.beginPath();
            ctx.arc(-bot.w / 2 - 4, 0, 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawTurnBlinkers(ctx, bot, tick) {
        if (bot.turnBlinker === 'none') return;
        const blink = Math.sin(tick * 0.3) > 0;
        if (!blink) return;

        ctx.fillStyle = '#f59e0b'; // Amber blinker
        if (bot.turnBlinker === 'right') {
            ctx.fillRect(bot.w / 2 - 3, bot.h / 2 - 4, 3, 3);
        } else if (bot.turnBlinker === 'left') {
            ctx.fillRect(bot.w / 2 - 3, -bot.h / 2 + 1, 3, 3);
        }
    }

    _drawBatteryBar(ctx, x, y, w, h, battery) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x, y, w, h);
        const pct = Math.max(0, Math.min(100, battery)) / 100;
        ctx.fillStyle = pct > 0.4 ? '#22c55e' : (pct > 0.2 ? '#f59e0b' : '#ef4444');
        ctx.fillRect(x, y, w * pct, h);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 13. OVERHEAD HIGH-BAY LED LIGHTING SHEEN
    // ═══════════════════════════════════════════════════════════════════
    _drawOverheadLighting(ctx, world) {
        if (!world.overheadLights) return;
        ctx.save();
        for (const light of world.overheadLights) {
            // Soft conical light bloom on polished floor
            const bloom = ctx.createRadialGradient(light.x, light.y, 10, light.x, light.y, light.radius);
            bloom.addColorStop(0, `rgba(255, 255, 255, ${light.intensity})`);
            bloom.addColorStop(0.5, `rgba(56, 189, 248, ${light.intensity * 0.4})`);
            bloom.addColorStop(1, 'rgba(56, 189, 248, 0)');

            ctx.fillStyle = bloom;
            ctx.beginPath();
            ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════
    // 14. HOLOGRAPHIC TELEMETRY HUD & TARGET RETICLE
    // ═══════════════════════════════════════════════════════════════════
    _drawSelectionHUD(ctx, tick) {
        if (!this.selectedRobot) return;
        const b = this.selectedRobot;

        ctx.save();
        // Rotating Outer Rangefinder Reticle
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 28, 0, Math.PI * 2);
        ctx.stroke();

        // 4 Precision Corner Crosshairs
        const sz = 32;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x - sz, b.y - sz + 7); ctx.lineTo(b.x - sz, b.y - sz); ctx.lineTo(b.x - sz + 7, b.y - sz);
        ctx.moveTo(b.x + sz - 7, b.y - sz); ctx.lineTo(b.x + sz, b.y - sz); ctx.lineTo(b.x + sz, b.y - sz + 7);
        ctx.moveTo(b.x - sz, b.y + sz - 7); ctx.lineTo(b.x - sz, b.y + sz); ctx.lineTo(b.x - sz + 7, b.y + sz);
        ctx.moveTo(b.x + sz - 7, b.y + sz); ctx.lineTo(b.x + sz, b.y + sz); ctx.lineTo(b.x + sz, b.y + sz - 7);
        ctx.stroke();

        // Floating Target Telemetry Plaque
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(b.x + 36, b.y - 28, 120, 56, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`UNIT: ${b.id}`, b.x + 42, b.y - 14);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '8px monospace';
        ctx.fillText(`ROLE: ${b.role.toUpperCase()}`, b.x + 42, b.y - 4);
        ctx.fillText(`SPD: ${(b.speed * 0.9).toFixed(1)} m/s`, b.x + 42, b.y + 6);
        ctx.fillText(`BATT: ${Math.round(b.battery)}%`, b.x + 42, b.y + 16);

        if (b.carriedPackage) {
            ctx.fillStyle = '#22c55e';
            ctx.fillText(`LOAD: ${b.carriedPackage.weightKg} kg`, b.x + 42, b.y + 24);
        }

        ctx.restore();
    }
}
