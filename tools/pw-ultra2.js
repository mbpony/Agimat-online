const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:900,height:600}});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e.message).slice(0,120)));
  await p.goto('http://127.0.0.1:8000/?low=1',{waitUntil:'networkidle'}); await p.waitForTimeout(2500);
  const m=await p.evaluate(()=>window._dbgMap?window._dbgMap():null);
  const ul=await p.evaluate(()=>({toggle:!!document.getElementById('ultra-chk'), pr:window.__renderer?window.__renderer.getPixelRatio():'n/a'}));
  console.log('ULTRA: maxH=',m&&m.maxH,'pixelRatio=',ul.pr,'toggle=',ul.toggle,'ERR=',errs.length?errs[0]:'none');
  await b.close();
})();
