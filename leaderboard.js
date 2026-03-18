const SUPABASE_URL = 'https://fqpyyxgsyeepkpqrykgc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxcHl5eGdzeWVlcGtwcXJ5a2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MDgzOTksImV4cCI6MjA4OTM4NDM5OX0.N8q_ye3zdzeVV8bw_mQoCuiN4_rRTGJlIuBJSf3G-Pg';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let allData = [];
let currentView = 'all'; // 'all' | 'player' | 'game'
let currentPlayer = null;
let currentGame = null;
let currentVersion = 'v2'; // 'v2' | 'classic' | 'all'

// Chart.js defaults
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

// ─── Data ───
function getFilteredData() {
    let data = allData;
    if (currentVersion !== 'all') {
        data = data.filter(d => d.game_version === currentVersion);
    }
    if (currentView === 'player' && currentPlayer) {
        data = data.filter(d => d.player_name === currentPlayer);
    }
    return data;
}

// ─── Load ───
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
    renderAll();
}

function renderAll() {
    renderFilterBar();
    renderStats();
    renderTable();
    renderCharts();
    renderHeatmapControls();
}

// ─── Filter Bar ───
function renderFilterBar() {
    const bar = document.getElementById('filterBar');
    const value = document.getElementById('filterValue');
    const crumb = document.getElementById('filterCrumb');
    const title = document.getElementById('tableTitle');

    if (currentView === 'all') {
        bar.style.display = 'none';
        title.textContent = 'Top Scores';
    } else if (currentView === 'player') {
        bar.style.display = 'flex';
        value.textContent = currentPlayer;
        crumb.textContent = `${getFilteredData().length} game${getFilteredData().length !== 1 ? 's' : ''}`;
        title.textContent = `${escapeHtml(currentPlayer)}'s Games`;
    }
}

document.getElementById('filterReset').addEventListener('click', () => {
    currentView = 'all';
    currentPlayer = null;
    currentGame = null;
    hideGameDetail();
    renderAll();
});

// ─── Game Detail Panel ───
function showGameDetail(entry) {
    currentGame = entry;
    const panel = document.getElementById('gameDetail');
    const acc = getAccuracy(entry);
    const date = new Date(entry.created_at).toLocaleDateString();
    const time = new Date(entry.created_at).toLocaleTimeString();

    document.getElementById('detailTitle').textContent = `${entry.player_name} — Game #${entry.id}`;
    document.getElementById('detailDate').textContent = `${date} at ${time}`;

    document.getElementById('detailStats').innerHTML = `
        <div class="detail-stat"><div class="ds-val">${entry.score.toLocaleString()}</div><div class="ds-label">Score</div></div>
        <div class="detail-stat"><div class="ds-val">${entry.kills}</div><div class="ds-label">Kills</div></div>
        <div class="detail-stat"><div class="ds-val">${entry.wave}</div><div class="ds-label">Wave</div></div>
        <div class="detail-stat"><div class="ds-val">${acc}%</div><div class="ds-label">Accuracy</div></div>
        <div class="detail-stat"><div class="ds-val">${entry.shots_hit || 0}/${entry.shots_fired || 0}</div><div class="ds-label">Hits/Shots</div></div>
        <div class="detail-stat"><div class="ds-val">${formatTime(entry.time_survived)}</div><div class="ds-label">Survived</div></div>
    `;

    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Update heatmap to show this game
    if (entry.movement_data && entry.movement_data.length > 0) {
        drawHeatmap(entry.movement_data, true, entry);
    }
}

function hideGameDetail() {
    currentGame = null;
    document.getElementById('gameDetail').style.display = 'none';
}

document.getElementById('detailClose').addEventListener('click', () => {
    hideGameDetail();
    updateHeatmap();
});

