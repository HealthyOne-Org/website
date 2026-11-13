# HealthyOne blog publisher: instructions for the scheduled writer

Runs **Tuesday and Friday at 8:51 AM America/New_York** from the Mac's Hermes cron (`blog_publisher.py ho`),
spread from Healthy Money (8:31) and Healthy Faith (8:41). Working directory: `~/Code/website`, a checkout of
`HealthyOne-Org/website` (main deploys to Vercel). One run = at most one post. Chris is not present.

Read these in full before writing. **They win over anything below:**
`scripts/BLOG_PIPELINE.md` (its DIRECTION 2026-11-11 section: natural-first, four lanes, drug-name rule),
`scripts/CONTENT_GUIDELINES.md`, and `scripts/WHAT_WORKS.md` (rewritten every Sunday by blog_learner.py).

Report facts only; never say a post is live unless the production check returned 200. Convert dates with
`TZ=America/New_York date`.

## 1. Preflight (stop and report if any fails)
1. `git status` is clean and `git pull --ff-only origin main` succeeds.
2. `scripts/blog_publish.py`, `blog/_content/_template.html` and `blog/_content/topics.json` exist.
3. Pexels key, never printed: `K=$(grep '^PEXELS_API_KEY=' ~/Desktop/HardawayLabs/Healthyone/.env | cut -d= -f2 | tr -d "\"' ")`.
   If empty, images are reused from the topic's `image_from`; that is fine.

## 2. Pick the topic
1. Load `blog/_content/topics.json`. Take the FIRST entry with no `done` date; skip any whose slug already
   exists as `blog/<slug>.html`. A `"lane": "refresh"` entry is an update of an existing post: follow the
   Refresh section of BLOG_PIPELINE.md instead of steps 3–4 below.
2. Traffic signal (optional): PostHog web stats for the last 28 days, top 3 `/blog/` paths. Use the PostHog
   MCP if this session has it; otherwise the PostHog API with `POSTHOG_API_KEY` / `POSTHOG_PROJECT_ID` /
   `POSTHOG_HOST` from `/Users/Shared/gabriel/config/.env` (never print the key). If both fail, write "n/a".
   Don't change the topic because of it.
3. If fewer than 3 undone topics remain after this one, refill the queue exactly as BLOG_PIPELINE.md's
   DIRECTION section says (10 entries, spread across the lanes, at most 2 `bridge`).

## 3. Write `blog/_content/<slug>.json`
Use `blog/_content/glp1-snacks-2026.json` as the schema reference: slug, title (55–70 chars, the natural
search phrase, "(2026)"), description (140–160 chars), keywords (8–10), tags (2–3), read_min, excerpt
(1–2 sentences), cta_title, cta_text (HealthyOne: AI photo/voice meal logging, protein-first dashboard,
50+ nutrients, 7-day free trial; GLP-1 mode only in `bridge` posts), image_queries [hero, mid] (concrete,
photographable food or movement scenes), image_from (existing slug whose images exist), body_html,
faq (4 {q,a}), bottom_line (one paragraph). Never add a `reviewed` field.

body_html: 1,300–1,800 words (count with a script; trim if over), Chris's plain direct voice, 8-space
indentation like the reference, `<h2>/<h3>/<p>/<ul>/<ol>/<strong>`, lists with portions or protein grams
where they fit, a "what to skip" section, and one short bridge `<h2>` near the end on how HealthyOne closes the
gap (not a sales pitch). `<!--MID-->` on its own line about a third of the way down. 3 internal links
`<a href="/blog/<existing-slug>">`; check each file exists. Medication: always "talk to your prescriber".
No invented studies, statistics or quotes.

## 4. Build
`python3 -I scripts/blog_publish.py <slug> --pexels-key "$K" 2>&1 | sed "s/$K/[key]/g"` (omit the key if
empty). It writes the post, images, index card and sitemap entry and marks topics.json. On error, fix the
JSON and rerun; never hand-edit generated HTML. Sanity: `grep -c '{{' blog/<slug>.html` = 0; both
`blog/images/<slug>-*.jpg` > 20 KB and not byte-identical; look at both images with Read and confirm they fit
the topic (if not, change that image_query, delete the image and rebuild).

## 5. Publish
`git add -A && git commit -m "Blog: <title>"` (end the message with the attribution lines your session gives
you), then `git push origin main`. If rejected as non-fast-forward: `git pull --rebase origin main` and push
once more. Never force-push.

Verify production with real status codes (never `curl -sI | head -1`), up to 6 tries 30 s apart:
`curl -s -o /dev/null -w "%{http_code}" https://www.healthyoneapp.com/blog/<slug>` → 200;
`curl -s https://www.healthyoneapp.com/blog | grep -c "<slug>"` ≥ 1; the hero image URL → 200.

## 6. Log + report
Append one row to `~/Desktop/HardawayLabs/blog_publish_log.md` (if the append fails, e.g. "Resource deadlock
avoided", say so in the report and move on):
`| <date> | <slug> | <words> words | <published live ✅ / pushed, not live yet ⚠️ / failed ❌ + reason> | queue left: N | top pages 28d: <p1>, <p2>, <p3> or n/a |`

End with ONE short report message (it is sent to Chris's Telegram as-is): first line = what went live with
the URL (or what failed and why); then title, lane, word count, topics left, the top-pages line, and one line
for anything skipped or failing.

## Never
Post to social or touch Publer, edit or delete an existing post (except a `refresh` entry), change the
template/CSS/tracking, push to any other repo, or include a token or key anywhere.
