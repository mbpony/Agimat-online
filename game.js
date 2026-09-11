/* ================================================================
   AGIMAT ONLINE 3D — low-poly WebGL action RPG (Three.js)
   5 classes · skills · dodge · loot · Filipino folklore roster
   Orbit camera · joystick · browser-first per PRD constraints
   ================================================================ */
'use strict';
import * as THREE from 'three';
import { EffectComposer } from './jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './jsm/postprocessing/OutputPass.js';
import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from './jsm/utils/SkeletonUtils.js';

/* ---- PHASE 1 DATA LOADER (restructure spec §10/§24/§31) ----
   External JSON is authoritative when present; inline literals below
   remain as automatic fallback, so a failed fetch can never break boot. */
const GAME_DATA = await (async () => {
  const files = {
    classes:  'data/classes/definitions.json',
    enemies:  'data/enemies/definitions.json',
    spawns:   'data/maps/spawns-main.json',
    items:    'data/items/catalog.json',
    dungeons: 'data/dungeons/dungeons.json',
    quests:   'data/quests/quests.json',
    models:   'data/models/registry.json',
    mapMain:  (/[?&]ws=([\w-]+)/.test(location.search) ? 'data/maps/ws-'+location.search.match(/[?&]ws=([\w-]+)/)[1]+'.json' : 'data/maps/main.json'),
    spawnRules:'data/enemies/spawn-rules.json',
    bosses:   'data/bosses/world-bosses.json',
    skills:   'data/skills/definitions.json',
  };
  const out = {};
  await Promise.all(Object.entries(files).map(async ([k, url]) => {
    try {
      const r = await fetch(url, { cache: 'no-cache' });
      if (r.ok) out[k] = await r.json();
    } catch (e) { /* fallback to inline data */ }
  }));
  return out;
})();


/* ---------------- MATERIALS (data) ---------------- */
const MATERIALS = {
  palay:    {name:'Palay',           icon:'🌾', rarity:'common',   col:0xd8b83a, lore:'Unhusked rice, the golden lifeblood of the terraces. Every grain is an offering of gratitude to the anito spirits.'},
  niyog:    {name:'Niyog',           icon:'🥥', rarity:'common',   col:0x7a5230, lore:'Coconut — the tree of life. Its water, meat, and husk sustain both mortals and the diwata who guard the groves.'},
  dahon:    {name:'Dahon',           icon:'🍃', rarity:'common',   col:0x4faf5a, lore:'Sacred leaves gathered at dawn. Babaylan burn them in cleansing rituals to drive away restless spirits.'},
  bato:     {name:'Bato',            icon:'🪨', rarity:'common',   col:0x8a8a92, lore:'River-smoothed stones humming with earth memory. The mountain remembers everything.'},
  kawayan:  {name:'Kawayan',         icon:'🎋', rarity:'common',   col:0x6aab3a, lore:'Bamboo — from which, legend says, the first man and woman emerged when the great bird split the stalk.'},
  duwende_cap:{name:'Duwende Cap',   icon:'🍄', rarity:'uncommon', col:0xd84a3a, lore:'A tiny red pointed cap. Its owner is furious about losing it. Say "tabi-tabi po" when you pass the mounds.'},
  tikbalang_hair:{name:'Tikbalang Hair', icon:'🐴', rarity:'uncommon', col:0x3a3244, lore:'Pluck three hairs from a Tikbalang\'s mane and it must serve you. These strands still crackle with trickster magic.'},
  santelmo_flame:{name:'Santelmo Flame', icon:'🔥', rarity:'uncommon', col:0xff8a3a, lore:'A captured wisp of the wandering fire. It burns cold in your palm and whispers of lost travelers.'},
  sigbin_horn:{name:'Sigbin Horn',   icon:'🦯', rarity:'uncommon', col:0x6a5a6a, lore:'The horn of the shadow-walking beast. Families who keep a Sigbin are said to gain great fortune.'},
  kapre_ash:{name:'Kapre Cigar Ash', icon:'💨', rarity:'uncommon', col:0x9a9aa2, lore:'Ash from a Kapre\'s enormous tabako. It smolders eternally and never quite cools.'},
  anito_dust:{name:'Anito Dust',     icon:'✨', rarity:'uncommon', col:0xffe9a0, lore:'Glittering residue of ancestor spirits. It hums with the voices of the old ones.'},
  diwata_dew:{name:'Diwata Dew',     icon:'💧', rarity:'uncommon', col:0x6ad8ff, lore:'Morning dew blessed by a passing diwata. It glows faintly with mountain starlight.'},
  nuno_stone:{name:'Nuno\'s Stone',  icon:'🗿', rarity:'rare',     col:0xb0a890, lore:'A pebble from the sacred punso. It weighs almost nothing, yet your hand trembles holding it.'},
  mutya:    {name:'Mutya',           icon:'💎', rarity:'rare',     col:0xc08aff, lore:'A pearl-like charm of immense power, said to fall from the heart of a banana blossom at midnight.'},
  rune_ka: {name:'Baybayin ᜃ (Lakas)', icon:'ᜃ', rarity:'rare', col:0xffb84a, lore:'An ancient script-stone humming with the strength of forgotten warriors. Socket it into equipment.'},
  rune_ba: {name:'Baybayin ᜊ (Buhay)', icon:'ᜊ', rarity:'rare', col:0x8aff9a, lore:'The glyph of life, warm to the touch. Socket it into equipment.'},
  rune_ga: {name:'Baybayin ᜄ (Galing)', icon:'ᜄ', rarity:'rare', col:0x7df0ff, lore:'The glyph of skill — it seems to anticipate your hand. Socket it into equipment.'},
  rune_ta: {name:'Baybayin ᜆ (Tibay)', icon:'ᜆ', rarity:'rare', col:0xd8a8ff, lore:'The glyph of endurance, heavy as a mountain heart. Socket it into equipment.'},
  rune_la: {name:'Baybayin ᜎ (Bilis)', icon:'ᜎ', rarity:'rare', col:0xffe08a, lore:'The glyph of swiftness — it flickers when you look away. Socket it into equipment.'},
};

/* ---------------- CLASSES ---------------- */
let CLASSES = {
  babaylan: {
    name:'Babaylan', role:'Hybrid Support', weapon:'Bolo + Agimat', img:'img/p_babaylan.png', portrait:'img/p_babaylan.png',
    desc:'Spirit-healer of the old faith. Sustain, wards, and spirit damage.',
    base:{hp:100, atk:10, def:2, spd:16}, growth:{hp:14, atk:2.6, def:1},
    melee:true, range:5.8,
    skills:[
      {id:'spirit_strike', name:'Spirit Strike', icon:'🔮', cd:4,  desc:'Hurl a bolt of spirit fire (180% dmg).'},
      {id:'agimat_shield', name:'Agimat Shield', icon:'🛡️', cd:14, desc:'Block all damage for 5s.'},
      {id:'huling_hininga',name:'Huling Hininga',icon:'💗', cd:18, desc:'Breathe with the ancestors: heal 35% HP.'},
    ]},
  arnisador: {
    name:'Arnisador', role:'Melee DPS', weapon:'Dual Arnis Sticks', img:'img/p_arnisador.png', portrait:'img/p_arnisador.png',
    desc:'Master of Filipino stick fighting. Fast combos and relentless movement.',
    base:{hp:95, atk:12, def:2, spd:17}, growth:{hp:12, atk:3.1, def:0.8},
    melee:true, range:5.5,
    skills:[
      {id:'sinawali', name:'Sinawali', icon:'🥢', cd:5,  desc:'Weaving flurry: 3 rapid strikes (80% each).'},
      {id:'abanico',  name:'Abanico',  icon:'🌀', cd:8,  desc:'Fan spin: hit ALL nearby enemies (150%).'},
      {id:'redonda',  name:'Redonda',  icon:'⚡', cd:10, desc:'Dash forward, striking through enemies (200%).'},
    ]},
  tirador: {
    name:'Tirador', role:'Ranged DPS', weapon:'Slingshot', img:'img/p_tirador.png', portrait:'img/p_tirador.png',
    desc:'Deadeye of the provinces. Aimed shots, stones, and traps.',
    base:{hp:85, atk:11, def:1, spd:16.3}, growth:{hp:10, atk:3.0, def:0.7},
    melee:false, range:27, projSpeed:33,
    skills:[
      {id:'precision', name:'Precision Shot', icon:'🎯', cd:6,  desc:'Aimed shot: 260% dmg, always crits.'},
      {id:'scatter',   name:'Scatter Shot',   icon:'💥', cd:9,  desc:'Fan of 5 stones (90% each).'},
      {id:'snare',     name:'Bato Snare',     icon:'🕸️', cd:12, desc:'Trap zone that roots enemies for 3s.'},
    ]},
  alim: {
    name:'Alim', role:'Elemental Caster', weapon:'Staff + Talisman', img:'img/p_alim.png', portrait:'img/p_alim.png',
    desc:'Keeper of elemental sigils. Area control through fire, water, and wind.',
    base:{hp:80, atk:13, def:1, spd:15.6}, growth:{hp:9, atk:3.4, def:0.6},
    melee:false, range:26, projSpeed:28,
    skills:[
      {id:'fire_sigil', name:'Fire Sigil', icon:'🔥', cd:9,  desc:'Burn the ground: fire zone (60%/tick, 4s).'},
      {id:'water_ward', name:'Water Ward', icon:'💧', cd:14, desc:'Absorb shield equal to 30% max HP.'},
      {id:'wind_burst', name:'Wind Burst', icon:'🌪️', cd:10, desc:'Blast all nearby enemies away (130%).'},
    ]},
  mandirigma: {
    name:'Mandirigma', role:'Tank', weapon:'Kampilan + Shield', img:'img/p_mandirigma.png', portrait:'img/p_mandirigma.png',
    desc:'Unbreakable wall of the tribe. Aggro control and protection.',
    base:{hp:130, atk:9, def:4, spd:15}, growth:{hp:18, atk:2.2, def:1.5},
    melee:true, range:6,
    skills:[
      {id:'shield_bash', name:'Shield Bash', icon:'🛡️', cd:7,  desc:'Bash & stun enemies in front (160%, 2s stun).'},
      {id:'taunt',       name:'Taunt',       icon:'📢', cd:12, desc:'Enrage all nearby foes; +50% defense 6s.'},
      {id:'iron_stance', name:'Iron Stance', icon:'🗿', cd:16, desc:'Take 70% less damage for 5s.'},
    ]},
  mamamana: {
    name:'Mamamana', role:'Ranged DPS', weapon:'Tribal Longbow', img:'img/p_mamamana.png', portrait:'img/p_mamamana.png',
    desc:'Feathered huntress of the highlands. Arrow storms from impossible range.',
    base:{hp:82, atk:12, def:1, spd:16.5}, growth:{hp:10, atk:3.2, def:0.6},
    melee:false, range:28, projSpeed:36,
    skills:[
      {id:'ulan_palaso', name:'Ulan ng Palaso', icon:'🏹', cd:9,  desc:'Arrow rain zone ahead (75%/hit ×5 waves).'},
      {id:'tudla_diwata',name:'Tudlang Diwata', icon:'🪶', cd:6,  desc:'Spirit arrow: pierces ALL enemies (220%).'},
      {id:'amihan',      name:'Ihip ng Amihan', icon:'🌬️', cd:11, desc:'Leap back + fire a 3-arrow fan (110% each).'},
    ]},
  anino: {
    name:'Anino', role:'Assassin', weapon:'Twin Shadow Daggers', img:'img/p_anino.png', portrait:'img/p_anino.png',
    desc:'Blade of the dark. Blink behind prey and vanish in violet smoke.',
    base:{hp:90, atk:13, def:1.5, spd:17.5}, growth:{hp:11, atk:3.3, def:0.7},
    melee:true, range:5.2,
    skills:[
      {id:'dilim_dash',  name:'Lagos sa Dilim', icon:'🗡️', cd:7,  desc:'Blink behind the nearest foe: backstab (250%).'},
      {id:'ulap_anino',  name:'Ulap ng Anino',  icon:'💨', cd:13, desc:'Shadow veil: untouchable + faster for 2.5s.'},
      {id:'abaniko_patalim', name:'Abanikong Patalim', icon:'🌀', cd:9, desc:'Fan of 5 shadow daggers (95% each).'},
    ]},
  mangkukulam: {
    name:'Mangkukulam', role:'Curse Mage', weapon:'Munyeka at Karayom (Cursed Doll & Needles)', img:'img/p_mangkukulam.png', portrait:'img/p_mangkukulam.png',
    desc:'Witch of whispered hexes. Her needles find the soul through the doll.',
    base:{hp:88, atk:13.5, def:1.4, spd:16}, growth:{hp:11, atk:3.3, def:0.7},
    melee:false, range:24, projSpeed:26,
    skills:[
      {id:'kulam_karayom', name:'Kulam na Karayom', icon:'🪡', cd:5,  desc:'Cursed needle (160%): target BLEEDS + kalat ang sumpa sa kalapit kapag namatay.'},
      {id:'usok_lason',    name:'Usok ng Lason',    icon:'🟢', cd:11, desc:'Poison smoke zone: sunog-lason sa lahat ng tumapak (4s).'},
      {id:'sumpa_dugo',    name:'Sumpa ng Dugo',    icon:'🩸', cd:16, desc:'Blood curse (300%): bawat pinsala ay bumabalik sa iyo bilang buhay (50%).'},
    ]},
  panday: {
    name:'Panday', role:'Bruiser', weapon:'Runic Great Hammer', img:'img/p_panday.png', portrait:'img/p_panday.png',
    desc:'Forge-born juggernaut. His hammer carries the volcano\'s heartbeat.',
    base:{hp:120, atk:11, def:3, spd:14.5}, growth:{hp:16, atk:2.8, def:1.3},
    melee:true, range:6.2,
    skills:[
      {id:'bayo_bulkan', name:'Bayo ng Bulkan', icon:'🔨', cd:8,  desc:'Leaping slam: 200% + 1.5s stun in a wide ring.'},
      {id:'pandayan',    name:'Apoy ng Pandayan', icon:'🔥', cd:14, desc:'Forge fury: +50% damage for 6s.'},
      {id:'lindol',      name:'Lindol',         icon:'🌋', cd:12, desc:'Earthquake: 170% + knockback to ALL nearby.'},
    ]},
};
if (GAME_DATA.classes && GAME_DATA.classes.classes) CLASSES = GAME_DATA.classes.classes;

/* ---------------- ENEMIES ---------------- */
let ENEMY_DEFS = {
  tiyanak: { name:'Tiyanak', img:'img/e_tiyanak.png', tier:'Common', role:'Tier 1 Pest — fast swarmer',
    xp:80, hp:60, minLevel:1, dmg:[3,6], speed:7.2, aggro:15, atkRange:2.6, atkCd:1.3, scale:1, r:0.9, ai:'melee',
    lore:'A vengeful spirit that mimics an infant\'s cry to lure travelers into the tall grass. Its innocent face hides needle teeth.',
    drops:[{id:'palay',chance:1,qty:[40,70]},{id:'diwata_dew',chance:.18,qty:[1,2]}], dropText:'Palay; Diwata Dew', gearChance:0.08, gold:[8,18] },
  duwende: { name:'Duwende', img:'img/e_duwende.png', tier:'Common', role:'Tier 1 Pest — pack skirmisher',
    xp:60, hp:45, minLevel:1, dmg:[2,5], speed:8, aggro:16, atkRange:2.4, atkCd:1.1, scale:0.8, r:0.8, ai:'melee', pack:3,
    lore:'Tiny mound-dwellers in red caps. Alone they are harmless mischief; in threes they are a stinging swarm. Always say "tabi-tabi po."',
    drops:[{id:'duwende_cap',chance:.5,qty:[1,2]},{id:'bato',chance:.8,qty:[20,40]}], dropText:'Duwende Cap, Bato', gearChance:0.08, gold:[6,14] },
  tikbalang: { name:'Tikbalang', img:'img/e_tikbalang.png', tier:'Uncommon', role:'Tier 2 Guardian — charge & confusion',
    xp:260, hp:230, minLevel:6, dmg:[8,14], speed:7.5, aggro:19, atkRange:3.2, atkCd:1.5, scale:1.5, r:1.1, ai:'charger',
    lore:'A towering trickster with the head of a horse and backwards feet. When it screams and paws the earth — MOVE.',
    drops:[{id:'tikbalang_hair',chance:.55,qty:[1,3]},{id:'dahon',chance:1,qty:[30,55]},{id:'bato',chance:.9,qty:[25,50]}], dropText:'Tikbalang Hair, Dahon, Bato', gearChance:0.10, gold:[12,26] },
  santelmo: { name:'Santelmo', img:'img/e_santelmo.png', tier:'Elite', role:'Tier 3 Predator — fire zone controller',
    xp:340, hp:260, minLevel:8, dmg:[10,16], speed:6, aggro:21, atkRange:18, atkCd:2.2, scale:1.1, r:1, ai:'ranged', leavesFire:true,
    lore:'St. Elmo\'s fire given hunger — a wandering flame that is the soul of one lost at sea. It herds prey with rings of burning ground.',
    drops:[{id:'santelmo_flame',chance:.6,qty:[1,3]},{id:'anito_dust',chance:.3,qty:[1,2]}], dropText:'Santelmo Flame, Anito Dust', gearChance:0.25, gold:[30,55] },
  sigbin: { name:'Sigbin', img:'img/e_sigbin.png', tier:'Uncommon', role:'Tier 1 Trickster — stealth burst',
    xp:220, hp:130, minLevel:4, dmg:[9,15], speed:10.5, aggro:22, atkRange:2.8, atkCd:2.4, scale:1.1, r:1, ai:'stealth',
    lore:'A goat-like shadow that walks backwards with its head lowered between its hind legs. It fades from sight, then strikes without warning.',
    drops:[{id:'sigbin_horn',chance:.55,qty:[1,2]},{id:'anito_dust',chance:.35,qty:[1,2]}], dropText:'Sigbin Horn, Anito Dust', gearChance:0.14, gold:[20,36] },
  kapre: { name:'Kapre', img:'img/e_kapre.png', tier:'Elite', role:'Tier 3 Predator — heavy crusher',
    xp:430, hp:460, minLevel:10, dmg:[12,20], speed:4.4, aggro:16, atkRange:4, atkCd:1.9, scale:2.1, r:1.6, ai:'melee',
    lore:'A giant who dwells in ancient balete trees, wreathed in the smoke of a never-ending cigar. Not evil — merely territorial.',
    drops:[{id:'kapre_ash',chance:.6,qty:[1,3]},{id:'kawayan',chance:1,qty:[20,40]},{id:'dahon',chance:.85,qty:[30,55]}], dropText:'Kapre Cigar Ash, Kawayan, Dahon', gearChance:0.25, gold:[30,55] },
  nuno: { name:'Nuno sa Punso', img:'img/e_nuno.png', tier:'Common', role:'Tier 1 Pest — stone-thrower of the mounds',
    xp:95, hp:95, minLevel:2, dmg:[4,8], speed:3.5, aggro:20, atkRange:18, atkCd:2.0, scale:1.1, r:1.1, ai:'ranged', defense:3,
    lore:'The ancient one of the anthill. Step on his punso and boils, bad luck, and hurled stones will follow. Apologize. Loudly.',
    drops:[{id:'nuno_stone',chance:.45,qty:[1,1]},{id:'bato',chance:1,qty:[40,70]},{id:'anito_dust',chance:.4,qty:[1,3]}], dropText:'Nuno\'s Stone, Bato, Anito Dust', gearChance:0.10, gold:[10,20] },
  aswang: { name:'Aswang', img:'img/e_aswang.png', tier:'Elite', role:'Tier 3 Predator — bleeding shadow',
    xp:520, hp:420, minLevel:12, dmg:[14,22], speed:11.5, aggro:25, atkRange:3, atkCd:1.6, scale:1.4, r:1.1, ai:'melee', bleeds:true,
    lore:'The shapeshifter of nightmares — viscera-eater, dog-that-is-not-a-dog. Its claws leave wounds that refuse to close.',
    drops:[{id:'mutya',chance:.08,qty:[1,1]},{id:'anito_dust',chance:.6,qty:[2,4]}], dropText:'Mutya (rare), Anito Dust', gearChance:0.28, gold:[40,70] },
  wakwak: { name:'Wakwak', img:'img/e_aswang.png', tier:'Uncommon', role:'Tier 2 Guardian — night dive bomber',
    xp:400, hp:300, minLevel:7, dmg:[11,17], speed:10, aggro:26, atkRange:3.2, atkCd:1.7, scale:1.2, r:1, ai:'flyer',
    lore:'A night bird that was never a bird. Its wing-slaps sound like laundry in the wind — when the sound stops, it is already diving.',
    drops:[{id:'anito_dust',chance:.5,qty:[2,4]},{id:'dahon',chance:1,qty:[35,60]}], dropText:'Anito Dust, Dahon', gearChance:0.2, gold:[35,60] },
  bungisngis: { name:'Bungisngis', img:'img/e_kapre.png', tier:'Elite', role:'Tier 4 Catastrophe — laughing earth-breaker',
    xp:1100, hp:1600, minLevel:14, dmg:[18,30], speed:4.8, aggro:20, atkRange:4.6, atkCd:2.1, scale:2.9, r:1.9, ai:'melee',
    lore:'A one-eyed giant whose giggling never stops — even mid-swing. Its upper lip is so large it folds back over its forehead.',
    drops:[{id:'kapre_ash',chance:.6,qty:[2,4]},{id:'bato',chance:1,qty:[50,80]},{id:'anito_dust',chance:.4,qty:[2,3]}], dropText:'Kapre Ash, Bato, Anito Dust', gearChance:0.45, gold:[120,200] },
  berberoka: { name:'Berberoka', img:'img/e_nuno.png', tier:'Uncommon', role:'Tier 2 Guardian — swamp water spitter',
    xp:430, hp:400, minLevel:8, dmg:[11,18], speed:6.5, aggro:24, atkRange:19, atkCd:2.0, scale:1.8, r:1.4, ai:'ranged', defense:5,
    lore:'It drinks a pond dry to lure the thirsty, then vomits the flood all at once. The puddle you step in is its open mouth.',
    drops:[{id:'nuno_stone',chance:.4,qty:[1,1]},{id:'diwata_dew',chance:.7,qty:[2,4]},{id:'anito_dust',chance:.45,qty:[2,4]}], dropText:'Nuno Stone, Diwata Dew, Anito Dust', gearChance:0.2, gold:[35,60] },
  manananggal: { name:'Manananggal', img:'img/e_manananggal.png', tier:'Boss', role:'Tier 4 Catastrophe — winged terror of the crater',
    xp:2400, hp:3800, minLevel:1, dmg:[14,22], speed:9, aggro:40, atkRange:3.6, atkCd:2.0, scale:2.2, r:1.5, ai:'flyer', bleeds:true, boss:true,
    lore:'By day a beautiful woman; by night her torso tears free and hunts on vast bat wings, entrails trailing beneath. She roosts in the crater of Bulkan Apolaki. Find her lower half and salt it — or face her whole fury.',
    drops:[{id:'mutya',chance:1,qty:[1,2]},{id:'anito_dust',chance:1,qty:[6,10]},{id:'santelmo_flame',chance:.8,qty:[2,4]}], dropText:'Mutya ×2, Anito Dust, Santelmo Flame', gearChance:1.0, gold:[400,700] },
};
if (GAME_DATA.enemies) ENEMY_DEFS = GAME_DATA.enemies;

/* ---- Baybayin runes (socketables) ---- */
const RUNE_DEFS={
  rune_ka:{glyph:'ᜃ', name:'Baybayin ᜃ — Lakas',  desc:'+5% Attack',    apply:st=>st.atk*=1.05},
  rune_ba:{glyph:'ᜊ', name:'Baybayin ᜊ — Buhay',  desc:'+6% Max HP',    apply:st=>st.hp*=1.06},
  rune_ga:{glyph:'ᜄ', name:'Baybayin ᜄ — Galing', desc:'+4% Crit',      apply:st=>st.critCh+=4},
  rune_ta:{glyph:'ᜆ', name:'Baybayin ᜆ — Tibay',  desc:'+10% Defense',  apply:st=>st.def*=1.10},
  rune_la:{glyph:'ᜎ', name:'Baybayin ᜎ — Bilis',  desc:'+4% Move Speed',apply:st=>st.spdPct+=4},
};
const RUNE_IDS=Object.keys(RUNE_DEFS);
const SOCKETS_BY_RARITY={common:0, uncommon:1, rare:1, epic:2, legendary:3};
function itemSockets(it){                       // back-compat: old items get sockets lazily
  if(!it.sockets) it.sockets=new Array(SOCKETS_BY_RARITY[it.rarity]||0).fill(null);
  return it.sockets;
}
const FORAGE_KINDS = [
  {id:'palay', icon:'🌾', qty:[40,70]},{id:'niyog', icon:'🥥', qty:[25,45]},
  {id:'dahon', icon:'🍃', qty:[30,55]},{id:'bato', icon:'🪨', qty:[25,50]},
  {id:'kawayan', icon:'🎋', qty:[20,40]},
];

const RECIPES = [
  { id:'agimat_simula', cat:'forge', name:'Agimat ng Simula', icon:'🌅',
    effect:'+5% foraging speed', desc:'The Amulet of Beginnings. Every Babaylan\'s first step on the long road.',
    cost:{palay:2000, niyog:1200, bato:800}, apply:s=>{s.forageSpeedMult+=0.05;} },
  { id:'agimat_apoy', cat:'forge', name:'Agimat ng Apoy', icon:'🔥',
    effect:'+10% combat damage', desc:'The Amulet of Fire, quenched in Kapre ash and diwata dew.',
    cost:{kapre_ash:100, diwata_dew:75, kawayan:5000}, apply:s=>{s.damageMult+=0.10;} },
  { id:'agimat_kalikasan', cat:'forge', name:'Agimat ng Kalikasan', icon:'🌿',
    effect:'+20% foraging speed', desc:'The Amulet of Nature. The forest itself parts to offer its bounty.',
    cost:{kawayan:20000, dahon:5000, tikbalang_hair:250}, apply:s=>{s.forageSpeedMult+=0.20;} },
  { id:'barong', cat:'fiesta', name:'Sun-Kissed Barong', icon:'👘',
    effect:'Cosmetic Outfit', desc:'A radiant barong tagalog woven from piña fiber and captured sunlight.',
    cost:{palay:8000, mutya:50}, apply:()=>{} },
  { id:'bakunawa_shield', cat:'fiesta', name:'Bakunawa Scale Shield', icon:'🐉',
    effect:'+15 Defense', desc:'Forged from a scale of the moon-eating serpent.',
    cost:{bato:8000, kapre_ash:150}, apply:s=>{s.defenseBonus+=15;} },
  { id:'sarimanok', cat:'fiesta', name:'Sarimanok Mount', icon:'🐓',
    effect:'+15% move speed', desc:'The legendary rainbow-plumed bird of Maranao epic.',
    cost:{kawayan:12000, diwata_dew:120, mutya:30}, apply:s=>{s.moveSpeedMult+=0.15;} },
];

/* ---------------- EQUIPMENT ---------------- */
const RARITIES = [
  {id:'common',    name:'Common',    w:100, affixes:[0,1], color:'#c9d4d9', hex:0xc9d4d9, mult:1.0},
  {id:'uncommon',  name:'Uncommon',  w:45,  affixes:[1,2], color:'#6fdf8f', hex:0x6fdf8f, mult:1.25},
  {id:'rare',      name:'Rare',      w:16,  affixes:[2,3], color:'#6fa8ff', hex:0x6fa8ff, mult:1.6},
  {id:'epic',      name:'Epic',      w:5,   affixes:[3,4], color:'#c08aff', hex:0xc08aff, mult:2.1},
  {id:'legendary', name:'Legendary', w:1,   affixes:[4,5], color:'#ffb84a', hex:0xffb84a, mult:2.8},
];
const SLOT_DEFS = {
  mainhand:{name:'Main Hand', icon:'🗡️'}, offhand:{name:'Off Hand', icon:'🛡️'},
  head:{name:'Head', icon:'👒'}, chest:{name:'Chest', icon:'👕'}, legs:{name:'Legs/Feet', icon:'👖'},
  amulet1:{name:'Amulet I', icon:'📿'}, amulet2:{name:'Amulet II', icon:'📿'},
  ring1:{name:'Ring I', icon:'💍'}, ring2:{name:'Ring II', icon:'💍'}, cloak:{name:'Cloak', icon:'🧣'},
};
const WEAPON_NAMES = {babaylan:'Bolo', arnisador:'Arnis Sticks', tirador:'Slingshot', alim:'Spirit Staff', mandirigma:'Kampilan'};
const OFFHAND_NAMES = {babaylan:'Agimat Charm', arnisador:'Second Stick', tirador:'Stone Pouch', alim:'Talisman', mandirigma:'Kalasag Shield'};
const BASE_ITEMS = [
  {slot:'mainhand', icon:'🗡️', name:c=>WEAPON_NAMES[c], main:'atk'},
  {slot:'offhand',  icon:'🛡️', name:c=>OFFHAND_NAMES[c], main:'def'},
  {slot:'head',     icon:'👒', name:()=>'Salakot', main:'def'},
  {slot:'chest',    icon:'👕', name:()=>'Barong Vest', main:'hp'},
  {slot:'legs',     icon:'👖', name:()=>'Terrace Sandals', main:'spd'},
  {slot:'amulet1',  icon:'📿', name:()=>'Anito Amulet', main:'atk', alt:['amulet1','amulet2']},
  {slot:'ring1',    icon:'💍', name:()=>'Mutya Ring', main:'crit', alt:['ring1','ring2']},
  {slot:'cloak',    icon:'🧣', name:()=>'Sarimanok Cloak', main:'hp'},
];
const AFFIX_POOL = [
  {id:'atkPct', fmt:v=>`+${v}% Attack`, base:4, per:0.8},
  {id:'hpFlat', fmt:v=>`+${v} Max HP`, base:12, per:5},
  {id:'defFlat', fmt:v=>`+${v} Defense`, base:2, per:0.7},
  {id:'critCh', fmt:v=>`+${v}% Crit Chance`, base:3, per:0.4},
  {id:'critDmg', fmt:v=>`+${v}% Crit Damage`, base:8, per:1.6},
  {id:'moveSpd', fmt:v=>`+${v}% Move Speed`, base:2, per:0.35},
  {id:'lifesteal', fmt:v=>`+${v}% Life Steal`, base:2, per:0.25},
  {id:'cdr', fmt:v=>`+${v}% Cooldown Speed`, base:3, per:0.5},
  {id:'dropRate', fmt:v=>`+${v}% Material Find`, base:4, per:0.8},
  {id:'forageSpd', fmt:v=>`+${v}% Forage Speed`, base:4, per:0.8},
];
const LEGENDARY_EFFECTS = [
  {id:'bakunawa', txt:'🐉 Bakunawa\'s Hunger: +8% Life Steal'},
  {id:'sarimanok', txt:'🐓 Sarimanok\'s Grace: +10% Move Speed'},
  {id:'anito', txt:'✨ Anito\'s Favor: +15% XP Gain'},
  {id:'mutya', txt:'💎 Mutya Resonance: +10% Crit Chance'},
];
const RARITY_PREFIX = {common:['Worn','Simple','Plain'], uncommon:['Sturdy','Keen','Blessed'], rare:['Diwata\'s','Enchanted','Moonlit'], epic:['Ancestral','Storm-Woven','Spirit-Bound'], legendary:['Bakunawa','Sarimanok\'s','Mythic']};

let itemUid = 1;
function rollRarity(bonus=0){
  const table = RARITIES.map((r,i)=>({r, w:r.w * (1 + bonus*i*0.5)}));
  let total = table.reduce((a,b)=>a+b.w,0), roll = Math.random()*total;
  for(const t of table){ if((roll-=t.w)<=0) return t.r; }
  return RARITIES[0];
}
function makeItem(ilvl, rarityBonus=0, slotFilter=null){
  const pool0 = slotFilter ? BASE_ITEMS.filter(b=>slotFilter.includes(b.slot)) : BASE_ITEMS;
  const base = pool0[Math.floor(Math.random()*pool0.length)];
  const rar = rollRarity(rarityBonus);
  const nAff = rand(rar.affixes[0], rar.affixes[1]);
  const pool = [...AFFIX_POOL], affixes = [];
  for(let i=0;i<nAff && pool.length;i++){
    const a = pool.splice(Math.floor(Math.random()*pool.length),1)[0];
    const v = Math.round((a.base + a.per*ilvl) * rar.mult * rnd(0.8,1.2));
    affixes.push({id:a.id, v, txt:a.fmt(v)});
  }
  const mainV = Math.round((3 + ilvl*1.5) * rar.mult);
  const prefix = RARITY_PREFIX[rar.id][rand(0,2)];
  return {
    uid:itemUid++, slot:base.slot, altSlots:base.alt||null, icon:base.icon,
    name:`${prefix} ${base.name(S.cls||'babaylan')}`,
    rarity:rar.id, ilvl, main:base.main, mainV, affixes,
    sockets:new Array(SOCKETS_BY_RARITY[rar.id]||0).fill(null),
    legendary: rar.id==='legendary' ? LEGENDARY_EFFECTS[rand(0,LEGENDARY_EFFECTS.length-1)] : null,
    set: window._rollSet ? window._rollSet(rar.id) : null,
  };
}
function sellPrice(it){
  const ri = RARITIES.findIndex(r=>r.id===it.rarity);
  return Math.round((5 + it.ilvl*3) * Math.pow(2.4, ri));
}
function mainStatTxt(it){
  const v=Math.round(it.mainV*(1+(it.plus||0)*0.08));
  return it.main==='atk'?`+${v} Attack`: it.main==='def'?`+${v} Defense`:
         it.main==='hp'?`+${v*4} Max HP`: it.main==='spd'?`+${Math.round(v*0.6)}% Move Speed`:`+${Math.round(v*0.5)}% Crit Chance`;
}
function plusTag(it){ return (it.plus||0)>0?` <b style="color:#7df0ff">+${it.plus}</b>`:''; }
/* enhancement cost & odds: gold + bato + anito_dust; success rate drops with level */
function enhanceCost(it){
  const n=(it.plus||0)+1;                                  // next level
  return { gold:Math.round(150*Math.pow(1.55,n)), bato:20*n, anito_dust:n>=5?Math.ceil((n-4)*1.5):0 };
}
function enhanceRate(it){ return [1,1,0.95,0.9,0.85,0.75,0.65,0.55,0.45,0.35][(it.plus||0)] || 0; }

/* ---------------- CONSTANTS / STATE ---------------- */
/* new curve: gentle to Lv15 (as before), then a long climb to 70.
   ~2.05 exponent below 15, blended into steeper growth after 30. */
const XP_FOR = l => {
  const base=Math.round(100*Math.pow(l,2.05));
  const late=l>30 ? Math.round(base*Math.pow(1.045,l-30)) : base;   // extra grind after 30
  return late;
};
const LEVEL_CAP = 80;   /* raised for the Lv80 advancement ritual */
const UNLOCKS = {2:'Grand Tiangge hub access',3:'Pasalubong (offline rewards)',4:'Santelmo sightings',5:'Auto-Forage · Sigbin prowls',7:'Kapre elites',8:'Nuno sa Punso',9:'Aswang hunts at the edges',10:'Fiesta Stall · Isla ng Bathala portal',15:'Veteran hunter — elite drops improve',20:'CLASS ADVANCEMENT — buksan ang ☰ menu → 🌟 Pag-angat!',30:'The long road — enemies yield more gold',40:'IKALAWANG PAG-ANGAT — bagong ritwal (\u2630 \u2192 \ud83c\udf1f)!',50:'Anito-blessed',60:'IKATLONG PAG-ANGAT — ang mga bathala ay nakatingin (\u2630 \u2192 \ud83c\udf1f)!',70:'Anito-blessed elder',80:'BATHALA\'S CHOSEN (cap)'};
const OFFLINE_CAP_MS = 8*3600*1000, OFFLINE_MIN_MS = 60*1000;

const DEFAULT_STATE = () => ({
  cls:null, name:'', app:{gender:'male', skin:1, hairStyle:0, hairColor:0},
  level:1, xp:0, hp:100, gold:0,
  forageSpeedMult:1, damageMult:1, dropMult:1, moveSpeedMult:1, defenseBonus:0,
  inv:{}, agimats:[], bestiary:{}, pitySinceUncommon:0, pityRareFails:0,
  gear:{}, bag:[],
  quests:{cur:0, prog:0, done:false},
  pets:{owned:[], active:null, mounted:false},
  autoForage:false, lastSeen:Date.now(), exchanges:0, px:null, py:null, itemUid:1,
  adv:false, ach:null, diwa:null, agimat0:null,
});
let S = DEFAULT_STATE();
/* ---- ACCOUNT / CLOUD SAVE ---- */
const ACCT={token:localStorage.getItem('agimat_token')||'', user:localStorage.getItem('agimat_user')||'', color:localStorage.getItem('agimat_color')||'', dirty:false, lastPush:0};
async function api(path,body){
  try{
    const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    return await r.json();
  }catch(e){ return {ok:false,err:'Hindi maabot ang server.'}; }
}
function acctSetSession(token,user,color,remember=true){
  ACCT.token=token; ACCT.user=user; ACCT.color=color||'';
  if(remember){
    localStorage.setItem('agimat_token',token); localStorage.setItem('agimat_user',user);
    if(color) localStorage.setItem('agimat_color',color);
  } else {
    /* session only: keep in memory, clear any stored copy */
    localStorage.removeItem('agimat_token'); localStorage.removeItem('agimat_user'); localStorage.removeItem('agimat_color');
  }
}
function acctLogout(){
  ACCT.token=''; ACCT.user=''; ACCT.color='';
  localStorage.removeItem('agimat_token'); localStorage.removeItem('agimat_user'); localStorage.removeItem('agimat_color');
}
function cloudPush(){                       // fire-and-forget; throttled to 10s
  if(!ACCT.token) return;
  const now=Date.now();
  if(now-ACCT.lastPush<10000){ ACCT.dirty=true; return; }
  ACCT.lastPush=now; ACCT.dirty=false;
  api('/api/save',{token:ACCT.token, save:JSON.stringify(S)}).then(r=>{
    if(!r.ok&&/log in/i.test(r.err||'')){
      /* session expired server-side (e.g. server restarted) — tell the player
         instead of silently downgrading to guest */
      acctLogout();
      try{ toast('⚠️ <b>Nag-expire ang session mo.</b> Naka-lokal na save ka na lang — mag-log in muli sa ⚙️ Settings para bumalik sa cloud save.','warn'); }catch(e){}
    }
    /* Phase 7 server authority: server clamped an implausible gold value — accept it */
    if(r.ok&&r.clamped&&typeof r.gold==='number'){ S.gold=r.gold; updateHUD(); }
    /* Phase 8 escrow: items held by the Palengke can't also be in our save — drop them */
    if(r.ok&&Array.isArray(r.escStripped)&&r.escStripped.length){
      const esc=new Set(r.escStripped);
      S.bag=S.bag.filter(it=>!esc.has(it.uid));
      for(const k of Object.keys(S.gear||{})) if(S.gear[k]&&esc.has(S.gear[k].uid)) delete S.gear[k];
      try{ computeStats(); }catch(e){} updateHUD();
    }
  });
}
setInterval(()=>{ if(ACCT.dirty) cloudPush(); },10000);
function save(){ S.lastSeen=Date.now(); S.px=player.x; S.py=player.z; S.itemUid=itemUid; try{localStorage.setItem('agimat_save3',JSON.stringify(S));}catch(e){} cloudPush(); }
function load(){ try{ const r=localStorage.getItem('agimat_save3'); if(r){ S=Object.assign(DEFAULT_STATE(),JSON.parse(r)); itemUid=S.itemUid||1; return true; } }catch(e){} return false; }
function adoptSave(json){ try{ S=Object.assign(DEFAULT_STATE(),JSON.parse(json)); itemUid=S.itemUid||1; localStorage.setItem('agimat_save3',json); return true; }catch(e){ return false; } }

/* ---------------- HELPERS ---------------- */
const $ = id=>document.getElementById(id);
const rand=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const rnd=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const d2=(ax,az,bx,bz)=>{const dx=ax-bx,dz=az-bz;return dx*dx+dz*dz;};
const fmt=n=>n>=1000?n.toLocaleString('en-US'):''+n;
function addInv(id,q){ S.inv[id]=(S.inv[id]||0)+q; }
function dropScale(q){ return Math.max(1,Math.round(q*Math.pow(1.08,S.level-1)*(1+P.dropRate/100)*S.dropMult)); }
function toast(msg,cls=''){
  const t=document.createElement('div'); t.className='toast '+cls; t.innerHTML=msg;
  $('toast-stack').appendChild(t); setTimeout(()=>t.remove(),2700);
  while($('toast-stack').children.length>3)$('toast-stack').firstChild.remove();
}
function nowS(){ return performance.now()/1000; }

/* ---------------- DERIVED STATS ---------------- */
const P = {maxHp:100, atk:10, def:2, spd:16, critCh:10, critDmg:150, lifesteal:0, cdr:0, dropRate:0, forageSpd:0, xpGain:0};
function computeStats(){
  const C = CLASSES[S.cls||'babaylan'];
  let hp = C.base.hp + C.growth.hp*(S.level-1);
  let atk = C.base.atk + C.growth.atk*(S.level-1);
  let def = C.base.def + C.growth.def*(S.level-1) + S.defenseBonus;
  let spdPct=0, critCh=10, critDmg=150, ls=0, cdr=0, dr=0, fs=0, xg=0;
  for(const it of Object.values(S.gear)){
    if(!it) continue;
    const eMul=1+(it.plus||0)*0.08;                       // ⚒️ +8% main stat per enhancement level
    const mv=Math.round(it.mainV*eMul);
    if(it.main==='atk') atk+=mv;
    else if(it.main==='def') def+=mv;
    else if(it.main==='hp') hp+=mv*4;
    else if(it.main==='spd') spdPct+=mv*0.6;
    else if(it.main==='crit') critCh+=mv*0.5;
    for(const rid of (it.sockets||[])){
      if(rid&&RUNE_DEFS[rid]){ const st={atk,hp,def,critCh,spdPct}; RUNE_DEFS[rid].apply(st); ({atk,hp,def,critCh,spdPct}=st); }
    }
    for(const a of it.affixes){
      if(a.id==='atkPct') atk*=(1+a.v/100);
      else if(a.id==='hpFlat') hp+=a.v;
      else if(a.id==='defFlat') def+=a.v;
      else if(a.id==='critCh') critCh+=a.v;
      else if(a.id==='critDmg') critDmg+=a.v;
      else if(a.id==='moveSpd') spdPct+=a.v;
      else if(a.id==='lifesteal') ls+=a.v;
      else if(a.id==='cdr') cdr+=a.v;
      else if(a.id==='dropRate') dr+=a.v;
      else if(a.id==='forageSpd') fs+=a.v;
    }
    if(it.legendary){
      if(it.legendary.id==='bakunawa') ls+=8;
      else if(it.legendary.id==='sarimanok') spdPct+=10;
      else if(it.legendary.id==='anito') xg+=15;
      else if(it.legendary.id==='mutya') critCh+=10;
    }
  }
  P.maxHp=Math.round(hp); P.atk=Math.round(atk*S.damageMult); P.def=Math.round(def);
  const pet=(S.pets&&S.pets.active)||null;
  if(pet==='sarimanok') dr+=12;
  if(pet==='tarsier') xg+=10;
  if(pet==='paniki') ls+=4;
  P.spd=C.base.spd*(1+spdPct/100)*S.moveSpeedMult*((S.pets&&S.pets.mounted)?1.6:1);
  P.critCh=Math.min(75,critCh); P.critDmg=critDmg; P.lifesteal=Math.min(30,ls);
  P.cdr=Math.min(50,cdr); P.dropRate=dr; P.forageSpd=fs; P.xpGain=xg;
  /* ---- Diwa + unang Agimat: small creation-time blessings (spec §5/§6) ---- */
  if(S.diwa==='apoy')        P.atk=Math.round(P.atk*1.02);
  else if(S.diwa==='tubig')  P.maxHp=Math.round(P.maxHp*1.03);
  else if(S.diwa==='lupa')   P.def+=2;
  else if(S.diwa==='hangin') P.spd*=1.02;
  else if(S.diwa==='anino')  P.critCh=Math.min(75,P.critCh+2);
  else if(S.diwa==='diwa')   P.xpGain+=5;
  if(S.agimat0==='kalasag')       P.def+=3;
  else if(S.agimat0==='pangil')   P.atk=Math.round(P.atk*1.02);
  else if(S.agimat0==='bulong')   P.xpGain+=4;
  else if(S.agimat0==='balahibo') P.spd*=1.02;
  else if(S.agimat0==='suwerte')  P.dropRate+=4;
  if(S.hp>P.maxHp) S.hp=P.maxHp;
}

/* ================================================================
   3D WORLD
   ================================================================ */
/* MAP CONFIG (restructure spec §11/§13): data/maps/main.json is authoritative;
   literals remain as fallback. Geometry = content configuration, not architecture. */
const MAPCFG=GAME_DATA.mapMain||{};
// World-Spec imported map (WorldForge). When present, terrain heights + zones come from it instead of worldgen.
const WS_MAP=(MAPCFG&&MAPCFG.source==='worldspec')?MAPCFG:null;
let WS_SEA=0,WS_K=1;
if(WS_MAP&&WS_MAP.heights){ let mx=-1e9; for(const r of WS_MAP.heights)for(const v of r)if(v>mx)mx=v; WS_SEA=WS_MAP.seaLevel||0; WS_K=26/Math.max(1,(mx-WS_SEA)); }
const wsH=(tx,ty)=>{ if(!WS_MAP)return 0; const gy=ty<0?0:(ty>=WS_MAP.gridH?WS_MAP.gridH-1:ty); const gx=tx<0?0:(tx>=WS_MAP.gridW?WS_MAP.gridW-1:tx); const r=WS_MAP.heights[gy]; const h=r?(r[gx]||0):0; return (h-WS_SEA)*WS_K; };
/* LAYER B (terrain): per-map terrain theme chosen at load. Sagada gets real
   verticality (scaled heights + north rise toward the shrine summit), a cool
   misty fog and its 7 zone names; Banaue stays the identity baseline. The world
   is rebuilt for the saved map on boot; changeMap() reloads to apply it. */
const _SAG_URL=/[?&]map=map_sagada/.test(location.search); // preview override for testing
const ACTIVE_MAP=_SAG_URL?'map_sagada':((typeof S!=='undefined'&&S&&S.currentMap)||'map_starting');
const SAG=ACTIVE_MAP==='map_sagada';
const IS_BANAUE=!SAG; // landmark set (waterfalls/caves/summit) only on the Banaue boot
/* Per-map plateau heights + crisp palettes (MS2-style diorama). Each region gets its
   OWN silhouette and colors so no two maps read the same. */
const ZH = window.WORLDGEN.heights(ACTIVE_MAP);   // per-map plateau bases (worldgen.js)
const ZCOL = window.WORLDGEN.palette(ACTIVE_MAP); // per-map crisp palettes (worldgen.js)
const TERRAIN_THEME=(_SAG_URL||(typeof S!=='undefined'&&S&&S.currentMap==='map_sagada'))?{
  heightScale:2.2, northRise:7, fog:0xb8ccd8, fogNear:50, fogFar:150,
  zoneNames:['🏡 Sagada Village','🌫️ Misty Arrival Trail','🌲 Pine Forest','⛰️ Cliffside Trail','🕳️ Limestone Caves',
             '🌫️ Misty Arrival Trail','🌿 Echo Valley','⛩️ Ancient Mountain Shrine','🌿 Echo Valley','⛩️ Ancient Mountain Shrine'],
  zoneFlavors:['the mountain hub','where the mist greets you','whispering pines','mind the drop','the deep caves',
             'where the mist greets you','the echoing valley','the sacred summit','the echoing valley','the sacred summit'],
}:{ heightScale:1.5, northRise:0, fog:0xa8c8e8, fogNear:70, fogFar:150, zoneNames:null, zoneFlavors:null };
const TILE=MAPCFG.tile||4, MAP_W=MAPCFG.gridW||192, MAP_H=MAPCFG.gridH||105, WORLD_W=MAP_W*TILE, WORLD_H=MAP_H*TILE; // mainland 134×105 (~30% smaller) + eastern isle 50×40
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
const mrand = mulberry32(MAPCFG.seed||20260905);
const grid = new Uint8Array(MAP_W*MAP_H); // 0/1 grass, 2 water, 3 path, 4 cliff
/* zones: 0 Payyo Terraces, 1 Kawayan Grove, 2 Gubat ng Balete, 3 Nuno Highlands, 4 Sunog Scar,
          5 Dalampasigan (beach/sea), 6 Bakawan Swamp, 7 Bulkan Apolaki, 8 Parang ng Tala, 9 Isla ng Bathala */
const zoneGrid = new Uint8Array(MAP_W*MAP_H);
let ZONE_NAMES=['🌾 Payyo Terraces','🎋 Kawayan Grove','🌳 Gubat ng Balete','⛰️ Nuno Highlands','🔥 Sunog Scar',
                  '🏖️ Dalampasigan','🌿 Bakawan Swamp','🌋 Bulkan Apolaki','🌸 Parang ng Tala','🏝️ Isla ng Bathala'];
let ZONE_FLAVORS=['home of gentle spirits','whispering bamboo','the old dark wood','tread with respect… tabi-tabi po','the burnt land — santelmos roam','salt wind and white sand','black water… something watches','the mountain of fire — Apolaki sleeps','a sea of flowers under the stars','the forbidden isle — only the worthy return'];
if(Array.isArray(MAPCFG.zones)&&MAPCFG.zones.length===10){ ZONE_NAMES=MAPCFG.zones.map(z=>z.name); ZONE_FLAVORS=MAPCFG.zones.map(z=>z.flavor); }
if(TERRAIN_THEME.zoneNames){ ZONE_NAMES=TERRAIN_THEME.zoneNames; ZONE_FLAVORS=TERRAIN_THEME.zoneFlavors||ZONE_FLAVORS; }
const riverY = new Int16Array(MAP_W).fill(-99);   // legacy W→E course (unused by V2 river)
const riverMask = new Uint8Array(MAP_W*MAP_H);     // 1 = main-river tile (V2 Tinun-an)
const MAIN_W=MAPCFG.mainlandWidth||134;           // mainland ends here; beyond is the eastern sea
const SEA_Y=MAPCFG.seaY||87;                      // ty>=SEA_Y: open sea (south edge)
const VOLCANO=MAPCFG.volcano||{tx:112,ty:28,r:22};// crater center, east of the mainland
const LAKE=MAPCFG.lake||{tx:102,ty:13,r:5};       // mountain lake where the river ends
const ISLE=MAPCFG.isle||{x0:142,y0:30,x1:192,y1:70}; // 50×40 — the level-10 island
const ISLE_MIN_LEVEL=(MAPCFG.isle&&MAPCFG.isle.minLevel)||10;
function inIsle(tx,ty){ return tx>=ISLE.x0&&tx<ISLE.x1&&ty>=ISLE.y0&&ty<ISLE.y1; }
function isRiver(tx,ty){ return tx>=0&&ty>=0&&tx<MAIN_W&&ty<MAP_H&&riverMask[ty*MAP_W+tx]===1; }
(function genMap(){
  for(let y=0;y<MAP_H;y++)for(let x=0;x<MAP_W;x++) grid[y*MAP_W+x]=mrand()<0.5?0:1;
  // --- V2 Tinun-an River (worldgen design layer): west-side corridor, flows N→S ---
  {
    const riv=window.WORLDGEN.generateRivers(ACTIVE_MAP)[0];
    const hw=Math.max(1,Math.floor((riv.width||2)/2));
    const carve=(x,y)=>{ for(let dy=-1;dy<=1;dy++)for(let dx=-hw;dx<=hw;dx++){
        const xx=x+dx, yy=y+dy;
        if(xx<1||yy<1||xx>=MAIN_W-1||yy>=MAP_H-1) continue;
        grid[yy*MAP_W+xx]=2; riverMask[yy*MAP_W+xx]=1;
      } };
    const pts=riv.points;
    for(let i=0;i<pts.length;i++){
      carve(pts[i].x,pts[i].y);
      if(i<pts.length-1){ // interpolate between sparse spline samples => continuous channel
        const a=pts[i], b=pts[i+1], steps=Math.max(Math.abs(b.x-a.x),Math.abs(b.y-a.y));
        for(let s=1;s<steps;s++) carve(Math.round(a.x+(b.x-a.x)*s/steps), Math.round(a.y+(b.y-a.y)*s/steps));
      }
    }
  }
  // mountain lake (kept as a separate highland feature, NE)
  for(let y=0;y<MAP_H;y++)for(let x=0;x<MAIN_W;x++){
    const dl=Math.hypot(x-LAKE.tx,y-LAKE.ty);
    if(dl<LAKE.r+(mrand()-0.5)) grid[y*MAP_W+x]=2;
  }
  // --- zones: per-map macro layout from worldgen.js (each region its own silhouette) ---
  for(let y=0;y<MAP_H;y++)for(let x=0;x<MAP_W;x++){
    zoneGrid[y*MAP_W+x]=WS_MAP?((WS_MAP.zoneGrid&&WS_MAP.zoneGrid[y]&&WS_MAP.zoneGrid[y][x])||0):window.WORLDGEN.zoneIndex(ACTIVE_MAP,x,y,MAIN_W);
  }
  // --- eastern sea: everything past the mainland is water, except the island ---
  for(let y=0;y<MAP_H;y++)for(let x=MAIN_W;x<MAP_W;x++){
    grid[y*MAP_W+x]=inIsle(x,y)?(mrand()<0.5?0:1):2;
  }
  // --- southern open sea ---
  for(let y=SEA_Y;y<MAP_H;y++)for(let x=0;x<MAIN_W;x++) grid[y*MAP_W+x]=2;
  for(let x=0;x<MAIN_W;x++){
    const sh=Math.round(1.6*Math.sin(x*0.21)+1.1*Math.sin(x*0.07+3));
    for(let y=SEA_Y-2;y<SEA_Y;y++){ if(y>=SEA_Y-2+ -sh) continue; grid[y*MAP_W+x]=2; }
  }
  // --- ISLA NG BATHALA: cliff ring, jungle ponds, west landing clearing ---
  for(let y=ISLE.y0;y<ISLE.y1;y++)for(let x=ISLE.x0;x<ISLE.x1;x++){
    const edge = x<ISLE.x0+2||x>=ISLE.x1-2||y<ISLE.y0+2||y>=ISLE.y1-2;
    if(edge){
      // west-side beach landing gap at the portal clearing
      if(x<ISLE.x0+2 && y>=48&&y<=54) { grid[y*MAP_W+x]=0; continue; }
      grid[y*MAP_W+x]=4;
    }
  }
  for(let i=0;i<8;i++){                                          // jungle ponds
    const cx=ISLE.x0+6+Math.floor(mrand()*38), cy=ISLE.y0+6+Math.floor(mrand()*28), r=1+mrand()*1.8;
    for(let y=Math.floor(cy-r);y<=cy+r;y++)for(let x=Math.floor(cx-r);x<=cx+r;x++){
      if(!inIsle(x,y)||x<ISLE.x0+3||x>=ISLE.x1-3||y<ISLE.y0+3||y>=ISLE.y1-3) continue;
      if(Math.hypot(x-cx,y-cy)<=r) grid[y*MAP_W+x]=2;
    }
  }
  // island trails: landing → center → three camps
  for(let x=ISLE.x0;x<ISLE.x0+24;x++){ grid[51*MAP_W+x]=3; }
  for(let y=38;y<=62;y++){ grid[y*MAP_W+(ISLE.x0+24)]=3; }
  for(let x=ISLE.x0+24;x<ISLE.x1-8;x++){ grid[38*MAP_W+x]=3; grid[62*MAP_W+x]=3; }
  // --- swamp pools ---
  for(let i=0;i<20;i++){
    const cx=90+Math.floor(mrand()*40), cy=54+Math.floor(mrand()*24), r=1.2+mrand()*2.4;
    for(let y=Math.floor(cy-r);y<=cy+r;y++)for(let x=Math.floor(cx-r);x<=cx+r;x++){
      if(x<3||y<3||x>=MAIN_W-1||y>=SEA_Y-3) continue;
      if(zoneGrid[y*MAP_W+x]!==6) continue;
      if(Math.hypot(x-cx,y-cy)<=r) grid[y*MAP_W+x]=2;
    }
  }
  // --- Balangaw summit lake (crater basin) ---
  for(let y=0;y<MAP_H;y++)for(let x=0;x<MAIN_W;x++){
    if(zoneGrid[y*MAP_W+x]!==8) continue;
    if(Math.hypot(x-VOLCANO.tx,y-VOLCANO.ty)<3) grid[y*MAP_W+x]=2;
  }
  // --- rice paddies (terraces only) ---
  for(let i=0;i<40;i++){
    const w=2+Math.floor(mrand()*4), h=1+Math.floor(mrand()*2);
    const x0=2+Math.floor(mrand()*(MAIN_W-w-4)), y0=2+Math.floor(mrand()*(SEA_Y-h-4));
    if(x0>18&&x0<32&&y0>22&&y0<34) continue;
    let ok=true;
    for(let y=y0;y<y0+h&&ok;y++)for(let x=x0;x<x0+w&&ok;x++){
      const _z=zoneGrid[y*MAP_W+x];
      if((_z!==1&&_z!==5)||grid[y*MAP_W+x]===2) ok=false;
    }
    if(!ok) continue;
    for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++) grid[y*MAP_W+x]=2;
  }
  // --- V2 stepped terraces (worldgen design layer): Batad (z1) + Ancient (z5) ---
  if(IS_BANAUE){
    for(const zone of [1,5]){
      const terr=window.WORLDGEN.generateTerraces(ACTIVE_MAP,zone);
      for(const t of terr){
        for(let ay=t.cy-t.w;ay<=t.cy+t.w;ay++){
          for(let ax=t.cx-t.w;ax<=t.cx+t.w;ax++){
            if(ax<2||ay<2||ax>=MAIN_W-2||ay>=SEA_Y-2) continue;
            if(zoneGrid[ay*MAP_W+ax]!==zone) continue;
            const gt=grid[ay*MAP_W+ax]; if(gt===2||gt===4) continue;
            // alternate flooded paddy / grass step rows => readable stepped terraces
            if((ay-(t.cy-t.w))%2===0) grid[ay*MAP_W+ax]=2;
          }
        }
      }
    }
  }
  // --- roads ---
  let py=27;
  for(let x=4;x<108;x++){                                        // E-W: grove → volcano foothills
    if(grid[py*MAP_W+x]!==2) grid[py*MAP_W+x]=3;
    if(mrand()<0.25)py=clamp(py+(mrand()<0.5?-1:1),21,36);
    if(grid[py*MAP_W+x]!==2) grid[py*MAP_W+x]=3;
  }
  let by=74;
  for(let x=10;x<126;x++){                                       // coastal road
    if(grid[by*MAP_W+x]!==2) grid[by*MAP_W+x]=3;
    if(mrand()<0.3)by=clamp(by+(mrand()<0.5?-1:1),70,77);
  }
  let ny=6;
  for(let x=4;x<100;x++){                                        // northern trail (north of the river source)
    if(grid[ny*MAP_W+x]!==2) grid[ny*MAP_W+x]=3;
    if(mrand()<0.3)ny=clamp(ny+(mrand()<0.5?-1:1),3,7);
  }
  for(const fy of [27,43,74]){                                   // stone fords across the Tinun-an
    for(let x=2;x<MAIN_W-2;x++){
      if(!riverMask[fy*MAP_W+x]) continue;
      for(let dy=-1;dy<=1;dy++){ const yy=fy+dy; if(yy>0&&yy<MAP_H-1) grid[yy*MAP_W+x]=3; }
    }
  }
  // --- borders: cliffs on mainland N/W edges only; the seas are the other borders ---
  for(let y=0;y<MAP_H;y++)for(let x=0;x<MAIN_W;x++){
    if(y>=SEA_Y-1) continue;
    if(x<2||y<2) grid[y*MAP_W+x]=4;
  }
  /* ---- GRAND TIANGGE v2: the town now sits at the HEART of the mainland ---- */
  for(let y=37;y<=50;y++)for(let x=58;x<=75;x++) grid[y*MAP_W+x]=3;  // central plaza (expanded)
  /* grand crossroads: four clear paved roads run from the plaza to the four world gates */
  for(let y=2;y<=36;y++){ for(const x of [65,66,67,68]){ if(grid[y*MAP_W+x]!==2&&grid[y*MAP_W+x]!==4) grid[y*MAP_W+x]=3; } }  // NORTH gate (→ Sagada)
  for(let y=51;y<=SEA_Y-2;y++){ for(const x of [65,66,67,68]){ if(grid[y*MAP_W+x]!==2&&grid[y*MAP_W+x]!==4) grid[y*MAP_W+x]=3; } } // SOUTH gate (→ Pinatubo)
  for(let x=2;x<=57;x++){ for(const y of [42,43,44,45]){ if(grid[y*MAP_W+x]!==2&&grid[y*MAP_W+x]!==4) grid[y*MAP_W+x]=3; } }  // WEST gate (→ La Union)
  for(let x=76;x<=MAIN_W-2;x++){ for(const y of [42,43,44,45]){ if(grid[y*MAP_W+x]!==2&&grid[y*MAP_W+x]!==4) grid[y*MAP_W+x]=3; } } // EAST gate (→ Isabela)
})();

/* ---- ENEMY CAMPS: every species holds its own territory, like a proper RPG ---- */
const PORTAL_TOWN=(MAPCFG.portals&&MAPCFG.portals.town)?{x:MAPCFG.portals.town.tx*TILE, z:MAPCFG.portals.town.ty*TILE}:{x:71.5*TILE, z:43.5*TILE}; // portal pad inside town, east plaza
const PORTAL_ISLE=(MAPCFG.portals&&MAPCFG.portals.isle)?{x:MAPCFG.portals.isle.tx*TILE, z:MAPCFG.portals.isle.ty*TILE}:{x:(ISLE.x0+3.5)*TILE, z:51*TILE}; // island landing pad
let CAMPS={
  /* mainland */
  /* TIER 1 — Pest & Trickster: the OUTSKIRTS ring around Barangay Liwanag */
  tiyanak:  [{x:10*TILE, z:33*TILE},{x:33*TILE, z:18*TILE},{x:46*TILE, z:44*TILE}],
  duwende:  [{x:6*TILE,  z:22*TILE},{x:14*TILE, z:36*TILE},{x:50*TILE, z:32*TILE}],
  nuno:     [{x:24*TILE, z:28*TILE},{x:14*TILE, z:44*TILE},{x:8*TILE,  z:6*TILE}],
  sigbin:   [{x:28*TILE, z:52*TILE},{x:40*TILE, z:5*TILE}, {x:88*TILE, z:52*TILE}],
  /* TIER 2 — Territorial Guardian: deep forest (Gubat ng Balete) & swamps */
  tikbalang:[{x:40*TILE, z:7*TILE}, {x:38*TILE, z:35*TILE},{x:30*TILE, z:60*TILE},{x:88*TILE, z:20*TILE}],
  wakwak:    [{x:43*TILE, z:7*TILE},{x:158*TILE,z:36*TILE},{x:176*TILE,z:38*TILE}],
  berberoka: [{x:106*TILE,z:52*TILE},{x:20*TILE, z:70*TILE},{x:160*TILE,z:63*TILE},{x:178*TILE,z:64*TILE}],
  /* TIER 3 — Elite Predator: Sunog Scar, volcano foothills, dark south-east */
  santelmo: [{x:44*TILE, z:23*TILE},{x:96*TILE, z:34*TILE},{x:104*TILE,z:40*TILE}],
  kapre:    [{x:33*TILE, z:6*TILE}, {x:118*TILE,z:60*TILE}],
  aswang:   [{x:106*TILE,z:58*TILE},{x:78*TILE, z:62*TILE}],
  /* TIER 4 — Mythic Catastrophe: the island giant (Manananggal & world bosses spawn elsewhere) */
  bungisngis:[{x:182*TILE,z:52*TILE},{x:172*TILE,z:46*TILE}],
};
if (GAME_DATA.spawns && GAME_DATA.spawns.camps) { CAMPS = {}; for (const k in GAME_DATA.spawns.camps) CAMPS[k] = GAME_DATA.spawns.camps[k].map(c => ({ x: c.tx * TILE, z: c.ty * TILE })); }
const CAMP_R=((GAME_DATA.spawns&&GAME_DATA.spawns.campRadius)||13)*1.0;                                  // camp radius (world units)
/* hanging bridge over the gorge (walkable deck) */
/* hanging bridge crosses the Tinun-an at the west-gate road (y≈43); its span is
   auto-fitted to the river width there and the deck runs east↔west. */
let _bx0=MAIN_W,_bx1=0; for(let x=0;x<MAIN_W;x++){ if(riverMask[43*MAP_W+x]){ if(x<_bx0)_bx0=x; if(x>_bx1)_bx1=x; } }
if(_bx1<=_bx0){ _bx0=24;_bx1=30; }
const BRIDGE={x0:(_bx0-2)*TILE, x1:(_bx1+2)*TILE, z0:42*TILE, z1:45*TILE, deck:6.35};

/* ---- THE GRAND TIANGGE: walled safe-zone town ---- */
const _TC=MAPCFG.town||{x0:58,x1:75,z0:37,z1:50};
const TOWN={x0:_TC.x0*TILE, x1:_TC.x1*TILE, z0:_TC.z0*TILE, z1:_TC.z1*TILE}; // heart of the mainland (Barangay Liwanag — expanded)

/* ================================================================
   PHASE 0 — WORLD MAP DATA SYSTEM
   Map/portal metadata lives here (ids, names, level bands, tiers,
   resources, spawn points, portals, minimap art). Per-map 3D terrain is
   a later phase (Layer B); today the instance system swaps state, spawns,
   portals, transition and ambience on the shared world.
   ================================================================ */
const WORLD_MAPS={
  map_starting:{
    id:'map_starting', name:'Barangay Liwanag', region:'Banaue Highlands', icon:'🏮',
    recLevel:[1,10], enemyTier:1, lootTier:1,
    resources:['rice','bamboo','wood','herbs','stone'],
    art:'assets/maps/barangay-liwanag.jpg', fog:0xa8c8e8,
    lore:'“Dito nagsisimula ang iyong alamat.”',
    spawns:{ town:{x:266,z:174} }, defaultSpawn:'town',
    portals:[ {id:'p_to_sagada', to:'map_sagada', at:{x:266,z:24}, r:6, label:'Sagada Highlands (North Gate)'} ],
  },
  map_test:{
    id:'map_test', name:'Mt. Pinatubo — Ashen Frontier', region:'TEST Instance', icon:'🌋',
    recLevel:[30,45], enemyTier:4, lootTier:4,
    resources:['volcanic stone','ash crystal','fire essence'],
    art:null, fog:0xd8a070,
    lore:'“Ang abo ay humihinga pa.”',
    spawns:{ entrance:{x:448,z:136} }, defaultSpawn:'entrance',
    portals:[ {id:'p_to_start', to:'map_starting', at:{x:452,z:140}, r:5, label:'Barangay Liwanag'} ],
  },
  /* LZ-R02 — Sagada Highlands (per Sagada_Highlands_Map_Spec_v3.md).
     Data+art integration now; per-map 3D terrain is the follow-up Layer B step. */
  map_sagada:{
    id:'map_sagada', name:'Sagada Highlands', region:'Mountains of Whispers', icon:'🌲',
    recLevel:[10,25], enemyTier:2, lootTier:2,
    resources:['mountain herbs','cold crystals','ancient stone','mist essence','pine wood'],
    art:'assets/maps/sagada-highlands.jpg', fog:0xb8ccd8,
    lore:'“Some paths are not meant to be found, but felt.”',
    zones:[
      {id:'Z1',name:'Misty Arrival Trail',lv:[10,12]},
      {id:'Z2',name:'Sagada Village',lv:[10,15]},
      {id:'Z3',name:'Pine Forest',lv:[12,16]},
      {id:'Z4',name:'Echo Valley',lv:[13,17]},
      {id:'Z5',name:'Limestone Caves',lv:[14,18]},
      {id:'Z6',name:'Cliffside Trail',lv:[16,22]},
      {id:'Z7',name:'Ancient Mountain Shrine',lv:[18,25]},
    ],
    spawns:{ arrival:{x:266,z:150} }, defaultSpawn:'arrival',
    portals:[ {id:'p_to_banaue', to:'map_starting', at:{x:250,z:210}, r:5, label:'Barangay Liwanag'} ],
  },
};
window.WORLD_MAPS=WORLD_MAPS;
const curMap=()=>WORLD_MAPS[S.currentMap]||WORLD_MAPS.map_starting;
window.curMap=curMap;

/* ================================================================
   PHASE 1 — MAP INSTANCE MANAGER
   changeMap(): loading transition + destination display + spawn-point
   respawn + current-map state (saved) + ambience/minimap swap.
   Portal proximity triggers below; return portals round-trip.
   ================================================================ */
function applyMapVisuals(){
  const m=curMap();
  if(window.scene&&window.scene.fog) window.scene.fog.color.setHex(m.fog);
  else if(typeof scene!=='undefined'&&scene&&scene.fog) scene.fog.color.setHex(m.fog);
  if(window._setMapArt) window._setMapArt(m);
}
window.changeMap=function(toId,spawnId){
  const to=WORLD_MAPS[toId]; if(!to||!started) return;
  const sp=to.spawns[spawnId||to.defaultSpawn]||to.spawns[to.defaultSpawn];
  const fromSag=(S.currentMap==='map_sagada'), toSag=(toId==='map_sagada');
  const done=()=>{
    S.currentMap=toId; S.spawnPoint=spawnId||to.defaultSpawn;
    if(sp){ player.x=sp.x; player.z=sp.z; }          // set destination pos BEFORE save so reload resumes here
    save();
    if(fromSag!==toSag){ location.href=location.pathname+'?map='+encodeURIComponent(toId); return; } // theme differs → reload to rebuild terrain
    applyMapVisuals(); updateHUD();
  };
  if(window._mapLore) window._mapLore[toId]=[to.icon,to.name.toUpperCase(),to.lore];
  if(window._mapTransition) window._mapTransition(toId,done); else done();
};
setInterval(()=>{ // portal proximity triggers
  if(!started) return;
  const m=curMap();
  for(const p of (m.portals||[]))
    if(Math.hypot(player.x-p.at.x,player.z-p.at.z)<=(p.r||5)){ window.changeMap(p.to); return; }
},300);
window._dbgMap=()=>{ let mx=-99; for(let i=0;i<vHeights.length;i++) if(vHeights[i]>mx)mx=vHeights[i];
  return { map:S.currentMap||'map_starting',
  fog:(typeof scene!=='undefined'&&scene&&scene.fog)?scene.fog.color.getHexString():null,
  name:curMap().name, px:Math.round(player.x), pz:Math.round(player.z), maxH:Math.round(mx*10)/10 }; };
(function(){ // on login, respawn at the saved map/spawn if not the starting map
  let done=false;
  setInterval(()=>{ if(started&&!done){ done=true;
    const m=curMap(); const sp=m.spawns[S.spawnPoint||m.defaultSpawn];
    if(S.currentMap&&S.currentMap!=='map_starting'&&sp){ player.x=sp.x; player.z=sp.z; }
    applyMapVisuals();
  }},500);
})();
const EXCL=MAPCFG.townExclusion||{x0:56,x1:77,z0:35,z1:52};        // no-spawn/no-tree frame around town
const GATE_CX=66.5*TILE, GATE_CZ=43.5*TILE, GATE_HALF=4, WALL_T=1.3;
function inTown(x,z){ return x>TOWN.x0&&x<TOWN.x1&&z>TOWN.z0&&z<TOWN.z1; }
function wallBlocked(x,z){
  const inX=x>TOWN.x0-WALL_T&&x<TOWN.x1+WALL_T, inZ=z>TOWN.z0-WALL_T&&z<TOWN.z1+WALL_T;
  if(!inX||!inZ) return false;
  // N & S walls (gates centered on the main road)
  if(Math.abs(z-TOWN.z0)<WALL_T && Math.abs(x-GATE_CX)>GATE_HALF) return true;
  if(Math.abs(z-TOWN.z1)<WALL_T && Math.abs(x-GATE_CX)>GATE_HALF) return true;
  // W & E walls (gates centered on the crossroad)
  if(Math.abs(x-TOWN.x0)<WALL_T && Math.abs(z-GATE_CZ)>GATE_HALF) return true;
  if(Math.abs(x-TOWN.x1)<WALL_T && Math.abs(z-GATE_CZ)>GATE_HALF) return true;
  return false;
}
const bldRects=[]; // filled by buildTown(); blocks movement
function tileIdx(wx,wz){ const tx=Math.floor(wx/TILE), ty=Math.floor(wz/TILE); if(tx<0||ty<0||tx>=MAP_W||ty>=MAP_H)return 4; return grid[ty*MAP_W+tx]; }
function onBridge(wx,wz){ return wx>=BRIDGE.x0-1&&wx<=BRIDGE.x1+1&&wz>=BRIDGE.z0-1&&wz<=BRIDGE.z1+1; }
function blockedTile(wx,wz){ if(onBridge(wx,wz)) return false; const t=tileIdx(wx,wz); return t===2||t===4; }

/* terraced base heights per tile, sculpted by zone */
function tileBand(ty){ return Math.max(0,Math.floor((38-ty)/4)); }
function tileBaseH(tx,ty){
  if(tx<0||ty<0||tx>=MAP_W||ty>=MAP_H) return (ty>=SEA_Y-4||tx>=MAIN_W)?-2.2:9;
  const t=grid[ty*MAP_W+tx];
  const zn=zoneGrid[ty*MAP_W+tx];
  if(zn===9){                                        // island + eastern sea
    if(!inIsle(tx,ty)) return -2.4;                  // sea floor
    if(t===4) return 6.5+((tx*7+ty*13)%4)*0.4;       // cliff ring
    let h=0.6+0.7*Math.sin(tx*0.23)*Math.cos(ty*0.19)+((tx*3+ty*7)%3)*0.14;
    if(t===2) h-=0.5;
    return h;
  }
  if(t===4) return ZH[zn]+3.5;
  let h=window.WORLDGEN.plateauHeight(ACTIVE_MAP,zn,tx,ty,VOLCANO); // plateau model (worldgen.js)
  if(tx>=58&&tx<=75&&ty>=37&&ty<=50) h=ZH[3];                     // town plaza flat
  if(t===2){
    if(ty>=SEA_Y-2) return -2.4;
    h-=0.45; if(isRiver(tx,ty)) h-=2.6;
    if(Math.hypot(tx-LAKE.tx,ty-LAKE.ty)<LAKE.r+2) h=Math.min(h,1.2);
  }
  return h;
}
/* vertex heights (smooth-ish) */
const VW_=MAP_W+1, VH_=MAP_H+1;
const vHeights=new Float32Array(VW_*VH_);
(function buildVerts(){
  const vr=mulberry32(4242);
  for(let vy=0;vy<VH_;vy++)for(let vx=0;vx<VW_;vx++){
    if(WS_MAP){ vHeights[vy*VW_+vx]=wsH(vx,vy); continue; }   // World-Spec imported terrain
    let sum=0,n=0;
    for(let dy=-1;dy<=0;dy++)for(let dx=-1;dx<=0;dx++){
      const tx=vx+dx, ty=vy+dy;
      sum+=tileBaseH(tx,ty); n++;   // tileBaseH handles out-of-bounds (sea edge stays low)
    }
    let h=sum/n + (vr()-0.5)*0.12;
    /* Layer B: per-map verticality. Sagada scales heights and rises toward the
       north (shrine summit); sea/eastern isle stay low so coastlines hold. */
    if(TERRAIN_THEME.heightScale!==1 || TERRAIN_THEME.northRise){
      const mainland = vx<MAIN_W && vy<SEA_Y;
      h = h*TERRAIN_THEME.heightScale + (mainland? TERRAIN_THEME.northRise*(1-vy/SEA_Y):0);
    }
    vHeights[vy*VW_+vx]=h;
  }
})();
function groundY(wx,wz){
  if(onBridge(wx,wz)&&tileIdx(wx,wz)===2){
    // sag in the middle of the hanging bridge (deck runs east↔west)
    const mid=(BRIDGE.x0+BRIDGE.x1)/2, half=(BRIDGE.x1-BRIDGE.x0)/2;
    const s=1-Math.pow((wx-mid)/half,2);
    return BRIDGE.deck-0.55*s;
  }
  const fx=clamp(wx/TILE,0,MAP_W-0.001), fz=clamp(wz/TILE,0,MAP_H-0.001);
  const x0=Math.floor(fx), z0=Math.floor(fz);
  const tx=fx-x0, tz=fz-z0;
  const h00=vHeights[z0*VW_+x0], h10=vHeights[z0*VW_+x0+1];
  const h01=vHeights[(z0+1)*VW_+x0], h11=vHeights[(z0+1)*VW_+x0+1];
  return (h00*(1-tx)+h10*tx)*(1-tz) + (h01*(1-tx)+h11*tx)*tz;
}

/* static objects */
const TENT = {x:66.5*TILE, z:41.6*TILE};
const trees=[];
(function placeTrees(){
  /* V2 design layer (worldgen.js): deterministic vegetation points + per-zone
     family. Replaces the old Math.random scatter, so the forest is identical
     every load and follows the spec's per-zone density (pine on Cloudridge,
     broadleaf palms/balete elsewhere). Same collision/exclusion rules. */
  const veg=window.WORLDGEN.generateVegetation(ACTIVE_MAP);
  for(const v of veg){
    const x=v.x*TILE+TILE/2, z=v.y*TILE+TILE/2;
    if(x>EXCL.x0*TILE&&x<EXCL.x1*TILE&&z>EXCL.z0*TILE&&z<EXCL.z1*TILE) continue;
    if(blockedTile(x,z)||onBridge(x,z)) continue;
    const zn=zoneGrid[Math.floor(z/TILE)*MAP_W+Math.floor(x/TILE)];
    if(zn===3||zn===8) continue; // no trees in the barangay / on Balangaw Peak
    if(zn===9&&!inIsle(Math.floor(x/TILE),Math.floor(z/TILE))) continue; // no trees in the sea
    if(trees.some(t=>d2(t.x,t.z,x,z)<14*14)) continue;
    trees.push({x,z,s:0.7+((v.x*31+v.y*17)%60)/100, family:v.family}); // deterministic size
  }
})();
function blockedByObjects(x,z,r){
  if(Math.abs(x-TENT.x)<9+r && z>TENT.z-4 && z<TENT.z+7+r) return true;
  if(wallBlocked(x,z)) return true;
  for(const b of bldRects){ if(x>b.x0-r&&x<b.x1+r&&z>b.z0-r&&z<b.z1+r) return true; }
  for(const t of trees){ const rr=1.1*t.s+r; if(d2(t.x,t.z,x,z)<rr*rr) return true; }
  return false;
}
function walkable(x,z,r){
  return !(blockedTile(x-r,z)||blockedTile(x+r,z)||blockedTile(x,z-r)||blockedTile(x,z+r)) && !blockedByObjects(x,z,r);
}
const nodes=[];
(function placeNodes(){
  let tries=0;
  while(nodes.length<120 && tries++<9000){
    const kind=FORAGE_KINDS[Math.floor(mrand()*FORAGE_KINDS.length)];
    const x=rnd(4*TILE,(MAP_W-4)*TILE), z=rnd(4*TILE,(MAP_H-4)*TILE);
    if(x>18*TILE&&x<33*TILE&&z>22*TILE&&z<32*TILE) continue;
    if(!walkable(x,z,1.2)) continue;
    if(nodes.some(n=>d2(n.x,n.z,x,z)<10*10)) continue;
    nodes.push({x,z,kind,ready:true,respawnAt:0,bob:Math.random()*6.28,mesh:null});
  }
})();

/* ---------------- THREE SETUP ---------------- */
const canvas=$('game');
/* Detect a low-power/mobile GPU BEFORE the renderer is built so we can skip MSAA
   and cap resolution — these are the biggest drivers of GPU OOM / context loss. */
// broad detection: any touch device, small viewport, or low-spec hardware → light path
// ULTRA-LIGHT mode: opt-in via ?low=1 / ?ultra=1 or the title-screen toggle (localStorage). Bare-minimum graphics so it runs on the weakest devices.
const ULTRA=(function(){ try{ return localStorage.getItem('agimat_ultralight')==='1' || /[?&](low|ultra)=1/.test(location.search); }catch(e){ return /[?&](low|ultra)=1/.test(location.search); } })();
const isMobileGPU=ULTRA || (navigator.maxTouchPoints>0) || Math.min(window.innerWidth,window.innerHeight)<820 || /Android|iPhone|iPad|iPod|Mobile|UCBrowser|Quetta|Silk/i.test(navigator.userAgent||'');
const renderer=new THREE.WebGLRenderer({canvas, antialias:!isMobileGPU, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(ULTRA?0.5:(isMobileGPU?0.85:1.75), window.devicePixelRatio||1)); // restored original high-res (was dropped to 1.0/0.75); 1.75 = crisp, not ultra
window.__renderer=renderer;   // exposed for perf probes
// if the GPU drops the WebGL context (common on weak mobile), reload instead of a dead black screen
renderer.domElement.addEventListener('webglcontextlost',e=>{ e.preventDefault(); },false);
renderer.domElement.addEventListener('webglcontextrestored',()=>{ try{location.reload();}catch(_){} },false);
renderer.shadowMap.enabled=false;   // shadows OFF everywhere (one of the biggest GPU costs)
renderer.shadowMap.type=isMobileGPU?THREE.PCFShadowMap:THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.18;
/* WebGL context-loss recovery: instead of staying black/white when the GPU drops
   the context, prevent the default and reload once cleanly (session-guarded). */
canvas.addEventListener('webglcontextlost',(e)=>{ e.preventDefault();
  if(!sessionStorage.getItem('agimat_ctx_reload')){ sessionStorage.setItem('agimat_ctx_reload','1'); setTimeout(()=>location.reload(),700); }
},false);
canvas.addEventListener('webglcontextrestored',()=>{ sessionStorage.removeItem('agimat_ctx_reload'); },false);
const scene=new THREE.Scene();
window.__scene=scene;   // exposed for perf probes
scene.fog=new THREE.Fog(TERRAIN_THEME.fog, TERRAIN_THEME.fogNear??70, TERRAIN_THEME.fogFar??185);
const camera=new THREE.PerspectiveCamera(55, 1, 0.1, 1400);

/* ---- POST-PROCESSING: bloom + tonemapped output ---- */
const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
const bloomPass=new UnrealBloomPass(new THREE.Vector2(window.innerWidth,window.innerHeight), 0.62, 0.55, 0.8);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());
/* mobile: skip the expensive bloom pass entirely (it is the biggest per-frame cost) */
bloomPass.enabled=false;   // perf: bloom is a big per-frame cost — off on all devices

/* ---- CHUNK STREAMING: the world is built once, but only chunks near the player
   stay visible — distant chunks are set visible=false so the GPU skips them
   entirely (no draw calls, no water shading). This is the main lag fix. ---- */
const CHUNK_TILES=12, CHUNK_W=CHUNK_TILES*TILE, VIEW_CHUNKS=isMobileGPU?1:3;  // small view radius on mobile (fewer objects drawn)
const chunkMap=new Map();
function registerChunk(obj,wx,wz){
  const key=Math.floor(wx/CHUNK_W)+','+Math.floor(wz/CHUNK_W);
  let a=chunkMap.get(key); if(!a){ a=[]; chunkMap.set(key,a); } a.push(obj);
}
let _pcx=1e9,_pcy=1e9;
function updateChunkVisibility(force){
  const pcx=Math.floor(player.x/CHUNK_W), pcy=Math.floor(player.z/CHUNK_W);
  if(!force&&pcx===_pcx&&pcy===_pcy) return;
  _pcx=pcx; _pcy=pcy;
  for(const [key,arr] of chunkMap){
    const i=key.indexOf(','), cx=+key.slice(0,i), cy=+key.slice(i+1);
    const vis=Math.abs(cx-pcx)<=VIEW_CHUNKS&&Math.abs(cy-pcy)<=VIEW_CHUNKS;
    for(let k=0;k<arr.length;k++) arr[k].visible=vis;
  }
}

function onResize(){
  const w=window.innerWidth,h=window.innerHeight;
  renderer.setSize(w,h,false);
  composer.setSize(w,h);
  camera.aspect=w/h; camera.updateProjectionMatrix();
}
window.addEventListener('resize',onResize); onResize();

/* AUTO-IMMERSIVE: fullscreen + landscape as soon as the browser permits. Browsers
   require a user gesture for these, so we fire on the first pointer/key input — the
   start/login tap the player makes anyway — making it feel automatic. */
function enterImmersive(){
  try{ if(screen.orientation&&screen.orientation.lock) screen.orientation.lock('landscape').catch(()=>{}); }catch(e){}
  const el=document.documentElement;
  try{
    if(!document.fullscreenElement){
      if(el.requestFullscreen) el.requestFullscreen().catch(()=>{});
      else if(el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    }
  }catch(e){}
}
let _immersiveArmed=false;
function armImmersive(){ if(_immersiveArmed) return; _immersiveArmed=true; enterImmersive(); }
for(const _ev of ['pointerdown','keydown','touchend']) window.addEventListener(_ev,armImmersive,{once:true});
window.enterImmersive=enterImmersive; // exposed for testing

/* sky dome (gradient) */
const clouds=[];
(function buildSky(){
  const skyGeo=new THREE.SphereGeometry(240,16,12);
  const skyMat=new THREE.ShaderMaterial({
    side:THREE.BackSide, depthWrite:false, fog:false,
    uniforms:{
      top:{value:new THREE.Color(0x3a78c2)},
      mid:{value:new THREE.Color(0x9cc4e8)},
      bot:{value:new THREE.Color(0xf2d8a8)},
    },
    vertexShader:`varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
      void main(){
        float h=normalize(vP).y;
        vec3 c = h>0.25 ? mix(mid,top,smoothstep(0.25,0.9,h)) : mix(bot,mid,smoothstep(-0.1,0.25,h));
        gl_FragColor=vec4(c,1.0);
      }`,
  });
  const sky=new THREE.Mesh(skyGeo,skyMat);
  sky.frustumCulled=false; window._sky=sky;
  scene.add(sky);
  // drifting clouds
  const cloudMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.85,fog:false});
  for(let i=0;i<26;i++){
    const g=new THREE.Group();
    const n=rand(3,5);
    for(let k=0;k<n;k++){
      const puff=new THREE.Mesh(new THREE.SphereGeometry(rnd(3,6),7,6), cloudMat);
      puff.position.set(rnd(-7,7),rnd(-1,1.5),rnd(-3,3));
      puff.scale.y=0.55;
      g.add(puff);
    }
    g.position.set(rnd(-120,WORLD_W+140), rnd(46,78), rnd(-120,WORLD_H+140));
    g.userData.speed=rnd(0.6,1.6);
    scene.add(g); clouds.push(g);
  }
  // distant mountains ring
  const mtnMat=new THREE.MeshBasicMaterial({color:0x5a7aa8,transparent:true,opacity:0.85,fog:false});
  for(let i=0;i<9;i++){
    const a=i/9*Math.PI*2;
    const m=new THREE.Mesh(new THREE.ConeGeometry(rnd(60,110),rnd(60,120),5), mtnMat);
    m.position.set(WORLD_W/2+Math.cos(a)*520, 0, WORLD_H/2+Math.sin(a)*460);
    scene.add(m);
  }
})();

scene.add(new THREE.HemisphereLight(0xd8e8ff, 0x4a6a34, 1.0));
const amb=new THREE.AmbientLight(0xfff2dc, 0.35); scene.add(amb);
const sun=new THREE.DirectionalLight(0xffe9c0, 2.2);
/* environment reflections for PBR: subtle sky/ground gradient env map */
{
  const pmrem=new THREE.PMREMGenerator(renderer);
  const envScene=new THREE.Scene();
  const envGeo=new THREE.SphereGeometry(50,16,12);
  const envMat=new THREE.ShaderMaterial({
    side:THREE.BackSide,
    uniforms:{},
    vertexShader:'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'varying vec3 vP; void main(){ float h=normalize(vP).y*0.5+0.5; vec3 sky=mix(vec3(0.45,0.42,0.32), vec3(0.55,0.72,0.95), h); gl_FragColor=vec4(sky,1.0); }'
  });
  envScene.add(new THREE.Mesh(envGeo,envMat));
  scene.environment=pmrem.fromScene(envScene,0.04).texture;
  pmrem.dispose();
}
sun.position.set(50,80,20);
sun.castShadow=true;
sun.shadow.mapSize.set(isMobileGPU?1024:1024,isMobileGPU?1024:1024);
sun.shadow.camera.near=10; sun.shadow.camera.far=220;
sun.shadow.camera.left=-55; sun.shadow.camera.right=55;
sun.shadow.camera.top=55; sun.shadow.camera.bottom=-55;
sun.shadow.bias=-0.0015;
scene.add(sun); scene.add(sun.target);

/* ================================================================
   PROCEDURAL TEXTURES (no downloads — generated on canvas)
   ================================================================ */
function makeTex(size, painter, {repeat=1, bump=false}={}){
  const cv=document.createElement('canvas'); cv.width=cv.height=size;
  const ctx=cv.getContext('2d');
  painter(ctx,size);
  const tx=new THREE.CanvasTexture(cv);
  tx.wrapS=tx.wrapT=THREE.RepeatWrapping;
  tx.repeat.set(repeat,repeat);
  tx.anisotropy=8;
  if(!bump) tx.colorSpace=THREE.SRGBColorSpace;
  return tx;
}
const seededNoise=seed=>{ const r=mulberry32(seed); return ()=>r(); };
/* speckle painter: base color + grain + blotches */
function speckle(ctx,s,base,grains,blotches,seed=1){
  const rr=seededNoise(seed);
  ctx.fillStyle=base; ctx.fillRect(0,0,s,s);
  for(const [col,count,size] of blotches){
    ctx.fillStyle=col;
    for(let i=0;i<count;i++){
      ctx.globalAlpha=0.12+rr()*0.25;
      ctx.beginPath(); ctx.arc(rr()*s,rr()*s,size*(0.5+rr()),0,6.28); ctx.fill();
    }
  }
  ctx.globalAlpha=1;
  for(const [col,count] of grains){
    ctx.fillStyle=col;
    for(let i=0;i<count;i++){ ctx.globalAlpha=0.25+rr()*0.5; ctx.fillRect(rr()*s,rr()*s,1+rr()*2,1+rr()*2); }
  }
  ctx.globalAlpha=1;
}
const TEX={
  /* near-neutral luminance grass: multiplies with terrain vertex colors (zone tints) */
  grass: makeTex(256,(c,s)=>speckle(c,s,'#d8dcd2',[['#f2f5ee',900],['#b8bfae',700],['#e8ecdf',350]],[['#c8cdbf',40,22],['#e2e6da',30,18]],11),{repeat:24}),
  grassB: makeTex(256,(c,s)=>speckle(c,s,'#808078',[['#a0a098',600],['#606058',600]],[['#8a8a80',30,20]],12,),{bump:true,repeat:24}),
  stone: makeTex(256,(c,s)=>{ speckle(c,s,'#8a8078',[['#9a938a',700],['#6e665e',600]],[['#7a7268',36,26]],21);
    // mortar cracks
    c.strokeStyle='rgba(60,54,48,.55)'; c.lineWidth=2;
    for(let y=0;y<4;y++){ c.beginPath(); c.moveTo(0,y*64+32); c.lineTo(s,y*64+32); c.stroke(); }
    for(let y=0;y<4;y++)for(let x=0;x<4;x++){ c.beginPath(); const ox=(y%2)*32; c.moveTo(x*64+ox,y*64+32); c.lineTo(x*64+ox,y*64+96); c.stroke(); }
  },{repeat:3}),
  stoneB: makeTex(256,(c,s)=>{ speckle(c,s,'#888',[['#aaa',500],['#666',500]],[],22);
    c.strokeStyle='#333'; c.lineWidth=3;
    for(let y=0;y<4;y++){ c.beginPath(); c.moveTo(0,y*64+32); c.lineTo(s,y*64+32); c.stroke(); }
    for(let y=0;y<4;y++)for(let x=0;x<4;x++){ c.beginPath(); const ox=(y%2)*32; c.moveTo(x*64+ox,y*64+32); c.lineTo(x*64+ox,y*64+96); c.stroke(); }
  },{bump:true,repeat:3}),
  wood: makeTex(256,(c,s)=>{ c.fillStyle='#7a5a38'; c.fillRect(0,0,s,s);
    const rr=seededNoise(31);
    for(let x=0;x<s;x+=4+rr()*6){
      c.strokeStyle=`rgba(${70+rr()*40|0},${48+rr()*26|0},${26+rr()*16|0},${0.4+rr()*0.4})`;
      c.lineWidth=2+rr()*3; c.beginPath(); c.moveTo(x,0);
      c.bezierCurveTo(x+rr()*8-4,s*0.33,x+rr()*8-4,s*0.66,x+rr()*6-3,s); c.stroke();
    }
    for(let i=0;i<5;i++){ c.strokeStyle='rgba(50,34,18,.5)'; c.lineWidth=1.5;
      const kx=rr()*s,ky=rr()*s; c.beginPath(); c.ellipse(kx,ky,3+rr()*4,6+rr()*8,0,0,6.28); c.stroke(); }
  },{repeat:2}),
  woodB: makeTex(256,(c,s)=>{ c.fillStyle='#888'; c.fillRect(0,0,s,s);
    const rr=seededNoise(32);
    for(let x=0;x<s;x+=4+rr()*6){ c.strokeStyle=`rgba(${rr()<0.5?40:200},${rr()<0.5?40:200},${rr()<0.5?40:200},.5)`;
      c.lineWidth=2+rr()*2; c.beginPath(); c.moveTo(x,0); c.lineTo(x+rr()*6-3,s); c.stroke(); }
  },{bump:true,repeat:2}),
  thatch: makeTex(256,(c,s)=>{ c.fillStyle='#c9a85a'; c.fillRect(0,0,s,s);
    const rr=seededNoise(41);
    for(let y=0;y<s;y+=7){
      for(let x=0;x<s;x+=3){
        c.strokeStyle=`rgba(${150+rr()*70|0},${110+rr()*55|0},${50+rr()*30|0},.8)`;
        c.lineWidth=1.6; c.beginPath(); c.moveTo(x,y+rr()*3); c.lineTo(x+2,y+7+rr()*3); c.stroke();
      }
      c.strokeStyle='rgba(90,64,30,.5)'; c.lineWidth=1;
      c.beginPath(); c.moveTo(0,y); c.lineTo(s,y); c.stroke();
    }
  },{repeat:2}),
  fabric: makeTex(128,(c,s)=>{ c.fillStyle='#fff'; c.fillRect(0,0,s,s);
    const rr=seededNoise(51);
    for(let y=0;y<s;y+=3){ c.strokeStyle=`rgba(0,0,0,${0.05+rr()*0.1})`; c.beginPath(); c.moveTo(0,y); c.lineTo(s,y); c.stroke(); }
    for(let x=0;x<s;x+=3){ c.strokeStyle=`rgba(0,0,0,${0.05+rr()*0.08})`; c.beginPath(); c.moveTo(x,0); c.lineTo(x,s); c.stroke(); }
  },{repeat:3}),
  bark: makeTex(256,(c,s)=>{ c.fillStyle='#5c4328'; c.fillRect(0,0,s,s);
    const rr=seededNoise(61);
    for(let x=0;x<s;x+=5+rr()*8){
      c.strokeStyle=`rgba(${40+rr()*30|0},${28+rr()*22|0},${14+rr()*12|0},${0.5+rr()*0.4})`;
      c.lineWidth=3+rr()*4; c.beginPath(); c.moveTo(x,0);
      c.bezierCurveTo(x+rr()*14-7,s*0.4,x+rr()*14-7,s*0.7,x+rr()*10-5,s); c.stroke();
    }
  },{repeat:1.5}),
  barkB: makeTex(256,(c,s)=>{ c.fillStyle='#777'; c.fillRect(0,0,s,s);
    const rr=seededNoise(62);
    for(let x=0;x<s;x+=5+rr()*8){ c.strokeStyle=rr()<0.5?'rgba(20,20,20,.7)':'rgba(220,220,220,.5)';
      c.lineWidth=3+rr()*3; c.beginPath(); c.moveTo(x,0); c.lineTo(x+rr()*10-5,s); c.stroke(); }
  },{bump:true,repeat:1.5}),
};
/* PBR material helpers — MeshStandardMaterial with map+bump */
const PBR=(c,opts={})=>{ if(isMobileGPU&&opts){ opts=Object.assign({},opts); delete opts.bumpMap; delete opts.normalMap; delete opts.bumpScale; delete opts.normalScale; if(ULTRA){ delete opts.map; } } return new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:0.85,metalness:0.02},opts)); };
const M=(c,opts={})=>PBR(c,opts); // upgrade every existing M() call site to PBR
const Mstone=(c=0xffffff,o={})=>PBR(c,Object.assign({map:TEX.stone,bumpMap:TEX.stoneB,bumpScale:0.6,roughness:0.95},o));
const Mwood =(c=0xffffff,o={})=>PBR(c,Object.assign({map:TEX.wood,bumpMap:TEX.woodB,bumpScale:0.35,roughness:0.8},o));
const Mthatch=(c=0xffffff,o={})=>PBR(c,Object.assign({map:TEX.thatch,roughness:1},o));
const Mbark =(c=0xffffff,o={})=>PBR(c,Object.assign({map:TEX.bark,bumpMap:TEX.barkB,bumpScale:0.5,roughness:0.95},o));
const Mcloth=(c,o={})=>PBR(c,Object.assign({map:TEX.fabric,roughness:0.9},o));

/* ---- terrain mesh ---- */
(function buildTerrain(){
  const geo=new THREE.PlaneGeometry(WORLD_W, WORLD_H, MAP_W, MAP_H);
  geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position;
  const colors=new Float32Array(pos.count*3);
  const col=new THREE.Color();
  const cr=mulberry32(999);
  for(let i=0;i<pos.count;i++){
    const vx=i%VW_, vz=Math.floor(i/VW_);
    pos.setX(i, vx*TILE); pos.setZ(i, vz*TILE);
    pos.setY(i, vHeights[vz*VW_+vx]);
    // color by adjacent tiles
    let path=0,cliff=0,n=0,zn=0;
    for(let dy=-1;dy<=0;dy++)for(let dx=-1;dx<=0;dx++){
      const tx=vx+dx,ty=vz+dy;
      if(tx>=0&&ty>=0&&tx<MAP_W&&ty<MAP_H){ n++;
        const t=grid[ty*MAP_W+tx];
        if(t===3)path++; if(t===4)cliff++;
        zn=zoneGrid[ty*MAP_W+tx];
      }
    }
    if(cliff>0&&n>0) col.setHex(0x6b6258);
    else if(path>=2) col.setHex(0xb08a58);
    else if(path===1) col.setHex(0x94804a);
    else { const _zc=ZCOL[zn]||ZCOL[0]; col.setHex(_zc[(vx+vz)&1]); }  // crisp per-map zone palette (MS2 diorama)
    colors[i*3]=col.r; colors[i*3+1]=col.g; colors[i*3+2]=col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors,3));
  geo.computeVertexNormals();
  // UVs for texture tiling across the world
  const uvs=new Float32Array(pos.count*2);
  for(let i=0;i<pos.count;i++){ uvs[i*2]=pos.getX(i)/WORLD_W*76; uvs[i*2+1]=pos.getZ(i)/WORLD_H*62; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs,2));
  const terrTex=TEX.grass.clone(); terrTex.repeat.set(1,1); terrTex.needsUpdate=true;
  const terrBump=TEX.grassB.clone(); terrBump.repeat.set(1,1); terrBump.needsUpdate=true;
  const mesh=new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors:true, map:terrTex, bumpMap:terrBump, bumpScale:0.4, roughness:0.95, metalness:0
  }));
  mesh.receiveShadow=true;
  scene.add(mesh);
  // grass tufts scattered on walkable land
  const tuftGeo=new THREE.ConeGeometry(0.07,0.55,3);
  const tuftMat=M(0x5c9a4a);
  const tufts=new THREE.InstancedMesh(tuftGeo,tuftMat,4200);
  const mtx=new THREE.Matrix4(), q=new THREE.Quaternion(), sc=new THREE.Vector3(), pv=new THREE.Vector3();
  const tr2=mulberry32(31337);
  let placed=0, guard=0;
  while(placed<4200&&guard++<42000){
    const x=4*TILE+tr2()*(MAP_W-8)*TILE, z=4*TILE+tr2()*(MAP_H-8)*TILE;
    const t=tileIdx(x,z);
    if(t!==0&&t!==1) continue;
    const _tz=zoneGrid[Math.floor(z/TILE)*MAP_W+Math.floor(x/TILE)];
    if(_tz===4||_tz===7||_tz===5) continue; // no grass in scar/volcano/beach
    if(_tz===9&&!inIsle(Math.floor(x/TILE),Math.floor(z/TILE))) continue;
    pv.set(x, groundY(x,z)+0.25, z);
    q.setFromAxisAngle(new THREE.Vector3(0,1,0), tr2()*6.28);
    sc.setScalar(0.7+tr2()*0.9);
    mtx.compose(pv,q,sc);
    tufts.setMatrixAt(placed++, mtx);
  }
  tufts.count=ULTRA?0:Math.min(900,placed);   // capped hard for perf (was 4200)
  scene.add(tufts);
  /* --- ZONE BEAUTIFICATION pass 1 (town ring / start meadow / river banks):
      wildflower scatter so the lived-in areas read lush, like the concept art.
      Each zone can get its own pass like this, one at a time. --- */
  const flGeo=new THREE.ConeGeometry(0.09,0.42,4);
  const flMat=new THREE.MeshStandardMaterial({roughness:0.9,flatShading:true});
  const flowers=new THREE.InstancedMesh(flGeo,flMat,900);
  const fc=new THREE.Color();
  let fp=0, fg=0;
  while(fp<900&&fg++<9000){
    const x=4*TILE+tr2()*(MAIN_W-8)*TILE, z=4*TILE+tr2()*(SEA_Y-8)*TILE;
    const t=tileIdx(x,z); if(t!==0&&t!==1) continue;
    const tz=zoneGrid[Math.floor(z/TILE)*MAP_W+Math.floor(x/TILE)];
    if(!(tz===3||tz===0||tz===4)) continue;
    pv.set(x, groundY(x,z)+0.18, z);
    q.setFromAxisAngle(new THREE.Vector3(0,1,0), tr2()*6.28);
    sc.setScalar(0.6+tr2()*0.8);
    mtx.compose(pv,q,sc);
    flowers.setMatrixAt(fp, mtx);
    fc.setHex([0xff8ac2,0xffd24a,0xffffff,0xc08aff,0xff6a5e][fp%5]);
    flowers.setColorAt(fp, fc);
    fp++;
  }
  flowers.count=ULTRA?0:Math.min(120,fp);   // capped hard for perf (was 900)
  if(flowers.instanceColor) flowers.instanceColor.needsUpdate=true;
  scene.add(flowers);
})();

/* ---- water paddies ---- */
const waterMeshes=[];
/* ================================================================
   REALISTIC WATER — custom shader: scrolling ripple normal maps,
   fresnel sky reflection, sun glints, vertex waves, flow direction
   ================================================================ */
/* procedural ripple normal map: height noise → normals */
function makeWaterNormalTex(size=128,seed=808){
  const rr=mulberry32(seed);
  // height field from layered radial bumps
  const h=new Float32Array(size*size);
  for(let b=0;b<90;b++){
    const bx=rr()*size, by=rr()*size, br=4+rr()*14, amp=(rr()-0.5)*2;
    const r2=br*br;
    for(let y=-br;y<=br;y++)for(let x=-br;x<=br;x++){
      const d=x*x+y*y; if(d>r2) continue;
      const px=((bx+x)%size+size)%size, py=((by+y)%size+size)%size;
      h[py*size+px|0]+=amp*(1-d/r2)*(1-d/r2);
    }
  }
  const cv=document.createElement('canvas'); cv.width=cv.height=size;
  const ctx=cv.getContext('2d');
  const img=ctx.createImageData(size,size);
  const at=(x,y)=>h[((y%size+size)%size)*size+((x%size+size)%size)];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=at(x+1,y)-at(x-1,y), dy=at(x,y+1)-at(x,y-1);
    const i=(y*size+x)*4;
    img.data[i]  =clamp(128-dx*90,0,255);
    img.data[i+1]=clamp(128-dy*90,0,255);
    img.data[i+2]=255;
    img.data[i+3]=255;
  }
  ctx.putImageData(img,0,0);
  const tx=new THREE.CanvasTexture(cv);
  tx.wrapS=tx.wrapT=THREE.RepeatWrapping;
  return tx;
}
const waterNormalTex=makeWaterNormalTex();
const waterMats=[]; // time-updated
function WaterMat({deep, shallow, opacity, flowX, flowZ, speed, waveAmp, glint}){
  const mat=new THREE.ShaderMaterial({
    transparent:true,
    fog:true,
    uniforms:THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime:{value:0},
        uNormalMap:{value:waterNormalTex},
        uDeep:{value:new THREE.Color(deep)},
        uShallow:{value:new THREE.Color(shallow)},
        uSky:{value:new THREE.Color(0x9fc8ef)},
        uSunDir:{value:new THREE.Vector3(50,80,20).normalize()},
        uOpacity:{value:opacity},
        uFlow:{value:new THREE.Vector2(flowX,flowZ)},
        uSpeed:{value:speed},
        uWaveAmp:{value:waveAmp},
        uGlint:{value:glint},
      }
    ]),
    vertexShader:`
      uniform float uTime; uniform float uWaveAmp; uniform vec2 uFlow;
      varying vec3 vWorld; varying vec3 vView;
      #include <fog_pars_vertex>
      void main(){
        vec4 wp = modelMatrix * vec4(position,1.0);
        // world-position phased waves — seamless across tile meshes
        float ph = wp.x*1.7 + wp.z*1.3;
        wp.y += sin(uTime*1.6 + ph)*uWaveAmp
              + sin(uTime*2.7 + wp.z*2.3 - wp.x*0.8)*uWaveAmp*0.5;
        vWorld = wp.xyz;
        vView = cameraPosition - wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader:`
      uniform float uTime; uniform sampler2D uNormalMap;
      uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSky;
      uniform vec3 uSunDir; uniform float uOpacity; uniform vec2 uFlow;
      uniform float uSpeed; uniform float uGlint;
      varying vec3 vWorld; varying vec3 vView;
      #include <fog_pars_fragment>
      void main(){
        // two ripple layers scrolling at different speeds/directions
        vec2 uv = vWorld.xz*0.14;
        vec3 n1 = texture2D(uNormalMap, uv + uFlow*uTime*uSpeed).rgb*2.0-1.0;
        vec3 n2 = texture2D(uNormalMap, uv*1.9 - uFlow.yx*uTime*uSpeed*0.6 + 0.35).rgb*2.0-1.0;
        vec3 n = normalize(vec3(n1.x+n2.x*0.5, 3.2, n1.y+n2.y*0.5));
        vec3 V = normalize(vView);
        // fresnel: glancing angles mirror the sky (real paddy look)
        float fres = pow(1.0 - max(dot(V,n),0.0), 3.0);
        vec3 col = mix(uDeep, uShallow, clamp(n.x*0.5+0.5,0.0,1.0)*0.35);
        col = mix(col, uSky, clamp(fres*1.15,0.0,0.92));
        // sun glints
        vec3 R = reflect(-uSunDir, n);
        float spec = pow(max(dot(R,V),0.0), 90.0)*uGlint;
        col += vec3(1.0,0.95,0.8)*spec;
        float alpha = mix(uOpacity, 0.97, fres);
        gl_FragColor = vec4(col, alpha);
        #include <fog_fragment>
      }`,
  });
  waterMats.push(mat);
  return mat;
}
const lavaMats=[]; // pulsing emissive lava
(function buildWater(){
  /* paddy: still, murky green-brown, strong sky mirror (Banaue look) */
  const paddyMat=WaterMat({deep:0x37503c, shallow:0x5a7a52, opacity:0.82, flowX:0.03, flowZ:0.03, speed:0.35, waveAmp:0.015, glint:0.6});
  /* river: blue-green, flowing east, lively surface */
  const riverMat=WaterMat({deep:0x1e5878, shallow:0x3a86a8, opacity:0.86, flowX:1.0, flowZ:0.12, speed:1.6, waveAmp:0.05, glint:1.1});
  /* swamp: near-black tea water, oily and still */
  const swampMat=WaterMat({deep:0x1c2a1a, shallow:0x35452c, opacity:0.9, flowX:0.02, flowZ:0.02, speed:0.2, waveAmp:0.008, glint:0.25});
  /* lake: clear mountain blue */
  const lakeMat=WaterMat({deep:0x175070, shallow:0x3f92b8, opacity:0.85, flowX:0.08, flowZ:0.05, speed:0.6, waveAmp:0.03, glint:1.3});
  /* THE SEA — one big rolling plane along the south coast */
  {
    const seaMat=WaterMat({deep:0x0e4368, shallow:0x2f9bb4, opacity:0.9, flowX:0.15, flowZ:-0.5, speed:1.1, waveAmp:0.16, glint:1.5});
    const sg=new THREE.PlaneGeometry(WORLD_W+240, (MAP_H-SEA_Y+8)*TILE+200, 96, 28);
    sg.rotateX(-Math.PI/2);
    const sm=new THREE.Mesh(sg, seaMat);
    sm.position.set(WORLD_W/2, -1.05, (SEA_Y-2)*TILE + ((MAP_H-SEA_Y+8)*TILE+200)/2);
    scene.add(sm);
    /* eastern sea plane (mainland → island channel and beyond) */
    const eg=new THREE.PlaneGeometry((MAP_W-MAIN_W)*TILE+240, WORLD_H+240, 40, 60);
    eg.rotateX(-Math.PI/2);
    const em2=new THREE.Mesh(eg, seaMat);
    em2.position.set(MAIN_W*TILE+((MAP_W-MAIN_W)*TILE+240)/2, -1.05, WORLD_H/2);
    scene.add(em2);
    /* breaking foam line at the shore */
    const foamG=new THREE.PlaneGeometry(WORLD_W, 2.4, 80, 1);
    foamG.rotateX(-Math.PI/2);
    const foamM=new THREE.MeshBasicMaterial({color:0xeafaff,transparent:true,opacity:0.5,fog:true});
    foamM.userData={}; foamM._isFx=true;
    const foam=new THREE.Mesh(foamG,foamM);
    foam.position.set(WORLD_W/2, -0.82, (SEA_Y-2)*TILE+1.4);
    foam.userData.baseY=foam.position.y;
    scene.add(foam);
    waterMeshes.push(foam);
  }
  /* lava material factory (not a WaterMat — emissive pulsing rock soup) */
  function LavaMat(){
    const m=new THREE.MeshStandardMaterial({color:0x140505,emissive:0xff5a14,emissiveIntensity:1.6,roughness:0.85,metalness:0});
    m._isFx=true; lavaMats.push(m); return m;
  }
  for(let ty=0;ty<MAP_H;ty++)for(let tx=0;tx<MAP_W;tx++){
    if(grid[ty*MAP_W+tx]!==2) continue;
    if(tx>=59&&tx<=74&&ty>=38&&ty<=49) continue;
    const zn=zoneGrid[ty*MAP_W+tx];
    if(ty>=SEA_Y-3) continue;                               // southern sea handled by the big plane
    if(zn===9&&!inIsle(tx,ty)) continue;                    // eastern sea handled by the big plane
    const river=isRiver(tx,ty);
    const inLake=Math.hypot(tx-LAKE.tx,ty-LAKE.ty)<LAKE.r+2 || zn===9 || Math.hypot(tx-VOLCANO.tx,ty-VOLCANO.ty)<4;
    const inSwamp=zn===6;                                    // Hapao waterfall pools
    const g=new THREE.PlaneGeometry(TILE,TILE,2,2);
    g.rotateX(-Math.PI/2);
    const m=new THREE.Mesh(g, river?riverMat : inLake?lakeMat : inSwamp?lakeMat : paddyMat);
    const y=river ? tileBaseH(tx,ty)+0.3 : zn===9 ? tileBaseH(tx,ty)+0.35 : inLake ? 1.55 : inSwamp ? tileBaseH(tx,ty)+0.3 : tileBaseH(tx,ty)-0.12;
    m.position.set(tx*TILE+TILE/2, y, ty*TILE+TILE/2);
    m.userData.baseY=y;
    scene.add(m);
    registerChunk(m, m.position.x, m.position.z);
    if(river){
      /* mossy river rocks breaking the surface */
      if(Math.random()<0.22){
        const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(0.35,0.7),0), Mstone(0x9a978e));
        rock.position.set(m.position.x+rnd(-1.4,1.4), y+rnd(-0.1,0.25), m.position.z+rnd(-1.4,1.4));
        rock.rotation.set(rnd(0,3),rnd(0,3),rnd(0,3));
        rock.castShadow=true; scene.add(rock);
      }
    } else if(inSwamp){
      /* dead snags + lily pads in the black water */
      if(Math.random()<0.3){
        const snag=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.12,rnd(1.2,2.4),5), Mbark(0x3e3428));
        snag.position.set(m.position.x+rnd(-1.4,1.4), y+0.5, m.position.z+rnd(-1.4,1.4));
        snag.rotation.z=rnd(-0.3,0.3); scene.add(snag);
      }
      if(Math.random()<0.5){
        const pad=new THREE.Mesh(new THREE.CircleGeometry(rnd(0.25,0.5),7), M(0x4e7a38));
        pad.rotation.x=-Math.PI/2;
        pad.position.set(m.position.x+rnd(-1.5,1.5), y+0.03, m.position.z+rnd(-1.5,1.5));
        scene.add(pad);
      }
    } else if(inLake){
      /* lake rocks */
      if(Math.random()<0.15){
        const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(0.4,0.8),0), Mstone(0x8a8a92));
        rock.position.set(m.position.x+rnd(-1.4,1.4), y+rnd(0,0.3), m.position.z+rnd(-1.4,1.4));
        rock.rotation.set(rnd(0,3),rnd(0,3),rnd(0,3)); rock.castShadow=true; scene.add(rock);
      }
    } else {
      /* rice seedlings planted in orderly rows, like a real paddy */
      const rows=3, cols=4;
      for(let r=0;r<rows;r++)for(let c2=0;c2<cols;c2++){
        if(Math.random()<0.97) continue; // gaps (perf: was 0.18 → ~18k seedling meshes crashed the game; now sparse)
        const sx2=m.position.x-TILE/2+(c2+0.5)*TILE/cols+rnd(-0.12,0.12);
        const sz2=m.position.z-TILE/2+(r+0.5)*TILE/rows+rnd(-0.12,0.12);
        const sp=new THREE.Group();
        const nBlades=3;
        for(let b=0;b<nBlades;b++){
          const blade=new THREE.Mesh(new THREE.ConeGeometry(0.035,rnd(0.5,0.85),3), PBR(0x6fae52,{roughness:0.9,flatShading:true}));
          blade.position.set(rnd(-0.06,0.06),0.3,rnd(-0.06,0.06));
          blade.rotation.z=rnd(-0.3,0.3); blade.rotation.x=rnd(-0.3,0.3);
          sp.add(blade);
        }
        sp.position.set(sx2, y-0.05, sz2);
        scene.add(sp);
      }
      /* paddy edge reeds where water meets a grass tile (sparse for perf) */
      if(Math.random()<0.03){
        const reed=new THREE.Group();
        for(let b=0;b<4;b++){
          const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.03,rnd(0.8,1.3),4), M(0x7a9a4a));
          stem.position.set(rnd(-0.3,0.3),0.5,rnd(-0.3,0.3));
          stem.rotation.z=rnd(-0.2,0.2);
          reed.add(stem);
        }
        reed.position.set(m.position.x+(Math.random()<0.5?-1:1)*(TILE/2-0.2), y, m.position.z+rnd(-1.5,1.5));
        scene.add(reed);
      }
    }
  }
})();

/* ============ BANAUE LANDMARKS: waterfalls, caves, summit shrine ============ */
(function buildLandmarks(){
  if(!IS_BANAUE) return;
  const wfMat=new THREE.MeshBasicMaterial({color:0xbfe4ff,transparent:true,opacity:0.85,fog:false,side:THREE.DoubleSide});
  const streakMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.6,fog:false,side:THREE.DoubleSide});
  const poolMat=new THREE.MeshBasicMaterial({color:0x3f92b8,transparent:true,opacity:0.8,fog:false});
  /* waterfalls (V2 design layer): signature + secondary cascades placed at the
     worldgen Hapao coordinates, pinned to the nearest cliff drop in zone 6. */
  const _wfs=window.WORLDGEN.generateWaterfalls(ACTIVE_MAP,6);
  for(const wf of _wfs){
    let bTx=-1,bTy=-1,bDrop=0;
    for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){
      const tx=wf.x+dx, ty=wf.y+dy;
      if(tx<1||ty<1||tx>=MAIN_W-1||ty>=MAP_H-2) continue;
      if(zoneGrid[ty*MAP_W+tx]!==6) continue;
      const drop=tileBaseH(tx,ty)-tileBaseH(tx,ty+1);
      if(drop>2.6&&drop>bDrop){bDrop=drop;bTx=tx;bTy=ty;}
    }
    if(bTx<0) continue;
    const here=tileBaseH(bTx,bTy), below=tileBaseH(bTx,bTy+1), drop=here-below;
    const x=bTx*TILE+TILE/2, zf=(bTy+1)*TILE, sc=wf.major?1.5:1.0;   // signature fall is wider
    const cas=new THREE.Mesh(new THREE.PlaneGeometry(TILE*0.85*sc, drop+0.6, 1, 4), wfMat);
    cas.position.set(x,(here+below)/2+0.15,zf);
    scene.add(cas);
    const streak=new THREE.Mesh(new THREE.PlaneGeometry(TILE*0.3*sc, drop+0.4), streakMat);
    streak.position.set(x-TILE*0.15,(here+below)/2+0.2,zf+0.05);
    scene.add(streak);
    const pool=new THREE.Mesh(new THREE.CircleGeometry(TILE*0.7*sc,12), poolMat);
    pool.rotation.x=-Math.PI/2; pool.position.set(x,below+0.25,zf+TILE*0.5);
    scene.add(pool);
  }
  /* landmarks (V2 design layer): caves, summit shrine and POI signposts placed at
     the worldgen landmark coordinates instead of hardcoded scans. */
  const LMS=window.WORLDGEN.generateLandmarks(ACTIVE_MAP);
  const lmById=id=>LMS.find(l=>l.id===id)||null;
  /* Hungduan caves: dark arch mouths clustered around the worldgen cave landmark */
  {
    const cl=lmById('hungduan_cave')||{x:110,y:70};
    let caves=0;
    for(let ty=cl.y-12;ty<=cl.y+12&&caves<5;ty+=5)for(let tx=cl.x-12;tx<=cl.x+12&&caves<5;tx+=5){
      if(tx<1||ty<1||tx>=MAIN_W-1||ty>=MAP_H-1) continue;
      if(zoneGrid[ty*MAP_W+tx]!==2) continue;
      const x=tx*TILE, z=ty*TILE, yb=tileBaseH(tx,ty);
      const arch=new THREE.Mesh(new THREE.TorusGeometry(1.7,0.55,6,10,Math.PI), Mstone(0x5a5148));
      arch.position.set(x,yb+0.2,z); scene.add(arch);
      const dark=new THREE.Mesh(new THREE.CircleGeometry(1.5,10), new THREE.MeshBasicMaterial({color:0x08080f,fog:false}));
      dark.rotation.x=-Math.PI/2; dark.position.set(x,yb+0.3,z); scene.add(dark);
      caves++;
    }
  }
  /* Balangaw summit: snow disc + grounded shrine at the worldgen peak landmark */
  {
    const bl=lmById('balangaw')||{x:VOLCANO.tx,y:VOLCANO.ty};
    const sx=bl.x*TILE, sz=bl.y*TILE, sy=tileBaseH(bl.x,bl.y);
    const snow=new THREE.Mesh(new THREE.CircleGeometry(7,14), PBR(0xf2f5f8,{roughness:0.55}));
    snow.rotation.x=-Math.PI/2; snow.position.set(sx,sy+0.25,sz); scene.add(snow);
    const shrine=new THREE.Group();
    const post=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.16,2.2,6), Mwood(0x6a4a2a)); post.position.y=1.1; shrine.add(post);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(1.1,0.8,4), Mwood(0x8a4a2a)); roof.position.y=2.4; shrine.add(roof);
    shrine.position.set(sx,sy+0.2,sz); scene.add(shrine);
  }
  /* POI signposts for the other worldgen landmarks (chunk-culled like everything else) */
  for(const lm of LMS){
    if(lm.zone===3||lm.hidden) continue;                                  // town buildings are built in buildTown
    if(lm.id==='hapao_falls'||lm.id==='hungduan_cave'||lm.id==='balangaw') continue; // already built above
    if(lm.x<1||lm.y<1||lm.x>=MAIN_W-1||lm.y>=MAP_H-1) continue;
    const gt=grid[lm.y*MAP_W+lm.x]; if(gt===2||gt===4) continue;
    const x=lm.x*TILE, z=lm.y*TILE, y=groundY(x,z);
    const sign=new THREE.Group();
    const sp=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,1.6,5), Mwood(0x7a5a34)); sp.position.y=0.8; sign.add(sp);
    const board=new THREE.Mesh(new THREE.BoxGeometry(1.3,0.5,0.08), Mwood(0xb08858)); board.position.y=1.5; sign.add(board);
    sign.position.set(x,y,z); scene.add(sign); registerChunk(sign,x,z);
  }
})();

/* ---- trees: species-based generator with organic canopies + wind sway ---- */
const windCanopies=[]; // {obj, phase, amp}
/* organic blob: icosahedron with jittered vertices — no two alike */
function leafBlob(r, col, seed){
  const geo=new THREE.IcosahedronGeometry(r,1);
  const jr=mulberry32(seed);
  const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const sc=1+(jr()-0.5)*0.55;
    pos.setXYZ(i, pos.getX(i)*sc, pos.getY(i)*(0.8+(jr()-0.5)*0.3), pos.getZ(i)*sc);
  }
  geo.computeVertexNormals();
  const m=new THREE.Mesh(geo, PBR(col,{roughness:0.9,flatShading:true}));
  m.castShadow=true;
  return m;
}
function buildBalete(t){
  const g=new THREE.Group();
  const s=t.s, seed=Math.floor(t.x*7+t.z*13);
  const jr=mulberry32(seed);
  // lean build: trunk + 2 canopy blobs (was ~30 meshes — the #1 draw-call killer)
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.22*s,0.5*s,3.0*s,6), Mbark(0xb08858));
  trunk.position.y=1.5*s; trunk.rotation.z=(jr()-0.5)*0.14; g.add(trunk);
  const canopy=leafBlob((1.5+jr()*0.6)*s, [0x3a7030,0x468239,0x549644][Math.floor(jr()*3)], seed);
  canopy.position.y=(3.3+jr()*0.4)*s; g.add(canopy);
  const c2=leafBlob((0.9+jr()*0.4)*s, 0x63aa50, seed+1);
  c2.position.set((jr()-0.5)*s, (4.0+jr()*0.3)*s, (jr()-0.5)*s); g.add(c2);
  return g;
}
function buildNiyog(t){ // coconut palm
  const g=new THREE.Group();
  const s=t.s, seed=Math.floor(t.x*11+t.z*3);
  const jr=mulberry32(seed);
  // lean palm: 1 leaning trunk + 4 drooping fronds (was ~39 meshes)
  const lean=(jr()-0.5)*0.3;
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.14*s,0.2*s,3.2*s,5), Mbark(0xc8a072));
  trunk.position.y=1.6*s; trunk.rotation.z=lean; g.add(trunk);
  const crown=new THREE.Group(); crown.position.set(lean*1.6*s,3.2*s,0); g.add(crown);
  for(let i=0;i<4;i++){
    const a=i/4*Math.PI*2+jr()*0.4;
    const frond=new THREE.Mesh(new THREE.BoxGeometry(0.32*s,0.04*s,1.9*s), PBR(0x4f9440,{roughness:0.85,flatShading:true}));
    frond.position.set(Math.cos(a)*0.8*s,0,Math.sin(a)*0.8*s);
    frond.rotation.y=-a; frond.rotation.x=0.5;
    crown.add(frond);
  }
  windCanopies.push({obj:crown, phase:jr()*6.28, amp:0.045});
  return g;
}
function buildPine(t){ // highland pine (Sagada): tall slim trunk + stacked conifer tiers
  const g=new THREE.Group();
  const s=t.s, seed=Math.floor(t.x*13+t.z*7);
  const jr=mulberry32(seed);
  // lean pine: trunk + 2 cones (was 6-7)
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.12*s,0.26*s,3.0*s,5), Mbark(0x6f5136));
  trunk.position.y=1.5*s; g.add(trunk);
  const c1=new THREE.Mesh(new THREE.ConeGeometry(1.4*s,2.2*s,6), PBR(0x2e5a3c,{roughness:0.9,flatShading:true}));
  c1.position.y=3.0*s; g.add(c1);
  const c2=new THREE.Mesh(new THREE.ConeGeometry(0.9*s,1.6*s,6), PBR(0x3d754e,{roughness:0.9,flatShading:true}));
  c2.position.y=4.3*s; g.add(c2);
  windCanopies.push({obj:g, phase:jr()*6.28, amp:0.02});
  return g;
}
for(const t of trees){
  if(ULTRA) continue;   // ultra-light: no trees (biggest object count)
  const zn=zoneGrid[clamp(Math.floor(t.z/TILE),0,MAP_H-1)*MAP_W+clamp(Math.floor(t.x/TILE),0,MAP_W-1)];
  let g;
  if(SAG || t.family==='pine'){ g=buildPine(t); }   // pine country (Sagada) / Cloudridge highland (V2 family)
  else {
    const palmy=(zn===0||zn===1) && (Math.floor(t.x*7+t.z)%3!==0);
    g=palmy?buildNiyog(t):buildBalete(t);           // Banaue lowland = palms + balete
  }
  g.position.set(t.x, groundY(t.x,t.z), t.z);
  g.rotation.y=(t.x*0.7+t.z*1.3)%6.283;             // deterministic rotation
  /* perf: trees no longer cast individual shadows — ~100 trees × ~15 meshes was the
     single biggest per-frame cost (the shadow pass re-rendered all of them). They
     still receive light; only the trunk-less canopies stop projecting shadows. */
  g.traverse(o=>{ if(o.isMesh) o.castShadow=false; });
  scene.add(g);
  registerChunk(g,t.x,t.z);
}

/* ---- per-zone landmark props (each zone reads distinct); chunk-culled; skipped in ultra-light ---- */
(function buildProps(){
  if(ULTRA||WS_MAP) return;   // World-Spec maps render their own placed landmarks (buildWSProps below)
  const jr=mulberry32(777);
  const sh=!isMobileGPU;
  let placed=0;
  for(let i=0;i<1400&&placed<90;i++){
    const tx=3+Math.floor(jr()*(MAIN_W-6)), ty=3+Math.floor(jr()*(SEA_Y-6));
    const gt=grid[ty*MAP_W+tx]; if(gt===2||gt===4) continue;
    const zn=zoneGrid[ty*MAP_W+tx];
    const x=tx*TILE+TILE/2, z=ty*TILE+TILE/2, y=groundY(x,z);
    let m=null;
    if(IS_BANAUE){
      if(zn===1||zn===5){ m=new THREE.Mesh(new THREE.BoxGeometry(TILE*0.9,0.5,0.42), Mstone(0x8a8378)); m.position.set(x,y+0.25,z); }
      else if(zn===2){ const h=2+jr()*3; m=new THREE.Mesh(new THREE.CylinderGeometry(0.45+jr()*0.4,0.8+jr()*0.5,h,6), Mstone(0xb9b2a4)); m.position.set(x,y+h/2,z); }   // Bontoc limestone pillar
      else if(zn===6){ m=new THREE.Mesh(new THREE.SphereGeometry(0.5+jr()*0.5,6,5), Mstone(0x8f9a92)); m.scale.y=0.6; m.position.set(x,y+0.2,z); }                        // Hapao river stone
      else if(zn===7){ m=new THREE.Mesh(new THREE.DodecahedronGeometry(0.5+jr()*0.5), Mstone(0x3a3432)); m.position.set(x,y+0.3,z); }                                    // scar charcoal rock
      else if(zn===8){ m=new THREE.Group(); for(let k=0;k<3;k++){ const s=new THREE.Mesh(new THREE.DodecahedronGeometry(0.5-k*0.13), Mstone(0xa8a296)); s.position.y=0.3+k*0.48; m.add(s); } m.position.set(x,y,z); }  // Pulag summit cairn
      else if(zn===3){ m=new THREE.Group(); const st=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,0.4,5), M(0xd8cdb0)); st.position.y=0.2; m.add(st); const cp=new THREE.Mesh(new THREE.SphereGeometry(0.3,6,5,0,6.283,0,1.4), M(0xb4472f)); cp.position.y=0.42; m.add(cp); m.position.set(x,y,z); }  // dark-wood mushroom
      else continue;
    } else {
      if(zn===2||zn===7){ const h=1.2+jr()*1.8; m=new THREE.Mesh(new THREE.BoxGeometry(0.5,h,0.4), Mstone(0x9aa0a6)); m.position.set(x,y+h/2,z); m.rotation.y=jr()*3; }  // Sagada standing stone
      else if(zn===8){ m=new THREE.Mesh(new THREE.ConeGeometry(0.7,1.5,6), Mstone(0xa8a296)); m.position.set(x,y+0.75,z); }                                              // peak cairn
      else continue;
    }
    m.traverse(o=>{ if(o.isMesh) o.castShadow=sh; });
    scene.add(m); registerChunk(m,x,z); placed++;
  }
})();

/* ---- World-Spec placed landmarks: render the instances you positioned in WorldForge ---- */
(function buildWSProps(){
  if(!WS_MAP||ULTRA||!WS_MAP.props) return;
  const sh=!isMobileGPU;
  const grp=(...kids)=>{ const g=new THREE.Group(); for(const k of kids) g.add(k); return g; };
  for(const pr of WS_MAP.props){
    const x=pr.tx*TILE+TILE/2, z=pr.ty*TILE+TILE/2, y=groundY(x,z);
    let m=null;
    switch(pr.type){
      case 'hut': m=grp((()=>{const w=new THREE.Mesh(new THREE.BoxGeometry(3,2.2,3),Mwood(0xb08858));w.position.y=1.1;return w;})(),(()=>{const r=new THREE.Mesh(new THREE.ConeGeometry(2.6,1.7,4),M(0x8a5a3a));r.position.y=2.9;r.rotation.y=0.785;return r;})()); break;
      case 'watchtower': m=grp((()=>{const t=new THREE.Mesh(new THREE.BoxGeometry(2,6,2),Mstone(0xa8a296));t.position.y=3;return t;})(),(()=>{const c=new THREE.Mesh(new THREE.ConeGeometry(1.8,1.4,4),M(0x8a5a3a));c.position.y=6.6;return c;})()); break;
      case 'shrine': case 'statue': m=grp((()=>{const b=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.4,1.6),Mstone(0xc8c2b6));b.position.y=0.2;return b;})(),(()=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.55,2.6,8),Mstone(0xd8d2c6));c.position.y=1.5;return c;})()); break;
      case 'stall': m=grp((()=>{const c=new THREE.Mesh(new THREE.BoxGeometry(3,1,2),Mwood(0x9a7a4a));c.position.y=0.5;return c;})(),(()=>{const a=new THREE.Mesh(new THREE.BoxGeometry(3.4,0.2,2.4),M(0xb4472f));a.position.y=2;return a;})()); break;
      case 'well': m=grp((()=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(1,1.1,0.9,10),Mstone(0xb9b2a4));c.position.y=0.45;return c;})()); break;
      case 'brazier': m=grp((()=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.22,1.4,6),Mstone(0x6a6a6a));p.position.y=0.7;return p;})(),(()=>{const f=new THREE.Mesh(new THREE.ConeGeometry(0.4,0.85,6),M(0xffaa33));f.position.y=1.7;return f;})()); break;
      case 'portal': m=grp((()=>{const r=new THREE.Mesh(new THREE.TorusGeometry(1.6,0.26,8,18),M(0xbe7aff));r.position.y=2;return r;})()); break;
      case 'tree_pine': m=grp((()=>{const t=new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.35,1.6,6),Mwood(0x6a4a2a));t.position.y=0.8;return t;})(),(()=>{const c=new THREE.Mesh(new THREE.ConeGeometry(1.4,3.2,7),M(0x2f6b3a));c.position.y=2.8;return c;})()); break;
      case 'tree_oak': m=grp((()=>{const t=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.4,1.8,6),Mwood(0x6a4a2a));t.position.y=0.9;return t;})(),(()=>{const c=new THREE.Mesh(new THREE.SphereGeometry(1.6,7,6),M(0x3f7d4f));c.position.y=2.6;return c;})()); break;
      case 'tree_palm': m=grp((()=>{const t=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.3,3,6),Mwood(0x8a6a3a));t.position.y=1.5;return t;})(),(()=>{const c=new THREE.Mesh(new THREE.SphereGeometry(0.9,6,5),M(0x3f8d4f));c.position.y=3.2;c.scale.y=0.5;return c;})()); break;
      case 'dock': case 'boat': m=grp((()=>{const d=new THREE.Mesh(new THREE.BoxGeometry(3.2,0.3,2),Mwood(0x9a7a4a));d.position.y=0.3;return d;})()); break;
      default: m=grp((()=>{const r=new THREE.Mesh(new THREE.DodecahedronGeometry(0.8+((pr.tx*7+pr.ty*13)%5)*0.16),Mstone(0xb9b2a4));r.position.y=0.6;return r;})());
    }
    if(!m) continue;
    m.position.set(x,y,z);
    m.traverse(o=>{ if(o.isMesh) o.castShadow=sh; });
    scene.add(m); registerChunk(m,x,z);
  }
})();

/* ---- Tiangge tent (market stall, lanterns, banderitas) ---- */
let lanternMats=[];
(function buildTent(){
  const g=new THREE.Group();
  const baseY=groundY(TENT.x,TENT.z);
  // stone plaza pad
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(11,11.5,0.3,18), Mstone(0xd8c8a8));
  pad.position.y=0.12; pad.receiveShadow=true; g.add(pad);
  // posts
  for(const [dx,dz] of [[-6,-3],[6,-3],[-6,3],[6,3]]){
    const p=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.2,4.6,7), Mwood(0xb08858));
    p.position.set(dx,2.3,dz); p.castShadow=true; g.add(p);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(0.24,6,6), M(0xd8b83a));
    cap.position.set(dx,4.65,dz); g.add(cap);
  }
  // counter with woven front
  const counter=new THREE.Mesh(new THREE.BoxGeometry(11,1.15,4.5), M(0x9a7a4a));
  counter.position.y=0.87; counter.castShadow=true; g.add(counter);
  const weavePanel=new THREE.Mesh(new THREE.BoxGeometry(11.1,0.75,0.1), M(0xb89a5e));
  weavePanel.position.set(0,0.75,2.31); g.add(weavePanel);
  for(let i=0;i<6;i++){
    const strip=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.78,0.12), M(0x8a6a3a));
    strip.position.set(-4.6+i*1.85,0.75,2.34); g.add(strip);
  }
  const top=new THREE.Mesh(new THREE.BoxGeometry(11.6,0.28,5), M(0xb08a55));
  top.position.y=1.56; top.castShadow=true; g.add(top);
  // curved striped canopy
  for(let i=0;i<7;i++){
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(1.92,0.2,7.6), M(i%2?0xe0be3e:0xc23a34));
    const lift=Math.sin((i/6)*Math.PI)*0.55;
    stripe.position.set(-5.75+i*1.92, 4.7+lift, 0);
    stripe.rotation.z=Math.cos((i/6)*Math.PI)*0.18;
    stripe.castShadow=true;
    g.add(stripe);
  }
  const ridge=new THREE.Mesh(new THREE.BoxGeometry(13.8,0.32,0.7), M(0x8a2a24));
  ridge.position.y=5.4; g.add(ridge);
  // scalloped canopy trim
  for(let i=0;i<12;i++){
    const sc2=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.34,0.1,8,1,false,0,Math.PI), M(i%2?0xc23a34:0xe0be3e));
    sc2.rotation.x=Math.PI/2; sc2.rotation.z=Math.PI;
    sc2.position.set(-6.1+i*1.11, 4.32, 3.75);
    g.add(sc2);
  }
  // glowing lanterns
  lanternMats=[];
  for(const dx of [-5.5,-1.8,1.8,5.5]){
    const lm=M(0xff8a3a,{emissive:0xff5a20,emissiveIntensity:0.9});
    const l=new THREE.Mesh(new THREE.SphereGeometry(0.36,7,7), lm);
    l.position.set(dx,3.75,3.4); l.scale.y=1.25; g.add(l);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.2,0.16,6), M(0x8a2a24));
    cap.position.set(dx,4.24,3.4); g.add(cap);
    const str=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.5,3), M(0x5a4a2a));
    str.position.set(dx,4.55,3.4); g.add(str);
    lanternMats.push(lm);
  }
  const lampLight=new THREE.PointLight(0xff9a4a, 12, 16, 2);
  lampLight.position.set(0,3.6,2.6); g.add(lampLight);
  // banderitas strings to side poles
  for(const side of [-1,1]){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.11,3.6,5), M(0x7a5a34));
    pole.position.set(side*10.5,1.8,4.5); pole.castShadow=true; g.add(pole);
    for(let i=0;i<7;i++){
      const p1=new THREE.Vector3(side*6,4.5,3.6), p2=new THREE.Vector3(side*10.5,3.55,4.5);
      const tt=(i+0.5)/7;
      const px2=p1.x+(p2.x-p1.x)*tt, py2=p1.y+(p2.y-p1.y)*tt - Math.sin(tt*Math.PI)*0.5, pz2=p1.z+(p2.z-p1.z)*tt;
      const flag=new THREE.Mesh(new THREE.ConeGeometry(0.16,0.4,3), M([0xe0be3e,0xc23a34,0x4a9ad8,0x5fbf77,0xc08aff][i%5]));
      flag.rotation.x=Math.PI;
      flag.position.set(px2,py2-0.2,pz2);
      g.add(flag);
    }
  }
  // goods: baskets & produce
  for(let i=0;i<5;i++){
    const bx=-3.5+i*1.75;
    const basket=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.36,0.5,8), M(0xa8845a));
    basket.position.set(bx,1.95,rnd(-0.9,0.9)); g.add(basket);
    const goods=new THREE.Mesh(new THREE.SphereGeometry(0.34,6,6), M([0xd8b83a,0x6aab3a,0xc23a34,0x4a9ad8,0xc08aff][i]));
    goods.position.set(basket.position.x,2.28,basket.position.z); goods.scale.y=0.7; g.add(goods);
  }
  // sacks by the side
  for(let i=0;i<3;i++){
    const sack=new THREE.Mesh(new THREE.SphereGeometry(0.55,7,6), M(0xc8a870));
    sack.position.set(-8+i*1.1, 0.5, 2.6+((i%2)*0.9)); sack.scale.y=0.85; sack.castShadow=true;
    g.add(sack);
  }
  g.position.set(TENT.x, baseY, TENT.z);
  scene.add(g);
})();

/* ---- hanging bamboo bridge over the river gorge ---- */
(function buildBridge(){
  const g=new THREE.Group();
  const cz=(BRIDGE.z0+BRIDGE.z1)/2, mid=(BRIDGE.x0+BRIDGE.x1)/2, half=(BRIDGE.x1-BRIDGE.x0)/2;
  const bamboo=Mwood(0xe8c890), rope=Mwood(0xa8845a), dark=Mwood(0xc09c68);
  // deck planks (follow the sag, running east↔west)
  const planks=Math.ceil((BRIDGE.x1-BRIDGE.x0)/0.9);
  for(let i=0;i<planks;i++){
    const x=BRIDGE.x0+i*0.9+0.45;
    const s=1-Math.pow((x-mid)/half,2);
    const y=BRIDGE.deck-0.55*s;
    const p=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.14,BRIDGE.z1-BRIDGE.z0+1.6), i%2?bamboo:dark);
    p.position.set(x,y-0.08,cz);
    p.rotation.z=(mid-x)/half*0.16;
    p.castShadow=true; g.add(p);
  }
  // side ropes + posts + hand-lines (on the two Z sides, spanning X)
  for(const sz of [-1,1]){
    const pz=cz+sz*((BRIDGE.z1-BRIDGE.z0)/2+0.8);
    for(const px of [BRIDGE.x0-0.6,BRIDGE.x1+0.6]){
      const post=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.17,2.4,6), rope);
      post.position.set(px,groundY(px,pz)+1.2,pz);
      post.castShadow=true; g.add(post);
    }
    // sagging hand rope (segments along X)
    const segs=10;
    for(let i=0;i<segs;i++){
      const x0=BRIDGE.x0-0.6+ (BRIDGE.x1-BRIDGE.x0+1.2)*(i/segs);
      const x1=BRIDGE.x0-0.6+ (BRIDGE.x1-BRIDGE.x0+1.2)*((i+1)/segs);
      const sag=xx=>BRIDGE.deck+1.0-0.7*(1-Math.pow((xx-mid)/half,2));
      const y0=sag(x0), y1=sag(x1);
      const len=Math.hypot(x1-x0,y1-y0);
      const seg=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,len,4), rope);
      seg.position.set((x0+x1)/2,(y0+y1)/2,pz);
      seg.rotation.z=Math.PI/2-Math.atan2(y1-y0,x1-x0);
      g.add(seg);
      if(i%2===0){
        const dy=(y0+y1)/2-(BRIDGE.deck-0.55*(1-Math.pow(((x0+x1)/2-mid)/half,2)));
        const stay=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,Math.max(0.2,dy),4), rope);
        stay.position.set((x0+x1)/2,(y0+y1)/2-dy/2,pz);
        g.add(stay);
      }
    }
  }
  scene.add(g);
  // white-water foam strips under the bridge (along the N→S channel)
  for(let i=0;i<5;i++){
    const foam=new THREE.Mesh(new THREE.PlaneGeometry(0.6,2.4),
      new THREE.MeshBasicMaterial({color:0xdff2ff,transparent:true,opacity:0.5,depthWrite:false}));
    foam.material._isFx=true;
    foam.rotation.x=-Math.PI/2;
    const fx2=mid, fz2=BRIDGE.z0-6+i*4;
    foam.position.set(fx2, tileBaseH(Math.floor(fx2/TILE),Math.floor(fz2/TILE))+0.42, fz2);
    scene.add(foam); waterMeshes.push(Object.assign(foam,{userData:{baseY:foam.position.y}}));
  }
})();

/* ---- THE GRAND TIANGGE TOWN: walls, gates, shops, NPCs ---- */
const NPCS=[]; // {id,name,icon,x,z,label}
(function buildTown(){
  const g=new THREE.Group();
  const ty0=groundY(GATE_CX,GATE_CZ);
  const stone=Mstone(0xd8d0c8), stoneDark=Mstone(0xb0a89e), wood=Mwood(0xc8a878), nipa=Mthatch(0xffffff), nipaDark=Mthatch(0xd8bc90);
  /* --- perimeter walls (stone base + bamboo palisade top) --- */
  function wallRun(x0,z0,x1,z1){
    const len=Math.hypot(x1-x0,z1-z0);
    if(len<0.5) return;
    const cx=(x0+x1)/2, cz=(z0+z1)/2;
    const horiz=Math.abs(x1-x0)>Math.abs(z1-z0);
    const base=new THREE.Mesh(new THREE.BoxGeometry(horiz?len:1.7,2.2,horiz?1.7:len), stone);
    base.position.set(cx,ty0+1.1,cz); base.castShadow=true; g.add(base);
    const top=new THREE.Mesh(new THREE.BoxGeometry(horiz?len:1.1,1.4,horiz?1.1:len), wood);
    top.position.set(cx,ty0+2.9,cz); top.castShadow=true; g.add(top);
    // palisade spikes
    const n=Math.max(2,Math.floor(len/2.2));
    for(let i=0;i<=n;i++){
      const px=horiz?x0+(x1-x0)*i/n:cx, pz=horiz?cz:z0+(z1-z0)*i/n;
      const spike=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.9,5), nipaDark);
      spike.position.set(px,ty0+4.0,pz); g.add(spike);
    }
  }
  // four sides, split around the gates
  wallRun(TOWN.x0,TOWN.z0, GATE_CX-GATE_HALF,TOWN.z0); wallRun(GATE_CX+GATE_HALF,TOWN.z0, TOWN.x1,TOWN.z0);
  wallRun(TOWN.x0,TOWN.z1, GATE_CX-GATE_HALF,TOWN.z1); wallRun(GATE_CX+GATE_HALF,TOWN.z1, TOWN.x1,TOWN.z1);
  wallRun(TOWN.x0,TOWN.z0, TOWN.x0,GATE_CZ-GATE_HALF); wallRun(TOWN.x0,GATE_CZ+GATE_HALF, TOWN.x0,TOWN.z1);
  wallRun(TOWN.x1,TOWN.z0, TOWN.x1,GATE_CZ-GATE_HALF); wallRun(TOWN.x1,GATE_CZ+GATE_HALF, TOWN.x1,TOWN.z1);
  /* --- gates: carved arch posts + roof + hanging lanterns on all 4 sides --- */
  function gate(gx,gz,horiz){
    const gg=new THREE.Group();
    for(const s of [-1,1]){
      const post=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.55,5.2,7), stoneDark);
      post.position.set(horiz?s*(GATE_HALF+0.6):0, 2.6, horiz?0:s*(GATE_HALF+0.6));
      post.castShadow=true; gg.add(post);
      const cap=new THREE.Mesh(new THREE.SphereGeometry(0.5,6,5), nipaDark);
      cap.position.set(post.position.x,5.35,post.position.z); gg.add(cap);
    }
    const beam=new THREE.Mesh(new THREE.BoxGeometry(horiz?(GATE_HALF+1.2)*2:1.1,0.7,horiz?1.1:(GATE_HALF+1.2)*2), wood);
    beam.position.y=5.15; beam.castShadow=true; gg.add(beam);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(GATE_HALF+2,1.6,4), nipa);
    roof.position.y=6.3; roof.rotation.y=Math.PI/4; roof.scale.z=horiz?0.45:1.4; roof.scale.x=horiz?1.4:0.45;
    roof.castShadow=true; gg.add(roof);
    // gate lanterns
    for(const s of [-1,1]){
      const lm=new THREE.MeshLambertMaterial({color:0xffb35c,emissive:0xff8a2a,emissiveIntensity:0.8});
      lm._isFx=true; lanternMats.push(lm);
      const lan=new THREE.Mesh(new THREE.SphereGeometry(0.26,7,6), lm);
      lan.position.set(horiz?s*(GATE_HALF-0.5):0, 4.5, horiz?0:s*(GATE_HALF-0.5));
      gg.add(lan);
    }
    gg.position.set(gx,ty0,gz);
    g.add(gg);
  }
  gate(GATE_CX,TOWN.z0,true); gate(GATE_CX,TOWN.z1,true);
  gate(TOWN.x0,GATE_CZ,false); gate(TOWN.x1,GATE_CZ,false);
  /* --- shop buildings: nipa-and-stone huts with signs + NPCs --- */
  function shopHut(bx,bz,w,d,roofCol,signIcon,npc){
    const hg=new THREE.Group();
    const by=groundY(bx,bz);
    // stone base + wooden walls
    const base2=new THREE.Mesh(new THREE.BoxGeometry(w+0.4,0.5,d+0.4), stoneDark);
    base2.position.y=0.25; hg.add(base2);
    const wall=new THREE.Mesh(new THREE.BoxGeometry(w,2.3,d), wood);
    wall.position.y=1.6; wall.castShadow=true; hg.add(wall);
    // woven front panels
    for(const s of [-1,1]){
      const pan=new THREE.Mesh(new THREE.BoxGeometry(w*0.32,1.5,0.08), nipa);
      pan.position.set(s*w*0.28,1.6,d/2+0.05); hg.add(pan);
    }
    // doorway (dark)
    const door=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.9,0.1), M(0x241a12));
    door.position.set(0,1.2,d/2+0.06); hg.add(door);
    // pitched nipa roof
    const roof=new THREE.Mesh(new THREE.ConeGeometry(Math.max(w,d)*0.85,1.9,4), roofCol);
    roof.position.y=3.7; roof.rotation.y=Math.PI/4;
    roof.scale.set(w/Math.max(w,d)*1.15,1,d/Math.max(w,d)*1.15);
    roof.castShadow=true; hg.add(roof);
    // hanging shop sign
    const sign=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.8,0.12), M(0x5a4028));
    sign.position.set(0,2.6,d/2+0.5); hg.add(sign);
    // lantern by the door
    const lm=new THREE.MeshLambertMaterial({color:0xffb35c,emissive:0xff8a2a,emissiveIntensity:0.8});
    lm._isFx=true; lanternMats.push(lm);
    const lan=new THREE.Mesh(new THREE.SphereGeometry(0.2,6,5), lm);
    lan.position.set(w/2-0.3,2.5,d/2+0.4); hg.add(lan);
    hg.position.set(bx,by,bz);
    g.add(hg);
    bldRects.push({x0:bx-w/2-0.2,x1:bx+w/2+0.2,z0:bz-d/2-0.2,z1:bz+d/2+0.2});
    /* NPC standing out front */
    const npcG=new THREE.Group();
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.3,0.7,4,7), M(npc.col));
    body.position.y=0.95; body.castShadow=true; npcG.add(body);
    const head2=new THREE.Mesh(new THREE.SphereGeometry(0.27,8,7), M(0xc98a5e));
    head2.position.y=1.75; head2.castShadow=true; npcG.add(head2);
    const hat2=new THREE.Mesh(new THREE.ConeGeometry(0.42,0.3,8), M(npc.hat));
    hat2.position.y=2.0; npcG.add(hat2);
    for(const s of [-1,1]){
      const eye=new THREE.Mesh(new THREE.SphereGeometry(0.035,4,4), M(0x1a1210));
      eye.position.set(s*0.1,1.78,0.24); npcG.add(eye);
    }
    const nx=bx+ (npc.dx||0), nz=bz+d/2+1.6;
    npcG.position.set(nx,groundY(nx,nz),nz);
    npcG.userData.baseY=npcG.position.y;
    g.add(npcG);
    const label=document.createElement('div');
    label.className='flabel tentlbl';
    label.textContent=signIcon+' '+npc.name;
    $('labels').appendChild(label);
    NPCS.push({id:npc.id,name:npc.name,icon:signIcon,x:nx,z:nz,mesh:npcG,label});
  }
  /* four shops in the town corners (plaza + tent stay center-north) */
  shopHut(61*TILE,   39.6*TILE, 5.2, 4.0, nipa,      '⚖️', {id:'trader',     name:'Aling Rosa — Trader',        col:0x8a5a8a, hat:0xd8c88a, dx:0.4});
  shopHut(72*TILE,   39.6*TILE, 5.2, 4.0, Mthatch(0xb07858),'⚒️', {id:'blacksmith', name:'Panday Iko — Blacksmith',    col:0x5a4632, hat:0x3a2e24, dx:-0.4});
  shopHut(61*TILE,   48*TILE,   5.2, 4.0, Mthatch(0x94b478),'🛡️', {id:'equipment',  name:'Ka Bining — Outfitter',      col:0x4a6a8a, hat:0x8a6a42, dx:0.4});
  shopHut(72*TILE,   48*TILE,   5.2, 4.0, Mthatch(0x6a6484),'🌑', {id:'blackmarket',name:'Ang Kubrador — Black Market',col:0x2a2430, hat:0x141018, dx:-0.4});
  /* town greenery + well */
  const well=new THREE.Group();
  const wellBase=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.2,1,9), stone);
  wellBase.position.y=0.5; wellBase.castShadow=true; well.add(wellBase);
  const wellWater=new THREE.Mesh(new THREE.CircleGeometry(0.85,9),
    WaterMat({deep:0x1e4858, shallow:0x3a7a8a, opacity:0.9, flowX:0.02, flowZ:0.02, speed:0.25, waveAmp:0.0, glint:0.5}));
  wellWater.rotation.x=-Math.PI/2; wellWater.position.y=1.02; well.add(wellWater);
  for(const s of [-1,1]){
    const wp=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,1.8,5), wood);
    wp.position.set(s*0.9,1.7,0); well.add(wp);
  }
  const wellRoof=new THREE.Mesh(new THREE.ConeGeometry(1.5,0.9,7), nipa);
  wellRoof.position.y=3.0; wellRoof.castShadow=true; well.add(wellRoof);
  well.position.set(68.6*TILE, ty0, 44.6*TILE);
  g.add(well);
  bldRects.push({x0:68.6*TILE-1.3,x1:68.6*TILE+1.3,z0:44.6*TILE-1.3,z1:44.6*TILE+1.3});
  // banderitas across the plaza
  for(let i=0;i<20;i++){
    const fl=new THREE.Mesh(new THREE.ConeGeometry(0.18,0.4,3),
      M([0xd84a3a,0xf2b134,0x4a9ad8,0x6aab3a,0xc08aff][i%5]));
    fl.rotation.x=Math.PI;
    fl.position.set(59.5*TILE+i*2.1, ty0+4.6+Math.sin(i*0.9)*0.25, 44.6*TILE);
    g.add(fl);
  }
  for(let i=0;i<16;i++){
    const fl=new THREE.Mesh(new THREE.ConeGeometry(0.18,0.4,3),
      M([0xf2b134,0xc08aff,0xd84a3a,0x6aab3a,0x4a9ad8][i%5]));
    fl.rotation.x=Math.PI;
    fl.position.set(60.5*TILE+i*2.1, ty0+4.4+Math.sin(i*1.1)*0.25, 39.4*TILE);
    g.add(fl);
  }
  scene.add(g);
})();

/* ---- zone décor: bamboo, dark forest, standing stones, scorched scar ---- */
const fireflies=[], vents=[];
(function buildZoneDecor(){
  const zr=mulberry32(777);
  const pickIn=(zn,tries=400)=>{
    for(let i=0;i<tries;i++){
      const x=zr()*WORLD_W, z=zr()*WORLD_H;
      const tx=Math.floor(x/TILE), ty=Math.floor(z/TILE);
      if(tx<3||ty<3||tx>=MAP_W-3||ty>=MAP_H-3) continue;
      const t=grid[ty*MAP_W+tx];
      if(t===2||t===4||t===3) continue;
      if(zoneGrid[ty*MAP_W+tx]!==zn) continue;
      return {x,z};
    }
    return null;
  };
  // 🎋 Kawayan Grove: bamboo clumps
  for(let i=0;i<16;i++){
    const p=pickIn(1); if(!p) continue;
    const clump=new THREE.Group();
    const n=3+Math.floor(zr()*4);
    for(let b=0;b<n;b++){
      const h=rnd(5,9);
      const cane=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.16,h,5), M(zr()<0.3?0x9ab84a:0x7aa83a));
      cane.position.set(rnd(-0.9,0.9), h/2, rnd(-0.9,0.9));
      cane.rotation.z=rnd(-0.12,0.12); cane.rotation.x=rnd(-0.12,0.12);
      cane.castShadow=true; clump.add(cane);
      const leaf=new THREE.Mesh(new THREE.ConeGeometry(0.55,1.6,5), M(0x8ec44e));
      leaf.position.set(cane.position.x+cane.rotation.z*h, h, cane.position.z-cane.rotation.x*h);
      clump.add(leaf);
    }
    clump.position.set(p.x, groundY(p.x,p.z), p.z);
    scene.add(clump);
    trees.push({x:p.x,z:p.z,s:0.9}); // collision
  }
  // 🌳 Gubat ng Balete: dense dark canopy trees + THE ancient Balete
  for(let i=0;i<9;i++){
    const p=pickIn(2); if(!p) continue;
    const s=rnd(1.0,1.4), tg=new THREE.Group();
    const seed=Math.floor(p.x*5+p.z*9);
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.3*s,0.55*s,3*s,7), Mbark(0x7a5c3c));
    trunk.position.y=1.5*s; trunk.castShadow=true; tg.add(trunk);
    // gnarled twin branches
    for(const sx of [-1,1]){
      const br=new THREE.Mesh(new THREE.CylinderGeometry(0.08*s,0.16*s,1.3*s,5), Mbark(0x6a4e32));
      br.position.set(sx*0.5*s,2.7*s,0); br.rotation.z=-sx*0.8;
      br.castShadow=true; tg.add(br);
    }
    // dark organic canopy on a sway pivot
    const can=new THREE.Group(); can.position.y=3.4*s; tg.add(can);
    const darkCols=[0x16301a,0x1c3a20,0x224426,0x28502c];
    for(let c=0;c<6;c++){
      const blob=leafBlob(rnd(0.7,1.3)*s, darkCols[Math.floor(rnd(0,4))], seed+c*23);
      blob.position.set(rnd(-0.9,0.9)*s, rnd(-0.3,1.3)*s, rnd(-0.9,0.9)*s);
      can.add(blob);
    }
    // draped moss strands
    for(let m2=0;m2<3;m2++){
      const moss=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.045,rnd(0.8,1.6)*s,3), M(0x3e5c34));
      moss.position.set(rnd(-1,1)*s, -0.5*s, rnd(-1,1)*s);
      can.add(moss);
    }
    windCanopies.push({obj:can, phase:rnd(0,6.28), amp:0.014});
    tg.position.set(p.x, groundY(p.x,p.z), p.z);
    scene.add(tg);
    trees.push({x:p.x,z:p.z,s});
  }
  // the ancient Balete — landmark at the heart of the forest
  (function ancientBalete(){
    const bx=40*TILE, bz=5.5*TILE;
    const y=groundY(bx,bz);
    const g=new THREE.Group();
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(1.1,2.1,9,9), Mbark(0x6a5238));
    trunk.position.y=4.5; trunk.castShadow=true; g.add(trunk);
    for(let i=0;i<7;i++){
      const a=i/7*Math.PI*2;
      const root=new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.7,4.2,5), M(0x35261a));
      root.position.set(Math.cos(a)*1.9, 1.4, Math.sin(a)*1.9);
      root.rotation.z=Math.cos(a)*0.7; root.rotation.x=-Math.sin(a)*0.7;
      root.castShadow=true; g.add(root);
    }
    const bigCan=new THREE.Group(); bigCan.position.y=9.5; g.add(bigCan);
    for(let c=0;c<9;c++){
      const a=c/9*Math.PI*2*1.7;
      const blob=leafBlob(rnd(1.8,3.0), [0x142c16,0x1b381b,0x224022,0x2a4c2a][c%4], 5000+c*31);
      blob.position.set(Math.cos(a)*rnd(0.5,2.8), rnd(-1.2,1.8), Math.sin(a)*rnd(0.5,2.8));
      bigCan.add(blob);
    }
    const crown2=leafBlob(2.0, 0x336033, 5999);
    crown2.position.y=2.6; bigCan.add(crown2);
    windCanopies.push({obj:bigCan, phase:1.3, amp:0.008});
    // hanging vines
    for(let i=0;i<10;i++){
      const a=rnd(0,Math.PI*2), rr=rnd(2,4.4);
      const vine=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,rnd(2.5,5),4), M(0x2e4e2a));
      vine.position.set(Math.cos(a)*rr, 8-vine.geometry.parameters.height/2, Math.sin(a)*rr);
      g.add(vine);
    }
    // eerie firefly lights
    const fMat=new THREE.MeshBasicMaterial({color:0xaaffcc,transparent:true,opacity:0.9});
    fMat._isFx=true;
    for(let i=0;i<6;i++){
      const fl=new THREE.Mesh(new THREE.SphereGeometry(0.07,4,4), fMat);
      fl.position.set(rnd(-3,3), rnd(2,7), rnd(-3,3));
      g.add(fl);
    }
    const gl=new THREE.PointLight(0x86e8a8, 5, 18, 2);
    gl.position.y=5; g.add(gl);
    g.position.set(bx,y,bz);
    scene.add(g);
    trees.push({x:bx,z:bz,s:2.6});
  })();
  // ⛰️ Nuno Highlands: standing stones + boulders
  for(let i=0;i<10;i++){
    const p=pickIn(3); if(!p) continue;
    const st=new THREE.Mesh(
      zr()<0.4?new THREE.BoxGeometry(rnd(0.8,1.4),rnd(2.2,4),rnd(0.7,1.1)):new THREE.DodecahedronGeometry(rnd(0.8,1.6),0),
      M(zr()<0.5?0x8a8278:0x7a7268));
    st.position.set(p.x, groundY(p.x,p.z)+0.6, p.z);
    st.rotation.y=zr()*6.28; st.rotation.z=rnd(-0.15,0.15);
    st.castShadow=true; scene.add(st);
    trees.push({x:p.x,z:p.z,s:0.7});
  }
  // moss glyphs on a few stones → faint green glow markers
  // 🔥 Sunog Scar: charred stumps, ember rocks, ash patches
  for(let i=0;i<12;i++){
    const p=pickIn(4); if(!p) continue;
    if(zr()<0.5){
      const stump=new THREE.Mesh(new THREE.CylinderGeometry(rnd(0.25,0.4),rnd(0.4,0.6),rnd(0.8,1.6),6), M(0x2a2320));
      stump.position.set(p.x, groundY(p.x,p.z)+0.5, p.z);
      stump.rotation.z=rnd(-0.2,0.2); stump.castShadow=true; scene.add(stump);
      const emberMat=new THREE.MeshLambertMaterial({color:0xff6a2a,emissive:0xff4a10,emissiveIntensity:0.9});
      emberMat._isFx=true;
      const ember=new THREE.Mesh(new THREE.SphereGeometry(0.1,5,4), emberMat);
      ember.position.set(p.x+rnd(-0.3,0.3), groundY(p.x,p.z)+rnd(0.9,1.4), p.z+rnd(-0.3,0.3));
      scene.add(ember);
      trees.push({x:p.x,z:p.z,s:0.5});
    } else {
      const ash=new THREE.Mesh(new THREE.CircleGeometry(rnd(1.2,2.4),8), M(0x3a3230));
      ash.rotation.x=-Math.PI/2;
      ash.position.set(p.x, groundY(p.x,p.z)+0.05, p.z);
      scene.add(ash);
    }
  }
  // 🏖️ Dalampasigan: leaning coconut palms, bangka boats, shells, beach rocks
  for(let i=0;i<22;i++){
    const p=pickIn(5); if(!p) continue;
    const r=zr();
    if(r<0.45){
      /* leaning beach palm */
      const s=rnd(0.9,1.3), lean=rnd(0.25,0.5), a=zr()*6.28;
      const pg=new THREE.Group();
      const tr2=new THREE.Mesh(new THREE.CylinderGeometry(0.14*s,0.24*s,4.6*s,6), Mbark(0xb09060));
      tr2.position.y=2.3*s; tr2.rotation.z=lean; tr2.castShadow=true; pg.add(tr2);
      const topX=Math.sin(lean)*4.6*s*0.5*2;
      for(let f=0;f<7;f++){
        const fa=f/7*Math.PI*2;
        const frond=new THREE.Mesh(new THREE.ConeGeometry(0.16*s,2.2*s,4), M(f%2?0x4d8f3e:0x5da048));
        frond.position.set(topX+Math.cos(fa)*0.7*s, 4.5*s, Math.sin(fa)*0.7*s);
        frond.rotation.z=Math.cos(fa)*1.25; frond.rotation.x=-Math.sin(fa)*1.25;
        pg.add(frond);
      }
      const nut=new THREE.Mesh(new THREE.SphereGeometry(0.16*s,6,5), M(0x7a5c34));
      nut.position.set(topX,4.25*s,0.2); pg.add(nut);
      pg.rotation.y=a;
      pg.position.set(p.x, groundY(p.x,p.z), p.z);
      scene.add(pg);
      trees.push({x:p.x,z:p.z,s:0.6});
    } else if(r<0.6){
      /* outrigger bangka boat pulled up on the sand */
      const bg=new THREE.Group();
      const hull=new THREE.Mesh(new THREE.CapsuleGeometry(0.42,2.6,4,8), Mwood(0xc86a3a));
      hull.rotation.z=Math.PI/2; hull.scale.y=0.62; hull.position.y=0.4; bg.add(hull);
      for(const side of [-1,1]){
        const out=new THREE.Mesh(new THREE.CapsuleGeometry(0.1,2.2,3,6), Mwood(0x8a6a42));
        out.rotation.z=Math.PI/2; out.position.set(0,0.25,side*1.25); bg.add(out);
        for(const bx of [-0.9,0.9]){
          const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,1.4,4), Mwood(0x6a4e2e));
          arm.rotation.x=Math.PI/2; arm.position.set(bx,0.5,side*0.62); bg.add(arm);
        }
      }
      bg.rotation.y=zr()*6.28;
      bg.position.set(p.x, groundY(p.x,p.z)+0.05, p.z);
      scene.add(bg);
      trees.push({x:p.x,z:p.z,s:1.1});
    } else {
      /* shells + smooth beach stones */
      for(let k2=0;k2<3;k2++){
        const sh=new THREE.Mesh(
          zr()<0.5?new THREE.SphereGeometry(rnd(0.08,0.16),5,4):new THREE.ConeGeometry(rnd(0.08,0.13),rnd(0.15,0.25),5),
          M(zr()<0.5?0xf2e8d8:0xe8c8b0));
        sh.position.set(p.x+rnd(-1.5,1.5), groundY(p.x,p.z)+0.08, p.z+rnd(-1.5,1.5));
        sh.rotation.set(rnd(0,3),rnd(0,3),rnd(0,3));
        scene.add(sh);
      }
    }
  }
  // 🌿 Bakawan Swamp: mangrove trees on stilt roots, hanging moss, fireflies
  for(let i=0;i<20;i++){
    const p=pickIn(6); if(!p) continue;
    const s=rnd(0.8,1.2), mg=new THREE.Group(), seed=Math.floor(p.x*3+p.z*11);
    /* stilt root cage */
    for(let rt=0;rt<6;rt++){
      const ra=rt/6*Math.PI*2+zr()*0.4;
      const root=new THREE.Mesh(new THREE.CylinderGeometry(0.05*s,0.09*s,1.6*s,4), Mbark(0x5a4632));
      root.position.set(Math.cos(ra)*0.55*s,0.7*s,Math.sin(ra)*0.55*s);
      root.rotation.z=Math.cos(ra)*0.5; root.rotation.x=-Math.sin(ra)*0.5;
      mg.add(root);
    }
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.16*s,0.22*s,2.2*s,6), Mbark(0x6a5238));
    trunk.position.y=2.3*s; trunk.castShadow=true; mg.add(trunk);
    const can=new THREE.Group(); can.position.y=3.6*s; mg.add(can);
    for(let c=0;c<5;c++){
      const blob=leafBlob(rnd(0.6,1.0)*s, [0x2e5228,0x38602e,0x426e36][Math.floor(zr()*3)], seed+c*7);
      blob.position.set(rnd(-0.7,0.7)*s, rnd(-0.2,0.7)*s, rnd(-0.7,0.7)*s);
      can.add(blob);
    }
    for(let mo=0;mo<3;mo++){
      const moss=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.04,rnd(0.9,1.7)*s,3), M(0x51703c));
      moss.position.set(rnd(-0.8,0.8)*s,-0.6*s,rnd(-0.8,0.8)*s);
      can.add(moss);
    }
    windCanopies.push({obj:can, phase:zr()*6.28, amp:0.012});
    mg.position.set(p.x, groundY(p.x,p.z), p.z);
    scene.add(mg);
    trees.push({x:p.x,z:p.z,s:0.8});
    /* firefly */
    if(zr()<0.6){
      const ffm=new THREE.MeshBasicMaterial({color:0xc8ff6a,transparent:true,opacity:0.9});
      ffm._isFx=true;
      const ff=new THREE.Mesh(new THREE.SphereGeometry(0.06,4,4), ffm);
      ff.position.set(p.x+rnd(-2,2), groundY(p.x,p.z)+rnd(1,2.4), p.z+rnd(-2,2));
      ff.userData.fly={x:ff.position.x,y:ff.position.y,z:ff.position.z,ph:zr()*6.28};
      scene.add(ff); fireflies.push(ff);
    }
  }
  // 🌋 Bulkan Apolaki: basalt columns, obsidian shards, sulfur vents
  for(let i=0;i<18;i++){
    const p=pickIn(7); if(!p) continue;
    const r=zr();
    if(r<0.4){
      /* basalt column cluster */
      for(let c=0;c<3;c++){
        const h=rnd(1.2,3.4);
        const col2=new THREE.Mesh(new THREE.CylinderGeometry(rnd(0.3,0.5),rnd(0.35,0.55),h,6), Mstone(0x3a3238));
        col2.position.set(p.x+rnd(-1,1), groundY(p.x,p.z)+h/2-0.2, p.z+rnd(-1,1));
        col2.rotation.y=zr()*1; col2.castShadow=true; scene.add(col2);
      }
      trees.push({x:p.x,z:p.z,s:0.9});
    } else if(r<0.7){
      /* obsidian shard */
      const ob=new THREE.Mesh(new THREE.ConeGeometry(rnd(0.3,0.6),rnd(1.4,2.8),4), PBR(0x181420,{roughness:0.25,metalness:0.4}));
      ob.position.set(p.x, groundY(p.x,p.z)+0.7, p.z);
      ob.rotation.z=rnd(-0.25,0.25); ob.rotation.y=zr()*6.28;
      ob.castShadow=true; scene.add(ob);
      trees.push({x:p.x,z:p.z,s:0.5});
    } else {
      /* sulfur vent: yellow crust + smoke column */
      const crust=new THREE.Mesh(new THREE.CircleGeometry(rnd(0.7,1.2),8), M(0xc8b040));
      crust.rotation.x=-Math.PI/2;
      crust.position.set(p.x, groundY(p.x,p.z)+0.06, p.z);
      scene.add(crust);
      const smm=new THREE.MeshBasicMaterial({color:0xb8b0a0,transparent:true,opacity:0.35,fog:true});
      smm._isFx=true;
      const smoke=new THREE.Mesh(new THREE.SphereGeometry(0.5,6,5), smm);
      smoke.position.set(p.x, groundY(p.x,p.z)+1.6, p.z);
      smoke.userData.vent={baseY:smoke.position.y,ph:zr()*6.28};
      scene.add(smoke); vents.push(smoke);
    }
  }
  // 🌸 Parang ng Tala: flower drifts, lone acacias, butterflies-on-sticks (glow motes)
  for(let i=0;i<40;i++){
    const p=pickIn(8); if(!p) continue;
    if(zr()<0.75){
      /* flower drift: instancing-free small crowd of blossoms */
      const colors=[0xf26a9a,0xf2b134,0xffffff,0x9a6af2,0xff7a4a];
      const fc=colors[Math.floor(zr()*colors.length)];
      for(let f=0;f<8;f++){
        const st=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.02,rnd(0.3,0.55),3), M(0x5c8a42));
        const fx2=p.x+rnd(-2.2,2.2), fz2=p.z+rnd(-2.2,2.2);
        st.position.set(fx2, groundY(fx2,fz2)+0.22, fz2);
        scene.add(st);
        const bloom=new THREE.Mesh(new THREE.SphereGeometry(rnd(0.07,0.12),5,4), M(fc));
        bloom.position.set(fx2, st.position.y+0.28, fz2);
        bloom.scale.y=0.6;
        scene.add(bloom);
      }
    } else {
      /* lone flat-top acacia */
      const s=rnd(1.1,1.6), ag=new THREE.Group(), seed=Math.floor(p.x*13+p.z*5);
      const tr3=new THREE.Mesh(new THREE.CylinderGeometry(0.18*s,0.3*s,2.6*s,6), Mbark(0x8a6a46));
      tr3.position.y=1.3*s; tr3.castShadow=true; ag.add(tr3);
      const can=new THREE.Group(); can.position.y=3.0*s; ag.add(can);
      for(let c=0;c<6;c++){
        const blob=leafBlob(rnd(0.8,1.2)*s, [0x548a3a,0x609644,0x6aa24c][Math.floor(zr()*3)], seed+c*13);
        blob.position.set(rnd(-1.3,1.3)*s, rnd(-0.1,0.3)*s, rnd(-1.3,1.3)*s);
        blob.scale.y=0.55;
        can.add(blob);
      }
      windCanopies.push({obj:can, phase:zr()*6.28, amp:0.015});
      ag.position.set(p.x, groundY(p.x,p.z), p.z);
      scene.add(ag);
      trees.push({x:p.x,z:p.z,s:0.9});
    }
  }
  // 🏝️ Isla ng Bathala: giant jungle trees, ferns, ancient moss-eaten idols
  for(let i=0;i<34;i++){
    const p=pickIn(9); if(!p) continue;
    if(!inIsle(Math.floor(p.x/TILE),Math.floor(p.z/TILE))) continue;
    const r=zr();
    if(r<0.45){
      /* towering jungle tree */
      const s=rnd(1.3,1.9), jg=new THREE.Group(), seed=Math.floor(p.x*7+p.z*3);
      const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.24*s,0.44*s,4.6*s,7), Mbark(0x5a4a34));
      trunk.position.y=2.3*s; trunk.castShadow=true; jg.add(trunk);
      const can=new THREE.Group(); can.position.y=5.0*s; jg.add(can);
      for(let c=0;c<7;c++){
        const blob=leafBlob(rnd(0.8,1.4)*s, [0x14522e,0x1a5e38,0x226a42,0x2a7a4c][Math.floor(zr()*4)], seed+c*11);
        blob.position.set(rnd(-1.2,1.2)*s, rnd(-0.3,0.8)*s, rnd(-1.2,1.2)*s);
        can.add(blob);
      }
      for(let v=0;v<3;v++){
        const vine=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.04,rnd(1.5,2.8)*s,3), M(0x3e7a4c));
        vine.position.set(rnd(-1,1)*s,-1.2*s,rnd(-1,1)*s); can.add(vine);
      }
      windCanopies.push({obj:can, phase:zr()*6.28, amp:0.013});
      jg.position.set(p.x, groundY(p.x,p.z), p.z);
      scene.add(jg);
      trees.push({x:p.x,z:p.z,s:1.1});
    } else if(r<0.8){
      /* giant fern cluster */
      for(let f=0;f<6;f++){
        const fr=new THREE.Mesh(new THREE.ConeGeometry(0.14,rnd(1.2,2.0),4), M(zr()<0.5?0x2a8a52:0x228048));
        const fa=f/6*Math.PI*2;
        fr.position.set(p.x+Math.cos(fa)*0.3, groundY(p.x,p.z)+rnd(0.5,0.8), p.z+Math.sin(fa)*0.3);
        fr.rotation.z=Math.cos(fa)*0.7; fr.rotation.x=-Math.sin(fa)*0.7;
        scene.add(fr);
      }
    } else {
      /* ancient moss-eaten stone idol */
      const idol=new THREE.Group();
      const base=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.75,0.5,7), Mstone(0x6a7a68));
      base.position.y=0.25; idol.add(base);
      const bodyI=new THREE.Mesh(new THREE.BoxGeometry(0.8,1.4,0.7), Mstone(0x74846e));
      bodyI.position.y=1.2; idol.add(bodyI);
      const headI=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.6,0.6), Mstone(0x7a8a72));
      headI.position.y=2.15; headI.rotation.y=0.4; idol.add(headI);
      const eyeI=new THREE.Mesh(new THREE.SphereGeometry(0.07,4,4), M(0x7dff9a,{emissive:0x2ad46a,emissiveIntensity:1.2}));
      eyeI.position.set(-0.13,2.2,0.32); idol.add(eyeI);
      const eyeI2=eyeI.clone(); eyeI2.position.x=0.13; idol.add(eyeI2);
      idol.rotation.y=zr()*6.28; idol.rotation.z=rnd(-0.08,0.08);
      idol.position.set(p.x, groundY(p.x,p.z), p.z);
      idol.traverse(o=>{ if(o.isMesh)o.castShadow=true; });
      scene.add(idol);
      trees.push({x:p.x,z:p.z,s:0.8});
    }
  }
})();

/* ---- forage node meshes ---- */
function buildNodeMesh(n){
  const g=new THREE.Group();
  const c=MATERIALS[n.kind.id].col;
  if(n.kind.id==='palay'||n.kind.id==='kawayan'){
    for(let i=0;i<4;i++){
      const st=new THREE.Mesh(new THREE.ConeGeometry(0.1,rnd(1,1.6),4), M(c));
      st.position.set(rnd(-0.4,0.4), 0.6, rnd(-0.4,0.4)); g.add(st);
    }
  } else if(n.kind.id==='bato'){
    const r1=new THREE.Mesh(new THREE.DodecahedronGeometry(0.55,0), M(c));
    r1.position.y=0.4; g.add(r1);
    const r2=new THREE.Mesh(new THREE.DodecahedronGeometry(0.35,0), M(0x74747c));
    r2.position.set(0.5,0.25,0.2); g.add(r2);
  } else if(n.kind.id==='niyog'){
    const tr=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.2,1.6,5), M(0x8a6a42));
    tr.position.y=0.8; tr.rotation.z=0.25; g.add(tr);
    const co=new THREE.Mesh(new THREE.SphereGeometry(0.3,6,6), M(c));
    co.position.set(0.35,1.5,0); g.add(co);
    for(let i=0;i<3;i++){
      const lf=new THREE.Mesh(new THREE.ConeGeometry(0.1,1.1,4), M(0x4d8f3e));
      lf.position.set(0.35,1.75,0); lf.rotation.z=1.2+(i-1)*0.7; g.add(lf);
    }
  } else {
    const bush=new THREE.Mesh(new THREE.IcosahedronGeometry(0.6,0), M(c));
    bush.position.y=0.5; g.add(bush);
  }
  // sparkle ring
  const ring=new THREE.Mesh(new THREE.RingGeometry(0.9,1.1,20), new THREE.MeshBasicMaterial({color:0xf2b134,transparent:true,opacity:0.5,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2; ring.position.y=0.06; g.add(ring);
  n.ring=ring;
  g.position.set(n.x, groundY(n.x,n.z), n.z);
  scene.add(g);
  return g;
}
for(const n of nodes) n.mesh=buildNodeMesh(n);

/* ---- blob shadow helper ---- */
const shadowGeo=new THREE.CircleGeometry(1,16);
function blobShadow(r){
  const mat=new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.28,depthWrite:false});
  mat._isFx=true;
  const m=new THREE.Mesh(shadowGeo, mat);
  m.rotation.x=-Math.PI/2; m.scale.setScalar(r);
  return m;
}

/* ================================================================
   CHARACTER BUILDERS (low-poly)
   ================================================================ */
function limb(w,h,c){
  const m=new THREE.Mesh(new THREE.CapsuleGeometry(w*0.62,h-w*1.2,3,6), M(c));
  m.geometry.translate(0,-h/2,0); m.castShadow=true; return m;
}
function boxLimb(w,h,c){ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,w), M(c)); m.geometry.translate(0,-h/2,0); m.castShadow=true; return m; }

/* ---- Elder Alim: built to the turnaround reference sheet ----
   hunched elder, indigo robe w/ glowing Baybayin runes, white beard
   + topknot, gnarled staff cradling a purple orb with blue tassels */
function buildElderAlim(){
  const g=new THREE.Group();
  const skin=0xd8a878, robe=0x5a5aa8, robeDark=0x4a4a92, gold=0xc9a84c, hairC=0xe8e8ee;
  // legs (short, shuffling elder) + woven sandals
  const legL=limb(0.2,0.5,0x3c3c74); legL.position.set(-0.17,0.5,0); g.add(legL);
  const legR=limb(0.2,0.5,0x3c3c74); legR.position.set(0.17,0.5,0); g.add(legR);
  for(const l of [legL,legR]){
    const foot=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.09,0.36), M(0xc8b070));
    foot.position.set(0,-0.48,0.06); l.add(foot);
    const strap=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.05,0.08), M(0xa89050));
    strap.position.set(0,-0.42,0.1); l.add(strap);
  }
  // robe skirt
  const skirt=new THREE.Mesh(new THREE.CylinderGeometry(0.52,0.72,0.95,10), M(robe));
  skirt.position.y=0.85; g.add(skirt);
  const hem=new THREE.Mesh(new THREE.CylinderGeometry(0.72,0.74,0.09,10), M(gold));
  hem.position.y=0.42; g.add(hem);
  // animatable robe flaps
  const robeBack=new THREE.Mesh(new THREE.BoxGeometry(0.62,0.85,0.07), M(robeDark));
  robeBack.geometry.translate(0,-0.42,0);
  robeBack.position.set(0,1.25,-0.34); g.add(robeBack);
  const robeF=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.75,0.06), M(robeDark));
  robeF.geometry.translate(0,-0.37,0);
  robeF.position.set(0,1.2,0.34); g.add(robeF);
  // hunched upper body group (pivot at hips)
  const upper=new THREE.Group(); upper.position.y=1.28; upper.rotation.x=0.16; g.add(upper);
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(0.38,0.5,4,9), M(robe));
  torso.position.y=0.28; upper.add(torso);
  // gold collar V-trim
  for(const sx of [-1,1]){
    const tr=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.5,0.05), M(gold));
    tr.position.set(sx*0.13,0.42,0.36); tr.rotation.z=sx*0.32; upper.add(tr);
  }
  const sash=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.44,0.16,10), M(gold));
  sash.position.y=-0.08; upper.add(sash);
  // glowing Baybayin rune strips down the robe front
  const runeMats=[];
  const RUNES=['ᜀ','ᜊ','ᜃ','ᜇ','ᜎ'];
  for(let i=0;i<5;i++){
    const rm=new THREE.MeshLambertMaterial({color:0xd8b0ff,emissive:0xb06aff,emissiveIntensity:0.9});
    rm._isFx=true; runeMats.push(rm);
    const rune=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.03), rm);
    if(i<3){ rune.position.set(0,0.28-i*0.24,0.41); upper.add(rune); }
    else { rune.position.set(0,1.0-(i-3)*0.28,0.38); g.add(rune); }
  }
  // head — aged face
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.36,10,9), M(skin));
  head.position.y=0.95; upper.add(head);
  const nose=new THREE.Mesh(new THREE.SphereGeometry(0.07,6,5), M(0xcf9868));
  nose.position.set(0,0.9,0.34); upper.add(nose);
  for(const sx of [-1,1]){
    const eye=new THREE.Mesh(new THREE.SphereGeometry(0.04,5,5), M(0x1a1210));
    eye.position.set(sx*0.13,0.98,0.32); upper.add(eye);
    const brow=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.05,0.06), M(hairC));
    brow.position.set(sx*0.13,1.07,0.32); brow.rotation.z=sx*-0.15; upper.add(brow);
  }
  // swept-back white hair + topknot with blue tie
  const hair=new THREE.Mesh(new THREE.SphereGeometry(0.38,10,8,0,Math.PI*2,0,Math.PI*0.6), M(hairC));
  hair.position.set(0,1.0,-0.03); upper.add(hair);
  const hairBack=new THREE.Mesh(new THREE.CapsuleGeometry(0.16,0.4,3,6), M(hairC));
  hairBack.position.set(0,0.75,-0.3); hairBack.rotation.x=0.35; upper.add(hairBack);
  const bun=new THREE.Mesh(new THREE.SphereGeometry(0.13,7,6), M(hairC));
  bun.position.set(0,1.38,-0.08); upper.add(bun);
  const tie=new THREE.Mesh(new THREE.TorusGeometry(0.09,0.03,5,10), M(0x3a4ab8));
  tie.position.set(0,1.3,-0.08); tie.rotation.x=Math.PI/2; upper.add(tie);
  // long layered beard (animatable) + moustache
  const beard=new THREE.Group(); beard.position.set(0,0.82,0.26); upper.add(beard);
  const b1=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.85,7), M(hairC));
  b1.geometry.translate(0,-0.42,0); b1.rotation.x=Math.PI+0.15; beard.add(b1);
  for(const sx of [-1,1]){
    const b2=new THREE.Mesh(new THREE.ConeGeometry(0.09,0.45,5), M(0xdcdce4));
    b2.geometry.translate(0,-0.22,0); b2.position.set(sx*0.16,0.02,-0.02);
    b2.rotation.x=Math.PI+0.25; b2.rotation.z=sx*0.25; beard.add(b2);
    const mo=new THREE.Mesh(new THREE.BoxGeometry(0.13,0.05,0.06), M(hairC));
    mo.position.set(sx*0.1,0.1,0.06); mo.rotation.z=sx*0.5; beard.add(mo);
  }
  // arms — left tucked, right holds staff
  const armL=limb(0.18,0.66,robe); armL.position.set(-0.5,0.45,0.05); armL.rotation.z=0.25; upper.add(armL);
  const armR=limb(0.18,0.66,robe); armR.position.set(0.5,0.45,0.05); upper.add(armR);
  for(const a of [armL,armR]){
    const cuff=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.18,0.14,7), M(gold));
    cuff.position.y=-0.58; a.add(cuff);
    const hand=new THREE.Mesh(new THREE.SphereGeometry(0.1,6,5), M(skin));
    hand.position.y=-0.7; a.add(hand);
  }
  // gnarled staff with forked crown, orb, tassels
  const weap=new THREE.Group(); weap.position.y=-0.7; armR.add(weap);
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.09,2.3,6), M(0x5a4028));
  shaft.position.y=0.35; shaft.rotation.z=0.05; weap.add(shaft);
  const knot=new THREE.Mesh(new THREE.SphereGeometry(0.09,5,5), M(0x4a3420));
  knot.position.set(0.04,-0.1,0.02); weap.add(knot);
  for(const sx of [-1,1]){
    const branch=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.05,0.55,5), M(0x5a4028));
    branch.position.set(sx*0.16,1.62,0); branch.rotation.z=sx*-0.7; weap.add(branch);
  }
  const orbMat=new THREE.MeshLambertMaterial({color:0xc08aff,emissive:0x9a5aef,emissiveIntensity:1.0});
  orbMat._isFx=true;
  const orb=new THREE.Mesh(new THREE.SphereGeometry(0.2,9,8), orbMat);
  orb.position.y=1.78; weap.add(orb);
  const orbGlow=new THREE.Mesh(new THREE.SphereGeometry(0.3,8,7),
    new THREE.MeshBasicMaterial({color:0xb47aff,transparent:true,opacity:0.22,depthWrite:false}));
  orbGlow.material._isFx=true; orbGlow.position.y=1.78; weap.add(orbGlow);
  const staffLight=new THREE.PointLight(0xb47aff, 4, 8, 2);
  staffLight.position.y=1.78; weap.add(staffLight);
  // blue tassels
  const tassels=[];
  for(const sx of [-1,1]){
    const tg=new THREE.Group(); tg.position.set(sx*0.1,1.45,0); weap.add(tg);
    const cord=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,0.2,4), M(0x3a4ab8));
    cord.geometry.translate(0,-0.1,0); tg.add(cord);
    const tas=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.22,5), M(0x4a5ac8));
    tas.geometry.translate(0,-0.11,0); tas.position.y=-0.2; tas.rotation.x=Math.PI; tg.add(tas);
    tassels.push(tg);
  }
  const sh=blobShadow(1); sh.position.y=0.02; g.add(sh);
  g.traverse(o=>{ if(o.isMesh&&!o.material._isFx) o.castShadow=true; });
  g.userData={legL,legR,armL,armR,weapArm:armR,
    alim:{upper,beard,bun,bunY:bun.position.y,robeBack,robeF,runeMats,orbMat,orbGlow,tassels}};
  return g;
}

/* character creation palettes */
const SKIN_TONES=[0xe8b98a, 0xc98a5e, 0xa86b42, 0x7d4e2e];
const HAIR_COLORS=[0x1a1410, 0x3a2a1a, 0x6a4a2a, 0x8a8a92, 0xd8d8e0];
const HAIR_STYLES=[
  {id:0,name:'Maikli'},   // short crop
  {id:1,name:'Buhaghag'}, // spiky/messy
  {id:2,name:'Mahaba'},   // long flowing
  {id:3,name:'Tikwas'},   // topknot bun
];
function heroApp(){
  const a=(S&&S.app)||{gender:'male',skin:1,hairStyle:0,hairColor:0};
  return {gender:a.gender||'male',
    skin:SKIN_TONES[a.skin??1]||SKIN_TONES[1],
    hairColor:HAIR_COLORS[a.hairColor??0]||HAIR_COLORS[0],
    hairStyle:a.hairStyle??0};
}
function buildHero(cls, appOverride){
  const app=appOverride||heroApp();
  if(cls==='alim') return buildElderAlim();
  const g=new THREE.Group();
  const skin=app.skin;
  const fem=app.gender==='female';
  const palette={
    babaylan:{cloth:0xc23a34, trim:0xe8d9a8},
    arnisador:{cloth:0x8a2a24, trim:0xd8b83a},
    tirador:{cloth:0xb0a070, trim:0x7a5a3a},
    alim:{cloth:0x3a3a8a, trim:0xc08aff},
    mandirigma:{cloth:0x8a2a24, trim:0xd8a83a},
    mamamana:{cloth:0x7a3a2a, trim:0xd8b83a},
    anino:{cloth:0x1c1622, trim:0x6a3aa0},
    panday:{cloth:0x6a4a30, trim:0xff8a3a},
    mangkukulam:{cloth:0x2e1b30, trim:0x9aff5a},
  }[cls];
  palette.hair=app.hairColor;
  // legs
  const legW=fem?0.23:0.26;
  const legL=limb(legW,0.78,0x4a3a2a); legL.position.set(-0.19,0.78,0); g.add(legL);
  const legR=limb(legW,0.78,0x4a3a2a); legR.position.set(0.19,0.78,0); g.add(legR);
  // sandals
  for(const s2 of [legL,legR]){
    const foot=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.1,0.34), M(0x8a6a42));
    foot.position.set(0,-0.76,0.05); s2.add(foot);
  }
  // torso (rounded) — slimmer + waisted for female
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(fem?0.34:0.4,0.62,4,8), M(palette.cloth));
  torso.position.y=1.32; torso.castShadow=true; g.add(torso);
  if(fem){ torso.scale.set(1,1,0.9); }
  const sash=new THREE.Mesh(new THREE.CylinderGeometry(fem?0.36:0.44,fem?0.42:0.46,0.22,9), M(palette.trim));
  sash.position.y=1.0; g.add(sash);
  // skirt wrap (malong) for female
  if(fem){
    const skirt=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.52,0.5,9), M(palette.cloth));
    skirt.position.y=0.72; g.add(skirt);
  }
  // shoulder pads
  for(const sx of [-1,1]){
    const sh2=new THREE.Mesh(new THREE.SphereGeometry(fem?0.16:0.2,7,6), M(palette.trim));
    sh2.position.set(sx*(fem?0.4:0.44),1.72,0); g.add(sh2);
  }
  // head (sphere) + face — CHIBI: oversized head like the reference sheets
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.52,12,10), M(skin));
  head.position.y=2.3; head.castShadow=true; g.add(head);
  // hair by style
  const hairMat=M(palette.hair);
  if(app.hairStyle===0){ // Maikli: short crop
    const hair=new THREE.Mesh(new THREE.SphereGeometry(0.55,10,8,0,Math.PI*2,0,Math.PI*0.55), hairMat);
    hair.position.y=2.36; g.add(hair);
  } else if(app.hairStyle===1){ // Buhaghag: spiky
    const hair=new THREE.Mesh(new THREE.SphereGeometry(0.55,10,8,0,Math.PI*2,0,Math.PI*0.5), hairMat);
    hair.position.y=2.38; g.add(hair);
    for(let i=0;i<7;i++){
      const a=i/7*Math.PI*2;
      const spike=new THREE.Mesh(new THREE.ConeGeometry(0.11,0.32,4), hairMat);
      spike.position.set(Math.cos(a)*0.33, 2.82, Math.sin(a)*0.33);
      spike.rotation.z=Math.cos(a)*0.5; spike.rotation.x=-Math.sin(a)*0.5;
      g.add(spike);
    }
  } else if(app.hairStyle===2){ // Mahaba: long flowing
    const hair=new THREE.Mesh(new THREE.SphereGeometry(0.56,10,8,0,Math.PI*2,0,Math.PI*0.55), hairMat);
    hair.position.y=2.36; g.add(hair);
    const back=new THREE.Mesh(new THREE.CapsuleGeometry(0.24,0.7,3,7), hairMat);
    back.position.set(0,1.9,-0.38); back.rotation.x=0.18; g.add(back);
    for(const sx of [-1,1]){
      const lock=new THREE.Mesh(new THREE.CapsuleGeometry(0.09,0.45,3,5), hairMat);
      lock.position.set(sx*0.44,2.04,0.06); g.add(lock);
    }
  } else { // Tikwas: topknot bun
    const hair=new THREE.Mesh(new THREE.SphereGeometry(0.55,10,8,0,Math.PI*2,0,Math.PI*0.5), hairMat);
    hair.position.y=2.37; g.add(hair);
    const bun=new THREE.Mesh(new THREE.SphereGeometry(0.18,7,6), hairMat);
    bun.position.set(0,2.92,-0.08); g.add(bun);
    const tie=new THREE.Mesh(new THREE.TorusGeometry(0.12,0.035,5,10), M(0xc23a34));
    tie.position.set(0,2.8,-0.08); tie.rotation.x=Math.PI/2; g.add(tie);
  }
  for(const sx of [-1,1]){
    /* big chibi eyes: dark iris + white glint + bold brow */
    const eye=new THREE.Mesh(new THREE.SphereGeometry(0.085,7,6), M(0x2a1a10));
    eye.position.set(sx*0.19,2.32,0.44); eye.scale.y=1.25; g.add(eye);
    const glint=new THREE.Mesh(new THREE.SphereGeometry(0.028,4,4), M(0xffffff));
    glint.position.set(sx*0.16,2.38,0.51); g.add(glint);
    const brow=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.035,0.04), M(0x1a1210));
    brow.position.set(sx*0.19,2.48,0.46); brow.rotation.z=sx*-0.15; g.add(brow);
  }
  // lips hint for female
  if(fem){
    const lips=new THREE.Mesh(new THREE.SphereGeometry(0.055,5,4), M(0xb05a4a));
    lips.position.set(0,2.12,0.48); lips.scale.set(1.4,0.6,0.6); g.add(lips);
  }
  if(cls==='tirador'){
    /* patterned bandana like the reference boy */
    const band=new THREE.Mesh(new THREE.SphereGeometry(0.55,10,7,0,Math.PI*2,0,Math.PI*0.45), M(0x9a2a24));
    band.position.y=2.42; g.add(band);
    const knot=new THREE.Mesh(new THREE.SphereGeometry(0.1,5,4), M(0x9a2a24));
    knot.position.set(0,2.28,-0.5); g.add(knot);
    const tail1=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.3,4), M(0x9a2a24));
    tail1.position.set(0.08,2.1,-0.52); tail1.rotation.x=2.6; g.add(tail1);
  }
  if(cls==='babaylan'){
    /* golden halo-crown like the serene priestess reference */
    const halo=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.045,6,20), M(0xd8b83a,{emissive:0xb08a20,emissiveIntensity:0.5}));
    halo.position.set(0,2.78,-0.12); g.add(halo);
    const tiara=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.05,5,12), M(0xd8b83a));
    tiara.rotation.x=Math.PI/2; tiara.position.y=2.56; g.add(tiara);
    const gem=new THREE.Mesh(new THREE.SphereGeometry(0.07,6,5), M(0x7df0ff,{emissive:0x39c2b4,emissiveIntensity:1}));
    gem.position.set(0,2.6,0.48); g.add(gem);
    for(const sx of [-1,1]){
      const ear=new THREE.Mesh(new THREE.SphereGeometry(0.05,5,4), M(0xd8b83a,{emissive:0xb08a20,emissiveIntensity:0.4}));
      ear.position.set(sx*0.5,2.14,0.08); g.add(ear);
    }
  }
  if(cls==='arnisador'){
    /* woven headband + back knot like the reference */
    const band=new THREE.Mesh(new THREE.CylinderGeometry(0.54,0.54,0.12,10), M(0x1c1826));
    band.position.y=2.48; g.add(band);
    const trim2=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,0.04,10), M(0xd8b83a));
    trim2.position.y=2.48; g.add(trim2);
    const knot2=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.34,4), M(0x9a2a24));
    knot2.position.set(0.1,2.26,-0.56); knot2.rotation.x=2.7; g.add(knot2);
  }
  if(cls==='alim'){
    const bun=new THREE.Mesh(new THREE.SphereGeometry(0.14,6,6), M(palette.hair));
    bun.position.set(0,2.62,-0.12); g.add(bun);
    const beard=new THREE.Mesh(new THREE.ConeGeometry(0.16,0.42,6), M(0xd8d8e0));
    beard.position.set(0,1.94,0.28); beard.rotation.x=0.25; g.add(beard);
  }
  if(cls==='mandirigma'){
    /* gold diadem w/ center gem like the red warrior reference */
    const helm=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.57,0.16,10), M(0xd8a83a));
    helm.position.y=2.52; g.add(helm);
    const gem2=new THREE.Mesh(new THREE.ConeGeometry(0.11,0.24,4), M(0xffd94a,{emissive:0xc08a10,emissiveIntensity:0.7}));
    gem2.position.set(0,2.68,0.5); gem2.rotation.x=0.5; g.add(gem2);
    for(const sx of [-1,1]){
      const wing=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.3,4), M(0x9a2a24));
      wing.position.set(sx*0.5,2.4,-0.3); wing.rotation.z=sx*1.2; g.add(wing);
    }
  }
  if(cls==='mamamana'){
    /* grand feather headdress like the huntress reference */
    const crown=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.06,5,12), M(0xd8b83a));
    crown.rotation.x=Math.PI/2; crown.position.y=2.6; g.add(crown);
    const gemF=new THREE.Mesh(new THREE.ConeGeometry(0.09,0.18,4), M(0xffd94a,{emissive:0xc08a10,emissiveIntensity:0.8}));
    gemF.position.set(0,2.64,0.5); gemF.rotation.x=0.5; g.add(gemF);
    const fcols=[0xe8e0d0,0x8a2a3a,0x3a5a2a,0xe8e0d0,0x6a2a4a,0x2a4a3a,0xe8e0d0];
    for(let i=0;i<7;i++){
      const fa=(i/6-0.5)*2.4;
      const fe=new THREE.Mesh(new THREE.ConeGeometry(0.09,0.75,4), M(fcols[i]));
      fe.position.set(Math.sin(fa)*0.42, 2.85+Math.cos(fa)*0.25, -0.18);
      fe.rotation.z=-fa*0.8; fe.scale.z=0.4;
      g.add(fe);
    }
    /* cheek war-paint */
    for(const sx of [-1,1]){
      const wp=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.03,0.03), M(0xc23a34));
      wp.position.set(sx*0.3,2.2,0.44); g.add(wp);
    }
  }
  if(cls==='anino'){
    /* deep hood + face mask like the shadow assassin reference */
    const hood=new THREE.Mesh(new THREE.SphereGeometry(0.62,10,8,0,Math.PI*2,0,Math.PI*0.62), M(0x1c1622));
    hood.position.y=2.36; hood.scale.z=1.15; g.add(hood);
    const hoodTip=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.45,5), M(0x1c1622));
    hoodTip.position.set(0,2.92,-0.15); hoodTip.rotation.x=-0.5; g.add(hoodTip);
    const trimH=new THREE.Mesh(new THREE.TorusGeometry(0.52,0.035,5,14,Math.PI*1.5), M(0x6a5a80));
    trimH.position.set(0,2.42,0.16); trimH.rotation.x=Math.PI/2-0.5; g.add(trimH);
    const mask=new THREE.Mesh(new THREE.SphereGeometry(0.42,9,7,0,Math.PI*2,Math.PI*0.5,Math.PI*0.34), M(0x14101c));
    mask.position.y=2.26; mask.scale.z=1.12; g.add(mask);
    /* violet smoke wisps */
    for(let i=0;i<3;i++){
      const wisp=new THREE.Mesh(new THREE.SphereGeometry(0.09,5,4), M(0x6a3aa0,{transparent:true,opacity:0.5,emissive:0x4a2a70,emissiveIntensity:0.8}));
      wisp.material._isFx=true;
      wisp.position.set(rnd(-0.5,0.5),2.5+i*0.25,-0.45); g.add(wisp);
    }
    /* tattered cape */
    const cape=new THREE.Mesh(new THREE.ConeGeometry(0.55,1.5,7,1,true), M(0x1c1622,{side:THREE.DoubleSide}));
    cape.position.set(0,1.35,-0.28); cape.rotation.x=0.2; g.add(cape);
  }
  if(cls==='panday'){
    /* fierce topknot + face tattoos + glowing rune chestplate */
    const knotP=new THREE.Mesh(new THREE.SphereGeometry(0.16,6,5), M(palette.hair));
    knotP.position.set(0,2.95,-0.05); g.add(knotP);
    const tieP=new THREE.Mesh(new THREE.TorusGeometry(0.11,0.035,5,10), M(0x9a2a24));
    tieP.position.set(0,2.84,-0.05); tieP.rotation.x=Math.PI/2; g.add(tieP);
    for(const sx of [-1,1]){
      const tat=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.16,0.03), M(0x2a2a3a));
      tat.position.set(sx*0.26,2.5,0.44); tat.rotation.z=sx*0.3; g.add(tat);
    }
    const runePlate=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.42,0.1), M(0xff8a3a,{emissive:0xff5a10,emissiveIntensity:0.9}));
    runePlate.material._isFx=true;
    runePlate.position.set(0,1.4,0.38); g.add(runePlate);
    /* heavy shoulder armor */
    for(const sx of [-1,1]){
      const pauldron=new THREE.Mesh(new THREE.SphereGeometry(0.26,7,6,0,Math.PI*2,0,Math.PI*0.6), Mstone(0x7a6a58));
      pauldron.position.set(sx*0.48,1.8,0); g.add(pauldron);
    }
  }
  // arms
  const armL=limb(0.22,0.82,palette.cloth); armL.position.set(-0.58,1.75,0); g.add(armL);
  const armR=limb(0.22,0.82,cls==='anino'?palette.cloth:skin); armR.position.set(0.58,1.75,0); g.add(armR);
  const weapArmRef=armR;
  // weapons on right arm
  const weap=new THREE.Group();
  if(cls==='babaylan'||cls==='mandirigma'){
    const blade=new THREE.Mesh(new THREE.BoxGeometry(0.1,cls==='mandirigma'?1.3:1.0,0.26), M(0xc8ccd4,{emissive:0x222428,emissiveIntensity:0.3}));
    blade.position.y=-1.3; weap.add(blade);
    const hilt=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.22,0.14), M(0x6a4a2a));
    hilt.position.y=-0.78; weap.add(hilt);
  } else if(cls==='arnisador'){
    const s1=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.1,5), M(0xb08a55));
    s1.position.y=-1.2; weap.add(s1);
  } else if(cls==='tirador'){
    const y1=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.5,5), M(0x8a6a42));
    y1.position.set(-0.1,-1.1,0); y1.rotation.z=0.5; weap.add(y1);
    const y2=y1.clone(); y2.position.x=0.1; y2.rotation.z=-0.5; weap.add(y2);
    const hd=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.5,5), M(0x8a6a42));
    hd.position.y=-0.85; weap.add(hd);
  } else if(cls==='alim'){
    const st=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,2.2,6), M(0x6a4a2a));
    st.position.y=-1.1; weap.add(st);
    const orb=new THREE.Mesh(new THREE.SphereGeometry(0.22,8,8), M(0xc08aff,{emissive:0x9a5aef,emissiveIntensity:0.8}));
    orb.position.y=-0.05; weap.add(orb);
  } else if(cls==='mamamana'){
    /* ornate recurve longbow */
    const bow=new THREE.Group();
    const bowArc=new THREE.Mesh(new THREE.TorusGeometry(0.75,0.05,5,14,Math.PI*1.25), M(0xb08a3a));
    bowArc.rotation.z=Math.PI*-0.62; bowArc.rotation.y=Math.PI/2; bow.add(bowArc);
    const string=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,1.4,3), M(0xe8e0d0));
    string.position.z=-0.22; bow.add(string);
    bow.position.y=-1.0; weap.add(bow);
    /* quiver on the back */
    const quiver=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.14,0.7,6), Mwood(0x8a5a2a));
    quiver.position.set(0.25,1.6,-0.42); quiver.rotation.z=0.4; g.add(quiver);
    for(let i=0;i<3;i++){
      const arw=new THREE.Mesh(new THREE.ConeGeometry(0.045,0.16,4), M(0xe8e0d0));
      arw.position.set(0.25+rnd(-0.06,0.06),2.05,-0.42+rnd(-0.05,0.05)); g.add(arw);
    }
  } else if(cls==='anino'){
    /* twin curved daggers, one per hand */
    const dag=(arm,flip)=>{
      const dg=new THREE.Group();
      const blade2=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.62,0.14), M(0xc8ccd4,{emissive:0x8a4ae0,emissiveIntensity:0.25}));
      blade2.position.y=-1.05; blade2.rotation.x=flip*0.3; dg.add(blade2);
      const tip=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.22,4), M(0xc8ccd4));
      tip.position.set(0,-1.42,flip*0.12); tip.rotation.x=Math.PI+flip*0.3; dg.add(tip);
      const hilt2=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.05,0.22,5), M(0x4a2a70));
      hilt2.position.y=-0.72; dg.add(hilt2);
      arm.add(dg);
    };
    dag(weapArmRef,1);
    weap.userData._aninoTwin=true;
  } else if(cls==='panday'){
    /* runic great hammer like the reference */
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.08,1.6,6), Mwood(0x6a4a2a));
    shaft.position.y=-1.0; weap.add(shaft);
    const headH=new THREE.Mesh(new THREE.BoxGeometry(0.65,0.34,0.34), Mstone(0x8a8a92));
    headH.position.y=-1.75; weap.add(headH);
    for(const sx of [-1,1]){
      const capH=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.38,0.38), M(0xd8a83a));
      capH.position.set(sx*0.33,-1.75,0); weap.add(capH);
    }
    const runeH=new THREE.Mesh(new THREE.BoxGeometry(0.67,0.12,0.12), M(0xffd94a,{emissive:0xff8a1a,emissiveIntensity:1}));
    runeH.material._isFx=true;
    runeH.position.y=-1.75; weap.add(runeH);
  }
  armR.add(weap);
  // offhand
  if(cls==='mandirigma'){
    const sh=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,0.12,8), M(0x8a6a42));
    sh.rotation.z=Math.PI/2; sh.position.set(-0.75,1.5,0.1); g.add(sh);
    const boss=new THREE.Mesh(new THREE.SphereGeometry(0.16,6,6), M(0xd8a83a));
    boss.position.set(-0.82,1.5,0.1); g.add(boss);
  }
  if(cls==='arnisador'){
    const s2=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.1,5), M(0xb08a55));
    s2.position.y=-0.55; armL.add(s2);
  }
  if(cls==='anino'){
    const bladeL=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.55,0.13), M(0xc8ccd4,{emissive:0x8a4ae0,emissiveIntensity:0.25}));
    bladeL.position.y=-0.95; armL.add(bladeL);
    const tipL=new THREE.Mesh(new THREE.ConeGeometry(0.065,0.2,4), M(0xc8ccd4));
    tipL.position.y=-1.28; tipL.rotation.x=Math.PI; armL.add(tipL);
  }
  if(cls==='babaylan'){
    const am=new THREE.Mesh(new THREE.SphereGeometry(0.14,6,6), M(0xd8b83a,{emissive:0xb08a20,emissiveIntensity:0.6}));
    am.position.set(0,1.65,0.32); g.add(am);
  }
  const sh=blobShadow(1); sh.position.y=0.02; g.add(sh);
  g.traverse(o=>{ if(o.isMesh&&!o.material._isFx) o.castShadow=true; });
  g.userData={legL,legR,armL,armR,weapArm:armR};
  return g;
}

function buildEnemyMesh(key){
  const def=ENEMY_DEFS[key];
  const g=new THREE.Group();
  const s=def.scale;
  const add=(mesh)=>{g.add(mesh);return mesh;};
  let animParts={};
  if(key==='tiyanak'){
    const body=add(new THREE.Mesh(new THREE.SphereGeometry(0.55,7,6), M(0x9ab088)));
    body.position.y=0.55; body.scale.y=0.9;
    const head=add(new THREE.Mesh(new THREE.SphereGeometry(0.42,7,6), M(0xaac098)));
    head.position.y=1.25;
    const e1=add(new THREE.Mesh(new THREE.SphereGeometry(0.07,4,4), M(0xff2a2a,{emissive:0xff0000,emissiveIntensity:1})));
    e1.position.set(-0.14,1.3,0.36);
    const e2=e1.clone(); e2.position.x=0.14; add(e2);
    const a1=add(limb(0.14,0.4,0x9ab088)); a1.position.set(-0.5,0.9,0.2);
    const a2=add(limb(0.14,0.4,0x9ab088)); a2.position.set(0.5,0.9,0.2);
    // gaping jaw + tiny fangs
    const jaw=add(new THREE.Mesh(new THREE.SphereGeometry(0.16,6,5), M(0x501818)));
    jaw.position.set(0,1.14,0.34); jaw.scale.set(1.2,0.7,0.8);
    const f1=add(new THREE.Mesh(new THREE.ConeGeometry(0.035,0.1,4), M(0xf0ead8)));
    f1.position.set(-0.08,1.1,0.42); f1.rotation.x=Math.PI;
    const f2=f1.clone(); f2.position.x=0.08; add(f2);
    // wispy hair tuft
    const tuft=add(new THREE.Mesh(new THREE.ConeGeometry(0.12,0.3,5), M(0x2a2018)));
    tuft.position.y=1.64; tuft.rotation.z=0.3;
    animParts={armL:a1,armR:a2};
  } else if(key==='duwende'){
    const body=add(new THREE.Mesh(new THREE.ConeGeometry(0.45,0.9,7), M(0x6a5a3a)));
    body.position.y=0.45;
    const head=add(new THREE.Mesh(new THREE.SphereGeometry(0.32,7,6), M(0xc99a6e)));
    head.position.y=1.05;
    const beard=add(new THREE.Mesh(new THREE.ConeGeometry(0.22,0.4,6), M(0xe8e8e0)));
    beard.position.set(0,0.85,0.2); beard.rotation.x=0.5;
    const hat=add(new THREE.Mesh(new THREE.ConeGeometry(0.3,0.7,7), M(0xd84a3a)));
    hat.position.y=1.45; hat.rotation.z=0.15;
    const brim=add(new THREE.Mesh(new THREE.TorusGeometry(0.3,0.05,5,10), M(0xb83a2e)));
    brim.position.y=1.14; brim.rotation.x=Math.PI/2;
    const nose=add(new THREE.Mesh(new THREE.SphereGeometry(0.09,5,5), M(0xd8a878)));
    nose.position.set(0,1.02,0.3);
    const e1=add(new THREE.Mesh(new THREE.SphereGeometry(0.045,4,4), M(0x1a1a1a)));
    e1.position.set(-0.11,1.1,0.26);
    const e2=e1.clone(); e2.position.x=0.11; add(e2);
    const belt=add(new THREE.Mesh(new THREE.TorusGeometry(0.34,0.045,5,10), M(0x3a2c1a)));
    belt.position.y=0.55; belt.rotation.x=Math.PI/2;
    const a1=add(limb(0.1,0.35,0xc99a6e)); a1.position.set(-0.42,0.62,0.1);
    const a2=add(limb(0.1,0.35,0xc99a6e)); a2.position.set(0.42,0.62,0.1);
    animParts={armL:a1,armR:a2};
  } else if(key==='tikbalang'){
    const legL=add(limb(0.2,1.1,0x5a4632)); legL.position.set(-0.3,1.1,0);
    const legR=add(limb(0.2,1.1,0x5a4632)); legR.position.set(0.3,1.1,0);
    const torso=add(new THREE.Mesh(new THREE.BoxGeometry(0.8,1.0,0.5), M(0x6a5238)));
    torso.position.y=1.7;
    const armL=add(limb(0.18,0.9,0x5a4632)); armL.position.set(-0.55,2.1,0);
    const armR=add(limb(0.18,0.9,0x5a4632)); armR.position.set(0.55,2.1,0);
    const head=add(new THREE.Mesh(new THREE.BoxGeometry(0.4,0.5,0.9), M(0x7a5f42)));
    head.position.set(0,2.6,0.25);
    const mane=add(new THREE.Mesh(new THREE.BoxGeometry(0.24,0.9,0.7), M(0x241a24)));
    mane.position.set(0,2.6,-0.25);
    const e1=add(new THREE.Mesh(new THREE.SphereGeometry(0.06,4,4), M(0xffd97a,{emissive:0xffb84a,emissiveIntensity:1})));
    e1.position.set(-0.16,2.68,0.5);
    const e2=e1.clone(); e2.position.x=0.16; add(e2);
    const ear1=add(new THREE.Mesh(new THREE.ConeGeometry(0.09,0.32,4), M(0x6a5238)));
    ear1.position.set(-0.15,2.95,0);
    const ear2=ear1.clone(); ear2.position.x=0.15; add(ear2);
    // nostrils + hoof caps + tail
    const snout=add(new THREE.Mesh(new THREE.BoxGeometry(0.3,0.24,0.2), M(0x4a3826)));
    snout.position.set(0,2.48,0.68);
    const h1=add(new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.24,0.18,6), M(0x241a14)));
    h1.position.set(-0.3,0.09,0);
    const h2=h1.clone(); h2.position.x=0.3; add(h2);
    const tail=add(new THREE.Mesh(new THREE.ConeGeometry(0.12,0.9,5), M(0x241a24)));
    tail.position.set(0,1.6,-0.35); tail.rotation.x=2.6;
    animParts={legL,legR,armL,armR};
  } else if(key==='santelmo'){
    const core=add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.6,0), M(0xff8a3a,{emissive:0xff5a10,emissiveIntensity:1.2})));
    core.position.y=1.4;
    const inner=add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.36,0), M(0x4ac8ff,{emissive:0x2a9aff,emissiveIntensity:1.4})));
    inner.position.y=1.4;
    const f1=add(new THREE.Mesh(new THREE.ConeGeometry(0.2,0.7,5), M(0xffb84a,{emissive:0xff8a20,emissiveIntensity:1})));
    f1.position.y=2.1;
    const glow=new THREE.PointLight(0xff7a2a, 6, 10, 2); glow.position.y=1.4; g.add(glow);
    animParts={core,inner,flame:f1, hover:true};
  } else if(key==='sigbin'){
    const body=add(new THREE.Mesh(new THREE.BoxGeometry(0.6,0.7,1.4), M(0x4a4450)));
    body.position.y=0.8; body.rotation.x=-0.15;
    const head=add(new THREE.Mesh(new THREE.BoxGeometry(0.4,0.45,0.6), M(0x565060)));
    head.position.set(0,0.55,0.85); head.rotation.x=0.5;
    const e1=add(new THREE.Mesh(new THREE.SphereGeometry(0.06,4,4), M(0xffe94a,{emissive:0xffd92a,emissiveIntensity:1.2})));
    e1.position.set(-0.12,0.62,1.12);
    const e2=e1.clone(); e2.position.x=0.12; add(e2);
    const ear1=add(new THREE.Mesh(new THREE.ConeGeometry(0.1,0.5,4), M(0x4a4450)));
    ear1.position.set(-0.18,0.95,0.8); ear1.rotation.z=0.4;
    const ear2=ear1.clone(); ear2.position.x=0.18; ear2.rotation.z=-0.4; add(ear2);
    for(const [dx,dzz] of [[-0.22,0.45],[0.22,0.45],[-0.22,-0.5],[0.22,-0.5]]){
      const l=add(limb(0.13,0.55,0x3a3542)); l.position.set(dx,0.55,dzz);
    }
    const tail=add(new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.06,0.9,4), M(0x3a3542)));
    tail.position.set(0,1.1,-0.8); tail.rotation.x=1.0;
    const tuft=add(new THREE.Mesh(new THREE.SphereGeometry(0.1,5,4), M(0x2a2530)));
    tuft.position.set(0,1.48,-1.18);
    const t1=add(new THREE.Mesh(new THREE.ConeGeometry(0.05,0.22,4), M(0xe8e0d0)));
    t1.position.set(-0.14,0.4,1.05); t1.rotation.x=0.9;
    const t2=t1.clone(); t2.position.x=0.14; add(t2);
    const spikes=[-0.35,-0.05,0.25];
    for(const zz of spikes){
      const sp=add(new THREE.Mesh(new THREE.ConeGeometry(0.07,0.28,4), M(0x2a2530)));
      sp.position.set(0,1.2,zz); sp.rotation.x=-0.3;
    }
  } else if(key==='kapre'){
    const legL=add(limb(0.34,1.0,0x2e2620)); legL.position.set(-0.4,1.0,0);
    const legR=add(limb(0.34,1.0,0x2e2620)); legR.position.set(0.4,1.0,0);
    const torso=add(new THREE.Mesh(new THREE.BoxGeometry(1.5,1.4,0.9), M(0x3a2e24)));
    torso.position.y=1.75;
    const hairT=add(new THREE.Mesh(new THREE.BoxGeometry(1.56,0.7,0.95), M(0x2a2018)));
    hairT.position.y=2.15;
    const armL=add(limb(0.3,1.3,0x3a2e24)); armL.position.set(-0.95,2.3,0);
    const armR=add(limb(0.3,1.3,0x3a2e24)); armR.position.set(0.95,2.3,0);
    const head=add(new THREE.Mesh(new THREE.BoxGeometry(0.8,0.8,0.75), M(0x4a3a2c)));
    head.position.y=2.95;
    const beard=add(new THREE.Mesh(new THREE.BoxGeometry(0.7,0.5,0.2), M(0x241c14)));
    beard.position.set(0,2.7,0.4);
    const cigar=add(new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.6,5), M(0x8a5a2a)));
    cigar.position.set(0.3,2.85,0.5); cigar.rotation.z=Math.PI/2; cigar.rotation.y=0.4;
    const ember=add(new THREE.Mesh(new THREE.SphereGeometry(0.1,5,5), M(0xff5a20,{emissive:0xff3a00,emissiveIntensity:1.5})));
    ember.position.set(0.58,2.87,0.62);
    const e1=add(new THREE.Mesh(new THREE.SphereGeometry(0.07,4,4), M(0xffb84a,{emissive:0xff8a20,emissiveIntensity:1})));
    e1.position.set(-0.2,3.0,0.38);
    const e2=e1.clone(); e2.position.x=0.2; add(e2);
    // smoke puffs above cigar + bark-loincloth + knuckles
    for(let i=0;i<3;i++){
      const puff=add(new THREE.Mesh(new THREE.SphereGeometry(0.1+i*0.05,5,4), M(0x9a9a9a,{transparent:true,opacity:0.5-i*0.12})));
      puff.material._isFx=true;
      puff.position.set(0.62+i*0.08,3.1+i*0.3,0.62);
    }
    const cloth=add(new THREE.Mesh(new THREE.BoxGeometry(1.55,0.5,0.95), M(0x5a7a3a)));
    cloth.position.y=1.05;
    const k1=add(new THREE.Mesh(new THREE.SphereGeometry(0.34,6,5), M(0x3a2e24)));
    k1.position.set(-0.95,1.55,0);
    const k2=k1.clone(); k2.position.x=0.95; add(k2);
    animParts={legL,legR,armL,armR};
  } else if(key==='nuno'){
    const mound=add(new THREE.Mesh(new THREE.ConeGeometry(1.3,1.5,8), M(0x8a6a4a)));
    mound.position.y=0.75;
    const body=add(new THREE.Mesh(new THREE.SphereGeometry(0.4,7,6), M(0x9a7a5a)));
    body.position.y=1.75;
    const head=add(new THREE.Mesh(new THREE.SphereGeometry(0.3,7,6), M(0xb08a62)));
    head.position.y=2.25;
    const beard=add(new THREE.Mesh(new THREE.ConeGeometry(0.2,0.5,6), M(0xd8d8d0)));
    beard.position.set(0,2.0,0.2); beard.rotation.x=0.4;
    const e1=add(new THREE.Mesh(new THREE.SphereGeometry(0.05,4,4), M(0xffffff,{emissive:0xaaaaff,emissiveIntensity:0.8})));
    e1.position.set(-0.1,2.3,0.26);
    const e2=e1.clone(); e2.position.x=0.1; add(e2);
    // salakot hat + staff + mound stones
    const hat=add(new THREE.Mesh(new THREE.ConeGeometry(0.42,0.26,8), M(0xc8a45a)));
    hat.position.y=2.5;
    const staff=add(new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.05,1.1,5), M(0x5a4028)));
    staff.position.set(0.45,1.9,0.1); staff.rotation.z=-0.12;
    const orb=add(new THREE.Mesh(new THREE.SphereGeometry(0.1,6,5), M(0x7ae8a0,{emissive:0x3ab870,emissiveIntensity:0.9})));
    orb.position.set(0.51,2.5,0.1);
    for(let i=0;i<5;i++){
      const st=add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.14,0), M(0x6f5540)));
      const a=i/5*Math.PI*2; st.position.set(Math.cos(a)*1.15,0.12,Math.sin(a)*1.15);
    }
  } else if(key==='aswang'){
    const legL=add(limb(0.16,0.8,0x6a626e)); legL.position.set(-0.25,0.95,0);
    const legR=add(limb(0.16,0.8,0x6a626e)); legR.position.set(0.25,0.95,0);
    const torso=add(new THREE.Mesh(new THREE.BoxGeometry(0.7,0.9,0.4), M(0x4a4450)));
    torso.position.y=1.35; torso.rotation.x=0.35;
    const armL=add(limb(0.14,0.9,0x7a727e)); armL.position.set(-0.45,1.7,0.15); armL.rotation.x=-0.7;
    const armR=add(limb(0.14,0.9,0x7a727e)); armR.position.set(0.45,1.7,0.15); armR.rotation.x=-0.7;
    const head=add(new THREE.Mesh(new THREE.SphereGeometry(0.34,7,6), M(0x8a8290)));
    head.position.set(0,1.95,0.3);
    const hair=add(new THREE.Mesh(new THREE.BoxGeometry(0.5,0.7,0.5), M(0x141018)));
    hair.position.set(0,2.05,0.1);
    const e1=add(new THREE.Mesh(new THREE.SphereGeometry(0.06,4,4), M(0xff2a2a,{emissive:0xff0000,emissiveIntensity:1.4})));
    e1.position.set(-0.12,1.95,0.6);
    const e2=e1.clone(); e2.position.x=0.12; add(e2);
    // claws + tattered wing membranes
    for(const sx of [-1,1]){
      for(let c=0;c<3;c++){
        const cl=add(new THREE.Mesh(new THREE.ConeGeometry(0.03,0.16,4), M(0xd8d0c0)));
        cl.position.set(sx*0.45+(c-1)*0.06,1.22,0.28); cl.rotation.x=Math.PI-0.5;
      }
      const wing=add(new THREE.Mesh(new THREE.ConeGeometry(0.5,1.1,3), M(0x2a2430,{transparent:true,opacity:0.85})));
      wing.position.set(sx*0.55,1.6,-0.35);
      wing.rotation.z=sx*2.2; wing.rotation.y=sx*0.4;
      wing.scale.z=0.25;
    }
    animParts={legL,legR,armL,armR};
  } else if(key==='wakwak'){
    /* dark raptor: feathered ball, hooked beak, big wings on pivots */
    const body=add(new THREE.Mesh(new THREE.SphereGeometry(0.55,7,6), M(0x2a2030)));
    body.position.y=1.7; body.scale.z=1.2;
    const head=add(new THREE.Mesh(new THREE.SphereGeometry(0.3,7,6), M(0x352840)));
    head.position.set(0,2.2,0.4);
    const beak=add(new THREE.Mesh(new THREE.ConeGeometry(0.1,0.4,4), M(0xd8b040)));
    beak.position.set(0,2.15,0.75); beak.rotation.x=Math.PI/2;
    const e1=add(new THREE.Mesh(new THREE.SphereGeometry(0.06,4,4), M(0xff4a2a,{emissive:0xff2a00,emissiveIntensity:1.6})));
    e1.position.set(-0.12,2.28,0.58);
    const e2=e1.clone(); e2.position.x=0.12; add(e2);
    const wingL=new THREE.Group(), wingR=new THREE.Group();
    wingL.position.set(-0.4,1.9,0); wingR.position.set(0.4,1.9,0);
    g.add(wingL); g.add(wingR);
    for(const [sx,wg] of [[-1,wingL],[1,wingR]]){
      const mem=new THREE.Mesh(new THREE.ConeGeometry(0.7,1.6,3), M(0x1c1424,{transparent:true,opacity:0.92}));
      mem.material._isFx=true;
      mem.position.set(sx*0.8,0.1,0); mem.rotation.z=sx*1.75; mem.scale.z=0.2;
      wg.add(mem);
    }
    const claws=add(new THREE.Mesh(new THREE.ConeGeometry(0.12,0.4,4), M(0xd8d0c0)));
    claws.position.set(0,1.15,0.1); claws.rotation.x=Math.PI;
    animParts={wingL,wingR,hover:true,flyer:true};
  } else if(key==='bungisngis'){
    /* laughing one-eyed giant */
    const legL=add(limb(0.4,1.2,0x6a5238)); legL.position.set(-0.5,1.2,0);
    const legR=add(limb(0.4,1.2,0x6a5238)); legR.position.set(0.5,1.2,0);
    const torso=add(new THREE.Mesh(new THREE.CapsuleGeometry(0.85,1.0,4,8), M(0x8a6a48)));
    torso.position.y=2.9;
    const belly=add(new THREE.Mesh(new THREE.SphereGeometry(0.7,8,7), M(0x9a7a54)));
    belly.position.set(0,2.5,0.3);
    const head=add(new THREE.Mesh(new THREE.SphereGeometry(0.55,8,7), M(0x9a7a54)));
    head.position.y=4.15;
    /* the single giant eye */
    const eye=add(new THREE.Mesh(new THREE.SphereGeometry(0.18,7,6), M(0xffffff)));
    eye.position.set(0,4.3,0.42);
    const pupil=add(new THREE.Mesh(new THREE.SphereGeometry(0.09,5,4), M(0x1a1010)));
    pupil.position.set(0,4.3,0.56);
    /* huge grinning mouth + upfolded lip */
    const lip=add(new THREE.Mesh(new THREE.BoxGeometry(0.8,0.18,0.3), M(0xb08a64)));
    lip.position.set(0,4.0,0.42); lip.rotation.x=0.4;
    for(let i=0;i<4;i++){
      const tooth=add(new THREE.Mesh(new THREE.ConeGeometry(0.05,0.16,4), M(0xf2ecd8)));
      tooth.position.set(-0.24+i*0.16,3.9,0.5); tooth.rotation.x=Math.PI;
    }
    const armL=add(limb(0.32,1.5,0x8a6a48)); armL.position.set(-1.0,3.4,0);
    const armR=add(limb(0.32,1.5,0x8a6a48)); armR.position.set(1.0,3.4,0);
    /* tree-trunk club */
    const club=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.3,1.8,6), Mbark(0x6a4e2e));
    club.position.set(0,-0.9,0.2); armR.add(club);
    animParts={legL,legR,armL,armR};
  } else if(key==='berberoka'){
    /* bloated swamp hulk, dripping */
    const body=add(new THREE.Mesh(new THREE.SphereGeometry(0.95,8,7), M(0x3e5c44)));
    body.position.y=1.35; body.scale.y=1.25;
    const head=add(new THREE.Mesh(new THREE.SphereGeometry(0.42,7,6), M(0x4a6a4e)));
    head.position.y=2.75;
    /* gaping round mouth (water cannon) */
    const mouth=add(new THREE.Mesh(new THREE.TorusGeometry(0.2,0.07,6,10), M(0x1c2a1a)));
    mouth.position.set(0,2.65,0.38);
    const e1=add(new THREE.Mesh(new THREE.SphereGeometry(0.07,4,4), M(0xc8ff6a,{emissive:0x88c020,emissiveIntensity:1.2})));
    e1.position.set(-0.16,2.95,0.3);
    const e2=e1.clone(); e2.position.x=0.16; add(e2);
    const armL=add(limb(0.22,1.0,0x3e5c44)); armL.position.set(-0.75,1.9,0.2); armL.rotation.x=-0.5;
    const armR=add(limb(0.22,1.0,0x3e5c44)); armR.position.set(0.75,1.9,0.2); armR.rotation.x=-0.5;
    /* moss + drips */
    for(let i=0;i<4;i++){
      const moss=add(new THREE.Mesh(new THREE.ConeGeometry(0.08,rnd(0.3,0.6),4), M(0x51703c)));
      moss.position.set(rnd(-0.6,0.6),1.0+rnd(0,1.2),rnd(0.5,0.8)); moss.rotation.x=Math.PI;
    }
    const legL=add(limb(0.28,0.7,0x35503a)); legL.position.set(-0.4,0.7,0);
    const legR=add(limb(0.28,0.7,0x35503a)); legR.position.set(0.4,0.7,0);
    animParts={legL,legR,armL,armR};
  } else if(key==='manananggal'){
    /* ===== MANANANGGAL — severed winged horror of the crater ===== */
    // torso only — severed at the waist, entrails trailing
    const torso=add(new THREE.Mesh(new THREE.CapsuleGeometry(0.34,0.7,4,8), M(0x8a7568)));
    torso.position.y=2.6; torso.scale.z=0.85;
    // ragged severed hem
    const hem=add(new THREE.Mesh(new THREE.CylinderGeometry(0.36,0.2,0.3,8), M(0x5a3028)));
    hem.position.y=2.1;
    // trailing entrails: dangling tapered strands
    const guts=[];
    for(let i=0;i<4;i++){
      const gt=add(new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.07,rnd(0.7,1.2),4), M(0x7a2a30,{emissive:0x40080c,emissiveIntensity:0.5})));
      gt.position.set(rnd(-0.15,0.15),1.55,rnd(-0.12,0.12));
      gt.rotation.z=rnd(-0.25,0.25); guts.push(gt);
    }
    const head=add(new THREE.Mesh(new THREE.SphereGeometry(0.3,8,7), M(0x9a8272)));
    head.position.y=3.35;
    // long streaming black hair
    const hair=add(new THREE.Mesh(new THREE.ConeGeometry(0.34,1.3,6), M(0x0e0a10)));
    hair.position.set(0,3.3,-0.3); hair.rotation.x=2.6;
    const e1=add(new THREE.Mesh(new THREE.SphereGeometry(0.06,4,4), M(0xff2a2a,{emissive:0xff0000,emissiveIntensity:2})));
    e1.position.set(-0.11,3.4,0.25);
    const e2=e1.clone(); e2.position.x=0.11; add(e2);
    // fanged mouth glint
    const fang=add(new THREE.Mesh(new THREE.ConeGeometry(0.03,0.1,4), M(0xf2ecd8)));
    fang.position.set(0,3.2,0.27); fang.rotation.x=Math.PI;
    // clawed arms
    const armL=add(limb(0.11,0.85,0x8a7568)); armL.position.set(-0.42,2.85,0.1); armL.rotation.x=-0.9;
    const armR=add(limb(0.11,0.85,0x8a7568)); armR.position.set(0.42,2.85,0.1); armR.rotation.x=-0.9;
    for(const [ax,arm] of [[-1,armL],[1,armR]]){
      for(let c=0;c<3;c++){
        const cl=new THREE.Mesh(new THREE.ConeGeometry(0.025,0.18,4), M(0xd8d0c0));
        cl.position.set((c-1)*0.06,-0.5,0.03); cl.rotation.x=Math.PI;
        arm.add(cl);
      }
    }
    // HUGE bat wings on pivots (flap in the anim loop)
    const wingL=new THREE.Group(), wingR=new THREE.Group();
    wingL.position.set(-0.3,3.0,-0.15); wingR.position.set(0.3,3.0,-0.15);
    g.add(wingL); g.add(wingR);
    for(const [sx,wg] of [[-1,wingL],[1,wingR]]){
      // wing arm bone
      const bone=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.08,1.5,5), M(0x241a20));
      bone.position.set(sx*0.7,0.25,0); bone.rotation.z=sx*1.25; wg.add(bone);
      // membrane: big flattened cone fan
      const mem=new THREE.Mesh(new THREE.ConeGeometry(1.15,2.3,3), M(0x2a1a24,{transparent:true,opacity:0.92}));
      mem.position.set(sx*1.35,0.15,-0.1);
      mem.rotation.z=sx*1.9; mem.rotation.y=sx*0.25; mem.scale.z=0.16;
      wg.add(mem);
      // wing finger spikes
      for(let f=0;f<3;f++){
        const fs2=new THREE.Mesh(new THREE.ConeGeometry(0.03,0.35,4), M(0x241a20));
        fs2.position.set(sx*(1.0+f*0.42),0.55-f*0.28,0);
        fs2.rotation.z=sx*(1.9+f*0.3); wg.add(fs2);
      }
    }
    animParts={armL,armR,wingL,wingR,guts,hover:true,flyer:true};
  }
  g.scale.setScalar(s);
  const sh=blobShadow(def.r+0.3); sh.position.y=0.02/s; sh.scale.setScalar((def.r+0.3)/s);
  g.add(sh);
  g.traverse(o=>{ if(o.isMesh&&!o.material._isFx) o.castShadow=true; });
  g.userData.anim=animParts;
  return g;
}

/* ================================================================
   ENTITIES
   ================================================================ */
const player={
  x:266, z:180, r:0.9, yaw:0,
  moving:false, bob:0,
  atkCd:0, atkAnim:0, atkAnimDur:0.22, atkAngle:0, castSlam:0,
  shieldUntil:0, wardHp:0, ironUntil:0, tauntDefUntil:0,
  dodgeUntil:0, dodgeCd:0, dodgeAng:0, iframesUntil:0,
  burnUntil:0, bleedUntil:0,
  hurtFlash:0, dead:false, deadT:0,
  skillCds:[0,0,0],
  mesh:null, shieldMesh:null,
};
if(WS_MAP&&WS_MAP.playerSpawn){ player.x=WS_MAP.playerSpawn.tx*TILE; player.z=WS_MAP.playerSpawn.ty*TILE; }   // World-Spec spawn marker
let camYaw=0, camPitch=0.85, camDist=15, camFollowY=0;

const enemies=[], drops=[], gearDrops=[], goldDrops=[], pprojs=[], eprojs=[], zones=[], fxMeshes=[];
/* SPAWN RULES (spec §10): data/enemies/spawn-rules.json authoritative, literals fallback */
const SPAWN_RULES=GAME_DATA.spawnRules||{};
const MAX_ENEMIES=SPAWN_RULES.maxEnemies||40;
const SPAWN_INTERVAL_MS=SPAWN_RULES.spawnIntervalMs||1600;
const TIER_WEIGHTS=SPAWN_RULES.tierWeights||{Common:5,Uncommon:2.6,Elite:1.6};
const SPAWN_MIN_PLAYER_DIST=SPAWN_RULES.minPlayerDistance||24;
const SPAWN_ATTEMPTS=SPAWN_RULES.spawnAttempts||90;
const HP_LEVEL_SCALING=SPAWN_RULES.hpLevelScaling||1.06;

/* HTML label system */
const labelsEl=$('labels');
const floatLabels=[]; // {el,x,y,z,t,dur,rise}
function addLabel(txt, cls, x,y,z, dur=0.9){
  const el=document.createElement('div');
  el.className='flabel '+cls; el.textContent=txt;
  labelsEl.appendChild(el);
  floatLabels.push({el,x,y,z,t:0,dur});
}
const _v=new THREE.Vector3();
function project(x,y,z){
  _v.set(x,y,z).project(camera);
  if(_v.z>1) return null;
  return {x:(_v.x*0.5+0.5)*window.innerWidth, y:(-_v.y*0.5+0.5)*window.innerHeight};
}

/* camp system: each species spawns ONLY inside its own territory circles */
function campsFor(key){ return CAMPS[key]||[]; }
function inAnyCamp(key,x,z){ return campsFor(key).some(c=>d2(c.x,c.z,x,z)<CAMP_R*CAMP_R); }
function spawnEnemy(force, forceKey){
  if(window._netIsGuest&&window._netIsGuest()) return;   // guests receive enemies from the host
  if(enemies.length>=MAX_ENEMIES && !force) return;
  const pool=Object.keys(ENEMY_DEFS).filter(k=>S.level>=ENEMY_DEFS[k].minLevel && !ENEMY_DEFS[k].boss);
  const weights=pool.map(k=>TIER_WEIGHTS[ENEMY_DEFS[k].tier]||SPAWN_RULES.defaultWeight||2);
  let key=forceKey;
  if(!key){
    let r=Math.random()*weights.reduce((a,b)=>a+b,0); key=pool[0];
    for(let i=0;i<pool.length;i++){ if((r-=weights[i])<=0){ key=pool[i]; break; } }
  }
  const def=ENEMY_DEFS[key];
  const camps=campsFor(key);
  if(!camps.length) return;
  for(let t=0;t<SPAWN_ATTEMPTS;t++){
    /* pick a camp, spawn within its territory ring */
    const c=camps[Math.floor(Math.random()*camps.length)];
    const a=rnd(0,6.28), rr=rnd(1.5,CAMP_R*0.85);
    const x=c.x+Math.sin(a)*rr, z=c.z+Math.cos(a)*rr;
    if(x<3*TILE||z<3*TILE||x>(MAP_W-3)*TILE||z>(MAP_H-3)*TILE) continue;
    if(x>EXCL.x0*TILE&&x<EXCL.x1*TILE&&z>EXCL.z0*TILE&&z<EXCL.z1*TILE) continue;
    if(d2(x,z,player.x,player.z)<SPAWN_MIN_PLAYER_DIST*SPAWN_MIN_PLAYER_DIST) continue;
    if(!walkable(x,z,def.r)) continue;
    const n=def.pack||1;
    for(let i=0;i<n;i++){
      const ox=x+rnd(-4,4), oz=z+rnd(-4,4);
      const ex=walkable(ox,oz,def.r)?ox:x, ez=walkable(ox,oz,def.r)?oz:z;
      const hp=Math.round(def.hp*Math.pow(HP_LEVEL_SCALING,S.level-1));
      const lvl=Math.max(def.minLevel||1, S.level+Math.floor(rnd(-1,2))); // shown on the nameplate
      const mesh=buildEnemyMesh(key);
      mesh.position.set(ex,groundY(ex,ez),ez);
      scene.add(mesh);
      const bar=document.createElement('div');
      bar.className='ebar'+(def.tier==='Elite'?' elite':''); bar.innerHTML='<i></i>'; bar.style.display='none';
      labelsEl.appendChild(bar);
      enemies.push({key,x:ex,z:ez,homeX:c.x,homeZ:c.z,hp,maxHp:hp,lvl,state:'idle',cd:rnd(0,1),flash:0,wt:0,wx:ex,wz:ez,windup:0,
        stealth:0,stunUntil:0,rootUntil:0,chargeT:0,chargeAng:0,retreatT:0,mesh,bar,animT:rnd(0,9)});
      attachNameplate(enemies[enemies.length-1]);
      if(window._netSpawned) window._netSpawned(enemies[enemies.length-1]);
    }
    return;
  }
}
setInterval(()=>{ if(started && enemies.length<MAX_ENEMIES) spawnEnemy(); }, SPAWN_INTERVAL_MS);
window._spawnEnemy=(k)=>spawnEnemy(true,k); // debug/test: force-spawn a species in its territory

/* ---- 🦇 MANANANGGAL: world boss of the volcano crater ---- */
let bossNextAt=nowS()+90;   // first flight ~90s in
function spawnBoss(){
  const def=ENEMY_DEFS.manananggal;
  const x=VOLCANO.tx*TILE, z=(VOLCANO.ty+5)*TILE;      // south crater rim
  const hp=Math.round(def.hp*Math.pow(1.05,Math.max(0,S.level-8)));
  const mesh=buildEnemyMesh('manananggal');
  mesh.position.set(x,groundY(x,z)+2.4,z); scene.add(mesh);
  const bar=document.createElement('div');
  bar.className='ebar elite boss'; bar.innerHTML='<i></i>'; bar.style.display='none';
  labelsEl.appendChild(bar);
  const en={key:'manananggal',x,z,hp,maxHp:hp,lvl:Math.max(def.minLevel||1,S.level),state:'idle',cd:2,flash:0,wt:0,wx:x,wz:z,windup:0,
    stealth:0,stunUntil:0,rootUntil:0,chargeT:0,chargeAng:0,retreatT:0,swoopT:0,mesh,bar,animT:0};
  enemies.push(en);
  attachNameplate(en);
  if(window._netSpawned) window._netSpawned(en);
  toast('🦇 LUMILIPAD ANG MANANANGGAL! Nagliliyab ang bunganga ng Bulkan Apolaki...','warn');
  screenShake(0.45,0.7);
}
setInterval(()=>{
  if(!started) return;
  if(window._netIsGuest&&window._netIsGuest()) return;
  if(enemies.some(e=>ENEMY_DEFS[e.key].boss)) return;
  if(nowS()<bossNextAt) return;
  spawnBoss();
},5000);

/* nearest player (local or ka-party) — enemies hunt whoever is closest */
function nearestTarget(en){
  let bx=player.x, bz=player.z, rid=0, dead=player.dead, bd=d2(player.x,player.z,en.x,en.z);
  if(window._kaParty) for(const [id,r] of window._kaParty){
    const dd=d2(r.x,r.z,en.x,en.z);
    if(dd<bd){ bd=dd; bx=r.x; bz=r.z; rid=id; dead=false; }
  }
  return {x:bx,z:bz,rid,dead,d:Math.sqrt(bd)};
}
function dealTo(tgt,dmg,opts){
  if(tgt.rid&&window._netDmg) window._netDmg(tgt.rid,Math.round(dmg),opts||{});
  else hurtPlayer(dmg,opts||{});
}

function attachNameplate(en){
  const def=ENEMY_DEFS[en.key];
  const nm=document.createElement('div');
  nm.className='ename'+(def.tier==='Elite'?' elite':'')+(def.boss?' boss':'');
  // "Name • Lv N" — level shown per owner request; tier ★/🦇 and colors unchanged.
  nm.textContent=(def.boss?'🦇 ':'')+def.name+' • Lv '+(en.lvl||def.minLevel||1)+(def.tier==='Elite'?' ★':'');
  nm.style.display='none';
  labelsEl.appendChild(nm);
  en.nameEl=nm;
}
function removeEnemy(en){
  scene.remove(en.mesh); en.bar.remove();
  if(en.nameEl) en.nameEl.remove();
  enemies.splice(enemies.indexOf(en),1);
  if(window._netRemoved) window._netRemoved(en);
}

/* ---- drop meshes ---- */
function spawnMatDrop(x,z,id,q){
  const m=new THREE.Mesh(new THREE.OctahedronGeometry(0.35,0), M(MATERIALS[id].col,{emissive:MATERIALS[id].col,emissiveIntensity:0.35}));
  m.position.set(x,groundY(x,z)+1,z);
  scene.add(m);
  drops.push({x,z,y:1.2,vy:rnd(4,7),vx:rnd(-3,3),vz:rnd(-3,3),id,q,t:0,magnet:false,mesh:m});
}
function spawnGoldDrop(x,z,q){
  const m=new THREE.Mesh(new THREE.SphereGeometry(0.28,6,6), M(0xffd94a,{emissive:0xd8a820,emissiveIntensity:0.8}));
  m.position.set(x,groundY(x,z)+1,z);
  scene.add(m);
  goldDrops.push({x,z,y:1.2,vy:rnd(4,7),vx:rnd(-3,3),vz:rnd(-3,3),q,t:0,magnet:false,mesh:m});
}
function spawnGearDrop(x,z,item){
  const rar=RARITIES.find(r=>r.id===item.rarity);
  const g=new THREE.Group();
  const box=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.55,0.55), M(rar.hex,{emissive:rar.hex,emissiveIntensity:0.5}));
  box.position.y=0.4; g.add(box);
  if(['rare','epic','legendary'].includes(item.rarity)){
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.3,6,6,1,true),
      new THREE.MeshBasicMaterial({color:rar.hex,transparent:true,opacity:0.35,depthWrite:false}));
    beam.position.y=3; g.add(beam);
  }
  g.position.set(x,groundY(x,z)+0.8,z);
  scene.add(g);
  gearDrops.push({x,z,y:1,vy:rnd(4,7),vx:rnd(-2,2),vz:rnd(-2,2),item,t:0,magnet:false,mesh:g});
}

/* ---- zone meshes ---- */
function spawnZone(x,z,r,type,until,owner){
  const col=type==='pfire'?0xbe5aff:type==='efire'?0xff6e28:0xc8aa5a;
  const g=new THREE.Group();
  const disk=new THREE.Mesh(new THREE.CircleGeometry(r,24), new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.18,depthWrite:false}));
  disk.rotation.x=-Math.PI/2; g.add(disk);
  const ring=new THREE.Mesh(new THREE.RingGeometry(r*0.9,r,24), new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.6,depthWrite:false,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2; ring.position.y=0.02; g.add(ring);
  g.position.set(x,groundY(x,z)+0.06,z);
  scene.add(g);
  zones.push({x,z,r,type,until,owner,tick:0,mesh:g,ring});
}

/* ---- fx meshes (rings, slashes) ---- */
function fxRing(x,z,color,r0,r1,dur,y=0.15){
  const m=new THREE.Mesh(new THREE.RingGeometry(0.8,1,24), new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.9,depthWrite:false,side:THREE.DoubleSide}));
  m.rotation.x=-Math.PI/2;
  m.position.set(x,groundY(x,z)+y,z);
  scene.add(m);
  fxMeshes.push({mesh:m,t:0,dur,r0,r1,type:'ring'});
}
function fxSlash(ang){
  const m=new THREE.Mesh(new THREE.RingGeometry(3.6,4.6,16,1,-0.7,1.4), new THREE.MeshBasicMaterial({color:0xffe9b4,transparent:true,opacity:0.95,depthWrite:false,side:THREE.DoubleSide}));
  m.rotation.x=-Math.PI/2;
  m.rotation.z=-ang+Math.PI/2;
  m.position.set(player.x,groundY(player.x,player.z)+1.1,player.z);
  scene.add(m);
  fxMeshes.push({mesh:m,t:0,dur:0.18,type:'slash'});
}
/* energy puff (trails / impact bursts) */
function fxPuff(x,y,z,color,size,dur=0.3){
  const m=new THREE.Mesh(new THREE.SphereGeometry(size,6,5),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.7,depthWrite:false}));
  m.material._isFx=true;
  m.position.set(x,y,z);
  scene.add(m);
  fxMeshes.push({mesh:m,t:0,dur,type:'puff'});
}
/* radial impact burst: ring + flying sparks */
function fxBurst(x,z,color,y=1.4){
  fxRing(x,z,color,0.3,2.6,0.3);
  for(let i=0;i<6;i++){
    const a=i/6*Math.PI*2+rnd(0,0.6);
    fxPuff(x+Math.sin(a)*rnd(0.3,1.1), y+rnd(-0.3,0.7), z+Math.cos(a)*rnd(0.3,1.1), color, rnd(0.1,0.22), rnd(0.2,0.4));
  }
}
/* erupting pillar (Fire Sigil release) */
function fxPillar(x,z,color,r=1.6,h=9,dur=0.7){
  const m=new THREE.Mesh(new THREE.ConeGeometry(r,h,10,1,true),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.75,depthWrite:false,side:THREE.DoubleSide}));
  m.material._isFx=true;
  m.geometry.translate(0,h/2,0);
  m.rotation.x=Math.PI;
  m.position.set(x,groundY(x,z)+h,z);
  m.scale.set(1,0.05,1);
  scene.add(m);
  fxMeshes.push({mesh:m,t:0,dur,type:'pillar',h});
}
/* dropped weapon on death — clatters to the ground and fades */
/* ================================================================
   SKILL SPECTACLE TOOLKIT — shake, hit-stop, arcs, shockwaves
   ================================================================ */
let shakeAmp=0, shakeDur=0, shakeT=0, hitStop=0;
function screenShake(amp,dur){ shakeAmp=Math.max(shakeAmp,amp); shakeDur=dur; shakeT=0; }
function doHitStop(sec){ hitStop=Math.max(hitStop,sec); }
/* jagged lightning arc between two points */
function fxLightning(x0,y0,z0,x1,y1,z1,color=0x9adfff,dur=0.22){
  const segs=7, pts=[];
  for(let i=0;i<=segs;i++){
    const f=i/segs;
    const jx=(i>0&&i<segs)?rnd(-0.7,0.7):0, jy=(i>0&&i<segs)?rnd(-0.5,0.5):0, jz=(i>0&&i<segs)?rnd(-0.7,0.7):0;
    pts.push(new THREE.Vector3(x0+(x1-x0)*f+jx, y0+(y1-y0)*f+jy, z0+(z1-z0)*f+jz));
  }
  const geo=new THREE.BufferGeometry().setFromPoints(pts);
  const m=new THREE.Line(geo, new THREE.LineBasicMaterial({color,transparent:true,opacity:1}));
  m.material._isFx=true;
  scene.add(m);
  fxMeshes.push({mesh:m,t:0,dur,type:'fadeline'});
  // small glow at impact end
  fxPuff(x1,y1,z1,color,0.3,0.25);
}
/* expanding torus shockwave (3D donut racing outward) */
function fxShockwave(x,z,color,r1=8,dur=0.5,y=0.6){
  const m=new THREE.Mesh(new THREE.TorusGeometry(1,0.18,6,28),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.85,depthWrite:false}));
  m.material._isFx=true;
  m.rotation.x=Math.PI/2;
  m.position.set(x,groundY(x,z)+y,z);
  scene.add(m);
  fxMeshes.push({mesh:m,t:0,dur,r0:1,r1,type:'shockwave'});
}
/* ghost afterimage of the hero (for dashes) */
function fxAfterimage(color=0x7df0ff){
  if(!player.mesh) return;
  const ghost=player.mesh.clone(true);
  const mats=[];
  ghost.traverse(o=>{
    if(o.isMesh){
      const gm=new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.35,depthWrite:false});
      gm._isFx=true; o.material=gm; o.castShadow=false; mats.push(gm);
    }
  });
  ghost.position.copy(player.mesh.position);
  ghost.rotation.copy(player.mesh.rotation);
  scene.add(ghost);
  fxMeshes.push({mesh:ghost,t:0,dur:0.35,type:'fadegroup',mats});
}
/* spiral of glowing motes rising (buffs/heals) */
function fxSpiral(x,z,color,dur=0.9,r=1.6,h=4){
  for(let i=0;i<14;i++){
    const f=i/14, a=f*Math.PI*4;
    setTimeout(()=>{
      if(player.dead) return;
      fxPuff(x+Math.cos(a)*r*(1-f*0.5), groundY(x,z)+0.4+f*h, z+Math.sin(a)*r*(1-f*0.5), color, 0.14, 0.4);
    }, f*dur*600);
  }
}
/* beam lance along a direction (railgun-style shots) */
function fxBeam(x,z,ang,len,color,width=0.3,dur=0.28){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(width,width,len,6,1,true),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.8,depthWrite:false,side:THREE.DoubleSide}));
  m.material._isFx=true;
  m.rotation.z=Math.PI/2; m.rotation.y=-ang+Math.PI/2;
  const y=groundY(x,z)+1.5;
  m.position.set(x+Math.sin(ang)*len/2, y, z+Math.cos(ang)*len/2);
  scene.add(m);
  fxMeshes.push({mesh:m,t:0,dur,type:'beam'});
}

function fxDropStaff(x,z){
  const g=new THREE.Group();
  const mats=[];
  const mk=(geo,c)=>{ const mat=new THREE.MeshLambertMaterial({color:c,transparent:true,opacity:1}); mat._isFx=true; mats.push(mat);
    const m=new THREE.Mesh(geo,mat); g.add(m); return m; };
  const shaft=mk(new THREE.CylinderGeometry(0.06,0.09,2.3,6),0x5a4028);
  shaft.rotation.z=Math.PI/2;
  const orb=mk(new THREE.SphereGeometry(0.2,8,7),0xc08aff);
  orb.material.emissive=new THREE.Color(0x9a5aef); orb.material.emissiveIntensity=1;
  orb.position.set(1.25,0.08,0);
  const ang=rnd(0,Math.PI*2);
  g.rotation.y=ang;
  g.position.set(x+Math.sin(ang)*1.5, groundY(x,z)+0.15, z+Math.cos(ang)*1.5);
  scene.add(g);
  fxMeshes.push({mesh:g,t:0,dur:2.1,type:'fadegroup',mats});
}

/* ---- projectiles ---- */
function firePProj(ang, mult, colorHex, size, opts={}){
  const C=CLASSES[S.cls];
  const m=new THREE.Mesh(new THREE.SphereGeometry(size,8,8), M(colorHex,{emissive:colorHex,emissiveIntensity:1}));
  const y=groundY(player.x,player.z)+1.4;
  m.position.set(player.x,y,player.z);
  scene.add(m);
  pprojs.push({x:player.x,z:player.z,y,vx:Math.sin(ang)*(C.projSpeed||30),vz:Math.cos(ang)*(C.projSpeed||30),
    mult, life:(C.range||26)/(C.projSpeed||30), pierce:opts.pierce||0, forceCrit:opts.forceCrit, mesh:m,
    trail:opts.trail||0, trailAcc:0, color:colorHex, chain:opts.chain||false, kulam:opts.kulam||false, sumpa:opts.sumpa||false});
}

/* ================================================================
   INPUT
   ================================================================ */
const joy={active:false,id:null,bx:0,by:0,dx:0,dy:0,mag:0};
const joyZone=$('joy-zone'), joyBase=$('joy-base'), joyKnob=$('joy-knob');
joyZone.addEventListener('pointerdown',e=>{
  if(joy.active) return;
  joy.active=true; joy.id=e.pointerId;
  joy.bx=e.clientX; joy.by=e.clientY; joy.dx=0; joy.dy=0; joy.mag=0;
  joyBase.style.left=joy.bx+'px'; joyBase.style.top=joy.by+'px';
  joyBase.classList.remove('hidden');
  joyKnob.style.transform='translate(-50%,-50%)';
  joyZone.setPointerCapture(e.pointerId);
});
joyZone.addEventListener('pointermove',e=>{
  if(!joy.active||e.pointerId!==joy.id) return;
  let dx=e.clientX-joy.bx, dy=e.clientY-joy.by;
  const len=Math.hypot(dx,dy), max=46;
  if(len>max){ dx=dx/len*max; dy=dy/len*max; }
  joy.dx=dx/max; joy.dy=dy/max; joy.mag=Math.min(1,len/max);
  joyKnob.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
});
function joyEnd(e){
  if(!joy.active||(e.pointerId!==undefined&&e.pointerId!==joy.id)) return;
  joy.active=false; joy.dx=0; joy.dy=0; joy.mag=0;
  joyBase.classList.add('hidden');
}
joyZone.addEventListener('pointerup',joyEnd);
joyZone.addEventListener('pointercancel',joyEnd);

/* camera orbit — drag right side */
const camZone=$('cam-zone');
let camDrag=null;
camZone.addEventListener('pointerdown',e=>{
  camDrag={id:e.pointerId,lx:e.clientX,ly:e.clientY};
  camZone.setPointerCapture(e.pointerId);
});
camZone.addEventListener('pointermove',e=>{
  if(!camDrag||e.pointerId!==camDrag.id) return;
  camYaw -= (e.clientX-camDrag.lx)*0.008;
  camPitch = clamp(camPitch + (e.clientY-camDrag.ly)*0.006, 0.3, 1.35);
  camDrag.lx=e.clientX; camDrag.ly=e.clientY;
});
camZone.addEventListener('pointerup',e=>{ if(camDrag&&e.pointerId===camDrag.id)camDrag=null; });
camZone.addEventListener('pointercancel',e=>{ if(camDrag&&e.pointerId===camDrag.id)camDrag=null; });
window.addEventListener('wheel',e=>{ camDist=clamp(camDist+e.deltaY*0.01,8,26); },{passive:true});

const keys={};
/* ---- remappable keybinds ---- */
const DEFAULT_KEYS={attack:' ', skill1:'1', skill2:'2', skill3:'3', dodge:'shift', interact:'e'};
let KEYBINDS=Object.assign({},DEFAULT_KEYS);
try{ KEYBINDS=Object.assign({},DEFAULT_KEYS,JSON.parse(localStorage.getItem('agimat_keys')||'{}')); }catch(e){}
function saveKeys(){ localStorage.setItem('agimat_keys',JSON.stringify(KEYBINDS)); refreshKeyLabels(); }
function keyLabel(k){ return k===' '?'␣':k==='shift'?'⇧':k.length===1?k.toUpperCase():k.toUpperCase(); }
function refreshKeyLabels(){
  $('btn-attack').dataset.key=keyLabel(KEYBINDS.attack);
  $('btn-dodge').dataset.key=keyLabel(KEYBINDS.dodge);
  $('btn-skill1').dataset.key=keyLabel(KEYBINDS.skill1);
  $('btn-skill2').dataset.key=keyLabel(KEYBINDS.skill2);
  $('btn-skill3').dataset.key=keyLabel(KEYBINDS.skill3);
}
window.addEventListener('keydown',e=>{
  keys[e.key.toLowerCase()]=true;
  const k=e.key.toLowerCase();
  if(k===KEYBINDS.attack||(' '===KEYBINDS.attack&&k==='j')){ e.preventDefault(); doAttack(); }
  if(k===KEYBINDS.skill1)useSkill(0); if(k===KEYBINDS.skill2)useSkill(1); if(k===KEYBINDS.skill3)useSkill(2);
  if(k===KEYBINDS.dodge||('shift'===KEYBINDS.dodge&&k==='l')){ e.preventDefault(); doDodge(); }
  if(k===KEYBINDS.interact) tryInteract();
  if(k==='q') camYaw+=0.08; if(k==='r') camYaw-=0.08;
  if(e.key==='Escape') closeAllPanels();
});
refreshKeyLabels();
window.addEventListener('keyup',e=>{ keys[e.key.toLowerCase()]=false; });

$('btn-attack').addEventListener('pointerdown',e=>{e.preventDefault();doAttack();});
$('btn-dodge').addEventListener('pointerdown',e=>{e.preventDefault();doDodge();});
$('btn-skill1').addEventListener('pointerdown',e=>{e.preventDefault();useSkill(0);});
$('btn-skill2').addEventListener('pointerdown',e=>{e.preventDefault();useSkill(1);});
$('btn-skill3').addEventListener('pointerdown',e=>{e.preventDefault();useSkill(2);});
$('btn-interact').addEventListener('pointerdown',e=>{e.preventDefault();tryInteract();});
$('btn-autoforage').addEventListener('pointerdown',e=>{
  e.preventDefault();
  if(S.level<5){ toast('🔒 Auto-Forage unlocks at Level 5','warn'); return; }
  setAutoForage(!S.autoForage);
});

/* movement input → world dir (camera relative) */
function moveInput(){
  let mx=0,my=0;
  if(joy.active){mx=joy.dx;my=joy.dy;}
  if(keys['w']||keys['arrowup'])my-=1; if(keys['s']||keys['arrowdown'])my+=1;
  if(keys['a']||keys['arrowleft'])mx-=1; if(keys['d']||keys['arrowright'])mx+=1;
  const len=Math.hypot(mx,my);
  if(len<0.1){
    if(window._autoVec&&window._autoVec.mag>0) return window._autoVec;  // auto battle steers only when idle
    return {x:0,z:0,mag:0};
  }
  if(len>1){mx/=len;my/=len;}
  // camera basis
  const fx=-Math.sin(camYaw), fz=-Math.cos(camYaw);   // forward (away from camera)
  const rx=-fz, rz=fx;                                  // right
  return {x:rx*mx+fx*(-my), z:rz*mx+fz*(-my), mag:Math.min(1,len)};
}

/* ================================================================
   COMBAT
   ================================================================ */
function aimAngle(){
  let target=null, best=1e12;
  const C=CLASSES[S.cls];
  const seek=C.melee?13:C.range+4;
  for(const en of enemies){
    if(en.stealth>0.5) continue;
    const dd=d2(en.x,en.z,player.x,player.z);
    if(dd<seek*seek && dd<best){ best=dd; target=en; }
  }
  if(target) return Math.atan2(target.x-player.x, target.z-player.z);
  const mv=moveInput();
  if(mv.mag>0.1) return Math.atan2(mv.x,mv.z);
  return player.yaw;
}
function rollDamage(mult, forceCrit){
  const crit = forceCrit || Math.random()*100<P.critCh;
  let dmg = Math.round(P.atk*mult*rnd(0.85,1.15)*(1+(window._partyAtkBonus?window._partyAtkBonus():0)));
  if((player.forgeUntil||0)>nowS()) dmg=Math.round(dmg*1.5);   // 🔥 Apoy ng Pandayan
  if(crit) dmg=Math.round(dmg*P.critDmg/100);
  return {dmg,crit};
}
function hitEnemy(en, mult, opts={}){
  const {dmg,crit}=rollDamage(mult, opts.forceCrit);
  en.hp-=dmg; en.flash=0.15; en.state='chase'; en.stealth=0;
  if(!en.remote&&window._netMarkContrib) window._netMarkContrib(en);
  if(opts.stun) en.stunUntil=nowS()+opts.stun*((window._statusFactor)?window._statusFactor(en,'stun'):1);   // Phase 9c: bosses shrug off repeat stuns
  if(opts.knock){
    const a=Math.atan2(en.x-player.x, en.z-player.z);
    const nx=en.x+Math.sin(a)*opts.knock, nz=en.z+Math.cos(a)*opts.knock;
    if(walkable(nx,nz,ENEMY_DEFS[en.key].r)){en.x=nx;en.z=nz;}
  }
  const def=ENEMY_DEFS[en.key];
  addLabel('-'+dmg, crit?'crit':'', en.x+rnd(-0.5,0.5), groundY(en.x,en.z)+def.scale*2.2, en.z, 0.8);
  if(P.lifesteal>0){ S.hp=Math.min(P.maxHp,S.hp+dmg*P.lifesteal/100); }
  if(en.remote){                                   // ghost: host is authoritative
    if(en.hp<0) en.hp=0;
    if(window._netHit) window._netHit(en,dmg,opts);
    return;
  }
  if(en.hp<=0) killEnemy(en);
}

function doAttack(){
  if(player.dead||player.atkCd>0||!started) return;
  const C=CLASSES[S.cls];
  player.atkCd=0.42*(1-P.cdr/200); player.atkAnim=0.22; player.atkAnimDur=0.22;
  const ang=aimAngle(); player.atkAngle=ang; player.yaw=ang;
  if(C.melee){
    fxSlash(ang);
    const RANGE=C.range, ARC=1.25;
    let hitAny=false;
    for(const en of enemies){
      const dd=Math.hypot(en.x-player.x,en.z-player.z);
      if(dd>RANGE+ENEMY_DEFS[en.key].r) continue;
      const a=Math.atan2(en.x-player.x,en.z-player.z);
      let da=Math.abs(a-ang); if(da>Math.PI)da=2*Math.PI-da;
      if(da>ARC) continue;
      hitEnemy(en,1,{knock:0.9}); hitAny=true;
    }
    for(const n of nodes){ if(n.ready&&d2(n.x,n.z,player.x,player.z)<6*6){ harvestNode(n); hitAny=true; } }
    if(!hitAny) fxRing(player.x+Math.sin(ang)*3.5, player.z+Math.cos(ang)*3.5, 0xffffff, 0.3, 1.2, 0.2);
  } else {
    if(S.cls==='alim'){
      // magical staff strike: longer anim (wind-up → strike), orb burst, trailed bolt
      player.atkAnim=0.5; player.atkAnimDur=0.5;
      const px=player.x+Math.sin(ang)*1.2, pz=player.z+Math.cos(ang)*1.2;
      fxPuff(px, groundY(player.x,player.z)+2.6, pz, 0xc08aff, 0.35, 0.25);
      firePProj(ang, 1, 0xc08aff, 0.28, {trail:0xb47aff});
      // Baybayin symbol briefly flashes in the air
      if(Math.random()<0.35){
        const GL=['ᜀ','ᜊ','ᜃ','ᜇ','ᜁ','ᜎ','ᜋ','ᜅ'];
        addLabel(GL[Math.floor(Math.random()*GL.length)],'xp',px,groundY(player.x,player.z)+3,pz,0.7);
      }
    } else if(S.cls==='mamamana'){
      // swift arrow: slim gold bolt w/ feather trail
      firePProj(ang, 1, 0xd8b83a, 0.2, {trail:0xe8e0d0});
    } else {
      firePProj(ang, 1, 0xe8d9a8, 0.28);
    }
    for(const n of nodes){ if(n.ready&&d2(n.x,n.z,player.x,player.z)<6*6) harvestNode(n); }
  }
}

function useSkill(i){
  if(player.dead||!started) return;
  const C=CLASSES[S.cls], sk=C.skills[i];
  const t=nowS();
  if(t<player.skillCds[i]) return;
  const cd = sk.cd*(1-P.cdr/100);
  const ang=aimAngle(); player.yaw=ang;
  switch(sk.id){
    case 'spirit_strike': {
      // ancestral spirit bolt: trailed, pierces, chains lightning to a 2nd enemy on hit
      firePProj(ang,1.8,0x7df0ff,0.42,{pierce:1,trail:0x7df0ff,chain:true});
      fxPuff(player.x+Math.sin(ang)*1.4, groundY(player.x,player.z)+2.2, player.z+Math.cos(ang)*1.4, 0x7df0ff, 0.4, 0.25);
      fxRing(player.x,player.z,0x7df0ff,0.3,1.6,0.25);
      break; }
    case 'agimat_shield':
      player.shieldUntil=t+5;
      // blessing descends: spiral + expanding gold ward ring + glyphs orbit
      fxSpiral(player.x,player.z,0xffd97a,0.8,1.8,3.5);
      fxShockwave(player.x,player.z,0x39c2b4,5,0.5,1.2);
      for(let gi=0;gi<4;gi++){
        const ga=gi/4*Math.PI*2;
        addLabel(['ᜀ','ᜅ','ᜋ','ᜆ'][gi],'xp',player.x+Math.sin(ga)*2, groundY(player.x,player.z)+2.2, player.z+Math.cos(ga)*2, 0.9);
      }
      toast('🛡️ Agimat Shield! 5s of protection.');
      break;
    case 'huling_hininga': {
      const heal=Math.round(P.maxHp*0.35);
      S.hp=Math.min(P.maxHp,S.hp+heal);
      addLabel('+'+heal,'healTxt',player.x,groundY(player.x,player.z)+3,player.z,0.9);
      // ancestor spirits rise: triple ring + double spiral + soft shake
      fxRing(player.x,player.z,0x7dffa8,0.5,4,0.7);
      fxRing(player.x,player.z,0xd8ffe8,0.3,2.5,0.5);
      setTimeout(()=>{ if(!player.dead) fxRing(player.x,player.z,0x7dffa8,0.4,3,0.5); },200);
      fxSpiral(player.x,player.z,0x7dffa8,1.0,1.5,4.5);
      fxSpiral(player.x,player.z,0xd8ffe8,1.0,1.0,3.5);
      for(let k=0;k<5;k++) setTimeout(()=>{ if(!player.dead) addLabel('✦','healTxt',player.x+rnd(-1.5,1.5),groundY(player.x,player.z)+rnd(1,3),player.z+rnd(-1.5,1.5),0.8); },k*140);
      break; }
    case 'sinawali': {
      // weaving double-stick flurry: 5 strikes, alternating arcs, finisher shockwave
      let hits=0;
      const doHit=()=>{
        if(player.dead) return;
        fxSlash(ang+(hits%2?0.35:-0.35));
        player.atkAnim=0.15; player.atkAnimDur=0.15;
        let any=false;
        for(const en of enemies){
          const dd=Math.hypot(en.x-player.x,en.z-player.z);
          if(dd<C.range+ENEMY_DEFS[en.key].r){ hitEnemy(en,0.55); any=true;
            fxPuff(en.x,groundY(en.x,en.z)+1.6,en.z,0xffe9b4,0.2,0.2); }
        }
        if(any&&hits===0) doHitStop(0.05);
        if(++hits<5) setTimeout(doHit,90);
        else { // finisher
          fxShockwave(player.x,player.z,0xffe9b4,6,0.4);
          screenShake(0.18,0.25);
          for(const en of enemies){
            const dd=Math.hypot(en.x-player.x,en.z-player.z);
            if(dd<C.range+1+ENEMY_DEFS[en.key].r) hitEnemy(en,1.0,{knock:1.8});
          }
        }
      };
      doHit(); break; }
    case 'abanico': {
      // fan strike: golden fan wedge + shockwave + uppercut launch feel
      fxShockwave(player.x,player.z,0xffe9b4,10,0.5);
      fxRing(player.x,player.z,0xffd97a,1,9,0.35);
      // fan blades sweep
      for(let k=0;k<5;k++) setTimeout(()=>{ if(!player.dead) fxSlash(ang-0.6+k*0.3); },k*40);
      screenShake(0.22,0.3);
      let hitAny=false;
      for(const en of enemies){
        const dd=Math.hypot(en.x-player.x,en.z-player.z);
        if(dd<9.5+ENEMY_DEFS[en.key].r){ hitEnemy(en,1.5,{knock:1.5}); hitAny=true;
          fxLightning(player.x,groundY(player.x,player.z)+1.5,player.z, en.x,groundY(en.x,en.z)+1.5,en.z, 0xffd97a,0.15); }
      }
      if(hitAny) doHitStop(0.07);
      break; }
    case 'redonda': {
      // whirlwind dash: afterimages, spinning slash trail, shockwave at both ends
      fxShockwave(player.x,player.z,0xa0dcff,4,0.35);
      const dashLen=14, steps=8;
      for(let s2=1;s2<=steps;s2++){
        const nx=player.x+Math.sin(ang)*dashLen/steps, nz=player.z+Math.cos(ang)*dashLen/steps;
        if(walkable(nx,nz,player.r)){ player.x=nx; player.z=nz; }
        if(s2%2===0) fxAfterimage(0xa0dcff);
        if(s2%3===0) fxSlash(ang+s2);
        for(const en of enemies){
          if(d2(en.x,en.z,player.x,player.z)<4.5*4.5 && !en._redonda){ en._redonda=true; hitEnemy(en,2,{knock:2});
            fxBurst(en.x,en.z,0xa0dcff,1.5); }
        }
      }
      for(const en of enemies) delete en._redonda;
      player.iframesUntil=t+0.3;
      fxShockwave(player.x,player.z,0xa0dcff,5,0.4);
      screenShake(0.15,0.2);
      break; }
    case 'precision': {
      // railgun shot: aim-line flash, beam lance, trailed crit bolt, recoil kick
      fxBeam(player.x,player.z,ang,C.range||26,0xffd97a,0.22,0.3);
      firePProj(ang,2.6,0xffd97a,0.36,{forceCrit:true,trail:0xffd97a});
      fxPuff(player.x+Math.sin(ang)*1.5, groundY(player.x,player.z)+1.5, player.z+Math.cos(ang)*1.5, 0xfff2c8, 0.35, 0.2);
      screenShake(0.12,0.15);
      // recoil step back
      const bx=player.x-Math.sin(ang)*0.5, bz=player.z-Math.cos(ang)*0.5;
      if(walkable(bx,bz,player.r)){ player.x=bx; player.z=bz; }
      break; }
    case 'scatter': {
      // buckshot fan: 7 pellets, muzzle blast cone, shell-spread ring
      for(let k=-3;k<=3;k++) firePProj(ang+k*0.13,0.75,0xe8d9a8,0.22,{trail:k%2===0?0xd8c898:0});
      fxRing(player.x+Math.sin(ang)*2.5, player.z+Math.cos(ang)*2.5, 0xe8d9a8, 0.5, 3, 0.25);
      fxPuff(player.x+Math.sin(ang)*1.6, groundY(player.x,player.z)+1.5, player.z+Math.cos(ang)*1.6, 0xfff8e0, 0.5, 0.22);
      screenShake(0.14,0.18);
      break; }
    case 'snare': {
      // bato snare: lobbed stone arcs visibly, then rock spikes erupt in the zone
      const sx3=player.x+Math.sin(ang)*10, sz3=player.z+Math.cos(ang)*10;
      // arcing stone puffs along the lob path
      for(let k=0;k<6;k++){
        const f=k/5;
        setTimeout(()=>{ if(player.dead)return;
          const lx=player.x+(sx3-player.x)*f, lz=player.z+(sz3-player.z)*f;
          fxPuff(lx, groundY(lx,lz)+1.2+Math.sin(f*Math.PI)*3.2, lz, 0xc8aa5a, 0.2, 0.25);
        }, k*55);
      }
      setTimeout(()=>{ if(player.dead)return;
        spawnZone(sx3, sz3, 6, 'snare', nowS()+3.5, 'player');
        fxShockwave(sx3,sz3,0xc8aa5a,6,0.4);
        screenShake(0.1,0.15);
        // rock spikes erupt around the rim
        for(let k=0;k<6;k++){
          const ka=k/6*Math.PI*2;
          fxPuff(sx3+Math.sin(ka)*4.5, groundY(sx3,sz3)+0.6, sz3+Math.cos(ka)*4.5, 0x9a8a6a, 0.35, 0.4);
        }
      }, 330);
      break; }
    case 'fire_sigil': {
      const zx=player.x+Math.sin(ang)*11, zz=player.z+Math.cos(ang)*11;
      spawnZone(zx, zz, 7, 'pfire', t+4, 'player');
      // spec wind-up/cast: staff slam into the ground + expanding Baybayin rune circle
      player.castSlam=0.4; player.atkAnim=0; // slam pose (handled separately from swing)
      fxRing(player.x, player.z, 0xb47aff, 0.3, 2.2, 0.3);
      fxRing(zx, zz, 0xbe5aff, 0.5, 7, 0.45);
      const GL=['ᜀ','ᜊ','ᜃ','ᜇ','ᜁ','ᜎ'];
      for(let gi=0;gi<6;gi++){
        const ga=gi/6*Math.PI*2;
        addLabel(GL[gi],'xp', zx+Math.sin(ga)*5, groundY(zx,zz)+1.2, zz+Math.cos(ga)*5, 1.1);
      }
      // spec release: pillar of fire erupts from the circle, caster pushed back
      setTimeout(()=>{
        if(player.dead) return;
        fxPillar(zx, zz, 0xbe5aff, 1.8, 10, 0.7);
        fxPillar(zx, zz, 0xff8a3a, 1.1, 7, 0.55);
        fxBurst(zx, zz, 0xbe5aff, 2);
        fxShockwave(zx, zz, 0xbe5aff, 9, 0.55);
        screenShake(0.35,0.4); doHitStop(0.06);
        player.x-=Math.sin(ang)*0.9; player.z-=Math.cos(ang)*0.9; // recoil push
      }, 400);
      break; }
    case 'water_ward': {
      player.wardHp=Math.round(P.maxHp*0.30);
      // rising water veil: blue spiral + droplet ring + splash shock
      fxSpiral(player.x,player.z,0x50a0ff,0.9,1.6,4);
      fxShockwave(player.x,player.z,0x50a0ff,4.5,0.5,0.4);
      for(let k=0;k<8;k++){
        const ka=k/8*Math.PI*2;
        fxPuff(player.x+Math.sin(ka)*1.6, groundY(player.x,player.z)+rnd(0.5,2.5), player.z+Math.cos(ka)*1.6, 0x8ac8ff, 0.16, 0.5);
      }
      toast('💧 Water Ward absorbs the next '+player.wardHp+' damage.');
      break; }
    case 'wind_burst': {
      // typhoon clap: double shockwave, debris spiral, lightning-laced gust
      fxShockwave(player.x,player.z,0xa0f0ff,11,0.5);
      fxRing(player.x,player.z,0xa0f0ff,1,11,0.4);
      setTimeout(()=>{ if(!player.dead){ fxRing(player.x,player.z,0xd8f8ff,0.5,8,0.35); fxShockwave(player.x,player.z,0xd8f8ff,7,0.4,1.6); } },110);
      fxSpiral(player.x,player.z,0xd8f8ff,0.5,2.5,3);
      screenShake(0.28,0.35);
      let hitAny=false;
      for(const en of enemies){
        const dd=Math.hypot(en.x-player.x,en.z-player.z);
        if(dd<10.5+ENEMY_DEFS[en.key].r){
          hitEnemy(en,1.3,{knock:5.5,stun:0.5}); hitAny=true;
          fxLightning(player.x,groundY(player.x,player.z)+2,player.z, en.x,groundY(en.x,en.z)+1.5,en.z, 0xa0f0ff,0.18);
        }
      }
      if(hitAny) doHitStop(0.08);
      player.castSlam=0.4; player.atkAnim=0;
      break; }
    case 'shield_bash': {
      // seismic slam: crack-line cone, launch hits, heavy shake + hit-stop
      fxSlash(ang);
      fxShockwave(player.x+Math.sin(ang)*3, player.z+Math.cos(ang)*3, 0xd8a83a, 7, 0.45);
      for(let k=1;k<=4;k++){
        const lx=player.x+Math.sin(ang)*k*1.8, lz=player.z+Math.cos(ang)*k*1.8;
        setTimeout(()=>{ if(!player.dead) fxPuff(lx,groundY(lx,lz)+0.4,lz,0xc8a870,0.3,0.3); },k*45);
      }
      screenShake(0.3,0.35);
      let hitAny=false;
      for(const en of enemies){
        const dd=Math.hypot(en.x-player.x,en.z-player.z);
        if(dd>9+ENEMY_DEFS[en.key].r) continue;
        const a=Math.atan2(en.x-player.x,en.z-player.z);
        let da=Math.abs(a-ang); if(da>Math.PI)da=2*Math.PI-da;
        if(da<1.3){ hitEnemy(en,1.6,{stun:2,knock:1.2}); hitAny=true;
          fxBurst(en.x,en.z,0xd8a83a,1.5);
          addLabel('💫','hurt',en.x,groundY(en.x,en.z)+ENEMY_DEFS[en.key].scale*2.8,en.z,0.9); }
      }
      if(hitAny) doHitStop(0.1);
      break; }
    case 'taunt': {
      // war cry: red challenge nova + defiant stomp
      fxShockwave(player.x,player.z,0xff6a5e,14,0.6);
      fxRing(player.x,player.z,0xff8a7e,0.5,6,0.4);
      screenShake(0.2,0.25);
      addLabel('HOY!','hurt',player.x,groundY(player.x,player.z)+3.6,player.z,1.1);
      for(const en of enemies){ if(d2(en.x,en.z,player.x,player.z)<20*20){ en.state='chase';
        addLabel('❗','hurt',en.x,groundY(en.x,en.z)+ENEMY_DEFS[en.key].scale*2.8,en.z,0.8); } }
      player.tauntDefUntil=t+6;
      toast('📢 "HOY! Lumapit kayo!" +50% defense for 6s.');
      break; }
    case 'iron_stance': {
      player.ironUntil=t+5;
      // stone skin: rock shard spiral + earthen shockwave + Baybayin seal
      fxSpiral(player.x,player.z,0xc8a870,0.7,1.4,3.5);
      fxShockwave(player.x,player.z,0x9a8a6a,4,0.45,0.3);
      fxRing(player.x,player.z,0xd8a83a,0.4,2.6,0.5);
      addLabel('ᜆᜆᜄ᜔','xp',player.x,groundY(player.x,player.z)+3.2,player.z,1.0);
      screenShake(0.15,0.2);
      toast('🗿 Iron Stance! 70% damage reduction for 5s.');
      break; }
    /* ===== MAMAMANA ===== */
    case 'ulan_palaso': {
      // arrow rain: target zone ahead, 5 waves of falling arrows
      const zx=player.x+Math.sin(ang)*11, zz=player.z+Math.cos(ang)*11;
      fxRing(zx,zz,0xd8b83a,0.5,5.5,0.5);
      for(let w=0;w<5;w++) setTimeout(()=>{
        if(player.dead) return;
        for(let a2=0;a2<4;a2++){
          const ax=zx+rnd(-4.5,4.5), az=zz+rnd(-4.5,4.5);
          fxBeam(ax,az-0.1,0,0.1,0xd8b83a,0.12,3.4);
          fxPuff(ax,groundY(ax,az)+0.4,az,0xffe9b4,0.25,0.2);
        }
        for(const en of enemies){
          if(d2(en.x,en.z,zx,zz)<5.5*5.5) hitEnemy(en,0.75);
        }
        screenShake(0.06,0.1);
      },w*260);
      break; }
    case 'tudla_diwata': {
      // spirit arrow: pierces everything in a line
      fxBeam(player.x,player.z,ang,C.range||28,0x8affd0,0.3,0.35);
      firePProj(ang,2.2,0x8affd0,0.34,{pierce:99,trail:0x8affd0});
      fxPuff(player.x+Math.sin(ang)*1.5,groundY(player.x,player.z)+1.6,player.z+Math.cos(ang)*1.5,0xd0ffe8,0.4,0.25);
      screenShake(0.1,0.14);
      break; }
    case 'amihan': {
      // leap back + triple fan
      const bx=player.x-Math.sin(ang)*5, bz=player.z-Math.cos(ang)*5;
      if(walkable(bx,bz,player.r)){ player.x=bx; player.z=bz; fxAfterimage(0xa0dcff); }
      player.iframesUntil=t+0.35;
      for(let k=-1;k<=1;k++) firePProj(ang+k*0.22,1.1,0xd8e8ff,0.26,{trail:k===0?0xd8e8ff:0});
      fxRing(player.x,player.z,0xa0dcff,0.4,2.4,0.3);
      break; }
    /* ===== ANINO ===== */
    case 'dilim_dash': {
      // blink behind the nearest enemy and backstab
      let tgt2=null,bd2=1e9;
      for(const en of enemies){ if(en.hp<=0)continue; const dd=d2(en.x,en.z,player.x,player.z); if(dd<24*24&&dd<bd2){bd2=dd;tgt2=en;} }
      fxPuff(player.x,groundY(player.x,player.z)+1.4,player.z,0x6a3aa0,0.7,0.35);
      if(tgt2){
        const behind=Math.atan2(tgt2.x-player.x,tgt2.z-player.z);
        const nx=tgt2.x+Math.sin(behind)*1.8, nz=tgt2.z+Math.cos(behind)*1.8;
        if(walkable(nx,nz,player.r)){ player.x=nx; player.z=nz; }
        player.yaw=Math.atan2(tgt2.x-player.x,tgt2.z-player.z);
        fxAfterimage(0x8a4ae0);
        fxSlash(player.yaw);
        hitEnemy(tgt2,2.5,{forceCrit:true});
        fxBurst(tgt2.x,tgt2.z,0x8a4ae0,1.6);
        doHitStop(0.08); screenShake(0.16,0.2);
      } else {
        const nx=player.x+Math.sin(ang)*8, nz=player.z+Math.cos(ang)*8;
        if(walkable(nx,nz,player.r)){ player.x=nx; player.z=nz; fxAfterimage(0x8a4ae0); }
      }
      player.iframesUntil=t+0.3;
      break; }
    case 'ulap_anino': {
      player.iframesUntil=t+2.5;
      player.shadowUntil=t+2.5;
      fxSpiral(player.x,player.z,0x6a3aa0,0.9,1.6,3.5);
      fxRing(player.x,player.z,0x8a4ae0,0.4,3,0.5);
      for(let k=0;k<6;k++) setTimeout(()=>{ if(!player.dead) fxPuff(player.x+rnd(-1,1),groundY(player.x,player.z)+rnd(0.5,2.2),player.z+rnd(-1,1),0x4a2a70,0.5,0.4); },k*380);
      toast('💨 Ulap ng Anino! Hindi ka matatamaan ng 2.5s.');
      break; }
    case 'abaniko_patalim': {
      for(let k=-2;k<=2;k++) firePProj(ang+k*0.17,0.95,0x9a6ae8,0.22,{trail:k%2===0?0x8a4ae0:0});
      fxSlash(ang-0.3); fxSlash(ang+0.3);
      fxRing(player.x+Math.sin(ang)*2,player.z+Math.cos(ang)*2,0x8a4ae0,0.4,2.6,0.3);
      screenShake(0.1,0.15);
      break; }
    /* ===== PANDAY ===== */
    case 'kulam_karayom': {
      firePProj(ang,1.6,0x9aff5a,0.24,{trail:0x7ad83a,kulam:true});
      fxPuff(player.x+Math.sin(ang)*1.2, groundY(player.x,player.z)+1.8, player.z+Math.cos(ang)*1.2, 0x9aff5a, 0.3, 0.25);
      break; }
    case 'usok_lason': {
      const zx=player.x+Math.sin(ang)*8, zz=player.z+Math.cos(ang)*8;
      spawnZone(zx,zz,6,'pfire',t+4,'player');
      fxRing(zx,zz,0x6aab3a,0.5,6,0.6);
      fxPuff(zx,groundY(zx,zz)+1.5,zz,0x6aab3a,0.9,0.6);
      toast('🟢 Usok ng Lason! Lumayo ang mga may-hininga.');
      break; }
    case 'sumpa_dugo': {
      firePProj(ang,3.0,0xd83a5e,0.34,{trail:0xff5a7a,sumpa:true});
      fxSpiral(player.x,player.z,0xd83a5e,0.6,1.4,2.5);
      addLabel('ᜐ','xp',player.x,groundY(player.x,player.z)+3,player.z,0.9);
      break; }
    case 'bayo_bulkan': {
      // leaping hammer slam
      const lx=player.x+Math.sin(ang)*4.5, lz=player.z+Math.cos(ang)*4.5;
      if(walkable(lx,lz,player.r)){ player.x=lx; player.z=lz; }
      fxShockwave(player.x,player.z,0xff8a3a,8,0.55);
      fxRing(player.x,player.z,0xffb87e,0.5,7,0.45);
      fxBurst(player.x,player.z,0xff6a2a,2.2);
      screenShake(0.35,0.4);
      let hitAny2=false;
      for(const en of enemies){
        const dd=Math.hypot(en.x-player.x,en.z-player.z);
        if(dd<7.5+ENEMY_DEFS[en.key].r){ hitEnemy(en,2.0,{stun:1.5,knock:1.4}); hitAny2=true;
          fxPuff(en.x,groundY(en.x,en.z)+1.2,en.z,0xffb87e,0.4,0.25); }
      }
      if(hitAny2) doHitStop(0.09);
      break; }
    case 'pandayan': {
      player.forgeUntil=t+6;
      fxSpiral(player.x,player.z,0xff8a3a,0.8,1.7,3.8);
      fxRing(player.x,player.z,0xffd94a,0.4,3,0.5);
      addLabel('🔥','warn',player.x,groundY(player.x,player.z)+3.4,player.z,1.0);
      toast('🔥 Apoy ng Pandayan! +50% damage sa loob ng 6s.');
      break; }
    case 'lindol': {
      fxShockwave(player.x,player.z,0xc8a870,12,0.6);
      fxShockwave(player.x,player.z,0x9a8a6a,8,0.5,0.25);
      fxRing(player.x,player.z,0xd8a83a,1,11,0.5);
      screenShake(0.4,0.55);
      for(let k=0;k<8;k++){
        const ra=k/8*Math.PI*2;
        setTimeout(()=>{ if(!player.dead){ const px2=player.x+Math.sin(ra)*6, pz2=player.z+Math.cos(ra)*6;
          fxPuff(px2,groundY(px2,pz2)+0.4,pz2,0xc8a870,0.4,0.3); } },k*50);
      }
      let hitAny3=false;
      for(const en of enemies){
        const dd=Math.hypot(en.x-player.x,en.z-player.z);
        if(dd<11+ENEMY_DEFS[en.key].r){ hitEnemy(en,1.7,{knock:2.2}); hitAny3=true; }
      }
      if(hitAny3) doHitStop(0.08);
      break; }
  }
  player.skillCds[i]=t+cd;
}

function doDodge(){
  if(player.dead||!started) return;
  const t=nowS();
  if(t<player.dodgeCd) return;
  const mv=moveInput();
  const ang = mv.mag>0.1 ? Math.atan2(mv.x,mv.z) : player.yaw;
  player.dodgeUntil=t+0.32; player.dodgeCd=t+2.2*(1-P.cdr/200);
  player.dodgeAng=ang; player.iframesUntil=t+0.38;
  fxRing(player.x,player.z,0xa0dcff,0.4,2.4,0.3);
}

function killReward(en){
  const def=ENEMY_DEFS[en.key];
  if(!S.bestiary[en.key]) S.bestiary[en.key]={seen:true,kills:0};
  S.bestiary[en.key].kills++;
  if(window._questKill) window._questKill(en.key);
  addLabel('💥','warn',en.x,groundY(en.x,en.z)+def.scale*1.5,en.z,0.5);
  fxRing(en.x,en.z,0xffb84a,0.5,3.5,0.4);

  const gains={};
  let gotUncommon=false;
  for(const d of def.drops){
    if(Math.random()<d.chance){
      const q=(MATERIALS[d.id].rarity==='common')?dropScale(rand(d.qty[0],d.qty[1])):rand(d.qty[0],d.qty[1]);
      gains[d.id]=(gains[d.id]||0)+q;
      if(MATERIALS[d.id].rarity!=='common') gotUncommon=true;
    }
  }
  if(gotUncommon) S.pitySinceUncommon=0;
  else if(++S.pitySinceUncommon>=10){
    const un=def.drops.find(d=>MATERIALS[d.id].rarity!=='common')||{id:'diwata_dew',qty:[1,2]};
    gains[un.id]=(gains[un.id]||0)+rand(un.qty[0],un.qty[1]);
    S.pitySinceUncommon=0;
    toast('🙏 The spirits take pity — bonus uncommon drop!','loot');
  }
  if(Math.random()<0.02){ gains.mutya=(gains.mutya||0)+1; S.pityRareFails=0; toast('💎 A MUTYA falls from the heavens!','levelup'); }
  else if(++S.pityRareFails>=50){ gains.mutya=(gains.mutya||0)+1; S.pityRareFails=0; toast('💎 Destiny relents — a guaranteed MUTYA!','levelup'); }

  const runeCh = def.boss?1.0 : def.tier==='Elite'?0.12 : 0.05;
  if(Math.random()<runeCh){
    const rid=RUNE_IDS[rand(0,RUNE_IDS.length-1)];
    gains[rid]=(gains[rid]||0)+1;
    toast(`${MATERIALS[rid].icon} Isang <b>Baybayin rune</b> ang nahulog!`,'loot');
  }
  for(const [id,q] of Object.entries(gains)) spawnMatDrop(en.x+rnd(-1,1),en.z+rnd(-1,1),id,q);
  spawnGoldDrop(en.x+rnd(-1,1),en.z+rnd(-1,1),rand(def.gold[0],def.gold[1]));
  const tierBonus = def.tier==='Boss'?2.5 : def.tier==='Elite'?1.2 : def.tier==='Uncommon'?0.5 : 0;
  if(Math.random()<def.gearChance) spawnGearDrop(en.x,en.z,makeItem(S.level,tierBonus));

  /* enemy XP scales with player level so the climb to 70 stays possible:
     +9% per level — keeps kill-count/hour roughly meaningful at every level */
  const xpAmt=Math.round(def.xp*Math.pow(1.09,S.level-1)*(1+P.xpGain/100)*(1+(window._partyXpBonus?window._partyXpBonus():0)));
  gainXP(xpAmt);
  if(window._chatSys) window._chatSys(`⭐ +${fmt(xpAmt)} XP — ${def.name}`,'xp');
  addLabel('+'+xpAmt+' XP','xpc',en.x,groundY(en.x,en.z)+def.scale*2.6,en.z,1);
  S.hp=Math.min(P.maxHp,S.hp+Math.round(P.maxHp*0.04));
  renderBestiaryIfOpen(); updateHUD(); save();
}
function killEnemy(en){
  const def=ENEMY_DEFS[en.key];
  if(def.boss){
    bossNextAt=nowS()+300;                          // she returns in 5 minutes
    toast('💀 BUMAGSAK ANG MANANANGGAL! Tahimik muli ang bulkan... pansamantala.','levelup');
    screenShake(0.5,0.9);
  }
  let reward=true;
  if(window._netOnKill) reward=window._netOnKill(en);   // broadcasts kill; false if host didn't contribute
  if(reward) killReward(en);
  else if(window._partyXpShare) window._partyXpShare(en);   // 🤝 party XP share
  removeEnemy(en);
  if(!(window._netIsGuest&&window._netIsGuest())) setTimeout(()=>spawnEnemy(),rnd(2000,5000));
}

function hurtPlayer(dmg, opts={}){
  const t=nowS();
  if(player.dead) return;
  if(inTown(player.x,player.z)){ return; } // 🛡️ sanctuary: no harm within the walls
  const py=groundY(player.x,player.z);
  if(t<player.iframesUntil){ addLabel('DODGED','blk',player.x,py+3,player.z,0.6); return; }
  if(t<player.shieldUntil){ addLabel('BLOCKED','blk',player.x,py+3,player.z,0.7); return; }
  let def=P.def*(t<player.tauntDefUntil?1.5:1);
  dmg=Math.max(1,Math.round(dmg-def/3));
  if(t<player.ironUntil) dmg=Math.max(1,Math.round(dmg*0.3));
  if(player.wardHp>0){
    const absorbed=Math.min(player.wardHp,dmg);
    player.wardHp-=absorbed; dmg-=absorbed;
    addLabel('🌊-'+absorbed,'blk',player.x,py+3.4,player.z,0.6);
    if(dmg<=0) return;
  }
  S.hp-=dmg; player.hurtFlash=0.3;
  if(opts.burn){ player.burnUntil=t+3; }
  if(opts.bleed){ player.bleedUntil=t+4; }
  addLabel('-'+dmg,'hurt',player.x+rnd(-0.5,0.5),py+3,player.z,0.8);
  if(S.hp<=0){
    S.hp=0; player.dead=true; player.deadT=2.2;
    // spec impact: the staff flies out of his hand and clatters to the ground
    if(S.cls==='alim') fxDropStaff(player.x,player.z);
    // spirit dissipation: body dissolves into glowing Anito dust
    fxRing(player.x,player.z,0xb47aff,0.4,4.5,0.8);
    fxRing(player.x,player.z,0x6ac8ff,0.2,2.8,1.1);
    const GL=['ᜀ','ᜊ','ᜃ','ᜇ'];
    for(let gi=0;gi<8;gi++){
      const ga=gi/8*Math.PI*2, gr=rnd(0.4,1.6);
      addLabel(gi<4?GL[gi]:'✦','xp',
        player.x+Math.sin(ga)*gr, py+rnd(0.8,3.2), player.z+Math.cos(ga)*gr, rnd(1.0,1.6));
    }
    toast('💫 Your form dissolves into anito dust… the spirits carry you back.','warn');
  }
  updateHUD();
}

/* ---------------- FORAGING ---------------- */
function harvestNode(n){
  n.ready=false; n.mesh.visible=false;
  n.respawnAt=nowS() + 18/(S.forageSpeedMult*(1+P.forageSpd/100));
  const q=dropScale(rand(n.kind.qty[0],n.kind.qty[1]));
  spawnMatDrop(n.x,n.z,n.kind.id,q);
  if(Math.random()<0.06) spawnMatDrop(n.x,n.z,'diwata_dew',rand(1,2));
  gainXP(12);
  fxRing(n.x,n.z,0xffffff,0.3,1.6,0.25);
}
let autoTimerAcc=0;
function setAutoForage(on){
  S.autoForage=on;
  $('btn-autoforage').classList.toggle('on',on);
  toast(on?'🤖 Auto-Forage engaged.':'🤖 Auto-Forage off.');
}

/* ---------------- XP ---------------- */
function gainXP(amount){
  if(S.level>=LEVEL_CAP){ updateHUD(); return; }
  S.xp+=amount;
  while(S.level<LEVEL_CAP && S.xp>=XP_FOR(S.level)){
    S.xp-=XP_FOR(S.level); S.level++;
    computeStats(); S.hp=P.maxHp;
    const u=UNLOCKS[S.level];
    toast(`⭐ LEVEL UP! Level ${S.level}`+(u?` — <b>${u}</b>!`:''),'levelup');
    if(window._chatSys) window._chatSys(`🎉 LEVEL UP! Umabot ka sa Level ${S.level}!`,'xp');
    fxRing(player.x,player.z,0xf2b134,0.5,7,1);
    if(S.level===2) $('badge-forge').classList.remove('hidden');
    if(S.level===5) $('btn-autoforage').classList.remove('hidden');
    renderForge();
  }
  updateHUD();
}

/* ---------------- HUD ---------------- */
function updateHUD(){
  $('hud-level').textContent='Lv '+S.level;
  $('hud-gold').textContent='🪙 '+fmt(S.gold);
  const need=S.level>=LEVEL_CAP?1:XP_FOR(S.level);
  $('xp-fill').style.width=(S.level>=LEVEL_CAP?100:Math.min(100,S.xp/need*100))+'%';
  $('xp-text').textContent=S.level>=LEVEL_CAP?'MAX':`${fmt(S.xp)} / ${fmt(need)}`;
  $('hp-fill').style.width=(clamp(S.hp/P.maxHp,0,1)*100)+'%';
  $('hp-text').textContent=`${Math.max(0,Math.ceil(S.hp))} / ${P.maxHp}`;
}

/* ================================================================
   MINIMAP
   ================================================================ */
const mmCanvas=$('minimap'), mmCtx=mmCanvas.getContext('2d');
const mmBase=document.createElement('canvas');
mmBase.width=150; mmBase.height=120;
(function renderMMBase(){
  const g=mmBase.getContext('2d');
  // mainland only (exclude Isla ng Bathala) so the minimap matches the playable region
  const sx=150/MAIN_W, sy=120/MAP_H;
  const zoneCols=ZCOL.map(p=>['#'+p[0].toString(16).padStart(6,'0'),'#'+p[1].toString(16).padStart(6,'0')]);
  for(let y=0;y<MAP_H;y++)for(let x=0;x<MAIN_W;x++){
    const t=grid[y*MAP_W+x];
    const zc=zoneCols[zoneGrid[y*MAP_W+x]];
    const zn2=zoneGrid[y*MAP_W+x];
    g.fillStyle = t===2?(zn2===7?'#ff5a14':((y>=SEA_Y-2||(zn2===9&&!inIsle(x,y)))?'#1c5a94':isRiver(x,y)?'#2e6db4':'#3f6f9e')) : t===3?'#8a6b42' : t===4?'#241a34' : zc[(x+y)%2];
    g.fillRect(x*sx,y*sy,sx+0.5,sy+0.5);
    if(t!==2&&t!==3){ // hillshade: peaks glow, valleys sink — topography reads at a glance
      const hgt=tileBaseH(x,y), sh=clamp(hgt/16,-0.6,0.7);
      if(sh>0.04){ g.fillStyle='rgba(255,255,255,'+(sh*0.55)+')'; g.fillRect(x*sx,y*sy,sx+0.5,sy+0.5); }
      else if(sh<-0.04){ g.fillStyle='rgba(4,8,30,'+(-sh*0.5)+')'; g.fillRect(x*sx,y*sy,sx+0.5,sy+0.5); }
    }
  }
  // town walls
  g.strokeStyle='#d8c8a0'; g.lineWidth=1.5;
  g.strokeRect(58*sx,37*sy,(75-58)*sx,(50-37)*sy);
  // tent marker zone
  g.fillStyle='#f2b134';
  g.beginPath(); g.arc(66.5*sx,41.6*sy,3,0,6.28); g.fill();
})();
function drawMinimap(){
  mmCtx.clearRect(0,0,150,120);
  mmCtx.drawImage(mmBase,0,0);
  const sx=150/(MAIN_W*TILE), sy=120/WORLD_H;
  // enemies
  for(const en of enemies){
    if(en.stealth>0.5) continue;
    const def=ENEMY_DEFS[en.key];
    mmCtx.fillStyle=def.tier==='Elite'?'#c08aff':'#ff6a5e';
    mmCtx.fillRect(en.x*sx-1.5,en.z*sy-1.5,3,3);
  }
  // gear drops
  for(const d of gearDrops){
    mmCtx.fillStyle='#ffd94a';
    mmCtx.fillRect(d.x*sx-1.5,d.z*sy-1.5,3,3);
  }
  // ka-party teammates
  if(window._kaParty) for(const r of window._kaParty.values()){
    mmCtx.fillStyle='#7dffb0';
    mmCtx.beginPath(); mmCtx.arc(r.x*sx, r.z*sy, 2.4, 0, 6.28); mmCtx.fill();
  }
  // player (with facing wedge)
  mmCtx.save();
  mmCtx.translate(player.x*sx, player.z*sy);
  mmCtx.rotate(Math.PI - player.yaw);
  mmCtx.fillStyle='#7df0ff';
  mmCtx.beginPath();
  mmCtx.moveTo(0,-4); mmCtx.lineTo(3,3); mmCtx.lineTo(-3,3); mmCtx.closePath();
  mmCtx.fill();
  mmCtx.restore();
  // camera cone hint
  mmCtx.strokeStyle='rgba(255,255,255,.35)';
  mmCtx.lineWidth=1;
  mmCtx.beginPath();
  mmCtx.moveTo(player.x*sx,player.z*sy);
  mmCtx.lineTo(player.x*sx-Math.sin(camYaw)*10, player.z*sy-Math.cos(camYaw)*10);
  mmCtx.stroke();
}

/* ================================================================
   MAIN LOOP
   ================================================================ */
let started=false;
let last=performance.now();
let tentLabel=null;

/* zone banner — announces the biome you walk into */
let curZone=-1;
function checkZone(){
  const tx=clamp(Math.floor(player.x/TILE),0,MAP_W-1), ty=clamp(Math.floor(player.z/TILE),0,MAP_H-1);
  const zn=zoneGrid[ty*MAP_W+tx];
  if(zn!==curZone){
    if(curZone>=0) toast(ZONE_NAMES[zn]+' — '+ZONE_FLAVORS[zn],'warn');
    curZone=zn;
    $('mm-title').textContent=ZONE_NAMES[zn].replace(/^\S+ /,'');
  }
}
let mmFrame=0;
function animate(now){
  requestAnimationFrame(animate);
  let dt=Math.min(0.05,(now-last)/1000); last=now;
  const t=now/1000;
  // hit-stop: brief time freeze on big impacts
  if(hitStop>0){ hitStop-=dt; dt*=0.12; }
  if(started) update(dt,t);
  updateChunkVisibility();  // chunk streaming: only render chunks near the player
  // water shimmer
  for(const wm of waterMats) wm.uniforms.uTime.value=t;              // shader waves+ripples
  for(let i=0;i<lavaMats.length;i++) lavaMats[i].emissiveIntensity=1.35+0.55*Math.sin(t*1.7+i*2.1); // lava breathing
  for(const ff of fireflies){ const f=ff.userData.fly; ff.position.set(f.x+Math.sin(t*0.7+f.ph)*1.6, f.y+Math.sin(t*1.3+f.ph*2)*0.5, f.z+Math.cos(t*0.5+f.ph)*1.6); const mm2=ff.material; mm2.opacity=0.4+0.5*(0.5+0.5*Math.sin(t*2.2+f.ph*3)); }
  for(const v of vents){ const vd=v.userData.vent; const ph=(t*0.4+vd.ph)%1; v.position.y=vd.baseY+ph*2.6; const sc2=0.6+ph*1.6; v.scale.setScalar(sc2); v.material.opacity=0.4*(1-ph); }
  for(const w of waterMeshes){ w.position.y=w.userData.baseY+Math.sin(t*1.5+w.position.x*0.3)*0.03; } // bridge foam bob
  // clouds drift
  for(const c of clouds){
    c.position.x+=c.userData.speed*dt;
    if(c.position.x>WORLD_W+160) c.position.x=-140;
  }
  // lantern flicker
  for(let i=0;i<lanternMats.length;i++){
    lanternMats[i].emissiveIntensity=0.75+0.3*Math.sin(t*7+i*1.7)+0.12*Math.sin(t*23+i*3.1);
  }
  // wind sway: canopies + palm crowns rock gently, gusts roll through
  const gust=1+0.5*Math.sin(t*0.23);
  for(const w of windCanopies){
    w.obj.rotation.x=Math.sin(t*1.15+w.phase)*w.amp*gust;
    w.obj.rotation.z=Math.cos(t*0.9+w.phase*1.7)*w.amp*0.8*gust;
  }
  // NPC idle bob + face the player when near
  for(let i=0;i<NPCS.length;i++){
    const n=NPCS[i];
    n.mesh.position.y=n.mesh.userData.baseY+Math.sin(t*1.6+i*2.1)*0.04;
    if(d2(n.x,n.z,player.x,player.z)<10*10)
      n.mesh.rotation.y=Math.atan2(player.x-n.x,player.z-n.z);
  }
  // sun shadow frustum follows player
  sun.position.set(player.x+50, 80, player.z+20);
  sun.target.position.set(player.x, 0, player.z);
  sun.target.updateMatrixWorld();
  // camera (smooth ground-height follow)
  const py=groundY(player.x,player.z);
  camFollowY += (py-camFollowY)*Math.min(1,dt*6);
  const tx=player.x, ty=camFollowY+2, tz=player.z;
  camera.position.set(
    tx+camDist*Math.cos(camPitch)*Math.sin(camYaw),
    ty+camDist*Math.sin(camPitch),
    tz+camDist*Math.cos(camPitch)*Math.cos(camYaw));
  camera.lookAt(tx,ty,tz);
  // screen shake (decaying random offset)
  if(shakeDur>0){
    shakeT+=dt; 
    if(shakeT<shakeDur){
      const f=1-shakeT/shakeDur;
      camera.position.x+=rnd(-1,1)*shakeAmp*f;
      camera.position.y+=rnd(-1,1)*shakeAmp*f*0.6;
      camera.position.z+=rnd(-1,1)*shakeAmp*f;
    } else { shakeDur=0; shakeAmp=0; }
  }
  if(window._sky) window._sky.position.copy(camera.position); // keep the dome centered on the camera (no black void at altitude)
  renderer.render(scene,camera);   // skip the post-processing composer everywhere (bloom framebuffers = big cost)
  updateLabels(dt);
  if(started && (mmFrame++%10===0)){ drawMinimap(); checkZone(); }
}

function update(dt, t){
  const tS=nowS();
  /* --- player movement --- */
  const mv=moveInput();
  player.moving=mv.mag>0.1&&!player.dead;
  if(tS<player.dodgeUntil){
    const sp=40;
    const nx=player.x+Math.sin(player.dodgeAng)*sp*dt, nz=player.z+Math.cos(player.dodgeAng)*sp*dt;
    if(walkable(nx,player.z,player.r)) player.x=nx;
    if(walkable(player.x,nz,player.r)) player.z=nz;
  } else if(player.moving){
    const shadowFast=(player.shadowUntil||0)>nowS()?1.35:1;   // 💨 Ulap ng Anino
    const sp=P.spd*shadowFast*(joy.active?Math.max(0.4,mv.mag):1);
    const nx=player.x+mv.x*sp*dt, nz=player.z+mv.z*sp*dt;
    if(walkable(nx,player.z,player.r)) player.x=nx;
    if(walkable(player.x,nz,player.r)) player.z=nz;
    player.yaw=Math.atan2(mv.x,mv.z);
    player.bob+=dt*10;
  }
  player.x=clamp(player.x,2.5*TILE,WORLD_W-2.5*TILE);
  player.z=clamp(player.z,2.5*TILE,WORLD_H-2.5*TILE);
  if(player.atkCd>0)player.atkCd-=dt;
  if(player.atkAnim>0)player.atkAnim-=dt;
  if(player.hurtFlash>0)player.hurtFlash-=dt;
  $('hurt-vignette').style.opacity=player.hurtFlash>0?Math.min(1,player.hurtFlash*3):0;
  if(player.dead){
    player.deadT-=dt;
    $('death-overlay').style.opacity=1;
    if(player.deadT<=0){
      player.dead=false; S.hp=Math.round(P.maxHp*0.5);
      player.x=266; player.z=180; updateHUD();
    }
  } else $('death-overlay').style.opacity=0;

  if(tS<player.burnUntil && Math.random()<dt*2){ S.hp=Math.max(1,S.hp-Math.round(P.maxHp*0.015)); addLabel('🔥','hurt',player.x,groundY(player.x,player.z)+2.6,player.z,0.5); updateHUD(); }
  if(tS<player.bleedUntil && Math.random()<dt*2){ S.hp=Math.max(1,S.hp-Math.round(P.maxHp*0.012)); addLabel('🩸','hurt',player.x,groundY(player.x,player.z)+2.6,player.z,0.5); updateHUD(); }
  const townSafe=inTown(player.x,player.z);
  if(!player.dead && S.hp<P.maxHp){
    // 🛡️ inside the Grand Tiangge walls: rapid sanctuary healing (~12%/s) + cleanse DoTs
    const regen=townSafe ? P.maxHp*0.12 : 1.4;
    S.hp=Math.min(P.maxHp,S.hp+dt*regen);
    if(townSafe){ player.burnUntil=0; player.bleedUntil=0; }
    if(townSafe&&Math.random()<dt*2) addLabel('✚','xpc',player.x+rnd(-0.6,0.6),groundY(player.x,player.z)+2.8,player.z,0.7);
    if(Math.random()<0.05)updateHUD();
  }

  /* --- player mesh anim --- */
  const H=player.mesh;
  if(H){
    const py=groundY(player.x,player.z);
    H.position.set(player.x,py,player.z);
    let targetYaw=player.yaw;
    let dy=targetYaw-H.rotation.y;
    while(dy>Math.PI)dy-=2*Math.PI; while(dy<-Math.PI)dy+=2*Math.PI;
    H.rotation.y+=dy*Math.min(1,dt*14);
    const u=H.userData;
    if(player.moving){
      const sw=Math.sin(player.bob)*0.55;
      u.legL.rotation.x=sw; u.legR.rotation.x=-sw;
      u.armL.rotation.x=-sw*0.7;
      if(player.atkAnim<=0) u.armR.rotation.x=sw*0.7;
    } else {
      u.legL.rotation.x*=0.8; u.legR.rotation.x*=0.8;
      u.armL.rotation.x*=0.8;
      if(player.atkAnim<=0) u.armR.rotation.x*=0.8;
    }
    if(player.atkAnim>0){
      const p=player.atkAnim/player.atkAnimDur; // 1 → 0
      if(u.alim){
        // magical staff strike: wind-up over shoulder, then arc swing down
        const ph=1-p; // 0 → 1
        if(ph<0.35){ u.armR.rotation.x=1.1*(ph/0.35); }             // staff pulled back
        else { const sw=(ph-0.35)/0.65; u.armR.rotation.x=1.1-3.3*Math.sin(sw*Math.PI*0.5); } // thrust down
      } else {
        u.armR.rotation.x=-2.2*Math.sin(p*Math.PI);
      }
    }
    if(player.castSlam>0){
      player.castSlam-=dt;
      // slam the staff butt into the ground: arm drives down, body dips
      const cp=1-Math.max(0,player.castSlam)/0.4; // 0 → 1
      u.armR.rotation.x=cp<0.4 ? 0.9*(cp/0.4) : 0.9-1.6*((cp-0.4)/0.6);
      if(u.alim) u.alim.upper.rotation.x=0.16+0.25*Math.sin(cp*Math.PI);
    }
    /* Elder Alim secondary animation (per animation spec) */
    if(u.alim){
      const A=u.alim;
      if(player.moving&&player.castSlam<=0){
        // run: lean forward, pronounced hunch, shuffling steps
        A.upper.rotation.x=0.16+0.22+Math.sin(player.bob*2)*0.03;
        u.legL.rotation.x*=0.6; u.legR.rotation.x*=0.6;         // low shuffling feet
        A.beard.rotation.x=0.28+Math.sin(player.bob-1.2)*0.1;   // beard streams back, delayed
        A.robeBack.rotation.x=-0.55+Math.sin(player.bob-0.9)*0.12; // robes flap behind
        A.robeF.rotation.x=0.3+Math.sin(player.bob-0.9)*0.08;
        A.bun.position.y=A.bunY+Math.abs(Math.sin(player.bob))*0.05; // topknot bobs per step
      } else if(player.castSlam<=0){
        // idle: slow breathing, weight shift, gentle beard sway
        const br=Math.sin(t*1.8);
        A.upper.rotation.x=0.16+br*0.015;
        A.upper.position.y=1.28+br*0.012;
        A.upper.rotation.z=Math.sin(t*0.9)*0.02;                // weight shift L↔R
        A.beard.rotation.x=br*0.04;
        A.robeBack.rotation.x*=0.9; A.robeF.rotation.x*=0.9;
        A.bun.position.y=A.bunY;
      }
      // staff orb pulse + rune glow (synced emissive animation)
      const pulse=0.75+0.35*Math.sin(t*2.4);
      A.orbMat.emissiveIntensity=pulse+(player.atkAnim>0?0.8:0);
      A.orbGlow.material.opacity=0.14+0.1*Math.sin(t*2.4);
      A.orbGlow.scale.setScalar(1+0.08*Math.sin(t*2.4));
      for(let ri=0;ri<A.runeMats.length;ri++)
        A.runeMats[ri].emissiveIntensity=0.6+0.35*Math.sin(t*2.4+ri*0.9);
      // tassel physics-ish sway (delayed follow)
      for(let ti=0;ti<A.tassels.length;ti++){
        const sway=player.moving?Math.sin(player.bob-1.4)*0.5:Math.sin(t*1.6+ti*1.3)*0.12;
        A.tassels[ti].rotation.x=sway; A.tassels[ti].rotation.z=Math.sin(t*2.1+ti)*0.08;
      }
      // faint Anito dust motes from the orb while idle
      if(!player.moving&&Math.random()<dt*0.7){
        addLabel('✦','xp',player.x+rnd(-0.4,0.4),groundY(player.x,player.z)+3.4,player.z,0.9);
      }
    }
    H.visible=!player.dead||player.deadT>0.15;
    if(player.dead){
      // spec death: knocked backward off his feet, then dissolves
      const dp=Math.min(1,(2.2-player.deadT)/0.5); // 0 → 1 over fall
      H.rotation.x=-dp*(Math.PI/2)*0.92;
      H.scale.setScalar(Math.max(0.01,1-Math.max(0,(2.2-player.deadT-0.8))/1.0)); // dissolve shrink
      // rising anito dust during dissipation
      if(player.deadT<1.4&&Math.random()<dt*8)
        addLabel('✦','xp',player.x+rnd(-0.8,0.8),groundY(player.x,player.z)+rnd(0.3,1.2),player.z+rnd(-0.8,0.8),rnd(0.8,1.3));
    } else if(tS<player.dodgeUntil){ H.rotation.x=Math.sin((player.dodgeUntil-tS)/0.32*Math.PI)*0.4; H.scale.setScalar(1); }
    else { H.rotation.x=0; H.scale.setScalar(1); }
    // shield bubble
    player.shieldMesh.visible=(tS<player.shieldUntil)||player.wardHp>0;
    if(player.shieldMesh.visible){
      player.shieldMesh.material.color.setHex(player.wardHp>0?0x50a0ff:0x39c2b4);
      player.shieldMesh.material.opacity=0.18+0.08*Math.sin(t*6);
      player.shieldMesh.position.set(player.x,py+1.5,player.z);
      player.shieldMesh.scale.setScalar(1+0.05*Math.sin(t*5));
    }
  }

  /* --- enemies --- */
  let _bs=null;
  for(const en of [...enemies]){
    const def=ENEMY_DEFS[en.key];
    if(en.flash>0)en.flash-=dt;
    en.cd-=dt; en.animT+=dt;
    /* 👻 ghost enemy (guest side): host drives it — just interpolate */
    if(en.remote){
      const k=Math.min(1,dt*10);
      en.x+=(en.tx-en.x)*k; en.z+=(en.tz-en.z)*k;
      if(en.tyaw!=null){ let dy2=en.tyaw-en.mesh.rotation.y;
        while(dy2>Math.PI)dy2-=2*Math.PI; while(dy2<-Math.PI)dy2+=2*Math.PI;
        en.mesh.rotation.y+=dy2*Math.min(1,dt*10); }
    } else {
    const stunned=tS<en.stunUntil;
    const rooted=tS<en.rootUntil;
    const tgt=nearestTarget(en);
    const dp=tgt.d;
    if(!stunned){
      if(tgt.dead){ en.state='idle'; }
      else if(inTown(tgt.x,tgt.z)){ en.state='idle'; }   // 🛡️ safe zone: no aggro into town
      else if(dp<def.aggro*((P&&P.aggroMul)||1)) en.state='chase';
      else if(en.state==='chase'&&dp>def.aggro*1.9) en.state='idle';

      for(const z of zones){
        if(z.owner!=='player') continue;
        if(d2(z.x,z.z,en.x,en.z)<z.r*z.r){
          if(z.type==='snare') en.rootUntil=Math.max(en.rootUntil,tS+0.3);
          if(z.type==='pfire' && Math.random()<dt*3) hitEnemy(en,0.6);
        }
      }
      if(!enemies.includes(en)) continue;

      if(def.ai==='charger' && en.chargeT>0){
        en.chargeT-=dt;
        const sp=def.speed*3.4*_skEnSpd(en);
        const nx=en.x+Math.sin(en.chargeAng)*sp*dt, nz=en.z+Math.cos(en.chargeAng)*sp*dt;
        if(walkable(nx,en.z,def.r))en.x=nx; else en.chargeT=0;
        if(walkable(en.x,nz,def.r))en.z=nz; else en.chargeT=0;
        if(dp<3.2){ dealTo(tgt,rand(def.dmg[0],def.dmg[1])*1.5,{_srcEn:en}); en.chargeT=0; en.cd=def.atkCd; }
      } else if(en.windup>0){
        en.windup-=dt;
        if(en.windup<=0 && !tgt.dead){
          if(def.ai==='charger' && dp>5.5){
            en.chargeAng=Math.atan2(tgt.x-en.x,tgt.z-en.z);
            en.chargeT=0.7; en.cd=def.atkCd;
          } else if(def.ai==='ranged'){
            const a=Math.atan2(tgt.x-en.x,tgt.z-en.z);
            const m=new THREE.Mesh(new THREE.SphereGeometry(0.3,6,6), M(def.leavesFire?0xff8a3a:0xb8a888,{emissive:def.leavesFire?0xff5a10:0x8a7a5a,emissiveIntensity:1}));
            const yy=groundY(en.x,en.z)+def.scale*1.4;
            m.position.set(en.x,yy,en.z); scene.add(m);
            eprojs.push({x:en.x,z:en.z,y:yy,vx:Math.sin(a)*17,vz:Math.cos(a)*17,life:1.6,
              fire:def.leavesFire, dmg:rand(def.dmg[0],def.dmg[1]), mesh:m});
          } else if(dp<def.atkRange+2){
            dealTo(tgt,rand(def.dmg[0],def.dmg[1]), {bleed:def.bleeds,_srcEn:en});
            if(def.ai==='stealth'){ en.retreatT=1.2; }
          }
        }
      } else if(en.state==='chase' && !rooted){
        const face=(a)=>{ en.mesh.rotation.y=a; };
        if(def.ai==='flyer'){
          /* 🦇 MANANANGGAL: circles high, swoops in to rake, screeches fire */
          en.swoopT=(en.swoopT||0)-dt;
          if(en.swoopT>0){                                   // diving rake
            const a=Math.atan2(tgt.x-en.x,tgt.z-en.z);
            en.x+=Math.sin(a)*def.speed*2.6*_skEnSpd(en)*dt; en.z+=Math.cos(a)*def.speed*2.6*_skEnSpd(en)*dt;
            face(a);
            if(dp<def.atkRange){ dealTo(tgt,rand(def.dmg[0],def.dmg[1]),{bleed:true,_srcEn:en}); en.swoopT=0; en.cd=def.atkCd; screenShake(0.2,0.2); }
          } else {
            const orbA=Math.atan2(en.x-tgt.x,en.z-tgt.z)+dt*0.55;   // circle the prey
            const orbR=13;
            const ox=tgt.x+Math.sin(orbA)*orbR, oz=tgt.z+Math.cos(orbA)*orbR;
            const a=Math.atan2(ox-en.x,oz-en.z);
            en.x+=Math.sin(a)*def.speed*_skEnSpd(en)*dt; en.z+=Math.cos(a)*def.speed*_skEnSpd(en)*dt;
            face(Math.atan2(tgt.x-en.x,tgt.z-en.z));
            if(en.cd<=0){
              if(Math.random()<0.55){ en.swoopT=1.1; en.cd=def.atkCd; addLabel('🦇','warn',en.x,groundY(en.x,en.z)+5,en.z,0.5); }
              else {                                        // wing-gust fireball screech
                en.cd=def.atkCd*1.3;
                const a2=Math.atan2(tgt.x-en.x,tgt.z-en.z);
                const m=new THREE.Mesh(new THREE.SphereGeometry(0.34,6,6), M(0xff8a3a,{emissive:0xff4a10,emissiveIntensity:1.4}));
                const yy=groundY(en.x,en.z)+3.4;
                m.position.set(en.x,yy,en.z); scene.add(m);
                eprojs.push({x:en.x,z:en.z,y:yy,vx:Math.sin(a2)*20,vz:Math.cos(a2)*20,life:1.8,fire:true,dmg:rand(def.dmg[0],def.dmg[1]),mesh:m});
              }
            }
          }
        } else if(def.ai==='stealth'){
          if(en.retreatT>0){
            en.retreatT-=dt;
            const a=Math.atan2(en.x-tgt.x,en.z-tgt.z);
            const nx=en.x+Math.sin(a)*def.speed*_skEnSpd(en)*dt, nz=en.z+Math.cos(a)*def.speed*_skEnSpd(en)*dt;
            if(walkable(nx,en.z,def.r))en.x=nx;
            if(walkable(en.x,nz,def.r))en.z=nz;
            en.stealth=Math.min(1,en.stealth+dt*2);
          } else {
            en.stealth=dp>9?Math.min(1,en.stealth+dt*1.5):Math.max(0,en.stealth-dt*4);
            if(dp>def.atkRange){
              const a=Math.atan2(tgt.x-en.x,tgt.z-en.z);
              const sp=def.speed*(en.stealth>0.5?1.3:1)*_skEnSpd(en);
              const nx=en.x+Math.sin(a)*sp*dt, nz=en.z+Math.cos(a)*sp*dt;
              if(walkable(nx,en.z,def.r))en.x=nx;
              if(walkable(en.x,nz,def.r))en.z=nz;
              face(a);
            } else if(en.cd<=0){ en.windup=0.3; en.cd=def.atkCd; addLabel('❗','warn',en.x,groundY(en.x,en.z)+def.scale*2.6,en.z,0.3); }
          }
        } else if(def.ai==='ranged'){
          const ideal=def.atkRange*0.75;
          if(dp>def.atkRange){
            const a=Math.atan2(tgt.x-en.x,tgt.z-en.z);
            const nx=en.x+Math.sin(a)*def.speed*_skEnSpd(en)*dt, nz=en.z+Math.cos(a)*def.speed*_skEnSpd(en)*dt;
            if(walkable(nx,en.z,def.r))en.x=nx;
            if(walkable(en.x,nz,def.r))en.z=nz;
            face(a);
          } else if(dp<ideal*0.5 && def.speed>3){
            const a=Math.atan2(en.x-tgt.x,en.z-tgt.z);
            const nx=en.x+Math.sin(a)*def.speed*_skEnSpd(en)*dt, nz=en.z+Math.cos(a)*def.speed*_skEnSpd(en)*dt;
            if(walkable(nx,en.z,def.r))en.x=nx;
            if(walkable(en.x,nz,def.r))en.z=nz;
          } else if(en.cd<=0){
            en.windup=0.4; en.cd=def.atkCd;
            addLabel('❗','warn',en.x,groundY(en.x,en.z)+def.scale*2.6,en.z,0.4);
            face(Math.atan2(tgt.x-en.x,tgt.z-en.z));
          }
        } else {
          if(dp>def.atkRange){
            const a=Math.atan2(tgt.x-en.x,tgt.z-en.z);
            const nx=en.x+Math.sin(a)*def.speed*_skEnSpd(en)*dt, nz=en.z+Math.cos(a)*def.speed*_skEnSpd(en)*dt;
            if(walkable(nx,en.z,def.r))en.x=nx;
            if(walkable(en.x,nz,def.r))en.z=nz;
            face(a);
          } else if(en.cd<=0){
            en.windup=def.ai==='charger'?0.5:0.35; en.cd=def.atkCd;
            addLabel('❗','warn',en.x,groundY(en.x,en.z)+def.scale*2.6,en.z,en.windup);
            face(Math.atan2(tgt.x-en.x,tgt.z-en.z));
          }
          if(def.ai==='charger' && en.cd<=0 && dp>7 && dp<25 && Math.random()<dt*0.5){
            en.windup=0.5; en.cd=def.atkCd*1.6;
            addLabel('❗','warn',en.x,groundY(en.x,en.z)+def.scale*2.6,en.z,0.5);
          }
        }
      } else if(!rooted){
        en.wt-=dt;
        if(en.wt<=0){ en.wt=rnd(1.5,4);
          if(en.homeX!=null&&d2(en.x,en.z,en.homeX,en.homeZ)>CAMP_R*CAMP_R){
            const ha=Math.atan2(en.homeX-en.x,en.homeZ-en.z);          // strayed: walk home
            en.wx=en.x+Math.sin(ha)*9; en.wz=en.z+Math.cos(ha)*9;
          } else { const a=rnd(0,6.28); en.wx=en.x+Math.sin(a)*7; en.wz=en.z+Math.cos(a)*7; }
        }
        const dw=Math.hypot(en.wx-en.x,en.wz-en.z);
        if(dw>0.6){
          const a=Math.atan2(en.wx-en.x,en.wz-en.z);
          const nx=en.x+Math.sin(a)*def.speed*0.35*dt, nz=en.z+Math.cos(a)*def.speed*0.35*dt;
          if(walkable(nx,en.z,def.r))en.x=nx; else en.wt=0;
          if(walkable(en.x,nz,def.r))en.z=nz; else en.wt=0;
          en.mesh.rotation.y=a;
        }
        if(def.ai==='stealth') en.stealth=Math.max(0,en.stealth-dt);
      }
    }
    } /* end local-AI else */
    /* enemy mesh sync + anim */
    const em=en.mesh, ea=em.userData.anim||{};
    const gy=groundY(en.x,en.z);
    const hoverY=ea.flyer ? (en.swoopT>0?0.9:2.6)+Math.sin(t*2.2+en.animT)*0.35
                : ea.hover ? 0.4+Math.sin(t*3+en.animT)*0.25 : 0;
    em.position.set(en.x, gy+hoverY, en.z);
    if(ea.wingL){ const flap=Math.sin(en.animT*(en.swoopT>0?16:7))*0.55;
      ea.wingL.rotation.z=flap; ea.wingR.rotation.z=-flap;
      if(ea.guts) for(let gi=0;gi<ea.guts.length;gi++) ea.guts[gi].rotation.z=Math.sin(t*3+gi*1.7)*0.3;
      if(ea.armL){ea.armL.rotation.x=-0.9+Math.sin(t*4)*0.15; ea.armR.rotation.x=-0.9-Math.sin(t*4)*0.15;} }
    else if(ea.legL){ const sw=Math.sin(en.animT*7)*(en.state==='chase'?0.5:0.2);
      ea.legL.rotation.x=sw; ea.legR.rotation.x=-sw;
      if(ea.armL){ea.armL.rotation.x=-sw*0.6; ea.armR.rotation.x=sw*0.6;} }
    if(ea.core){ ea.core.rotation.y+=dt*2; ea.inner.rotation.x+=dt*3; }
    const windupPulse=en.windup>0?1+Math.sin(t*30)*0.06:1;
    em.scale.setScalar(def.scale*windupPulse*(en.flash>0?1.08:1));
    em.traverse(o=>{
      if(o.isMesh&&o.material&&!o.material._isFx){
        if(en.stealth>0){ o.material.transparent=true; o.material.opacity=Math.max(0.12,1-en.stealth*0.9); }
        else if(o.material.transparent&&o.material.opacity<1){ o.material.opacity=1; o.material.transparent=false; }
      }
    });
    /* hp bar + nameplate (shown while engaged) */
    const engaged = en.hp<en.maxHp || en.state==='chase' || en.windup>0 || en.swoopT>0;
    if(engaged){
      const p=project(en.x, gy+hoverY+def.scale*2.9, en.z);
      if(p&&p.x>-60&&p.x<window.innerWidth+60&&p.y>-30&&p.y<window.innerHeight+30){
        en.bar.style.display='block';
        en.bar.style.left=p.x+'px'; en.bar.style.top=p.y+'px';
        en.bar.firstChild.style.width=Math.max(0,en.hp/en.maxHp*100)+'%';
        if(en.nameEl){ en.nameEl.style.display='block'; en.nameEl.style.left=p.x+'px'; en.nameEl.style.top=(p.y-7)+'px'; }
      } else { en.bar.style.display='none'; if(en.nameEl) en.nameEl.style.display='none'; }
    } else { en.bar.style.display='none'; if(en.nameEl) en.nameEl.style.display='none'; }
    if(def.boss){ _bs=en; }
  }
  /* ---- boss health banner ---- */
  {
    const bb=$('boss-banner');
    if(_bs){
      const dpB=Math.hypot(player.x-_bs.x,player.z-_bs.z);
      const show = _bs.hp<_bs.maxHp || dpB<45;
      bb.style.display=show?'block':'none';
      if(show){
        bb.querySelector('.bb-name').textContent='🦇 MANANANGGAL — Ang Lagim ng Bulkan';
        bb.querySelector('.bb-bar i').style.width=Math.max(0,_bs.hp/_bs.maxHp*100)+'%';
        bb.querySelector('.bb-sub').textContent=fmt(Math.max(0,Math.round(_bs.hp)))+' / '+fmt(_bs.maxHp);
      }
    } else bb.style.display='none';
  }

  /* --- projectiles --- */
  for(let i=pprojs.length-1;i>=0;i--){
    const p=pprojs[i];
    p.x+=p.vx*dt; p.z+=p.vz*dt; p.life-=dt;
    p.mesh.position.set(p.x,p.y,p.z);
    // purple energy trail
    if(p.trail){
      p.trailAcc+=dt;
      if(p.trailAcc>0.03){ p.trailAcc=0; fxPuff(p.x,p.y,p.z,p.trail,0.16,0.28); }
    }
    let dead=p.life<=0 || tileIdx(p.x,p.z)===4;
    for(const en of enemies){
      const def=ENEMY_DEFS[en.key];
      if(d2(en.x,en.z,p.x,p.z)<(def.r+0.8)*(def.r+0.8)){
        const hpBefore=S.hp;
        hitEnemy(en,p.mult,{forceCrit:p.forceCrit,knock:0.5,_proj:p});
        if(p.trail) fxBurst(p.x,p.z,p.color,p.y); // energy burst on impact
        /* 🪡 Kulam: mark the victim — bleed + curse spreads on death */
        if(p.kulam){ en.bleedUntil=nowS()+4; en.kulamUntil=nowS()+8; addLabel('🪡','warn',en.x,groundY(en.x,en.z)+2.6,en.z,0.7); }
        /* 🩸 Sumpa ng Dugo: half the damage flows back as life */
        if(p.sumpa){
          const est=Math.round(P.atk*p.mult*0.5);
          S.hp=Math.min(P.maxHp,S.hp+est);
          addLabel('+'+est,'healTxt',player.x,groundY(player.x,player.z)+3,player.z,0.8);
          fxSpiral(player.x,player.z,0xd83a5e,0.4,1.0,1.6);
          updateHUD();
        }
        // spirit chain: lightning arcs to the nearest other enemy
        if(p.chain){
          let best=null,bd=12*12;
          for(const e2 of enemies){ if(e2===en) continue;
            const dd2=d2(e2.x,e2.z,en.x,en.z); if(dd2<bd){bd=dd2;best=e2;} }
          if(best){
            fxLightning(en.x,groundY(en.x,en.z)+1.5,en.z, best.x,groundY(best.x,best.z)+1.5,best.z, 0x7df0ff,0.25);
            hitEnemy(best,p.mult*0.6,{knock:0.4});
          }
        }
        if(p.pierce>0){ p.pierce--; } else { dead=true; }
        break;
      }
    }
    if(dead){ scene.remove(p.mesh); pprojs.splice(i,1); }
  }
  for(let i=eprojs.length-1;i>=0;i--){
    const p=eprojs[i];
    p.x+=p.vx*dt; p.z+=p.vz*dt; p.life-=dt;
    p.mesh.position.set(p.x,p.y,p.z);
    let dead=p.life<=0;
    if(d2(player.x,player.z,p.x,p.z)<2.2*2.2){
      hurtPlayer(p.dmg,{burn:p.fire});
      dead=true;
    } else if(window._kaParty) for(const [rid,r] of window._kaParty){
      if(d2(r.x,r.z,p.x,p.z)<2.2*2.2){ if(window._netDmg)window._netDmg(rid,p.dmg,{burn:p.fire}); dead=true; break; }
    }
    if(dead){
      if(p.fire) spawnZone(p.x,p.z,4.4,'efire',nowS()+2.5,'enemy');
      scene.remove(p.mesh); eprojs.splice(i,1);
    }
  }

  /* --- zones --- */
  for(let i=zones.length-1;i>=0;i--){
    const z=zones[i];
    if(nowS()>z.until){ scene.remove(z.mesh); zones.splice(i,1); continue; }
    z.ring.scale.setScalar(1+0.06*Math.sin(t*5));
    if(z.owner==='enemy' && z.type==='efire'){
      if(d2(z.x,z.z,player.x,player.z)<z.r*z.r && Math.random()<dt*2.5) hurtPlayer(3,{burn:true});
    }
  }

  /* --- fx meshes --- */
  for(let i=fxMeshes.length-1;i>=0;i--){
    const f=fxMeshes[i];
    f.t+=dt;
    const p=f.t/f.dur;
    if(p>=1){ scene.remove(f.mesh); fxMeshes.splice(i,1); continue; }
    if(f.type==='ring'){
      const r=f.r0+(f.r1-f.r0)*p;
      f.mesh.scale.setScalar(r);
      f.mesh.material.opacity=0.9*(1-p);
    } else if(f.type==='slash'){
      f.mesh.material.opacity=0.95*(1-p);
      f.mesh.rotation.z+=dt*3;
    } else if(f.type==='puff'){
      f.mesh.material.opacity=0.7*(1-p);
      f.mesh.scale.setScalar(1+p*1.6);
      f.mesh.position.y+=dt*1.2;
    } else if(f.type==='pillar'){
      // grow fast, hold, collapse
      const gp=p<0.25?p/0.25:1;
      f.mesh.scale.set(1+p*0.3, gp, 1+p*0.3);
      f.mesh.material.opacity=0.75*(1-Math.max(0,(p-0.55)/0.45));
      f.mesh.rotation.y+=dt*4;
    } else if(f.type==='fadegroup'){
      const o=p<0.6?1:1-(p-0.6)/0.4;
      for(const mt of f.mats) mt.opacity=o;
    } else if(f.type==='fadeline'){
      f.mesh.material.opacity=1-p;
    } else if(f.type==='shockwave'){
      const r=f.r0+(f.r1-f.r0)*(1-Math.pow(1-p,2.2));
      f.mesh.scale.set(r,r,1);
      f.mesh.material.opacity=0.85*(1-p);
    } else if(f.type==='beam'){
      f.mesh.material.opacity=0.8*(1-p);
      f.mesh.scale.x=f.mesh.scale.z=1+p*1.6;
    }
  }

  /* --- nodes --- */
  for(const n of nodes){
    if(!n.ready&&nowS()>=n.respawnAt){ n.ready=true; n.mesh.visible=true; fxRing(n.x,n.z,0xffffff,0.3,1.4,0.25); }
    if(n.ready&&n.ring){ n.ring.material.opacity=0.3+0.2*Math.sin(t*3+n.bob); }
  }
  if(S.autoForage&&S.level>=5&&!player.dead){
    autoTimerAcc+=dt;
    if(autoTimerAcc>=2.2/(S.forageSpeedMult*(1+P.forageSpd/100))){
      autoTimerAcc=0;
      const fsel=SETTINGS.forageTargets&&SETTINGS.forageTargets.length?SETTINGS.forageTargets:['all'];
      const fAll=fsel.includes('all');
      let bestN=null,bd=1e12;
      for(const n of nodes){ if(!n.ready)continue; if(!fAll&&!fsel.includes(n.kind.id))continue; const dd=d2(n.x,n.z,player.x,player.z); if(dd<14*14&&dd<bd){bd=dd;bestN=n;} }
      if(bestN) harvestNode(bestN);
    }
  }

  /* --- drops --- */
  updateDrops(drops, dt, d=>{
    addInv(d.id,d.q);
    if(window._chatSys) window._chatSys(`${MATERIALS[d.id].icon} Nakuha: ${MATERIALS[d.id].name} ×${fmt(d.q)}`,'loot');
    addLabel(`${MATERIALS[d.id].icon}+${fmt(d.q)}`,'pickup',player.x,groundY(player.x,player.z)+2.8,player.z,0.7);
    if(panels.inventory.classList.contains('open'))renderInventory();
    if(panels.tiangge.classList.contains('open'))renderForge();
  });
  updateDrops(goldDrops, dt, d=>{
    S.gold+=d.q;
    if(window._chatSys) window._chatSys(`🪙 +${fmt(d.q)} ginto`,'loot');
    addLabel(`🪙+${d.q}`,'goldTxt',player.x,groundY(player.x,player.z)+2.8,player.z,0.7);
    updateHUD();
  });
  updateDrops(gearDrops, dt, d=>{
    if(S.bag.length>=60){ toast('🎒 Loot bag full! Sell some gear.','warn'); S.bag.shift(); }
    S.bag.push(d.item);
    const rar=RARITIES.find(r=>r.id===d.item.rarity);
    if(window._chatSys) window._chatSys(`${d.item.icon} Na-loot: ${d.item.name} [${rar.name||d.item.rarity}]`,'loot');
    toast(`${d.item.icon} <span style="color:${rar.color}">${d.item.name}</span> looted!`, d.item.rarity==='common'?'':'levelup');
    $('badge-gear').classList.remove('hidden');
    if(panels.gear.classList.contains('open'))renderGear();
  });

  /* contextual interact pill (spec §22 / skill-UI doc 07): NPC > Tiangge > Dungeon gate */
  const npcNear=nearestNPC();
  const nearTent=d2(player.x,player.z,TENT.x,TENT.z)<13*13;
  const nearGate=(typeof DGN_GATE!=='undefined')&&!((typeof DGN!=='undefined')&&DGN.active)&&d2(player.x,player.z,DGN_GATE.x,DGN_GATE.z)<6*6;
  const ib=$('btn-interact');
  ib.classList.toggle('hidden',!(npcNear||nearTent||nearGate));
  if(npcNear){ ib.innerHTML=npcNear.icon+'<span>'+npcNear.name.split(' — ')[1]+'</span>'; }
  else if(nearTent){ ib.innerHTML='🏮<span>Tiangge</span>'; }
  else if(nearGate){ ib.innerHTML='🌀<span>Lagusan</span>'; }

  /* cooldown UI */
  $('attack-cd').style.height=(Math.max(0,player.atkCd)/0.42*100)+'%';
  $('dodge-cd').style.height=(clamp((player.dodgeCd-tS)/2.2,0,1)*100)+'%';
  const C=CLASSES[S.cls];
  for(let i=0;i<3;i++){
    if(window._skEqDef&&window._skEqDef(i)) continue;   // data-skill equipped: skill-system interval owns this overlay
    const el=$('btn-skill'+(i+1));
    if(!C.skills[i]){ continue; }
    const rem=clamp((player.skillCds[i]-tS)/(C.skills[i].cd),0,1);
    el.querySelector('.cd-overlay').style.height=(rem*100)+'%';
    el.classList.toggle('ready',rem<=0);
  }
}
function updateDrops(list, dt, onPickup){
  for(let i=list.length-1;i>=0;i--){
    const d=list[i]; d.t+=dt;
    if(d.t<0.55){
      d.x+=d.vx*dt; d.z+=d.vz*dt; d.y+=d.vy*dt; d.vy-=18*dt;
      if(d.y<0.4){d.y=0.4;d.vy=0;}
    } else {
      const dd=Math.hypot(player.x-d.x,player.z-d.z);
      if(dd<7.5||d.magnet){
        d.magnet=true;
        const a=Math.atan2(player.x-d.x,player.z-d.z);
        d.x+=Math.sin(a)*27*dt; d.z+=Math.cos(a)*27*dt;
        d.y=Math.max(0.5,d.y-8*dt);
        if(dd<1.6){ scene.remove(d.mesh); onPickup(d); list.splice(i,1); continue; }
      }
    }
    d.mesh.position.set(d.x, groundY(d.x,d.z)+d.y, d.z);
    d.mesh.rotation.y+=dt*3;
  }
}

/* label updater */
function updateLabels(dt){
  for(let i=floatLabels.length-1;i>=0;i--){
    const l=floatLabels[i];
    l.t+=dt;
    if(l.t>=l.dur){ l.el.remove(); floatLabels.splice(i,1); continue; }
    const p=project(l.x, l.y + l.t*2.2, l.z);
    if(!p){ l.el.style.display='none'; continue; }
    l.el.style.display='block';
    l.el.style.left=p.x+'px'; l.el.style.top=p.y+'px';
    l.el.style.opacity=1-(l.t/l.dur)*(l.t/l.dur);
  }
  if(tentLabel){
    const p=project(TENT.x, groundY(TENT.x,TENT.z)+6.4, TENT.z);
    if(p&&p.x>-100&&p.x<window.innerWidth+100&&p.y>0&&p.y<window.innerHeight){
      tentLabel.style.display='block';
      tentLabel.style.left=p.x+'px'; tentLabel.style.top=p.y+'px';
    } else tentLabel.style.display='none';
  }
  for(const n of NPCS){
    const p=project(n.x, n.mesh.userData.baseY+2.6, n.z);
    if(p&&p.x>-100&&p.x<window.innerWidth+100&&p.y>0&&p.y<window.innerHeight
       &&d2(n.x,n.z,player.x,player.z)<26*26){
      n.label.style.display='block';
      n.label.style.left=p.x+'px'; n.label.style.top=p.y+'px';
    } else n.label.style.display='none';
  }
}

/* ================================================================
   UI PANELS (unchanged systems)
   ================================================================ */
const panels={gear:$('panel-gear'),tiangge:$('panel-tiangge'),inventory:$('panel-inventory'),bestiary:$('panel-bestiary')};
function openPanel(name){
  closeAllPanels();
  panels[name].classList.add('open');
  if(name==='gear'){ $('badge-gear').classList.add('hidden'); renderGear(); }
  if(name==='tiangge'){ $('badge-forge').classList.add('hidden'); renderForge(); }
  if(name==='inventory'){ renderInventory(); renderAgimats(); }
  if(name==='bestiary') renderBestiary();
}
function closeAllPanels(){ for(const p of Object.values(panels)) p.classList.remove('open'); }
document.querySelectorAll('.close-panel').forEach(b=>b.onclick=closeAllPanels);
$('btn-open-tiangge').onclick=()=>openPanel('tiangge');
$('btn-open-inventory').onclick=()=>openPanel('inventory');
$('btn-open-bestiary').onclick=()=>openPanel('bestiary');
function nearestNPC(){
  let best=null,bd=7*7;
  for(const n of NPCS){ const dd=d2(n.x,n.z,player.x,player.z); if(dd<bd){bd=dd;best=n;} }
  return best;
}
function tryInteract(){
  const n=nearestNPC();
  if(n){ if(window.openNpcWindow) window.openNpcWindow(n.id); else openShop(n.id); return; }
  if(typeof DGN_GATE!=='undefined'&&!(typeof DGN!=='undefined'&&DGN.active)&&d2(player.x,player.z,DGN_GATE.x,DGN_GATE.z)<6*6&&window.openDungeonSelect){ window.openDungeonSelect(); return; }
  if(d2(player.x,player.z,TENT.x,TENT.z)<13*13){ openPanel('tiangge'); return; }
  toast('Walang malapit na maaaring gamitin. Lumapit sa NPC, Tiangge, o Lagusan.');
}

/* ================================================================
   TOWN SHOPS
   ================================================================ */
const shopStock={}; // per-shop rotating stock: {items:[], restockAt}
function getStock(id, gen){
  const now=nowS();
  if(!shopStock[id]||now>=shopStock[id].restockAt){
    shopStock[id]={items:gen(), restockAt:now+300}; // restock every 5 min
  }
  return shopStock[id];
}
function buyPrice(it){ return sellPrice(it)*4; }
function shopItemRow(it, price, canBuy){
  const rar=RARITIES.find(r=>r.id===it.rarity);
  return `<div class="item-card rc-${it.rarity}">
    <div>
      <div class="ic-name" style="color:${rar.color}">${it.icon} ${it.name}${plusTag(it)}</div>
      <div class="ic-sub">${rar.name} · ${SLOT_DEFS[it.slot].name} · iLv ${it.ilvl} · ${mainStatTxt(it)}</div>
      ${window._reqLine?window._reqLine(it):''}
      <div class="ic-affix">${it.affixes.map(a=>`<div class="affix-line">◈ <b>${a.txt}</b></div>`).join('')}
      ${it.legendary?`<div class="affix-line" style="color:#ffb84a">${it.legendary.txt}</div>`:''}${window._setLine?window._setLine(it):''}</div>
    </div>
    <div class="item-btns">
      <button class="modal-btn shop-buy" data-uid="${it.uid}" data-price="${price}" ${canBuy?'':'disabled style="opacity:.4"'}>🪙 ${fmt(price)}</button>
    </div>
  </div>`;
}
function wireShopBuys(stock){
  document.querySelectorAll('.shop-buy').forEach(b=>b.onclick=()=>{
    const uid=+b.dataset.uid, price=+b.dataset.price;
    const idx=stock.items.findIndex(i=>i.uid===uid);
    if(idx<0) return;
    if(S.gold<price){ toast('🪙 Not enough gold!','warn'); return; }
    if(S.bag.length>=60){ toast('🎒 Loot bag full!','warn'); return; }
    S.gold-=price;
    const it=stock.items.splice(idx,1)[0];
    S.bag.push(it);
    toast(`${it.icon} Purchased <b>${it.name}</b>!`,'levelup');
    save(); updateHUD(); closeModal();
  });
}
function openShop(id){
  const restockTxt=st=>`<div class="screen-sub" style="margin-top:8px">🕐 New stock in ${Math.max(0,Math.ceil((st.restockAt-nowS())/60))} min</div>`;
  if(id==='trader'){
    /* Aling Rosa — buys your gear at fair prices, sells materials */
    const MATS_FOR_SALE=['palay','niyog','dahon','bato','kawayan','anito_dust','diwata_dew'];
    let html=`<h3>⚖️ Aling Rosa — Trader</h3>
      <p class="screen-sub">"Anak, everything has a price. Sell me your extra loot — or buy what the terraces won't give you today."</p>
      <div class="cat-title" style="margin-top:8px">Materials for sale (×50)</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0">`;
    for(const mid of MATS_FOR_SALE){
      const m=MATERIALS[mid];
      const price=m.rarity==='common'?90:m.rarity==='uncommon'?900:4000;
      html+=`<button class="modal-btn secondary mat-buy" data-mid="${mid}" data-price="${price}">${m.icon} ${m.name} — 🪙${fmt(price)}</button>`;
    }
    html+=`</div>
      <div class="cat-title">Quick sell</div>
      <p class="screen-sub">Open <b>⚔️ Equipment → Loot Bag</b> to sell gear piece by piece, or:</p>
      <button class="modal-btn" id="sell-commons">Sell ALL Common gear in bag</button>
      <button class="modal-btn secondary" id="shop-close">Leave</button>`;
    showModal(html);
    document.querySelectorAll('.mat-buy').forEach(b=>b.onclick=()=>{
      const price=+b.dataset.price;
      if(S.gold<price){ toast('🪙 Not enough gold!','warn'); return; }
      S.gold-=price; addInv(b.dataset.mid,50);
      toast(`${MATERIALS[b.dataset.mid].icon} +50 ${MATERIALS[b.dataset.mid].name}!`);
      save(); updateHUD();
    });
    $('sell-commons').onclick=()=>{
      let got=0,n=0;
      for(let i=S.bag.length-1;i>=0;i--){ if(S.bag[i].rarity==='common'){ got+=sellPrice(S.bag[i]); S.bag.splice(i,1); n++; } }
      if(!n){ toast('No Common gear in your bag.'); return; }
      S.gold+=got; toast(`🪙 Sold ${n} items for ${fmt(got)} gold!`,'levelup'); save(); updateHUD(); closeModal();
    };
    $('shop-close').onclick=closeModal;
  } else if(id==='blacksmith'){
    /* Panday Iko — weapons & shields only, chance of higher rarity */
    const st=getStock('blacksmith',()=>[
      makeItem(S.level,0.6,['mainhand']), makeItem(S.level,0.6,['mainhand']),
      makeItem(S.level,0.6,['offhand']),  makeItem(Math.min(LEVEL_CAP,S.level+1),1.0,['mainhand','offhand']),
    ]);
    let html=`<h3>⚒️ Panday Iko — Blacksmith</h3>
      <p class="screen-sub">"Forged in Sunog Scar embers, quenched in the gorge. A blade for every arm, kaibigan."</p>
      <button class="modal-btn" id="open-enhance" style="background:linear-gradient(180deg,#ffb87e,#c05a2c)">🔨 PANDAYAN — Palakasin ang Gamit (+1 → +10)</button>`;
    for(const it of st.items) html+=shopItemRow(it,buyPrice(it),S.gold>=buyPrice(it));
    if(!st.items.length) html+=`<div class="empty-note">Sold out! The forge is roaring — come back soon.</div>`;
    html+=restockTxt(st)+`<button class="modal-btn secondary" id="shop-close">Leave</button>`;
    showModal(html); wireShopBuys(st);
    $('open-enhance').onclick=openEnhance;
    $('shop-close').onclick=closeModal;
  } else if(id==='equipment'){
    /* Ka Bining — armor & accessories */
    const st=getStock('equipment',()=>[
      makeItem(S.level,0.5,['head','chest']), makeItem(S.level,0.5,['legs','cloak']),
      makeItem(S.level,0.5,['amulet1','ring1']), makeItem(S.level,0.5,['head','chest','legs','cloak']),
      makeItem(Math.min(LEVEL_CAP,S.level+1),0.9,['amulet1','ring1','cloak']),
    ]);
    let html=`<h3>🛡️ Ka Bining — Outfitter</h3>
      <p class="screen-sub">"Woven with terrace grass and blessed thread. The mountain protects those who dress with respect."</p>`;
    for(const it of st.items) html+=shopItemRow(it,buyPrice(it),S.gold>=buyPrice(it));
    if(!st.items.length) html+=`<div class="empty-note">All sold! New weaves arriving shortly.</div>`;
    html+=restockTxt(st)+`<button class="modal-btn secondary" id="shop-close">Leave</button>`;
    showModal(html); wireShopBuys(st);
    $('shop-close').onclick=closeModal;
  } else if(id==='blackmarket'){
    /* Ang Kubrador — pricey gambles: epic+ bias, mystery boxes */
    const st=getStock('blackmarket',()=>{
      const items=[makeItem(Math.min(LEVEL_CAP,S.level+2),2.2), makeItem(Math.min(LEVEL_CAP,S.level+2),2.2)];
      return items;
    });
    const mysteryPrice=Math.round(150*Math.pow(1.35,S.level));
    let html=`<h3>🌑 Ang Kubrador — Black Market</h3>
      <p class="screen-sub">"Ssst. No questions, no refunds. The aswang don't ask where I get my wares… neither should you."</p>`;
    for(const it of st.items) html+=shopItemRow(it,buyPrice(it)*2,S.gold>=buyPrice(it)*2);
    html+=`<div class="cat-title" style="margin-top:8px">Gamble</div>
      <button class="modal-btn" id="mystery-box">🎲 Mystery Pouch — 🪙 ${fmt(mysteryPrice)}<br><small>Random gear, Rare or better guaranteed</small></button>
      ${restockTxt(st)}
      <button class="modal-btn secondary" id="shop-close">Leave</button>`;
    showModal(html); wireShopBuys(st);
    $('mystery-box').onclick=()=>{
      if(S.gold<mysteryPrice){ toast('🪙 Not enough gold!','warn'); return; }
      if(S.bag.length>=60){ toast('🎒 Loot bag full!','warn'); return; }
      S.gold-=mysteryPrice;
      let it=makeItem(Math.min(LEVEL_CAP,S.level+1),1.5);
      let guard=0;
      while(['common','uncommon'].includes(it.rarity)&&guard++<30) it=makeItem(Math.min(LEVEL_CAP,S.level+1),1.5);
      S.bag.push(it);
      const rar=RARITIES.find(r=>r.id===it.rarity);
      toast(`🎲 The pouch held… ${it.icon} <span style="color:${rar.color}"><b>${it.name}</b></span>!`, 'levelup');
      save(); updateHUD(); closeModal();
    };
    $('shop-close').onclick=closeModal;
  }
}

function itemCardHTML(it, showBtns){
  const rar=RARITIES.find(r=>r.id===it.rarity);
  const socks=itemSockets(it);
  const sockHTML = socks.length?`<div class="sock-row">${socks.map(rid=>rid
    ?`<span class="sock filled" title="${RUNE_DEFS[rid].desc}">${RUNE_DEFS[rid].glyph}</span>`
    :'<span class="sock">◇</span>').join('')}</div>`:'';
  const affixHTML = it.affixes.map(a=>`<div class="affix-line">◈ <b>${a.txt}</b></div>`).join('') +
    socks.filter(Boolean).map(rid=>`<div class="affix-line" style="color:#ffd94a">${RUNE_DEFS[rid].glyph} ${RUNE_DEFS[rid].desc}</div>`).join('') +
    (it.legendary?`<div class="affix-line" style="color:#ffb84a">${it.legendary.txt}</div>`:'') +
    (window._setLine?window._setLine(it):'');
  return `<div class="item-card rc-${it.rarity}" data-uid="${it.uid}">
    <div>
      <div class="ic-name" style="color:${rar.color}">${it.icon} ${it.name}${plusTag(it)}</div>
      <div class="ic-sub">${rar.name} · ${SLOT_DEFS[it.slot].name} · iLv ${it.ilvl} · ${mainStatTxt(it)}</div>
      ${window._reqLine?window._reqLine(it):''}
      <div class="ic-affix">${affixHTML}</div>
      ${sockHTML}
    </div>
    ${showBtns?`<div class="item-btns">
      <button class="mini-btn" data-equip="${it.uid}">EQUIP</button>
      ${socks.length?`<button class="mini-btn sock-btn" data-sock="${it.uid}">ᜊ RUNES</button>`:''}
      <button class="mini-btn sell" data-sell="${it.uid}">🪙 ${fmt(sellPrice(it))}</button>
    </div>`:''}
  </div>`;
}
function renderGear(){
  computeStats();
  $('gear-stats').innerHTML=`
    <div><span>⚔️ Attack</span><b>${P.atk}</b></div>
    <div><span>🛡️ Defense</span><b>${P.def}</b></div>
    <div><span>❤️ Max HP</span><b>${P.maxHp}</b></div>
    <div><span>🎯 Crit</span><b>${Math.round(P.critCh)}% / ${Math.round(P.critDmg)}%</b></div>
    <div><span>👟 Speed</span><b>${P.spd.toFixed(1)}</b></div>
    <div><span>🩸 Life Steal</span><b>${Math.round(P.lifesteal)}%</b></div>`;
  const slotsEl=$('gear-slots'); slotsEl.innerHTML='';
  for(const [slot,sd] of Object.entries(SLOT_DEFS)){
    const it=S.gear[slot];
    const div=document.createElement('div');
    div.className='gslot'+(it?'':' empty');
    if(it){
      const rar=RARITIES.find(r=>r.id===it.rarity);
      div.innerHTML=`<div class="gs-type">${sd.icon} ${sd.name}</div>
        <div class="gs-name" style="color:${rar.color}">${it.name}</div>
        <div class="gs-sub">${mainStatTxt(it)}${it.affixes.length?' · +'+it.affixes.length+' affix':''}</div>`;
      div.onclick=()=>{
        showModal(`${itemCardHTML(it,false)}<div style="height:10px"></div>
          ${itemSockets(it).length?`<button class="modal-btn secondary" id="sock-btn2">ᜊ Baybayin Runes</button>`:''}
          <button class="modal-btn secondary" id="unequip-btn">Unequip</button>
          <button class="modal-btn" onclick="closeModal()">Close</button>`);
        setTimeout(()=>{ const sb=$('sock-btn2'); if(sb)sb.onclick=()=>openSockets(it.uid); const b=$('unequip-btn'); if(b)b.onclick=()=>{
          if(S.bag.length>=60){ toast('Bag full!','warn'); return; }
          S.bag.push(it); delete S.gear[slot]; computeStats(); save(); closeModal(); renderGear(); };},0);
      };
    } else {
      div.innerHTML=`<div class="gs-type">${sd.icon} ${sd.name}</div><div class="gs-name">— empty —</div>`;
    }
    slotsEl.appendChild(div);
  }
  const bagEl=$('gear-bag');
  $('bag-count').textContent=`(${S.bag.length}/60)`;
  if(S.bag.length===0){ bagEl.innerHTML='<div class="empty-note">No loot yet. Enemies drop equipment — elites drop the best!</div>'; }
  else {
    const order={legendary:0,epic:1,rare:2,uncommon:3,common:4};
    const sorted=[...S.bag].sort((a,b)=>order[a.rarity]-order[b.rarity]||b.ilvl-a.ilvl);
    bagEl.innerHTML=sorted.map(it=>itemCardHTML(it,true)).join('');
    bagEl.querySelectorAll('[data-equip]').forEach(b=>b.onclick=(e)=>{e.stopPropagation();equipItem(+b.dataset.equip);});
    bagEl.querySelectorAll('[data-sell]').forEach(b=>b.onclick=(e)=>{e.stopPropagation();sellItem(+b.dataset.sell);});
    bagEl.querySelectorAll('[data-sock]').forEach(b=>b.onclick=(e)=>{e.stopPropagation();openSockets(+b.dataset.sock);});
  }
}
function equipItem(uid){
  const idx=S.bag.findIndex(i=>i.uid===uid); if(idx<0)return;
  const it=S.bag[idx];
  if(window._canEquip){ const why=window._canEquip(it); if(why){ toast(why,'warn'); return; } }
  let slot=it.slot;
  if(it.altSlots){ slot=it.altSlots.find(s2=>!S.gear[s2])||it.altSlots[0]; }
  const old=S.gear[slot];
  S.bag.splice(idx,1);
  if(old) S.bag.push(old);
  S.gear[slot]=it;
  computeStats(); updateHUD(); save(); renderGear();
  toast(`${it.icon} Equipped <b>${it.name}</b>!`,'loot');
}
function sellItem(uid){
  const idx=S.bag.findIndex(i=>i.uid===uid); if(idx<0)return;
  const it=S.bag[idx];
  S.gold+=sellPrice(it);
  S.bag.splice(idx,1);
  updateHUD(); save(); renderGear();
  toast(`🪙 Sold for ${fmt(sellPrice(it))} gold.`);
}

function canAfford(r){ return Object.entries(r.cost).every(([id,q])=>(S.inv[id]||0)>=q); }
function renderForge(){
  const locked=S.level<2;
  $('tiangge-lock-msg').classList.toggle('hidden',!locked);
  const fiestaLocked=S.level<10;
  $('fiesta-note').classList.toggle('hidden',!fiestaLocked);
  const build=(el,cat,catLocked)=>{
    el.innerHTML='';
    for(const r of RECIPES.filter(x=>x.cat===cat)){
      const owned=S.agimats.includes(r.id), afford=canAfford(r);
      const card=document.createElement('div');
      card.className='forge-card'+(owned?' owned':'');
      let costHTML='';
      for(const [id,q] of Object.entries(r.cost)){
        const have=S.inv[id]||0, pct=Math.min(100,have/q*100), ok=have>=q;
        costHTML+=`<div class="cost-row">
          <span class="cost-icon">${MATERIALS[id].icon}</span>
          <span style="min-width:96px">${MATERIALS[id].name}</span>
          <div class="cost-meter"><div class="fill ${ok?'':'short'}" style="width:${pct}%"></div></div>
          <span class="cost-nums ${ok?'ok':'no'}">${fmt(Math.min(have,q))} / ${fmt(q)}</span>
        </div>`;
      }
      const tag=owned?'<span class="owned-tag">✓ FORGED</span>':(locked||catLocked)?'<span class="locked-tag">🔒 LOCKED</span>':'';
      card.innerHTML=`
        <div class="fc-head"><div>
          <div class="fc-name">${r.icon} ${r.name}</div>
          <div class="fc-effect">${r.effect}</div>
          <div class="fc-desc">${r.desc}</div>
        </div>${tag}</div>
        <div class="fc-costs">${costHTML}</div>
        ${owned?'':`<button class="forge-btn" data-recipe="${r.id}" ${(afford&&!locked&&!catLocked)?'':'disabled'}>⚒️ FORGE</button>`}`;
      el.appendChild(card);
    }
  };
  build($('forge-list'),'forge',false);
  build($('fiesta-list'),'fiesta',fiestaLocked);
  document.querySelectorAll('.forge-btn').forEach(b=>b.onclick=()=>forgeRecipe(b.dataset.recipe));
}
function forgeRecipe(id){
  const r=RECIPES.find(x=>x.id===id);
  if(!r||S.agimats.includes(id)||!canAfford(r))return;
  for(const [mid,q] of Object.entries(r.cost)){ if((S.inv[mid]||0)<q)return; }
  for(const [mid,q] of Object.entries(r.cost)){ S.inv[mid]-=q; }
  S.agimats.push(id); S.exchanges++;
  r.apply(S); computeStats();
  let sukli=null;
  const totalCost=Object.values(r.cost).reduce((a,b)=>a+b,0);
  if(totalCost>=3000&&Math.random()<0.15){
    const pool=['diwata_dew','tikbalang_hair','kapre_ash','anito_dust'];
    const pick=pool[rand(0,pool.length-1)], q=rand(3,8);
    addInv(pick,q);
    sukli=`${MATERIALS[pick].icon} ${q}× ${MATERIALS[pick].name}`;
  }
  save(); renderForge(); renderAgimats(); renderInventory(); updateHUD();
  showModal(`
    <div class="modal-emoji">${r.icon}</div>
    <div class="modal-title">✨ ${r.name} Forged! ✨</div>
    <div class="modal-body">The Anting-Anting Forge blazes with spirit-fire.<br>
      <b style="color:var(--teal)">${r.effect}</b> — <span class="mut">permanent!</span>
      ${sukli?`<div class="reward-line"><div class="reward-chip">🎁 Sukli bonus: ${sukli}</div></div>`:''}
    </div>
    <button class="modal-btn" onclick="closeModal()">Salamat! 🙏</button>`);
  const box=$('modal-box'), emo=['🎉','✨','🌾','💛','🏮'];
  for(let i=0;i<18;i++){
    const c=document.createElement('div'); c.className='confetti';
    c.textContent=emo[rand(0,emo.length-1)];
    c.style.left=rand(2,95)+'%'; c.style.animationDelay=(Math.random()*0.7)+'s';
    box.appendChild(c);
  }
}

function renderInventory(){
  const grid2=$('inv-grid'); grid2.innerHTML='';
  let any=false;
  for(const id of Object.keys(MATERIALS)){
    const q=S.inv[id]||0; if(q<=0)continue; any=true;
    const m=MATERIALS[id];
    const cell=document.createElement('div');
    cell.className='inv-cell r-'+m.rarity;
    cell.innerHTML=`<div class="rarity-dot"></div><div class="icon">${m.icon}</div><div class="iname">${m.name}</div><div class="qty">${fmt(q)}</div>`;
    cell.onclick=()=>showModal(`
      <div class="modal-emoji">${m.icon}</div><div class="modal-title">${m.name}</div>
      <div class="modal-body"><span style="color:var(--${m.rarity});font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:1px">${m.rarity}</span><br><br>${m.lore}<br><br><b>Owned: ${fmt(q)}</b></div>
      <button class="modal-btn" onclick="closeModal()">Close</button>`);
    grid2.appendChild(cell);
  }
  if(!any)grid2.innerHTML='<div class="empty-note">Your pouch is empty. Slay spirits and break forage nodes!</div>';
}
function renderAgimats(){
  const list=$('agimat-list'); list.innerHTML='';
  if(S.agimats.length===0){ list.innerHTML='<div class="empty-note">No Agimats yet. Visit the Grand Tiangge tent!</div>'; return; }
  for(const id of S.agimats){
    const r=RECIPES.find(x=>x.id===id);
    const row=document.createElement('div'); row.className='agimat-row';
    row.innerHTML=`<div class="icon">${r.icon}</div><div><div class="n">${r.name}</div><div class="e">${r.effect} · permanent</div></div>`;
    list.appendChild(row);
  }
}
function renderBestiary(){
  const list=$('bestiary-list');
  list.innerHTML='';
  for(const [key,def] of Object.entries(ENEMY_DEFS)){
    const rec=S.bestiary[key], seen=rec&&rec.seen;
    const card=document.createElement('div'); card.className='beast-card';
    card.innerHTML=seen?`
      <div class="beast-head"><img class="beast-img" src="${def.img}" alt="${def.name}"><div>
        <div class="beast-title">${def.name} <span class="small-note">· ${def.tier}</span></div>
        <div class="beast-role">${def.role} · ${def.xp} XP</div>
        <div class="beast-kills">⚔️ Defeated: <b>${rec.kills||0}</b></div>
      </div></div>
      <div class="beast-body">${def.lore}<div class="beast-drops"><b>Drops:</b> ${def.dropText}</div></div>`:`
      <div class="beast-head"><img class="beast-img unknown" src="${def.img}" alt="???"><div>
        <div class="beast-title">???</div>
        <div class="beast-role undiscovered">Undiscovered spirit · ${def.tier}</div>
        <div class="beast-kills undiscovered">${def.minLevel>1?`Rumored to appear at Level ${def.minLevel}…`:'Wander the terraces to meet it…'}</div>
      </div></div>`;
    list.appendChild(card);
  }
}
function renderBestiaryIfOpen(){ if(panels.bestiary.classList.contains('open'))renderBestiary(); }
setInterval(()=>{
  if(!started)return;
  for(const en of enemies){
    if(d2(en.x,en.z,player.x,player.z)<31*31){
      if(!S.bestiary[en.key]){ S.bestiary[en.key]={seen:true,kills:0}; toast(`📖 New spirit recorded: <b>${ENEMY_DEFS[en.key].name}</b>`); }
      else if(!S.bestiary[en.key].seen) S.bestiary[en.key].seen=true;
    }
  }
},1000);

/* ---------------- PASALUBONG ---------------- */
function checkPasalubong(){
  if(S.level<3)return;
  const elapsed=Date.now()-(S.lastSeen||Date.now());
  if(elapsed<OFFLINE_MIN_MS)return;
  const eff=Math.min(elapsed,OFFLINE_CAP_MS), minutes=eff/60000;
  const cycles=Math.max(1,Math.floor(minutes/2.5*S.forageSpeedMult));
  const gains={
    palay:dropScale(rand(15,25))*cycles,
    niyog:dropScale(rand(8,15))*Math.floor(cycles*0.7),
    dahon:dropScale(rand(10,18))*Math.floor(cycles*0.6),
    kawayan:dropScale(rand(7,12))*Math.floor(cycles*0.5),
  };
  if(minutes>30)gains.diwata_dew=Math.max(1,Math.floor(cycles/25));
  for(const k of Object.keys(gains))if(gains[k]<=0)delete gains[k];
  const hrs=Math.floor(eff/3600000),mins=Math.floor((eff%3600000)/60000);
  const timeStr=(hrs?hrs+'h ':'')+mins+'m', capped=elapsed>OFFLINE_CAP_MS;
  const chips=Object.entries(gains).map(([id,q])=>`<div class="reward-chip">${MATERIALS[id].icon} ${fmt(q)} ${MATERIALS[id].name}</div>`).join('');
  showModal(`
    <div class="modal-emoji">🎁</div><div class="modal-title">Pasalubong!</div>
    <div class="modal-body">While you were away (<b>${timeStr}</b>${capped?' — capped at 8h':''}), your ${CLASSES[S.cls].name} gathered gifts:
      <div class="reward-line">${chips}</div></div>
    <button class="modal-btn" id="claim-pasalubong">Claim Pasalubong 🙏</button>`);
  $('claim-pasalubong').onclick=()=>{
    for(const [id,q] of Object.entries(gains))addInv(id,q);
    closeModal(); toast('🎁 Pasalubong claimed!','loot'); save();
  };
}

/* ---------------- MODAL ---------------- */
function showModal(html){ $('modal-box').innerHTML=html; $('modal-backdrop').classList.remove('hidden'); }
function closeModal(){ $('modal-backdrop').classList.add('hidden'); }
window.closeModal=closeModal;
$('modal-backdrop').addEventListener('click',e=>{ if(e.target.id==='modal-backdrop')closeModal(); });

/* ---------------- INFO ---------------- */
$('btn-info').onclick=()=>{
  const C=CLASSES[S.cls];
  showModal(`
    <div class="modal-emoji">⚔️</div><div class="modal-title">${C.name} — ${C.role}</div>
    <table class="stat-table">
      <tr><td>Level</td><td>${S.level} / ${LEVEL_CAP}</td></tr>
      <tr><td>Attack</td><td>${P.atk}</td></tr>
      <tr><td>Defense</td><td>${P.def}</td></tr>
      <tr><td>Max HP</td><td>${P.maxHp}</td></tr>
      <tr><td>Crit</td><td>${Math.round(P.critCh)}% (${Math.round(P.critDmg)}%)</td></tr>
      <tr><td>Gold</td><td>${fmt(S.gold)}</td></tr>
      <tr><td>Agimats</td><td>${S.agimats.length} / ${RECIPES.length}</td></tr>
    </table>
    <div class="modal-body mut" style="font-size:11.5px">
      🎮 WASD move · Space attack · 1/2/3 skills · Shift dodge · E interact · drag right side / Q,R to orbit camera · wheel zoom<br>
      Next: ${Object.entries(UNLOCKS).filter(([l])=>+l>S.level).slice(0,2).map(([l,u])=>`Lv${l} — ${u}`).join(' · ')||'All content unlocked!'}
    </div>
    <button class="modal-btn" onclick="closeModal()">Close</button>
    <button class="modal-btn secondary" id="btn-reset">Reset Save</button>`);
  $('btn-reset').onclick=()=>{ if(confirm('Erase all progress and start over?')){ localStorage.removeItem('agimat_save3'); location.reload(); } };
};

/* ---------------- CLASS SELECT & BOOT ---------------- */
/* ================================================================
   WELCOME SCREEN (Tagalog) + CHARACTER CREATION
   ================================================================ */
const FILIPINO_NAMES={
  male:['Bayani','Lakan','Datu','Makisig','Agila','Tala-Dula','Kidlat','Habagat','Amihan Jr.','Bagwis','Dakila','Matapang','Alon','Sinag','Luntian'],
  female:['Amihan','Tala','Mayumi','Diwata','Luningning','Marikit','Dalisay','Hiraya','Sampaguita','Liwayway','Bituin','Mutya','Ligaya','Perlas','Sinta'],
};
let CLASS_TAGALOG={
  babaylan:{tl:'Babaylan',desc:'Manggagamot at tagapamagitan sa mga anito. Balanse ng atake at suporta.'},
  arnisador:{tl:'Arnisador',desc:'Mabilis na mandirigmang may dalawang baston. Malakas sa malapitan.'},
  tirador:{tl:'Tirador',desc:'Tirador ng bato mula sa malayo. Tumpak at nakamamatay.'},
  alim:{tl:'Alim',desc:'Matandang pantas ng apoy, tubig, at hangin. Makapangyarihang salamangka.'},
  mandirigma:{tl:'Mandirigma',desc:'Tangke ng hukbo — kalasag at kampilan. Halos hindi matibag.'},
  mamamana:{tl:'Mamamana',desc:'Mangangaso ng kabundukan — pana at balahibo. Ulan ng palaso mula sa malayo.'},
  anino:{tl:'Anino',desc:'Patalim ng kadiliman. Naglalaho sa usok at sumasaksak mula sa likuran.'},
  panday:{tl:'Panday',desc:'Anak ng pandayan — dambuhalang maso na may init ng bulkan.'},
  mangkukulam:{tl:'Mangkukulam',desc:'Bruha ng mga sumpa — munyeka, karayom, at lason. Mag-ingat sa kanyang bulong.'},
};
if (GAME_DATA.classes && GAME_DATA.classes.tagalog) CLASS_TAGALOG = GAME_DATA.classes.tagalog;
const charDraft={name:'', gender:'male', skin:1, hairStyle:0, hairColor:0, eyeColor:0, face:0, cls:null};
const EYE_COLORS=[0x4a2c1a, 0x2a1a10, 0x101010, 0x7a5a2a, 0x2a5a9a, 0x2a7a4a, 0x6a3a9a, 0xc9a24b, 0x2a8a9a];
let ccRenderer=null, ccScene=null, ccCam=null, ccMesh=null, ccYaw=0.5, ccRAF=0;

/* ================================================================
   WELCOME EXPERIENCE v2 — cinematic landing, character select,
   4-stage ritual character creation (LANDAS → ANYO → DIWA → AGIMAT)
   Spec: welcome/charcreate doc. Preserves: ACCT/api, adoptSave,
   bootFromSave, buildHero, CLASSES, charDraft, SKIN/HAIR consts.
   ================================================================ */
/* ---- DIWA: spiritual affinity (small, mostly flavor — spec §5) ---- */
const DIWA_DEFS=[
  {id:'apoy',  icon:'🔥', name:'Apoy',  tl:'Ningas ng loob',   fx:'+2% Atake',        desc:'Ang diwa ng apoy — marahas, mapusok, hindi namamatay ang ningas.'},
  {id:'tubig', icon:'🌊', name:'Tubig', tl:'Agos ng buhay',    fx:'+3% Max HP',       desc:'Ang diwa ng tubig — kalmado, umaagos, laging bumabangon.'},
  {id:'lupa',  icon:'⛰️', name:'Lupa',  tl:'Tatag ng bundok',  fx:'+2 Depensa',       desc:'Ang diwa ng lupa — matibay, matiyaga, hindi natitinag.'},
  {id:'hangin',icon:'🌬️', name:'Hangin',tl:'Bilis ng unos',    fx:'+2% Bilis',        desc:'Ang diwa ng hangin — malaya, mabilis, hindi mahuhuli.'},
  {id:'anino', icon:'🌑', name:'Anino', tl:'Lalim ng dilim',   fx:'+2% Kritikal',     desc:'Ang diwa ng anino — tahimik, mapanuri, tumatama sa tamang sandali.'},
  {id:'diwa',  icon:'✨', name:'Diwa',  tl:'Liwanag ng kaluluwa', fx:'+5% Karanasan', desc:'Ang dalisay na diwa — balanse, marunong, mabilis matuto.'},
];
/* ---- STARTER AGIMAT: heirloom charm (modest — spec §6) ---- */
const AGIMAT0_DEFS=[
  {id:'kalasag', icon:'🛡️', cat:'Depensiba',  name:'Kalasag ni Bathala',    fx:'+3 Depensa',   desc:'Piraso ng sinaunang kalasag — biyaya ng kalangitan.'},
  {id:'pangil',  icon:'🗡️', cat:'Opensiba',   name:'Pangil ng Sigbin',      fx:'+2% Atake',    desc:'Pangil na kinuha sa sigbin — uhaw sa laban.'},
  {id:'bulong',  icon:'📿', cat:'Espiritu',    name:'Bulong ng Anito',       fx:'+4% Karanasan',desc:'Kwintas na bumubulong ng karunungan ng mga ninuno.'},
  {id:'balahibo',icon:'🪶', cat:'Elemental',   name:'Balahibo ng Tigmamanukan', fx:'+2% Bilis', desc:'Balahibo ng ibong tagapagbadya — dala ang hangin.'},
  {id:'suwerte', icon:'🍀', cat:'Lihim',       name:'Suwerte ng Duwende',    fx:'+4% Drop Rate',desc:'Munting regalo ng nuno — mapalad ang may dala.'},
];
/* class-reactive ritual aura (spec §7) */
const CLASS_AURA={
  babaylan:   {c:'rgba(90,170,255,.32)',  t:'Asul na apoy ng espiritu'},
  arnisador:  {c:'rgba(255,90,70,.30)',   t:'Pulang sigla ng eskrima'},
  tirador:    {c:'rgba(210,190,120,.30)', t:'Alikabok ng burol'},
  alim:       {c:'rgba(120,230,210,.30)', t:'Elemental na mga particle'},
  mandirigma: {c:'rgba(255,190,90,.32)',  t:'Mainit na lakas ng ninuno'},
  mamamana:   {c:'rgba(120,220,120,.28)', t:'Simoy ng kagubatan'},
  anino:      {c:'rgba(170,90,255,.32)',  t:'Lilang usok ng anino'},
  mangkukulam:{c:'rgba(110,255,110,.30)', t:'Berdeng multo ng sumpa'},
  panday:     {c:'rgba(255,120,40,.34)',  t:'Baga at apoy ng pandayan'},
};
const WS_I18N={
  fil:{tag:'Ang Alamat ng Kapuluan', sub:'Gumising ka, mandirigma. Tinatawag ka ng mga anito —<br>ang kapuluan ay nangangailangan ng bagong bayani.',
    start:'▶ SIMULAN ANG ALAMAT', login:'MAG-LOG IN', reg:'GUMAWA NG ACCOUNT', go_l:'🔑 MAG-LOG IN', go_r:'✨ GUMAWA NG ACCOUNT',
    rem:'Tandaan ako', forgot:'Nakalimutan ang password?', skip:'o maglaro nang <b>walang account</b> (lokal na save lamang)',
    quote:'“Mula sa ating pinagmulan,<br>hanggang sa iyong sariling alamat.”'},
  en:{tag:'The Legend of the Archipelago', sub:'Awaken, warrior. The anito spirits are calling —<br>the archipelago needs a new hero.',
    start:'▶ BEGIN YOUR LEGEND', login:'LOG IN', reg:'CREATE ACCOUNT', go_l:'🔑 LOG IN', go_r:'✨ CREATE ACCOUNT',
    rem:'Remember me', forgot:'Forgot password?', skip:'or play <b>without an account</b> (local save only)',
    quote:'“From our origins,<br>to a legend of your own.”'},
};
Object.assign(charDraft,{diwa:null, agimat0:null});

function showWelcome(){
  $('welcome-screen').classList.remove('hidden');
  /* ---- language ---- */
  let lang=localStorage.getItem('agimat_lang')||'fil';
  const langEl=$('ws-lang'); langEl.value=lang;
  function applyLang(){
    const L=WS_I18N[lang]||WS_I18N.fil;
    $('ws-tagline').textContent=L.tag; $('ws-sub').innerHTML=L.sub;
    $('btn-start').textContent=L.start;
    $('acct-tab-login').textContent=L.login; $('acct-tab-reg').textContent=L.reg;
    $('ws-remember-txt').textContent=L.rem; $('ws-forgot').textContent=L.forgot;
    $('acct-skip').innerHTML=L.skip; $('ws-quote').innerHTML=L.quote;
    setMode(mode);
  }
  langEl.onchange=()=>{ lang=langEl.value; localStorage.setItem('agimat_lang',lang); applyLang(); };
  /* ---- ultra-light graphics toggle (for weak devices/browsers) ---- */
  { const uc=$('ultra-chk'); if(uc){ try{ uc.checked=localStorage.getItem('agimat_ultralight')==='1'; }catch(e){}
    uc.onchange=()=>{ try{ localStorage.setItem('agimat_ultralight', uc.checked?'1':'0'); }catch(e){} location.reload(); }; } }
  /* ---- start (new character) ---- */
  $('btn-start').onclick=()=>{
    enterImmersive();
    if(ACCT.token && _wsHasCloudChar){
      if(!confirm(lang==='en'
        ?'Your account already has a hero. Creating a new one will REPLACE it. Continue?'
        :'May bayani na ang account mo. Papalitan ito ng bagong bayani. Ituloy?')) return;
    }
    $('welcome-screen').classList.add('hidden');
    showCharCreate();
  };
  /* ---- password eye ---- */
  $('ws-eye').onclick=()=>{
    const p=$('acct-pass'); p.type=p.type==='password'?'text':'password';
    $('ws-eye').style.opacity=p.type==='text'?'1':'0.6';
  };
  /* ---- forgot password (honest: no email system yet) ---- */
  $('ws-forgot').onclick=()=>{
    toast(lang==='en'
      ?'⚠️ Password reset is not available yet — accounts have no email on file. Keep your password safe!'
      :'⚠️ Wala pang password reset — walang email ang mga account. Ingatan ang iyong password!','warn');
  };
  /* ---- account box ---- */
  let mode='login';
  const msg=$('acct-msg');
  function setMode(m2){
    mode=m2;
    const L=WS_I18N[lang]||WS_I18N.fil;
    $('acct-tab-login').classList.toggle('sel',m2==='login');
    $('acct-tab-reg').classList.toggle('sel',m2==='reg');
    $('acct-go').textContent = m2==='login' ? L.go_l : L.go_r;
    $('acct-pass').autocomplete = m2==='login'?'current-password':'new-password';
    msg.textContent=''; msg.className='';
  }
  let _wsHasCloudChar=false;
  /* ---- character select card (spec §10) ---- */
  function zoneNameAt(px,py){
    try{
      const tx=Math.floor(px/TILE), ty=Math.floor(py/TILE);
      if(tx>=TOWN.x0&&tx<=TOWN.x1&&ty>=TOWN.y0&&ty<=TOWN.y1) return '🏮 Barangay Liwanag';
      const zn=zoneGrid[ty*MAP_W+tx];
      return ZONE_NAMES[zn]||'Kapuluan';
    }catch(e){ return 'Kapuluan'; }
  }
  function agoTxt(ts){
    if(!ts) return '';
    const d=Date.now()-ts;
    const h=Math.floor(d/3600000);
    if(h<1) return lang==='en'?'less than an hour ago':'kanina lamang';
    if(h<24) return (lang==='en'?h+'h ago':h+' oras na nakalipas');
    const dd=Math.floor(h/24);
    return lang==='en'?dd+'d ago':dd+' araw na nakalipas';
  }
  function renderCharSel(saveStr){
    const box=$('acct-charsel');
    let sv=null; try{ sv=JSON.parse(saveStr||'null'); }catch(e){}
    _wsHasCloudChar=!!(sv&&sv.cls);
    box.innerHTML=`<div class="chs-who">🧿 ${ACCT.user}</div>`;
    if(sv&&sv.cls&&CLASSES[sv.cls]){
      const C=CLASSES[sv.cls];
      const advName=(sv.adv&&window._advDisplay)?window._advDisplay(sv.cls):null;
      const card=document.createElement('div'); card.className='chs-card';
      card.innerHTML=`
        <img src="${C.portrait}" alt="">
        <div class="chs-info">
          <div class="chs-name">${sv.name||C.name}</div>
          <div class="chs-meta">Lv ${sv.level||1} · ${advName||C.name}${sv.adv?' ⭐':''}</div>
          <div class="chs-loc">${sv.px!=null?zoneNameAt(sv.px,sv.py):'🏮 Barangay Liwanag'}${sv.lastSeen?' · '+agoTxt(sv.lastSeen):''}</div>
          <div class="chs-actions">
            <button class="chs-enter">▶ ${lang==='en'?'ENTER WORLD':'PASUKIN ANG MUNDO'}</button>
            <button class="chs-del">🗑</button>
          </div>
        </div>`;
      card.querySelector('.chs-enter').onclick=async(ev)=>{
        ev.stopPropagation();
        const r=await api('/api/load',{token:ACCT.token});
        if(r.ok&&r.save&&adoptSave(r.save)&&S.cls){
          $('welcome-screen').classList.add('hidden'); bootFromSave();
        } else { toast(r.err||'Hindi ma-load ang save.','warn'); }
      };
      card.querySelector('.chs-del').onclick=async(ev)=>{
        ev.stopPropagation();
        const nm=sv.name||C.name;
        if(!confirm(lang==='en'?`Delete "${nm}" (Lv ${sv.level||1} ${C.name})? This cannot be undone.`:`Burahin si "${nm}" (Lv ${sv.level||1} ${C.name})? Hindi na ito maibabalik.`)) return;
        if(!confirm(lang==='en'?'Are you REALLY sure? All progress will be lost.':'Sigurado ka TALAGA? Mawawala ang lahat ng progreso.')) return;
        const blank=JSON.stringify(DEFAULT_STATE());
        await api('/api/save',{token:ACCT.token, save:blank});
        localStorage.removeItem('agimat_save3');
        toast(lang==='en'?'Character deleted.':'Nabura ang bayani.','warn');
        renderCharSel(blank);
      };
      box.appendChild(card);
    } else {
      const note=document.createElement('div'); note.className='chs-loc'; note.style.textAlign='center';
      note.textContent=lang==='en'?'No hero yet on this account.':'Wala pang bayani ang account na ito.';
      box.appendChild(note);
      /* §12 SAVE MIGRATION: local guest hero exists → one-tap link to this account */
      let loc=null; try{ loc=JSON.parse(localStorage.getItem('agimat_save3')||'null'); }catch(e){}
      if(loc&&loc.cls&&CLASSES[loc.cls]){
        const mb=document.createElement('button'); mb.className='chs-new';
        mb.style.background='linear-gradient(180deg,#7df0ff,#2a8ab0)'; mb.style.color='#06222e';
        mb.textContent=(lang==='en'?'📥 LINK GUEST HERO — ':'📥 ILIPAT ANG GUEST NA BAYANI — ')
          +(loc.name||CLASSES[loc.cls].name)+' · Lv '+(loc.level||1);
        mb.onclick=async()=>{
          mb.disabled=true;
          const r=await api('/api/save',{token:ACCT.token, save:JSON.stringify(loc)});
          mb.disabled=false;
          if(r.ok){
            toast(lang==='en'?'✅ Guest hero linked to your account — safe in the cloud!':'✅ Nailipat ang guest na bayani sa account mo — ligtas na sa cloud!','levelup');
            renderCharSel(JSON.stringify(loc));
          } else toast(r.err||'Hindi nailipat.','warn');
        };
        box.appendChild(mb);
      }
    }
    const nb=document.createElement('button'); nb.className='chs-new';
    nb.textContent=(sv&&sv.cls)?(lang==='en'?'✨ CREATE NEW CHARACTER (replaces current)':'✨ GUMAWA NG BAGONG BAYANI (papalitan ang kasalukuyan)')
                              :(lang==='en'?'✨ CREATE CHARACTER':'✨ LIKHAIN ANG IYONG BAYANI');
    nb.onclick=()=>$('btn-start').click();
    box.appendChild(nb);
    const lo=document.createElement('button'); lo.className='chs-logout';
    lo.textContent=lang==='en'?'Log out':'Mag-log out';
    lo.onclick=()=>{ acctLogout(); _wsHasCloudChar=false; showLogged(); setMode('login'); };
    box.appendChild(lo);
  }
  async function showLogged(){
    const has=!!ACCT.token;
    $('acct-form').classList.toggle('hidden',has);
    $('acct-tabs').classList.toggle('hidden',has);
    $('acct-charsel').classList.toggle('hidden',!has);
    $('acct-skip').classList.toggle('hidden',has);
    if(has){
      $('acct-charsel').innerHTML='<div class="chs-loc" style="text-align:center">⏳ …</div>';
      const r=await api('/api/load',{token:ACCT.token});
      if(r.ok) renderCharSel(r.save);
      else { acctLogout(); $('acct-form').classList.remove('hidden'); $('acct-tabs').classList.remove('hidden'); $('acct-charsel').classList.add('hidden'); $('acct-skip').classList.remove('hidden'); }
    }
  }
  $('acct-tab-login').onclick=()=>setMode('login');
  $('acct-tab-reg').onclick=()=>setMode('reg');
  $('acct-go').onclick=async ()=>{
    const u=$('acct-user').value.trim(), pw=$('acct-pass').value;
    if(!u||!pw){ msg.textContent=lang==='en'?'Enter username and password.':'Ilagay ang username at password.'; msg.className=''; return; }
    $('acct-go').disabled=true; msg.textContent=lang==='en'?'One moment…':'Sandali lang…'; msg.className='ok';
    const r=await api(mode==='login'?'/api/login':'/api/register',{user:u,pass:pw});
    $('acct-go').disabled=false;
    if(!r.ok){ msg.textContent=r.err||'May problema.'; msg.className=''; return; }
    acctSetSession(r.token,r.user,r.color,$('ws-remember').checked);
    msg.textContent='';
    showLogged();          // → character select panel (spec §10)
  };
  $('acct-pass').addEventListener('keydown',e=>{ if(e.key==='Enter') $('acct-go').click(); });
  /* "play without account": resume the local save if one exists, otherwise create a hero */
  $('acct-skip').style.cursor='pointer';
  $('acct-skip').onclick=()=>{
    if(S.cls){ $('welcome-screen').classList.add('hidden'); bootFromSave(); }
    else $('btn-start').click();
  };
  applyLang(); showLogged();
}
/* boot the world from an adopted save (mirrors the auto-load path) */
function bootFromSave(){
  if(S.px!=null&&S.px>=0&&S.px<=WORLD_W&&S.py>=0&&S.py<=WORLD_H&&walkable(S.px,S.py,player.r)){ player.x=S.px; player.z=S.py; }
  initForClass();
  started=true;
  computeStats();
  if(S.hp<=0||S.hp>P.maxHp) S.hp=P.maxHp;
  updateHUD(); renderForge();
  if(S.level>=5){ $('btn-autoforage').classList.remove('hidden'); $('btn-autoforage').classList.toggle('on',S.autoForage); }
  checkPasalubong();
}
function ccInitPreview(){
  const cv=$('cc-canvas');
  if(!ccRenderer){
    ccRenderer=new THREE.WebGLRenderer({canvas:cv, antialias:true, alpha:true});
    ccRenderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
    ccRenderer.setSize(cv.clientWidth||360, cv.clientHeight||420, false);
    ccRenderer.outputColorSpace=THREE.SRGBColorSpace;
    ccScene=new THREE.Scene();
    ccScene.add(new THREE.HemisphereLight(0xd8e8ff, 0x4a3a64, 1.3));
    const key=new THREE.DirectionalLight(0xffe9c0, 2.2); key.position.set(3,5,4); ccScene.add(key);
    const rim=new THREE.DirectionalLight(0xc08aff, 1.2); rim.position.set(-3,3,-4); ccScene.add(rim);
    ccCam=new THREE.PerspectiveCamera(38, (cv.clientWidth||360)/(cv.clientHeight||420), 0.1, 50);
    ccCam.position.set(0,2.1,6.2); ccCam.lookAt(0,1.5,0);
    // ritual pedestal
    const ped=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.7,0.25,20),
      new THREE.MeshStandardMaterial({color:0x3a2f5a,roughness:0.6,metalness:0.3}));
    ped.position.y=-0.12; ccScene.add(ped);
    const rim2=new THREE.Mesh(new THREE.TorusGeometry(1.5,0.05,6,24),
      new THREE.MeshBasicMaterial({color:0xf2b134}));
    rim2.rotation.x=Math.PI/2; rim2.position.y=0.02; ccScene.add(rim2);
    // drag to rotate
    let dragging=false,lastX=0;
    cv.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;cv.setPointerCapture(e.pointerId);});
    cv.addEventListener('pointermove',e=>{ if(dragging){ ccYaw+=(e.clientX-lastX)*0.012; lastX=e.clientX; } });
    cv.addEventListener('pointerup',()=>dragging=false);
  }
  ccRebuildMesh();
  cancelAnimationFrame(ccRAF);
  (function ccLoop(){
    ccRAF=requestAnimationFrame(ccLoop);
    if(ccMesh){ ccMesh.rotation.y=ccYaw+Math.PI; ccYaw+=0.003; }
    ccRenderer.render(ccScene,ccCam);
  })();
}
function ccRebuildMesh(){
  if(ccMesh){ ccScene.remove(ccMesh); ccMesh=null; }
  const cls=charDraft.cls||'babaylan';
  ccMesh=buildHero(cls,{
    gender:charDraft.gender,
    skin:SKIN_TONES[charDraft.skin],
    hairColor:HAIR_COLORS[charDraft.hairColor],
    hairStyle:charDraft.hairStyle,
    eyeColor:charDraft.eyeColor,
    face:charDraft.face,
  });
  ccMesh.traverse(o=>{ if(o.isMesh&&o.material._isFx) o.visible=false; });
  ccScene.add(ccMesh);
  /* class-reactive ritual aura (spec §7) */
  const aura=CLASS_AURA[charDraft.cls];
  const el=$('cc-aura'), lb=$('cc-fxlabel');
  if(aura&&el){ el.style.background=`radial-gradient(circle, ${aura.c} 0%, transparent 62%)`; if(lb) lb.textContent='✦ '+aura.t+' ✦'; }
  else if(el){ el.style.background='radial-gradient(circle, rgba(242,177,52,.28) 0%, transparent 62%)'; if(lb) lb.textContent=''; }
}
/* ================================================================
   4-STAGE CREATION: 0 LANDAS · 1 ANYO · 2 DIWA · 3 AGIMAT
   ================================================================ */
const CC_STEPS=[
  {t:'Piliin ang Kasarian',        k:'KASARIAN'},
  {t:'Hubugin ang Iyong Anyo',     k:'ANYO'},
  {t:'Piliin ang Iyong Landas',    k:'LANDAS'},
  {t:'Piliin ang Iyong Diwa',      k:'DIWA'},
  {t:'Tanggapin ang Iyong Agimat', k:'AGIMAT'},
  {t:'Simulan ang Paglalakbay',    k:'SIMULA'},
];
let ccStep=0;
function ccGotoStep(n){
  ccStep=Math.max(0,Math.min(5,n));
  for(let i=0;i<6;i++) $('cc-step-'+i).classList.toggle('hidden',i!==ccStep);
  $('cc-step-title').textContent=CC_STEPS[ccStep].t;
  $('cc-stepper').querySelectorAll('span').forEach((sp,i)=>{
    sp.classList.toggle('on',i===ccStep);
    sp.classList.toggle('done',i<ccStep);
    sp.textContent=(i<ccStep?'✦ ':i===ccStep?'◆ ':'◇ ')+CC_STEPS[i].k;
  });
  $('cc-back').style.visibility=ccStep===0?'hidden':'visible';
  $('cc-next').classList.toggle('hidden',ccStep===5);
  $('cc-confirm').classList.toggle('hidden',ccStep!==5);
  if(ccStep===5) ccRenderSummary();
  ccValidateStep();
}
function ccStepOK(){
  if(ccStep===0) return !!charDraft.gender;
  if(ccStep===1) return true;
  if(ccStep===2) return !!charDraft.cls;
  if(ccStep===3) return !!charDraft.diwa;
  if(ccStep===4) return !!charDraft.agimat0;
  if(ccStep===5) return charDraft.name.trim().length>=2 && !!charDraft.cls && !!charDraft.diwa && !!charDraft.agimat0;
  return false;
}
function ccValidateStep(){
  const ok=ccStepOK();
  $('cc-next').disabled=!ok;
  if(ccStep===5){
    $('cc-confirm').disabled=!ok;
    $('cc-confirm').textContent=ok?'⚔️ SIMULAN ANG PAGLALAKBAY — '+charDraft.name.trim().toUpperCase():'⚔️ SIMULAN ANG PAGLALAKBAY';
  }
}
function ccRenderSummary(){
  const el=$('cc-summary'); if(!el) return;
  const C=charDraft.cls?CLASSES[charDraft.cls]:null;
  const dw=DIWA_DEFS.find(d=>d.id===charDraft.diwa);
  const ag=AGIMAT0_DEFS.find(a=>a.id===charDraft.agimat0);
  const adv=(window._advDisplay&&charDraft.cls)?window._advDisplay(charDraft.cls):null;
  const row=(k,v)=>`<div class="cc2-row"><span>${k}</span><b>${v}</b></div>`;
  el.innerHTML=C?
    row('Kasarian', charDraft.gender==='female'?'Babae':'Lalaki')+
    row('Landas', CLASS_TAGALOG[charDraft.cls].tl+(adv?' ('+adv+')':''))+
    row('Buhok', (HAIR_STYLES[charDraft.hairStyle]?HAIR_STYLES[charDraft.hairStyle].name:'—'))+
    row('Diwa', dw?dw.icon+' '+dw.name:'—')+
    row('Agimat', ag?ag.icon+' '+ag.name:'—')+
    row('Simula', '🏮 Barangay Liwanag — Banaue Highlands')
    :'';
}
function showCharCreate(){
  $('char-create').classList.remove('hidden');
  /* ---- STEP 0: LANDAS (class banners) ---- */
  const clEl=$('cc-classes'); clEl.innerHTML='';
  for(const [id,C] of Object.entries(CLASSES)){
    const b=document.createElement('button');
    b.innerHTML=`<img src="${C.portrait}" alt="" loading="lazy"><span>${CLASS_TAGALOG[id].tl}</span>`;
    if(charDraft.cls===id) b.classList.add('sel');
    b.onclick=()=>{
      clEl.querySelectorAll('button').forEach(x=>x.classList.remove('sel'));
      b.classList.add('sel');
      charDraft.cls=id;
      const sk=(GAME_DATA.skills&&GAME_DATA.skills.skills)?Object.values(GAME_DATA.skills.skills).filter(s2=>s2.classId===id).slice(0,3):C.skills;
      $('cc-classinfo').innerHTML=`<b style="color:var(--gold-hi)">${CLASS_TAGALOG[id].tl}</b> · ${C.role} · ${C.weapon}<br>${CLASS_TAGALOG[id].desc}<br>
        <span style="opacity:.8">Mga unang kasanayan: ${C.skills.map(s2=>s2.icon+' '+s2.name).join(' · ')}</span>
        ${id==='alim'?'<br><i style="opacity:.7">(Ang Alim ay laging matandang pantas — may sariling anyo.)</i>':''}`;
      ccRebuildMesh(); ccValidateStep(); ccRenderSummary();
    };
    clEl.appendChild(b);
  }
  /* ---- STEP 0: KASARIAN (gender cards) + STEP 5: pangalan ---- */
  const nameEl=$('cc-name');
  nameEl.value=charDraft.name||'';
  nameEl.oninput=()=>{ charDraft.name=nameEl.value; ccValidateStep(); };
  $('cc-dice').onclick=()=>{
    const pool=FILIPINO_NAMES[charDraft.gender];
    charDraft.name=pool[Math.floor(Math.random()*pool.length)];
    nameEl.value=charDraft.name; ccValidateStep(); ccRenderSummary();
  };
  $('cc-gender').querySelectorAll('button').forEach(b=>b.onclick=()=>{
    $('cc-gender').querySelectorAll('button').forEach(x=>x.classList.remove('sel'));
    b.classList.add('sel');
    charDraft.gender=b.dataset.v;
    /* gender-appropriate default hair (custom pipeline: f-hairs muna sa babae) */
    charDraft.hairStyle=0;
    ccRebuildMesh(); ccValidateStep();
  });
  /* ---- STEP 1: ANYO — randomize ---- */
  const rndBtn=$('cc-random');
  if(rndBtn) rndBtn.onclick=()=>{
    charDraft.skin=Math.floor(Math.random()*SKIN_TONES.length);
    charDraft.hairStyle=Math.floor(Math.random()*HAIR_STYLES.length);
    charDraft.hairColor=Math.floor(Math.random()*HAIR_COLORS.length);
    charDraft.eyeColor=Math.floor(Math.random()*EYE_COLORS.length);
    charDraft.face=Math.floor(Math.random()*4);
    showCharCreate._syncAnyo&&showCharCreate._syncAnyo();
    ccRebuildMesh();
  };
  /* eye color swatches */
  const eyeEl=$('cc-eyecolor');
  if(eyeEl){ eyeEl.innerHTML='';
    EYE_COLORS.forEach((c,i)=>{
      const b=document.createElement('button');
      b.style.background='#'+c.toString(16).padStart(6,'0');
      if(i===charDraft.eyeColor)b.classList.add('sel');
      b.onclick=()=>{ eyeEl.querySelectorAll('button').forEach(x=>x.classList.remove('sel')); b.classList.add('sel');
        charDraft.eyeColor=i; ccRebuildMesh(); };
      eyeEl.appendChild(b);
    });
  }
  /* FACE presets (concept: preset-based faces) */
  const faceEl=$('cc-face');
  if(faceEl){ faceEl.innerHTML='';
    const FACES=['🙂 Mabait','😤 Determinado','😌 Mahinahon','😠 Mabangis'];
    FACES.forEach((nm,i)=>{
      const b=document.createElement('button');
      b.innerHTML='<img src="assets/faces/face_'+(i+1)+'.png" alt="" loading="lazy"><span>'+nm.split(' ')[1]+'</span>';
      b.className='cc2-face';
      if(i===charDraft.face)b.classList.add('sel');
      b.onclick=()=>{ faceEl.querySelectorAll('button').forEach(x=>x.classList.remove('sel')); b.classList.add('sel');
        charDraft.face=i; ccRebuildMesh(); };
      faceEl.appendChild(b);
    });
  }
  const skinEl=$('cc-skin'); skinEl.innerHTML='';
  SKIN_TONES.forEach((c,i)=>{
    const b=document.createElement('button');
    b.style.background='#'+c.toString(16).padStart(6,'0');
    if(i===charDraft.skin)b.classList.add('sel');
    b.onclick=()=>{ skinEl.querySelectorAll('button').forEach(x=>x.classList.remove('sel')); b.classList.add('sel');
      charDraft.skin=i; ccRebuildMesh(); };
    skinEl.appendChild(b);
  });
  const hairEl=$('cc-hair'); hairEl.innerHTML='';
  HAIR_STYLES.forEach((h,i)=>{
    const b=document.createElement('button');
    b.textContent=h.name;
    if(i===charDraft.hairStyle)b.classList.add('sel');
    b.onclick=()=>{ hairEl.querySelectorAll('button').forEach(x=>x.classList.remove('sel')); b.classList.add('sel');
      charDraft.hairStyle=i; ccRebuildMesh(); };
    hairEl.appendChild(b);
  });
  const hcEl=$('cc-haircolor'); hcEl.innerHTML='';
  HAIR_COLORS.forEach((c,i)=>{
    const b=document.createElement('button');
    b.style.background='#'+c.toString(16).padStart(6,'0');
    if(i===charDraft.hairColor)b.classList.add('sel');
    b.onclick=()=>{ hcEl.querySelectorAll('button').forEach(x=>x.classList.remove('sel')); b.classList.add('sel');
      charDraft.hairColor=i; ccRebuildMesh(); };
    hcEl.appendChild(b);
  });
  showCharCreate._syncAnyo=()=>{
    [['cc-skin',charDraft.skin],['cc-haircolor',charDraft.hairColor],['cc-eyecolor',charDraft.eyeColor]].forEach(([id,v])=>{
      const el=$(id); if(!el) return;
      el.querySelectorAll('button').forEach((x,i)=>x.classList.toggle('sel',i===v));
    });
    const he=$('cc-hair'); if(he) he.querySelectorAll('button').forEach((x,i)=>x.classList.toggle('sel',i===charDraft.hairStyle));
    const fe=$('cc-face'); if(fe) fe.querySelectorAll('button').forEach((x,i)=>x.classList.toggle('sel',i===charDraft.face));
  };
  /* ---- STEP 2: DIWA ---- */
  const dwEl=$('cc-diwa'); dwEl.innerHTML='';
  DIWA_DEFS.forEach(d=>{
    const b=document.createElement('button'); b.className='cc-pick';
    b.innerHTML=`<em>${d.icon}</em><b>${d.name}</b><small>${d.fx}</small>`;
    if(charDraft.diwa===d.id) b.classList.add('sel');
    b.onclick=()=>{
      dwEl.querySelectorAll('.cc-pick').forEach(x=>x.classList.remove('sel'));
      b.classList.add('sel'); charDraft.diwa=d.id;
      $('cc-diwainfo').innerHTML=`<b style="color:var(--gold-hi)">${d.icon} Diwa ng ${d.name}</b> — <i>${d.tl}</i><br>${d.desc}<br><span style="opacity:.8">Biyaya: ${d.fx}</span>`;
      ccValidateStep();
    };
    dwEl.appendChild(b);
  });
  /* ---- STEP 3: AGIMAT ---- */
  const agEl=$('cc-agimat'); agEl.innerHTML='';
  AGIMAT0_DEFS.forEach(a=>{
    const b=document.createElement('button'); b.className='cc-pick';
    b.innerHTML=`<em>${a.icon}</em><b>${a.cat}</b><small>${a.fx}</small>`;
    if(charDraft.agimat0===a.id) b.classList.add('sel');
    b.onclick=()=>{
      agEl.querySelectorAll('.cc-pick').forEach(x=>x.classList.remove('sel'));
      b.classList.add('sel'); charDraft.agimat0=a.id;
      $('cc-agimatinfo').innerHTML=`<b style="color:var(--gold-hi)">${a.icon} ${a.name}</b> · ${a.cat}<br>${a.desc}<br><span style="opacity:.8">Biyaya: ${a.fx}</span>`;
      ccRenderSummary(); ccValidateStep();
    };
    agEl.appendChild(b);
  });
  /* ---- nav ---- */
  $('cc-back').onclick=()=>ccGotoStep(ccStep-1);
  $('cc-next').onclick=()=>{ if(ccStepOK()) ccGotoStep(ccStep+1); };
  /* ---- confirm → birth cinematic (spec §9) ---- */
  $('cc-confirm').onclick=()=>{
    if($('cc-confirm').disabled) return;
    S.name=charDraft.name.trim();
    S.app={gender:charDraft.gender, skin:charDraft.skin, hairStyle:charDraft.hairStyle, hairColor:charDraft.hairColor, eyeColor:charDraft.eyeColor??0, face:charDraft.face??0};
    S.diwa=charDraft.diwa; S.agimat0=charDraft.agimat0;
    cancelAnimationFrame(ccRAF);
    $('char-create').classList.add('hidden');
    ccBirthCinematic();
  };
  ccInitPreview();
  ccGotoStep(0);
}
function ccBirthCinematic(){
  const cine=$('cc-cine'), card=$('cine-card');
  cine.classList.remove('hidden'); card.classList.add('hidden');
  const C=CLASSES[charDraft.cls];
  const dw=DIWA_DEFS.find(d=>d.id===charDraft.diwa);
  const ag=AGIMAT0_DEFS.find(a=>a.id===charDraft.agimat0);
  setTimeout(()=>{
    card.innerHTML=`
      <div class="cine-name">${S.name}</div>
      ${CLASS_TAGALOG[charDraft.cls].tl} · ${C.role}<br>
      ${dw?dw.icon+' Diwa ng '+dw.name:''}<br>
      ${ag?ag.icon+' '+ag.name:''}<br>
      <div class="cine-final">Ang iyong alamat ay nagsisimula.</div>
      <button class="ws-start" id="cine-enter">🏮 PASUKIN ANG BARANGAY LIWANAG</button>`;
    card.classList.remove('hidden');
    $('cine-enter').onclick=()=>{
      cine.classList.add('hidden');
      chooseClass(charDraft.cls);
    };
  }, 2600);
}
function showClassSelect(){ showWelcome(); } // legacy entry point → new flow
function chooseClass(id){
  S.cls=id;
  $('class-select').classList.add('hidden');
  initForClass();
  started=true;
  computeStats(); S.hp=P.maxHp;
  updateHUD(); save();
  showModal(`
    <div class="modal-emoji">🏮</div>
    <div class="modal-title">Maligayang pagdating, ${S.name||CLASSES[id].name}!</div>
    <div class="modal-body" style="text-align:left">
      🕹️ <b>Move</b> — drag LEFT side of screen (or WASD).<br>
      🎥 <b>Camera</b> — drag RIGHT side to orbit; scroll to zoom.<br>
      🗡️ <b>Attack</b> — big red button (or Space).<br>
      ✨ <b>Skills</b> — three class skills (or 1/2/3).<br>
      💨 <b>Dodge</b> — dash with invincibility (or Shift).<br>
      ⚔️ <b>Loot</b> — enemies drop gold & gear. Rare loot shines with a beam of light!<br>
      🏮 <b>Tiangge</b> — visit the market tent for permanent Agimats.<br><br>
      <span class="mut">Tabi-tabi po… the spirits are waiting.</span>
    </div>
    <button class="modal-btn" onclick="closeModal()">Begin the Journey ✨</button>`);
}
function initForClass(){
  const C=CLASSES[S.cls];
  $('hud-class').textContent=S.name?`${S.name} · ${C.name}`:C.name;
  $('hud-portrait').src=C.portrait;
  $('minimap-wrap').classList.remove('hidden');
  camFollowY=groundY(player.x,player.z);
  for(let i=0;i<3;i++){
    const btn=$('btn-skill'+(i+1));
    btn.querySelector('.sk-ic').textContent=C.skills[i].icon;
    btn.title=C.skills[i].name+' — '+C.skills[i].desc;
  }
  // hero mesh
  if(player.mesh) scene.remove(player.mesh);
  player.mesh=buildHero(S.cls);
  scene.add(player.mesh);
  if(!player.shieldMesh){
    player.shieldMesh=new THREE.Mesh(new THREE.SphereGeometry(2.2,12,10),
      new THREE.MeshBasicMaterial({color:0x39c2b4,transparent:true,opacity:0.2,depthWrite:false}));
    player.shieldMesh.material._isFx=true;
    scene.add(player.shieldMesh);
  }
  player.shieldMesh.visible=false;
  // tent label
  if(!tentLabel){
    tentLabel=document.createElement('div');
    tentLabel.className='flabel tentlbl';
    tentLabel.textContent='🏮 Grand Tiangge';
    labelsEl.appendChild(tentLabel);
  }
  for(let i=0;i<MAX_ENEMIES;i++) spawnEnemy(true);
}

const hadSave=load();
/* logout / "mag-log in" from settings sets this flag so the reload lands on the welcome screen */
const _forceWelcome=(()=>{ try{ if(localStorage.getItem('agimat_force_welcome')==='1'){ localStorage.removeItem('agimat_force_welcome'); return true; } }catch(e){} return false; })();
/* ---- BOOT DECISION (account-trap fix + §11 cloud-authoritative) ----
   OLD BUG: any local save auto-resumed straight into the world — a GUEST
   save trapped players who wanted to log in (reload → guest again), and a
   LOGGED-IN boot used the possibly-stale local copy instead of the cloud.
   NEW:
     · logged in  → reconcile with cloud first (4s cap), then enter world
     · guest+save → WELCOME screen: login is always reachable; resuming
                    the guest hero stays one tap ("Maglaro nang walang account")
     · otherwise  → welcome/creation as before                            */
(async()=>{
  const canResume=hadSave&&S.cls&&!_forceWelcome;
  if(canResume&&ACCT.token){
    try{
      const r=await Promise.race([api('/api/load',{token:ACCT.token}),
                                  new Promise(res=>setTimeout(()=>res(null),4000))]);
      if(r&&r.ok&&r.save){
        try{ const cv=JSON.parse(r.save);
          if(cv&&cv.cls&&(cv.lastSeen||0)>=(S.lastSeen||0)) adoptSave(r.save);   // cloud wins when newer
        }catch(e){}
      } else if(r&&!r.ok&&/log in/i.test(r.err||'')){
        acctLogout(); showClassSelect(); return;      // expired session → welcome, never silently guest
      }
    }catch(e){}
    bootFromSave(); return;
  }
  showClassSelect();
})();
setInterval(()=>{ if(started) save(); },5000);
window.addEventListener('beforeunload',()=>{ if(started) save(); });
requestAnimationFrame(animate);

/* ================================================================
   KA-PARTY v2 — 5-player online co-op with SHARED ENEMIES + CHAT
   Host-authoritative: the first player simulates all monsters and
   broadcasts their state at 10 Hz; guests see ghost enemies, deal
   damage through the host, and share kill rewards by contribution.
   ================================================================ */
(function netInit(){
  const NET={ws:null, id:0, joined:false, isHost:false, retry:2000, ch:0};
  const remotes=new Map(); // id -> remote player
  window._kaParty=remotes;
  window._net={ send:(o)=>wsSend(o), myId:()=>NET.id, joined:()=>NET.joined, ch:()=>NET.ch||0 };
  let nextNid=1;
  const ghostByNid=new Map(); // guest side: nid -> ghost enemy object

  /* ---------- guest/host hooks used by the game core ---------- */
  window._netIsGuest=()=> NET.joined && !NET.isHost && remotes.size>0;
  window._netSpawned=(en)=>{ if(NET.isHost){ en.nid=nextNid++; en.contribs=new Set([NET.id]); } };
  window._netRemoved=(en)=>{ if(en.nid) ghostByNid.delete(en.nid); };
  window._netMarkContrib=(en)=>{ if(NET.isHost&&en.contribs) en.contribs.add(NET.id); };
  window._netHit=(en,dmg)=>{ wsSend({t:'ehit', nid:en.nid, dmg}); };            // guest → host
  window._netDmg=(rid,dmg,opts)=>{ if(NET.isHost) wsSend({t:'pdmg', to:rid, dmg, opts}); }; // host → that player
  window._netOnKill=(en)=>{                                                     // host announces; returns "do I get loot?"
    if(!NET.joined||!NET.isHost||!en.nid) return true;
    wsSend({t:'ekill', nid:en.nid, x:+en.x.toFixed(1), z:+en.z.toFixed(1), contribs:[...(en.contribs||[])]});
    return !en.contribs || en.contribs.has(NET.id);
  };

  /* ---------- ui: party pill + chat box ---------- */
  const pill=document.createElement('div');
  pill.id='party-pill';
  pill.style.cssText='position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:40;background:rgba(20,14,34,.72);border:1px solid rgba(242,177,52,.4);color:#ffd94a;font:600 12px system-ui;padding:4px 12px;border-radius:999px;backdrop-filter:blur(6px);pointer-events:none;display:none';
  document.body.appendChild(pill);
  function updatePill(){
    pill.style.display = NET.joined ? 'block':'none';
    pill.textContent='📡 CH'+(NET.ch||'—')+' · 🟢 '+(1+remotes.size)+'/5'+(NET.isHost&&remotes.size?' · 👑':'');
  }
  /* ---- chat: tabbed (world/nearby/friends/system) + collapsible + voice ---- */
  const chatWrap=document.createElement('div');
  chatWrap.id='chat-wrap';
  chatWrap.style.display='none';           // hidden on the landing page; shown once the game starts
  chatWrap.innerHTML=
    '<div id="chat-tabs">'+
      '<button class="chat-tab sel" data-ch="all">🌏 MUNDO</button>'+
      '<button class="chat-tab" data-ch="near">📍 MALAPIT</button>'+
      '<button class="chat-tab" data-ch="f">💞 KAIBIGAN</button>'+
      '<button class="chat-tab" data-ch="sys">📜 SISTEMA</button>'+
      '<div id="chat-mini"></div>'+
      '<button id="chat-voice" title="Voice message (pindutin nang matagal)">🎙️</button>'+
      '<button id="chat-collapse" title="I-collapse">▼</button>'+
    '</div>'+
    '<div id="chat-log"></div>'+
    '<div id="chat-inrow"><input id="chat-in" maxlength="120" placeholder="Mag-chat… (Kamusta, ka-party!)"><button id="chat-send">➤</button></div>';
  document.body.appendChild(chatWrap);
  const chatLog=chatWrap.querySelector('#chat-log');
  const chatIn=chatWrap.querySelector('#chat-in');
  const chatMini=chatWrap.querySelector('#chat-mini');
  let chatCh='all';                                   // active tab
  const NEAR_DIST=45;                                 // world units for "nearby"
  const CH_LABEL={all:'🌏',near:'📍',f:'💞',sys:'📜'};
  /* collapse / expand */
  if(localStorage.getItem('agimat_chat_col')==='1') chatWrap.classList.add('collapsed');
  chatWrap.querySelector('#chat-collapse').addEventListener('click',e=>{
    e.stopPropagation();
    chatWrap.classList.toggle('collapsed');
    localStorage.setItem('agimat_chat_col', chatWrap.classList.contains('collapsed')?'1':'0');
  });
  chatMini.addEventListener('click',()=>{ chatWrap.classList.remove('collapsed'); localStorage.setItem('agimat_chat_col','0'); });
  /* tabs: filter which lines show */
  function applyChFilter(){
    for(const d of chatLog.children){
      const c=d.dataset.ch||'all';
      d.style.display=(chatCh==='all' ? c!=='sys' || true : c===chatCh || (chatCh!=='sys'&&c==='sys')) ? '' : 'none';
      /* rule: ALL tab shows everything; other tabs show own channel + system */
      if(chatCh!=='all') d.style.display=(c===chatCh||c==='sys'&&chatCh==='sys')?'':'none';
      if(chatCh==='sys') d.style.display=c==='sys'?'':'none';
    }
    chatLog.scrollTop=chatLog.scrollHeight;
  }
  chatWrap.querySelectorAll('.chat-tab').forEach(b=>b.addEventListener('click',()=>{
    chatWrap.querySelectorAll('.chat-tab').forEach(x=>x.classList.toggle('sel',x===b));
    chatCh=b.dataset.ch;
    b.querySelector('.unread')?.remove();
    chatIn.placeholder = chatCh==='f' ? 'Mensahe sa mga kaibigan…'
      : chatCh==='near' ? 'Mensahe sa mga kalapit…'
      : chatCh==='sys' ? '— sistema lamang: walang chat dito —'
      : 'Mag-chat… (Kamusta, ka-party!)';
    chatIn.disabled = chatCh==='sys';
    applyChFilter();
  }));
  function markUnread(ch){
    if(ch===chatCh||chatCh==='all') return;
    const tab=chatWrap.querySelector(`.chat-tab[data-ch="${ch}"]`);
    if(tab&&!tab.querySelector('.unread')){ const u=document.createElement('span'); u.className='unread'; tab.appendChild(u); }
  }
  function chatMsg(name,msg,sys,color,ch,audioSrc){
    ch=ch||(sys?'sys':'all');
    const d=document.createElement('div');
    d.className='chat-line'+(sys?' sys':'');
    d.dataset.ch=ch;
    if(!sys&&ch!=='sys'){ const tg=document.createElement('span'); tg.className='ch-tag '+ch; tg.textContent=CH_LABEL[ch]; d.appendChild(tg); }
    if(sys) d.appendChild(document.createTextNode(msg));
    else {
      const b=document.createElement('b'); b.textContent=name+': '; if(color) b.style.color=color; d.appendChild(b);
      if(audioSrc){ const a=document.createElement('audio'); a.controls=true; a.src=audioSrc; d.appendChild(a); }
      else d.appendChild(document.createTextNode(msg));
    }
    chatLog.appendChild(d);
    while(chatLog.children.length>60) chatLog.firstChild.remove();
    /* respect active tab filter */
    if(chatCh!=='all' && ch!==chatCh && !(chatCh==='sys'&&ch==='sys')) d.style.display='none';
    if(chatCh==='sys' && ch!=='sys') d.style.display='none';
    chatLog.scrollTop=chatLog.scrollHeight;
    d.style.opacity='1';
    setTimeout(()=>{ d.style.opacity='0.45'; }, 12000);
    markUnread(ch);
    /* collapsed single-line preview */
    chatMini.innerHTML='';
    const pb=document.createElement('b'); pb.textContent=sys?'📜':(name+':'); if(color)pb.style.color=color;
    chatMini.appendChild(pb); chatMini.appendChild(document.createTextNode(' '+(audioSrc?'🎙️ voice message':msg)));
  }
  /* system feed: loot / xp / level — game code calls window._chatSys */
  window._chatSys=(msg,kind)=>{ try{ chatMsg(null,msg,true,null,'sys'); const last=chatLog.lastChild; if(last&&kind) last.classList.add(kind); }catch(e){} };
  function sendChat(){
    const v=chatIn.value.trim();
    if(v&&chatCh!=='sys'){
      wsSend({t:'chat', msg:v, ch:chatCh});
      chatMsg(S.name||'Ako', v, false, ACCT.color||'#7df0ff', chatCh);
    }
    chatIn.value=''; chatIn.blur();
  }
  chatWrap.querySelector('#chat-send').addEventListener('click',sendChat);
  /* ---- voice chat: hold 🎙️ to record (max 8s), release to send ---- */
  (function voiceChat(){
    const vb=chatWrap.querySelector('#chat-voice');
    let rec=null, chunks=[], stopTimer=0;
    async function start(e){
      e.preventDefault();
      if(rec) return;
      try{
        const stream=await navigator.mediaDevices.getUserMedia({audio:true});
        chunks=[];
        rec=new MediaRecorder(stream,{mimeType:MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':''});
        rec.ondataavailable=ev=>{ if(ev.data.size) chunks.push(ev.data); };
        rec.onstop=()=>{
          stream.getTracks().forEach(t=>t.stop());
          const blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'});
          rec=null; vb.classList.remove('rec');
          if(blob.size<600){ return; }                       // too short
          if(blob.size>260000){ toast('🎙️ Masyadong mahaba ang voice message.','warn'); return; }
          const fr=new FileReader();
          fr.onload=()=>{ 
            wsSend({t:'voice', data:fr.result});
            chatMsg(S.name||'Ako', '', false, ACCT.color||'#7df0ff', chatCh==='sys'?'all':chatCh, fr.result);
          };
          fr.readAsDataURL(blob);
        };
        rec.start();
        vb.classList.add('rec');
        stopTimer=setTimeout(()=>{ if(rec&&rec.state==='recording') rec.stop(); }, 8000);
      }catch(err){ toast('🎙️ Hindi ma-access ang mikropono.','warn'); }
    }
    function stop(){ clearTimeout(stopTimer); if(rec&&rec.state==='recording') rec.stop(); }
    vb.addEventListener('pointerdown',start);
    vb.addEventListener('pointerup',stop);
    vb.addEventListener('pointerleave',stop);
  })();
  chatIn.addEventListener('keydown',e=>{
    e.stopPropagation();                                  // don't trigger game hotkeys while typing
    if(e.key==='Enter') sendChat();
    if(e.key==='Escape') chatIn.blur();
  });
  chatIn.addEventListener('keyup',e=>e.stopPropagation());
  window.addEventListener('keydown',e=>{
    if(e.key==='Enter' && document.activeElement!==chatIn && started){ e.preventDefault(); chatIn.focus(); }
  });

  /* ---------- remote players ---------- */
  function netApp(a){
    a=a||{gender:'male',skin:1,hairStyle:0,hairColor:0};
    return {gender:a.gender||'male',
      skin:SKIN_TONES[a.skin??1]||SKIN_TONES[1],
      hairColor:HAIR_COLORS[a.hairColor??0]||HAIR_COLORS[0],
      hairStyle:a.hairStyle??0};
  }
  function tagHTML(name,level,title,gtag){
    return (title?'<i style="display:block;font-size:9px;opacity:.85;font-style:normal;color:#ffd94a">「'+title+'」</i>':'')
      +(gtag?'<b style="color:#ff9a5e">⛨'+gtag+'</b> ':'')+'🧑‍🤝‍🧑 '+name+' · Lv'+level;
  }
  function addRemote(p){
    if(remotes.has(p.id)) removeRemote(p.id);
    const mesh=buildHero(p.cls||'mandirigma', netApp(p.app));
    mesh.position.set(p.x,groundY(p.x,p.z),p.z);
    scene.add(mesh);
    const tag=document.createElement('div');
    tag.className='pname';
    tag.innerHTML=tagHTML(p.name,p.level||1,p.title||'',p.gtag||'');
    if(p.color) tag.style.color=p.color;
    labelsEl.appendChild(tag);
    const hpbar=document.createElement('div');
    hpbar.className='phpbar'; hpbar.innerHTML='<i></i>'; hpbar.style.display='none';
    labelsEl.appendChild(hpbar);
    remotes.set(p.id,{name:p.name,title:p.title||'',gtag:p.gtag||'',cls:p.cls,x:p.x,z:p.z,tx:p.x,tz:p.z,yaw:p.yaw||0,tyaw:p.yaw||0,mv:0,atkAnim:0,bob:0,level:p.level||1,hpPct:p.hp==null?100:p.hp,mesh,tag,hpbar});
    updatePill();
  }
  function removeRemote(id){
    const r=remotes.get(id); if(!r) return;
    scene.remove(r.mesh); r.tag.remove(); if(r.hpbar) r.hpbar.remove();
    remotes.delete(id);
    updatePill();
  }

  /* ---------- shared enemies: host broadcast / guest ghosts ---------- */
  function hostBroadcastEnemies(){
    const list=[];
    for(const en of enemies){
      if(en.dungeon) continue;                       // dungeon = personal instance, never shared
      if(!en.nid) { en.nid=nextNid++; en.contribs=new Set([NET.id]); }
      list.push({n:en.nid,k:en.key,x:+en.x.toFixed(1),z:+en.z.toFixed(1),
        y:+(en.mesh?en.mesh.rotation.y:0).toFixed(2),h:en.hp,m:en.maxHp,
        st:en.state==='chase'?1:0,sl:+(en.stealth||0).toFixed(2),w:en.windup>0?1:0,sw:en.swoopT>0?1:0});
    }
    wsSend({t:'es', list});
  }
  function guestApplyEnemies(list){
    const seen=new Set();
    for(const d of list){
      seen.add(d.n);
      let en=ghostByNid.get(d.n);
      if(!en){
        const def=ENEMY_DEFS[d.k]; if(!def) continue;
        const mesh=buildEnemyMesh(d.k);
        mesh.position.set(d.x,groundY(d.x,d.z),d.z);
        scene.add(mesh);
        const bar=document.createElement('div');
        bar.className='ebar'+(def.tier==='Elite'?' elite':'')+(def.boss?' boss':''); bar.innerHTML='<i></i>'; bar.style.display='none';
        labelsEl.appendChild(bar);
        en={key:d.k,nid:d.n,remote:true,x:d.x,z:d.z,tx:d.x,tz:d.z,tyaw:d.y,hp:d.h,maxHp:d.m,
          state:'idle',cd:0,flash:0,wt:0,wx:d.x,wz:d.z,windup:0,stealth:0,stunUntil:0,rootUntil:0,
          chargeT:0,chargeAng:0,retreatT:0,swoopT:0,mesh,bar,animT:rnd(0,9)};
        enemies.push(en); ghostByNid.set(d.n,en);
        attachNameplate(en);
        if(ENEMY_DEFS[d.k].boss) toast('🦇 LUMILIPAD ANG MANANANGGAL sa Bulkan Apolaki!','warn');
      }
      en.tx=d.x; en.tz=d.z; en.tyaw=d.y;
      if(d.h<en.hp) en.flash=0.15;
      en.hp=d.h; en.maxHp=d.m;
      en.state=d.st?'chase':'idle';
      en.stealth=d.sl||0;
      en.windup=d.w?0.3:0;
      en.swoopT=d.sw?0.5:0;
    }
    /* despawn ghosts the host no longer has */
    for(const [nid,en] of [...ghostByNid]){
      if(!seen.has(nid)){ ghostByNid.delete(nid); if(enemies.includes(en)) removeEnemy(en); }
    }
  }
  function clearGhosts(){
    for(const [nid,en] of [...ghostByNid]){ ghostByNid.delete(nid); if(enemies.includes(en)) removeEnemy(en); }
  }
  function becomeHost(){
    if(NET.isHost) return;
    NET.isHost=true; NET.handedOff=false;
    /* promote ghosts to real enemies so the world doesn't blink */
    for(const [nid,en] of ghostByNid){ en.remote=false; en.contribs=new Set([NET.id]); }
    ghostByNid.clear();
    if(remotes.size) chatMsg(null,'👑 Ikaw na ang world host.',true);
    updatePill();
  }

  /* ---------- socket ---------- */
  function wsSend(o){ if(NET.ws&&NET.ws.readyState===1) NET.ws.send(JSON.stringify(o)); }
  function connect(){
    let ws;
    try{ ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws'); }catch(e){ return scheduleRetry(); }
    NET.ws=ws;
    ws.onmessage=(ev)=>{
      let m; try{ m=JSON.parse(ev.data); }catch(e){ return; }
      switch(m.t){
        case 'hello': NET.id=m.id; tryJoin(); break;
        case 'host': becomeHost(); break;
        case 'full': toast('Puno na ang party (5/5) — solo muna.','warn'); break;
        case 'roster': for(const p of m.players) addRemote(p); updatePill(); break;
        case 'spawn': addRemote(m.p); toast('🟢 Sumali si '+m.p.name+'!',''); chatMsg(null,'🟢 Sumali si '+m.p.name+'!',true); break;
        case 'leave': { const r=remotes.get(m.id); if(r){ toast('🔴 Umalis si '+r.name+'.','warn'); chatMsg(null,'🔴 Umalis si '+r.name+'.',true);} removeRemote(m.id); break; }
        case 's': { const r=remotes.get(m.id); if(r){ r.tx=m.x; r.tz=m.z; r.tyaw=m.yaw; r.mv=m.mv; if(m.hp!=null) r.hpPct=m.hp; } break; }
        case 'atk': { const r=remotes.get(m.id); if(r) r.atkAnim=0.28; break; }
        case 'skill': { const r=remotes.get(m.id); if(r){ r.atkAnim=0.4; fxRing(r.x,r.z,0x7df0ff,0.6,3.2,0.4); } break; }
        case 'lvl': { const r=remotes.get(m.id); if(r){ r.level=m.level; r.tag.innerHTML=tagHTML(r.name,r.level,r.title,r.gtag); fxRing(r.x,r.z,0xffd94a,0.5,2.6,0.5); } break; }
        case 'gtag': { const r=remotes.get(m.id); if(r){ r.gtag=m.tag||''; r.tag.innerHTML=tagHTML(r.name,r.level,r.title,r.gtag); } break; }
        case 'title': { const r=remotes.get(m.id); if(r){ r.title=m.title||''; r.tag.innerHTML=tagHTML(r.name,r.level,r.title,r.gtag); } break; }
        case 'chan': {                                     /* joined / switched channel */
          const switching=NET.ch&&NET.ch!==m.ch;
          NET.ch=m.ch;
          if(switching){
            for(const rid of [...remotes.keys()]) removeRemote(rid);
            for(const [nid,en] of ghostByNid){ if(enemies.includes(en)) removeEnemy(en); }
            ghostByNid.clear();
            NET.isHost=false; NET.handedOff=false;
            toast('📡 Lumipat ka sa <b>Channel '+m.ch+'</b>!','loot');
            chatMsg(null,'📡 Channel '+m.ch+' — bagong mundo, parehong kapuluan.',true);
          }
          updatePill();
          break; }
        case 'chanlist': if(window._onChanList) window._onChanList(m); break;
        case 'chanfull': toast('Puno ang Channel '+m.ch+' (5/5) — pumili ng iba.','warn'); break;
        case 'chat': if(m.id!==NET.id){
            const ch=m.ch||'all';
            if(ch==='near'){                                   // only if sender is close
              const r=remotes.get(m.id);
              if(!r||d2(r.x,r.z,player.x,player.z)>NEAR_DIST*NEAR_DIST) break;
            }
            if(ch==='f'){                                      // only if sender is a friend
              if(!window._friendKeys||!m.acct||!window._friendKeys.has(m.acct)) break;
            }
            chatMsg(m.name,m.msg,false,m.color,ch);
          } break;
        case 'voice': if(m.id!==NET.id){
            chatMsg(m.name,'',false,m.color,'all',m.data);
          } break;
        case 'es': if(!NET.isHost){
            /* first host update: hand off my solo enemies to the shared world */
            if(!NET.handedOff){ NET.handedOff=true;
              for(const en of [...enemies]) if(!en.remote) removeEnemy(en);
            }
            guestApplyEnemies(m.list);
          } break;
        case 'ehit': if(NET.isHost){                                       // guest damage lands on the host sim
            const en=enemies.find(e=>e.nid===m.nid);
            if(en&&!en.remote){
              en.hp-=m.dmg; en.flash=0.15; en.state='chase'; en.stealth=0;
              if(en.contribs) en.contribs.add(m.from);
              addLabel('-'+m.dmg,'',en.x+rnd(-0.5,0.5),groundY(en.x,en.z)+ENEMY_DEFS[en.key].scale*2.2,en.z,0.8);
              if(en.hp<=0) killEnemy(en);
            }
          } break;
        case 'ekill': {                                                    // guest side: shared kill
            const en=ghostByNid.get(m.nid);
            if(en){
              fxRing(m.x,m.z,0xffb84a,0.5,3.5,0.4);
              if(m.contribs&&m.contribs.includes(NET.id)) killReward(en);  // loot for contributors
              else if(window._partyXpShare&&d2(m.x,m.z,player.x,player.z)<60*60) window._partyXpShare(en); // 🤝 nearby ka-party: shared XP
              ghostByNid.delete(m.nid);
              if(enemies.includes(en)) removeEnemy(en);
            }
          } break;
        case 'pdmg': hurtPlayer(m.dmg, m.opts||{}); break;                 // host says an enemy hit ME
        case 'finv': if(window._onInvite) window._onInvite(m); break;
        case 'facc': if(window._onInviteAccepted) window._onInviteAccepted(m); break;
        case 'duel': if(window._onDuelMsg) window._onDuelMsg(m); break;
      }
    };
    ws.onclose=()=>{
      NET.joined=false; NET.ws=null; NET.handedOff=false;
      const wasGuest=!NET.isHost;
      for(const id of [...remotes.keys()]) removeRemote(id);
      if(wasGuest) becomeHost();                                           // offline: simulate your own world
      NET.isHost=false; updatePill(); scheduleRetry();
    };
    ws.onerror=()=>{};
  }
  function scheduleRetry(){ setTimeout(connect, NET.retry); NET.retry=Math.min(15000,NET.retry*1.6); }
  function tryJoin(){
    if(NET.joined||!NET.ws||NET.ws.readyState!==1) return;
    if(!started||!S.cls) return;
    wsSend({t:'join', name:S.name||CLASSES[S.cls].name, color:ACCT.color||'', acct:(ACCT.user||'').toLowerCase(), cls:S.cls, app:S.app, x:player.x, z:player.z, level:S.level, title:(S.ach&&S.ach.title)||'', gtag:window._guildTag||'', ch:(window._prefCh|0)||0});
    NET.joined=true; NET.retry=2000;
    updatePill();
  }

  /* ---------- tickers ---------- */
  let lastLvl=0;
  setInterval(()=>{
    tryJoin();
    if(!NET.joined||!NET.ws||NET.ws.readyState!==1) return;
    wsSend({t:'s', x:+player.x.toFixed(2), z:+player.z.toFixed(2), yaw:+player.yaw.toFixed(2), mv:player.moving?1:0, hp:Math.round(clamp(S.hp/P.maxHp*100,0,100))});
    if(S.level!==lastLvl){ lastLvl=S.level; wsSend({t:'lvl', level:S.level}); }
    if(NET.isHost&&remotes.size) hostBroadcastEnemies();
  },100);

  const _doAttack=doAttack;
  doAttack=function(){ _doAttack.apply(this,arguments); if(NET.joined) wsSend({t:'atk'}); };
  const _useSkill=useSkill;
  useSkill=function(i){ _useSkill.apply(this,arguments); if(NET.joined) wsSend({t:'skill',i}); };

  /* remote player interpolation + anim */
  let prevT=performance.now();
  (function netTick(now){
    requestAnimationFrame(netTick);
    const dt=Math.min(0.05,(now-prevT)/1000); prevT=now;
    for(const r of remotes.values()){
      const k=Math.min(1,dt*10);
      r.x+=(r.tx-r.x)*k; r.z+=(r.tz-r.z)*k;
      let dy=r.tyaw-r.yaw;
      while(dy>Math.PI)dy-=2*Math.PI; while(dy<-Math.PI)dy+=2*Math.PI;
      r.yaw+=dy*Math.min(1,dt*12);
      const gy=groundY(r.x,r.z);
      r.mesh.position.set(r.x,gy,r.z);
      r.mesh.rotation.y=r.yaw;
      const u=r.mesh.userData;
      if(u&&u.legL){
        if(r.mv){ r.bob+=dt*9; const sw=Math.sin(r.bob)*0.55;
          u.legL.rotation.x=sw; u.legR.rotation.x=-sw; u.armL.rotation.x=-sw*0.7;
          if(r.atkAnim<=0) u.armR.rotation.x=sw*0.7;
        } else {
          u.legL.rotation.x*=0.8; u.legR.rotation.x*=0.8; u.armL.rotation.x*=0.8;
          if(r.atkAnim<=0) u.armR.rotation.x*=0.8;
        }
        if(r.atkAnim>0){ r.atkAnim-=dt; u.armR.rotation.x=-2.2*Math.sin(Math.max(0,r.atkAnim)/0.28*Math.PI); }
      }
      const pp=project(r.x, gy+3.1, r.z);
      if(pp){
        r.tag.style.display='block'; r.tag.style.left=pp.x+'px'; r.tag.style.top=pp.y+'px';
        r.hpbar.style.display='block'; r.hpbar.style.left=pp.x+'px'; r.hpbar.style.top=pp.y+'px';
        r.hpbar.firstChild.style.width=(r.hpPct==null?100:r.hpPct)+'%';
        r.hpbar.classList.toggle('low',(r.hpPct||100)<35);
      } else { r.tag.style.display='none'; r.hpbar.style.display='none'; }
    }
  })(performance.now());
  connect();
})();

/* ================================================================
   TUNOG — WebAudio SFX engine (fully synthesized, no audio files)
   Wing beats, screeches, sword hits, magic bolts, level-ups…
   ================================================================ */
const SFX=(function(){
  let ctx=null, master=null, muted=localStorage.getItem('agimat_mute')==='1';
  function ensure(){
    if(ctx) return true;
    try{
      ctx=new (window.AudioContext||window.webkitAudioContext)();
      master=ctx.createGain();
      master.gain.value=+(localStorage.getItem('agimat_vol_sfx')||0.5);
      master.connect(ctx.destination);
      window._sfxMaster=master;                       // Phase 4: volume slider hook
      return true;
    }catch(e){ return false; }
  }
  /* resume on first gesture (browser autoplay policy) */
  for(const evName of ['pointerdown','keydown']){
    window.addEventListener(evName,()=>{ if(ensure()&&ctx.state==='suspended') ctx.resume(); },{once:false,passive:true});
  }
  const t0=()=>ctx.currentTime;
  function env(g,a,d,peak=1){ const t=t0(); g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+d); }
  function osc(type,f0,f1,a,d,vol=0.5,bendCurve=false){
    if(muted||!ensure()) return;
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(f0,t0());
    if(f1!=null) o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0()+a+d*(bendCurve?0.6:1));
    o.connect(g); g.connect(master); env(g,a,d,vol);
    o.start(); o.stop(t0()+a+d+0.05);
  }
  function noise(dur,vol=0.3,fLow=400,fHigh=4000,sweepTo=null){
    if(muted||!ensure()) return;
    const n=Math.floor(ctx.sampleRate*dur);
    const buf=ctx.createBuffer(1,n,ctx.sampleRate);
    const ch=buf.getChannelData(0);
    for(let i=0;i<n;i++) ch[i]=(Math.random()*2-1)*(1-i/n);
    const src=ctx.createBufferSource(); src.buffer=buf;
    const bp=ctx.createBiquadFilter(); bp.type='bandpass';
    bp.frequency.setValueAtTime((fLow+fHigh)/2,t0());
    if(sweepTo) bp.frequency.exponentialRampToValueAtTime(sweepTo,t0()+dur);
    bp.Q.value=0.8;
    const g=ctx.createGain(); g.gain.value=vol;
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(); src.stop(t0()+dur+0.02);
  }
  const api={
    toggleMute(){ muted=!muted; localStorage.setItem('agimat_mute',muted?'1':'0'); return muted; },
    get muted(){ return muted; },
    /* combat */
    swing(){ noise(0.12,0.22,900,2600,500); },
    hit(){ osc('square',180,70,0.005,0.09,0.35); noise(0.07,0.3,150,900); },
    crit(){ osc('square',300,60,0.005,0.16,0.45); noise(0.12,0.4,200,1400); osc('sine',900,1600,0.005,0.12,0.2); },
    bolt(){ osc('sawtooth',700,180,0.008,0.2,0.28); },
    arrow(){ noise(0.16,0.25,1800,5200,900); },
    dodge(){ noise(0.14,0.2,600,2200,3200); },
    hurt(){ osc('sawtooth',220,90,0.005,0.16,0.4); },
    heal(){ osc('sine',520,880,0.02,0.3,0.25); osc('sine',660,1100,0.02,0.35,0.18); },
    skill(){ osc('sawtooth',300,900,0.02,0.25,0.3); noise(0.2,0.2,800,3000); },
    kill(){ osc('triangle',400,90,0.005,0.3,0.4); noise(0.2,0.3,300,1200); },
    coin(){ osc('sine',1250,1250,0.003,0.07,0.22); setTimeout(()=>osc('sine',1650,1650,0.003,0.1,0.2),60); },
    loot(){ osc('sine',700,1300,0.01,0.2,0.25); },
    levelup(){ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>osc('sine',f,f,0.01,0.35,0.3),i*110)); },
    /* the manananggal */
    wingbeat(){ noise(0.28,0.5,90,340,60); },
    screech(){ if(muted||!ensure())return;
      osc('sawtooth',1900,650,0.03,0.55,0.32,true);
      osc('square',2450,900,0.03,0.45,0.14,true);
      noise(0.5,0.28,1400,5200,700); },
    swoop(){ noise(0.55,0.4,2400,5000,220); },
    bossdie(){ osc('sawtooth',800,60,0.02,1.1,0.5,true); noise(0.9,0.5,200,2400,80); },
  };
  return api;
})();

/* ---- SFX hooks: patch the combat functions ---- */
(function sfxHooks(){
  const _doAttack2=doAttack;
  doAttack=function(){ const before=player.atkCd; _doAttack2.apply(this,arguments);
    if(player.atkCd!==before) SFX.swing(); };
  const _hitEnemy=hitEnemy;
  hitEnemy=function(en,mult,opts={}){
    const hpBefore=en.hp;
    _hitEnemy.apply(this,arguments);
    if(en.hp<hpBefore){ (opts.forceCrit||Math.random()<0.3)?SFX.hit():SFX.hit(); }
  };
  const _useSkill2=useSkill;
  useSkill=function(i){
    const cdBefore=player.skillCds[i];
    _useSkill2.apply(this,arguments);
    if(player.skillCds[i]!==cdBefore) SFX.skill();
  };
  const _hurtPlayer=hurtPlayer;
  hurtPlayer=function(dmg,opts={}){ const hpBefore=S.hp; _hurtPlayer.apply(this,arguments);
    if(S.hp<hpBefore) SFX.hurt(); };
  const _doDodge=doDodge;
  doDodge=function(){ const before=player.dodgeCd||0; _doDodge.apply(this,arguments);
    if(player.dodgeCd!==before) SFX.dodge(); };
  const _killReward=killReward;
  killReward=function(en){ _killReward.apply(this,arguments);
    if(ENEMY_DEFS[en.key].boss) SFX.bossdie(); else SFX.kill(); };
  const _gainXP=gainXP;
  let lvlBefore=0;
  gainXP=function(a){ lvlBefore=S.level; _gainXP.apply(this,arguments);
    if(S.level>lvlBefore) SFX.levelup(); };
  const _spawnGoldDrop=spawnGoldDrop;
  /* coin sound on pickup happens in the pickup loop via toast; keep simple: hook spawn for a soft loot cue */
})();

/* ---- ambient boss audio: wing beats + screeches while she's near ---- */
setInterval(()=>{
  if(!started) return;
  const boss=enemies.find(e=>ENEMY_DEFS[e.key]&&ENEMY_DEFS[e.key].boss);
  if(!boss) return;
  const d=Math.hypot(player.x-boss.x,player.z-boss.z);
  if(d<50) SFX.wingbeat();
  if(boss.swoopT>0&&d<55) SFX.swoop();
  else if(d<45&&Math.random()<0.18) SFX.screech();
},700);

/* ---- mute toggle button ---- */
(function muteBtn(){
  const b=document.createElement('button');
  b.id='btn-mute';
  b.className='menu-btn';
  b.title='Tunog';
  b.textContent=SFX.muted?'🔇':'🔊';
  b.onclick=()=>{ b.textContent=SFX.toggleMute()?'🔇':'🔊'; };
  document.querySelector('.hud-right').appendChild(b);   // in the HUD row — no overlap
})();

/* ================================================================
   SETTINGS · DAILY REWARDS · LEADERBOARD
   ================================================================ */
/* ---- basic settings state ---- */
const SETTINGS=Object.assign({shake:true, dmgNumbers:true, chatVisible:true, autoTargets:['all'], forageTargets:['all']},
  (()=>{ try{ return JSON.parse(localStorage.getItem('agimat_settings')||'{}'); }catch(e){ return {}; } })());
function saveSettings(){ localStorage.setItem('agimat_settings',JSON.stringify(SETTINGS)); applySettings(); }
function applySettings(){
  const cw=document.getElementById('chat-wrap');
  if(cw) cw.style.display=(started&&SETTINGS.chatVisible)?'flex':'none';
}
/* reveal the chat box the moment the game starts (covers new game, continue, cloud load) */
(function chatReveal(){
  let shown=false;
  setInterval(()=>{
    if(shown!==started){ shown=started; applySettings(); }
  },400);
})();
/* screen shake honor setting */
const _screenShake=screenShake;
screenShake=function(a,d){ if(SETTINGS.shake) _screenShake(a,d); };
/* damage numbers honor setting */
const _addLabel=addLabel;
addLabel=function(txt,cls,x,y,z,dur){
  if(!SETTINGS.dmgNumbers && (cls===''||cls==='crit') && /^-\d/.test(String(txt))) return;
  _addLabel(txt,cls,x,y,z,dur);
};

/* ---- SETTINGS PANEL ---- */
let rebinding=null;
function chkList(items,selArr){
  const all=selArr.includes('all');
  const row=(id,icon,label,checked)=>`<label class="chk-row${checked?' sel':''}"><input type="checkbox" data-chk="${id}" ${checked?'checked':''}><span class="chk-box">${checked?'✔':''}</span>${icon} ${label}</label>`;
  return row('all','✅','LAHAT (All)',all)+items.map(it=>row(it.id,it.icon,it.label,all||selArr.includes(it.id))).join('');
}
function wireChkGrid(gridId,key){
  const grid=$(gridId); if(!grid) return;
  grid.querySelectorAll('input[data-chk]').forEach(inp=>{
    inp.addEventListener('change',()=>{
      let sel=SETTINGS[key].slice();
      const id=inp.dataset.chk;
      if(id==='all'){
        sel = inp.checked ? ['all'] : [];
      } else {
        if(sel.includes('all')){
          /* 'all' was on: switch to explicit list of everything, then toggle this one off/on */
          sel=[...grid.querySelectorAll('input[data-chk]')].map(i=>i.dataset.chk).filter(x=>x!=='all');
        }
        sel = inp.checked ? [...new Set([...sel,id])] : sel.filter(x=>x!==id);
        /* if everything got selected, collapse to 'all' */
        const total=grid.querySelectorAll('input[data-chk]').length-1;
        if(sel.length>=total) sel=['all'];
      }
      SETTINGS[key]=sel; saveSettings();
      /* re-render this grid in place */
      const items = key==='autoTargets'
        ? Object.keys(ENEMY_DEFS).filter(k=>!ENEMY_DEFS[k].boss).map(k=>({id:k,icon:'👹',label:ENEMY_DEFS[k].name}))
        : FORAGE_KINDS.map(f=>({id:f.id,icon:f.icon,label:MATERIALS[f.id].name}));
      grid.innerHTML=chkList(items,SETTINGS[key]);
      wireChkGrid(gridId,key);
    });
  });
}
function openSettings(){
  const kb=(id,lbl)=>`<tr><td>${lbl}</td><td><button class="kb-btn" data-bind="${id}">${keyLabel(KEYBINDS[id])}</button></td></tr>`;
  showModal(`
    <div class="modal-emoji">⚙️</div><div class="modal-title">Mga Setting</div>
    <div class="set-sec">👤 Account</div>
    <div class="set-acct">${ACCT.token
      ? `<div class="acct-card">
           <div class="acct-ava" style="background:${ACCT.color||'#f2b134'}">${(ACCT.user||'?').charAt(0).toUpperCase()}</div>
           <div class="acct-inf">
             <b style="color:${ACCT.color||'#ffd94a'}">🧿 ${ACCT.user}</b>
             <i>☁️ Naka-log in — cloud save aktibo</i>
             <i>${ACCT.lastPush?('Huling sync: '+(Math.max(1,Math.round((Date.now()-ACCT.lastPush)/1000))<60?Math.max(1,Math.round((Date.now()-ACCT.lastPush)/1000))+'s':Math.round((Date.now()-ACCT.lastPush)/60000)+'min')+' ang nakalipas'):'Hindi pa nasi-sync'}</i>
           </div>
           <button class="modal-btn secondary" id="set-logout">🚪 Mag-log Out</button>
         </div>`
      : `<div class="acct-card guest">
           <div class="acct-ava guest">👤</div>
           <div class="acct-inf">
             <b style="color:#bfb6d2">Guest / Bisita</b>
             <i>Hindi naka-log in — lokal na save lamang</i>
             <i>Mag-log in para ma-save sa cloud ang progreso</i>
           </div>
           <button class="modal-btn secondary" id="set-login">🔑 Mag-log In</button>
         </div>`}</div>
    <div class="set-sec">⌨️ Keyboard (pindutin para palitan)</div>
    <table class="stat-table kb-table">
      ${kb('attack','🗡️ Attack')}${kb('skill1','Skill 1')}${kb('skill2','Skill 2')}${kb('skill3','Skill 3')}
      ${kb('dodge','💨 Dodge')}${kb('interact','🏮 Interact')}
    </table>
    <button class="modal-btn secondary" id="kb-reset">Ibalik sa Default</button>
    <div class="set-sec">🎛️ Laro</div>
    <div class="set-row"><span>🔊 Tunog</span><button class="tog ${SFX.muted?'':'on'}" id="tog-sound"></button></div>
    <div class="set-row"><span>📳 Screen Shake</span><button class="tog ${SETTINGS.shake?'on':''}" id="tog-shake"></button></div>
    <div class="set-row"><span>🔢 Damage Numbers</span><button class="tog ${SETTINGS.dmgNumbers?'on':''}" id="tog-dmg"></button></div>
    <div class="set-row"><span>💬 Chat</span><button class="tog ${SETTINGS.chatVisible?'on':''}" id="tog-chat"></button></div>
    <div class="set-row"><span>⛶ Full Screen + Landscape</span><button class="tog ${(window._fsActive?window._fsActive():document.fullscreenElement)?'on':''}" id="tog-fs"></button></div>
    <div class="set-sec">⚔️ Auto Battle — mga tinutugis na kalaban</div>
    <div class="chk-grid" id="chk-auto">${chkList(Object.keys(ENEMY_DEFS).filter(k=>!ENEMY_DEFS[k].boss).map(k=>({id:k,icon:'👹',label:ENEMY_DEFS[k].name})),SETTINGS.autoTargets)}</div>
    <div class="set-sec">🤖 Auto Forage — mga kinukuhang materyales</div>
    <div class="chk-grid" id="chk-forage">${chkList(FORAGE_KINDS.map(f=>({id:f.id,icon:f.icon,label:MATERIALS[f.id].name})),SETTINGS.forageTargets)}</div>
    <div class="set-sec">🗄️ Data</div>
    <button class="modal-btn secondary" id="btn-reset2">Burahin ang Save (Reset)</button>
    <button class="modal-btn" onclick="closeModal()">Isara</button>`);
  document.querySelectorAll('.kb-btn').forEach(b=>{
    b.onclick=()=>{
      document.querySelectorAll('.kb-btn').forEach(x=>x.classList.remove('rec'));
      b.classList.add('rec'); b.textContent='…';
      rebinding=b.dataset.bind;
    };
  });
  $('kb-reset').onclick=()=>{ KEYBINDS=Object.assign({},DEFAULT_KEYS); saveKeys(); openSettings(); };
  $('tog-sound').onclick=e=>{ const m=SFX.toggleMute(); e.target.classList.toggle('on',!m); const mb=$('btn-mute'); if(mb) mb.textContent=m?'🔇':'🔊'; };
  $('tog-shake').onclick=e=>{ SETTINGS.shake=!SETTINGS.shake; e.target.classList.toggle('on',SETTINGS.shake); saveSettings(); };
  $('tog-dmg').onclick=e=>{ SETTINGS.dmgNumbers=!SETTINGS.dmgNumbers; e.target.classList.toggle('on',SETTINGS.dmgNumbers); saveSettings(); };
  $('tog-chat').onclick=e=>{ SETTINGS.chatVisible=!SETTINGS.chatVisible; e.target.classList.toggle('on',SETTINGS.chatVisible); saveSettings(); };
  $('tog-fs').onclick=e=>{ toggleFullscreen(); setTimeout(()=>e.target.classList.toggle('on',window._fsActive?window._fsActive():!!document.fullscreenElement),500); };
  wireChkGrid('chk-auto','autoTargets');
  wireChkGrid('chk-forage','forageTargets');
  $('btn-reset2').onclick=()=>{ if(confirm('Burahin ang lahat ng progreso?')){ localStorage.removeItem('agimat_save3'); location.reload(); } };
  const lo=$('set-logout'); if(lo) lo.onclick=async()=>{
    if(!confirm('Mag-log out? Babalik ka sa welcome screen.')) return;
    /* force one final cloud push (bypasses the 10s throttle) before leaving */
    try{
      S.lastSeen=Date.now(); S.px=player.x; S.py=player.z; S.itemUid=itemUid;
      lo.disabled=true; lo.textContent='☁️ Sini-sync…';
      await api('/api/save',{token:ACCT.token, save:JSON.stringify(S)});
    }catch(e){}
    acctLogout();
    /* leaving an account: wipe the local copy of the cloud character so the
       next (guest or different) player doesn't inherit it */
    localStorage.removeItem('agimat_save3');
    localStorage.setItem('agimat_force_welcome','1');
    location.reload();
  };
  const li=$('set-login'); if(li) li.onclick=()=>{
    if(!confirm('Pupunta sa welcome screen para mag-log in. Mase-save muna ang progreso mo. Ituloy?')) return;
    save();
    localStorage.setItem('agimat_force_welcome','1');
    location.reload();
  };
}
$('btn-settings').onclick=openSettings;
/* ---- fullscreen + landscape lock ---- */
async function enterFullscreen(){
  try{
    await document.documentElement.requestFullscreen({navigationUI:'hide'});
    if(screen.orientation&&screen.orientation.lock){ screen.orientation.lock('landscape').catch(()=>{}); }
    toast('⛶ Full screen! Pindutin muli para lumabas.','');
  }catch(e){ toast('Hindi suportado ang full screen dito.','warn'); }
}
async function exitFullscreen(){
  try{
    if(screen.orientation&&screen.orientation.unlock) screen.orientation.unlock();
    if(document.fullscreenElement) await document.exitFullscreen();
  }catch(e){}
}
function toggleFullscreen(){ document.fullscreenElement?exitFullscreen():enterFullscreen(); }
window.toggleFullscreen=toggleFullscreen;
(function fsBtn(){
  const b=document.createElement('button');
  b.className='menu-btn'; b.id='btn-fullscreen'; b.title='Full Screen'; b.textContent='⛶';
  document.querySelector('.hud-right').appendChild(b);
  b.onclick=toggleFullscreen;
  document.addEventListener('fullscreenchange',()=>{ b.textContent=document.fullscreenElement?'🗗':'⛶'; });
})();
/* capture the next key while rebinding */
window.addEventListener('keydown',e=>{
  if(!rebinding) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const k=e.key.toLowerCase();
  if(k==='escape'){ rebinding=null; openSettings(); return; }
  /* if another action already uses this key, swap the two bindings */
  for(const act of Object.keys(KEYBINDS)) if(act!==rebinding&&KEYBINDS[act]===k) KEYBINDS[act]=KEYBINDS[rebinding];
  KEYBINDS[rebinding]=k;
  rebinding=null; saveKeys(); openSettings();
},true);

/* ---- DAILY LOGIN REWARDS ---- */
async function claimDaily(){
  if(!ACCT.token) return;
  const r=await api('/api/daily',{token:ACCT.token});
  if(!r.ok) return;
  if(r.already) return;
  if(r.claimed&&r.reward){
    S.gold+=r.reward.gold||0;
    if(r.reward.mats) for(const [id,q] of Object.entries(r.reward.mats)) addInv(id,q);
    updateHUD(); save();
    SFX.levelup();
    showModal(`
      <div class="modal-emoji">🎁</div><div class="modal-title">Gantimpala ng Araw!</div>
      <div class="daily-track">${[1,2,3,4,5,6,7].map(d=>
        `<div class="daily-day ${d<r.streak?'done':d===r.streak?'today':''}">${d===7?'💎':d<r.streak?'✓':'☀️'}<i>Araw ${d}</i></div>`).join('')}</div>
      <p style="text-align:center;font-weight:700;color:#ffd94a;font-size:15px">${r.reward.desc}</p>
      <p style="text-align:center;color:#bfb6d2;font-size:12px">Sunod-sunod na araw: <b>${r.streak}/7</b> — bumalik bukas para sa mas malaki!</p>
      <button class="modal-btn" onclick="closeModal()">🙏 Salamat po!</button>`);
  }
}
/* claim shortly after entering the world (needs started + account) */
setInterval(()=>{ if(started&&ACCT.token&&!window._dailyTried){ window._dailyTried=true; claimDaily(); } },3000);

/* ---- LEADERBOARD ---- */
async function openLeaderboard(){
  showModal(`<div class="modal-emoji">🏆</div><div class="modal-title">Talaan ng mga Bayani</div><p style="text-align:center;color:#8a80a2">Ikinakarga…</p>`);
  const r=await api('/api/leaderboard',{});
  if(!r.ok||!r.rows){ showModal(`<div class="modal-emoji">🏆</div><div class="modal-title">Talaan ng mga Bayani</div><p style="text-align:center">Hindi maabot ang server.</p><button class="modal-btn" onclick="closeModal()">Isara</button>`); return; }
  const medal=i=>i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.';
  const rows=r.rows.map((q,i)=>`
    <tr class="${ACCT.user&&q.user===ACCT.user?'me':''}">
      <td>${medal(i)}</td>
      <td style="color:${q.color}"><b>${q.name}</b><em class="lb-user">@${q.user}</em></td>
      <td title="${CLASSES[q.cls]?CLASSES[q.cls].name:''}">Lv ${q.level}</td>
      <td>🦇 ${q.bossKills}</td>
      <td>🪙 ${fmt(q.gold)}</td>
    </tr>`).join('');
  showModal(`
    <div class="modal-emoji">🏆</div><div class="modal-title">Talaan ng mga Bayani</div>
    ${r.rows.length?`<table class="lb-table"><tr><th></th><th>Bayani</th><th>Level</th><th>Boss</th><th>Ginto</th></tr>${rows}</table>`
      :'<p style="text-align:center;color:#8a80a2">Wala pang bayani sa talaan — mag-log in at maglaro!</p>'}
    <p style="text-align:center;color:#8a80a2;font-size:11px">Mga naka-log in na manlalaro lamang ang kasama sa talaan.</p>
    <button class="modal-btn" onclick="closeModal()">Isara</button>`);
}
$('btn-lead').onclick=openLeaderboard;
applySettings();

/* ================================================================
   BAYBAYIN SOCKETS · FRIENDS · PVP DUELS · AUTO BATTLE
   ================================================================ */

/* ---------- Baybayin socket modal ---------- */
function findItemByUid(uid){
  for(const it of Object.values(S.gear)) if(it&&it.uid===uid) return it;
  return S.bag.find(i=>i.uid===uid)||null;
}
function openSockets(uid){
  const it=findItemByUid(uid); if(!it) return;
  const socks=itemSockets(it);
  const myRunes=RUNE_IDS.filter(r=>(S.inv[r]||0)>0);
  showModal(`
    <div class="modal-emoji">ᜊ</div><div class="modal-title">Baybayin Runes</div>
    ${itemCardHTML(it,false)}
    <div class="set-sec">Mga Socket</div>
    <div class="sock-grid">${socks.map((rid,i)=>rid
      ?`<button class="sock-slot filled" data-si="${i}" title="Tanggalin">${RUNE_DEFS[rid].glyph}<i>${RUNE_DEFS[rid].desc}</i></button>`
      :`<button class="sock-slot" data-si="${i}">◇<i>bakante</i></button>`).join('')}</div>
    <div class="set-sec">Iyong mga Rune</div>
    <div class="rune-inv">${myRunes.length?myRunes.map(r=>
      `<button class="rune-chip" data-rune="${r}">${RUNE_DEFS[r].glyph} <b>×${S.inv[r]}</b><i>${RUNE_DEFS[r].desc}</i></button>`).join('')
      :'<div class="empty-note">Wala ka pang rune — pumapatak ito mula sa mga Elite at sa Manananggal!</div>'}</div>
    <p style="font-size:11px;color:#8a80a2;text-align:center">Pindutin ang rune, tapos ang socket. Pindutin ang punong socket para tanggalin (maibabalik ang rune).</p>
    <button class="modal-btn" onclick="closeModal()">Isara</button>`);
  let selRune=null;
  document.querySelectorAll('.rune-chip').forEach(b=>{
    b.onclick=()=>{ document.querySelectorAll('.rune-chip').forEach(x=>x.classList.remove('sel')); b.classList.add('sel'); selRune=b.dataset.rune; };
  });
  document.querySelectorAll('.sock-slot').forEach(b=>{
    b.onclick=()=>{
      const i=+b.dataset.si;
      if(socks[i]){                                 // remove rune back to inventory
        addInv(socks[i],1); socks[i]=null;
        SFX.loot(); computeStats(); save(); renderGear(); openSockets(uid);
      } else if(selRune&&(S.inv[selRune]||0)>0){    // socket it in
        S.inv[selRune]--; if(S.inv[selRune]<=0) delete S.inv[selRune];
        socks[i]=selRune;
        SFX.levelup(); toast(`${RUNE_DEFS[selRune].glyph} Naikintal ang rune!`,'loot');
        computeStats(); save(); renderGear(); openSockets(uid);
      } else toast('Pumili muna ng rune sa ibaba.','warn');
    };
  });
}
window.openSockets=openSockets;

/* ---------- FRIENDS LIST + PARTY INVITES ---------- */
async function openFriends(){
  if(!ACCT.token){ showModal(`<div class="modal-emoji">🫂</div><div class="modal-title">Mga Kaibigan</div>
    <p style="text-align:center;color:#8a80a2">Mag-log in muna para magkaroon ng friends list!</p>
    <button class="modal-btn" onclick="closeModal()">Isara</button>`); return; }
  showModal(`<div class="modal-emoji">🫂</div><div class="modal-title">Mga Kaibigan</div><p style="text-align:center;color:#8a80a2">Ikinakarga…</p>`);
  const r=await api('/api/friends',{token:ACCT.token});
  if(!r.ok){ toast(r.err||'Hindi maabot ang server.','warn'); closeModal(); return; }
  window._friendKeys=new Set(r.list.map(f=>f.key));
  const rows=r.list.map(f=>`
    <div class="fr-row">
      <span class="fr-dot ${f.online?'on':''}"></span>
      <div class="fr-info"><b style="color:${f.color}">${f.user}</b>
        <i>${f.online?(f.heroName?f.heroName+' · Lv'+f.level+' · naglalaro ngayon':'online'):'offline'+(f.level?' · Lv'+f.level:'')}</i></div>
      ${f.online&&f.pid&&f.pid!==(window._net&&window._net.myId())?`<button class="mini-btn" data-inv="${f.key}">📣 ANYAYAHAN</button>`:''}
      <button class="mini-btn sell" data-unf="${f.key}">✕</button>
    </div>`).join('');
  showModal(`
    <div class="modal-emoji">🫂</div><div class="modal-title">Mga Kaibigan</div>
    <div class="fr-add"><input id="fr-name" maxlength="20" placeholder="Username ng kaibigan…"><button class="mini-btn" id="fr-addbtn">➕ I-ADD</button></div>
    <div class="fr-list">${r.list.length?rows:'<div class="empty-note">Wala ka pang kaibigan — i-add sila gamit ang kanilang username!</div>'}</div>
    <p style="font-size:11px;color:#8a80a2;text-align:center">Ang party ay bukas sa lahat (max 5) — ang “Anyayahan” ay nagpapadala ng paalala sa kaibigang naglalaro.</p>
    <button class="modal-btn" onclick="closeModal()">Isara</button>`);
  $('fr-addbtn').onclick=async ()=>{
    const u=$('fr-name').value.trim(); if(!u) return;
    const rr=await api('/api/friend',{token:ACCT.token, action:'add', user:u});
    if(rr.ok){ toast('🫂 Naidagdag si '+u+'!','loot'); openFriends(); }
    else toast(rr.err||'Hindi nagawa.','warn');
  };
  document.querySelectorAll('[data-unf]').forEach(b=>b.onclick=async ()=>{
    await api('/api/friend',{token:ACCT.token, action:'remove', user:b.dataset.unf});
    openFriends();
  });
  document.querySelectorAll('[data-inv]').forEach(b=>b.onclick=()=>{
    if(window._net&&window._net.joined()){ window._net.send({t:'finv', toUser:b.dataset.inv}); toast('📣 Naipadala ang paanyaya!','loot'); }
    else toast('Hindi ka konektado sa party server.','warn');
  });
}
window._onInvite=(m)=>{
  toast(`📣 <b>${m.fromName}</b> ay nag-aanyaya sa iyo! Magkasama na kayo sa mundo — puntahan mo siya!`,'levelup');
  SFX.levelup();
  if(window._net) window._net.send({t:'facc', to:m.fromId});
  /* Phase 2: the party portal follows — hop to the inviter's channel automatically */
  if(m.ch && window._net && window._net.ch() && window._net.ch()!==m.ch){
    window._prefCh=m.ch;
    window._net.send({t:'chan', ch:m.ch});
  }
};
window._onInviteAccepted=(m)=>{ toast(`🫂 Nakita ni <b>${m.fromName}</b> ang paanyaya mo!`,'loot'); };

/* ---------- PVP DUELS ---------- */
const DUEL={active:false, foe:0, foeName:'', myHp:0, foeHp:0, max:0, pending:0};
function duelBanner(){
  let el=$('duel-banner');
  if(!el){
    el=document.createElement('div'); el.id='duel-banner';
    el.innerHTML='<div class="db-title"></div><div class="db-bars"><div class="db-bar me"><i></i></div><div class="db-vs">⚔️</div><div class="db-bar foe"><i></i></div></div>';
    document.body.appendChild(el);
  }
  return el;
}
function startDuel(foeId,foeName){
  DUEL.active=true; DUEL.foe=foeId; DUEL.foeName=foeName;
  DUEL.max=P.maxHp; DUEL.myHp=P.maxHp; DUEL.foeHp=P.maxHp; // fair fight: equal pools
  const el=duelBanner();
  el.querySelector('.db-title').textContent='⚔️ DUELO: '+(S.name||'Ikaw')+' vs '+foeName;
  el.style.display='block';
  toast('⚔️ NAGSIMULA ANG DUELO! Unang bumagsak ang matatalo. Walang tunay na pinsala.','warn');
  SFX.screech();
}
function endDuel(result,msg){
  if(!DUEL.active) return;
  DUEL.active=false;
  const el=$('duel-banner'); if(el) el.style.display='none';
  showModal(`<div class="modal-emoji">${result==='win'?'🏆':'💫'}</div>
    <div class="modal-title">${result==='win'?'PANALO KA SA DUELO!':'Natalo ka sa duelo…'}</div>
    <p style="text-align:center;color:#bfb6d2">${msg||''}</p>
    <button class="modal-btn" onclick="closeModal()">OK</button>`);
  if(result==='win') SFX.levelup(); else SFX.hurt();
}
function duelTick(){
  if(!DUEL.active) return;
  const el=duelBanner();
  el.querySelector('.db-bar.me i').style.width=Math.max(0,DUEL.myHp/DUEL.max*100)+'%';
  el.querySelector('.db-bar.foe i').style.width=Math.max(0,DUEL.foeHp/DUEL.max*100)+'%';
  const foe=window._kaParty&&window._kaParty.get(DUEL.foe);
  if(!foe){ endDuel('win','Umalis ang kalaban.'); if(window._net) window._net.send({t:'duel',act:'end',to:DUEL.foe,result:'left'}); }
}
setInterval(duelTick,300);
/* land duel hits: my attacks vs my duel foe (client-rolled, relayed) */
const _doAttackDuel=doAttack;
doAttack=function(){
  _doAttackDuel.apply(this,arguments);
  if(!DUEL.active||!window._kaParty) return;
  const foe=window._kaParty.get(DUEL.foe); if(!foe) return;
  const d=Math.hypot(foe.x-player.x,foe.z-player.z);
  const rangeOk = CLASSES[S.cls].melee ? d<4.2 : d<22;
  if(rangeOk){
    const {dmg,crit}=rollDamage(1,false);
    window._net.send({t:'duel',act:'dmg',to:DUEL.foe,dmg,crit});
    DUEL.foeHp-=dmg;
    addLabel('-'+dmg,crit?'crit':'',foe.x,groundY(foe.x,foe.z)+3,foe.z,0.8);
    SFX.hit();
    if(DUEL.foeHp<=0){
      window._net.send({t:'duel',act:'end',to:DUEL.foe,result:'lose'});
      endDuel('win','Napatumba mo si '+DUEL.foeName+'!');
    }
  }
};
window._onDuelMsg=(m)=>{
  switch(m.act){
    case 'req': {
      showModal(`<div class="modal-emoji">⚔️</div><div class="modal-title">Hamon sa Duelo!</div>
        <p style="text-align:center">Hinahamon ka ni <b>${m.fromName}</b> sa isang duelo. Walang tunay na pinsala o gantimpala — karangalan lamang!</p>
        <button class="modal-btn" id="duel-yes">⚔️ TANGGAPIN</button>
        <button class="modal-btn secondary" id="duel-no">Tanggihan</button>`);
      $('duel-yes').onclick=()=>{ closeModal(); window._net.send({t:'duel',act:'acc',to:m.from}); startDuel(m.from,m.fromName); };
      $('duel-no').onclick=()=>{ closeModal(); window._net.send({t:'duel',act:'dec',to:m.from}); };
      break;
    }
    case 'acc': closeModal(); startDuel(m.from,m.fromName); break;
    case 'dec': toast(`${m.fromName} tumanggi sa duelo.`,'warn'); break;
    case 'dmg':
      if(DUEL.active&&m.from===DUEL.foe){
        DUEL.myHp-=m.dmg;
        addLabel('-'+m.dmg,m.crit?'crit':'hurt',player.x,groundY(player.x,player.z)+3,player.z,0.8);
        $('hurt-vignette').style.opacity=0.6; setTimeout(()=>$('hurt-vignette').style.opacity=0,150);
        SFX.hurt(); screenShake(0.15,0.15);
        if(DUEL.myHp<=0){ window._net.send({t:'duel',act:'end',to:DUEL.foe,result:'win'}); endDuel('lose','Mas mabilis ang kalaban ngayon — babawi ka!'); }
      }
      break;
    case 'end':
      if(DUEL.active) endDuel(m.result==='win'?'win':m.result==='left'?'win':'lose', m.result==='win'?'Sumuko ang kalaban!':'');
      break;
  }
};
/* challenge from the party pill: click a nametag? simpler — duel via friends of party list */
function openPartyPanel(){
  const list=[];
  if(window._kaParty) for(const [id,r] of window._kaParty) list.push({id,name:r.name,level:r.level});
  showModal(`
    <div class="modal-emoji">🧑‍🤝‍🧑</div><div class="modal-title">Ka-Party (${1+list.length}/5)</div>
    ${list.length?list.map(q=>`
      <div class="fr-row"><span class="fr-dot on"></span>
        <div class="fr-info"><b>${q.name}</b><i>Lv ${q.level}</i></div>
        <button class="mini-btn" data-duel="${q.id}">⚔️ HAMUNIN</button>
      </div>`).join(''):'<div class="empty-note">Ikaw lang ang nasa mundo ngayon. Buksan ito sa ibang tab o anyayahan ang kaibigan!</div>'}
    <button class="modal-btn secondary" id="pp-friends">🫂 Mga Kaibigan</button>
    <button class="modal-btn" onclick="closeModal()">Isara</button>`);
  document.querySelectorAll('[data-duel]').forEach(b=>b.onclick=()=>{
    window._net.send({t:'duel',act:'req',to:+b.dataset.duel});
    toast('⚔️ Naipadala ang hamon…','warn'); closeModal();
  });
  $('pp-friends').onclick=openFriends;
}
/* make the party pill clickable */
(function(){
  const pill=$('party-pill');
  if(pill){ pill.style.pointerEvents='auto'; pill.style.cursor='pointer'; pill.onclick=openPartyPanel; }
})();

/* ---------- AUTO BATTLE ---------- */
const AUTO={on:false};
window._autoVec={x:0,z:0,mag:0};
(function autoBtn(){
  const b=document.createElement('button');
  b.id='btn-autobattle';
  b.className='ctl-btn tiny autobattle';
  b.title='Auto Battle';
  b.textContent='⚔️';
  b.style.position='absolute';
  $('action-cluster').appendChild(b);
  const orb=document.createElement('span'); orb.className='ab-orbit'; orb.innerHTML='<i class="ab-dot"></i><i class="ab-dot d2"></i>';
  b.appendChild(orb);
  b.onclick=()=>{
    AUTO.on=!AUTO.on;
    b.classList.toggle('on',AUTO.on);
    toast(AUTO.on?'⚔️ AUTO BATTLE: naghahanap ng kalaban…':'⚔️ Auto battle: patay.','warn');
    if(!AUTO.on) window._autoVec={x:0,z:0,mag:0};
  };
})();
setInterval(()=>{
  if(!AUTO.on||!started||player.dead||DUEL.active){ window._autoVec={x:0,z:0,mag:0}; return; }
  /* nearest live enemy that matches the auto-battle target list */
  const tgts=SETTINGS.autoTargets&&SETTINGS.autoTargets.length?SETTINGS.autoTargets:['all'];
  const wantAll=tgts.includes('all');
  let best=null,bd=1e9;
  for(const en of enemies){
    if(en.hp<=0) continue;
    if(!wantAll&&!tgts.includes(en.key)) continue;
    const dd=d2(en.x,en.z,player.x,player.z);
    if(dd<bd){ bd=dd; best=en; }
  }
  if(!best||bd>70*70){ window._autoVec={x:0,z:0,mag:0}; return; }
  const d=Math.sqrt(bd);
  const C=CLASSES[S.cls];
  const range=C.melee?3.4:16;
  if(d>range){
    const a=Math.atan2(best.x-player.x,best.z-player.z);
    window._autoVec={x:Math.sin(a),z:Math.cos(a),mag:1};
  } else {
    window._autoVec={x:0,z:0,mag:0};
    player.yaw=Math.atan2(best.x-player.x,best.z-player.z);
    doAttack();
    for(let i=0;i<3;i++){ if(nowS()>=player.skillCds[i]) { useSkill(i); break; } }
  }
  /* emergency: dodge when swarmed and low */
  if(S.hp<P.maxHp*0.3&&d<4) doDodge();
},220);
$('btn-friends').onclick=openFriends;

/* ================================================================
   PORTALS · QUESTS · PETS & MOUNTS
   ================================================================ */

/* ---------- PORTAL: town ⇄ Isla ng Bathala (level 10) ---------- */
const portals=[];
function buildPortal(x,z,col){
  const g=new THREE.Group();
  const ringM=new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.2,roughness:0.4});
  ringM._isFx=true;
  const arch=new THREE.Mesh(new THREE.TorusGeometry(2.2,0.22,8,24), ringM);
  arch.position.y=2.6; g.add(arch);
  const diskM=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.35,side:THREE.DoubleSide});
  diskM._isFx=true;
  const disk=new THREE.Mesh(new THREE.CircleGeometry(1.9,24), diskM);
  disk.position.y=2.6; g.add(disk);
  for(let i=0;i<2;i++){
    const pil=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.4,3.4,6), Mstone(0x8a8a92));
    pil.position.set(i?2.4:-2.4,1.7,0); pil.castShadow=true; g.add(pil);
  }
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(2.8,3.0,0.25,10), Mstone(0x6a6a74));
  pad.position.y=0.12; g.add(pad);
  g.position.set(x,groundY(x,z),z);
  scene.add(g);
  portals.push({x,z,mesh:g,disk,arch});
  return g;
}
window._townPortalG=buildPortal(PORTAL_TOWN.x,PORTAL_TOWN.z,0xbe7aff);
buildPortal(PORTAL_ISLE.x,PORTAL_ISLE.z,0x7dff9a);
let portalCd=0;
setInterval(()=>{
  if(!started||player.dead) return;
  if(portalCd>0){ portalCd--; return; }
  for(const pt of portals){
    if(d2(player.x,player.z,pt.x,pt.z)<2.6*2.6){
      const toIsle=pt.x===PORTAL_TOWN.x;
      if(toIsle&&S.level<ISLE_MIN_LEVEL){ toast('🌀 Ang lagusan ay tumatanggi — kailangan ng <b>Level '+ISLE_MIN_LEVEL+'</b> para tumawid sa Isla ng Bathala.','warn'); portalCd=6; return; }
      const dst=toIsle?PORTAL_ISLE:PORTAL_TOWN;
      fxRing(player.x,player.z,0x7df0ff,0.6,5,0.6);
      SFX.skill(); screenShake(0.3,0.4);
      const hop=()=>{
        player.x=dst.x+3; player.z=dst.z;
        fxRing(player.x,player.z,0x7dff9a,0.6,5,0.6);
        toast(toIsle?'🏝️ <b>ISLA NG BATHALA</b> — lupain ng mga sinaunang halimaw!':'🏮 Bumalik ka sa Dakilang Tiangge.','levelup');
        save();
      };
      if(window._mapTransition) window._mapTransition(toIsle?'isla':'town',hop); else hop();
      portalCd=8;
      break;
    }
  }
},500);
/* portal spin anim */
setInterval(()=>{ for(const pt of portals){ pt.disk.rotation.z+=0.1; pt.arch.rotation.z-=0.03; } },50);

/* ---------- QUESTS: story chain from the town NPCs ---------- */
let QUESTS=[
  {id:0, npc:'Aling Rosa', icon:'⚖️', title:'Ang Unang Alay',
   text:'Anak, ang mga tiyanak ay pumapasok na sa mga palayan. Maglinis ka — tumumba ka ng LIMANG Tiyanak.',
   type:'kill', target:'tiyanak', n:5, reward:{gold:300, xp:400}},
  {id:1, npc:'Panday Iko', icon:'⚒️', title:'Bakal at Bato',
   text:'Kailangan ko ng materyales para sa bagong sandata. Dalhan mo ako ng 120 Bato.',
   type:'collect', target:'bato', n:120, reward:{gold:450, xp:600}},
  {id:2, npc:'Ka Bining', icon:'🛡️', title:'Mga Multo ng Kawayanan',
   text:'May mga duwendeng nangunguha sa mga manggagawa sa kawayanan. Itaboy mo — WALONG Duwende.',
   type:'kill', target:'duwende', n:8, reward:{gold:600, xp:900}},
  {id:3, npc:'Ang Kubrador', icon:'🌑', title:'Anino sa Dilim',
   text:'May mga sigbin na naglalakad nang paatras sa mga anino. Hulihin sila bago sila humuli sa iyo — APAT na Sigbin.',
   type:'kill', target:'sigbin', n:4, reward:{gold:900, xp:1400}},
  {id:4, npc:'Aling Rosa', icon:'⚖️', title:'Ang Halimaw ng Bulkan',
   text:'Narinig mo na ba ang pagaspas ng pakpak sa gabi? Ang MANANANGGAL ay totoo. Ibagsak mo siya, bayani.',
   type:'kill', target:'manananggal', n:1, reward:{gold:2500, xp:4000}},
  {id:5, npc:'Panday Iko', icon:'⚒️', title:'Ang Lagusan',
   text:'Ang sinaunang lagusan sa plaza ay gumigising. Kapag umabot ka sa Level 10, tumawid ka — at bumalik nang buhay mula sa Isla ng Bathala. Tumumba ka ng TATLONG halimaw doon.',
   type:'killAny', targets:['wakwak','bungisngis','berberoka'], n:3, reward:{gold:5000, xp:8000}},
];
if (GAME_DATA.quests) QUESTS = GAME_DATA.quests;
function curQuest(){ return S.quests&&!S.quests.done?QUESTS[S.quests.cur]:null; }
window._questKill=(key)=>{
  const q=curQuest(); if(!q) return;
  if((q.type==='kill'&&key===q.target)||(q.type==='killAny'&&q.targets.includes(key))){
    S.quests.prog++;
    if(S.quests.prog>=q.n) toast(`📜 <b>${q.title}</b> — TAPOS NA! Bumalik kay ${q.npc}.`,'levelup');
    else toast(`📜 ${q.title}: ${S.quests.prog}/${q.n}`,'');
    updateQuestHud(); save();
  }
};
function questCollectProg(q){ return Math.min(q.n, S.inv[q.target]||0); }
function questReady(q){
  return q.type==='collect' ? questCollectProg(q)>=q.n : S.quests.prog>=q.n;
}
/* quest HUD tracker */
(function questHud(){
  const el=document.createElement('div');
  el.id='quest-hud';
  el.innerHTML='<button id="qh-toggle" title="I-collapse ang misyon">◀</button><div class="qh-body"></div>';
  if(localStorage.getItem('agimat_quest_col')==='1') el.classList.add('collapsed');
  document.body.appendChild(el);
  el.querySelector('#qh-toggle').addEventListener('click',()=>{
    el.classList.toggle('collapsed');
    localStorage.setItem('agimat_quest_col', el.classList.contains('collapsed')?'1':'0');
  });
})();
function updateQuestHud(){
  const el=$('quest-hud'); if(!el) return;
  const q=curQuest();
  if(!q||!started){ el.style.display='none'; return; }
  const prog=q.type==='collect'?questCollectProg(q):S.quests.prog;
  el.style.display='block';
  el.querySelector('.qh-body').innerHTML=`<b>${q.icon} ${q.title}</b><i>${prog}/${q.n} — ${questReady(q)?'BUMALIK KAY '+q.npc.toUpperCase()+' ✅':q.npc}</i>`;
}
setInterval(updateQuestHud,2000);
/* NPC quest helpers (shared by the Universal NPC Window + legacy wrapper) */
const _openShop=openShop;
window._rawOpenShop=id=>_openShop(id);
const NPC_QUEST_NAMES={trader:'Aling Rosa', blacksmith:'Panday Iko', equipment:'Ka Bining', blackmarket:'Ang Kubrador'};
window._questStateFor=function(npcName){
  const q=curQuest(); if(!q||q.npc!==npcName) return null;
  return {q, ready:questReady(q), prog:q.type==='collect'?questCollectProg(q):S.quests.prog};
};
window._questTurnIn=function(q){
  if(q.type==='collect'){ S.inv[q.target]-=q.n; if(S.inv[q.target]<=0) delete S.inv[q.target]; }
  S.gold+=q.reward.gold; gainXP(q.reward.xp);
  S.quests.cur++; S.quests.prog=0;
  if(S.quests.cur>=QUESTS.length) S.quests.done=true;
  /* relationship: +5 with the quest giver (Universal NPC system) */
  try{
    const nid=Object.keys(NPC_QUEST_NAMES).find(k=>NPC_QUEST_NAMES[k]===q.npc);
    if(nid){ S.npcRel=S.npcRel||{}; S.npcRel[nid]=(S.npcRel[nid]||0)+5; }
  }catch(e){}
  SFX.levelup(); updateHUD(); save(); updateQuestHud();
};
openShop=function(id){
  const q=curQuest();
  const myName=NPC_QUEST_NAMES[id]||'';
  if(q&&q.npc===myName){
    if(questReady(q)){
      window._questTurnIn(q);
      showModal(`<div class="modal-emoji">📜</div><div class="modal-title">${q.title} — TAPOS!</div>
        <p style="text-align:center">"Salamat, bayani! Tanggapin mo ito."</p>
        <p style="text-align:center;font-weight:800;color:#ffd94a">🪙 ${fmt(q.reward.gold)} + ⭐ ${fmt(q.reward.xp)} XP</p>
        ${S.quests.done?'<p style="text-align:center;color:#8aff9a">Natapos mo ang lahat ng misyon! Higit pa ang darating…</p>'
          :`<p style="text-align:center;color:#bfb6d2">Bagong misyon: <b>${QUESTS[S.quests.cur].title}</b> — kausapin si ${QUESTS[S.quests.cur].npc}.</p>`}
        <button class="modal-btn" onclick="closeModal()">🙏 Salamat po!</button>`);
      return;
    }
    /* show quest brief before the shop */
    const prog=q.type==='collect'?questCollectProg(q):S.quests.prog;
    showModal(`<div class="modal-emoji">${q.icon}</div><div class="modal-title">📜 ${q.title}</div>
      <p style="text-align:center">"${q.text}"</p>
      <p style="text-align:center;font-weight:700;color:#7df0ff">${prog}/${q.n}</p>
      <p style="text-align:center;color:#ffd94a;font-size:12px">Gantimpala: 🪙 ${fmt(q.reward.gold)} + ⭐ ${fmt(q.reward.xp)} XP</p>
      <button class="modal-btn" id="q-shop">🛒 Buksan ang Tindahan</button>
      <button class="modal-btn secondary" onclick="closeModal()">Isara</button>`);
    $('q-shop').onclick=()=>{ closeModal(); _openShop(id); };
    return;
  }
  _openShop(id);
};
/* first quest intro */
setInterval(()=>{
  if(started&&S.quests&&S.quests.cur===0&&S.quests.prog===0&&!S.quests.done&&!window._qIntro){
    window._qIntro=true;
    toast('📜 Bagong misyon: <b>Ang Unang Alay</b> — kausapin si Aling Rosa ⚖️ sa Tiangge!','levelup');
  }
},4000);

/* ---------- PETS & MOUNTS ---------- */
const PET_DEFS={
  sarimanok:{name:'Sarimanok', icon:'🐓', cost:2500, type:'pet',
    desc:'Maalamat na ibon ng kasaganaan. +12% Drop Rate.',
    build(){ const g=new THREE.Group();
      const body=new THREE.Mesh(new THREE.SphereGeometry(0.32,7,6), M(0xf2b134)); body.position.y=0.4; g.add(body);
      const head=new THREE.Mesh(new THREE.SphereGeometry(0.18,6,5), M(0xff6a4a)); head.position.set(0,0.72,0.18); g.add(head);
      const beak=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.16,4), M(0xffd94a)); beak.position.set(0,0.7,0.38); beak.rotation.x=Math.PI/2; g.add(beak);
      const tail=new THREE.Group(); tail.position.set(0,0.5,-0.25); g.add(tail);
      const tc=[0xff4a6a,0x7df0ff,0x8aff9a,0xd8a8ff];
      for(let i=0;i<4;i++){ const f=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.6,4), M(tc[i],{emissive:tc[i],emissiveIntensity:0.4}));
        f.position.set((i-1.5)*0.1,0.2,-0.1); f.rotation.x=-2.2-i*0.1; tail.add(f); }
      return g; }},
  tarsier:{name:'Tarsier', icon:'🐒', cost:2500, type:'pet',
    desc:'Maliit na matalino. +10% XP Gain.',
    build(){ const g=new THREE.Group();
      const body=new THREE.Mesh(new THREE.SphereGeometry(0.26,7,6), M(0x9a8468)); body.position.y=0.3; g.add(body);
      const head=new THREE.Mesh(new THREE.SphereGeometry(0.22,7,6), M(0xac9678)); head.position.y=0.66; g.add(head);
      for(const sx of [-1,1]){
        const eye=new THREE.Mesh(new THREE.SphereGeometry(0.09,6,5), M(0x2a1c10)); eye.position.set(sx*0.09,0.7,0.16); g.add(eye);
        const glint=new THREE.Mesh(new THREE.SphereGeometry(0.03,4,4), M(0xffffff)); glint.position.set(sx*0.07,0.73,0.23); g.add(glint);
        const ear=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.14,4), M(0x9a8468)); ear.position.set(sx*0.16,0.86,0); g.add(ear);
      }
      const tailT=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.03,0.5,4), M(0x8a7458)); tailT.position.set(0,0.25,-0.3); tailT.rotation.x=0.9; g.add(tailT);
      return g; }},
  paniki:{name:'Paniki', icon:'🦇', cost:2500, type:'pet',
    desc:'Kambal-dugo ng gabi. +4% Life Steal.',
    build(){ const g=new THREE.Group();
      const body=new THREE.Mesh(new THREE.SphereGeometry(0.22,6,5), M(0x35284a)); body.position.y=0.5; g.add(body);
      for(const sx of [-1,1]){
        const wing=new THREE.Mesh(new THREE.ConeGeometry(0.3,0.7,3), M(0x241a38,{transparent:true,opacity:0.9}));
        wing.position.set(sx*0.35,0.55,0); wing.rotation.z=sx*1.7; wing.scale.z=0.2; g.add(wing);
        const eye=new THREE.Mesh(new THREE.SphereGeometry(0.04,4,4), M(0xff4a2a,{emissive:0xff2a00,emissiveIntensity:1.5})); eye.position.set(sx*0.07,0.6,0.18); g.add(eye);
      }
      return g; }},
  kalabaw:{name:'Kalabaw', icon:'🐃', cost:6000, type:'mount',
    desc:'Matapat na kalabaw. SAKYAN: +60% bilis ng takbo!',
    build(){ const g=new THREE.Group();
      const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.55,1.1,4,8), M(0x4a4048)); body.rotation.z=Math.PI/2; body.position.y=0.95; g.add(body);
      const head=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.6), M(0x554a52)); head.position.set(0,1.15,0.95); g.add(head);
      for(const sx of [-1,1]){
        const horn=new THREE.Mesh(new THREE.TorusGeometry(0.28,0.05,5,10,Math.PI*0.8), M(0xd8d0c0));
        horn.position.set(sx*0.22,1.4,0.9); horn.rotation.y=sx*0.5; horn.rotation.z=sx*-0.6; g.add(horn);
        for(const fz of [0.55,-0.55]){
          const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.11,0.85,5), M(0x3e3640));
          leg.position.set(sx*0.3,0.42,fz); g.add(leg);
        }
      }
      const tail=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.02,0.7,4), M(0x3e3640)); tail.position.set(0,0.95,-1.1); tail.rotation.x=0.5; g.add(tail);
      return g; }},
};
let petMesh=null, petBob=0;
function refreshPetMesh(){
  if(petMesh){ scene.remove(petMesh); petMesh=null; }
  const id=S.pets&&S.pets.active;
  if(!id||!PET_DEFS[id]) return;
  petMesh=PET_DEFS[id].build();
  petMesh.traverse(o=>{ if(o.isMesh)o.castShadow=true; });
  scene.add(petMesh);
}
/* pet follow + mount ride (piggyback on the anim loop via interval-lite RAF) */
(function petTick(){
  requestAnimationFrame(petTick);
  if(!petMesh||!started){ return; }
  const id=S.pets.active, def=PET_DEFS[id];
  petBob+=0.05;
  if(def.type==='mount'&&S.pets.mounted){
    /* under the player, facing player yaw */
    petMesh.position.set(player.x, groundY(player.x,player.z)+0.15, player.z);
    petMesh.rotation.y=player.yaw;
    if(player.mesh) player.mesh.position.y+=1.05;   // rider sits on top
  } else {
    /* trail behind the player */
    const tx=player.x-Math.sin(player.yaw)*2.2, tz=player.z-Math.cos(player.yaw)*2.2;
    const k=0.06;
    petMesh.position.x+=(tx-petMesh.position.x)*k;
    petMesh.position.z+=(tz-petMesh.position.z)*k;
    const gy=groundY(petMesh.position.x,petMesh.position.z);
    petMesh.position.y=gy+(id==='paniki'||id==='sarimanok'?0.8+Math.sin(petBob)*0.15:Math.abs(Math.sin(petBob*2))*0.08);
    petMesh.rotation.y=Math.atan2(player.x-petMesh.position.x,player.z-petMesh.position.z);
  }
})();
/* Pet shop UI — the 🐾 Kubrador sells creatures */
function openPets(){
  const owned=S.pets.owned||[];
  showModal(`<div class="modal-emoji">🐾</div><div class="modal-title">Mga Alaga at Sasakyan</div>
    ${Object.entries(PET_DEFS).map(([id,d])=>{
      const has=owned.includes(id), active=S.pets.active===id;
      return `<div class="fr-row">
        <span style="font-size:22px">${d.icon}</span>
        <div class="fr-info"><b>${d.name} ${d.type==='mount'?'(SASAKYAN)':''}</b><i>${d.desc}</i></div>
        ${has? (active
            ? (d.type==='mount'
               ? `<button class="mini-btn" data-ride="${id}">${S.pets.mounted?'BUMABA':'SAKYAN'}</button>`
               : `<button class="mini-btn sell" data-off="${id}">IBABA</button>`)
            : `<button class="mini-btn" data-on="${id}">GAMITIN</button>`)
          : `<button class="mini-btn" data-buy="${id}">🪙 ${fmt(d.cost)}</button>`}
      </div>`;}).join('')}
    <p style="font-size:11px;color:#8a80a2;text-align:center">Isa lang ang aktibong alaga. Ang kalabaw ay sasakyan — bibilis ang takbo mo nang 60%!</p>
    <button class="modal-btn" onclick="closeModal()">Isara</button>`);
  document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.buy, d=PET_DEFS[id];
    if(S.gold<d.cost){ toast('Kulang ang ginto!','warn'); return; }
    S.gold-=d.cost; S.pets.owned.push(id); S.pets.active=id; S.pets.mounted=false;
    computeStats(); refreshPetMesh(); updateHUD(); save(); SFX.levelup();
    toast(`${d.icon} Nabili mo si <b>${d.name}</b>!`,'levelup'); openPets();
  });
  document.querySelectorAll('[data-on]').forEach(b=>b.onclick=()=>{
    S.pets.active=b.dataset.on; S.pets.mounted=false;
    computeStats(); refreshPetMesh(); save(); openPets();
  });
  document.querySelectorAll('[data-off]').forEach(b=>b.onclick=()=>{
    S.pets.active=null; S.pets.mounted=false;
    computeStats(); refreshPetMesh(); save(); openPets();
  });
  document.querySelectorAll('[data-ride]').forEach(b=>b.onclick=()=>{
    S.pets.mounted=!S.pets.mounted;
    computeStats(); save(); SFX.dodge();
    toast(S.pets.mounted?'🐃 Sakay ka na! Bilisan mo!':'Bumaba ka sa kalabaw.','');
    openPets();
  });
}
window.openPets=openPets;
/* pets button in HUD */
(function(){
  const b=document.createElement('button');
  b.className='menu-btn'; b.id='btn-pets'; b.title='Mga Alaga'; b.textContent='🐾';
  document.querySelector('.hud-right').appendChild(b);
  b.onclick=openPets;
})();
/* mount quick-toggle in the action cluster (shows once a mount is owned) */
(function(){
  const b=document.createElement('button');
  b.className='ctl-btn tiny'; b.id='btn-mount'; b.title='Sakyan / Bumaba'; b.textContent='🐃';
  b.style.display='none';
  $('action-cluster').appendChild(b);
  b.onclick=()=>{
    const mountId=(S.pets.owned||[]).find(id=>PET_DEFS[id]&&PET_DEFS[id].type==='mount');
    if(!mountId) return;
    if(S.pets.active!==mountId){ S.pets.active=mountId; S.pets.mounted=true; refreshPetMesh(); }
    else S.pets.mounted=!S.pets.mounted;
    computeStats(); save(); SFX.dodge();
    b.classList.toggle('riding',S.pets.mounted);
    toast(S.pets.mounted?'🐃 Sakay ka na! +60% bilis!':'Bumaba ka sa kalabaw.','');
  };
  setInterval(()=>{
    const has=(S.pets&&S.pets.owned||[]).some(id=>PET_DEFS[id]&&PET_DEFS[id].type==='mount');
    b.style.display=(started&&has)?'flex':'none';
    b.classList.toggle('riding',!!(S.pets&&S.pets.mounted));
  },1500);
})();
/* restore pet on load */
setInterval(()=>{ if(started&&S.pets&&S.pets.active&&!petMesh) refreshPetMesh(); },2000);

/* preload friend keys for the 💞 chat channel filter */
setInterval(async()=>{
  if(ACCT.token && !window._friendKeys){
    try{ const r=await api('/api/friends',{token:ACCT.token});
      if(r.ok) window._friendKeys=new Set(r.list.map(f=>f.key)); }catch(e){}
  }
},5000);

/* ---- rotate-to-landscape hint for phones (with fullscreen shortcut) ---- */
(function rotateHint(){
  const el=document.createElement('div');
  el.id='rotate-hint';
  el.innerHTML='<div class="rh-icon">📱</div>'+
    '<div>IKOT ANG PHONE MO</div>'+
    '<small>Ang Agimat Online ay mas maganda sa <b>landscape</b> — parang totoong RPG!</small>'+
    '<button id="rh-go">⛶ LANDSCAPE + FULL SCREEN</button>'+
    '<small id="rh-skip" style="text-decoration:underline;cursor:pointer">ituloy pa rin sa portrait</small>';
  document.body.appendChild(el);
  let dismissed=sessionStorage.getItem('agimat_rh_skip')==='1';
  function arm(){ el.classList.toggle('armed', started&&!dismissed); }
  setInterval(arm,1500);
  el.querySelector('#rh-go').onclick=async()=>{ await enterFullscreen(); };
  el.querySelector('#rh-skip').onclick=()=>{ dismissed=true; sessionStorage.setItem('agimat_rh_skip','1'); el.classList.remove('armed'); };
})();

/* ================================================================
   GLB MODEL LOADER — drop .glb files in /models and register here.
   When a model is registered for a class/enemy/pet, it replaces the
   procedural mesh automatically; otherwise the procedural one stays.
   ================================================================ */
const gltfLoader=new GLTFLoader();
const MODEL_CACHE={};   // url -> {scene, animations}
function loadGLB(url){
  if(MODEL_CACHE[url]) return Promise.resolve(MODEL_CACHE[url]);
  return new Promise((res,rej)=>{
    gltfLoader.load(url, g=>{
      g.scene.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=false; } });
      MODEL_CACHE[url]={scene:g.scene, animations:g.animations||[]};
      res(MODEL_CACHE[url]);
    }, undefined, rej);
  });
}
/* ---- REGISTRY: map game things to .glb files ----
   Uncomment / add lines as your artist delivers files, e.g.:
   MODELS.hero.babaylan  = 'models/babaylan.glb';
   MODELS.enemy.tiyanak  = 'models/tiyanak.glb';
   MODELS.pet.sarimanok  = 'models/sarimanok.glb';                */
const MODELS={ hero:{}, enemy:{}, pet:{}, npc:{} };
/* Registry-driven population (spec §19): data/models/registry.json is authoritative.
   Fallback entries (if the registry fetch failed) are added further below. */
(function populateFromRegistry(){
  const R=GAME_DATA.models; if(!R) return;
  const buckets=[['heroes','hero'],['enemies','enemy'],['pets','pet'],['npcs','npc']];
  for(const [rk,mk] of buckets){
    const grp=R[rk]||{};
    for(const id in grp){
      const ent=grp[id];
      if(ent && ent.baseModel) MODELS[mk][id]=ent.baseModel;
    }
  }
})();
window.MODELS=MODELS;   // handy for testing in the browser console

/* clone a cached model (SkeletonUtils-lite: fine for static or simple rigs) */
function instantiateGLB(url, scaleToHeight){
  const c=MODEL_CACHE[url]; if(!c) return null;
  const inst=c.scene.clone(true);
  if(scaleToHeight){
    const box=new THREE.Box3().setFromObject(inst);
    const h=box.max.y-box.min.y;
    if(h>0){ const k=scaleToHeight/h; inst.scale.setScalar(k); }
    const box2=new THREE.Box3().setFromObject(inst);
    inst.position.y-=box2.min.y;                      // feet on the ground
  }
  return inst;
}
/* hero swap: wraps buildHero — if a GLB is registered it is used */
const _buildHeroGLB=buildHero;
buildHero=function(cls, appOverride){
  const url=MODELS.hero[cls];
  if(url && MODEL_CACHE[url]){
    const g=new THREE.Group();
    const m=instantiateGLB(url, 2.6);                 // heroes ≈2.6 world units tall
    g.add(m);
    const sh=blobShadow(1); sh.position.y=0.02; g.add(sh);
    /* keep anim API shape: empty limb refs so existing anim code no-ops */
    const dummy=new THREE.Group();
    g.userData={legL:dummy,legR:dummy,armL:dummy,armR:dummy,weapArm:dummy,glb:true};
    return g;
  }
  return _buildHeroGLB(cls, appOverride);
};
/* enemy swap: wraps buildEnemyMesh the same way */
const _buildEnemyGLB=buildEnemyMesh;
buildEnemyMesh=function(key){
  const url=MODELS.enemy[key];
  if(url && MODEL_CACHE[url]){
    const g=new THREE.Group();
    const def=ENEMY_DEFS[key];
    const m=instantiateGLB(url, 2.2*def.scale);
    g.add(m);
    g.userData.anim={};                                // no procedural anim parts
    return g;
  }
  return _buildEnemyGLB(key);
};
/* preload every registered model at boot (missing files fail silently) */
(function preloadModels(){
  for(const bucket of Object.values(MODELS))
    for(const url of Object.values(bucket))
      loadGLB(url).catch(()=>console.warn('GLB missing:',url));
})();
window.loadGLB=loadGLB; window.instantiateGLB=instantiateGLB;

/* ================================================================
   PHASE 1 MODULE — enhancement UI · daily/weekly quests · day/night
   ================================================================ */

/* ---------- [5] PANDAYAN: gear enhancement +1→+10 ---------- */
function openEnhance(){
  const candidates=[...Object.values(S.gear).filter(Boolean), ...S.bag].filter(it=>(it.plus||0)<10);
  showModal(`<div class="modal-emoji">🔨</div><div class="modal-title">Pandayan ni Iko</div>
    <p class="screen-sub">"Dalhin mo dito ang gamit mo — papagbagain ko sa apoy ng bulkan!"<br>
    Bawat +1: <b>+8% pangunahing stat</b>. Tumataas ang gastos, bumababa ang tsansa.</p>
    <div class="card-list" style="max-height:46vh;overflow-y:auto">
    ${candidates.length?candidates.map(it=>{
      const c=enhanceCost(it), rate=enhanceRate(it);
      const has=S.gold>=c.gold&&(S.inv.bato||0)>=c.bato&&(S.inv.anito_dust||0)>=(c.anito_dust||0);
      const equipped=Object.values(S.gear).some(g2=>g2&&g2.uid===it.uid);
      return `<div class="fr-row">
        <span style="font-size:20px">${it.icon}</span>
        <div class="fr-info"><b>${it.name}${plusTag(it)} ${equipped?'· <i style="color:#8aff9a">suot</i>':''}</b>
        <i>${mainStatTxt(it)} → ${(()=>{const n={...it,plus:(it.plus||0)+1};return mainStatTxt(n);})()}
        · 🪙${fmt(c.gold)} + 🪨${c.bato}${c.anito_dust?' + ✨'+c.anito_dust:''} · ${Math.round(rate*100)}% tsansa</i></div>
        <button class="mini-btn" data-enh="${it.uid}" ${has?'':'disabled style="opacity:.4"'}>+${(it.plus||0)+1}</button>
      </div>`;}).join(''):'<div class="empty-note">Walang gamit na maaaring palakasin (max +10 na lahat?).</div>'}
    </div>
    <button class="modal-btn secondary" onclick="closeModal()">Isara</button>`);
  document.querySelectorAll('[data-enh]').forEach(b=>b.onclick=()=>{
    const uid=+b.dataset.enh;
    const it=[...Object.values(S.gear).filter(Boolean),...S.bag].find(x=>x&&x.uid===uid);
    if(!it) return;
    const c=enhanceCost(it), rate=enhanceRate(it);
    if(S.gold<c.gold||(S.inv.bato||0)<c.bato||(S.inv.anito_dust||0)<(c.anito_dust||0)){ toast('Kulang ang materyales!','warn'); return; }
    S.gold-=c.gold; S.inv.bato-=c.bato; if(c.anito_dust){ S.inv.anito_dust-=c.anito_dust; }
    if(Math.random()<rate){
      it.plus=(it.plus||0)+1;
      SFX.levelup(); screenShake(0.2,0.25);
      fxRing(player.x,player.z,0xffb87e,0.4,3,0.5);
      toast(`🔨 TAGUMPAY! ${it.name} ay <b>+${it.plus}</b> na!`,'levelup');
      if(window._chatSys) window._chatSys(`🔨 Pinanday: ${it.name} +${it.plus}!`,'loot');
      if(window._questProg) window._questProg('enhance',1);
    } else {
      SFX.hurt&&SFX.hurt(); 
      toast(`💥 Nabigo ang pagpanday… hindi nasira ang gamit, pero nawala ang materyales.`,'warn');
    }
    computeStats(); updateHUD(); save(); openEnhance();
  });
}
window.openEnhance=openEnhance;

/* ---------- [3] DAILY & WEEKLY QUESTS ---------- */
function dayKeyLocal(){ const d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function weekKeyLocal(){ const d=new Date(); const onejan=new Date(d.getFullYear(),0,1);
  const wk=Math.ceil((((d-onejan)/86400000)+onejan.getDay()+1)/7); return d.getFullYear()+'-w'+wk; }
const DAILY_POOL=[
  {id:'d_kill_tiyanak', txt:'Tumumba ng 20 Tiyanak',   type:'kill', key:'tiyanak', n:20, rw:{gold:800,  xp:1200}},
  {id:'d_kill_duwende', txt:'Tumumba ng 15 Duwende',   type:'kill', key:'duwende', n:15, rw:{gold:800,  xp:1200}},
  {id:'d_kill_any',     txt:'Tumumba ng 30 halimaw',   type:'killany', n:30,           rw:{gold:1000, xp:1500}},
  {id:'d_forage',       txt:'Mag-ani ng 12 beses',     type:'forage', n:12,            rw:{gold:700,  xp:1000}},
  {id:'d_gold',         txt:'Kumita ng 2,000 ginto',   type:'gold', n:2000,            rw:{gold:600,  xp:1400}},
];
const WEEKLY_POOL=[
  {id:'w_elite',   txt:'Tumumba ng 25 Elite (Kapre/Aswang/Santelmo/Bungisngis)', type:'killelite', n:25, rw:{gold:5000, xp:9000}},
  {id:'w_boss',    txt:'Talunin ang Manananggal 2 beses', type:'kill', key:'manananggal', n:2, rw:{gold:8000, xp:15000}},
  {id:'w_kills',   txt:'Tumumba ng 200 halimaw',          type:'killany', n:200,           rw:{gold:6000, xp:12000}},
  {id:'w_enhance', txt:'Magpanday ng 5 beses kay Iko',    type:'enhance', n:5,             rw:{gold:4000, xp:8000}},
];
function pick2(pool,seedStr){
  /* deterministic per-day picks so everyone shares the same dailies */
  if(!pool||!pool.length) return [];
  let h=0; for(const ch of seedStr) h=(h*31+ch.charCodeAt(0))>>>0;
  const a=h%pool.length; let b=(h>>3)%pool.length; if(b===a) b=(b+1)%pool.length;
  return [pool[a],pool[b]].filter(q=>q&&q.id);
}
function ensurePeriodQuests(){
  if(!S.periodQ) S.periodQ={};
  const dk=dayKeyLocal(), wk=weekKeyLocal();
  if(S.periodQ.dayKey!==dk){
    S.periodQ.dayKey=dk;
    // Defensive: validate picked defs (quest system is being overhauled; this only
    // guarantees a well-formed list and never throws).
    let d=pick2(DAILY_POOL,dk);
    if(!d.length) d=DAILY_POOL.slice(0,2);
    S.periodQ.daily=d.map(q=>({id:q.id,prog:0,done:false,claimed:false}));
  }
  if(S.periodQ.weekKey!==wk){
    S.periodQ.weekKey=wk;
    const wq=WEEKLY_POOL[(wk.charCodeAt(wk.length-1)+wk.length)%WEEKLY_POOL.length]||WEEKLY_POOL[0];
    S.periodQ.weekly=wq?[{id:wq.id,prog:0,done:false,claimed:false}]:[];
  }
}
function qDef(id){ return DAILY_POOL.find(q=>q.id===id)||WEEKLY_POOL.find(q=>q.id===id); }
window._questProg=(kind,amt,key)=>{
  if(!started) return;
  ensurePeriodQuests();
  let changed=false;
  for(const list of [S.periodQ.daily,S.periodQ.weekly]){
    for(const q of list||[]){
      if(q.done) continue;
      const def=qDef(q.id); if(!def) continue;
      const match=(def.type==='kill'&&kind==='kill'&&key===def.key)
        ||(def.type==='killany'&&kind==='kill')
        ||(def.type==='killelite'&&kind==='killelite')
        ||(def.type==='forage'&&kind==='forage')
        ||(def.type==='gold'&&kind==='gold')
        ||(def.type==='enhance'&&kind==='enhance');
      if(!match) continue;
      q.prog+=amt; changed=true;
      if(q.prog>=def.n){ q.done=true; toast(`📅 <b>${def.txt}</b> — TAPOS! Kunin ang gantimpala sa 📅.`,'levelup'); }
    }
  }
  if(changed) save();
};
/* hooks: kill/forage/gold */
const _killReward_pq=killReward;
killReward=function(en){
  const def=ENEMY_DEFS[en.key];
  _killReward_pq(en);
  window._questProg('kill',1,en.key);
  if(def.tier==='Elite') window._questProg('killelite',1);
};
const _harvest_pq=harvestNode;
harvestNode=function(n){ _harvest_pq(n); window._questProg('forage',1); };
/* gold: watch pickups via S.gold delta each second */
(function goldWatch(){
  let last=null;
  setInterval(()=>{
    if(!started){ last=null; return; }
    if(last!=null && S.gold>last) window._questProg('gold',S.gold-last);
    last=S.gold;
  },1000);
})();
/* 📅 quest panel button + modal */
(function(){
  const b=document.createElement('button');
  b.className='menu-btn'; b.id='btn-daily'; b.title='Araw-araw na Misyon'; b.textContent='📅';
  document.querySelector('.hud-right').appendChild(b);
  b.onclick=openPeriodQuests;
  /* red badge when a reward is claimable */
  setInterval(()=>{
    if(!started||!S.periodQ) return;
    const claimable=[...(S.periodQ.daily||[]),...(S.periodQ.weekly||[])].some(q=>q.done&&!q.claimed);
    let em=b.querySelector('.badge');
    if(claimable&&!em){ em=document.createElement('em'); em.className='badge'; em.textContent='!'; b.appendChild(em); }
    if(!claimable&&em) em.remove();
  },3000);
})();
function openPeriodQuests(){
  ensurePeriodQuests();
  const row=(q,weekly)=>{
    const def=qDef(q.id); if(!def) return '';   // stale/unknown quest id → skip
    const pct=Math.min(100,Math.round(q.prog/def.n*100));
    return `<div class="fr-row">
      <span style="font-size:18px">${weekly?'🗓️':'📅'}</span>
      <div class="fr-info"><b>${def.txt}</b>
        <i>${Math.min(q.prog,def.n)}/${def.n} · 🪙${fmt(def.rw.gold)} + ⭐${fmt(def.rw.xp)} XP</i>
        <div style="height:5px;background:rgba(255,255,255,.1);border-radius:3px;margin-top:3px"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#c98d1e,#ffd97a);border-radius:3px"></div></div>
      </div>
      ${q.claimed?'<span style="color:#8aff9a;font-size:11px;font-weight:700">✔ KUHA NA</span>'
        :q.done?`<button class="mini-btn" data-claim="${q.id}">KUNIN</button>`
        :''}
    </div>`;
  };
  showModal(`<div class="modal-emoji">📅</div><div class="modal-title">Mga Misyon ng Araw at Linggo</div>
    <div class="set-sec">📅 Araw-araw (nagre-reset tuwing hatinggabi)</div>
    ${(S.periodQ.daily||[]).map(q=>row(q,false)).join('')}
    <div class="set-sec">🗓️ Lingguhan</div>
    ${(S.periodQ.weekly||[]).map(q=>row(q,true)).join('')}
    <button class="modal-btn" onclick="closeModal()">Isara</button>`);
  document.querySelectorAll('[data-claim]').forEach(bt=>bt.onclick=()=>{
    const q=[...(S.periodQ.daily||[]),...(S.periodQ.weekly||[])].find(x=>x.id===bt.dataset.claim);
    if(!q||!q.done||q.claimed) return;
    const def=qDef(q.id); if(!def) return;   // stale id → nothing to claim
    q.claimed=true;
    S.gold+=def.rw.gold; gainXP(def.rw.xp);
    SFX.levelup();
    toast(`📅 Gantimpala: 🪙${fmt(def.rw.gold)} + ⭐${fmt(def.rw.xp)} XP!`,'levelup');
    if(window._chatSys) window._chatSys(`📅 Natapos ang misyon: ${def.txt}`,'xp');
    updateHUD(); save(); openPeriodQuests();
  });
}
window.openPeriodQuests=openPeriodQuests;
setInterval(()=>{ if(started) ensurePeriodQuests(); },60000);

/* ---------- [14] DAY / NIGHT CYCLE ---------- */
/* full cycle = 20 min real time: 12 day + 2 dusk + 5 night + 1 dawn */
const DAYNIGHT={len:1200, t:0, phase:'day', mult:1};
function dnPhase(f){ return f<0.60?'day' : f<0.70?'dusk' : f<0.95?'night' : 'dawn'; }
(function dayNight(){
  const sunLight=scene.children.find(o=>o.isDirectionalLight);
  const hemi=scene.children.find(o=>o.isHemisphereLight);
  const amb=scene.children.find(o=>o.isAmbientLight);
  const sky0=scene.background&&scene.background.isColor?scene.background.clone():null;
  const fog0=scene.fog?scene.fog.color.clone():null;
  const NIGHT_SKY=new THREE.Color(0x0a0e2a), NIGHT_FOG=new THREE.Color(0x0c1030);
  const DUSK_SKY=new THREE.Color(0x4a2a3a);
  DAYNIGHT.t=DAYNIGHT.len*0.15;                              // start mid-morning
  let lastPhase='day';
  setInterval(()=>{
    if(!started) return;
    DAYNIGHT.t=(DAYNIGHT.t+1)%DAYNIGHT.len;
    const f=DAYNIGHT.t/DAYNIGHT.len;
    const ph=dnPhase(f);
    DAYNIGHT.phase=ph;
    /* smooth lerp targets */
    let dark = ph==='day'?0 : ph==='dusk'?(f-0.60)/0.10 : ph==='night'?1 : 1-(f-0.95)/0.05;
    dark=clamp(dark,0,1);
    if(sunLight) sunLight.intensity=(sunLight.userData._base||(sunLight.userData._base=sunLight.intensity))*(1-dark*0.82);
    if(hemi) hemi.intensity=(hemi.userData._base||(hemi.userData._base=hemi.intensity))*(1-dark*0.62);
    if(amb) amb.intensity=(amb.userData._base||(amb.userData._base=amb.intensity))*(1-dark*0.45);
    if(sky0&&scene.background&&scene.background.isColor){
      scene.background.copy(sky0).lerp(dark>0&&ph==='dusk'?DUSK_SKY:NIGHT_SKY, dark*(ph==='dusk'?0.6:0.92));
    }
    if(fog0&&scene.fog) scene.fog.color.copy(fog0).lerp(NIGHT_FOG,dark*0.9);
    DAYNIGHT.mult=1+dark*0.5;                                // night: enemies +50% dmg/hp on spawn
    if(ph!==lastPhase){
      lastPhase=ph;
      if(ph==='night'){ toast('🌙 <b>GABI NA…</b> Lumalakas ang mga aswang. Mag-ingat!','warn');
        if(window._chatSys) window._chatSys('🌙 Sumapit ang gabi — mas malakas ang mga halimaw!','xp'); }
      if(ph==='day'){ toast('☀️ Umaga na! Humupa ang kapangyarihan ng dilim.',''); }
      if(ph==='dusk'){ toast('🌆 Takipsilim… may gumagalaw sa mga anino.',''); }
    }
  },1000);
})();
/* night effects on enemies: spawn-time buff for the dark tribe + santelmo night-only */
const NIGHT_TRIBE=new Set(['aswang','wakwak','sigbin','tiyanak','manananggal']);
/* Phase 9b (spec §9): data-driven night ecology.
   nightHunters may ONLY roam after dark; at night their spawn odds surge.
   Config lives in data/enemies/spawn-rules.json (inline fallback below). */
const NIGHT_RULES=Object.assign(
  {nightHunters:['aswang','wakwak'], duskAllowed:true, nightWeightMult:3, dayDespawn:true},
  (GAME_DATA.spawnRules&&GAME_DATA.spawnRules.nightRules)||{});
const NIGHT_HUNTERS=new Set(NIGHT_RULES.nightHunters);
function nightActive(){ return DAYNIGHT.phase==='night'||(NIGHT_RULES.duskAllowed&&DAYNIGHT.phase==='dusk'); }
const _spawnEnemy_dn=spawnEnemy;
spawnEnemy=function(force,forceKey){
  /* santelmo spawns only at dusk/night */
  if(forceKey==='santelmo'&&DAYNIGHT.phase==='day') return;
  /* night hunters (Aswang/Wakwak) never spawn in daylight */
  if(forceKey&&NIGHT_HUNTERS.has(forceKey)&&!nightActive()) return;
  if(!forceKey&&!nightActive()){
    /* weighted roll happens inside; pre-filter by re-rolling day-illegal picks */
    for(let tries=0;tries<4;tries++){
      const before=enemies.length;
      const ret=_spawnEnemy_dn(force,forceKey);
      const spawned=enemies.length>before?enemies[enemies.length-1]:null;
      if(spawned&&NIGHT_HUNTERS.has(spawned.key)){
        removeEnemy(spawned); continue;   // rolled a night hunter in daytime — despawn silently, re-roll
      }
      return ret;
    }
    return;
  }
  return _spawnEnemy_dn(force,forceKey);
};
/* at night: surge night-hunter spawns (dedicated extra roll) */
setInterval(()=>{
  if(!started||!nightActive()) return;
  if(window._netIsGuest&&window._netIsGuest()) return;
  if(enemies.length>=MAX_ENEMIES+6) return;                    // small night overflow budget
  const pool=NIGHT_RULES.nightHunters.filter(k=>ENEMY_DEFS[k]&&S.level>=ENEMY_DEFS[k].minLevel);
  if(!pool.length) return;
  for(let i=0;i<Math.max(1,Math.round(NIGHT_RULES.nightWeightMult/2));i++)
    _spawnEnemy_dn(true,pool[Math.floor(Math.random()*pool.length)]);
},7000);
/* at dawn: night hunters slink away (no loot — they were not killed) */
setInterval(()=>{
  if(!started||nightActive()||!NIGHT_RULES.dayDespawn) return;
  if(window._netIsGuest&&window._netIsGuest()) return;
  for(let i=enemies.length-1;i>=0;i--){ const en=enemies[i];
    if(!NIGHT_HUNTERS.has(en.key)||en.remote) continue;
    fxBurst(en.x,en.z,0x9a6af2,1.4);
    removeEnemy(en);
  }
},9000);
/* buff freshly-spawned night-tribe enemies while it's dark */
setInterval(()=>{
  if(!started||DAYNIGHT.phase!=='night') return;
  for(const en of enemies){
    if(en._nightBuffed||!NIGHT_TRIBE.has(en.key)) continue;
    en._nightBuffed=true;
    en.maxHp=Math.round(en.maxHp*1.4); en.hp=Math.round(en.hp*1.4);
    en._nightDmg=1.5;                                        // read by dealTo wrapper below
  }
},2500);
/* night damage multiplier on the player-hurt path */
const _dealTo_dn=typeof dealTo==='function'?dealTo:null;
if(_dealTo_dn){
  dealTo=function(tgt,dmg,opts){
    /* find if the attacker context is a night-buffed enemy: approximate via phase */
    if(DAYNIGHT.phase==='night') dmg=Math.round(dmg*1.25);
    return _dealTo_dn(tgt,dmg,opts);
  };
}
/* clock chip in the HUD (top center, next to party pill) */
(function dnChip(){
  const c=document.createElement('div');
  c.id='dn-chip';
  c.style.cssText='position:fixed;top:8px;left:calc(50% + 110px);z-index:40;background:rgba(20,14,34,.72);border:1px solid rgba(125,240,255,.3);color:#d8e8ff;font:700 11px system-ui;padding:4px 10px;border-radius:999px;backdrop-filter:blur(6px);pointer-events:none;display:none';
  document.body.appendChild(c);
  setInterval(()=>{
    if(!started){ c.style.display='none'; return; }
    c.style.display='block';
    const ic={day:'☀️',dusk:'🌆',night:'🌙',dawn:'🌅'}[DAYNIGHT.phase];
    c.textContent=ic+' '+({day:'Araw',dusk:'Takipsilim',night:'Gabi',dawn:'Madaling-araw'})[DAYNIGHT.phase];
    c.style.borderColor=DAYNIGHT.phase==='night'?'rgba(200,140,255,.5)':'rgba(125,240,255,.3)';
  },2000);
})();


/* ================================================================
   PHASE 2 MODULE — Class Advancement · Achievements & Titles ·
   Anito Set Bonuses · Channel System UI · Party XP Share & Buffs
   ================================================================ */

/* ---------- [2] CLASS ADVANCEMENT (Lv20) ---------- */
const ADV_DEFS={
  babaylan:  {name:'Katalonan',        icon:'🌺', perk:'+8% Life Steal · ang mga ninuno mismo ang gumagamot sa iyo',
              apply:st=>{ st.ls+=8; }},
  arnisador: {name:'Eskrimador',       icon:'🥋', perk:'+10% dagdag na Attack · walang kapantay ang kamay',
              apply:st=>{ st.atkM*=1.10; }},
  tirador:   {name:'Agilang Mata',     icon:'🦅', perk:'+15% Crit Chance · nakikita mo ang hindi nakikita',
              apply:st=>{ st.critCh+=15; }},
  alim:      {name:'Salamangkero',     icon:'🔮', perk:'+15% Cooldown Speed · mas mabilis ang mga sigilo',
              apply:st=>{ st.cdr+=15; }},
  mandirigma:{name:'Bagani',           icon:'🛡️', perk:'+20% Max HP at +15% Defense · pader ng tribu',
              apply:st=>{ st.hpM*=1.20; st.defM*=1.15; }},
  mamamana:  {name:'Punong Mangangaso',icon:'🏹', perk:'+40% Crit Damage · bawat palaso ay hatol',
              apply:st=>{ st.critDmg+=40; }},
  mangkukulam:{name:'Aswang na Reyna', icon:'🕷️', perk:'+10% ATK at +6% Life Steal · ang sumpa ay dumadaloy pabalik',
              apply:st=>{ st.atkM*=1.10; st.ls+=6; }},
  anino:     {name:'Multo',            icon:'👻', perk:'+12% Move Speed at +8% Crit · hindi ka na tao, alingawngaw ka na',
              apply:st=>{ st.spdM*=1.12; st.critCh+=8; }},
  panday:    {name:'Panday ng Bulkan', icon:'🌋', perk:'+12% Attack at +10% Max HP · tibok ng bulkan sa iyong maso',
              apply:st=>{ st.atkM*=1.12; st.hpM*=1.10; }},
};
const ADV_COST={gold:3000, anito_dust:10};
function advName(){ return (S.adv&&ADV_DEFS[S.cls])?ADV_DEFS[S.cls].name:CLASSES[S.cls]?CLASSES[S.cls].name:''; }
window._advDisplay=(cls)=>ADV_DEFS[cls]?ADV_DEFS[cls].name:null;   // welcome char-select card

/* ---------- [6] ANITO SET BONUSES (3/4/5/6-piece) ---------- */
const SET_DEFS={
  apoy: {name:'Anito ng Apoy',   icon:'🔥', color:'#ff9a5e',
    tiers:{3:'+10% Attack',4:'+25% Crit Damage',5:'+8% Life Steal',6:'+15% dagdag na Attack — LIYAB!'},
    apply:(st,n)=>{ if(n>=3)st.atkM*=1.10; if(n>=4)st.critDmg+=25; if(n>=5)st.ls+=8; if(n>=6)st.atkM*=1.15; }},
  tubig:{name:'Anito ng Tubig',  icon:'🌊', color:'#7dc8ff',
    tiers:{3:'+12% Max HP',4:'+15% Defense',5:'+10% dagdag na Max HP',6:'+10% Cooldown Speed — AGOS!'},
    apply:(st,n)=>{ if(n>=3)st.hpM*=1.12; if(n>=4)st.defM*=1.15; if(n>=5)st.hpM*=1.10; if(n>=6)st.cdr+=10; }},
  hangin:{name:'Anito ng Hangin',icon:'🌪️', color:'#c8f0d8',
    tiers:{3:'+8% Move Speed',4:'+10% Crit Chance',5:'+10% Cooldown Speed',6:'+10% pa na Move Speed — UNOS!'},
    apply:(st,n)=>{ if(n>=3)st.spdM*=1.08; if(n>=4)st.critCh+=10; if(n>=5)st.cdr+=10; if(n>=6)st.spdM*=1.10; }},
  lupa: {name:'Anito ng Lupa',   icon:'⛰️', color:'#d8b88a',
    tiers:{3:'+12% Defense',4:'+10% Max HP',5:'+12% Material Find',6:'+15% XP Gain — UGAT!'},
    apply:(st,n)=>{ if(n>=3)st.defM*=1.12; if(n>=4)st.hpM*=1.10; if(n>=5)st.dr+=12; if(n>=6)st.xg+=15; }},
};
const SET_IDS=Object.keys(SET_DEFS);
window._rollSet=(rarId)=>(['rare','epic','legendary'].includes(rarId)&&Math.random()<0.35)
  ? SET_IDS[rand(0,SET_IDS.length-1)] : null;
function setCounts(){
  const c={};
  for(const it of Object.values(S.gear)) if(it&&it.set) c[it.set]=(c[it.set]||0)+1;
  return c;
}
window._setLine=(it)=>{
  if(!it.set||!SET_DEFS[it.set]) return '';
  const sd=SET_DEFS[it.set], n=setCounts()[it.set]||0;
  const tiers=Object.entries(sd.tiers).map(([k,txt])=>
    `<span style="color:${n>=+k?sd.color:'#5a5470'}">${k}pc: ${txt}</span>`).join(' · ');
  return `<div class="affix-line" style="color:${sd.color}">❖ <b>${sd.icon} ${sd.name}</b> (suot: ${n}/6)</div>
    <div class="affix-line" style="font-size:9px;line-height:1.5">${tiers}</div>`;
};

/* ---------- computeStats wrapper: advancement + sets + clamps ---------- */
const _computeStats_p2=computeStats;
computeStats=function(){
  _computeStats_p2();
  const st={atkM:1,hpM:1,defM:1,spdM:1,critCh:0,critDmg:0,ls:0,cdr:0,dr:0,xg:0};
  if(S.adv&&ADV_DEFS[S.cls]) ADV_DEFS[S.cls].apply(st);
  for(const [sid,n] of Object.entries(setCounts())) if(SET_DEFS[sid]) SET_DEFS[sid].apply(st,n);
  P.atk=Math.round(P.atk*st.atkM);
  P.maxHp=Math.round(P.maxHp*st.hpM);
  P.def=Math.round(P.def*st.defM);
  P.spd*=st.spdM;
  P.critCh=Math.min(80,P.critCh+st.critCh);
  P.critDmg+=st.critDmg;
  P.lifesteal=Math.min(35,P.lifesteal+st.ls);
  P.cdr=Math.min(60,P.cdr+st.cdr);
  P.dropRate+=st.dr; P.xpGain+=st.xg;
  if(S.hp>P.maxHp) S.hp=P.maxHp;
};

/* ---------- advancement ceremony UI ---------- */
function openAdvance(){
  const A=ADV_DEFS[S.cls]; if(!A) return;
  if(S.adv){ toast('Nag-advance ka na bilang '+A.name+'!',''); return; }
  if(S.level<20){ toast('Kailangan mo munang maging Level 20.','warn'); return; }
  const can=S.gold>=ADV_COST.gold&&(S.inv.anito_dust||0)>=ADV_COST.anito_dust;
  showModal(`<div class="modal-emoji">${A.icon}</div>
    <div class="modal-title">SEREMONYA NG PAG-ANGAT</div>
    <div class="modal-body" style="text-align:center">
      Handa ka na, <b>${S.name||CLASSES[S.cls].name}</b>. Tinatawag ka ng mga ninuno upang maging<br>
      <span style="font-size:20px;color:#ffd94a;font-weight:800">${A.icon} ${A.name}</span><br><br>
      <span style="color:#7dffce">✦ ${A.perk}</span><br>
      <span style="color:#8a80a2;font-size:11px">Ang lahat ng stats mo ay muling kakalkulahin. Permanente ito.</span><br><br>
      <b>Alay:</b> 🪙 ${fmt(ADV_COST.gold)} + ✨ Anito Dust ×${ADV_COST.anito_dust}
      <br><span style="font-size:11px;color:${can?'#8aff9a':'#ff8a8a'}">
        (Mayroon ka: 🪙${fmt(S.gold)} · ✨${S.inv.anito_dust||0})</span>
    </div>
    ${can?'<button class="modal-btn" id="adv-go">🌟 TANGGAPIN ANG TAWAG</button>':'<button class="modal-btn" disabled style="opacity:.4">Kulang ang alay…</button>'}
    <button class="modal-btn secondary" onclick="closeModal()">Mamaya na</button>`);
  const b=$('adv-go');
  if(b) b.onclick=()=>{
    if(S.gold<ADV_COST.gold||(S.inv.anito_dust||0)<ADV_COST.anito_dust) return;
    S.gold-=ADV_COST.gold; S.inv.anito_dust-=ADV_COST.anito_dust;
    S.adv=true;
    computeStats(); S.hp=P.maxHp;
    closeModal();
    screenShake(0.6,1.0); SFX.levelup();
    fxRing(player.x,player.z,0xffd94a,0.5,10,1.2);
    fxRing(player.x,player.z,0x7df0ff,0.3,7,1.0);
    for(let i=0;i<10;i++) setTimeout(()=>fxPuff(player.x+rnd(-2,2),groundY(player.x,player.z)+rnd(0.5,4),player.z+rnd(-2,2),0xffd94a,0.5,0.5),i*90);
    toast(`${ADV_DEFS[S.cls].icon} <b>IKAW NA SI ${ADV_DEFS[S.cls].name.toUpperCase()}!</b> ${ADV_DEFS[S.cls].perk}`,'levelup');
    if(window._chatSys) window._chatSys(`${ADV_DEFS[S.cls].icon} Umangat ka bilang ${ADV_DEFS[S.cls].name}!`,'xp');
    achEvent('adv',1);
    refreshHudClass(); updateHUD(); save();
  };
}
window.openAdvance=openAdvance;
function refreshHudClass(){
  if(!S.cls) return;
  const cname=advName();
  const title=(S.ach&&S.ach.title)?`<i style="font-style:normal;color:#ffd94a;font-size:10px">「${S.ach.title}」</i> `:'';
  $('hud-class').innerHTML=title+(S.name?`${S.name} · ${cname}`:cname);
}
const _initForClass_p2=initForClass;
initForClass=function(){ _initForClass_p2.apply(this,arguments); refreshHudClass(); };
/* 🌟 button appears at Lv20 until advanced */
(function advBtn(){
  const b=document.createElement('button');
  b.className='menu-btn'; b.id='btn-advance'; b.title='Seremonya ng Pag-angat'; b.textContent='🌟';
  b.style.display='none';
  document.querySelector('.hud-right').appendChild(b);
  b.onclick=openAdvance;
  setInterval(()=>{
    const show=started&&S.cls&&S.level>=20&&!S.adv;
    b.style.display=show?'':'none';
    if(show&&!b.querySelector('.badge')){ const em=document.createElement('em'); em.className='badge'; em.textContent='!'; b.appendChild(em); }
  },3000);
})();

/* ---------- [4] ACHIEVEMENTS & TITLES ---------- */
function ensureAch(){
  if(!S.ach) S.ach={u:{}, c:{}, title:''};
  S.ach.u=S.ach.u||{}; S.ach.c=S.ach.c||{};
  /* retro-credit kills from the bestiary for old saves */
  if(!S.ach.c._seeded){
    let k=0,e=0,b=0;
    for(const [key,rec] of Object.entries(S.bestiary||{})){
      k+=rec.kills||0;
      if(ENEMY_DEFS[key]&&ENEMY_DEFS[key].tier==='Elite') e+=rec.kills||0;
      if(key==='manananggal') b+=rec.kills||0;
    }
    S.ach.c.kill=Math.max(S.ach.c.kill||0,k);
    S.ach.c.killelite=Math.max(S.ach.c.killelite||0,e);
    S.ach.c.boss=Math.max(S.ach.c.boss||0,b);
    S.ach.c._seeded=1;
  }
}
const ACH_DEFS=[
  {id:'k10',   icon:'🗡️', name:'Unang Dugo',        desc:'Tumumba ng 10 halimaw',        chk:c=>(c.kill||0)>=10,    rw:{gold:200}},
  {id:'k100',  icon:'⚔️', name:'Mandirigma',         desc:'Tumumba ng 100 halimaw',       chk:c=>(c.kill||0)>=100,   rw:{gold:800},  title:'Mandirigma'},
  {id:'k500',  icon:'🔥', name:'Pamatay-Halimaw',    desc:'Tumumba ng 500 halimaw',       chk:c=>(c.kill||0)>=500,   rw:{gold:2500}, title:'Pamatay-Halimaw'},
  {id:'k2000', icon:'💀', name:'Bantay ng Kapuluan', desc:'Tumumba ng 2,000 halimaw',     chk:c=>(c.kill||0)>=2000,  rw:{gold:8000}, title:'Bantay ng Kapuluan'},
  {id:'e10',   icon:'👹', name:'Kontra-Elite',       desc:'Tumumba ng 10 Elite',          chk:c=>(c.killelite||0)>=10, rw:{gold:600}},
  {id:'e50',   icon:'😈', name:'Sindak ng mga Elite',desc:'Tumumba ng 50 Elite',          chk:c=>(c.killelite||0)>=50, rw:{gold:3000}, title:'Sindak ng mga Elite'},
  {id:'b1',    icon:'🦇', name:'Nakalaban ang Gabi', desc:'Talunin ang Manananggal',      chk:c=>(c.boss||0)>=1,     rw:{gold:1500}, title:'Nakalaban ang Gabi'},
  {id:'b10',   icon:'🌋', name:'Hari ng Bulkan',     desc:'Talunin ang Manananggal ×10',  chk:c=>(c.boss||0)>=10,    rw:{gold:10000},title:'Hari ng Bulkan'},
  {id:'l10',   icon:'⭐', name:'Batikang Manlalakbay',desc:'Umabot sa Level 10',          chk:()=>S.level>=10,       rw:{gold:300}},
  {id:'l20',   icon:'🌟', name:'Tinawag ng Ninuno',  desc:'Umabot sa Level 20',           chk:()=>S.level>=20,       rw:{gold:1000}},
  {id:'l40',   icon:'💫', name:'Alamat ng Kapuluan', desc:'Umabot sa Level 40',           chk:()=>S.level>=40,       rw:{gold:5000}, title:'Alamat ng Kapuluan'},
  {id:'l70',   icon:'👑', name:'PINILI NI BATHALA',  desc:'Umabot sa Level 70 (cap!)',    chk:()=>S.level>=70,       rw:{gold:50000},title:'Pinili ni Bathala'},
  {id:'g10k',  icon:'🪙', name:'Negosyante',         desc:'Kumita ng 10,000 ginto',       chk:c=>(c.gold||0)>=10000, rw:{gold:500}},
  {id:'g100k', icon:'💰', name:'Don ng Tiangge',     desc:'Kumita ng 100,000 ginto',      chk:c=>(c.gold||0)>=100000,rw:{gold:5000}, title:'Don ng Tiangge'},
  {id:'f50',   icon:'🌿', name:'Mangangalap',        desc:'Mag-forage ng 50 beses',       chk:c=>(c.forage||0)>=50,  rw:{gold:400}},
  {id:'f500',  icon:'🌱', name:'Anak ng Lupa',       desc:'Mag-forage ng 500 beses',      chk:c=>(c.forage||0)>=500, rw:{gold:3000}, title:'Anak ng Lupa'},
  {id:'en10',  icon:'🔨', name:'Suki ni Iko',        desc:'Magpanday ng 10 beses',        chk:c=>(c.enhance||0)>=10, rw:{gold:1000}},
  {id:'plus10',icon:'✨', name:'PERPEKTO!',          desc:'Magkaroon ng +10 na gamit',    chk:()=>[...Object.values(S.gear),...S.bag].some(it=>it&&(it.plus||0)>=10), rw:{gold:15000}, title:'Perpekto'},
  {id:'adv',   icon:'🌟', name:'Umangat',            desc:'Tapusin ang Seremonya ng Pag-angat', chk:c=>(c.adv||0)>=1||S.adv, rw:{gold:2000}},
  {id:'party', icon:'🧑‍🤝‍🧑', name:'Hindi Ka Nag-iisa', desc:'Makipaglaro kasama ang ibang bayani', chk:c=>(c.party||0)>=1, rw:{gold:500}, title:'Kasama'},
  {id:'set3',  icon:'❖',  name:'Pabor ng mga Anito', desc:'Magsuot ng 3 pirasong iisang Anito set', chk:()=>Object.values(setCounts()).some(n=>n>=3), rw:{gold:2000}},
  {id:'set6',  icon:'🏆', name:'Buong Dambana',      desc:'Kumpletuhin ang 6-pirasong Anito set',   chk:()=>Object.values(setCounts()).some(n=>n>=6), rw:{gold:20000}, title:'Sugo ng mga Anito'},
];
function achEvent(kind,amt,key){
  if(!started) return;
  ensureAch();
  const c=S.ach.c;
  if(kind==='kill'){ c.kill=(c.kill||0)+amt; if(key==='manananggal') c.boss=(c.boss||0)+amt; }
  else c[kind]=(c[kind]||0)+amt;
  checkAch();
}
function checkAch(){
  ensureAch();
  let got=false;
  for(const a of ACH_DEFS){
    if(S.ach.u[a.id]) continue;
    let ok=false; try{ ok=a.chk(S.ach.c); }catch(e){}
    if(!ok) continue;
    S.ach.u[a.id]=Date.now(); got=true;
    S.gold+=a.rw.gold;
    SFX.levelup();
    toast(`🏆 <b>TAGUMPAY:</b> ${a.icon} ${a.name} — +🪙${fmt(a.rw.gold)}${a.title?` · Bagong titulo: <b>「${a.title}」</b>`:''}`,'levelup');
    if(window._chatSys) window._chatSys(`🏆 Tagumpay: ${a.name}!`,'xp');
  }
  if(got){ updateHUD(); save(); }
}
/* pipe the Phase-1 quest events into achievements too */
(function(){
  const _qp=window._questProg;
  window._questProg=(kind,amt,key)=>{ _qp(kind,amt,key); achEvent(kind,amt,key); };
})();
setInterval(()=>{
  if(!started||!S.cls) return;
  if(window._kaParty&&window._kaParty.size>0){ ensureAch(); S.ach.c.party=1; }
  checkAch();
},8000);
function equipTitle(t){
  ensureAch();
  S.ach.title=t||'';
  refreshHudClass();
  if(window._net&&window._net.joined()) window._net.send({t:'title', title:S.ach.title});
  save();
}
window.equipTitle=equipTitle;
function myTitles(){
  ensureAch();
  return ACH_DEFS.filter(a=>a.title&&S.ach.u[a.id]).map(a=>a.title);
}
function openAchievements(){
  ensureAch();
  const done=Object.keys(S.ach.u).length;
  const rows=ACH_DEFS.map(a=>{
    const u=!!S.ach.u[a.id];
    return `<div class="fr-row" style="${u?'':'opacity:.45'}">
      <span style="font-size:20px;filter:${u?'none':'grayscale(1)'}">${a.icon}</span>
      <div class="fr-info"><b>${a.name} ${u?'✔':''}</b><i>${a.desc} · 🪙${fmt(a.rw.gold)}${a.title?` · titulo:「${a.title}」`:''}</i></div>
    </div>`;
  }).join('');
  const titles=myTitles();
  const cur=S.ach.title||'';
  const titleRow=`<div class="set-sec">「」 Mga Titulo — ipakita sa iyong pangalan</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px">
      <button class="mini-btn" data-title="" style="${cur===''?'outline:2px solid #ffd94a':''}">Wala</button>
      ${titles.map(t=>`<button class="mini-btn" data-title="${t}" style="${cur===t?'outline:2px solid #ffd94a':''}">「${t}」</button>`).join('')||'<span style="color:#8a80a2;font-size:11px">Wala ka pang titulo — kumpletuhin ang mga tagumpay!</span>'}
    </div>`;
  showModal(`<div class="modal-emoji">🏆</div><div class="modal-title">Mga Tagumpay (${done}/${ACH_DEFS.length})</div>
    ${titleRow}
    <div style="max-height:46vh;overflow-y:auto">${rows}</div>
    <button class="modal-btn" onclick="closeModal()">Isara</button>`);
  document.querySelectorAll('[data-title]').forEach(b=>b.onclick=()=>{
    equipTitle(b.dataset.title);
    toast(b.dataset.title?`「${b.dataset.title}」 — suot mo na ang titulo!`:'Tinanggal ang titulo.','loot');
    openAchievements();
  });
}
window.openAchievements=openAchievements;
(function achBtn(){
  const b=document.createElement('button');
  b.className='menu-btn'; b.id='btn-ach'; b.title='Mga Tagumpay'; b.textContent='🏆';
  document.querySelector('.hud-right').appendChild(b);
  b.onclick=openAchievements;
})();

/* ---------- [7] CHANNEL SYSTEM UI ---------- */
window._onChanList=(m)=>{
  const rows=m.list.map(c=>{
    const you=c.ch===m.you, full=c.n>=m.per;
    const barW=Math.round(c.n/m.per*100);
    return `<div class="fr-row">
      <span style="font-size:16px">${you?'📍':'📡'}</span>
      <div class="fr-info"><b>Channel ${c.ch} ${you?'· IKAW DITO':''}</b>
        <i>${c.n}/${m.per} bayani</i>
        <div style="height:4px;background:rgba(255,255,255,.08);border-radius:2px;margin-top:2px"><div style="height:100%;width:${barW}%;background:${full?'#ff8a8a':'#7df0ff'};border-radius:2px"></div></div>
      </div>
      ${you?'<span style="color:#8aff9a;font-size:11px;font-weight:700">✔</span>'
        :full?'<span style="color:#ff8a8a;font-size:11px">PUNO</span>'
        :`<button class="mini-btn" data-ch="${c.ch}">LIPAT</button>`}
    </div>`;
  }).join('');
  showModal(`<div class="modal-emoji">📡</div><div class="modal-title">Mga Channel ng Mundo</div>
    <p style="font-size:11px;color:#8a80a2;text-align:center;margin:0 0 8px">Bawat channel ay hiwalay na kopya ng kapuluan (max ${m.per} bayani bawat isa).<br>Ang World at Friends chat ay tumatawid sa LAHAT ng channel.</p>
    <div style="max-height:46vh;overflow-y:auto">${rows}</div>
    <button class="modal-btn" onclick="closeModal()">Isara</button>`);
  document.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{
    window._prefCh=+b.dataset.ch;
    window._net.send({t:'chan', ch:+b.dataset.ch});
    closeModal();
  });
};
function openChannels(){
  if(window._net&&window._net.joined()) window._net.send({t:'chanlist'});
  else toast('Hindi ka konektado sa server.','warn');
}
window.openChannels=openChannels;
(function chanBtn(){
  const b=document.createElement('button');
  b.className='menu-btn'; b.id='btn-chan'; b.title='Mga Channel'; b.textContent='📡';
  document.querySelector('.hud-right').appendChild(b);
  b.onclick=openChannels;
})();

/* ---------- [8] PARTY XP SHARE + BUFFS ---------- */
/* Kapiling-buff: bawat ka-party na MALAPIT (60u) = +4% ATK at +8% XP (hanggang 4). */
const PARTY_NEAR=60;
function nearPartyCount(){
  if(!window._kaParty) return 0;
  let n=0;
  for(const r of window._kaParty.values())
    if(d2(r.x,r.z,player.x,player.z)<PARTY_NEAR*PARTY_NEAR) n++;
  return Math.min(4,n);
}
window._partyAtkBonus=()=>nearPartyCount()*0.04;
window._partyXpBonus=()=>nearPartyCount()*0.08;
/* shared XP kapag pumatay ang ka-party na hindi mo nahawakan: 45% ng buong XP */
window._partyXpShare=(en)=>{
  const def=ENEMY_DEFS[en.key]; if(!def) return;
  if(nearPartyCount()===0&&!(window._kaParty&&window._kaParty.size)) return;
  const amt=Math.round(def.xp*Math.pow(1.09,S.level-1)*0.45*(1+P.xpGain/100));
  if(amt<=0) return;
  gainXP(amt);
  addLabel('+'+amt+' XP (party)','xpc',player.x,groundY(player.x,player.z)+3.2,player.z,0.9);
};
/* buff chip beside the day/night clock */
(function partyChip(){
  const c=document.createElement('div');
  c.id='party-buff-chip';
  c.style.cssText='position:fixed;top:8px;left:calc(50% - 235px);z-index:40;background:rgba(20,14,34,.72);border:1px solid rgba(138,255,154,.35);color:#8aff9a;font:700 11px system-ui;padding:4px 10px;border-radius:999px;backdrop-filter:blur(6px);pointer-events:none;display:none';
  document.body.appendChild(c);
  setInterval(()=>{
    const n=started?nearPartyCount():0;
    if(n<=0){ c.style.display='none'; return; }
    c.style.display='block';
    c.textContent=`🤝 Kapiling ×${n} · +${n*4}% ATK · +${n*8}% XP`;
  },2000);
})();
/* party panel: re-point the pill so the wrap below takes effect, then append buff info */
(function(){
  const _opp=openPartyPanel;
  openPartyPanel=function(){
    _opp();
    const box=$('modal-box');
    if(box){
      const d=document.createElement('div');
      d.style.cssText='font-size:11px;color:#8aff9a;text-align:center;margin-top:6px';
      d.innerHTML='🤝 <b>Kapiling-buff:</b> bawat ka-party na malapit (60m) = +4% ATK at +8% XP.<br>Kahit hindi ka nakatama, makakakuha ka ng 45% XP sa kill ng ka-party na kalapit.';
      const btn=box.querySelector('.modal-btn:last-child');
      box.insertBefore(d, btn);
    }
  };
  const pill=$('party-pill');
  if(pill) pill.onclick=()=>openPartyPanel();
})();


/* ================================================================
   PHASE 3 MODULE — Tribu Guilds · Palengke Marketplace · PvP Arena
   & Ladder · Lagusan Dungeons · Scheduled World Bosses
   ================================================================ */

/* ---------- [13] WORLD BOSS DEFINITIONS ---------- */
/* Three scheduled terrors. Bakunawa rises ONLY at night to eat the moon.
   data/bosses/world-bosses.json is authoritative (spec §32); inline defs = fallback. */
ENEMY_DEFS.bakunawa={ name:'BAKUNAWA', img:'img/e_manananggal.png', tier:'Boss', role:'Moon-eating serpent — scheduled night terror',
  xp:6000, hp:12000, minLevel:1, dmg:[20,32], speed:7.5, aggro:60, atkRange:4.5, atkCd:1.8, scale:3.2, r:2.2, ai:'charger', boss:true, worldBoss:true, nightOnly:true,
  lore:'The colossal sea-serpent that rises from the deep to swallow the moon itself. Seven moons it has eaten; the eighth is defended by the noise of the people — bang your drums, strike your blades.',
  drops:[{id:'mutya',chance:1,qty:[2,3]},{id:'anito_dust',chance:1,qty:[10,16]},{id:'diwata_dew',chance:1,qty:[6,10]}], dropText:'Mutya ×3, Anito Dust, Diwata Dew', gearChance:1.0, gold:[900,1500] };
ENEMY_DEFS.minokawa={ name:'MINOKAWA', img:'img/e_aswang.png', tier:'Boss', role:'Giant sky-raptor — scheduled day terror',
  xp:5000, hp:9500, minLevel:1, dmg:[18,28], speed:10, aggro:60, atkRange:3.8, atkCd:1.6, scale:2.8, r:1.9, ai:'flyer', boss:true, worldBoss:true,
  lore:'A bird the size of an island, with beak and talons of steel and eyes of burning mirrors. It waits at the edge of the sky to swallow the sun — and anything that glitters below.',
  drops:[{id:'mutya',chance:1,qty:[1,3]},{id:'anito_dust',chance:1,qty:[8,14]},{id:'santelmo_flame',chance:1,qty:[3,6]}], dropText:'Mutya, Anito Dust, Santelmo Flame', gearChance:1.0, gold:[800,1300] };
ENEMY_DEFS.sarangay={ name:'SARANGAY', img:'img/e_tikbalang.png', tier:'Boss', role:'Bull demon of the jewel — scheduled terror',
  xp:5500, hp:11000, minLevel:1, dmg:[22,34], speed:8.5, aggro:60, atkRange:4.2, atkCd:2.0, scale:2.6, r:1.8, ai:'charger', boss:true, worldBoss:true,
  lore:'A towering bull-man with a precious jewel embedded in each ear. He asks every trespasser one question: "Did you come for my jewels?" There is no safe answer.',
  drops:[{id:'mutya',chance:1,qty:[2,2]},{id:'anito_dust',chance:1,qty:[8,14]},{id:'nuno_stone',chance:1,qty:[1,2]}], dropText:'Mutya ×2, Anito Dust, Nuno Stone', gearChance:1.0, gold:[850,1400] };

(function bossDefsFromData(){
  const B=GAME_DATA.bosses; if(!B||!B.definitions) return;
  for(const k in B.definitions) ENEMY_DEFS[k]=B.definitions[k];
})();
/* meshes for the new bosses: extend buildEnemyMesh via wrapper */
const _buildEnemyMesh_p3=buildEnemyMesh;
buildEnemyMesh=function(key){
  if(!['bakunawa','minokawa','sarangay'].includes(key)) return _buildEnemyMesh_p3(key);
  const def=ENEMY_DEFS[key];
  const g=new THREE.Group();
  const add=m=>{g.add(m);return m;};
  let animParts={};
  if(key==='bakunawa'){
    /* serpent: chain of segments + huge maw */
    const segs=[];
    for(let i=0;i<6;i++){
      const sg=add(new THREE.Mesh(new THREE.SphereGeometry(0.55-i*0.055,8,7), M(0x1e3a4a,{emissive:0x0a2a3a,emissiveIntensity:0.35})));
      sg.position.set(0,1.1+i*0.12,-0.55*i); segs.push(sg);
    }
    const head=add(new THREE.Mesh(new THREE.SphereGeometry(0.62,9,8), M(0x28506a)));
    head.position.set(0,1.35,0.55); head.scale.z=1.25;
    const jaw=add(new THREE.Mesh(new THREE.ConeGeometry(0.4,0.8,6), M(0x102030)));
    jaw.position.set(0,1.1,1.05); jaw.rotation.x=1.9;
    for(let i=0;i<6;i++){
      const th=add(new THREE.Mesh(new THREE.ConeGeometry(0.05,0.22,4), M(0xe8f0e0)));
      th.position.set((i%3-1)*0.22,1.32,1.1+(i<3?0:0.12)); th.rotation.x=i<3?Math.PI:0;
    }
    const e1=add(new THREE.Mesh(new THREE.SphereGeometry(0.1,5,5), M(0x7df0ff,{emissive:0x40c0ff,emissiveIntensity:2.5})));
    e1.position.set(-0.25,1.6,0.85);
    const e2=e1.clone(); e2.position.x=0.25; add(e2);
    /* moon-glow crest fins */
    for(let i=0;i<4;i++){
      const fin=add(new THREE.Mesh(new THREE.ConeGeometry(0.16,0.6,4), M(0x7df0ff,{emissive:0x2a8ab0,emissiveIntensity:1.2,transparent:true,opacity:0.85})));
      fin.position.set(0,1.75+i*0.05,-0.1-i*0.5); fin.rotation.x=-0.5;
    }
    animParts={serpent:segs,hover:true};
  } else if(key==='minokawa'){
    const body=add(new THREE.Mesh(new THREE.CapsuleGeometry(0.5,0.9,4,8), M(0x3a2a18)));
    body.position.y=2.2; body.rotation.x=1.3;
    const head=add(new THREE.Mesh(new THREE.SphereGeometry(0.4,8,7), M(0x4a3520)));
    head.position.set(0,2.6,0.75);
    const beak=add(new THREE.Mesh(new THREE.ConeGeometry(0.16,0.7,5), M(0xc0c8d0,{metalness:0.8,roughness:0.3})));
    beak.position.set(0,2.55,1.25); beak.rotation.x=1.57;
    const e1=add(new THREE.Mesh(new THREE.SphereGeometry(0.09,5,5), M(0xffd94a,{emissive:0xff9a00,emissiveIntensity:2.5})));
    e1.position.set(-0.2,2.75,0.95);
    const e2=e1.clone(); e2.position.x=0.2; add(e2);
    const wingL=new THREE.Group(), wingR=new THREE.Group();
    wingL.position.set(-0.45,2.5,0); wingR.position.set(0.45,2.5,0);
    g.add(wingL); g.add(wingR);
    for(const [sx,wg] of [[-1,wingL],[1,wingR]]){
      for(let f=0;f<4;f++){
        const feather=new THREE.Mesh(new THREE.BoxGeometry(1.5-f*0.15,0.06,0.34), M(f%2?0x3a2a18:0x5a4028));
        feather.position.set(sx*(0.85+f*0.28),f*0.05,-f*0.12);
        feather.rotation.z=sx*(0.15+f*0.12);
        wg.add(feather);
      }
    }
    /* steel talons */
    for(const sx of [-1,1]){
      const leg=add(limb(0.1,0.7,0x4a3520)); leg.position.set(sx*0.3,1.6,0.1);
      for(let c=0;c<3;c++){
        const cl=new THREE.Mesh(new THREE.ConeGeometry(0.04,0.25,4), M(0xc0c8d0,{metalness:0.8,roughness:0.3}));
        cl.position.set((c-1)*0.08,-0.42,0.05); cl.rotation.x=Math.PI;
        leg.add(cl);
      }
    }
    animParts={wingL,wingR,hover:true,flyer:true};
  } else { /* sarangay */
    const body=add(new THREE.Mesh(new THREE.CapsuleGeometry(0.62,0.9,4,8), M(0x4a3028)));
    body.position.y=1.75;
    const head=add(new THREE.Mesh(new THREE.BoxGeometry(0.66,0.62,0.72), M(0x3a241e)));
    head.position.set(0,2.85,0.25);
    const snout=add(new THREE.Mesh(new THREE.BoxGeometry(0.4,0.3,0.35), M(0x5a4034)));
    snout.position.set(0,2.7,0.62);
    /* great horns */
    for(const sx of [-1,1]){
      const h1=add(new THREE.Mesh(new THREE.ConeGeometry(0.12,0.85,5), M(0xd8cfc0)));
      h1.position.set(sx*0.5,3.15,0.15); h1.rotation.z=sx*-1.1;
      /* the legendary ear jewels */
      const jw=add(new THREE.Mesh(new THREE.OctahedronGeometry(0.13), M(0xff4a6a,{emissive:0xc01030,emissiveIntensity:2})));
      jw.position.set(sx*0.42,2.8,0.1);
    }
    const e1=add(new THREE.Mesh(new THREE.SphereGeometry(0.07,4,4), M(0xff6a2a,{emissive:0xff3a00,emissiveIntensity:2})));
    e1.position.set(-0.16,2.95,0.62);
    const e2=e1.clone(); e2.position.x=0.16; add(e2);
    const armL=add(limb(0.2,1.0,0x4a3028)); armL.position.set(-0.85,2.2,0.1);
    const armR=add(limb(0.2,1.0,0x4a3028)); armR.position.set(0.85,2.2,0.1);
    const legL=add(limb(0.22,0.95,0x3a241e)); legL.position.set(-0.34,1.0,0);
    const legR=add(limb(0.22,0.95,0x3a241e)); legR.position.set(0.34,1.0,0);
    /* nose ring */
    const ring=add(new THREE.Mesh(new THREE.TorusGeometry(0.12,0.03,6,12), M(0xd8b83a,{metalness:0.9,roughness:0.25})));
    ring.position.set(0,2.58,0.8); ring.rotation.x=0.4;
    animParts={armL,armR,legL,legR};
  }
  g.scale.setScalar(def.scale);
  const sh=blobShadow(def.r+0.3); sh.position.y=0.02/def.scale; sh.scale.setScalar((def.r+0.3)/def.scale);
  g.add(sh);
  g.traverse(o=>{ if(o.isMesh&&o.material&&!o.material._isFx) o.castShadow=true; });
  g.userData.anim=animParts;
  return g;
};

/* serpent segment wiggle: hook the nameplate-anim path via a light ticker */
setInterval(()=>{
  for(const en of enemies){
    const ap=en.mesh&&en.mesh.userData.anim;
    if(ap&&ap.serpent){
      const t=nowS();
      ap.serpent.forEach((sg,i)=>{ sg.position.x=Math.sin(t*3+i*0.8)*0.22*i/3; });
    }
  }
},66);

/* ---------- world boss scheduler ---------- */
/* Rotation every 30 min of play, announced 2 min ahead.
   Bakunawa waits for night (moon-eater); others spawn on schedule. */
const WBOSS_SCHED=(GAME_DATA.bosses&&GAME_DATA.bosses.schedule)||{};
const WBOSS={queue:WBOSS_SCHED.queue||['sarangay','minokawa','bakunawa'], idx:0,
  nextAt:nowS()+(WBOSS_SCHED.firstSpawnDelayS||900), warned:false, active:null, moonMesh:null,
  respawnDelayS:WBOSS_SCHED.respawnDelayS||1800, warningLeadS:WBOSS_SCHED.warningLeadS||120};
let WBOSS_SPOTS={
  bakunawa:{x:70*TILE, z:80*TILE, label:'Dalampasigan (timog na baybayin)'},
  minokawa:{x:90*TILE, z:14*TILE, label:'Parang ng Tala (hilagang parang)'},
  sarangay:{x:50*TILE, z:58*TILE, label:'parang sa timog-kanluran ng bayan'},
};
if(WBOSS_SCHED.spots){ WBOSS_SPOTS={}; for(const k in WBOSS_SCHED.spots){ const s=WBOSS_SCHED.spots[k]; WBOSS_SPOTS[k]={x:s.tx*TILE, z:s.ty*TILE, label:s.label}; } }
function spawnWorldBoss(key){
  const def=ENEMY_DEFS[key], spot=WBOSS_SPOTS[key];
  const land=findLandNear(spot.x,spot.z,def.r+1);
  let x=land.x, z=land.z;
  for(let t=0;t<40;t++){ const nx=land.x+rnd(-14,14), nz=land.z+rnd(-14,14); if(walkable(nx,nz,def.r)){ x=nx; z=nz; break; } }
  const hp=Math.round(def.hp*Math.pow(1.05,Math.max(0,S.level-10)));
  const mesh=buildEnemyMesh(key);
  mesh.position.set(x,groundY(x,z)+(def.ai==='flyer'?2.4:0),z);
  scene.add(mesh);
  const bar=document.createElement('div');
  bar.className='ebar elite boss'; bar.innerHTML='<i></i>'; bar.style.display='none';
  labelsEl.appendChild(bar);
  const en={key,x,z,homeX:x,homeZ:z,hp,maxHp:hp,state:'idle',cd:2,flash:0,wt:0,wx:x,wz:z,windup:0,
    stealth:0,stunUntil:0,rootUntil:0,chargeT:0,chargeAng:0,retreatT:0,swoopT:0,mesh,bar,animT:0};
  enemies.push(en); attachNameplate(en);
  if(window._netSpawned) window._netSpawned(en);
  WBOSS.active=key;
  screenShake(0.6,1.2); SFX.screech();
  if(key==='bakunawa'){
    toast('🌒 <b>UMAHON ANG BAKUNAWA!</b> Nilalamon niya ang buwan sa '+spot.label+'! Magtipon-tipon, mga bayani!','warn');
    /* the doomed moon: glowing orb above the serpent */
    const moon=new THREE.Mesh(new THREE.SphereGeometry(2.2,16,14), (()=>{const m2=new THREE.MeshBasicMaterial({color:0xf0ead0,transparent:true,opacity:0.9});m2._isFx=true;return m2;})());
    moon.position.set(x,26,z); scene.add(moon);
    WBOSS.moonMesh=moon;
  } else if(key==='minokawa'){
    toast('☀️ <b>LUMILIPAD ANG MINOKAWA!</b> Nais niyang lamunin ang araw — hinahanap ka sa '+spot.label+'!','warn');
  } else {
    toast('🐂 <b>NAGNGANGALIT SI SARANGAY!</b> Binabantayan niya ang kanyang hiyas sa '+spot.label+'!','warn');
  }
  if(window._chatSys) window._chatSys('⚔️ WORLD BOSS: '+def.name+' — '+spot.label+'!','xp');
}
setInterval(()=>{
  if(!started) return;
  if(window._netIsGuest&&window._netIsGuest()) return;                  // host simulates
  /* clean up state when the active world boss dies */
  if(WBOSS.active&&!enemies.some(e=>e.key===WBOSS.active)){
    WBOSS.active=null;
    if(WBOSS.moonMesh){ scene.remove(WBOSS.moonMesh); WBOSS.moonMesh=null;
      toast('🌕 <b>NAILIGTAS ANG BUWAN!</b> Salamat sa mga bayani ng kapuluan!','levelup'); }
    WBOSS.nextAt=nowS()+WBOSS.respawnDelayS; WBOSS.warned=false;
    WBOSS.idx=(WBOSS.idx+1)%WBOSS.queue.length;
  }
  if(WBOSS.active) return;
  const next=WBOSS.queue[WBOSS.idx];
  const t=nowS();
  if(!WBOSS.warned&&t>WBOSS.nextAt-WBOSS.warningLeadS){
    WBOSS.warned=true;
    toast('⏳ <b>BABALA:</b> Darating ang <b>'+ENEMY_DEFS[next].name+'</b> sa loob ng 2 minuto — '+WBOSS_SPOTS[next].label+'!','warn');
    if(window._chatSys) window._chatSys('⏳ World boss sa 2 minuto: '+ENEMY_DEFS[next].name+' — '+WBOSS_SPOTS[next].label,'xp');
  }
  if(t>=WBOSS.nextAt){
    /* Bakunawa only rises at night — hold until dark */
    if(ENEMY_DEFS[next]&&ENEMY_DEFS[next].nightOnly&&DAYNIGHT.phase!=='night'&&DAYNIGHT.phase!=='dusk'){
      if(!WBOSS.holdMsg){ WBOSS.holdMsg=true; toast('🌒 Naghihintay ang Bakunawa sa dilim… (lalabas pagsapit ng gabi)','warn'); }
      return;
    }
    WBOSS.holdMsg=false;
    spawnWorldBoss(next);
  }
},4000);
/* world-boss kill: bigger fanfare + achievement */
(function(){
  const _kr=killReward;
  killReward=function(en){
    _kr(en);
    const def=ENEMY_DEFS[en.key];
    if(def&&def.worldBoss){
      achEvent('wboss',1);
      toast('🏆 <b>'+def.name+'</b> — BUMAGSAK! Ang kapuluan ay nagbubunyi!','levelup');
      screenShake(0.5,1.0);
    }
  };
})();
ACH_DEFS.push(
  {id:'wb1', icon:'🐉', name:'Tagapagligtas ng Buwan', desc:'Tumumba ng isang world boss', chk:c=>(c.wboss||0)>=1, rw:{gold:5000}, title:'Tagapagligtas ng Buwan'},
  {id:'wb10',icon:'🌕', name:'Sindak ng mga Halimaw',  desc:'Tumumba ng 10 world boss',    chk:c=>(c.wboss||0)>=10, rw:{gold:30000}, title:'Sindak ng mga Halimaw'},
);


/* ---------- [12] LAGUSAN — DUNGEONS (instanced wave challenges) ---------- */
/* A shimmering dungeon gate stands near town. Enter -> the world dims,
   you fight 3 waves + a champion in a sealed arena of standing stones.
   Solo-instanced (your own pocket world), 3 difficulties, daily first-clear bonus. */
let DUNGEONS=[
  {id:'balon',   name:'Balon ng mga Duwende', icon:'🕳️', minLv:5,   /* TIER 1 halls */
    waves:[['duwende','duwende','nuno','tiyanak'],['nuno','sigbin','duwende','duwende'],['sigbin','sigbin','nuno','duwende']],
    champ:'tikbalang', mult:1.0, rw:{gold:800, xpMult:1.6}},
  {id:'yungib',  name:'Yungib ng mga Anino',  icon:'🌑', minLv:12,  /* TIER 2 halls */
    waves:[['tikbalang','tikbalang','wakwak','wakwak'],['berberoka','wakwak','tikbalang'],['berberoka','berberoka','tikbalang','wakwak']],
    champ:'kapre', mult:1.35, rw:{gold:2000, xpMult:1.8}},
  {id:'pusod',   name:'Pusod ng Bulkan',      icon:'🌋', minLv:20,  /* TIER 3 halls, TIER 4 finale */
    waves:[['santelmo','santelmo','kapre','kapre'],['aswang','aswang','santelmo'],['bungisngis','aswang','aswang','santelmo']],
    champ:'manananggal', mult:1.7, rw:{gold:5000, xpMult:2.2}},
];
if (GAME_DATA.dungeons) DUNGEONS = GAME_DATA.dungeons;
function findLandNear(px,pz,need=3){
  if(walkable(px,pz,need)) return {x:px,z:pz};
  for(let r=4;r<=140;r+=4){
    for(let a=0;a<12;a++){
      const x=px+Math.sin(a/12*6.28)*r, z=pz+Math.cos(a/12*6.28)*r;
      if(x<4*TILE||z<4*TILE||x>(MAP_W-4)*TILE||z>(MAP_H-4)*TILE) continue;
      if(walkable(x,z,need)) return {x,z};
    }
  }
  return {x:30*TILE, z:60*TILE};   // tikbalang camp — known-good land
}
const DGN={active:null, wave:0, alive:0, savedPos:null, arena:findLandNear(60*TILE,74*TILE), clears:{}, mesh:null};
/* arena: a ring of standing stones on the south-west beach (unused map corner) */
(function buildDgnArena(){
  const {x,z}=DGN.arena;
  const g=new THREE.Group();
  for(let i=0;i<10;i++){
    const a=i/10*Math.PI*2;
    const st=new THREE.Mesh(new THREE.BoxGeometry(1.2,rnd(3,4.6),1.0), Mstone(0x3a3444));
    st.position.set(Math.sin(a)*16,1.6,Math.cos(a)*16);
    st.rotation.y=a; st.castShadow=true;
    g.add(st);
    const glyph=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.6),
      (()=>{const m2=new THREE.MeshBasicMaterial({color:0x7df0ff,transparent:true,opacity:0.0});m2._isFx=true;return m2;})());
    glyph.position.set(Math.sin(a)*15.2,2.2,Math.cos(a)*15.2);
    glyph.lookAt(x,2.2,z);
    g.add(glyph);
  }
  g.position.set(x,groundY(x,z),z);
  scene.add(g);
})();
/* the dungeon gate near town's south wall */
const DGN_GATE=findLandNear(62.5*TILE,52.5*TILE,2);
(function buildDgnGate(){
  const {x,z}=DGN_GATE;
  const g=new THREE.Group();
  const m=new THREE.MeshStandardMaterial({color:0x9a5aff,emissive:0x6a2ac0,emissiveIntensity:1.1,roughness:0.4}); m._isFx=true;
  const arch=new THREE.Mesh(new THREE.TorusGeometry(2.0,0.2,8,20,Math.PI), m);
  arch.position.y=0.3; g.add(arch);
  const diskM=new THREE.MeshBasicMaterial({color:0x9a5aff,transparent:true,opacity:0.30,side:THREE.DoubleSide}); diskM._isFx=true;
  const disk=new THREE.Mesh(new THREE.CircleGeometry(1.7,22), diskM);
  disk.position.y=0.32; g.add(disk);
  for(const sx of [-1,1]){
    const skull=new THREE.Mesh(new THREE.SphereGeometry(0.3,6,5), Mstone(0xd8d0c0));
    skull.position.set(sx*2.4,0.5,0.3); g.add(skull);
  }
  g.position.set(x,groundY(x,z),z);
  scene.add(g);
  DGN.mesh=g;
  setInterval(()=>{ if(DGN.mesh) DGN.mesh.rotation.y+=0.01; },50);
})();
function dgnKey(d){ return d.id+':'+dayKeyLocal(); }
function openDungeonSelect(){
  if(DGN.active){ toast('Nasa loob ka na ng lagusan!','warn'); return; }
  const rows=DUNGEONS.map(d=>{
    const locked=S.level<d.minLv;
    const cleared=DGN.clears[dgnKey(d)];
    return `<div class="fr-row" style="${locked?'opacity:.45':''}">
      <span style="font-size:20px">${d.icon}</span>
      <div class="fr-info"><b>${d.name} ${cleared?'✔':''}</b>
        <i>Lv ${d.minLv}+ · 3 alon + kampeon · 🪙${fmt(d.rw.gold)}${cleared?' (kalahati na — nakuha na ang first clear ngayong araw)':' + FIRST CLEAR BONUS'}</i></div>
      ${locked?`<span style="color:#ff8a8a;font-size:11px">Lv ${d.minLv}</span>`:`<button class="mini-btn" data-dgn="${d.id}">PASOK</button>`}
    </div>`;
  }).join('');
  showModal(`<div class="modal-emoji">🌀</div><div class="modal-title">Mga Lagusan (Dungeons)</div>
    <p style="font-size:11px;color:#8a80a2;text-align:center;margin:0 0 8px">Sariling mundo mo ang bawat lagusan — 3 alon ng mga halimaw at isang kampeon.<br>Mamatay ka = labas ka. Ang unang tagumpay bawat araw ay may dagdag na gantimpala.</p>
    ${rows}
    <button class="modal-btn" onclick="closeModal()">Isara</button>`);
  document.querySelectorAll('[data-dgn]').forEach(b=>b.onclick=()=>{ closeModal(); enterDungeon(DUNGEONS.find(d=>d.id===b.dataset.dgn)); });
}
window.openDungeonSelect=openDungeonSelect;
function dgnSpawn(key,mult){
  const def=ENEMY_DEFS[key];
  const a=rnd(0,6.28), rr=rnd(6,13);
  const x=DGN.arena.x+Math.sin(a)*rr, z=DGN.arena.z+Math.cos(a)*rr;
  const hp=Math.round(def.hp*Math.pow(1.06,S.level-1)*mult);
  const mesh=buildEnemyMesh(key);
  mesh.position.set(x,groundY(x,z),z); scene.add(mesh);
  const bar=document.createElement('div');
  bar.className='ebar'+(def.tier==='Elite'?' elite':'')+(def.boss?' boss':''); bar.innerHTML='<i></i>'; bar.style.display='none';
  labelsEl.appendChild(bar);
  const en={key,x,z,homeX:DGN.arena.x,homeZ:DGN.arena.z,hp,maxHp:hp,state:'chase',cd:rnd(0.5,1.5),flash:0,wt:0,wx:x,wz:z,windup:0,
    stealth:0,stunUntil:0,rootUntil:0,chargeT:0,chargeAng:0,retreatT:0,swoopT:0,mesh,bar,animT:rnd(0,9),dungeon:true,_dgnMult:mult};
  enemies.push(en); attachNameplate(en);
  fxRing(x,z,0x9a5aff,0.4,3,0.5);
  return en;
}
function dgnHud(txt){
  let el=$('dgn-hud');
  if(!el){
    el=document.createElement('div'); el.id='dgn-hud';
    el.style.cssText='position:fixed;top:46px;left:50%;transform:translateX(-50%);z-index:41;background:rgba(40,20,70,.85);border:1px solid #9a5aff;color:#e0d0ff;font:700 13px system-ui;padding:6px 16px;border-radius:10px;backdrop-filter:blur(6px);pointer-events:none';
    document.body.appendChild(el);
  }
  if(!txt){ el.style.display='none'; return; }
  el.style.display='block'; el.innerHTML=txt;
}
function enterDungeon(d){
  if(!d||S.level<d.minLv) return;
  DGN.active=d; DGN.wave=0;
  DGN.savedPos={x:player.x,z:player.z};
  /* clear the field: hide world enemies by despawning local sim (guests keep ghosts—dungeon is personal, so pause net contribution) */
  player.x=DGN.arena.x; player.z=DGN.arena.z+10;
  fxRing(player.x,player.z,0x9a5aff,0.6,6,0.8); SFX.skill(); screenShake(0.3,0.5);
  toast(`${d.icon} <b>${d.name}</b> — Alon 1/3. Walang atrasan!`,'warn');
  dgnHud(`${d.icon} ${d.name} — <b>ALON 1/3</b>`);
  setTimeout(()=>dgnNextWave(),1800);
}
function dgnNextWave(){
  const d=DGN.active; if(!d) return;
  const w=d.waves[DGN.wave];
  if(w){
    for(const k of w) dgnSpawn(k,d.mult);
    DGN.alive=w.length;
    dgnHud(`${d.icon} ${d.name} — <b>ALON ${DGN.wave+1}/3</b> · ${w.length} kalaban`);
  } else {
    /* champion */
    const en=dgnSpawn(d.champ,d.mult*1.15);
    en.champion=true;
    DGN.alive=1;
    dgnHud(`${d.icon} ${d.name} — 👑 <b>KAMPEON:</b> ${ENEMY_DEFS[d.champ].name}!`);
    toast('👑 <b>ANG KAMPEON AY DUMATING!</b>','warn'); SFX.screech();
  }
}
/* dungeon kill accounting */
(function(){
  const _ke=killEnemy;
  killEnemy=function(en){
    const wasDgn=en.dungeon, wasChamp=en.champion;
    _ke(en);
    if(!wasDgn||!DGN.active) return;
    DGN.alive--;
    if(DGN.alive>0){ dgnHud(`${DGN.active.icon} ${DGN.active.name} — ALON ${Math.min(DGN.wave+1,3)}/3 · <b>${DGN.alive}</b> pa`); return; }
    if(wasChamp){ finishDungeon(true); return; }
    DGN.wave++;
    if(DGN.wave<DGN.active.waves.length+1){
      toast(DGN.wave<DGN.active.waves.length?`🌀 Alon ${DGN.wave+1} — humanda ka…`:'👑 Parating ang kampeon…','warn');
      setTimeout(()=>dgnNextWave(),2500);
    }
  };
})();
function finishDungeon(win){
  const d=DGN.active; if(!d) return;
  /* clear leftovers */
  for(const en of [...enemies]) if(en.dungeon) removeEnemy(en);
  DGN.active=null; dgnHud('');
  if(DGN.savedPos){ player.x=DGN.savedPos.x; player.z=DGN.savedPos.z; DGN.savedPos=null; }
  if(win){
    const first=!DGN.clears[dgnKey(d)];
    DGN.clears[dgnKey(d)]=1;
    S.dgnClears=S.dgnClears||{}; S.dgnClears[d.id]=(S.dgnClears[d.id]||0)+1;
    const gold=first?d.rw.gold:Math.round(d.rw.gold/2);
    const xp=Math.round(500*d.rw.xpMult*Math.pow(1.09,S.level-1));
    S.gold+=gold; gainXP(xp);
    const it=makeItem(Math.min(LEVEL_CAP,S.level+2), first?1.5:0.8);
    if(S.bag.length<60) S.bag.push(it);
    SFX.levelup(); fxRing(player.x,player.z,0xffd94a,0.5,8,1);
    showModal(`<div class="modal-emoji">🏆</div><div class="modal-title">NALUPIG ANG ${d.name.toUpperCase()}!</div>
      <div class="modal-body" style="text-align:center">
        ${first?'<span style="color:#ffd94a;font-weight:800">⭐ FIRST CLEAR NGAYONG ARAW! ⭐</span><br>':''}
        🪙 +${fmt(gold)} ginto · ⭐ +${fmt(xp)} XP<br>
        Gantimpalang gamit: <b style="color:${RARITIES.find(r=>r.id===it.rarity).color}">${it.icon} ${it.name}</b>
      </div>
      <button class="modal-btn" onclick="closeModal()">KAHANGA-HANGA!</button>`);
    achEvent('dungeon',1);
    updateHUD(); save();
  } else {
    toast('💀 Nabigo ang pagsubok sa lagusan… ibinalik ka ng mga espiritu.','warn');
  }
}
/* death inside a dungeon = failure */
(function(){
  const _hp=hurtPlayer;
  hurtPlayer=function(dmg,opts){
    _hp(dmg,opts);
    if(DGN.active&&player.dead) finishDungeon(false);
  };
})();
/* gate proximity hint (contextual [Interact] pill handles opening now — spec §22) */
setInterval(()=>{
  if(!started||player.dead||DGN.active) return;
  if(d2(player.x,player.z,DGN_GATE.x,DGN_GATE.z)<5*5){
    if(!DGN._prompt){ DGN._prompt=true; toast('🌀 Ang Lagusan — pindutin ang <b>Interact</b> (E) para pumasok.'); }
  } else DGN._prompt=false;
},700);
ACH_DEFS.push(
  {id:'dg1', icon:'🌀', name:'Manlalakbay ng Lagusan', desc:'Tapusin ang isang dungeon', chk:c=>(c.dungeon||0)>=1, rw:{gold:1000}},
  {id:'dg10',icon:'🗝️', name:'Hari ng mga Lagusan',   desc:'Tapusin ang 10 dungeon',    chk:c=>(c.dungeon||0)>=10, rw:{gold:10000}, title:'Hari ng mga Lagusan'},
);


/* ---------- [9] TRIBU — GUILDS ---------- */
window._guildTag='';
window._guildPerks={xp:0,atk:0};
async function guildInfo(){
  if(!ACCT.token) return null;
  const r=await api('/api/guild',{token:ACCT.token, action:'info'});
  if(r.ok){
    window._guildTag=r.tag;
    window._guildPerks=r.perks||{xp:0,atk:0};
    if(window._net&&window._net.joined()) window._net.send({t:'gtag', tag:r.tag});
  } else { window._guildTag=''; window._guildPerks={xp:0,atk:0}; }
  return r.ok?r:null;
}
setTimeout(()=>{ guildInfo(); },4000);
/* guild perks ride on the party-buff hooks */
(function(){
  const _atk=window._partyAtkBonus, _xp=window._partyXpBonus;
  window._partyAtkBonus=()=>_atk()+(window._guildPerks.atk||0)/100;
  window._partyXpBonus=()=>_xp()+(window._guildPerks.xp||0)/100;
})();
async function openGuild(){
  if(!ACCT.token){ toast('Mag-log in muna para sa Tribu.','warn'); return; }
  const g=await guildInfo();
  if(!g){ openGuildBrowser(); return; }
  const online=g.members.filter(m2=>m2.online).length;
  const rows=g.members.sort((a,b)=>b.level-a.level).map(m2=>`
    <div class="fr-row"><span class="fr-dot ${m2.online?'on':''}"></span>
      <div class="fr-info"><b>${m2.owner?'👑 ':''}${m2.user}</b><i>Lv ${m2.level} · ${m2.online?'ONLINE':'offline'}</i></div>
      ${g.owner===g.you&&!m2.owner?`<button class="mini-btn" data-kick="${m2.key}" style="background:#5a2a2a">✕</button>`:''}
    </div>`).join('');
  const nextTxt=g.next?`Susunod na antas: 🪙${fmt(g.next)} (${fmt(g.gold)}/${fmt(g.next)})`:'PINAKAMATAAS NA ANTAS!';
  const pct=g.next?Math.min(100,Math.round(g.gold/g.next*100)):100;
  showModal(`<div class="modal-emoji">⛨</div><div class="modal-title">⛨${g.tag} — ${g.name}</div>
    <div style="text-align:center;font-size:12px;color:#ffd94a;margin-bottom:6px">
      TRIBU LEVEL ${g.level} · ${g.members.length}/30 kasapi (${online} online)<br>
      <span style="color:#8aff9a">✦ Biyaya ng Tribu: +${g.perks.xp}% XP · +${g.perks.atk}% ATK (lahat ng kasapi)</span>
    </div>
    <div style="font-size:11px;color:#8a80a2;text-align:center">${nextTxt}</div>
    <div style="height:6px;background:rgba(255,255,255,.08);border-radius:3px;margin:4px 0 10px"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#ff9a5e,#ffd94a);border-radius:3px"></div></div>
    <div style="display:flex;gap:6px;margin-bottom:8px">
      <button class="mini-btn" id="g-d1" style="flex:1">🪙 Mag-abuloy 1,000</button>
      <button class="mini-btn" id="g-d2" style="flex:1">🪙 Mag-abuloy 10,000</button>
    </div>
    <div style="max-height:32vh;overflow-y:auto">${rows}</div>
    <button class="modal-btn secondary" id="g-leave" style="margin-top:8px">Umalis sa Tribu</button>
    <button class="modal-btn" onclick="closeModal()">Isara</button>`);
  const donate=async(amt)=>{
    if(S.gold<amt){ toast('Kulang ang ginto mo!','warn'); return; }
    const r=await api('/api/guild',{token:ACCT.token, action:'donate', amount:amt});
    if(r.ok){ S.gold-=amt; achEvent('gdonate',amt); toast(`⛨ Nag-abuloy ka ng 🪙${fmt(amt)} sa Tribu!`,'loot'); updateHUD(); save(); openGuild(); }
  };
  $('g-d1').onclick=()=>donate(1000);
  $('g-d2').onclick=()=>donate(10000);
  $('g-leave').onclick=async()=>{
    const r=await api('/api/guild',{token:ACCT.token, action:'leave'});
    if(r.ok){ window._guildTag=''; window._guildPerks={xp:0,atk:0};
      if(window._net&&window._net.joined()) window._net.send({t:'gtag', tag:''});
      toast('Umalis ka sa Tribu.','warn'); closeModal(); }
  };
  document.querySelectorAll('[data-kick]').forEach(b=>b.onclick=async()=>{
    const r=await api('/api/guild',{token:ACCT.token, action:'kick', user:b.dataset.kick});
    if(r.ok){ toast('Tinanggal ang kasapi.','warn'); openGuild(); }
  });
}
async function openGuildBrowser(){
  const r=await api('/api/guild',{token:ACCT.token, action:'list'});
  const rows=(r.list||[]).map(g=>`
    <div class="fr-row"><span style="font-size:16px">⛨</span>
      <div class="fr-info"><b>⛨${g.tag} ${g.name}</b><i>Level ${g.level} · ${g.members}/30 kasapi</i></div>
      <button class="mini-btn" data-join="${g.key}">SUMALI</button>
    </div>`).join('')||'<div class="empty-note">Wala pang Tribu — ikaw ang magtatag ng una!</div>';
  showModal(`<div class="modal-emoji">⛨</div><div class="modal-title">Mga Tribu ng Kapuluan</div>
    <p style="font-size:11px;color:#8a80a2;text-align:center;margin:0 0 8px">Ang Tribu ay samahan ng hanggang 30 bayani. Ang abuloy na ginto ay nagpapalakas ng buong Tribu:<br>Level 2 = +3% XP +1% ATK … Level 5 = +12% XP +6% ATK para sa LAHAT.</p>
    <div class="set-sec">Magtatag ng bagong Tribu</div>
    <div style="display:flex;gap:6px;margin-bottom:10px">
      <input id="g-name" maxlength="20" placeholder="Pangalan ng Tribu" style="flex:2;background:#181226;border:1px solid #3a3050;color:#efe8ff;border-radius:8px;padding:8px;font-size:12px">
      <input id="g-tag" maxlength="4" placeholder="TAG" style="flex:1;background:#181226;border:1px solid #3a3050;color:#efe8ff;border-radius:8px;padding:8px;font-size:12px;text-transform:uppercase">
      <button class="mini-btn" id="g-create">ITATAG</button>
    </div>
    <div class="set-sec">Sumali sa Tribu</div>
    <div style="max-height:36vh;overflow-y:auto">${rows}</div>
    <button class="modal-btn" onclick="closeModal()">Isara</button>`);
  $('g-create').onclick=async()=>{
    const r2=await api('/api/guild',{token:ACCT.token, action:'create', name:$('g-name').value, tag:$('g-tag').value});
    if(r2.ok){ toast(`⛨ Naitatag ang Tribu <b>${$('g-name').value}</b>!`,'levelup'); SFX.levelup(); achEvent('guild',1); guildInfo().then(()=>openGuild()); }
    else toast(r2.err||'Hindi naitatag.','warn');
  };
  document.querySelectorAll('[data-join]').forEach(b=>b.onclick=async()=>{
    const r2=await api('/api/guild',{token:ACCT.token, action:'join', key:b.dataset.join});
    if(r2.ok){ toast('⛨ Sumali ka sa Tribu!','levelup'); SFX.levelup(); achEvent('guild',1); guildInfo().then(()=>openGuild()); }
    else toast(r2.err||'Hindi nakasali.','warn');
  });
}
window.openGuild=openGuild;
(function guildBtn(){
  const b=document.createElement('button');
  b.className='menu-btn'; b.id='btn-guild'; b.title='Tribu (Guild)'; b.textContent='⛨';
  document.querySelector('.hud-right').appendChild(b);
  b.onclick=openGuild;
})();

/* ---------- [10] PALENGKE — PLAYER MARKETPLACE (anti-scam escrow) ---------- */
/* Sell gear to other players. The server holds the listing (escrow):
   - you can never lose the item AND the gold at once
   - the buyer sees the FULL item card before paying (no hidden stats)
   - 5% Tiangge tax on sales discourages gold-flip scams
   - proceeds arrive via mail, claimable anytime */
async function openMarket(tab){
  if(!ACCT.token){ toast('Mag-log in muna para sa Palengke.','warn'); return; }
  tab=tab||'browse';
  const head=`<div class="modal-emoji">🧺</div><div class="modal-title">Palengke ng mga Bayani</div>
    <div style="display:flex;gap:6px;margin-bottom:8px">
      <button class="mini-btn" id="mk-b" style="flex:1;${tab==='browse'?'outline:2px solid #ffd94a':''}">🛒 Bilihan</button>
      <button class="mini-btn" id="mk-s" style="flex:1;${tab==='sell'?'outline:2px solid #ffd94a':''}">🏷️ Magtinda</button>
      <button class="mini-btn" id="mk-m" style="flex:1;${tab==='mine'?'outline:2px solid #ffd94a':''}">📦 Akin</button>
    </div>`;
  let body='';
  if(tab==='browse'){
    const r=await api('/api/market',{token:ACCT.token, action:'browse'});
    body=(r.listings||[]).length?r.listings.map(L=>`
      ${itemCardHTML(L.item,false)}
      <div style="display:flex;justify-content:space-between;align-items:center;margin:-4px 0 10px;padding:0 4px">
        <span style="font-size:11px;color:#8a80a2">Nagtitinda: <b style="color:#d8e8ff">${L.sellerName}</b></span>
        ${L.seller===r.you
          ?'<span style="font-size:11px;color:#8a80a2">— sa iyo ito —</span>'
          :`<button class="mini-btn" data-buy="${L.id}" data-price="${L.price}" ${S.gold>=L.price?'':'disabled style="opacity:.4"'}>🪙 ${fmt(L.price)}</button>`}
      </div>`).join('')
      :'<div class="empty-note">Walang paninda ngayon. Ikaw ang unang magtinda!</div>';
  } else if(tab==='sell'){
    body='<p style="font-size:11px;color:#8a80a2;text-align:center;margin:0 0 8px">Piliin ang gamit mula sa iyong bag. Ang server ang mag-iingat (escrow) — 5% buwis ng Tiangge sa benta.</p>';
    body+=S.bag.length?S.bag.map(it=>`
      ${itemCardHTML(it,false)}
      <div style="display:flex;gap:6px;margin:-4px 0 10px;padding:0 4px">
        <input type="number" min="1" max="5000000" placeholder="Presyo (ginto)" id="mp-${it.uid}" style="flex:1;background:#181226;border:1px solid #3a3050;color:#efe8ff;border-radius:8px;padding:6px;font-size:12px">
        <button class="mini-btn" data-post="${it.uid}">🏷️ ITINDA</button>
      </div>`).join(''):'<div class="empty-note">Walang laman ang bag mo.</div>';
  } else {
    const r=await api('/api/market',{token:ACCT.token, action:'mine'});
    const mailSum=(r.mail||[]).reduce((a,m2)=>a+(m2.gold||0),0);
    body=`<div class="set-sec">📬 Sulat (kita sa benta)</div>`;
    body+=(r.mail||[]).length?r.mail.map(m2=>`<div class="fr-row"><span>📩</span><div class="fr-info"><b>+🪙${fmt(m2.gold)}</b><i>${m2.note}</i></div></div>`).join('')
      +`<button class="modal-btn" id="mk-claim" style="margin:6px 0">📬 KUNIN LAHAT — 🪙${fmt(mailSum)}</button>`
      :'<div class="empty-note">Walang sulat.</div>';
    body+=`<div class="set-sec">🏷️ Mga paninda mo (${(r.listings||[]).length}/8)</div>`;
    body+=(r.listings||[]).length?r.listings.map(L=>`
      ${itemCardHTML(L.item,false)}
      <div style="display:flex;justify-content:space-between;align-items:center;margin:-4px 0 10px;padding:0 4px">
        <span style="font-size:11px;color:#ffd94a">🪙 ${fmt(L.price)}</span>
        <button class="mini-btn" data-cancel="${L.id}" style="background:#5a2a2a">✕ BAWIIN</button>
      </div>`).join(''):'<div class="empty-note">Wala kang paninda.</div>';
  }
  showModal(head+`<div style="max-height:52vh;overflow-y:auto">${body}</div>
    <button class="modal-btn" onclick="closeModal()">Isara</button>`);
  $('mk-b').onclick=()=>openMarket('browse');
  $('mk-s').onclick=()=>openMarket('sell');
  $('mk-m').onclick=()=>openMarket('mine');
  document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=async()=>{
    const price=+b.dataset.price;
    if(S.gold<price){ toast('Kulang ang ginto!','warn'); return; }
    const r=await api('/api/market',{token:ACCT.token, action:'buy', id:+b.dataset.buy});
    if(!r.ok){ toast(r.err||'Hindi nabili.','warn'); openMarket('browse'); return; }
    if(S.bag.length>=60){ toast('Puno ang bag — pero nabili mo na! Nasa bag kapag may puwang.','warn'); }
    S.gold-=price;
    r.item.uid=itemUid++;
    S.bag.push(r.item);
    SFX.levelup(); toast(`🧺 Nabili: <b>${r.item.name}</b> — 🪙${fmt(price)}!`,'loot');
    achEvent('market',1);
    updateHUD(); save(); openMarket('browse');
  });
  document.querySelectorAll('[data-post]').forEach(b=>b.onclick=async()=>{
    const uid=+b.dataset.post;
    const inp=$('mp-'+uid); const price=Math.max(0,Math.round(+inp.value||0));
    if(!price){ toast('Maglagay ng presyo!','warn'); return; }
    const idx=S.bag.findIndex(i=>i.uid===uid); if(idx<0) return;
    const it=S.bag[idx];
    /* Phase 8 escrow: server verifies ownership against the STORED save,
       so sync it first (item still in bag), then post. The server removes
       the item from the stored save itself; we mirror locally on success. */
    await api('/api/save',{token:ACCT.token, save:JSON.stringify(S)});
    const r=await api('/api/market',{token:ACCT.token, action:'post', item:it, price});
    if(r.ok){
      S.bag.splice(idx,1); save();
      toast(`🏷️ Nakatinda: <b>${it.name}</b> — 🪙${fmt(price)} (−5% buwis sa benta)`,'loot'); openMarket('mine');
    }
    else { toast(r.err||'Hindi naitinda.','warn'); openMarket('sell'); }
  });
  document.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=async()=>{
    const r=await api('/api/market',{token:ACCT.token, action:'cancel', id:+b.dataset.cancel});
    if(r.ok&&r.item){ r.item.uid=itemUid++; S.bag.push(r.item); save(); toast('📦 Naibalik ang gamit sa bag mo.','loot'); }
    openMarket('mine');
  });
  const mc=$('mk-claim');
  if(mc) mc.onclick=async()=>{
    const r=await api('/api/market',{token:ACCT.token, action:'mail_claim'});
    if(r.ok&&r.gold){ S.gold+=r.gold; SFX.levelup(); toast(`📬 +🪙${fmt(r.gold)} mula sa mga benta mo!`,'levelup'); updateHUD(); save(); }
    openMarket('mine');
  };
}
window.openMarket=openMarket;
(function marketBtn(){
  const b=document.createElement('button');
  b.className='menu-btn'; b.id='btn-market'; b.title='Palengke (Player Market)'; b.textContent='🧺';
  document.querySelector('.hud-right').appendChild(b);
  b.onclick=()=>openMarket('browse');
  /* mail badge */
  setInterval(async()=>{
    if(!started||!ACCT.token) return;
    const r=await api('/api/market',{token:ACCT.token, action:'mine'});
    const has=(r.mail||[]).length>0;
    let em=b.querySelector('.badge');
    if(has&&!em){ em=document.createElement('em'); em.className='badge'; em.textContent='!'; b.appendChild(em); }
    if(!has&&em) em.remove();
  },45000);
})();

/* ---------- [11] ARENA NG DUGO — ranked PvP + ladder ---------- */
/* Ranked duels use the same honor-duel engine, but report to the ladder:
   WIN +25 RP · LOSS −20 RP. Everyone starts at 1000 RP. */
const ARENA={ranked:false};
function rankName(r){
  return r>=1400?'🌟 ALAMAT':r>=1250?'💎 DIYAMANTE':r>=1150?'🥇 GINTO':r>=1050?'🥈 PILAK':'🥉 TANSO';
}
async function openArena(){
  if(!ACCT.token){ toast('Mag-log in muna para sa Arena.','warn'); return; }
  const r=await api('/api/arena',{token:ACCT.token, action:'top'});
  const me=r.me||{r:1000,w:0,l:0};
  const rows=(r.rows||[]).map((q,i)=>`
    <div class="fr-row">
      <span style="font-size:14px;width:26px;text-align:center;font-weight:800;color:${i===0?'#ffd94a':i===1?'#c8d4e0':i===2?'#d8a878':'#8a80a2'}">${i+1}</span>
      <div class="fr-info"><b>${q.tag?'⛨'+q.tag+' ':''}<span style="color:${q.color}">${q.name}</span></b>
        <i>Lv ${q.level} ${q.cls} · ${q.w}W-${q.l}L</i></div>
      <span style="font-weight:800;color:#ffd94a">${q.r} RP</span>
    </div>`).join('')||'<div class="empty-note">Wala pang nakikipaglaban — ikaw ang mauna!</div>';
  showModal(`<div class="modal-emoji">🏟️</div><div class="modal-title">Arena ng Dugo — Ranked Ladder</div>
    <div style="text-align:center;margin-bottom:8px">
      <span style="font-size:16px;font-weight:800">${rankName(me.r)} · ${me.r} RP</span><br>
      <span style="font-size:11px;color:#8a80a2">${me.w} panalo · ${me.l} talo · Panalo +25 RP / Talo −20 RP</span>
    </div>
    <p style="font-size:11px;color:#8a80a2;text-align:center;margin:0 0 8px">Hamunin ang kapwa bayani sa iyong channel — pindutin ang 🟢 party pill, piliin ang <b>RANKED</b> na hamon. Walang tunay na pinsala; karangalan at RP lamang.</p>
    <div class="set-sec">🏆 TOP 20 NG KAPULUAN</div>
    <div style="max-height:40vh;overflow-y:auto">${rows}</div>
    <button class="modal-btn" onclick="closeModal()">Isara</button>`);
}
window.openArena=openArena;
(function arenaBtn(){
  const b=document.createElement('button');
  b.className='menu-btn'; b.id='btn-arena'; b.title='Arena ng Dugo (Ranked PvP)'; b.textContent='🏟️';
  document.querySelector('.hud-right').appendChild(b);
  b.onclick=openArena;
})();
/* extend the party panel with RANKED challenge buttons */
(function(){
  const _opp2=openPartyPanel;
  openPartyPanel=function(){
    _opp2();
    document.querySelectorAll('[data-duel]').forEach(b=>{
      const rb=document.createElement('button');
      rb.className='mini-btn'; rb.textContent='🏟️ RANKED';
      rb.style.cssText='background:linear-gradient(180deg,#8a3a3a,#5a1a1a);margin-left:4px';
      rb.onclick=()=>{
        ARENA.ranked=true;
        window._net.send({t:'duel',act:'rankreq',to:+b.dataset.duel});
        toast('🏟️ Naipadala ang RANKED na hamon…','warn'); closeModal();
      };
      b.after(rb);
    });
  };
  const pill=$('party-pill');
  if(pill) pill.onclick=()=>openPartyPanel();
})();
/* ranked duel protocol rides the same relay: new act codes */
(function(){
  const _odm=window._onDuelMsg;
  window._onDuelMsg=(m)=>{
    if(m.act==='rankreq'){
      showModal(`<div class="modal-emoji">🏟️</div><div class="modal-title">RANKED na Hamon!</div>
        <p style="text-align:center">Hinahamon ka ni <b>${m.fromName}</b> sa <b>RANKED</b> na duelo!<br>
        <span style="font-size:11px;color:#8a80a2">Panalo +25 RP · Talo −20 RP · walang tunay na pinsala</span></p>
        <button class="modal-btn" id="duel-yes">🏟️ LABAN!</button>
        <button class="modal-btn secondary" id="duel-no">Tanggihan</button>`);
      $('duel-yes').onclick=()=>{ closeModal(); ARENA.ranked=true; window._net.send({t:'duel',act:'rankacc',to:m.from}); startDuel(m.from,m.fromName); duelBanner().querySelector('.db-title').textContent='🏟️ RANKED: '+(S.name||'Ikaw')+' vs '+m.fromName; };
      $('duel-no').onclick=()=>{ closeModal(); ARENA.ranked=false; window._net.send({t:'duel',act:'dec',to:m.from}); };
      return;
    }
    if(m.act==='rankacc'){ closeModal(); ARENA.ranked=true; startDuel(m.from,m.fromName); duelBanner().querySelector('.db-title').textContent='🏟️ RANKED: '+(S.name||'Ikaw')+' vs '+m.fromName; return; }
    if(m.act==='dec'||m.act==='acc') ARENA.ranked=(m.act==='acc')?ARENA.ranked&&false:false;   // friendly accepts & declines clear the ranked flag
    _odm(m);
  };
})();
/* report ranked results when a duel ends */
(function(){
  const _ed=endDuel;
  endDuel=function(result,msg){
    const wasRanked=ARENA.ranked; ARENA.ranked=false;
    _ed(result,msg);
    if(wasRanked&&ACCT.token&&(result==='win'||result==='lose')){
      api('/api/arena',{token:ACCT.token, action:'report', win:result==='win'}).then(r=>{
        if(r.ok){ toast(`🏟️ ${result==='win'?'+25':'−20'} RP — kabuuan: <b>${r.arena.r} RP</b> (${rankName(r.arena.r)})`,result==='win'?'levelup':'warn');
          achEvent('arena',1); if(result==='win') achEvent('arenawin',1);
          /* Phase 9a: server-issued purse arrives via Palengke mail (spec §25 step 3) */
          if(r.purse) toast(`💰 Premyo ng Arena: 🪙${fmt(r.purse)} — kunin sa 🧺 Palengke → 📦 Akin!`,'loot'); }
      });
    }
  };
})();
ACH_DEFS.push(
  {id:'ar1',  icon:'🏟️', name:'Bagong Gladiator',  desc:'Makipaglaban sa ranked arena', chk:c=>(c.arena||0)>=1, rw:{gold:800}},
  {id:'ar10', icon:'⚔️',  name:'Beterano ng Arena', desc:'Manalo ng 10 ranked na laban', chk:c=>(c.arenawin||0)>=10, rw:{gold:8000}, title:'Beterano ng Arena'},
  {id:'gld',  icon:'⛨',   name:'Kabilang sa Tribu', desc:'Sumali o magtatag ng Tribu',   chk:c=>(c.guild||0)>=1, rw:{gold:1000}, title:'Anak ng Tribu'},
  {id:'gld2', icon:'💛',  name:'Haligi ng Tribu',   desc:'Mag-abuloy ng 50,000 ginto sa Tribu', chk:c=>(c.gdonate||0)>=50000, rw:{gold:5000}, title:'Haligi ng Tribu'},
  {id:'mk1',  icon:'🧺',  name:'Suki ng Palengke',  desc:'Bumili sa player marketplace', chk:c=>(c.market||0)>=1, rw:{gold:500}},
);


/* ================================================================
   PHASE 4 MODULE — Map v2 beauty pass · Fishing & Cooking ·
   Boss Cosmetics · BGM + Sound Sliders · Tutorial · Offline v2
   ================================================================ */

/* ---------- TOWN v2 DECOR: fountain, lantern ring, flower beds ---------- */
(function townBeautify(){
  const g=new THREE.Group();
  const ty0=groundY(GATE_CX,GATE_CZ);
  /* central fountain (west plaza, clear of tent/well/portal) */
  const FX=64.4*TILE, FZ=44.4*TILE;
  const fb=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.5,0.7,12), Mstone(0xcac2b8));
  fb.position.set(FX,ty0+0.35,FZ); fb.castShadow=true; g.add(fb);
  const fw=new THREE.Mesh(new THREE.CircleGeometry(1.9,14),
    WaterMat({deep:0x1e5868, shallow:0x4a9aaa, opacity:0.92, flowX:0, flowZ:0, speed:0.5, waveAmp:0.02, glint:0.8}));
  fw.rotation.x=-Math.PI/2; fw.position.set(FX,ty0+0.72,FZ); g.add(fw);
  const spire=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.28,1.5,7), Mstone(0xb8b0a4));
  spire.position.set(FX,ty0+1.4,FZ); g.add(spire);
  const orb=new THREE.Mesh(new THREE.SphereGeometry(0.3,8,7),
    (()=>{const m=new THREE.MeshStandardMaterial({color:0x7df0ff,emissive:0x2a9ac0,emissiveIntensity:1.6,roughness:0.3});m._isFx=true;return m;})());
  orb.position.set(FX,ty0+2.35,FZ); g.add(orb);
  /* fountain spray: tiny rising dots */
  const sprayGeo=new THREE.BufferGeometry();
  const sprayN=26, sp=new Float32Array(sprayN*3);
  for(let i=0;i<sprayN;i++){ sp[i*3]=FX+rnd(-0.6,0.6); sp[i*3+1]=ty0+1.2+rnd(0,1.4); sp[i*3+2]=FZ+rnd(-0.6,0.6); }
  sprayGeo.setAttribute('position',new THREE.BufferAttribute(sp,3));
  const sprayMat=new THREE.PointsMaterial({color:0xbfeaff,size:0.14,transparent:true,opacity:0.8}); sprayMat._isFx=true;
  const spray=new THREE.Points(sprayGeo,sprayMat); g.add(spray);
  setInterval(()=>{
    const a=spray.geometry.attributes.position.array;
    for(let i=0;i<sprayN;i++){
      a[i*3+1]+=0.05;
      if(a[i*3+1]>ty0+2.8){ a[i*3]=FX+rnd(-0.6,0.6); a[i*3+1]=ty0+1.1; a[i*3+2]=FZ+rnd(-0.6,0.6); }
    }
    spray.geometry.attributes.position.needsUpdate=true;
  },50);
  bldRects.push({x0:FX-2.6,x1:FX+2.6,z0:FZ-2.6,z1:FZ+2.6});
  /* lantern ring around the plaza — parol-style star lanterns that glow at night */
  const lampMats=[];
  const lampPos=[[59.2,38.4],[63,38],[70,38],[73.8,38.4],[59.2,49.2],[63,49.6],[70,49.6],[73.8,49.2],[58.6,43.5],[74.4,43.5],[61,40.5],[72,47]];
  for(const [lx,lz] of lampPos){
    const px=lx*TILE, pz=lz*TILE, py=groundY(px,pz);
    const post=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.13,3.4,6), Mwood(0x6a4a2e));
    post.position.set(px,py+1.7,pz); post.castShadow=true; g.add(post);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.08,0.08), Mwood(0x6a4a2e));
    arm.position.set(px+0.35,py+3.3,pz); g.add(arm);
    const lm=new THREE.MeshStandardMaterial({color:0xffd98a,emissive:0xff9a2e,emissiveIntensity:0.35,roughness:0.5});
    lm._isFx=true; lampMats.push(lm);
    const lamp=new THREE.Mesh(new THREE.OctahedronGeometry(0.34), lm);
    lamp.position.set(px+0.72,py+3.0,pz); g.add(lamp);
  }
  setInterval(()=>{
    const night=(typeof DAYNIGHT!=='undefined')&&(DAYNIGHT.phase==='night'||DAYNIGHT.phase==='dusk');
    for(const m of lampMats) m.emissiveIntensity+=((night?2.4:0.35)-m.emissiveIntensity)*0.08;
  },250);
  /* flower beds along the plaza edge */
  const bedCols=[0xff6a8a,0xffd94a,0xc08aff,0xff9a5e,0x7df0ff];
  for(let i=0;i<26;i++){
    const a=i/26*Math.PI*2;
    const px=66.5*TILE+Math.cos(a)*23, pz=43.6*TILE+Math.sin(a)*15;
    if(!inTown(px,pz)) continue;
    const fl=new THREE.Mesh(new THREE.SphereGeometry(0.16,5,4), M(bedCols[i%5],{emissive:bedCols[i%5],emissiveIntensity:0.25}));
    fl.position.set(px,groundY(px,pz)+0.18,pz);
    const st=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.3,4), M(0x4a8a3a));
    st.position.set(px,groundY(px,pz)+0.02,pz);
    g.add(fl); g.add(st);
  }
  scene.add(g);
})();

/* ---------- NIGHT SKY: stars that fade in after dusk ---------- */
(function starField(){
  const N=650, pos=new Float32Array(N*3);
  for(let i=0;i<N;i++){
    const a=rnd(0,Math.PI*2), e=rnd(0.12,1.35), r=900;
    pos[i*3]=Math.cos(a)*Math.cos(e)*r;
    pos[i*3+1]=Math.sin(e)*r*0.7+60;
    pos[i*3+2]=Math.sin(a)*Math.cos(e)*r;
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const mat=new THREE.PointsMaterial({color:0xcfe0ff,size:1.9,sizeAttenuation:false,transparent:true,opacity:0});
  mat._isFx=true;
  const stars=new THREE.Points(geo,mat);
  stars.frustumCulled=false;
  scene.add(stars);
  setInterval(()=>{
    stars.position.set(player.x,0,player.z);
    const ph=(typeof DAYNIGHT!=='undefined')?DAYNIGHT.phase:'day';
    const want=ph==='night'?0.95:ph==='dusk'?0.35:ph==='dawn'?0.2:0;
    mat.opacity+=(want-mat.opacity)*0.06;
  },300);
})();

/* ---------- AMBIENT PETALS: drifting blossoms near the player ---------- */
(function petals(){
  const N=90, R=42;
  const geo=new THREE.BufferGeometry();
  const pos=new Float32Array(N*3), vel=[];
  for(let i=0;i<N;i++){
    pos[i*3]=rnd(-R,R); pos[i*3+1]=rnd(1,14); pos[i*3+2]=rnd(-R,R);
    vel.push({x:rnd(-0.5,0.5),y:rnd(-0.35,-0.15),z:rnd(-0.3,0.3),w:rnd(0,6.28)});
  }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const mat=new THREE.PointsMaterial({color:0xffb8d0,size:0.22,transparent:true,opacity:0.75});
  mat._isFx=true;
  const pts=new THREE.Points(geo,mat);
  pts.frustumCulled=false;
  scene.add(pts);
  let last=performance.now();
  (function tick(now){
    requestAnimationFrame(tick);
    const dt=Math.min(0.05,(now-last)/1000); last=now;
    if(!started){ pts.visible=false; return; }
    pts.visible=true;
    pts.position.set(player.x,0,player.z);
    const a=geo.attributes.position.array;
    for(let i=0;i<N;i++){
      const v=vel[i]; v.w+=dt*2;
      a[i*3]+=(v.x+Math.sin(v.w)*0.4)*dt*2;
      a[i*3+1]+=v.y*dt*2;
      a[i*3+2]+=v.z*dt*2;
      if(a[i*3+1]<0.3){ a[i*3]=rnd(-R,R); a[i*3+1]=rnd(9,14); a[i*3+2]=rnd(-R,R); }
    }
    geo.attributes.position.needsUpdate=true;
  })(last);
})();


/* ---------- [15] PANGINGISDA & PAGLULUTO — fishing + buff foods ---------- */
const FISH_DEFS={
  tilapia:  {name:'Tilapia',        icon:'🐟', rarity:'common',   w:50},
  bangus:   {name:'Bangus',         icon:'🐠', rarity:'common',   w:30},
  hipon:    {name:'Hipon',          icon:'🦐', rarity:'uncommon', w:14},
  alimango: {name:'Alimango',       icon:'🦀', rarity:'uncommon', w:9},
  maya_maya:{name:'Maya-maya',      icon:'🐡', rarity:'rare',     w:4},
  gintong_isda:{name:'Gintong Isda',icon:'✨', rarity:'rare',     w:1},
};
for(const [id,f] of Object.entries(FISH_DEFS)){
  MATERIALS[id]={name:f.name, icon:f.icon, rarity:f.rarity, col:0x7dc8ff,
    lore:id==='gintong_isda'?'A golden fish said to be a diwata in disguise. Cooking it feels… disrespectful. Delicious, though.':'Fresh catch from the waters of the kapuluan.'};
}
const DISHES=[
  {id:'sinigang',   name:'Sinigang na Hipon',   icon:'🍲', cost:{hipon:2, dahon:20},        buff:{atk:0.10, dur:600},  desc:'+10% ATK sa loob ng 10 minuto. Ang asim = lakas!'},
  {id:'inihaw',     name:'Inihaw na Tilapia',   icon:'🐟', cost:{tilapia:2, kawayan:10},    buff:{hp:0.15, dur:600},   desc:'+15% Max HP sa loob ng 10 minuto.'},
  {id:'kinilaw',    name:'Kinilaw na Bangus',   icon:'🥗', cost:{bangus:2, niyog:15},       buff:{spd:0.08, dur:600},  desc:'+8% bilis ng takbo sa loob ng 10 minuto.'},
  {id:'halabos',    name:'Halabos na Alimango', icon:'🦀', cost:{alimango:1, bato:10},      buff:{def:0.15, dur:600},  desc:'+15% Depensa sa loob ng 10 minuto.'},
  {id:'escabeche',  name:'Escabeche Maya-maya', icon:'🍛', cost:{maya_maya:1, palay:30},    buff:{xp:0.15, dur:900},   desc:'+15% XP sa loob ng 15 minuto. Pagkain ng matalino!'},
  {id:'ginto_ulam', name:'Ginintuang Handaan',  icon:'👑', cost:{gintong_isda:1, mutya:1},  buff:{atk:0.15, hp:0.15, xp:0.20, dur:900}, desc:'ALAMAT: +15% ATK, +15% HP, +20% XP sa loob ng 15 minuto.'},
];
const FOOD={buffs:{}};   // id -> {until, buff}
function foodBuffActive(){ const t=nowS(); return Object.entries(FOOD.buffs).filter(([id,b])=>b.until>t); }
function foodStat(stat){ let v=0; const t=nowS(); for(const b of Object.values(FOOD.buffs)){ if(b.until>t&&b.buff[stat]) v+=b.buff[stat]; } return v; }
/* hook food buffs into computeStats */
(function(){
  const _cs=computeStats;
  computeStats=function(){
    _cs();
    P.atk=Math.round(P.atk*(1+foodStat('atk')));
    P.maxHp=Math.round(P.maxHp*(1+foodStat('hp')));
    P.def=Math.round(P.def*(1+foodStat('def')));
    P.spd*=(1+foodStat('spd'));
    P.xpGain+=foodStat('xp')*100;
    if(S.hp>P.maxHp) S.hp=P.maxHp;
  };
})();
/* fishing: stand near water, press the 🎣 button that appears */
const FISHING={casting:false, biteAt:0, window:0};
function nearWater(){
  for(let a=0;a<8;a++){
    const x=player.x+Math.sin(a/8*6.28)*5, z=player.z+Math.cos(a/8*6.28)*5;
    if(tileIdx(x,z)===2) return true;
  }
  return false;
}
function rollFish(){
  const tot=Object.values(FISH_DEFS).reduce((a,f)=>a+f.w,0);
  let r=Math.random()*tot;
  for(const [id,f] of Object.entries(FISH_DEFS)){ if((r-=f.w)<=0) return id; }
  return 'tilapia';
}
(function fishBtn(){
  const b=document.createElement('button');
  b.id='btn-fish'; b.textContent='🎣';
  b.className='ctl-btn tiny';
  b.style.cssText='position:fixed;bottom:170px;right:14px;z-index:45;display:none;font-size:22px';
  document.body.appendChild(b);
  setInterval(()=>{
    const show=started&&!player.dead&&!FISHING.casting&&nearWater()&&!DGN.active;
    b.style.display=show?'block':'none';
  },600);
  b.onclick=()=>{
    if(FISHING.casting) return;
    FISHING.casting=true;
    b.style.display='none';
    const wait=rnd(2.5,6);
    toast('🎣 Inihagis ang bingwit… maghintay ng kagat…','');
    SFX.arrow();
    FISHING.biteAt=nowS()+wait;
    FISHING.window=0;
    const check=setInterval(()=>{
      if(!FISHING.casting){ clearInterval(check); return; }
      const t=nowS();
      if(FISHING.window===0&&t>=FISHING.biteAt){
        FISHING.window=t+1.4;                      // 1.4s to react
        toast('❗ <b>MAY KUMAGAT!</b> Pindutin ang 🎣!','warn');
        SFX.hit(); screenShake(0.12,0.2);
        const hb=document.createElement('button');
        hb.id='fish-hook'; hb.textContent='❗🎣';
        hb.style.cssText='position:fixed;bottom:170px;right:14px;z-index:46;font-size:26px;background:linear-gradient(180deg,#ffd94a,#c98d1e);border:2px solid #fff;border-radius:50%;width:64px;height:64px;box-shadow:0 0 22px rgba(255,217,74,.8)';
        document.body.appendChild(hb);
        hb.onclick=()=>{
          hb.remove(); clearInterval(check);
          FISHING.casting=false;
          const id=rollFish(), f=FISH_DEFS[id];
          addInv(id,1);
          achEvent('fish',1);
          window._questProg&&window._questProg('fish',1);
          SFX.loot(); fxRing(player.x,player.z,0x7dc8ff,0.4,3,0.5);
          toast(`🎣 <b>HULI!</b> ${f.icon} ${f.name}${f.rarity!=='common'?' — '+f.rarity.toUpperCase()+'!':''}`,'loot');
          if(id==='gintong_isda'){ SFX.levelup(); toast('✨ <b>GINTONG ISDA!</b> Ang diwata ng tubig ay ngumiti sa iyo!','levelup'); }
          save();
        };
        setTimeout(()=>{ if(document.body.contains(hb)){ hb.remove(); } },1400);
      }
      if(FISHING.window>0&&t>FISHING.window){
        clearInterval(check);
        FISHING.casting=false;
        toast('💨 Nakawala ang isda… subukan muli!','warn');
      }
    },100);
  };
})();
/* cooking fire in town + cooking UI */
(function cookFire(){
  const CX=68.5*TILE, CZ=40.2*TILE;
  const g=new THREE.Group();
  const py=groundY(CX,CZ);
  for(let i=0;i<5;i++){
    const st=new THREE.Mesh(new THREE.SphereGeometry(0.22,5,4), Mstone(0x8a8a92));
    st.position.set(CX+Math.sin(i/5*6.28)*0.7,py+0.15,CZ+Math.cos(i/5*6.28)*0.7);
    g.add(st);
  }
  const fm=new THREE.MeshStandardMaterial({color:0xff9a2e,emissive:0xff6a00,emissiveIntensity:1.8,transparent:true,opacity:0.9}); fm._isFx=true;
  const flame=new THREE.Mesh(new THREE.ConeGeometry(0.4,1.0,6), fm);
  flame.position.set(CX,py+0.75,CZ); g.add(flame);
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.4,0.5,8), M(0x2a2a30,{metalness:0.7,roughness:0.4}));
  pot.position.set(CX,py+1.15,CZ); g.add(pot);
  setInterval(()=>{ flame.scale.y=1+Math.sin(nowS()*7)*0.18; flame.rotation.y+=0.07; },60);
  scene.add(g);
  const label=document.createElement('div');
  label.className='flabel tentlbl'; label.textContent='🍲 Lutuan';
  $('labels').appendChild(label);
  setInterval(()=>{
    const pp=project(CX,py+2.2,CZ);
    if(pp&&started){ label.style.display='block'; label.style.left=pp.x+'px'; label.style.top=pp.y+'px'; }
    else label.style.display='none';
  },100);
  setInterval(()=>{
    if(!started||player.dead) return;
    if(d2(player.x,player.z,CX,CZ)<3*3){
      if(!window._cookPrompt){ window._cookPrompt=true; openCooking(); }
    } else window._cookPrompt=false;
  },700);
})();
function openCooking(){
  const t=nowS();
  const active=foodBuffActive().map(([id,b])=>{
    const d=DISHES.find(x=>x.id===id);
    return `<div class="fr-row"><span style="font-size:18px">${d.icon}</span>
      <div class="fr-info"><b>${d.name}</b><i>${Math.ceil((b.until-t)/60)} min pa</i></div></div>`;
  }).join('');
  const rows=DISHES.map(d=>{
    const can=Object.entries(d.cost).every(([id,q])=>(S.inv[id]||0)>=q);
    const cost=Object.entries(d.cost).map(([id,q])=>`${MATERIALS[id].icon}${q}`).join(' ');
    return `<div class="fr-row" style="${can?'':'opacity:.5'}">
      <span style="font-size:20px">${d.icon}</span>
      <div class="fr-info"><b>${d.name}</b><i>${d.desc}<br>${cost}</i></div>
      ${can?`<button class="mini-btn" data-cook="${d.id}">LUTUIN</button>`:''}
    </div>`;
  }).join('');
  showModal(`<div class="modal-emoji">🍲</div><div class="modal-title">Lutuan ng Bayan</div>
    ${active?'<div class="set-sec">😋 Aktibong buff</div>'+active:''}
    <div class="set-sec">📖 Mga Putahe (kailangan: isda mula sa 🎣 pangingisda)</div>
    <div style="max-height:44vh;overflow-y:auto">${rows}</div>
    <button class="modal-btn" onclick="closeModal()">Isara</button>`);
  document.querySelectorAll('[data-cook]').forEach(b=>b.onclick=()=>{
    const d=DISHES.find(x=>x.id===b.dataset.cook);
    if(!Object.entries(d.cost).every(([id,q])=>(S.inv[id]||0)>=q)) return;
    for(const [id,q] of Object.entries(d.cost)) S.inv[id]-=q;
    FOOD.buffs[d.id]={until:nowS()+d.buff.dur, buff:d.buff};
    computeStats(); updateHUD();
    SFX.heal(); fxRing(player.x,player.z,0xffb84a,0.4,4,0.6);
    toast(`${d.icon} <b>${d.name}</b> — kumain ka nang mabuti! ${d.desc}`,'loot');
    achEvent('cook',1);
    save(); openCooking();
  });
}
window.openCooking=openCooking;
/* food buff chip */
(function foodChip(){
  const c=document.createElement('div');
  c.id='food-chip';
  c.style.cssText='position:fixed;top:34px;left:calc(50% + 110px);z-index:40;background:rgba(20,14,34,.72);border:1px solid rgba(255,184,74,.4);color:#ffd94a;font:700 10px system-ui;padding:3px 9px;border-radius:999px;backdrop-filter:blur(6px);pointer-events:none;display:none';
  document.body.appendChild(c);
  setInterval(()=>{
    const act=foodBuffActive();
    if(!started||!act.length){ c.style.display='none'; return; }
    c.style.display='block';
    c.textContent=act.map(([id])=>DISHES.find(d=>d.id===id).icon).join(' ')+' busog!';
  },2000);
})();
ACH_DEFS.push(
  {id:'fi1', icon:'🎣', name:'Unang Huli',        desc:'Makahuli ng isda',            chk:c=>(c.fish||0)>=1,  rw:{gold:300}},
  {id:'fi50',icon:'🐠', name:'Mangingisda',        desc:'Makahuli ng 50 isda',         chk:c=>(c.fish||0)>=50, rw:{gold:3000}, title:'Mangingisda'},
  {id:'fig', icon:'✨', name:'Biyaya ng Tubig',    desc:'Mahuli ang Gintong Isda',     chk:()=>(S.inv.gintong_isda||0)>=1||(S.ach&&S.ach.c&&S.ach.c.goldfish), rw:{gold:5000}, title:'Biyaya ng Tubig'},
  {id:'ck1', icon:'🍲', name:'Kusinero ng Bayan',  desc:'Magluto ng 10 putahe',        chk:c=>(c.cook||0)>=10, rw:{gold:2000}, title:'Kusinero ng Bayan'},
);


/* ---------- [16] BOSS COSMETIC LOOT — auras & crowns ---------- */
const COSMETICS={
  aura_apoy:   {name:'Alab ng Manananggal', icon:'🔥', src:'manananggal', chance:0.25, type:'aura', color:0xff6a3a,
    desc:'Nag-aapoy na pulang aura mula sa reyna ng gabi.'},
  aura_buwan:  {name:'Liwanag ng Buwan',    icon:'🌙', src:'bakunawa',    chance:0.35, type:'aura', color:0x7df0ff,
    desc:'Malamig na asul na liwanag — piraso ng buwang nailigtas.'},
  aura_araw:   {name:'Ningning ng Araw',    icon:'☀️', src:'minokawa',    chance:0.35, type:'aura', color:0xffd94a,
    desc:'Gintong sinag mula sa pakpak ng Minokawa.'},
  aura_hiyas:  {name:'Kislap ng Hiyas',     icon:'💎', src:'sarangay',    chance:0.35, type:'aura', color:0xff4a8a,
    desc:'Rosas na kislap ng hiyas ni Sarangay.'},
};
let AURA_MESH=null, AURA_ID='';
function equipAura(id){
  S.cosmetics=S.cosmetics||{owned:[],active:''};
  if(id&&!S.cosmetics.owned.includes(id)) return;
  S.cosmetics.active=id||'';
  if(AURA_MESH){ scene.remove(AURA_MESH); AURA_MESH=null; AURA_ID=''; }
  if(id&&COSMETICS[id]){
    const c=COSMETICS[id];
    const g=new THREE.Group();
    const rm=new THREE.MeshBasicMaterial({color:c.color,transparent:true,opacity:0.5,side:THREE.DoubleSide}); rm._isFx=true;
    const ring=new THREE.Mesh(new THREE.RingGeometry(1.0,1.35,24), rm);
    ring.rotation.x=-Math.PI/2; ring.position.y=0.12; g.add(ring);
    const pm=new THREE.PointsMaterial({color:c.color,size:0.16,transparent:true,opacity:0.85}); pm._isFx=true;
    const N=16, pp=new Float32Array(N*3);
    for(let i=0;i<N;i++){ pp[i*3]=Math.sin(i/N*6.28)*1.1; pp[i*3+1]=rnd(0.2,2.2); pp[i*3+2]=Math.cos(i/N*6.28)*1.1; }
    const pg=new THREE.BufferGeometry(); pg.setAttribute('position',new THREE.BufferAttribute(pp,3));
    g.add(new THREE.Points(pg,pm));
    scene.add(g);
    AURA_MESH=g; AURA_ID=id;
  }
  save();
}
/* aura follows the hero */
setInterval(()=>{
  if(AURA_MESH&&started&&!player.dead){
    AURA_MESH.visible=true;
    AURA_MESH.position.set(player.x,groundY(player.x,player.z),player.z);
    AURA_MESH.rotation.y+=0.03;
  } else if(AURA_MESH) AURA_MESH.visible=false;
},40);
/* boss kills roll cosmetics */
(function(){
  const _kr2=killReward;
  killReward=function(en){
    _kr2(en);
    const def=ENEMY_DEFS[en.key];
    if(!def||!def.boss) return;
    S.cosmetics=S.cosmetics||{owned:[],active:''};
    for(const [id,c] of Object.entries(COSMETICS)){
      if(c.src!==en.key||S.cosmetics.owned.includes(id)) continue;
      if(Math.random()<c.chance){
        S.cosmetics.owned.push(id);
        SFX.levelup();
        toast(`${c.icon} <b>KOSMETIKONG GANTIMPALA:</b> ${c.name}! Isuot sa 🏆 → Mga Aura.`,'levelup');
        if(window._chatSys) window._chatSys(`${c.icon} Nakakuha ka ng aura: ${c.name}!`,'xp');
        save();
        break;
      }
    }
  };
})();
/* aura picker inside the achievements panel */
(function(){
  const _oa=openAchievements;
  openAchievements=function(){
    _oa();
    S.cosmetics=S.cosmetics||{owned:[],active:''};
    const box=$('modal-box'); if(!box) return;
    const sec=document.createElement('div');
    const owned=S.cosmetics.owned;
    sec.innerHTML=`<div class="set-sec">✨ Mga Aura (mula sa mga boss)</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px">
        <button class="mini-btn" data-aura="" style="${!S.cosmetics.active?'outline:2px solid #ffd94a':''}">Wala</button>
        ${Object.entries(COSMETICS).map(([id,c])=>owned.includes(id)
          ?`<button class="mini-btn" data-aura="${id}" style="${S.cosmetics.active===id?'outline:2px solid #ffd94a':''}" title="${c.desc}">${c.icon} ${c.name}</button>`
          :`<span class="mini-btn" style="opacity:.35;cursor:default" title="Talunin si ${ENEMY_DEFS[c.src].name} (${Math.round(c.chance*100)}% tsansa)">${c.icon} ???</span>`).join('')}
      </div>`;
    const titleSec=box.querySelector('.set-sec');
    box.insertBefore(sec,titleSec);
    sec.querySelectorAll('[data-aura]').forEach(b=>b.onclick=()=>{
      equipAura(b.dataset.aura);
      toast(b.dataset.aura?'✨ Suot mo na ang aura!':'Tinanggal ang aura.','loot');
      openAchievements();
    });
  };
})();
/* restore active aura on load */
setTimeout(()=>{ if(S.cosmetics&&S.cosmetics.active) equipAura(S.cosmetics.active); },3000);

/* ---------- [17] MUSIKA — procedural BGM + volume sliders ---------- */
const BGM=(function(){
  let ctx=null, master=null, playing=false, timer=null, cur='none';
  const VOL={bgm:+(localStorage.getItem('agimat_vol_bgm')||0.35), sfx:+(localStorage.getItem('agimat_vol_sfx')||0.5)};
  function ensure(){
    if(ctx) return true;
    try{
      ctx=new (window.AudioContext||window.webkitAudioContext)();
      master=ctx.createGain(); master.gain.value=VOL.bgm; master.connect(ctx.destination);
      return true;
    }catch(e){ return false; }
  }
  /* kulintang-inspired pentatonic patterns; night = lower & sparser */
  const SCALE_DAY=[523.25,587.33,659.25,783.99,880.00,1046.5];
  const SCALE_NIGHT=[261.63,293.66,329.63,392.00,440.00];
  function pluck(freq,vol,dur,type){
    if(!ensure()) return;
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.type=type||'sine'; o.frequency.value=freq;
    const t=ctx.currentTime;
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(vol,t+0.015);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t+dur+0.05);
    /* soft overtone = gong shimmer */
    const o2=ctx.createOscillator(), g2=ctx.createGain();
    o2.type='sine'; o2.frequency.value=freq*2.02;
    g2.gain.setValueAtTime(0.0001,t);
    g2.gain.exponentialRampToValueAtTime(vol*0.25,t+0.02);
    g2.gain.exponentialRampToValueAtTime(0.0001,t+dur*0.7);
    o2.connect(g2); g2.connect(master);
    o2.start(t); o2.stop(t+dur+0.05);
  }
  let step=0;
  function loop(){
    if(!playing) return;
    const night=(typeof DAYNIGHT!=='undefined')&&(DAYNIGHT.phase==='night');
    const inT=(typeof inTown==='function')&&inTown(player.x,player.z);
    const scale=night?SCALE_NIGHT:SCALE_DAY;
    const bpm=inT?92:night?60:76;
    const beat=60/bpm;
    /* melodic step: wandering pentatonic with rests */
    if(Math.random()<(night?0.55:0.8)){
      const n=scale[(step*3+Math.floor(Math.random()*2))%scale.length];
      pluck(n,0.16,beat*rnd(1.2,2.2),'sine');
      if(inT&&Math.random()<0.4) pluck(n*1.5,0.08,beat,'triangle');
    }
    /* low gong every 8 steps */
    if(step%8===0) pluck(night?98:130.8,0.14,beat*4,'sine');
    step++;
    timer=setTimeout(loop,beat*1000*(Math.random()<0.2?2:1));
  }
  return {
    start(){ if(playing||!ensure()) return; if(ctx.state==='suspended') ctx.resume(); playing=true; loop(); },
    stop(){ playing=false; clearTimeout(timer); },
    get vol(){ return VOL; },
    setBgm(v){ VOL.bgm=v; localStorage.setItem('agimat_vol_bgm',v); if(master) master.gain.value=v; },
    setSfx(v){ VOL.sfx=v; localStorage.setItem('agimat_vol_sfx',v); if(window._sfxMaster) window._sfxMaster.gain.value=v; },
  };
})();
/* start BGM once the game starts (after a user gesture, so audio unlocks) */
(function(){
  let bgmStarted=false;
  window.addEventListener('pointerdown',()=>{
    if(started&&!bgmStarted&&BGM.vol.bgm>0.01){ bgmStarted=true; BGM.start(); }
  },{passive:true});
  setInterval(()=>{
    if(started&&!bgmStarted&&BGM.vol.bgm>0.01){ bgmStarted=true; BGM.start(); }
    if(bgmStarted&&BGM.vol.bgm<=0.01){ bgmStarted=false; BGM.stop(); }
  },3000);
})();
/* volume sliders injected into Settings */
(function(){
  const _os=openSettings;
  openSettings=function(){
    _os();
    const box=$('modal-box'); if(!box) return;
    const sec=document.createElement('div');
    sec.innerHTML=`<div class="set-sec">🔊 Tunog</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin:4px 0 10px;font-size:12px;color:#bfb6d2">
        <label style="display:flex;align-items:center;gap:8px">🎵 Musika
          <input type="range" id="vol-bgm" min="0" max="100" value="${Math.round(BGM.vol.bgm*100)}" style="flex:1">
          <b id="vol-bgm-v" style="width:34px;text-align:right">${Math.round(BGM.vol.bgm*100)}%</b></label>
        <label style="display:flex;align-items:center;gap:8px">🔔 Sound FX
          <input type="range" id="vol-sfx" min="0" max="100" value="${Math.round(BGM.vol.sfx*100)}" style="flex:1">
          <b id="vol-sfx-v" style="width:34px;text-align:right">${Math.round(BGM.vol.sfx*100)}%</b></label>
      </div>`;
    const firstSec=box.querySelector('.set-sec');
    box.insertBefore(sec,firstSec);
    $('vol-bgm').oninput=e=>{ BGM.setBgm(e.target.value/100); $('vol-bgm-v').textContent=e.target.value+'%'; };
    $('vol-sfx').oninput=e=>{ BGM.setSfx(e.target.value/100); $('vol-sfx-v').textContent=e.target.value+'%'; SFX.coin(); };
  };
  $('btn-settings').onclick=openSettings;
})();

/* ---------- [18] GABAY NI LOLA — tutorial quest chain ---------- */
const TUTORIAL=[
  {id:'move',   icon:'🕹️', txt:'Gumalaw gamit ang joystick o WASD',            chk:()=>d2(player.x,player.z,266,180)>8*8, rw:{gold:50}},
  {id:'attack', icon:'🗡️', txt:'Umatake (pindutin ang malaking pulang button)', chk:c=>c.tutAtk,  rw:{gold:75}},
  {id:'kill',   icon:'💥', txt:'Tumumba ng isang halimaw',                     chk:c=>(c.kill||0)>=1, rw:{gold:150}},
  {id:'forage', icon:'🌿', txt:'Mag-forage ng materyales (lapitan ang halaman)',chk:c=>(c.forage||0)>=1, rw:{gold:100}},
  {id:'shop',   icon:'🏮', txt:'Bumisita sa Grand Tiangge (gitnang bayan)',     chk:()=>inTown(player.x,player.z), rw:{gold:150}},
  {id:'equip',  icon:'🎒', txt:'Mag-equip ng gamit (☰ menu → ⚔️ Kagamitan)',    chk:()=>Object.keys(S.gear||{}).length>=1, rw:{gold:200}},
  {id:'skill',  icon:'✨', txt:'Gumamit ng skill (1/2/3 o skill buttons)',      chk:c=>c.tutSkill, rw:{gold:150}},
  {id:'fish',   icon:'🎣', txt:'Mangisda malapit sa tubig',                     chk:c=>(c.fish||0)>=1, rw:{gold:250}},
  {id:'quest',  icon:'📜', txt:'Kausapin si Aling Rosa para sa unang misyon',   chk:()=>S.quests&&(S.quests.cur>0||S.quests.prog>0||S.quests.done), rw:{gold:300}},
];
function ensureTut(){ if(!S.tut) S.tut={done:{}, c:{}, hidden:false, finished:false}; S.tut.c=S.tut.c||{}; }
(function(){
  const _da=doAttack; doAttack=function(){ _da.apply(this,arguments); if(S.tut) S.tut.c.tutAtk=1; };
  const _us=useSkill; useSkill=function(i){ _us.apply(this,arguments); if(S.tut) S.tut.c.tutSkill=1; };
})();
/* tutorial tracker card (top-left, under minimap) */
(function tutCard(){
  const el=document.createElement('div');
  el.id='tut-card';
  el.style.cssText='position:fixed;top:170px;left:10px;z-index:39;background:rgba(20,14,34,.82);border:1px solid rgba(255,217,74,.45);border-radius:12px;padding:8px 12px;max-width:230px;font:600 11px system-ui;color:#efe8ff;display:none;backdrop-filter:blur(6px)';
  document.body.appendChild(el);
  setInterval(()=>{
    if(!started||!S.cls){ el.style.display='none'; return; }
    ensureTut();
    if(S.tut.finished||S.tut.hidden||S.level>=8){ el.style.display='none'; return; }
    /* merge live counters from achievements */
    if(S.ach&&S.ach.c){ S.tut.c.kill=S.ach.c.kill; S.tut.c.forage=S.ach.c.forage; S.tut.c.fish=S.ach.c.fish; }
    const next=TUTORIAL.find(t=>!S.tut.done[t.id]);
    if(!next){
      S.tut.finished=true;
      S.gold+=1000; SFX.levelup();
      toast('🎓 <b>TAPOS ANG GABAY NI LOLA!</b> Regalo: 🪙1,000 — handa ka na, apo!','levelup');
      updateHUD(); save();
      el.style.display='none';
      return;
    }
    let ok=false; try{ ok=next.chk(S.tut.c); }catch(e){}
    if(ok){
      S.tut.done[next.id]=1;
      S.gold+=next.rw.gold;
      SFX.loot();
      toast(`🎓 <b>Gabay ni Lola:</b> ${next.icon} ${next.txt} ✔ +🪙${next.rw.gold}`,'loot');
      updateHUD(); save();
      return;
    }
    const done=TUTORIAL.filter(t=>S.tut.done[t.id]).length;
    /* dock below the quest tracker so they never overlap */
    const qh=document.getElementById('quest-hud');
    let top=(window.innerWidth<=900?120:170), left=(window.innerWidth<=900?8:12);
    if(qh){
      const r=qh.getBoundingClientRect();
      if(r.height>0){ top=r.bottom+8; left=r.left; }
    }
    el.style.top=top+'px'; el.style.left=left+'px';
    el.style.display='block';
    el.innerHTML=`<div style="color:#ffd94a;margin-bottom:3px">🎓 Gabay ni Lola (${done}/${TUTORIAL.length})</div>
      <div>${next.icon} ${next.txt}</div>
      <div style="margin-top:4px;color:#8a80a2;font-size:10px">gantimpala: 🪙${next.rw.gold} · <u style="cursor:pointer;pointer-events:auto" onclick="S.tut.hidden=true">itago</u></div>`;
  },1200);
})();

/* ---------- [19] PASALUBONG v2 — richer offline report ---------- */
(function(){
  const _cp=checkPasalubong;
  checkPasalubong=function(){
    if(S.level<3) return;
    const elapsed=Date.now()-(S.lastSeen||Date.now());
    if(elapsed<OFFLINE_MIN_MS) return;
    const eff=Math.min(elapsed,OFFLINE_CAP_MS), minutes=eff/60000;
    const cycles=Math.max(1,Math.floor(minutes/2.5*S.forageSpeedMult));
    /* v2: forage + gold + xp + a fish + gear roll, all in one report */
    const gains={
      palay:dropScale(rand(15,25))*cycles,
      niyog:dropScale(rand(8,15))*Math.floor(cycles*0.7),
      dahon:dropScale(rand(10,18))*Math.floor(cycles*0.6),
      kawayan:dropScale(rand(7,12))*Math.floor(cycles*0.5),
    };
    if(minutes>30) gains.diwata_dew=Math.max(1,Math.floor(cycles/25));
    if(minutes>20&&Math.random()<0.6) gains[rollFish()]=1+Math.floor(minutes/240);
    for(const k of Object.keys(gains)) if(gains[k]<=0) delete gains[k];
    const gold=Math.round(minutes*(3+S.level*0.8));
    const xp=Math.round(minutes*8*Math.pow(1.06,S.level-1)*0.25);
    const gearRoll=minutes>60&&Math.random()<0.5?makeItem(Math.min(LEVEL_CAP,S.level),0.5):null;
    const hrs=Math.floor(eff/3600000),mins=Math.floor((eff%3600000)/60000);
    const timeStr=(hrs?hrs+'h ':'')+mins+'m', capped=elapsed>OFFLINE_CAP_MS;
    const chips=Object.entries(gains).map(([id,q])=>`<div class="reward-chip">${MATERIALS[id].icon} ${fmt(q)} ${MATERIALS[id].name}</div>`).join('')
      +`<div class="reward-chip">🪙 ${fmt(gold)} Ginto</div><div class="reward-chip">⭐ ${fmt(xp)} XP</div>`
      +(gearRoll?`<div class="reward-chip" style="color:${RARITIES.find(r=>r.id===gearRoll.rarity).color}">${gearRoll.icon} ${gearRoll.name}</div>`:'');
    const story=[
      `Habang wala ka, nag-ikot ang iyong ${CLASSES[S.cls].name} sa mga bukirin…`,
      minutes>60?'Nakipagkuwentuhan siya kay Aling Rosa at nakatikim pa ng libreng turon.':'',
      minutes>120?'May nadaanan siyang duwende — nag-tabi-tabi po siya nang maayos.':'',
      capped?'(Sumuko na siya makalipas ang 8 oras at natulog sa duyan.)':'',
    ].filter(Boolean).join('<br>');
    showModal(`
      <div class="modal-emoji">🎁</div><div class="modal-title">Pasalubong!</div>
      <div class="modal-body"><i style="color:#bfb6d2">${story}</i><br><br>
        Nawala ka nang <b>${timeStr}</b>${capped?' — max 8h':''}. Narito ang naipon:
        <div class="reward-line">${chips}</div></div>
      <button class="modal-btn" id="claim-pasalubong">Kunin ang Pasalubong 🙏</button>`);
    $('claim-pasalubong').onclick=()=>{
      for(const [id,q] of Object.entries(gains)) addInv(id,q);
      S.gold+=gold; gainXP(xp);
      if(gearRoll&&S.bag.length<60) S.bag.push(gearRoll);
      closeModal(); toast('🎁 Nakuha ang pasalubong!','loot');
      updateHUD(); save();
    };
  };
})();


/* ================================================================
   PHASE 5 MODULE — NAMED EQUIPMENT CATALOG
   Every catalog item carries LEVEL and (optionally) CLASS
   requirements. Schema (future-proof for the user's own list):
     {id, name, icon, slot, tier(=req level), classes:[...]|null,
      rarity, main, mult, affixes:[fixed ids], set:null|setId, lore}
   Catalog items drop from enemies (rarer than random loot, stronger),
   appear in shops, and CANNOT be equipped below the level or by the
   wrong class.
   ================================================================ */

/* ---------- requirement engine (works for ALL items) ---------- */
window._canEquip=(it)=>{
  if(it.req&&S.level<it.req) return `🔒 Kailangan: Level ${it.req} para isuot ang ${it.name}.`;
  if(it.classes&&it.classes.length&&!it.classes.includes(S.cls)){
    const names=it.classes.map(c=>CLASSES[c]?CLASSES[c].name:c).join('/');
    return `🔒 Para lamang sa ${names} ang ${it.name}.`;
  }
  return null;
};
window._reqLine=(it)=>{
  if(!it.req&&!(it.classes&&it.classes.length)) return '';
  const lvlOk=!it.req||S.level>=it.req;
  const clsOk=!it.classes||!it.classes.length||it.classes.includes(S.cls);
  const parts=[];
  if(it.req) parts.push(`<span style="color:${lvlOk?'#8aff9a':'#ff8a8a'}">Lv ${it.req}+</span>`);
  if(it.classes&&it.classes.length) parts.push(`<span style="color:${clsOk?'#8aff9a':'#ff8a8a'}">${it.classes.map(c=>CLASSES[c]?CLASSES[c].name:c).join(' / ')}</span>`);
  return `<div style="font-size:10px;margin:1px 0 2px;color:#8a80a2">Kailangan: ${parts.join(' · ')}</div>`;
};

/* ---------- class groups ---------- */
const CG={
  melee:['arnisador','mandirigma','anino','panday','babaylan'],
  ranged:['tirador','mamamana'],
  caster:['alim','babaylan'],
  tank:['mandirigma','panday'],
  agile:['anino','arnisador','tirador'],
};

/* ---------- THE CATALOG ---------- */
/* Weapons are class-locked; armor mostly by tier; accessories open. */
let CATALOG=[
 /* ============ WEAPONS (mainhand) — class-locked lines ============ */
 /* Babaylan line */
 {id:'w_bolo1',   name:'Bolo ng Baryo',        icon:'🔪', slot:'mainhand', tier:1,  classes:['babaylan'], rarity:'common',   main:'atk', mult:1.1, lore:'Itak ng magsasaka — unang sandata ng bawat babaylan.'},
 {id:'w_bolo2',   name:'Bolo ng Halimaw',      icon:'🗡️', slot:'mainhand', tier:15, classes:['babaylan'], rarity:'rare',     main:'atk', mult:1.3, affixes:['lifesteal'], lore:'Binasbasan ng dugo ng aswang na tinalo nito.'},
 {id:'w_bolo3',   name:'Sundang ni Apo Laki',  icon:'⚔️', slot:'mainhand', tier:40, classes:['babaylan'], rarity:'epic',     main:'atk', mult:1.5, affixes:['lifesteal','atkPct'], lore:'Regalo raw ng diyos ng digmaan sa unang babaylan ng kapuluan.'},
 /* Arnisador line */
 {id:'w_arnis1',  name:'Yantok na Baston',     icon:'🥢', slot:'mainhand', tier:1,  classes:['arnisador'], rarity:'common',  main:'atk', mult:1.1, lore:'Rattan na hinugot sa kasukalan — magaan at mabilis.'},
 {id:'w_arnis2',  name:'Kamagong Duo',         icon:'🪵', slot:'mainhand', tier:15, classes:['arnisador'], rarity:'rare',    main:'atk', mult:1.3, affixes:['critCh'], lore:'Kahoy na bakal ng gubat — mas mabigat, mas masakit.'},
 {id:'w_arnis3',  name:'Baston ng Bagyo',      icon:'🌀', slot:'mainhand', tier:40, classes:['arnisador'], rarity:'epic',    main:'atk', mult:1.5, affixes:['critCh','moveSpd'], lore:'Sa bawat hampas, dinig mo ang hangin ng unos.'},
 /* Tirador line */
 {id:'w_sling1',  name:'Tiradorang Guwapo',    icon:'🪃', slot:'mainhand', tier:1,  classes:['tirador'], rarity:'common',    main:'atk', mult:1.1, lore:'Gawa sa sanga ng bayabas at goma ng tsinelas.'},
 {id:'w_sling2',  name:'Pana-Bato ng Kabundukan',icon:'🎯',slot:'mainhand', tier:15, classes:['tirador'], rarity:'rare',     main:'atk', mult:1.3, affixes:['critDmg'], lore:'Ang batong inilipad nito ay bumutas na ng bakal.'},
 {id:'w_sling3',  name:'Mata ng Agila',        icon:'🦅', slot:'mainhand', tier:40, classes:['tirador'], rarity:'epic',      main:'atk', mult:1.5, affixes:['critDmg','critCh'], lore:'Hindi ito pumapalya. Ang pumapalya ay ang may hawak.'},
 /* Alim line */
 {id:'w_staff1',  name:'Tungkod ng Albularyo', icon:'🪄', slot:'mainhand', tier:1,  classes:['alim'], rarity:'common',       main:'atk', mult:1.1, lore:'May nakataling bawang at asin sa dulo. Epektibo. Mabaho.'},
 {id:'w_staff2',  name:'Setro ng Sigilo',      icon:'🔮', slot:'mainhand', tier:15, classes:['alim'], rarity:'rare',         main:'atk', mult:1.3, affixes:['cdr'], lore:'May nakaukit na apat na elemento sa katawan nito.'},
 {id:'w_staff3',  name:'Tungkod ni Bathala',   icon:'⚡', slot:'mainhand', tier:40, classes:['alim'], rarity:'epic',         main:'atk', mult:1.5, affixes:['cdr','atkPct'], lore:'Sinasabing piraso ito ng kidlat na unang humati sa kawayan.'},
 /* Mandirigma line */
 {id:'w_kamp1',   name:'Kampilan ng Baryo',    icon:'🗡️', slot:'mainhand', tier:1,  classes:['mandirigma'], rarity:'common', main:'atk', mult:1.1, lore:'Mabigat, mapurol nang bahagya, pero tapat.'},
 {id:'w_kamp2',   name:'Kampilan ni Lapu',     icon:'⚔️', slot:'mainhand', tier:15, classes:['mandirigma'], rarity:'rare',   main:'atk', mult:1.3, affixes:['hpFlat'], lore:'Hinulma sa alaala ng dakilang datu ng Mactan.'},
 {id:'w_kamp3',   name:'Pangil ng Bakunawa',   icon:'🐉', slot:'mainhand', tier:40, classes:['mandirigma'], rarity:'epic',   main:'atk', mult:1.5, affixes:['hpFlat','defFlat'], lore:'Ngipin ng serpyente ng buwan, hinasa ng pitong panday.'},
 /* Mamamana line */
 {id:'w_bow1',    name:'Busog na Kawayan',     icon:'🏹', slot:'mainhand', tier:1,  classes:['mamamana'], rarity:'common',   main:'atk', mult:1.1, lore:'Unang busog ng bawat mangangaso ng kabundukan.'},
 {id:'w_bow2',    name:'Busog ng Amihan',      icon:'🌬️', slot:'mainhand', tier:15, classes:['mamamana'], rarity:'rare',     main:'atk', mult:1.3, affixes:['moveSpd'], lore:'Ang palaso nito ay sakay ng hanging hilaga.'},
 {id:'w_bow3',    name:'Ulan ng mga Tala',     icon:'🌠', slot:'mainhand', tier:40, classes:['mamamana'], rarity:'epic',     main:'atk', mult:1.5, affixes:['moveSpd','critDmg'], lore:'Bawat tudla, isang bituing bumabagsak sa kalaban.'},
 /* Anino line */
 {id:'w_dag1',    name:'Balisong ng Batangan', icon:'🔪', slot:'mainhand', tier:1,  classes:['anino'], rarity:'common',      main:'atk', mult:1.1, lore:'Dalawang-katlong bilis, isang-katlong hinhin.'},
 {id:'w_dag2',    name:'Kambal na Anino',      icon:'🗡️', slot:'mainhand', tier:15, classes:['anino'], rarity:'rare',        main:'atk', mult:1.3, affixes:['critCh'], lore:'Dalawang patalim na hinulma mula sa iisang gabi.'},
 {id:'w_dag3',    name:'Pangil ng Gabi',       icon:'🌑', slot:'mainhand', tier:40, classes:['anino'], rarity:'epic',        main:'atk', mult:1.5, affixes:['critCh','lifesteal'], lore:'Hindi ito kumikislap sa liwanag. Walang liwanag na nakaabot dito.'},
 /* Panday line */
 {id:'w_ham1',    name:'Maso ng Pandayan',     icon:'🔨', slot:'mainhand', tier:1,  classes:['panday'], rarity:'common',     main:'atk', mult:1.1, lore:'Sampung libong palo na ang narinig ng maso na ito.'},
 {id:'w_ham2',    name:'Bayo ng Bulkan',       icon:'🌋', slot:'mainhand', tier:15, classes:['panday'], rarity:'rare',       main:'atk', mult:1.3, affixes:['defFlat'], lore:'Pinalamig sa lawa ng apoy ng Bulkan Apolaki.'},
 {id:'w_ham3',    name:'Puso ng Bundok',       icon:'⛰️', slot:'mainhand', tier:40, classes:['panday'], rarity:'epic',       main:'atk', mult:1.5, affixes:['defFlat','hpFlat'], lore:'Sa loob nito, tumitibok pa rin ang bundok na pinagmulan.'},

 /* ============ OFFHANDS ============ */
 {id:'o_kalasag1',name:'Kalasag na Yantok',    icon:'🛡️', slot:'offhand', tier:5,  classes:CG.tank, rarity:'uncommon',      main:'def', mult:1.2, lore:'Habing rattan na kayang sumalo ng itak.'},
 {id:'o_kalasag2',name:'Kalasag ni Bagani',    icon:'🐢', slot:'offhand', tier:30, classes:CG.tank, rarity:'epic',           main:'def', mult:1.45, affixes:['hpFlat'], lore:'Pinalamutian ng mga baybayin ng tagumpay.'},
 {id:'o_agimat1', name:'Agimat na Tanso',      icon:'🧿', slot:'offhand', tier:5,  classes:CG.caster, rarity:'uncommon',     main:'atk', mult:1.2, lore:'Anting-anting na binendisyunan tuwing Biyernes Santo.'},
 {id:'o_agimat2', name:'Mutya ng Buwan',       icon:'🌙', slot:'offhand', tier:30, classes:CG.caster, rarity:'epic',         main:'atk', mult:1.45, affixes:['cdr'], lore:'Nahulog mula sa buwan noong ika-pitong paglamon ng Bakunawa.'},
 {id:'o_pouch1',  name:'Supot ng mga Bato',    icon:'👝', slot:'offhand', tier:5,  classes:CG.ranged, rarity:'uncommon',     main:'atk', mult:1.2, lore:'Piniling bato mula sa ilog — bilog, makinis, mabilis.'},
 {id:'o_pouch2',  name:'Lalagyan ng Hiyas',    icon:'💼', slot:'offhand', tier:30, classes:CG.ranged, rarity:'epic',         main:'atk', mult:1.45, affixes:['critCh'], lore:'Bawat bala, may kasamang maliit na dasal.'},

 /* ============ ARMOR (open to all, tiered) ============ */
 {id:'h_salakot1',name:'Salakot ng Magsasaka', icon:'👒', slot:'head', tier:1,  classes:null, rarity:'common',   main:'def', mult:1.1, lore:'Laban sa araw, ulan, at mahihinang palo sa ulo.'},
 {id:'h_salakot2',name:'Salakot na Tanso',     icon:'⛑️', slot:'head', tier:20, classes:null, rarity:'rare',     main:'def', mult:1.3, affixes:['hpFlat'], lore:'Salakot ng maharlika — may pilak na palamuti.'},
 {id:'h_putong',  name:'Putong ng Datu',       icon:'👑', slot:'head', tier:50, classes:null, rarity:'epic',     main:'def', mult:1.5, affixes:['hpFlat','atkPct'], lore:'Pulang putong na sagisag ng namumunong dugo.'},
 {id:'c_baro1',   name:'Barong Habi',          icon:'👕', slot:'chest', tier:1,  classes:null, rarity:'common',  main:'hp',  mult:1.1, lore:'Hinabi ng ina, tinahi ng pag-ibig.'},
 {id:'c_baro2',   name:'Kupya ng Mandirigma',  icon:'🦺', slot:'chest', tier:20, classes:null, rarity:'rare',    main:'hp',  mult:1.3, affixes:['defFlat'], lore:'Makapal na habi na may mga gintong hibla.'},
 {id:'c_baro3',   name:'Baluti ng Kapuluan',   icon:'🛡️', slot:'chest', tier:50, classes:null, rarity:'epic',    main:'hp',  mult:1.5, affixes:['defFlat','hpFlat'], lore:'Baluting kinabit-kabit mula sa kabibe at tanso.'},
 {id:'l_sand1',   name:'Tsinelas ng Baryo',    icon:'🩴', slot:'legs', tier:1,  classes:null, rarity:'common',   main:'spd', mult:1.1, lore:'Islander classic. Panlaban din sa ipis.'},
 {id:'l_sand2',   name:'Sapin ng Kabundukan',  icon:'🥾', slot:'legs', tier:20, classes:null, rarity:'rare',     main:'spd', mult:1.3, affixes:['moveSpd'], lore:'Yapak na sanay sa hagdan-hagdang palayan.'},
 {id:'l_sand3',   name:'Yapak ng Tikbalang',   icon:'🐴', slot:'legs', tier:50, classes:null, rarity:'epic',     main:'spd', mult:1.5, affixes:['moveSpd','critCh'], lore:'Baligtad ang talampakan — palaging isang hakbang ang lamang.'},
 {id:'k_kapa1',   name:'Kapa ng Manlalakbay',  icon:'🧣', slot:'cloak', tier:10, classes:null, rarity:'uncommon',main:'hp',  mult:1.2, lore:'Kapa na natulog na sa isandaang baybayin.'},
 {id:'k_kapa2',   name:'Balahibo ng Sarimanok',icon:'🐓', slot:'cloak', tier:35, classes:null, rarity:'epic',    main:'hp',  mult:1.45, affixes:['moveSpd'], set:'hangin', lore:'Kumikinang sa pitong kulay tuwing takipsilim.'},
 {id:'k_kapa3',   name:'Pakpak ng Minokawa',   icon:'🦅', slot:'cloak', tier:60, classes:null, rarity:'legendary',main:'hp', mult:1.6, affixes:['moveSpd','hpFlat'], lore:'Isang balahibo lang ito ng dambuhalang ibon. ISANG balahibo.'},

 /* ============ ACCESSORIES ============ */
 {id:'a_anito1',  name:'Anting ng Nuno',       icon:'📿', slot:'amulet1', tier:8,  classes:null, rarity:'uncommon', main:'atk', mult:1.2, lore:'Munting punso na nakapaloob sa garing.'},
 {id:'a_anito2',  name:'Agimat ng Anito',      icon:'🧿', slot:'amulet1', tier:35, classes:null, rarity:'epic',     main:'atk', mult:1.45, affixes:['atkPct'], set:'apoy', lore:'Dinig mo ang bulong ng mga ninuno kapag suot ito.'},
 {id:'a_bakunawa',name:'Kaliskis ng Bakunawa', icon:'🐉', slot:'amulet1', tier:60, classes:null, rarity:'legendary',main:'atk', mult:1.6, affixes:['atkPct','lifesteal'], set:'tubig', lore:'Isang kaliskis mula sa serpyente ng buwan. Malamig. Buhay pa.'},
 {id:'r_mutya1',  name:'Singsing na Perlas',   icon:'💍', slot:'ring1', tier:8,  classes:null, rarity:'uncommon',  main:'crit', mult:1.2, lore:'Perlas mula sa Dalampasigan, hinugis-singsing.'},
 {id:'r_mutya2',  name:'Mutya ng Saging',      icon:'💎', slot:'ring1', tier:35, classes:null, rarity:'epic',      main:'crit', mult:1.45, affixes:['critDmg'], set:'lupa', lore:'Nahuli sa hatinggabi mula sa puso ng puno ng saging.'},
 {id:'r_sarangay',name:'Hiyas ni Sarangay',    icon:'🔴', slot:'ring1', tier:60, classes:null, rarity:'legendary', main:'crit', mult:1.6, affixes:['critDmg','critCh'], set:'apoy', lore:'"Hindi ko kinuha. Ibinigay niya." — sinungaling na may suot nito.'},
];
if (GAME_DATA.items && GAME_DATA.items.items) CATALOG = GAME_DATA.items.items;

/* ---------- catalog item builder ---------- */
function makeCatalogItem(def){
  const rar=RARITIES.find(r=>r.id===def.rarity);
  const ilvl=Math.min(LEVEL_CAP,Math.max(def.tier,S.level));       // scales with finder, floor at tier
  const affixes=[];
  for(const aid of (def.affixes||[])){
    const a=AFFIX_POOL.find(x=>x.id===aid); if(!a) continue;
    const v=Math.round((a.base+a.per*ilvl)*rar.mult*1.1);
    affixes.push({id:a.id, v, txt:a.fmt(v)});
  }
  /* +1 bonus random affix on epic/legendary catalog pieces */
  if(['epic','legendary'].includes(def.rarity)){
    const pool=AFFIX_POOL.filter(a=>!(def.affixes||[]).includes(a.id));
    const a=pool[rand(0,pool.length-1)];
    const v=Math.round((a.base+a.per*ilvl)*rar.mult*rnd(0.9,1.2));
    affixes.push({id:a.id, v, txt:a.fmt(v)});
  }
  const mainV=Math.round((3+ilvl*1.5)*rar.mult*(def.mult||1.2));   // stronger than generic at same ilvl
  return {
    uid:itemUid++, slot:def.slot, altSlots:def.slot==='amulet1'?['amulet1','amulet2']:def.slot==='ring1'?['ring1','ring2']:null,
    icon:def.icon, name:def.name, rarity:def.rarity, ilvl, main:def.main, mainV, affixes,
    sockets:new Array(SOCKETS_BY_RARITY[def.rarity]||0).fill(null),
    legendary:def.rarity==='legendary'?LEGENDARY_EFFECTS[rand(0,LEGENDARY_EFFECTS.length-1)]:null,
    set:def.set||null,
    req:def.tier, classes:def.classes||null, catalog:def.id, lore:def.lore||'',
  };
}
/* pick a sensible catalog drop for the current player */
function rollCatalogDrop(tierBonus){
  const usable=CATALOG.filter(d=>
    d.tier<=S.level+4 &&
    (!d.classes||d.classes.includes(S.cls)) );
  const reach=CATALOG.filter(d=>d.tier>S.level+4&&d.tier<=S.level+12&&(!d.classes||d.classes.includes(S.cls)));
  const pool=Math.random()<0.15&&reach.length?reach:usable;
  if(!pool.length) return null;
  const wmap={common:8,uncommon:5,rare:3,epic:1.2,legendary:0.35};
  const ws=pool.map(d=>(wmap[d.rarity]||1)*(1+tierBonus));
  let r=Math.random()*ws.reduce((a,b)=>a+b,0);
  for(let i=0;i<pool.length;i++){ if((r-=ws[i])<=0) return pool[i]; }
  return pool[0];
}
/* ---------- drops: enemies sometimes drop CATALOG gear ---------- */
(function(){
  const _kr3=killReward;
  killReward=function(en){
    _kr3(en);
    const def=ENEMY_DEFS[en.key];
    if(!def) return;
    const ch=def.boss?0.45 : def.tier==='Elite'?0.08 : 0.025;
    if(Math.random()<ch){
      const cd=rollCatalogDrop(def.boss?1.5:def.tier==='Elite'?0.6:0);
      if(cd){
        const it=makeCatalogItem(cd);
        spawnGearDrop(en.x+rnd(-1,1),en.z+rnd(-1,1),it);
        toast(`${it.icon} <b>KATALOGO:</b> bumagsak ang <b>${it.name}</b>!`,'loot');
      }
    }
  };
})();
/* ---------- shops: Ka Bining & Panday Iko stock catalog pieces ---------- */
const _getStock_p5=getStock;
getStock=function(id,gen){
  return _getStock_p5(id,()=>{
    const items=gen();
    if(id==='equipment'||id==='blacksmith'){
      const cd=rollCatalogDrop(0.4);
      if(cd) items.push(makeCatalogItem(cd));
    }
    if(id==='blackmarket'){
      const highs=CATALOG.filter(d=>d.rarity==='epic'||d.rarity==='legendary');
      if(highs.length&&Math.random()<0.6) items.push(makeCatalogItem(highs[rand(0,highs.length-1)]));
    }
    return items;
  });
};
/* ---------- lore line on catalog item cards ---------- */
(function(){
  const _rl=window._reqLine;
  window._reqLine=(it)=>{
    let h=_rl(it);
    if(it.catalog&&it.lore) h+=`<div style="font-size:9px;font-style:italic;color:#6a6284;margin:1px 0 2px">“${it.lore}”</div>`;
    return h;
  };
})();
/* ---------- dungeon + world boss first-clears prefer catalog loot ---------- */
(function(){
  const _fd=finishDungeon;
  finishDungeon=function(win){
    if(win&&DGN.active&&Math.random()<0.5){
      const cd=rollCatalogDrop(1.0);
      if(cd&&S.bag.length<60){
        const it=makeCatalogItem(cd);
        S.bag.push(it);
        setTimeout(()=>toast(`${it.icon} Dagdag na gantimpala ng lagusan: <b>${it.name}</b>!`,'loot'),1200);
      }
    }
    _fd(win);
  };
})();
/* ---------- CODEX: catalog browser (in the bestiary spirit) ---------- */
function openCodex(){
  const bySlot={};
  for(const d of CATALOG){ (bySlot[d.slot]=bySlot[d.slot]||[]).push(d); }
  const slotName=sl=>SLOT_DEFS[sl]?SLOT_DEFS[sl].name:sl;
  let html='';
  for(const [sl,list] of Object.entries(bySlot)){
    html+=`<div class="set-sec">${SLOT_DEFS[sl]?SLOT_DEFS[sl].icon:''} ${slotName(sl)}</div>`;
    html+=list.sort((a,b)=>a.tier-b.tier).map(d=>{
      const rar=RARITIES.find(r=>r.id===d.rarity);
      const lvlOk=S.level>=d.tier, clsOk=!d.classes||d.classes.includes(S.cls);
      const owned=[...Object.values(S.gear),...S.bag].some(it=>it&&it.catalog===d.id);
      return `<div class="fr-row" style="${lvlOk&&clsOk?'':'opacity:.5'}">
        <span style="font-size:18px">${d.icon}</span>
        <div class="fr-info"><b style="color:${rar.color}">${d.name} ${owned?'✔':''}</b>
          <i>Lv ${d.tier}+${d.classes?' · '+d.classes.map(c=>CLASSES[c]?CLASSES[c].name:c).join('/'):''} · ${rar.name}<br>
          <span style="font-style:italic;color:#6a6284">“${d.lore}”</span></i></div>
      </div>`;
    }).join('');
  }
  showModal(`<div class="modal-emoji">📖</div><div class="modal-title">Kodise ng Kagamitan (${CATALOG.length})</div>
    <p style="font-size:11px;color:#8a80a2;text-align:center;margin:0 0 8px">Mga tanyag na kagamitan ng kapuluan. Nahuhulog mula sa mga halimaw (lalo na sa Elite/Boss), naibebenta sa mga tindahan, at gantimpala ng mga lagusan.</p>
    <div style="max-height:56vh;overflow-y:auto">${html}</div>
    <button class="modal-btn" onclick="closeModal()">Isara</button>`);
}
window.openCodex=openCodex;
(function codexBtn(){
  const b=document.createElement('button');
  b.className='menu-btn'; b.id='btn-codex'; b.title='Kodise ng Kagamitan'; b.textContent='📖';
  document.querySelector('.hud-right').appendChild(b);
  b.onclick=openCodex;
})();
ACH_DEFS.push(
  {id:'cat1', icon:'📖', name:'Unang Pahina',        desc:'Magkaroon ng catalog item',        chk:()=>[...Object.values(S.gear),...S.bag].some(it=>it&&it.catalog), rw:{gold:800}},
  {id:'cat10',icon:'📚', name:'Kolektor ng Alamat',  desc:'Makakolekta ng 10 catalog item',   chk:()=>{const seen=new Set(); for(const it of [...Object.values(S.gear),...S.bag]) if(it&&it.catalog) seen.add(it.catalog); return seen.size>=10;}, rw:{gold:8000}, title:'Kolektor ng Alamat'},
  {id:'catleg',icon:'🌟',name:'Hawak ang Alamat',    desc:'Magkaroon ng legendary catalog item', chk:()=>[...Object.values(S.gear),...S.bag].some(it=>it&&it.catalog&&it.rarity==='legendary'), rw:{gold:15000}, title:'Hawak ang Alamat'},
);


/* ================================================================
   PHASE 6 MODULE — INVENTORY OVERHAUL
   Full-screen RPG inventory modeled on the reference screenshot:
   LEFT  = paper-doll hero silhouette with 10 equip slots around it
   CENTER= Stats & Item Detail card w/ green gain arrows + EQUIP
   RIGHT = tabbed grid bag (All/Weapons/Armor/Consumables/Materials/Quest)
           + Auto-Equip + Bag Settings
   BOTTOM= nav: Profile · Inventory · Skills · Map
   BONUS (assistant's pick): 🗺️ full-screen MAP tab with live markers.
   ================================================================ */
(function(){
const css=document.createElement('style');
css.textContent=`
#inv2{position:fixed;inset:0;z-index:120;display:none;background:linear-gradient(160deg,#141021 0%,#1c1430 45%,#241636 100%)}
#inv2.open{display:flex;flex-direction:column}
#inv2 *{box-sizing:border-box}
.inv2-top{flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:8px 14px;background:rgba(10,8,18,.55)}
.inv2-top .i2-port{width:44px;height:44px;border-radius:50%;border:2px solid #f2b134;object-fit:cover;background:#241a38}
.inv2-top .i2-lvl{background:linear-gradient(180deg,#6a5a9a,#3a2f5a);border:1px solid #8a7ac0;border-radius:8px;padding:2px 8px;font:800 11px system-ui;color:#ffd94a}
.inv2-top .i2-name{font:800 16px system-ui;color:#efe8ff}
.inv2-top .i2-xp{flex:0 1 220px;height:7px;background:rgba(255,255,255,.1);border-radius:4px;overflow:hidden}
.inv2-top .i2-xp i{display:block;height:100%;background:linear-gradient(90deg,#c98d1e,#ffd97a)}
.inv2-top .i2-cur{margin-left:auto;display:flex;gap:10px;font:800 13px system-ui;color:#ffd94a}
.inv2-top .i2-x{width:34px;height:34px;border-radius:9px;border:1px solid #5a4a7a;background:rgba(40,30,60,.8);color:#efe8ff;font-size:17px;cursor:pointer}
.inv2-main{flex:1;display:flex;gap:10px;padding:10px 14px;min-height:0}
/* Doll column widened (owner: model area too small/cramped). flex-grow 1.5 and a
   floor so the 3D hero gets real room on desktop; mobile media query below
   stacks it and sets its own height. */
.i2-doll{flex:0.9 1 220px;max-width:300px;position:relative;border-radius:16px;background:radial-gradient(ellipse at 50% 42%,rgba(255,235,190,.13),rgba(0,0,0,0) 62%);min-width:200px}
.i2-doll svg{position:absolute;left:50%;top:50%;transform:translate(-50%,-52%);height:86%;opacity:.9;filter:drop-shadow(0 0 26px rgba(255,224,160,.35))}
.i2-slot{position:absolute;width:64px;text-align:center;cursor:pointer}
.i2-slot .sq{width:56px;height:56px;margin:0 auto;border-radius:12px;border:2px solid #4a3f66;background:linear-gradient(180deg,rgba(60,48,88,.9),rgba(30,24,48,.9));display:flex;align-items:center;justify-content:center;font-size:26px;position:relative;transition:border-color .15s, box-shadow .15s}
.i2-slot.filled .sq{border-color:#8a7ac0;box-shadow:0 0 14px rgba(138,122,192,.45)}
.i2-slot.sel .sq{border-color:#7df0ff;box-shadow:0 0 18px rgba(125,240,255,.65)}
.i2-slot .lb{font:700 10px system-ui;color:#bfb6d2;margin-top:3px;text-shadow:0 1px 3px #000}
.i2-slot .plus{position:absolute;right:2px;top:2px;font:800 9px system-ui;color:#7df0ff}
.i2-slot .rline{position:absolute;height:2px;background:linear-gradient(90deg,rgba(125,240,255,.0),rgba(125,240,255,.5));pointer-events:none}
.i2-mid{flex:1;display:flex;flex-direction:column;gap:8px;min-width:0;max-width:340px}
.i2-card{background:linear-gradient(180deg,rgba(46,36,70,.92),rgba(28,22,44,.95));border:1px solid #5a4a7a;border-radius:14px;padding:10px 12px;overflow-y:auto;scrollbar-width:thin}
.i2-card h4{font:800 13px system-ui;color:#ffd94a;text-align:center;margin:0 0 8px;letter-spacing:.4px}
.i2-stat{display:flex;align-items:center;gap:8px;font:700 12px system-ui;color:#d8d0ea;padding:3px 0}
.i2-stat .bar{flex:1;height:6px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden}
.i2-stat .bar i{display:block;height:100%;background:linear-gradient(90deg,#c98d1e,#ffd97a)}
.i2-stat b{min-width:52px;text-align:right;color:#fff}
.i2-detail{flex:1;min-height:120px}
.i2-dname{font:800 14px system-ui}
.i2-dsub{font:600 10px system-ui;color:#8a80a2;margin:2px 0 6px}
.i2-gain{font:700 11px system-ui;padding:1px 0}
.i2-gain.up{color:#7dff9a}.i2-gain.dn{color:#ff8a8a}.i2-gain.eq{color:#8a80a2}
.i2-btnrow{display:flex;gap:8px;margin-top:8px}
.i2-btn{flex:1;padding:10px 6px;border-radius:10px;border:1px solid #8a6a2a;background:linear-gradient(180deg,#f2b134,#c07818);color:#241a08;font:800 12px system-ui;cursor:pointer}
.i2-btn.gray{background:linear-gradient(180deg,#5a5470,#3a3550);border-color:#6a6284;color:#d8d0ea}
.i2-btn.red{background:linear-gradient(180deg,#c05a4a,#8a3226);border-color:#a05a4a;color:#fff}
.i2-btn:disabled{opacity:.4;cursor:default}
.i2-bag{flex:1.9;display:flex;flex-direction:column;background:linear-gradient(180deg,rgba(40,32,60,.9),rgba(24,18,38,.94));border:1px solid #5a4a7a;border-radius:14px;padding:8px;min-width:0}
.i2-tabs{display:flex;gap:4px;margin-bottom:8px;flex:0 0 auto}
.i2-tab{flex:1;padding:7px 2px;border-radius:9px;border:1px solid #4a3f66;background:rgba(30,24,48,.8);color:#bfb6d2;font:700 10px system-ui;cursor:pointer;text-align:center}
.i2-tab.on{background:linear-gradient(180deg,#6a5a9a,#4a3a70);color:#ffe9b0;border-color:#8a7ac0}
.i2-grid{flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(58px,1fr));gap:6px;align-content:start;scrollbar-width:thin}
.i2-cell{position:relative;aspect-ratio:1;border-radius:10px;border:2px solid #4a3f66;background:linear-gradient(180deg,rgba(56,45,82,.85),rgba(30,24,48,.9));display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;transition:transform .1s}
.i2-cell:hover{transform:scale(1.06)}
.i2-cell.sel{border-color:#7df0ff;box-shadow:0 0 14px rgba(125,240,255,.5)}
.i2-cell .q{position:absolute;right:3px;bottom:2px;font:800 9px system-ui;color:#fff;text-shadow:0 1px 3px #000}
.i2-cell .pl{position:absolute;left:3px;top:2px;font:800 9px system-ui;color:#7df0ff}
.i2-cell.rc-uncommon{border-color:#3f7a4f}.i2-cell.rc-rare{border-color:#3f5a8a}.i2-cell.rc-epic{border-color:#6a4a9a}.i2-cell.rc-legendary{border-color:#9a7a2a;box-shadow:0 0 10px rgba(255,184,74,.35)}
.i2-bagbtns{display:flex;gap:8px;margin-top:8px;flex:0 0 auto}
.inv2-nav{flex:0 0 auto;display:flex;justify-content:center;gap:6px;padding:8px;background:rgba(10,8,18,.6)}
.i2-nav{min-width:110px;padding:9px 12px;border-radius:11px 11px 0 0;border:1px solid #4a3f66;border-bottom:none;background:rgba(34,26,52,.85);color:#bfb6d2;font:800 12px system-ui;cursor:pointer}
.i2-nav.on{background:linear-gradient(180deg,#6a5a9a,#43356a);color:#ffe9b0}
#i2-mapwrap{flex:1;display:none;padding:10px 14px;min-height:0}
#i2-mapwrap.open{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:0}
#i2-maphead{display:flex;align-items:baseline;gap:10px;flex:0 0 auto}
#i2-maphead b{font:800 16px system-ui;color:#ffd94a}
#i2-maphead span{font:600 11.5px system-ui;color:#bfb6d2}
#i2-map{flex:0 1 auto;max-width:100%;max-height:100%;border-radius:14px;border:2px solid #5a4a7a;box-shadow:0 10px 50px rgba(0,0,0,.5)}
#i2-maplegend{display:flex;align-items:center;gap:14px;flex:0 0 auto;font:700 11px system-ui;color:#cfc6e2}
#i2-maplegend .dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:4px;vertical-align:middle}
#i2-maplegend .dot.you{background:#fff;box-shadow:0 0 0 2px #f2b134}
#i2-maplegend .dot.party{background:#7dffb0}
#i2-maplegend .dot.boss{background:#ff6a6a}
#i2-maplegend .hint{margin-left:auto;color:#8a80a2;font-weight:600}
#i2-profwrap{flex:1;display:none;padding:10px 14px;overflow-y:auto}
#i2-profwrap.open{display:block}
@media (max-width:820px){
  .inv2-main{flex-direction:column;overflow-y:auto}
  .i2-doll{min-height:300px;flex:0 0 300px;min-width:0}
  .i2-mid{max-width:none}
}`;
document.head.appendChild(css);

/* ---------- consumables & quest-item classification ---------- */
const CONSUMABLE_IDS=new Set(Object.keys(FISH_DEFS||{}));
const QUEST_IDS=new Set(['mutya','nuno_stone']);
function matTab(id){
  if(CONSUMABLE_IDS.has(id)) return 'consum';
  if(QUEST_IDS.has(id)) return 'quest';
  return 'mats';
}
function isWeapon(it){ return it.slot==='mainhand'||it.slot==='offhand'; }

/* ---------- DOM scaffold ---------- */
const root=document.createElement('div');
root.id='inv2';
root.innerHTML=`
  <div class="inv2-top">
    <img class="i2-port" id="i2-port" src="img/p_babaylan.png">
    <span class="i2-lvl" id="i2-lvl">Lv 1</span>
    <span class="i2-name" id="i2-name">Bayani</span>
    <div class="i2-xp"><i id="i2-xpfill" style="width:0%"></i></div>
    <div class="i2-cur"><span id="i2-gold">🪙 0</span><span id="i2-mutya">💎 0</span></div>
    <button class="i2-x" id="i2-close">✕</button>
  </div>
  <div class="inv2-main" id="i2-invmain">
    <div class="i2-doll" id="i2-doll">
      <svg viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="i2g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffeccf" stop-opacity=".95"/>
          <stop offset="1" stop-color="#e8c9a0" stop-opacity=".55"/></linearGradient></defs>
        <g fill="url(#i2g)">
          <circle cx="50" cy="22" r="13"/>
          <path d="M50 36 C36 38 32 50 32 62 L30 105 C30 112 34 118 38 120 L36 178 C36 184 40 190 45 190 L48 190 L48 130 L52 130 L52 190 L55 190 C60 190 64 184 64 178 L62 120 C66 118 70 112 70 105 L68 62 C68 50 64 38 50 36 Z"/>
          <path d="M32 62 L18 92 C16 97 19 102 23 102 L30 100 Z"/>
          <path d="M68 62 L82 92 C84 97 81 102 77 102 L70 100 Z"/>
        </g>
      </svg>
    </div>
    <div class="i2-mid">
      <div class="i2-card" style="flex:0 0 auto">
        <h4>STATS & ITEM DETAIL</h4>
        <div id="i2-stats"></div>
      </div>
      <div class="i2-card i2-detail" id="i2-detail"></div>
    </div>
    <div class="i2-bag">
      <div class="i2-tabs" id="i2-tabs">
        <div class="i2-tab on" data-tab="all">🎛️<br>All</div>
        <div class="i2-tab" data-tab="weap">⚔️<br>Weapons</div>
        <div class="i2-tab" data-tab="armor">👕<br>Armor</div>
        <div class="i2-tab" data-tab="consum">🧪<br>Consum.</div>
        <div class="i2-tab" data-tab="mats">📦<br>Materials</div>
        <div class="i2-tab" data-tab="quest">❗<br>Quest</div>
      </div>
      <div class="i2-grid" id="i2-grid"></div>
      <div class="i2-bagbtns">
        <button class="i2-btn" id="i2-autoequip">⚡ Auto Equip</button>
        <button class="i2-btn gray" id="i2-bagset">⚙️ Bag Settings</button>
      </div>
    </div>
  </div>
  <div id="i2-mapwrap">
    <div id="i2-maphead"><b>🗺️ Barangay Liwanag</b><span>Banaue Highlands · Simula (Lv 1–10)</span></div>
    <canvas id="i2-map" width="1280" height="854"></canvas>
    <div id="i2-maplegend">
      <span><i class="dot you"></i>Ikaw</span>
      <span><i class="dot party"></i>Ka-party</span>
      <span><i class="dot boss"></i>World Boss</span>
      <span class="hint">Konseptong mapa — gabay lamang, hindi eksaktong sukat.</span>
    </div>
  </div>
  <div id="i2-profwrap"></div>
  <div class="inv2-nav">
    <button class="i2-nav" data-nav="profile">👤 Profile</button>
    <button class="i2-nav on" data-nav="inventory">🎒 Inventory</button>
    <button class="i2-nav" data-nav="skills">✨ Skills</button>
    <button class="i2-nav" data-nav="map">🗺️ Map</button>
  </div>`;
document.body.appendChild(root);

/* ---------- state ---------- */
const I2={open:false, tab:'all', nav:'inventory', sel:null, selKind:''}; // sel: item obj or {mat:id}
const SLOT_POS=[
  ['head',    'Helmet',    '8%','4%'],
  ['chest',   'Chestplate','74%','4%'],
  ['mainhand','Weapon',    '8%','27%'],
  ['offhand', 'Offhand',   '74%','27%'],
  ['amulet1', 'Amulet',    '8%','50%'],
  ['amulet2', 'Amulet II', '74%','50%'],
  ['ring1',   'Ring',      '8%','73%'],
  ['ring2',   'Ring II',   '74%','73%'],
  ['legs',    'Boots',     '26%','80%'],
  ['cloak',   'Cloak',     '56%','80%'],
];

/* ---------- open/close ---------- */
function i2Open(){
  I2.open=true; root.classList.add('open');
  i2Nav('inventory');
  i2RenderAll();
}
function i2Close(){ I2.open=false; root.classList.remove('open'); }
window.i2Close=i2Close;
$('i2-close').onclick=i2Close;
window.openInventory2=i2Open;
/* hijack the old gear button + panel opener */
$('btn-open-gear').onclick=()=>{ $('badge-gear').classList.add('hidden'); i2Open(); };
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&I2.open) i2Close();
  const ae=document.activeElement, typing=ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA');
  if((e.key==='b'||e.key==='B')&&started&&!I2.open&&!typing&&!rebinding) i2Open();
});

/* ---------- top bar ---------- */
function i2Top(){
  const C=CLASSES[S.cls]||{};
  $('i2-port').src=C.portrait||'img/p_babaylan.png';
  $('i2-lvl').textContent='Lv '+S.level;
  const t=(S.ach&&S.ach.title)?`「${S.ach.title}」 `:'';
  $('i2-name').textContent=t+(S.name||C.name||'Bayani')+(S.adv&&ADV_DEFS[S.cls]?' · '+ADV_DEFS[S.cls].name:'');
  const need=S.level>=LEVEL_CAP?1:XP_FOR(S.level);
  $('i2-xpfill').style.width=(S.level>=LEVEL_CAP?100:Math.min(100,S.xp/need*100))+'%';
  $('i2-gold').textContent='🪙 '+fmt(S.gold);
  $('i2-mutya').textContent='💎 '+fmt(S.inv.mutya||0);
}

/* ---------- paper doll ---------- */
function i2Doll(){
  const doll=$('i2-doll');
  doll.querySelectorAll('.i2-slot').forEach(e=>e.remove());
  for(const [slot,label,lx,ty] of SLOT_POS){
    const it=S.gear[slot];
    const d=document.createElement('div');
    d.className='i2-slot'+(it?' filled':'')+(I2.sel&&I2.selKind==='equipped'&&I2.sel.uid===(it&&it.uid)?' sel':'');
    d.style.left=lx; d.style.top=ty;
    const rar=it?RARITIES.find(r=>r.id===it.rarity):null;
    d.innerHTML=`<div class="sq" style="${rar?'border-color:'+rar.color:''}">${it?it.icon:'∅'}
        ${it&&(it.plus||0)>0?`<span class="plus">+${it.plus}</span>`:''}</div>
      <div class="lb">${label}</div>`;
    d.onclick=()=>{
      if(it){ I2.sel=it; I2.selKind='equipped'; i2Detail(); i2Doll(); i2Grid(); }
      else { I2.sel=null; I2.selKind=''; i2Detail(`<div style="text-align:center;color:#8a80a2;padding:30px 8px">Walang gamit sa <b>${label}</b> slot.<br>Pumili mula sa bag →</div>`); i2Doll(); }
    };
    doll.appendChild(d);
  }
}

/* ---------- stats card ---------- */
function i2Stats(preview){
  computeStats();
  const base={atk:P.atk,def:P.def,hp:P.maxHp,crit:P.critCh};
  let prev=null;
  if(preview){ prev=i2PreviewStats(preview); }
  const row=(icon,name,v0,v1,max)=>{
    const d=v1!=null?v1-v0:0;
    return `<div class="i2-stat"><span>${icon} ${name}</span>
      <div class="bar"><i style="width:${Math.min(100,(v1!=null?v1:v0)/max*100)}%"></i></div>
      <b>${fmt(Math.round(v1!=null?v1:v0))}${d?` <span style="color:${d>0?'#7dff9a':'#ff8a8a'}">${d>0?'▲':'▼'}</span>`:''}</b></div>`;
  };
  $('i2-stats').innerHTML=
    row('⚔️','Attack', base.atk, prev?prev.atk:null, Math.max(600,base.atk*1.4))+
    row('🛡️','Defense', base.def, prev?prev.def:null, Math.max(300,base.def*1.4))+
    row('❤️','Health', base.hp, prev?prev.hp:null, Math.max(3000,base.hp*1.4))+
    row('🎯','Critical', Math.round(base.crit), prev?Math.round(prev.crit):null, 80);
}
/* simulate equipping `it` and return the new stats */
function i2PreviewStats(it){
  let slot=it.slot;
  if(it.altSlots) slot=it.altSlots.find(s2=>!S.gear[s2])||it.altSlots[0];
  const saved=S.gear[slot];
  S.gear[slot]=it;
  computeStats();
  const out={atk:P.atk,def:P.def,hp:P.maxHp,crit:P.critCh};
  if(saved===undefined) delete S.gear[slot]; else S.gear[slot]=saved;
  computeStats();
  return out;
}

/* ---------- detail card ---------- */
function i2Detail(html){
  const el=$('i2-detail');
  if(html!==undefined){ el.innerHTML=html; i2Stats(); return; }
  const it=I2.sel;
  if(!it){ el.innerHTML='<div style="text-align:center;color:#8a80a2;padding:30px 8px">Pumili ng gamit sa bag o sa paper doll.</div>'; i2Stats(); return; }
  if(I2.selKind==='mat'){
    const m=MATERIALS[it.mat];
    el.innerHTML=`<div class="i2-dname" style="color:#d8d0ea">${m.icon} ${m.name} ×${fmt(S.inv[it.mat]||0)}</div>
      <div class="i2-dsub">${m.rarity.toUpperCase()} · Material</div>
      <div style="font-size:11px;color:#bfb6d2;font-style:italic">${m.lore||''}</div>
      ${CONSUMABLE_IDS.has(it.mat)?'<div style="font-size:11px;color:#7dff9a;margin-top:6px">🍲 Magagamit sa Lutuan ng Bayan (cooking).</div>':''}`;
    i2Stats();
    return;
  }
  const rar=RARITIES.find(r=>r.id===it.rarity);
  const isEq=I2.selKind==='equipped';
  const gains=isEq?null:i2Gains(it);
  const lock=window._canEquip?window._canEquip(it):null;
  el.innerHTML=`
    <div class="i2-dname" style="color:${rar.color}">${it.icon} ${it.name}${plusTag(it)}</div>
    <div class="i2-dsub">${rar.name} · ${SLOT_DEFS[it.slot].name} · iLv ${it.ilvl}</div>
    ${window._reqLine?window._reqLine(it):''}
    <div style="font-size:11px;color:#d8d0ea;font-weight:700">${mainStatTxt(it)}</div>
    ${it.affixes.map(a=>`<div style="font-size:10px;color:#bfb6d2">◈ ${a.txt}</div>`).join('')}
    ${it.legendary?`<div style="font-size:10px;color:#ffb84a">${it.legendary.txt}</div>`:''}
    ${window._setLine?window._setLine(it):''}
    ${gains?`<div style="border-top:1px solid #4a3f66;margin:6px 0 3px"></div>`+gains:''}
    <div class="i2-btnrow">
      ${isEq
        ?`<button class="i2-btn red" id="i2-unequip">UNEQUIP</button>
          ${itemSockets(it).length?'<button class="i2-btn gray" id="i2-runes">ᜊ RUNES</button>':''}`
        :`<button class="i2-btn" id="i2-equip" ${lock?'disabled':''}>${lock?'🔒 LOCKED':'EQUIP'}</button>
          <button class="i2-btn gray" id="i2-sell">🪙 ${fmt(sellPrice(it))}</button>`}
    </div>
    ${lock&&!isEq?`<div style="font-size:10px;color:#ff8a8a;margin-top:4px">${lock}</div>`:''}`;
  i2Stats(isEq?null:it);
  const eq=$('i2-equip');
  if(eq) eq.onclick=()=>{ equipItem(it.uid); I2.sel=null; i2RenderAll(); };
  const un=$('i2-unequip');
  if(un) un.onclick=()=>{
    if(S.bag.length>=60){ toast('Puno ang bag!','warn'); return; }
    const slot=Object.entries(S.gear).find(([k,v])=>v&&v.uid===it.uid);
    if(slot){ S.bag.push(it); delete S.gear[slot[0]]; computeStats(); save(); }
    I2.sel=null; i2RenderAll();
  };
  const sl=$('i2-sell');
  if(sl) sl.onclick=()=>{ sellItem(it.uid); I2.sel=null; i2RenderAll(); };
  const rn=$('i2-runes');
  if(rn) rn.onclick=()=>{ i2Close(); openSockets(it.uid); };
}
/* green/red arrows: compare vs what the item would replace */
function i2Gains(it){
  const now={atk:P.atk,def:P.def,hp:P.maxHp,crit:P.critCh};
  const pv=i2PreviewStats(it);
  const line=(name,a,b,icon)=>{
    const d=Math.round(b-a);
    if(!d) return '';
    return `<div class="i2-gain ${d>0?'up':'dn'}">${d>0?'▲':'▼'} ${name} ${d>0?'+':''}${fmt(d)}</div>`;
  };
  const h=line('Attack',now.atk,pv.atk)+line('Defense',now.def,pv.def)+line('Health',now.hp,pv.hp)+line('Critical',now.crit,pv.crit);
  return h||'<div class="i2-gain eq">— walang pagbabago sa stats —</div>';
}

/* ---------- bag grid ---------- */
function i2Grid(){
  const grid=$('i2-grid');
  const tab=I2.tab;
  let cells='';
  const items=S.bag.filter(it=>
    tab==='all'||(tab==='weap'&&isWeapon(it))||(tab==='armor'&&!isWeapon(it)));
  if(tab==='all'||tab==='weap'||tab==='armor'){
    const order={legendary:0,epic:1,rare:2,uncommon:3,common:4};
    items.sort((a,b)=>order[a.rarity]-order[b.rarity]||b.ilvl-a.ilvl);
    cells+=items.map(it=>`<div class="i2-cell rc-${it.rarity} ${I2.sel&&I2.selKind==='bag'&&I2.sel.uid===it.uid?'sel':''}" data-uid="${it.uid}">
      ${it.icon}${(it.plus||0)>0?`<span class="pl">+${it.plus}</span>`:''}</div>`).join('');
  }
  if(tab==='all'||tab==='consum'||tab==='mats'||tab==='quest'){
    const mats=Object.entries(S.inv).filter(([id,q])=>q>0&&MATERIALS[id])
      .filter(([id])=>tab==='all'||matTab(id)===tab);
    mats.sort((a,b)=>(MATERIALS[a[0]].rarity==='common'?1:0)-(MATERIALS[b[0]].rarity==='common'?1:0));
    cells+=mats.map(([id,q])=>`<div class="i2-cell ${I2.sel&&I2.selKind==='mat'&&I2.sel.mat===id?'sel':''}" data-mat="${id}">
      ${MATERIALS[id].icon}<span class="q">${q>999?fmt(Math.floor(q/1000))+'k':q}</span></div>`).join('');
  }
  grid.innerHTML=cells||'<div style="grid-column:1/-1;text-align:center;color:#8a80a2;padding:24px 8px;font:600 12px system-ui">Walang laman ang tab na ito.</div>';
  grid.querySelectorAll('[data-uid]').forEach(c=>c.onclick=()=>{
    I2.sel=S.bag.find(i=>i.uid===+c.dataset.uid); I2.selKind='bag';
    i2Detail(); i2Grid(); i2Doll();
  });
  grid.querySelectorAll('[data-mat]').forEach(c=>c.onclick=()=>{
    I2.sel={mat:c.dataset.mat}; I2.selKind='mat';
    i2Detail(); i2Grid(); i2Doll();
  });
}
$('i2-tabs').querySelectorAll('.i2-tab').forEach(t=>t.onclick=()=>{
  I2.tab=t.dataset.tab;
  $('i2-tabs').querySelectorAll('.i2-tab').forEach(x=>x.classList.toggle('on',x===t));
  i2Grid();
});

/* ---------- AUTO EQUIP: equips the best usable item per slot ---------- */
function i2Score(it){
  const eMul=1+(it.plus||0)*0.08;
  let sc=it.mainV*eMul*(it.main==='hp'?0.6:it.main==='spd'?0.8:1);
  for(const a of it.affixes) sc+=a.v*0.5;
  const ri={common:1,uncommon:1.15,rare:1.35,epic:1.6,legendary:2}[it.rarity]||1;
  return sc*ri;
}
$('i2-autoequip').onclick=()=>{
  let changed=0;
  for(let pass=0;pass<2;pass++){
    for(const it of [...S.bag]){
      if(window._canEquip&&window._canEquip(it)) continue;
      let slot=it.slot;
      if(it.altSlots){
        const sc=x=>S.gear[x]?i2Score(S.gear[x]):-1;
        slot=it.altSlots.find(s2=>!S.gear[s2])||it.altSlots.reduce((a,b)=>sc(a)<=sc(b)?a:b);
      }
      const cur=S.gear[slot];
      if(!cur||i2Score(it)>i2Score(cur)*1.02){
        equipItem(it.uid);
        changed++;
      }
    }
  }
  toast(changed?`⚡ Auto Equip: ${changed} gamit ang isinuot!`:'⚡ Suot mo na ang pinakamahusay mong gamit.','loot');
  I2.sel=null; i2RenderAll();
};

/* ---------- BAG SETTINGS ---------- */
$('i2-bagset').onclick=()=>{
  showModal(`<div class="modal-emoji">⚙️</div><div class="modal-title">Bag Settings</div>
    <button class="modal-btn" id="bs-sellcommon">🪙 Ibenta LAHAT ng Common gear</button>
    <button class="modal-btn" id="bs-selluncommon">🪙 Ibenta lahat ng Common + Uncommon</button>
    <button class="modal-btn secondary" id="bs-sort">📚 Ayusin ang bag (rarity)</button>
    <button class="modal-btn" onclick="closeModal()">Isara</button>`);
  const sellBelow=(ranks)=>{
    let gold=0,n=0;
    for(const it of [...S.bag]){ if(ranks.includes(it.rarity)){ gold+=sellPrice(it); S.bag.splice(S.bag.indexOf(it),1); n++; } }
    S.gold+=gold; updateHUD(); save();
    toast(n?`🪙 Naibenta ang ${n} gamit — +${fmt(gold)} ginto!`:'Walang maibebenta.','loot');
    closeModal(); i2RenderAll();
  };
  $('bs-sellcommon').onclick=()=>sellBelow(['common']);
  $('bs-selluncommon').onclick=()=>sellBelow(['common','uncommon']);
  $('bs-sort').onclick=()=>{ closeModal(); toast('📚 Naka-ayos na ang bag ayon sa rarity.',''); i2Grid(); };
};

/* ---------- bottom nav ---------- */
function i2Nav(which){
  I2.nav=which;
  root.querySelectorAll('.i2-nav').forEach(b=>b.classList.toggle('on',b.dataset.nav===which));
  $('i2-invmain').style.display=which==='inventory'?'flex':'none';
  $('i2-mapwrap').classList.toggle('open',which==='map');
  $('i2-profwrap').classList.toggle('open',which==='profile'||which==='skills');
  if(which==='map'){ if(window._setMapArt) window._setMapArt(curMap()); i2DrawMap(); }
  if(which==='profile') i2Profile();
  if(which==='skills'){
    const C=CLASSES[S.cls]||{skills:[]};
    const pts=(window.skFree?window.skFree():0);
    $('i2-profwrap').classList.add('open');
    $('i2-profwrap').innerHTML=`<div class="i2-card" style="max-width:560px;margin:0 auto">
      <h4>✨ MGA SKILL — ${(S.adv&&ADV_DEFS[S.cls])?ADV_DEFS[S.cls].name:C.name||''}</h4>
      <div style="display:flex;align-items:center;gap:10px;margin:4px 0 10px">
        <span style="font:800 14px system-ui;color:#9aff5a">✨ ${pts} skill point${pts===1?'':'s'}</span>
        <button class="i2-btn" id="i2-opentree" style="margin-left:auto">🌳 Buksan ang SKILL TREE</button>
      </div>
      ${(C.skills||[]).map((sk,i)=>`
        <div style="display:flex;gap:10px;align-items:center;padding:8px 4px;border-bottom:1px solid rgba(255,255,255,.06)">
          <span style="font-size:26px">${sk.icon}</span>
          <div style="flex:1"><b style="font:800 13px system-ui;color:#efe8ff">${sk.name}</b>
            <div style="font:600 11px system-ui;color:#8a80a2">${sk.desc} · CD ${sk.cd}s · key ${i+1}</div></div>
        </div>`).join('')}
      <div style="font:600 11.5px system-ui;color:#cfc6e2;margin-top:10px;text-align:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:8px">
        Ang tatlong ito ang iyong <b>base skills</b>. Marami pang skills ang maaaring
        <b style="color:#9aff5a">i-unlock at i-level up</b> gamit ang skill points sa
        <b style="color:#ffd27a">SKILL TREE</b> — huwag hayaang matambak ang points!
      </div>
      <div style="font:600 11px system-ui;color:#8a80a2;margin-top:8px;text-align:center">
        ${S.adv?'🌟 Advanced: '+(ADV_DEFS[S.cls]?ADV_DEFS[S.cls].perk:''):S.level>=20?'🌟 Handa ka na sa Seremonya ng Pag-angat — ☰ menu → 🌟 Pag-angat!':'Mag-advance sa Level 20 para sa dagdag na kapangyarihan.'}
      </div>
    </div>`;
    const ot=$('i2-opentree'); if(ot) ot.onclick=()=>{ window.openSkillTree(); };
  } else if(which!=='profile') $('i2-profwrap').classList.remove('open');
}
root.querySelectorAll('.i2-nav').forEach(b=>b.onclick=()=>i2Nav(b.dataset.nav));

/* ---------- 🗺️ full map tab (bonus feature) ---------- */
/* Illustrated region map — Barangay Liwanag / Banaue Highlands concept art.
   The artwork is a concept (not to scale); live markers are projected into its
   illustrated (non-panel) area so player/party/boss pins stay on the terrain
   instead of drifting over the baked-in legend/info panels. */
const regionArt=new Image();
let regionArtReady=false;
regionArt.onload=()=>{ regionArtReady=true; if(I2.open&&I2.nav==='map') i2DrawMap(); };
regionArt.onerror=()=>{ regionArtReady=false; if(I2.open&&I2.nav==='map') i2DrawMap(); };
regionArt.src='assets/maps/barangay-liwanag.jpg';
/* Map Instance hook (Phase 1): swap the region art + header for the current map. */
window._setMapArt=function(m){
  if(m && m.art){ if(regionArt.src.endsWith(m.art)===false){ regionArtReady=false; regionArt.src=m.art; } }
  else regionArtReady=false; // maps without authored art fall back to the procedural base
  const hb=document.querySelector('#i2-maphead b'), hs=document.querySelector('#i2-maphead span');
  if(m){ if(hb) hb.textContent=(m.icon||'🗺️')+' '+m.name;
         if(hs) hs.textContent=m.region+' · Lv '+m.recLevel[0]+'–'+m.recLevel[1]; }
};
const ART_VIEW={l:0.02,r:0.845,t:0.02,b:0.985};
function i2DrawMap(){
  const cv=$('i2-map'), ctx=cv.getContext('2d');
  ctx.clearRect(0,0,cv.width,cv.height);
  const art=regionArtReady;
  if(art){ ctx.imageSmoothingEnabled=true;  ctx.drawImage(regionArt,0,0,cv.width,cv.height); }
  else   { ctx.imageSmoothingEnabled=false; ctx.drawImage(mmBase,0,0,cv.width,cv.height); }
  const px = art ? (x)=> (ART_VIEW.l+(x/WORLD_W)*(ART_VIEW.r-ART_VIEW.l))*cv.width  : (x)=> x/WORLD_W*cv.width;
  const pz = art ? (z)=> (ART_VIEW.t+(z/WORLD_H)*(ART_VIEW.b-ART_VIEW.t))*cv.height : (z)=> z/WORLD_H*cv.height;
  if(!art){
    const sx=cv.width/WORLD_W, sy=cv.height/WORLD_H;
    const mark=(wx,wz,txt,col)=>{
      ctx.font='800 11px system-ui'; ctx.textAlign='center';
      ctx.fillStyle='rgba(0,0,0,.55)';
      const w=ctx.measureText(txt).width+8;
      ctx.fillRect(wx*sx-w/2,wz*sy-16,w,13);
      ctx.fillStyle=col; ctx.fillText(txt,wx*sx,wz*sy-6);
    };
    mark(66.5*TILE,43.5*TILE,'🏮 Grand Tiangge','#ffd94a');
    mark(DGN_GATE.x,DGN_GATE.z,'🌀 Lagusan','#c8a8ff');
    mark(PORTAL_ISLE.x,PORTAL_ISLE.z,'🏝️ Isla','#8affd8');
    mark(VOLCANO.tx*TILE,(VOLCANO.ty+6)*TILE,'🌋 Bulkan','#ff8a5e');
  }
  if(WBOSS.active){ const sp=WBOSS_SPOTS[WBOSS.active];
    ctx.font='800 '+(art?26:14)+'px system-ui'; ctx.textAlign='center';
    ctx.fillText('☠️', px(sp.x), pz(sp.z)); }
  /* ka-party */
  if(window._kaParty) for(const r of window._kaParty.values()){
    ctx.fillStyle='#7dffb0'; ctx.beginPath(); ctx.arc(px(r.x),pz(r.z),art?5:3.5,0,6.28); ctx.fill();
  }
  /* you */
  const X=px(player.x), Z=pz(player.z);
  ctx.fillStyle='#fff'; ctx.strokeStyle='#f2b134'; ctx.lineWidth=art?3:2.5;
  ctx.beginPath(); ctx.arc(X,Z,art?7:5,0,6.28); ctx.fill(); ctx.stroke();
  ctx.font='800 '+(art?13:10)+'px system-ui'; ctx.textAlign='center'; ctx.fillStyle='#ffd94a';
  ctx.fillText('IKAW',X,Z+(art?22:16));
}
setInterval(()=>{ if(I2.open&&I2.nav==='map') i2DrawMap(); },1500);

/* ---------- 👤 profile tab ---------- */
function i2Profile(){
  const C=CLASSES[S.cls]||{};
  const k=(S.ach&&S.ach.c)||{};
  const done=S.ach?Object.keys(S.ach.u||{}).length:0;
  computeStats();
  $('i2-profwrap').innerHTML=`
    <div style="display:flex;gap:14px;flex-wrap:wrap;justify-content:center">
      <div class="i2-card" style="flex:1;min-width:260px;max-width:420px">
        <h4>👤 ${S.name||C.name||'Bayani'}${S.adv&&ADV_DEFS[S.cls]?' · '+ADV_DEFS[S.cls].name:''}</h4>
        <div style="text-align:center;margin-bottom:8px">
          <img src="${C.portrait||''}" style="width:84px;height:84px;border-radius:14px;border:2px solid #f2b134;object-fit:cover">
          <div style="font:700 11px system-ui;color:#ffd94a;margin-top:4px">${(S.ach&&S.ach.title)?'「'+S.ach.title+'」':''}</div>
        </div>
        <div class="i2-stat"><span>⭐ Level</span><b>${S.level} / ${LEVEL_CAP}</b></div>
        <div class="i2-stat"><span>⚔️ Attack</span><b>${fmt(P.atk)}</b></div>
        <div class="i2-stat"><span>🛡️ Defense</span><b>${fmt(P.def)}</b></div>
        <div class="i2-stat"><span>❤️ Max HP</span><b>${fmt(P.maxHp)}</b></div>
        <div class="i2-stat"><span>🎯 Crit</span><b>${Math.round(P.critCh)}% / ${Math.round(P.critDmg)}%</b></div>
        <div class="i2-stat"><span>🩸 Lifesteal</span><b>${Math.round(P.lifesteal)}%</b></div>
        <div class="i2-stat"><span>🪙 Ginto</span><b>${fmt(S.gold)}</b></div>
      </div>
      <div class="i2-card" style="flex:1;min-width:260px;max-width:420px">
        <h4>📊 Mga Tala</h4>
        <div class="i2-stat"><span>💀 Kills</span><b>${fmt(k.kill||0)}</b></div>
        <div class="i2-stat"><span>👹 Elite kills</span><b>${fmt(k.killelite||0)}</b></div>
        <div class="i2-stat"><span>☠️ Boss kills</span><b>${fmt((k.boss||0)+(k.wboss||0))}</b></div>
        <div class="i2-stat"><span>🌿 Forages</span><b>${fmt(k.forage||0)}</b></div>
        <div class="i2-stat"><span>🎣 Isda</span><b>${fmt(k.fish||0)}</b></div>
        <div class="i2-stat"><span>🌀 Dungeons</span><b>${fmt(k.dungeon||0)}</b></div>
        <div class="i2-stat"><span>🏆 Achievements</span><b>${done}/${ACH_DEFS.length}</b></div>
        <div class="i2-btnrow">
          <button class="i2-btn gray" onclick="openAchievements()">🏆 Tagumpay</button>
          <button class="i2-btn gray" onclick="openCodex()">📖 Kodise</button>
        </div>
      </div>
    </div>`;
}

/* ---------- render all ---------- */
function i2RenderAll(){ i2Top(); i2Doll(); i2Grid(); i2Detail(); }
/* keep fresh while open */
setInterval(()=>{ if(I2.open&&I2.nav==='inventory') i2Top(); },2500);
/* ---- export hook: game.js is an ES MODULE, so EOF extension modules
   CANNOT see these IIFE locals as bare names. Everything they need is
   exposed here (getters keep live bindings; setters swap closures). */
window._i2={
  get I2(){ return I2; },
  matTab, isWeapon,
  detail:(...a)=>i2Detail(...a),
  doll:()=>i2Doll(),
  grid:()=>i2Grid(),
  renderAll:()=>i2RenderAll(),
  setGrid(f){ i2Grid=f; },
  wrapOpen(after){ const o=i2Open; i2Open=function(){ o.apply(this,arguments); after(); }; window.openInventory2=i2Open; },
};
})();


/* ================================================================
   PHASE 7C MODULE — HUD CLEANUP (single ☰ Main Menu window)
   + UC-Browser fullscreen fix (vendor prefixes + pseudo-fallback)
   ================================================================ */

/* ---------- cross-browser fullscreen (UC Browser & older WebKit fix) ---------- */
function _fsNative(){
  return document.fullscreenElement||document.webkitFullscreenElement||
         document.webkitCurrentFullScreenElement||document.mozFullScreenElement||
         document.msFullscreenElement||null;
}
function _fsActive(){ return !!_fsNative()||document.body.classList.contains('pseudo-fs'); }
function _fsIcon(){ const b=$('btn-fullscreen'); if(b) b.textContent=_fsActive()?'🗗':'⛶'; }
enterFullscreen=async function(){
  const de=document.documentElement;
  const req=de.requestFullscreen||de.webkitRequestFullscreen||de.webkitRequestFullScreen||
            de.mozRequestFullScreen||de.msRequestFullscreen;
  if(req){ try{ const r=req.call(de,{navigationUI:'hide'}); if(r&&r.then) await r.catch(()=>{}); }catch(e){} }
  /* give prefixed implementations a beat, then verify */
  await new Promise(res=>setTimeout(res,180));
  if(!_fsNative()){
    /* UC Browser / no fullscreen API → pseudo-fullscreen fallback */
    document.body.classList.add('pseudo-fs');
    window.scrollTo(0,1);
    setTimeout(()=>window.scrollTo(0,1),300);
  }
  try{
    if(screen.orientation&&screen.orientation.lock) screen.orientation.lock('landscape').catch(()=>{});
    else if(screen.lockOrientation) screen.lockOrientation('landscape');
    else if(screen.mozLockOrientation) screen.mozLockOrientation('landscape');
    else if(screen.msLockOrientation) screen.msLockOrientation('landscape');
  }catch(e){}
  toast('⛶ Full screen! Pindutin muli para lumabas.','');
  _fsIcon();
};
exitFullscreen=async function(){
  try{
    if(screen.orientation&&screen.orientation.unlock) screen.orientation.unlock();
    else if(screen.unlockOrientation) screen.unlockOrientation();
    else if(screen.mozUnlockOrientation) screen.mozUnlockOrientation();
  }catch(e){}
  document.body.classList.remove('pseudo-fs');
  try{
    const ex=document.exitFullscreen||document.webkitExitFullscreen||document.webkitCancelFullScreen||
             document.mozCancelFullScreen||document.msExitFullscreen;
    if(_fsNative()&&ex){ const r=ex.call(document); if(r&&r.then) await r.catch(()=>{}); }
  }catch(e){}
  _fsIcon();
};
toggleFullscreen=function(){ _fsActive()?exitFullscreen():enterFullscreen(); };
window._fsActive=_fsActive;
window.toggleFullscreen=toggleFullscreen;
['fullscreenchange','webkitfullscreenchange','mozfullscreenchange','MSFullscreenChange']
  .forEach(ev=>document.addEventListener(ev,_fsIcon));
setInterval(_fsIcon,3000);   /* pseudo-fs has no change event */
(function(){ const b=$('btn-fullscreen'); if(b) b.onclick=()=>toggleFullscreen(); })();

/* ---------- ☰ MAIN MENU — collapse the crowded HUD row ---------- */
(function hudCleanup(){
  const css=document.createElement('style');
  css.textContent=`
  #menu-tray{display:none!important}
  #mainmenu{position:fixed;inset:0;z-index:115;display:none;align-items:center;justify-content:center;
    background:rgba(8,6,16,.74);backdrop-filter:blur(4px)}
  #mainmenu.open{display:flex}
  .mm-win{background:linear-gradient(160deg,#1c1533,#0f0b1e);border:1px solid rgba(201,162,75,.45);
    border-radius:18px;padding:16px 20px 20px;width:min(560px,94vw);max-height:88vh;overflow-y:auto;
    box-shadow:0 24px 70px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.06)}
  .mm-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
  .mm-title{font-weight:800;color:#f0d58c;letter-spacing:2px;font-size:15px}
  .mm-x{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:9px;
    color:#cbbfe0;font-size:16px;width:30px;height:30px;cursor:pointer}
  .mm-sec{margin:12px 0 6px;font-size:10px;color:#8a80a2;letter-spacing:3px;font-weight:700}
  .mm-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
  .mm-tile{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;
    padding:10px 2px 8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);
    border-radius:12px;color:#e8e2f5;cursor:pointer;font-size:10.5px;line-height:1.1;text-align:center}
  .mm-tile:hover{border-color:#c9a24b;background:rgba(201,162,75,.12)}
  .mm-tile b{font-size:22px;font-weight:400}
  .mm-dot{position:absolute;top:4px;right:6px;width:9px;height:9px;border-radius:50%;
    background:#ff5252;box-shadow:0 0 7px #ff5252}
  #btn-mainmenu{position:relative}
  #btn-mainmenu .mm-dot{top:2px;right:2px}
  @media(max-width:760px){ .mm-tile b{font-size:19px} .mm-win{padding:12px 12px 16px} }
  body.pseudo-fs{overflow:hidden}
  `;
  document.head.appendChild(css);

  const hr=document.querySelector('.hud-right');
  const tray=document.createElement('div'); tray.id='menu-tray'; document.body.appendChild(tray);

  /* proxy button for the dungeon selector (tile needs a real button to click) */
  (function(){ const b=document.createElement('button'); b.id='btn-dgn'; b.style.display='none';
    b.onclick=()=>{ if(window.openDungeonSelect) window.openDungeonSelect(); }; tray.appendChild(b); })();

  /* groups: [section label, [btnId, icon, label]...] */
  /* categories per skill-UI doc 07: Character/Inventory/Social/World/Commerce/System */
  const GROUPS=[
    ['KARAKTER',[
      ['btn-open-gear','⚔️','Kagamitan'],
      ['btn-info','🧙','Estadistika'],
      ['btn-ach','🏆','Tagumpay'],
      ['btn-advance','🌟','Pag-angat'],
      ['btn-pets','🐾','Mga Alaga'],
    ]],
    ['IMBENTARYO',[
      ['btn-open-inventory','🎒','Alay Pouch'],
      ['btn-codex','📜','Katalogo'],
      ['btn-open-bestiary','🐉','Aklat ng Lahi'],
    ]],
    ['SOSYAL',[
      ['btn-friends','🫂','Kaibigan'],
      ['btn-guild','⛨','Tribu'],
      ['btn-chan','📡','Channels'],
      ['btn-lead','🥇','Leaderboard'],
    ]],
    ['MUNDO',[
      ['btn-daily','📅','Misyon'],
      ['btn-dgn','🌀','Lagusan'],
      ['btn-arena','🏟️','Arena'],
    ]],
    ['KALAKALAN',[
      ['btn-open-tiangge','🏮','Tiangge'],
      ['btn-market','🧺','Palengke'],
    ]],
    ['SISTEMA',[
      ['btn-settings','⚙️','Settings'],
      ['btn-mute','🔊','Tunog'],
      ['btn-fullscreen','⛶','Full Screen'],
    ]],
  ];
  /* buttons that stay visible in the HUD row — Phase 6 (skill-UI doc 07):
     ONLY the ☰ main menu. Everything else lives in the menu categories. */
  const KEEP=[];

  /* move everything else into the hidden tray (handlers & badge logic keep working) */
  Array.from(hr.children).forEach(b=>{ if(!KEEP.includes(b.id)) tray.appendChild(b); });

  /* ☰ button — the ONLY button in the HUD row (skill-UI doc 07) */
  const mb=document.createElement('button');
  mb.className='menu-btn'; mb.id='btn-mainmenu'; mb.title='Menu'; mb.textContent='☰';
  hr.appendChild(mb);

  /* overlay window */
  const ov=document.createElement('div');
  ov.id='mainmenu';
  ov.innerHTML=`<div class="mm-win">
    <div class="mm-head"><span class="mm-title">☰ MENU</span><button class="mm-x" id="mm-x">✕</button></div>
    ${GROUPS.map(([sec,items])=>`
      <div class="mm-sec">${sec}</div>
      <div class="mm-grid">${items.map(([id,ic,lb])=>
        `<div class="mm-tile" data-mm="${id}"><b>${ic}</b><span>${lb}</span></div>`).join('')}
      </div>`).join('')}
  </div>`;
  document.body.appendChild(ov);
  function mmClose(){ ov.classList.remove('open'); }
  function mmOpen(){
    /* live icons for stateful buttons */
    ov.querySelectorAll('.mm-tile').forEach(t=>{
      const id=t.dataset.mm, orig=$(id);
      if(!orig){ t.style.display='none'; return; }
      if(id==='btn-mute'||id==='btn-fullscreen') t.querySelector('b').textContent=orig.textContent.trim()||t.querySelector('b').textContent;
    });
    mmDots(); ov.classList.add('open');
  }
  mb.onclick=mmOpen;
  ov.querySelector('#mm-x').onclick=mmClose;
  ov.addEventListener('click',e=>{ if(e.target===ov) mmClose(); });
  ov.querySelectorAll('.mm-tile').forEach(t=>{
    t.onclick=()=>{ const orig=$(t.dataset.mm); mmClose(); if(orig) orig.click(); };
  });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&ov.classList.contains('open')) mmClose(); });

  /* badge mirroring: red dot on tiles + on ☰ itself */
  function hasBadge(b){ return !!(b&&b.querySelector('.badge:not(.hidden)')); }
  function mmDots(){
    let any=false;
    ov.querySelectorAll('.mm-tile').forEach(t=>{
      const orig=$(t.dataset.mm), on=hasBadge(orig);
      let d=t.querySelector('.mm-dot');
      if(on&&!d){ d=document.createElement('i'); d.className='mm-dot'; t.appendChild(d); }
      if(!on&&d) d.remove();
      if(on&&tray.contains(orig)) any=true;
    });
    let md=mb.querySelector('.mm-dot');
    if(any&&!md){ md=document.createElement('i'); md.className='mm-dot'; mb.appendChild(md); }
    if(!any&&md) md.remove();
  }
  setInterval(mmDots,2000);
})();


/* ================================================================
   PHASE 7A MODULE — ALAGA v2 (Pets as true companions)
   Pet XP/levels · hunger + feeding (cooked dishes & fish) ·
   auto-loot · evolutions · world-boss pets w/ deterministic pity
   ================================================================ */

/* ---------- state migration ---------- */
(function(){
  if(!S.pets) S.pets={owned:[],active:null,mounted:false};
  S.pets.xp=S.pets.xp||{};
  S.pets.hunger=S.pets.hunger||{};
  S.pets.evolved=S.pets.evolved||[];
  S.pets.pity=S.pets.pity||{};
  (S.pets.owned||[]).forEach(id=>{ if(S.pets.hunger[id]==null) S.pets.hunger[id]=100; });
})();

/* ---------- boss companions (world-boss 3% drops + pity) ---------- */
PET_DEFS.baby_bakunawa={name:'Baby Bakunawa', icon:'🐉', cost:0, type:'pet', bossOnly:'bakunawa',
  desc:'Anak ng tagalamon ng buwan. +5% Life Steal, +4% ATK.',
  build(){ const g=new THREE.Group();
    const cols=[0x2a3a6a,0x33477e,0x3d5492,0x4761a6];
    for(let i=0;i<4;i++){ const s=new THREE.Mesh(new THREE.SphereGeometry(0.26-i*0.04,7,6), M(cols[i],{emissive:0x1a2a5a,emissiveIntensity:0.35}));
      s.position.set(0,0.45+Math.sin(i*1.2)*0.12,-i*0.3); g.add(s); }
    const head=new THREE.Mesh(new THREE.SphereGeometry(0.24,7,6), M(0x24336a)); head.position.set(0,0.62,0.24); g.add(head);
    for(const sx of [-1,1]){ const eye=new THREE.Mesh(new THREE.SphereGeometry(0.05,5,4), M(0x9ad8ff,{emissive:0x6ac8ff,emissiveIntensity:2})); eye.position.set(sx*0.1,0.68,0.42); g.add(eye);
      const horn=new THREE.Mesh(new THREE.ConeGeometry(0.045,0.2,4), M(0xcfe2ff)); horn.position.set(sx*0.12,0.86,0.2); horn.rotation.z=sx*-0.35; g.add(horn); }
    const moon=new THREE.Mesh(new THREE.SphereGeometry(0.09,6,5), M(0xfff2c8,{emissive:0xffe9a0,emissiveIntensity:1.4})); moon.position.set(0,0.95,0.05); g.add(moon);
    return g; }};
PET_DEFS.munting_minokawa={name:'Munting Minokawa', icon:'🦅', cost:0, type:'pet', bossOnly:'minokawa',
  desc:'Inakay ng dambuhalang ibon. +6% Crit, +8% XP.',
  build(){ const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.SphereGeometry(0.28,7,6), M(0x2e2438)); body.position.y=0.5; g.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(0.17,6,5), M(0x3a2e48)); head.position.set(0,0.78,0.16); g.add(head);
    const beak=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.2,4), M(0xffd94a,{emissive:0xc98d1e,emissiveIntensity:0.5})); beak.position.set(0,0.76,0.34); beak.rotation.x=Math.PI/2; g.add(beak);
    for(const sx of [-1,1]){ const wing=new THREE.Mesh(new THREE.ConeGeometry(0.26,0.62,3), M(0x241a30,{transparent:true,opacity:0.95}));
      wing.position.set(sx*0.34,0.58,0); wing.rotation.z=sx*1.65; wing.scale.z=0.22; g.add(wing);
      const eye=new THREE.Mesh(new THREE.SphereGeometry(0.045,4,4), M(0xff4a2a,{emissive:0xff2a00,emissiveIntensity:2})); eye.position.set(sx*0.07,0.82,0.28); g.add(eye); }
    return g; }};
PET_DEFS.anak_sarangay={name:'Anak ni Sarangay', icon:'🐂', cost:0, type:'pet', bossOnly:'sarangay',
  desc:'Guya ng tanod ng hiyas. +10% DEF, +8% Max HP.',
  build(){ const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.28,0.5,4,7), M(0x5a4638)); body.rotation.z=Math.PI/2; body.position.y=0.5; g.add(body);
    const head=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.34), M(0x6a5444)); head.position.set(0,0.64,0.5); g.add(head);
    for(const sx of [-1,1]){ const horn=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.24,4), M(0xe8dcc8)); horn.position.set(sx*0.14,0.84,0.46); horn.rotation.z=sx*-0.5; g.add(horn); }
    const gem=new THREE.Mesh(new THREE.OctahedronGeometry(0.09,0), M(0xc08aff,{emissive:0x9a4aff,emissiveIntensity:1.6})); gem.position.set(0,0.9,0.5); g.add(gem);
    for(const sx of [-1,1]) for(const fz of [0.28,-0.28]){
      const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.06,0.4,5), M(0x4a3a2e)); leg.position.set(sx*0.16,0.2,fz); g.add(leg); }
    return g; }};
const WBOSS_PET={bakunawa:'baby_bakunawa', minokawa:'munting_minokawa', sarangay:'anak_sarangay'};

/* ---------- pet leveling ---------- */
const PET_LVL_CAP=30, PET_EVO_LVL=15;
function petNeed(l){ return Math.round(60*Math.pow(l,1.8)); }
function petLvl(id){ let xp=(S.pets.xp[id]||0), l=1; while(l<PET_LVL_CAP&&xp>=petNeed(l)){ xp-=petNeed(l); l++; } return l; }
function petXpInto(id){ let xp=(S.pets.xp[id]||0), l=1; while(l<PET_LVL_CAP&&xp>=petNeed(l)){ xp-=petNeed(l); l++; } return {l, into:xp, need:l>=PET_LVL_CAP?0:petNeed(l)}; }
function petFed(id){ return (S.pets.hunger[id]||0)>0; }
function addPetXp(id,amt){
  if(!id||!PET_DEFS[id]) return;
  const before=petLvl(id);
  S.pets.xp[id]=(S.pets.xp[id]||0)+amt;
  const after=petLvl(id);
  if(after>before){
    const d=PET_DEFS[id];
    toast(`${d.icon} <b>${petName(id)}</b> ay LEVEL ${after} na!`,'levelup');
    SFX.levelup(); computeStats(); updateHUD();
  }
  save();
}
function petName(id){ return S.pets.evolved.includes(id)&&PET_EVO[id]?PET_EVO[id].name:PET_DEFS[id].name; }

/* ---------- evolutions ---------- */
const PET_EVO={
  sarimanok:{name:'Sarimanok ng Liwayway', need:{anito_dust:30},              gain:'+19% Drop Rate (mula 12%)'},
  tarsier:  {name:'Matandang Tarsier',     need:{diwata_dew:30},              gain:'+16% XP at +4% Drop (mula 10%)'},
  paniki:   {name:'Paniki ng Dugong Gabi', need:{santelmo_flame:30},          gain:'+7% Life Steal at +3% Crit (mula 4%)'},
  kalabaw:  {name:'Gintong Kalabaw',       need:{tikbalang_hair:25, mutya:2}, gain:'SAKAY: +80% bilis (mula 60%)'},
};
function canEvolve(id){
  const e=PET_EVO[id];
  if(!e||S.pets.evolved.includes(id)) return false;
  if(petLvl(id)<PET_EVO_LVL) return false;
  return Object.entries(e.need).every(([m,q])=>(S.inv[m]||0)>=q);
}

/* ---------- aura engine (computeStats wrap) ----------
   basic pets: original computeStats already added the base — we add the DELTA.
   boss pets & evo/level bonuses: added fully here.
   effective = B * (1 + 0.02*(petLvl-1)) * (fed ? 1 : 0.5)              */
const PET_AURAS={
  sarimanok:[['dropRate',12,19]],
  tarsier:  [['xpGain',10,16],['dropRate',0,4]],
  paniki:   [['lifesteal',4,7],['critCh',0,3]],
  kalabaw:  [],
  baby_bakunawa:  [['lifesteal',5,5],['atkPct',4,4]],
  munting_minokawa:[['critCh',6,6],['xpGain',8,8]],
  anak_sarangay:  [['defPct',10,10],['hpPct',8,8]],
};
const PET_ORIG_ADDED={sarimanok:{dropRate:12}, tarsier:{xpGain:10}, paniki:{lifesteal:4}};
function petAuraMult(id){ return (1+0.02*(petLvl(id)-1))*(petFed(id)?1:0.5); }
(function(){
  const _cs=computeStats;
  computeStats=function(){
    _cs();
    const id=S.pets&&S.pets.active;
    if(!id||!PET_AURAS[id]) return;
    const evolved=S.pets.evolved.includes(id), mult=petAuraMult(id);
    for(const [stat,b,e] of PET_AURAS[id]){
      const B=evolved?e:b, eff=B*mult;
      if(stat==='atkPct')      P.atk=Math.round(P.atk*(1+eff/100));
      else if(stat==='defPct') P.def=Math.round(P.def*(1+eff/100));
      else if(stat==='hpPct')  P.maxHp=Math.round(P.maxHp*(1+eff/100));
      else P[stat]+=eff-((PET_ORIG_ADDED[id]&&PET_ORIG_ADDED[id][stat])||0);
    }
    P.critCh=Math.min(75,P.critCh); P.lifesteal=Math.min(30,P.lifesteal);
    if(id==='kalabaw'&&S.pets.mounted&&evolved) P.spd*=1.125;   /* 1.6 → 1.8 */
    if(id==='kalabaw'&&S.pets.mounted&&!petFed(id)) P.spd*=0.906; /* gutom: ~1.6→1.45 */
    if(S.hp>P.maxHp) S.hp=P.maxHp;
  };
})();

/* ---------- pet XP from kills + world-boss pet drops ---------- */
(function(){
  const _kr=killReward;
  killReward=function(en){
    _kr.apply(this,arguments);
    const def=ENEMY_DEFS[en.key];
    if(!def) return;
    const active=S.pets&&S.pets.active;
    if(active) addPetXp(active, Math.max(1,Math.round(def.xp*Math.pow(1.09,S.level-1)*0.12)));
    /* boss companions: 3% drop, guaranteed by the 25th kill (deterministic pity) */
    if(def.worldBoss&&WBOSS_PET[en.key]){
      const pid=WBOSS_PET[en.key];
      if(!S.pets.owned.includes(pid)){
        S.pets.pity[pid]=(S.pets.pity[pid]||0)+1;
        if(Math.random()<0.03||S.pets.pity[pid]>=25){
          S.pets.owned.push(pid); S.pets.hunger[pid]=100; S.pets.pity[pid]=0;
          const d=PET_DEFS[pid];
          toast(`${d.icon} <b>ALAMAT!</b> Sumunod sa iyo si <b>${d.name}</b>!`,'levelup');
          SFX.levelup(); screenShake(0.4,0.7); save();
        } else save();
      }
    }
  };
})();

/* ---------- hunger: active pet gets hungry over playtime ---------- */
setInterval(()=>{
  const id=started&&S.pets&&S.pets.active;
  if(!id) return;
  const h=S.pets.hunger[id]==null?100:S.pets.hunger[id];
  if(h<=0) return;
  S.pets.hunger[id]=Math.max(0,h-1);                     /* -1 per 30s → ~50 min full→empty */
  if(S.pets.hunger[id]===0){
    toast(`${PET_DEFS[id].icon} Gutom na si <b>${petName(id)}</b>! Kalahati na lang ang aura — pakainin mo (🐾).`,'warn');
    computeStats(); updateHUD();
  }
  save();
},30000);

/* ---------- auto-loot: fed active pet vacuums nearby drops ---------- */
setInterval(()=>{
  if(!started||player.dead) return;
  const id=S.pets&&S.pets.active;
  if(!id||PET_DEFS[id].type==='mount'||!petFed(id)) return;
  const bagFull=S.bag.length>=60;
  for(const list of [drops,goldDrops,gearDrops]){
    if(list===gearDrops&&bagFull) continue;      /* don't vacuum gear into a full bag */
    for(const d of list){
      if(!d.magnet&&d.t>0.55&&Math.hypot(player.x-d.x,player.z-d.z)<13) d.magnet=true;
    }
  }
},600);

/* ---------- evolved pets look the part ---------- */
(function(){
  const _rpm=refreshPetMesh;
  refreshPetMesh=function(){
    _rpm();
    const id=S.pets&&S.pets.active;
    if(petMesh&&id&&S.pets.evolved.includes(id)){
      petMesh.scale.setScalar(id==='kalabaw'?1.12:1.25);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.035,6,20),
        new THREE.MeshBasicMaterial({color:0xffd94a,transparent:true,opacity:0.75,depthWrite:false}));
      ring._isFx=true; ring.rotation.x=Math.PI/2; ring.position.y=0.12;
      petMesh.add(ring);
    }
  };
})();

/* ---------- feeding: cook a dish straight into the pet, or raw fish ---------- */
const PET_FAVES={sarimanok:'escabeche', tarsier:'inihaw', paniki:'sinigang', kalabaw:'kinilaw',
                 baby_bakunawa:'halabos', munting_minokawa:'escabeche', anak_sarangay:'halabos'};
function openPetFeed(id){
  const d=PET_DEFS[id], fave=PET_FAVES[id];
  const fishRows=Object.entries(FISH_DEFS).filter(([fid])=>S.inv[fid]>0).map(([fid,f])=>`
    <div class="fr-row"><span style="font-size:20px">${f.icon}</span>
      <div class="fr-info"><b>${f.name} (hilaw)</b><i>+30 busog · +25 pet XP · meron ka: ${fmt(S.inv[fid])}</i></div>
      <button class="mini-btn" data-fish="${fid}">IPAKAIN</button></div>`).join('');
  showModal(`<div class="modal-emoji">${d.icon}</div><div class="modal-title">Pakainin si ${petName(id)}</div>
    <div style="font-size:11px;color:#8a80a2;text-align:center;margin-bottom:6px">
      Busog: <b style="color:${(S.pets.hunger[id]||0)>30?'#8aff9a':'#ff8a6a'}">${Math.round(S.pets.hunger[id]||0)}%</b>
      · Paborito: <b>${(DISHES.find(x=>x.id===fave)||{}).icon||''} ${(DISHES.find(x=>x.id===fave)||{}).name||''}</b> (×2 pet XP!)</div>
    ${DISHES.map(dish=>{
      const can=canAfford({cost:dish.cost});
      const costTxt=Object.entries(dish.cost).map(([m,q])=>`${(MATERIALS[m]||FISH_DEFS[m]||{icon:'?'}).icon}${q}`).join(' ');
      return `<div class="fr-row" style="${can?'':'opacity:.45'}">
        <span style="font-size:20px">${dish.icon}</span>
        <div class="fr-info"><b>${dish.name}${dish.id===fave?' ⭐':''}</b><i>${costTxt} · busog 100% · +${dish.id===fave?240:120} pet XP</i></div>
        ${can?`<button class="mini-btn" data-dish="${dish.id}">LUTUIN</button>`:''}</div>`;}).join('')}
    ${fishRows||'<p style="font-size:11px;color:#8a80a2;text-align:center">Wala kang hilaw na isda — mangisda ka sa tabing-tubig! 🎣</p>'}
    <button class="modal-btn" onclick="openPets()">⬅ Bumalik</button>`);
  document.querySelectorAll('[data-dish]').forEach(b=>b.onclick=()=>{
    const dish=DISHES.find(x=>x.id===b.dataset.dish);
    if(!canAfford({cost:dish.cost})) return;
    for(const [m,q] of Object.entries(dish.cost)) S.inv[m]-=q;
    S.pets.hunger[id]=100;
    achEvent('cook',1);
    addPetXp(id, dish.id===PET_FAVES[id]?240:120);
    computeStats(); updateHUD(); SFX.loot();
    toast(`${d.icon} Kinain ni <b>${petName(id)}</b> ang ${dish.icon} ${dish.name}! ${dish.id===PET_FAVES[id]?'PABORITO NIYA ITO! ×2 XP!':'Busog na busog!'}`,'loot');
    save(); openPetFeed(id);
  });
  document.querySelectorAll('[data-fish]').forEach(b=>b.onclick=()=>{
    const fid=b.dataset.fish;
    if((S.inv[fid]||0)<1) return;
    S.inv[fid]--;
    S.pets.hunger[id]=Math.min(100,(S.pets.hunger[id]||0)+30);
    addPetXp(id,25);
    computeStats(); updateHUD(); SFX.loot();
    save(); openPetFeed(id);
  });
}
window.openPetFeed=openPetFeed;

/* ---------- Alaga v2 UI (replaces the old pet shop modal) ---------- */
function auraLine(id){
  const evolved=S.pets.evolved.includes(id), mult=petAuraMult(id);
  const L={dropRate:'Drop',xpGain:'XP',lifesteal:'Life Steal',critCh:'Crit',atkPct:'ATK',defPct:'DEF',hpPct:'HP'};
  const parts=(PET_AURAS[id]||[]).filter(([s,b,e])=>(evolved?e:b)>0)
    .map(([s,b,e])=>`+${((evolved?e:b)*mult).toFixed(1)}% ${L[s]||s}`);
  if(id==='kalabaw') parts.push(`SAKAY +${evolved?80:60}% bilis${petFed(id)?'':' (gutom: mas mabagal!)'}`);
  return parts.join(' · ')||'—';
}
function openPetsV2(){
  const owned=S.pets.owned||[];
  showModal(`<div class="modal-emoji">🐾</div><div class="modal-title">Mga Alaga at Sasakyan</div>
    ${Object.entries(PET_DEFS).map(([id,d])=>{
      const has=owned.includes(id), active=S.pets.active===id;
      if(!has&&d.bossOnly){
        return `<div class="fr-row" style="opacity:.55"><span style="font-size:22px">❓</span>
          <div class="fr-info"><b>???</b><i>Bihirang kasama mula kay ${ENEMY_DEFS[d.bossOnly]?ENEMY_DEFS[d.bossOnly].name:d.bossOnly} (World Boss) — 3% drop, siguradong makukuha sa ika-25 pagpatay.</i></div></div>`;
      }
      if(!has){
        return `<div class="fr-row"><span style="font-size:22px">${d.icon}</span>
          <div class="fr-info"><b>${d.name} ${d.type==='mount'?'(SASAKYAN)':''}</b><i>${d.desc}</i></div>
          <button class="mini-btn" data-buy="${id}">🪙 ${fmt(d.cost)}</button></div>`;
      }
      const x=petXpInto(id), h=Math.round(S.pets.hunger[id]||0), evolved=S.pets.evolved.includes(id);
      const xpPct=x.need?Math.round(x.into/x.need*100):100;
      const evo=PET_EVO[id];
      const evoTxt=(evo&&!evolved)?`<i style="color:#c9a24b">⬆ Ebolusyon (Lv${PET_EVO_LVL}): ${Object.entries(evo.need).map(([m,q])=>`${MATERIALS[m].icon}${q}`).join(' ')} → ${evo.name}</i>`:'';
      return `<div class="fr-row" style="flex-wrap:wrap;border:1px solid ${active?'rgba(201,162,75,.5)':'transparent'};border-radius:10px">
        <span style="font-size:22px">${d.icon}${evolved?'✨':''}</span>
        <div class="fr-info">
          <b>${petName(id)} ${d.type==='mount'?'(SASAKYAN)':''} — Lv ${x.l}${x.l>=PET_LVL_CAP?' MAX':''}</b>
          <div style="height:5px;background:#241a38;border-radius:3px;margin:3px 0"><div style="height:5px;width:${xpPct}%;background:linear-gradient(90deg,#7df0ff,#4aa8ff);border-radius:3px"></div></div>
          <div style="height:5px;background:#241a38;border-radius:3px;margin:3px 0"><div style="height:5px;width:${h}%;background:linear-gradient(90deg,${h>30?'#8aff9a,#4aaf5a':'#ff8a6a,#d84a3a'});border-radius:3px"></div></div>
          <i>🍖 Busog ${h}%${h===0?' — GUTOM! kalahating aura':''} · ${auraLine(id)}</i>
          ${evoTxt}
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${active
            ? (d.type==='mount'
               ? `<button class="mini-btn" data-ride="${id}">${S.pets.mounted?'BUMABA':'SAKYAN'}</button>`
               : `<button class="mini-btn sell" data-off="${id}">IBABA</button>`)
            : `<button class="mini-btn" data-on="${id}">GAMITIN</button>`}
          <button class="mini-btn" data-feed="${id}">🍲 PAKAININ</button>
          ${canEvolve(id)?`<button class="mini-btn" data-evo="${id}" style="background:linear-gradient(180deg,#ffd94a,#c98d1e);color:#241a08">⬆ I-EVOLVE</button>`:''}
        </div>
      </div>`;}).join('')}
    <p style="font-size:11px;color:#8a80a2;text-align:center">Ang aktibong alaga ay kumukuha ng XP mula sa mga pinapatay mo (12%), namumulot ng loot kapag busog, at lumalakas ang aura kada level (+2%). Pakainin sa 🍲 gamit ang mga lutuin!</p>
    <button class="modal-btn" onclick="closeModal()">Isara</button>`);
  document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.buy, d=PET_DEFS[id];
    if(S.gold<d.cost){ toast('Kulang ang ginto!','warn'); return; }
    S.gold-=d.cost; S.pets.owned.push(id); S.pets.active=id; S.pets.mounted=false; S.pets.hunger[id]=100;
    computeStats(); refreshPetMesh(); updateHUD(); save(); SFX.levelup();
    toast(`${d.icon} Nabili mo si <b>${d.name}</b>!`,'levelup'); openPetsV2();
  });
  document.querySelectorAll('[data-on]').forEach(b=>b.onclick=()=>{
    S.pets.active=b.dataset.on; S.pets.mounted=false;
    computeStats(); refreshPetMesh(); save(); openPetsV2();
  });
  document.querySelectorAll('[data-off]').forEach(b=>b.onclick=()=>{
    S.pets.active=null; S.pets.mounted=false;
    computeStats(); refreshPetMesh(); save(); openPetsV2();
  });
  document.querySelectorAll('[data-ride]').forEach(b=>b.onclick=()=>{
    S.pets.mounted=!S.pets.mounted;
    computeStats(); save(); SFX.dodge();
    toast(S.pets.mounted?'🐃 Sakay ka na! Bilisan mo!':'Bumaba ka sa kalabaw.','');
    openPetsV2();
  });
  document.querySelectorAll('[data-feed]').forEach(b=>b.onclick=()=>openPetFeed(b.dataset.feed));
  document.querySelectorAll('[data-evo]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.evo, evo=PET_EVO[id];
    if(!canEvolve(id)) return;
    for(const [m,q] of Object.entries(evo.need)) S.inv[m]-=q;
    S.pets.evolved.push(id);
    computeStats(); refreshPetMesh(); updateHUD(); save();
    SFX.levelup(); screenShake(0.3,0.5);
    toast(`✨ <b>EBOLUSYON!</b> Si ${PET_DEFS[id].name} ay naging <b>${evo.name}</b>!`,'levelup');
    openPetsV2();
  });
}
openPets=openPetsV2;
window.openPets=openPetsV2;
(function(){ const b=$('btn-pets'); if(b) b.onclick=openPetsV2; })();

/* 🐾 Alaga rail entry: added in exactly ONE place — leftRail() below appends a
   single data-nav="pets" button. An earlier copy here also appended an Alaga
   button (without data-nav), so leftRail's dedupe guard didn't see it and the
   rail showed "Alaga" twice (owner screenshot). Removed the duplicate. */


/* ================================================================
   PHASE 7B MODULE — MGA BITUIN NG AGIMAT (Talent Tree)
   Unlocks Lv30 · 1 pt/level (30→70) + finite achievement bonuses ·
   3 Baybayin constellations · capstones (only one active) ·
   respec at the Grand Tiangge. Deterministic — no RNG nodes.
   ================================================================ */

/* ---------- state ---------- */
(function(){ if(!S.talents) S.talents={u:{}}; S.talents.u=S.talents.u||{}; })();

/* ---------- definitions ---------- */
const TAL_BONUS_ACH=['b1','b10','e50','k2000','set6'];   /* +1 pt each, finite */
const TAL_BRANCHES=[
 {id:'ka', glyph:'ᜃ', name:'KALAKASAN', col:'#ff9a4a', desc:'Ang dugo ng mandirigma.', nodes:[
   {id:'ka1', cost:1, icon:'⚔️', name:'Lakas ng Braso',  desc:'+4% ATK',                 eff:{atkPct:4}},
   {id:'ka2', cost:1, icon:'🎯', name:'Talas ng Mata',   desc:'+6% Crit Damage',         eff:{critDmg:6}},
   {id:'ka3', cost:3, icon:'🔥', name:'Init ng Dugo',    desc:'+4% Crit Chance',         eff:{critCh:4}, notable:true},
   {id:'ka4', cost:1, icon:'⚔️', name:'Bagsik',          desc:'+4% ATK',                 eff:{atkPct:4}},
   {id:'ka5', cost:1, icon:'⚡', name:'Kislap ng Kamay', desc:'+5% Cooldown Reduction',  eff:{cdr:5}},
   {id:'ka6', cost:3, icon:'💢', name:'Ulan ng Bakal',   desc:'+7% ATK',                 eff:{atkPct:7}, notable:true},
   {id:'ka7', cost:1, icon:'🎯', name:'Sugat na Malalim',desc:'+8% Crit Damage',         eff:{critDmg:8}},
   {id:'ka8', cost:1, icon:'⚔️', name:'Kamao ng Bayani', desc:'+5% ATK',                 eff:{atkPct:5}},
   {id:'ka9', cost:5, icon:'👑', name:'DUGONG BAYANI',   desc:'Kada ika-5 atake mo ay SIGURADONG CRIT.', capstone:true},
 ]},
 {id:'bl', glyph:'ᜊ', name:'BALUTI', col:'#8aff9a', desc:'Ang tibay ng kalabaw.', nodes:[
   {id:'bl1', cost:1, icon:'🛡️', name:'Balat na Makapal',desc:'+5% DEF',                eff:{defPct:5}},
   {id:'bl2', cost:1, icon:'❤️', name:'Puso ng Bundok',  desc:'+5% Max HP',              eff:{hpPct:5}},
   {id:'bl3', cost:3, icon:'🌵', name:'Tinik na Balat',  desc:'−7% damage na natatanggap', eff:{dmgRed:7}, notable:true},
   {id:'bl4', cost:1, icon:'🛡️', name:'Sandata ng Lupa', desc:'+5% DEF',                eff:{defPct:5}},
   {id:'bl5', cost:1, icon:'❤️', name:'Hininga ng Ugat', desc:'+6% Max HP',              eff:{hpPct:6}},
   {id:'bl6', cost:3, icon:'🌿', name:'Halaman ng Buhay',desc:'Regen 2% HP kada 3s (labas ng sagupaan)', notable:true},
   {id:'bl7', cost:1, icon:'🛡️', name:'Pader ng Bato',   desc:'+6% DEF',                eff:{defPct:6}},
   {id:'bl8', cost:1, icon:'❤️', name:'Dugong Matatag',  desc:'+6% Max HP',              eff:{hpPct:6}},
   {id:'bl9', cost:5, icon:'🐃', name:'BALAT-KALABAW',   desc:'Kapag mamamatay ka, mabubuhay ka sa 1 HP. (90s cooldown)', capstone:true},
 ]},
 {id:'dw', glyph:'ᜇ', name:'DIWA', col:'#7df0ff', desc:'Ang gabay ng mga anito.', nodes:[
   {id:'dw1', cost:1, icon:'💨', name:'Hakbang ng Usa',  desc:'+4% bilis ng takbo',      eff:{spdPct:4}},
   {id:'dw2', cost:1, icon:'🍀', name:'Pabor ng Kapalaran',desc:'+8% Drop Rate',         eff:{dropRate:8}},
   {id:'dw3', cost:3, icon:'🦅', name:'Mata ng Lawin',   desc:'+10% XP Gain',            eff:{xpGain:10}, notable:true},
   {id:'dw4', cost:1, icon:'🌿', name:'Kamay ng Magsasaka',desc:'+12% bilis ng forage',  eff:{forageSpd:12}},
   {id:'dw5', cost:1, icon:'🍀', name:'Ngiti ng Diwata', desc:'+8% Drop Rate',           eff:{dropRate:8}},
   {id:'dw6', cost:3, icon:'🌬️', name:'Hininga ng Diwata',desc:'+8% Cooldown Reduction', eff:{cdr:8}, notable:true},
   {id:'dw7', cost:1, icon:'💨', name:'Alon ng Hangin',  desc:'+4% bilis ng takbo',      eff:{spdPct:4}},
   {id:'dw8', cost:1, icon:'📜', name:'Aral ng Ninuno',  desc:'+8% XP Gain',             eff:{xpGain:8}},
   {id:'dw9', cost:5, icon:'✨', name:'GABAY NI BATHALA',desc:'Mabubuhay ka muli nang isang beses kada dungeon (50% HP).', capstone:true},
 ]},
];
const TAL_ALL={}; TAL_BRANCHES.forEach(b=>b.nodes.forEach((n,i)=>{ n.branch=b.id; n.tier=i; TAL_ALL[n.id]=n; }));

/* ---------- points math ---------- */
function talPointsTotal(){
  let p=S.level>=30?Math.min(41,S.level-29):0;
  if(S.ach&&S.ach.u) for(const a of TAL_BONUS_ACH) if(S.ach.u[a]) p++;
  return p;
}
function talSpent(){ let s=0; for(const id in S.talents.u) if(S.talents.u[id]&&TAL_ALL[id]) s+=TAL_ALL[id].cost; return s; }
function talFree(){ return talPointsTotal()-talSpent(); }
function talHas(id){ return !!S.talents.u[id]; }
function talCapstone(){ for(const id in S.talents.u) if(S.talents.u[id]&&TAL_ALL[id]&&TAL_ALL[id].capstone) return id; return null; }
function talCanLearn(n){
  if(talHas(n.id)) return {ok:false,why:'Natutunan na.'};
  if(S.level<30) return {ok:false,why:'Bubukas sa Level 30.'};
  if(n.tier>0){ const prev=TAL_BRANCHES.find(b=>b.id===n.branch).nodes[n.tier-1]; if(!talHas(prev.id)) return {ok:false,why:'Kailangan muna: '+prev.name}; }
  if(n.capstone&&talCapstone()) return {ok:false,why:'Isang capstone lang ang maaaring maging aktibo. Mag-respec para magpalit.'};
  if(talFree()<n.cost) return {ok:false,why:`Kulang ang puntos (${talFree()}/${n.cost}).`};
  return {ok:true};
}
function talStat(stat){
  let v=0;
  for(const id in S.talents.u){ const n=S.talents.u[id]&&TAL_ALL[id]; if(n&&n.eff&&n.eff[stat]) v+=n.eff[stat]; }
  return v;
}

/* ---------- stat hooks ---------- */
(function(){
  const _cs=computeStats;
  computeStats=function(){
    _cs();
    if(talSpent()===0) return;
    P.atk=Math.round(P.atk*(1+talStat('atkPct')/100));
    P.def=Math.round(P.def*(1+talStat('defPct')/100));
    P.maxHp=Math.round(P.maxHp*(1+talStat('hpPct')/100));
    P.spd*=(1+talStat('spdPct')/100);
    P.critCh=Math.min(75,P.critCh+talStat('critCh'));
    P.critDmg+=talStat('critDmg');
    P.cdr=Math.min(50,P.cdr+talStat('cdr'));
    P.dropRate+=talStat('dropRate');
    P.xpGain+=talStat('xpGain');
    P.forageSpd+=talStat('forageSpd');
    if(S.hp>P.maxHp) S.hp=P.maxHp;
  };
})();

let _talLastHurt=0, _balatReadyAt=0;
/* Dugong Bayani — every 5th hit is a guaranteed crit */
(function(){
  let hits=0;
  const _rd=rollDamage;
  rollDamage=function(mult,forceCrit){
    if(talHas('ka9')){ hits=(hits+1)%5; if(hits===0) forceCrit=true; }
    _talLastHurt=nowS();                       /* attacking = in combat */
    return _rd.call(this,mult,forceCrit);
  };
})();

/* Tinik na Balat (−dmg) + Balat-Kalabaw + Gabay ni Bathala + combat timestamp */
(function(){
  const _hp=hurtPlayer;
  hurtPlayer=function(dmg,opts={}){
    const red=talStat('dmgRed');
    if(red>0) dmg=Math.max(1,Math.round(dmg*(1-red/100)));
    const wasDead=player.dead;
    _hp.call(this,dmg,opts);
    _talLastHurt=nowS();
    if(!wasDead&&player.dead){
      const t=nowS();
      if(talHas('dw9')&&DGN.active&&!DGN._gabayUsed){
        DGN._gabayUsed=true;
        player.dead=false; player.deadT=0;
        if(player.mesh){ player.mesh.scale.setScalar(1); player.mesh.visible=true; }
        S.hp=Math.round(P.maxHp*0.5); player.iframesUntil=t+2;
        fxRing(player.x,player.z,0xffe9a0,0.5,6,0.9); SFX.levelup();
        toast('✨ <b>GABAY NI BATHALA!</b> Itinayo ka muli ng liwanag — ipagpatuloy ang laban!','levelup');
        updateHUD();
      } else if(talHas('bl9')&&t>=_balatReadyAt){
        _balatReadyAt=t+90;
        player.dead=false; player.deadT=0;
        if(player.mesh){ player.mesh.scale.setScalar(1); player.mesh.visible=true; }
        S.hp=1; player.iframesUntil=t+1.5;
        fxRing(player.x,player.z,0x8aff9a,0.5,5,0.8); SFX.heal(); screenShake(0.25,0.4);
        toast('🐃 <b>BALAT-KALABAW!</b> Tinanggihan ng iyong katawan ang kamatayan! (1 HP)','warn');
        updateHUD();
      }
    }
  };
})();
/* fresh Gabay charge per dungeon run */
(function(){
  const _fd=finishDungeon;
  finishDungeon=function(){ DGN._gabayUsed=false; return _fd.apply(this,arguments); };
})();

/* Halaman ng Buhay — out-of-combat regen */
setInterval(()=>{
  if(!started||player.dead||!talHas('bl6')) return;
  if(nowS()-_talLastHurt<5||S.hp>=P.maxHp) return;
  S.hp=Math.min(P.maxHp,S.hp+Math.max(1,Math.round(P.maxHp*0.02)));
  updateHUD();
},3000);

/* ---------- UI — constellation board ---------- */
(function(){
  const css=document.createElement('style');
  css.textContent=`
  #tal{position:fixed;inset:0;z-index:118;display:none;flex-direction:column;
    background:radial-gradient(ellipse at 30% 20%, #1c1740 0%, #0c0920 55%, #060412 100%)}
  #tal.open{display:flex}
  #tal::before{content:'';position:absolute;inset:0;pointer-events:none;opacity:.5;
    background-image:radial-gradient(1.5px 1.5px at 12% 30%,#fff,transparent),radial-gradient(1px 1px at 34% 70%,#cfe2ff,transparent),
    radial-gradient(1.5px 1.5px at 58% 15%,#ffe9a0,transparent),radial-gradient(1px 1px at 76% 55%,#fff,transparent),
    radial-gradient(1.5px 1.5px at 90% 25%,#cfe2ff,transparent),radial-gradient(1px 1px at 20% 85%,#fff,transparent),
    radial-gradient(1px 1px at 66% 88%,#ffe9a0,transparent),radial-gradient(1.5px 1.5px at 44% 45%,#fff,transparent)}
  .tal-head{display:flex;align-items:center;gap:12px;padding:12px 18px;border-bottom:1px solid rgba(201,162,75,.3)}
  .tal-title{font:800 16px system-ui;color:#f0d58c;letter-spacing:2px}
  .tal-pts{font:800 13px system-ui;color:#7df0ff;background:rgba(125,240,255,.1);border:1px solid rgba(125,240,255,.35);border-radius:9px;padding:5px 12px}
  .tal-x{margin-left:auto;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:9px;color:#cbbfe0;font-size:16px;width:32px;height:32px;cursor:pointer}
  .tal-body{flex:1;display:flex;gap:8px;justify-content:center;overflow:auto;padding:14px 10px 120px}
  @media(max-height:480px){
    .tal-head{padding:6px 12px}
    .tal-node{width:42px;height:42px;font-size:18px}
    .tal-node.notable{width:48px;height:48px;font-size:20px}
    .tal-node.capstone{width:58px;height:58px;font-size:25px}
    .tal-link{height:9px}
    .tal-glyph{font-size:22px}
    .tal-body{padding:8px 8px 110px}
  }
  .tal-col{width:min(210px,31vw);display:flex;flex-direction:column;align-items:center}
  .tal-bhead{text-align:center;margin-bottom:8px}
  .tal-glyph{font-size:30px;line-height:1}
  .tal-bname{font:800 12px system-ui;letter-spacing:3px}
  .tal-bdesc{font:600 9.5px system-ui;color:#8a80a2}
  .tal-link{width:3px;height:16px;background:rgba(255,255,255,.12);border-radius:2px}
  .tal-link.on{background:linear-gradient(180deg,#ffd94a,#c98d1e);box-shadow:0 0 8px rgba(255,217,74,.6)}
  .tal-node{position:relative;width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    font-size:22px;cursor:pointer;border:2px solid rgba(255,255,255,.16);background:rgba(255,255,255,.05);transition:transform .12s}
  .tal-node.notable{width:60px;height:60px;font-size:26px}
  .tal-node.capstone{width:72px;height:72px;font-size:32px;border-radius:18px}
  .tal-node.avail{border-color:#7df0ff;box-shadow:0 0 12px rgba(125,240,255,.35);animation:talPulse 1.8s infinite}
  .tal-node.learned{border-color:#ffd94a;background:radial-gradient(circle,rgba(201,162,75,.35),rgba(201,162,75,.08));box-shadow:0 0 16px rgba(255,217,74,.45)}
  .tal-node.locked{opacity:.38;filter:grayscale(.6)}
  .tal-node.sel{transform:scale(1.14)}
  .tal-cost{position:absolute;bottom:-4px;right:-4px;background:#241a38;border:1px solid #4a3f66;border-radius:8px;
    font:800 9.5px system-ui;color:#ffe9b0;padding:1px 5px}
  @keyframes talPulse{0%,100%{box-shadow:0 0 10px rgba(125,240,255,.25)}50%{box-shadow:0 0 18px rgba(125,240,255,.6)}}
  .tal-detail{position:fixed;left:50%;transform:translateX(-50%);bottom:12px;width:min(480px,94vw);z-index:119;
    background:linear-gradient(160deg,#221a3d,#120d26);border:1px solid rgba(201,162,75,.45);border-radius:14px;padding:12px 16px;display:none}
  .tal-detail.open{display:block}
  .tal-dname{font:800 14px system-ui;color:#ffe9b0}
  .tal-ddesc{font:600 12px system-ui;color:#cbbfe0;margin:4px 0}
  .tal-dwhy{font:600 11px system-ui;color:#ff8a6a}
  .tal-learn{margin-top:8px;width:100%;padding:10px;border:none;border-radius:10px;font:800 13px system-ui;cursor:pointer;
    background:linear-gradient(180deg,#ffd94a,#c98d1e);color:#241a08}
  .tal-learn:disabled{background:#3a3150;color:#8a80a2;cursor:default}
  .tal-respec{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);border-radius:9px;color:#cbbfe0;
    font:700 11px system-ui;padding:6px 10px;cursor:pointer}
  `;
  document.head.appendChild(css);

  const ov=document.createElement('div');
  ov.id='tal';
  ov.innerHTML=`<div class="tal-head">
      <span class="tal-title">✨ MGA BITUIN NG AGIMAT</span>
      <span class="tal-pts" id="tal-pts"></span>
      <button class="tal-respec" id="tal-respec">🔄 Respec</button>
      <button class="tal-x" id="tal-x">✕</button>
    </div>
    <div class="tal-body" id="tal-body"></div>
    <div class="tal-detail" id="tal-detail"></div>`;
  document.body.appendChild(ov);

  let sel=null;
  function render(){
    $('tal-pts').textContent=S.level<30?'🔒 Bubukas sa Lv30':`⭐ ${talFree()} puntos`;
    $('tal-body').innerHTML=TAL_BRANCHES.map(b=>`
      <div class="tal-col">
        <div class="tal-bhead">
          <div class="tal-glyph" style="color:${b.col}">${b.glyph}</div>
          <div class="tal-bname" style="color:${b.col}">${b.name}</div>
          <div class="tal-bdesc">${b.desc}</div>
        </div>
        ${b.nodes.map((n,i)=>{
          const learned=talHas(n.id), avail=!learned&&talCanLearn(n).ok;
          const cls=(n.capstone?'capstone ':n.notable?'notable ':'')+(learned?'learned':avail?'avail':'locked')+(sel===n.id?' sel':'');
          return (i>0?`<div class="tal-link ${learned?'on':''}"></div>`:'')+
            `<div class="tal-node ${cls}" data-tal="${n.id}">${n.icon}<span class="tal-cost">${n.cost}</span></div>`;
        }).join('')}
      </div>`).join('');
    $('tal-body').querySelectorAll('[data-tal]').forEach(el=>el.onclick=()=>{ sel=el.dataset.tal; render(); detail(); });
    detail();
  }
  function detail(){
    const box=$('tal-detail');
    if(!sel){ box.classList.remove('open'); return; }
    const n=TAL_ALL[sel], can=talCanLearn(n), learned=talHas(n.id);
    box.classList.add('open');
    box.innerHTML=`<div class="tal-dname">${n.icon} ${n.name} ${n.capstone?'· CAPSTONE':n.notable?'· NOTABLE':''} · ${n.cost} pts</div>
      <div class="tal-ddesc">${n.desc}</div>
      ${learned?'<div class="tal-ddesc" style="color:#8aff9a">✔ Natutunan na</div>':can.ok?'':`<div class="tal-dwhy">${can.why}</div>`}
      ${!learned?`<button class="tal-learn" id="tal-learn" ${can.ok?'':'disabled'}>MATUTUNAN (${n.cost} pts)</button>`:''}`;
    const lb=$('tal-learn');
    if(lb) lb.onclick=()=>{
      const c=talCanLearn(n); if(!c.ok) return;
      S.talents.u[n.id]=1;
      computeStats(); updateHUD(); save();
      SFX.levelup(); toast(`✨ Natutunan: <b>${n.name}</b>!`,'levelup');
      render();
    };
  }
  function talOpen(){ ov.classList.add('open'); sel=null; render(); }
  function talClose(){ ov.classList.remove('open'); }
  window.openTalents=talOpen;
  $('tal-x').onclick=talClose;
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&ov.classList.contains('open')) talClose(); });
  $('tal-respec').onclick=()=>{
    const spent=talSpent();
    if(!spent){ toast('Wala ka pang natutunang bituin.','warn'); return; }
    if(!inTown(player.x,player.z)){ toast('🏮 Pumunta sa Grand Tiangge — doon isinasagawa ng Babaylan ang paglilinis ng mga bituin.','warn'); return; }
    const cost=250*spent;
    if(S.gold<cost){ toast(`Kulang ang ginto! Kailangan: 🪙 ${fmt(cost)}`,'warn'); return; }
    if(!confirm(`Burahin ang LAHAT ng bituin (${spent} pts) sa halagang 🪙 ${fmt(cost)}?`)) return;
    S.gold-=cost; S.talents.u={};
    computeStats(); updateHUD(); save();
    toast('🔄 Nilinis ng Babaylan ang iyong mga bituin. Pumili muli!','');
    render();
  };

  /* hidden HUD button (menu system mirrors it) + ☰ tile */
  const hb=document.createElement('button');
  hb.className='menu-btn'; hb.id='btn-talents'; hb.title='Mga Bituin ng Agimat'; hb.textContent='✨';
  hb.onclick=talOpen;
  (document.getElementById('menu-tray')||document.querySelector('.hud-right')).appendChild(hb);
  const grid=document.querySelector('#mainmenu .mm-grid');
  if(grid){
    const t=document.createElement('div');
    t.className='mm-tile'; t.dataset.mm='btn-talents';
    t.innerHTML='<b>✨</b><span>Mga Bituin</span>';
    t.onclick=()=>{ document.getElementById('mainmenu').classList.remove('open'); talOpen(); };
    grid.appendChild(t);
  }
  /* unspent-points badge (mirrored by ☰ dot logic) */
  setInterval(()=>{
    const show=started&&S.level>=30&&talFree()>0;
    let em=hb.querySelector('.badge');
    if(show&&!em){ em=document.createElement('em'); em.className='badge'; em.textContent='!'; hb.appendChild(em); }
    if(!show&&em) em.remove();
  },3000);
  /* T hotkey */
  document.addEventListener('keydown',e=>{
    const ae=document.activeElement, typing=ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA');
    if((e.key==='t'||e.key==='T')&&started&&!typing&&!rebinding){
      ov.classList.contains('open')?talClose():talOpen();
    }
  });
})();

/* ---------- level-30 unlock fanfare ---------- */
(function(){
  const _gx=gainXP;
  gainXP=function(){
    const before=S.level;
    _gx.apply(this,arguments);
    if(before<30&&S.level>=30&&!S.talents._welcomed){
      S.talents._welcomed=1; save();
      toast('✨ <b>BUMUKAS ANG MGA BITUIN NG AGIMAT!</b> Pindutin ang T o buksan sa ☰ Menu — may talent point ka na!','levelup');
      SFX.levelup();
    }
  };
})();


/* ================================================================
   BARANGAY LIWANAG BEAUTY PASS — town glow-up per concept art
   (img/concept_barangay_liwanag.jpg + img/concept_grand_tiangge.jpg)
   Lutuan fire pit w/ palayok + benches · Soul Portal stone arch w/
   Anito faces + floating Baybayin glyphs · bioluminescent rune
   stones · ambient nipa homes · plaza fireflies + anito dust
   ================================================================ */
(function barangayLiwanag(){
  const g=new THREE.Group();
  const ty0=groundY(GATE_CX,GATE_CZ);
  const stone=Mstone(0xd8d0c8), stoneDark=Mstone(0xa8a096), wood=Mwood(0xc8a878);

  /* ---------- 1. LUTUAN — communal fire pit (upgrade around the cook fire) ---------- */
  const CX=68.5*TILE, CZ=40.2*TILE, cy=groundY(CX,CZ);
  /* stone ring platform */
  const ring=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.5,0.35,14), stoneDark);
  ring.position.set(CX,cy+0.17,CZ); ring.receiveShadow=true; g.add(ring);
  /* giant clay palayok on tripod */
  const potM=new THREE.MeshStandardMaterial({color:0x8a4a2e,roughness:0.85});
  const palayok=new THREE.Mesh(new THREE.SphereGeometry(0.9,10,8), potM);
  palayok.scale.y=0.8; palayok.position.set(CX,cy+2.05,CZ); palayok.castShadow=true; g.add(palayok);
  const lid=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.5,0.16,9), potM);
  lid.position.set(CX,cy+2.8,CZ); g.add(lid);
  for(let i=0;i<3;i++){
    const a=i/3*Math.PI*2;
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,2.2,5), M(0x3a3026));
    leg.position.set(CX+Math.sin(a)*0.85,cy+1.1,CZ+Math.cos(a)*0.85);
    leg.rotation.z=Math.sin(a)*0.32; leg.rotation.x=-Math.cos(a)*0.32; g.add(leg);
  }
  /* magical blue-orange flame (blue core + orange skirt) */
  const bm=new THREE.MeshStandardMaterial({color:0x5ac8ff,emissive:0x2a9aff,emissiveIntensity:2.4,transparent:true,opacity:0.85}); bm._isFx=true;
  const blueCore=new THREE.Mesh(new THREE.ConeGeometry(0.28,0.9,6), bm);
  blueCore.position.set(CX,cy+1.0,CZ); g.add(blueCore);
  setInterval(()=>{ blueCore.scale.y=1+Math.sin(nowS()*9)*0.22; blueCore.rotation.y-=0.09; },60);
  /* steam wisps above the palayok */
  const steamGeo=new THREE.BufferGeometry(), sn=14, sp=new Float32Array(sn*3);
  for(let i=0;i<sn;i++){ sp[i*3]=CX+rnd(-0.3,0.3); sp[i*3+1]=cy+2.9+rnd(0,1.6); sp[i*3+2]=CZ+rnd(-0.3,0.3); }
  steamGeo.setAttribute('position',new THREE.BufferAttribute(sp,3));
  const steamMat=new THREE.PointsMaterial({color:0xe8e2da,size:0.3,transparent:true,opacity:0.5}); steamMat._isFx=true;
  const steam=new THREE.Points(steamGeo,steamMat); g.add(steam);
  setInterval(()=>{
    const a=steam.geometry.attributes.position.array;
    for(let i=0;i<sn;i++){ a[i*3+1]+=0.03; a[i*3]+=Math.sin(nowS()*2+i)*0.006;
      if(a[i*3+1]>cy+5){ a[i*3]=CX+rnd(-0.3,0.3); a[i*3+1]=cy+2.9; a[i*3+2]=CZ+rnd(-0.3,0.3); } }
    steam.geometry.attributes.position.needsUpdate=true;
  },60);
  /* wooden benches around the pit */
  for(let i=0;i<5;i++){
    const a=i/5*Math.PI*2+0.4;
    const bx=CX+Math.sin(a)*4.6, bz=CZ+Math.cos(a)*4.6, by=groundY(bx,bz);
    const seat=new THREE.Mesh(new THREE.BoxGeometry(2.0,0.16,0.55), wood);
    seat.position.set(bx,by+0.55,bz); seat.rotation.y=a+Math.PI/2; seat.castShadow=true; g.add(seat);
    for(const s of [-0.7,0.7]){
      const leg=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.5,0.45), Mwood(0x8a6a48));
      leg.position.set(bx+Math.cos(a)*s*0.9,by+0.25,bz-Math.sin(a)*s*0.9); leg.rotation.y=a+Math.PI/2; g.add(leg);
    }
  }
  bldRects.push({x0:CX-1.4,x1:CX+1.4,z0:CZ-1.4,z1:CZ+1.4});

  /* ---------- 2. SOUL PORTAL — grand stone archway around the town portal ---------- */
  const PX=PORTAL_TOWN.x, PZ=PORTAL_TOWN.z, py=groundY(PX,PZ);
  /* stepped stone base */
  for(let i=0;i<2;i++){
    const step=new THREE.Mesh(new THREE.CylinderGeometry(3.6-i*0.5,3.9-i*0.5,0.3,12), i?stone:stoneDark);
    step.position.set(PX,py+0.15+i*0.3,PZ); step.receiveShadow=true; g.add(step);
  }
  /* twin carved pillars w/ Anito faces */
  for(const s of [-1,1]){
    const pil=new THREE.Mesh(new THREE.BoxGeometry(1.1,5.6,1.1), stone);
    pil.position.set(PX+s*3.1,py+2.8,PZ); pil.castShadow=true; g.add(pil);
    /* anito face: brow + eyes + mouth carved blocks */
    const brow=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.18,0.18), stoneDark);
    brow.position.set(PX+s*3.1,py+4.5,PZ+0.58); g.add(brow);
    for(const e of [-0.22,0.22]){
      const em=new THREE.MeshStandardMaterial({color:0xbe7aff,emissive:0x8a3aff,emissiveIntensity:1.8,roughness:0.3}); em._isFx=true;
      const eye=new THREE.Mesh(new THREE.SphereGeometry(0.11,6,5), em);
      eye.position.set(PX+s*3.1+e,py+4.15,PZ+0.58); g.add(eye);
    }
    const mouth=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.12,0.14), stoneDark);
    mouth.position.set(PX+s*3.1,py+3.7,PZ+0.58); g.add(mouth);
    /* moss patches */
    const moss=new THREE.Mesh(new THREE.BoxGeometry(1.16,rnd(0.6,1.1),1.16), M(0x4a6a3a,{roughness:1}));
    moss.position.set(PX+s*3.1,py+0.9,PZ); g.add(moss);
  }
  /* lintel + keystone */
  const lintel=new THREE.Mesh(new THREE.BoxGeometry(7.6,0.9,1.2), stone);
  lintel.position.set(PX,py+5.9,PZ); lintel.castShadow=true; g.add(lintel);
  const keyM=new THREE.MeshStandardMaterial({color:0xd8b83a,emissive:0xc98d1e,emissiveIntensity:0.6,metalness:0.6,roughness:0.35}); keyM._isFx=true;
  const key=new THREE.Mesh(new THREE.ConeGeometry(0.55,0.8,4), keyM);
  key.position.set(PX,py+6.7,PZ); key.rotation.y=Math.PI/4; g.add(key);
  /* floating Baybayin glyphs orbiting the arch */
  const glyphSprites=[];
  const GLY=['\u1700','\u1702','\u1703','\u1707','\u170E','\u1706'];
  for(let i=0;i<6;i++){
    const cnv=document.createElement('canvas'); cnv.width=cnv.height=64;
    const c2=cnv.getContext('2d');
    c2.font='44px serif'; c2.textAlign='center'; c2.textBaseline='middle';
    c2.shadowColor='#be7aff'; c2.shadowBlur=14; c2.fillStyle='#e0c8ff';
    c2.fillText(GLY[i],32,34);
    const tex=new THREE.CanvasTexture(cnv);
    const sm=new THREE.SpriteMaterial({map:tex,transparent:true,opacity:0.9,depthWrite:false}); sm._isFx=true;
    const spr=new THREE.Sprite(sm);
    spr.scale.setScalar(0.9);
    g.add(spr); glyphSprites.push({spr,ph:i/6*Math.PI*2});
  }
  setInterval(()=>{
    const t=nowS();
    for(const gs of glyphSprites){
      const a=t*0.5+gs.ph;
      gs.spr.position.set(PX+Math.sin(a)*2.6, py+2.6+Math.sin(t*0.8+gs.ph*2)*1.3, PZ+Math.cos(a)*1.2);
      gs.spr.material.opacity=0.55+0.35*Math.sin(t*1.4+gs.ph);
    }
  },50);

  /* ---------- 3. bioluminescent Baybayin rune stones along the roads ---------- */
  const runeSpots=[[63,43.7],[70,43.7],[66.5,40],[66.5,47],[60,45.5],[73.5,41.5],[64,38.2],[69,49.3]];
  const runeMats=[];
  for(const [rx,rz] of runeSpots){
    const wx=rx*TILE, wz=rz*TILE, wy=groundY(wx,wz);
    const st=new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(0.32,0.5),0), stoneDark);
    st.position.set(wx,wy+0.3,wz); st.rotation.set(rnd(0,3),rnd(0,3),0); st.castShadow=true; g.add(st);
    const rm=new THREE.MeshStandardMaterial({color:0xbe7aff,emissive:0x7a2ad8,emissiveIntensity:1.2,roughness:0.4}); rm._isFx=true;
    runeMats.push(rm);
    const rune=new THREE.Mesh(new THREE.PlaneGeometry(0.34,0.34), rm);
    rune.position.set(wx,wy+0.62,wz); rune.rotation.x=-Math.PI/2; g.add(rune);
  }
  setInterval(()=>{ const p=0.9+0.5*Math.sin(nowS()*1.8); for(const m of runeMats) m.emissiveIntensity=p; },80);

  /* ---------- 4. ambient nipa homes (non-shop, fill the new space) ---------- */
  function home(bx,bz,rot){
    const hy=groundY(bx,bz), hg=new THREE.Group();
    const stilts=[[-1,-0.8],[1,-0.8],[-1,0.8],[1,0.8]];
    for(const [sx,sz] of stilts){
      const st=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.11,1.1,5), Mwood(0x7a5a3a));
      st.position.set(sx*1.1,0.55,sz*1.0); hg.add(st);
    }
    const floor=new THREE.Mesh(new THREE.BoxGeometry(2.9,0.14,2.4), wood);
    floor.position.y=1.15; hg.add(floor);
    const wall=new THREE.Mesh(new THREE.BoxGeometry(2.6,1.5,2.1), Mthatch(0xd8bc90));
    wall.position.y=1.95; wall.castShadow=true; hg.add(wall);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(2.4,1.5,4), Mthatch(0xb89868));
    roof.position.y=3.4; roof.rotation.y=Math.PI/4; roof.castShadow=true; hg.add(roof);
    const win=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.55,0.06), M(0x241a12));
    win.position.set(0,2.05,1.08); hg.add(win);
    const wl=new THREE.MeshStandardMaterial({color:0xffd98a,emissive:0xff9a2e,emissiveIntensity:0.9,roughness:0.5}); wl._isFx=true;
    const glow=new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.45), wl);
    glow.position.set(0,2.05,1.12); hg.add(glow);
    hg.position.set(bx,hy,bz); hg.rotation.y=rot;
    g.add(hg);
    bldRects.push({x0:bx-1.7,x1:bx+1.7,z0:bz-1.5,z1:bz+1.5});
  }
  home(59.4*TILE,41.8*TILE, 0.5);
  home(59.4*TILE,44.8*TILE, 1.1);
  home(74*TILE,  45.8*TILE,-0.6);
  home(64.3*TILE,49*TILE,   0.2);
  home(68.8*TILE,37.9*TILE, 2.8);

  /* ---------- 5. plaza fireflies + floating anito dust ---------- */
  const dustGeo=new THREE.BufferGeometry(), dn=42, dp=new Float32Array(dn*3);
  for(let i=0;i<dn;i++){ dp[i*3]=rnd(TOWN.x0,TOWN.x1); dp[i*3+1]=ty0+rnd(0.6,4.6); dp[i*3+2]=rnd(TOWN.z0,TOWN.z1); }
  dustGeo.setAttribute('position',new THREE.BufferAttribute(dp,3));
  const dustMat=new THREE.PointsMaterial({color:0xffe9a0,size:0.12,transparent:true,opacity:0.75,depthWrite:false}); dustMat._isFx=true;
  const dust=new THREE.Points(dustGeo,dustMat); g.add(dust);
  setInterval(()=>{
    const a=dust.geometry.attributes.position.array, t=nowS();
    for(let i=0;i<dn;i++){
      a[i*3+1]+=Math.sin(t*0.7+i)*0.004+0.003;
      a[i*3]+=Math.sin(t*0.4+i*2.1)*0.006;
      if(a[i*3+1]>ty0+5){ a[i*3]=rnd(TOWN.x0,TOWN.x1); a[i*3+1]=ty0+0.6; a[i*3+2]=rnd(TOWN.z0,TOWN.z1); }
    }
    dust.geometry.attributes.position.needsUpdate=true;
    dustMat.opacity=0.45+0.3*Math.sin(t*0.9);
  },70);

  /* ---------- 6. mossy path stones + ferns scattered on the plaza ---------- */
  const fern=M(0x3f7a44,{roughness:1});
  for(let i=0;i<26;i++){
    const fx=rnd(TOWN.x0+3,TOWN.x1-3), fz=rnd(TOWN.z0+3,TOWN.z1-3);
    /* keep clear of walkways hub */
    if(Math.abs(fx-GATE_CX)<3&&Math.abs(fz-GATE_CZ)<3) continue;
    const fy=groundY(fx,fz);
    if(i%3===0){
      const slab=new THREE.Mesh(new THREE.CylinderGeometry(rnd(0.4,0.7),rnd(0.5,0.8),0.12,7), i%2?stone:Mstone(0x9aa88e));
      slab.position.set(fx,fy+0.06,fz); slab.receiveShadow=true; g.add(slab);
    } else {
      const n=2+((i*7)%3);
      for(let j=0;j<n;j++){
        const blade=new THREE.Mesh(new THREE.ConeGeometry(0.08,rnd(0.5,0.9),4), fern);
        blade.position.set(fx+rnd(-0.4,0.4),fy+0.3,fz+rnd(-0.4,0.4));
        blade.rotation.set(rnd(-0.5,0.5),0,rnd(-0.5,0.5)); g.add(blade);
      }
    }
  }
  scene.add(g);
})();


/* ================================================================
   WORLD-SPEC LOADER — data-driven map decoration
   Drop artist props in /assets/world/<category>/*.glb and describe placements
   in /data/world-spec.json. Terrain/collision stays procedural;
   this layer is pure visuals + optional prop collision.

   world-spec.json format (array of entries):
   [
     { "model":"assets/world/trees/balete.glb",
       "tx":40, "ty":7,            // tile coords (×TILE=world units) — or "x"/"z" in world units
       "rot":1.57,                 // optional yaw radians (default 0)
       "height":9,                 // optional: scale so the prop is this many units tall
       "scale":1.2,                // optional: raw multiplier (ignored if height given)
       "collideR":1.4,             // optional: blocks movement in this radius
       "count":1, "jitter":0       // optional: scatter N copies within ±jitter tiles
     }, ...
   ]
   ================================================================ */
(function worldSpec(){
  fetch('data/world-spec.json').then(r=>{ if(!r.ok) throw 0; return r.json(); }).then(list=>{
    if(!Array.isArray(list)) return;
    const urls=[...new Set(list.map(e=>e.model))];
    return Promise.all(urls.map(u=>loadGLB(u).catch(()=>null))).then(()=>{
      let placed=0;
      for(const e of list){
        if(!MODEL_CACHE[e.model]) continue;
        const n=Math.max(1,e.count|0||1), jit=(e.jitter||0)*TILE;
        for(let i=0;i<n;i++){
          const bx=(e.x!=null?e.x:e.tx*TILE)+(n>1?rnd(-jit,jit):0);
          const bz=(e.z!=null?e.z:e.ty*TILE)+(n>1?rnd(-jit,jit):0);
          if(blockedTile(bx,bz)) continue;                    // never sink props in water/cliff
          const inst=instantiateGLB(e.model, e.height||null);
          if(!inst) continue;
          if(!e.height&&e.scale) inst.scale.setScalar(e.scale);
          inst.position.set(bx,groundY(bx,bz),bz);
          inst.rotation.y=(e.rot||0)+(n>1?rnd(0,6.28):0);
          scene.add(inst); placed++;
          if(window._zoneAdopt) window._zoneAdopt(inst);   // map-instancing bucket
          if(e.collideR) bldRects.push({x0:bx-e.collideR,x1:bx+e.collideR,z0:bz-e.collideR,z1:bz+e.collideR});
        }
      }
      if(placed) console.log('[world-spec] placed',placed,'props');
    });
  }).catch(()=>{});   // no spec file = silently skip (procedural look stays)
})();


/* ================================================================
   MANGKUKULAM SUPPORT MODULE — enemy bleed tick, kulam death-spread,
   GLB registration, catalog weapons, cosmetics
   ================================================================ */
/* enemy 🩸 bleed + 🪡 kulam aura tick (2%/s of max HP while bleeding) */
setInterval(()=>{
  if(!started) return;
  const t=nowS();
  for(const en of enemies){
    if(en.remote) continue;
    if(en.bleedUntil&&t<en.bleedUntil){
      en.hp-=Math.max(1,Math.round(en.maxHp*0.02));
      if(Math.random()<0.5) addLabel('🩸','hurt',en.x,groundY(en.x,en.z)+2,en.z,0.5);
      if(en.hp<=0) killEnemy(en);
    }
  }
},1000);
/* kulam spreads on death: nearby enemies inherit the curse */
(function(){
  const _ke=killEnemy;
  killEnemy=function(en){
    if(en.kulamUntil&&nowS()<en.kulamUntil){
      let n=0;
      for(const e2 of enemies){
        if(e2===en||e2.remote) continue;
        if(d2(e2.x,e2.z,en.x,en.z)<10*10){ e2.bleedUntil=nowS()+4; e2.kulamUntil=nowS()+6; n++; if(n>=3) break; }
      }
      if(n){ fxRing(en.x,en.z,0x9aff5a,0.5,7,0.5); addLabel('KUMALAT ANG SUMPA!','warn',en.x,groundY(en.x,en.z)+3,en.z,1); }
    }
    return _ke.apply(this,arguments);
  };
})();
/* hero GLB — the artist-made Mangkukulam model.
   Path comes from data/models/registry.json; this line is only the
   fallback for when the registry fetch failed. */
if(!MODELS.hero.mangkukulam) MODELS.hero.mangkukulam='assets/characters/kaykit/Mage.glb';   /* chibi update: witch recolor of the Mage */
loadGLB(MODELS.hero.mangkukulam).then(()=>{
  /* refresh mesh if the player is already a Mangkukulam */
  if(S.cls==='mangkukulam'&&started&&player.mesh){
    const old=player.mesh; const nm=buildHero('mangkukulam');
    nm.position.copy(old.position); scene.remove(old); scene.add(nm); player.mesh=nm;
  }
}).catch(()=>console.warn('mangkukulam.glb not found — procedural fallback'));
/* catalog weapons — Phase-5 rules: 3 tiers, class-locked */
CATALOG.push(
 {id:'w_kulam1', name:'Karayom ng Nayon',      icon:'🪡', slot:'mainhand', tier:1,  classes:['mangkukulam'], rarity:'common',
  main:'atk', mult:1.1, lore:'Karayom na hiniram sa mananahi — at hindi na isinauli.'},
 {id:'w_kulam2', name:'Munyeka ng Paghihiganti',icon:'🪆', slot:'mainhand', tier:15, classes:['mangkukulam'], rarity:'rare',
  main:'atk', mult:1.3, affixes:['lifesteal'], lore:'May buhok ng totoong tao sa loob. Huwag mong tanungin kung kanino.'},
 {id:'w_kulam3', name:'Puso ng Salamangka',    icon:'🖤', slot:'mainhand', tier:40, classes:['mangkukulam'], rarity:'epic',
  main:'atk', mult:1.5, affixes:['lifesteal','critCh'], lore:'Pinatigas na puso ng isang sinaunang bruha. Tumitibok pa rin ito tuwing kabilugan ng buwan.'}
);

/* ================================================================
   SKILL SYSTEM MODULE v1  (skill-system spec docs 00–10)
   Data-driven: 90 defs in data/skills/definitions.json.
   Generic effect executor — NO per-skill combat functions.
   Save-compatible: adds S.sk {learned,pts,spent,equipped,ver}; old
   saves auto-migrate with legacy skills mapped & points backfilled.
   ================================================================ */
(function skillSystem(){
  const DATA=GAME_DATA.skills;
  if(!DATA||!Array.isArray(DATA.skills)||!DATA.skills.length){ console.warn('skill defs missing — legacy skill system stays'); return; }
  const CFG=DATA.config||{}, DEFS={}, BYCLASS={};
  for(const d of DATA.skills){ DEFS[d.id]=d; (BYCLASS[d.classId]=BYCLASS[d.classId]||[]).push(d); }

  /* ---------- SKILL MANAGER: state, learning, respec ---------- */
  function pointsEarned(){ const first=CFG.firstPointAtLevel||2; return Math.max(0,S.level-first+1); }
  function ensureSk(){
    if(!S.sk){
      S.sk={learned:{},spent:0,equipped:[null,null,null],ver:1};
      /* migrate: old chars keep power — learn the legacy-equivalent core+2 free */
      const tree=BYCLASS[S.cls]||[];
      if(S.level>1&&tree.length){
        for(const d of tree){
          if(d.type!=='ultimate'&&S.level>=d.requiredLevel&&countLearned()<Math.min(3,1+Math.floor(S.level/5))){
            if(meetsReq(d)) { S.sk.learned[d.id]=1; S.sk.spent+=d.pointCost||1; }
          }
        }
        equipDefaults();
      }
    }
    if(!Array.isArray(S.sk.equipped)) S.sk.equipped=[null,null,null];
  }
  function countLearned(){ return Object.keys(S.sk.learned).length; }
  function skFree(){ ensureSk(); return Math.max(0,pointsEarned()-S.sk.spent); }
  function rankOf(id){ ensureSk(); return S.sk.learned[id]||0; }
  function meetsReq(d){
    if(S.level<d.requiredLevel) return false;
    if(d.requires) for(const rid in d.requires) if(rankOf(rid)<d.requires[rid]) return false;
    return true;
  }
  function canLearn(d){
    const r=rankOf(d.id);
    if(r>=d.maxRank) return {ok:false,why:'MAX RANK na'};
    if(S.level<d.requiredLevel) return {ok:false,why:'Level '+d.requiredLevel+' kailangan'};
    if(d.requires) for(const rid in d.requires) if(rankOf(rid)<d.requires[rid])
      return {ok:false,why:'Kailangan: '+(DEFS[rid]?DEFS[rid].name:rid)+' R'+d.requires[rid]};
    if(skFree()<(d.pointCost||1)) return {ok:false,why:'Kulang ang Skill Points'};
    return {ok:true};
  }
  function learnSkill(id){
    const d=DEFS[id]; if(!d||d.classId!==S.cls) return false;
    const c=canLearn(d); if(!c.ok){ toast('❌ '+c.why,'warn'); return false; }
    S.sk.learned[id]=rankOf(id)+1; S.sk.spent+=d.pointCost||1;
    if(d.type==='active'||d.type==='ultimate'){ const i=S.sk.equipped.indexOf(null); if(i>=0&&!S.sk.equipped.includes(id)) S.sk.equipped[i]=id; }
    applyPassives(); refreshSkillHUD(); save();
    toast('✨ Natutunan: <b>'+d.name+'</b> R'+S.sk.learned[id],'levelup'); SFX.skill&&SFX.skill();
    return true;
  }
  function respec(){
    ensureSk();
    const back=S.sk.spent;
    S.sk.learned={}; S.sk.spent=0; S.sk.equipped=[null,null,null];
    applyPassives(); refreshSkillHUD(); save();
    toast('♻️ Na-reset ang skills — nabawi ang <b>'+back+'</b> puntos.');
  }
  function equipDefaults(){
    const tree=(BYCLASS[S.cls]||[]).filter(d=>(d.type==='active'||d.type==='ultimate')&&rankOf(d.id)>0);
    S.sk.equipped=[null,null,null];
    tree.slice(0,3).forEach((d,i)=>S.sk.equipped[i]=d.id);
  }
  function equipSkill(id,slot){
    ensureSk(); const d=DEFS[id];
    if(!d||rankOf(id)<=0||(d.type!=='active'&&d.type!=='ultimate')) return;
    const cur=S.sk.equipped.indexOf(id); if(cur>=0) S.sk.equipped[cur]=null;
    S.sk.equipped[slot]=id; refreshSkillHUD(); save();
  }

  /* ---------- PASSIVES → computeStats integration ---------- */
  let PB={};  // passive bonuses cache
  function applyPassives(){
    ensureSk(); PB={};
    for(const id in S.sk.learned){
      const d=DEFS[id]; if(!d||d.type!=='passive') continue;
      const r=S.sk.learned[id];
      for(const e of d.effects){
        if(e.t==='pmod'){ PB[e.stat]=(PB[e.stat]||0)+e.val+(e.pr||0)*(r-1); }
        if(e.t==='cond'||e.t==='stack'||e.t==='regen'){ (PB._dyn=PB._dyn||[]).push({e,r}); }
      }
    }
    computeStats(); updateHUD();
  }
  const _cs_sk=computeStats;
  computeStats=function(){
    _cs_sk.apply(this,arguments);
    if(!S.sk) return;
    if(PB.maxHpPct) P.maxHp=Math.round(P.maxHp*(1+PB.maxHpPct/100));
    if(PB.atkPct)   P.atk=Math.round(P.atk*(1+PB.atkPct/100));
    if(PB.defPct)   P.def=Math.round(P.def*(1+PB.defPct/100));
    if(PB.critCh)   P.critCh=Math.min(75,P.critCh+PB.critCh);
    if(PB.critDmg)  P.critDmg+=PB.critDmg;
    if(PB.cdr)      P.cdr=Math.min(50,P.cdr+PB.cdr);
    if(PB.moveSpd)  P.spd*=(1+PB.moveSpd/100);
    if(PB.dropRate) P.dropRate+=PB.dropRate;
    if(PB.xpGain)   P.xpGain+=PB.xpGain;
    if(PB.aggro)    P.aggroMul=1-Math.min(60,PB.aggro)/100; else P.aggroMul=1;
    /* timed buffs from active skills */
    const _bv=(st)=>{ const b=player._skBuffs&&player._skBuffs[st]; return (b&&nowS()<b.until)?b.val:0; };
    const am=_bv('atkMult'); if(am) P.atk=Math.round(P.atk*(1+am/100));
    const hs=_bv('haste');  if(hs) P.spd*=(1+hs/100);
    /* dynamic combat-state bonuses */
    const t=nowS();
    if(PB._dyn) for(const {e,r} of PB._dyn){
      if(e.t==='cond'&&e.when==='hpBelow'&&S.hp<P.maxHp*e.thresh){
        const v=e.val+(e.pr||0)*(r-1);
        if(e.stat==='dr') P._skDr=(P._skDr||0)+v;
        if(e.stat==='atkPct') P.atk=Math.round(P.atk*(1+v/100));
      }
      if(e.t==='cond'&&e.when==='still'&&(t-(player._lastMoveT||0))>e.thresh){
        P.atk=Math.round(P.atk*(1+(e.val+(e.pr||0)*(r-1))/100));
      }
      if(e.t==='stack'){
        const st=player._skStacks&&player._skStacks[e.name];
        if(st&&st.n>0&&t<st.until) P.atk=Math.round(P.atk*(1+st.n*(e.per+(e.pr||0)*(r-1))/100));
      }
    }
  };

  /* ---------- STATUS BUFF STATE on player ---------- */
  player._skBuffs={};   // stat -> {val,until}
  player._skStacks={};  // name -> {n,until}
  function addBuff(stat,val,dur){ player._skBuffs[stat]={val,until:nowS()+dur}; }
  function buffVal(stat){ const b=player._skBuffs[stat]; return (b&&nowS()<b.until)?b.val:0; }
  function addStack(name,max,dur){ const s=player._skStacks[name]||{n:0,until:0}; s.n=Math.min(max,s.n+1); s.until=nowS()+dur; player._skStacks[name]=s; computeStats(); }

  /* damage-reduction & reflect hook */
  const _hp_sk=hurtPlayer;
  hurtPlayer=function(dmg,opts={}){
    const dr=(buffVal('dr')||0)+((P&&P._skDr)||0);
    P._skDr=0;
    if(dr>0) dmg=Math.max(1,Math.round(dmg*(1-Math.min(80,dr)/100)));
    const refl=buffVal('reflect');
    if(refl>0&&opts._srcEn&&!opts._refl){ hitEnemyRaw(opts._srcEn,Math.max(1,Math.round(dmg*refl/100))); }
    /* fury: taking damage builds stacks */
    if(S.sk) for(const id in S.sk.learned){ const d=DEFS[id];
      if(d&&d.type==='passive') for(const e of d.effects) if(e.t==='stack'&&(e.on==='both')) addStack(e.name,e.max,e.dur); }
    player._lastHurtT=nowS();
    return _hp_sk.apply(this,arguments);
  };
  function hitEnemyRaw(en,flat){ en.hp-=flat; addLabel('-'+flat,'',en.x,groundY(en.x,en.z)+2,en.z,0.7); if(en.hp<=0&&!en.remote) killEnemy(en); }

  /* haste + burn-on-hit + stack building via hitEnemy */
  const _he_sk=hitEnemy;
  hitEnemy=function(en,mult,opts={}){
    /* marked target bonus */
    if(en._skMarkUntil&&nowS()<en._skMarkUntil){
      mult*=1+((en._skMarkPct||25)+(PB.markExtra||0))/100;
    }
    if(en._skShredUntil&&nowS()<en._skShredUntil) mult*=1+(en._skShredPct||25)/100;   // broken armor = more damage taken
    if(PB.vsDebuff&&isDebuffed(en)) mult*=1+PB.vsDebuff/100;
    const r=_he_sk.call(this,en,mult,opts);
    const burn=buffVal('burnHit'); if(burn>0){ en._skDot={kind:'burn',dps:burn,until:nowS()+3}; }
    if(S.sk) for(const id in S.sk.learned){ const d=DEFS[id];
      if(d&&d.type==='passive') for(const e of d.effects) if(e.t==='stack'&&(e.on==='hit'||e.on==='both')) addStack(e.name,e.max,e.dur); }
    return r;
  };
  function isDebuffed(en){ const t=nowS(); return (en.bleedUntil>t)||(en.kulamUntil>t)||(en.stunUntil>t)||(en.rootUntil>t)||(en._skDot&&en._skDot.until>t)||(en._skSlowUntil>t)||(en._skShredUntil>t)||(en._skMarkUntil>t); }

  /* ================================================================
     PHASE 9c — BOSS DIMINISHING STATUS RESISTANCE (skill doc 08)
     Bosses/world bosses build resistance each time a hard-CC or
     debuff lands: every application of the same status family gets
     35% less effective duration, floor 15%. Resistance decays fully
     after 22s without that status. Elites resist half as fast.
     Data-only knobs in data/skills/definitions.json config.bossResist.
     ================================================================ */
  const BOSS_RESIST=Object.assign({perStack:0.35, floor:0.15, decayS:22, eliteFactor:0.5},
    (GAME_DATA.skills&&GAME_DATA.skills.config&&GAME_DATA.skills.config.bossResist)||{});
  function statusFactor(en,fam){
    const def=ENEMY_DEFS[en.key]||{};
    const isB=!!(def.boss||def.worldBoss), isE=def.tier==='Elite';
    if(!isB&&!isE) return 1;
    const t=nowS();
    en._res=en._res||{};
    const r=en._res[fam]||{n:0,last:0};
    if(t-r.last>BOSS_RESIST.decayS) r.n=0;                     // fully recovered
    const per=BOSS_RESIST.perStack*(isB?1:BOSS_RESIST.eliteFactor);
    const f=Math.max(BOSS_RESIST.floor, 1-r.n*per);
    r.n++; r.last=t; en._res[fam]=r;
    if(f<=BOSS_RESIST.floor+0.001&&isB) addLabel('LABAN!','warn',en.x,groundY(en.x,en.z)+3.2,en.z,0.8);
    return f;
  }
  window._statusFactor=statusFactor;                            // used by hitEnemy stun path
  /* shrink CC durations at the application sites via setters */
  function resDur(en,fam,dur){ return dur*statusFactor(en,fam); }
  window._skEnSpd=function(en){ const t=nowS(); return (en._skSlowUntil>t)?(1-Math.min(90,en._skSlowPct||50)/100):1; };

  /* ---------- GENERIC EFFECT EXECUTOR ---------- */
  function aimPoint(range){ const ang=aimAngle(); let best=null,bd=1e9;
    for(const en of enemies){ const dd=d2(en.x,en.z,player.x,player.z); if(dd<range*range&&dd<bd){bd=dd;best=en;} }
    if(best) return {x:best.x,z:best.z};
    return {x:player.x+Math.sin(ang)*Math.min(range,10), z:player.z+Math.cos(ang)*Math.min(range,10)};
  }
  function execEffect(e,r,ctx){
    const t=nowS(), rankUp=(v,pr)=>v+(pr||0)*(r-1);
    switch(e.t){
      case 'melee': {
        const run=()=>{ if(player.dead) return;
          const ang=aimAngle();
          const at=e.at==='aim'?aimPoint(22):{x:player.x,z:player.z};
          if(e.warn){ fxRing(at.x,at.z,0xff5a14,0.5,e.r,1.1); }
          const mult=rankUp(e.mult,e.pr);
          fxShockwave(at.x,at.z,ctx.color||0xf2b134,e.r,0.4);
          if(e.shape==='cone') fxSlash(ang);
          let hit=false;
          for(const en of enemies){
            const dd=Math.hypot(en.x-at.x,en.z-at.z);
            if(dd>e.r+ENEMY_DEFS[en.key].r) continue;
            if(e.shape==='cone'){ const a=Math.atan2(en.x-player.x,en.z-player.z);
              let da=Math.abs(a-ang); if(da>Math.PI)da=2*Math.PI-da; if(da>1.25) continue; }
            let m=mult;
            if(e.behind){ const fa=Math.atan2(player.x-en.x,player.z-en.z); let fd=Math.abs(fa-(en.yaw||0)); if(fd>Math.PI)fd=2*Math.PI-fd; if(fd<1.2) m*=1+e.behind/100; }
            if(e.vsDebuffed&&isDebuffed(en)) m*=1+e.vsDebuffed/100;
            const opts={};
            if(e.stun) opts.stun=e.stun; if(e.knock) opts.knock=e.knock;
            hitEnemy(en,m,opts); hit=true;
            if(e.slow){ en._skSlowUntil=nowS()+resDur(en,'slow',e.slow[1]); en._skSlowPct=e.slow[0]; }
            if(e.root){ en.rootUntil=nowS()+resDur(en,'root',rankUp(e.root,e.prRoot||0)); }
            if(e.shred){ en._skShredUntil=nowS()+resDur(en,'shred',e.shred[1]); en._skShredPct=e.shred[0]; }
            if(e.dot){ en._skDot={kind:e.dot[0],dps:rankUp(e.dot[1],e.dot[2]),until:nowS()+resDur(en,'dot',e.dot[3])}; }
            if(e.kulam){ en.bleedUntil=nowS()+resDur(en,'dot',4); en.kulamUntil=nowS()+resDur(en,'dot',8); addLabel('🕷️','warn',en.x,groundY(en.x,en.z)+2.6,en.z,0.7); }
            fxBurst(en.x,en.z,ctx.color||0xf2b134,1.2);
          }
          if(hit){ doHitStop(0.06); screenShake(0.15,0.2); }
        };
        e.delayMs?setTimeout(run,e.delayMs):run();
        break; }
      case 'proj': {
        const n=e.count||1, base=aimAngle(), spr=(e.spread||0)*Math.PI/180;
        for(let i=0;i<n;i++){
          const ang=n>1?base-spr/2+spr*i/(n-1):base;
          firePProj(ang,rankUp(e.mult,e.pr),e.color||0xffd27a,e.size||0.3,
            {pierce:e.pierce||0,trail:e.color,forceCrit:e.forceCrit,kulam:e.kulam,
             _skDot:e.dot?{kind:e.dot[0],dps:rankUp(e.dot[1],e.dot[2]),dur:e.dot[3]}:null,
             _skSlow:e.slow||null,_skMark:e.mark?[e.mark[0],e.mark[1]]:null});
        }
        break; }
      case 'dash': {
        const mv=moveInput(); const ang=mv.mag>0.1?Math.atan2(mv.x,mv.z):aimAngle();
        const nx=player.x+Math.sin(ang)*e.dist, nz=player.z+Math.cos(ang)*e.dist;
        player.iframesUntil=t+0.4;
        if(walkable(nx,nz,0.7)){ player.x=nx; player.z=nz; }
        else { const hx=player.x+Math.sin(ang)*e.dist/2, hz=player.z+Math.cos(ang)*e.dist/2; if(walkable(hx,hz,0.7)){player.x=hx;player.z=hz;} }
        fxRing(player.x,player.z,0xa0dcff,0.4,2.6,0.3);
        break; }
      case 'buff': addBuff(e.stat,rankUp(e.val,e.pr),e.dur);
        computeStats(); setTimeout(()=>{ computeStats(); },e.dur*1000+50);
        fxSpiral(player.x,player.z,ctx.color||0x7df0ff,0.5,1.2,3); break;
      case 'taunt': {
        fxShockwave(player.x,player.z,0xff6a5e,e.r,0.6); screenShake(0.2,0.25);
        addLabel('HOY!','hurt',player.x,groundY(player.x,player.z)+3.6,player.z,1.1);
        for(const en of enemies) if(d2(en.x,en.z,player.x,player.z)<e.r*e.r){ en.state='chase'; addLabel('❗','hurt',en.x,groundY(en.x,en.z)+2.8,en.z,0.8); }
        player.tauntDefUntil=t+e.dur; break; }
      case 'heal': { const boost=1+(PB.healBoost||0)/100;
        const amt=Math.round(P.maxHp*rankUp(e.pct,e.pr)/100*boost);
        S.hp=Math.min(P.maxHp,S.hp+amt);
        addLabel('+'+amt,'healTxt',player.x,groundY(player.x,player.z)+3,player.z,0.9);
        fxSpiral(player.x,player.z,0x6aff8a,0.5,1.2,3); updateHUD(); break; }
      case 'shield': player.wardHp=Math.max(player.wardHp||0,Math.round(P.maxHp*rankUp(e.pct,e.pr)/100));
        fxRing(player.x,player.z,0x7ad0ff,0.5,3,0.5); updateHUD(); break;
      case 'cleanse': player.bleedUntil=0; player.burnUntil=0; addLabel('✨','healTxt',player.x,groundY(player.x,player.z)+3,player.z,0.8); break;
      case 'zone': {
        const at=e.at==='aim'?aimPoint(22):{x:player.x,z:player.z};
        zones.push({x:at.x,z:at.z,r:e.r,kind:e.kind,until:t+rankUp(e.dur,e.prDur||0),
          val:e.kind==='dps'?rankUp(e.val,e.pr||0):rankUp(e.val,e.pr||0),slowPct:e.slowPct||0,color:e.color||0x9aff5a,acc:0,
          mesh:(function(){ const m=new THREE.Mesh(new THREE.CylinderGeometry(e.r,e.r,0.15,20,1,true),
            new THREE.MeshBasicMaterial({color:e.color||0x9aff5a,transparent:true,opacity:0.22,side:THREE.DoubleSide}));
            m._isFx=true; m.position.set(at.x,groundY(at.x,at.z)+0.3,at.z); scene.add(m); return m; })()});
        break; }
      case 'summon': {
        const at={x:player.x+rnd(-2,2),z:player.z+rnd(-2,2)};
        const g=new THREE.Group();
        const orb=new THREE.Mesh(new THREE.SphereGeometry(0.5,10,10), M(e.color||0x7df0ff,{emissive:e.color||0x7df0ff,emissiveIntensity:1.2}));
        orb._isFx=true; orb.position.y=2.2; g.add(orb); g.position.set(at.x,groundY(at.x,at.z),at.z); scene.add(g);
        summons.push({x:at.x,z:at.z,dps:rankUp(e.dps,e.pr||0),until:t+e.dur,mesh:g,acc:0});
        break; }
    }
  }

  /* zones + summons + dots tick */
  const zones=[], summons=[];
  setInterval(()=>{
    if(!started) return;
    const t=nowS();
    for(let i=zones.length-1;i>=0;i--){ const z=zones[i];
      if(t>z.until){ scene.remove(z.mesh); zones.splice(i,1); continue; }
      if(z.kind==='dps'){ for(const en of enemies) if(d2(en.x,en.z,z.x,z.z)<z.r*z.r){ const d=Math.max(1,Math.round(P.atk*z.val*0.5)); en.hp-=d; en.flash=0.1; en.state='chase'; addLabel('-'+d,'',en.x,groundY(en.x,en.z)+2,en.z,0.5); if(en.hp<=0&&!en.remote) killEnemy(en); } }
      if(z.kind==='slow'){ for(const en of enemies) if(d2(en.x,en.z,z.x,z.z)<z.r*z.r){ en._skSlowUntil=t+0.7; en._skSlowPct=z.slowPct; } }
      if(z.kind==='heal'&&d2(player.x,player.z,z.x,z.z)<z.r*z.r){ const boost=1+(PB.healBoost||0)/100; const amt=Math.round(P.maxHp*z.val/100*0.5*boost); S.hp=Math.min(P.maxHp,S.hp+amt); updateHUD(); }
    }
    for(let i=summons.length-1;i>=0;i--){ const s=summons[i];
      if(t>s.until){ scene.remove(s.mesh); summons.splice(i,1); continue; }
      let best=null,bd=14*14;
      for(const en of enemies){ const dd=d2(en.x,en.z,s.x,s.z); if(dd<bd){bd=dd;best=en;} }
      if(best){ const d=Math.max(1,Math.round(s.dps*0.5)); best.hp-=d; best.flash=0.1; best.state='chase';
        fxLightning(s.x,groundY(s.x,s.z)+2.2,s.z,best.x,groundY(best.x,best.z)+1.5,best.z,0x9a6af2,0.15);
        if(best.hp<=0&&!best.remote) killEnemy(best); }
      s.mesh.position.y=groundY(s.x,s.z)+Math.sin(t*3)*0.3;
    }
    /* enemy skill-dots (poison/burn from data skills) */
    for(const en of enemies){
      if(en._skDot&&t<en._skDot.until){
        const d=Math.max(1,Math.round(en._skDot.dps*0.5)); en.hp-=d;
        if(Math.random()<0.4) addLabel('-'+d, en._skDot.kind==='burn'?'crit':'', en.x,groundY(en.x,en.z)+2,en.z,0.5);
        if(PB.dotHeal){ S.hp=Math.min(P.maxHp,S.hp+d*PB.dotHeal/100); }
        if(en.hp<=0&&!en.remote){ killEnemy(en); en._skDot=null; }
      }
    }
    /* anino regen passive */
    if(PB._dyn) for(const {e,r} of PB._dyn){
      if(e.t==='regen'&&(t-(player._lastHurtT||0))>e.idleS&&S.hp<P.maxHp&&!player.dead){
        S.hp=Math.min(P.maxHp,S.hp+P.maxHp*(e.pctPerS+(e.pr||0)*(r-1))/100*0.5); updateHUD();
      }
    }
  },500);

  /* dot damage boost + projectile extras */
  const _fp_sk=firePProj;
  firePProj=function(ang,mult,color,size,opts={}){
    _fp_sk.call(this,ang,mult,color,size,opts);
    const p=pprojs[pprojs.length-1];
    if(p&&opts._skDot){ p._skDot=opts._skDot; if(PB.dotBoost) p._skDot.dps*=1+PB.dotBoost/100; }
    if(p&&opts._skSlow) p._skSlow=opts._skSlow;
    if(p&&opts._skMark) p._skMark=opts._skMark;
  };
  const _he2_sk=hitEnemy;   // wrap again to catch projectile riders
  hitEnemy=function(en,mult,opts={}){
    const r=_he2_sk.call(this,en,mult,opts);
    const p=opts._proj;
    if(p){
      if(p._skDot) en._skDot={kind:p._skDot.kind,dps:p._skDot.dps,until:nowS()+p._skDot.dur};
      if(p._skSlow){ en._skSlowUntil=nowS()+((window._statusFactor?window._statusFactor(en,'slow'):1)*p._skSlow[1]); en._skSlowPct=p._skSlow[0]; }
      if(p._skMark){ en._skMarkUntil=nowS()+p._skMark[1]; en._skMarkPct=p._skMark[0]; addLabel('🎯','warn',en.x,groundY(en.x,en.z)+2.8,en.z,0.7); }
    }
    return r;
  };

  /* ---------- USE SKILL: data path replaces switch for learned defs ---------- */
  const _us_sk=useSkill;
  useSkill=function(i){
    ensureSk();
    const id=S.sk.equipped[i];
    if(!id){ return _us_sk.apply(this,arguments); }   // legacy fallback (old 3-skill classes if nothing learned)
    const d=DEFS[id], r=rankOf(id);
    if(!d||r<=0||player.dead||!started) return;
    const t=nowS();
    if(t<player.skillCds[i]) return;
    const cd=(d.cooldown||0)*(1-P.cdr/100);
    player.yaw=aimAngle();
    for(const e of d.effects) execEffect(e,r,{color:(d.effects.find(x=>x.color)||{}).color});
    player.skillCds[i]=t+cd;
    SFX.skill&&SFX.skill();
  };

  /* dot boost also applies to kulam bleed ticks (existing mangkukulam module handles those) */

  /* ---------- HUD: use equipped defs for icons/cooldowns ---------- */
  function eqDef(i){ ensureSk(); const id=S.sk.equipped[i]; return id?DEFS[id]:null; }
  window._skEqDef=eqDef;
  function refreshSkillHUD(){
    if(!started||!S.cls) return;
    const C=CLASSES[S.cls];
    for(let i=0;i<3;i++){
      const btn=$('btn-skill'+(i+1)); if(!btn) continue;
      const d=eqDef(i)||C.skills[i];
      if(d){ btn.querySelector('.sk-ic').textContent=d.icon; btn.title=d.name+' — '+(d.description||d.desc||''); btn.style.opacity='1'; }
      else { btn.querySelector('.sk-ic').textContent='＋'; btn.title='Walang skill — buksan ang ☰ → Skills'; btn.style.opacity='0.5'; }
    }
  }
  window._skRefreshHUD=refreshSkillHUD;
  /* cooldown overlay: read data cd when equipped */
  setInterval(()=>{
    if(!started||!S.cls||!S.sk) return;
    const tS=nowS();
    for(let i=0;i<3;i++){
      const d=eqDef(i); if(!d) continue;
      const el=$('btn-skill'+(i+1)); if(!el) continue;
      const rem=clamp((player.skillCds[i]-tS)/Math.max(0.1,d.cooldown||1),0,1);
      el.querySelector('.cd-overlay').style.height=(rem*100)+'%';
      el.classList.toggle('ready',rem<=0);
    }
  },120);

  /* skill points on level-up + toast */
  const _gx_sk=gainXP;
  gainXP=function(){
    const lv=S.level;
    _gx_sk.apply(this,arguments);
    if(S.level>lv&&S.sk){
      const gained=S.level-lv;
      toast('✨ +'+gained+' Skill Point'+(gained>1?'s':'')+' — ☰ → Skills para matuto!','levelup');
      updateSkBadge();
    }
  };

  /* init hook: fresh chars learn core skill free */
  const _ifc_sk=initForClass;
  initForClass=function(){
    _ifc_sk.apply(this,arguments);
    ensureSk();
    const core=(BYCLASS[S.cls]||[]).find(d=>d.branch==='core');
    if(core&&!S.sk.learned[core.id]&&S.level>=1){
      S.sk.learned[core.id]=1;    /* free core skill, no point cost */
      if(!S.sk.equipped.includes(core.id)){ const i=S.sk.equipped.indexOf(null); if(i>=0) S.sk.equipped[i]=core.id; }
    }
    applyPassives(); refreshSkillHUD();
  };

  /* ---------- SKILL TREE UI (☰ → Skills) ---------- */
  const css=document.createElement('style');
  css.textContent=`
  #sktree{position:fixed;inset:0;z-index:340;display:none;background:rgba(10,6,18,.92);backdrop-filter:blur(6px)}
  #sktree.open{display:flex;flex-direction:column}
  .skt-head{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.1)}
  .skt-head h3{margin:0;font:900 16px system-ui;color:#ffd27a}
  .skt-pts{margin-left:auto;font:800 13px system-ui;color:#9aff5a}
  .skt-close{background:none;border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:8px;font:800 13px system-ui;padding:6px 12px;cursor:pointer}
  /* compact multi-column layout: branches sit side by side so the whole tree
     fits in one window (no scrolling) on typical screens */
  .skt-body{flex:1;overflow:auto;padding:10px;-webkit-overflow-scrolling:touch;display:grid;
    grid-template-columns:repeat(auto-fit,minmax(272px,1fr));gap:10px;align-content:start}
  .skt-branch{margin:0;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:8px}
  .skt-branch>b{display:block;font:900 11px system-ui;letter-spacing:1px;margin-bottom:6px}
  .skt-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:7px}
  .skt-node{width:auto;background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.14);border-radius:10px;padding:7px;cursor:pointer;position:relative}
  .skt-node.locked{opacity:.42;filter:grayscale(.6)}
  .skt-node.avail{border-color:#9aff5a66}
  .skt-node.learned{border-color:#ffd27a;background:rgba(255,210,122,.08)}
  .skt-node.maxed{border-color:#ff8a4a;background:rgba(255,138,74,.1)}
  .skt-node.equipped:after{content:'✔ NAKA-EQUIP';position:absolute;top:-8px;right:-4px;background:#2e7d32;color:#fff;font:800 8px system-ui;padding:2px 6px;border-radius:6px}
  .skt-node .ic{font-size:18px}
  .skt-node .nm{font:800 10px system-ui;color:#efe8ff;margin:2px 0 2px;line-height:1.2}
  .skt-node .rk{font:700 9px system-ui;color:#ffd27a}
  .skt-node .rq{font:600 8px system-ui;color:#8a80a2;margin-top:2px}
  .skt-detail{border-top:1px solid rgba(255,255,255,.1);padding:10px 14px;background:rgba(0,0,0,.35)}
  .skt-detail .d-desc{font:600 12px system-ui;color:#cfc6e2;margin:4px 0}
  .skt-actions{grid-column:1/-1;display:flex;gap:8px;margin-top:2px;flex-wrap:wrap}
  .skt-btn{border:none;border-radius:9px;font:800 12px system-ui;padding:8px 14px;cursor:pointer}
  .skt-learn{background:#2e7d32;color:#fff} .skt-learn:disabled{background:#333;color:#777}
  .skt-eq{background:#4a5aa8;color:#fff}
  .skt-reset{background:#7d2e2e;color:#fff;margin-left:auto}
  @media(max-width:700px){.skt-body{grid-template-columns:1fr}}`;
  document.head.appendChild(css);
  const el=document.createElement('div'); el.id='sktree';
  el.innerHTML=`<div class="skt-head"><h3>✨ SKILL TREE</h3><span id="skt-cls" style="font:700 12px system-ui;color:#cfc6e2"></span>
    <span class="skt-pts" id="skt-pts"></span><button class="skt-close" id="skt-close">✕ Isara</button></div>
    <div class="skt-body" id="skt-body"></div>
    <div class="skt-detail" id="skt-detail" style="display:none"></div>`;
  document.body.appendChild(el);
  $('skt-close').onclick=()=>{ el.classList.remove('open'); };
  let selId=null;
  const BR_COL={core:'#ffd27a',offense:'#ff8a7e',defense:'#7ad0ff',specialty:'#c08aff',ultimate:'#ff5ad0'};
  function nodeState(d){
    const r=rankOf(d.id);
    if(r>=d.maxRank) return 'maxed';
    if(r>0) return 'learned';
    return canLearn(d).ok?'avail':'locked';
  }
  function renderTree(){
    ensureSk();
    const C=CLASSES[S.cls]||{};
    $('skt-cls').textContent=(S.adv&&ADV_DEFS[S.cls]?ADV_DEFS[S.cls].name:C.name||'')+' · Lv'+S.level;
    $('skt-pts').textContent='✨ '+skFree()+' puntos';
    const tree=BYCLASS[S.cls]||[];
    const order=['core','offense','defense','specialty','ultimate'];
    const lbl=CFG.branchLabels||{};
    $('skt-body').innerHTML=order.map(br=>{
      const list=tree.filter(d=>d.branch===br); if(!list.length) return '';
      return `<div class="skt-branch"><b style="color:${BR_COL[br]}">${lbl[br]||br.toUpperCase()}</b>
        <div class="skt-row">${list.map(d=>{
          const st=nodeState(d), r=rankOf(d.id), eq=S.sk.equipped.includes(d.id);
          const reqTxt=d.requires?Object.keys(d.requires).map(k=>(DEFS[k]?DEFS[k].name:k)+' R'+d.requires[k]).join(', '):'';
          return `<div class="skt-node ${st}${eq?' equipped':''}" data-sk="${d.id}">
            <span class="ic">${d.icon}</span><div class="nm">${d.name}</div>
            <div class="rk">${d.type==='passive'?'PASSIVE':d.type==='ultimate'?'ULTIMATE':'ACTIVE'} · R${r}/${d.maxRank}</div>
            <div class="rq">Lv${d.requiredLevel}${reqTxt?' · '+reqTxt:''}</div></div>`;
        }).join('')}</div></div>`;
    }).join('')+`<div class="skt-actions"><button class="skt-btn skt-reset" id="skt-reset">♻️ I-RESET ANG SKILLS</button></div>`;
    $('skt-body').querySelectorAll('.skt-node').forEach(n=>n.onclick=()=>{ selId=n.dataset.sk; renderDetail(); });
    $('skt-reset').onclick=()=>{
      if(!S.sk.spent){ toast('Wala pang skills na natutunan.'); return; }
      showModal(`<h3 style="margin:0 0 8px">♻️ I-RESET ANG SKILLS?</h3>
        <p style="font:600 13px system-ui;color:#cfc6e2">Maibabalik ang <b style="color:#9aff5a">${S.sk.spent}</b> puntos.<br>Matatanggal ang lahat ng naka-equip na skills.</p>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:10px">
          <button id="skt-yes" class="skt-btn skt-reset" style="margin:0">✔ Oo, i-reset</button>
          <button id="skt-no" class="skt-btn" style="background:#444;color:#fff">✖ Huwag</button>
        </div>`);
      $('skt-yes').onclick=()=>{ closeModal(); respec(); renderTree(); renderDetail(); };
      $('skt-no').onclick=closeModal;
    };
    renderDetail();
  }
  function renderDetail(){
    const box=$('skt-detail');
    if(!selId||!DEFS[selId]){ box.style.display='none'; return; }
    const d=DEFS[selId], r=rankOf(d.id), c=canLearn(d), eq=S.sk.equipped.indexOf(d.id);
    box.style.display='block';
    box.innerHTML=`<b style="font:900 14px system-ui;color:#ffd27a">${d.icon} ${d.name}</b>
      <span style="font:700 11px system-ui;color:${BR_COL[d.branch]}"> · ${d.branch.toUpperCase()} · R${r}/${d.maxRank}${d.cooldown?' · CD '+d.cooldown+'s':''}</span>
      <div class="d-desc">${d.description}</div>
      <div class="skt-actions">
        <button class="skt-btn skt-learn" id="skt-learn" ${c.ok?'':'disabled'}>${r>0?'⬆ I-UPGRADE (R'+(r+1)+')':'✨ MATUTO'} — 1 punto</button>
        ${(r>0&&(d.type==='active'||d.type==='ultimate'))?[0,1,2].map(i=>
          `<button class="skt-btn skt-eq" data-slot="${i}">${eq===i?'✔':''} Slot ${i+1}</button>`).join(''):''}
        ${!c.ok?'<span style="font:700 11px system-ui;color:#ff8a7e;align-self:center">'+c.why+'</span>':''}
      </div>`;
    $('skt-learn').onclick=()=>{ if(learnSkill(d.id)){ renderTree(); selId=d.id; renderDetail(); } };
    box.querySelectorAll('.skt-eq').forEach(b=>b.onclick=()=>{ equipSkill(d.id,+b.dataset.slot); renderTree(); selId=d.id; renderDetail(); });
  }
  window.openSkillTree=function(){ if(!started||!S.cls){ toast('Simulan muna ang laro.'); return; } el.classList.add('open'); renderTree(); };
  window.skFree=skFree;   // exposed so the inventory Skills tab can show points

  /* ☰ menu tile */
  (function addTile(){
    const grid=document.querySelector('#mainmenu .mm-grid');
    if(!grid){ setTimeout(addTile,1000); return; }
    const t=document.createElement('div');
    t.className='mm-tile'; t.id='mm-skilltree';
    t.innerHTML='<b>🌟</b><span>Skills</span>';
    t.onclick=()=>{ document.getElementById('mainmenu').classList.remove('open'); window.openSkillTree(); };
    grid.insertBefore(t,grid.firstChild);
  })();
  function updateSkBadge(){
    const t=document.getElementById('mm-skilltree'); if(!t) return;
    let em=t.querySelector('.badge');
    const show=started&&S.sk&&skFree()>0;
    if(show&&!em){ em=document.createElement('em'); em.className='badge'; em.textContent=skFree(); t.style.position='relative'; em.style.cssText='position:absolute;top:4px;right:6px;background:#d83a5e;color:#fff;border-radius:8px;font:800 10px system-ui;padding:1px 5px;font-style:normal'; t.appendChild(em); }
    else if(em){ if(show) em.textContent=skFree(); else em.remove(); }
  }
  setInterval(updateSkBadge,3000);

  /* keep HUD in sync when a save is adopted mid-session */
  const _load_sk=load;
  load=function(){ const r=_load_sk.apply(this,arguments); if(r&&S.cls){ ensureSk(); applyPassives(); } return r; };

  console.log('✨ Skill system v1: '+DATA.skills.length+' defs, '+Object.keys(BYCLASS).length+' classes');
})();

/* ================================================================
   📲 PWA — service worker + custom install button
   Chrome: captures beforeinstallprompt → shows a gold "Install"
   button on the welcome screen + an ⬇️ entry in Settings.
   iOS Safari: shows a one-time hint (no install API there).
   ================================================================ */
(function pwa(){
  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); });
  }
  const isStandalone=()=> window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches || window.navigator.standalone===true;
  let deferredPrompt=null;
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);

  /* gold install button, shown on the welcome screen when installable */
  const btn=document.createElement('button');
  btn.id='btn-install';
  btn.innerHTML='📲 I-INSTALL ANG LARO';
  btn.style.cssText='display:none;position:fixed;top:12px;left:14px;z-index:65;'+
    'background:linear-gradient(180deg,#ffd97a,#dba22a);border:none;color:#221500;'+
    'font:800 12px system-ui;letter-spacing:.5px;padding:10px 16px;border-radius:12px;cursor:pointer;'+
    'box-shadow:0 4px 14px rgba(0,0,0,.5),0 0 18px rgba(242,177,52,.35);animation:pulse 2.2s infinite';
  document.body.appendChild(btn);
  function refreshBtn(){
    const onWelcome=!document.getElementById('welcome-screen').classList.contains('hidden');
    btn.style.display=(deferredPrompt&&!isStandalone()&&onWelcome)?'block':'none';
  }
  setInterval(refreshBtn,1500);

  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault(); deferredPrompt=e; refreshBtn();
  });
  btn.onclick=async()=>{
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    const {outcome}=await deferredPrompt.userChoice;
    if(outcome==='accepted') toast('📲 <b>Na-install ang Agimat Online!</b> Hanapin ito sa home screen mo.','levelup');
    deferredPrompt=null; refreshBtn();
  };
  window.addEventListener('appinstalled',()=>{ deferredPrompt=null; refreshBtn(); });

  /* iOS: no install API — one-time gentle hint on the welcome screen */
  if(isIOS&&!isStandalone()&&!localStorage.getItem('agimat_ios_hint')){
    setTimeout(()=>{
      const onWelcome=!document.getElementById('welcome-screen').classList.contains('hidden');
      if(!onWelcome) return;
      toast('📲 Sa iPhone: pindutin ang <b>Share</b> button → <b>"Add to Home Screen"</b> para maging app ang laro!','');
      localStorage.setItem('agimat_ios_hint','1');
    },6000);
  }

  /* Settings: add an install row via openSettings wrap */
  const _os2=openSettings;
  openSettings=function(){
    _os2();
    const box=$('modal-box'); if(!box) return;
    if(isStandalone()) return;                       // already installed — nothing to add
    const row=document.createElement('div');
    if(deferredPrompt){
      row.innerHTML='<button class="modal-btn secondary" id="set-install">📲 I-install sa Home Screen</button>';
      box.insertBefore(row,box.querySelector('.modal-btn:last-child'));
      const b=$('set-install'); if(b) b.onclick=()=>{ closeModal(); btn.onclick(); };
    } else if(isIOS){
      row.innerHTML='<div style="font:500 11px system-ui;color:#8a80a2;margin:6px 0">📲 iPhone: Share → “Add to Home Screen” para maging app ang laro.</div>';
      box.insertBefore(row,box.querySelector('.modal-btn:last-child'));
    }
  };
  $('btn-settings').onclick=openSettings;
})();

/* ================================================================
   🗣️ UNIVERSAL NPC INTERACTION SYSTEM (spec: npc-redesign)
   ONE reusable window for ALL NPCs. Capabilities are DATA:
   data/npcs/definitions.json  → npc identity + capabilities
   data/npcs/dialogue.json     → greetings + talk lines
   data/npcs/services.json     → service metadata (icon/label/desc)
   data/npcs/relationships.json→ relationship tiers
   Adding an NPC = adding data. UI generates itself.
   Existing shops/quests/enhance are REUSED as service runners.
   ================================================================ */
(function universalNpc(){
  /* ---------- data (fetch + inline fallback, per project rule) ---------- */
  const NPC_DATA={
    defs:{
      trader:{name:'Aling Rosa',title:'Tagapangalakal ng Barangay',icon:'⚖️',accent:'#d48fc0',capabilities:['dialogue','quest','shop','heal'],shopId:'trader',questNpc:'Aling Rosa'},
      blacksmith:{name:'Panday Iko',title:'Panday ng Barangay',icon:'⚒️',accent:'#e0a05a',capabilities:['dialogue','quest','shop','upgrade'],shopId:'blacksmith',questNpc:'Panday Iko'},
      equipment:{name:'Ka Bining',title:'Manghahabi ng Kasuotan',icon:'🛡️',accent:'#8fd4a0',capabilities:['dialogue','quest','shop'],shopId:'equipment',questNpc:'Ka Bining'},
      blackmarket:{name:'Ang Kubrador',title:'Mangangalakal ng Dilim',icon:'🌑',accent:'#9a7de0',capabilities:['dialogue','quest','shop','gamble'],shopId:'blackmarket',questNpc:'Ang Kubrador'},
    },
    dlg:{
      trader:{greet:'Anak! Halika, tingnan mo ang paninda ko.',talk:['Lahat ng bagay may presyo, anak.','Mag-ingat ka sa gabi, anak.']},
      blacksmith:{greet:'Kaibigan. Bagong bakal, bagong pag-asa.',talk:['Ang mahinang sandata, kasing-panganib ng walang sandata.']},
      equipment:{greet:'Maligayang pagdating, bayani.',talk:['Bawat sinulid, may dasal.']},
      blackmarket:{greet:'Ssst… lumapit ka. Walang tanong, walang refund.',talk:['Huwag mo nang itanong kung saan galing.']},
    },
    svc:{
      shop:{icon:'🛒',label:'Tindahan',desc:'Bumili at magbenta ng gamit'},
      heal:{icon:'💗',label:'Pagpapagaling',desc:'Ibalik ang buong HP (libre, 60s pahinga)'},
      upgrade:{icon:'🔨',label:'Pandayan',desc:'Palakasin ang gamit +1 → +10'},
      gamble:{icon:'🎲',label:'Mystery Pouch',desc:'Random na gamit — Rare o mas mataas'},
    },
    tiers:[{id:'stranger',label:'Estranghero',min:0},{id:'acquaintance',label:'Kakilala',min:5},{id:'friendly',label:'Palakaibigan',min:15},{id:'trusted',label:'Pinagkakatiwalaan',min:30},{id:'ally',label:'Kaalyado',min:60},{id:'close_ally',label:'Matalik na Kaalyado',min:100}],
  };
  (async()=>{ try{
    const [d,g,s,r]=await Promise.all([
      fetch('data/npcs/definitions.json').then(x=>x.json()),
      fetch('data/npcs/dialogue.json').then(x=>x.json()),
      fetch('data/npcs/services.json').then(x=>x.json()),
      fetch('data/npcs/relationships.json').then(x=>x.json()),
    ]);
    if(d&&d.npcs) NPC_DATA.defs=Object.assign({},NPC_DATA.defs,d.npcs);
    if(g) NPC_DATA.dlg=Object.assign({},NPC_DATA.dlg,g);
    if(s&&s.services) NPC_DATA.svc=Object.assign({},NPC_DATA.svc,s.services);
    if(r&&r.tiers) NPC_DATA.tiers=r.tiers;
  }catch(e){} })();
  window._npcData=NPC_DATA;

  /* ---------- relationship ---------- */
  function relTier(nid){
    const pts=(S.npcRel&&S.npcRel[nid])||0;
    let t=NPC_DATA.tiers[0];
    for(const x of NPC_DATA.tiers) if(pts>=x.min) t=x;
    return {pts,tier:t};
  }

  /* ---------- service runners: capability id → action ---------- */
  const npcHealCd={};   // nid → next allowed time (s)
  const SVC_RUN={
    shop(def,nid){ npcwClose(); window._rawOpenShop(def.shopId||nid); },
    upgrade(){ npcwClose(); openEnhance(); },
    gamble(def,nid){ npcwClose(); window._rawOpenShop(def.shopId||nid); },
    heal(def,nid){
      const now=nowS();
      if(S.hp>=P.maxHp){ npcwSay('Malusog ka pa, anak! Bumalik ka kapag sugatan ka na.'); return; }
      if(now<(npcHealCd[nid]||0)){ npcwSay('Sandali lang, anak — hinihintay ko pang lumamig ang mga halamang gamot. ('+Math.ceil(npcHealCd[nid]-now)+'s)'); return; }
      npcHealCd[nid]=now+60;
      S.hp=P.maxHp; updateHUD(); SFX.levelup();
      npcwSay('Hala, ayan! Buo na ulit ang lakas mo. Ingat ka sa labas, ha?');
      toast('💗 <b>Gumaling ka!</b> Buong HP naibalik.','levelup');
    },
  };

  /* ---------- DOM (one window, reused) ---------- */
  const root=document.createElement('div');
  root.id='npcw';
  root.innerHTML=
    '<div id="npcw-card">'+
      '<div id="npcw-head">'+
        '<div id="npcw-portrait"></div>'+
        '<div id="npcw-id"><b id="npcw-name"></b><i id="npcw-title"></i><em id="npcw-rel"></em></div>'+
        '<button id="npcw-x">✕</button>'+
      '</div>'+
      '<div id="npcw-body">'+
        '<div id="npcw-dlg"></div>'+
        '<div id="npcw-panel"></div>'+
      '</div>'+
      '<div id="npcw-bar"></div>'+
    '</div>';
  document.body.appendChild(root);
  const E={card:$('npcw-card'),portrait:$('npcw-portrait'),name:$('npcw-name'),title:$('npcw-title'),
    rel:$('npcw-rel'),dlg:$('npcw-dlg'),panel:$('npcw-panel'),bar:$('npcw-bar')};
  let CUR=null;           // current npc id
  let talkIdx=0;

  function npcwSay(txt){ E.dlg.innerHTML='<p>“'+txt+'”</p>'; E.dlg.scrollTop=0; }
  function npcwClose(){ root.classList.remove('open'); CUR=null; }
  window.npcwClose=npcwClose;
  $('npcw-x').onclick=npcwClose;
  root.addEventListener('pointerdown',e=>{ if(e.target===root) npcwClose(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&root.classList.contains('open')) npcwClose(); });

  /* ---------- quest state → indicator ---------- */
  function questBadge(def){
    const st=window._questStateFor(def.questNpc||'');
    if(!st) return null;
    return st.ready?{ch:'?',cls:'done',hint:'May ibibigay ka!'}:{ch:'!',cls:'new',hint:'May misyon dito'};
  }

  /* ---------- panels ---------- */
  function showQuestPanel(def){
    const st=window._questStateFor(def.questNpc||'');
    if(!st){ E.panel.innerHTML='<div class="npcw-note">Wala akong misyon para sa iyo ngayon, bayani.</div>'; return; }
    const q=st.q;
    S.quests.acc=S.quests.acc||{};
    const accepted=!!S.quests.acc[S.quests.cur];
    E.panel.innerHTML=
      '<div class="npcw-quest">'+
        '<div class="nq-head">'+q.icon+' <b>'+q.title+'</b>'+(st.ready?' <span class="nq-done">✓ TAPOS</span>':'')+'</div>'+
        '<div class="nq-desc">“'+q.text+'”</div>'+
        '<div class="nq-obj">📌 Layunin: <b>'+st.prog+'/'+q.n+'</b></div>'+
        '<div class="nq-rw">🎁 Gantimpala: <b>🪙 '+fmt(q.reward.gold)+'</b> + <b>⭐ '+fmt(q.reward.xp)+' XP</b></div>'+
        (st.ready
          ?'<button class="npcw-btn gold" id="nq-turnin">📜 IBIGAY ANG MISYON</button>'
          :accepted
            ?'<div class="npcw-note">Sige, bayani — hinihintay kita.</div>'
            :'<div class="nq-row"><button class="npcw-btn gold" id="nq-accept">✔ TANGGAPIN</button><button class="npcw-btn" id="nq-later">Mamaya na</button></div>')+
      '</div>';
    const acc=$('nq-accept'); if(acc) acc.onclick=()=>{ S.quests.acc[S.quests.cur]=1; save(); SFX.loot(); npcwSay('Salamat, bayani! Alam kong maaasahan ka.'); showQuestPanel(def); updateQuestHud(); };
    const lat=$('nq-later'); if(lat) lat.onclick=()=>{ E.panel.innerHTML=''; npcwSay('Sige, nandito lang ako kapag handa ka na.'); };
    const ti=$('nq-turnin'); if(ti) ti.onclick=()=>{
      window._questTurnIn(q);
      const done=S.quests.done;
      npcwSay(done?'Natapos mo ang lahat ng misyon! Ikaw na ang tunay na bayani ng barangay.':'Salamat, bayani! Tanggapin mo ito.');
      E.panel.innerHTML='<div class="npcw-note" style="color:#ffd94a;font-weight:800">🪙 +'+fmt(q.reward.gold)+' · ⭐ +'+fmt(q.reward.xp)+' XP'+
        (done?'':'<br><span style="color:#bfb6d2;font-weight:500">Bagong misyon: <b>'+QUESTS[S.quests.cur].title+'</b> — kausapin si '+QUESTS[S.quests.cur].npc+'</span>')+'</div>';
      renderHeader(def); renderBar(def);
    };
  }
  function showServicesPanel(def){
    const caps=(def.capabilities||[]).filter(c=>SVC_RUN[c]&&NPC_DATA.svc[c]);
    E.panel.innerHTML='<div class="npcw-svc">'+caps.map(c=>{
      const m=NPC_DATA.svc[c];
      return '<button class="npcw-svc-tile" data-svc="'+c+'"><b>'+m.icon+'</b><span>'+m.label+'</span><i>'+m.desc+'</i></button>';
    }).join('')+'</div>';
    E.panel.querySelectorAll('.npcw-svc-tile').forEach(b=>b.onclick=()=>{ SVC_RUN[b.dataset.svc](def,CUR); });
  }

  /* ---------- header + action bar ---------- */
  function renderHeader(def){
    E.portrait.textContent=def.icon||'🧑';
    E.portrait.style.borderColor=def.accent||'#f2b134';
    E.name.textContent=def.name; E.name.style.color=def.accent||'#ffd94a';
    E.title.textContent=def.title||'';
    const r=relTier(CUR);
    E.rel.textContent=r.pts>0?('🤝 '+r.tier.label):'';
  }
  function renderBar(def){
    const caps=def.capabilities||[];
    const btns=[];
    if(caps.includes('dialogue')) btns.push({id:'talk',txt:'💬 Usap'});
    if(caps.includes('quest')){
      const qb=questBadge(def);
      btns.push({id:'quest',txt:'📜 Misyon'+(qb?' <span class="npcw-badge '+qb.cls+'">'+qb.ch+'</span>':'')});
    }
    const svcCaps=caps.filter(c=>SVC_RUN[c]&&NPC_DATA.svc[c]);
    if(svcCaps.length===1){ const m=NPC_DATA.svc[svcCaps[0]]; btns.push({id:'svc1',txt:m.icon+' '+m.label}); }
    else if(svcCaps.length>1) btns.push({id:'services',txt:'🧰 Serbisyo'});
    E.bar.innerHTML=btns.map(b=>'<button class="npcw-btn" data-act="'+b.id+'">'+b.txt+'</button>').join('');
    E.bar.querySelectorAll('.npcw-btn').forEach(b=>b.onclick=()=>{
      const a=b.dataset.act;
      if(a==='talk'){
        const lines=(NPC_DATA.dlg[CUR]&&NPC_DATA.dlg[CUR].talk)||['…'];
        npcwSay(lines[talkIdx++%lines.length]); E.panel.innerHTML='';
      }
      else if(a==='quest') showQuestPanel(def);
      else if(a==='services') showServicesPanel(def);
      else if(a==='svc1') SVC_RUN[svcCaps[0]](def,CUR);
    });
  }

  /* ---------- open ---------- */
  window.openNpcWindow=function(nid){
    const def=NPC_DATA.defs[nid];
    if(!def){ window._rawOpenShop(nid); return; }   // unknown npc → legacy fallback
    CUR=nid; talkIdx=0;
    renderHeader(def); renderBar(def);
    E.panel.innerHTML='';
    npcwSay((NPC_DATA.dlg[nid]&&NPC_DATA.dlg[nid].greet)||'Kumusta, bayani!');
    /* auto-open the quest panel when there is something actionable */
    const qb=questBadge(def);
    if(qb) showQuestPanel(def);
    root.classList.add('open');
    SFX.click&&SFX.click();
  };

  /* ---------- world-label quest indicators (!, ?, ✓) ---------- */
  setInterval(()=>{
    if(!started) return;
    for(const n of NPCS){
      const def=NPC_DATA.defs[n.id]; if(!def||!n.label) continue;
      const qb=questBadge(def);
      const want=n.icon+' '+n.name+(qb?(qb.cls==='done'?'  ❓':'  ❗'):'');
      if(n.label.textContent!==want) n.label.textContent=want;
    }
  },1500);
})();

/* ================================================================
   🧱 UI OVERLAY MANAGER (master-fix §1) — layered stacking:
   0 world · 10 HUD · 20 chat · 30-40 panels · 65 npc · 70 modal ·
   115+ menus/inventory. Chat AUTO-HIDES behind any popup and can be
   minimized to a floating 💬 button with an unread counter.
   ================================================================ */
(function uiOverlayManager(){
  const chat=document.getElementById('chat-wrap'); if(!chat) return;
  const tabs=chat.querySelector('#chat-tabs');
  const log=chat.querySelector('#chat-log');

  /* floating chat button (minimized state) */
  const fab=document.createElement('button');
  fab.id='chat-fab';
  fab.innerHTML='💬<span id="chat-fab-n" class="hidden">0</span>';
  document.body.appendChild(fab);

  /* "—" minimize-to-button control, always visible in the tab strip */
  const hideBtn=document.createElement('button');
  hideBtn.id='chat-hide'; hideBtn.title='I-minimize ang chat'; hideBtn.textContent='—';
  tabs.appendChild(hideBtn);

  let unread=0;
  let userMin=localStorage.getItem('agimat_chat_fab')==='1';

  function anyPopupOpen(){
    const mb=document.getElementById('modal-backdrop');
    if(mb&&!mb.classList.contains('hidden')) return true;
    for(const id of ['inv2','mainmenu','tal','sktree','npcw']){
      const el=document.getElementById(id);
      if(el&&el.classList.contains('open')) return true;
    }
    if(document.querySelector('.panel.open')) return true;
    return false;
  }
  function updFab(){
    const n=document.getElementById('chat-fab-n');
    n.textContent=unread>99?'99+':String(unread);
    n.classList.toggle('hidden',unread===0);
    fab.style.display=(started&&SETTINGS.chatVisible&&userMin&&!anyPopupOpen())?'flex':'none';
  }
  /* unread counter: counts lines that arrive while chat is not visible */
  new MutationObserver(muts=>{
    if(userMin||chat.classList.contains('chat-behind')){
      for(const m of muts) unread+=m.addedNodes.length;
      updFab();
    }
  }).observe(log,{childList:true});

  /* watcher: popups push chat behind; closing restores it */
  setInterval(()=>{
    chat.classList.toggle('chat-behind',anyPopupOpen());
    chat.classList.toggle('chat-fabbed',userMin);
    updFab();
  },350);

  hideBtn.onclick=e=>{
    e.stopPropagation();
    userMin=true; localStorage.setItem('agimat_chat_fab','1');
    unread=0; updFab();
    chat.classList.add('chat-fabbed');
  };
  fab.onclick=()=>{
    userMin=false; localStorage.setItem('agimat_chat_fab','0');
    unread=0; updFab();
    chat.classList.remove('chat-fabbed');
  };
})();

/* ================================================================
   🧍 INVENTORY 3D CHARACTER (master-fix §3) — the SVG silhouette is
   replaced by the ACTUAL hero model: slow auto-rotation, touch-drag
   rotation, rebuilds immediately when equipment changes.
   ================================================================ */
(function inv3d(){
  const doll=document.getElementById('i2-doll'); if(!doll) return;
  const svg=doll.querySelector('svg'); if(svg) svg.remove();
  const cv=document.createElement('canvas');
  cv.id='i2-hero3d';
  cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block';
  doll.insertBefore(cv,doll.firstChild);

  let rnd=null,sc=null,cam=null,mesh=null,yaw=0,dragging=false,lastX=0,raf=0;
  function ensure(){
    if(rnd) return;
    rnd=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
    rnd.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
    rnd.outputColorSpace=THREE.SRGBColorSpace;
    sc=new THREE.Scene();
    sc.add(new THREE.HemisphereLight(0xd8e8ff,0x4a3a64,1.35));
    const key=new THREE.DirectionalLight(0xffe9c0,2.1); key.position.set(3,5,4); sc.add(key);
    const rim=new THREE.DirectionalLight(0x7df0ff,0.9); rim.position.set(-3,3,-4); sc.add(rim);
    cam=new THREE.PerspectiveCamera(36,1,0.1,50);
    cam.position.set(0,2.0,6.0); cam.lookAt(0,1.45,0);
    const ped=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.5,0.2,20),
      new THREE.MeshStandardMaterial({color:0x3a2f5a,roughness:.6,metalness:.3}));
    ped.position.y=-0.1; sc.add(ped);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.35,0.045,6,24),
      new THREE.MeshBasicMaterial({color:0x7df0ff}));
    ring.rotation.x=Math.PI/2; ring.position.y=0.02; sc.add(ring);
    cv.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;cv.setPointerCapture(e.pointerId);});
    cv.addEventListener('pointermove',e=>{ if(dragging){ yaw+=(e.clientX-lastX)*0.012; lastX=e.clientX; } });
    cv.addEventListener('pointerup',()=>dragging=false);
    cv.addEventListener('pointercancel',()=>dragging=false);
  }
  function rebuild(){
    ensure();
    if(mesh){ sc.remove(mesh); mesh=null; }
    try{ mesh=buildHero(S.cls); sc.add(mesh); }catch(e){}
  }
  window._inv3dRefresh=()=>{ if(document.getElementById('inv2').classList.contains('open')) rebuild(); };
  function loop(){
    if(!document.getElementById('inv2').classList.contains('open')){ raf=0; return; }
    raf=requestAnimationFrame(loop);
    const w=cv.clientWidth||300,h=cv.clientHeight||380;
    if(cv.width!==w*rnd.getPixelRatio()){ rnd.setSize(w,h,false); cam.aspect=w/h; cam.updateProjectionMatrix(); }
    if(mesh){ mesh.rotation.y=yaw+Math.PI; if(!dragging) yaw+=0.006; }
    rnd.render(sc,cam);
  }
  /* hook open + equip changes (via window._i2 — bare i2Open is IIFE-scoped) */
  window._i2.wrapOpen(()=>{ rebuild(); if(!raf) loop(); });
  const _eq=equipItem;
  equipItem=function(){ _eq.apply(this,arguments); if(window._inv3dRefresh) window._inv3dRefresh(); };
})();

/* ================================================================
   ⟐ MAP TRANSITION SCREEN (master-fix §15) — cinematic zone travel.
   Wired into the existing portal hop (town ⇄ Isla ng Bathala).
   Lightweight: pure DOM/CSS, ~1.4s, no asset loading needed since
   both zones share the world scene (true instancing = backlog).
   ================================================================ */
(function mapTransition(){
  const LORE={
    isla:['🏝️','ISLA NG BATHALA','"Dito nagpapahinga ang mga sinaunang halimaw —\nat ang mga bayaning sumusubok sa kanila."'],
    town:['🏮','DAKILANG TIANGGE','"Sa bawat parol na sindi,\nmay kuwento ng pag-uwi."'],
  };
  const TIPS=[
    'Tip: Pindutin nang matagal ang 🎙️ sa chat para mag-voice message.',
    'Tip: Ang mga elite (⭐) ay mas malakas — pero mas maganda ang drops.',
    'Tip: Kapag gabi, mas maraming aswang — at mas malaki ang gantimpala.',
    'Tip: Si Aling Rosa ay nagpapagaling nang LIBRE. Dalawin mo siya!',
    'Tip: I-upgrade ang gamit sa Pandayan ni Panday Iko (+1 → +10).',
  ];
  window._mapLore=LORE; // Phase 1: let the Map Instance Manager add destination lore
  const ov=document.createElement('div');
  ov.id='map-trans';
  ov.innerHTML='<div class="mt-rune">ᜀ</div><div class="mt-logo">⟐ AGIMAT ONLINE ⟐</div>'+
    '<div class="mt-zone"></div><div class="mt-lore"></div><div class="mt-bar"><i></i></div><div class="mt-tip"></div>';
  document.body.appendChild(ov);
  window._mapTransition=function(zone,done){
    const [ic,name,lore]=LORE[zone]||LORE.town;
    ov.querySelector('.mt-rune').textContent=['ᜀ','ᜊ','ᜃ','ᜄ','ᜎ'][Math.floor(Math.random()*5)];
    ov.querySelector('.mt-zone').textContent=ic+' '+name;
    ov.querySelector('.mt-lore').textContent=lore;
    ov.querySelector('.mt-tip').textContent=TIPS[Math.floor(Math.random()*TIPS.length)];
    ov.classList.add('show');
    const bar=ov.querySelector('.mt-bar i');
    bar.style.transition='none'; bar.style.width='0%';
    requestAnimationFrame(()=>{ bar.style.transition='width 1.1s ease'; bar.style.width='100%'; });
    setTimeout(()=>{ try{ done&&done(); }catch(e){} },700);
    setTimeout(()=>ov.classList.remove('show'),1500);
  };
})();

/* ================================================================
   🧭 LEFT NAV RAIL (master-fix §5) — inventory window navigation
   moves from bottom tabs to a vertical RPG rail on the left.
   ================================================================ */
(function leftRail(){
  const root=document.getElementById('inv2'); if(!root) return;
  const nav=root.querySelector('.inv2-nav'); if(!nav) return;
  nav.classList.add('rail');
  /* runtime style so it cascades AFTER the injected inv2 styles */
  const st=document.createElement('style');
  st.textContent=`
    #inv2.open{flex-direction:row}
    #inv2 .inv2-top{position:absolute;top:0;left:64px;right:0;z-index:3;background:rgba(10,8,18,.85)}
    #inv2 .inv2-nav.rail{order:-1;flex:0 0 64px;flex-direction:column;justify-content:flex-start;gap:4px;
      padding:calc(52px + env(safe-area-inset-top)) 6px 10px;
      background:linear-gradient(180deg,rgba(14,10,24,.96),rgba(10,8,18,.98));
      border-right:1px solid rgba(201,162,75,.28)}
    #inv2 #i2-invmain{margin-top:calc(46px + env(safe-area-inset-top))}
    #inv2 #i2-mapwrap,#inv2 #i2-profwrap{margin-top:calc(46px + env(safe-area-inset-top))}
    @media (max-width:820px){
      #inv2 .inv2-nav.rail{flex-basis:56px}
      #inv2 .inv2-top{left:56px}
    }`;
  document.head.appendChild(st);
  /* add Alaga entry to the rail (routes to the existing pets window) */
  if(!nav.querySelector('[data-nav="pets"]')){
    const b=document.createElement('button');
    b.className='i2-nav'; b.dataset.nav='pets'; b.innerHTML='🐾 <s>Alaga</s>';
    b.onclick=()=>{ window.i2Close(); openPets(); };
    nav.appendChild(b);
  }
  /* icon + label markup for rail styling */
  nav.querySelectorAll('.i2-nav').forEach(b=>{
    if(b.dataset.nav==='pets') return;
    const [ic,...rest]=b.textContent.trim().split(' ');
    b.innerHTML=ic+' <s>'+rest.join(' ')+'</s>';
  });
})();

/* ================================================================
   🎁 DAILY REWARD v2 (master-fix §10) — modal-layer 7-day track w/
   claimed/today/locked states + countdown to the next reward.
   ================================================================ */
(function daily2(){
  const REWARD_PREVIEW=['🪙','🪙','🌿','🪙','💠','🌿','💎'];
  window._openDailyTrack=function(r){
    const now=new Date();
    const nxt=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1));
    const hrs=Math.floor((nxt-now)/3600000), mins=Math.floor(((nxt-now)%3600000)/60000);
    showModal(`
      <div class="modal-emoji">🎁</div><div class="modal-title">Gantimpala ng Araw!</div>
      <div class="daily-track v2">${[1,2,3,4,5,6,7].map(d=>{
        const st=d<r.streak?'done':d===r.streak?'today':'lock';
        return `<div class="daily-day ${st}">${st==='done'?'✓':REWARD_PREVIEW[d-1]}<i>Araw ${d}</i>${st==='lock'?'<u>🔒</u>':''}</div>`;
      }).join('')}</div>
      <p style="text-align:center;font-weight:800;color:#ffd94a;font-size:15px" class="daily-pop">${r.reward.desc}</p>
      <p style="text-align:center;color:#bfb6d2;font-size:12px">Sunod-sunod: <b>${r.streak}/7</b> · Susunod na regalo sa <b>${hrs}h ${mins}m</b></p>
      <button class="modal-btn" onclick="closeModal()">🙏 Salamat po!</button>`);
  };
  const _cd=claimDaily;
  claimDaily=async function(){
    if(!ACCT.token) return;
    const r=await api('/api/daily',{token:ACCT.token});
    if(!r.ok||r.already) return;
    if(r.claimed&&r.reward){
      S.gold+=r.reward.gold||0;
      if(r.reward.mats) for(const [id,q] of Object.entries(r.reward.mats)) addInv(id,q);
      updateHUD(); save(); SFX.levelup();
      window._openDailyTrack(r);
    }
  };
})();

/* ================================================================
   🗺️ MAP INSTANCING (master-fix §6–§8) — the world is partitioned
   into ZONE INSTANCES: MAINLAND (Barangay Liwanag + wilds) and
   ISLA NG BATHALA. Only the active zone's static objects live in
   the scene graph; the other side is fully detached (no draw calls,
   no raycasts, no matrix updates). Enemies simulate ONLY in the
   active zone. Difficulty comes from data (spawn-rules zoneTiers).
   ================================================================ */
(function mapInstancing(){
  const SPLIT=((ISLE.x0-4)*TILE);          // ocean gap between mainland & isla
  const buckets={mainland:[],isla:[]};
  let active=null;

  /* ---------- one-time partition of the static world ---------- */
  const DYNAMIC=new Set();                  // meshes we must never touch
  if(player.mesh) DYNAMIC.add(player.mesh);
  for(const en of enemies) DYNAMIC.add(en.mesh);
  function isShared(o){
    /* lights, sky, sun, clouds, terrain (origin-anchored), water */
    if(o.isLight||o.isSprite) return true;
    if(Math.abs(o.position.x)<0.001&&Math.abs(o.position.z)<0.001) return true;
    return false;
  }
  (function partition(){
    for(const o of [...scene.children]){
      if(DYNAMIC.has(o)||isShared(o)) continue;
      (o.position.x>=SPLIT?buckets.isla:buckets.mainland).push(o);
    }
  })();

  /* ---------- zone switching ---------- */
  function cullEnemiesOutside(zone){
    for(const en of [...enemies]){
      const enZone=en.x>=SPLIT?'isla':'mainland';
      if(enZone!==zone) removeEnemy(en);
    }
    eprojs.length=0;
  }
  function doSwitch(zone,silent){
    if(zone===active) return;
    const out=zone==='isla'?buckets.mainland:buckets.isla;
    const inn=zone==='isla'?buckets.isla:buckets.mainland;
    for(const o of out){ scene.remove(o); }
    for(const o of inn){ if(!o.parent) scene.add(o); }
    active=zone;
    cullEnemiesOutside(zone);
    if(!silent) console.log('[zone] switched to',zone,'· detached',out.length,'· attached',inn.length);
  }
  window._zoneActive=()=>active;
  window._zoneDebug=()=>({active,mainland:buckets.mainland.length,isla:buckets.isla.length});
  /* late-added statics (world-spec props etc.) must join a bucket, or they
     would render in BOTH zones */
  window._zoneAdopt=(o)=>{
    const zone=o.position.x>=SPLIT?'isla':'mainland';
    buckets[zone].push(o);
    if(active&&zone!==active) scene.remove(o);
  };

  /* boot: activate wherever the player stands */
  doSwitch(player.x>=SPLIT?'isla':'mainland',true);

  /* watcher: any teleport/portal/respawn crossing the split flips the zone */
  setInterval(()=>{ if(started) doSwitch(player.x>=SPLIT?'isla':'mainland'); },700);

  /* ---------- spawn gating: only camps of the active zone ---------- */
  const _campsFor=campsFor;
  campsFor=function(key){
    const all=_campsFor(key);
    if(!active) return all;
    return all.filter(c=>(c.x>=SPLIT?'isla':'mainland')===active);
  };
  /* world boss (volcano = mainland): don't fly while we're on the isla */
  const _spawnBoss=typeof spawnBoss==='function'?spawnBoss:null;
  if(_spawnBoss) spawnBoss=function(){ if(active==='mainland') _spawnBoss.apply(this,arguments); else bossNextAt=nowS()+60; };

  /* ---------- §7 difficulty tiers (data: spawn-rules zoneTiers) ---------- */
  const ZT=(SPAWN_RULES&&SPAWN_RULES.zoneTiers)||{};
  function tierAt(x,z){
    try{
      const tx=clamp(Math.floor(x/TILE),0,MAP_W-1), ty=clamp(Math.floor(z/TILE),0,MAP_H-1);
      return ZT[String(zoneGrid[ty*MAP_W+tx])]||null;
    }catch(e){ return null; }
  }
  /* new spawns get zone multipliers applied post-spawn (no core rewrite) */
  const _spawnEnemy=spawnEnemy;
  spawnEnemy=function(){
    const before=enemies.length;
    _spawnEnemy.apply(this,arguments);
    for(let i=before;i<enemies.length;i++){
      const en=enemies[i], t=tierAt(en.x,en.z);
      if(!t) continue;
      en.hp=Math.round(en.hp*(t.hp||1));
      en.maxHp=Math.round(en.maxHp*(t.hp||1));
      en.dmgMul=t.dmg||1;
      en.rewardMul=t.reward||1;
    }
  };
  /* damage out: enemies in harder zones hit harder */
  const _dealTo=dealTo;
  dealTo=function(tgt,dmg,opts){
    const m=(opts&&opts._srcEn&&opts._srcEn.dmgMul)||1;
    _dealTo(tgt,dmg*m,opts);
  };
  /* rewards: XP + gold scale with the zone tier (transient multiplier) */
  const _gainXP=gainXP;
  gainXP=function(x){ _gainXP(Math.round(x*(window._rwMul||1))); };
  const _sgd=spawnGoldDrop;
  spawnGoldDrop=function(x,z,q){ _sgd(x,z,Math.round(q*(window._rwMul||1))); };
  const _kr=killReward;
  killReward=function(en){
    window._rwMul=en.rewardMul||1;
    try{ _kr(en); } finally { window._rwMul=1; }
  };
})();

/* ================================================================
   🐾 NEW COMPANIONS (master-fix §9) — Santelmo + Sigbin, integrated
   with the EXISTING Alaga engine (S.pets.xp leveling · hunger ·
   PET_AURAS · feeding · openPetsV2 UI). No duplicate progression.
   ================================================================ */
(function newCompanions(){
  PET_DEFS.santelmo={name:'Santelmo', icon:'🔥', cost:12000, type:'pet',
    desc:'Ligaw na apoy ng latian. +3% Attack (lumalakas kada level).',
    build(){ const g=new THREE.Group();
      const core=new THREE.Mesh(new THREE.SphereGeometry(0.22,8,7), M(0x7df0ff,{emissive:0x2ad4ff,emissiveIntensity:2.2})); core.position.y=0.7; g.add(core);
      const flame=new THREE.Mesh(new THREE.ConeGeometry(0.16,0.5,6), M(0xaef4ff,{emissive:0x7df0ff,emissiveIntensity:1.4,transparent:true,opacity:0.8}));
      flame.position.y=1.02; g.add(flame);
      const glow=new THREE.PointLight(0x4ad4ff,0.8,6); glow.position.y=0.8; g.add(glow);
      return g; }};
  PET_DEFS.sigbin={name:'Sigbin', icon:'🐐', cost:30000, type:'mount',
    desc:'Anino ng gabi — SAKYAN: +80% bilis! Naglalakad nang paatras.',
    build(){ const g=new THREE.Group();
      const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.45,1.0,4,8), M(0x241a30)); body.rotation.z=Math.PI/2; body.position.y=0.9; g.add(body);
      const head=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.42,0.55), M(0x2e2240)); head.position.set(0,1.12,0.85); g.add(head);
      for(const sx of [-1,1]){
        const ear=new THREE.Mesh(new THREE.ConeGeometry(0.09,0.5,4), M(0x241a30)); ear.position.set(sx*0.16,1.5,0.75); ear.rotation.z=sx*0.35; g.add(ear);
        const eye=new THREE.Mesh(new THREE.SphereGeometry(0.05,5,4), M(0xff4a2a,{emissive:0xff2a00,emissiveIntensity:2})); eye.position.set(sx*0.1,1.15,1.12); g.add(eye);
        for(const fz of [0.5,-0.5]){
          const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.05,0.9,5), M(0x1c1426)); leg.position.set(sx*0.24,0.42,fz); g.add(leg);
        }
      }
      return g; }};
  /* auras + favorites plug into the existing engine */
  PET_AURAS.santelmo=[['atkPct',3,3]];
  PET_AURAS.sigbin=[];
  PET_FAVES.santelmo='sinigang';
  PET_FAVES.sigbin='kinilaw';
  /* sigbin ride: base mount 1.6 → 1.8 (+12.5%), hungry penalty like kalabaw */
  const _cs=computeStats;
  computeStats=function(){
    _cs.apply(this,arguments);
    if(S.pets&&S.pets.active==='sigbin'&&S.pets.mounted){
      P.spd*=1.125;
      if(!petFed('sigbin')) P.spd*=0.906;
    }
  };
})();

/* ================================================================
   🧭 HUD REGIONS REBUILD (master-fix §2) — responsive regions
   instead of fragile absolute offsets.
     TOP-LEFT   avatar·name·level·HP·XP·gold   (existing .hud-left)
     TOP-CENTER channel·players·time·buffs·location  (NEW #hud-center)
     TOP-RIGHT  ☰ menu                        (existing .hud-right)
     LEFT-MID   quest tracker · BOTTOM-LEFT joystick ·
     BOTTOM-CENTER chat · RIGHT combat cluster  (all existing)
   The 4 status chips were pinned at 50%±Npx fixed offsets and
   collided on narrow screens + toast stack. They are ADOPTED into
   the flex region (logic untouched — same elements, same timers).
   ================================================================ */
(function hudRegions(){
  const hud=document.getElementById('hud'); if(!hud) return;
  const right=hud.querySelector('.hud-right');
  const center=document.createElement('div');
  center.id='hud-center';
  hud.insertBefore(center,right);

  /* 📍 location chip (spec: current location in top-center) */
  const loc=document.createElement('div');
  loc.id='loc-chip'; loc.className='hc-adopt';
  loc.style.cssText='background:rgba(20,14,34,.72);border:1px solid rgba(255,217,122,.35);color:#f0d58c;font:700 11px system-ui;padding:4px 10px;border-radius:999px;backdrop-filter:blur(6px);pointer-events:none;display:none';
  center.appendChild(loc);
  setInterval(()=>{
    if(!started){ loc.style.display='none'; return; }
    const t=document.getElementById('mm-title');
    if(t&&t.textContent){ loc.textContent='📍 '+t.textContent; loc.style.display='block'; }
  },1500);

  /* adopt the status chips into the region (order = display order) */
  const ADOPT=['dn-chip','party-pill','party-buff-chip','food-chip'];
  function adopt(){
    for(const id of ADOPT){
      const el=document.getElementById(id);
      if(el&&el.parentElement!==center){
        el.classList.add('hc-adopt');
        el.style.position='static'; el.style.transform='none';
        el.style.left='auto'; el.style.top='auto'; el.style.right='auto';
        center.appendChild(el);
      }
    }
  }
  adopt();
  setInterval(adopt,3000);   // chips created by later modules get pulled in too
  window._hudCenter=center;
})();

/* ================================================================
   🔎 INVENTORY SEARCH · SORT · RARITY FILTERS (master-fix §3 final)
   Toolbar above the bag grid: text search (gamit + materyales),
   sort select (Rarity / iLv / Halaga / Bago), 5 rarity filter dots.
   Uses window._i2 (module-scope export hook) — replaces i2Grid with
   a filtered version that keeps identical cell markup + handlers.
   ================================================================ */
(function invFilters(){
  const H=window._i2; if(!H) return;
  const grid=document.getElementById('i2-grid'); if(!grid) return;
  const F={q:'', sort:'rarity', rar:new Set()};
  window._i2F=F;
  const RARS=['common','uncommon','rare','epic','legendary'];
  const RCOL={common:'#c9d4d9',uncommon:'#6fdf8f',rare:'#6fa8ff',epic:'#c08aff',legendary:'#ffb84a'};

  /* ---------- toolbar DOM ---------- */
  const bar=document.createElement('div');
  bar.id='i2-filterbar';
  bar.innerHTML=
    '<div class="i2f-row">'+
      '<div class="i2f-search"><span>🔎</span>'+
        '<input id="i2f-q" type="text" placeholder="Hanapin…" autocomplete="off">'+
        '<button id="i2f-clr" class="hidden">✕</button></div>'+
      '<select id="i2f-sort" title="Ayusin">'+
        '<option value="rarity">✨ Rarity</option>'+
        '<option value="ilvl">📈 iLv</option>'+
        '<option value="value">🪙 Halaga</option>'+
        '<option value="new">🕐 Bago</option>'+
      '</select>'+
    '</div>'+
    '<div class="i2f-rars">'+RARS.map(r=>
      '<button class="i2f-rar" data-r="'+r+'" style="--rc:'+RCOL[r]+'" title="'+r+'"></button>').join('')+
      '<span id="i2f-n"></span>'+
    '</div>';
  grid.parentElement.insertBefore(bar,grid);

  const qIn=bar.querySelector('#i2f-q'), clr=bar.querySelector('#i2f-clr');
  qIn.addEventListener('input',()=>{ F.q=qIn.value.trim().toLowerCase(); clr.classList.toggle('hidden',!F.q); H.grid(); });
  clr.onclick=()=>{ qIn.value=''; F.q=''; clr.classList.add('hidden'); H.grid(); qIn.focus(); };
  bar.querySelector('#i2f-sort').onchange=e=>{ F.sort=e.target.value; H.grid(); };
  bar.querySelectorAll('.i2f-rar').forEach(b=>b.onclick=()=>{
    const r=b.dataset.r;
    if(F.rar.has(r)) F.rar.delete(r); else F.rar.add(r);
    b.classList.toggle('on',F.rar.has(r));
    H.grid();
  });

  /* ---------- filter pipeline (exposed for tests) ---------- */
  function passRar(r){ return F.rar.size===0||F.rar.has(r); }
  function passQ(name){ return !F.q||name.toLowerCase().includes(F.q); }
  window._i2Filter=function(items,mats){
    const gear=items.filter(it=>passRar(it.rarity)&&passQ(it.name));
    const ro={legendary:0,epic:1,rare:2,uncommon:3,common:4};
    if(F.sort==='rarity') gear.sort((a,b)=>ro[a.rarity]-ro[b.rarity]||b.ilvl-a.ilvl);
    else if(F.sort==='ilvl') gear.sort((a,b)=>b.ilvl-a.ilvl||ro[a.rarity]-ro[b.rarity]);
    else if(F.sort==='value') gear.sort((a,b)=>sellPrice(b)-sellPrice(a));
    else if(F.sort==='new') gear.sort((a,b)=>b.uid-a.uid);
    const m2=mats.filter(([id])=>passRar(MATERIALS[id].rarity)&&passQ(MATERIALS[id].name));
    return {gear,mats:m2};
  };

  /* ---------- i2Grid v2 (same cells/handlers, filtered) ---------- */
  H.setGrid(function(){
    const I2=H.I2, tab=I2.tab;
    let cells='';
    let shown=0, total=0;
    if(tab==='all'||tab==='weap'||tab==='armor'){
      const base=S.bag.filter(it=>tab==='all'||(tab==='weap'&&H.isWeapon(it))||(tab==='armor'&&!H.isWeapon(it)));
      total+=base.length;
      const {gear}=window._i2Filter(base,[]);
      shown+=gear.length;
      cells+=gear.map(it=>`<div class="i2-cell rc-${it.rarity} ${I2.sel&&I2.selKind==='bag'&&I2.sel.uid===it.uid?'sel':''}" data-uid="${it.uid}">
        ${it.icon}${(it.plus||0)>0?`<span class="pl">+${it.plus}</span>`:''}</div>`).join('');
    }
    if(tab==='all'||tab==='consum'||tab==='mats'||tab==='quest'){
      const base=Object.entries(S.inv).filter(([id,q])=>q>0&&MATERIALS[id])
        .filter(([id])=>tab==='all'||H.matTab(id)===tab);
      total+=base.length;
      const {mats}=window._i2Filter([],base);
      shown+=mats.length;
      mats.sort((a,b)=>(MATERIALS[a[0]].rarity==='common'?1:0)-(MATERIALS[b[0]].rarity==='common'?1:0));
      cells+=mats.map(([id,q])=>`<div class="i2-cell ${I2.sel&&I2.selKind==='mat'&&I2.sel.mat===id?'sel':''}" data-mat="${id}">
        ${MATERIALS[id].icon}<span class="q">${q>999?fmt(Math.floor(q/1000))+'k':q}</span></div>`).join('');
    }
    grid.innerHTML=cells||`<div style="grid-column:1/-1;text-align:center;color:#8a80a2;padding:24px 8px;font:600 12px system-ui">${
      (F.q||F.rar.size)?'Walang tugma sa paghahanap.':'Walang laman ang tab na ito.'}</div>`;
    const n=bar.querySelector('#i2f-n');
    n.textContent=(F.q||F.rar.size)?shown+'/'+total:'';
    grid.querySelectorAll('[data-uid]').forEach(c=>c.onclick=()=>{
      H.I2.sel=S.bag.find(i=>i.uid===+c.dataset.uid); H.I2.selKind='bag';
      H.detail(); H.grid(); H.doll();
    });
    grid.querySelectorAll('[data-mat]').forEach(c=>c.onclick=()=>{
      H.I2.sel={mat:c.dataset.mat}; H.I2.selKind='mat';
      H.detail(); H.grid(); H.doll();
    });
  });
  /* re-wire tab clicks through the hook (old handlers hold old closure) */
  document.getElementById('i2-tabs').querySelectorAll('.i2-tab').forEach(t=>t.onclick=()=>{
    H.I2.tab=t.dataset.tab;
    document.getElementById('i2-tabs').querySelectorAll('.i2-tab').forEach(x=>x.classList.toggle('on',x===t));
    H.grid();
  });
})();

/* ================================================================
   📖 ANG KODISE NG AGIMAT (Game Bible feature #1)
   The living encyclopedia of the kapuluan — PROGRESSIVE REVEAL:
   entries unlock as you actually encounter them (kill/collect/
   catch/cook/visit/own). Locked entries show as ??? silhouettes,
   fueling collection drive. 10 categories, one reusable window.
   Data comes from EXISTING top-level defs (ENEMY_DEFS, MATERIALS,
   FISH_DEFS, DISHES, PET_DEFS, RUNE_DEFS, ZONE_NAMES, CLASSES,
   DIWA_DEFS, CATALOG) — no duplicated content, lore lives where
   it always lived. Save: S.codexSeen (additive; zones/dishes/misc
   flags only — most categories derive from existing save state).
   ================================================================ */
(function agimatCodex(){
  S.codexSeen=S.codexSeen||{zones:{},dishes:{},fish:{}};
  const seen=S.codexSeen;

  /* ---------- discovery hooks (all additive wraps) ---------- */
  /* zones: mark visited (poll — cheap) */
  setInterval(()=>{
    if(!started||player.dead) return;
    try{
      const tx=clamp(Math.floor(player.x/TILE),0,MAP_W-1), ty=clamp(Math.floor(player.z/TILE),0,MAP_H-1);
      const zn=zoneGrid[ty*MAP_W+tx];
      if(zn!=null&&!seen.zones[zn]){ seen.zones[zn]=1; save();
        toast('📖 <b>Kodise:</b> naitala ang lupain — '+ZONE_NAMES[zn],'loot'); }
    }catch(e){}
  },2500);
  /* dishes: wrap cook flow via FOOD.buffs watcher (buff id appears on cook) */
  setInterval(()=>{
    for(const id of Object.keys(FOOD.buffs)){
      if(!seen.dishes[id]){ seen.dishes[id]=1; save(); }
    }
  },3000);
  /* fish: S.inv presence marks catch (works retroactively for old saves) */
  setInterval(()=>{
    for(const fid of Object.keys(FISH_DEFS)){
      if((S.inv[fid]||0)>0&&!seen.fish[fid]){ seen.fish[fid]=1; save(); }
    }
  },3000);

  /* ---------- unlock predicates per category ---------- */
  const catData={
    halimaw:{ icon:'🐉', name:'Mga Halimaw', sub:'Mga nilalang ng kapuluan',
      items:()=>Object.entries(ENEMY_DEFS).map(([id,d])=>({
        id, icon:d.boss?'💀':d.tier==='Elite'?'⭐':'👹', name:d.name,
        unlocked:!!(S.bestiary[id]&&S.bestiary[id].seen),
        sub:d.tier+' · '+(d.role||''),
        body:(d.lore||'')+(S.bestiary[id]?`<br><b style="color:#ffd94a">⚔️ Napatay: ${fmt(S.bestiary[id].kills||0)}</b> · Gantimpala: ${d.dropText||'—'}`:''),
        hint:'Makita ang nilalang na ito sa mundo.'}))},
    materyales:{ icon:'🪨', name:'Mga Materyales', sub:'Yaman ng lupain',
      items:()=>Object.entries(MATERIALS).filter(([id])=>!FISH_DEFS[id]).map(([id,m])=>({
        id, icon:m.icon, name:m.name,
        unlocked:(S.inv[id]||0)>0||!!(seen.fish[id]),
        sub:m.rarity.toUpperCase(),
        body:(m.lore||'')+`<br><b style="color:#7df0ff">Meron ka: ${fmt(S.inv[id]||0)}</b>`,
        hint:'Mangalap o makakuha mula sa mga halimaw.'}))},
    isda:{ icon:'🎣', name:'Mga Huli sa Tubig', sub:'Biyaya ng dagat at ilog',
      items:()=>Object.entries(FISH_DEFS).map(([id,f])=>({
        id, icon:f.icon, name:f.name,
        unlocked:!!seen.fish[id]||(S.inv[id]||0)>0,
        sub:f.rarity.toUpperCase(),
        body:(MATERIALS[id]&&MATERIALS[id].lore)||'Sariwang huli mula sa tubig ng kapuluan.',
        hint:'Mangisda sa tabing-tubig (🎣).'}))},
    lutuin:{ icon:'🍲', name:'Mga Lutuin', sub:'Lutuan ng Bayan',
      items:()=>DISHES.map(d=>({
        id:d.id, icon:d.icon, name:d.name,
        unlocked:!!seen.dishes[d.id],
        sub:'Putahe',
        body:d.desc,
        hint:'Lutuin ito sa Lutuan ng Bayan.'}))},
    alaga:{ icon:'🐾', name:'Mga Alaga', sub:'Mga kasamang nilalang',
      items:()=>Object.entries(PET_DEFS).map(([id,d])=>({
        id, icon:d.icon, name:d.name,
        unlocked:(S.pets.owned||[]).includes(id),
        sub:(d.type==='mount'?'SASAKYAN':'ALAGA')+(d.bossOnly?' · World Boss drop':''),
        body:d.desc+((S.pets.owned||[]).includes(id)?`<br><b style="color:#8aff9a">Lv ${typeof petLvl==='function'?petLvl(id):1}</b>`:''),
        hint:d.bossOnly?'Bihirang regalo mula sa isang World Boss.':'Bilhin sa 🐾 Alaga window.'}))},
    baybayin:{ icon:'ᜀ', name:'Mga Baybayin Runes', sub:'Sinaunang sulat ng kapangyarihan',
      items:()=>Object.entries(RUNE_DEFS).map(([id,r])=>({
        id, icon:r.glyph, name:MATERIALS[id]?MATERIALS[id].name:id,
        unlocked:(S.inv[id]||0)>0||[...Object.values(S.gear),...S.bag].some(it=>it&&itemSockets(it).includes(id)),
        sub:'RUNE',
        body:(MATERIALS[id]&&MATERIALS[id].lore||'')+`<br><b style="color:#ffd94a">${r.desc}</b>`,
        hint:'Nahuhulog mula sa mga Elite at Boss (bihirang-bihira).'}))},
    lupain:{ icon:'🗺️', name:'Mga Lupain', sub:'Ang kapuluan mismo',
      items:()=>ZONE_NAMES.map((nm,i)=>({
        id:'z'+i, icon:nm.split(' ')[0], name:nm.replace(/^\S+ /,''),
        unlocked:!!seen.zones[i],
        sub:'Lupain',
        body:'<i>"'+(ZONE_FLAVORS[i]||'')+'"</i>',
        hint:'Maglakbay patungo sa lupaing ito.'}))},
    uri:{ icon:'🧙', name:'Mga Uri ng Bayani', sub:'Mga landas ng kapangyarihan',
      items:()=>Object.entries(CLASSES).map(([id,c])=>({
        id, icon:'🧙', name:c.name+(ADV_DEFS[id]?' → '+ADV_DEFS[id].name:''),
        unlocked:true,
        sub:c.role+' · '+c.weapon,
        body:c.desc+(id===S.cls?'<br><b style="color:#8aff9a">← Ito ang landas mo</b>':''),
        hint:''}))},
    diwa:{ icon:'✨', name:'Diwa at Agimat', sub:'Mga espiritu ng pagkatao',
      items:()=>[...DIWA_DEFS.map(d=>({
        id:'d_'+d.id, icon:d.icon, name:'Diwa ng '+d.name,
        unlocked:true, sub:d.tl+' · '+d.fx,
        body:d.desc+(S.diwa===d.id?'<br><b style="color:#8aff9a">← Ang diwa mo</b>':''), hint:''})),
        ...AGIMAT0_DEFS.map(a=>({
        id:'a_'+a.id, icon:a.icon, name:a.name,
        unlocked:true, sub:a.cat+' · '+a.fx,
        body:a.desc+(S.agimat0===a.id?'<br><b style="color:#8aff9a">← Ang pamana mo</b>':''), hint:''}))]},
    alamat:{ icon:'⚔️', name:'Mga Alamat na Kagamitan', sub:'Kodise ng kagamitan',
      items:()=>CATALOG.map(d=>{
        const owned=[...Object.values(S.gear),...S.bag].some(it=>it&&it.catalog===d.id);
        const rar=RARITIES.find(r=>r.id===d.rarity)||{name:d.rarity,color:'#fff'};
        return { id:d.id, icon:d.icon, name:d.name,
          unlocked:owned,
          sub:rar.name+' · Lv '+d.tier+'+',
          body:'<i>"'+(d.lore||'')+'"</i>',
          hint:'Nahuhulog mula sa mga halimaw, tindahan, at lagusan.'};})},
  };

  /* ---------- window ---------- */
  const CATS=Object.keys(catData);
  let curCat='halimaw';
  function counts(cat){
    const list=catData[cat].items();
    return [list.filter(e=>e.unlocked).length,list.length];
  }
  window.openKodise=function(cat){
    curCat=cat||curCat;
    const c=catData[curCat];
    const list=c.items();
    const [u,t]=[list.filter(e=>e.unlocked).length,list.length];
    const totals=CATS.reduce((a,k)=>{ const [x,y]=counts(k); return [a[0]+x,a[1]+y]; },[0,0]);
    showModal(`<div class="modal-title" style="margin:0 0 2px">📖 ANG KODISE NG AGIMAT</div>
      <div style="font:600 10.5px var(--ff);color:#8a80a2;margin-bottom:8px">Naitala: <b style="color:#ffd94a">${totals[0]}/${totals[1]}</b> — ang kapuluan ay may mga lihim pa.</div>
      <div class="kdx-tabs">${CATS.map(k=>{
        const [x,y]=counts(k);
        return `<button class="kdx-tab ${k===curCat?'on':''}" data-k="${k}" title="${catData[k].name}">${catData[k].icon}<i>${x}/${y}</i></button>`;}).join('')}
      </div>
      <div style="font:800 12px var(--ff);color:#ffd94a;margin:6px 0 2px">${c.icon} ${c.name} — ${u}/${t}</div>
      <div style="font:600 10px var(--ff);color:#8a80a2;margin-bottom:6px">${c.sub}</div>
      <div class="kdx-list">${list.map(e=>e.unlocked
        ?`<div class="kdx-row"><span class="kdx-ic">${e.icon}</span>
            <div class="kdx-inf"><b>${e.name}</b><i>${e.sub}</i><p>${e.body}</p></div></div>`
        :`<div class="kdx-row lock"><span class="kdx-ic">❓</span>
            <div class="kdx-inf"><b>???</b><i>${e.sub||'—'}</i><p style="color:#6a6284">${e.hint||'May lihim pa rito…'}</p></div></div>`).join('')}
      </div>
      <button class="modal-btn" onclick="closeModal()" style="margin-top:8px">Isara</button>`);
    document.querySelectorAll('.kdx-tab').forEach(b=>b.onclick=()=>window.openKodise(b.dataset.k));
  };

  /* ---------- entry points: ☰ menu tile + Aklat panel button ---------- */
  (function(){
    const grid=document.querySelector('#mainmenu .mm-grid');   // first grid = KARAKTER
    if(grid){
      const t=document.createElement('div');
      t.className='mm-tile'; t.dataset.mm='btn-kodise';
      t.innerHTML='<b>📖</b><span>Kodise ng Agimat</span>';
      t.onclick=()=>{ document.getElementById('mainmenu').classList.remove('open'); window.openKodise(); };
      grid.appendChild(t);
    }
    /* proxy button so mm-tile fallback logic never hides it */
    const pb=document.createElement('button');
    pb.id='btn-kodise'; pb.style.display='none';
    pb.onclick=()=>window.openKodise();
    (document.getElementById('menu-tray')||document.body).appendChild(pb);
  })();

  /* ---------- achievements ---------- */
  ACH_DEFS.push(
    {id:'kdx25', icon:'📖', name:'Mag-aaral ng Kapuluan', desc:'Maitala ang 25 entries sa Kodise',
      chk:()=>CATS.reduce((n,k)=>n+catData[k].items().filter(e=>e.unlocked).length,0)>=25, rw:{gold:2500}},
    {id:'kdx60', icon:'📚', name:'Tagapag-ingat ng Alamat', desc:'Maitala ang 60 entries sa Kodise',
      chk:()=>CATS.reduce((n,k)=>n+catData[k].items().filter(e=>e.unlocked).length,0)>=60, rw:{gold:12000}, title:'Tagapag-ingat ng Alamat'},
  );
})();

/* ================================================================
   🌟 ANG APAT NA PAG-ANGAT — the four advancement rituals
   (Game Bible: advancement as ritual EVENT · user spec: Lv20/40/60/80)
   Every class walks a ladder rooted in PHILIPPINE MYTHOLOGY:
   real epic heroes (Lam-ang, Aliguyon, Bantugan, Bernardo Carpio),
   deities (Apolaki, Mayari, Sidapa, Lakapati, Kanlaon, Bathala,
   Anitun Tabu, Dumakulem), Sitan's agents (Mangagaway, Hukluban),
   and authentic titles (Mumbaki = Ifugao ritual priest, Punong
   Guro = real arnis grandmaster rank, Lakan = precolonial ruler).
   Save: S.advT tier 0..4 (ADDITIVE; migration S.adv===true → 1).
   Tier-1 names/perks (ADV_DEFS) unchanged — never renamed.
   ================================================================ */
(function apatNaPagAngat(){
  /* ---------- the ladders (tiers 2..4; tier 1 = existing ADV_DEFS) ---------- */
  const ADV_TIERS={
    babaylan:[
      {lvl:40, name:'Mumbaki',              icon:'🪶', lore:'Ang ritwal-pari ng mga Ifugao — tagapamagitan sa mga anito ng payyo.',
        perk:'+10% Max HP · +5% Cooldown Speed', apply:st=>{ st.hpM*=1.10; st.cdr+=5; }},
      {lvl:60, name:'Sugo ni Lakapati',     icon:'🌾', lore:'Hinirang ni Lakapati, ang mabait na diwata ng kasaganaan at ani.',
        perk:'+8% Attack · +8% Life Steal', apply:st=>{ st.atkM*=1.08; st.ls+=8; }},
      {lvl:80, name:'Tinig ni Bathala',     icon:'⚡', lore:'Kapag nagsalita ka, ang langit mismo ang umaalingawngaw.',
        perk:'+12% ATK · +12% HP · +10% CDR', apply:st=>{ st.atkM*=1.12; st.hpM*=1.12; st.cdr+=10; }},
    ],
    arnisador:[
      {lvl:40, name:'Punong Guro',          icon:'🎓', lore:'Ang tunay na ranggo ng dakilang guro ng arnis — panginoon ng dalawang yantok.',
        perk:'+15% Crit Damage · +4% Move Speed', apply:st=>{ st.critDmg+=15; st.spdM*=1.04; }},
      {lvl:60, name:'Bantugan ng Darangen', icon:'🛶', lore:'Muling nabuhay ang prinsipeng mandirigma ng epikong Maranao sa iyong mga kamay.',
        perk:'+12% Attack · +8% Crit Chance', apply:st=>{ st.atkM*=1.12; st.critCh+=8; }},
      {lvl:80, name:'Dugong Lam-ang',       icon:'🐓', lore:'Ang dugo ng bayaning Ilocano na nakipaglaban sa buong tribu — at nanalo.',
        perk:'+20% Attack · +25% Crit Damage', apply:st=>{ st.atkM*=1.20; st.critDmg+=25; }},
    ],
    tirador:[
      {lvl:40, name:'Tagatudla',            icon:'🎯', lore:'Walang batong lumilihis. Ang tudla mo ay panata.',
        perk:'+20% Crit Damage', apply:st=>{ st.critDmg+=20; }},
      {lvl:60, name:'Mata ng Tigmamanukan', icon:'🐦', lore:'Ang ibong sugo ni Bathala ay nagpahiram ng paningin nito sa iyo.',
        perk:'+10% Crit Chance · +8% Attack', apply:st=>{ st.critCh+=10; st.atkM*=1.08; }},
      {lvl:80, name:'Sinag ni Apolaki',     icon:'☀️', lore:'Bawat bato mo ay sinag ng diyos ng araw at digmaan — tumatama bago pa marinig.',
        perk:'+15% Attack · +40% Crit Damage', apply:st=>{ st.atkM*=1.15; st.critDmg+=40; }},
    ],
    alim:[
      {lvl:40, name:'Anak ng Habagat',      icon:'🌧️', lore:'Ang hanging habagat ay kumikilala sa iyo bilang kadugo.',
        perk:'+10% Attack', apply:st=>{ st.atkM*=1.10; }},
      {lvl:60, name:'Alagad ni Anitun Tabu',icon:'🌩️', lore:'Ang diwata ng hangin at ulan ay bumubulong ng mga lihim ng unos.',
        perk:'+10% CDR · +10% Max HP', apply:st=>{ st.cdr+=10; st.hpM*=1.10; }},
      {lvl:80, name:'Apo ng Apat na Hangin',icon:'🌀', lore:'Amihan, Habagat, at lahat ng hangin ng kapuluan — sumusunod sa iyong utos.',
        perk:'+15% Attack · +15% CDR', apply:st=>{ st.atkM*=1.15; st.cdr+=15; }},
    ],
    mandirigma:[
      {lvl:40, name:'Lakan ng Digmaan',     icon:'👑', lore:'Ranggo ng mga sinaunang pinuno — ang tribo ay sumusunod sa iyong sigaw.',
        perk:'+10% Defense · +8% Attack', apply:st=>{ st.defM*=1.10; st.atkM*=1.08; }},
      {lvl:60, name:'Aliguyon ng Hudhud',   icon:'🗡️', lore:'Tulad ng bayani ng Hudhud, ang laban mo ay tumatagal ng taon — at hindi ka napapagod.',
        perk:'+15% Max HP · +10% Defense', apply:st=>{ st.hpM*=1.15; st.defM*=1.10; }},
      {lvl:80, name:'Bisig ni Bernardo Carpio', icon:'⛰️', lore:'Ang bisig na pumipigil sa dalawang bundok — ngayon ay pumipigil sa dilim.',
        perk:'+25% Max HP · +20% Defense', apply:st=>{ st.hpM*=1.25; st.defM*=1.20; }},
    ],
    mamamana:[
      {lvl:40, name:'Tanod ng Kagubatan',   icon:'🌲', lore:'Ang gubat ay hindi mo na tahanan — ikaw na mismo ang gubat.',
        perk:'+10% Attack', apply:st=>{ st.atkM*=1.10; }},
      {lvl:60, name:'Alagad ni Dumakulem',  icon:'🏔️', lore:'Ang diyos-mangangaso ng mga bundok ay tinuruan kang tumudla sa pagitan ng dalawang tibok ng puso.',
        perk:'+10% Crit Chance · +20% Crit Damage', apply:st=>{ st.critCh+=10; st.critDmg+=20; }},
      {lvl:80, name:'Palaso ni Mayari',     icon:'🌙', lore:'Ang palaso ng diwata ng buwan — tahimik na liwanag na hindi nagmimintis sa gabi.',
        perk:'+15% Attack · +50% Crit Damage', apply:st=>{ st.atkM*=1.15; st.critDmg+=50; }},
    ],
    anino:[
      {lvl:40, name:'Bangungot',            icon:'😴', lore:'Ikaw ang panaginip na hindi kinagigisnan. Ang mga kalaban mo ay natutulog nang takot.',
        perk:'+12% Attack', apply:st=>{ st.atkM*=1.12; }},
      {lvl:60, name:'Tigbanua ng Karimlan', icon:'👁️', lore:'Tulad ng mga aninong iisa ang mata na gumagala sa dilim ng Bagobo — nakikita ka nila, huli na.',
        perk:'+10% Crit Chance · +6% Move Speed', apply:st=>{ st.critCh+=10; st.spdM*=1.06; }},
      {lvl:80, name:'Anino ni Sidapa',      icon:'💀', lore:'Ang diyos ng kamatayan ay sumusukat ng buhay sa Bundok Madia-as. Ikaw ang panukat niya.',
        perk:'+18% Attack · +12% Crit Chance', apply:st=>{ st.atkM*=1.18; st.critCh+=12; }},
    ],
    mangkukulam:[
      {lvl:40, name:'Mangagaway',           icon:'🐍', lore:'Unang alagad ni Sitan — ang panginoon ng karamdaman at pangkukulam.',
        perk:'+10% Attack · +4% Life Steal', apply:st=>{ st.atkM*=1.10; st.ls+=4; }},
      {lvl:60, name:'Hukluban',             icon:'🌑', lore:'Ang hukluban ay nakapagpapabago ng anyo at nakapapatay sa isang kaway ng kamay.',
        perk:'+12% Max HP · +8% Life Steal', apply:st=>{ st.hpM*=1.12; st.ls+=8; }},
      {lvl:80, name:'Hinirang ni Sitan',    icon:'🔥', lore:'Ang panginoon ng Kasamaan ay pumili ng kanang kamay. Ikaw iyon.',
        perk:'+18% Attack · +10% Life Steal', apply:st=>{ st.atkM*=1.18; st.ls+=10; }},
    ],
    panday:[
      {lvl:40, name:'Tagapanday ng Apoy',   icon:'🔥', lore:'Hindi na bakal ang pinapanday mo — apoy mismo.',
        perk:'+8% Attack · +10% Defense', apply:st=>{ st.atkM*=1.08; st.defM*=1.10; }},
      {lvl:60, name:'Alagad ni Kanlaon',    icon:'🌋', lore:'Ang dakilang diyos ng bulkan ng Kabisayaan ay nagpapahiram ng kanyang pugon sa iyo.',
        perk:'+10% Attack · +12% Max HP', apply:st=>{ st.atkM*=1.10; st.hpM*=1.12; }},
      {lvl:80, name:'Panday ng mga Bathala',icon:'⚒️', lore:'Sa iyong palihan pinapanday ang mga sandata ng kalangitan.',
        perk:'+15% ATK · +15% HP · +10% DEF', apply:st=>{ st.atkM*=1.15; st.hpM*=1.15; st.defM*=1.10; }},
    ],
  };
  const TIER_COSTS=[
    null, null,                                                    /* [0],[1] handled by legacy flow */
    {gold:15000,  mats:{anito_dust:40, nuno_stone:5}},             /* T2 · Lv40 */
    {gold:60000,  mats:{diwata_dew:60, mutya:3}},                  /* T3 · Lv60 */
    {gold:200000, mats:{mutya:10, santelmo_flame:40}},             /* T4 · Lv80 */
  ];
  const TIER_LVL=[0,20,40,60,80];

  /* ---------- helpers ---------- */
  function tier(){ return S.advT||(S.adv?1:0); }
  function ladder(cls){ return ADV_TIERS[cls]||[]; }
  function tierDef(cls,t){ /* t: 1..4 */
    if(t===1) return ADV_DEFS[cls]?{name:ADV_DEFS[cls].name0||ADV_DEFS[cls].name,icon:ADV_DEFS[cls].icon,perk:ADV_DEFS[cls].perk,lore:''}:null;
    return ladder(cls)[t-2]||null;
  }
  /* mutate ADV_DEFS display name/icon → every existing UI site updates free */
  function syncName(){
    const A=ADV_DEFS[S.cls]; if(!A) return;
    if(!A.name0) A.name0=A.name;               /* preserve tier-1 name */
    const t=tier();
    if(t>=2){ const d=tierDef(S.cls,t); A.name=d.name; A.icon=d.icon; }
    else { A.name=A.name0; }
  }
  /* migration + late-load sync (S loads after module parse) */
  setInterval(()=>{ try{
    if(S.adv&&!S.advT) S.advT=1;
    syncName();
  }catch(e){} },2000);

  /* ---------- stats: tiers 2..4 stack on top of tier 1 ---------- */
  const _cs=computeStats;
  computeStats=function(){
    _cs.apply(this,arguments);
    const t=tier(); if(t<2||!ADV_TIERS[S.cls]) return;
    const st={atkM:1,hpM:1,defM:1,spdM:1,critCh:0,critDmg:0,ls:0,cdr:0};
    for(let k=2;k<=t;k++){ const d=tierDef(S.cls,k); if(d&&d.apply) d.apply(st); }
    P.atk=Math.round(P.atk*st.atkM);
    P.maxHp=Math.round(P.maxHp*st.hpM);
    P.def=Math.round(P.def*st.defM);
    P.spd*=st.spdM;
    P.critCh=Math.min(85,P.critCh+st.critCh);
    P.critDmg+=st.critDmg;
    P.lifesteal=Math.min(40,P.lifesteal+st.ls);
    P.cdr=Math.min(65,P.cdr+st.cdr);
    if(S.hp>P.maxHp) S.hp=P.maxHp;
  };

  /* ---------- ritual overlay (Bible: advancement as EVENT) ---------- */
  const ov=document.createElement('div');
  ov.id='adv-ritual';
  ov.innerHTML='<div class="ar-glow"></div><div class="ar-rune"></div><div class="ar-sub"></div><div class="ar-name"></div><div class="ar-perk"></div>';
  document.body.appendChild(ov);
  const GLYPHS=['ᜀ','ᜊ','ᜃ','ᜄ','ᜎ','ᜋ','ᜉ','ᜐ','ᜆ'];
  function playRitual(d,done){
    const aura=(typeof CLASS_AURA!=='undefined'&&CLASS_AURA[S.cls])?CLASS_AURA[S.cls].c:'rgba(255,217,74,.3)';
    ov.querySelector('.ar-glow').style.background='radial-gradient(circle at 50% 55%,'+aura+' 0%,transparent 60%)';
    ov.querySelector('.ar-rune').textContent=GLYPHS[Math.floor(Math.random()*GLYPHS.length)];
    ov.querySelector('.ar-sub').textContent='TINATAWAG KA NG MGA NINUNO…';
    ov.querySelector('.ar-name').textContent=d.icon+' '+d.name;
    ov.querySelector('.ar-perk').textContent='✦ '+d.perk;
    ov.classList.add('show');
    SFX.levelup();
    setTimeout(()=>{ screenShake(0.5,0.8); fxRing(player.x,player.z,0xffd94a,0.5,10,1.2); fxRing(player.x,player.z,0x7df0ff,0.3,7,1.0); },900);
    setTimeout(()=>{ ov.classList.remove('show'); done&&done(); },2600);
  }

  /* ---------- the new ceremony window (replaces openAdvance) ---------- */
  openAdvance=function(){
    const cls=S.cls; if(!ADV_DEFS[cls]) return;
    syncName();
    const t=tier(), next=t+1;
    const ladderHTML=[1,2,3,4].map(k=>{
      const d=tierDef(cls,k); if(!d) return '';
      const got=t>=k, now=next===k;
      return `<div class="ar-step ${got?'got':now?'now':'lock'}">
        <b>${got?'✓':TIER_LVL[k]}</b>
        <div><span>${d.icon} ${d.name}</span><i>${d.perk}</i>${d.lore&&(got||now)?`<p>${d.lore}</p>`:''}</div>
      </div>`;}).join('');
    if(next>4){
      showModal(`<div class="modal-emoji">${tierDef(cls,4).icon}</div>
        <div class="modal-title">ANG RUROK NG LANDAS</div>
        <p style="text-align:center;color:#bfb6d2">Narating mo na ang tuktok, <b style="color:#ffd94a">${tierDef(cls,4).name}</b>. Ang mga bathala mismo ay yumuyuko.</p>
        <div class="ar-ladder">${ladderHTML}</div>
        <button class="modal-btn" onclick="closeModal()">🙏</button>`);
      return;
    }
    const needLvl=TIER_LVL[next];
    const d=tierDef(cls,next);
    /* tier 1 keeps its legacy cost; 2..4 use TIER_COSTS */
    const cost=next===1?{gold:ADV_COST.gold,mats:{anito_dust:ADV_COST.anito_dust}}:TIER_COSTS[next];
    const lvlOk=S.level>=needLvl;
    const matOk=Object.entries(cost.mats).every(([m,q])=>(S.inv[m]||0)>=q);
    const can=lvlOk&&S.gold>=cost.gold&&matOk;
    const costTxt='🪙 '+fmt(cost.gold)+' + '+Object.entries(cost.mats).map(([m,q])=>`${MATERIALS[m].icon} ${MATERIALS[m].name} ×${q}`).join(' + ');
    const haveTxt='🪙'+fmt(S.gold)+' · '+Object.entries(cost.mats).map(([m,q])=>`${MATERIALS[m].icon}${S.inv[m]||0}/${q}`).join(' · ');
    showModal(`<div class="modal-emoji">${d.icon}</div>
      <div class="modal-title">SEREMONYA NG PAG-ANGAT ${['','I','II','III','IV'][next]}</div>
      <div class="ar-ladder">${ladderHTML}</div>
      ${lvlOk
        ?`<p style="text-align:center;font-size:12px;color:#bfb6d2">Handa ka na. Ang susunod na anyo mo:<br>
           <span style="font-size:18px;color:#ffd94a;font-weight:800">${d.icon} ${d.name}</span><br>
           <span style="color:#7dffce;font-size:12px">✦ ${d.perk}</span></p>
          <p style="text-align:center;font-size:11px"><b>Alay:</b> ${costTxt}<br>
           <span style="color:${can?'#8aff9a':'#ff8a8a'}">(Mayroon ka: ${haveTxt})</span></p>`
        :`<p style="text-align:center;font-size:12px;color:#8a80a2">Kailangan mong maging <b style="color:#ffd94a">Level ${needLvl}</b> para sa susunod na ritwal.<br>(Ngayon: Lv ${S.level})</p>`}
      ${can?'<button class="modal-btn" id="adv-go2">🌟 TANGGAPIN ANG TAWAG</button>'
          :lvlOk?'<button class="modal-btn" disabled style="opacity:.4">Kulang ang alay…</button>':''}
      <button class="modal-btn secondary" onclick="closeModal()">Mamaya na</button>`);
    const b=$('adv-go2');
    if(b) b.onclick=()=>{
      if(S.level<needLvl||S.gold<cost.gold) return;
      if(!Object.entries(cost.mats).every(([m,q])=>(S.inv[m]||0)>=q)) return;
      S.gold-=cost.gold;
      for(const [m,q] of Object.entries(cost.mats)){ S.inv[m]-=q; if(S.inv[m]<=0) delete S.inv[m]; }
      closeModal();
      playRitual(d,()=>{
        S.advT=next; if(next>=1) S.adv=true;
        syncName();
        computeStats(); S.hp=P.maxHp;
        for(let i=0;i<10;i++) setTimeout(()=>fxPuff(player.x+rnd(-2,2),groundY(player.x,player.z)+rnd(0.5,4),player.z+rnd(-2,2),0xffd94a,0.5,0.5),i*90);
        toast(`${d.icon} <b>IKAW NA SI ${d.name.toUpperCase()}!</b> ${d.perk}`,'levelup');
        if(window._chatSys) window._chatSys(`${d.icon} Umangat bilang ${d.name}! (Ritwal ${['','I','II','III','IV'][next]})`,'xp');
        achEvent('adv',1);
        refreshHudClass(); updateHUD(); save();
      });
    };
  };
  window.openAdvance=openAdvance;
  /* rebind the 🌟 button (old onclick captured the old closure) */
  const ab=document.getElementById('btn-advance');
  if(ab) ab.onclick=()=>openAdvance();
  /* show 🌟 whenever ANY next ritual is level-eligible (overrides legacy interval — registered later, wins the tick) */
  setInterval(()=>{
    if(!ab) return;
    const t=tier();
    const show=started&&S.cls&&t<4&&S.level>=TIER_LVL[t+1];
    ab.style.display=show?'':'none';
    const em=ab.querySelector('.badge');
    if(show&&!em){ const e=document.createElement('em'); e.className='badge'; e.textContent='!'; ab.appendChild(e); }
    if(!show&&em) em.remove();
  },3000);

  /* ---------- achievements ---------- */
  ACH_DEFS.push(
    {id:'adv2', icon:'🌟', name:'Ikalawang Anyo',  desc:'Tapusin ang Ritwal II (Lv40)', chk:()=>(S.advT||0)>=2, rw:{gold:8000}},
    {id:'adv3', icon:'💫', name:'Ikatlong Anyo',   desc:'Tapusin ang Ritwal III (Lv60)',chk:()=>(S.advT||0)>=3, rw:{gold:25000}},
    {id:'adv4', icon:'☀️', name:'Rurok ng Landas', desc:'Tapusin ang Ritwal IV (Lv80)', chk:()=>(S.advT||0)>=4, rw:{gold:100000}, title:'Hinirang ng mga Bathala'},
  );
})();

/* ================================================================
   🌍 KAPULUAN LIFE PACK — three Game Bible features in one module:
   [A] QUEST VARIETY — story chain continues (#7-#12) with NEW quest
       types: exploration(visit) · forage · fishing · cooking ·
       smithing(enhance) · MORAL CHOICE. Engine hooks are wraps on
       existing top-level fns — no core rewrites.
   [B] NPC REPUTATION — S.npcRel points grow from quests(+5, exists),
       purchases(+1) and daily visits; tiers unlock shop DISCOUNTS
       (5/10/15%) and a daily GIFT at Kaalyado+.
   [C] CONTEXTUAL INTERACTIONS — world-aware action button:
       🕊️ Balon ng Kahilingan (plaza well) · 🙏 Tabi-tabi po (Nuno
       Highlands) · 🐚 Pamumulot (beach). Own buff store + chip
       (NOT FOOD.buffs — its chip assumes DISHES ids).
   Save additive: S.quests.vset/vq · S.ctx · S.npcGift.
   ================================================================ */
(function kapuluanLife(){

  /* ============ [A] QUEST VARIETY ============ */
  if(!QUESTS.some(q=>q&&q.id===6)) QUESTS.push(
    {id:6, npc:'Ka Bining', icon:'🗺️', title:'Mapa ng Kapuluan',
     text:'Ang mga hinabi ko ay kulang sa kulay ng malalayong lupain. Maglakbay ka — tapakan mo ang APAT na lupain: Kawayan Grove, Gubat ng Balete, Nuno Highlands, at ang baybayin.',
     type:'visit', targets:[1,2,3,5], n:4, reward:{gold:6000, xp:10000}},
    {id:7, npc:'Aling Rosa', icon:'🌾', title:'Ani ng Lupa',
     text:'Anak, ang tiangge ay nabubuhay sa ani. Mangalap ka ng LABINLIMANG beses mula sa mga halaman at bato ng kapuluan.',
     type:'forage', n:15, reward:{gold:7000, xp:12000}},
    {id:8, npc:'Aling Rosa', icon:'🎣', title:'Biyaya ng Tubig',
     text:'Ang mga matanda ay nangangailangan ng sariwang isda. Mamingwit ka ng LIMANG huli mula sa tubig.',
     type:'fish', n:5, reward:{gold:8000, xp:14000}},
    {id:9, npc:'Aling Rosa', icon:'🍲', title:'Handaan ng Bayan',
     text:'May pista sa susunod na buwan ng anihan! Magluto ka ng TATLONG putahe sa Lutuan ng Bayan — subukan mo ang paborito ng mga anito.',
     type:'cook', n:3, reward:{gold:9000, xp:16000}},
    {id:10, npc:'Panday Iko', icon:'🔨', title:'Bakal na Banyuhay',
     text:'Ang bakal ay parang tao, kaibigan — kailangang dumaan sa apoy para lumakas. Magpanday ka ng TATLONG beses sa aking pandayan (+1 kahit alin).',
     type:'enhance', n:3, reward:{gold:10000, xp:18000}},
    {id:11, npc:'Ang Kubrador', icon:'📿', title:'Ang Nakawang Anting-anting',
     text:'Ssst… may nahanap akong anting-anting na ninakaw sa isang babaylan sa kabilang baryo. Mainit sa kamay. Kunin mo — ikaw na ang bahala kung saan ito dadalhin. Walang tanong.',
     type:'choice', n:1, reward:{gold:2000, xp:20000}},
  );
  /* veterans who finished the old 6-quest chain: reopen it */
  setInterval(()=>{ try{
    if(S.quests&&S.quests.done&&S.quests.cur<QUESTS.length){
      S.quests.done=false; save(); updateQuestHud();
      toast('📜 <b>Bagong kabanata!</b> May mga bagong misyon sa Tiangge — kausapin ang mga NPC.','levelup');
    }
    /* 'choice' quests are ready the moment they are current */
    const q=curQuest();
    if(q&&q.type==='choice'&&S.quests.prog<q.n){ S.quests.prog=q.n; updateQuestHud(); }
  }catch(e){} },4000);

  /* --- hooks: forage / fish / cook / enhance / visit --- */
  function chainBump(type,key){
    const q=curQuest(); if(!q||q.type!==type) return;
    if(type==='visit'){
      S.quests.vq=S.quests.vq??-1;
      if(S.quests.vq!==S.quests.cur){ S.quests.vq=S.quests.cur; S.quests.vset=[]; }
      if(!q.targets.includes(key)||S.quests.vset.includes(key)) return;
      S.quests.vset.push(key);
      S.quests.prog=S.quests.vset.length;
    } else S.quests.prog=Math.min(q.n,S.quests.prog+1);
    if(S.quests.prog>=q.n) toast(`📜 <b>${q.title}</b> — TAPOS NA! Bumalik kay ${q.npc}.`,'levelup');
    else toast(`📜 ${q.title}: ${S.quests.prog}/${q.n}`,'');
    updateQuestHud(); save();
  }
  const _hn=harvestNode;
  harvestNode=function(n){ _hn.apply(this,arguments); chainBump('forage'); };
  const _qp=window._questProg;
  window._questProg=function(kind,amt,key){
    _qp.apply(this,arguments);
    if(kind==='fish') chainBump('fish');
    if(kind==='cook') chainBump('cook');
    if(kind==='enhance') chainBump('enhance');
  };
  /* cooking increments achEvent('cook') not _questProg — bridge it */
  const _ae=achEvent;
  achEvent=function(kind,amt,key){ _ae.apply(this,arguments); if(kind==='cook') chainBump('cook'); };
  /* zone visits */
  setInterval(()=>{ try{
    if(!started||player.dead) return;
    const q=curQuest(); if(!q||q.type!=='visit') return;
    const tx=clamp(Math.floor(player.x/TILE),0,MAP_W-1), ty=clamp(Math.floor(player.z/TILE),0,MAP_H-1);
    chainBump('visit',zoneGrid[ty*MAP_W+tx]);
  }catch(e){} },2000);

  /* --- moral choice epilogue (wrap the shared turn-in) --- */
  const _ti=window._questTurnIn;
  window._questTurnIn=function(q){
    _ti.apply(this,arguments);
    if(q.type!=='choice') return;
    setTimeout(()=>{
      showModal(`<div class="modal-emoji">📿</div><div class="modal-title">ANG NAKAWANG ANTING-ANTING</div>
        <p style="text-align:center;font-size:12px;color:#bfb6d2">Hawak mo na ito. Mainit. Humihinga. Sa malayo, may isang babaylan na nagdadasal na maibalik ang kanyang kalasag ng kaluluwa…</p>
        <button class="modal-btn" id="mc-return">🕊️ IBALIK sa babaylan<br><small>+25,000 XP · pagpapala ng mga anito</small></button>
        <button class="modal-btn secondary" id="mc-keep">🌑 ITAGO — ibenta kay Kubrador<br><small>+15,000 ginto · walang tanong</small></button>`);
      const r=$('mc-return'), k=$('mc-keep');
      if(r) r.onclick=()=>{
        gainXP(25000);
        S.npcRel=S.npcRel||{}; for(const nid of ['trader','blacksmith','equipment']) S.npcRel[nid]=(S.npcRel[nid]||0)+10;
        closeModal(); SFX.levelup();
        toast('🕊️ <b>Ibinalik mo ang anting-anting.</b> Ramdam mo ang pasasalamat ng buong baryo. (+10 tiwala sa mga NPC)','levelup');
        if(window._chatSys) window._chatSys('🕊️ Pinili mo ang liwanag — ibinalik ang nakawang anting-anting.','xp');
        S.ctx=S.ctx||{}; S.ctx.moral='return'; save();
      };
      if(k) k.onclick=()=>{
        S.gold+=15000;
        S.npcRel=S.npcRel||{}; S.npcRel.blackmarket=(S.npcRel.blackmarket||0)+15;
        closeModal(); SFX.loot();
        toast('🌑 <b>Itinago mo ito.</b> Bigat sa bulsa, bigat sa dibdib. (+15,000 ginto · +15 tiwala kay Kubrador)','warn');
        if(window._chatSys) window._chatSys('🌑 Pinili mo ang dilim — ibinenta ang anting-anting.','xp');
        S.ctx=S.ctx||{}; S.ctx.moral='keep'; save();
      };
    },600);
  };

  /* ============ [B] NPC REPUTATION ============ */
  function relPts(nid){ return (S.npcRel&&S.npcRel[nid])||0; }
  function relTier(nid){
    const tiers=(window._npcData&&window._npcData.tiers)||[];
    let t=tiers[0]||{id:'stranger',label:'Estranghero',min:0};
    for(const x of tiers) if(relPts(nid)>=x.min) t=x;
    return t;
  }
  function repAdd(nid,amt){
    if(!nid) return;
    S.npcRel=S.npcRel||{};
    const before=relTier(nid).id;
    S.npcRel[nid]=Math.min(150,(S.npcRel[nid]||0)+amt);
    const after=relTier(nid);
    if(after.id!==before){
      const nm=(window._npcData&&window._npcData.defs[nid])?window._npcData.defs[nid].name:nid;
      toast(`🤝 <b>${nm}</b>: kayo na ay <b>${after.label}</b>!`,'levelup');
      SFX.loot();
    }
    save();
  }
  window._repAdd=repAdd;
  function discountFor(nid){
    const p=relPts(nid);
    return p>=100?0.15:p>=30?0.10:p>=15?0.05:0;
  }
  /* current shop context */
  const _onw=window.openNpcWindow;
  window.openNpcWindow=function(nid){ window._curNpcShop=nid; dailyGift(nid); _onw.apply(this,arguments); };
  const _ros=window._rawOpenShop;
  window._rawOpenShop=function(id){ window._curNpcShop=id; _ros.apply(this,arguments); };
  /* discount: buyPrice is top-level → reassignable */
  const _bp=buyPrice;
  buyPrice=function(it){
    const base=_bp(it), d=discountFor(window._curNpcShop);
    return d?Math.max(1,Math.round(base*(1-d))):base;
  };
  /* +1 rep per successful shop purchase (delegated; skip disabled buttons) */
  document.addEventListener('click',e=>{
    const b=e.target&&e.target.closest&&e.target.closest('.shop-buy,.mat-buy');
    if(b&&!b.disabled&&window._curNpcShop) repAdd(window._curNpcShop,1);
  },true);
  /* daily gift from Kaalyado+ (rep 60+) NPCs */
  function dailyGift(nid){
    if(relPts(nid)<60) return;
    S.npcGift=S.npcGift||{};
    const day=new Date().toISOString().slice(0,10);
    if(S.npcGift[nid]===day) return;
    S.npcGift[nid]=day;
    const gifts={trader:['palay',60],blacksmith:['bato',60],equipment:['dahon',60],blackmarket:['anito_dust',4]};
    const g=gifts[nid]||['palay',40];
    addInv(g[0],g[1]);
    const nm=(window._npcData&&window._npcData.defs[nid])?window._npcData.defs[nid].name:nid;
    toast(`🎁 <b>${nm}</b>: "Para sa kaalyado ko!" — ${MATERIALS[g[0]].icon} ${MATERIALS[g[0]].name} ×${g[1]}`,'loot');
    save();
  }

  /* ============ [C] CONTEXTUAL INTERACTIONS ============ */
  S.ctx=S.ctx||{};
  const CTXB={};   // own buff store: id -> {until, stat, v, icon, name}
  const _cs=computeStats;
  computeStats=function(){
    _cs.apply(this,arguments);
    const t=nowS();
    for(const b of Object.values(CTXB)){
      if(b.until<=t) continue;
      if(b.stat==='atk') P.atk=Math.round(P.atk*(1+b.v));
      else if(b.stat==='def') P.def=Math.round(P.def*(1+b.v));
      else if(b.stat==='hp') P.maxHp=Math.round(P.maxHp*(1+b.v));
      else if(b.stat==='drop') P.dropRate+=b.v*100;
      else if(b.stat==='xp') P.xpGain+=b.v*100;
    }
  };
  const WELL={x:68.6*TILE, z:44.6*TILE};
  const CTX_ACTIONS=[
    { id:'well', icon:'🕊️', label:'Balon',
      when:()=>d2(player.x,player.z,WELL.x,WELL.z)<7*7,
      cd:600,
      run(){
        if(S.gold<100){ toast('🪙 Kailangan ng 100 ginto para sa alay sa balon.','warn'); return false; }
        S.gold-=100;
        const wishes=[['atk','⚔️ Lakas ng Loob','+6% Atake'],['hp','❤️ Hininga ng Balon','+6% Max HP'],['def','🛡️ Balat-Bato','+6% Depensa'],['xp','✨ Liwanag ng Isip','+8% XP']];
        const w=wishes[rand(0,wishes.length-1)];
        CTXB.well={until:nowS()+300, stat:w[0], v:w[0]==='xp'?0.08:0.06, icon:'🕊️', name:w[1]};
        computeStats(); SFX.levelup();
        fxRing(WELL.x,WELL.z,0x7df0ff,0.4,4,0.8);
        toast(`🕊️ <b>${w[1]}</b> — ${w[2]} sa loob ng 5 minuto. Ang balon ay narinig ka.`,'levelup');
        return true;
      }},
    { id:'tabi', icon:'🙏', label:'Tabi-tabi po',
      when:()=>{ try{ const tx=clamp(Math.floor(player.x/TILE),0,MAP_W-1),ty=clamp(Math.floor(player.z/TILE),0,MAP_H-1); return zoneGrid[ty*MAP_W+tx]===3; }catch(e){ return false; } },
      cd:1200,
      run(){
        CTXB.tabi={until:nowS()+600, stat:'drop', v:0.06, icon:'🙏', name:'Paggalang sa Nuno'};
        computeStats(); SFX.loot();
        fxRing(player.x,player.z,0x8aff9a,0.3,3,0.6);
        let bonus='';
        if(Math.random()<0.15){ addInv('nuno_stone',1); bonus=' Isang <b>Nuno\'s Stone</b> ang lumitaw sa punso!'; }
        toast(`🙏 <b>"Tabi-tabi po…"</b> Ang mga nuno ay natuwa. +6% Drop Rate sa loob ng 10 min.${bonus}`,'loot');
        return true;
      }},
    { id:'shell', icon:'🐚', label:'Mamulot',
      when:()=>{ try{ const tx=clamp(Math.floor(player.x/TILE),0,MAP_W-1),ty=clamp(Math.floor(player.z/TILE),0,MAP_H-1); return zoneGrid[ty*MAP_W+tx]===5; }catch(e){ return false; } },
      cd:900,
      run(){
        const finds=[['bato',15],['kawayan',10],['niyog',12]];
        const f=finds[rand(0,finds.length-1)];
        addInv(f[0],f[1]);
        let extra='';
        if(Math.random()<0.2){ addInv('diwata_dew',2); extra=' May kumikinang sa buhangin — <b>Diwata Dew ×2</b>!'; }
        SFX.loot(); fxRing(player.x,player.z,0xffe08a,0.3,2.5,0.5);
        toast(`🐚 Namulot ka sa baybayin: ${MATERIALS[f[0]].icon} ${MATERIALS[f[0]].name} ×${f[1]}.${extra}`,'loot');
        return true;
      }},
  ];
  /* context button (own pill — the core interact pill is closure-owned) */
  const cb=document.createElement('button');
  cb.id='btn-context'; cb.className='ctl-btn tiny hidden';
  document.body.appendChild(cb);
  let curCtx=null;
  setInterval(()=>{
    if(!started||player.dead){ cb.classList.add('hidden'); return; }
    const t=nowS();
    curCtx=CTX_ACTIONS.find(a=>a.when()&&t>=(S.ctx[a.id+'At']||0))||null;
    cb.classList.toggle('hidden',!curCtx);
    if(curCtx) cb.innerHTML=curCtx.icon+'<span>'+curCtx.label+'</span>';
  },700);
  cb.onclick=()=>{
    if(!curCtx) return;
    if(curCtx.run()!==false){ S.ctx[curCtx.id+'At']=nowS()+curCtx.cd; save(); }
  };
  /* ctx buff chip (own — FOOD chip assumes DISHES ids) */
  const chip=document.createElement('div');
  chip.id='ctx-chip'; chip.className='hc-adopt';
  chip.style.cssText='background:rgba(20,14,34,.72);border:1px solid rgba(138,255,154,.35);color:#c8f0d8;font:700 10px system-ui;padding:3px 9px;border-radius:999px;pointer-events:none;display:none';
  (window._hudCenter||document.body).appendChild(chip);
  setInterval(()=>{
    const t=nowS();
    const act=Object.values(CTXB).filter(b=>b.until>t);
    let dirty=false;
    for(const [k,b] of Object.entries(CTXB)) if(b.until<=t){ delete CTXB[k]; dirty=true; }
    if(dirty) computeStats();
    chip.style.display=(started&&act.length)?'block':'none';
    if(act.length) chip.textContent=act.map(b=>b.icon+' '+b.name).join(' · ');
  },2000);

  /* ---------- achievements ---------- */
  ACH_DEFS.push(
    {id:'wish1', icon:'🕊️', name:'Naghiling sa Balon',   desc:'Mag-alay sa Balon ng Kahilingan', chk:()=>!!S.ctx.wellAt, rw:{gold:1000}},
    {id:'tabi1', icon:'🙏', name:'May Galang sa Nuno',   desc:'Magsabi ng tabi-tabi po sa Highlands', chk:()=>!!S.ctx.tabiAt, rw:{gold:1000}},
    {id:'ally1', icon:'🤝', name:'Kaalyado ng Bayan',    desc:'Maabot ang Kaalyado (60) sa isang NPC', chk:()=>Object.values(S.npcRel||{}).some(v=>v>=60), rw:{gold:5000}},
    {id:'moral', icon:'📿', name:'Ang Pagpili',          desc:'Tapusin ang Ang Nakawang Anting-anting', chk:()=>!!(S.ctx&&S.ctx.moral), rw:{gold:3000},
      title:'May Budhi'},
  );
})();

/* ================================================================
   🎬 BOOT SPLASH DISMISS — the inline splash in index.html covers
   the naked HUD while the engine builds. Hide it the moment the
   game is actually presentable: welcome screen visible OR world
   started. Fades out; removed from DOM after the transition.
   ================================================================ */
(function bootSplash(){
  const sp=document.getElementById('boot-splash'); if(!sp) return;
  const t0=Date.now();
  const iv=setInterval(()=>{
    const ws=document.getElementById('welcome-screen');
    const ready=started||(ws&&!ws.classList.contains('hidden'));
    if(!ready) return;
    if(Date.now()-t0<600) return;              // min display: no jarring flash
    clearInterval(iv);
    try{ clearInterval(window._bsTick); clearTimeout(window._bsFail); }catch(e){}
    const bar=document.getElementById('bs-bar'); if(bar) bar.style.width='100%';
    setTimeout(()=>{ sp.style.opacity='0'; sp.style.pointerEvents='none';
      setTimeout(()=>sp.remove(),500); },120);
  },150);
})();

/* ================================================================
   🎭 ANIMATED GLB HEROES (KayKit Adventurers, CC0) — chibi update.
   The old GLB path made statues: clone(true) breaks skinned meshes
   and animations were ignored. This module:
   · SkeletonUtils.clone for correct skinned instancing
   · AnimationMixer per hero + name-based clip lookup
   · state machine driven by existing player state:
       moving → Running_A · attack → profile attack · dodge →
       Dodge_Forward · death → Death_A · else Idle
   · anim profiles per class (melee/ranged/caster) from registry
   · applies to LOCAL player, REMOTE ka-party players, inventory
     3D preview, and the character-creation preview.
   Procedural heroes (no GLB registered) keep the legacy limb anim.
   ================================================================ */
(function glbHeroAnim(){
  const PROFILE_ATTACK={
    melee:['1H_Melee_Attack_Slice_Diagonal','1H_Melee_Attack_Chop','2H_Melee_Attack_Slice'],
    ranged:['1H_Ranged_Shoot','2H_Ranged_Shoot','Throw'],
    caster:['Spellcast_Shoot','Spellcast_Raise','Spellcasting'],
  };
  const REG=(GAME_DATA.models&&GAME_DATA.models.heroes)||{};
  function profileFor(cls){ return (REG[cls]&&REG[cls].animProfile)||'melee'; }
  const mixers=new Set();
  window._glbMixers=mixers;

  function findClip(anims,names){
    for(const n of names){ const c=anims.find(a=>a.name===n); if(c) return c; }
    return null;
  }
  /* upgraded hero builder: skinned clone + mixer + clip table */
  const _bh=buildHero;
  buildHero=function(cls, appOverride){
    const url=MODELS.hero[cls];
    const c=url&&MODEL_CACHE[url];
    if(!c||!c.animations||!c.animations.length) return _bh.apply(this,arguments);
    const g=new THREE.Group();
    const m=SkeletonUtils.clone(c.scene);
    /* normalize height ≈2.6 units, feet at y=0 */
    const box=new THREE.Box3().setFromObject(m);
    const h=box.max.y-box.min.y;
    if(h>0) m.scale.setScalar(2.6/h);
    const box2=new THREE.Box3().setFromObject(m);
    m.position.y-=box2.min.y;
    m.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.frustumCulled=false; } });
    g.add(m);
    const sh=blobShadow(1); sh.position.y=0.02; g.add(sh);
    const mixer=new THREE.AnimationMixer(m);
    const A=c.animations;
    const prof=profileFor(cls);
    const clips={
      idle:findClip(A,['Idle','Unarmed_Idle','2H_Melee_Idle']),
      run:findClip(A,['Running_A','Running_B','Walking_A']),
      attack:findClip(A,PROFILE_ATTACK[prof]||PROFILE_ATTACK.melee),
      dodge:findClip(A,['Dodge_Forward','Dodge_Backward']),
      death:findClip(A,['Death_A','Death_B']),
      cheer:findClip(A,['Cheer']),
    };
    const acts={};
    for(const [k,cl] of Object.entries(clips)) if(cl){ acts[k]=mixer.clipAction(cl); }
    if(acts.attack){ acts.attack.setLoop(THREE.LoopOnce); acts.attack.clampWhenFinished=false; }
    if(acts.dodge){ acts.dodge.setLoop(THREE.LoopOnce); }
    if(acts.death){ acts.death.setLoop(THREE.LoopOnce); acts.death.clampWhenFinished=true; }
    if(acts.cheer){ acts.cheer.setLoop(THREE.LoopOnce); }
    const st={mixer,acts,cur:null,oneUntil:0};
    st.play=(name,fade)=>{ 
      const a=st.acts[name]; if(!a||st.cur===name) return;
      const prev=st.acts[st.cur];
      a.reset(); a.play();
      if(prev) prev.crossFadeTo(a,fade??0.18,false);
      st.cur=name;
    };
    st.playOnce=(name,dur)=>{
      const a=st.acts[name]; if(!a) return;
      a.reset(); a.setEffectiveTimeScale((a.getClip().duration/Math.max(0.2,dur))||1); a.play();
      const prev=st.acts[st.cur];
      if(prev&&prev!==a) prev.crossFadeTo(a,0.1,false);
      st.cur=name;
      st.oneUntil=nowS()+dur;
    };
    if(acts.idle){ acts.idle.play(); st.cur='idle'; }
    mixers.add(st);
    g.userData.glbAnim=st;
    /* legacy anim API no-ops */
    const dummy=new THREE.Group();
    g.userData.legL=dummy; g.userData.legR=dummy; g.userData.armL=dummy;
    g.userData.armR=dummy; g.userData.weapArm=dummy; g.userData.glb=true;
    /* GC: drop the mixer when the mesh leaves the scene (checked lazily) */
    st._root=g;
    return g;
  };

  /* drive mixers + local player state machine from the RAF loop */
  let lastT=performance.now()/1000;
  (function tick(){
    requestAnimationFrame(tick);
    const t=performance.now()/1000, dt=Math.min(0.1,t-lastT); lastT=t;
    for(const st of mixers){
      if(st._root&&!st._root.parent&&st!==playerSt()) { mixers.delete(st); continue; }
      st.mixer.update(dt);
    }
    /* local player */
    const st=playerSt(); if(!st||!started) return;
    const ts=nowS();
    if(player.dead){ st.play('death',0.25); return; }
    if(ts<st.oneUntil) return;                        // let one-shots finish
    if(player.atkAnim>0){ st.playOnce('attack',Math.max(0.3,player.atkAnimDur||0.3)); return; }
    if(player.dodgeUntil&&ts<player.dodgeUntil){ st.playOnce('dodge',0.32); return; }
    const moving=!!player.moving;
    st.play(moving?'run':'idle');
  })();
  function playerSt(){ return player.mesh&&player.mesh.userData&&player.mesh.userData.glbAnim; }

  /* remote ka-party heroes: run/idle from their movement deltas */
  setInterval(()=>{
    if(!window._kaParty) return;
    for(const r of window._kaParty.values()){
      const st=r.mesh&&r.mesh.userData&&r.mesh.userData.glbAnim;
      if(!st) continue;
      const moved=(r._lx!==undefined)&&(Math.abs(r.x-r._lx)+Math.abs(r.z-r._lz)>0.05);
      r._lx=r.x; r._lz=r.z;
      st.play(moved?'run':'idle');
    }
  },150);

  /* preload the hero models for the classes in the registry (lazy-safe) */
  const urls=[...new Set(Object.values(MODELS.hero).filter(Boolean))];
  Promise.all(urls.map(u=>loadGLB(u).catch(()=>null))).then(cs=>{
    const okCount=cs.filter(Boolean).length;
    console.log('[chibi] hero models loaded:',okCount+'/'+urls.length);
    /* live-swap the player if their class model just arrived */
    if(started&&S.cls&&MODELS.hero[S.cls]&&MODEL_CACHE[MODELS.hero[S.cls]]&&player.mesh&&!player.mesh.userData.glb){
      const old=player.mesh, nm=buildHero(S.cls);
      nm.position.copy(old.position); nm.rotation.y=old.rotation.y;
      scene.remove(old); scene.add(nm); player.mesh=nm;
      toast('🎭 <b>Bagong anyo!</b> Ang mga bayani ay may buhay nang katawan.','levelup');
    }
  });
})();

/* ================================================================
   💀 ANIMATED GLB ENEMIES (KayKit Skeletons, CC0)
   Mirrors the hero anim engine for monsters. Registry-driven:
   data/models/registry.json enemies.<id>.baseModel + animProfile.
   Mapped: duwende→Minion · nuno→Mage · aswang→Rogue · bungisngis→
   Warrior (others stay procedural until more packs arrive).
   State machine reads the EXISTING enemy AI fields:
     windup>0 → attack one-shot · state 'chase' → Running_A ·
     wandering (wt>0 & moving) → Walking_A · else Idle.
   Death anim plays via a killEnemy wrap (corpse lingers 0.9s, no
   reward/removal changes — removeEnemy stays canonical).
   ================================================================ */
(function glbEnemyAnim(){
  const REGE=(GAME_DATA.models&&GAME_DATA.models.enemies)||{};
  const PROFILE_ATTACK={
    melee:['1H_Melee_Attack_Chop','1H_Melee_Attack_Slice_Diagonal','2H_Melee_Attack_Slice'],
    ranged:['2H_Ranged_Shoot','1H_Ranged_Shoot','Throw'],
    caster:['Spellcast_Shoot','Spellcast_Raise','Spellcasting'],
  };
  function findClip(A,names){ for(const n of names){ const c=A.find(a=>a.name===n); if(c) return c; } return null; }
  const mixers=new Set();

  const _bem=buildEnemyMesh;
  buildEnemyMesh=function(key){
    const url=MODELS.enemy[key];
    const c=url&&MODEL_CACHE[url];
    if(!c||!c.animations||!c.animations.length) return _bem.apply(this,arguments);
    const def=ENEMY_DEFS[key];
    const g=new THREE.Group();
    const m=SkeletonUtils.clone(c.scene);
    const box=new THREE.Box3().setFromObject(m);
    const h=box.max.y-box.min.y;
    const target=2.2*(def?def.scale:1);
    if(h>0) m.scale.setScalar(target/h);
    const box2=new THREE.Box3().setFromObject(m);
    m.position.y-=box2.min.y;
    m.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.frustumCulled=false; } });
    g.add(m);
    const mixer=new THREE.AnimationMixer(m);
    const A=c.animations;
    const prof=(REGE[key]&&REGE[key].animProfile)||'melee';
    const clips={
      idle:findClip(A,['Idle','Idle_B','2H_Melee_Idle','Skeleton_Inactive_Standing_Pose']),
      walk:findClip(A,['Walking_A','Walking_B']),
      run:findClip(A,['Running_A','Running_B','Walking_A']),
      attack:findClip(A,PROFILE_ATTACK[prof]||PROFILE_ATTACK.melee),
      hit:findClip(A,['Hit_A','Hit_B']),
      death:findClip(A,['Death_A','Death_C_Skeletons','Death_B']),
    };
    const acts={};
    for(const [k2,cl] of Object.entries(clips)) if(cl) acts[k2]=mixer.clipAction(cl);
    for(const k2 of ['attack','hit','death']) if(acts[k2]){ acts[k2].setLoop(THREE.LoopOnce); }
    if(acts.death) acts.death.clampWhenFinished=true;
    const st={mixer,acts,cur:null,oneUntil:0,_root:g};
    st.play=(name,fade)=>{ const a=st.acts[name]; if(!a||st.cur===name) return;
      const prev=st.acts[st.cur]; a.reset(); a.play();
      if(prev&&prev!==a) prev.crossFadeTo(a,fade??0.2,false); st.cur=name; };
    st.playOnce=(name,dur)=>{ const a=st.acts[name]; if(!a) return;
      a.reset(); a.setEffectiveTimeScale((a.getClip().duration/Math.max(0.2,dur))||1); a.play();
      const prev=st.acts[st.cur]; if(prev&&prev!==a) prev.crossFadeTo(a,0.08,false);
      st.cur=name; st.oneUntil=nowS()+dur; };
    if(acts.idle){ acts.idle.play(); st.cur='idle'; }
    mixers.add(st);
    g.userData.glbAnim2=st;
    g.userData.anim={};                    // procedural anim no-op
    return g;
  };

  /* mixer updates + per-enemy state machine */
  let lastT=performance.now()/1000;
  (function tick(){
    requestAnimationFrame(tick);
    const t=performance.now()/1000, dt=Math.min(0.1,t-lastT); lastT=t;
    for(const st of mixers){
      if(!st._root.parent){ mixers.delete(st); continue; }
      /* distance-cull: skip skinning for far monsters (they stay VISIBLE — hiding
         them left floating nameplates, the "invisible monster" bug) */
      const _dx=st._root.position.x-player.x, _dz=st._root.position.z-player.z;
      if(_dx*_dx+_dz*_dz>170*170){ continue; }
      st.mixer.update(dt);
    }
    if(!started) return;
    const ts=nowS();
    for(const en of enemies){
      const st=en.mesh&&en.mesh.userData&&en.mesh.userData.glbAnim2;
      if(!st) continue;
      { const _ex=en.x-player.x,_ez=en.z-player.z; if(_ex*_ex+_ez*_ez>200*200) continue; }  // skip far-enemy anim
      if(ts<st.oneUntil) continue;
      if(en.windup>0){ st.playOnce('attack',Math.max(0.3,en.windup+0.25)); continue; }
      if(en.flash>0.08&&st.acts.hit){ st.playOnce('hit',0.3); continue; }
      if(en.state==='chase') st.play('run');
      else if(Math.abs(en.x-en.wx)+Math.abs(en.z-en.wz)>0.3) st.play('walk');
      else st.play('idle');
    }
  })();

  /* death: play the death clip on a corpse ghost (does NOT touch rewards) */
  const _ke2=killEnemy;
  killEnemy=function(en){
    const st=en.mesh&&en.mesh.userData&&en.mesh.userData.glbAnim2;
    if(st&&st.acts.death&&en.mesh){
      const corpse=en.mesh;                     // reuse the mesh as a corpse
      const pos={x:en.x,z:en.z};
      const r=_ke2.apply(this,arguments);       // normal kill (removes mesh from scene)
      corpse.position.set(pos.x,groundY(pos.x,pos.z),pos.z);
      scene.add(corpse);                        // re-add for the death anim
      mixers.add(st);                           // keep the mixer alive
      st.playOnce('death',0.9);
      setTimeout(()=>{ scene.remove(corpse); mixers.delete(st); },1000);
      return r;
    }
    return _ke2.apply(this,arguments);
  };

  /* preload registered enemy models (network-first cache picks them up) */
  const urls=[...new Set(Object.values(MODELS.enemy).filter(Boolean))];
  if(urls.length) Promise.all(urls.map(u=>loadGLB(u).catch(()=>null))).then(cs=>{
    console.log('[chibi] enemy models loaded:',cs.filter(Boolean).length+'/'+urls.length);
  });
})();

/* ================================================================
   🎨 FILIPINO CLASS TINTS (chibi update #2) — classes that share a
   KayKit model get distinct identities via runtime texture tinting.
   registry heroes.<cls>.tint = {hue°, sat, bri} → canvas filter
   (hue-rotate/saturate/brightness) over the atlas → CanvasTexture,
   cached per class. Materials are cloned per hero so tints never
   leak across classes. Mangkukulam = dark-witch Mage recolor
   (replaces the old placeholder GLB). Non-fatal: any canvas failure
   keeps the original texture.
   ================================================================ */
(function classTints(){
  const REG=(GAME_DATA.models&&GAME_DATA.models.heroes)||{};
  const cache={};   // cls -> THREE.CanvasTexture
  function tintedTexture(cls, srcTex){
    if(cache[cls]) return cache[cls];
    const t=REG[cls]&&REG[cls].tint;
    if(!t||!srcTex||!srcTex.image) return null;
    try{
      const img=srcTex.image;
      const cv=document.createElement('canvas');
      cv.width=img.width||1024; cv.height=img.height||1024;
      const ctx=cv.getContext('2d');
      ctx.filter=`hue-rotate(${t.hue||0}deg) saturate(${(t.sat??1)*100}%) brightness(${(t.bri??1)*100}%)`;
      ctx.drawImage(img,0,0);
      const tex=new THREE.CanvasTexture(cv);
      tex.flipY=srcTex.flipY; tex.colorSpace=srcTex.colorSpace||THREE.SRGBColorSpace;
      tex.wrapS=srcTex.wrapS; tex.wrapT=srcTex.wrapT;
      tex.magFilter=srcTex.magFilter; tex.minFilter=srcTex.minFilter;
      cache[cls]=tex;
      return tex;
    }catch(e){ return null; }
  }
  const _bh3=buildHero;
  buildHero=function(cls, appOverride){
    const g=_bh3.apply(this,arguments);
    if(!g||!g.userData||!g.userData.glb) return g;      // procedural: untouched
    try{
      g.traverse(o=>{
        if(!o.isMesh||!o.material) return;
        const mats=Array.isArray(o.material)?o.material:[o.material];
        const out=mats.map(m0=>{
          const tex=tintedTexture(cls,m0.map);
          if(!tex) return m0;
          const m2=m0.clone(); m2.map=tex; return m2;
        });
        o.material=Array.isArray(o.material)?out:out[0];
      });
    }catch(e){}
    return g;
  };
})();

/* ================================================================
   ⚔️ WEAPON ATTACHMENTS (chibi update #3) — KayKit weapons snap to
   the rig's handslot bones based on EQUIPPED gear.
   · handslot.r = mainhand · handslot.l = offhand/shield
   · weapon model chosen from the equipped item's slot+class flavor
   · re-attaches on equip/unequip (equipItem wrap + 2s sweep for
     load/advance edge cases) · tinted with the class atlas rules
   · caster classes with no weapon equipped hold their staff/book
   Weapon .gltf files reference class textures by URI — served from
   the same folder, so GLTFLoader resolves them natively.
   ================================================================ */
(function weaponAttach(){
  const W='assets/characters/kaykit/weapons/';
  /* class flavor: which model represents a generic mainhand/offhand */
  const FLAVOR={
    mandirigma:{main:'sword_1handed.gltf', off:'shield_badge.gltf'},
    arnisador: {main:'sword_1handed.gltf', off:'dagger.gltf'},
    panday:    {main:'axe_1handed.gltf',   off:'shield_round.gltf'},
    anino:     {main:'dagger.gltf',        off:'dagger.gltf'},
    tirador:   {main:'crossbow_1handed.gltf', off:null},
    mamamana:  {main:'crossbow_2handed.gltf', off:'quiver.gltf'},
    babaylan:  {main:'staff.gltf',         off:'spellbook_open.gltf'},
    alim:      {main:'staff.gltf',         off:'spellbook_closed.gltf'},
    mangkukulam:{main:'wand.gltf',         off:'smokebomb.gltf'},
  };
  /* legendary/epic mainhands upgrade the silhouette */
  const UPGRADE={
    mandirigma:'sword_2handed.gltf', arnisador:'sword_2handed.gltf',
    panday:'axe_2handed.gltf', anino:'dagger.gltf',
    tirador:'crossbow_2handed.gltf', mamamana:'crossbow_2handed.gltf',
    babaylan:'staff.gltf', alim:'staff.gltf', mangkukulam:'staff.gltf',
  };
  /* GLTFLoader runs every node name through PropertyBinding.sanitizeNodeName
   * (jsm/loaders/GLTFLoader.js:3593), which strips the reserved characters
   * [\[\]\.:\/]. So the rig's "handslot.r" is stored as "handslotr" and an
   * exact-match lookup never finds it — refresh() then hit `if(!R&&!L) return`
   * and silently attached nothing. Match on the sanitized name instead. */
  function sanit(n){ return (n||'').replace(/[^a-zA-Z0-9_]/g,''); }
  function findBone(root,name){
    const want=sanit(name);
    let hit=null;
    root.traverse(o=>{ if(!hit&&(o.isBone||o.isObject3D)&&sanit(o.name)===want) hit=o; });
    return hit;
  }
  function weaponFor(cls){
    const f=FLAVOR[cls]||FLAVOR.mandirigma;
    const mh=S.gear&&S.gear.mainhand, oh=S.gear&&S.gear.offhand;
    let main=f.main;
    if(mh&&(mh.rarity==='epic'||mh.rarity==='legendary')) main=UPGRADE[cls]||main;
    /* offhand only when an item is equipped there (casters always hold theirs) */
    const caster=['babaylan','alim','mangkukulam'].includes(cls);
    const off=(oh||caster)?f.off:null;
    return {main:(mh||caster)?main:f.main, off};   // mainhand model always shown (bare fists look wrong on chibi)
  }
  function clearSlot(bone){
    if(!bone) return;
    for(const c of [...bone.children]) if(c.userData&&c.userData._weap) bone.remove(c);
  }
  /* KayKit weapons are authored for the KayKit rig (Knight.glb is 3.4364 tall)
   * but the custom chibi body is 1.1534. A weapon parented to a chibi bone
   * inherits the chibi's K = 2.6/1.1534 = 2.2542 instead of KayKit's
   * 2.6/3.4364 = 0.7566, so it renders 2.98x too large — sword_1handed came out
   * 4.00 units tall on a 2.6-tall hero. The ratio is measured by
   * tools/bake-hero-metrics.js, not hard-coded. It must NOT be applied when the
   * host is a KayKit model, where the weapons are already the right size. */
  function weaponScaleFor(mesh){
    const ud=(mesh&&mesh.userData)||{};
    if(!ud.custom&&!ud.customRig) return 1;              // KayKit/procedural host
    const kr=window._customMetrics&&window._customMetrics.kaykitRef;
    return (kr&&kr.weaponScale)?kr.weaponScale:0.3356;   // fallback if metrics absent
  }
  function attach(bone,url,cls,scale){
    if(!bone||!url) return;
    loadGLB(W+url.replace(/\.gltf$/,'.gltf')).then(c=>{
      if(!c) return;
      clearSlot(bone);
      const m=c.scene.clone(true);              // static meshes: plain clone OK
      m.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.frustumCulled=false; } });
      /* Origins are already correct per asset — grips sit at the origin for
       * swords/axes/daggers (17-28% up), shields and books are centred — so
       * only the scale needs correcting. Verified 2026-09-09. */
      if(scale&&Math.abs(scale-1)>1e-4) m.scale.setScalar(scale);
      m.userData._weap=true;
      bone.add(m);
    }).catch(()=>{});
  }
  function refresh(){
    if(!player.mesh||!player.mesh.userData||!player.mesh.userData.glb) return;
    const cls=S.cls; if(!cls||!FLAVOR[cls]) return;
    const R=findBone(player.mesh,'handslot.r'), L=findBone(player.mesh,'handslot.l');
    if(!R&&!L) return;
    const w=weaponFor(cls);
    const sig=cls+'|'+(w.main||'')+'|'+(w.off||'');
    if(player.mesh.userData._weapSig===sig) return;      // unchanged
    player.mesh.userData._weapSig=sig;
    clearSlot(R); clearSlot(L);
    const ws=weaponScaleFor(player.mesh);
    if(w.main) attach(R,w.main,cls,ws);
    if(w.off)  attach(L,w.off,cls,ws);
  }
  /* re-attach on equip changes + slow sweep for mesh swaps (GLB arrival, advance, respawn) */
  const _eq2=equipItem;
  equipItem=function(){ _eq2.apply(this,arguments); setTimeout(refresh,50); };
  setInterval(refresh,2000);
})();

/* Fit a wig's bounding box onto the skull's.
 *
 * Shared by the static compositor and the rigged path so both place hair
 * identically. All values are in body/rig units (the caller applies the K
 * scale to game units).
 *
 *   M  - metrics for base_<gender>  (headW/headH/headD, centerX/centerZ)
 *   HM - metrics for the hair part  (w/h/d, minY/maxY, centerX/centerZ)
 *
 * A plain uniform scale cannot work: hair_m1 is 0.99x0.77 but the skull is
 * 0.44x0.46, so any single ratio misses an axis. But an exact per-axis fit
 * distorts badly (hair_f1 is long hair, 0.45x1.09, and squashing it into the
 * skull flattens it ~50%). So axis scales are allowed to differ by at most
 * HAIR_DISTORTION_CAP, and any excess length hangs DOWN from the crown rather
 * than bulging out symmetrically.
 *
 * Returns {sx,sy,sz, px,py,pz} where p is in skull-local space: origin at the
 * base of the skull, x/z centred. The rigged path uses it as-is (the head bone
 * sits at that origin); the static path multiplies everything by K.
 */
const HAIR_FIT_OV = 1.06;        // overshoot so no scalp shows through
/* Safety net only — deliberately loose. The current wigs need up to 2.33:1
 * (hair_f1 is 0.45x1.09, i.e. 2.36x the skull height, so an exact fit squashes
 * it hard). Tightening this below ~2.4 does NOT reduce distortion, it forces
 * the wig to keep its own proportions instead, which makes hair_f1 hang to
 * y=0.46 on a 2.6-tall character — knee-length. Measured 2026-09-09. The real
 * fix is re-authoring the wigs to skull proportions; until then an exact fit
 * is the only head-sized result available. */
const HAIR_DISTORTION_CAP = 2.5; // max ratio between the largest and smallest axis scale
window._fitHairToSkull = function(M, HM){
  /* exact per-axis scales that would cover the skull */
  const ideal = [M.headW*HAIR_FIT_OV/HM.w, M.headH*HAIR_FIT_OV/HM.h, M.headD*HAIR_FIT_OV/HM.d];
  /* never scale below the exact fit (that would expose scalp); raise the
   * smaller axes until the spread is within the cap */
  const hi = Math.max.apply(null, ideal);
  const floor = hi/HAIR_DISTORTION_CAP;
  const s = ideal.map((v) => Math.max(v, floor));
  const lo = HM.minY||0, up = (HM.maxY!==undefined?HM.maxY:HM.h);
  const hcy = (lo+up)/2;
  const hairH = HM.h*s[1];
  /* if the wig is taller than the skull after fitting, pin its TOP to the
   * crown and let the rest fall; otherwise centre it */
  const py = (hairH > M.headH) ? (M.headH - up*s[1]) : (M.headH/2 - hcy*s[1]);
  return {
    sx:s[0], sy:s[1], sz:s[2],
    px: -HM.centerX*s[0],          // skull-local x centre is 0
    py: py,
    pz: -HM.centerZ*s[2],
    _ideal:ideal, _capped:s.some((v,i)=>Math.abs(v-ideal[i])>1e-9),
  };
};

/* ================================================================
   🧍 CUSTOM FILIPINO CHIBI HEROES — FEATURE SWITCH
   The Hunyuan3D chibi parts (base/outfit/hair under
   assets/characters/base/) are standalone objects with no shared
   skeleton and inconsistent proportions, so they render as a mess
   (hair over the face, T-pose, textures bleeding). Until proper
   Filipino hero assets exist, keep them OFF and let the game use the
   CC0 KayKit models, which have correct proportions, matching outfits,
   working weapon slots and 76 animations.
   Set true ONLY after the custom assets are re-authored to a common
   skeleton + skull proportions (see docs/ASSET_PIPELINE.md).
   ================================================================ */
const CUSTOM_HEROES_ENABLED=false;
window.CUSTOM_HEROES_ENABLED=CUSTOM_HEROES_ENABLED;

/* ================================================================
   🧍 CUSTOM FILIPINO CHIBI HEROES (integration phase)
   User-generated Hunyuan bodies + outfits + hair, composited at
   runtime into ONE hero group:
     body (skin-tinted) + outfit (worn layer) + hair (style+color)
   · metrics from data/models/custom-heroes.json (baked at build)
   · hair bbox-fitted to the skull (see _fitHairToSkull) — never a
     single width ratio, which cannot work when the wig's proportions
     differ from the skull's
   · skin tint via canvas multiply on the body texture (cached per
     tone) — face detail survives because tint multiplies luminance
   · hair tint likewise per HAIR_COLORS entry
   · TAKES PRIORITY over KayKit models for the LOCAL PLAYER + remote
     players + inventory/creation previews via buildHero wrap; the
     KayKit rig path remains the fallback when parts are missing.
   NOTE: procedural bob animation (no skeleton yet) — walk bob +
   attack lunge via the existing legacy anim fields; full KayKit
   rig retarget is the planned next step.
   ================================================================ */
(function customHeroes(){
  const D='assets/characters/base/';
  const PARTS={
    male:{body:D+'base_male.glb',outfit:D+'outfit_male.glb',hairs:[D+'hair_m1.glb',D+'hair_m2.glb',D+'hair_f1.glb',D+'hair_f2.glb']},
    female:{body:D+'base_female.glb',outfit:D+'outfit_female.glb',hairs:[D+'hair_f1.glb',D+'hair_f2.glb',D+'hair_m1.glb',D+'hair_m2.glb']},
  };
  let METRICS=null;
  fetch('data/models/custom-heroes.json').then(r=>r.json()).then(j=>{METRICS=j;}).catch(()=>{});
  const urls=[...new Set([PARTS.male.body,PARTS.male.outfit,PARTS.female.body,PARTS.female.outfit,
    ...PARTS.male.hairs])];
  let READY=false;
  Promise.all(urls.map(u=>loadGLB(u).catch(()=>null))).then(cs=>{
    READY=cs.every(Boolean)&&CUSTOM_HEROES_ENABLED;
    console.log('[custom-heroes] parts loaded:',cs.filter(Boolean).length+'/'+urls.length,
      READY?'ACTIVE':'OFF (using KayKit)');
    if(READY&&started&&player.mesh){
      const old=player.mesh,nm=buildHero(S.cls);
      nm.position.copy(old.position); nm.rotation.y=old.rotation.y;
      scene.remove(old); scene.add(nm); player.mesh=nm;
      toast('🧍 <b>Bagong pangangatawan!</b> Ang mga bayani ng kapuluan ay ipinanganak muli.','levelup');
    }
  });

  /* ---- tinted texture cache: key = url|tint ---- */
  const tintCache={};
  function tinted(url,hex){
    const key=url+'|'+hex;
    if(tintCache[key]) return tintCache[key];
    const c=MODEL_CACHE[url]; if(!c) return null;
    let src=null;
    c.scene.traverse(o=>{ if(!src&&o.isMesh&&o.material&&o.material.map) src=o.material.map; });
    if(!src||!src.image) return null;
    try{
      const img=src.image;
      const cv=document.createElement('canvas');
      cv.width=img.width; cv.height=img.height;
      const ctx=cv.getContext('2d');
      ctx.drawImage(img,0,0);
      ctx.globalCompositeOperation='multiply';
      ctx.fillStyle='#'+hex.toString(16).padStart(6,'0');
      ctx.fillRect(0,0,cv.width,cv.height);
      const tex=new THREE.CanvasTexture(cv);
      tex.flipY=src.flipY; tex.colorSpace=THREE.SRGBColorSpace;
      tex.wrapS=src.wrapS; tex.wrapT=src.wrapT;
      tintCache[key]=tex;
      return tex;
    }catch(e){ return null; }
  }
  function instPart(url,tintHex){
    const c=MODEL_CACHE[url]; if(!c) return null;
    const m=c.scene.clone(true);
    m.traverse(o=>{
      if(!o.isMesh) return;
      o.castShadow=true; o.frustumCulled=false;
      if(tintHex!=null){
        const t=tinted(url,tintHex);
        if(t){ o.material=o.material.clone(); o.material.map=t; }
      }
    });
    return m;
  }

  /* skin tint refs: SKIN_TONES are absolute colors; body texture is already
     mid-tan — derive multiplier ≈ tone/midTan so tone 1 ≈ identity */
  const MID=0xc98a5e;
  function skinMul(toneHex){
    const r=Math.min(255,Math.round(((toneHex>>16)&255)/((MID>>16)&255)*255));
    const g=Math.min(255,Math.round(((toneHex>>8)&255)/((MID>>8)&255)*255));
    const b=Math.min(255,Math.round((toneHex&255)/(MID&255)*255));
    return (r<<16)|(g<<8)|b;
  }
  /* hair tint: hair texture is near-black; LIGHTEN via screen-ish trick —
     multiply toward the color after normalizing (use color directly ×2) */
  function hairMul(hex){
    const r=Math.min(255,((hex>>16)&255)*2), g=Math.min(255,((hex>>8)&255)*2), b=Math.min(255,(hex&255)*2);
    return (r<<16)|(g<<8)|b;
  }

  const _bh=buildHero;
  buildHero=function(cls, appOverride){
    if(!READY||!METRICS) return _bh.apply(this,arguments);
    try{
      const app=appOverride||heroApp();
      const gender=(app.gender==='female')?'female':'male';
      const P2=PARTS[gender], M=METRICS['base_'+gender];
      const g=new THREE.Group();
      const skinHex=(typeof app.skin==='number')?SKIN_TONES[app.skin]??SKIN_TONES[1]:(app.skin||SKIN_TONES[1]);
      const hairHex=(typeof app.hairColor==='number')?HAIR_COLORS[app.hairColor]??HAIR_COLORS[0]:(app.hairColor||HAIR_COLORS[0]);
      const body=instPart(P2.body, skinMul(skinHex));
      if(!body) return _bh.apply(this,arguments);
      const outfit=instPart(P2.outfit,null);
      const hi=Math.max(0,Math.min(3,app.hairStyle??0));
      const hairUrl=P2.hairs[hi];
      const hair=instPart(hairUrl, hairMul(hairHex));
      /* normalize composite to game height 2.6 */
      const K=2.6/M.h;
      body.scale.setScalar(K);
      g.add(body);
      if(outfit){
        const OM=METRICS[P2.outfit.split('/').pop().replace('.glb','')];
        /* 1:1 with the body — both were authored at the same scale, so the old
         * K*1.02 overshoot pushed the collar ~0.10 units above the crown. */
        outfit.scale.setScalar(K);
        if(OM){
          /* the outfit is not authored on the body's centre line: outfit_male
           * sits 0.0137 off in X, which is 0.031 game units once scaled. */
          outfit.position.set((OM.alignX||0)*K,(OM.alignY||0)*K,(OM.alignZ||0)*K);
        }else{
          outfit.position.y=0;
        }
        g.add(outfit);
      }
      if(hair){
        const HM=METRICS[hairUrl.split('/').pop().replace('.glb','')];
        if(HM&&M.headW&&M.headH&&M.headD&&window._fitHairToSkull){
          const f=window._fitHairToSkull(M,HM);
          hair.scale.set(f.sx*K,f.sy*K,f.sz*K);
          /* skull-local -> body space (the skull origin is the head base) */
          hair.position.set(((M.centerX||0)+f.px)*K,
                            ((M.hairBaseY||0)+f.py)*K,
                            ((M.centerZ||0)+f.pz)*K);
        }else{
          /* legacy metrics (pre-2026-09-09) — uniform scale off headW */
          const hs=((M.headW||0.44)*1.06/(HM&&HM.w||1))*K;
          hair.scale.setScalar(hs);
          hair.position.y=(M.hairBaseY||M.h*0.6)*K;
        }
        g.add(hair);
      }
      const sh=blobShadow(1); sh.position.y=0.02; sh.userData._shadow=true; g.add(sh);
      for(const k of g.children){ if(!k.userData._shadow) k.userData._baseY=k.position.y; }
      /* legacy anim API no-ops (bob handled by anim loop via userData.glb) */
      const dummy=new THREE.Group();
      g.userData={legL:dummy,legR:dummy,armL:dummy,armR:dummy,weapArm:dummy,glb:true,custom:true};
      return g;
    }catch(e){ return _bh.apply(this,arguments); }
  };
  /* light bob for custom heroes (walang rig pa): offset the PART CHILDREN
     (main anim loop owns the root position, so we bob one level down) */
  (function bobTick(){
    requestAnimationFrame(bobTick);
    if(!started) return;
    const meshes=[player.mesh];
    if(window._kaParty) for(const r of window._kaParty.values()) meshes.push(r.mesh);
    const t=performance.now()/1000;
    for(const m of meshes){
      if(!m||!m.userData||!m.userData.custom) continue;
      const moving=(m===player.mesh)?player.moving:true;
      const bob=moving?Math.abs(Math.sin(t*9))*0.05:Math.sin(t*2)*0.012;
      const lean=moving?Math.sin(t*9)*0.045:0;
      for(const k of m.children){
        if(k.userData&&k.userData._shadow) continue;
        if(k.userData&&k.userData._noBob) continue;
        k.position.y=(k.userData._baseY||0)+bob;
        k.rotation.z=lean;
      }
    }
  })();
})();

/* ================================================================
   🙂 FACE PLANE SYSTEM (concept doc: face/eye presets + eye color)
   Animal Crossing technique: the face is a small curved DECAL PLANE
   floating just in front of the head — UV-independent, so it works
   on ANY generated body. 4 composed presets (assets/faces/face_N.png,
   eyes+brow+mouth), eye COLOR via canvas hue-tint of the brown iris
   pixels (cached per preset|color). Wired into the customHeroes
   compositor via a buildHero wrap; charDraft.facePreset drives the
   creation preview live. Save: S.app.face (additive).
   ================================================================ */
(function facePlanes(){
  const N=4;
  const texCache={};   // 'i|eyeHex' -> THREE.CanvasTexture
  const imgCache={};   // i -> HTMLImageElement (or null while loading)
  function faceImg(i,cb){
    if(imgCache[i]!==undefined){ if(imgCache[i]) cb(imgCache[i]); return; }
    imgCache[i]=null;
    const im=new Image();
    im.onload=()=>{ imgCache[i]=im; cb(im); };
    im.onerror=()=>{};
    im.src='assets/faces/face_'+(i+1)+'.png';
  }
  function faceTex(i,eyeHex,cb){
    const key=i+'|'+eyeHex;
    if(texCache[key]){ cb(texCache[key]); return; }
    faceImg(i,im=>{
      try{
        const cv=document.createElement('canvas');
        cv.width=im.width; cv.height=im.height;
        const ctx=cv.getContext('2d');
        ctx.drawImage(im,0,0);
        /* iris recolor: brownish pixels (r>g>b, mid luminance) → eye color */
        const d=ctx.getImageData(0,0,cv.width,cv.height);
        const px=d.data;
        const er=(eyeHex>>16)&255, eg=(eyeHex>>8)&255, eb=eyeHex&255;
        for(let k=0;k<px.length;k+=4){
          if(px[k+3]<40) continue;
          const r=px[k],g=px[k+1],b=px[k+2];
          const lum=(r+g+b)/3;
          if(r>g&&g>b&&lum>35&&lum<210&&(r-b)>25){   // brown iris zone
            const t=lum/160;                          // keep shading
            px[k]=Math.min(255,er*t); px[k+1]=Math.min(255,eg*t); px[k+2]=Math.min(255,eb*t);
          }
        }
        ctx.putImageData(d,0,0);
        const tex=new THREE.CanvasTexture(cv);
        tex.colorSpace=THREE.SRGBColorSpace;
        texCache[key]=tex;
        cb(tex);
      }catch(e){}
    });
  }
  /* attach face plane to a custom hero group */
  window._attachFace=function(g,app){
    if(!g||!g.userData||!g.userData.custom) return;
    const fi=Math.max(0,Math.min(N-1,app.face??0));
    const eyeHex=(typeof app.eyeColor==='number')?(EYE_COLORS[app.eyeColor]??EYE_COLORS[0]):EYE_COLORS[0];
    const gender=(app.gender==='female')?'female':'male';
    /* find metrics through the compositor's normalization: hero is 2.6 units tall,
       head center ≈ 0.808/1.153 of height → y≈1.82; face sits at front of head */
    const y=2.6*0.72, z=(gender==='female'?0.36:0.40);
    const w=0.72, h=0.72;
    const geo=new THREE.PlaneGeometry(w,h,8,1);
    /* curve the plane slightly around the head (cylindrical bend) */
    const posA=geo.attributes.position;
    for(let k=0;k<posA.count;k++){
      const x=posA.getX(k);
      posA.setZ(k,-Math.abs(x)*x*x*0.55);
    }
    geo.computeVertexNormals();
    const mat=new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,side:THREE.FrontSide});
    const plane=new THREE.Mesh(geo,mat);
    plane.position.set(0,y,z);
    plane.renderOrder=2;
    plane.userData._face=true; plane.userData._noBob=false;
    faceTex(fi,eyeHex,tex=>{ mat.map=tex; mat.needsUpdate=true; });
    /* remove old face if rebuilt */
    for(const c of [...g.children]) if(c.userData&&c.userData._face) g.remove(c);
    g.add(plane);
    plane.userData._baseY=plane.position.y;
  };
  /* hook the compositor */
  const _bh=buildHero;
  buildHero=function(cls, appOverride){
    const g=_bh.apply(this,arguments);
    try{
      if(g&&g.userData&&g.userData.custom){
        const app=appOverride||heroApp();
        window._attachFace(g,{face:app.face??((S.app&&S.app.face)??0),
          eyeColor:app.eyeColor??((S.app&&S.app.eyeColor)??0), gender:app.gender});
      }
    }catch(e){}
    return g;
  };
  /* bridge for the rigged path: resolve a face texture for an app config */
  window._faceTexFor=function(app,cb){
    const fi=Math.max(0,Math.min(N-1,app.face??((S.app&&S.app.face)??0)));
    const ec=app.eyeColor??((S.app&&S.app.eyeColor)??0);
    const eyeHex=(typeof ec==='number')?(EYE_COLORS[ec]??EYE_COLORS[0]):EYE_COLORS[0];
    faceTex(fi,eyeHex,cb);
  };
})();

/* ================================================================
   🦴 CUSTOM HERO RIG RETARGET (integration phase 2)
   The custom chibi bodies are now SKINNED to a KayKit-compatible
   23-bone deform skeleton (offline auto-skinner: capsule weights,
   kaykit local rest rotations, fitted to chibi landmarks).
   Runtime: borrow the KayKit 76-clip library via QUATERNION-ONLY
   retarget (rotation tracks bind by name; positions keep chibi
   rest → no proportion distortion; hips.position scaled by height
   ratio for locomotion bounce).
   · body + outfit are separately-skinned twins driven by two
     mixers in lockstep (identical skeletons)
   · hair + face plane now attach to the HEAD BONE → sumusunod
     na sa animation
   · weapon slots: handslot.l/r exist in the rig — weaponAttach
     works (findBone made sanitize-tolerant)
   · state machine reuses the glbHeroAnim pattern
   Replaces the static compositor path when rigs are loaded;
   falls back: rigged → static composite → KayKit → procedural.
   ================================================================ */
(function customHeroRig(){
  const D='assets/characters/base/';
  const RIGS={
    male:{body:D+'base_male_rig.glb',outfit:D+'outfit_male_rig.glb'},
    female:{body:D+'base_female_rig.glb',outfit:D+'outfit_female_rig.glb'},
  };
  const HAIRS=[D+'hair_m1.glb',D+'hair_m2.glb',D+'hair_f1.glb',D+'hair_f2.glb'];
  const ANIM_SRC='assets/characters/kaykit/Knight.glb';
  let READY=false, CLIPS=null, HIP_RATIO=0.69; // chibi hips ~0.28 / kaykit 0.406
  const mixers=new Set();

  function sanitize(n){ return n.replace(/[^a-zA-Z0-9_]/g,''); }
  function findBone(root,name){
    const want=sanitize(name);
    let hit=null;
    root.traverse(o=>{ if(!hit&&(o.isBone||o.isObject3D)&&sanitize(o.name||'')===want) hit=o; });
    return hit;
  }
  window._findBoneSan=findBone;

  /* quaternion-only clip filter (+hips bounce) — cached */
  const clipCache={};
  function retargetClip(clip){
    if(clipCache[clip.name]) return clipCache[clip.name];
    const tracks=[];
    for(const tr of clip.tracks){
      if(tr.name.endsWith('.quaternion')) tracks.push(tr);
      else if(tr.name==='hips.position'){
        const t2=tr.clone();
        const v=t2.values;
        for(let k=0;k<v.length;k++) v[k]*=HIP_RATIO;
        tracks.push(t2);
      }
    }
    const c=new THREE.AnimationClip(clip.name,clip.duration,tracks);
    clipCache[clip.name]=c;
    return c;
  }

  const PROFILE_ATTACK={
    melee:['1H_Melee_Attack_Slice_Diagonal','1H_Melee_Attack_Chop'],
    ranged:['1H_Ranged_Shoot','2H_Ranged_Shoot'],
    caster:['Spellcast_Shoot','Spellcast_Raise'],
  };
  const REGH=(GAME_DATA.models&&GAME_DATA.models.heroes)||{};

  Promise.all([
    loadGLB(RIGS.male.body),loadGLB(RIGS.male.outfit),
    loadGLB(RIGS.female.body),loadGLB(RIGS.female.outfit),
    loadGLB(ANIM_SRC),
    ...HAIRS.map(u=>loadGLB(u)),
    /* metrics must land BEFORE READY: buildHero sizes hair from them, and the
     * old separate fetch raced it — when it lost, hair fell back to {w:1},
     * which is -55% on hair_f1. */
    fetch('data/models/custom-heroes.json').then(r=>r.json()).then(j=>{ window._customMetrics=j; return j; }),
  ].map(p=>p.catch(()=>null))).then(rs=>{
    const okAll=rs.slice(0,5).every(Boolean)&&!!window._customMetrics&&CUSTOM_HEROES_ENABLED;
    if(okAll){ CLIPS=MODEL_CACHE[ANIM_SRC].animations; READY=true; }
    else if(!CUSTOM_HEROES_ENABLED) console.log('[custom-rig] disabled — KayKit heroes active');
    else if(!window._customMetrics) console.warn('[custom-rig] metrics missing — static compositor stays');
    else console.log('[custom-rig] missing parts, static compositor stays');
    if(READY&&started&&player.mesh){
      const old=player.mesh,nm=buildHero(S.cls);
      nm.position.copy(old.position); nm.rotation.y=old.rotation.y;
      scene.remove(old); scene.add(nm); player.mesh=nm;
      toast('🦴 <b>Buhay na buhay!</b> Ang mga bayani ay gumagalaw na nang buo.','levelup');
    }
  });

  function findClip(names){ for(const n of names){ const c=CLIPS.find(a=>a.name===n); if(c) return c; } return null; }

  const _bh=buildHero;
  buildHero=function(cls, appOverride){
    if(!READY) return _bh.apply(this,arguments);
    try{
      const app=appOverride||heroApp();
      const gender=(app.gender==='female')?'female':'male';
      const R=RIGS[gender];
      const cBody=MODEL_CACHE[R.body], cOut=MODEL_CACHE[R.outfit];
      if(!cBody||!cOut) return _bh.apply(this,arguments);
      const g=new THREE.Group();
      const body=SkeletonUtils.clone(cBody.scene);
      const outfit=SkeletonUtils.clone(cOut.scene);
      /* tint skin (reuse compositor tint cache via canvas) */
      const skinHex=(typeof app.skin==='number')?SKIN_TONES[app.skin]??SKIN_TONES[1]:(app.skin||SKIN_TONES[1]);
      const hairHex=(typeof app.hairColor==='number')?HAIR_COLORS[app.hairColor]??HAIR_COLORS[0]:(app.hairColor||HAIR_COLORS[0]);
      if(window._tintSkinned) { window._tintSkinned(body,R.body,skinHex); }
      body.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.frustumCulled=false; } });
      outfit.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.frustumCulled=false; } });
      /* normalize to 2.6 units using the measured body height — the old
       * hard-coded 2.6/1.16 was wrong for both genders (male 1.1534, female
       * 1.1640) and ignored the metrics entirely. */
      const MET=window._customMetrics||{};
      const M=MET['base_'+gender]||{};
      const OM=MET[R.outfit.split('/').pop().replace('.glb','')]||{};
      const K=2.6/(M.h||1.16);
      body.scale.setScalar(K); outfit.scale.setScalar(K);
      /* the outfit is not authored on the body's centre line */
      outfit.position.set((OM.alignX||0)*K,(OM.alignY||0)*K,(OM.alignZ||0)*K);
      g.add(body); g.add(outfit);
      /* hair on the HEAD BONE */
      const headBone=findBone(body,'head');
      const hi=Math.max(0,Math.min(3,app.hairStyle??0));
      const order=(gender==='female')?[2,3,0,1]:[0,1,2,3];
      const hairUrl=HAIRS[order[hi]];
      const cHair=MODEL_CACHE[hairUrl];
      if(cHair&&headBone&&cHair.scene&&cHair.scene.clone){
        const hm=cHair.scene.clone(true);
        hm.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.frustumCulled=false;
          if(window._tintHairMat) window._tintHairMat(o,hairUrl,hairHex); } });
        const HM=MET[hairUrl.split('/').pop().replace('.glb','')];
        if(HM&&M.headW&&M.headH&&M.headD&&window._fitHairToSkull){
          /* Same fit as the static compositor. The head bone already sits at
           * the skull origin, so the skull-local offsets apply directly and
           * the scales stay in rig units (the bone inherits the body's K). */
          const f=window._fitHairToSkull(M,HM);
          hm.scale.set(f.sx,f.sy,f.sz);
          hm.position.set(f.px,f.py,f.pz);
        }else{
          /* legacy metrics — uniform scale, seated just under the bone */
          hm.scale.setScalar(0.62/((HM&&HM.w)||1));
          hm.position.set(0,-0.02,0);
        }
        headBone.add(hm);
      }
      /* face plane on the head bone too */
      if(window._attachFaceToBone&&headBone) window._attachFaceToBone(headBone,app,gender);
      const sh=blobShadow(1); sh.position.y=0.02; sh.userData._shadow=true; g.add(sh);
      /* mixers + clip table */
      const mixB=new THREE.AnimationMixer(body), mixO=new THREE.AnimationMixer(outfit);
      const prof=(REGH[cls]&&REGH[cls].animProfile)||'melee';
      const clips={
        idle:findClip(['Idle','Unarmed_Idle']),
        run:findClip(['Running_A','Walking_A']),
        attack:findClip(PROFILE_ATTACK[prof]||PROFILE_ATTACK.melee),
        dodge:findClip(['Dodge_Forward']),
        death:findClip(['Death_A']),
      };
      const acts={};
      for(const [k,cl] of Object.entries(clips)){
        if(!cl) continue;
        const rc=retargetClip(cl);
        acts[k]={b:mixB.clipAction(rc),o:mixO.clipAction(rc)};
        if(k==='attack'||k==='dodge'){ acts[k].b.setLoop(THREE.LoopOnce); acts[k].o.setLoop(THREE.LoopOnce); }
        if(k==='death'){ for(const s2 of ['b','o']){ acts[k][s2].setLoop(THREE.LoopOnce); acts[k][s2].clampWhenFinished=true; } }
      }
      const st={mixers:[mixB,mixO],acts,cur:null,oneUntil:0,_root:g};
      st.play=(name,fade)=>{ const a=st.acts[name]; if(!a||st.cur===name) return;
        const prev=st.acts[st.cur];
        for(const s2 of ['b','o']){ a[s2].reset().play(); if(prev) prev[s2].crossFadeTo(a[s2],fade??0.18,false); }
        st.cur=name; };
      st.playOnce=(name,dur)=>{ const a=st.acts[name]; if(!a) return;
        const prev=st.acts[st.cur];
        for(const s2 of ['b','o']){ const act=a[s2];
          act.reset(); act.setEffectiveTimeScale((act.getClip().duration/Math.max(0.2,dur))||1); act.play();
          if(prev&&prev[s2]!==act) prev[s2].crossFadeTo(act,0.1,false); }
        st.cur=name; st.oneUntil=nowS()+dur; };
      if(acts.idle){ acts.idle.b.play(); acts.idle.o.play(); st.cur='idle'; }
      mixers.add(st);
      g.userData.glbAnim=st;              // same interface — glbHeroAnim's driver picks it up? no: it has own mixers set. Drive here.
      const dummy=new THREE.Group();
      g.userData.legL=dummy; g.userData.legR=dummy; g.userData.armL=dummy;
      g.userData.armR=dummy; g.userData.weapArm=dummy; g.userData.glb=true; g.userData.customRig=true;
      return g;
    }catch(e){ console.warn('[custom-rig] build fail',e); return _bh.apply(this,arguments); }
  };

  /* driver: mixer updates + local player state machine */
  let lastT=performance.now()/1000;
  (function tick(){
    requestAnimationFrame(tick);
    const t=performance.now()/1000, dt=Math.min(0.1,t-lastT); lastT=t;
    for(const st of mixers){
      if(st._root&&!st._root.parent&&(!player.mesh||st._root!==player.mesh)){ mixers.delete(st); continue; }
      for(const m of st.mixers) m.update(dt);
    }
    if(!started||!player.mesh) return;
    const st=player.mesh.userData&&player.mesh.userData.customRig&&player.mesh.userData.glbAnim;
    if(!st) return;
    const ts=nowS();
    if(player.dead){ st.play('death',0.25); return; }
    if(ts<st.oneUntil) return;
    if(player.atkAnim>0){ st.playOnce('attack',Math.max(0.3,player.atkAnimDur||0.3)); return; }
    if(player.dodgeUntil&&ts<player.dodgeUntil){ st.playOnce('dodge',0.32); return; }
    st.play(player.moving?'run':'idle');
  })();

  /* remote ka-party: run/idle from movement */
  setInterval(()=>{
    if(!window._kaParty) return;
    for(const r of window._kaParty.values()){
      const st=r.mesh&&r.mesh.userData&&r.mesh.userData.customRig&&r.mesh.userData.glbAnim;
      if(!st) continue;
      const moved=(r._lx2!==undefined)&&(Math.abs(r.x-r._lx2)+Math.abs(r.z-r._lz2)>0.05);
      r._lx2=r.x; r._lz2=r.z;
      st.play(moved?'run':'idle');
    }
  },150);
})();

/* helper exports used by customHeroRig (tint skinned + face-on-bone) */
(function rigHelpers(){
  const tintCache={};
  window._tintSkinned=function(root,url,hex){
    try{
      const key=url+'|'+hex;
      root.traverse(o=>{
        if(!o.isMesh||!o.material||!o.material.map) return;
        if(!tintCache[key]){
          const img=o.material.map.image; if(!img) return;
          const cv=document.createElement('canvas');
          cv.width=img.width; cv.height=img.height;
          const ctx=cv.getContext('2d');
          ctx.drawImage(img,0,0);
          ctx.globalCompositeOperation='multiply';
          const MID=0xc98a5e;
          const r=Math.min(255,Math.round(((hex>>16)&255)/((MID>>16)&255)*255));
          const g2=Math.min(255,Math.round(((hex>>8)&255)/((MID>>8)&255)*255));
          const b=Math.min(255,Math.round((hex&255)/(MID&255)*255));
          ctx.fillStyle='rgb('+r+','+g2+','+b+')';
          ctx.fillRect(0,0,cv.width,cv.height);
          const tex=new THREE.CanvasTexture(cv);
          tex.flipY=o.material.map.flipY; tex.colorSpace=THREE.SRGBColorSpace;
          tintCache[key]=tex;
        }
        o.material=o.material.clone(); o.material.map=tintCache[key];
      });
    }catch(e){}
  };
  const hairTintCache={};
  window._tintHairMat=function(mesh,url,hex){
    try{
      if(!mesh.material||!mesh.material.map) return;
      const key=url+'|'+hex;
      if(!hairTintCache[key]){
        const img=mesh.material.map.image; if(!img) return;
        const cv=document.createElement('canvas');
        cv.width=img.width; cv.height=img.height;
        const ctx=cv.getContext('2d');
        ctx.drawImage(img,0,0);
        ctx.globalCompositeOperation='multiply';
        const r=Math.min(255,((hex>>16)&255)*2),g2=Math.min(255,((hex>>8)&255)*2),b=Math.min(255,(hex&255)*2);
        ctx.fillStyle='rgb('+r+','+g2+','+b+')';
        ctx.fillRect(0,0,cv.width,cv.height);
        const tex=new THREE.CanvasTexture(cv);
        tex.flipY=mesh.material.map.flipY; tex.colorSpace=THREE.SRGBColorSpace;
        hairTintCache[key]=tex;
      }
      mesh.material=mesh.material.clone(); mesh.material.map=hairTintCache[key];
    }catch(e){}
  };
  /* face plane sa head bone (bone-local coords) */
  window._attachFaceToBone=function(bone,app,gender){
    try{
      for(const c of [...bone.children]) if(c.userData&&c.userData._face) bone.remove(c);
      const geo=new THREE.PlaneGeometry(0.34,0.34,8,1);
      const pa=geo.attributes.position;
      for(let k=0;k<pa.count;k++){ const x=pa.getX(k); pa.setZ(k,-Math.abs(x)*x*x*1.2); }
      geo.computeVertexNormals();
      const mat=new THREE.MeshBasicMaterial({transparent:true,depthWrite:false});
      const plane=new THREE.Mesh(geo,mat);
      plane.position.set(0,0.13,(gender==='female'?0.155:0.17));
      plane.renderOrder=2;
      plane.userData._face=true;
      /* reuse facePlanes texture pipeline via a tiny bridge */
      if(window._faceTexFor) window._faceTexFor(app,tex=>{ mat.map=tex; mat.needsUpdate=true; });
      bone.add(plane);
    }catch(e){}
  };
  /* metrics bridge for hair scaling */
  fetch('data/models/custom-heroes.json').then(r=>r.json()).then(j=>{ window._customMetrics=j; }).catch(()=>{});
})();
