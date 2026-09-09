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

## Finding 2 — skill points are oversupplied past ~Lv35 ⚠️

| class | ranks available | points the optimal damage build uses at Lv60 | left over |
|---|---|---|---|
| mandirigma | 63 | 13 | **46** |
| babaylan | 63 | 18 | 41 |
| arnisador | 63 | 18 | 41 |
| mangkukulam | 64 | 18 | 41 |
| mamamana | 65 | 19 | 40 |
| panday | 63 | 19 | 40 |
| alim | 62 | 20 | 39 |
| anino | 64 | 21 | 38 |
| tirador | 65 | 24 | 35 |

With `maxRank: 5` and only **3 equip slots**, the damage side of a build is
essentially finished for 13–24 points. Players earn 59.

*Caveat, stated honestly:* the model only values DPS. A real player would sink
leftovers into defensive and utility passives, so the points are not literally
wasted. The real symptom is that **skill progression stops feeling rewarding
around Lv35** — after that, levels grant points with nowhere meaningful to go.

Options: raise `maxRank` on late-band skills, add more passives in the 40–60 band,
or taper point gain after Lv40.

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

## Suggested priority

1. **Lv1–15 tuning** — widest spread, highest impact on new players.
2. **mandirigma multipliers** — `md_durog` / `md_bagsak` / `md_hukbo`.
3. **Late-game point sink** — more 40–60 passives, or higher `maxRank` late.
4. **panday Lv28 cliff** — smooth or redistribute.

Re-run `npm run balance` after each change; §3/§4/§5 will show whether the spread
actually narrowed.
