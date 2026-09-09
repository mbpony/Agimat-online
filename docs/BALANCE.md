# AGIMAT ONLINE — SKILL BALANCE REPORT
*Generated 2026-09-09 by `npm run balance` (`tools/balance.js`). 180 skills, 9 classes.*

Regenerate any time with `npm run balance`, or drill into one class with
`node tools/balance.js --show mandirigma`.

## What the model does — and does not — measure

Formulas are read directly out of `game.js`, not invented:

| Engine fact | Source |
|---|---|
| `atk(L) = base.atk + growth.atk*(L-1)` | `computeStats` |
| `points(L) = max(0, L - 2 + 1)` → 59 at Lv60 | `pointsEarned` |
| `rankUp(v,pr) = v + pr*(rank-1)` | `execEffect` |
| `dmg = atk * mult * U(0.85,1.15)`, crit ×`critDmg/100` | `rollDamage` |
| melee = one `mult` to every enemy in radius | `case 'melee'` |
| proj = `count` shots, spread, single target sees one | `case 'proj'` |
| zone `kind:'dps'` = `atk * val` per second, 500 ms ticks | tick `setInterval(...,500)` |
| summon = `dps` per second, **flat** (not atk-scaled) | same tick loop |
| enemy DoT = `dps` per second, **flat** | same tick loop |
| only 3 actives can be equipped | `config.activeSlots` |

Build policy: enumerate every 3-active combination, pre-seed the prerequisite
chain, then greedily buy the rank that best improves the objective. Separate
optimal builds are computed for single-target and for AoE.

**Not modelled:** gear, runes, enhancement, food, set bonuses, talents, enemy DEF,
boss status resistance, mark/shred amplification, party bonus, mobility and
survivability. Crit is applied only to direct hits, since only `rollDamage` crits.
This answers *"are the 180 skills in the same weight class"*, not *"is it fun"*.

---

## Finding 1 — Lv60 ultimates are all reachable ✅

Fixed this session: 7 of 9 classes had `requires: null` on their Lv60 ultimate,
contradicting the Phase 9d note that it should gate behind the Lv20 ultimate.
All 9 now gate. The gate is cheap and safe:

- prerequisite chain costs **4 points**, ult itself **1** → **5 of 59 points**
- every class can reach it with 54 points to spare

Snapshot before the change: `legacy/skills.pre-ultgate.json`. Verified the diff is
exactly 7 `requires` fields and nothing else (deep-compared, key-order-insensitive).

## Finding 2 — RETRACTED ❌ skill points are *not* oversupplied

**This finding was wrong. Do not act on it.**

The original claim was that players earn 59 points at Lv60 but the optimal build
uses only 13–24, so progression stalls around Lv35. That was an artifact of the
simulator valuing **DPS only**. A DPS-optimal 3-slot build genuinely does stop
needing points — but real players keep buying defensive and utility ranks.

`npm run balance` §1 now reports both numbers:

```
   class            ranks  dps build  full build  truly left
   babaylan            63      18/59       59/59           0
   mandirigma          63      13/59       59/59           0
   tirador             65      24/59       59/59           0
   ...all 9 classes: 59/59, 0 left
```

Every class absorbs all 59 points once defensive ranks are counted. **The tree
was never oversupplied.** The original measurement answered "when does the
*damage* side finish" and I reported it as "when does *progression* finish".

I also tried raising `maxRank` 3→5 on the 40+ passives to "fix" this. Measured
against the corrected metric it changed nothing (59/59 either way) while buffing
the already-strong classes, so it was **reverted**. Ranks remain 62–65.

Lesson recorded so it is not repeated: a model that optimises one axis cannot be
used to claim a resource is wasted.

## Finding 3 — mandirigma is a real outlier, and the cause is ATK growth ⚠️

Lv60 single-target DPS, optimal 3-slot build:

```
anino          327  +31%
arnisador      317  +27%
alim           307  +23%
tirador        264   +6%
mangkukulam    250    0%   (median)
panday         247   -1%
mamamana       223  -11%
babaylan       202  -19%
mandirigma     161  -35%
```

AoE tells the same story, worse: mandirigma **161 (−44%)** vs anino **374 (+29%)**.

Diagnosis — it compounds, and neither half alone explains the gap:

| | mandirigma | anino | ratio |
|---|---|---|---|
| ATK at Lv60 | 139 | 208 | 1.50× |
| best-3 skill mult/cd | 0.700 | 0.900 | 1.29× |
| **modelled DPS** | **161** | **327** | **2.03×** |

mandirigma is the designated **Tank** (1192 HP, 93 DEF — highest in the game), so
*some* DPS deficit is intended. But 5 of its 13 non-passive skills deal zero
damage (`md_panangga`, `md_sigaw`, `md_ninuno`, `md_sigaw2`, `md_moog`), including
its Lv20 ultimate `md_ninuno`, which is `buff+buff+buff`. Compare panday — also a
front-liner (Bruiser, 1064 HP) — which sits at only −1% single / −15% AoE.

**Recommendation:** don't touch base stats; they carry the tank identity. Buff the
multipliers instead. `md_durog` (1.8 @ 10 s) and `md_bagsak` (2.2 @ 10 s) are the
skills actually carried in every build — raising those, or giving `md_hukbo`'s
3.0/75 s real weight, closes most of the gap without changing his role.

## Finding 4 — early game is less balanced than endgame ⚠️

The spread at Lv10 is wider than at Lv60:

```
Lv10   alim +37% · mandirigma −33% · panday −29% · babaylan −47%
Lv60   anino +31% · arnisador +27% · mandirigma −35% · babaylan −19%
```

(±25% is the flag threshold; at Lv10 four classes breach it, at Lv60 only three.)

