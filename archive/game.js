// ─── Mini FPS Raycaster Engine ───

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Display
const W = 800;
const H = 500;
canvas.width = W;
canvas.height = H;

// ─── Audio Engine (Web Audio API – no files needed) ───
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type) {
    if (!soundEnabled || !audioCtx) return;
    const now = audioCtx.currentTime;

    switch (type) {
        case 'shoot': {
            // Punchy gunshot: noise burst + low thump
            const bufferSize = audioCtx.sampleRate * 0.08;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
            }
            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;
            const noiseGain = audioCtx.createGain();
            noiseGain.gain.setValueAtTime(0.4, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            const noiseFilter = audioCtx.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.setValueAtTime(3000, now);
            noiseFilter.frequency.exponentialRampToValueAtTime(300, now + 0.08);
            noise.connect(noiseFilter).connect(noiseGain).connect(audioCtx.destination);
            noise.start(now);
            noise.stop(now + 0.08);

            // Low thump
            const osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.1);
            const oscGain = audioCtx.createGain();
            oscGain.gain.setValueAtTime(0.5, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.connect(oscGain).connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        }
        case 'hit': {
            // Meaty impact
            const osc = audioCtx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.06);
            break;
        }
        case 'kill': {
            // Satisfying kill confirm: rising tone
            const osc1 = audioCtx.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(400, now);
            osc1.frequency.exponentialRampToValueAtTime(800, now + 0.12);
            const gain1 = audioCtx.createGain();
            gain1.gain.setValueAtTime(0.2, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc1.connect(gain1).connect(audioCtx.destination);
            osc1.start(now);
            osc1.stop(now + 0.15);

            const osc2 = audioCtx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(600, now + 0.05);
            osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.18);
            const gain2 = audioCtx.createGain();
            gain2.gain.setValueAtTime(0.15, now + 0.05);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc2.connect(gain2).connect(audioCtx.destination);
            osc2.start(now + 0.05);
            osc2.stop(now + 0.2);
            break;
        }
        case 'hurt': {
            // Low crunch when player takes damage
            const bufferSize = audioCtx.sampleRate * 0.15;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2) * 0.4;
            }
            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 800;
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            noise.connect(filter).connect(gain).connect(audioCtx.destination);
            noise.start(now);
            noise.stop(now + 0.15);
            break;
        }
        case 'wave': {
            // Ascending chime for new wave
            [0, 0.1, 0.2].forEach((delay, i) => {
                const osc = audioCtx.createOscillator();
                osc.type = 'sine';
                const freq = 500 + i * 200;
                osc.frequency.setValueAtTime(freq, now + delay);
                const gain = audioCtx.createGain();
                gain.gain.setValueAtTime(0.15, now + delay);
                gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.25);
                osc.connect(gain).connect(audioCtx.destination);
                osc.start(now + delay);
                osc.stop(now + delay + 0.25);
            });
            break;
        }
        case 'death': {
            // Descending doom tone
            const osc = audioCtx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.8);
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.8);
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, now);
            filter.frequency.exponentialRampToValueAtTime(100, now + 0.8);
            osc.connect(filter).connect(gain).connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.8);
            break;
        }
        case 'footstep': {
            const osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(60 + Math.random() * 20, now);
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.05);
            break;
        }
        case 'miss': {
            // Quiet click for shooting and missing
            const osc = audioCtx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(100, now);
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.03);
            break;
        }
    }
}

// Ambient drone (loops while playing)
let ambientOsc = null;
let ambientGain = null;
function startAmbient() {
    if (!soundEnabled || !audioCtx || ambientOsc) return;
    ambientOsc = audioCtx.createOscillator();
    ambientOsc.type = 'sine';
    ambientOsc.frequency.value = 45;
    const lfo = audioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.3;
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 5;
    lfo.connect(lfoGain).connect(ambientOsc.frequency);
    lfo.start();
    ambientGain = audioCtx.createGain();
    ambientGain.gain.value = 0.04;
    ambientOsc.connect(ambientGain).connect(audioCtx.destination);
    ambientOsc.start();
}

