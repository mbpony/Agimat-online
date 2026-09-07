# AGIMAT ONLINE — PERFORMANCE
*Target: 5 players + ~40 enemies, mobile browser WebGL.*

## IMPLEMENTED
- Frustum culling (Three.js default) + fog-limited draw distance (70/185)
- GLB cache (MODEL_CACHE) — one load per URL, clones for instances
- Procedural terrain in single BufferGeometry; merged static town group
- Mobile breakpoints reduce HUD cost; PCFSoft shadows only on capable GPUs (settings toggle)
- Enemy cap MAX_ENEMIES; spawn throttle 1.6s; labels hidden off-screen
- Optimized GLB ingest pipeline (gltf-transform: 81.7MB→2.6MB proven on mangkukulam)
- BGM = synthesized (no audio downloads); textures procedural (canvas) for terrain

## PLANNED (architecture-first, per spec §26)
- Object pooling for projectiles/FX meshes
- Distance-based enemy simulation LOD (far camps tick at reduced rate)
- Distance-based animation update skipping
- Map-specific asset unloading (needs MapManager, Phase 3)
- Draco/meshopt compression for future GLB batches
