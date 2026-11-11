#!/usr/bin/env python3
"""
mark_reviewed.py — add a "reviewed by" badge to ONE post, after a real advisor
replied OK to that post (the weekly advisor email). Never use it otherwise.

Usage (from the repo root):
  python3 -I scripts/mark_reviewed.py <slug> <advisor-key> [--date YYYY-MM-DD] [--commit]

What it does:
  1. Reads the advisor from blog/_content/advisors.json (key -> name,
     credential, role "nutrition"|"medical", profile URL).
  2. Adds/updates {"name","credential","role","date","profile"} in the post's
     "reviewed" list in blog/_content/<slug>.json.
  3. Rebuilds blog/<slug>.html with scripts/blog_publish.py, keeping the
     original publish date. The badge links to /advisors and the Article
     JSON-LD gets reviewedBy + lastReviewed.
  4. Prints the git commands to publish (or commits with --commit; it never
     pushes).

It refuses to run while advisors.json is missing, the advisor entry is still a
placeholder (or "ready" is not true), or the public advisors page
(advisors.html) is not in this checkout: a badge must never point at a page
that does not exist or name someone who has not agreed.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "blog" / "_content"
ADVISORS = CONTENT / "advisors.json"
ADVISORS_PAGE = ROOT / "advisors.html"
BUILD = ROOT / "scripts" / "blog_publish.py"


def die(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def load_advisor(key: str) -> dict:
    if not ADVISORS.exists():
        die(f"{ADVISORS.relative_to(ROOT)} not found. The advisors page and file live on the "
            "advisors-draft branch until both advisors have agreed; merge it first.")
    cfg = json.loads(ADVISORS.read_text())
    advisors = cfg.get("advisors", {})
    if key not in advisors:
        die(f"no advisor {key!r}; known: {', '.join(sorted(advisors)) or 'none'}")
    a = advisors[key]
    blob = json.dumps(a).upper()
    if not a.get("ready") or "PLACEHOLDER" in blob or "TBD" in blob:
        die(f"advisor {key!r} is still a placeholder (fill in real details and set \"ready\": true "
            "only after they agreed to be named)")
    for k in ("name", "credential", "role"):
        if not str(a.get(k, "")).strip():
            die(f"advisor {key!r} missing {k}")
    if a["role"] not in ("nutrition", "medical"):
        die(f"advisor {key!r} role must be nutrition or medical")
    if not ADVISORS_PAGE.exists():
        die("advisors.html is not in this checkout; publish the advisors page before any badge")
    return a


def original_date(slug: str) -> str:
    html = ROOT / "blog" / f"{slug}.html"
    if not html.exists():
        die(f"blog/{slug}.html not found (publish the post first)")
    m = re.search(r'"datePublished":\s*"(\d{4}-\d{2}-\d{2})"', html.read_text())
    if not m:
        die(f"could not find datePublished in blog/{slug}.html")
    return m.group(1)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("advisor_key")
    ap.add_argument("--date", help="review date YYYY-MM-DD (default: today, America/New_York)")
    ap.add_argument("--commit", action="store_true", help="git commit the change (never pushes)")
    a = ap.parse_args()

    adv = load_advisor(a.advisor_key)
    if a.date:
        review_date = dt.date.fromisoformat(a.date).isoformat()
    else:
        from zoneinfo import ZoneInfo
        review_date = dt.datetime.now(ZoneInfo("America/New_York")).date().isoformat()

    src = CONTENT / f"{a.slug}.json"
    if not src.exists():
        die(f"{src.relative_to(ROOT)} not found; only posts built from a content JSON can carry a badge")
    published = original_date(a.slug)
    if review_date < published:
        die(f"review date {review_date} is before the post's publish date {published}")

    post = json.loads(src.read_text())
    entry = {"name": adv["name"].strip(), "credential": adv["credential"].strip(),
             "role": adv["role"], "date": review_date}
    if adv.get("job_title"):
        entry["job_title"] = adv["job_title"].strip()
    if adv.get("profile"):
        entry["profile"] = adv["profile"].strip()
    revs = [r for r in post.get("reviewed", []) if r.get("role") != adv["role"]]
    revs.append(entry)
    post["reviewed"] = sorted(revs, key=lambda r: r["role"])
    src.write_text(json.dumps(post, indent=1, ensure_ascii=False) + "\n")
    print(f"{src.relative_to(ROOT)}: reviewed -> {entry['name']}, {entry['credential']} ({entry['role']}) {review_date}")

    r = subprocess.run([sys.executable, "-I", str(BUILD), a.slug, "--date", published], cwd=ROOT)
    if r.returncode != 0:
        die("rebuild failed; the JSON was updated but the page was not (fix and rerun)")

    files = [f"blog/_content/{a.slug}.json", f"blog/{a.slug}.html"]
    msg = f"Blog: {adv['role']} review badge on {a.slug} ({review_date})"
    if a.commit:
        subprocess.run(["git", "add", *files], cwd=ROOT, check=True)
        subprocess.run(["git", "commit", "-q", "-m", msg], cwd=ROOT, check=True)
        print("Committed. To publish:  git push origin main")
    else:
        print("\nTo publish:")
        print(f"  git add {' '.join(files)}")
        print(f'  git commit -m "{msg}"')
        print("  git push origin main")


if __name__ == "__main__":
    main()
