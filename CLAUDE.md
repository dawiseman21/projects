# CLAUDE.md

This repo is the source for https://wisemandata.com (GitHub Pages, custom domain via `CNAME`). Pushing to `main` publishes live within a minute or two.

## Layout

- `index.html`, `styles.css`, `script.js`: the single-page site for Dave Wiseman's hands-on AI training practice.
- `archive/`: retired side projects (Mini FPS games, leaderboard, board game recommender). Kept for reference, not linked from the site. The games' Supabase backend no longer exists, and the recommender's data was never deployed.
- `_config.yml`: keeps repo-only files (this one, `.claude/`, the recommender's data pipeline) off the live site.

## Copy rules

Site copy follows the house style in the `ai-consults` repo (`STYLE.md`): plain words, no em-dashes, no hype vocabulary. Every statistic or research claim on the site needs a source the reader can check.
