# AGIMAT ONLINE — Asset Production List
### Complete art brief for the graphics overhaul
*Game engine: Three.js r160 (browser WebGL) · Style target: stylized low-poly 3D, Filipino mythology*

---

## 1. FILE FORMATS WE NEED (read this first)

| Asset type | Required format | Notes |
|---|---|---|
| **3D models (characters, enemies, pets, props, buildings)** | **`.glb`** (binary glTF 2.0) | The ONE format Three.js loads natively and reliably. Do NOT deliver .fbx, .obj, .blend, or .max — have the artist export to .glb from Blender (free, built-in exporter). |
| **3D animations** | Baked **inside the same `.glb`** | Skeletal animations as named clips (see naming rules below). |
| **Textures** | **`.png`** (with alpha) or **`.jpg`** (opaque) | Power-of-2 sizes: 256, 512, 1024. Max 1024×1024 per character, 512 for props. One texture atlas per model preferred. |
| **2D portraits / UI art** | **`.png`** with transparency | Sizes listed per item below. |
| **Icons (items, skills, buffs)** | **`.png`** 128×128, transparent bg | Consistent style + outline so they read at 32px. |
| **Audio (optional, later)** | **`.mp3`** or **`.ogg`** | Music loops + SFX one-shots. |

### Hard technical budget (browser game, up to 5 players + 40 enemies on screen)
- **Player characters:** ≤ 8,000 triangles, 1 material, 1×1024 texture
- **Enemies (common):** ≤ 4,000 tris · **Elites:** ≤ 6,000 · **Boss:** ≤ 12,000
- **Pets/mounts:** ≤ 3,000 tris
- **Props (trees, huts, rocks):** ≤ 1,500 tris, 512 texture
- **Bones:** ≤ 40 per skeleton. No blend-shapes/morphs needed.
- **No PBR metallic maps needed** — flat/hand-painted texture + optional emissive map is the look we want.

### Required animation clips (named EXACTLY like this inside the .glb)
| Clip name | Used for | Length guide |
|---|---|---|
| `idle` | standing, breathing | 2–4s loop |
| `walk` | moving | 1s loop |
| `attack` | basic attack swing/shot | 0.4–0.6s |
| `skill` | big ability wind-up | 0.6–1.0s |
| `hit` | flinch when damaged | 0.3s |
| `death` | collapse | 1.0–1.5s |
| `special` *(enemies only, optional)* | charge/stealth/dive/laugh | varies |

---

## 2. PLAYER CHARACTER CLASSES — 5 models

Each class needs: **1× `.glb` model** (rigged + 6 animation clips) **+ 1× portrait `.png` 512×768** (waist-up, for character select & HUD).

| # | Class | Role | Weapon (must be modeled) | Visual direction |
|---|---|---|---|---|
| 1 | **Babaylan** | Hybrid Support (healer) | Bolo knife + glowing Agimat amulet | Female spirit-healer of the old faith. Woven baro, beads, anahaw-leaf accents, faint spirit glow on amulet (emissive). |
| 2 | **Arnisador** | Melee DPS | **Dual Arnis/Eskrima sticks** (rattan) | Lean stick-fighting master. Bandana, rolled sleeves, wrapped forearms. Fast, athletic silhouette. |
| 3 | **Tirador** | Ranged DPS | **Slingshot (tirador)** + stone pouch | Provincial deadeye hunter. Salakot hat, sando, ammo pouch on hip. |
| 4 | **Alim** | Elemental Caster | **Wooden staff + hanging talisman** | Elder shaman, hunched, long woven robe, staff topped with elemental sigil (emissive fire/water/wind glow). *(We have an existing turnaround spec: `docs/ELDER_ALIM_ART_BIBLE.md` — follow it.)* |
| 5 | **Mandirigma** | Tank | **Kampilan sword + kalasag shield** | Broad tribal warrior. Heavy shoulder armor, tattoos (batok patterns), horned or plumed headdress. |

> Weapons can be separate meshes parented to hand bones (preferred) so we can swap gear later.

---

## 3. ENEMIES — 12 creatures (Philippine mythology)

Each enemy needs: **1× `.glb`** (rigged + clips) **+ 1× bestiary portrait `.png` 512×512** (dramatic bust shot, dark background).

### Mainland — Common tier (≤4,000 tris)
| # | Enemy | Behavior in-game | Visual direction |
|---|---|---|---|
| 1 | **Tiyanak** | Fast swarmer, attacks in packs | Demonic infant — cute at distance, wrong up close. Red eyes, tiny claws, tattered swaddling cloth. |
| 2 | **Duwende** | Small group skirmisher | Knee-high goblin dwarf, pointed red cap, dirt-stained clothes, mound-dweller vibes. |
| 3 | **Tikbalang** | Charger — gallops through players | Horse-headed humanoid, backwards legs, long unkempt mane (3 stiff hairs = its weakness, make them visible!). |

