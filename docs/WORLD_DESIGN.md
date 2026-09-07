# AGIMAT ONLINE — WORLD DESIGN
*Status labels: IMPLEMENTED / PARTIALLY / PLANNED / PROVISIONAL.*

## Current world — IMPLEMENTED
- One procedural map, 192×105 tiles (TILE=4): mainland (x<134) + Isla ng Bathala (142–192×30–70, Lv10 portal).
- Main map identity: **Barangay Liwanag** — Banaue-inspired rice terraces + lowland barangay (spec §29). Beauty pass shipped.
- **Grand Tiangge** = walled safe hub, TOWN 58–75×37–50, gates all sides, healing, 4 NPC shops, portal 71.5,43.5. Permanent anchor (spec §30).
- Zones zn0–9 = content configuration (NOT permanent architecture per §28).
- Volcano region tx112,ty28 r22; river with bridge crossings; deterministic seed.

## Dungeons — IMPLEMENTED (as pocket arenas), separate-instance rework PLANNED (§13/§14)
| id | Name | minLevel | Champion | Mult |
|---|---|---|---|---|
| balon | Balon ng mga Anito | 5 | Tikbalang | 1.0 |
| yungib | Yungib ng Kapre | 12 | Kapre | 1.35 |
| pusod | Pusod ng Dilim | 20 | Manananggal | 1.7 |

## Future maps — PROVISIONAL ONLY (spec §28: DO NOT lock)
Candidates discussed, none approved as canon: Banaue/Barangay Liwanag split · Marikina River Swamps · Mount Makiling · Chocolate Hills · Isla ng mga Kaluluwa.
Architecture requirement: MapManager loads/unloads map configs independently (PLANNED Phase 3).

## Prop placement — IMPLEMENTED
data/world-spec.json → loader instantiates GLBs (ground-snap, collision radius, count+jitter scatter) with zero code changes. Owner supplies props via Hunyuan3D 2.1 (docs/AI_MAP_GENERATION_PROMPTS.md). No monolithic world GLB — ever (§12).
