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
    BLOCKED: 7
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

        this.generate();
    }

    generate() {
        // 1. Build Base Concrete Floor and Travel Lanes
        this._buildFloorsAndLanes();

        // 2. Build High-Bay Industrial Storage Racks (Aisles A1-A4, B1-B4)
        this._buildStorageRacks();

        // 3. Build Inbound Receiving Docks (North)
        this._buildInboundDocks();

        // 4. Build Outbound Packing & Dispatch Stations (South)
        this._buildOutboundStations();

        // 5. Build Autonomous Charging Docks (West & East perimeters)
        this._buildChargingDocks();

        // 6. Populate Initial Stock of Physical Cardboard Parcel Boxes on Racks
        this._populateInitialPackages();
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
            { x: 12 * TILE, y: 2 * TILE, name: "Inbound Dock 1 (Freight Truck Alpha)" },
            { x: 26 * TILE, y: 2 * TILE, name: "Inbound Dock 2 (Freight Truck Beta)" },
            { x: 40 * TILE, y: 2 * TILE, name: "Inbound Dock 3 (Air Cargo Express)" }
        ];

        docks.forEach((d, idx) => {
            this.pickupStations.push({
                id: `DOCK_${idx + 1}`,
                name: d.name,
                x: d.x,
                y: d.y,
                rect: { x: d.x - 30, y: d.y - 15, w: 60, h: 30 },
                queue: []
            });
            this._fillGridRect(Math.floor((d.x - 30) / TILE), 1, Math.ceil(60 / TILE), 2, T_CELL.INBOUND_DOCK);
        });
    }

    _buildOutboundStations() {
        // South Packing & Conveyor Sort Chutes
        const stations = [
            { x: 12 * TILE, y: 36 * TILE, name: "Dispatch Station 1 (Domestic Ground)" },
            { x: 26 * TILE, y: 36 * TILE, name: "Dispatch Station 2 (Next-Day Air)" },
            { x: 40 * TILE, y: 36 * TILE, name: "Dispatch Station 3 (Regional Sorting)" },
            { x: 50 * TILE, y: 36 * TILE, name: "Dispatch Station 4 (International)" }
        ];

        stations.forEach((s, idx) => {
            this.deliveryStations.push({
                id: `DISPATCH_${idx + 1}`,
                name: s.name,
                x: s.x,
                y: s.y,
                rect: { x: s.x - 30, y: s.y - 15, w: 60, h: 30 },
                completedDeliveries: 0
            });
            this._fillGridRect(Math.floor((s.x - 30) / TILE), 35, Math.ceil(60 / TILE), 2, T_CELL.OUTBOUND_STATION);
        });

        // Motorized Roller Conveyor Belts running along south perimeter
        this.conveyors.push({
            x: 8 * TILE,
            y: 37 * TILE,
            w: 48 * TILE,
            h: 18,
            speed: 1.2
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
                rect: { x: 1 * TILE, y: dy - 12, w: 3 * TILE, h: 24 },
                occupiedBy: null,
                chargeRate: 0.35 // % per tick
            });
            this._fillGridRect(1, Math.floor((dy - 12) / TILE), 3, 1, T_CELL.CHARGING_DOCK);
        }

        // East Wall Charging Pad Bank (4 stations)
        for (let i = 0; i < 4; i++) {
            const dy = (9 + i * 2.8) * TILE;
            this.chargingDocks.push({
                id: `CHG_E${i + 1}`,
                x: 61 * TILE,
                y: dy,
                rect: { x: 60 * TILE, y: dy - 12, w: 3 * TILE, h: 24 },
                occupiedBy: null,
                chargeRate: 0.35
            });
            this._fillGridRect(60, Math.floor((dy - 12) / TILE), 3, 1, T_CELL.CHARGING_DOCK);
        }
    }

    _populateInitialPackages() {
        const itemNames = [
            "Industrial Servo Actuator", "Microcontroller PCB Spool", "LiDAR Sensor Module",
            "Hydraulic Valve Pack", "Precision Bearing Set", "Fiber Optic Transceiver",
            "Lithium Battery Cell Array", "Carbon Fiber Chassis Kit"
        ];

        // Distribute 60 real parcels across racks and inbound docks
        let pkgCounter = 101;
        this.racks.forEach(rack => {
            for (let i = 0; i < 6; i++) {
                const px = rack.rect.x + 20 + (i % 3) * 60;
                const py = rack.rect.y + 25 + Math.floor(i / 3) * 75;
                const pkg = {
                    id: `PKG-${pkgCounter++}`,
                    name: itemNames[Math.floor(Math.random() * itemNames.length)],
                    x: px,
                    y: py,
                    rackId: rack.id,
                    weightKg: (2 + Math.random() * 18).toFixed(1),
                    priority: Math.random() < 0.25 ? 'EXPRESS' : (Math.random() < 0.6 ? 'STANDARD' : 'BULK'),
                    status: 'IN_STOCK', // 'IN_STOCK', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED'
                    carriedBy: null,
                    destination: this.deliveryStations[Math.floor(Math.random() * this.deliveryStations.length)]
                };
                this.packages.push(pkg);
                rack.boxSlots.push(pkg);
            }
        });
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
