/* ============================================================================
   worldgen.js — per-map world recipes for Agimat Online (MS2-style diorama)
   ----------------------------------------------------------------------------
   Single source of truth for each region's:
     • macro zone layout   -> zoneIndex(mapId, x, y, MAIN_W)
     • plateau heights     -> plateauHeight(mapId, zn, tx, ty, volcano)
     • zone palette        -> palette(mapId)
     • plateau base array  -> heights(mapId)
   Every map gets its OWN silhouette, heights and colors so no two regions
   read the same. game.js consumes these via window.WORLDGEN.
   Zone index legend (both maps):
     0 start/valley  1 terraces/pine  2 caves/karst  3 town  4 river
     5 ancient/echo  6 waterfalls/ridge 7 high ridge  8 summit  9 isle/sea
   ========================================================================== */
(function(){
  'use strict';

  /* Base plateau height per zone (index = zone). */
  const ZH={
    map_starting:[1.2,3.0,3.5,1.0,0.8,3.0,5.0,7.0,10.0,1.0],  // Banaue (warm highland)
    map_sagada:  [2.0,4.5,5.5,1.5,1.0,4.0,6.5,8.5,12.0,1.0],  // Sagada (taller, cooler)
  };

  /* Crisp two-tone palette per zone [a,b] (checkerboard for subtle texture). */
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

  /* Macro zone layout per map (x,y in tiles). x>=MAIN_W = eastern sea/isle. */
  function zoneIndex(mapId,x,y,MAIN_W){
    if(x>=MAIN_W) return 9;
    if(mapId==='map_sagada'){
      if(y<18) return x>=90?8:7;              // N misty ridge + NE snow summit
      if(y<40) return x<50?1:(x<90?3:2);      // W pine / center village / E caves
      if(y<62) return x<50?4:(x<90?0:2);      // W river / center valley / E caves
      return x<70?0:5;                        // S echo valley
    }
    // Banaue (default)
    if(y>=58) return x>=95?2:0;               // S start / SE caves
    if(y<22){ if(x>=95)return 8; if(x>=45)return 6; return y<10?7:5; } // NE peak / N falls / top ridge / NW ancient
    if(x>=95) return 1;                       // E Batad terraces
    if(x<45)  return 4;                       // W Tinun-an river
    return 3;                                 // center Barangay Liwanag
  }

  /* Plateau height for a zone tile (crisp steps, rocky bumps, summit dome). */
  function plateauHeight(mapId,zn,tx,ty,volcano){
    const Z=ZH[mapId]||ZH.map_starting;
    let h=Z[zn];
    if(zn===1||zn===5) h+=(Math.floor(ty/3)%4)*0.6;   // terrace steps
    if(zn===2) h+=((tx*7+ty*13)%4)*0.3;               // rocky bumps
    if(zn===8&&volcano){ const d=Math.hypot(tx-volcano.tx,ty-volcano.ty); h+=Math.max(0,(volcano.r-d))*0.5; } // summit dome
    return h;
  }

  window.WORLDGEN={ zoneIndex, plateauHeight,
    palette:(id)=>ZCOL[id]||ZCOL.map_starting,
    heights:(id)=>ZH[id]||ZH.map_starting };
})();
