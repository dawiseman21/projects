// ─── Mini FPS v2 — Evolved ───

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 500;
canvas.width = W;
canvas.height = H;

// ─── Audio Engine ───
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type, opts = {}) {
    if (!soundEnabled || !audioCtx) return;
    const now = audioCtx.currentTime;
    const vol = opts.volume || 1;

    switch (type) {
        case 'rifle': {
            const bufSize = audioCtx.sampleRate * 0.07;
            const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 4);
            const src = audioCtx.createBufferSource(); src.buffer = buf;
            const g = audioCtx.createGain(); g.gain.setValueAtTime(0.35 * vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
            const f = audioCtx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(2000, now); f.frequency.exponentialRampToValueAtTime(400, now + 0.07);
            src.connect(f).connect(g).connect(audioCtx.destination); src.start(now); src.stop(now + 0.07);
            const o = audioCtx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(120, now); o.frequency.exponentialRampToValueAtTime(30, now + 0.08);
            const og = audioCtx.createGain(); og.gain.setValueAtTime(0.4 * vol, now); og.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            o.connect(og).connect(audioCtx.destination); o.start(now); o.stop(now + 0.08);
            break;
        }
        case 'shotgun': {
            const bufSize = audioCtx.sampleRate * 0.15;
            const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 2);
            const src = audioCtx.createBufferSource(); src.buffer = buf;
            const g = audioCtx.createGain(); g.gain.setValueAtTime(0.5 * vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(1500, now); f.frequency.exponentialRampToValueAtTime(200, now + 0.15);
            src.connect(f).connect(g).connect(audioCtx.destination); src.start(now); src.stop(now + 0.15);
            const o = audioCtx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(80, now); o.frequency.exponentialRampToValueAtTime(20, now + 0.2);
            const og = audioCtx.createGain(); og.gain.setValueAtTime(0.6 * vol, now); og.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            o.connect(og).connect(audioCtx.destination); o.start(now); o.stop(now + 0.2);
            break;
        }
        case 'hit': {
            const o = audioCtx.createOscillator(); o.type = 'square';
            o.frequency.setValueAtTime(250, now); o.frequency.exponentialRampToValueAtTime(100, now + 0.05);
            const g = audioCtx.createGain(); g.gain.setValueAtTime(0.2 * vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            o.connect(g).connect(audioCtx.destination); o.start(now); o.stop(now + 0.05);
            break;
        }
        case 'kill': {
            [0, 0.06].forEach((delay, i) => {
                const o = audioCtx.createOscillator(); o.type = 'sine';
                o.frequency.setValueAtTime(500 + i * 300, now + delay);
                o.frequency.exponentialRampToValueAtTime(900 + i * 400, now + delay + 0.1);
                const g = audioCtx.createGain(); g.gain.setValueAtTime(0.18 * vol, now + delay); g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);
                o.connect(g).connect(audioCtx.destination); o.start(now + delay); o.stop(now + delay + 0.12);
            });
            break;
        }
        case 'hurt': {
            const bufSize = audioCtx.sampleRate * 0.12;
            const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 2) * 0.4;
            const src = audioCtx.createBufferSource(); src.buffer = buf;
            const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
            const g = audioCtx.createGain(); g.gain.setValueAtTime(0.35 * vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            src.connect(f).connect(g).connect(audioCtx.destination); src.start(now); src.stop(now + 0.12);
            break;
        }
        case 'wave': {
            [0, 0.12, 0.24].forEach((delay, i) => {
                const o = audioCtx.createOscillator(); o.type = 'sine';
                o.frequency.setValueAtTime(400 + i * 250, now + delay);
                const g = audioCtx.createGain(); g.gain.setValueAtTime(0.18, now + delay); g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.3);
                o.connect(g).connect(audioCtx.destination); o.start(now + delay); o.stop(now + delay + 0.3);
            });
            break;
        }
        case 'boss': {
            const o = audioCtx.createOscillator(); o.type = 'sawtooth';
            o.frequency.setValueAtTime(60, now); o.frequency.setValueAtTime(80, now + 0.2); o.frequency.setValueAtTime(60, now + 0.4);
            const g = audioCtx.createGain(); g.gain.setValueAtTime(0.3, now); g.gain.linearRampToValueAtTime(0, now + 0.6);
            const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
            o.connect(f).connect(g).connect(audioCtx.destination); o.start(now); o.stop(now + 0.6);
            // Alarm beeps
            [0, 0.15, 0.3].forEach(delay => {
                const b = audioCtx.createOscillator(); b.type = 'square'; b.frequency.value = 800;
                const bg = audioCtx.createGain(); bg.gain.setValueAtTime(0.1, now + delay); bg.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);
                b.connect(bg).connect(audioCtx.destination); b.start(now + delay); b.stop(now + delay + 0.08);
            });
            break;
        }
        case 'death': {
            const o = audioCtx.createOscillator(); o.type = 'sawtooth';
            o.frequency.setValueAtTime(300, now); o.frequency.exponentialRampToValueAtTime(30, now + 1);
            const g = audioCtx.createGain(); g.gain.setValueAtTime(0.25, now); g.gain.linearRampToValueAtTime(0, now + 1);
            const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(2000, now); f.frequency.exponentialRampToValueAtTime(80, now + 1);
            o.connect(f).connect(g).connect(audioCtx.destination); o.start(now); o.stop(now + 1);
            break;
        }
        case 'pickup': {
            [0, 0.08, 0.16].forEach((delay, i) => {
                const o = audioCtx.createOscillator(); o.type = 'sine';
                o.frequency.value = 600 + i * 200;
                const g = audioCtx.createGain(); g.gain.setValueAtTime(0.15, now + delay); g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);
                o.connect(g).connect(audioCtx.destination); o.start(now + delay); o.stop(now + delay + 0.12);
            });
            break;
        }
        case 'combo': {
            const o = audioCtx.createOscillator(); o.type = 'sine';
            o.frequency.setValueAtTime(800 + (opts.streak || 0) * 100, now);
            const g = audioCtx.createGain(); g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            o.connect(g).connect(audioCtx.destination); o.start(now); o.stop(now + 0.1);
            break;
        }
        case 'footstep': {
            const o = audioCtx.createOscillator(); o.type = 'sine';
            o.frequency.setValueAtTime(55 + Math.random() * 25, now);
            const g = audioCtx.createGain(); g.gain.setValueAtTime(0.05, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            o.connect(g).connect(audioCtx.destination); o.start(now); o.stop(now + 0.04);
            break;
        }
        case 'enemyGrowl': {
            const dist = opts.dist || 5;
            const growlVol = Math.max(0.01, 0.15 * (1 - dist / 10));
            const o = audioCtx.createOscillator(); o.type = 'sawtooth';
            o.frequency.setValueAtTime(60 + Math.random() * 30, now);
            const g = audioCtx.createGain(); g.gain.setValueAtTime(growlVol, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
            o.connect(f).connect(g).connect(audioCtx.destination); o.start(now); o.stop(now + 0.15);
            break;
        }
    }
}

