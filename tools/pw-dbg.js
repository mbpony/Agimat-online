const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext()).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e.message).slice(0,90)));
  await p.goto('http://127.0.0.1:8000',{waitUntil:'networkidle'});
  await p.waitForTimeout(2500);
  const m=await p.evaluate(()=>window._dbgMap?window._dbgMap():null);
  console.log('MAIN _dbgMap:', JSON.stringify(m));
  await p.goto('http://127.0.0.1:8000/?map=map_sagada',{waitUntil:'networkidle'});
  await p.waitForTimeout(2500);
  const s=await p.evaluate(()=>window._dbgMap?window._dbgMap():null);
  console.log('SAG _dbgMap:', JSON.stringify(s));
  console.log('ERRORS:', errs.length?errs.slice(0,4):'none');
  await b.close();
})();
