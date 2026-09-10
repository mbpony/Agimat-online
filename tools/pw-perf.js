// pw-perf.js — boot each map, login+enter, then measure draw calls (renderer.info) and FPS.
const { chromium } = require('playwright-core');
const MAPS=[['map_starting','Banaue'],['map_sagada','Sagada']];
function measure(page){
  return page.evaluate(()=>new Promise(res=>{
    let frames=0; const t0=performance.now();
    function tick(){ frames++; if(performance.now()-t0<2000) requestAnimationFrame(tick);
      else res({fps:Math.round(frames/((performance.now()-t0)/1000)), calls:(window.__renderer&&window.__renderer.info&&window.__renderer.info.render.calls)||-1, tris:(window.__renderer&&window.__renderer.info.render.triangles)||-1}); }
    requestAnimationFrame(tick);
  }));
}
(async()=>{
  const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  for(const [mapId,name] of MAPS){
    const ctx=await browser.newContext({viewport:{width:1280,height:720}});
    const page=await ctx.newPage();
    const errs=[]; page.on('pageerror',e=>errs.push(String(e.message||e).slice(0,200)));
    await page.goto('http://localhost:8000/',{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForTimeout(500);
    await page.evaluate(()=>{ try{ localStorage.setItem('agimat_user',JSON.stringify({id:'perf'+Date.now(),pw:'x',char:{name:'PerfTest',class:'bagani',lvl:20,exp:0,zone:'map_starting',pos:{x:0,y:0},hp:100,maxHp:100,mana:50,maxMana:50,stamina:100,statPoints:0,skillPoints:0,skillLevels:{},equip:[],inventory:[],gold:0,kills:0,deaths:0,playtime:0,quests:{},flags:{},created:Date.now(),seenIntro:true}})); }catch(e){} });
    await page.reload({waitUntil:'domcontentloaded',timeout:60000});
    try{ await page.waitForFunction(()=>window.MAPS&&window.MAPS.length>0,{timeout:30000}); }catch(e){ console.log(name,'NO MAPS'); await ctx.close(); continue; }
    await page.evaluate((id)=>{ const mm=window.MAPS.find(x=>x.id===id); if(mm) window.MAPS[0]=mm; },mapId);
    await page.evaluate(()=>enterWorld&&enterWorld());
    // expose renderer for measurement
    await page.evaluate(()=>{ try{ const c=Object.values(window).find(v=>v&&v.isWebGLRenderer); if(c) window.__renderer=c; }catch(e){} });
    await page.waitForTimeout(6000);
    let r={fps:-1,calls:-1,tris:-1}; try{ r=await measure(page); }catch(e){}
    console.log(name+': fps='+r.fps+' drawCalls='+r.calls+' tris='+r.tris+' ERR='+(errs.length?errs.join('|').slice(0,150):'none'));
    await ctx.close();
  }
  await browser.close();
})();
