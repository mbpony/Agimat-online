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

## Priority prop order (spec §16)
1 balete tree · 2 nipa hut · 3 bamboo clump · 4 rice-terrace wall · 5 Ifugao shrine · 6 volcanic rock · 7 bangka boat · 8 rune stone · 9 parol lamp · 10 Grand Tiangge landmark · 11 soul portal · 12 misc scatter
