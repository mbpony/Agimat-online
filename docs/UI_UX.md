# AGIMAT ONLINE — UI / UX
*Target HUD per spec §20–23. Status labels included.*

## Target HUD layout (spec §20) — PARTIALLY IMPLEMENTED
- Top-left: portrait + HP/XP bars ✅
- Top-right: minimap ✅ + ☰ main menu ✅ (PHASE 7C)
- Bottom-left: joystick (mobile) ✅
- Bottom-right: attack + skills + dodge (MLBB fan layout) ✅
- Contextual [Interact] pill ✅ — NPC / Tiangge / Dungeon gate (priority order), E key equivalent; fishing 🎣 pill separate & contextual
- HUD right side = ☰ only since Phase 6 (2026-09-07). ⚔️🏮⚙️⛶ are menu tiles now. Auto-battle ⚔️ stays in the combat action cluster (combat-relevant per doc-07 redundancy rule).

## ☰ Main-menu categories — IMPLEMENTED (doc-07 layout, Phase 6)
🌟 Skills (first tile) · KARAKTER: Kagamitan/Estadistika/Tagumpay/Pag-angat/Alaga ·
IMBENTARYO: Alay Pouch/Kodise/Aklat ng Lahi · SOSYAL: Kaibigan/Tribu/Channels/Leaderboard ·
MUNDO: Misyon/Lagusan/Arena · KALAKALAN: Tiangge/Palengke · SISTEMA: Settings/Tunog/Full Screen
(+ ✨ Mga Bituin talents tile appended by talent module). Trading ⬜ PLANNED.

## Rules
- One responsive UI system, no per-device forks (§23). Current: CSS breakpoints + touch detection. ✅
- Contextual UI only when relevant (§22): fishing/cooking prompts ✅ · generic [Interact] pill PLANNED.
- Chat box only after game starts (owner rule). ✅
- Settings button stays fixed during overlays (mute-overlay bug fix). ✅

## Welcome Experience v2 (2026-09-08) — IMPLEMENTED
- Landing: cinematic keyart bg (img/bg_welcome.jpg) + vignette; left = brand column
  (logo, tagline, animated word cascade BAYAN/DIWA/KAPANGYARIHAN/PAGLALAKBAY/IKAW/AGIMAT,
  SIMULAN button); right = login panel. FIL/EN language selector (agimat_lang), quote footer.
- Login panel: username/password w/ icons + show-password eye, Remember-me checkbox
  (unchecked = session-only token, not persisted to localStorage), Forgot-password link
  (honest "no reset yet" notice — no fake flow), tabs MAG-LOG IN / GUMAWA NG ACCOUNT.
  No social buttons (backend has none — spec §2 "do not create fake authentication").
- Character Select (spec §10): after login the panel becomes a character card —
  portrait, name, Lv, class (advanced display name + ⭐ when adv), current zone
  (from px/py via zoneGrid), last-played ago-text. Buttons: PASUKIN ANG MUNDO,
  GUMAWA NG BAGONG BAYANI (replace warning), 🗑 delete w/ DOUBLE confirm (spec §10).
  Single character slot per account (save = one blob) — documented limitation.
- Character Creation — 4-stage ritual (spec §4): LANDAS → ANYO → DIWA → AGIMAT with
  stepper pills, per-step validation gates, BALIK/SUSUNOD nav, ritual-platform bg
  (img/bg_ritual.jpg) + class-reactive aura glow + effect label (spec §7: mangkukulam
  green curse, babaylan blue flames, anino purple smoke, panday embers, etc.).
  - LANDAS: 9 class banner buttons (portraits), info card w/ role/weapon/desc/skills.
  - ANYO: name+dice, gender, 4 skin tones, 4 hair styles, 5 hair colors (existing
    buildHero architecture only — face/eyes/scars NOT supported by current mesh; documented).
  - DIWA (spec §5): 6 affinities (Apoy/Tubig/Lupa/Hangin/Anino/Diwa), tiny bonuses ≤5%.
  - AGIMAT (spec §6): 5 heirloom charms (Depensiba/Opensiba/Espiritu/Elemental/Lihim),
    modest bonuses; stored as S.agimat0 (separate from Tiangge Agimats S.agimats).
- Birth cinematic (spec §9): glyph reveal → ISINISILANG ANG IYONG ALAMAT → summary card
  (name/class/diwa/agimat) → "Ang iyong alamat ay nagsisimula." → PASUKIN ANG BARANGAY LIWANAG.
- Not supported by current architecture (documented per spec §4, no fragile workarounds):
  email accounts, password reset, multiple character slots, voice selection, face/eye/
  scar/accessory morphs, per-class 2D splash art on banners (uses existing portraits).
