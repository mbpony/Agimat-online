const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext({viewport:{width:1280,height:860}})).newPage();
  const errs=[];
  p.on('pageerror',e=>errs.push('PAGEERR: '+String(e.message).slice(0,120)));
  await p.goto('http://127.0.0.1:8000',{waitUntil:'networkidle'});
  await p.waitForTimeout(1200);
  await p.evaluate((u)=>{document.getElementById('btn-start')?.click();document.getElementById('acct-tab-reg')?.click();const us=document.getElementById('acct-user');if(us){us.value=u;us.dispatchEvent(new Event('input',{bubbles:true}));}const ps=document.getElementById('acct-pass');if(ps){ps.value='test1234';ps.dispatchEvent(new Event('input',{bubbles:true}));}document.getElementById('acct-go')?.click();},'m'+Date.now());
  await p.waitForTimeout(900);
  let en=false;
  for(let i=0;i<16&&!en;i++){const a=await p.evaluate(()=>{const vis=e=>e&&e.offsetParent!==null;const e2=document.getElementById('cine-enter');if(vis(e2)){e2.click();return 'enter';}for(const id of['cc-classes','cc-diwa','cc-agimat']){const c=document.querySelector('#'+id+' button');if(vis(c))c.click();}const nm=document.getElementById('cc-name');if(vis(nm)&&nm.value.trim().length<2){nm.value='Bayani';nm.dispatchEvent(new Event('input',{bubbles:true}));}const cf=document.getElementById('cc-confirm');if(vis(cf)&&!cf.disabled){cf.click();return 'confirm';}const nx=document.getElementById('cc-next');if(vis(nx)&&!nx.disabled){nx.click();return 'next';}return 'idle';});if(a==='enter')en=true;await p.waitForTimeout(350);}
  await p.waitForTimeout(1400);
  const out=await p.evaluate(()=>{
    ['sarimanok','ekek','agta','sirena','pugot','bakunawa'].forEach(k=>window._spawnEnemy&&window._spawnEnemy(k));
    const names=[...document.querySelectorAll('.ename')].map(e=>e.textContent);
    const bars=document.querySelectorAll('.ebar').length;
    return { count:names.length, samples:[...new Set(names)], bars };
  });
  console.log('nameplates:', JSON.stringify(out));
  console.log('ERRORS:', errs.length?[...new Set(errs)].slice(0,4):'none');
  await b.close();
})();