let ambientOsc = null;
function startAmbient() {
    if (!soundEnabled || !audioCtx || ambientOsc) return;
    ambientOsc = audioCtx.createOscillator(); ambientOsc.type = 'sine'; ambientOsc.frequency.value = 40;
    const lfo = audioCtx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.25;
    const lg = audioCtx.createGain(); lg.gain.value = 8;
    lfo.connect(lg).connect(ambientOsc.frequency); lfo.start();
    const g = audioCtx.createGain(); g.gain.value = 0.035;
    ambientOsc.connect(g).connect(audioCtx.destination); ambientOsc.start();
}
function stopAmbient() { if (ambientOsc) { ambientOsc.stop(); ambientOsc = null; } }

const soundToggle = document.getElementById('soundToggle');
soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggle.textContent = soundEnabled ? 'Sound: ON' : 'Sound: OFF';
    if (!soundEnabled) stopAmbient(); else if (gameRunning) startAmbient();
});

// ─── Supabase ───
const SUPABASE_URL = 'https://fqpyyxgsyeepkpqrykgc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxcHl5eGdzeWVlcGtwcXJ5a2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MDgzOTksImV4cCI6MjA4OTM4NDM5OX0.N8q_ye3zdzeVV8bw_mQoCuiN4_rRTGJlIuBJSf3G-Pg';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const LB_MAX = 10;
let leaderboardCache = [];
let lastInsertedId = null;

async function fetchLeaderboard() {
    const { data } = await db.from('leaderboard').select('*').eq('game_version', 'v2').order('score', { ascending: false }).limit(LB_MAX);
    if (data) leaderboardCache = data;
    return leaderboardCache;
}

async function saveScore(scoreVal, killsVal, waveVal) {
    const name = getPlayerName();
    const { data, error } = await db.from('leaderboard').insert({
        player_name: name, score: scoreVal, kills: killsVal, wave: waveVal,
        shots_fired: shotsFired, shots_hit: shotsHit,
        time_survived: Math.round(timeSurvived * 10) / 10,
        movement_data: movementData,
        game_version: 'v2',
        map_data: MAP
    }).select().single();
    if (!error && data) { lastInsertedId = data.id; await fetchLeaderboard(); return data.id; }
    return null;
}

function getPlayerName() {
    const input = document.getElementById('playerName');
    const name = (input ? input.value.trim() : '') || 'Anonymous';
    localStorage.setItem('minifps_name', name);
    return name;
}

function renderLeaderboard(containerId, highlightId) {
    const container = document.getElementById(containerId);
    if (leaderboardCache.length === 0) {
        container.innerHTML = '<h3>Global Leaderboard</h3><div class="lb-empty">No scores yet. Be the first!</div>';
        return;
    }
    let html = '<h3>Global Leaderboard</h3><ol>';
    for (const entry of leaderboardCache) {
        const isNew = entry.id === highlightId;
        const date = new Date(entry.created_at).toLocaleDateString();
        const name = entry.player_name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        html += `<li class="${isNew ? 'lb-new' : ''}"><span class="lb-details"><strong>${name}</strong> &bull; W${entry.wave} &bull; ${entry.kills} kills &bull; ${date}</span><span class="lb-score">${entry.score.toLocaleString()}</span></li>`;
    }
    container.innerHTML = html + '</ol>';
}

db.channel('lb-v2').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leaderboard' }, async () => {
    await fetchLeaderboard();
    if (document.getElementById('startScreen').style.display !== 'none') renderLeaderboard('startLeaderboard', lastInsertedId);
    if (document.getElementById('deathScreen').style.display !== 'none') renderLeaderboard('deathLeaderboard', lastInsertedId);
}).subscribe();

// ─── Procedural Map Generation ───
const MAP_W = 24;
const MAP_H = 24;
let MAP = [];

