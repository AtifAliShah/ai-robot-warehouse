# 🤖 AI Robot Warehouse Simulator
### Automated Logistics Fleet Orchestration & Agent-Based Modeling

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/Demo-Live%20Simulation-success)](https://atifalishah.github.io/ai-robot-warehouse/)
[![Course](https://img.shields.io/badge/Academic-Agent--Based%20Modeling-orange)](#)
[![Student](https://img.shields.io/badge/Author-Atif%20Ali%20Shah-blue)](https://github.com/AtifAliShah)

A high-visual-fidelity, interactive **Agent-Based Modeling (ABM)** simulation of an autonomous fulfillment center powered by Autonomous Mobile Robots (AMRs), high-bay industrial racks, dynamic obstacle avoidance, and multi-criteria task allocation.

Built as an academic term project for the **Agent-Based Modeling & Complex Systems** course by **Atif Ali Shah** ([@AtifAliShah](https://github.com/AtifAliShah)).

---

## 🚀 Live Demo & Quick Launch

- **Live GitHub Pages URL:** [https://atifalishah.github.io/ai-robot-warehouse/](https://atifalishah.github.io/ai-robot-warehouse/)
- **Local Run (Zero Dependencies):**
  Simply open `index.html` in any modern web browser, or serve it locally:
  ```bash
  # Using Python
  python -m http.server 8000
  # Or using Node
  npx serve .
  ```
  Then visit `http://localhost:8000` or `http://localhost:3000`.

---

## 🌟 Key Features

1. **Realistic Industrial Warehouse Floor:**
   - Multi-tier steel high-bay racks storing physical parcel boxes.
   - Inbound receiving docks and outbound motorized packing conveyors.
   - Dedicated fast-charging conductive pads.
   - Concrete floor reflections, safety hazard stripes, and navigation waypoints.

2. **Autonomous Mobile Robots (AMRs):**
   - Three specialized robot classes: **Transport Units**, **Express Sorting Units**, and **Shelf Lifters**.
   - Sleek industrial chassis with LED status headlights and battery indicator bars.
   - Autonomous lithium-ion battery discharge and automatic docking when depleted.
   - Physical parcel attachment and dynamic loading/unloading animations.

3. **Intelligent Pathfinding & Collision Radar:**
   - Real-time **A* Grid Search** navigation avoiding racks and dynamic blockades.
   - 360-degree decentralized proximity radar to prevent intersection collisions.
   - Dynamic rerouting when routes are blocked.

4. **Task Allocation Strategy Benchmarking:**
   - **Strategy A (Greedy Nearest):** Assigns incoming orders to whichever idle robot is physically closest.
   - **Strategy B (Priority & Battery Aware):** Multi-criteria evaluation combining distance, battery reserve, and parcel urgency.
   - **Headless Comparison Laboratory:** Run both algorithms over 1,500 simulation ticks to quantitatively compare fulfillment throughput and battery stalls.

5. **Live Interactive Controls & Telemetry:**
   - Live Chart.js multi-series telemetry graph (Orders Delivered vs Pending vs Active AMRs).
   - Interactive **Robot Dossier**: Click any robot to inspect its state, battery, carried cargo, and historical stats.
   - **Shift-Click Aisle Barricades**: Toggle physical obstacles dynamically to test system resilience.
   - Camera Pan & Zoom controls (0.4x to 2.5x) with AMR follow tracking mode.
   - Realistic Web Audio synthesizer for robot telemetry beeps, charging hums, and dispatch chimes.

---

## 📁 Repository Structure

```text
ai-robot-warehouse/
├── index.html                   # Command center interface & simulation canvas
├── css/
│   └── style.css                # Tactical dark industrial logistics theme
├── js/
│   ├── world.js                 # 2D warehouse layout, racks, docks, A* grid
│   ├── agents.js                # AMR agent classes, state machine, collision radar
│   ├── simulation.js            # Dispatch orchestration, order pipeline, benchmarks
│   ├── renderer.js              # Canvas rendering (epoxy floor, racks, AMRs, effects)
│   ├── ui.js                    # Telemetry updates, Chart.js graphs, dossier inspector
│   └── app.js                   # Application bootstrap, camera pan/zoom, event wiring
├── docs/
│   ├── abm_report.md            # Formal academic course report & empirical benchmarks
│   └── atif_presentation_script.md # Spoken presentation script for course defense
├── LICENSE                      # MIT Open-Source License
└── README.md                    # Project documentation
```

---

## 📊 Empirical Findings (ABM Research Summary)

Testing over 1,500 ticks with 12 active AMRs:
- **Throughput:** Strategy B delivered **+26.2% more orders** than Strategy A.
- **Battery Reliability:** Strategy B achieved **0 battery stalls**, whereas Strategy A stranded 3 robots in travel corridors.
- **Average Delivery Latency:** Reduced by **26.6%** through proactive battery triage.

See the complete methodology in [`docs/abm_report.md`](docs/abm_report.md).

---

## 📜 Presentation Guide

For the course defense presentation, see the full word-for-word spoken script in [`docs/atif_presentation_script.md`](docs/atif_presentation_script.md).

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
