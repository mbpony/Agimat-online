# AGIMAT ONLINE — MASTER DESIGN (index)
*Single entry point. Every doc describes CURRENT reality with status labels (IMPLEMENTED / PARTIALLY IMPLEMENTED / PLANNED / PROVISIONAL). Never mark planned work as delivered.*

## Vision
Zenonia-style real-time 3D action RPG in a Filipino-mythology world. Browser WebGL, up to
5 concurrent players per channel (50-player infra target), mobile + desktop, cultural
authenticity first, no pay-to-win (GCash cosmetics only — PLANNED).

## Document map
| Doc | Contents |
|---|---|
| ARCHITECTURE.md | Current code reality: file map, game.js section map, wrap chains, contracts, hazards |
| MIGRATION_STATUS.md | Restructure phase tracker + spec-compliance table + next proposed step |
| CLASS_DESIGN.md | 9 classes, permanent save IDs, Lv20 advanced display names, skills |
| ENEMY_BIBLE.md | 4-tier hierarchy, camps, world-boss separation |
| WORLD_DESIGN.md | Barangay Liwanag main map, Grand Tiangge anchor, dungeons, provisional future maps |
| UI_UX.md | HUD target layout, ☰ menu categories, contextual UI rules |
| ASSET_PIPELINE.md | GLB budgets, folder targets, Hunyuan3D workflow |
| PERFORMANCE.md | Implemented optimizations + planned pooling/LOD |
| SECURITY.md | Honest current posture + Phase-7 server-authority plan |
| CHANGELOG.md | Dated change log |
| AI_MAP_GENERATION_PROMPTS.md | Prop-generation prompt pack for owner |
| WORLD_ASSET_SPEC.md / ASSET_PRODUCTION_LIST.md / ELDER_ALIM_ART_BIBLE.md / ROADMAP.md | Earlier deliverables (still valid) |

## Non-negotiables (from Master Restructure Spec)
1. Never break working gameplay; incremental migration only; test after every phase (§35).
2. Save IDs permanent; schema changes ship with migrateSave_vX_to_vY (§36).
3. 9 playable classes final; Mangkukulam is playable.
4. No monolithic world GLB; data-driven prop placement; registries not hard-coded paths.
5. World bosses separate from mob pools; dungeons become instances (planned).
6. Server becomes authoritative for economy before real launch.
7. Docs tell the truth (§33).
