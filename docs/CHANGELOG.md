# CHANGELOG
## 2026-09-08 — Chibi enemies: KayKit Skeletons (CC0) + enemy GLB animation engine
- **Assets**: KayKit Character Pack Skeletons 1.0 (CC0, LICENSE.txt shipped) from official GitHub — 4 rigged models (~4.6-5.9k tris, 95 anims each incl. skeleton-specific Awaken/Resurrect clips), embedded textures.
- **Enemy mapping (registry)**: duwende→Skeleton_Minion (pack skirmisher) · nuno→Skeleton_Mage (caster) · aswang→Skeleton_Rogue (night predator) · bungisngis→Skeleton_Warrior (isla brute). Other 8 enemies stay procedural until later packs. Height honors 2.2×def.scale.
- **glbEnemyAnim module**: same skinned pipeline as heroes (SkeletonUtils clone + mixers). State machine off EXISTING AI fields: windup→attack one-shot (melee/caster profile) · flash→Hit_A · chase→Running_A · wander→Walking_A · else Idle. Death: corpse ghost replays Death clip 0.9s then cleans up — killEnemy/removeEnemy/rewards untouched.
- Procedural fallback preserved; scope-gate lint clean; headless 14/14 PASS. SW → agimat-v15.

## 2026-09-08 — Chibi hero models: KayKit Adventurers (CC0) + GLB animation engine
- **Assets**: KayKit Character Pack Adventurers 1.0 (CC0, LICENSE.txt shipped in assets/characters/kaykit/) pulled directly from the official KayKit GitHub. 5 rigged chibi models (Knight/Barbarian/Mage/Rogue/Rogue_Hooded), ~5.7-7k tris, 76 animations each, embedded textures.
- **Class mapping (registry-driven)**: mandirigma→Knight · arnisador+panday→Barbarian · anino→Rogue_Hooded · tirador+mamamana→Rogue · babaylan+alim→Mage · mangkukulam keeps her artist GLB. data/models/registry.json now also carries animProfile (melee/ranged/caster).
- **glbHeroAnim module**: SkeletonUtils.clone (fixes skinned-clone corruption of the old clone(true) path), AnimationMixer per hero, name-based clip table, state machine off existing player state (moving→Running_A, attack→profile clip incl. Spellcast for casters, dodge→Dodge_Forward, death→Death_A, else Idle). One-shots time-scaled to game action duration. Remote ka-party heroes animate from movement deltas. Procedural fallback preserved when a model is missing.
- jsm/utils/SkeletonUtils.js added (three r160, bare-'three' import matches importmap). Preloads registry hero models; live-swaps the player mesh when their model arrives ("Bagong anyo!" toast).
- GLBs are NOT precached by the SW (network-first + runtime cache handles them). Scope-gate lint clean; headless 11/11 PASS. SW → agimat-v14.

## 2026-09-08 — Boot splash: no more naked HUD on first paint
- index.html: #boot-splash injected as the FIRST body element with fully inline styles + inline progress script — covers the screen from the very first paint, before any game CSS/JS loads. Baybayin rune pulse, ⚜️ logo, animated progress bar (caps 92%), rotating Tagalog loading lines, 20s slow-connection notice.
- game.js bootSplash module: dismisses (fade + DOM removal) the moment the game is presentable (welcome screen visible OR world started), min 600ms display to avoid flash. SW → agimat-v13.

## 2026-09-08 — CRITICAL: guest-account trap fix + cloud-authoritative boot + guest→account migration
- **Bug (user-reported)**: boot auto-resumed ANY local save straight into the world. A browser holding a GUEST save trapped the player — welcome screen unreachable on reload, so login was impossible from that browser; and a LOGGED-IN boot used the possibly-stale localStorage copy instead of the cloud save.
- **New boot decision**: logged-in → reconcile with cloud first (4s timeout; cloud save adopted when lastSeen newer — offline progress still wins if local is newer; expired session → clean logout to welcome, never silent guest); guest with local save → WELCOME screen (login always reachable; guest resume stays 1 tap: "Maglaro nang walang account"); no save → welcome/creation.
- **§12 save migration**: on the character-select panel, when the account has NO hero but a local guest hero exists → "📥 ILIPAT ANG GUEST NA BAYANI — <name> · Lv <n>" one-tap link pushes the guest save into the account (cloud-safe).
- /api/health upgraded: env-var shape diagnostics (never leaks secrets) — used to solve the Upstash setup (root cause of "Maling username": accounts were wiped every deploy while cloud was OFF; now ON).
- Boot scenarios headless 7/7 PASS. SW → agimat-v12.

