/* ═══════════════════════════════════════════════════════════════════
   ui.js — Logistics Dashboard, AMR Telemetry Dossier & Charts
   Author: Atif Ali Shah (@AtifAliShah)
   ═══════════════════════════════════════════════════════════════════ */

class WarehouseUI {
    constructor() {
        this.metricsChart = null;
        this.compareChart = null;
        this._initChart();
    }

    _initChart() {
        const canvas = document.getElementById('chart-logistics');
        if (!canvas) return;
        this.metricsChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: 'Completed Deliveries', data: [], borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', fill: true, tension: 0.3, pointRadius: 0, borderWidth: 1.5 },
                    { label: 'Active AMRs', data: [], borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.1)', fill: true, tension: 0.3, pointRadius: 0, borderWidth: 1.5 },
                    { label: 'Pending Orders', data: [], borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.3, pointRadius: 0, borderWidth: 1.5 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 0 },
                plugins: {
                    legend: { display: true, position: 'bottom', labels: { color: '#94a3b8', font: { size: 9 }, boxWidth: 8, padding: 6 } }
                },
                scales: {
                    x: { display: false },
                    y: { display: true, beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 9 } } }
                }
            }
        });
    }

    updateStats(stats) {
        this._setText('stat-robots', stats.totalRobots);
        this._setText('stat-active', stats.activeRobots);
        this._setText('stat-delivered', stats.completedDeliveries);
        this._setText('stat-pending', stats.pendingOrders);
        this._setText('stat-charging', stats.robotsCharging);
        this._setText('stat-blocked', stats.robotsBlocked);
        this._setText('stat-distance', stats.totalDistanceM + ' m');
        this._setText('stat-energy', stats.totalEnergyKWh + ' kWh');
        this._setText('stat-delivtime', stats.avgDeliveryTimeSec + ' s');
        this._setText('stat-batt', stats.avgBattery + '%');

        const barBatt = document.getElementById('bar-fleet-batt');
        if (barBatt) barBatt.style.width = stats.avgBattery + '%';
    }

    updateDossier(robot) {
        const panel = document.getElementById('robot-dossier');
        if (!panel) return;

        if (!robot) {
            panel.classList.add('hidden');
            return;
        }

        panel.classList.remove('hidden');

        this._setText('dos-id', robot.id);
        this._setText('dos-role', robot.role.replace(/_/g, ' ').toUpperCase());
        this._setText('dos-state', robot.state);
        this._setText('dos-status', robot.statusMessage);
        this._setText('dos-dist', `${Math.round(robot.totalDistanceMeters)} meters`);
        this._setText('dos-deliv-count', robot.completedDeliveries);

        // Battery Bar
        const bPct = Math.round(robot.battery);
        this._setText('dos-batt-pct', `${bPct}%`);
        const bBar = document.getElementById('dos-batt-fill');
        if (bBar) {
            bBar.style.width = bPct + '%';
            bBar.style.background = bPct > 40 ? '#22c55e' : (bPct > 20 ? '#f59e0b' : '#ef4444');
        }

        // Carried Package
        const pkgText = robot.carriedPackage ?
            `${robot.carriedPackage.id} (${robot.carriedPackage.name} - ${robot.carriedPackage.priority})` :
            "Payload Bed Empty";
        this._setText('dos-package', pkgText);
    }

    updateChart(history) {
        if (!this.metricsChart || history.length === 0) return;
        const maxPts = 80;
        const recent = history.slice(-maxPts);
        this.metricsChart.data.labels = recent.map(h => h.tick);
        this.metricsChart.data.datasets[0].data = recent.map(h => h.delivered);
        this.metricsChart.data.datasets[1].data = recent.map(h => h.activeRobots);
        this.metricsChart.data.datasets[2].data = recent.map(h => h.pendingOrders);
        this.metricsChart.update('none');
    }

    updateEvents(events) {
        const log = document.getElementById('event-log');
        if (!log) return;
        log.innerHTML = events.slice(0, 16).map(e => {
            const cls = e.type === 'danger' ? 'ev-danger' : e.type === 'good' ? 'ev-good' : e.type === 'warn' ? 'ev-warn' : 'ev-info';
            return `<div class="event-entry"><span class="event-time">${e.time}</span><span class="event-msg ${cls}">${e.msg}</span></div>`;
        }).join('');
    }

    showCompareResults(labelA, statsA, labelB, statsB, histA, histB) {
        document.getElementById('compare-results').classList.remove('hidden');
        document.getElementById('compare-charts').classList.remove('hidden');
        document.getElementById('compare-label-a').textContent = labelA;
        document.getElementById('compare-label-b').textContent = labelB;

        document.getElementById('compare-stats-a').innerHTML = this._renderCompareStats(statsA);
        document.getElementById('compare-stats-b').innerHTML = this._renderCompareStats(statsB);

        this._renderCompareChart(labelA, histA, labelB, histB);
    }

    _renderCompareStats(s) {
        return `
            <div class="compare-stat-row"><span>Total Deliveries</span><strong style="color:#22c55e">${s.completedDeliveries}</strong></div>
            <div class="compare-stat-row"><span>Average Delivery Time</span><strong>${s.avgDeliveryTimeSec} s</strong></div>
            <div class="compare-stat-row"><span>Total Travel Distance</span><strong>${s.totalDistanceM} m</strong></div>
            <div class="compare-stat-row"><span>Total Energy Used</span><strong style="color:#38bdf8">${s.totalEnergyKWh} kWh</strong></div>
            <div class="compare-stat-row"><span>Fleet Battery Reserve</span><strong style="color:#f59e0b">${s.avgBattery}%</strong></div>
            <div class="compare-stat-row"><span>Blocked Incidents</span><strong>${s.robotsBlocked}</strong></div>
        `;
    }

    _renderCompareChart(labelA, histA, labelB, histB) {
        const canvas = document.getElementById('chart-compare');
        if (this.compareChart) this.compareChart.destroy();

        const maxLen = Math.max(histA.length, histB.length);
        const labels = Array.from({ length: maxLen }, (_, i) => i * 10);

        this.compareChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: labelA + ' (Deliveries)', data: histA.map(h => h.delivered), borderColor: '#22c55e', borderWidth: 2, pointRadius: 0 },
                    { label: labelB + ' (Deliveries)', data: histB.map(h => h.delivered), borderColor: '#38bdf8', borderWidth: 2, pointRadius: 0, borderDash: [4, 4] }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { display: true, title: { display: true, text: 'Ticks', color: '#64748b', font: { size: 9 } } },
                    y: { display: true, beginAtZero: true }
                }
            }
        });
    }

    _setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }
}
