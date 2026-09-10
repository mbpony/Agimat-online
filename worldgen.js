/* ============================================================================
   worldgen.js — Agimat Online procedural world-design layer (V2)
   ----------------------------------------------------------------------------
   Produces DETERMINISTIC world recipes that game.js consumes. It never renders;
   it only designs (zones, heights, palettes, rivers, terraces, waterfalls,
   paths, landmarks, gates). Same seed => same world. No Math.random() inside.

   Preserved API (used by game.js — do not break):
     WORLDGEN.zoneIndex(mapId,x,y,MAIN_W)
     WORLDGEN.plateauHeight(mapId,zn,tx,ty,summit)
     WORLDGEN.palette(mapId)
     WORLDGEN.heights(mapId)

   V2 API (design layer):
     WORLDGEN.generate(opts) / generateCell / terrainHeight / generateZones /
     generateRivers / generateTerraces / generateWaterfalls / generatePaths /
     generateLandmarks / generateVegetation / getConnections / getZoneInfo

   Zone legend (Banaue, per spec):
     0 Maligaya Trail  1 Batad Terraces  2 Hungduan Caves  3 Barangay Liwanag
     4 Tinun-an River  5 Ancient Terraces 6 Hapao Waterfalls 7 Cloudridge Trail
     8 Balangaw Peak   9 regional boundary / sea / isle
   ========================================================================== */
