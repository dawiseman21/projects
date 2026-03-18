const SUPABASE_URL = 'https://fqpyyxgsyeepkpqrykgc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxcHl5eGdzeWVlcGtwcXJ5a2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MDgzOTksImV4cCI6MjA4OTM4NDM5OX0.N8q_ye3zdzeVV8bw_mQoCuiN4_rRTGJlIuBJSf3G-Pg';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const LB_LIMIT = 50;

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function loadLeaderboard() {
    const { data, error } = await db
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(LB_LIMIT);

    if (error) {
        document.getElementById('lbLoading').textContent = 'Failed to load scores.';
        return;
    }

    renderTable(data);
    await loadStats();
}

function renderTable(data) {
    const loading = document.getElementById('lbLoading');
    const table = document.getElementById('lbTable');
    const empty = document.getElementById('lbEmpty');
    const body = document.getElementById('lbBody');

    loading.style.display = 'none';

    if (!data || data.length === 0) {
        table.style.display = 'none';
        empty.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    empty.style.display = 'none';

    body.innerHTML = data.map((entry, i) => {
        const rank = i + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        const date = new Date(entry.created_at).toLocaleDateString();
        return `<tr class="${rankClass}">
            <td class="rank-cell">#${rank}</td>
            <td class="name-cell">${escapeHtml(entry.player_name)}</td>
            <td class="score-cell right">${entry.score.toLocaleString()}</td>
            <td class="meta-cell right">${entry.kills}</td>
            <td class="meta-cell right">${entry.wave}</td>
            <td class="meta-cell right">${date}</td>
        </tr>`;
    }).join('');
}

async function loadStats() {
    const { data, error } = await db
        .from('leaderboard')
        .select('player_name, score, kills, wave');

    if (error || !data) return;

    const uniquePlayers = new Set(data.map(d => d.player_name)).size;
    const totalGames = data.length;
    const highScore = Math.max(...data.map(d => d.score), 0);
    const topWave = Math.max(...data.map(d => d.wave), 0);
    const totalKills = data.reduce((sum, d) => sum + d.kills, 0);

    document.getElementById('statPlayers').textContent = uniquePlayers.toLocaleString();
    document.getElementById('statGames').textContent = totalGames.toLocaleString();
    document.getElementById('statHighScore').textContent = highScore.toLocaleString();
    document.getElementById('statTopWave').textContent = topWave;
    document.getElementById('statTotalKills').textContent = totalKills.toLocaleString();
}

// Real-time: refresh on new scores
db.channel('lb-page')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leaderboard' }, () => {
        loadLeaderboard();
    })
    .subscribe();

// Initial load
loadLeaderboard();
