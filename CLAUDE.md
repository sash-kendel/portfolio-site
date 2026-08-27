# Claude project memory

Persistent context for Sasha Kendel's portfolio site — static product-design portfolio, live at **[sashkendel.website](https://sashkendel.website)**. Update this file whenever something changes that a future session would need to know (new deployment steps, new gotchas, content gaps filled, structural changes) — don't let it go stale.

## Stack

Plain static HTML/CSS/JS — no framework, no npm/Node in this environment. Pages are assembled by a Python build script from shared partials + per-page content fragments.

**Do not edit the root-level `.html` files directly** — they are generated output and get overwritten. Edit the source files instead:

- `pages/*.content.html` — the actual page content (one per page)
- `_partials/header.html`, `_partials/footer.html` — shared header/footer, injected into every page
- `css/*.css` — `tokens.css` (design tokens), `base.css`, `header.css`, `home.css`, `diagram.css`, `about.css`, `case.css`, `main.css` (aggregator that `@import`s the rest)
- `js/main.js` — load bar, nav dropdowns, scroll-reveal (IntersectionObserver), work-card hover, slideshows
- `build.py` — assembles everything into the root `.html` files (title/description per page live in its `MANIFEST` list, plus the shared `<head>`/favicon/font-loading markup)

**After any edit, rebuild:**
```bash
python3 build.py
```

## Pages (7)

`index` (home), `about`, `sophie-ai`, `auto-classifier`, `connectivity-guru`, `techsee-live`, `data-collection-app` — case studies/projects, each following the same pattern: hero → facts strip → numbered sections → more-cases links.

## Local preview

```bash
python3 -m http.server 4321
```
Then open `localhost:4321`. **Caveat:** the browser aggressively caches CSS/JS from this dev server (no cache headers set). If a change doesn't show up after rebuilding, hard-refresh (Cmd+Shift+R) or bump to a fresh port — don't assume the code is wrong before ruling out cache.

## Deployment

