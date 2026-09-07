# AGIMAT ONLINE — ENEMY BIBLE
*Tier system per owner CSV + master spec §8. World bosses are a SEPARATE category (§32) — never in normal spawn pools.*

## Tier 1 — Common (Lv1–5 zones)
| id | Name | minLevel | HP | Notes |
|---|---|---|---|---|
| tiyanak | Tiyanak | 1 | 60 | starter melee |
| duwende | Duwende | 1 | 45 | fast, weak |
| nuno | Nuno sa Punso | 2 | 95 | tanky common |
| — camps: tiyanak 10,33/33,18/46,44 · duwende 6,22/14,36/50,32 · nuno 24,28/14,44/8,6 |

## Tier 2 — Uncommon/Guardian (Lv4–9)
| sigbin | Sigbin | 4 | 130 | leaper · camps 28,52/40,5/88,52 |
| tikbalang | Tikbalang | 6 | 230 | charger · 40,7/38,35/30,60/88,20 |
| wakwak | Wakwak | 7 | 300 | flyer · 43,7/158,36/176,38 (night-preference PLANNED §9) |
| berberoka | Berberoka | 8 | 400 | swamp bruiser · 106,52/20,70/160,63/178,64 |

## Tier 3 — Elite (Lv8–15)
| santelmo | Santelmo | 8 | 260 | fire wisp · 44,23/96,34/104,40 |
| kapre | Kapre | 10 | 460 | tree giant · 33,6/118,60 |
| aswang | Aswang | 12 | 420 | shapeshifter · 106,58/78,62 (night-hunt PLANNED §9) |

## Tier 4 — Mythic/Champion (Lv14+)
| bungisngis | Bungisngis | 14 | 1600 | one-eyed giant · 182,52/172,46 (tier label upgrade Elite→Mythic PLANNED) |

## World bosses (separate scheduler, WBOSS) — IMPLEMENTED
Bakunawa · Minokawa · Sarangay (timed spawns, party-scale HP, contribution loot)
Manananggal = dungeon champion (Pusod, Lv20). Spec §32 schema extraction = PLANNED Phase 1.

## Spawn architecture — DATA-DRIVEN since Phases 1+4
- data/enemies/definitions.json — species stats/tiers
- data/maps/spawns-main.json — territorial camps (tile coords) + campRadius
- data/enemies/spawn-rules.json — cap 40, interval 1600ms, tier weights {C:5,U:2.6,E:1.6}, min player distance, HP level-scaling 1.06
- data/bosses/world-bosses.json — boss defs, schedule (15min first / 30min respawn / 2min warning), spots, nightOnly
Species stay clustered in their own camps (standing owner rule); minLevel gates the pool.

## Night Ecology — SHIPPED 2026-09-08 (Phase 9b, spec §9)
Aswang and Wakwak are true night hunters: they cannot spawn in daylight, surge after
dusk (extra spawn rolls, small overflow budget above maxEnemies), and slink away at
dawn without dropping loot. Configured in data/enemies/spawn-rules.json → nightRules.
Santelmo keeps its dusk/night-only rule; the night-tribe +40% HP / +50% dmg buff and
Bakunawa's nightOnly hold are unchanged.
