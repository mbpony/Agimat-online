const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext({viewport:{width:1280,height:860}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e.message).slice(0,100)));
  await p.goto('http://127.0.0.1:8000',{waitUntil:'networkidle'});
  await p.waitForTimeout(1000);
  await p.evaluate((u)=>{document.getElementById('btn-start')?.click();document.getElementById('acct-tab-reg')?.click();const us=document.getElementById('acct-user');if(us){us.value=u;us.dispatchEvent(new Event('input',{bubbles:true}));}const ps=document.getElementById('acct-pass');if(ps){ps.value='test1234';ps.dispatchEvent(new Event('input',{bubbles:true}));}document.getElementById('acct-go')?.click();},'c'+Date.now());
  await p.waitForTimeout(800);
  let en=false;
  for(let i=0;i<16&&!en;i++){const a=await p.evaluate(()=>{const vis=e=>e&&e.offsetParent!==null;const e2=document.getElementById('cine-enter');if(vis(e2)){e2.click();return 'enter';}for(const id of['cc-classes','cc-diwa','cc-agimat']){const c=document.querySelector('#'+id+' button');if(vis(c))c.click();}const nm=document.getElementById('cc-name');if(vis(nm)&&nm.value.trim().length<2){nm.value='Bayani';nm.dispatchEvent(new Event('input',{bubbles:true}));}const cf=document.getElementById('cc-confirm');if(vis(cf)&&!cf.disabled){cf.click();return 'confirm';}const nx=document.getElementById('cc-next');if(vis(nx)&&!nx.disabled){nx.click();return 'next';}return 'idle';});if(a==='enter')en=true;await p.waitForTimeout(300);}
  await p.waitForTimeout(1500);
  // close any modal (daily reward) by clicking its confirm repeatedly
  for(let i=0;i<3;i++){ await p.evaluate(()=>{ [...document.querySelectorAll('button')].forEach(b=>{ if(/Salamat|Isara|Close|OK|✕/i.test(b.textContent)) b.click(); }); }); await p.waitForTimeout(400); }
  const mm=p.locator('#minimap');
  if(await mm.count()) await mm.screenshot({path:'docs/banaue-minimap.png'});
  await p.screenshot({path:'docs/banaue-world.png'});
  console.log('ERRORS:', errs.length?errs.slice(0,4):'none');
  await b.close();
})();
