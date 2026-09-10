const { chromium } = require('playwright');
async function shoot(p,url,path){
  const errs=[]; p.on('pageerror',e=>errs.push(String(e.message).slice(0,80)));
  await p.goto(url,{waitUntil:'networkidle'}); await p.waitForTimeout(2500);
  const m=await p.evaluate(()=>window._dbgMap?window._dbgMap():null);
  // grab minimap as image
  const mm=await p.evaluate(()=>{const c=document.getElementById('minimap');return c?c.toDataURL():null;});
  if(mm) require('fs').writeFileSync(path+'.minimap.png', Buffer.from(mm.split(',')[1],'base64'));
  console.log(path, 'maxH=', m&&m.maxH, 'fog=', m&&m.fog, 'ERR=', errs.length?errs[0]:'none');
}
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:900,height:600}});
  await shoot(await ctx.newPage(),'http://127.0.0.1:8000/','docs/banaue');
  await shoot(await ctx.newPage(),'http://127.0.0.1:8000/?map=map_sagada','docs/sagada');
  await b.close();
})();