babaylan recovers (−47% → −19%) as support tools come online; mandirigma does not.
First impressions matter more than Lv60 parity, so Lv1–15 is where to spend
balancing effort.

## Finding 5 — panday has a power cliff at Lv28

```
Lv10    25
Lv20    57
Lv30   118   ← 2.1× jump
Lv40   151
```

`pd_pukpok` (Lv28, `melee 1.3 + melee 1.3`, 12 s) is a double-hit that outscales
everything before it. Combined with the `pd_baga` atkPct passive at Lv25, panday
goes from weakest-at-Lv10 to mid-pack in eight levels. Consider moving one of them
earlier or smoothing `pd_pukpok`'s multipliers.

## Finding 6 — 23 actives deal no direct damage (expected)

Shields, taunts, dashes, heals, cleanses — correct for support and tank kits.
Listed in full by `npm run balance` §6. Not a defect; recorded so it is not
re-flagged later.

---

## Implemented 2026-09-09 — results

All tuning applied to `data/skills/definitions.json`. **47 value changes, 47
lines, no code changes, no base-stat changes.** Re-run `npm run balance` to
reproduce.

### Outliers: 22 → 0

Single-target DPS vs class median, ±25% threshold:

| checkpoint | before | after |
|---|---|---|
| Lv10 | 4 classes breach | 0 |
| Lv20 | 3 | 0 |
| Lv30 | 3 | 0 |
| Lv40 | 3 | 0 |
| Lv50 | 3 | 0 |
| Lv60 | 3 | 0 |
| **total** | **22** | **0** |

### Before → after DPS curve

```
class             Lv10        Lv20        Lv40        Lv60
babaylan        18 → 28     41 → 62    119 → 171   202 → 285
arnisador       42 → 40     81 → 78    216 → 199   317 → 292
tirador         35 → 36     74 → 80    156 → 171   264 → 284
alim            48 → 44    100 → 92    210 → 194   307 → 284
mandirigma      23 → 31     53 → 73    110 → 156   161 → 228
mamamana        34 → 37     74 → 85    140 → 160   223 → 250
anino           38 → 36     93 → 90    197 → 186   327 → 307
mangkukulam     41 → 41     77 → 77    176 → 176   250 → 250
panday          25 → 27     57 → 64    148 → 153   247 → 251
```

### AoE spread tightened

mandirigma −44% → **−22%**, anino +29% → **+23%**. Full range now −22% to +26%.

### What was changed, and why

**mandirigma** (was −35% single / −44% AoE, worst in game). Base stats untouched
to preserve the Tank identity — multipliers raised instead: `md_hampas` 1.5→2.1,
`md_sugod` 1.2→1.6, `md_walis` 1.3→1.7, `md_durog` 1.8→2.9, `md_bagsak` 2.2→3.3,
`md_alon` 1.7→2.2, `md_piitan` 0.9→1.5, `md_hukbo` 3.0→4.5 + cd 75→65.

**babaylan** (was −47% at Lv10). Root cause: it has exactly **one** damage skill
before Lv15, so at Lv10 it spent 4 of 9 points with nothing to buy. Fixed by
shortening `ba_tawag` cd 4→3 and lifting `ba_bulalakaw` (0.8→1.1, cd 9→8),
`bb_hampas2` (1.6→2.0), `bb_sumpa2` (1.5→1.9, cd 13→12), `ba_panawagan` (1.5→2.2).

**mamamana** (weakest secondaries in the game, best-3 rate 0.632). Lifted
`mm_lason` 1.0→1.45, `mm_tanda` 1.2→1.8, `mm_tatlo` 0.95→1.5, `mm_lason2` 1.3→2.0,
`mm_agila` 2.5→3.2.

**tirador** `ti_tudla` 1.8→2.2, `ti_bihira` 2.2→2.8, `ti_talbog` 1.2→1.7,
`ti_pabuya` 1.8→2.1. **panday** `pa_hampas` 1.6→1.8, `pa_pukpok` 1.7→2.0.

**Trimmed the top three** (each was >+25% at several checkpoints):
`ar_ulan` 0.6→0.48 ×5 hits, `al_kidlat` 2.2→1.8, `al_siklab` 1.6→1.45,
`ar_hagod` 1.4→1.25, `an_talim` 1.5→1.35, `an_saksak2` 1.7→1.5.

> ⚠️ `ar_ulan` is a 5-hit combo. Editing only its first effect would have raised
> it from 3.0 to 4.8 total — a buff disguised as a trim. Caught by checking the
> effect count before patching. Watch for this on any multi-hit skill.

### Not fully resolved

**panday's Lv28 cliff is reduced, not removed**: the Lv20→Lv30 jump went
2.07× → **1.86×**. It is driven by three unlocks clustering at Lv22 (`pd_palo2`),
Lv25 (`pd_baga` passive) and Lv28 (`pd_pukpok`). Flattening it further would mean
moving skills between level bands, which is a progression-design change rather
than a tuning one — left for a deliberate decision.

### Save compatibility

Verified safe. Nothing strips learned skills on load — only the explicit
`respec()` button clears `S.sk.learned` (`game.js:11243`, wired to a UI click at
`:11675`). Existing saves keep every skill and rank they had.

---

## Suggested priority

1. ~~**Lv1–15 tuning**~~ ✅ done — babaylan/panday/mamamana lifted, 0 breaches at Lv10
2. ~~**mandirigma multipliers**~~ ✅ done — −35% → −20% at Lv60, no longer flagged
3. ~~**Late-game point sink**~~ ❌ **was a non-issue** — see retracted Finding 2
4. 🔶 **panday Lv28 cliff** — reduced 2.07× → 1.86×, needs a progression-design
   decision to go further (moving skills between level bands)

Re-run `npm run balance` after each change; §3/§4/§5 will show whether the spread
actually narrowed.
