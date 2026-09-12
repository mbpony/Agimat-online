// worldspec-loader.js — convert a WorldForge "World-Spec" JSON into an Agimat map descriptor.
// Pure function (no fs): pass the parsed spec object. Usable server-side or in-browser.
'use strict';

// WorldForge assetId -> Agimat prop type (buildMeshes/addProp vocabulary). Unknown -> rock.
const ASSET_MAP = {
  house_cottage:'hut', house_cabin:'hut', hut_thatch:'hut', house_manor:'hut', house_tower:'watchtower',
  watch_tower:'watchtower', tower_keep:'watchtower', tower_round:'watchtower', guard_tower_simple:'watchtower',
  chapel:'shrine', temple_stone:'shrine', altar_stone:'shrine', obelisk:'statue', statue_hero:'statue',
  totem_pole:'statue', tavern_house:'stall', market_stall:'stall', well:'well',
  lamp_post:'brazier', campfire:'brazier', brazier_fire:'brazier',
  portal_stone:'portal', portal_ruin:'portal', arch_stone:'portal',
  pine_tree:'tree_pine', pine_tree_snow:'tree_pine', oak_tree:'tree_oak', palm_tree:'tree_palm', birch_tree:'tree_oak',
  rock_boulder:'rock', rock_spire:'rock', rock_arch:'rock', rock_cluster:'rock', bones_pile:'rock',
  bridge_plank:'dock', bridge_rope:'dock', bridge_arch:'dock', dock_planks:'dock', boat_row:'boat',
  cave_entry:'rock', stalactite:'rock', stalagmite:'rock', crystal_cluster:'shrine', lake_glow:'well',
  crate:'stall', barrel:'stall', signpost:'statue',
};
function mapAsset(id){ return ASSET_MAP[id] || 'rock'; }

// bilinear sample of a res×res (N=res+1) height grid over a size×size world centered at origin
function makeSampler(heightData, res, size){
  const N = res + 1;
  return function(wx, wz){
    let fx = (wx + size/2) / size * res, fz = (wz + size/2) / size * res;
    fx = Math.max(0, Math.min(res - 0.0001, fx)); fz = Math.max(0, Math.min(res - 0.0001, fz));
    const x0 = Math.floor(fx), z0 = Math.floor(fz), tx = fx - x0, tz = fz - z0;
    const a = heightData[z0*N + x0], b = heightData[z0*N + x0 + 1], c = heightData[(z0+1)*N + x0], d = heightData[(z0+1)*N + x0 + 1];
    return a*(1-tx)*(1-tz) + b*tx*(1-tz) + c*(1-tx)*tz + d*tx*tz;
  };
}

/**
 * @param {object} spec  parsed World-Spec
 * @param {object} [opts] {gridW, gridH, tile}
 * @returns Agimat map descriptor (heights[][], zoneGrid[][], playerSpawn, portals[], boss, props[])
 */