function generateMap() {
    MAP = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(1));

    // Carve rooms
    const rooms = [];
    const roomAttempts = 20;
    for (let a = 0; a < roomAttempts; a++) {
        const rw = 3 + Math.floor(Math.random() * 4);
        const rh = 3 + Math.floor(Math.random() * 4);
        const rx = 2 + Math.floor(Math.random() * (MAP_W - rw - 4));
        const ry = 2 + Math.floor(Math.random() * (MAP_H - rh - 4));

        let overlap = false;
        for (const r of rooms) {
            if (rx - 1 < r.x + r.w && rx + rw + 1 > r.x && ry - 1 < r.y + r.h && ry + rh + 1 > r.y) { overlap = true; break; }
        }
        if (overlap) continue;

        for (let y = ry; y < ry + rh; y++)
            for (let x = rx; x < rx + rw; x++) MAP[y][x] = 0;
        rooms.push({ x: rx, y: ry, w: rw, h: rh, cx: Math.floor(rx + rw / 2), cy: Math.floor(ry + rh / 2) });
    }

    // Connect rooms with corridors
    for (let i = 1; i < rooms.length; i++) {
        let { cx: x1, cy: y1 } = rooms[i - 1];
        let { cx: x2, cy: y2 } = rooms[i];
        while (x1 !== x2) { MAP[y1][x1] = 0; x1 += x1 < x2 ? 1 : -1; }
        while (y1 !== y2) { MAP[y1][x1] = 0; y1 += y1 < y2 ? 1 : -1; }
        MAP[y2][x2] = 0;
    }

    // Ensure border walls
    for (let x = 0; x < MAP_W; x++) { MAP[0][x] = 1; MAP[MAP_H - 1][x] = 1; }
    for (let y = 0; y < MAP_H; y++) { MAP[y][0] = 1; MAP[y][MAP_W - 1] = 1; }

    // Player spawn in first room
    if (rooms.length > 0) {
        player.x = rooms[0].cx + 0.5;
        player.y = rooms[0].cy + 0.5;
    }

    return rooms;
}

// ─── Particles ───
let particles = [];

function spawnParticles(x, y, color, count, speed, life) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = speed * (0.5 + Math.random());
        particles.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life, maxLife: life, color });
    }
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

// ─── Pickups ───
let pickups = [];
const PICKUP_TYPES = {
    health: { color: '#22c55e', icon: '+', effect: (p) => { p.health = Math.min(100, p.health + 25); } },
    speed: { color: '#3b82f6', icon: 'S', effect: (p) => { p.speedBoost = 2.0; } },
    damage: { color: '#ef4444', icon: 'D', effect: (p) => { p.damageBoost = 3.0; } },
};