### Mainland — Uncommon tier (≤4,000 tris)
| # | Enemy | Behavior | Visual direction |
|---|---|---|---|
| 4 | **Santelmo** | Floating fireball, leaves fire zones | Ball of ghost-fire with a faint skull/face inside. Heavy emissive glow, trailing embers. No skeleton needed — just hover/pulse anims. |
| 5 | **Sigbin** | Stealth burst attacker (turns invisible) | Kangaroo-like cryptid that walks BACKWARDS, head low between hind legs, huge ears, whip tail. |

### Mainland — Elite tier (≤6,000 tris)
| # | Enemy | Behavior | Visual direction |
|---|---|---|---|
| 6 | **Kapre** | Slow heavy hitter, ranged fire attack | Tree giant, 2.5× human height, smoking a giant tabako (cigar — emissive ember + smoke). Bark-like skin, sits-in-balete-trees energy. |
| 7 | **Nuno sa Punso** | Defensive earth elite, high armor | Ancient tiny old man fused with his termite mound (punso). Stone/earth textures, moss, angry cursed grandpa face. |
| 8 | **Aswang** | Fast bleed attacker | Shape-shifted ghoul — gaunt human form mid-transformation, elongated limbs, dog-like snout emerging. |

### Isla ng Bathala (Level 10+ island) — NEW, currently using placeholder art
| # | Enemy | Behavior | Visual direction |
|---|---|---|---|
| 9 | **Wakwak** (Uncommon) | Night raptor, circles then dive-bombs | Giant black bird-demon, hooked beak, razor tail feathers. Wing-flap 'wak-wak' sound is its name. Needs `fly_idle` + `dive` clips instead of walk. |
| 10 | **Bungisngis** (Elite) | Laughing cyclops, ground-slam | One-eyed giant, permanently grinning, upper lip so big it folds over its forehead, two tusks. Tree-trunk club. Needs a `laugh` clip. |
| 11 | **Berberoka** (Elite) | Swamp ambusher, spits water jets | Bloated amphibious hulk, moss and drips, gaping round mouth (it drinks ponds dry and vomits floods). |

### World Boss (≤12,000 tris)
| # | Enemy | Behavior | Visual direction |
|---|---|---|---|
| 12 | **Manananggal** | Flying boss — circles, swoops, fire screech | Severed-torso vampire woman on massive bat wings, entrails trailing below the cut waist, clawed arms. This is the showpiece — most detail budget here. Clips: `fly_idle`, `dive`, `screech`, `hit`, `death`. |

---

## 4. PETS & MOUNTS — 4 models (≤3,000 tris each)

Each needs: **1× `.glb`** with `idle` + `walk`/`fly` clips **+ 1× shop icon `.png` 256×256**.

| # | Pet | Type | Visual direction |
|---|---|---|---|
| 1 | **Sarimanok** | Pet (follows player) | Legendary Maranao rooster — rainbow tail feathers, ornate curled plumage, small and jewel-like. Emissive feather tips. |
| 2 | **Tarsier** | Pet | Tiny primate, ENORMOUS round eyes, long finger pads, curled tail. Maximum cuteness. |
| 3 | **Paniki** | Pet (flies) | Small fruit bat, leathery wings, red glowing eyes. `fly` loop. |
| 4 | **Kalabaw** | **MOUNT — player sits on it!** | Carabao/water buffalo with wide swept-back horns, wooden saddle pad + rope halter. Needs `idle`, `walk`, `run` clips and a **saddle bone/empty where the rider attaches**. |

---

## 5. TOWN NPCs — 5 models (≤4,000 tris each)

Each needs: **1× `.glb`** with `idle` (+ optional `talk` gesture) **+ 1× dialog portrait `.png` 512×512**.

| # | NPC | Shop | Visual direction |
|---|---|---|---|
| 1 | **Aling Rosa** | Trader ⚖️ | Warm middle-aged market vendor, checkered apron, hair bun, weighing scale. |
| 2 | **Panday Iko** | Blacksmith ⚒️ | Burly smith, leather apron, soot marks, hammer in hand. |
| 3 | **Ka Bining** | Outfitter 🛡️ | Sharp-eyed tailor/armorer, measuring tape around neck, fine woven clothes. |
| 4 | **Ang Kubrador** | Black Market 🌑 | Shady hooded figure, face half-hidden, gold tooth glint, dagger at belt. |
| 5 | **Elder/Quest giver** *(future)* | — | Village chief with staff and salakot, for the story chain. |

---

## 6. ENVIRONMENT / WORLD PROPS (the biggest visual upgrade)

All as **`.glb`**, 512-px textures, ≤1,500 tris each. Static — no rigs (except flags/banners: simple wind bone is a bonus).

