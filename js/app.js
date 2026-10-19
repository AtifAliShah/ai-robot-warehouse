/* ═══════════════════════════════════════════════════════════════════
   app.js — Automated Warehouse Application Orchestrator
   Author: Atif Ali Shah (@AtifAliShah)
   ═══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('sim-canvas');
    const renderer = new WarehouseRenderer(canvas);
    const ui = new WarehouseUI();

    // ─── Industrial Audio Synthesizer (Zero External Files) ───
    class WarehouseAudio {
        constructor() {
            this.ctx = null;
            this.enabled = true;
        }

        _init() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) this.ctx = new AudioCtx();
            }
        }

        playBeep(freq = 950, dur = 0.08) {
            if (!this.enabled) return;
            this._init();
            if (!this.ctx) return;
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + dur);
        }

        playChime() {
            if (!this.enabled) return;
            this._init();
            if (!this.ctx) return;
            const t = this.ctx.currentTime;
            [440, 554.37, 659.25].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t + idx * 0.08);
                gain.gain.setValueAtTime(0.12, t + idx * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.08 + 0.3);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t + idx * 0.08);
                osc.stop(t + idx * 0.08 + 0.3);
            });
        }
    }

    const sound = new WarehouseAudio();

    // ─── Configuration ───
    function getConfigFromInputs() {
        return {
            robotCount: parseInt(document.getElementById('slider-robots').value, 10),
            strategy: document.getElementById('select-strategy').value,
            robotSpeed: parseFloat(document.getElementById('slider-speed-mult').value),
        };
    }

    let sim = new WarehouseSimulation(getConfigFromInputs(), Date.now() % 100000);

    renderer.render(sim);
    ui.updateStats(sim.stats);
    ui.updateEvents(sim.events);

    // ─── Playback Controls ───
    const btnStart = document.getElementById('btn-start');
    const btnPause = document.getElementById('btn-pause');
    const btnStep = document.getElementById('btn-step');
    const btnReset = document.getElementById('btn-reset');
    const sliderSpeed = document.getElementById('slider-speed');
    const valSpeed = document.getElementById('val-speed');
    const overlayStatus = document.getElementById('overlay-status');

    let animationId = null;
    let lastTimestamp = 0;
    let tickAccumulator = 0;

    function loop(timestamp) {
        if (!lastTimestamp) lastTimestamp = timestamp;
        const delta = Math.min(100, timestamp - lastTimestamp);
        lastTimestamp = timestamp;

        if (sim.running && !sim.paused) {
            const ticksPerSecond = 60 * sim.speed;
            const msPerTick = 1000 / ticksPerSecond;
            tickAccumulator += delta;

            const maxTicksPerFrame = Math.max(1, Math.ceil(sim.speed * 2));
            let ticksRun = 0;

            while (tickAccumulator >= msPerTick && ticksRun < maxTicksPerFrame) {
                const prevEventsLen = sim.events.length;
                sim.step();
                if (sim.events.length > prevEventsLen) {
                    const latest = sim.events[0];
                    if (latest.type === 'good') sound.playBeep(1200, 0.06);
                    else if (latest.type === 'danger') sound.playBeep(400, 0.25);
                }
                tickAccumulator -= msPerTick;
                ticksRun++;
            }

            if (sim.tick % 4 === 0) {
                ui.updateStats(sim.stats);
                ui.updateEvents(sim.events);
                if (renderer.selectedRobot) {
                    ui.updateDossier(renderer.selectedRobot);
                }
            }
            if (sim.tick % 15 === 0) {
                ui.updateChart(sim.history);
            }
            updateStatusOverlay();
        }

        renderer.render(sim);
        animationId = requestAnimationFrame(loop);
    }

    function updateStatusOverlay() {
        if (!overlayStatus) return;
        if (!sim.running) {
            overlayStatus.textContent = 'LOGISTICS CENTER READY — Select strategy and press Start';
        } else if (sim.paused) {
            overlayStatus.textContent = `PAUSED (Tick ${sim.tick}) — AMR Fleet on hold`;
        } else {
            overlayStatus.textContent = `ACTIVE DISPATCH (${sim.speed.toFixed(1)}x) &bull; Strategy: ${sim.config.strategy.toUpperCase()} &bull; Deliveries: ${sim.stats.completedDeliveries} | Active AMRs: ${sim.stats.activeRobots}`;
        }
    }

    btnStart.addEventListener('click', () => {
        if (!sim.running) {
            sim.start();
            btnStart.textContent = '▶ Running';
            btnStart.disabled = true;
            btnPause.disabled = false;
            btnPause.textContent = '⏸ Pause';
            sound.playChime();
        } else if (sim.paused) {
            sim.pause();
            btnPause.textContent = '⏸ Pause';
        }
        updateStatusOverlay();
    });

    btnPause.addEventListener('click', () => {
        if (sim.running) {
            sim.pause();
            btnPause.textContent = sim.paused ? '▶ Resume' : '⏸ Pause';
            updateStatusOverlay();
        }
    });

    btnStep.addEventListener('click', () => {
        if (!sim.running) {
            sim.start();
            sim.pause();
            btnStart.disabled = true;
            btnPause.disabled = false;
            btnPause.textContent = '▶ Resume';
        }
        sim.step();
        ui.updateStats(sim.stats);
        ui.updateEvents(sim.events);
        ui.updateChart(sim.history);
        renderer.render(sim);
        updateStatusOverlay();
    });

    btnReset.addEventListener('click', () => {
        sim.reset(getConfigFromInputs());
        btnStart.textContent = '▶ Start';
        btnStart.disabled = false;
        btnPause.disabled = true;
        btnPause.textContent = '⏸ Pause';
        renderer.selectedRobot = null;
        ui.updateDossier(null);
        ui.updateStats(sim.stats);
        ui.updateEvents(sim.events);
        renderer.render(sim);
        updateStatusOverlay();
    });

    sliderSpeed.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        valSpeed.textContent = val.toFixed(1) + 'x';
        sim.speed = val;
    });

    // ─── Sliders & Inputs ───
    const sliderRobots = document.getElementById('slider-robots');
    const valRobots = document.getElementById('val-robots');
    sliderRobots.addEventListener('input', (e) => {
        valRobots.textContent = e.target.value;
        sim.config.robotCount = parseInt(e.target.value, 10);
    });

    const selectStrategy = document.getElementById('select-strategy');
    selectStrategy.addEventListener('change', (e) => {
        sim.config.strategy = e.target.value;
        sim._addEvent('info', `Allocation Strategy changed to: ${e.target.value.toUpperCase()}`);
    });

    const sliderSpeedMult = document.getElementById('slider-speed-mult');
    const valSpeedMult = document.getElementById('val-speed-mult');
    sliderSpeedMult.addEventListener('input', (e) => {
        valSpeedMult.textContent = parseFloat(e.target.value).toFixed(1) + 'x';
        const mult = parseFloat(e.target.value);
        for (const b of sim.robots) {
            b.maxSpeed = b.role === 'sorting' ? 2.6 * mult : (b.role === 'shelf_lifter' ? 1.6 * mult : 2.1 * mult);
        }
    });

    // ─── Manual Operational Action Triggers ───
    document.getElementById('btn-add-order').addEventListener('click', () => {
        sim.triggerNewOrder();
        sound.playBeep(1100, 0.05);
    });

    document.getElementById('btn-emergency-charge').addEventListener('click', () => {
        sim.triggerEmergencyCharge();
        sound.playBeep(450, 0.3);
    });

    // ─── Scenario Presets ───
    const presets = {
        normal: { robotCount: 12, strategy: 'priority_battery', robotSpeed: 1.0 },
        rush: { robotCount: 18, strategy: 'priority_battery', robotSpeed: 1.3 },
        narrow: { robotCount: 14, strategy: 'nearest', robotSpeed: 0.9 },
        battery: { robotCount: 10, strategy: 'priority_battery', robotSpeed: 1.1 }
    };

    document.querySelectorAll('.preset-grid .btn-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = presets[btn.dataset.preset];
            if (!p) return;

            sliderRobots.value = p.robotCount;
            valRobots.textContent = p.robotCount;
            selectStrategy.value = p.strategy;
            sliderSpeedMult.value = p.robotSpeed;
            valSpeedMult.textContent = p.robotSpeed.toFixed(1) + 'x';

            sim.reset(p);
            btnStart.textContent = '▶ Start';
            btnStart.disabled = false;
            btnPause.disabled = true;
            btnPause.textContent = '⏸ Pause';
            renderer.selectedRobot = null;
            ui.updateDossier(null);
            ui.updateStats(sim.stats);
            ui.updateEvents(sim.events);
            renderer.render(sim);
            updateStatusOverlay();
        });
    });

    // ─── Sound Toggle ───
    const btnSound = document.getElementById('btn-sound');
    btnSound.addEventListener('click', () => {
        sound.enabled = !sound.enabled;
        btnSound.textContent = sound.enabled ? '🔊 Audio: ON' : '🔇 Audio: OFF';
        btnSound.classList.toggle('active', sound.enabled);
    });

    // ─── Camera Pan & Zoom ───
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStartX = e.clientX - renderer.targetPanX;
        dragStartY = e.clientY - renderer.targetPanY;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        renderer.followSelected = false;
        document.getElementById('btn-follow-toggle').classList.remove('active');
        renderer.targetPanX = e.clientX - dragStartX;
        renderer.targetPanY = e.clientY - dragStartY;
    });

    window.addEventListener('mouseup', () => { isDragging = false; });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
        const newZoom = clamp(renderer.zoom * zoomFactor, 0.4, 2.5);

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        renderer.targetPanX = mouseX - (mouseX - renderer.targetPanX) * (newZoom / renderer.zoom);
        renderer.targetPanY = mouseY - (mouseY - renderer.targetPanY) * (newZoom / renderer.zoom);
        renderer.zoom = newZoom;
    }, { passive: false });

    document.getElementById('btn-zoom-in').addEventListener('click', () => {
        renderer.zoom = clamp(renderer.zoom * 1.25, 0.4, 2.5);
    });

    document.getElementById('btn-zoom-out').addEventListener('click', () => {
        renderer.zoom = clamp(renderer.zoom * 0.8, 0.4, 2.5);
    });

    document.getElementById('btn-zoom-reset').addEventListener('click', () => {
        renderer.zoom = 1.0;
        renderer.targetPanX = 0;
        renderer.targetPanY = 0;
        renderer.followSelected = false;
        document.getElementById('btn-follow-toggle').classList.remove('active');
    });

    const btnFollow = document.getElementById('btn-follow-toggle');
    btnFollow.addEventListener('click', () => {
        if (renderer.selectedRobot) {
            renderer.followSelected = !renderer.followSelected;
            btnFollow.classList.toggle('active', renderer.followSelected);
        }
    });

    // ─── Click Selection & Aisle Blockade ───
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const worldX = (e.clientX - rect.left - renderer.panX) / renderer.zoom;
        const worldY = (e.clientY - rect.top - renderer.panY) / renderer.zoom;

        if (e.shiftKey) {
            // Shift-Click toggles aisle blockage barricade
            const col = Math.floor(worldX / TILE);
            const row = Math.floor(worldY / TILE);
            const isBlocked = sim.world.toggleBlockAisle(col, row);
            sim._addEvent(isBlocked ? 'warn' : 'info', `Aisle node (${col},${row}) ${isBlocked ? 'BLOCKED - Rerouting AMRs' : 'CLEARED'}`);
            sound.playBeep(isBlocked ? 500 : 900, 0.1);
            renderer.render(sim);
            return;
        }

        // Select nearest AMR robot
        let selected = null;
        let minDist = 28;

        for (const b of sim.robots) {
            const d = Math.hypot(b.x - worldX, b.y - worldY);
            if (d < minDist) {
                minDist = d;
                selected = b;
            }
        }

        renderer.selectedRobot = selected;
        ui.updateDossier(selected);
        renderer.render(sim);
    });

    document.getElementById('dos-close').addEventListener('click', () => {
        renderer.selectedRobot = null;
        ui.updateDossier(null);
        renderer.followSelected = false;
        btnFollow.classList.remove('active');
        renderer.render(sim);
    });

    // ─── Modals (Theory & Strategy Comparison) ───
    const modalInfo = document.getElementById('modal-info');
    const modalCompare = document.getElementById('modal-compare');
    const btnInfo = document.getElementById('btn-info');
    const btnCompare = document.getElementById('btn-compare');
    const closeInfo = document.getElementById('close-info');
    const closeCompare = document.getElementById('close-compare');

    btnInfo.addEventListener('click', () => modalInfo.classList.remove('hidden'));
    closeInfo.addEventListener('click', () => modalInfo.classList.add('hidden'));

    btnCompare.addEventListener('click', () => modalCompare.classList.remove('hidden'));
    closeCompare.addEventListener('click', () => modalCompare.classList.add('hidden'));

    window.addEventListener('click', (e) => {
        if (e.target === modalInfo) modalInfo.classList.add('hidden');
        if (e.target === modalCompare) modalCompare.classList.add('hidden');
    });

    const comparePresets = {
        strategy: {
            titleA: 'Strategy A: Nearest Robot (Greedy)',
            titleB: 'Strategy B: Priority & Battery Aware',
            cfgA: { robotCount: 12, strategy: 'nearest' },
            cfgB: { robotCount: 12, strategy: 'priority_battery' }
        },
        fleet: {
            titleA: 'Small Fleet (6 AMRs)',
            titleB: 'High-Density Fleet (18 AMRs)',
            cfgA: { robotCount: 6, strategy: 'priority_battery' },
            cfgB: { robotCount: 18, strategy: 'priority_battery' }
        },
        blockage: {
            titleA: 'Clear Lanes (Unobstructed)',
            titleB: 'Narrow Bottlenecks (Aisle Restrictions)',
            cfgA: { robotCount: 12, strategy: 'priority_battery' },
            cfgB: { robotCount: 12, strategy: 'priority_battery' }
        }
    };

    document.querySelectorAll('.compare-presets .btn-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const exp = comparePresets[btn.dataset.compare];
            if (!exp) return;

            const statusEl = document.getElementById('compare-status');
            statusEl.textContent = 'Simulating parallel warehouse operations (1,500 ticks each)...';

            setTimeout(() => {
                const seed = 30303;
                const rA = runWarehouseHeadless(exp.cfgA, seed, 1500);
                const rB = runWarehouseHeadless(exp.cfgB, seed, 1500);
                statusEl.textContent = 'Comparative operational analysis complete:';
                ui.showCompareResults(exp.titleA, rA.stats, exp.titleB, rB.stats, rA.history, rB.history);
            }, 60);
        });
    });

    window.addEventListener('resize', () => {
        renderer._resize();
        renderer.render(sim);
    });

    animationId = requestAnimationFrame(loop);
});