## 2026-09-08 — Kapuluan Life Pack: quest variety + NPC reputation + contextual interactions (Game Bible #3/#4/#5)
- **[A] Quest variety**: story chain 6 → 12 (inline + quests.json, push guarded vs duplicates). New engine types: visit (multi-zone exploration w/ per-quest vset dedupe) · forage · fish · cook (achEvent bridge) · enhance · **choice** (auto-ready). Veterans with finished chains get "Bagong kabanata!" reopen. Finale "Ang Nakawang Anting-anting" = MORAL CHOICE epilogue: return (+25k XP, +10 rep with 3 town NPCs) vs keep (+15k gold, +15 Kubrador rep); choice recorded in S.ctx.moral; title "May Budhi".
- **[B] NPC reputation**: builds on npcRel/tier data from the Universal NPC system. Sources: quest turn-ins (+5, existed), shop purchases (+1, delegated listener), moral choice. Perks: shop discounts 5% @15 / 10% @30 / 15% @100 (buyPrice wrap, per-NPC context via _curNpcShop) + daily material gift at Kaalyado (60+); tier-up toasts; cap 150.
- **[C] Contextual interactions**: world-aware green action button — 🕊️ Balon ng Kahilingan (plaza well: 100g offering → random +6% ATK/HP/DEF or +8% XP, 5 min, 10 min cd) · 🙏 Tabi-tabi po (Nuno Highlands: +6% Drop 10 min, 15% Nuno Stone chance, 20 min cd) · 🐚 Mamulot (beach: materials + 20% Diwata Dew, 15 min cd). Own buff store + HUD chip (kept separate from FOOD.buffs whose chip assumes DISHES ids); buffs expire cleanly.
- 4 new achievements. Save additive: S.ctx, S.npcGift, S.quests.vset/vq. Scope-gate lint clean; headless 30/30 PASS. SW → agimat-v11.

## 2026-09-08 — Ang Apat na Pag-angat: 4-tier advancement rituals (Lv20/40/60/80)
- **LEVEL_CAP 70 → 80** (Lv80 = final ritual). UNLOCKS notes for 40/60/80 updated.
- **4-tier ladders for all 9 classes**, rooted in real Philippine mythology: epic heroes (Lam-ang, Aliguyon of the Hudhud, Bantugan of the Darangen, Bernardo Carpio), deities (Apolaki, Mayari, Sidapa, Lakapati, Kanlaon, Anitun Tabu, Dumakulem, Bathala), Sitan's agents (Mangagaway, Hukluban), authentic titles (Mumbaki = Ifugao ritual priest, Punong Guro = arnis grandmaster rank, Lakan = precolonial ruler, Tigbanua of Bagobo lore).
- **Ritual as EVENT** (Game Bible): full-screen ceremony overlay — class-colored aura, pulsing Baybayin rune, "TINATAWAG KA NG MGA NINUNO…", name reveal, ring FX + shake, then rewards toast.
- **Ceremony window** shows the whole ladder (✓ done / ★ current / 🔒 future) with lore lines; peak screen "ANG RUROK NG LANDAS" at T4.
- **Costs**: T2 15k gold+40 Anito Dust+5 Nuno Stone · T3 60k+60 Diwata Dew+3 Mutya · T4 200k+10 Mutya+40 Santelmo Flame (T1 unchanged 3k+10 dust).
- **Stats stack multiplicatively across tiers** on top of T1 ADV_DEFS perks (caps raised: crit 85, LS 40, CDR 65). Tier-1 internal names/IDs never touched; display name syncs via ADV_DEFS.name mutation so all existing UI sites (HUD, inventory, skill tree, profile) update for free.
- **Save additive**: S.advT (0–4), migration S.adv===true→1 via poll. 🌟 button now appears at every eligible gate. Achievements: Ritwal II/III/IV (8k/25k/100k gold; T4 grants title "Hinirang ng mga Bathala").
- Scope-gate lint clean; headless 11/11 core + guard tests. SW → agimat-v10.

