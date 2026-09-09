const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext({viewport:{width:1280,height:860}})).newPage();
  const errs=[];
  p.on('pageerror',e=>errs.push('PAGEERR: '+String(e.stack||e.message).replace(/\n/g,' | ').slice(0,160)));
  await p.goto('http://127.0.0.1:8000',{waitUntil:'networkidle'});
  await p.waitForTimeout(1200);
  await p.evaluate((u)=>{document.getElementById('btn-start')?.click();document.getElementById('acct-tab-reg')?.click();const us=document.getElementById('acct-user');if(us){us.value=u;us.dispatchEvent(new Event('input',{bubbles:true}));}const ps=document.getElementById('acct-pass');if(ps){ps.value='test1234';ps.dispatchEvent(new Event('input',{bubbles:true}));}document.getElementById('acct-go')?.click();},'p'+Date.now());
  await p.waitForTimeout(900);
  let en=false;
  for(let i=0;i<16&&!en;i++){const a=await p.evaluate(()=>{const vis=e=>e&&e.offsetParent!==null;const e2=document.getElementById('cine-enter');if(vis(e2)){e2.click();return 'enter';}for(const id of['cc-classes','cc-diwa','cc-agimat']){const c=document.querySelector('#'+id+' button');if(vis(c))c.click();}const nm=document.getElementById('cc-name');if(vis(nm)&&nm.value.trim().length<2){nm.value='Bayani';nm.dispatchEvent(new Event('input',{bubbles:true}));}const cf=document.getElementById('cc-confirm');if(vis(cf)&&!cf.disabled){cf.click();return 'confirm';}const nx=document.getElementById('cc-next');if(vis(nx)&&!nx.disabled){nx.click();return 'next';}return 'idle';});if(a==='enter')en=true;await p.waitForTimeout(350);}
  await p.waitForTimeout(1400);
  const waitMap=async(exp)=>{for(let i=0;i<25;i++){const m=await p.evaluate(()=>window._dbgMap());if(m.map===exp)return m;await p.waitForTimeout(400);}return p.evaluate(()=>window._dbgMap());};
  await p.evaluate(()=>window.changeMap('map_sagada'));
  const s1=await waitMap('map_sagada');
  console.log('sagada:', JSON.stringify(s1));
  // open map tab to show the Sagada art + header
  await p.evaluate(()=>{ window.openInventory2(); });
  await p.waitForTimeout(300);
  await p.evaluate(()=>{ [...document.querySelectorAll('#inv2 .i2-nav')].find(x=>x.dataset.nav==='map')?.click(); });
  await p.waitForTimeout(1800);
  const hdr=await p.evaluate(()=>({ b:document.querySelector('#i2-maphead b')?.textContent, s:document.querySelector('#i2-maphead span')?.textContent }));
  console.log('header:', JSON.stringify(hdr));
  await p.screenshot({ path:'docs/sagada-map.png' });
  await p.evaluate(()=>window.changeMap('map_starting'));
  const s2=await waitMap('map_starting');
  console.log('back:', JSON.stringify(s2));
  console.log('ERRORS:', errs.length?[...new Set(errs)].slice(0,4):'none');
  await b.close();
})();