- **GitHub:** [github.com/sash-kendel/portfolio-site](https://github.com/sash-kendel/portfolio-site) — public, `main` branch
- **Vercel:** project `sash22/portfolio-site`, connected via the Vercel GitHub App (installation scoped to just this one repo, not the whole account)
- **Domain:** `sashkendel.website`, bought through Vercel, DNS auto-managed
- **Auto-deploy:** any push to `main` redeploys production automatically — no manual Vercel step needed after `git push`

### Pushing to GitHub — SSH deploy key (as of 2026-08-25)

This machine now has a dedicated SSH keypair for pushing, so a fresh PAT is no longer needed:

- Key: `~/.ssh/id_ed25519_portfolio` (private, stays on this machine) / `~/.ssh/id_ed25519_portfolio.pub`
- Registered on GitHub under sash-kendel's account as an **Authentication key** named `portfolio-site-deploy`
- `~/.ssh/config` has a `Host github.com` block pointing at that key (`IdentitiesOnly yes`)
- Remote is set to SSH: `git@github.com:sash-kendel/portfolio-site.git` (not HTTPS)
- Verify auth any time with `ssh -T git@github.com` — a successful "Hi sash-kendel!" (exit 1, no shell access) means it's working
- Push normally with `git push origin main` — no token, no `GIT_ASKPASS` dance needed

If this stops working (key removed from GitHub, new machine, etc.), fall back to a fresh GitHub fine-grained personal access token:

1. github.com → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token
2. Resource owner: `sash-kendel`. Repository access: **Only select repositories** → `portfolio-site`
3. Permissions → Add permissions → **Contents: Read and write** (Metadata read-only is auto-required)
4. Generate → copy the token
5. **Don't pass the token as a literal in a Bash command** — a safety classifier blocks visible secrets in shell args. Use a `GIT_ASKPASS` script instead:
   ```bash
   printf '%s' "$TOKEN" > /tmp/gh_token.txt && chmod 600 /tmp/gh_token.txt
   printf '#!/bin/sh\ncat /tmp/gh_token.txt\n' > /tmp/askpass.sh && chmod +x /tmp/askpass.sh
   GIT_ASKPASS=/tmp/askpass.sh git push origin main
   rm /tmp/gh_token.txt /tmp/askpass.sh
   ```

Push with a large `git config http.postBuffer 524288000` if it fails with `HTTP 400` — the image-heavy repo (~65MB) can exceed the default buffer.

Old fine-grained tokens (`portfolio-site-push`, `portfolio-site-push-2`) are sitting unused in account settings, each expiring ~Sep 2026, scoped only to this repo — harmless to leave, fine to revoke.

Vercel/GitHub OAuth "Connect" buttons inside Vercel's own UI **silently fail** when clicked via browser automation (popup gets blocked, no error surfaces). The reliable path is to install the Vercel GitHub App directly from GitHub's side: `github.com/apps/vercel/installations/new` → scope to the one repo → Install. That's a normal full-page GitHub flow, not a popup.

## Password gate

The entire site sits behind a password screen, enforced server-side by `middleware.js` (Vercel Edge Middleware, framework-agnostic — see `package.json`'s `@vercel/functions` dependency). This is a deliberate change from an earlier client-side-only mockup (`lock-preview.html`, since removed): a client-side check ships the password in plain JS, which doesn't actually protect anything.

**How it works:**
- `middleware.js` matches every route except `css/`, `js/`, `images/`, and `favicon.ico` (`config.matcher`), so the gate's own page can load the site's real stylesheet/fonts/logos while everything else stays blocked pre-auth.
- The correct password's SHA-256 hex hash lives in the `SITE_PASSWORD_HASH` environment variable (Vercel Project Settings → Environment Variables) — the plaintext password is never stored anywhere in the repo or in Vercel.
- On a correct password, the middleware sets an `HttpOnly`, `Secure`, `SameSite=Lax` cookie (`sk_auth`) whose value **is** that same hash, valid 30 days. A GET request passes through once `sk_auth` matches `SITE_PASSWORD_HASH`.
- If `SITE_PASSWORD_HASH` isn't set, the middleware fails closed (plain-text 500) rather than silently serving the site unprotected.
- Because the real page HTML is never sent to an unauthenticated visitor, the gate can't show a blurred preview of the actual homepage (that only worked in the old client-side mockup, which already had the real DOM loaded). Instead it shows the site's decorative pink/purple `--bloom-gradient` blob as a branded backdrop.

**To change the password:** compute the new SHA-256 hex hash and update `SITE_PASSWORD_HASH` in Vercel (no code change needed):
```bash
node -e "console.log(require('crypto').createHash('sha256').update('NEW_PASSWORD_HERE').digest('hex'))"
```

**Local testing caveat:** `python3 -m http.server` (the usual local preview) does **not** run Edge Middleware — it only serves static files, so the gate won't appear locally. Middleware only runs once deployed to Vercel (production or a preview deployment).

## Design source

Original Figma handoff lives outside this repo, at `~/Documents/Claude folder/design_handoff_portfolio_site/` — `.dc.html` prototypes (inline-style reference), `README.md` / `DESIGN_SYSTEM.md`, `tokens.css`, and `uploads/`. The instruction from that handoff was explicit: don't port the inline-style pattern — everything was rebuilt into the class-based token system under `css/`.

## Design review — fixed vs. skipped

A design-critique pass found several issues; fixes already applied:
- Mobile nav dropdown had a translucent glass background that let page content bleed through — now solid (`--surface`)
- Nav touch targets were 20px tall — now 40px via invisible padding (visual size unchanged)
- Work cards had no keyboard-focus equivalent to their hover state — added `:focus-visible` rules mirroring `.is-hot`
- About page's "Off the clock" rail label wrapped to 2 lines while its siblings didn't — widened `--rail-col` slightly
- Site depended entirely on JS for content visibility (`[data-reveal]` defaults to `opacity:0`) — added a `<noscript>` fallback in `build.py`'s shell template
- Isometric icons (About) and the technician-app phone mockup (Connectivity Guru) are transparent PNGs that were getting an unwanted gray box behind them — added `.figure--transparent` modifier / removed background from `.tech-row__figure img`
- `.band` (the tinted strips: partnered-with, facts-strip, about-strip, more-cases, references) went full-bleed to 100vw with a calc()'d padding trick to keep inner content aligned to 1440px — on ultrawide viewports the tint stretched past the content column. Simplified to `width:100%` inside `.page` (already 1440px max-width, centered), so the band's background now matches content width
- Facts-strip (`.facts-strip`) used CSS grid `auto-fit`, which let 5 facts fill one row edge-to-edge — switched to flexbox with `flex-basis: 33.333%` so it's always 3 facts per row, 2 wrapping below
- Sophie AI's "Customer" feature row had a CSS specificity bug: `.feature-row__figure-frame img` (class+element, 0-1-1) unintentionally beat `.feature-row__inset`'s own width/height (class only, 0-1-0), so the `capture-guide.gif` overlay rendered at 100% frame width instead of its intended 12%×20.8% box over phone 1's illustration — fixed by scoping the inset rule to `.feature-row__figure-frame img.feature-row__inset` (0-2-1)
- Favicon replaced: was a plain black "SK" wordmark on white, now white "SK" on a dark rounded-square (`--ink-base`), matching a reference the user supplied

**Explicitly left alone per user instruction** (don't "fix" these without being asked again):
- Low-contrast text on `ink-meta`/`ink-faint` tokens (back-links, source-links) — fails WCAG AA for small text, but this is inherited from the original design system's own token values
- Section "eyebrows" (Selected work, Also worked on, etc.) are `<span>`, not real headings — hurts screen-reader heading navigation

## Favicon

SK monogram in **Archivo Black** — the same display typeface the site already uses — white on a dark rounded-square background (`--ink-base` #0a0a0a), rendered via a one-off PIL script, not stored in the repo. Recreated from a user-supplied reference image rather than pixel-copied. Full set lives in `images/favicon/`: `favicon.ico` (multi-res), 16/32/48/192/512px PNGs, `apple-touch-icon.png`. Linked from every page via `build.py`'s shared `<head>` block.