### Town — "Grand Tiangge"
- Nipa hut shop building ×4 variants (trader / smithy / outfitter / black-market styles)
- Stone+bamboo perimeter wall segment, corner tower, wooden gate (double door)
- Market tent (colorful canvas), market stall/table, bangketa baskets
- Plaza fountain or Rice-God stone shrine, banderitas string flags, paper lanterns, torch post

### Nature set — mainland biomes (need 2–3 variants each)
- **Rice terraces:** palay rice clumps, terrace stone edge, bamboo water pipe
- **Kawayan Grove:** bamboo clump tall/short, cut bamboo stump
- **Gubat ng Balete:** balete strangler-fig tree (big, creepy roots), jungle tree, hanging vines
- **Nuno Highlands:** granite boulder, rock spire, termite mound (punso!)
- **Sunog Scar:** burnt dead tree, charred stump, ash rock
- **Dalampasigan (beach):** coconut palm (straight + leaning), beach rock, driftwood, outrigger banca boat
- **Bakawan Swamp:** mangrove tree with prop roots, swamp reeds, dead log
- **Bulkan Apolaki:** volcanic rock (sharp), obsidian shard, lava vent
- **Parang ng Tala (meadow):** flowering bush pink/white/violet, tall grass tuft, firefly-tree
- **Isla ng Bathala:** giant jungle tree with vines, giant fern, **ancient moss-covered stone idol** (glowing eyes, emissive), ruined pillar

### Landmarks
- **Hanging bamboo bridge** (modular: 2 end posts + rope + plank segment we can repeat)
- **Portal gate** ×2 (town version = blue crystal arch; island version = green vine-covered ancient arch)
- Stone ford crossing slabs

### Ground textures (tileable, 512×512 `.jpg`, seamless)
- Grass (lush + dry), dirt path, sand, stone plaza, swamp mud, volcanic rock, shallow water bed, rice paddy water

### Forage nodes (small props, ≤500 tris)
- Palay bundle, stone pile (bato), herb plant (dahon), dew flower (diwata dew)

---

## 7. 2D UI / ICON SET (all `.png`, transparent, 128×128 unless noted)

### Item icons (currently emoji — biggest quick win)
- Materials: palay, bato, dahon, diwata dew, anito dust, duwende cap, tikbalang hair, santelmo flame, sigbin heart, kapre ash, nuno stone, mutya
- **Baybayin runes ×5:** ᜃ Ka (attack), ᜊ Ba (HP), ᜄ Ga (crit), ᜆ Ta (defense), ᜎ La (speed) — carved-stone tile look
- Gear: 5 weapon types (bolo, arnis sticks, slingshot, staff, kampilan), armor, helmet, charm/agimat, boots — ideally ×5 rarity color variants (gray/green/blue/purple/gold)

### Skill icons ×15 (one per class skill — see class table §2)
Spirit Strike, Agimat Shield, Huling Hininga · Sinawali, Abanico, Redonda · Precision Shot, Scatter Shot, Bato Snare · Fire Sigil, Water Ward, Wind Burst · Shield Bash, Taunt, Iron Stance

### UI chrome
- 9-slice panel frame (wood + woven banig texture, capiz-shell accents), button normal/hover/pressed
- HP/XP/enemy bar frames, minimap frame (bamboo ring), quest-tracker scroll frame
- Currency icon (gold coin with sun motif), buff icons (burn/bleed/stun/root/shield/mounted)
- **Game logo: "AGIMAT ONLINE"** with baybayin flourish — 2048×1024 title + 512×512 square icon
- Title screen key art: hero party facing Manananggal over rice terraces at dusk — 2560×1440 `.jpg`

---

## 8. AUDIO (optional, phase 2 — `.mp3`/`.ogg`)
- Music loops (2–3 min): town/tiangge (kulintang ensemble), overworld day, island jungle, boss battle, title theme
- SFX: sword hits ×3, slingshot, magic cast, level-up (kulintang run), coin, UI click, portal whoosh, per-enemy voice (tiyanak cry, kapre laugh, bungisngis giggle, manananggal screech, wakwak flaps)

---

## PRIORITY ORDER (what to make first)
| Phase | Assets | Why |
|---|---|---|
| **1** | 5 player classes + Manananggal boss (.glb) | Players stare at these 100% of the time |
| **2** | 12 enemies + item/skill icon set | Combat is the core loop |
| **3** | Town buildings + biome nature set | World transformation |
| **4** | Pets/mounts, NPCs, UI chrome, logo | Polish |
| **5** | Audio | Atmosphere |

### Delivery checklist per 3D asset
✅ `.glb` under budget · ✅ animations named exactly per table §1 · ✅ textures embedded in the .glb (or same-name .png beside it) · ✅ model faces **+Z forward, +Y up**, feet at origin (0,0,0) · ✅ real-world scale: human ≈ **1.8 units** tall · ✅ test in https://gltf-viewer.donmccurdy.com (free, drag & drop) before sending