function stopAmbient() {
    if (ambientOsc) {
        ambientOsc.stop();
        ambientOsc = null;
        ambientGain = null;
    }
}

// Sound toggle
const soundToggle = document.getElementById('soundToggle');
soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggle.textContent = soundEnabled ? 'Sound: ON' : 'Sound: OFF';
    if (!soundEnabled) stopAmbient();
    else if (gameRunning) startAmbient();
});

// ─── Supabase Leaderboard ───
const SUPABASE_URL = 'https://fqpyyxgsyeepkpqrykgc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxcHl5eGdzeWVlcGtwcXJ5a2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MDgzOTksImV4cCI6MjA4OTM4NDM5OX0.N8q_ye3zdzeVV8bw_mQoCuiN4_rRTGJlIuBJSf3G-Pg';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const LB_MAX = 10;
let leaderboardCache = [];
let lastInsertedId = null;

async function fetchLeaderboard() {
    const { data, error } = await db
        .from('leaderboard')
        .select('*')
        .eq('game_version', 'classic')
        .order('score', { ascending: false })
        .limit(LB_MAX);

    if (!error && data) {
        leaderboardCache = data;
    }
    return leaderboardCache;
}

async function saveScore(scoreVal, killsVal, waveVal) {
    const name = getPlayerName();
    const { data, error } = await db
        .from('leaderboard')
        .insert({
            player_name: name,
            score: scoreVal,
            kills: killsVal,
            wave: waveVal,
            shots_fired: shotsFired,
            shots_hit: shotsHit,
            time_survived: Math.round(timeSurvived * 10) / 10,
            movement_data: movementData,
            game_version: 'classic'
        })
        .select()
        .single();

    if (!error && data) {
        lastInsertedId = data.id;
        await fetchLeaderboard();
        return data.id;
    }
    return null;
}

function getPlayerName() {
    const input = document.getElementById('playerName');
    const name = (input ? input.value.trim() : '') || 'Anonymous';
    // Remember name for next round
    localStorage.setItem('minifps_name', name);
    return name;
}

function renderLeaderboard(containerId, highlightId) {
    const container = document.getElementById(containerId);
    const lb = leaderboardCache;

    if (lb.length === 0) {
        container.innerHTML = '<h3>Global Leaderboard</h3><div class="lb-empty">No scores yet. Be the first!</div>';
        return;
    }

    let html = '<h3>Global Leaderboard</h3><ol>';
    for (const entry of lb) {
        const isNew = entry.id === highlightId;
        const date = new Date(entry.created_at).toLocaleDateString();
        const escapedName = entry.player_name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        html += `<li class="${isNew ? 'lb-new' : ''}">
            <span class="lb-details"><strong>${escapedName}</strong> &bull; W${entry.wave} &bull; ${entry.kills} kills &bull; ${date}</span>
            <span class="lb-score">${entry.score.toLocaleString()}</span>
        </li>`;
    }
    html += '</ol>';
    container.innerHTML = html;
}

// Real-time subscription — update leaderboard live
db
    .channel('leaderboard-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leaderboard' }, async () => {
        await fetchLeaderboard();
        // Re-render whichever leaderboard is currently visible
        if (document.getElementById('startScreen').style.display !== 'none') {
            renderLeaderboard('startLeaderboard', lastInsertedId);
        }
        if (document.getElementById('deathScreen').style.display !== 'none') {
            renderLeaderboard('deathLeaderboard', lastInsertedId);
        }
    })
    .subscribe();

// Map (1 = wall)
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

const MAP_W = MAP[0].length;
const MAP_H = MAP.length;

