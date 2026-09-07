# AGIMAT ONLINE — ARCHITECTURE (Current Reality Audit)
*Status date: 2026-09-07 · This documents what EXISTS, not what is planned.*

## 1. File structure (current)
```
agimat/
├── index.html        (201 lines — HUD skeleton, panels, modal, class-select, char-create)
├── game.js           (10,606 lines — ~95% of client logic. THE decomposition target)
├── style.css         (1,019 lines — all UI styling incl. 3 responsive breakpoints)
├── server.js         (497 lines — static file server + WS + JSON persistence)
├── three.module.min.js + jsm/  (Three.js r160 ES modules + addons)
├── assets/           (spec §15 tree; characters/base/mangkukulam.glb 2.6MB)
├── img/              (23MB — portraits, enemy art, concept refs, bgs)
├── data/users.json   (server-side account + save store)
├── docs/             (design docs, roadmap, asset specs)
├── legacy/game2d.backup.js
└── client/ server/ data/            (data/ now live: 7 JSON datasets + model registry)
```

## 2. game.js responsibilities (section map by line, IMPLEMENTED unless noted)
| Lines | System |
|---|---|
| 1–434 | MATERIALS, CLASSES (9), ENEMY_DEFS (12), RUNE_DEFS, XP/LEVEL_CAP=70, DEFAULT_STATE, account/cloud-save |
| 435–1038 | Procedural world: grid 192×105, zones 0-9, river, camps (CAMPS), TOWN rect, terrain heights |
| 1039–2110 | World meshes: terrain build, trees, town (walls/gates/shops/well), Tiangge tent, zone décor |
| 2111–2882 | Hero + enemy mesh builders (procedural), appearance system, Elder Alim special |
| 2883–3311 | Enemy spawn/camps, drops, FX primitives (fxRing/fxPuff/etc), projectiles |
| 3312–3913 | Combat: doAttack/useSkill (per-class switch), dodge, hurtPlayer, killReward/killEnemy, XP, forage |
| 3914–4630 | Minimap (mmBase), main RAF loop: AI, drops, labels, cooldown UI |
| 4631–5075 | Panels: gear(legacy), tiangge/forge, inventory, bestiary; modal; sellPrice |
| 5076–5365 | Welcome/login flow, char-create (3D preview), class select, initForClass |
| 5366–5786 | Chat system + multiplayer (window._net; host-authoritative enemies, es@10Hz) |
| 5787–5918 | SFX synth engine |
| 5919–6112 | Settings (keybinds/graphics/audio), fullscreen (+UC pseudo-fs fix) |
| 6113–6370 | Friends, leaderboard, duels (window._kaParty) |
| 6371–6700 | Quests (QUESTS 0-5), quest HUD, portals (town↔isla), GLB loader + MODELS registry |
| 6701–6776 | rotate-hint, misc |
| 6777–7034 | PHASE 1: enhancement +10, dailies/weeklies, day/night |
| 7035–7386 | PHASE 2: advancement (ADV_DEFS), achievements (ACH_DEFS), sets (SET_DEFS), channels |
| 7387–8115 | PHASE 3: guilds, marketplace, arena, dungeons (DUNGEONS/DGN), world bosses (WBOSS) |
| 8116–8733 | PHASE 4: map beauty, fishing (FISH_DEFS), cooking (DISHES/FOOD), cosmetics, BGM, tutorial, offline v2 |
| 8734–8978 | PHASE 5: CATALOG (51 items), _canEquip/_reqLine, codex |
| 8979–9477 | PHASE 6: full-screen inventory #inv2 (paper-doll, tabs, auto-equip, map tab) |
| 9478–9662 | PHASE 7C: ☰ main-menu container + cross-browser fullscreen |
| 9663–9993 | PHASE 7A: pets v2 (XP/hunger/evolve/boss pets/auto-loot) |
| 9994–10313 | PHASE 7B: talent tree (TAL_BRANCHES, capstones) |
| 10314–10606 | Barangay Liwanag beauty pass · Mangkukulam support · world-spec loader |

