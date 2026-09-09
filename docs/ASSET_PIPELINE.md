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
axis. Both compositor paths now fit the hair's bounding box to the skull's on
all three axes (×1.06 overshoot so no scalp shows) and centre it on the head
box. Verified for all 4 wigs × 2 genders: hair spans y 1.529–2.631 against a
crown at 2.600, and the rigged and static paths place it identically.

Also fixed: outfits were authored off the body's centre line (`outfit_male` by
0.0137, i.e. 0.031 game units) and are now shifted by the baked `alignX/Y/Z`;
the arbitrary `K*1.02` outfit overshoot that pushed the collar ~0.10 units above
the crown is gone; the rig path's hard-coded `K = 2.6/1.16` now reads the
measured body height; and `window._customMetrics` is awaited before the rig path
reports ready, closing a race that made `hair_f1` render 55% too small.

## Priority prop order (spec §16)
1 balete tree · 2 nipa hut · 3 bamboo clump · 4 rice-terrace wall · 5 Ifugao shrine · 6 volcanic rock · 7 bangka boat · 8 rune stone · 9 parol lamp · 10 Grand Tiangge landmark · 11 soul portal · 12 misc scatter