function spawnPickup() {
    const types = Object.keys(PICKUP_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    let x, y, attempts = 0;
    do {
        x = 1.5 + Math.random() * (MAP_W - 3);
        y = 1.5 + Math.random() * (MAP_H - 3);
        attempts++;
    } while (attempts < 30 && (MAP[Math.floor(y)][Math.floor(x)] === 1 || Math.sqrt((x - player.x) ** 2 + (y - player.y) ** 2) < 3));
    if (MAP[Math.floor(y)] && MAP[Math.floor(y)][Math.floor(x)] === 0) {
        pickups.push({ x, y, type, bobPhase: Math.random() * Math.PI * 2 });
    }
}

// ─── Screen Shake ───
let shakeAmount = 0;
let shakeX = 0, shakeY = 0;

function addShake(amount) { shakeAmount = Math.max(shakeAmount, amount); }

function updateShake(dt) {
    if (shakeAmount > 0) {
        shakeX = (Math.random() - 0.5) * shakeAmount * 2;
        shakeY = (Math.random() - 0.5) * shakeAmount * 2;
        shakeAmount *= Math.pow(0.05, dt); // decay
        if (shakeAmount < 0.3) { shakeAmount = 0; shakeX = 0; shakeY = 0; }
    }
}

// ─── Enemy Types ───
const ENEMY_TYPES = {
    rusher: { color: 'hsl(0, 75%, 50%)', speed: 2.5, health: 20, damage: 6, size: 0.25, score: 80, eyeColor: '#ff0' },
    soldier: { color: 'hsl(340, 65%, 45%)', speed: 1.3, health: 50, damage: 10, size: 0.3, score: 120, eyeColor: '#f33' },
    tank: { color: 'hsl(270, 60%, 40%)', speed: 0.7, health: 120, damage: 18, size: 0.45, score: 200, eyeColor: '#f0f' },
    boss: { color: 'hsl(30, 80%, 45%)', speed: 0.9, health: 400, damage: 25, size: 0.55, score: 500, eyeColor: '#fff' },
};

class Enemy {
    constructor(x, y, type) {
        const t = ENEMY_TYPES[type];
        this.x = x; this.y = y; this.type = type;
        this.health = t.health; this.maxHealth = t.health;
        this.speed = t.speed + Math.random() * 0.3;
        this.size = t.size; this.damage = t.damage;
        this.color = t.color; this.eyeColor = t.eyeColor;
        this.scoreValue = t.score;
        this.attackRange = type === 'boss' ? 1.2 : 0.8;
        this.attackCooldown = 0; this.attackRate = type === 'tank' ? 1.5 : 1.0;
        this.hitFlash = 0;
        this.growlTimer = 2 + Math.random() * 4;
    }

    update(dt) {
        if (this.hitFlash > 0) this.hitFlash -= dt;
        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Growl sound
        this.growlTimer -= dt;
        if (this.growlTimer <= 0 && dist < 8) {
            playSound('enemyGrowl', { dist });
            this.growlTimer = 3 + Math.random() * 4;
        }

        if (dist > this.attackRange) {
            const spd = this.speed * dt;
            const mx = (dx / dist) * spd;
            const my = (dy / dist) * spd;
            const nx = this.x + mx, ny = this.y + my;
            if (MAP[Math.floor(ny)] && MAP[Math.floor(ny)][Math.floor(nx)] === 0) { this.x = nx; this.y = ny; }
            else if (MAP[Math.floor(this.y)] && MAP[Math.floor(this.y)][Math.floor(nx)] === 0) { this.x = nx; }
            else if (MAP[Math.floor(ny)] && MAP[Math.floor(ny)][Math.floor(this.x)] === 0) { this.y = ny; }
        } else if (this.attackCooldown <= 0) {
            player.health -= this.damage;
            this.attackCooldown = this.attackRate;
            playSound('hurt');
            flashScreen();
            addShake(this.type === 'boss' ? 12 : 6);
        }
    }
}

// ─── Weapons ───
const WEAPONS = {
    rifle: { name: 'Rifle', rate: 0.22, damage: 30, spread: 0, rays: 1, rangeMult: 1, key: '1' },
    shotgun: { name: 'Shotgun', rate: 0.6, damage: 18, spread: 0.12, rays: 6, rangeMult: 0.6, key: '2' },
};
let currentWeapon = 'rifle';

// ─── Player & Game State ───
let player = { x: 3, y: 3, angle: 0, health: 100, speedBoost: 0, damageBoost: 0 };
const MOVE_SPEED = 3.2;
const ROT_SPEED = 0.003;
const FOV = Math.PI / 3;
const HALF_FOV = FOV / 2;
const NUM_RAYS = W;

let enemies = [];
let score = 0;
let kills = 0;
let wave = 0;
let gameRunning = false;
let paused = false;
let lastTime = 0;
let keys = {};
let shootCooldown = 0;
let footstepTimer = 0;
const FOOTSTEP_INTERVAL = 0.3;

// Tracking
let shotsFired = 0;
let shotsHit = 0;
let timeSurvived = 0;
let movementData = [];
let movementSampleTimer = 0;
const MOVEMENT_SAMPLE_INTERVAL = 0.25;

// Combo
let comboCount = 0;
let comboTimer = 0;
const COMBO_WINDOW = 1.5;

// Wave announcement
let waveAnnounceTimer = 0;

// Wall textures
const WALL_COLORS_NS = ['#3a3d52', '#434660', '#35384a', '#2d3040'];
const WALL_COLORS_EW = ['#5558d4', '#6366f1', '#4448b8', '#7174f4'];

// ─── Raycasting ───
function castRay(angle) {
    const sin = Math.sin(angle), cos = Math.cos(angle);
    let t = 0;
    const maxDist = 20, step = 0.02;
    while (t < maxDist) {
        const x = player.x + cos * t, y = player.y + sin * t;
        const mx = Math.floor(x), my = Math.floor(y);
        if (mx < 0 || mx >= MAP_W || my < 0 || my >= MAP_H) break;
        if (MAP[my][mx] === 1) {
            const px = Math.floor(player.x + cos * (t - step));
            const py = Math.floor(player.y + sin * (t - step));
            return { dist: t, isEW: px !== mx, mapX: mx, mapY: my, hitX: x, hitY: y };
        }
        t += step;
    }
    return { dist: maxDist, isEW: false, mapX: -1, mapY: -1 };
}

// ─── Rendering ───
function render() {
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H / 2);
    skyGrad.addColorStop(0, '#050510'); skyGrad.addColorStop(1, '#151530');
    ctx.fillStyle = skyGrad; ctx.fillRect(-10, -10, W + 20, H / 2 + 10);

    // Floor
    const floorGrad = ctx.createLinearGradient(0, H / 2, 0, H);
    floorGrad.addColorStop(0, '#151520'); floorGrad.addColorStop(1, '#08080e');
    ctx.fillStyle = floorGrad; ctx.fillRect(-10, H / 2, W + 20, H / 2 + 10);

    const depthBuffer = new Float32Array(W);

    // Walls
    for (let i = 0; i < NUM_RAYS; i++) {
        const rayAngle = player.angle - HALF_FOV + (i / NUM_RAYS) * FOV;
        const hit = castRay(rayAngle);
        const corrDist = hit.dist * Math.cos(rayAngle - player.angle);
        depthBuffer[i] = corrDist;
        const wallH = Math.min(H * 2, H / corrDist);
        const wallTop = (H - wallH) / 2;
        const shade = Math.max(0.12, 1 - corrDist / 14);

        // Brick pattern
        const texU = hit.isEW ? hit.hitY % 1 : hit.hitX % 1;
        const brickShade = (Math.floor(texU * 4) + Math.floor(hit.hitY * 4 + hit.hitX * 4)) % 2 === 0 ? 0.9 : 1;

        const colors = hit.isEW ? WALL_COLORS_EW : WALL_COLORS_NS;
        const idx = Math.abs(hit.mapX * 7 + hit.mapY * 13) % colors.length;
        ctx.fillStyle = shadeColor(colors[idx], shade * brickShade);
        ctx.fillRect(i, wallTop, 1, wallH);

        // Top/bottom edge shading
        if (wallH > 8) {
            const eg = ctx.createLinearGradient(i, wallTop, i, wallTop + wallH);
            eg.addColorStop(0, 'rgba(0,0,0,0.35)'); eg.addColorStop(0.08, 'rgba(0,0,0,0)');
            eg.addColorStop(0.92, 'rgba(0,0,0,0)'); eg.addColorStop(1, 'rgba(0,0,0,0.35)');
            ctx.fillStyle = eg; ctx.fillRect(i, wallTop, 1, wallH);
        }
    }

    // Sprites (enemies + pickups)
    const sprites = [];

    for (const e of enemies) {
        const dx = e.x - player.x, dy = e.y - player.y;
        sprites.push({ type: 'enemy', obj: e, dist: Math.sqrt(dx * dx + dy * dy), dx, dy });
    }
    for (const p of pickups) {
        const dx = p.x - player.x, dy = p.y - player.y;
        sprites.push({ type: 'pickup', obj: p, dist: Math.sqrt(dx * dx + dy * dy), dx, dy });
    }

    sprites.sort((a, b) => b.dist - a.dist);

    for (const spr of sprites) {
        if (spr.dist < 0.3) continue;
        const angleToSpr = Math.atan2(spr.dy, spr.dx);
        let relAngle = angleToSpr - player.angle;
        while (relAngle > Math.PI) relAngle -= 2 * Math.PI;
        while (relAngle < -Math.PI) relAngle += 2 * Math.PI;
        if (Math.abs(relAngle) > HALF_FOV + 0.3) continue;

        const screenX = (0.5 + relAngle / FOV) * W;

        if (spr.type === 'enemy') {
            renderEnemy(spr.obj, spr.dist, screenX, depthBuffer);
        } else {
            renderPickup(spr.obj, spr.dist, screenX, depthBuffer);
        }
    }

    // Particles
    renderParticles(depthBuffer);

    // Vignette
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.7);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig; ctx.fillRect(-10, -10, W + 20, H + 20);

    // Low health red overlay
    if (player.health <= 30 && player.health > 0) {
        const pulse = 0.1 + Math.sin(Date.now() / 200) * 0.05;
        ctx.fillStyle = `rgba(200, 0, 0, ${pulse})`;
        ctx.fillRect(-10, -10, W + 20, H + 20);
    }

    ctx.restore();

    drawGun();
    drawMinimap();
}

