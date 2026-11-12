# HealthyOne blog pipeline

## DIRECTION 2026-11-11 (Chris) — overrides the publisher task's instructions where they conflict

Chris, 2026-11-11: steer away from GLP-1 drugs (side effects) and toward
natural results, whole-food eating and exercise. If the "HealthyOne blog
publisher" task's own instructions, or anything lower in this file, say
"GLP-1 only", "name the drug in the title" or similar, **this section wins.**

- **`scripts/CONTENT_GUIDELINES.md` is binding.** Read it before writing.
  It sets the four lanes, the medication rules and what we never claim.
- **Every new post is natural-first**, in one of four lanes (the topic's
  `"lane"` field in `blog/_content/topics.json`): `eating`, `movement`,
  `appetite`, or `bridge` (life after GLP-1 / keeping weight off without
  medication; at most about 1 post in 5).
- **Title rule:** name GLP-1 drugs (Ozempic, Wegovy, Mounjaro, Zepbound,
  semaglutide, tirzepatide, "GLP-1") in the title **only in `bridge` posts**.
  Other posts use the natural search phrase ("walking plan to lose weight").
  In non-bridge posts, don't mention the drugs in the body either, except
  in an internal link to an older post if it truly helps.
- **CTA text:** mention HealthyOne's GLP-1 mode only in bridge posts.
- **Medication:** never tell anyone to start, stop, skip or change a
  medication; always "talk to your prescriber".
- **No supplement cure claims:** no "natural Ozempic", "nature's Ozempic",
  berberine, detox or cleanse. Natural means food, movement, sleep and habits.
- **No invented studies or statistics.** General, well-known facts only.
- **No reviewer field:** never add `"reviewed"` to a post JSON yourself.
  Reviewer badges are added later with `scripts/mark_reviewed.py`, only after
  a real advisor approves that post.
- **No telehealth / prescription affiliate cards** in new posts. Amazon
  picks come from `blog/_content/affiliate_products.json` only.
- **Existing GLP-1 posts stay live and unchanged** (they bring most readers).
  Link to them from bridge posts; don't rewrite or delete them.
- **Refilling the queue:** when fewer than 3 topics are left, add 10 in the
  same shape (`slug` ending in -2026, `lane`, `keyword`, `topic`, `angle`,
  `image_from` = an existing post slug whose hero and mid images exist),
  spread across the lanes, at most 2 of the 10 in `bridge`. Real search
  phrases; never a "best app" comparison, a supplement topic or a slug that
  already exists.

The rest of this file is the older GLP-1-era manual. It still describes the
files, the build and the push correctly; its topic and title rules are
replaced by the section above.


Two posts a week (Tue + Fri, 8:51 AM ET) are written and published by the
scheduled task **"HealthyOne blog publisher"**. This file is the operator's
manual; the task prompt follows it.

### Health-news posts (Chris 11-12: "research current events and news ... so blogs are relevant and popular search results")
Queue entries with `"lane": "current_events"` (`health-news-N`) are written ONLY by the Tue/Fri Claude publisher (it can search the
web); the Monday Gemini script skips them.
- Research first: the health/food story of the last 7 days people are searching most (new nutrition or exercise study, a food recall,
  a viral diet trend, a new guideline, a seasonal health story). Read 3+ reputable sources (the study itself or a major outlet,
  FDA/USDA/CDC/NIH for recalls and guidance).
- Rename the slug and set `keyword` to what people search before building.
- Structure: what happened (plain facts, linked sources) → what it means for a regular person → the natural-first takeaway (food,
  movement, sleep, habits) → one thing to do this week → where HealthyOne helps.
- Rules: CONTENT_GUIDELINES.md applies in full; describe a study's real size and limits ("in 300 adults over 12 weeks"), never "cures";
  food recalls name the brand/lot exactly as the FDA/USDA notice says and link it; never tell anyone to stop a medication; no fear-mongering.
  If no story fits, write the next queue entry instead.

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

## How the scheduled task pushes (since 2026-10-23)
The cloud session has no credential for this repo (git proxy 403), so the
task exports the commit as a patch and pushes **from Chris's Mac**: it
reads `GH_TOKEN` from `HardawayLabs/Keys/.env.github` with device_bash,
clones with the token in the URL (`https://x-access-token:$T@github.com/…`;
`-c http.extraheader` does not survive the Mac VM proxy), `git am`s the
patch and pushes `HEAD:main`. The token never leaves the Mac. Rotating or
revoking that token, or the Mac being offline at 8:51 AM ET, breaks
publishing — the run then queues files under `_publish_queue/` and says why.
Verify production with `curl -s -o /dev/null -w "%{http_code}"`, not
`curl -sI | head -1` (that line is the proxy's CONNECT reply).

## Editorial standard (what the winners have in common)
- Title = the search phrase + the format + "(2026)", 55–70 chars. (Since
  2026-11-11 drug names only in bridge posts; see the DIRECTION section.)
- 1,300–1,800 words. Numbered or tiered lists with protein grams per item.
  A "what to avoid" section. A short "why a printed list isn't enough" bridge
  into HealthyOne, never a hard sell.
- 4 FAQ entries phrased the way people search ("Can I eat eggs on Mounjaro?").
- 3 internal links to related posts (`/blog/wegovy-food-list-2026`,
  `/blog/glp1-protein-foods-list-2026`, `/blog/glp1-nausea-what-to-eat-2026`…).
- Nutrition guidance only; dosing or medical questions → "ask your prescriber".
- `<!--MID-->` marker roughly a third of the way down for the mid image.
