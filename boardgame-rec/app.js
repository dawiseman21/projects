/**
 * Board Game Recommendation Engine — Frontend
 *
 * Loads pre-computed game data and similarity matrix,
 * then scores/ranks games based on user preferences entirely client-side.
 */

(function () {
    "use strict";

    // ---------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------

    let allGames = [];          // full game list from games.json
    let gamesById = {};         // id -> game lookup
    let similarities = {};      // id -> [[similar_id, score], ...]
    let selectedGames = [];     // games the user has picked as "liked"
    let dataLoaded = false;

    // DOM refs
    const searchInput = document.getElementById("game-search");
    const searchResults = document.getElementById("search-results");
    const selectedContainer = document.getElementById("selected-games");
    const recommendBtn = document.getElementById("recommend-btn");
    const resultsPanel = document.getElementById("results-panel");
    const resultsList = document.getElementById("results-list");
    const loadingEl = document.getElementById("loading");
    const playerFilter = document.getElementById("player-count");
    const complexityFilter = document.getElementById("complexity");
    const timeFilter = document.getElementById("play-time");

    // ---------------------------------------------------------------------------
    // Data Loading
    // ---------------------------------------------------------------------------

    async function loadData() {
        loadingEl.classList.remove("hidden");

        try {
            const [gamesResp, simResp] = await Promise.all([
                fetch("data/games.json"),
                fetch("data/similarities.json"),
            ]);

            if (!gamesResp.ok || !simResp.ok) {
                throw new Error("Failed to load data files. Run the pipeline first.");
            }

            allGames = await gamesResp.json();
            similarities = await simResp.json();

            // Build lookup
            for (const g of allGames) {
                gamesById[g.id] = g;
            }

            dataLoaded = true;
        } catch (err) {
            loadingEl.innerHTML =
                `<p style="color: var(--red);">Could not load game data.<br>
                 <small>Make sure you've run the pipeline first:<br>
                 <code>cd pipeline && python build_data.py</code></small></p>`;
            return;
        }

        loadingEl.classList.add("hidden");
    }

    // ---------------------------------------------------------------------------
    // Search
    // ---------------------------------------------------------------------------

    let searchTimeout = null;

    function onSearchInput() {
        const query = searchInput.value.trim().toLowerCase();

        if (query.length < 2) {
            searchResults.classList.add("hidden");
            return;
        }

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const selectedIds = new Set(selectedGames.map((g) => g.id));

            const matches = allGames
                .filter(
                    (g) =>
                        g.name.toLowerCase().includes(query) &&
                        !selectedIds.has(g.id)
                )
                .slice(0, 10);

            if (matches.length === 0) {
                searchResults.classList.add("hidden");
                return;
            }

            searchResults.innerHTML = matches
                .map(
                    (g) =>
                        `<div class="search-result-item" data-id="${g.id}">
                            <span class="game-name">${escapeHtml(g.name)}</span>
                            <span class="game-year">${g.year || ""}</span>
                        </div>`
                )
                .join("");

            searchResults.classList.remove("hidden");
        }, 150);
    }

    function onSearchResultClick(e) {
        const item = e.target.closest(".search-result-item");
        if (!item) return;

        const id = parseInt(item.dataset.id, 10);
        const game = gamesById[id];
        if (!game) return;

        selectedGames.push(game);
        searchInput.value = "";
        searchResults.classList.add("hidden");
        renderSelected();
    }

    function removeSelected(id) {
        selectedGames = selectedGames.filter((g) => g.id !== id);
        renderSelected();
        // Clear results if games removed
        if (selectedGames.length === 0) {
            resultsPanel.classList.add("hidden");
        }
    }

    function renderSelected() {
        selectedContainer.innerHTML = selectedGames
            .map(
                (g) =>
                    `<span class="selected-game-tag">
                        ${escapeHtml(g.name)}
                        <span class="remove-btn" data-id="${g.id}">&times;</span>
                    </span>`
            )
            .join("");

        recommendBtn.disabled = selectedGames.length === 0;
    }

    // ---------------------------------------------------------------------------
    // Recommendation Engine
    // ---------------------------------------------------------------------------

    function getRecommendations() {
        if (selectedGames.length === 0) return;

        const selectedIds = new Set(selectedGames.map((g) => g.id));

        // Aggregate similarity scores across all selected games
        const scores = {};   // game_id -> { simScore, reasons }

        for (const liked of selectedGames) {
            const sims = similarities[liked.id] || [];
            for (const [simId, simScore] of sims) {
                if (selectedIds.has(simId)) continue;
                if (!gamesById[simId]) continue;

                if (!scores[simId]) {
                    scores[simId] = { total: 0, sources: [] };
                }
                scores[simId].total += simScore;
                scores[simId].sources.push({
                    name: liked.name,
                    score: simScore,
                });
            }
        }

        // Apply preference filters
        const playerPref = parseInt(playerFilter.value, 10);
        const complexityPref = parseInt(complexityFilter.value, 10);
        const timePref = parseInt(timeFilter.value, 10);

        let candidates = Object.entries(scores).map(([id, data]) => ({
            game: gamesById[parseInt(id, 10)],
            simScore: data.total,
            sources: data.sources,
        }));

        // Filter
        candidates = candidates.filter(({ game }) => {
            if (!game) return false;

            // Player count filter
            if (playerPref > 0) {
                if (playerPref >= 6) {
                    if (game.max_players < 6) return false;
                } else {
                    if (game.min_players > playerPref || game.max_players < playerPref)
                        return false;
                }
            }

            // Complexity filter
            if (complexityPref > 0) {
                const w = game.weight;
                if (complexityPref === 1 && w > 2) return false;
                if (complexityPref === 2 && (w < 2 || w > 3)) return false;
                if (complexityPref === 3 && (w < 3 || w > 4)) return false;
                if (complexityPref === 4 && w < 4) return false;
            }

            // Play time filter
            if (timePref > 0) {
                const avgTime = (game.min_time + game.max_time) / 2;
                if (timePref === 999) {
                    if (avgTime < 180) return false;
                } else {
                    if (avgTime > timePref) return false;
                }
            }

            return true;
        });

        // Score: weighted combination of similarity + BGG rating boost
        for (const c of candidates) {
            // Normalize BGG rating to a 0-1 bonus (rating/10 * 0.3)
            const ratingBonus = (c.game.rating / 10) * 0.3;
            c.finalScore = c.simScore + ratingBonus;
        }

        // Sort by final score descending
        candidates.sort((a, b) => b.finalScore - a.finalScore);

        return candidates.slice(0, 25);
    }

    // ---------------------------------------------------------------------------
    // Render Results
    // ---------------------------------------------------------------------------

    function showResults() {
        const recs = getRecommendations();
        if (!recs || recs.length === 0) {
            resultsList.innerHTML =
                '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No matches found. Try adjusting your filters or adding more games.</p>';
            resultsPanel.classList.remove("hidden");
            return;
        }

        resultsList.innerHTML = recs
            .map(({ game, sources, finalScore }) => {
                // Build "because you liked X" reason
                const topSources = sources
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 2)
                    .map((s) => s.name);

                const reason =
                    topSources.length > 0
                        ? `Because you like ${topSources.join(" & ")}`
                        : "";

                // Shared mechanics/categories with selected games
                const likedMechanics = new Set(
                    selectedGames.flatMap((g) => g.mechanics)
                );
                const sharedMechanics = game.mechanics
                    .filter((m) => likedMechanics.has(m))
                    .slice(0, 3);

                const weightClass =
                    game.weight < 2
                        ? "weight-light"
                        : game.weight < 3.5
                        ? "weight-medium"
                        : "weight-heavy";

                const weightLabel =
                    game.weight < 2
                        ? "Light"
                        : game.weight < 3.5
                        ? "Medium"
                        : "Heavy";

                const timeStr = game.min_time === game.max_time
                    ? `${game.min_time} min`
                    : `${game.min_time}–${game.max_time} min`;

                return `
                    <div class="result-card">
                        <img src="${game.thumbnail}" alt="" loading="lazy"
                             onerror="this.style.display='none'">
                        <div class="result-info">
                            <h3>
                                <a href="https://boardgamegeek.com/boardgame/${game.id}"
                                   target="_blank" rel="noopener">
                                    ${escapeHtml(game.name)}
                                </a>
                            </h3>
                            <div class="result-meta">
                                <span>★ ${game.rating.toFixed(1)}</span>
                                <span>${game.min_players}–${game.max_players} players</span>
                                <span>${timeStr}</span>
                                <span class="weight-badge ${weightClass}">${weightLabel} ${game.weight.toFixed(1)}</span>
                                ${game.year ? `<span>${game.year}</span>` : ""}
                            </div>
                            ${sharedMechanics.length > 0
                                ? `<div class="match-reason">${sharedMechanics.join(" · ")}</div>`
                                : ""}
                            ${reason
                                ? `<div class="match-reason">${escapeHtml(reason)}</div>`
                                : ""}
                        </div>
                    </div>`;
            })
            .join("");

        resultsPanel.classList.remove("hidden");
        resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    function escapeHtml(str) {
        const el = document.createElement("span");
        el.textContent = str;
        return el.innerHTML;
    }

    // ---------------------------------------------------------------------------
    // Event Listeners
    // ---------------------------------------------------------------------------

    searchInput.addEventListener("input", onSearchInput);
    searchResults.addEventListener("click", onSearchResultClick);

    selectedContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".remove-btn");
        if (btn) removeSelected(parseInt(btn.dataset.id, 10));
    });

    recommendBtn.addEventListener("click", showResults);

    // Close search results on outside click
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".search-wrap")) {
            searchResults.classList.add("hidden");
        }
    });

    // Enter key in search selects first result
    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const first = searchResults.querySelector(".search-result-item");
            if (first) first.click();
        }
    });

    // ---------------------------------------------------------------------------
    // Init
    // ---------------------------------------------------------------------------

    loadData();
})();
