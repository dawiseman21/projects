#!/usr/bin/env python3
"""
BoardGame Recommendation Engine - Data Pipeline

Fetches data from BoardGameGeek and builds pre-computed recommendation
data as static JSON for the frontend. Zero runtime API costs.

Usage:
    pip install -r requirements.txt
    python build_data.py [--num-games 2000] [--output ../data]
"""

import requests
import xml.etree.ElementTree as ET
import json
import time
import os
import re
import math
import argparse
from collections import defaultdict

import numpy as np

BGG_XML_API = "https://boardgamegeek.com/xmlapi2"
BGG_BROWSE = "https://boardgamegeek.com/browse/boardgame/page/{}"
USER_AGENT = "BoardGameRecEngine/1.0 (github.com/dawiseman21/projects)"


# ---------------------------------------------------------------------------
# Step 1: Fetch top-ranked game IDs from BGG browse pages
# ---------------------------------------------------------------------------

def fetch_top_game_ids(num_games=2000, delay=2.0):
    """Scrape BGG rankings pages to collect top-ranked game IDs."""
    ids = []
    seen = set()
    pages = math.ceil(num_games / 100)

    for page in range(1, pages + 1):
        print(f"  Fetching rankings page {page}/{pages}...")
        resp = requests.get(
            BGG_BROWSE.format(page),
            headers={"User-Agent": USER_AGENT},
        )
        resp.raise_for_status()

        # Game IDs appear in links like /boardgame/174430/gloomhaven
        for gid in re.findall(r'/boardgame/(\d+)/', resp.text):
            gid = int(gid)
            if gid not in seen:
                ids.append(gid)
                seen.add(gid)

        if page < pages:
            time.sleep(delay)

    return ids[:num_games]


# ---------------------------------------------------------------------------
# Step 2: Fetch detailed game data from BGG XML API2
# ---------------------------------------------------------------------------

def fetch_game_details(game_ids, delay=2.0, batch_size=20):
    """Batch-fetch game details with stats from the BGG XML API."""
    games = {}
    batches = [game_ids[i:i + batch_size] for i in range(0, len(game_ids), batch_size)]

    for i, batch in enumerate(batches):
        print(f"  Fetching details batch {i + 1}/{len(batches)} "
              f"({len(games)} games so far)...")

        ids_str = ",".join(str(gid) for gid in batch)
        resp = requests.get(
            f"{BGG_XML_API}/thing",
            params={"id": ids_str, "stats": 1, "type": "boardgame"},
            headers={"User-Agent": USER_AGENT},
        )

        # BGG sometimes returns 202 "please wait" for large requests
        retries = 0
        while resp.status_code == 202 and retries < 5:
            print(f"    BGG returned 202, retrying in {delay}s...")
            time.sleep(delay)
            resp = requests.get(
                f"{BGG_XML_API}/thing",
                params={"id": ids_str, "stats": 1, "type": "boardgame"},
                headers={"User-Agent": USER_AGENT},
            )
            retries += 1

        resp.raise_for_status()
        root = ET.fromstring(resp.content)

        for item in root.findall("item"):
            game = _parse_game_xml(item)
            if game:
                games[game["id"]] = game

        if i < len(batches) - 1:
            time.sleep(delay)

    return games


