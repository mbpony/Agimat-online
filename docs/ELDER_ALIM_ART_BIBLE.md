# AGIMAT ONLINE — Elder Alim Character Art Bible
**Reference sheet:** `ref_elder_alim_turnaround.jpg` (front / side / back / ¾ turnaround)
**Class:** Elder Alim / Babaylan (Caster–Support) · **Platform:** Browser WebGL (mobile + desktop)

---

## 1. 3D ARTIST TECHNICAL SPEC SHEET

### A. Model Specifications
- **Style:** Stylized Chibi / Semi-Realistic — head-to-body ratio **1:2.5**
- **Polygon budget:** **2,500–4,000 triangles** (strict — 50-player browser instances)
- **Draw calls:** single texture atlas for body + robes; minimize materials
- **LODs:**
  | LOD | Tris | Use |
  |---|---|---|
  | 0 | 3,500 | Close-up |
  | 1 | 1,500 | Mid-range |
  | 2 | 600 | Far / minimap |

### B. Texture & Material Specifications
- **Resolution:** 512×512 (mobile) / 1024×1024 (desktop) · **Workflow:** PBR Metallic/Roughness
- **Maps:** Albedo (incl. painted Baybayin runes) · Normal (baked from high-poly) · Roughness (skin vs fabric vs wood) · **Emissive** (purple staff orb + rune highlights)
- **Transparency:** no alpha-cutout on the body; alpha-tested only for beard/hair if not geometry

### C. Rigging & Animation Constraints
- Standard **Humanoid rig** (Unity/Godot/PlayCanvas compatible)
- Extra bones: `Jaw`, `Hair_Top`, `Beard_Main/L/R`, `Robe_Front_L/R`, `Robe_Back` (**bone-driven cloth — NO real-time physics cloth**, browser CPU limit), `Staff_Attach` (right-hand IK target)
- **IK feet** (uneven Banaue terraces), FK arms/legs

### D. Export
- **glTF/GLB** for WebGL (FBX if routed through Unity/Unreal)
- Naming: `Char_Alim_Elder_Mesh`, `Char_Alim_Elder_Rig`, `Char_Alim_Elder_Tex_Alb`

---

## 2. BLENDER WORKFLOW (14-day plan)
1. **Blockout (D1–2):** import turnaround as reference planes; Rigify metarig — shorten legs, enlarge head, hunch spine; primitive blockout only.
2. **Sculpt (D3–5):** Voxel Remesh → Clay Strips (robes/beard), Inflate (sleeves); deep face/hand wrinkles; wood grain on staff; runes raised/indented for the normal bake.
3. **Retopology (D6–8):** Shrinkwrap low-poly; edge loops around eyes/mouth/shoulders; StatVis check ≤ 4,000 tris.
4. **UV + Bake (D9–10):** seams hidden (inner sleeves, under collar, back of legs); bake Normal + AO into base color.
5. **Texturing (D11–12):** deep blue/purple base, gold trim, wear on sandals/staff; **emissive purple** orb + runes.
6. **Rig + Weights (D13–14):** skeleton per spec; careful armpit/groin weights; rotational drivers on robe/beard bones.

---

## 3. ANIMATION SET

### Walk Cycle — 1.5–2.0 s loop, 8-frame cycle
Contact → Down (lowest, weight on flat foot) → Passing (body rises, topknot sway) → High point (max robe flow) → mirror ×4.
Staff: gentle figure-8, orb glow pulses. Secondary: beard 2–3-frame delay, topknot bounce, robe flutter, physics tassels.

### Idle — 3.5 s loop
Slow breathing; weight shift L↔R every cycle; staff upright, orb pulses (synced with emissive animation); beard sways with breath; faint **Anito-dust** motes drift from the orb.

### Run — 1.2 s loop
Strong forward lean, pronounced hunch; low **shuffling** steps (elderly, sandals); right arm pumps with staff angled behind for balance; robes flap hard, beard streams back, topknot bobs per footstep.

### Attack — 1.0–1.5 s (magical staff strike)
Anticipation (orb wind-up glow) → Wind-up 0.2 s (feet plant wide, staff over shoulder, body counter-rotates) → Strike 0.4 s (arc swing, purple energy trail, orb burst, beard whips forward) → Impact 0.5 s (explosion, slight squash, max particles, optional screen shake) → Recovery 0.8 s → Idle 1.2 s.
VFX: purple trail · orb intensify · **Baybayin symbols flash in air** · impact burst · ground shockwave.

### Spell Cast — "Fire Sigil"
Wind-up 0.4 s: feet wide, **slam staff butt into ground**, look down. Cast 0.6 s: twist staff — glowing purple **Baybayin rune circle expands** across the ground; left palm channels. Release 0.4 s: fire pillar erupts, caster pushed back, robes flare. Recovery 0.5 s: circle fades to embers, visible exhale.

### Death — 1.5 s (spirit dissipation, non-gory)
Impact 0.3 s (knocked off feet, staff clatters away) → Fall 0.5 s (slide, limbs limp) → Dissipation 0.7 s: body dissolves into **purple/blue Anito dust**; runes flash once; only the staff + glowing dust remain; respawn at nearest Babaylan shrine.

---

## 4. TOOLING
Modeling: **Blender** (indie) / Maya / 3D Coat · Animation: Blender, Mixamo (auto-rig base), Cascadeur · Engine: Unity WebGL, Godot, **PlayCanvas** (browser-native).

---

## 5. IN-GAME IMPLEMENTATION STATUS (Three.js build)
The sandbox build approximates this spec procedurally in `game.js → buildElderAlim()`:
- ✅ Hunched elder proportions, white beard + topknot w/ blue tie, indigo robe + gold trim
- ✅ 5 emissive Baybayin rune plates on robe (pulsing emissive, staggered phase)
- ✅ Gnarled forked staff, pulsing purple orb + PointLight, twin blue tassels w/ sway
- ✅ Idle: breathing, weight shift, beard sway, orb pulse, Anito-dust motes
- ✅ Run: forward lean, shuffle steps, robe flap, beard streaming, topknot bob
- ✅ Fire Sigil: staff slam + expanding rune ring + 6 floating Baybayin glyphs
- ✅ Death: Anito-dust dissolve rings + glyph burst
- ⏳ For a sculpted glTF asset, follow §1–2 and drop the GLB in via `GLTFLoader`
