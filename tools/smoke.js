#!/usr/bin/env node
/* AGIMAT ONLINE — server smoke / regression harness.
 *
 * Boots nothing: it targets an ALREADY-RUNNING server.
 *   npm start            (in another shell)
 *   npm run smoke        (or: node tools/smoke.js [baseURL])
 *
 * Covers the API contract + Phase-7 gold authority + session security.
 * Creates one throwaway account named smokeNNNNNNNNN and does NOT delete it —
 * run `npm run smoke:purge` afterwards, or point at a scratch server.
 *
 * Exit code 0 = all pass, 1 = any fail (CI-friendly).
 */
const BASE = process.argv[2] || process.env.AGIMAT_URL || 'http://127.0.0.1:8000';

let pass_ = 0, fail = 0;
const t = (name, ok, extra = '') => {
  if (ok) { pass_++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  <- ' + extra : '')); }
};

const post = async (path, body) => {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let d = {};
  try { d = await r.json(); } catch (e) { /* non-JSON body */ }
  return { s: r.status, d };
};

const mkSave = (gold) => JSON.stringify({
  name: 'Subok', classId: 'mangkukulam', level: 42, xp: 12000, gold,
  bag: [], gear: {}, skills: { learned: [], spent: 0, equipped: [], ver: 1 },
  hp: 100, mp: 50,
});

(async () => {
  const user = 'smoke' + Date.now().toString().slice(-9);
  const pass = 'pw12345';
  let tok = null;

  console.log('AGIMAT ONLINE smoke test → ' + BASE);
  console.log('  test account: ' + user + '\n');

  /* ---------- input validation ---------- */
  let r = await post('/api/register', { user: 'ab', pass });
  t('register rejects 2-char username (400)', r.s === 400, 'HTTP ' + r.s);

  r = await post('/api/register', { user, pass: 'x' });
  t('register rejects short password (400)', r.s === 400, 'HTTP ' + r.s);

  /* ---------- auth ---------- */
  r = await post('/api/register', { user, pass });
  t('register succeeds', r.s === 200 && r.d.ok === true, JSON.stringify(r.d).slice(0, 120));
  tok = r.d.token;
  t('register issues session token', typeof tok === 'string' && tok.length >= 32, 'len=' + (tok || '').length);
  t('register returns player color', typeof r.d.color === 'string', String(r.d.color));

  r = await post('/api/register', { user, pass });
  t('duplicate username rejected (409)', r.s === 409, 'HTTP ' + r.s);

  r = await post('/api/login', { user, pass: 'wrong' });
  t('wrong password rejected (401)', r.s === 401, 'HTTP ' + r.s);

  r = await post('/api/login', { user, pass });
  t('login succeeds + rotates token', r.s === 200 && r.d.token && r.d.token !== tok, 'HTTP ' + r.s);
  tok = r.d.token;

  /* ---------- save / load round-trip ---------- */
  r = await post('/api/save', { token: tok, save: mkSave(5000) });
  t('save accepted', r.s === 200 && r.d.ok === true && !r.d.clamped, JSON.stringify(r.d).slice(0, 120));

  r = await post('/api/load', { token: tok });
  let got = null;
  try { got = JSON.parse(r.d.save); } catch (e) { /* no save */ }
  t('load returns saved blob', r.s === 200 && r.d.ok === true && !!got, 'HTTP ' + r.s);
  t('  level round-trips', got && got.level === 42, 'got ' + (got && got.level));
  t('  classId round-trips', got && got.classId === 'mangkukulam', 'got ' + (got && got.classId));
  t('  gold round-trips', got && got.gold === 5000, 'got ' + (got && got.gold));

  /* ---------- Phase-7 gold authority ---------- */
  r = await post('/api/save', { token: tok, save: mkSave(99999999) });
  t('smuggled 99,999,999 gold is clamped', r.d.clamped === true && r.d.gold < 99999999,
    JSON.stringify(r.d).slice(0, 140));
  r = await post('/api/load', { token: tok });
  try { got = JSON.parse(r.d.save); } catch (e) { /* ignore */ }
  t('  clamped value persisted, not 99.9M', got && got.gold < 99999999, 'stored ' + (got && got.gold));

  const bad = JSON.stringify({ name: 'X', classId: 'babaylan', level: 1, gold: NaN, bag: [] });
  await post('/api/save', { token: tok, save: bad });
  r = await post('/api/load', { token: tok });
  try { got = JSON.parse(r.d.save); } catch (e) { /* ignore */ }
  t('NaN gold sanitized to a finite number', got && typeof got.gold === 'number' && isFinite(got.gold),
    'stored ' + (got && got.gold));

  /* ---------- session security ---------- */
  r = await post('/api/save', { token: 'deadbeef'.repeat(6), save: mkSave(1) });
  t('forged token rejected (401)', r.s === 401, 'HTTP ' + r.s);
  r = await post('/api/load', { token: tok });
  t('real token still valid after forgery attempt', r.s === 200 && r.d.ok === true, 'HTTP ' + r.s);

  /* ---------- static surface + data integrity ---------- */
  const assets = ['/', '/game.js', '/style.css', '/three.module.min.js',
    '/data/classes/definitions.json', '/data/skills/definitions.json',
    '/data/models/registry.json', '/data/maps/main.json', '/data/bosses/world-bosses.json'];
  for (const p of assets) {
    const resp = await fetch(BASE + p);
    t('static 200: ' + p, resp.status === 200, 'HTTP ' + resp.status);
  }

  /* private stores must stay private (Phase-1 security fix) */
  for (const p of ['/data/users.json', '/data/guilds.json', '/data/market.json', '/.git/config']) {
    const resp = await fetch(BASE + p);
    t('private 403: ' + p, resp.status === 403, 'HTTP ' + resp.status);
  }

  /* skill definitions must be the full 180 (20/class × 9) */
  const sk = await (await fetch(BASE + '/data/skills/definitions.json')).json();
  const defs = sk.skills || sk.definitions || sk;
  const n = Array.isArray(defs) ? defs.length : Object.keys(defs).length;
  t('skill definitions = 180', n === 180, 'found ' + n);

  console.log('\n  RESULT  pass=' + pass_ + '  fail=' + fail);
  if (fail) console.log('  ^ fix these before deploying');
  console.log('  TEST_ACCOUNT=' + user + '  (purge with: npm run smoke:purge)');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('smoke test crashed:', e); process.exit(1); });