(function(){
'use strict';

/* ---------------- deterministic PRNG / noise ---------------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
function hash2(x,y,seed){let h=(seed|0)^(Math.imul(x|0,374761393))^(Math.imul(y|0,668265263));h=Math.imul(h^(h>>>13),1274126177);h>>>=0;return (h^(h>>>16))>>>0;}
function hash01(x,y,seed){return hash2(x,y,seed)/4294967296;}
function vnoise(x,y,seed){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;const s=t=>t*t*(3-2*t);
  const a=hash01(xi,yi,seed),b=hash01(xi+1,yi,seed),c=hash01(xi,yi+1,seed),d=hash01(xi+1,yi+1,seed);
  const u=s(xf),v=s(yf);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}

/* ---------------- per-map data ---------------- */
const ZH={
  map_starting:[1.2,3.0,3.5,1.0,0.8,3.0,5.0,7.0,10.0,1.0],
  map_sagada:  [2.0,4.5,5.5,1.5,1.0,4.0,6.5,8.5,12.0,1.0],
};
const ZCOL={
  map_starting:[
    [0x7ab556,0x6fae4e],[0x5d9440,0x548a3a],[0x6a6156,0x5a5148],[0xc9b183,0xbda678],
    [0x4f7a52,0x456f4a],[0x8a8a4e,0x7d7d45],[0x3e6a4e,0x366044],[0x5e6e56,0x54644c],
    [0x9aa0a6,0x8a9096],[0x1e6a46,0x1a5e3e]],
  map_sagada:[
    [0x6f9a5a,0x66914f],[0x4e7d46,0x477540],[0x7a7468,0x716b60],[0xb8a98c,0xafa084],
    [0x4a7a80,0x43727a],[0x6b7d52,0x63754b],[0x52707a,0x4b6872],[0x6a7a72,0x62726a],
    [0xdfe6ea,0xd6dde2],[0x1e6a46,0x1a5e3e]],
};
const ZONE_INFO={
  map_starting:[
    {id:0,name:'Maligaya Trail',lv:[1,3],role:'Starting Area'},
    {id:1,name:'Batad Terraces',lv:[2,5],role:'Iconic rice terraces'},
    {id:2,name:'Hungduan Caves',lv:[3,6],role:'Karst / cave exploration'},
    {id:3,name:'Barangay Liwanag',lv:[1,10],role:'Neutral Zone / Main Hub'},
    {id:4,name:'Tinun-an River',lv:[4,7],role:'River corridor'},
    {id:5,name:'Ancient Terraces',lv:[4,7],role:'Old quiet terraces / ruins'},
    {id:6,name:'Hapao Waterfalls',lv:[5,8],role:'Waterfall cliffs'},
    {id:7,name:'Cloudridge Trail',lv:[6,10],role:'High route to Sagada'},
    {id:8,name:'Balangaw Peak',lv:[8,10],role:'Summit / world viewpoint'},
    {id:9,name:'Regional Boundary',lv:[10,10],role:'Sea / endgame isle'},
  ],
};

/* Organic zone seeds for Banaue (tile coords) — nearest-seed Voronoi + noise
   gives hand-authored-looking, non-rectangular borders. */
const BAN_SEEDS=[
  [66,76,0],[110,42,1],[110,70,2],[66,43,3],[28,52,4],
  [24,22,5],[70,12,6],[34,7,7],[112,22,8],
];
const TOWN={x0:58,x1:75,y0:37,y1:50};

/* ---------------- zone layout ---------------- */
function zoneIndex(mapId,x,y,MAIN_W,seed){
  if(x>=MAIN_W) return 9;
  if(mapId==='map_sagada'){
    if(y<18) return x>=90?8:7;
    if(y<40) return x<50?1:(x<90?3:2);
    if(y<62) return x<50?4:(x<90?0:2);
    return x<70?0:5;
  }
  if(x>=TOWN.x0&&x<=TOWN.x1&&y>=TOWN.y0&&y<=TOWN.y1) return 3; // controlled hub
  const s=seed||847291;
  const wob=(vnoise(x*0.12,y*0.12,s)-0.5)*26;   // organic border irregularity
  let best=3,bd=1e9;
  for(const [sx,sy,z] of BAN_SEEDS){
    const dx=x-sx,dy=y-sy;
    const d=dx*dx+dy*dy + wob;
    if(d<bd){bd=d;best=z;}
  }
  return best;
}

/* ---------------- plateau height ---------------- */
function plateauHeight(mapId,zn,tx,ty,summit){
  const Z=ZH[mapId]||ZH.map_starting;
  let h=Z[zn];
  if(zn===1||zn===5) h+=(Math.floor(ty/3)%4)*0.6;      // terrace steps
  if(zn===2) h+=((tx*7+ty*13)%4)*0.3;                  // rocky bumps
  if(zn===8&&summit){const d=Math.hypot(tx-summit.tx,ty-summit.ty);h+=Math.max(0,(summit.r-d))*0.5;}
  return h;
}

/* ---------------- continuous terrain height (macro field) ---------------- */
function terrainHeight(mapId,x,y,o){
  o=o||{}; const seed=o.seed||847291;
  const zn=zoneIndex(mapId,x,y,o.MAIN_W||134,seed);
  const base=plateauHeight(mapId,zn,x,y,o.summit);
  const macro=vnoise(x*0.03,y*0.03,seed)*1.4;         // broad undulation
  const local=vnoise(x*0.15,y*0.15,seed^7)*0.4;       // fine detail
  return base+macro*(zn===3?0.15:1)+local*(zn===3?0.1:1);
}

/* ---------------- generators (deterministic metadata) ---------------- */
function generateRivers(mapId,o){
  o=o||{};const seed=o.seed||847291;const pts=[];
  // Tinun-an: deterministic spline from north source to south outflow (west side)
  for(let t=0;t<=24;t++){const y=8+t*3.2;const x=26+Math.sin(t*0.55+1)*7+vnoise(t,0,seed)*4;pts.push({x:Math.round(x),y:Math.round(y)});}
  return [{id:'tinun_an',points:pts,width:2}];
}
function generateTerraces(mapId,zone,o){
  o=o||{};const seed=o.seed||847291;const out=[];
  const cx=zone===1?110:24, cy=zone===1?42:22;
  const n=5+Math.floor(hash01(zone,1,seed)*4);
  for(let i=0;i<n;i++)out.push({level:i,cx:cx+Math.round((hash01(i,2,seed)-0.5)*10),cy:cy+Math.round((hash01(i,3,seed)-0.5)*8),w:4+Math.floor(hash01(i,4,seed)*5)});
  return out;
}
function generateWaterfalls(mapId,zone,o){
  // 1 signature + a few secondary, on Hapao(6)
  return [{id:'hapao_main',x:70,y:16,major:true},{id:'hapao_b',x:60,y:14,major:false},{id:'hapao_c',x:80,y:15,major:false}];
}
function generatePaths(mapId,o){
  return {
    main:[{from:'maligaya',to:'liwanag'},{from:'liwanag',to:'north_gate'},{from:'liwanag',to:'east_gate'},{from:'liwanag',to:'west_gate'},{from:'liwanag',to:'south_gate'}],
    secondary:[{from:'liwanag',to:'batad'},{from:'liwanag',to:'tinun_an'},{from:'liwanag',to:'hungduan'}],
    secret:[{from:'hungduan',to:'cave_01'},{from:'liwanag',to:'black_market'}],
  };
}
function generateLandmarks(mapId,o){
  return [
    {id:'barangay_liwanag',zone:3,x:66,y:43},{id:'grand_tiangge',zone:3,x:63,y:42},
    {id:'panday_iko',zone:3,x:70,y:45},{id:'mananahi',zone:3,x:69,y:41},
    {id:'black_market',zone:3,x:61,y:48,hidden:true},{id:'batad',zone:1,x:110,y:42},
    {id:'hungduan_cave',zone:2,x:110,y:70},{id:'hapao_falls',zone:6,x:70,y:14},
    {id:'cloudridge',zone:7,x:34,y:7},{id:'balangaw',zone:8,x:112,y:22},
  ];
}
function generateVegetation(mapId,o){
  o=o||{};const seed=o.seed||847291;const out=[];
  for(let i=0;i<120;i++){const x=4+hash01(i,1,seed)*128,y=4+hash01(i,2,seed)*80;const z=zoneIndex(mapId,x,y,134,seed);
    const dens=(z===4||z===7)?0.9:(z===1||z===5)?0.4:(z===3)?0.2:0.6;
    if(hash01(i,3,seed)<dens)out.push({x:Math.round(x),y:Math.round(y),zone:z,family:(z===7?'pine':'broadleaf')});}
  return out;
}
function getConnections(mapId){
  return {
    north:{destination:'map_sagada_highlands',label:'Sagada Highlands'},
    east:{destination:'map_isabela_plains',label:'Isabela Plains'},
    west:{destination:'map_la_union_beach',label:'La Union Beach'},
    south:{destination:'map_mt_pinatubo',label:'Mt. Pinatubo Area'},
  };
}
function getZoneInfo(mapId,zone){return (ZONE_INFO[mapId]||ZONE_INFO.map_starting)[zone]||null;}

function generateZones(mapId,o){o=o||{};const s=o.seed||847291;return (ZONE_INFO[mapId]||ZONE_INFO.map_starting).map(z=>Object.assign({},z,{seed:s}));}

function generateCell(mapId,cx,cy,o){o=o||{};const size=o.cell||6;const zones={};
  for(let y=cy*size;y<(cy+1)*size;y++)for(let x=cx*size;x<(cx+1)*size;x++){const z=zoneIndex(mapId,x,y,o.MAIN_W||134,o.seed);zones[z]=(zones[z]||0)+1;}
  return {cell:[cx,cy],zones};}

function generate(opts){
  opts=opts||{};const mapId=opts.mapId||'map_starting';const seed=opts.seed||847291;
  return {
    mapId,seed,
    dimensions:{width:1536,height:1536,cellSize:256,cellsX:6,cellsY:6},
    zones:generateZones(mapId,{seed}),
    rivers:generateRivers(mapId,{seed}),
    terraces:{batad:generateTerraces(mapId,1,{seed}),ancient:generateTerraces(mapId,5,{seed})},
    waterfalls:generateWaterfalls(mapId,6,{seed}),
    paths:generatePaths(mapId,{seed}),
    landmarks:generateLandmarks(mapId,{seed}),
    vegetation:generateVegetation(mapId,{seed}),
    connections:getConnections(mapId),
  };
}

window.WORLDGEN={
  zoneIndex,plateauHeight,
  palette:(id)=>ZCOL[id]||ZCOL.map_starting,
  heights:(id)=>ZH[id]||ZH.map_starting,
  // V2
  generate,generateCell,terrainHeight,generateZones,generateRivers,generateTerraces,
  generateWaterfalls,generatePaths,generateLandmarks,generateVegetation,getConnections,getZoneInfo,
};
})();
