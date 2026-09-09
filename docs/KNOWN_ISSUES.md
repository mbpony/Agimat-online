# AGIMAT ONLINE — Known Issues (owner-reported, 2026-09-09)

Captured from the owner's screenshot + notes so nothing is lost while we fix the
model first. Roughly in priority order.

## ✅ Resolved
- **Character model is a mess** (hair over the face, T-pose in paper-doll, face
  texture bleeding, proportions off). Root cause: the Hunyuan3D chibi parts were
  standalone objects with no shared skeleton, AND they took priority over the
  good KayKit models. Fixed by `CUSTOM_HEROES_ENABLED=false` → the game now uses
  CC0 KayKit models (correct proportions, outfits, weapons, 76 animations).
  See `docs/ASSET_PIPELINE.md`.

## 🔧 Open — UI / layout
1. **Duplicate pet button.** The left sidebar shows "Alaga" (pet) **twice**. One
   should be removed (or the second is a stray duplicate of the same handler).
2. **Paper-doll area too small / cramped.** The character preview is squeezed
   and the equip-slot tiles overlap it. Give the model column more width and
   move/resize the slot grid so they don't sit on top of the model.
3. **Bag Settings hidden behind inventory.** Opening "Bag Settings" shows
   nothing until the inventory panel is closed — the settings window is rendered
   under (or outside) the inventory overlay. It should appear on top, or the
   inventory should auto-close / make room.
4. **Skills screen shows only 3 skills.** The owner sees just 3 skills and
   wonders what skill points are for. Either more of the learned/learnable tree
   should be visible, or the UI should clearly show locked nodes + "spend point"
   affordances so points feel meaningful.

## 📐 Open — longer term
- **Filipino hero art.** Source/author proper Filipino hero models (common
  skeleton, skull-proportioned hair, fitted outfits) and re-enable
  `CUSTOM_HEROES_ENABLED`. Until then KayKit stands in.
- Weapon attach `setInterval(refresh, 2000)` sweeps forever — belongs in the §26
  perf pass (object pooling / event-driven attach).
