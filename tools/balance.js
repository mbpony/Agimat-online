#!/usr/bin/env node
/* AGIMAT ONLINE — skill balance & progression simulator.
 *   npm run balance
 *
 * Models the REAL formulas read out of game.js:
 *   atk(L)        = C.base.atk + C.growth.atk*(L-1)          (computeStats)
 *   points(L)     = max(0, L - firstPointAtLevel + 1)        (pointsEarned)
 *   rankUp(v,pr)  = v + pr*(rank-1)                          (execEffect)
 *   dmg           = atk * mult * U(0.85,1.15), crit x critDmg/100  (rollDamage)
 *   E[dmg]        = atk * mult * (1 + critCh/100*(critDmg/100 - 1))
 *   melee         = one mult applied to EVERY enemy in radius (AoE)
 *   proj          = `count` projectiles at `mult` each (single target sees one)
 *   dot [k,dps,pr,dur] = dps ticks for dur seconds
 *
 * Build policy: greedy rational player — repeatedly buys the rank that gives
 * the most single-target DPS per point, honouring level gates, `requires`,
 * pointCost and maxRank. The first core-branch skill is free at rank 1
 * (initForClass grants it without charging `spent`).
 *
 * WHAT THIS DOES *NOT* MODEL (deliberately — keeps classes comparable):
 *   gear, runes, enhancement, food/set buffs, talents, enemy DEF, boss status
 *   resistance, mark/shred amplification, party bonus, mobility, survivability.
 * It answers "are the 180 skills in the same weight class", not "is this fun".
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', rel), 'utf8'));

const SK = read('skills/definitions.json');
const CLS = read('classes/definitions.json').classes;
const CFG = SK.config;
const FIRST = CFG.firstPointAtLevel || 2;
const BASE_CRIT_CH = 10, BASE_CRIT_DMG = 150;


const atkAt = (cls, L) => CLS[cls].base.atk + CLS[cls].growth.atk * (L - 1);
const hpAt = (cls, L) => CLS[cls].base.hp + CLS[cls].growth.hp * (L - 1);
const pointsAt = (L) => Math.max(0, L - FIRST + 1);

const BYCLASS = {};
const DEFS = {};
for (const s of SK.skills) { DEFS[s.id] = s; (BYCLASS[s.classId] = BYCLASS[s.classId] || []).push(s); }

const rankUp = (v, pr, r) => (v || 0) + (pr || 0) * (r - 1);

/* ---- single-target DPS contribution of one skill at rank r ----
   Returns damage-per-second in ACTUAL damage (ATK-scaled where the engine does).
   Engine facts this mirrors:
     melee/proj  dmg = P.atk * mult * U(.85,1.15)              (rollDamage)
     zone dps    d   = max(1, P.atk * z.val * 0.5) per 500ms   -> atk*val per sec, AoE
     zone heal/slow = no damage
     summon      d   = max(1, s.dps * 0.5) per 500ms           -> s.dps per sec, FLAT
     enemy _skDot d  = max(1, dps * 0.5) per 500ms             -> dps per sec, FLAT
   Passives have cooldown 0 — handled by passiveMods(), not here. */
function skillDps(d, r, atk) {
  if (d.type === 'passive') return { single: 0, aoe: 0 };
  if (!d.cooldown) return { single: 0, aoe: 0 };   // defensive: never divide by 0
  const cd = d.cooldown;
  let hit = 0, hitAoe = 0;     // crit-eligible (rollDamage path)
  let flat = 0, flatAoe = 0;   // ticks: zone / summon / dot — never crit
  for (const e of d.effects || []) {
    switch (e.t) {
      case 'melee':
      case 'proj': {
        const m = rankUp(e.mult, e.pr, r);
        const n = e.t === 'proj' ? (e.count || 1) : 1;
        hit += atk * m;                  // a single target is struck once (proj spread)
        hitAoe += atk * m * n;           // a packed group is struck by every shot
        if (e.dot) {                     // flat dps for e.dot[3] seconds, no crit
          const t = rankUp(e.dot[1], e.dot[2], r) * (e.dot[3] || 0);
          flat += t; flatAoe += t * n;
        }
        break;
      }
      case 'zone': {
        if (e.kind !== 'dps') break;     // heal/slow zones deal no damage
        const v = rankUp(e.val, e.pr || 0, r);
        const dur = rankUp(e.dur, e.prDur || 0, r);
        const total = atk * v * dur;     // atk-scaled, every tick, every enemy inside
        flat += total; flatAoe += total; // a target standing in it; group scales with count
        break;
      }
      case 'summon': {
        const total = rankUp(e.dps, e.pr || 0, r) * (e.dur || 0);   // FLAT, not atk-scaled
        flat += total; flatAoe += total;
        break;
      }
      default: break;                    // dash/buff/shield/heal/taunt/cleanse = no damage
    }
  }
  // raw damage/sec; crit + atkPct applied once in buildDps() to avoid double-counting
  return { hit: hit / cd, hitAoe: hitAoe / cd, flat: flat / cd, flatAoe: flatAoe / cd };
}

