# CHANGELOG
## 2026-09-08 — Permanent cloud saves (Upstash Redis)
- `server.js`: new cloud persistence layer — hydrates USERS/GUILDS/MARKET from Upstash Redis on boot (before listen), mirrors changes every 15 s (dirty-flag throttle), full forced flush on SIGTERM/SIGINT.
- Survives Render free-tier disk wipes: verified via full lifecycle simulation (register → SIGTERM → disk wipe → reboot → login OK; kill -9 wake OK; env-unset file-only fallback OK).
- `render.yaml`: documents the two env vars (`sync:false` — set values in dashboard).
- DEPLOY.md: step-by-step Upstash setup guide.

## 2026-09-08 — UI Fix Pack (post-launch polish)
- **Settings → Account**: proper profile card when logged in (avatar initial, username in account color, cloud-sync status + last sync time). Guest players see a "Guest / Bisita" card with a Log In button.
- **Log out** now actually leaves the game: final forced cloud sync → session cleared → local copy of the cloud character wiped → reload lands on the **welcome screen** (via one-shot `agimat_force_welcome` flag), not back in-world.
- **"Mag-log In" from settings** also routes through the welcome screen; local-save guests can resume via the "play without account" link (now clickable — boots the existing local save).
- **Expired session** (e.g. server restart on Render free tier) now shows a warning toast instead of silently downgrading to guest.
- **HUD overlap fixed**: hero name plate given real clearance from the minimap on touch layouts (left offsets 144/122/112px per breakpoint); name row ellipsizes instead of spilling.
- **Chat layering fixed**: chat box dropped to z-index 20 so every popup window (panels z30, modals z70, menu z115+) renders above it.

## 2026-09-08 — Phase 9: Final combined batch (9a rewards · 9b night ecology · 9c boss resist · 9d skills 11–20) ✅
- 9a: arena win purses are SERVER-issued via mail (300–1000 by rating, 5/day), ledger-credited.
- 9b: Aswang/Wakwak = night hunters — day-blocked, night surge, dawn despawn (data-driven, spawn-rules.json nightRules).
- 9c: bosses build 35%/stack status resistance (floor 15%, 22s decay, elites ×0.5) across stun/slow/root/shred/dot — config bossResist.
- 9d: 90 new data-only skills → 180 total, 20/class, 2nd ultimate @60, engine untouched; 180/180 schema validation.
- Backups: legacy/{game,server}.pre-phase9.js + {skills,enemies}.pre-phase9.json.


## 2026-09-08 — Welcome Experience v2 + 4-stage Character Creation ✅
- Cinematic landing: AI keyart bg (img/bg_welcome.jpg, Ken-Burns pan), left brand column
  (logo/tagline/BAYAN·DIWA·… word cascade), right login panel (icon fields, show-password,
  Remember-me [session-only tokens when off], honest Forgot-password notice, FIL/EN selector).
- Character Select in login panel (spec §10): portrait/name/level/class(+adv name ⭐)/zone/
  last-played; ENTER WORLD · CREATE (replace warn) · DELETE w/ double confirmation.
- Creation rebuilt as 4-stage ritual: LANDAS (9 class banners w/ portraits) → ANYO
  (name/gender/skin/hair) → DIWA (6 affinities) → AGIMAT (5 heirloom charms); stepper UI,
  per-step gating, class-reactive aura + fx label over the 3D pedestal (bg_ritual.jpg).
- Birth cinematic: Baybayin glyphs → "ISINISILANG ANG IYONG ALAMAT" → summary card →
  "Ang iyong alamat ay nagsisimula." → ENTER BARANGAY LIWANAG → chooseClass (existing path).
- S.diwa + S.agimat0 persisted; modest computeStats blessings (≤5%, spec §5/§6 no-min-max);
  legacy saves without the keys verified byte-identical stats. Save key unchanged.
- Tests: module standalone run (welcome/create/gating/cinematic chain), blessing math ×5,
  legacy-save neutrality, live e2e register→save(diwa)→load→delete, statics 200/403.
- Backups: legacy/game.pre-welcome.js, index.pre-welcome.html, style.pre-welcome.css.

## 2026-09-08 — Phase 8: Market ownership + true escrow (spec §25 step 2) ✅
- 'post' verifies the item exists in the seller's STORED save (uid+name+rarity+ilvl);
  the server's copy is listed — client stat tampering ignored.
- Escrow: item removed from stored save at post; rec.esc tracks it; released on buy/cancel.
- Anti-dup: /api/save strips escrowed items from incoming bag+gear (escStripped reported;
  flags bumped). Client post flow syncs-then-posts; cloudPush adopts escStripped.
