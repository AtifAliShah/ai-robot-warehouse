/* ═══════════════════════════════════════════════════════════════════
   renderer.js — High-Detail Industrial Logistics Warehouse Renderer
   Author: Atif Ali Shah (@AtifAliShah)
   Renders automated logistics distribution center:
   - Polished epoxy floor with yellow hazard cross-hatch safety lanes
   - Industrial steel racks with multi-tier stocked parcel boxes
   - Sleek Autonomous Mobile Robots (AMRs) with glowing LED status bars
   - Visible cardboard shipping boxes riding on robot flatbeds
   - Animated conveyor rollers & fast-charging docking coils
   - Smooth camera pan & zoom controls (0.4x to 2.5x)
   ═══════════════════════════════════════════════════════════════════ */

class WarehouseRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Camera Pan & Zoom
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.targetPanX = 0;
        this.targetPanY = 0;
        this.selectedRobot = null;
        this.followSelected = false;

        this._resize();
    }

    _resize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth || 1200;
        this.canvas.height = container.clientHeight || 750;
    }

    render(sim) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Camera follow
        if (this.followSelected && this.selectedRobot) {
            this.targetPanX = w / 2 - this.selectedRobot.x * this.zoom;
            this.targetPanY = h / 2 - this.selectedRobot.y * this.zoom;
        }

        this.panX += (this.targetPanX - this.panX) * 0.15;
        this.panY += (this.targetPanY - this.panY) * 0.15;

        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);

        // 1. Draw Polished Epoxy Concrete Floor & Marked Safety Lanes
        this._drawFloorAndLanes(ctx, sim.world);

        // 2. Draw Charging Dock Pads (West & East)
        this._drawChargingDocks(ctx, sim.world, sim.tick);

        // 3. Draw Inbound & Outbound Conveyor Sorting Stations
        this._drawStationsAndConveyors(ctx, sim.world, sim.tick);

        // 4. Draw High-Bay Steel Storage Racks & Shelved Packages
        this._drawRacksAndStock(ctx, sim.world);

        // 5. Draw Blocked Aisle Barricades (if toggled)
        this._drawBlockades(ctx, sim.world);

        // 6. Draw Selected Robot Planned Route Line
        this._drawRouteLine(ctx);

        // 7. Draw Autonomous Mobile Robots (AMRs) with Carried Packages
        this._drawRobots(ctx, sim.robots, sim.tick);

        // 8. Draw Selection Reticle
        this._drawSelectionHUD(ctx);

        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════
    // FLOOR & SAFETY MARKINGS
    // ═══════════════════════════════════════════════════════════════════
    _drawFloorAndLanes(ctx, world) {
        // Polished industrial grey concrete floor
        ctx.fillStyle = '#1e2430';
        ctx.fillRect(0, 0, WAREHOUSE_W, WAREHOUSE_H);

        // Marked Robot Highways with Safety Hazard Yellow Striping
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (world.grid[r][c] === T_CELL.LANE) {
                    // Darker smooth epoxy travel strip
                    ctx.fillStyle = '#151a24';
                    ctx.fillRect(c * TILE, r * TILE, TILE, TILE);

                    // Yellow safety center dashed guide line
                    if (r % 2 === 0 || c % 2 === 0) {
                        ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
                        ctx.fillRect(c * TILE + TILE / 2 - 1, r * TILE + TILE / 2 - 1, 3, 3);
                    }
                }
            }
        }

        // Yellow Perimeter Warning Hazard Lines (// // //)
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.strokeRect(40, 40, WAREHOUSE_W - 80, WAREHOUSE_H - 80);
        ctx.setLineDash([]);
    }

    // ═══════════════════════════════════════════════════════════════════
    // CHARGING DOCKS
    // ═══════════════════════════════════════════════════════════════════
    _drawChargingDocks(ctx, world, tick) {
        for (const dock of world.chargingDocks) {
            const r = dock.rect;
            // Metal Induction Pad
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(r.x, r.y, r.w, r.h);
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(r.x, r.y, r.w, r.h);

            // Copper Induction Charging Coil
            ctx.strokeStyle = dock.occupiedBy ? '#4ade80' : '#166534';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(dock.x, dock.y, 8, 0, Math.PI * 2);
            ctx.stroke();

            // Pulsing LED charging indicator
            if (dock.occupiedBy) {
                const pulse = Math.sin(tick * 0.2) * 3;
                ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
                ctx.beginPath();
                ctx.arc(dock.x, dock.y, 4 + pulse, 0, Math.PI * 2);
                ctx.fill();
            }

            // Stencil
            ctx.fillStyle = '#64748b';
            ctx.font = '8px monospace';
            ctx.fillText(dock.id, r.x + 4, r.y + 10);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // STATIONS & ROLLER CONVEYOR BELTS
    // ═══════════════════════════════════════════════════════════════════
    _drawStationsAndConveyors(ctx, world, tick) {
        // Inbound Receiving Docks (North)
        for (const dock of world.pickupStations) {
            ctx.fillStyle = '#1e3a8a'; // Deep Cargo Blue
            ctx.fillRect(dock.rect.x, dock.rect.y, dock.rect.w, dock.rect.h);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.strokeRect(dock.rect.x, dock.rect.y, dock.rect.w, dock.rect.h);

            // Dock text
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText(dock.id, dock.x - 18, dock.y + 4);
        }

        // Outbound Dispatch Stations (South)
        for (const st of world.deliveryStations) {
            ctx.fillStyle = '#14532d'; // Shipping Green
            ctx.fillRect(st.rect.x, st.rect.y, st.rect.w, st.rect.h);
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.strokeRect(st.rect.x, st.rect.y, st.rect.w, st.rect.h);

            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText(st.id, st.x - 22, st.y + 4);
        }

        // Automated Motorized Roller Conveyor Belts
        for (const c of world.conveyors) {
            // Belt Frame
            ctx.fillStyle = '#334155';
            ctx.fillRect(c.x, c.y, c.w, c.h);

            // Rotating Conveyor Rollers
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.5;
            const rollerOffset = (tick * c.speed) % 10;
            for (let x = c.x + rollerOffset; x < c.x + c.w; x += 10) {
                ctx.beginPath();
                ctx.moveTo(x, c.y + 2);
                ctx.lineTo(x, c.y + c.h - 2);
                ctx.stroke();
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // HIGH-BAY STORAGE RACKS & CARDBOARD PACKAGES
    // ═══════════════════════════════════════════════════════════════════
    _drawRacksAndStock(ctx, world) {
        for (const rack of world.racks) {
            const r = rack.rect;

            // Rack Drop Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.fillRect(r.x + 6, r.y + 6, r.w, r.h);

            // Blue Powder-Coated Steel Frame
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(r.x, r.y, r.w, r.h);

            // Yellow Safety Crossbeams
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(r.x, r.y, r.w, r.h);

            // Horizontal Tier Shelves
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.5;
            for (let y = r.y + 25; y < r.y + r.h; y += 25) {
                ctx.beginPath();
                ctx.moveTo(r.x, y);
                ctx.lineTo(r.x + r.w, y);
                ctx.stroke();
            }

            // Aisle Label Plaque
            ctx.fillStyle = '#eab308';
            ctx.fillRect(r.x + 4, r.y + 4, 55, 14);
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 9px monospace';
            ctx.fillText(rack.label, r.x + 8, r.y + 14);
        }

        // Draw In-Stock Cardboard Packages resting on shelves
        for (const pkg of world.packages) {
            if (pkg.status === 'IN_STOCK' && !pkg.carriedBy) {
                this._drawCardboardBox(ctx, pkg.x, pkg.y, 14, 14, pkg.priority);
            }
        }
    }

    _drawCardboardBox(ctx, x, y, bw, bh, priority) {
        // Brown Corrugated Cardboard Base
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, 2);
        ctx.fill();

        // Brown Packing Tape Strip
        ctx.fillStyle = '#d97706';
        ctx.fillRect(x - bw / 2, y - 1.5, bw, 3);

        // White Barcode Shipping Label
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(x - bw / 2 + 2, y - bh / 2 + 2, 5, 4);

        // Priority Color Dot (Express = Red, Standard = Green, Bulk = Blue)
        ctx.fillStyle = priority === 'EXPRESS' ? '#ef4444' : (priority === 'STANDARD' ? '#22c55e' : '#3b82f6');
        ctx.beginPath();
        ctx.arc(x + bw / 2 - 3, y - bh / 2 + 3, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // ═══════════════════════════════════════════════════════════════════
    // BLOCKADES (TEMPORARY AISLE CLOSURES)
    // ═══════════════════════════════════════════════════════════════════
    _drawBlockades(ctx, world) {
        ctx.fillStyle = '#dc2626';
        for (const key of world.blockedAisles) {
            const [c, r] = key.split(',').map(Number);
            const bx = c * TILE;
            const by = r * TILE;

            // Barricade Cross
            ctx.fillRect(bx + 2, by + 2, TILE - 4, TILE - 4);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(bx + 4, by + 4); ctx.lineTo(bx + TILE - 4, by + TILE - 4);
            ctx.moveTo(bx + TILE - 4, by + 4); ctx.lineTo(bx + 4, by + TILE - 4);
            ctx.stroke();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ROUTE LINE (A* VISUALIZER FOR SELECTED ROBOT)
    // ═══════════════════════════════════════════════════════════════════
    _drawRouteLine(ctx) {
        if (!this.selectedRobot || !this.selectedRobot.path || this.selectedRobot.path.length === 0) return;
        const bot = this.selectedRobot;

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(bot.x, bot.y);
        for (let i = bot.currentWaypointIndex; i < bot.path.length; i++) {
            ctx.lineTo(bot.path[i].x, bot.path[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // ═══════════════════════════════════════════════════════════════════
    // AUTONOMOUS MOBILE ROBOTS (AMRs)
    // ═══════════════════════════════════════════════════════════════════
    _drawRobots(ctx, robots, tick) {
        for (const bot of robots) {
            ctx.save();
            ctx.translate(bot.x, bot.y);
            ctx.rotate(bot.angle);

            // Robot Drop Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.fillRect(-bot.w / 2 + 4, -bot.h / 2 + 4, bot.w, bot.h);

            // 2 Rubber Drive Wheels
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-bot.w / 2 + 8, -bot.h / 2 - 2, 10, 3);
            ctx.fillRect(-bot.w / 2 + 8, bot.h / 2 - 1, 10, 3);

            // Main Industrial Chassis (Yellow / White / Cyan body)
            ctx.fillStyle = bot.chassisColor;
            ctx.beginPath();
            ctx.roundRect(-bot.w / 2, -bot.h / 2, bot.w, bot.h, 5);
            ctx.fill();

            // Flat Payload Bed (Matte Black with rubber friction pads)
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.roundRect(-bot.w / 2 + 4, -bot.h / 2 + 3, bot.w - 8, bot.h - 6, 2);
            ctx.fill();

            // Front Optical LiDAR Scanner Puck
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.arc(bot.w / 2 - 3, 0, 3.5, 0, Math.PI * 2);
            ctx.fill();

            // Glowing LED Status Perimeter Light Strip
            ctx.strokeStyle = bot.statusLed;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(-bot.w / 2 + 1, -bot.h / 2 + 1, bot.w - 2, bot.h - 2, 4);
            ctx.stroke();

            // Visible Physical Cardboard Box on Robot Flatbed
            if (bot.carriedPackage) {
                this._drawCardboardBox(ctx, 0, 0, 16, 14, bot.carriedPackage.priority);
            }

            // Lifting Laser Beam Animation if lifting
            if (bot.state === 'LIFTING' || bot.state === 'DEPOSITING') {
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
                ctx.lineWidth = 1.5;
                const scanX = -bot.w / 2 + 6 + (tick % 15);
                ctx.beginPath();
                ctx.moveTo(scanX, -bot.h / 2 + 4);
                ctx.lineTo(scanX, bot.h / 2 - 4);
                ctx.stroke();
            }

            // Battery Meter Bar on rear of robot
            const bw = 14, bh = 3;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-bot.w / 2 + 4, -bh / 2, bw, bh);
            const bPct = Math.max(0, bot.battery / 100);
            ctx.fillStyle = bPct > 0.4 ? '#22c55e' : (bPct > 0.2 ? '#f59e0b' : '#ef4444');
            ctx.fillRect(-bot.w / 2 + 4, -bh / 2, bw * bPct, bh);

            ctx.restore();
        }
    }

    _drawSelectionHUD(ctx) {
        if (!this.selectedRobot) return;
        const b = this.selectedRobot;

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 24, 0, Math.PI * 2);
        ctx.stroke();

        // Corner crosshair brackets
        const sz = 28;
        ctx.strokeStyle = '#0284c7';
        ctx.beginPath();
        ctx.moveTo(b.x - sz, b.y - sz + 6); ctx.lineTo(b.x - sz, b.y - sz); ctx.lineTo(b.x - sz + 6, b.y - sz);
        ctx.moveTo(b.x + sz - 6, b.y - sz); ctx.lineTo(b.x + sz, b.y - sz); ctx.lineTo(b.x + sz, b.y - sz + 6);
        ctx.moveTo(b.x - sz, b.y + sz - 6); ctx.lineTo(b.x - sz, b.y + sz); ctx.lineTo(b.x - sz + 6, b.y + sz);
        ctx.moveTo(b.x + sz - 6, b.y + sz); ctx.lineTo(b.x + sz, b.y + sz); ctx.lineTo(b.x + sz, b.y + sz - 6);
        ctx.stroke();
    }
}