/* ---- stat multipliers contributed by bought passives + buff uptime ----
   Stat names come from data/skills/definitions.json; atkPct and atkMult both
   scale P.atk in computeStats, so they are folded together. */
function passiveMods(tree, rank) {
  const m = { atkPct: 0, cdr: 0, critCh: 0, critDmg: 0, dotBoost: 0 };
  for (const d of tree) {
    const r = rank[d.id] || 0;
    if (!r) continue;
    for (const e of d.effects || []) {
      if (e.t !== 'pmod' && e.t !== 'buff') continue;
      const v = rankUp(e.val, e.pr, r);
      // passives apply 100% of the time; timed buffs ~50% uptime
      const f = d.type === 'passive' ? 1 : 0.5;
      if (e.stat === 'atkPct' || e.stat === 'atkMult') m.atkPct += v * f;
      else if (m[e.stat] !== undefined) m[e.stat] += v * f;
    }
  }
  return m;
}

/* ---- total single-target DPS of a whole rank assignment ---- */
function buildDps(cls, rank, L) {
  const tree = BYCLASS[cls];
  const atk = atkAt(cls, L);
  const mods = passiveMods(tree, rank);
  const cf = 1 + ((BASE_CRIT_CH + mods.critCh) / 100) *
    ((BASE_CRIT_DMG + mods.critDmg) / 100 - 1);
  const dotK = 1 + mods.dotBoost / 100;
  const actives = tree
    .filter((d) => d.type !== 'passive' && (rank[d.id] || 0) > 0)
    .map((d) => {
      const s = skillDps(d, rank[d.id], atk);
      return {
        d,
        single: s.hit * cf + s.flat * dotK,   // crit hits direct damage only
        aoe: s.hitAoe * cf + s.flatAoe * dotK,
      };
    })
    .sort((a, b) => b.single - a.single);
  const top = actives.slice(0, CFG.activeSlots || 3);      // only 3 equip slots
  const k = (1 + mods.atkPct / 100);
  return {
    single: top.reduce((a, x) => a + x.single, 0) * k,
    aoe: top.reduce((a, x) => a + x.aoe, 0) * k,
    top, mods, atk,
  };
}

/* ---- minimum points to legally reach rank R of a skill, incl. prereq chain ---- */
function minCost(id, wantRank, L, seen = new Set()) {
  const d = DEFS[id];
  if (!d) return Infinity;
  if (L < d.requiredLevel) return Infinity;          // level gate is absolute
  if (seen.has(id)) return Infinity;                 // cycle guard
  seen.add(id);
  let c = (d.pointCost || 1) * wantRank;
  for (const [rid, need] of Object.entries(d.requires || {})) {
    c += minCost(rid, need, L, new Set(seen));
  }
  return c;
}

/* ---- allocate points to maximise DPS among a FIXED target set ----
   Fixes the naive-greedy lookahead failure: prereqs are worth buying even when
   they are not themselves in the top 3. */
