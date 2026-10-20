#!/usr/bin/env python3
"""
blog_publish.py — build a HealthyOne blog post from blog/_content/<slug>.json.

What it does (idempotent, re-run safe):
  1. Renders blog/<slug>.html from blog/_content/_template.html (the proven
     wegovy/snacks layout: nav, hero + mid image, FAQ + FAQPage JSON-LD,
     bottom line, CTA box, sticky download bar, PostHog click tracking).
  2. Provides hero/mid images at blog/images/<slug>-{hero,mid}.jpg:
       --pexels-key KEY   download fresh 1200x675 photos from Pexels using the
                          JSON's "image_queries" (or title words as fallback)
       otherwise           copy from the post named in "image_from" (JSON) or
                          --image-from SLUG
  3. Inserts a card at the top of blog/index.html (skipped if present).
  4. Adds the URL to sitemap.xml (skipped if present).
  5. Marks the slug done in blog/_content/topics.json.

Usage (from the repo root):
  python3 -I scripts/blog_publish.py <slug> [--pexels-key KEY] [--image-from SLUG]
                                            [--date YYYY-MM-DD] [--dry]

JSON schema (blog/_content/<slug>.json):
  slug, title, description, keywords[], tags[], read_min, excerpt,
  cta_title, cta_text, body_html (may contain <!--MID--> where the mid image
  goes), faq[{q,a}], bottom_line,
  optional: image_from, image_queries[hero, mid], hero_credit, mid_credit
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import shutil
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLOG = ROOT / "blog"
CONTENT = BLOG / "_content"
IMAGES = BLOG / "images"
TEMPLATE = CONTENT / "_template.html"
INDEX = BLOG / "index.html"
SITEMAP = ROOT / "sitemap.xml"
TOPICS = CONTENT / "topics.json"
SITE = "https://www.healthyoneapp.com"

REQUIRED = ["slug", "title", "description", "keywords", "tags", "read_min",
            "excerpt", "cta_title", "cta_text", "body_html", "faq", "bottom_line"]


def die(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def esc_attr(s: str) -> str:
    return s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")


def human_date(d: dt.date) -> str:
    return f"{d.strftime('%B')} {d.day}, {d.year}"


def img_tag(slug: str, kind: str, title: str, cls: str) -> str:
    return (f'<img class="{cls}" src="/blog/images/{slug}-{kind}.jpg" alt="{esc_attr(title)}" '
            f'loading="lazy" width="1200" height="675">')


def render(post: dict, date: dt.date) -> str:
    tpl = TEMPLATE.read_text()
    slug, title = post["slug"], post["title"].strip()
    mid_credit = post.get("mid_credit") or "Photo via Pexels"
    hero_credit = post.get("hero_credit") or "Photo via Pexels"

    mid_block = (f'{img_tag(slug, "mid", title, "inline-img")}\n'
                 f'        <div class="img-credit">{mid_credit}</div>')
    body = post["body_html"].strip()
    if "<!--MID-->" in body:
        body = body.replace("<!--MID-->", mid_block, 1)
    else:  # no marker: drop the mid image after the 3rd <h2>
        parts = re.split(r"(?=<h2>)", body)
        if len(parts) > 3:
            parts.insert(3, mid_block + "\n\n        ")
            body = "".join(parts)
        else:
            body = body + "\n\n        " + mid_block

    faq_html = "\n\n".join(
        f"        <h3>{f['q'].strip()}</h3>\n        <p>{f['a'].strip()}</p>" for f in post["faq"])

    article_ld = json.dumps({
        "@context": "https://schema.org", "@type": "Article", "headline": title,
        "author": {"@type": "Person", "name": "Chris Hardaway"},
        "publisher": {"@type": "Organization", "name": "Hardaway Labs LLC"},
        "datePublished": date.isoformat(), "dateModified": date.isoformat(),
        "description": post["description"].strip(),
        "image": f"{SITE}/blog/images/{slug}-hero.jpg",
        "mainEntityOfPage": f"{SITE}/blog/{slug}",
    }, ensure_ascii=False)
    faq_ld = json.dumps({
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": re.sub(r"<[^>]+>", "", f["q"]).strip(),
                        "acceptedAnswer": {"@type": "Answer",
                                           "text": re.sub(r"<[^>]+>", "", f["a"]).strip()}}
                       for f in post["faq"]],
    }, ensure_ascii=False)

    out = (tpl.replace("{{ARTICLE_LD}}", article_ld)
              .replace("{{FAQ_LD}}", faq_ld)
              .replace("{{BODY}}", body)
              .replace("{{FAQ_HTML}}", faq_html)
              .replace("{{BOTTOM_LINE}}", post["bottom_line"].strip())
              .replace("{{CTA_TITLE}}", post["cta_title"].strip())
              .replace("{{CTA_TEXT}}", post["cta_text"].strip())
              .replace("{{KEYWORDS}}", ", ".join(post["keywords"]))
              .replace("{{DATE_HUMAN}}", human_date(date))
              .replace("{{READ_MIN}}", str(post["read_min"]))
              .replace("{{DESCRIPTION}}", post["description"].strip())
              .replace("{{TITLE}}", title)
              .replace("{{SLUG}}", slug)
              .replace("Photo via Pexels</div>\n\n{{", f"{hero_credit}</div>\n\n{{"))
    leftover = re.findall(r"\{\{[A-Z_]+\}\}", out)
    if leftover:
        die(f"unfilled placeholders: {leftover}")
    return out


def pexels_download(key: str, query: str, dest: Path) -> bool:
    url = "https://api.pexels.com/v1/search?" + urllib.parse.urlencode(
        {"query": query, "per_page": 8, "orientation": "landscape", "size": "large"})
    req = urllib.request.Request(url, headers={"Authorization": key, "User-Agent": "healthyone-blog/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.load(r)
    except Exception as e:  # noqa: BLE001
        print(f"  pexels search failed for {query!r}: {e}")
        return False
    for photo in data.get("photos", []):
        src = photo.get("src", {}).get("original")
        if not src:
            continue
        dl = f"{src}?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=675"
        try:
            req2 = urllib.request.Request(dl, headers={"User-Agent": "healthyone-blog/1.0"})
            with urllib.request.urlopen(req2, timeout=60) as r, open(dest, "wb") as f:
                shutil.copyfileobj(r, f)
            if dest.stat().st_size > 20_000:
                print(f"  pexels: {dest.name} <- photo {photo.get('id')} by {photo.get('photographer')}")
                return True
        except Exception as e:  # noqa: BLE001
            print(f"  pexels download failed: {e}")
    return False


def ensure_images(post: dict, pexels_key: str | None, image_from: str | None, dry: bool) -> None:
    slug = post["slug"]
    IMAGES.mkdir(exist_ok=True)
    queries = post.get("image_queries") or [
        f"{re.sub(r'[^a-z ]', ' ', post['title'].lower())} healthy food", "healthy protein meal overhead"]
    for kind, q in zip(("hero", "mid"), queries):
        dest = IMAGES / f"{slug}-{kind}.jpg"
        if dest.exists() and dest.stat().st_size > 20_000:
            print(f"  image ok: {dest.name}")
            continue
        if dry:
            print(f"  [dry] would create {dest.name}")
            continue
        if pexels_key and pexels_download(pexels_key, q, dest):
            continue
        src_slug = image_from or post.get("image_from")
        src = IMAGES / f"{src_slug}-{kind}.jpg" if src_slug else None
        if src and src.exists():
            shutil.copyfile(src, dest)
            print(f"  image copied: {src.name} -> {dest.name}")
        else:
            die(f"no image for {dest.name}: give --pexels-key or a valid image_from")


def card_html(post: dict, date: dt.date) -> str:
    slug = post["slug"]
    tags = "\n".join(f'                <span class="tag">{t}</span>' for t in post["tags"])
    return (
        '<article class="post-card">\n'
        '            <div>\n'
        f'{tags}\n'
        '            </div>\n'
        f'            <h2><a href="/blog/{slug}.html">{post["title"].strip()}</a></h2>\n'
        f'            <div class="post-meta">{human_date(date)} &middot; {post["read_min"]} min read &middot; By Chris Hardaway</div>\n'
        f'            <p class="post-excerpt">{post["excerpt"].strip()}</p>\n'
        f'            <a href="/blog/{slug}.html" class="read-more">Read more &rarr;</a>\n'
        '        </article>\n        ')


def update_index(post: dict, date: dt.date, dry: bool) -> None:
    idx = INDEX.read_text()
    if f'/blog/{post["slug"]}.html' in idx:
        print("  index: card already present")
        return
    marker = '<div class="posts">\n        '
    if marker not in idx:
        die("blog/index.html: cannot find posts container")
    idx = idx.replace(marker, marker + card_html(post, date), 1)
    if not dry:
        INDEX.write_text(idx)
    print("  index: card added at top")


def update_sitemap(slug: str, date: dt.date, dry: bool) -> None:
    sm = SITEMAP.read_text()
    loc = f"{SITE}/blog/{slug}"
    if loc + "<" in sm:
        print("  sitemap: already present")
        return
    entry = (f"  <url><loc>{loc}</loc><lastmod>{date.isoformat()}</lastmod>"
             f"<changefreq>monthly</changefreq><priority>0.7</priority></url>\n</urlset>")
    sm = sm.replace("</urlset>", entry, 1)
    if not dry:
        SITEMAP.write_text(sm)
    print("  sitemap: entry added")


def mark_topic_done(slug: str, date: dt.date, dry: bool) -> None:
    if not TOPICS.exists():
        return
    topics = json.loads(TOPICS.read_text())
    hit = False
    for t in topics:
        if t.get("slug") == slug:
            t["done"] = date.isoformat()
            hit = True
    if hit and not dry:
        TOPICS.write_text(json.dumps(topics, indent=1, ensure_ascii=False) + "\n")
    print(f"  topics.json: {'marked done' if hit else 'slug not in queue (fine)'}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--pexels-key")
    ap.add_argument("--image-from")
    ap.add_argument("--date", help="YYYY-MM-DD (default: today, America/New_York)")
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()

    src = CONTENT / f"{a.slug}.json"
    if not src.exists():
        die(f"{src} not found")
    post = json.loads(src.read_text())
    missing = [k for k in REQUIRED if k not in post or post[k] in ("", [], None)]
    if missing:
        die(f"{src.name} missing fields: {missing}")
    if post["slug"] != a.slug:
        die("slug in JSON does not match argument")
    if len(post["faq"]) < 3:
        die("need at least 3 FAQ entries")
    words = len(re.sub(r"<[^>]+>", " ", post["body_html"]).split())
    if words < 900:
        die(f"body_html is only {words} words; posts that rank are 1,200+")

    if a.date:
        date = dt.date.fromisoformat(a.date)
    else:
        try:
            from zoneinfo import ZoneInfo
            date = dt.datetime.now(ZoneInfo("America/New_York")).date()
        except Exception:  # noqa: BLE001
            date = dt.date.today()

    print(f"Publishing {a.slug} ({words} words, {len(post['faq'])} FAQ) dated {date}")
    ensure_images(post, a.pexels_key, a.image_from, a.dry)
    html = render(post, date)
    out = BLOG / f"{a.slug}.html"
    if not a.dry:
        out.write_text(html)
    print(f"  wrote {out.relative_to(ROOT)} ({len(html):,} bytes)")
    update_index(post, date, a.dry)
    update_sitemap(a.slug, date, a.dry)
    mark_topic_done(a.slug, date, a.dry)
    print(f"Done. Live URL after deploy: {SITE}/blog/{a.slug}")


if __name__ == "__main__":
    main()