function renderEnemy(enemy, dist, screenX, depthBuffer) {
    const sprH = Math.min(H * 1.5, (H * 0.6 * (enemy.size / 0.3)) / dist);
    const sprW = sprH * 0.6;
    const sprTop = (H - sprH) / 2;
    const startCol = Math.max(0, Math.floor(screenX - sprW / 2));
    const endCol = Math.min(W - 1, Math.floor(screenX + sprW / 2));

    for (let col = startCol; col <= endCol; col++) {
        if (depthBuffer[col] < dist) continue;
        const sc = (col - (screenX - sprW / 2)) / sprW;
        const cd = Math.abs(sc - 0.5) * 2;
        if (cd > 0.9) continue;

        const shade = Math.max(0.15, 1 - dist / 12);
        const baseColor = enemy.hitFlash > 0 ? '#ffffff' : enemy.color;
        ctx.fillStyle = shadeColor(baseColor, shade);

        if (sc > 0.2 && sc < 0.8) ctx.fillRect(col, sprTop, 1, sprH * 0.22);
        const bodyTop = sprTop + sprH * 0.18;
        ctx.fillRect(col, bodyTop, 1, sprH * 0.82 * (1 - cd * 0.3));

        // Eyes
        const eyeY = sprTop + sprH * 0.07;
        if ((sc > 0.3 && sc < 0.42) || (sc > 0.58 && sc < 0.7)) {
            ctx.fillStyle = enemy.hitFlash > 0 ? '#fff' : enemy.eyeColor;
            ctx.globalAlpha = shade;
            ctx.fillRect(col, eyeY, 1, Math.max(2, sprH * 0.05));
            ctx.globalAlpha = 1;
        }
    }

    // Health bar
    if (enemy.health < enemy.maxHealth) {
        const bw = sprW * 0.6, bx = screenX - bw / 2, by = sprTop - 10;
        const hp = enemy.health / enemy.maxHealth;
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(bx, by, bw, 5);
        ctx.fillStyle = hp > 0.5 ? '#22c55e' : hp > 0.25 ? '#fbbf24' : '#ef4444';
        ctx.fillRect(bx, by, bw * hp, 5);
        // Boss label
        if (enemy.type === 'boss') {
            ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
            ctx.fillText('BOSS', screenX, by - 4);
        }
    }
}

function renderPickup(pickup, dist, screenX, depthBuffer) {
    const pt = PICKUP_TYPES[pickup.type];
    const bob = Math.sin(Date.now() / 300 + pickup.bobPhase) * 8;
    const sprH = Math.min(80, (H * 0.2) / dist);
    const sprTop = (H - sprH) / 2 + bob;
    const startCol = Math.max(0, Math.floor(screenX - sprH / 2));
    const endCol = Math.min(W - 1, Math.floor(screenX + sprH / 2));

    const shade = Math.max(0.3, 1 - dist / 10);
    // Glow
    for (let col = startCol; col <= endCol; col++) {
        if (depthBuffer[col] < dist) continue;
        const sc = (col - (screenX - sprH / 2)) / sprH;
        const cd = Math.abs(sc - 0.5) * 2;
        if (cd > 0.8) continue;
        ctx.fillStyle = shadeColor(pt.color, shade * (1 - cd * 0.5));
        ctx.globalAlpha = 0.7;
        ctx.fillRect(col, sprTop, 1, sprH * (1 - cd * 0.3));
        ctx.globalAlpha = 1;
    }
}

function renderParticles(depthBuffer) {
    for (const p of particles) {
        const dx = p.x - player.x, dy = p.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.2) continue;
        const a = Math.atan2(dy, dx);
        let rel = a - player.angle;
        while (rel > Math.PI) rel -= 2 * Math.PI;
        while (rel < -Math.PI) rel += 2 * Math.PI;
        if (Math.abs(rel) > HALF_FOV + 0.1) continue;

        const sx = (0.5 + rel / FOV) * W;
        const col = Math.floor(sx);
        if (col < 0 || col >= W || depthBuffer[col] < dist) continue;

        const size = Math.max(1, 4 / dist);
        const alpha = (p.life / p.maxLife) * Math.min(1, 1 - dist / 15);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(sx - size / 2, H / 2 - size / 2, size, size);
        ctx.globalAlpha = 1;
    }
}