function allocate(cls, L, targets, obj) {
  const tree = BYCLASS[cls];
  const rank = {}, spent = {};
  const core = tree.find((d) => d.branch === 'core');
  const freeId = core ? core.id : null;
  if (freeId) { rank[freeId] = 1; spent[freeId] = 0; }   // initForClass grants free
  let pool = pointsAt(L);

  const unlockedFor = (d) => {
    const r = rank[d.id] || 0;
    if (r >= (d.maxRank || 1)) return false;
    if (L < d.requiredLevel) return false;
    for (const [rid, need] of Object.entries(d.requires || {})) if ((rank[rid] || 0) < need) return false;
    return pool >= (d.pointCost || 1);
  };

  // skills that matter: the chosen targets, their prereq chain, and passives
  const wanted = new Set(targets);
  const addChain = (id) => {
    const d = DEFS[id];
    if (!d) return;
    for (const rid of Object.keys(d.requires || {})) {
      if (!wanted.has(rid)) { wanted.add(rid); addChain(rid); }
    }
  };
  targets.forEach(addChain);
  for (const d of tree) if (d.type === 'passive') wanted.add(d.id);

  /* Pre-seed the prerequisite chain so the greedy can actually reach its targets.
     A pure marginal-gain greedy will never buy a zero-damage prereq (e.g. a buff
     skill) that unlocks a damage skill, so we buy required ranks up front the way
     a planning player does, then let the greedy optimise the rest. */
  const buyRank = (d) => {
    const cost = d.pointCost || 1;
    if (pool < cost) return false;
    if ((rank[d.id] || 0) >= (d.maxRank || 1)) return false;
    pool -= cost;
    spent[d.id] = (spent[d.id] || 0) + cost;
    rank[d.id] = (rank[d.id] || 0) + 1;
    return true;
  };
  const seed = (id, need) => {
    const d = DEFS[id];
    if (!d || L < d.requiredLevel) return;
    for (const [rid, rn] of Object.entries(d.requires || {})) seed(rid, rn);   // chain first
    while ((rank[id] || 0) < Math.min(need, d.maxRank || 1)) { if (!buyRank(d)) break; }
  };
  for (const tid of targets) seed(tid, DEFS[tid] ? (DEFS[tid].maxRank || 1) : 1);

  for (let guard = 0; guard <= pointsAt(L); guard++) {
    const cur = buildDps(cls, rank, L)[obj];
    let best = null, bestVal = cur;
    for (const d of tree) {
      if (!wanted.has(d.id)) continue;
      if (!unlockedFor(d)) continue;
      rank[d.id] = (rank[d.id] || 0) + 1;
      const v = buildDps(cls, rank, L)[obj];
      rank[d.id] -= 1;
      if (rank[d.id] === 0) delete rank[d.id];
      if (v > bestVal + 1e-9) { best = d; bestVal = v; }
    }
    if (!best) break;
    const cost = best.pointCost || 1;
    pool -= cost;
    spent[best.id] = (spent[best.id] || 0) + cost;
    rank[best.id] = (rank[best.id] || 0) + 1;
  }
  return { rank, spent, pool, tree };
}

/* ---- best build at level L: enumerate every 3-active combination ---- */
const buildCache = new Map();
function combatDps(cls, L, obj = 'single') {
  const key = cls + '@' + L + '@' + obj;
  if (buildCache.has(key)) return buildCache.get(key);
  const tree = BYCLASS[cls];
  const actives = tree.filter((d) => d.type !== 'passive' && d.requiredLevel <= L);
  let best = null;

  const consider = (targets) => {
    const b = allocate(cls, L, targets, obj);
    const r = buildDps(cls, b.rank, L);
    const score = r[obj];
    if (!best || score > best.score + 1e-9) best = { score, ...r, rank: b.rank, spent: b.spent, pool: b.pool };
  };

  const ids = actives.map((d) => d.id);
  const slots = CFG.activeSlots || 3;
  if (ids.length <= 8) {
    // few enough to enumerate every subset
    for (let mask = 0; mask < (1 << ids.length); mask++) {
      const t = ids.filter((_, i) => mask & (1 << i));
      if (t.length > slots) continue;
      consider(t);
    }
  } else {
    // enumerate every combination of exactly `slots`, plus smaller ones via pruning
    const comb = (start, acc) => {
      if (acc.length === slots) { consider(acc.slice()); return; }
      if (acc.length > 0) consider(acc.slice());
      for (let i = start; i < ids.length; i++) { acc.push(ids[i]); comb(i + 1, acc); acc.pop(); }
    };
    comb(0, []);
  }
  buildCache.set(key, best);
  return best;
}

/* ---- full build: keep spending after DPS plateaus ----
   A real player does not sit on 40 unspent points; they buy defensive and
   utility ranks once the damage side is done. This measures the true SINK
   capacity of the tree, which a DPS-only greedy cannot see. */