// Player
let player = { x: 2.5, y: 2.5, angle: 0, health: 100 };
const MOVE_SPEED = 3.0;
const ROT_SPEED = 0.003;
const FOV = Math.PI / 3;
const HALF_FOV = FOV / 2;
const NUM_RAYS = W;

// Game state
let enemies = [];
let score = 0;
let kills = 0;
let wave = 1;
let gameRunning = false;
let lastTime = 0;
let keys = {};
let shootCooldown = 0;
const SHOOT_RATE = 0.25;
let footstepTimer = 0;
const FOOTSTEP_INTERVAL = 0.35;

// Tracking stats
let shotsFired = 0;
let shotsHit = 0;
let timeSurvived = 0;
let movementData = [];
let movementSampleTimer = 0;
const MOVEMENT_SAMPLE_INTERVAL = 1.0; // sample position every 1s

// Wall colors for variety
const WALL_COLORS_NS = ['#4a4e69', '#3a3d52', '#5a5e79', '#2d3040'];
const WALL_COLORS_EW = ['#6366f1', '#5558d4', '#7174f4', '#4448b8'];

// ─── Enemy class ───
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.health = 30;
        this.maxHealth = 30;
        this.speed = 1.2 + Math.random() * 0.6;
        this.size = 0.3;
        this.attackRange = 0.8;
        this.attackCooldown = 0;
        this.attackRate = 1.0;
        this.damage = 8 + Math.floor(Math.random() * 5);
        this.color = `hsl(${Math.random() * 30 + 340}, 70%, 50%)`;
        this.hitFlash = 0;
    }

    update(dt) {
        if (this.hitFlash > 0) this.hitFlash -= dt;
        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        // Move toward player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.attackRange) {
            const moveX = (dx / dist) * this.speed * dt;
            const moveY = (dy / dist) * this.speed * dt;

            // Check wall collision
            const newX = this.x + moveX;
            const newY = this.y + moveY;
            if (MAP[Math.floor(newY)] && MAP[Math.floor(newY)][Math.floor(newX)] === 0) {
                this.x = newX;
                this.y = newY;
            } else if (MAP[Math.floor(this.y)] && MAP[Math.floor(this.y)][Math.floor(newX)] === 0) {
                this.x = newX;
            } else if (MAP[Math.floor(newY)] && MAP[Math.floor(newY)][Math.floor(this.x)] === 0) {
                this.y = newY;
            }
        } else if (this.attackCooldown <= 0) {
            // Attack player
            player.health -= this.damage;
            this.attackCooldown = this.attackRate;
            playSound('hurt');
            flashScreen();
        }
    }
}

// ─── Raycasting ───
function castRay(angle) {
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    let t = 0;
    const maxDist = 20;
    const step = 0.02;

    while (t < maxDist) {
        const x = player.x + cos * t;
        const y = player.y + sin * t;
        const mapX = Math.floor(x);
        const mapY = Math.floor(y);

        if (mapX < 0 || mapX >= MAP_W || mapY < 0 || mapY >= MAP_H) break;
        if (MAP[mapY][mapX] === 1) {
            const prevX = Math.floor(player.x + cos * (t - step));
            const prevY = Math.floor(player.y + sin * (t - step));
            const isEW = prevX !== mapX;
            return { dist: t, isEW, mapX, mapY, hitX: x, hitY: y };
        }
        t += step;
    }
    return { dist: maxDist, isEW: false, mapX: -1, mapY: -1 };
}