function drawGun() {
    const wp = WEAPONS[currentWeapon];
    const gunX = W * 0.65;
    const gunY = H * 0.62;
    const isMoving = keys['w'] || keys['s'] || keys['a'] || keys['d'];
    const bobSpeed = isMoving ? 150 : 300;
    const bobAmt = isMoving ? 4 : 1.5;
    const bobX = Math.sin(Date.now() / bobSpeed) * bobAmt;
    const bobY = Math.abs(Math.cos(Date.now() / bobSpeed)) * bobAmt * 1.5;

    // Recoil
    const recoil = shootCooldown > 0 ? Math.max(0, (shootCooldown - wp.rate * 0.5) / (wp.rate * 0.5)) * 15 : 0;

    ctx.save();
    ctx.translate(gunX + bobX + shakeX * 0.3, gunY + bobY - recoil + shakeY * 0.3);

    if (currentWeapon === 'rifle') {
        ctx.fillStyle = '#2a2a3a'; ctx.fillRect(-12, 5, 24, 75);
        ctx.fillStyle = '#3a3a4a'; ctx.fillRect(-10, -35, 20, 44);
        ctx.fillStyle = '#1a1a2a'; ctx.fillRect(-5, -80, 10, 50);
        ctx.fillStyle = '#333'; ctx.fillRect(-3, -85, 6, 8);
        ctx.fillStyle = '#222235'; ctx.fillRect(-8, 35, 16, 38);
    } else {
        // Shotgun — wider, chunkier
        ctx.fillStyle = '#2a2a3a'; ctx.fillRect(-18, 5, 36, 75);
        ctx.fillStyle = '#3a3a4a'; ctx.fillRect(-14, -30, 28, 40);
        ctx.fillStyle = '#1a1a2a'; ctx.fillRect(-8, -70, 16, 45);
        ctx.fillStyle = '#444'; ctx.fillRect(-6, -75, 5, 10);
        ctx.fillStyle = '#444'; ctx.fillRect(1, -75, 5, 10);
        ctx.fillStyle = '#222235'; ctx.fillRect(-12, 35, 24, 38);
    }

    // Muzzle flash
    if (shootCooldown > wp.rate * 0.65) {
        const flashSize = currentWeapon === 'shotgun' ? 22 : 14;
        ctx.fillStyle = 'rgba(255, 220, 80, 0.9)';
        ctx.beginPath(); ctx.arc(0, currentWeapon === 'shotgun' ? -70 : -85, flashSize, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 200, 0.6)';
        ctx.beginPath(); ctx.arc(0, currentWeapon === 'shotgun' ? -70 : -85, flashSize * 0.5, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
}

function drawMinimap() {
    const mmSize = 120;
    const mmX = W - mmSize - 15;
    const mmY = 15;
    const cellSize = mmSize / Math.max(MAP_W, MAP_H);

    ctx.globalAlpha = 0.7;
    ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';
    ctx.fillRect(mmX - 2, mmY - 2, MAP_W * cellSize + 4, MAP_H * cellSize + 4);

    for (let y = 0; y < MAP_H; y++) {
        for (let x = 0; x < MAP_W; x++) {
            ctx.fillStyle = MAP[y][x] === 1 ? '#2d3140' : '#0f1117';
            ctx.fillRect(mmX + x * cellSize, mmY + y * cellSize, cellSize, cellSize);
        }
    }

    // Pickups
    for (const p of pickups) {
        ctx.fillStyle = PICKUP_TYPES[p.type].color;
        ctx.fillRect(mmX + p.x * cellSize - 1, mmY + p.y * cellSize - 1, 3, 3);
    }

    // Enemies
    for (const e of enemies) {
        ctx.fillStyle = e.type === 'boss' ? '#fbbf24' : '#ef4444';
        const dotSize = e.type === 'boss' ? 4 : 2;
        ctx.fillRect(mmX + e.x * cellSize - dotSize / 2, mmY + e.y * cellSize - dotSize / 2, dotSize, dotSize);
    }

    // Player
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(mmX + player.x * cellSize - 2, mmY + player.y * cellSize - 2, 4, 4);
    // Direction line
    ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mmX + player.x * cellSize, mmY + player.y * cellSize);
    ctx.lineTo(mmX + (player.x + Math.cos(player.angle) * 2) * cellSize, mmY + (player.y + Math.sin(player.angle) * 2) * cellSize);
    ctx.stroke();

    ctx.globalAlpha = 1;
}

// ─── Game Logic ───
function spawnWave() {
    wave++;
    waveAnnounceTimer = 2.0;
    const isBoss = wave % 5 === 0;

    if (isBoss) {
        playSound('boss');
        showWaveAnnounce(`BOSS WAVE ${wave}`);
    } else {
        playSound('wave');
        showWaveAnnounce(`WAVE ${wave}`);
    }

    const baseCount = 3 + wave * 2;

    if (isBoss) {
        // Spawn boss + some minions
        spawnEnemyOfType('boss', 1);
        spawnEnemyOfType('rusher', Math.floor(wave / 2));
    } else {
        // Mix of types based on wave
        const rusherCount = Math.max(1, Math.floor(baseCount * 0.4));
        const soldierCount = Math.max(1, Math.floor(baseCount * 0.4));
        const tankCount = wave >= 3 ? Math.floor(baseCount * 0.2) : 0;
        spawnEnemyOfType('rusher', rusherCount);
        spawnEnemyOfType('soldier', soldierCount);
        spawnEnemyOfType('tank', tankCount);
    }

    // Spawn pickups
    const pickupCount = 1 + Math.floor(wave / 3);
    for (let i = 0; i < pickupCount; i++) spawnPickup();
}

function spawnEnemyOfType(type, count) {
    const t = ENEMY_TYPES[type];
    for (let i = 0; i < count; i++) {
        let x, y, attempts = 0;
        do {
            x = 1.5 + Math.random() * (MAP_W - 3);
            y = 1.5 + Math.random() * (MAP_H - 3);
            attempts++;
        } while (attempts < 50 && (MAP[Math.floor(y)][Math.floor(x)] === 1 || Math.sqrt((x - player.x) ** 2 + (y - player.y) ** 2) < 5));

        if (MAP[Math.floor(y)] && MAP[Math.floor(y)][Math.floor(x)] === 0) {
            const e = new Enemy(x, y, type);
            // Scale with wave
            e.maxHealth = t.health + wave * (type === 'boss' ? 50 : 5);
            e.health = e.maxHealth;
            e.speed = t.speed + wave * 0.08;
            e.damage = t.damage + wave;
            enemies.push(e);
        }
    }
}

function shoot() {
    if (shootCooldown > 0) return;
    const wp = WEAPONS[currentWeapon];
    shootCooldown = wp.rate;
    shotsFired++;

    playSound(currentWeapon);
    addShake(currentWeapon === 'shotgun' ? 5 : 2);

    let hitAny = false;

    for (let r = 0; r < wp.rays; r++) {
        const spread = (Math.random() - 0.5) * wp.spread * 2;
        const rayAngle = player.angle + spread;

        let bestEnemy = null;
        let bestDist = Infinity;

        for (const enemy of enemies) {
            const dx = enemy.x - player.x, dy = enemy.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 15 * wp.rangeMult) continue;
            const a2e = Math.atan2(dy, dx);
            let rel = a2e - rayAngle;
            while (rel > Math.PI) rel -= 2 * Math.PI;
            while (rel < -Math.PI) rel += 2 * Math.PI;
            const threshold = Math.min(0.15, (0.3 * enemy.size / 0.3) / dist);
            if (Math.abs(rel) < threshold) {
                const wallHit = castRay(a2e);
                if (wallHit.dist > dist && dist < bestDist) { bestDist = dist; bestEnemy = enemy; }
            }
        }

        if (bestEnemy) {
            const dmgMult = player.damageBoost > 0 ? 2 : 1;
            const damage = Math.max(5, (wp.damage - bestDist * 1.5) * dmgMult);
            bestEnemy.health -= damage;
            bestEnemy.hitFlash = 0.08;
            if (!hitAny) { shotsHit++; hitAny = true; }
            playSound('hit');

            spawnParticles(bestEnemy.x, bestEnemy.y, '#ff4444', 3, 2, 0.4);

            if (bestEnemy.health <= 0) {
                enemies = enemies.filter(e => e !== bestEnemy);
                kills++;
                const comboMult = Math.max(1, comboCount);
                score += bestEnemy.scoreValue * comboMult;
                comboCount++;
                comboTimer = COMBO_WINDOW;
                playSound('kill');
                if (comboCount >= 2) playSound('combo', { streak: comboCount });
                addShake(bestEnemy.type === 'boss' ? 15 : 4);
                spawnParticles(bestEnemy.x, bestEnemy.y, bestEnemy.color, 12, 4, 0.8);
            }
        }
    }
}