function fullBuildSpend(cls, L) {
  const b = combatDps(cls, L);
  const rank = { ...b.rank };
  let pool = pointsAt(L) - Object.values(b.spent).reduce((a, x) => a + x, 0);
  const tree = BYCLASS[cls];
  const buyable = (d) => {
    const r = rank[d.id] || 0;
    if (r >= (d.maxRank || 1)) return false;
    if (L < d.requiredLevel) return false;
    for (const [rid, need] of Object.entries(d.requires || {})) if ((rank[rid] || 0) < need) return false;
    return pool >= (d.pointCost || 1);
  };
  let bought = 0;
  for (let guard = 0; guard <= pointsAt(L); guard++) {
    // prefer the highest-level skill that still has ranks, so the sink is realistic
    const cand = tree.filter(buyable).sort((a, b2) => b2.requiredLevel - a.requiredLevel)[0];
    if (!cand) break;
    pool -= (cand.pointCost || 1);
    rank[cand.id] = (rank[cand.id] || 0) + 1;
    bought++;
  }
  return { spent: pointsAt(L) - pool, left: pool, ranks: Object.values(rank).reduce((a, x) => a + x, 0) };
}

/* ================= 1. PROGRESSION FEASIBILITY ================= */
console.log('AGIMAT ONLINE — skill balance & progression');
console.log('model: naked character, base crit 10%/150%, no gear/talents/food');
console.log('');

let fail = 0;
const LEVELS = [10, 20, 30, 40, 50, 60];
const classIds = Object.keys(CLS);

console.log('== 1. point economy at Lv60 (59 points earned) ==');
console.log('   "dps build"  = points the DPS-optimal 3-slot build uses');
console.log('   "full build" = points used once the player also buys defensive/utility ranks');
console.log('   class            ranks  dps build  full build  truly left  Lv60 ult cost  reachable');
const rows = [];
for (const cls of classIds) {
  const totalRanks = BYCLASS[cls].reduce((a, s) => a + (s.maxRank || 1), 0);
  const c = combatDps(cls, 60);
  const used = Object.values(c.spent).reduce((a, b) => a + b, 0);
  const full = fullBuildSpend(cls, 60);
  const ults = BYCLASS[cls].filter((s) => s.branch === 'ultimate')
    .sort((a, b) => a.requiredLevel - b.requiredLevel);
  const top = ults[ults.length - 1];
  // legal reachability, independent of what the DPS-optimal build picks
  const cost = minCost(top.id, 1, 60);
  const reach = cost <= pointsAt(60);
  const chosen = (c.rank[top.id] || 0) > 0;
  console.log('   ' + cls.padEnd(16) + String(totalRanks).padStart(5) +
    (String(used) + '/' + pointsAt(60)).padStart(11) +
    (String(full.spent) + '/' + pointsAt(60)).padStart(12) +
    String(full.left).padStart(12) + String(cost).padStart(13) +
    '   ' + (reach ? 'yes' : 'NO') + (chosen ? '' : '  (dps build skips it)'));
  if (!reach) fail++;
  rows.push({ cls, c, used, totalRanks, full });
}
console.log('   → every Lv60 ultimate must be legally reachable on 59 points: ' + (fail ? 'FAIL ' + fail : 'PASS'));
const avgLeft = Math.round(rows.reduce((a, r) => a + r.full.left, 0) / rows.length);
console.log('   → average points with nowhere to go: ' + avgLeft + ' of 59');
console.log('     (under ~10 means the tree absorbs a full build; over ~25 means progression stalls)');

/* the newly-gated ults: confirm the gate is satisfiable, not a dead end */
console.log('');
console.log('== 2. Lv60 ultimate gate satisfiability ==');
for (const cls of classIds) {
  const ults = BYCLASS[cls].filter((s) => s.branch === 'ultimate')
    .sort((a, b) => a.requiredLevel - b.requiredLevel);
  const top = ults[ults.length - 1];
  const deps = Object.entries(top.requires || {});
  if (!deps.length) { console.log('   ' + cls.padEnd(16) + ' ungated (level-only)'); continue; }
  const gateCost = deps.reduce((a, [rid, need]) => a + minCost(rid, need, 60), 0);
  const total = minCost(top.id, 1, 60);
  const met = gateCost < Infinity && total <= pointsAt(60);
  const detail = deps.map(([rid, need]) =>
    rid + ' R' + need + ' costs ' + (gateCost === Infinity ? '∞' : gateCost)).join('; ');
  console.log('   ' + cls.padEnd(16) + (met ? 'satisfiable  ' : 'IMPOSSIBLE  ') +
    detail + '   total chain ' + total + '/59');
  if (!met) fail++;
}

