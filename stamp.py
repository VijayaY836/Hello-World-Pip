#!/usr/bin/env python3
"""Stamp every CSS/JS file with a version so browsers never mix an old cached file with a new page.
Run this before each deploy:  python3 stamp.py   (it rewrites the version in index.html)."""
import hashlib, json, os, re, pathlib
root = pathlib.Path(__file__).parent
h = hashlib.sha1()
files = sorted([p for p in (root / 'js').rglob('*.js')] + [root / 'css' / 'style.css'])
for p in files: h.update(p.read_bytes())
v = h.hexdigest()[:8]
imports = {f"./{p.relative_to(root).as_posix()}": f"./{p.relative_to(root).as_posix()}?v={v}" for p in files if p.suffix == '.js'}
html = (root / 'index.html').read_text()
html = re.sub(r'href="css/style\.css(\?v=\w+)?"', f'href="css/style.css?v={v}"', html)
html = re.sub(r'src="js/main\.js(\?v=\w+)?"', f'src="js/main.js?v={v}"', html)
block = '<script type="importmap">' + json.dumps({"imports": imports}, separators=(',', ':')) + '</script>'
if '<script type="importmap">' in html:
    html = re.sub(r'<script type="importmap">.*?</script>', block, html, flags=re.S)
else:
    html = html.replace('  <link rel="stylesheet" href="css/style.css', '  ' + block + '\n  <link rel="stylesheet" href="css/style.css', 1)
(root / 'index.html').write_text(html)
print('stamped version', v, 'for', len(files), 'files')