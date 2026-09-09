# Barangay Liwanag (Banaue Highlands) — Concept Feasibility Inspection

> Companion to: `Agimat_Online_Luzon_World_Map_Concept_and_Phase_Plan.md` (the master
> world doc) and the illustrated starting-map concept art
> (`assets/maps/barangay-liwanag-concept.png`, 1536×1024).
>
> Verdict up front: **YES — the design is realizable.** The *map screen / minimap look*
> can adopt the artwork almost immediately (high feasibility, small change). Making the
> *playable 3D terrain* match the illustration is a real art/level-design pass (the doc's
> Phase 3 vertical slice). Making all 19 Luzon maps live instances is an architecture
> project the doc already phases (0→10). Details below.

---

## 1. What the concept art actually specifies

The art is a **top-down illustrated region map** of the starting zone, with:

- **Title block** — "Agimat Online · Barangay Liwanag · Banaue Highlands · Starting Map (Lv 1–10)".
- **Named POIs with level bands** (these double as the spawn/quest/zone layout):
  | POI | Type | Lv |
  |---|---|---|
  | Barangay Liwaang | Main town | – |
  | Hagdan-Hagdang Palayan | terraces / farming | 1–5 |
  | Batis ng Pag-asa | spring / fishing | 2–4 |
  | Tanawin ng Liwanag | viewpoint | 3–6 |
  | Gubat ng Balete | forest / resource | 4–8 |
  | Talon ng Liwanag | waterfall | 5–8 |
  | Bangin ng mga Anito | cliffs / monster | 6–9 |
  | Kuweba ng mga Espiritu | dungeon | 7–10 |
  | Bayang ng mga Anito | ancient ruins | 8–10 |
- **3 edge portals** — North→Sagada, East→Isabela, South→Mt. Pinatubo (matches doc MAP 01).
- **A legend** — your-location, town, NPC, quest, shop, blacksmith, inn, portal, dungeon,
  viewpoint, resource, fishing, monster-zone, path styles, boundary. This is effectively a
  spec for map-marker iconography.
- **An inset minimap** (top-right) and a **Map Information panel** (bottom-left) describing
  region, level, environment, weather, features, connected maps.
- Rivers, waterfalls, terraced fields, a central town — i.e. a *geographic* layout, not just
  decoration.

So the art is simultaneously: (a) a **UI skin** for the map screen, and (b) a **level-design
blueprint** (where zones/POIs/portals sit). Both are usable, at different effort levels.

---

## 2. How the current game renders its map (inspection results)

| Concern | Current reality | Code anchor |
|---|---|---|
| World | ONE continuous procedural tile-grid (mainland + east isle), `MAP_W×MAP_H = 192×105`, `TILE=4` → world `768×420`. No map instances. | game.js:505,508,511 |
| Minimap (HUD corner) | `mmBase` 150×120 canvas painted procedurally from `grid`/`zoneGrid`; `drawMinimap()` re-draws it + enemies/drops/party/player each frame. | game.js:3996–4060 |
| Full map (inventory "Map" tab) | `<canvas id="i2-map" 768×420>`; `i2DrawMap()` scales `mmBase` up and stamps text labels + player marker; re-drawn on a 1.5s interval. | game.js:9671, 9967–9996 |
| 3D terrain | `PlaneGeometry(WORLD_W, WORLD_H, MAP_W, MAP_H)` with per-zone vertex-color tints; props from `assets/world/*` + `/data/world-spec.json`. | game.js:1036, 11094 |
| Transition | `#map-trans` overlay exists but only for **town↔isla** (2 zones), with lore text + Baybayin rune — already matches the doc's transition *vibe*. | game.js:12143–12170, used at 6876 |
| Multi-map / world-map screen | **None.** Portals are only town↔isla. No MAP_02… instances, no discovered-regions world map. | — |

Key insight: the full-map tab is already "base image + dynamic overlays." That is *exactly*
the architecture needed to swap the procedural base for the illustration. So **(a) is a small,
low-risk change**; the game already separates "static base" from "live markers."

---

## 3. Feasibility, by layer

### Layer A — Make the map *screen* look like the art (HIGH feasibility, ~small)
- Replace the base that `i2DrawMap()` blits (`mmBase`) with the artwork (or a map-specific
  base texture) and keep stamping live markers (player, party, bosses, POIs) on top.
- The artwork is 1536×1024 (aspect 1.5) while the world is 768×420 (aspect ≈1.83) and the tab
  canvas is 768×420. So we must define an explicit **art↔world projection** (calibrated
  affine, or per-POI normalized anchors) rather than a naive stretch. The HUD minimap can
  keep the cheap procedural base for perf, or show a cropped region of the art.
- Add the legend/iconography as a DOM/panel beside the canvas (the art's legend is a ready
  spec). This is all UI; no gameplay/terrain risk. **This is the quick win.**

### Layer B — Make the *3D terrain* resemble the art (MEDIUM–HIGH, the doc's Phase 3)
- Terrain is procedural + vertex tints; the art implies terraces, waterfalls, rivers, a
  central town. Matching it means authoring a heightmap/zone layout + placing props from the
  existing `assets/world/*` kits (terraces, waterfalls, balete trees, houses). Feasible — the
  kits and `world-spec.json` prop system already exist — but it is a genuine level-design +
  art pass, not a code tweak. The doc correctly says: do the instance system first, then a
  polished Barangay Liwanag vertical slice.

