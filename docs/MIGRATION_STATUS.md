# AGIMAT ONLINE — MIGRATION STATUS
*Tracking the progressive restructure per the Master Restructure Spec (uploads/AGIMAT_ONLINE_Arena_AI_Master_Restructure_Prompt.md). Phase-by-phase, owner GO between phases.*

## STEP A — Audit: ✅ (see docs/ARCHITECTURE.md)
## STEP B — Migration report: ✅ (docs/ARCHITECTURE.md §2–§11)
## STEP C — Target directories + docs: ✅ this commit
## STEP D — First low-risk migration proposal: ✅ see bottom

## Phase tracker (spec §34)
| Phase | Scope | Status |
|---|---|---|
| 0 | Audit, ARCHITECTURE.md, MIGRATION_STATUS.md | ✅ |
| 1 | Directory skeleton + data extraction (classes/enemies/items/quests/dungeons) | ✅ 2026-09-07 — 6 JSON files live, verified identical, inline fallback kept |
| 2 | AssetManager + ModelRegistry (mangkukulam first) | ✅ 2026-09-07 — data/models/registry.json drives MODELS; GLB moved to assets/ tree |
| 3 | World/MapManager + map configs | ✅ seed 2026-09-07 — data/maps/main.json drives geometry; full multi-map load/unload = later iteration |
| 4 | Combat + enemy extraction | ✅ seed 2026-09-07 — spawn-rules.json + world-bosses.json live; skill data extraction folded into Phase 5 |
| 5 | Player/class/skill extraction | ✅ 2026-09-08 — generic skill engine + data/skills/definitions.json (90 defs), skill tree UI, save-safe migration |
| 6 | UI rebuild (☰ menu) | ✅ 2026-09-07 — HUD = ☰-only right side; 6 doc-07 categories; contextual Interact covers NPC/Tiangge/Dungeon gate |
| 7 | Server authority (gold→inventory→market→rewards) | ✅ 2026-09-08 — 7a gold ledger+clamp · 7b market escrow · 9a arena purses server-issued. Remaining: WS authority, server RNG (PLANNED) |
| 8 | Visual upgrade (GLB assets) | 🔶 mangkukulam ✅ · world props waiting on owner's Hunyuan3D output |

