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
# A minified copy of the stylesheet for the site to load (you keep editing css/style.css as normal).
def minify_css(src):
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        if c in '"\'':                      # strings stay exactly as written
            j = i + 1
            while j < n and src[j] != c:
                j += 2 if src[j] == '\\' else 1
            out.append(src[i:j + 1]); i = j + 1
        elif src.startswith('/*', i):        # comments go
            i = src.find('*/', i + 2) + 2
        elif c.isspace():                    # runs of whitespace become one space (or nothing, next to punctuation)
            j = i
            while j < n and src[j].isspace(): j += 1
            prev = out[-1][-1:] if out else ''
            nxt = src[j:j + 1]
            if prev and prev not in '{};:,>' and nxt not in '{};,>' and not src.startswith('/*', j): out.append(' ')
            i = j
        else:
            out.append(c); i += 1
    return ''.join(out).replace(';}', '}')
(root / 'css' / 'style.min.css').write_text(minify_css((root / 'css' / 'style.css').read_text()))
html = (root / 'index.html').read_text()
html = re.sub(r'href="css/style(\.min)?\.css(\?v=\w+)?"', f'href="css/style.min.css?v={v}"', html)
html = re.sub(r'src="js/main\.js(\?v=\w+)?"', f'src="js/main.js?v={v}"', html)
block = '<script type="importmap">' + json.dumps({"imports": imports}, separators=(',', ':')) + '</script>'
if '<script type="importmap">' in html:
    html = re.sub(r'<script type="importmap">.*?</script>', block, html, flags=re.S)
else:
    html = html.replace('  <link rel="stylesheet" href="css/style.css', '  ' + block + '\n  <link rel="stylesheet" href="css/style.css', 1)
# Preload every module main.js needs at start-up, so a phone fetches them all at once instead of level by level.
def deps(name, seen):
    if name in seen: return
    seen.add(name)
    for d in re.findall(r"^import [^;]*?from '\./([\w.-]+\.js)'", (root / 'js' / name).read_text(), flags=re.M):
        deps(d, seen)
graph = set(); deps('main.js', graph); graph.discard('main.js')
pre = '<!-- modulepreload -->' + ''.join(f'\n  <link rel="modulepreload" href="js/{n}?v={v}" />' for n in sorted(graph)) + '\n  <!-- /modulepreload -->'
if '<!-- modulepreload -->' in html:
    html = re.sub(r'<!-- modulepreload -->.*?<!-- /modulepreload -->', lambda m: pre, html, flags=re.S)
else:
    html = html.replace('  <script type="module" src="js/main.js', '  ' + pre + '\n  <script type="module" src="js/main.js', 1)
(root / 'index.html').write_text(html)
print('stamped version', v, 'for', len(files), 'files')