## 2026-09-08 — Ang Kodise ng Agimat (Game Bible feature #1)
- **Living encyclopedia w/ progressive reveal**: 10 categories — 🐉 Halimaw · 🪨 Materyales · 🎣 Isda · 🍲 Lutuin · 🐾 Alaga · ᜀ Baybayin Runes · 🗺️ Lupain · 🧙 Uri ng Bayani · ✨ Diwa at Agimat · ⚔️ Alamat na Kagamitan. Locked entries = ❓ ??? + discovery hint (names never leaked); unlocked entries show lore + live stats (kill counts, owned quantities, pet levels).
- **Discovery**: derives from EXISTING save state (bestiary/inv/pets/gear — retroactive for veterans) + new S.codexSeen (additive) for zones (visit toast "naitala ang lupain"), dishes (cook), fish (catch).
- **Entry points**: ☰ Menu → 📖 Kodise ng Agimat (KARAKTER group); per-category and global progress counters (Naitala: X/Y).
- **Achievements**: 25 entries → 2.5k gold; 60 entries → 12k gold + title "Tagapag-ingat ng Alamat".
- Old equipment-catalog menu tile renamed Kodise → **Katalogo** (its content also appears in the new Kodise as the Alamat tab).
- No duplicated lore — window reads live from ENEMY_DEFS/MATERIALS/FISH_DEFS/DISHES/PET_DEFS/RUNE_DEFS/ZONE_NAMES/CLASSES/DIWA/CATALOG. Scope-gate lint clean; headless 18/18 PASS. SW → agimat-v9.

## 2026-09-08 — Inventory search/sort/rarity filters + CRITICAL module-scope repair
- **CRITICAL FIX**: game.js is an ES module (strict, module scope). The inv3d hook (`const _open=i2Open`) referenced an IIFE-local and THREW at load — killing every module after it (mapTransition, leftRail, daily2, mapInstancing, hudRegions… never executed in production). Caught by scope-aware ESLint (no-undef) sweep.
  - inv2 IIFE now exposes `window._i2` hook (live I2 getter, matTab/isWeapon, detail/doll/grid/renderAll, setGrid, wrapOpen).
  - inv3d + leftRail rewired through the hook / window.i2Close.
  - Full-file lint now shows ZERO unreachable bare names (all remaining no-undef are window-exported globals).
- **Duplicate pet system removed**: EOF alagaV2 (never ran) conflicted with the richer existing Alaga engine (S.pets.xp leveling, hunger, evolution, openPetsV2). Replaced by slim newCompanions module: 🔥 Santelmo (epic pet, +3% ATK aura via PET_AURAS) + 🐐 Sigbin (legendary mount, ride 1.8×, hunger penalty), favorites sinigang/kinilaw — fully integrated with feeding/leveling/evolution UI.
- **§3 final — inventory toolbar**: 🔎 search (gear + materials, live counter shown/total), sort select (Rarity/iLv/Halaga/Bago), 5 rarity filter dots (multi-toggle, color-coded, fat touch targets ≤480px). Same cell markup/handlers; empty state "Walang tugma sa paghahanap."
- Headless filter tests 15/15 (search/rarity/sorts/click wiring/tab intersect). SW → agimat-v8.

## 2026-09-08 — Visual cohesion pass (master-fix §16/§17)
- **Design tokens in :root**: radius scale (--r-xs 6 / sm 9 / md 12 / lg 16 / xl 22), shadow scale (--shadow-1/2/3), focus ring (--ring), rarity colors completed (--epic, --legendary), display typeface tokenized (--ff-display = Georgia, branding only — logo/tagline/quote; all UI on --ff).
- **Standardization layer at EOF** (wins cascade): typography scale unified; border-radius mapped to tokens across modal/npcw/alaga/inventory/menu components; rarity text+glow single source; button states (hover brightness, :focus-visible ring, disabled 45%+grayscale, tap-highlight cleanup); glow budget trimmed (skill-ready/autoforage/autobattle halos reduced ~40%, autobattle pulse anim removed); one scrollbar style everywhere; modal/panel spacing rhythm (6·8·12·16).
- **§17 desktop enhancement (not scale-up)**: ≥1200px+fine pointer → wider modals/panels/menu/NPC window, larger pet preview + inventory cells, wider chat, button hover lift; ≥1500px → larger quest tracker + minimap.
- **Close controls unified**: .close-panel/.mm-x/#npcw-x one rounded-square shape + hover/active states.
- **prefers-reduced-motion** honored globally.
- CSS brace-balance verified 840/840; 14/14 static checks. SW → agimat-v7.