// ─── Table ───
function renderTable() {
    const loading = document.getElementById('lbLoading');
    const table = document.getElementById('lbTable');
    const empty = document.getElementById('lbEmpty');
    const body = document.getElementById('lbBody');

    loading.style.display = 'none';

    const data = getFilteredData();

    if (data.length === 0) {
        table.style.display = 'none';
        empty.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    empty.style.display = 'none';

    body.innerHTML = data.slice(0, 50).map((entry, i) => {
        const rank = i + 1;
        const rankClass = rank <= 3 && currentView === 'all' ? `rank-${rank}` : '';
        const acc = getAccuracy(entry);
        const isSelected = currentGame && currentGame.id === entry.id;
        return `<tr class="${rankClass}" data-clickable data-id="${entry.id}" style="${isSelected ? 'background:rgba(99,102,241,0.1);' : ''}">
            <td class="rank-cell">#${rank}</td>
            <td class="name-cell"><span class="name-cell-link" data-player="${escapeHtml(entry.player_name)}">${escapeHtml(entry.player_name)}</span></td>
            <td class="score-cell right">${entry.score.toLocaleString()}</td>
            <td class="meta-cell right">${entry.kills}</td>
            <td class="meta-cell right">${acc}%</td>
            <td class="meta-cell right">${formatTime(entry.time_survived)}</td>
            <td class="meta-cell right">${entry.wave}</td>
        </tr>`;
    }).join('');

    // Click on row → show game detail
    body.querySelectorAll('tr[data-clickable]').forEach(row => {
        row.addEventListener('click', (e) => {
            // If clicking the player name, filter by player instead
            if (e.target.classList.contains('name-cell-link')) return;
            const id = Number(row.dataset.id);
            const entry = allData.find(d => d.id === id);
            if (entry) showGameDetail(entry);
        });
    });

    // Click on player name → filter to that player
    body.querySelectorAll('.name-cell-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.stopPropagation();
            const playerName = link.dataset.player;
            currentView = 'player';
            currentPlayer = playerName;
            currentGame = null;
            hideGameDetail();
            renderAll();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// ─── Stats ───
function renderStats() {
    const data = getFilteredData();
    if (data.length === 0) return;

    const uniquePlayers = new Set(data.map(d => d.player_name)).size;
    const highScore = Math.max(...data.map(d => d.score));
    const topWave = Math.max(...data.map(d => d.wave));

    const withShots = data.filter(d => d.shots_fired > 0);
    const avgAcc = withShots.length > 0
        ? Math.round(withShots.reduce((s, d) => s + (d.shots_hit / d.shots_fired), 0) / withShots.length * 100)
        : 0;

    document.getElementById('statPlayers').textContent = currentView === 'player' ? data.length : uniquePlayers.toLocaleString();
    document.getElementById('statGames').textContent = data.length.toLocaleString();
    document.getElementById('statHighScore').textContent = highScore.toLocaleString();
    document.getElementById('statTopWave').textContent = topWave;
    document.getElementById('statAvgAccuracy').textContent = avgAcc + '%';

    // Update label based on view
    document.querySelector('#statPlayers + .stat-label').textContent = currentView === 'player' ? 'Games' : 'Total Players';
}

// ─── Charts ───
let charts = {};

function destroyChart(id) {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function renderCharts() {
    const data = getFilteredData();
    if (data.length === 0) return;

    renderScoreDistChart(data);
    renderAccScoreChart(data);
    renderTimeWaveChart(data);
    renderAccDistChart(data);
}

function renderScoreDistChart(data) {
    destroyChart('scoreDist');
    const scores = data.map(d => d.score);
    const max = Math.max(...scores);
    const bucketSize = Math.max(100, Math.ceil(max / 8 / 100) * 100);
    const buckets = {};
    for (const s of scores) {
        const key = Math.floor(s / bucketSize) * bucketSize;
        buckets[key] = (buckets[key] || 0) + 1;
    }
    const labels = Object.keys(buckets).sort((a, b) => a - b);
    const vals = labels.map(k => buckets[k]);

    charts.scoreDist = new Chart(document.getElementById('chartScoreDist'), {
        type: 'bar',
        data: {
            labels: labels.map(l => `${Number(l).toLocaleString()}`),
            datasets: [{ data: vals, backgroundColor: 'rgba(99,102,241,0.6)', borderColor: 'rgba(99,102,241,0.9)', borderWidth: 1, borderRadius: 4 }]
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

function renderAccScoreChart(data) {
    destroyChart('accScore');
    const withShots = data.filter(d => d.shots_fired > 0);

    charts.accScore = new Chart(document.getElementById('chartAccScore'), {
        type: 'scatter',
        data: {
            datasets: [{
                data: withShots.map(d => ({ x: getAccuracy(d), y: d.score })),
                backgroundColor: 'rgba(99,102,241,0.5)',
                borderColor: 'rgba(99,102,241,0.8)',
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

function renderTimeWaveChart(data) {
    destroyChart('timeWave');
    const withTime = data.filter(d => d.time_survived > 0);
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
            datasets: [{ data: avgTimes, backgroundColor: 'rgba(34,197,94,0.5)', borderColor: 'rgba(34,197,94,0.8)', borderWidth: 1, borderRadius: 4 }]
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

function renderAccDistChart(data) {
    destroyChart('accDist');
    const withShots = data.filter(d => d.shots_fired > 0);
    const accs = withShots.map(d => getAccuracy(d));
    const buckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (const a of accs) { buckets[Math.min(9, Math.floor(a / 10))]++; }
    const labels = ['0-10%', '10-20%', '20-30%', '30-40%', '40-50%', '50-60%', '60-70%', '70-80%', '80-90%', '90-100%'];

    charts.accDist = new Chart(document.getElementById('chartAccDist'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{ data: buckets, backgroundColor: 'rgba(251,191,36,0.5)', borderColor: 'rgba(251,191,36,0.8)', borderWidth: 1, borderRadius: 4 }]
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
// Classic map (20x20)
const CLASSIC_MAP = [
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

function getMapForVersion(gameEntry) {
    // If a specific game has stored map data, use it
    if (gameEntry && gameEntry.map_data && gameEntry.map_data.length > 0) {
        const m = gameEntry.map_data;
        return { map: m, w: m[0].length, h: m.length };
    }
    // Classic uses the fixed map
    if (currentVersion === 'classic') return { map: CLASSIC_MAP, w: 20, h: 20 };
    // v2 without stored map — infer size from movement data
    return { map: null, w: 24, h: 24 };
}

function renderHeatmapControls() {
    const playerSelect = document.getElementById('heatmapPlayer');
    const gameSelect = document.getElementById('heatmapGame');

    const relevantData = getFilteredData();
    const playersWithData = [...new Set(
        relevantData.filter(d => d.movement_data && d.movement_data.length > 0)
            .map(d => d.player_name)
    )];

    if (playersWithData.length === 0) {
        playerSelect.innerHTML = '<option>No data yet</option>';
        gameSelect.innerHTML = '<option>-</option>';
        drawHeatmap([]);
        return;
    }

    if (currentView === 'player') {
        playerSelect.innerHTML = `<option value="${escapeHtml(currentPlayer)}">${escapeHtml(currentPlayer)}</option>`;
    } else {
        playerSelect.innerHTML = '<option value="__all__">All Players</option>' +
            playersWithData.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
    }

    // Remove old listeners by replacing elements
    const newPlayerSelect = playerSelect.cloneNode(true);
    playerSelect.parentNode.replaceChild(newPlayerSelect, playerSelect);
    const newGameSelect = gameSelect.cloneNode(true);
    gameSelect.parentNode.replaceChild(newGameSelect, gameSelect);

    newPlayerSelect.addEventListener('change', () => updateGameSelectDropdown());
    newGameSelect.addEventListener('change', () => updateHeatmap());

    updateGameSelectDropdown();
}

function updateGameSelectDropdown() {
    const playerSelect = document.getElementById('heatmapPlayer');
    const gameSelect = document.getElementById('heatmapGame');
    const selectedPlayer = playerSelect.value;

    let games;
    if (selectedPlayer === '__all__') {
        games = getFilteredData().filter(d => d.movement_data && d.movement_data.length > 0);
    } else {
        games = allData.filter(d => d.player_name === selectedPlayer && d.movement_data && d.movement_data.length > 0);
    }

    gameSelect.innerHTML = '<option value="__all__">All Games Combined</option>' +
        games.map(g => {
            const date = new Date(g.created_at).toLocaleDateString();
            return `<option value="${g.id}">Score ${g.score.toLocaleString()} - W${g.wave} - ${date}</option>`;
        }).join('');

    updateHeatmap();
}

function updateHeatmap() {
    const playerSelect = document.getElementById('heatmapPlayer');
    const gameSelect = document.getElementById('heatmapGame');
    const selectedPlayer = playerSelect.value;
    const selectedGame = gameSelect.value;

    let movementPoints = [];
    let isSingle = false;
    let gameEntry = null;

    if (selectedGame !== '__all__') {
        const game = allData.find(d => d.id === Number(selectedGame));
        if (game && game.movement_data) {
            movementPoints = game.movement_data;
            isSingle = true;
            gameEntry = game;
        }
    } else {
        let games;
        if (selectedPlayer === '__all__') {
            games = getFilteredData().filter(d => d.movement_data && d.movement_data.length > 0);
        } else {
            games = allData.filter(d => d.player_name === selectedPlayer && d.movement_data && d.movement_data.length > 0);
        }
        for (const g of games) movementPoints.push(...g.movement_data);
    }

    drawHeatmap(movementPoints, isSingle, gameEntry);
}

function drawHeatmap(points, showPath, gameEntry) {
    const canvas = document.getElementById('heatmapCanvas');
    const ctx = canvas.getContext('2d');
    const { map, w: mapW, h: mapH } = getMapForVersion(gameEntry);
    const cellSize = 18;
    const pxW = mapW * cellSize;
    const pxH = mapH * cellSize;
    canvas.width = pxW;
    canvas.height = pxH;

    // Background
    ctx.fillStyle = '#0a0b10';
    ctx.fillRect(0, 0, pxW, pxH);

    // Draw map walls (only for classic with known layout)
    if (map) {
        for (let y = 0; y < mapH; y++) {
            for (let x = 0; x < mapW; x++) {
                if (map[y][x] === 1) {
                    ctx.fillStyle = '#1e2030';
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                    // Subtle border
                    ctx.strokeStyle = '#282a3a';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }
    } else {
        // v2: draw subtle grid
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= mapW; x++) { ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, pxH); ctx.stroke(); }
        for (let y = 0; y <= mapH; y++) { ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(pxW, y * cellSize); ctx.stroke(); }
        // Border
        ctx.strokeStyle = '#1e2030';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, pxW, pxH);
    }

    if (points.length === 0) {
        ctx.fillStyle = '#4a4e69';
        ctx.font = '13px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Play a game to see movement data', pxW / 2, pxH / 2);
        return;
    }

    // Build high-res heat grid (2x resolution for smoothness)
    const res = 2;
    const gridW = mapW * res;
    const gridH = mapH * res;
    const heatGrid = Array.from({ length: gridH }, () => new Float32Array(gridW));

    for (const [px, py] of points) {
        const gx = Math.floor(px * res);
        const gy = Math.floor(py * res);
        if (gx >= 0 && gx < gridW && gy >= 0 && gy < gridH) {
            heatGrid[gy][gx]++;
        }
    }

    // Gaussian blur pass (3x3 kernel, 2 passes for smoothness)
    function blur(grid, w, h) {
        const out = Array.from({ length: h }, () => new Float32Array(w));
        const k = [0.1, 0.2, 0.4, 0.2, 0.1]; // 5-tap
        const kh = 2;
        // Horizontal
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let sum = 0, wt = 0;
                for (let i = -kh; i <= kh; i++) {
                    const nx = x + i;
                    if (nx >= 0 && nx < w) { sum += grid[y][nx] * k[i + kh]; wt += k[i + kh]; }
                }
                out[y][x] = sum / wt;
            }
        }
        // Vertical
        const out2 = Array.from({ length: h }, () => new Float32Array(w));
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let sum = 0, wt = 0;
                for (let i = -kh; i <= kh; i++) {
                    const ny = y + i;
                    if (ny >= 0 && ny < h) { sum += out[ny][x] * k[i + kh]; wt += k[i + kh]; }
                }
                out2[y][x] = sum / wt;
            }
        }
        return out2;
    }

    let smoothed = blur(heatGrid, gridW, gridH);
    smoothed = blur(smoothed, gridW, gridH);

    // Find max
    let maxHeat = 0;
    for (let y = 0; y < gridH; y++)
        for (let x = 0; x < gridW; x++)
            if (smoothed[y][x] > maxHeat) maxHeat = smoothed[y][x];

    if (maxHeat === 0) return;

    // Render heat with smooth color ramp
    const pixelSize = cellSize / res;
    for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
            if (smoothed[y][x] < maxHeat * 0.01) continue;
            // Skip wall cells in classic mode
            if (map && map[Math.floor(y / res)] && map[Math.floor(y / res)][Math.floor(x / res)] === 1) continue;

            const t = Math.pow(smoothed[y][x] / maxHeat, 0.7); // gamma for better spread
            // Smooth color ramp: dark blue → cyan → green → yellow → red → white
            let r, g, b;
            if (t < 0.2) {
                const s = t / 0.2;
                r = 0; g = Math.floor(30 * s); b = Math.floor(120 + 80 * s);
            } else if (t < 0.4) {
                const s = (t - 0.2) / 0.2;
                r = 0; g = Math.floor(30 + 180 * s); b = Math.floor(200 * (1 - s));
            } else if (t < 0.6) {
                const s = (t - 0.4) / 0.2;
                r = Math.floor(255 * s); g = Math.floor(210 + 45 * s); b = 0;
            } else if (t < 0.85) {
                const s = (t - 0.6) / 0.25;
                r = 255; g = Math.floor(255 * (1 - s * 0.8)); b = 0;
            } else {
                const s = (t - 0.85) / 0.15;
                r = 255; g = Math.floor(50 + 205 * s); b = Math.floor(200 * s);
            }
            const alpha = 0.15 + t * 0.75;
            ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
            ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize + 0.5, pixelSize + 0.5);
        }
    }

    // Path for single game
    if (showPath && points.length > 1 && points.length < 2000) {
        // Smooth path with slight glow
        ctx.shadowColor = 'rgba(99, 102, 241, 0.4)';
        ctx.shadowBlur = 4;
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
            const sx = points[i][0] * cellSize;
            const sy = points[i][1] * cellSize;
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Start marker (green with glow)
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(points[0][0] * cellSize, points[0][1] * cellSize, 4, 0, Math.PI * 2);
        ctx.fill();

        // End marker (red with glow)
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.beginPath();
        const last = points[points.length - 1];
        ctx.arc(last[0] * cellSize, last[1] * cellSize, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Legend
        ctx.font = '10px system-ui';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#22c55e'; ctx.fillText('Start', 8, pxH - 8);
        ctx.fillStyle = '#ef4444'; ctx.fillText('Death', 45, pxH - 8);
    }

    // Heatmap version label
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#3a3d52';
    ctx.fillText(`${points.length} samples`, pxW - 8, pxH - 8);
}

// ─── Real-time ───
db.channel('lb-page')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leaderboard' }, () => {
        loadAll();
    })
    .subscribe();

// ─── Version Tabs ───
document.querySelectorAll('.version-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.version-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentVersion = tab.dataset.version;
        currentView = 'all';
        currentPlayer = null;
        currentGame = null;
        hideGameDetail();
        renderAll();
    });
});

// ─── Init ───
loadAll();