// ─── Rendering ───
function render() {
    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H / 2);
    skyGrad.addColorStop(0, '#0a0a1a');
    skyGrad.addColorStop(1, '#1a1a3a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H / 2);

    // Floor gradient
    const floorGrad = ctx.createLinearGradient(0, H / 2, 0, H);
    floorGrad.addColorStop(0, '#1a1a2a');
    floorGrad.addColorStop(1, '#0a0a12');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, H / 2, W, H / 2);

    const depthBuffer = new Float32Array(W);

    for (let i = 0; i < NUM_RAYS; i++) {
        const rayAngle = player.angle - HALF_FOV + (i / NUM_RAYS) * FOV;
        const hit = castRay(rayAngle);
        const correctedDist = hit.dist * Math.cos(rayAngle - player.angle);
        depthBuffer[i] = correctedDist;

        const wallHeight = Math.min(H * 2, H / correctedDist);
        const wallTop = (H - wallHeight) / 2;
        const shade = Math.max(0.15, 1 - correctedDist / 12);

        if (hit.isEW) {
            const idx = Math.abs(hit.mapX + hit.mapY) % WALL_COLORS_EW.length;
            ctx.fillStyle = shadeColor(WALL_COLORS_EW[idx], shade);
        } else {
            const idx = Math.abs(hit.mapX + hit.mapY) % WALL_COLORS_NS.length;
            ctx.fillStyle = shadeColor(WALL_COLORS_NS[idx], shade);
        }

        ctx.fillRect(i, wallTop, 1, wallHeight);

        if (wallHeight > 10) {
            const edgeGrad = ctx.createLinearGradient(i, wallTop, i, wallTop + wallHeight);
            edgeGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
            edgeGrad.addColorStop(0.1, 'rgba(0,0,0,0)');
            edgeGrad.addColorStop(0.9, 'rgba(0,0,0,0)');
            edgeGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
            ctx.fillStyle = edgeGrad;
            ctx.fillRect(i, wallTop, 1, wallHeight);
        }
    }

    // Draw enemies as sprites
    const enemiesWithDist = enemies.map(e => {
        const dx = e.x - player.x;
        const dy = e.y - player.y;
        return { enemy: e, dist: Math.sqrt(dx * dx + dy * dy) };
    }).sort((a, b) => b.dist - a.dist);

    for (const { enemy, dist } of enemiesWithDist) {
        if (dist < 0.3) continue;

        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const angleToEnemy = Math.atan2(dy, dx);
        let relAngle = angleToEnemy - player.angle;
        while (relAngle > Math.PI) relAngle -= 2 * Math.PI;
        while (relAngle < -Math.PI) relAngle += 2 * Math.PI;

        if (Math.abs(relAngle) > HALF_FOV + 0.2) continue;

        const screenX = (0.5 + relAngle / FOV) * W;
        const spriteHeight = Math.min(H * 1.5, (H * 0.6) / dist);
        const spriteWidth = spriteHeight * 0.6;
        const spriteTop = (H - spriteHeight) / 2;

        const startCol = Math.max(0, Math.floor(screenX - spriteWidth / 2));
        const endCol = Math.min(W - 1, Math.floor(screenX + spriteWidth / 2));

        for (let col = startCol; col <= endCol; col++) {
            if (depthBuffer[col] < dist) continue;

            const spriteCol = (col - (screenX - spriteWidth / 2)) / spriteWidth;
            const bodyTop = spriteTop + spriteHeight * 0.15;
            const bodyHeight = spriteHeight * 0.85;
            const centerDist = Math.abs(spriteCol - 0.5) * 2;
            if (centerDist > 0.9) continue;

            const shade = Math.max(0.2, 1 - dist / 10);
            const baseColor = enemy.hitFlash > 0 ? '#ffffff' : enemy.color;
            ctx.fillStyle = shadeColor(baseColor, shade);

            if (spriteCol > 0.25 && spriteCol < 0.75) {
                ctx.fillRect(col, spriteTop, 1, spriteHeight * 0.2);
            }
            ctx.fillRect(col, bodyTop, 1, bodyHeight * (1 - centerDist * 0.3));

            const eyeY = spriteTop + spriteHeight * 0.08;
            if ((spriteCol > 0.32 && spriteCol < 0.42) || (spriteCol > 0.58 && spriteCol < 0.68)) {
                ctx.fillStyle = `rgba(255, 50, 50, ${shade})`;
                ctx.fillRect(col, eyeY, 1, Math.max(2, spriteHeight * 0.04));
            }
        }

        if (enemy.health < enemy.maxHealth) {
            const barWidth = spriteWidth * 0.6;
            const barX = screenX - barWidth / 2;
            const barY = spriteTop - 8;
            const healthPct = enemy.health / enemy.maxHealth;

            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(barX, barY, barWidth, 4);
            ctx.fillStyle = healthPct > 0.5 ? '#22c55e' : '#ef4444';
            ctx.fillRect(barX, barY, barWidth * healthPct, 4);
        }
    }

    // Vignette
    const vigGrad = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.7);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, W, H);

    drawGun();
}