## 2026-09-08 — HUD regions rebuild (master-fix §2)
- **#hud → 3-region responsive grid**: TOP-LEFT hero plate (avatar/name/level/HP/XP/gold) · TOP-CENTER new #hud-center flex region · TOP-RIGHT ☰ menu. Safe-area padding on all four edges.
- **Status chips adopted, not rebuilt**: dn-chip (day/night), party-pill (channel/players), party-buff-chip, food-chip were 4 independent `position:fixed; left:calc(50%±Npx)` elements that collided on narrow screens and under the toast stack. hudRegions() adopts them into #hud-center (positioning stripped, timers/logic untouched); a 3s sweep also catches chips created later.
- **New 📍 location chip** in top-center (mirrors minimap zone title; auto-hides ≤640px where the minimap already shows it).
- **Toast stack moved below the chip row** (was overlapping party/time pills).
- **Breakpoints**: ≤900px chips shrink · ≤640px tighter hero plate · coarse+portrait: center region wraps to its own row, left-aligned · coarse+landscape ≤540px: hard squeeze + tighter toasts. Existing Sprint-5 mobile top-strip rules (minimap-left layout) preserved — grid overrides only the top-level container.
- Headless: 10/10 static checks + 5/5 adoption-logic tests. SW → agimat-v6.

## 2026-09-08 — Alaga v2: companion system upgrade (master-fix §9)
- **New window**: tabs (🐾 Alaga / 🐃 Sasakyan / 📚 Koleksyon), companion list with rarity colors + lock/AKTIBO states, rotating 3D preview canvas, detail card, favorite ⭐ toggle. Mobile layout ≤480px.
- **Progression**: active pet earns XP from your kills (common 4 / elite 8 / boss 40), levels 1→30 (need 30·lvl^1.6), +1 bond per 20 shared kills. Bond tiers: Bagong Kakilala → Magkasundo → Matalik → Kadugo, each grants +1% Drop Rate AND +1% XP Gain.
- **Scaling passives** (PET_META data table): Sarimanok 12%+0.4/lvl DR · Tarsier 10%+0.35/lvl XP · Paniki 4%+0.15/lvl LS · Santelmo 3%+0.25/lvl ATK · Kalabaw 60%+0.4/lvl ride · Sigbin 80%+0.5/lvl ride.
- **2 new companions**: 🔥 Santelmo (epic pet, glowing cyan flame w/ point light, 12k gold) · 🐐 Sigbin (legendary mount, ember eyes, 30k gold).
- **Mount energy (gentle)**: ~5 min ride time, drains 0.35/s mounted, recharges 1.2/s on foot; auto-dismount at 0; needs ≥10% to ride. Energy bar in window.
- **Save schema: ADDITIVE ONLY** — S.pets.data/fav/energy lazy-init; legacy saves load untouched (verified by test). Base killReward/computeStats untouched (wrap chain). Headless 19/19 PASS. SW → agimat-v5.

## 2026-09-08 — Map Instancing + Zone Difficulty (master-fix §6–§8)
- **Zone instances**: world statics partitioned once at boot into MAINLAND vs ISLA buckets (split at the ocean gap, x ≥ (ISLE.x0−4)·TILE). Only the active zone's objects are attached to the scene — the other side is fully detached (zero draw calls/raycasts/matrix updates). Lights, sky, terrain, water (origin-anchored) stay shared.
- **Zone switching**: 700ms watcher flips the instance whenever the player crosses the split (portal, respawn, any teleport). Off-zone enemies are culled + enemy projectiles cleared on switch. Debug: window._zoneDebug().
- **Spawn gating**: campsFor() now filters to active-zone camps only — no more mainland monsters simulating while on the isla. Manananggal world boss (volcano) blocked while player is on the isla (retries in 60s).
- **§7 difficulty tiers (DATA)**: spawn-rules.json zoneTiers — per-zoneGrid hp/dmg/reward multipliers. Home/bamboo/beach 1.0× → darkwood/nuno/flowers 1.15× → burnt/blackwater 1.32× → volcano 1.55×/1.5×rw → isla 1.8×hp/1.45×dmg/1.75×reward. Applied post-spawn (hp), on dealTo (_srcEn.dmgMul), and in killReward (XP+gold via transient _rwMul). Missing JSON = graceful 1× fallback.
- SW cache → agimat-v4. Headless tests 21/21 PASS (partition, boot zone, switch+cull, camp gating, hp/dmg/reward math, multiplier reset, boss gating, re-attach).
- NOTE: true multi-scene MapManager (separate GLB bundles per map, §6 full) stays on the roadmap for when the world grows beyond 2 zones; this pass delivers the §8 performance goals inside the current single-scene architecture.

