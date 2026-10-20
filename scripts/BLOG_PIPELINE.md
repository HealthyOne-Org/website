# HealthyOne blog pipeline

Two posts a week (Tue + Fri, 8:51 AM ET) are written and published by the
scheduled task **"HealthyOne blog publisher"**. This file is the operator's
manual; the task prompt follows it.

## What drives the topic choice
- PostHog web analytics for healthyoneapp.com: the GLP-1 food-list posts
  (Wegovy / Zepbound / Mounjaro food lists) are 55%+ of visitors and bounce
  at 20–25%, while the "best X app 2026" comparison posts bounce at 80%+.
  So the queue is GLP-1 *eating* intent: what to eat, lists ranked by protein
  per bite, what to avoid, meal plans, side-effect nutrition.
- `blog/_content/topics.json` is the queue. Each run takes the first entry
  without a `done` date. When fewer than 3 are left, the run appends 10 more
  in the same shape (slug, keyword, topic, angle, image_from).

## Files
- `blog/_content/<slug>.json` — the post content (schema in blog_publish.py)
- `blog/_content/_template.html` — layout extracted from the proven
  wegovy/snacks posts; nav, sticky download bar and PostHog tracking intact
- `scripts/blog_publish.py` — renders the HTML, images, index card, sitemap
- `blog/images/<slug>-hero.jpg`, `<slug>-mid.jpg` — 1200×675

## Publish by hand
```bash
git clone https://github.com/HealthyOne-Org/website.git && cd website
# write blog/_content/my-post-2026.json
python3 -I scripts/blog_publish.py my-post-2026 --pexels-key "$PEXELS_API_KEY"
git add -A && git commit -m "Blog: my post" && git push origin main
curl -sI https://www.healthyoneapp.com/blog/my-post-2026 | head -1   # expect 200
```
Vercel deploys `main` automatically (1–2 min). The copy of the site inside
the HealthyOnePlus repo (`HardawayLabs/Healthyone/website`) does **not**
deploy — see DO-NOT-EDIT-THIS-COPY.md there.

## Editorial standard (what the winners have in common)
- Title names the drug(s) and the format: "The Wegovy Food List: What to Eat
  (and Avoid)…", "GLP-1 Snacks: 25 Snacks That…"; year in title; 55–70 chars.
- 1,300–1,800 words. Numbered or tiered lists with protein grams per item.
  A "what to avoid" section. A short "why a printed list isn't enough" bridge
  into HealthyOne, never a hard sell.
- 4 FAQ entries phrased the way people search ("Can I eat eggs on Mounjaro?").
- 3 internal links to related posts (`/blog/wegovy-food-list-2026`,
  `/blog/glp1-protein-foods-list-2026`, `/blog/glp1-nausea-what-to-eat-2026`…).
- Nutrition guidance only; dosing or medical questions → "ask your prescriber".
- `<!--MID-->` marker roughly a third of the way down for the mid image.
