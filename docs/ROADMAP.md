# AGIMAT ONLINE — Development Roadmap (agreed 2026-09-07)

## PHASE 1 ✅ DELIVERED
- [1] Level cap 15 → 70 with new XP curve
- [3] Daily/weekly quests ("Kill 20 Tiyanak today")
- [5] Gear enhancement +1→+10 with materials & gold at Panday Iko
- [14] Day/night cycle — Aswang/Wakwak stronger at night, Santelmo night-only

## PHASE 2 ✅ DELIVERED
- [2] Class advancement at Lv 20 (Babaylan → Dakilang Babaylan etc.)
- [4] Achievements/titles ("Mangangaso ng Aswang") next to names
- [6] Set bonuses: 3/4/5/6-piece "Anito" gear sets
- [7] Channel system: 20–30 players/channel, party-aware routing, portal follows party
- [8] Party XP share + party buffs

## PHASE 3 ✅ DELIVERED
- [9] Guilds ("Tribu") — name, chat channel, member list
- [10] Player trading / marketplace with anti-scam confirm UI
- [11] PvP arena zone with auto-duels + ranked ladder
- [12] Dungeons/instances — party boss gauntlets, timed rewards
- [13] Scheduled world bosses: Bakunawa (night moon-eating event!), Minokawa, Sarangay

## PHASE 4 ✅ DELIVERED (+ map remodel: town centered, beauty pass)
- [15] Fishing/cooking mini-games — buff foods (sinigang = +HP regen)
- [16] Boss loot: rare cosmetics, mount skins, weapon glows
- [17] Sound sliders + background music
- [18] Tutorial quest chain for new players
- [19] Richer offline/AFK progress report

## PHASE 5 ✅ DELIVERED (assistant-designed catalog; user list can extend later)
- New equipment catalog (weapons/armor/accessories) with LEVEL requirements
  and CLASS requirements. User will send an equipment list document when
  this phase starts. Design item schema to support both requirements.

## PHASE 6 ✅ DELIVERED
- Inventory overhaul modeled on the reference screenshot
  (uploads/Screenshot_2026-09-07-12-30-51-710...jpg):
  paper-doll equip screen (helmet/chest/gauntlets/bracers/amulet/ring/
  greaves/boots slots around a hero silhouette), stats & item detail card
  with green stat-gain arrows, tabbed grid bag (All/Weapons/Armor/
  Consumables/Materials/Quest), Auto-Equip button, Bag Settings,
  bottom nav (Profile/Inventory/Skills/Map). + assistant-chosen extras.

## PHASE 7 📋 PLANNED — "Kaluluwa at Kasama" (Soul & Companion Update)
Two pillars that deepen every existing system, plus a UI/UX cleanup.

### 7A. Alaga v2 — Pets as true companions ✅ DELIVERED
Current pets (🐾 PET_DEFS) are static stat-auras. Phase 7 makes them living systems:
- **Pet leveling**: pets earn XP from your kills (10% share). Level 1→30.
  Each level: +2% of the pet's aura stats. Pet level stored per-pet
  (S.pets.xp[id]), not global.
- **Feeding / Gutom meter**: pets get hungry over playtime (not offline).
  Feed them COOKED DISHES (ties into Phase-4 cooking!). A fed pet gives
  its full aura; a hungry pet gives half and looks sad (slower follow bob).
  Each dish gives pet-XP too — favorite dish per pet = double XP.
- **Auto-loot**: active fed pet vacuums drops within 6m (respects
  auto-forage material filters). THE quality-of-life feature.
- **Evolutions**: at pet Lv15 + a rare material, pets evolve
  (bigger mesh, stronger aura, new name): e.g. Sigbin → Sigbin ng Gabi,
  Tikbalang foal → Tikbalang Stallion (becomes a 2nd mount!).
- **Boss pets (rare drops)**: Baby Bakunawa (world boss 3%),
  Munting Minokawa (3%), Anak ni Sarangay (3%) — prestige companions
  with unique auras (lifesteal / crit / defense).
- **Pet UI**: new Alaga tab in the full-screen inventory (Phase-6 shell):
  pet card, level bar, hunger bar, FEED button (opens dish picker),
  evolution requirements, aura preview.

### 7B. Agimat Talent Tree — "Mga Bituin ng Agimat" ✅ DELIVERED
- Unlocks at Lv30 (after class advancement). 1 talent point per level
  30→70 = 40 points; +1 per boss-tier achievement (finite, listed).
- Full-screen star-map UI: Baybayin constellation per branch, nodes
  connected by glowing lines, pan/zoom canvas.
- **3 branches shared across classes, flavored per class**:
  - ᜃ KALAKASAN (offense): +ATK%, +crit, +skill dmg, capstone:
    "Dugong Bayani" — every 5th hit is a guaranteed crit.
  - ᜊ BALUTI (defense): +DEF%, +HP%, thorns, capstone:
    "Balat-Kalabaw" — survive a killing blow at 1 HP (90s CD).
  - ᜇ DIWA (utility): +move speed, +gold/XP find, -potion CD, fishing/
    forage bonuses, capstone: "Gabay ni Bathala" — resurrect in place
    once per dungeon.
- Nodes: small (1pt, +2–3% stat), notable (3pt, mechanic), capstone
  (5pt, build-defining; only 1 capstone active).
- **Respec** at Babaylan shrine for gold (price scales with points).
- computeStats wrap (same pattern as food/set bonuses). Deterministic,
  no RNG — obeys master design rules.

### 7C. HUD cleanup (pulled forward — delivered early, see below)
- Collapse the 19-button HUD row into a single ☰ Main Menu window,
  grouped Character / Social / Activities / System, with badge mirroring.

### Phase 8+ backlog (not committed): Guild Wars territory control,
Bakunawa eclipse raid, Bahay-Kubo housing, costume shop (GCash,
cosmetic-only), kalabaw racing, photo mode.