function showWaveAnnounce(text) {
    const el = document.getElementById('waveAnnounce');
    el.textContent = text;
    el.style.opacity = '1';
    setTimeout(() => el.style.opacity = '0', 1800);
}

function flashScreen() {
    const overlay = document.getElementById('flashOverlay');
    overlay.style.opacity = '1';
    setTimeout(() => overlay.style.opacity = '0', 100);
}

function updateHUD() {
    document.getElementById('healthVal').textContent = Math.max(0, Math.round(player.health));
    document.getElementById('healthVal').className = player.health <= 30 ? 'health-val low' : 'health-val';
    document.getElementById('scoreVal').textContent = score;
    document.getElementById('killsVal').textContent = kills;
    document.getElementById('waveVal').textContent = wave;

    // Weapon bar
    document.getElementById('slot-rifle').className = 'weapon-slot' + (currentWeapon === 'rifle' ? ' active' : '');
    document.getElementById('slot-shotgun').className = 'weapon-slot' + (currentWeapon === 'shotgun' ? ' active' : '');

    // Cooldown bars
    const wp = WEAPONS[currentWeapon];
    const cdPct = shootCooldown > 0 ? (shootCooldown / wp.rate) * 100 : 0;
    document.getElementById('cd-rifle').style.width = currentWeapon === 'rifle' ? `${cdPct}%` : '0%';
    document.getElementById('cd-shotgun').style.width = currentWeapon === 'shotgun' ? `${cdPct}%` : '0%';

    // Boost indicators
    const spdPill = document.getElementById('boostSpeed');
    const dmgPill = document.getElementById('boostDamage');
    const BOOST_MAX = 3.0;
    if (player.speedBoost > 0) {
        spdPill.classList.add('active');
        document.getElementById('boostSpeedFill').style.width = `${(player.speedBoost / BOOST_MAX) * 100}%`;
    } else { spdPill.classList.remove('active'); }
    if (player.damageBoost > 0) {
        dmgPill.classList.add('active');
        document.getElementById('boostDamageFill').style.width = `${(player.damageBoost / BOOST_MAX) * 100}%`;
    } else { dmgPill.classList.remove('active'); }

    // Combo display
    const comboEl = document.getElementById('comboDisplay');
    if (comboCount >= 2) {
        comboEl.textContent = `${comboCount}x COMBO`;
        comboEl.style.opacity = '1';
        comboEl.style.fontSize = `${1.2 + comboCount * 0.15}rem`;
    } else {
        comboEl.style.opacity = '0';
    }
}

function resetGame() {
    generateMap();
    player.health = 100; player.angle = 0; player.speedBoost = 0; player.damageBoost = 0;
    enemies = []; pickups = []; particles = [];
    score = 0; kills = 0; wave = 0;
    shootCooldown = 0; footstepTimer = 0;
    shotsFired = 0; shotsHit = 0; timeSurvived = 0;
    movementData = []; movementSampleTimer = 0;
    comboCount = 0; comboTimer = 0;
    currentWeapon = 'rifle';
    shakeAmount = 0; shakeX = 0; shakeY = 0;
    spawnWave();
}

// ─── Pause ───
function pauseGame() {
    if (!gameRunning || paused) return;
    paused = true; document.exitPointerLock(); stopAmbient();
    document.getElementById('pauseScreen').style.display = 'flex';
}
function resumeGame() {
    if (!paused) return;
    paused = false; document.getElementById('pauseScreen').style.display = 'none';
    canvas.requestPointerLock(); startAmbient();
    lastTime = performance.now(); requestAnimationFrame(gameLoop);
}
function quitGame(save) {
    paused = false; gameRunning = false; stopAmbient();
    document.getElementById('pauseScreen').style.display = 'none';
    if (save && score > 0) saveScore(score, kills, wave).then(() => fetchLeaderboard().then(() => renderLeaderboard('startLeaderboard', lastInsertedId)));
    document.getElementById('startScreen').style.display = 'flex';
    fetchLeaderboard().then(() => renderLeaderboard('startLeaderboard', null));
}

