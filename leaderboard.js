const SUPABASE_URL = 'https://fqpyyxgsyeepkpqrykgc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxcHl5eGdzeWVlcGtwcXJ5a2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MDgzOTksImV4cCI6MjA4OTM4NDM5OX0.N8q_ye3zdzeVV8bw_mQoCuiN4_rRTGJlIuBJSf3G-Pg';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let allData = [];

// Chart.js global defaults
Chart.defaults.color = '#9ca3af';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getAccuracy(entry) {
    if (!entry.shots_fired || entry.shots_fired === 0) return 0;
    return Math.round((entry.shots_hit / entry.shots_fired) * 100);
}

function formatTime(seconds) {
    if (!seconds) return '0s';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ─── Load Data ───
async function loadAll() {
    const { data, error } = await db
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false });

    if (error) {
        document.getElementById('lbLoading').textContent = 'Failed to load scores.';
        return;
    }

    allData = data || [];
    renderTable();
    renderStats();
    renderCharts();
    renderHeatmapControls();
}

// ─── Table ───
function renderTable() {
    const loading = document.getElementById('lbLoading');
    const table = document.getElementById('lbTable');
    const empty = document.getElementById('lbEmpty');
    const body = document.getElementById('lbBody');

    loading.style.display = 'none';

    if (allData.length === 0) {
        table.style.display = 'none';
        empty.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    empty.style.display = 'none';

    // Show top 50
    body.innerHTML = allData.slice(0, 50).map((entry, i) => {
        const rank = i + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        const acc = getAccuracy(entry);
        return `<tr class="${rankClass}">
            <td class="rank-cell">#${rank}</td>
            <td class="name-cell">${escapeHtml(entry.player_name)}</td>
            <td class="score-cell right">${entry.score.toLocaleString()}</td>
            <td class="meta-cell right">${entry.kills}</td>
            <td class="meta-cell right">${acc}%</td>
            <td class="meta-cell right">${formatTime(entry.time_survived)}</td>
            <td class="meta-cell right">${entry.wave}</td>
        </tr>`;
    }).join('');
}

// ─── Stats ───
function renderStats() {
    if (allData.length === 0) return;

    const uniquePlayers = new Set(allData.map(d => d.player_name)).size;
    const highScore = Math.max(...allData.map(d => d.score));
    const topWave = Math.max(...allData.map(d => d.wave));

    const withShots = allData.filter(d => d.shots_fired > 0);
    const avgAcc = withShots.length > 0
        ? Math.round(withShots.reduce((s, d) => s + (d.shots_hit / d.shots_fired), 0) / withShots.length * 100)
        : 0;

    document.getElementById('statPlayers').textContent = uniquePlayers.toLocaleString();
    document.getElementById('statGames').textContent = allData.length.toLocaleString();
    document.getElementById('statHighScore').textContent = highScore.toLocaleString();
    document.getElementById('statTopWave').textContent = topWave;
    document.getElementById('statAvgAccuracy').textContent = avgAcc + '%';
}

// ─── Charts ───
let charts = {};

function destroyChart(id) {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function renderCharts() {
    if (allData.length === 0) return;

    renderScoreDistChart();
    renderAccScoreChart();
    renderTimeWaveChart();
    renderAccDistChart();
}

function renderScoreDistChart() {
    destroyChart('scoreDist');
    const scores = allData.map(d => d.score);
    const max = Math.max(...scores);
    const bucketSize = Math.max(100, Math.ceil(max / 8 / 100) * 100);
    const buckets = {};
    for (const s of scores) {
        const key = Math.floor(s / bucketSize) * bucketSize;
        buckets[key] = (buckets[key] || 0) + 1;
    }
    const labels = Object.keys(buckets).sort((a, b) => a - b);
    const data = labels.map(k => buckets[k]);

    charts.scoreDist = new Chart(document.getElementById('chartScoreDist'), {
        type: 'bar',
        data: {
            labels: labels.map(l => `${Number(l).toLocaleString()}`),
            datasets: [{
                data,
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: 'rgba(99, 102, 241, 0.9)',
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { title: { display: true, text: 'Score Range' } },
                y: { title: { display: true, text: 'Games' }, beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

function renderAccScoreChart() {
    destroyChart('accScore');
    const withShots = allData.filter(d => d.shots_fired > 0);

    charts.accScore = new Chart(document.getElementById('chartAccScore'), {
        type: 'scatter',
        data: {
            datasets: [{
                data: withShots.map(d => ({
                    x: getAccuracy(d),
                    y: d.score
                })),
                backgroundColor: 'rgba(99, 102, 241, 0.5)',
                borderColor: 'rgba(99, 102, 241, 0.8)',
                pointRadius: 5,
                pointHoverRadius: 7,
            }]
        },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const d = withShots[ctx.dataIndex];
                            return `${d.player_name}: ${d.score.toLocaleString()} pts, ${getAccuracy(d)}% acc`;
                        }
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: 'Accuracy %' }, min: 0, max: 100 },
                y: { title: { display: true, text: 'Score' }, beginAtZero: true }
            }
        }
    });
}

function renderTimeWaveChart() {
    destroyChart('timeWave');
    const withTime = allData.filter(d => d.time_survived > 0);

    // Group by wave, average time
    const waveGroups = {};
    for (const d of withTime) {
        if (!waveGroups[d.wave]) waveGroups[d.wave] = [];
        waveGroups[d.wave].push(d.time_survived);
    }
    const waves = Object.keys(waveGroups).sort((a, b) => a - b);
    const avgTimes = waves.map(w => {
        const times = waveGroups[w];
        return Math.round(times.reduce((s, t) => s + t, 0) / times.length);
    });

    charts.timeWave = new Chart(document.getElementById('chartTimeWave'), {
        type: 'bar',
        data: {
            labels: waves.map(w => `Wave ${w}`),
            datasets: [{
                data: avgTimes,
                backgroundColor: 'rgba(34, 197, 94, 0.5)',
                borderColor: 'rgba(34, 197, 94, 0.8)',
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { title: { display: true, text: 'Wave Reached' } },
                y: { title: { display: true, text: 'Avg Time (seconds)' }, beginAtZero: true }
            }
        }
    });
}

function renderAccDistChart() {
    destroyChart('accDist');
    const withShots = allData.filter(d => d.shots_fired > 0);
    const accs = withShots.map(d => getAccuracy(d));

    const buckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 0-10, 10-20, ... 90-100
    for (const a of accs) {
        const idx = Math.min(9, Math.floor(a / 10));
        buckets[idx]++;
    }
    const labels = ['0-10%', '10-20%', '20-30%', '30-40%', '40-50%', '50-60%', '60-70%', '70-80%', '80-90%', '90-100%'];

    charts.accDist = new Chart(document.getElementById('chartAccDist'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: buckets,
                backgroundColor: 'rgba(251, 191, 36, 0.5)',
                borderColor: 'rgba(251, 191, 36, 0.8)',
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { title: { display: true, text: 'Accuracy Range' } },
                y: { title: { display: true, text: 'Games' }, beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

// ─── Heatmap ───
// Map layout (must match game.js)
const MAP = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1],
    [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,0,0,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

function renderHeatmapControls() {
    const playerSelect = document.getElementById('heatmapPlayer');
    const gameSelect = document.getElementById('heatmapGame');

    // Get unique players who have movement data
    const playersWithData = [...new Set(
        allData.filter(d => d.movement_data && d.movement_data.length > 0)
            .map(d => d.player_name)
    )];

    if (playersWithData.length === 0) {
        playerSelect.innerHTML = '<option>No data yet</option>';
        gameSelect.innerHTML = '<option>-</option>';
        drawHeatmap([]);
        return;
    }

    // Add "All Players" option
    playerSelect.innerHTML = '<option value="__all__">All Players</option>' +
        playersWithData.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');

    playerSelect.addEventListener('change', () => updateGameSelect());
    gameSelect.addEventListener('change', () => updateHeatmap());

    updateGameSelect();
}

function updateGameSelect() {
    const playerSelect = document.getElementById('heatmapPlayer');
    const gameSelect = document.getElementById('heatmapGame');
    const selectedPlayer = playerSelect.value;

    let games;
    if (selectedPlayer === '__all__') {
        games = allData.filter(d => d.movement_data && d.movement_data.length > 0);
    } else {
        games = allData.filter(d => d.player_name === selectedPlayer && d.movement_data && d.movement_data.length > 0);
    }

    if (selectedPlayer === '__all__') {
        gameSelect.innerHTML = '<option value="__all__">All Games Combined</option>';
    } else {
        gameSelect.innerHTML = '<option value="__all__">All Games Combined</option>' +
            games.map((g, i) => {
                const date = new Date(g.created_at).toLocaleDateString();
                return `<option value="${g.id}">Score ${g.score.toLocaleString()} - W${g.wave} - ${date}</option>`;
            }).join('');
    }

    updateHeatmap();
}

function updateHeatmap() {
    const playerSelect = document.getElementById('heatmapPlayer');
    const gameSelect = document.getElementById('heatmapGame');
    const selectedPlayer = playerSelect.value;
    const selectedGame = gameSelect.value;

    let movementPoints = [];

    if (selectedGame === '__all__') {
        let games;
        if (selectedPlayer === '__all__') {
            games = allData.filter(d => d.movement_data && d.movement_data.length > 0);
        } else {
            games = allData.filter(d => d.player_name === selectedPlayer && d.movement_data && d.movement_data.length > 0);
        }
        for (const g of games) {
            movementPoints.push(...g.movement_data);
        }
    } else {
        const game = allData.find(d => d.id === Number(selectedGame));
        if (game && game.movement_data) {
            movementPoints = game.movement_data;
        }
    }

    drawHeatmap(movementPoints);
}

function drawHeatmap(points) {
    const canvas = document.getElementById('heatmapCanvas');
    const ctx = canvas.getContext('2d');
    const mapW = MAP[0].length;
    const mapH = MAP.length;
    const cellSize = 20;
    canvas.width = mapW * cellSize;
    canvas.height = mapH * cellSize;

    // Draw map
    for (let y = 0; y < mapH; y++) {
        for (let x = 0; x < mapW; x++) {
            ctx.fillStyle = MAP[y][x] === 1 ? '#2d3140' : '#0f1117';
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }

    if (points.length === 0) {
        ctx.fillStyle = '#4a4e69';
        ctx.font = '14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Play a game to see movement data', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Build heat grid
    const heatGrid = Array.from({ length: mapH }, () => new Float32Array(mapW));
    let maxHeat = 0;

    for (const [px, py] of points) {
        const gx = Math.floor(px);
        const gy = Math.floor(py);
        if (gx >= 0 && gx < mapW && gy >= 0 && gy < mapH) {
            heatGrid[gy][gx]++;
            if (heatGrid[gy][gx] > maxHeat) maxHeat = heatGrid[gy][gx];
        }
    }

    if (maxHeat === 0) return;

    // Draw heat overlay
    for (let y = 0; y < mapH; y++) {
        for (let x = 0; x < mapW; x++) {
            if (MAP[y][x] === 1 || heatGrid[y][x] === 0) continue;
            const intensity = heatGrid[y][x] / maxHeat;
            // Color: blue (cold) -> green -> yellow -> red (hot)
            let r, g, b;
            if (intensity < 0.33) {
                const t = intensity / 0.33;
                r = 0; g = Math.floor(100 * t); b = Math.floor(200 * (1 - t));
            } else if (intensity < 0.66) {
                const t = (intensity - 0.33) / 0.33;
                r = Math.floor(255 * t); g = Math.floor(100 + 155 * t); b = 0;
            } else {
                const t = (intensity - 0.66) / 0.34;
                r = 255; g = Math.floor(255 * (1 - t)); b = 0;
            }
            ctx.fillStyle = `rgba(${r},${g},${b},${0.3 + intensity * 0.6})`;
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }

    // Draw path line for single-game view
    if (points.length < 500) {
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
            const sx = points[i][0] * cellSize;
            const sy = points[i][1] * cellSize;
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
    }
}

// ─── Real-time ───
db.channel('lb-page')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leaderboard' }, () => {
        loadAll();
    })
    .subscribe();

// ─── Init ───
loadAll();
