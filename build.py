#!/usr/bin/env python3
"""Bundle an HTML page and its local CSS/JS into one self-contained file.

Usage: python3 build.py index.html dist/pitch-legends.html
"""
import pathlib
import re
import sys

src = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2])
root = src.parent
html = src.read_text(encoding="utf-8")


def css(m):
    return "<style>\n" + (root / m.group(1)).read_text(encoding="utf-8") + "\n</style>"


def js(m):
    code = (root / m.group(1)).read_text(encoding="utf-8").replace("</script", "<\\/script")
    return "<script>\n" + code + "\n</script>"


html = re.sub(r'<link rel="stylesheet" href="((?!https?:)[^"]+)">', css, html)
html = re.sub(r'<script src="((?!https?:)[^"]+)"></script>', js, html)
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html, encoding="utf-8")
print(f"wrote {out} ({len(html) // 1024} KB)")