## 2026-09-08 — Master Fix Pack phase 1 (spec: Master Fix & Upgrade Prompt)
- **§1 UI layering**: uiOverlayManager — chat auto-hides behind ANY popup (modals, panels, inventory, menu, talents, skill tree, NPC window) and restores on close; new always-visible "—" minimize control; minimized chat = floating 💬 button with unread badge; states persisted. Headless tests 4/4.
- **§3 Inventory 3D character**: SVG silhouette replaced with the player's ACTUAL buildHero model — slow auto-rotation, touch-drag rotate, pedestal + cyan ring, rebuilds instantly on equip (equipItem hook). Renders only while inventory is open (no background cost).
- **§5 Left nav rail**: inventory bottom tabs → vertical RPG rail (Profile/Inventory/Skills/Map/Alaga) with icon+label, active purple/gold highlight; Alaga routes to the pets window.
- **§10 Daily reward v2**: 7-day track with claimed ✓ / today (pulsing gold) / locked 🔒 states, reward-pop animation, countdown to next UTC reward; modal layer (chat can never cover it).
- **§15 Map transition screen**: ⟐ AGIMAT ONLINE ⟐ + zone name + lore line + animated Baybayin rune + progress bar + gameplay tip; wired into the town⇄Isla portal (layer 200).
- **§4 Baybayin rune glow**: carved-artifact treatment for sockets/rune chips — cyan/gold energy, engraved-metal gradients, rarity shimmer (subtle, mobile-safe).
- **§13 PWA**: manifest display_override [fullscreen, standalone, minimal-ui]; sw VERSION → agimat-v3 (cache-safe update).
- Compatibility: no systems removed; all hooks are wrap-style; server API untouched.

## 2026-09-08 — Universal NPC Interaction System + PWA launch fix
- **PWA fix**: sw.js v2 — index.html offline fallback now applies ONLY to page navigations. v1 served index.html for ANY failed fetch (including game.js while Render was waking), which made the installed app open to a blank screen. game.js + three.module.min.js added to precache; VERSION bump auto-cleans old caches.
- **Universal NPC Window** (spec: npc-redesign): ONE reusable window for all NPCs — portrait, name/title, relationship badge, scrollable dialogue, contextual action bar ([💬 Usap] [📜 Misyon] [🧰 Serbisyo]), tap-outside/✕/Esc to close. World stays visible behind (35% dim). Mobile-first: ≥44px touch targets, bottom-sheet on narrow phones, side placement in short landscape.
- **Data-driven NPCs**: data/npcs/{definitions,dialogue,services,relationships}.json (+inline fallbacks). Capabilities (dialogue/quest/shop/heal/upgrade/gamble/…) auto-generate the action bar; 1 service = direct button, 2+ = Services grid. Adding an NPC = data only.
- **Quest integration**: reusable indicators (! new / ? ready — in-window badges AND world labels ❗/❓), quest panel with objectives/rewards/Accept/Turn-in; legacy modal flow kept as fallback; quest turn-ins now grant +5 NPC relationship (Estranghero→Matalik na Kaalyado tiers).
- **New service**: Aling Rosa heals to full HP (free, 60s cooldown per NPC).
- Existing shops (trader/blacksmith/equipment/blackmarket), Pandayan enhance, and quest chain fully reused as service runners — zero duplicate systems. Headless tests 18/18 PASS; server e2e green.

## 2026-09-08 — PWA: installable app (Chrome/Android/iOS)
- `manifest.webmanifest`: name "Agimat Online — Alamat ng Kapuluan", fullscreen display, landscape orientation, theme #16102a, 192/512 icons + maskable variants (78% safe zone).
- New app icon: golden agimat medallion with Baybayin engravings on purple glow (`img/icons/`, master art `img/icon_master.jpg`).
- `sw.js`: service worker — network-first with cache fallback; never caches /api, /ws, /data; VERSION bump invalidates old caches.
- `index.html`: manifest link, theme-color, favicons, apple-touch-icon, iOS standalone metas.
- `game.js`: beforeinstallprompt capture → gold "📲 I-INSTALL ANG LARO" button on welcome screen + Settings row; iOS one-time Add-to-Home-Screen hint toast; hidden when already installed.
- `server.js`: `.webmanifest` MIME type.

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
