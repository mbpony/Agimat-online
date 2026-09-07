# AGIMAT ONLINE — World/Map Asset Delivery Spec

## TL;DR — what to send me
| # | What | Format | Why |
|---|---|---|---|
| 1 | **Map props & buildings** (trees, huts, rocks, shrines, bridges, gates, portal arch…) | **`.glb`** — one file PER PROP | I place them via `data/world-spec.json`; game keeps its own terrain & collision |
| 2 | *(optional)* placement plan | hand-drawn sketch over the minimap, or a list "balete tree at tile 40,7" | otherwise I place them artistically myself |

**Please do NOT send:** `.spz` (Gaussian splats — not supported by our Three.js r160 pipeline,
huge files, no collision, wrong look for low-poly), `.fbx`, `.obj`, `.blend`, or one giant
whole-map `.glb` (breaks culling/LOD, collision, minimap, spawn logic — see below).

## Why individual props instead of one big map mesh
- Our terrain is **procedural**: heights, water, collision grid, minimap, enemy camps,
  quest positions are all computed from code. A monolithic mesh would fight all of that.
- Small props = frustum culling works, mobile GPUs survive, and we can reuse
  (1 balete tree GLB → 40 placements).
- You can still redesign zones! Send e.g. 6 forest props + a sketch and I retheme a whole zone.

## Prop budgets (same as character spec)
- Props: **≤ 1,500 tris**, 1 material, ≤512px texture (PNG in the GLB is fine)
- Buildings/landmarks: **≤ 4,000 tris**, ≤1024px
- Pivot at the BASE (feet on ground), +Y up, real-world meters (a hut ≈ 4–6m tall)
- No lights/cameras inside the GLB; emissive maps welcome (lanterns, runes!)

## Priority wishlist (in order of visual impact)
1. Balete tree (huge, gnarly — Gubat ng Balete signature)
2. Nipa hut + stilt house variants (town + fields)
3. Ifugao stone shrine / rice terrace wall pieces
4. Bamboo clump (Kawayan Grove)
5. Mangrove tree (Bakawan Swamp)
6. Grand Tiangge pavilion (big landmark, ~12m)
7. Soul-portal stone arch w/ Anito faces
8. Volcanic rock / lava vents (Bulkan Apolaki)
9. Beach palms + outrigger bangka boat
10. Standing Baybayin rune stones

## How placement works (already live in game.js)
`data/world-spec.json`:
```json
[
  {"model":"assets/world/trees/balete.glb","tx":40,"ty":7,"height":9,"collideR":1.6},
  {"model":"assets/world/vegetation/bamboo_clump_a.glb","tx":20,"ty":30,"count":25,"jitter":6}
]
```
Drop GLBs in `/assets/world/<category>/` (trees, buildings, vegetation, …), list them in the JSON, refresh — done.