## Spec compliance snapshot (content rules)
| Spec § | Rule | Status |
|---|---|---|
| §5/§6 | 9 class IDs stable, mangkukulam playable | ✅ already true |
| §7 | Advanced display names (Eskrimador for arnisador etc.) | ✅ applied 2026-09-07; concepts for Bagani/Eskrimador/Mangangaso = PLANNED (models don't exist) |
| §8 | Tier hierarchy Common/Guardian/Elite/Mythic | ✅ (CSV retiering already shipped; Bungisngis=Tier-4 champion) |
| §9 | Zone enemy distribution incl. night-spawn rules | 🔶 camps match zones ✅ · night-only Aswang/Wakwak spawns = PLANNED |
| §10 | Spawns/definitions to data files | ✅ data/enemies/definitions.json + data/maps/spawns-main.json (tile coords + campRadius) |
| §11/§28 | Do NOT lock five future maps | ✅ nothing committed — PROVISIONAL list noted only |
| §12 | No giant world mesh | ✅ standing rule |
| §13/§14 | Map/dungeon load-unload isolation | 🔶 map geometry is config now (main.json); runtime load/unload + dungeon instancing still PLANNED |
| §15–17 | Asset pipeline + budgets | ✅ documented (WORLD_ASSET_SPEC.md, ASSET_PRODUCTION_LIST.md) |
| §18/§19 | Mangkukulam kept; model registry not hard-coded paths | ✅ registry.json authoritative; mangkukulam.glb at assets/characters/base/; inline path only as fetch-failure fallback |
| §20–23 | HUD minimal + ☰ menu + contextual UI | ✅ ☰-only top-right; KARAKTER/IMBENTARYO/SOSYAL/MUNDO/KALAKALAN/SISTEMA categories; [Interact] pill contextual for NPC/Tiangge/Lagusan; badges mirror onto ☰ |
| §24 | Data-driven skills | ✅ data/skills/definitions.json (90 defs) + generic executor; new skill = data change only |
| §25 | Server authority | 🔶 gold ✅ (ledger+clamp, funds checks) · market ownership+escrow ✅ · loot/reward issuance + WS authority ⬜ PLANNED |
| §26 | Performance list | 🔶 culling/caching/reuse ✅ · pooling/distance-sim ⬜ |
| §27 | world-spec.json placement | ✅ live |
| §29/§30 | Barangay Liwanag main-map direction, Tiangge anchor | ✅ matches shipped beauty pass |
| §31 | Dungeon definitions to data | 🔶 data/dungeons/dungeons.json extracted (full §31 schema fields = next iteration) |
| §32 | World bosses separate from mob pool | ✅ + now data-driven: data/bosses/world-bosses.json (defs, schedule, spots, nightOnly) |
| §33 | Docs describe reality with status labels | ✅ this doc set |
| §36 | Save migration functions | ✅ pattern in use (state migration blocks) |

## Phase 1 — COMPLETED 2026-09-07 (was STEP D proposal, owner approved)
- Extracted 6 datasets from game.js to JSON: data/classes/definitions.json (9 classes +
  Tagalog lore), data/enemies/definitions.json (12 species), data/maps/spawns-main.json
  (32 camps in tile coords + campRadius 13), data/items/catalog.json (51 items +
  classGroups), data/dungeons/dungeons.json (3), data/quests/quests.json (6).
- GAME_DATA top-level-await loader in game.js; external JSON authoritative when present,
  inline literals kept as automatic fallback (fetch failure can never break boot).
- Verified: JSON ≡ inline (7/7 deep-equal) · headless boot OK (data + fallback paths) ·
  syntax OK · server smoke test 200s.
- Security fix: static server now 403s data/users.json, guilds.json, market.json,
  /legacy/, /.git/ (users.json with password hashes was publicly fetchable).
- Snapshot: legacy/game.pre-phase1.js.

## Phase 2 — COMPLETED 2026-09-07
- data/models/registry.json is now the single source of truth for GLB model paths
  (spec §19): per-class entries, only mangkukulam has a baseModel today.
- MODELS registry now populated FROM the JSON at boot (populateFromRegistry). The old
  hard-coded EOF path line remains only as a fetch-failure fallback.
- mangkukulam.glb moved: models/ → assets/characters/base/ (spec §15 tree). models/ removed.
- world-spec examples/docs updated to assets/world/<category>/ paths.
- Tested: registry-present and registry-missing boot paths both resolve the same GLB;
  preload requests the right URL; server serves new path w/ model/gltf-binary MIME;
  old path 404s (nothing references it); private files still 403.
- Snapshot: legacy/game.pre-phase2.js.
- Artist workflow now: drop GLB in assets/, add one line to registry.json — zero code edits.

## Phase 3 (seed) — COMPLETED 2026-09-07
- data/maps/main.json: tile/grid size, seed, mainland width, sea line, volcano, lake,
  isle rect + minLevel gate, town rect, town exclusion frame, both portals, all 10 zones
  (names + flavor lines). Spec §28 note embedded: geometry = content configuration.
- game.js: MAPCFG consumed for TILE/MAP_W/MAP_H/seed/MAIN_W/SEA_Y/VOLCANO/LAKE/ISLE/
  TOWN/EXCL/PORTAL_TOWN/PORTAL_ISLE/ZONE_NAMES/ZONE_FLAVORS/isle level gate; hard-coded
  town-exclusion literals (2 sites) now read EXCL; literals remain as fetch-failure fallback.
- Verified IDENTICAL world: md5 of terrain grid, zone grid, river line, plus TOWN/portals/
  volcano/camps all match the pre-phase snapshot; fallback boot also verified.
- Snapshot: legacy/game.pre-phase3.js.
- You can now retune geography (portal spots, isle gate level, zone names) by editing JSON.

## Phase 4 — COMPLETED 2026-09-07
- data/enemies/spawn-rules.json: maxEnemies 40, spawnIntervalMs 1600, tierWeights
  {Common:5, Uncommon:2.6, Elite:1.6}, defaultWeight, minPlayerDistance 24,
  spawnAttempts 90, hpLevelScaling 1.06 — spawnEnemy + spawn loop now read these.
- data/bosses/world-bosses.json (spec §32): full Bakunawa/Minokawa/Sarangay definitions
  (stats, drops, lore), schedule (queue order, first-spawn 15min, respawn 30min,
  2-min warning lead), spawn spots in tile coords, nightOnly flag.
- Night-hold rule generalized: any boss with nightOnly:true waits for dusk/night
  (was hard-coded to bakunawa). Inline fallback def also carries nightOnly:true.
- Verified: JSON path ≡ inline fallback path for all 13 tunables + 3 boss defs
  (key-order-insensitive deep compare: 0 value diffs); full boot OK (10 GAME_DATA files);
  server smoke green. Snapshot: legacy/game.pre-phase4.js.
- You can now tune spawn pressure, boss timetable, and boss spots by editing JSON.

## Phase 5 — COMPLETED 2026-09-08
- Generic skill engine (skill spec 00–10): data/skills/definitions.json = 90 SkillDefinitions
  (10 per class × 9 classes), no per-skill if/else; effect executor handles damage/dot/
  slow/shred/mark/zones/summons/buffs/passives; S.sk state (learned/spent/equipped, ver:1).
- 1 skill point per level from Lv2; free core skill on class init; legacy-save migration
  grants up to min(3, 1+floor(level/5)) skills. Save key agimat_save3 unchanged.
- Skill Tree UI at Menu→Character (window.openSkillTree, ☰ tile w/ badge). Combat HUD
  unchanged: 3 equip slots only, per doc 07.
- Snapshot: legacy/game.pre-phase5.js. Remaining backlog: balance pass, skills 11–20,
  boss diminishing status resistance (doc 08).

## Phase 6 — COMPLETED 2026-09-08
- HUD right side = ☰ ONLY (7C module KEEP=[]); gear/tiangge/settings/fullscreen moved into
  #menu-tray; badge dots mirror onto ☰. Combat cluster untouched.
- ☰ reorganized to doc-07 categories: KARAKTER · IMBENTARYO · SOSYAL · MUNDO · KALAKALAN ·
  SISTEMA; hidden proxy btn-dgn tile opens Lagusan (dungeon select).
- Contextual [Interact] pill priority: NPC > Tiangge > Dungeon gate (🌀 Lagusan, dist<6);
  gate no longer auto-opens the modal — hint toast + Interact/E. Fishing 🎣 unchanged.
- Tutorial/unlock texts updated to ☰ paths. Snapshot: legacy/game.pre-phase6.js.

## Phase 7 — GOLD AUTHORITY (spec §25 step 1) — COMPLETED 2026-09-08
Server is now authoritative for GOLD. Incremental, old clients keep working (clamp, not 401).
- server.js: per-account gold ledger rec.g {bal, t, credits, flags}. validateSaveGold()
  parses every /api/save blob, sanitizes gold (non-numeric→0), and clamps it to
  bal + credits + earn-window (hourly 60k+12k/lvl, capped 8h, matching pasalubong)
  + per-save burst (30k+6k/lvl for quest turn-ins/sell-offs). Clamped saves return
  {ok, clamped:true, gold}; client adopts the corrected value (cloudPush handler).
- Server-granted gold widens the allowance (creditGold): market mail_claim, daily rewards.
- Server-authorized spending narrows the baseline (debitGold) AND is now verified:
  · /api/market buy — rejected if stored save gold < price ("Kulang ang ginto mo…")
  · /api/guild donate — rejected if stored save gold < amount
- /api/arena report rate-limited (1 per 45s) against rating-pump scripts.
- Tested: 17/17 e2e checks (register/save/clamp/load/regrow/market insufficient+ok/
  mail_claim credit/donate reject/arena limit/bogus token/NaN gold); static 200s;
  private data files still 403. Test accounts purged from data/.
- Snapshot: legacy/server.pre-phase7.js. Flags counter (rec.g.flags) = audit trail
  for repeat offenders; no enforcement action yet (PLANNED).

## Phase 8 — MARKET OWNERSHIP + ESCROW (spec §25 step 2) — COMPLETED 2026-09-08
The Palengke is now a true server-side escrow. Kills item duplication and stat tampering.
- 'post' ownership check: the item must exist in the seller's STORED save (bag or a gear
  slot), matched on uid + name + rarity + ilvl. Un-owned or identity-tampered posts → 404.
