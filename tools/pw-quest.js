const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext({viewport:{width:1280,height:860}})).newPage();
  const errs=[];
  p.on('pageerror',e=>errs.push('PAGEERR: '+String(e.stack||e.message).replace(/\n/g,' | ').slice(0,200)));
  await p.goto('http://127.0.0.1:8000',{waitUntil:'networkidle'});
  await p.waitForTimeout(1200);
  await p.evaluate((u)=>{document.getElementById('btn-start')?.click();document.getElementById('acct-tab-reg')?.click();const us=document.getElementById('acct-user');if(us){us.value=u;us.dispatchEvent(new Event('input',{bubbles:true}));}const ps=document.getElementById('acct-pass');if(ps){ps.value='test1234';ps.dispatchEvent(new Event('input',{bubbles:true}));}document.getElementById('acct-go')?.click();},'p'+Date.now());
  await p.waitForTimeout(900);
  let en=false;
  for(let i=0;i<16&&!en;i++){const a=await p.evaluate(()=>{const vis=e=>e&&e.offsetParent!==null;const e2=document.getElementById('cine-enter');if(vis(e2)){e2.click();return 'enter';}for(const id of['cc-classes','cc-diwa','cc-agimat']){const c=document.querySelector('#'+id+' button');if(vis(c))c.click();}const nm=document.getElementById('cc-name');if(vis(nm)&&nm.value.trim().length<2){nm.value='Bayani';nm.dispatchEvent(new Event('input',{bubbles:true}));}const cf=document.getElementById('cc-confirm');if(vis(cf)&&!cf.disabled){cf.click();return 'confirm';}const nx=document.getElementById('cc-next');if(vis(nx)&&!nx.disabled){nx.click();return 'next';}return 'idle';});if(a==='enter')en=true;await p.waitForTimeout(350);}
  await p.waitForTimeout(1200);
  const out=await p.evaluate(()=>{
    // exercise the changed quest paths directly
    window._questProg('gold',50); window._questProg('kill',1,'tiyanak'); window._questProg('forage',1);
    window.openPeriodQuests();
    const modal=document.querySelector('#modal-box');
    return { modalShown: !!modal, rows: modal?modal.querySelectorAll('.fr-row').length:0, text:(document.querySelector('#modal-box')?.textContent||'').slice(0,40) };
  });
  console.log('RESULT', JSON.stringify(out));
  console.log('ERRORS:', errs.length?errs.slice(0,4):'none');
  await b.close();
})();
