import { next } from '@vercel/functions';

// Gates every page behind a password, checked server-side at the edge so the
// password (and the real page markup) is never shipped to an unauthenticated
// visitor. See CLAUDE.md "Password gate" section for setup / rotation steps.

export const config = {
  matcher: ['/((?!css/|js/|images/|favicon\\.ico).*)'],
};

const COOKIE_NAME = 'sk_auth';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

function gatePage({ showError = false } = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sasha Kendel — Product Designer</title>
<link rel="icon" href="/images/favicon/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon/favicon-32x32.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="/css/main.css">
<style>
  html, body { height: 100%; }
  body {
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 24px;
    box-sizing: border-box;
    background: var(--surface);
    overflow: hidden;
    position: relative;
  }
  .gate-backdrop {
    position: fixed;
    inset: 0;
    background-image: url(/images/gate-backdrop.jpg);
    background-size: cover;
    background-position: center top;
    transform: scale(1.03);
  }
  .gate-scrim {
    position: fixed;
    inset: 0;
    background: rgba(10, 10, 10, 0.38);
  }

  .lock-card {
    position: relative;
    width: 100%;
    max-width: 380px;
    background: var(--surface);
    border: 1px solid var(--border-soft);
    border-radius: 18px;
    box-shadow: var(--shadow-dropdown);
    padding: 36px 32px 28px;
    text-align: center;
  }
  .lock-card.is-shaking { animation: lock-shake 420ms var(--ease); }
  @keyframes lock-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(7px); }
    60% { transform: translateX(-5px); }
    80% { transform: translateX(3px); }
  }

  .lock-mark {
    width: 44px;
    height: 44px;
    margin: 0 auto 20px;
    border-radius: 12px;
    background: var(--ink-base);
    color: #fff;
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 16px;
    letter-spacing: -0.01em;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lock-title {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 22px;
    letter-spacing: var(--tracking-h2);
    color: var(--ink);
    margin: 0 0 10px;
  }

  .lock-subtitle {
    font-family: var(--font-body);
    font-size: 13.5px;
    line-height: 1.5;
    color: var(--ink-muted);
    margin: 0 0 24px;
  }
  .lock-subtitle a {
    color: var(--ink-muted);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .lock-subtitle a:hover { color: var(--ink); }

  .lock-field { margin-bottom: 8px; }
  .lock-field input {
    width: 100%;
    box-sizing: border-box;
    font-family: var(--font-body);
    font-size: 15px;
    color: var(--ink-body-strong);
    padding: 12px 14px;
    border: 1px solid ${showError ? '#d0342c' : 'var(--border)'};
    border-radius: 9px;
    outline: none;
    background: var(--surface);
  }
  .lock-field input:focus { border-color: var(--ink-base); }

  .lock-error {
    min-height: 18px;
    text-align: left;
    font-family: var(--font-body);
    font-size: 12.5px;
    color: #d0342c;
    margin: 4px 0 14px;
    visibility: ${showError ? 'visible' : 'hidden'};
  }

  .lock-submit {
    width: 100%;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 15px;
    color: #fff;
    background: var(--ink-base);
    border: none;
    border-radius: 9px;
    padding: 13px 16px;
    cursor: pointer;
    margin-top: 6px;
  }
  .lock-submit:hover { background: var(--accent); }
</style>
</head>
<body>
<div class="gate-backdrop" aria-hidden="true"></div>
<div class="gate-scrim" aria-hidden="true"></div>
<form class="lock-card${showError ? ' is-shaking' : ''}" method="POST" novalidate>
  <div class="lock-mark" aria-hidden="true">SK</div>
  <h1 class="lock-title">Enter a password to see more</h1>
  <p class="lock-subtitle">
    This page is restricted under an NDA. Contact me at
    <a href="mailto:alexandra.yelagina@gmail.com">alexandra.yelagina@gmail.com</a>
    or +973 543 029 635 to request access.
  </p>

  <div class="lock-field">
    <input id="lockPassword" name="password" type="password" autocomplete="current-password" placeholder="Password" autofocus aria-label="Password">
  </div>
  <p class="lock-error">That password isn&rsquo;t right — try again.</p>

  <button type="submit" class="lock-submit">Log in</button>
</form>
</body>
</html>`;
}

export default async function middleware(request) {
  const expectedHash = process.env.SITE_PASSWORD_HASH;

  if (!expectedHash) {
    return new Response(
      'Site temporarily unavailable — missing configuration. Contact alexandra.yelagina@gmail.com.',
      { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    );
  }

  if (request.method === 'POST') {
    const form = await request.formData();
    const password = (form.get('password') || '').toString();
    const hash = await sha256Hex(password);

    if (hash === expectedHash) {
      const url = new URL(request.url);
      const res = new Response(null, { status: 303, headers: { Location: url.pathname } });
      res.headers.append(
        'Set-Cookie',
        `${COOKIE_NAME}=${hash}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`,
      );
      return res;
    }

    return new Response(gatePage({ showError: true }), {
      status: 401,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  if (readCookie(request, COOKIE_NAME) === expectedHash) {
    return next();
  }

  return new Response(gatePage(), {
    status: 401,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