def _parse_game_xml(item):
    """Parse a single <item> element from BGG XML API response."""
    try:
        game_id = int(item.get("id"))

        # Primary name
        name_el = item.find('.//name[@type="primary"]')
        name = name_el.get("value") if name_el is not None else "Unknown"

        # Year published
        year_el = item.find("yearpublished")
        year = int(year_el.get("value", 0)) if year_el is not None else 0

        # Player count
        min_players = _int_attr(item, "minplayers")
        max_players = _int_attr(item, "maxplayers")

        # Play time
        min_time = _int_attr(item, "minplaytime")
        max_time = _int_attr(item, "maxplaytime")

        # Thumbnail
        thumb_el = item.find("thumbnail")
        thumbnail = thumb_el.text.strip() if thumb_el is not None and thumb_el.text else ""

        # Short description
        desc_el = item.find("description")
        description = ""
        if desc_el is not None and desc_el.text:
            # Strip HTML-ish entities and truncate
            raw = re.sub(r'&#\d+;', ' ', desc_el.text)
            raw = re.sub(r'<[^>]+>', '', raw)
            description = raw.strip()[:300]

        # Ratings & stats
        stats = item.find(".//statistics/ratings")
        avg_rating = 0.0
        num_ratings = 0
        weight = 0.0
        bgg_rank = 0

        if stats is not None:
            avg_rating = _float_attr(stats, "average")
            num_ratings = int(_float_attr(stats, "usersrated"))
            weight = _float_attr(stats, "averageweight")

            for rank_el in stats.findall(".//rank"):
                if rank_el.get("name") == "boardgame":
                    rv = rank_el.get("value", "Not Ranked")
                    if rv != "Not Ranked":
                        bgg_rank = int(rv)

        # Linked metadata
        mechanics = []
        categories = []
        designers = []

        for link in item.findall("link"):
            lt = link.get("type")
            lv = link.get("value")
            if lt == "boardgamemechanic":
                mechanics.append(lv)
            elif lt == "boardgamecategory":
                categories.append(lv)
            elif lt == "boardgamedesigner":
                designers.append(lv)

        return {
            "id": game_id,
            "name": name,
            "year": year,
            "min_players": min_players,
            "max_players": max_players,
            "min_time": min_time,
            "max_time": max_time,
            "weight": round(weight, 2),
            "rating": round(avg_rating, 2),
            "num_ratings": num_ratings,
            "rank": bgg_rank,
            "thumbnail": thumbnail,
            "description": description,
            "mechanics": mechanics,
            "categories": categories,
            "designers": designers,
        }
    except Exception as e:
        print(f"    Warning: failed to parse game {item.get('id')}: {e}")
        return None


def _int_attr(parent, tag):
    el = parent.find(tag)
    return int(el.get("value", 0)) if el is not None else 0


def _float_attr(parent, tag):
    el = parent.find(tag)
    try:
        return float(el.get("value", 0))
    except (TypeError, ValueError):
        return 0.0


# ---------------------------------------------------------------------------
# Step 3: Build feature vectors
# ---------------------------------------------------------------------------

def build_features(games):
    """
    Build numeric feature vectors for similarity computation.

    Features:
      - Mechanics (binary, weighted 2x)
      - Categories (binary, weighted 1.5x)
      - Complexity/weight (normalized 0-1)
      - Player count midpoint (normalized 0-1)
      - Play time midpoint (normalized 0-1)
    """
    all_mechanics = sorted({m for g in games.values() for m in g["mechanics"]})
    all_categories = sorted({c for g in games.values() for c in g["categories"]})

    mech_idx = {m: i for i, m in enumerate(all_mechanics)}
    cat_idx = {c: i for i, c in enumerate(all_categories)}

    dim = len(all_mechanics) + len(all_categories) + 3
    game_ids = list(games.keys())
    matrix = np.zeros((len(game_ids), dim), dtype=np.float32)

    for row, gid in enumerate(game_ids):
        g = games[gid]

        # Mechanics (2x weight)
        for m in g["mechanics"]:
            matrix[row, mech_idx[m]] = 2.0

        # Categories (1.5x weight)
        offset = len(all_mechanics)
        for c in g["categories"]:
            matrix[row, offset + cat_idx[c]] = 1.5

        # Normalized complexity (1-5 scale -> 0-1)
        base = offset + len(all_categories)
        matrix[row, base] = (g["weight"] - 1) / 4 if g["weight"] > 0 else 0.5

        # Normalized player count midpoint (cap at 10)
        mid_p = (g["min_players"] + g["max_players"]) / 2
        matrix[row, base + 1] = min(mid_p / 10, 1.0)

        # Normalized play time midpoint (cap at 240 min)
        mid_t = (g["min_time"] + g["max_time"]) / 2
        matrix[row, base + 2] = min(mid_t / 240, 1.0)

    return game_ids, matrix, all_mechanics, all_categories


# ---------------------------------------------------------------------------
# Step 4: Compute cosine similarity (top-K per game)
# ---------------------------------------------------------------------------

