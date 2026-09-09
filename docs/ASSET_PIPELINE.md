# AGIMAT ONLINE — ASSET PIPELINE
## Budgets (hard caps, spec §17)
| Category | Tris | Texture | Bones |
|---|---|---|---|
| Player character | ≤8,000 | 1024 | ≤40 |
| Common enemy | ≤4,000 | 512–1024 | ≤40 |
| Elite enemy | ≤6,000 | 1024 | ≤40 |
| Boss | ≤12,000 | 1024 | ≤40 |
| Prop | ≤1,500 | 512 | — |
| Building | ≤4,000 | 1024 | — |
| Pet/mount | ≤3,000 | 512 | ≤40 |
(Exception on record: mangkukulam.glb is 33.5k tris — disconnected-island mesh resists simplify; ACCEPTED for now, redo at source when possible.)

## Target asset tree (spec §15) — directories created, files PLANNED
assets/characters/{base,advanced}/ · assets/enemies/ · assets/npcs/ · assets/pets/ · assets/mounts/
assets/world/{trees,buildings,shrines,vegetation,landmarks,rocks,boats,props,terrain}/ · assets/ui,icons,portraits,audio/
Characters live in assets/characters/ (registry-driven since Phase 2); portraits remain img/ until a later low-risk sweep.

## Ingest workflow (proven on mangkukulam: 81.7MB→2.6MB)
1. Owner generates in Hunyuan3D 2.1 (prompts: docs/AI_MAP_GENERATION_PROMPTS.md), delivers GLB via Dropbox (dl=1).
2. `npx gltf-transform optimize in.glb out.glb --texture-size 512` (+resize/prune/dedup); verify tris/tex vs budget.
3. Register in data/models/registry.json (characters/enemies/pets) or data/world-spec.json (props) — never hard-code paths in code.
4. Test: load time, ground snap, collision radius, shadows, mobile fps.

## 🚨 Active decision (2026-09-09): custom chibi OFF, KayKit ON

The Hunyuan3D chibi parts render as a mess (hair over the face, T-pose in the
paper-doll, face texture bleeding through). They were also **hiding** the good
KayKit models, because the custom path took priority in `buildHero`.

`CUSTOM_HEROES_ENABLED=false` in `game.js` now keeps the chibi path OFF so the
game uses the CC0 KayKit models (correct proportions, matching outfits, working
weapon slots, 76 animations per class, class-tinted per the registry). The
custom compositor code remains as a fallback for when proper Filipino assets
exist. **Set it true only after re-authoring the chibi to a common skeleton +
skull proportions** (see the "wigs are not wig-sized" section below).

Owner confirmed: quality first now, Filipino identity stays the goal. So the
plan is to later source/author proper Filipino hero models (common skeleton,
skull-proportioned hair, fitted outfits) and re-enable the custom path.

## Custom hero parts — metrics must be re-baked after ANY re-export

`data/models/custom-heroes.json` drives how body / outfit / hair are composited.
It is **generated, not hand-edited**:

```bash
node tools/bake-hero-metrics.js --dry   # inspect
node tools/bake-hero-metrics.js         # write
node tools/inspect-models.js            # audit GLBs vs the metrics
```

Re-run it whenever a part under `assets/characters/base/` is replaced, or the
hair/outfit will drift off the body.

### Why (bug fixed 2026-09-09)
The old metrics recorded `headW` as the **widest point of the whole rig** — the
arm-span, 0.8864 — instead of the skull, 0.4415. The compositor scales hair from
`headW`, so hair rendered **2.01× too wide** on male and **2.33×** on female.
Widths had also been baked from the `_rig` files while the static compositor
uses the non-rig files, and the two poses have very different bounding boxes
(`base_male.w` 0.8864 vs 0.6891).

`headW`/`headH`/`headD` are now a **slice of the body at head height**, not a
bounding box. The slice starts at 75% of body height because `base_female` has
geometry spanning the full body width down at y 0.70–0.85. `headH` runs from the
head bone to the crown — the slice alone gives only the upper skull and
under-fits a wig.

### Fitting, not guessing
A single width ratio cannot fit a wig: `hair_m1` is 0.99 × 0.77 but the skull is
0.44 × 0.46, so the proportions differ and a uniform scale always misses one
axis. Both compositor paths now call the shared `_fitHairToSkull(M, HM)`, which
fits the hair's bounding box to the skull's on all three axes (×1.06 overshoot so
no scalp shows) and anchors it to the crown, letting any excess length hang down
rather than bulging symmetrically. Verified for all 4 wigs × 2 genders: hair
spans y 1.50–2.60 against a crown at 2.60, head-sized on every axis, and the
rigged and static paths place it identically.

### ⚠️ The wig assets are not wig-sized — re-author them
Measured 2026-09-09. The skull is 0.4613 tall, but:

| asset | height | × skull | × whole character (1.1534) |
|---|---|---|---|
| hair_m1 | 0.7742 | 1.68× | 67% |
| hair_m2 | 0.7335 | 1.59× | 64% |
| **hair_f1** | **1.0896** | **2.36×** | **94%** |
| hair_f2 | 0.8351 | 1.81× | 72% |

They were generated as standalone objects at their own scale, not authored to a
head. Fitting therefore has to distort them, and `HAIR_DISTORTION_CAP` controls
how much. **Do not tighten it expecting less distortion** — it is the allowed
ratio between the largest and smallest axis scale, so a *lower* cap forces the
wig to keep its own proportions instead, which makes `hair_f1` hang to y 0.46 on
a 2.6-tall character (knee-length). Measured:

| cap | hair_f1 size | hangs down to |
|---|---|---|
| 1.0 uniform | 1.05 × 2.57 × 1.86 | y 0.03 — the floor |
| 1.2 | 1.05 × 2.14 × 1.55 | y 0.46 — the knees |
| 1.5 | 1.05 × 1.71 × 1.24 | y 0.89 — thighs |
| ≥2.33 exact | 1.05 × 1.10 × 1.00 | y 1.50 — shoulders, head-sized |

It is set to **2.5** purely as a safety net for future assets; it does not bind
on the current four. Regenerate the wigs at skull proportions in Hunyuan3D and
the distortion disappears on its own.

Also fixed: outfits were authored off the body's centre line (`outfit_male` by
0.0137, i.e. 0.031 game units) and are now shifted by the baked `alignX/Y/Z`;
the arbitrary `K*1.02` outfit overshoot that pushed the collar ~0.10 units above
the crown is gone; the rig path's hard-coded `K = 2.6/1.16` now reads the
measured body height; and `window._customMetrics` is awaited before the rig path
reports ready, closing a race that made `hair_f1` render 55% too small.

## Priority prop order (spec §16)
1 balete tree · 2 nipa hut · 3 bamboo clump · 4 rice-terrace wall · 5 Ifugao shrine · 6 volcanic rock · 7 bangka boat · 8 rune stone · 9 parol lamp · 10 Grand Tiangge landmark · 11 soul portal · 12 misc scatter
