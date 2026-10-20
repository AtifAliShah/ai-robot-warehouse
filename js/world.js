/* ═══════════════════════════════════════════════════════════════════
   world.js — Automated Logistics Warehouse Environment
   Author: Atif Ali Shah (@AtifAliShah)
   Industrial fulfillment distribution center featuring:
   - High-bay steel storage racks with tiered parcel boxes
   - Inbound receiving dock with pallet staging
   - Outbound dispatch conveyor belts and packing stations
   - Fast-charging AMR docking pads with LED contact indicators
   - Floor safety lanes, directional arrows & dynamic aisle blockades
   - Built-in A* pathfinding navigation graph
   ═══════════════════════════════════════════════════════════════════ */

const WAREHOUSE_W = 1600;
const WAREHOUSE_H = 1000;
const TILE = 25;
const COLS = Math.floor(WAREHOUSE_W / TILE); // 64 cols
const ROWS = Math.floor(WAREHOUSE_H / TILE); // 40 rows

const T_CELL = {
    FLOOR: 0,
    LANE: 1,
    RACK: 2,
    INBOUND_DOCK: 3,
    OUTBOUND_STATION: 4,
    CHARGING_DOCK: 5,
    CONVEYOR: 6,
    BLOCKED: 7,
    WALKWAY: 8
};

class WarehouseWorld {
    constructor() {
        this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(T_CELL.FLOOR));
        this.racks = [];
        this.chargingDocks = [];
        this.pickupStations = [];
        this.deliveryStations = [];
        this.conveyors = [];
        this.blockedAisles = new Set(); // Set of "col,row" strings
        this.packages = [];
        this.props = [];
        this.pedestrianWalkways = [];
        this.overheadLights = [];
        this.logisticsTrucks = [];
        this.supervisors = [];
        this.stationWorkers = [];
        this.pallets = [];
        this.safetyBollards = [];
        this.floorFiducials = [];