- The SERVER's stored copy is what gets listed — client-sent stats are ignored entirely,
  so affix/mainV tampering on a legitimately-owned item dies at the listing step
  (verified: hacked mainV 999999 posted, listing shows the real mainV 20).
- True escrow: at post time the item is removed from the seller's stored save and
  remembered in rec.esc {uid:{name,ts}}. 'buy' and 'cancel' release the escrow entry
  (cancel also returns the item). Selling from an equipped gear slot works.
- Anti-duplication: validateSaveGold() now also strips any escrowed item (uid+name match)
  from every incoming save's bag AND gear — re-uploading a pre-post backup can't restore
  a listed item. Strips are reported as escStripped:[uids]; each strip bumps rec.g.flags.
- Client (game.js): post flow now syncs the save FIRST (item still in bag) so the server
  can verify ownership, then posts, then mirrors removal locally on success only.
  cloudPush adopts escStripped corrections (drops uids from bag/gear + computeStats).
- uid recycling is safe: escrow matches uid+name, and entries are deleted on buy/cancel,
  so a NEW item that reuses a sold item's uid is not eaten (tested).
- Tested: 17/17 e2e (un-owned reject / tamper reject / server-copy listing / escrow strip
  on dup save / gear-slot post / cancel release / buy release / phase-7 gold clamp
  regression / mail 5% tax math). Test accounts purged; 403s intact.
