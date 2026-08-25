#!/usr/bin/env python3
"""Assembles static pages from _partials/ + pages/*.content.html into the site root."""
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
PARTIALS = os.path.join(ROOT, "_partials")
PAGES = os.path.join(ROOT, "pages")

with open(os.path.join(PARTIALS, "header.html"), encoding="utf-8") as f:
    HEADER = f.read()
with open(os.path.join(PARTIALS, "footer.html"), encoding="utf-8") as f:
    FOOTER = f.read()

SHELL = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="css/main.css">
<noscript><style>[data-reveal], [data-hero-anim] {{ opacity: 1 !important; transform: none !important; }}</style></noscript>
</head>
<body>
{header}
<div class="page">
{content}
{footer}
</div>
<script src="js/main.js" defer></script>
</body>
</html>
"""

# (output filename, title, description, content source file)
MANIFEST = [
    ("index.html", "Sasha Kendel — Product Designer", "I design the human side of AI. Sasha Kendel, product designer building the interface between AI agents and the people who rely on them.", "index.content.html"),
    ("sophie-ai.html", "Sophie AI — Sasha Kendel", "An autonomous agent that sees. Three surfaces, three very different users, one AI underneath. Run by ADT across millions of American homes.", "sophie-ai.content.html"),
    ("auto-classifier.html", "Auto-Classifier — Sasha Kendel", "Turning the support sessions a company already runs into the training data its AI needs.", "auto-classifier.content.html"),
    ("connectivity-guru.html", "Connectivity Guru — Sasha Kendel", "A customer scans their own home to find their WiFi dead zones. If they still need a person, the agent who picks up sees the same map.", "connectivity-guru.content.html"),
    ("techsee-live.html", "TechSee Live — Sasha Kendel", "TechSee Live already existed, built before Zoom and Google Meet set the patterns everyone now expects from a video call. I led the redesign that caught it up.", "techsee-live.content.html"),
    ("data-collection-app.html", "Data Collection App — Sasha Kendel", "Before this existed, nobody on the team could say what still needed capturing to build the visual model, or when there was already enough.", "data-collection-app.content.html"),
    ("about.html", "About — Sasha Kendel", "I picked AI in 2018, before it was the obvious thing to pick.", "about.content.html"),
]

for filename, title, description, source in MANIFEST:
    with open(os.path.join(PAGES, source), encoding="utf-8") as f:
        content = f.read()
    html = SHELL.format(title=title, description=description, header=HEADER, content=content, footer=FOOTER)
    out_path = os.path.join(ROOT, filename)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    print("wrote", filename)