        this.generate();
    }

    generate() {
        // 1. Build Base Concrete Floor, Travel Highways and Green Safety Walkways
        this._buildFloorsAndLanes();

        // 2. Build High-Bay Industrial Storage Racks (Aisles A1-A4, B1-B4)
        this._buildStorageRacks();

        // 3. Build Inbound Receiving Docks (North) & Logistics Semi-Trucks
        this._buildInboundDocks();

        // 4. Build Outbound Packing & Dispatch Stations (South)
        this._buildOutboundStations();

        // 5. Build Autonomous Charging Docks (West & East perimeters)
        this._buildChargingDocks();

        // 6. Build Overhead Industrial LED High-Bay Lights
        this._buildOverheadLighting();

        // 7. Build Ground Safety Bollards & Floor Navigation Fiducial Matrix Tags
        this._buildFixturesAndFiducials();

        // 8. Populate Initial Stock of Physical Cardboard Parcel Boxes and Pallets
        this._populateInitialPackages();

        // 9. Spawn Human Warehouse Supervisors & Packing Station Operators
        this._spawnHumanStaff();
    }

    _buildFloorsAndLanes() {
        // Default floor
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                this.grid[r][c] = T_CELL.FLOOR;
            }
        }

        // Horizontal Highway Lanes (Rows: 5-6, 17-18, 29-30, 37-38)
        [5, 6, 17, 18, 29, 30, 37, 38].forEach(r => {
            for (let c = 0; c < COLS; c++) {
                this.grid[r][c] = T_CELL.LANE;
            }
        });

        // Vertical Aisle Lanes (Cols: 6-7, 18-19, 30-31, 42-43, 54-55)
        [6, 7, 18, 19, 30, 31, 42, 43, 54, 55].forEach(c => {
            for (let r = 5; r <= 38; r++) {
                this.grid[r][c] = T_CELL.LANE;
            }
        });

        // Green Epoxy Pedestrian Safety Walkways (Safe zones for humans)
        // Row 4 (North walkway below docks) & Row 34 (South walkway above dispatch)
        for (let c = 4; c < COLS - 4; c++) {
            this.pedestrianWalkways.push({ x: c * TILE, y: 4 * TILE, w: TILE, h: TILE, orientation: 'H' });
            this.pedestrianWalkways.push({ x: c * TILE, y: 34 * TILE, w: TILE, h: TILE, orientation: 'H' });
        }
        // Vertical connector walkway on column 4
        for (let r = 4; r <= 34; r++) {
            this.pedestrianWalkways.push({ x: 4 * TILE, y: r * TILE, w: TILE, h: TILE, orientation: 'V' });
            this.pedestrianWalkways.push({ x: (COLS - 5) * TILE, y: r * TILE, w: TILE, h: TILE, orientation: 'V' });
        }
    }

    _buildStorageRacks() {
        // High-Bay Racks: 2 Major Zones (Zone A: Rows 8-16, Zone B: Rows 20-28)
        const rackColumns = [
            { x: 9, w: 8, label: "Aisle A1" },
            { x: 21, w: 8, label: "Aisle A2" },
            { x: 33, w: 8, label: "Aisle A3" },
            { x: 45, w: 8, label: "Aisle A4" }
        ];

        // Zone A (North Racks)
        rackColumns.forEach((col, idx) => {
            const rx = col.x * TILE;
            const ry = 8 * TILE;
            const rw = col.w * TILE;
            const rh = 8 * TILE;

            this._fillGridRect(col.x, 8, col.w, 8, T_CELL.RACK);
            this.racks.push({
                id: `RACK_A${idx + 1}`,
                label: `BAY A-${idx + 1}`,
                zone: 'A',
                rect: { x: rx, y: ry, w: rw, h: rh },
                aisle: col.label,
                shelfLevels: 4,
                boxSlots: []
            });
        });

        // Zone B (South Racks)
        rackColumns.forEach((col, idx) => {
            const rx = col.x * TILE;
            const ry = 20 * TILE;
            const rw = col.w * TILE;
            const rh = 8 * TILE;

            this._fillGridRect(col.x, 20, col.w, 8, T_CELL.RACK);
            this.racks.push({
                id: `RACK_B${idx + 1}`,
                label: `BAY B-${idx + 1}`,
                zone: 'B',
                rect: { x: rx, y: ry, w: rw, h: rh },
                aisle: `Aisle B${idx + 1}`,
                shelfLevels: 4,
                boxSlots: []
            });
        });
    }

    _buildInboundDocks() {
        // North Receiving Bay (Docks 1, 2, 3)
        const docks = [
            { x: 12 * TILE, y: 2 * TILE, name: "Inbound Dock 1 (Freightliner Alpha)" },
            { x: 26 * TILE, y: 2 * TILE, name: "Inbound Dock 2 (Volvo Aero Cargo)" },
            { x: 40 * TILE, y: 2 * TILE, name: "Inbound Dock 3 (Mercedes Express)" }
        ];

        docks.forEach((d, idx) => {
            this.pickupStations.push({
                id: `DOCK_${idx + 1}`,
                name: d.name,
                x: d.x,
                y: d.y,
                rect: { x: d.x - 40, y: d.y - 25, w: 80, h: 42 },
                queue: []
            });
            this._fillGridRect(Math.floor((d.x - 40) / TILE), 0, Math.ceil(80 / TILE), 3, T_CELL.INBOUND_DOCK);

            // Logistics Semi-Trailer Trucks backed into the dock
            this.logisticsTrucks.push({
                id: `TRUCK_${idx + 1}`,
                x: d.x,
                y: -10, // Partially visible outside wall through open bay
                w: 70,
                h: 90,
                color: idx === 0 ? '#1e3a8a' : (idx === 1 ? '#047857' : '#b91c1c'),
                brand: idx === 0 ? 'MAERSK LOGISTICS' : (idx === 1 ? 'DHL EXPRESS' : 'FEDEX FREIGHT')
            });
        });
    }

    _buildOutboundStations() {
        // South Packing & Conveyor Sort Chutes
        const stations = [
            { x: 12 * TILE, y: 36 * TILE, name: "Dispatch Station 1 (Domestic Ground)" },
            { x: 26 * TILE, y: 36 * TILE, name: "Dispatch Station 2 (Next-Day Air)" },
            { x: 40 * TILE, y: 36 * TILE, name: "Dispatch Station 3 (Regional Sorting)" },
            { x: 50 * TILE, y: 36 * TILE, name: "Dispatch Station 4 (International Priority)" }
        ];

        stations.forEach((s, idx) => {
            this.deliveryStations.push({
                id: `DISPATCH_${idx + 1}`,
                name: s.name,
                x: s.x,
                y: s.y,
                rect: { x: s.x - 35, y: s.y - 18, w: 70, h: 36 },
                completedDeliveries: 0,
                laserActive: true
            });
            this._fillGridRect(Math.floor((s.x - 35) / TILE), 35, Math.ceil(70 / TILE), 2, T_CELL.OUTBOUND_STATION);
        });

        // Motorized Roller Conveyor Belts running along south perimeter
        this.conveyors.push({
            x: 8 * TILE,
            y: 37 * TILE,
            w: 48 * TILE,
            h: 22,
            speed: 1.4
        });
    }

    _buildChargingDocks() {
        // West Wall Charging Pad Bank (4 stations)
        for (let i = 0; i < 4; i++) {
            const dy = (9 + i * 2.8) * TILE;
            this.chargingDocks.push({
                id: `CHG_W${i + 1}`,
                x: 2 * TILE,
                y: dy,
                rect: { x: 1 * TILE, y: dy - 14, w: 3 * TILE, h: 28 },
                occupiedBy: null,
                chargeRate: 0.40, // % per tick
                voltage: 48.2 + (i * 0.3)
            });
            this._fillGridRect(1, Math.floor((dy - 14) / TILE), 3, 1, T_CELL.CHARGING_DOCK);
        }

        // East Wall Charging Pad Bank (4 stations)
        for (let i = 0; i < 4; i++) {
            const dy = (9 + i * 2.8) * TILE;
            this.chargingDocks.push({
                id: `CHG_E${i + 1}`,
                x: 61 * TILE,
                y: dy,
                rect: { x: 60 * TILE, y: dy - 14, w: 3 * TILE, h: 28 },
                occupiedBy: null,
                chargeRate: 0.40,
                voltage: 48.1 + (i * 0.4)
            });
            this._fillGridRect(60, Math.floor((dy - 14) / TILE), 3, 1, T_CELL.CHARGING_DOCK);
        }
    }

    _buildOverheadLighting() {
        // High-Bay Industrial UFO LED Light Fixtures spaced evenly
        const lightCols = [10, 22, 34, 46, 56];
        const lightRows = [6, 18, 30, 36];
        for (const c of lightCols) {
            for (const r of lightRows) {
                this.overheadLights.push({
                    x: c * TILE,
                    y: r * TILE,
                    radius: 170,
                    intensity: 0.14
                });
            }
        }
    }

    _buildFixturesAndFiducials() {
        // Safety Bollards at rack aisle entrances to protect high-bay columns
        const rackCols = [9, 17, 21, 29, 33, 41, 45, 53];
        const rackRows = [8, 16, 20, 28];
        rackCols.forEach(c => {
            rackRows.forEach(r => {
                this.safetyBollards.push({ x: c * TILE, y: r * TILE, radius: 4.5 });
            });
        });

        // Optical Navigation Fiducial Matrix / QR Markers at grid intersections
        for (let r = 5; r <= 38; r += 3) {
            for (let c = 6; c <= 55; c += 3) {
                if (this.grid[r][c] === T_CELL.LANE) {
                    this.floorFiducials.push({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2, tagId: `TAG-${r}-${c}` });
                }
            }
        }
    }

    _populateInitialPackages() {
        const itemCategories = [
            { name: "Industrial Servo Actuator", type: "kraft_carton", weight: 6.5, fragile: false },
            { name: "Microcontroller PCB Spool", type: "priority_parcel", weight: 2.1, fragile: true },
            { name: "LiDAR Sensor Turret Kit", type: "priority_parcel", weight: 3.4, fragile: true },
            { name: "Hydraulic Valve Manifold", type: "euro_pallet", weight: 24.0, fragile: false },
            { name: "Precision Bearing Assembly", type: "heavy_tote", weight: 12.8, fragile: false },
            { name: "Fiber Optic Transceiver Pack", type: "priority_parcel", weight: 1.8, fragile: true },
            { name: "Lithium-Ion Cell Array (48V)", type: "euro_pallet", weight: 32.5, fragile: true },
            { name: "Carbon Fiber Robot Shell", type: "kraft_carton", weight: 4.2, fragile: false }
        ];

        let pkgCounter = 101;
        this.racks.forEach(rack => {
            for (let i = 0; i < 7; i++) {
                const px = rack.rect.x + 22 + (i % 3) * 62;
                const py = rack.rect.y + 24 + Math.floor(i / 3) * 65;
                const item = itemCategories[Math.floor(Math.random() * itemCategories.length)];
                const pkg = {
                    id: `PKG-${pkgCounter++}`,
                    name: item.name,
                    type: item.type,
                    x: px,
                    y: py,
                    rackId: rack.id,
                    weightKg: (item.weight * (0.8 + Math.random() * 0.4)).toFixed(1),
                    priority: Math.random() < 0.28 ? 'EXPRESS' : (Math.random() < 0.65 ? 'STANDARD' : 'BULK'),
                    fragile: item.fragile,
                    barcode: `BAR-${Math.floor(100000 + Math.random() * 900000)}`,
                    status: 'IN_STOCK', // 'IN_STOCK', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED'
                    carriedBy: null,
                    destination: this.deliveryStations[Math.floor(Math.random() * this.deliveryStations.length)]
                };
                this.packages.push(pkg);
                rack.boxSlots.push(pkg);
            }
        });
    }

    _spawnHumanStaff() {
        // 2 Safety Supervisors walking the green walkways
        this.supervisors = [
            {
                id: 'SUP-01',
                name: 'Engr. Tariq (Safety Lead)',
                x: 10 * TILE,
                y: 4 * TILE,
                targetX: (COLS - 8) * TILE,
                targetY: 4 * TILE,
                speed: 0.6,
                dir: 1,
                vestColor: '#22c55e', // Neon green
                helmetColor: '#facc15', // Yellow hard hat
                walkCycle: 0
            },
            {
                id: 'SUP-02',
                name: 'Supervisor Sarah (QC Auditor)',
                x: (COLS - 10) * TILE,
                y: 34 * TILE,
                targetX: 8 * TILE,
                targetY: 34 * TILE,
                speed: 0.55,
                dir: -1,
                vestColor: '#f97316', // Neon orange
                helmetColor: '#ffffff', // White supervisor hat
                walkCycle: 0
            }
        ];

        // 4 Packing Station Operators standing by dispatch benches
        this.stationWorkers = this.deliveryStations.map((station, idx) => ({
            id: `OP-${idx + 1}`,
            name: `Packer ${idx + 1}`,
            x: station.x - 24,
            y: station.y - 10,
            angle: Math.PI / 2,
            vestColor: '#ea580c',
            helmetColor: '#38bdf8',
            scanTimer: 0
        }));
    }

    updateStaff(tick) {
        // Animate walking supervisors along green pedestrian lanes
        for (const sup of this.supervisors) {
            sup.walkCycle = (sup.walkCycle + 0.12) % (Math.PI * 2);
            sup.x += sup.speed * sup.dir;
            if (sup.dir === 1 && sup.x >= (COLS - 6) * TILE) {
                sup.dir = -1;
            } else if (sup.dir === -1 && sup.x <= 6 * TILE) {
                sup.dir = 1;
            }
        }
    }

    _fillGridRect(cx, cy, w, h, type) {
        for (let r = cy; r < cy + h && r < ROWS; r++) {
            for (let c = cx; c < cx + w && c < COLS; c++) {
                if (r >= 0 && c >= 0) this.grid[r][c] = type;
            }
        }
    }

    // ─── Spatial & Pathfinding Checks ───
    isNavigable(px, py) {
        if (px < 10 || px >= WAREHOUSE_W - 10 || py < 10 || py >= WAREHOUSE_H - 10) return false;
        const c = Math.floor(px / TILE);
        const r = Math.floor(py / TILE);
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;

        // Check if aisle is manually blocked by user
        if (this.blockedAisles.has(`${c},${r}`)) return false;

        const cell = this.grid[r][c];
        // Racks block robot travel directly through the rack body
        if (cell === T_CELL.RACK) return false;

        return true;
    }

    // Toggle aisle blockage
    toggleBlockAisle(col, row) {
        const key = `${col},${row}`;
        if (this.blockedAisles.has(key)) {
            this.blockedAisles.delete(key);
            return false; // unblocked
        } else {
            this.blockedAisles.add(key);
            return true; // blocked
        }
    }

    getClosestAvailableCharger(robot) {
        const freeDocks = this.chargingDocks.filter(d => !d.occupiedBy || d.occupiedBy === robot);
        if (freeDocks.length === 0) return null;
        let best = null, bestD = Infinity;
        for (const dock of freeDocks) {
            const d = Math.hypot(dock.x - robot.x, dock.y - robot.y);
            if (d < bestD) { bestD = d; best = dock; }
        }
        return best;
    }

    getAvailableOrderPackage() {
        return this.packages.find(p => p.status === 'IN_STOCK' && !p.carriedBy);
    }

    // ─── Efficient A* Grid Pathfinding ───
    findPath(startX, startY, targetX, targetY) {
        const startC = clamp(Math.floor(startX / TILE), 0, COLS - 1);
        const startR = clamp(Math.floor(startY / TILE), 0, ROWS - 1);
        const targetC = clamp(Math.floor(targetX / TILE), 0, COLS - 1);
        const targetR = clamp(Math.floor(targetY / TILE), 0, ROWS - 1);

        if (startC === targetC && startR === targetR) {
            return [{ x: targetX, y: targetY }];
        }

        // Priority queue node structure
        const openSet = [{ c: startC, r: startR, g: 0, f: Math.hypot(startC - targetC, startR - targetR) }];
        const cameFrom = new Map();
        const gScore = new Map();
        gScore.set(`${startC},${startR}`, 0);

        let iterations = 0;
        const maxIterations = 600;

        while (openSet.length > 0 && iterations++ < maxIterations) {
            // Find lowest f-score
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();

            if (current.c === targetC && current.r === targetR) {
                // Reconstruct path
                const path = [{ x: targetX, y: targetY }];
                let currKey = `${current.c},${current.r}`;
                while (cameFrom.has(currKey)) {
                    const prev = cameFrom.get(currKey);
                    path.unshift({ x: prev.c * TILE + TILE / 2, y: prev.r * TILE + TILE / 2 });
                    currKey = `${prev.c},${prev.r}`;
                }
                return path;
            }

            const neighbors = [
                { c: current.c + 1, r: current.r },
                { c: current.c - 1, r: current.r },
                { c: current.c, r: current.r + 1 },
                { c: current.c, r: current.r - 1 }
            ];

            for (const n of neighbors) {
                if (n.c < 0 || n.c >= COLS || n.r < 0 || n.r >= ROWS) continue;
                if (!this.isNavigable(n.c * TILE + TILE / 2, n.r * TILE + TILE / 2)) continue;

                const tentativeG = current.g + 1;
                const nKey = `${n.c},${n.r}`;

                if (!gScore.has(nKey) || tentativeG < gScore.get(nKey)) {
                    cameFrom.set(nKey, current);
                    gScore.set(nKey, tentativeG);
                    const h = Math.hypot(n.c - targetC, n.r - targetR);
                    openSet.push({ c: n.c, r: n.r, g: tentativeG, f: tentativeG + h });
                }
            }
        }

        // Fallback: direct line waypoint
        return [{ x: targetX, y: targetY }];
    }
}