- Snapshots: legacy/server.pre-phase8.js, legacy/game.pre-phase8.js.
- Old clients: a stale client that still splices the bag before posting simply loses
  nothing (server removes the same item from the stored copy); its next cloudPush is
  the corrected state. Compatibility preserved.

## Side update — WELCOME EXPERIENCE v2 (owner spec) — COMPLETED 2026-09-08
Cinematic landing + character select + 4-stage creation ritual (LANDAS/ANYO/DIWA/AGIMAT)
+ birth cinematic. New S.diwa/S.agimat0 fields w/ modest computeStats blessings; legacy
saves unaffected (verified). Details: CHANGELOG + UI_UX.md. Backups: legacy/*.pre-welcome.*.

## Phase 9 — COMBINED FINAL BATCH — COMPLETED 2026-09-08
Owner requested Phase 9 + all remaining backlog in one update. Delivered four fronts:

### 9a — Server reward issuance (spec §25 step 4, arena scope)
- /api/arena 'report' win now pays a SERVER-ISSUED purse via rec.mail
  (300 + rating/10, capped 1000; first 5 wins per UTC day). Client only displays;
  mail_claim credits the gold ledger so payouts survive the Phase-7 clamp honestly.
- Losses pay nothing; 45s rate-limit retained. Old clients: purse simply waits in mail.
- Still client-claimed: the win/loss VERDICT itself (needs server-simulated duels — PLANNED).

### 9b — Night-spawn ecology (spec §9)
- data/enemies/spawn-rules.json → nightRules {nightHunters:[aswang,wakwak], duskAllowed,
  nightWeightMult, dayDespawn}. GAME_DATA-driven w/ inline fallback.
- Aswang/Wakwak now NEVER spawn in daylight (forced & rolled paths both filtered);
  at dusk/night a surge interval adds extra hunter spawns (small overflow budget);
  at dawn surviving hunters slink away via removeEnemy (no loot). Santelmo rule kept.

### 9c — Boss diminishing status resistance (skill doc 08)
- statusFactor(en,family): bosses take 35% shorter status per repeat application
  (families: stun/slow/root/shred/dot), floor 15%, full reset after 22s clean;
  elites resist at half rate; commons unaffected. 'LABAN!' label at floor.
- Knobs in data/skills/definitions.json config.bossResist. Applied at ALL application
  sites: core hitEnemy stun, skill melee (slow/root/shred/dot/kulam), projectile riders.

### 9d — Skills 11–20 for all 9 classes (skill spec 09 backlog)
- data/skills/definitions.json: 90 → 180 SkillDefinitions (20/class), ZERO engine code
  changes — pure data, validated against the executor's exact effect vocabulary.
- New band requiredLevel 22–60; each class gains a 2nd ultimate at 60 (requires the
  level-20 ultimate first). Total ranks/class 62–65 vs 59 points @60 = build choice.
- Validation harness: 180/180 pass (effect keys, buff/pmod/zone/cond/stack vocab,
  requires resolvable in-class, rank feasibility, 1 free core/class, both ults reachable).

### Tests (all green)
- 9a e2e 10/10 (purse pay/mail/claim/no-clamp, loss no-pay, rate-limit, P7 clamp + 403 regression).
- 9b standalone 6/6 (day block, night/dusk spawn, surge, dawn despawn, santelmo guard).
- 9c math 5/5 (boss curve 1→.65→.30→.15, family isolation, 22s decay, elite half, commons immune).
- 9d schema 180/180 + progression sim; syntax ×3; 11 JSONs; statics 200; users.json 403.
- Snapshots: legacy/{game,server}.pre-phase9.js, legacy/{skills,enemies}.pre-phase9.json.

## Remaining (externally blocked / future)
- Phase 8 visuals: world-prop GLBs wait on owner's Hunyuan3D output (registry-ready, zero code).
- Server-simulated arena verdicts, WS host-authority hardening, enhancement server RNG — PLANNED (SECURITY.md).
- Multi-map load/unload runtime + dungeon instancing — PLANNED (spec §13/§14 note).

- **2026-09-08 Map Instancing**: IMPLEMENTED — mainland/isla zone instances w/ detach-based unloading + data-driven zone difficulty (zoneTiers). Full multi-scene MapManager: PLANNED.