## 3. Extension pattern (CRITICAL to understand before refactoring)
The codebase grew by **wrap-at-EOF**: later modules reassign earlier functions:
`killReward` (6 wraps), `computeStats` (4), `hurtPlayer` (3), `killEnemy` (2), `gainXP` (2),
`finishDungeon` (2), `buildEnemyMesh` (2), `buildHero`, `rollDamage`, `refreshPetMesh`,
`openSettings`, `checkPasalubong`. **Wrap ORDER = file order and is load-bearing.**
Any migration must preserve wrap chains or flatten them intentionally.

## 4. Cross-module contracts (34 window._* globals)
net: _net _netDmg _netHit _netIsGuest _netMarkContrib _netOnKill _netRemoved _netSpawned
party: _kaParty _partyAtkBonus _partyXpBonus _partyXpShare _onInvite _onInviteAccepted _onDuelMsg
social: _friendKeys _guildPerks _guildTag _chatSys _prefCh _onChanList
quests: _questKill _questProg _qIntro; items: _canEquip _reqLine _rollSet _setLine
misc: _autoVec _cookPrompt _dailyTried _fsActive _sfxMaster _townPortalG

## 5. Server (server.js) responsibilities
- Static file serving (whole repo)
- WS /ws: 10 channels × 5 slots; join/pos relay; host-authoritative enemy sync
- REST: /api/register /api/login /api/save /api/load /api/leaderboard /api/friend(s)
  /api/guild /api/market /api/arena /api/daily
- Persistence: data/users.json (debounced 250ms writes)
- ⚠️ SECURITY: server accepts client-sent save blobs verbatim (gold/inventory client-trusted).
  Restructure §25/Phase 7 will address. PLANNED.

## 6. Save-state schema (S) — STABLE IDs, do not rename
Top-level fields: cls name app level xp hp gold inv agimats bestiary gear bag quests pets
autoForage lastSeen exchanges itemUid adv ach + added by modules: tut talents (u), pets.{xp,hunger,evolved,pity}
Class IDs: babaylan arnisador tirador alim mandirigma mamamana anino mangkukulam panday (9)
localStorage keys: agimat_user/token/color/keys/mute/settings/chat_col/quest_col/vol_bgm/vol_sfx
Cloud save: full S JSON via /api/save.

## 7. Asset paths
- assets/characters/base/mangkukulam.glb (via data/models/registry.json → MODELS.hero.mangkukulam)
- img/p_*.png class portraits, img/e_*.png enemy art
- data/world-spec.json (optional; world prop placement — loader live in game.js)
- Registry: data/models/registry.json (authoritative); add artist GLBs by editing JSON only.

## 8. Map architecture (current)
ONE procedural map: mainland (134×105 tiles) + Isla ng Bathala (portal-gated), TILE=4.
Terrain/collision/minimap derived from grid+zoneGrid arrays computed at boot (deterministic
seed 20260905). Dungeons run in a pocket arena INSIDE the same scene (DGN.arena at far coords).
Zones = content configuration (zoneGrid ids 0-9), not hard architecture. PARTIALLY aligned
with target MapManager design; multi-map loading is PLANNED.

## 9. Enemy architecture (current)
ENEMY_DEFS (12 species, tier tags per CSV hierarchy) + CAMPS (32 validated territory circles)
+ spawnEnemy pool weighted by tier + minLevel gates + world-boss scheduler (WBOSS separate
from normal spawning ✓ already matches spec §32).

## 10. Risky dependencies / migration hazards
1. Wrap-at-EOF chains (see §3) — order-sensitive.
2. window._* contracts — any module split must keep these names.
3. index.html inline element IDs — 100+ getElementById references.
4. Phase-6 inventory + Phase-7C menu build their DOM at runtime and hijack older buttons.
5. Multiplayer guest mode short-circuits spawn/kill paths (window._netIsGuest).
6. Sandbox dev environment: processes/node_modules/tmp recycle between sessions.
7. Save compatibility: S is serialized whole → new fields must default-migrate on load.

## 11. Dependency direction (target, per master spec)
DATA → SYSTEMS → GAME STATE → RENDERING → UI. Current code violates this freely
(UI handlers mutate S directly); migration will introduce boundaries incrementally.