def compute_similarities(game_ids, matrix, top_k=30):
    """
    Compute cosine similarity between all games using numpy.
    Store only the top-K most similar per game to keep output compact.
    """
    # Normalize rows
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1
    normed = matrix / norms

    # Full similarity matrix (fast with numpy)
    sim_matrix = normed @ normed.T

    similarities = {}
    for i, gid in enumerate(game_ids):
        row = sim_matrix[i].copy()
        row[i] = -1  # exclude self
        top_idx = np.argsort(row)[-top_k:][::-1]
        similarities[gid] = [
            [int(game_ids[j]), round(float(row[j]), 4)]
            for j in top_idx
        ]

    return similarities


# ---------------------------------------------------------------------------
# Step 5: Export JSON
# ---------------------------------------------------------------------------

def export(games, similarities, mechanics, categories, output_dir):
    """Write static JSON files for the frontend."""
    os.makedirs(output_dir, exist_ok=True)

    # games.json — sorted by BGG rank
    games_list = sorted(
        games.values(),
        key=lambda g: g["rank"] if g["rank"] > 0 else 99999,
    )
    games_path = os.path.join(output_dir, "games.json")
    with open(games_path, "w", encoding="utf-8") as f:
        json.dump(games_list, f, ensure_ascii=False, separators=(",", ":"))
    size_mb = os.path.getsize(games_path) / (1024 * 1024)
    print(f"  Wrote {len(games_list)} games to games.json ({size_mb:.1f} MB)")

    # similarities.json — keyed by game ID, each value is [[id, score], ...]
    sim_path = os.path.join(output_dir, "similarities.json")
    sim_export = {str(k): v for k, v in similarities.items()}
    with open(sim_path, "w") as f:
        json.dump(sim_export, f, separators=(",", ":"))
    size_mb = os.path.getsize(sim_path) / (1024 * 1024)
    print(f"  Wrote similarities to similarities.json ({size_mb:.1f} MB)")

    # meta.json — metadata for the UI
    meta_path = os.path.join(output_dir, "meta.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump({
            "mechanics": mechanics,
            "categories": categories,
            "total_games": len(games_list),
            "built": time.strftime("%Y-%m-%d %H:%M:%S"),
        }, f, ensure_ascii=False, indent=2)
    print(f"  Wrote metadata to meta.json")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Build boardgame recommendation data from BoardGameGeek"
    )
    parser.add_argument(
        "--num-games", type=int, default=2000,
        help="Number of top-ranked games to fetch (default: 2000)",
    )
    parser.add_argument(
        "--top-k", type=int, default=30,
        help="Similar games to store per game (default: 30)",
    )
    parser.add_argument(
        "--output", type=str, default="../data",
        help="Output directory for JSON files (default: ../data)",
    )
    parser.add_argument(
        "--delay", type=float, default=2.0,
        help="Seconds between BGG API requests (default: 2.0)",
    )
    args = parser.parse_args()

    print("\n=== BoardGame Rec Engine — Data Pipeline ===\n")

    # Step 1
    print(f"Step 1: Fetching top {args.num_games} game IDs from BGG rankings...")
    game_ids = fetch_top_game_ids(args.num_games, delay=args.delay)
    print(f"  Found {len(game_ids)} game IDs\n")

    # Step 2
    print("Step 2: Fetching game details from BGG XML API...")
    games = fetch_game_details(game_ids, delay=args.delay)
    print(f"  Fetched details for {len(games)} games\n")

    # Step 3
    print("Step 3: Building feature vectors...")
    id_list, matrix, mechanics, categories = build_features(games)
    print(f"  {len(mechanics)} mechanics, {len(categories)} categories, "
          f"{matrix.shape[1]} dimensions\n")

    # Step 4
    print(f"Step 4: Computing similarities (top {args.top_k} per game)...")
    similarities = compute_similarities(id_list, matrix, top_k=args.top_k)
    print("  Done\n")

    # Step 5
    print("Step 5: Exporting JSON...")
    export(games, similarities, mechanics, categories, args.output)

    print("\n=== Pipeline complete! ===\n")


if __name__ == "__main__":
    main()