- 17/17 e2e green incl. phase-7 regression. Backups: legacy/{server,game}.pre-phase8.js.

## 2026-09-08 — Phase 7: Server gold authority (spec §25 step 1) ✅
- Per-account gold ledger on server; /api/save clamps impossible gold jumps (returns
  clamped:true+gold; client adopts). Earn allowance = time-based (8h cap) + level burst
  + server-granted credits (daily, market mail_claim).
- /api/market buy + /api/guild donate now verify funds server-side and debit the ledger.
- /api/arena report rate-limited (45s). Non-numeric gold sanitized. 17/17 e2e tests green.
- Backup: legacy/server.pre-phase7.js. Client: cloudPush handles clamped response.

## 2026-09-07 — Phase 6: HUD cleanup (skill-UI doc 07 / spec §20–22) ✅
- HUD right side = ☰ only; gear/tiangge/settings/fullscreen now menu tiles.
- ☰ menu: 6 categories (KARAKTER/IMBENTARYO/SOSYAL/MUNDO/KALAKALAN/SISTEMA) + Skills first.
- Contextual [Interact]: NPC > Tiangge > Dungeon gate (gate no longer auto-opens).
- Tutorial/unlock texts updated to ☰ paths. Combat cluster untouched.
- Snapshot: legacy/game.pre-phase6.js.
## 2026-09-07 — Restructure Phase 4 (Spawn rules + world bosses to data) ✅
- data/enemies/spawn-rules.json: enemy cap, spawn interval, tier weights, spawn distance/
  attempts, HP level-scaling — consumed by spawnEnemy/spawn loop w/ literal fallbacks.
- data/bosses/world-bosses.json: 3 world-boss definitions + schedule + spots (spec §32).
- nightOnly flag replaces hard-coded bakunawa night-hold.
- Verified: json ≡ inline (0 value diffs), boot OK, server smoke OK.
- Snapshot: legacy/game.pre-phase4.js.
## 2026-09-07 — Restructure Phase 3 seed (Map config) ✅
- data/maps/main.json = authoritative map geometry/zone config (spec §11/§13/§28).
- game.js consumes MAPCFG w/ literal fallbacks; town-exclusion literals unified to EXCL;
  isle gate level config-driven.
- Verified: terrain/zone/river md5 IDENTICAL pre vs post; fallback boot OK; server smoke OK.
- Snapshot: legacy/game.pre-phase3.js.
## 2026-09-07 — Restructure Phase 2 (ModelRegistry) ✅
- data/models/registry.json = single source of truth for model paths (spec §19 schema).
- game.js MODELS populated from registry at boot; hard-coded path kept only as fallback.
- mangkukulam.glb relocated models/ → assets/characters/base/ (spec §15). models/ dir gone.
- world-spec comment/doc examples now use assets/world/<category>/ paths.
- Verified: both boot paths, preload URL, MIME, 404 on old path, syntax, server smoke.
- Snapshot: legacy/game.pre-phase2.js.
## 2026-09-07 — Restructure Phase 1 (Data extraction) ✅
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
## 2026-09-07 — Restructure Phase 0 (Audit & Docs)
- Read + adopted Master Restructure Spec as standing specification.
- STEP A/B: full audit → docs/ARCHITECTURE.md (section map, wrap chains, 34 window._* contracts, hazards).
- STEP C: created client/ server/ data/ assets/ directory skeleton (59 dirs, .gitkeep'd, no code moved).
- New docs: MASTER_DESIGN, MIGRATION_STATUS, CLASS_DESIGN, ENEMY_BIBLE, WORLD_DESIGN, UI_UX, ASSET_PIPELINE, PERFORMANCE, SECURITY, CHANGELOG.
- Spec §7 rename applied: arnisador Lv20 display "Punong Guro" → "Eskrimador" (save ID untouched; syntax verified).
- Moved game2d.backup.js → legacy/.
- STEP D proposal recorded in MIGRATION_STATUS.md (data extraction w/ inline fallback). Awaiting owner GO.

## Earlier (pre-restructure, summary)
Sprints 1–7 + Phases 1–7C shipped: 3D world, 9 classes (incl. Mangkukulam), 4-tier enemy hierarchy w/ territorial camps, Grand Tiangge, Isla ng Bathala, dungeons, world bosses, guilds/market/arena, pets v2, talents, named catalog, inventory overhaul, ☰ menu, Barangay Liwanag beauty pass, GLB pipeline, world-spec loader, deploy prep (Render).
