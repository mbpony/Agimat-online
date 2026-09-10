#!/usr/bin/env node
/* AGIMAT ONLINE — data integrity validator.
 *   npm run check:data
 *
 * Verifies the JSON layer that game.js boots from. Fails loudly on:
 *   - any data JSON that won't parse
 *   - skill graph that the generic executor can't resolve
 *   - model registry pointing at files that aren't on disk
 *   - class IDs that disagree between classes and skills
 *
 * Exit code 0 = clean, 1 = problems found.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');

let pass_ = 0, fail = 0;
const errs = [];
const ok = (name) => { pass_++; console.log('  PASS  ' + name); };
const bad = (name, why) => { fail++; errs.push(name + ': ' + why); console.log('  FAIL  ' + name + '  <- ' + why); };
const check = (cond, name, why = '') => (cond ? ok(name) : bad(name, why));

const read = (rel) => JSON.parse(fs.readFileSync(path.join(DATA, rel), 'utf8'));

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.json')) out.push(p);
  }
  return out;
}

/* ---------------- 1. every data JSON parses ---------------- */
console.log('AGIMAT ONLINE data validation');
console.log('');
const files = walk(DATA);
let parsed = 0;
for (const f of files) {
  try { JSON.parse(fs.readFileSync(f, 'utf8')); parsed++; }
  catch (e) { bad('parse ' + path.relative(ROOT, f), e.message); }
}
check(parsed === files.length, 'all data JSON parses (' + parsed + '/' + files.length + ')',
  'see failures above');

/* ---------------- 2. classes ---------------- */
const cls = read('classes/definitions.json');
const classList = cls.classes;
const classIds = Object.keys(classList);
check(classIds.length === 9, 'exactly 9 classes', 'found ' + classIds.length);

for (const id of classIds) {
  const c = classList[id];
  for (const f of ['name', 'role', 'base', 'growth']) {
    if (c[f] === undefined) bad('class ' + id + ' has ' + f, 'missing field');
  }
}
check(classIds.every((id) => classList[id].base && typeof classList[id].base.hp === 'number'),
  'every class has numeric base.hp', '');

/* ---------------- 3. skills ---------------- */
const sk = read('skills/definitions.json');
const skills = sk.skills;
check(skills.length === 180, 'skill definitions = 180 (20/class x 9)', 'found ' + skills.length);

const REQUIRED = ['id', 'classId', 'name', 'icon', 'type', 'branch',
  'requiredLevel', 'cooldown', 'maxRank', 'pointCost', 'description', 'effects'];
const ids = new Set();
const byClass = {};
let fieldErr = 0, idErr = 0, classErr = 0, levelErr = 0, effErr = 0;

for (const s of skills) {
  for (const f of REQUIRED) if (s[f] === undefined) fieldErr++;
  if (ids.has(s.id)) idErr++;
  ids.add(s.id);
  if (!classIds.includes(s.classId)) classErr++;
  if (typeof s.requiredLevel !== 'number' || s.requiredLevel < 1 || s.requiredLevel > 70) levelErr++;
  if (!Array.isArray(s.effects) || s.effects.length === 0) effErr++;
  (byClass[s.classId] = byClass[s.classId] || []).push(s);
}
check(fieldErr === 0, 'every skill has all required fields', fieldErr + ' missing');
check(idErr === 0, 'skill IDs are unique', idErr + ' duplicates');
check(classErr === 0, 'every skill.classId is a real class', classErr + ' orphans');
check(levelErr === 0, 'every requiredLevel is 1..70', levelErr + ' out of range');
check(effErr === 0, 'every skill has a non-empty effects[]', effErr + ' empty');

for (const id of classIds) {
  const list = byClass[id] || [];
  if (list.length !== 20) bad('class ' + id + ' has 20 skills', 'found ' + list.length);
  else ok('class ' + id + ' has 20 skills');
}

/* requires is an object map { skillId: minRank } */
const depsOf = (s) => (s.requires ? Object.keys(s.requires) : []);
let reqErr = [];
for (const s of skills) {
  for (const d of depsOf(s)) {
    const dep = skills.find((x) => x.id === d);
    if (!dep) reqErr.push(s.id + ' -> missing "' + d + '"');
    else if (dep.classId !== s.classId) reqErr.push(s.id + ' -> "' + d + '" is in another class');
    else if (dep.requiredLevel > s.requiredLevel) {
      reqErr.push(s.id + ' (Lv' + s.requiredLevel + ') requires ' + d + ' (Lv' + dep.requiredLevel + ')');
    }
  }
}
check(reqErr.length === 0, 'all `requires` resolve in-class and are not level-inverted',
  reqErr.slice(0, 3).join('; '));

/* the declared minRank in `requires` must be reachable on that prerequisite */
let rankErr = [];
for (const s of skills) {
  for (const [d, minRank] of Object.entries(s.requires || {})) {
    const dep = skills.find((x) => x.id === d);
    if (dep && typeof minRank === 'number' && minRank > (dep.maxRank || 1)) {
      rankErr.push(s.id + ' needs ' + d + ' rank ' + minRank + ' but max is ' + dep.maxRank);
    }
  }
}
check(rankErr.length === 0, 'no skill demands a prerequisite rank above its maxRank',
  rankErr.slice(0, 3).join('; '));


