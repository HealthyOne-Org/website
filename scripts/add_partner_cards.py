#!/usr/bin/env python3
"""add_partner_cards.py — put the Diet Direct card into already-published blog posts.

New posts get it from blog_publish.py ({{AFFILIATE}}). Older posts were built in several layouts,
so this inserts the same card (blog_publish.diet_direct_html) straight into blog/<slug>.html for
every slug in affiliate_products.json partners.diet_direct.post_picks:
  * replaces an existing <!-- ho-dd --> ... <!-- /ho-dd --> block (re-run safe), else
  * goes right before <h2>The Bottom Line</h2>, else before the main <div class="cta-box">.
It also adds the PostHog affiliate click tracker (ho-aff-track) to posts that lack it.
Nothing else in the page changes.

Usage (repo root):  python3 -I scripts/add_partner_cards.py [--dry] [slug ...]
"""
from __future__ import annotations

import importlib.util
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("blog_publish", ROOT / "scripts/blog_publish.py")
bp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bp)

TRACKER = re.search(r"<script>/\* ho-aff-track \*/.*?</script>", bp.TEMPLATE.read_text(), re.S).group(0)


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry" in sys.argv
    cfg = json.loads(bp.AFFILIATES.read_text())
    picks = cfg["partners"]["diet_direct"]["post_picks"]
    slugs = args or list(picks)
    changed = 0
    for slug in slugs:
        path = bp.BLOG / f"{slug}.html"
        if not path.exists():
            print(f"skip {slug}: no blog/{slug}.html")
            continue
        html = path.read_text()
        print(slug)
        card = bp.diet_direct_html({"slug": slug}, cfg)
        if not card:
            print("  no picks")
            continue
        block = re.compile(r"[ \t]*" + re.escape(bp.DD_START) + r".*?" + re.escape(bp.DD_END) + r"\n?", re.S)
        if block.search(html):
            new = block.sub(lambda m: card, html, count=1)
        elif "<h2>The Bottom Line</h2>" in html:
            i = html.index("<h2>The Bottom Line</h2>")
            i = html.rfind("\n", 0, i) + 1
            new = html[:i] + card + "\n" + html[i:]
        else:
            m = re.search(r'^[ \t]*<div class="cta-box">', html, re.M)
            if not m:
                print("  !! no anchor, skipped")
                continue
            new = html[:m.start()] + card + "\n" + html[m.start():]
        if "ho-aff-track" not in new:
            new = new.replace("</body>", f"    {TRACKER}\n</body>", 1)
            print("  + click tracker")
        if new != html:
            changed += 1
            if not dry:
                path.write_text(new)
    print(f"{changed} file(s) {'would change' if dry else 'changed'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