function worldSpecToAgimat(spec, opts){
  opts = opts || {};
  const gridW = opts.gridW || 192, gridH = opts.gridH || 105, tile = opts.tile || 4;
  const size = (spec.world && spec.world.size && spec.world.size.width) || 2048;
  const res  = (spec.terrain && spec.terrain.resolution) || 256;
  const seaLevel = (spec.terrain && spec.terrain.seaLevel != null) ? spec.terrain.seaLevel : 22;
  const hd = (spec.terrain && spec.terrain.heightData) || [];
  const sample = makeSampler(hd, res, size);
  const zones = spec.zones || [];
  // world coords for a tile center
  const wx = tx => tx/gridW*size - size/2;
  const wz = ty => ty/gridH*size - size/2;

  const heights = new Array(gridH), zoneGrid = new Array(gridH);
  for(let ty=0; ty<gridH; ty++){
    const hr = new Array(gridW), zr = new Array(gridW);
    const z = wz(ty);
    for(let tx=0; tx<gridW; tx++){
      const x = wx(tx);
      hr[tx] = sample(x, z);
      let zi = 0;
      for(let i=0;i<zones.length;i++){ const b = zones[i].bounds; if(b && x>=b.min.x && x<=b.max.x && z>=b.min.z && z<=b.max.z){ zi = i; break; } }
      zr[tx] = zi;
    }
    heights[ty] = hr; zoneGrid[ty] = zr;
  }

  // WorldForge world coords -> Agimat tile coords (main.json uses tile tx/ty)
  const w2tx = wx => Math.max(0,Math.min(gridW-1,Math.round((+wx + size/2)/size*gridW)));
  const w2ty = wz => Math.max(0,Math.min(gridH-1,Math.round((+wz + size/2)/size*gridH)));
  // markers -> spawn / portals / boss (tile coords)
  const markers = (spec.gameplay && spec.gameplay.markers) || [];
  const sm = markers.find(m=>m.type==='player_spawn');
  const playerSpawn = sm ? { tx:w2tx(sm.position.x), ty:w2ty(sm.position.z) } : { tx:Math.floor(gridW/2), ty:Math.floor(gridH/2) };
  const wsPortals = markers.filter(m=>m.type==='portal').map((m,i)=>({
    id:'ws_portal_'+i, to:(m.properties && (m.properties.target||m.properties.to)) || 'world',
    tx:w2tx(m.position.x), ty:w2ty(m.position.z), r:6, label:(m.properties && m.properties.name) || ('Portal '+(i+1))
  }));
  // game reads MAPCFG.portals.town / .isle -> map the first two World-Spec portals onto them
  const portals = {
    town:{ tx:(wsPortals[0]||playerSpawn).tx, ty:(wsPortals[0]||playerSpawn).ty },
    isle:{ tx:(wsPortals[1]||playerSpawn).tx, ty:(wsPortals[1]||playerSpawn).ty }
  };
  const bm = markers.find(m=>m.type==='boss_arena');
  const boss = bm ? { tx:w2tx(bm.position.x), ty:w2ty(bm.position.z), name:(bm.properties&&bm.properties.name)||'Boss' } : null;

  // instances -> props (tile coords)
  const props = (spec.instances||[]).map(inst=>{
    const p = inst.transform && inst.transform.position || {x:0,z:0};
    return { type: mapAsset(inst.assetId), assetId: inst.assetId, tx:w2tx(p.x), ty:w2ty(p.z), zoneId: inst.zoneId };
  });

  // rivers -> polylines (tile coords)
  const rivers = ((spec.water && spec.water.rivers) || []).map(r=>({ name:r.name, width:r.width||10, points:(r.points||[]).map(p=>({tx:w2tx(p.x),ty:w2ty(p.z)})) }));

  // main.json-compatible fields so the existing game pipeline can load a World-Spec map safely
  const stx = playerSpawn.tx, sty = playerSpawn.ty;
  // Town: prefer a 'town'/'settlement' marker or the centroid of the user's placed buildings, so the engine
  // builds the wall/plaza/tent around YOUR town. Else the canonical Banaue rect.
  let townRect = { x0:58, x1:75, y0:37, y1:50, z0:37, z1:50 };
  const townMk = markers.find(m=>m.type==='town'||m.type==='settlement');
  const blds = (spec.instances||[]).filter(i=>/^(house|chapel|tavern|tower|watch)/.test(i.assetId||''));
  if(townMk){ const tx=w2tx(townMk.position.x), ty=w2ty(townMk.position.z);
    townRect={x0:Math.max(0,tx-9),x1:Math.min(gridW-1,tx+9),y0:Math.max(0,ty-7),y1:Math.min(gridH-1,ty+7),z0:Math.max(0,ty-7),z1:Math.min(gridH-1,ty+7)}; }
  else if(blds.length>=3){ let sx=0,sy=0; for(const b of blds){ sx+=w2tx(b.transform.position.x); sy+=w2ty(b.transform.position.z);} sx=Math.round(sx/blds.length); sy=Math.round(sy/blds.length);
    townRect={x0:Math.max(0,sx-9),x1:Math.min(gridW-1,sx+9),y0:Math.max(0,sy-7),y1:Math.min(gridH-1,sy+7),z0:Math.max(0,sy-7),z1:Math.min(gridH-1,sy+7)}; }

  return {
    source:'worldspec', name:(spec.world&&spec.world.name)||'WorldSpec Map',
    gridW, gridH, tile, seed:(spec.generator&&spec.generator.seed)||1,
    heights, zoneGrid, zones: zones.map(z=>({name:z.name, biome:z.biome})),
    playerSpawn, portals, wsPortals, boss, props, rivers, seaLevel,
    zoneNames: zones.map(z=>z.name),
    // compat defaults (terrain comes from heights[], so these only need to be safe, not meaningful):
    mainlandWidth: gridW, seaY: gridH,
    volcano: { tx: Math.round(gridW*0.58), ty: Math.round(gridH*0.23), r: 0 },
    lake: { tx: -99, ty: -99, r: 0 },
    town: townRect, townExclusion: townRect,
    isle: { x0: gridW+10, y0: 0, x1: gridW+20, y1: 10 },
  };
}

if (typeof module !== 'undefined') module.exports = { worldSpecToAgimat, mapAsset, ASSET_MAP };

// --- self test: node worldspec-loader.js <spec.json> ---
if (typeof require !== 'undefined' && require.main === module){
  const fs = require('fs');
  const file = process.argv[2] || '/home/user/worldforge/maps/agimat-banaue.worldspec.json';
  const spec = JSON.parse(fs.readFileSync(file,'utf8'));
  const m = worldSpecToAgimat(spec);
  let mn=1e9,mx=-1e9; for(const r of m.heights) for(const v of r){ if(v<mn)mn=v; if(v>mx)mx=v; }
  const zoneSet = new Set(); for(const r of m.zoneGrid) for(const v of r) zoneSet.add(v);
  console.log('converted:', file.split('/').pop());
  console.log('  grid', m.gridW+'x'+m.gridH, '| height', mn.toFixed(1)+'..'+mx.toFixed(1), '| zones used', zoneSet.size, '| props', m.props.length);
  console.log('  spawn', JSON.stringify(m.playerSpawn), '| portals', m.portals.length, '| boss', m.boss?('yes @'+m.boss.x+','+m.boss.z):'no', '| rivers', m.rivers.length);
  const ok = m.heights.length===m.gridH && m.heights[0].length===m.gridW && m.portals.length>0 && mx>mn;
  console.log('  RESULT', ok?'PASS':'FAIL');
  process.exit(ok?0:1);
}