/* exactly one free core skill per class — the freebie on class init */
for (const id of classIds) {
  const free = (byClass[id] || []).filter((s) => s.free);
  if (free.length !== 1) bad('class ' + id + ' has exactly 1 free skill', 'found ' + free.length);
}
ok('free-skill count checked for all 9 classes');

/* progression feasibility: at Lv60 you earn 59 points (1/level from Lv2).
   Total ranks purchasable per class must exceed that, so builds are a choice. */
for (const id of classIds) {
  const totalRanks = (byClass[id] || []).reduce((a, s) => a + (s.maxRank || 1), 0);
  if (totalRanks < 59) bad('class ' + id + ' is maxable only with <59 points', 'ranks ' + totalRanks);
}
ok('every class offers a real build choice at Lv60 (ranks > 59)');

/* ultimates: the Lv60 ult must require the Lv20 ult */
let ultErr = 0;
for (const id of classIds) {
  const ults = (byClass[id] || []).filter((s) => s.branch === 'ultimate')
    .sort((a, b) => a.requiredLevel - b.requiredLevel);
  if (ults.length < 2) continue;
  const last = ults[ults.length - 1];
  const deps = depsOf(last);
  const prior = ults.slice(0, -1).map((u) => u.id);
  if (!deps.some((d) => prior.includes(d))) ultErr++;
}
check(ultErr === 0, 'every Lv60 ultimate gates behind the Lv20 ultimate', ultErr + ' classes ungated');

/* ---------------- 4. model registry points at real files ---------------- */
const reg = read('models/registry.json');
const heroes = reg.heroes || {};
let missing = [];
let models = 0;
for (const [id, h] of Object.entries(heroes)) {
  for (const slot of ['baseModel', 'advancedModel', 'portrait']) {
    const p = h[slot];
    if (!p) continue;
    models++;
    if (!fs.existsSync(path.join(ROOT, p))) missing.push(id + '.' + slot + ' -> ' + p);
  }
}
check(missing.length === 0, 'every registry asset exists on disk (' + models + ' refs)',
  missing.slice(0, 3).join('; '));

const noClassModel = classIds.filter((id) => !heroes[id]);
check(noClassModel.length === 0, 'every class has a registry entry', 'missing: ' + noClassModel.join(','));

/* ---------------- 5. cross-file consistency ---------------- */
const enemies = read('enemies/definitions.json');
const enList = enemies.enemies || enemies;
const enIds = Object.keys(enList);
check(enIds.length >= 12, 'enemy definitions >= 12', 'found ' + enIds.length);

/* bosses live under `definitions`, keyed by boss id */
const bosses = read('bosses/world-bosses.json');
const bossDefs = bosses.definitions || {};
const bossIds = Object.keys(bossDefs);
check(bossIds.length >= 3, 'world-bosses.json defines >=3 bosses', 'found ' + bossIds.length + ': ' + bossIds.join(','));
check(!!bosses.schedule, 'world-bosses.json has a spawn schedule', Object.keys(bosses).join(','));
const bossFieldErr = bossIds.filter((b) => !bossDefs[b] || typeof bossDefs[b] !== 'object');
check(bossFieldErr.length === 0, 'every boss definition is an object', bossFieldErr.join(','));

/* camps: object keyed by SPECIES, each value an array of {tx,ty} */
const spawns = read('maps/spawns-main.json');
const camps = spawns.camps || {};
const campTotal = Object.values(camps).reduce((a, arr) => a + (Array.isArray(arr) ? arr.length : 0), 0);
check(campTotal >= 32, 'main map has >= 32 spawn camps', 'found ' + campTotal);
/* every non-boss enemy should have at least one territory camp so it can deploy */
const enDefs = read('enemies/definitions.json');
const noCamp = Object.entries(enDefs).filter(([k,d]) => !d.boss && !(camps[k]&&camps[k].length)).map(([k])=>k);
check(noCamp.length === 0, 'every non-boss enemy has a spawn camp', noCamp.join(','));

/* the species key must be a real enemy id */
const ghost = Object.keys(camps).filter((k) => !enIds.includes(k));
check(ghost.length === 0, 'every camp species key is a real enemy', ghost.join(','));

/* every camp needs tile coords inside the map */
const mapCfg = read('maps/main.json');
const MW = mapCfg.gridW || (mapCfg.grid && mapCfg.grid.w);
const MH = mapCfg.gridH || (mapCfg.grid && mapCfg.grid.h);
check(typeof MW === 'number' && typeof MH === 'number', 'main.json declares numeric gridW/gridH',
  'gridW=' + MW + ' gridH=' + MH);
let coordErr = [];
for (const [sp, arr] of Object.entries(camps)) {
  for (const c of arr) {
    if (typeof c.tx !== 'number' || typeof c.ty !== 'number') coordErr.push(sp + ' missing tx/ty');
    else if (MW && MH && (c.tx < 0 || c.ty < 0 || c.tx >= MW || c.ty >= MH)) {
      coordErr.push(sp + ' at ' + c.tx + ',' + c.ty + ' outside ' + MW + 'x' + MH);
    }
  }
}
check(coordErr.length === 0, 'all camp coords are numeric and on-map', coordErr.slice(0, 3).join('; '));

/* ---------------- summary ---------------- */
console.log('');
console.log('  RESULT  pass=' + pass_ + '  fail=' + fail);
if (fail) {
  console.log('');
  console.log('  problems:');
  for (const e of errs) console.log('   - ' + e);
}
process.exit(fail ? 1 : 0);
