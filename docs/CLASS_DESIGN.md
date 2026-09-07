# AGIMAT ONLINE — CLASS DESIGN
*9 playable classes. Save IDs are PERMANENT — never rename. Advanced names are DISPLAY-ONLY at Lv20.*

| Save ID (permanent) | Base display | Lv20 advanced display | Role | Status |
|---|---|---|---|---|
| babaylan | Babaylan | Katalonan | Healer/support caster | ✅ IMPLEMENTED |
| arnisador | Arnisador | Eskrimador | Melee duelist (kali sticks) | ✅ IMPLEMENTED (adv name updated 2026-09-07) |
| tirador | Tirador | Agilang Mata | Slinger/marksman | ✅ IMPLEMENTED |
| alim | Alim | Salamangkero | Elemental mage | ✅ IMPLEMENTED |
| mandirigma | Mandirigma | Bagani | Warrior/tank | ✅ IMPLEMENTED |
| mamamana | Mamamana | Mangangaso* | Archer | ✅ IMPLEMENTED (*display currently "Punong Mangangaso" — trim pending approval) |
| anino | Anino | Multo | Assassin/stealth | ✅ IMPLEMENTED |
| mangkukulam | Mangkukulam | Aswang na Reyna | Curse mage (DoT/spread/drain) | ✅ IMPLEMENTED — PLAYABLE class, not NPC |
| panday | Panday | Panday ng Bulkan | Smith bruiser | ✅ IMPLEMENTED |

## Advancement (current implementation)
- Lv20 + gold cost via 🌟 flow (PHASE 2 module); grants perk stat bonuses + display name/icon.
- Spec §7 data schema (requiredLevel/cost/model/portrait JSON) = PLANNED (Phase 1/5 extraction).
- Advanced-form unique MODELS (new Bagani/Eskrimador/Mangangaso visual identities) = PLANNED, owner will supply concepts/GLBs.

## Skills — SKILL SYSTEM v1 (IMPLEMENTED 2026-09-07, owner spec docs 00–10)
- 90 data-driven skills in data/skills/definitions.json: per class 6 active + 3 passive + 1 ultimate.
- Branches: UGAT (core) / PAG-ATAKE (offense) / DEPENSA (defense) / KAKAIBA (specialty) / DAKILA (ultimate).
- Ranks: core active R5 · advanced active R3 · passive R3 · ultimate R1. 1 skill point/level from Lv2.
- Prereq chains per class; ultimates gate at Lv20 + core R3.
- Generic 14-type effect engine (melee/proj/dash/buff/taunt/heal/shield/cleanse/zone/summon/pmod/cond/stack/regen) — no per-skill functions.
- 3 equip slots drive the HUD skill buttons; ☰ → 🌟 Skills opens the tree (learn/upgrade/equip/respec).
- Signature mechanics: Mandirigma Fury stacks · Arnisador Flow + reflect guard · Panday Heat + burn imbue ·
  Mangangaso traps/marks/hawk summon · Tirador stillness + guaranteed crits · Alim elemental ultimate ·
  Babaylan heals/wards/cleansing · Anino backstab/stealth-regen · Mangkukulam DoT boost/spirit summon/curse spread.
- Skills 11–20 per class: PLANNED (names reserved in owner spec docs 02–05; schema already supports them).
- Old saves auto-migrate: legacy-equivalent starter skills granted, points backfilled by level, never negative.

## Mangkukulam kit (reference)
🪡 Kulam na Karayom cd5 160% + bleed/kulam mark, death-spread ≤3 targets in 10u
🟢 Usok na Lason cd11 poison field r6/4s @8u · 🩸 Sumpa ng Dugo cd16 300% + 50% lifedrain

## Skills 11–20 — SHIPPED 2026-09-08 (Phase 9d)
All 9 classes now have 20 skills (data/skills/definitions.json, 180 defs total).
New band: requiredLevel 22–60, second ultimate at 60 gated on the first ultimate.
Design intent per class: mandirigma = fortress/earth CC · arnisador = flurry/flow tempo ·
mamamana = arrow rain/marks · tirador = pellets/burn burst · alim = four elements ·
babaylan = heal zones/spirit summons · panday = forge fire/burn-on-hit · anino =
shadow burst/dot-leech · mangkukulam = curse dots/marks. Boss status resistance
(doc 08) shipped alongside — see config.bossResist.