function drawGun() {
    const gunX = W * 0.65;
    const gunY = H * 0.65;
    const bobX = Math.sin(Date.now() / 200) * 2;
    const bobY = Math.abs(Math.cos(Date.now() / 200)) * 3;

    ctx.save();
    ctx.translate(gunX + bobX, gunY + bobY);

    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(-15, 0, 30, 80);
    ctx.fillStyle = '#3a3a4a';
    ctx.fillRect(-12, -40, 24, 45);
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(-6, -80, 12, 45);
    ctx.fillStyle = '#333';
    ctx.fillRect(-4, -85, 8, 10);
    ctx.fillStyle = '#222235';
    ctx.fillRect(-10, 30, 20, 40);

    if (shootCooldown > SHOOT_RATE * 0.7) {
        ctx.fillStyle = 'rgba(255, 200, 50, 0.9)';
        ctx.beginPath();
        ctx.arc(0, -85, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 200, 0.6)';
        ctx.beginPath();
        ctx.arc(0, -85, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// ─── Game Logic ───
function spawnWave() {
    const count = 3 + wave * 2;
    for (let i = 0; i < count; i++) {
        let x, y;
        let attempts = 0;
        do {
            x = 1.5 + Math.random() * (MAP_W - 3);
            y = 1.5 + Math.random() * (MAP_H - 3);
            attempts++;
        } while (
            attempts < 50 &&
            (MAP[Math.floor(y)][Math.floor(x)] === 1 ||
             Math.sqrt((x - player.x) ** 2 + (y - player.y) ** 2) < 5)
        );

        if (MAP[Math.floor(y)] && MAP[Math.floor(y)][Math.floor(x)] === 0) {
            const e = new Enemy(x, y);
            e.maxHealth = 30 + wave * 10;
            e.health = e.maxHealth;
            e.speed = 1.2 + wave * 0.15 + Math.random() * 0.5;
            e.damage = 8 + wave * 2;
            enemies.push(e);
        }
    }
}

function shoot() {
    if (shootCooldown > 0) return;
    shootCooldown = SHOOT_RATE;
    shotsFired++;

    playSound('shoot');

    let bestEnemy = null;
    let bestAngleDiff = Infinity;

    for (const enemy of enemies) {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angleToEnemy = Math.atan2(dy, dx);
        let relAngle = angleToEnemy - player.angle;
        while (relAngle > Math.PI) relAngle -= 2 * Math.PI;
        while (relAngle < -Math.PI) relAngle += 2 * Math.PI;

        const angleDiff = Math.abs(relAngle);
        const hitThreshold = Math.min(0.15, 0.4 / dist);

        if (angleDiff < hitThreshold && dist < 15) {
            const wallHit = castRay(angleToEnemy);
            if (wallHit.dist > dist && angleDiff < bestAngleDiff) {
                bestAngleDiff = angleDiff;
                bestEnemy = enemy;
            }
        }
    }

    if (bestEnemy) {
        const dist = Math.sqrt((bestEnemy.x - player.x) ** 2 + (bestEnemy.y - player.y) ** 2);
        const damage = Math.max(10, 35 - dist * 2);
        bestEnemy.health -= damage;
        bestEnemy.hitFlash = 0.1;
        shotsHit++;
        playSound('hit');

        if (bestEnemy.health <= 0) {
            enemies = enemies.filter(e => e !== bestEnemy);
            kills++;
            score += 100 + wave * 25;
            playSound('kill');
        }
    }
}

function flashScreen() {
    const overlay = document.getElementById('flashOverlay');
    overlay.style.opacity = '1';
    setTimeout(() => overlay.style.opacity = '0', 100);
}

function updateHUD() {
    document.getElementById('healthVal').textContent = Math.max(0, player.health);
    document.getElementById('healthVal').className = player.health <= 30 ? 'health-val low' : 'health-val';
    document.getElementById('scoreVal').textContent = score;
    document.getElementById('killsVal').textContent = kills;
    document.getElementById('waveVal').textContent = wave;
}

function resetGame() {
    player = { x: 2.5, y: 2.5, angle: 0, health: 100 };
    enemies = [];
    score = 0;
    kills = 0;
    wave = 1;
    shootCooldown = 0;
    footstepTimer = 0;
    shotsFired = 0;
    shotsHit = 0;
    timeSurvived = 0;
    movementData = [];
    movementSampleTimer = 0;
    spawnWave();
}

// ─── Pause ───
let paused = false;

function pauseGame() {
    if (!gameRunning || paused) return;
    paused = true;
    document.exitPointerLock();
    stopAmbient();
    document.getElementById('pauseScreen').style.display = 'flex';
}

function resumeGame() {
    if (!paused) return;
    paused = false;
    document.getElementById('pauseScreen').style.display = 'none';
    canvas.requestPointerLock();
    startAmbient();
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function quitGame(save) {
    paused = false;
    gameRunning = false;
    stopAmbient();
    document.getElementById('pauseScreen').style.display = 'none';

    if (save && score > 0) {
        saveScore(score, kills, wave).then(() => {
            fetchLeaderboard().then(() => renderLeaderboard('startLeaderboard', lastInsertedId));
        });
    }

    document.getElementById('startScreen').style.display = 'flex';
    fetchLeaderboard().then(() => renderLeaderboard('startLeaderboard', null));
}

document.getElementById('resumeBtn').addEventListener('click', resumeGame);
document.getElementById('quitSaveBtn').addEventListener('click', () => quitGame(true));
document.getElementById('quitBtn').addEventListener('click', () => quitGame(false));

// Pause when pointer lock is lost (ESC releases pointer lock automatically)
document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== canvas && gameRunning && !paused) {
        pauseGame();
    }
});

// ─── Input ───
document.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

canvas.addEventListener('click', () => {
    if (gameRunning) {
        canvas.requestPointerLock();
    }
});

document.addEventListener('mousemove', e => {
    if (document.pointerLockElement === canvas && gameRunning) {
        player.angle += e.movementX * ROT_SPEED;
    }
});

document.addEventListener('mousedown', e => {
    if (gameRunning && document.pointerLockElement === canvas) {
        shoot();
    }
});

// ─── Utilities ───
function shadeColor(hex, factor) {
    if (hex.startsWith('hsl')) {
        const match = hex.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        if (match) {
            const h = parseInt(match[1]);
            const s = parseInt(match[2]);
            const l = Math.floor(parseInt(match[3]) * factor);
            return `hsl(${h}, ${s}%, ${l}%)`;
        }
    }
    if (hex.startsWith('rgba')) return hex;

    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.floor(r * factor);
    g = Math.floor(g * factor);
    b = Math.floor(b * factor);
    return `rgb(${r},${g},${b})`;
}

// ─── Main Loop ───
function gameLoop(timestamp) {
    if (!gameRunning || paused) return;

    const dt = Math.min(0.05, (timestamp - lastTime) / 1000);
    lastTime = timestamp;

    // Movement
    const moveSpeed = MOVE_SPEED * dt;
    let moveX = 0;
    let moveY = 0;
    let isMoving = false;

    if (keys['w']) {
        moveX += Math.cos(player.angle) * moveSpeed;
        moveY += Math.sin(player.angle) * moveSpeed;
        isMoving = true;
    }
    if (keys['s']) {
        moveX -= Math.cos(player.angle) * moveSpeed;
        moveY -= Math.sin(player.angle) * moveSpeed;
        isMoving = true;
    }
    if (keys['a']) {
        moveX += Math.cos(player.angle - Math.PI / 2) * moveSpeed;
        moveY += Math.sin(player.angle - Math.PI / 2) * moveSpeed;
        isMoving = true;
    }
    if (keys['d']) {
        moveX += Math.cos(player.angle + Math.PI / 2) * moveSpeed;
        moveY += Math.sin(player.angle + Math.PI / 2) * moveSpeed;
        isMoving = true;
    }

    // Footstep sounds
    if (isMoving) {
        footstepTimer += dt;
        if (footstepTimer >= FOOTSTEP_INTERVAL) {
            footstepTimer = 0;
            playSound('footstep');
        }
    } else {
        footstepTimer = FOOTSTEP_INTERVAL; // play immediately on next move
    }

    // Collision detection
    const pad = 0.2;
    const newX = player.x + moveX;
    const newY = player.y + moveY;

    if (MAP[Math.floor(player.y)][Math.floor(newX + (moveX > 0 ? pad : -pad))] === 0) {
        player.x = newX;
    }
    if (MAP[Math.floor(newY + (moveY > 0 ? pad : -pad))][Math.floor(player.x)] === 0) {
        player.y = newY;
    }

    if (shootCooldown > 0) shootCooldown -= dt;

    // Track time and movement
    timeSurvived += dt;
    movementSampleTimer += dt;
    if (movementSampleTimer >= MOVEMENT_SAMPLE_INTERVAL) {
        movementSampleTimer = 0;
        movementData.push([
            Math.round(player.x * 10) / 10,
            Math.round(player.y * 10) / 10
        ]);
    }

    for (const enemy of enemies) {
        enemy.update(dt);
    }

    // Check wave cleared
    if (enemies.length === 0) {
        wave++;
        player.health = Math.min(100, player.health + 20);
        playSound('wave');
        spawnWave();
    }

    // Check death
    if (player.health <= 0) {
        gameRunning = false;
        stopAmbient();
        playSound('death');
        document.exitPointerLock();

        document.getElementById('finalScore').textContent = score;
        document.getElementById('finalKills').textContent = kills;
        document.getElementById('finalWave').textContent = wave;
        document.getElementById('deathScreen').style.display = 'flex';

        // Save score async and update leaderboard
        saveScore(score, kills, wave).then(entryId => {
            renderLeaderboard('deathLeaderboard', entryId);
        });
        return;
    }

    render();
    updateHUD();

    requestAnimationFrame(gameLoop);
}

// ─── Start ───
// Load saved name
const savedName = localStorage.getItem('minifps_name');
if (savedName) document.getElementById('playerName').value = savedName;

// Fetch and render leaderboard on load
fetchLeaderboard().then(() => renderLeaderboard('startLeaderboard', null));

document.getElementById('startBtn').addEventListener('click', () => {
    initAudio();
    document.getElementById('startScreen').style.display = 'none';
    resetGame();
    gameRunning = true;
    lastTime = performance.now();
    canvas.requestPointerLock();
    startAmbient();
    requestAnimationFrame(gameLoop);
});

document.getElementById('restartBtn').addEventListener('click', () => {
    initAudio();
    document.getElementById('deathScreen').style.display = 'none';
    resetGame();
    gameRunning = true;
    lastTime = performance.now();
    canvas.requestPointerLock();
    startAmbient();
    requestAnimationFrame(gameLoop);
});