### Layer C — 19-map instance network (ARCHITECTURE project, doc Phases 0–10)
- Current code has a single world and a 2-zone transition. The doc's instance/portal/loading/
  save-state design (§12, §20, §21) is sound and matches what must be built. This is a
  multi-phase effort; do **not** start here. Phase 0/1 (world data + a 2-instance proof:
  `Starting → Test → Starting`) is the right first engineering step.

---

## 4. Recommended order (aligned with doc §26, adapted to what exists)

1. **(Quick win, now)** Layer A: use the artwork as the Map-tab base + overlay live markers +
   a legend panel. Proves the look the owner wants with minimal risk. Compress the PNG first
   (3.7 MB is too heavy; target a ~200–400 KB webp/jpg at 1024–2048 px).
2. **Phase 0/1** — lock map/portal IDs + build the 2-instance proof using the existing
   `#map-trans` as the loading screen; extend it beyond town↔isla.
3. **Phase 3** — Barangay Liwanag vertical slice: re-author `zoneGrid`/heightmap + place
   `assets/world` props to echo the art's terraces/river/town; wire the art's POIs as zones.
4. **Phase 4+** — first real portal (→ Sagada), then the rest per the doc's order.

---

## 5. Concrete integration points for Layer A (if we proceed)

- `assets/maps/` — add compressed artwork (staged, currently `barangay-liwanag-concept.png`).
- `renderMMBase()` (game.js:3996) — keep for HUD minimap (perf) OR switch to a cropped art region.
- `i2DrawMap()` (game.js:9967) — load the art as an `Image`, blit it instead of `mmBase`, then
  stamp POI pins (from a normalized POI table derived from the art) + player/party/boss markers.
- New POI table — normalized (0..1) art coords for the 9 POIs + 3 portals + legend mapping.
- A side panel (DOM) for the legend + Map-Information block, styled to the existing
  dark-purple/gold UI so it matches the rest of `#inv2`.

---

## 6. Risks / caveats

- **Aspect mismatch** (1.5 vs 1.83): needs a deliberate projection, else markers drift off the
  art's geography. Calibrate against 2–3 anchors (town, dungeon, a portal).
- **Texture weight**: compress before shipping; a 3.7 MB PNG hurts browser/mobile load.
- **Terrain ≠ art**: shipping Layer A alone makes the *map screen* beautiful while the 3D world
  stays procedural. That's expected and fine; terrain parity is Layer B (Phase 3).
- Do not attempt all 19 maps at once (doc §24): a few polished maps > many unfinished ones.

---

### Bottom line
The artwork is a **high-quality, implementable spec**. The fastest, lowest-risk way to make the
game "look like that" is **Layer A (map-screen skin + markers)**, which the existing
`i2DrawMap()` base-image architecture supports directly. Full geographic parity in 3D and the
19-map network are exactly the phased work the `.md` describes and should follow, not precede.

---

## 7. Status — Layer A IMPLEMENTED (2026-09-10)

- Compressed artwork shipped at `assets/maps/barangay-liwanag.jpg` (1280w, ~374 KB).
- `#i2-map` canvas resized to the art's 1.5 aspect (1280×854); Map tab now shows the
  illustrated region map full-bleed with a header, live legend, and live markers
  (player "IKAW", ka-party, world boss) projected into the art's illustrated area
  (`ART_VIEW`), so pins stay off the baked-in legend/info panels.
- Falls back to the procedural `mmBase` if the art hasn't loaded. HUD minimap unchanged.
- Verified via `tools/pw-map.js` screenshot (`docs/map-preview.png`).
- NOTE: a pre-existing, unrelated pageerror exists in `ensurePeriodQuests` (game.js ~7340,
  quest pool indexing). Not caused by this change; tracked as a separate follow-up fix.

## 8. Status — Phase 0 & 1 IMPLEMENTED (2026-09-10)

- **Phase 0 (World Map Data System):** `WORLD_MAPS` registry in game.js defines map ids,
  names, regions, level bands, enemy/loot tiers, resources, spawn points, portals and
  minimap art (`map_starting` = Barangay Liwanag; `map_test` = Mt. Pinatubo TEST instance).
- **Phase 1 (Map Instance Manager):** `window.changeMap(toId,spawnId)` shows the loading
  transition + destination lore, respawns the player at the destination spawn point,
  persists `S.currentMap`/`S.spawnPoint`, and swaps the region art/header. Portal proximity
  triggers round-trip between instances. On login the player respawns at their saved map.
- Verified (`tools/pw-instance.js`): `map_starting → map_test → map_starting` round-trip with
  correct spawns and zero console errors.
- Deferred: per-map 3D terrain (Layer B / Phase 3) and per-map fog/sky tint (the day/night
  system currently owns fog color).

## 9. Status — Sagada Highlands (LZ-R02) data+art integration (2026-09-10)

- Compressed regional art shipped at `assets/maps/sagada-highlands.jpg` (1280w ~317 KB).
- `WORLD_MAPS.map_sagada` added: name/region/icon, Lv 10–25, enemy/loot tier 2, resources,
  cool-misty fog, lore, the 7 zones (Z1–Z7 with level bands per spec v3), spawn `arrival`,
  and a return portal. Banaue's portal now leads to `map_sagada` (canonical south link).
- Map tab shows the Sagada art + header; round-trip Banaue↔Sagada verified
  (`tools/pw-sagada.js`, `docs/sagada-map.png`), zero console errors.
- Per-map 3D terrain (true Layer B) remains the next dedicated, carefully-verified step.