document.getElementById('resumeBtn').addEventListener('click', resumeGame);
document.getElementById('quitSaveBtn').addEventListener('click', () => quitGame(true));
document.getElementById('quitBtn').addEventListener('click', () => quitGame(false));
document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== canvas && gameRunning && !paused) pauseGame();
});

// ─── Input ───
document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (k === '1') currentWeapon = 'rifle';
    if (k === '2') currentWeapon = 'shotgun';
});
document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
canvas.addEventListener('click', () => { if (gameRunning) canvas.requestPointerLock(); });
document.addEventListener('mousemove', e => {
    if (document.pointerLockElement === canvas && gameRunning) player.angle += e.movementX * ROT_SPEED;
});
document.addEventListener('mousedown', e => {
    if (gameRunning && document.pointerLockElement === canvas) shoot();
});

// ─── Utilities ───
function shadeColor(hex, factor) {
    if (hex.startsWith('hsl')) {
        const m = hex.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        if (m) return `hsl(${m[1]}, ${m[2]}%, ${Math.floor(parseInt(m[3]) * factor)}%)`;
    }
    if (hex.startsWith('rgba') || hex.startsWith('rgb(')) return hex;
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`;
}

// ─── Main Loop ───
function gameLoop(timestamp) {
    if (!gameRunning || paused) return;
    const dt = Math.min(0.05, (timestamp - lastTime) / 1000);
    lastTime = timestamp;

    // Movement
    const spdMult = player.speedBoost > 0 ? 1.6 : 1;
    const moveSpeed = MOVE_SPEED * spdMult * dt;
    let mx = 0, my = 0, isMoving = false;

    if (keys['w']) { mx += Math.cos(player.angle) * moveSpeed; my += Math.sin(player.angle) * moveSpeed; isMoving = true; }
    if (keys['s']) { mx -= Math.cos(player.angle) * moveSpeed; my -= Math.sin(player.angle) * moveSpeed; isMoving = true; }
    if (keys['a']) { mx += Math.cos(player.angle - Math.PI / 2) * moveSpeed; my += Math.sin(player.angle - Math.PI / 2) * moveSpeed; isMoving = true; }
    if (keys['d']) { mx += Math.cos(player.angle + Math.PI / 2) * moveSpeed; my += Math.sin(player.angle + Math.PI / 2) * moveSpeed; isMoving = true; }

    if (isMoving) {
        footstepTimer += dt;
        if (footstepTimer >= FOOTSTEP_INTERVAL) { footstepTimer = 0; playSound('footstep'); }
    } else { footstepTimer = FOOTSTEP_INTERVAL; }

    const pad = 0.2;
    const nx = player.x + mx, ny = player.y + my;
    if (nx > 0 && nx < MAP_W && MAP[Math.floor(player.y)][Math.floor(nx + (mx > 0 ? pad : -pad))] === 0) player.x = nx;
    if (ny > 0 && ny < MAP_H && MAP[Math.floor(ny + (my > 0 ? pad : -pad))][Math.floor(player.x)] === 0) player.y = ny;

    // Timers
    if (shootCooldown > 0) shootCooldown -= dt;
    timeSurvived += dt;
    movementSampleTimer += dt;
    if (movementSampleTimer >= MOVEMENT_SAMPLE_INTERVAL) { movementSampleTimer = 0; movementData.push([Math.round(player.x * 10) / 10, Math.round(player.y * 10) / 10]); }

    // Boosts decay
    if (player.speedBoost > 0) { player.speedBoost -= dt; if (player.speedBoost < 0) player.speedBoost = 0; }
    if (player.damageBoost > 0) { player.damageBoost -= dt; if (player.damageBoost < 0) player.damageBoost = 0; }

    // Combo decay
    if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) { comboCount = 0; comboTimer = 0; } }

    // Enemies
    for (const enemy of enemies) enemy.update(dt);

    // Pickups collision
    for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i];
        const dx = p.x - player.x, dy = p.y - player.y;
        if (dx * dx + dy * dy < 0.5) {
            PICKUP_TYPES[p.type].effect(player);
            playSound('pickup');
            spawnParticles(p.x, p.y, PICKUP_TYPES[p.type].color, 8, 3, 0.6);
            pickups.splice(i, 1);
        }
    }

    // Particles
    updateParticles(dt);
    updateShake(dt);

    // Wave cleared
    if (enemies.length === 0) {
        player.health = Math.min(100, player.health + 15);
        spawnWave();
    }

    // Death
    if (player.health <= 0) {
        gameRunning = false; stopAmbient(); playSound('death');
        document.exitPointerLock();
        document.getElementById('finalScore').textContent = score;
        document.getElementById('finalKills').textContent = kills;
        document.getElementById('finalWave').textContent = wave;
        document.getElementById('deathScreen').style.display = 'flex';
        saveScore(score, kills, wave).then(id => renderLeaderboard('deathLeaderboard', id));
        return;
    }

    render();
    updateHUD();
    requestAnimationFrame(gameLoop);
}

// ─── Init ───
const savedName = localStorage.getItem('minifps_name');
if (savedName) document.getElementById('playerName').value = savedName;
fetchLeaderboard().then(() => renderLeaderboard('startLeaderboard', null));

document.getElementById('startBtn').addEventListener('click', () => {
    initAudio(); document.getElementById('startScreen').style.display = 'none';
    resetGame(); gameRunning = true; lastTime = performance.now();
    canvas.requestPointerLock(); startAmbient(); requestAnimationFrame(gameLoop);
});
document.getElementById('restartBtn').addEventListener('click', () => {
    initAudio(); document.getElementById('deathScreen').style.display = 'none';
    resetGame(); gameRunning = true; lastTime = performance.now();
    canvas.requestPointerLock(); startAmbient(); requestAnimationFrame(gameLoop);
});