/* ================= 3. POWER CURVE + OUTLIERS ================= */
console.log('');
console.log('== 3. single-target DPS curve (greedy build, per second) ==');
console.log('   class          ' + LEVELS.map((l) => ('Lv' + l).padStart(9)).join(''));
const curves = {};
for (const cls of classIds) {
  curves[cls] = LEVELS.map((L) => combatDps(cls, L).single);
  console.log('   ' + cls.padEnd(14) + curves[cls].map((v) => v.toFixed(0).padStart(9)).join(''));
}

console.log('');
console.log('== 4. outliers vs class median (flag > ±25%) ==');
let outliers = 0;
for (let i = 0; i < LEVELS.length; i++) {
  const L = LEVELS[i];
  const vals = classIds.map((c) => curves[c][i]).sort((a, b) => a - b);
  const med = vals[Math.floor(vals.length / 2)];
  const bad = classIds.filter((c) => Math.abs(curves[c][i] - med) / med > 0.25);
  if (bad.length) {
    outliers++;
    for (const c of bad) {
      const pct = ((curves[c][i] - med) / med * 100).toFixed(0);
      console.log('   Lv' + String(L).padEnd(3) + c.padEnd(16) + (pct > 0 ? '+' : '') + pct + '% vs median ' + med.toFixed(0));
    }
  }
}
if (!outliers) console.log('   none — all 9 classes within ±25% of the median at every checkpoint');

/* ================= 5. AoE spread ================= */
console.log('');
console.log('== 5. AoE DPS at Lv60 (packed group, top-3 equipped) ==');
const aoeRows = classIds.map((cls) => {
  const b = combatDps(cls, 60, 'aoe');           // build optimised FOR AoE, not reused
  const picked = b.top.map((x) => x.d.id + ' R' + (b.rank[x.d.id] || 0));
  return { cls, v: b.aoe, picked };
}).sort((a, b) => b.v - a.v);
const aoeMed = aoeRows.slice().sort((a, b) => a.v - b.v)[Math.floor(aoeRows.length / 2)].v;
for (const r of aoeRows) {
  const pct = ((r.v - aoeMed) / aoeMed * 100).toFixed(0);
  const bar = '#'.repeat(Math.max(1, Math.round(r.v / aoeRows[0].v * 24)));
  console.log('   ' + r.cls.padEnd(16) + r.v.toFixed(0).padStart(7) + '  ' + (pct > 0 ? '+' : '') + pct + '%  ' + bar);
  console.log('       build: ' + r.picked.join(', '));
}

/* ================= 6. per-skill sanity ================= */
console.log('');
console.log('== 6. zero-damage actives (actives that deal no damage at all) ==');
let zero = 0;
for (const s of SK.skills) {
  if (s.type === 'passive') continue;
  const v = skillDps(s, s.maxRank || 1, 100);
  const total = v.hit + v.flat;                    // never trust a missing property
  if (!(total > 0)) {
    const kinds = (s.effects || []).map((e) => e.t).join('+');
    console.log('   ' + s.id.padEnd(16) + s.classId.padEnd(14) + 'cd=' + String(s.cooldown).padEnd(4) +
      '[' + kinds + ']  utility/support — expected for shields/taunts/dashes');
    zero++;
  }
}
if (!zero) console.log('   none — every active/ultimate contributes damage');

/* ---- optional deep-dive: node tools/balance.js --show <class> ---- */
if (process.argv.includes('--show')) {
  const cls = process.argv[process.argv.indexOf('--show') + 1];
  if (!BYCLASS[cls]) { console.log('unknown class: ' + cls); process.exit(1); }
  console.log('');
  console.log('== build detail: ' + cls + ' ==');
  for (const L of LEVELS) {
    const b = combatDps(cls, L);
    const used = Object.values(b.spent).reduce((a, x) => a + x, 0);
    const picks = b.top.map((x) => x.d.id + ' R' + (b.rank[x.d.id] || 0) + '=' + x.single.toFixed(1));
    const passives = Object.entries(b.rank)
      .filter(([id, r]) => DEFS[id].type === 'passive' && r > 0)
      .map(([id, r]) => id + ' R' + r);
    console.log('   Lv' + String(L).padEnd(3) + 'pts=' + String(pointsAt(L)).padEnd(3) +
      'spent=' + String(used).padEnd(3) + 'dps=' + b.single.toFixed(1).padStart(7) +
      '  atkPct=' + b.mods.atkPct.toFixed(0) + '%');
    console.log('        equipped: ' + picks.join(', '));
    console.log('        passives: ' + (passives.join(', ') || '(none)'));
  }
}

console.log('');
console.log('  blocking failures: ' + fail);
process.exit(fail ? 1 : 0);
