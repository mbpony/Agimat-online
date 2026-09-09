// Screenshot the new illustrated Map tab. Local only.
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8000';
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + String(e.stack||e.message).replace(/\n/g,' | ').slice(0,300)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.evaluate((u) => {
    document.getElementById('btn-start')?.click();
    document.getElementById('acct-tab-reg')?.click();
    const us=document.getElementById('acct-user'); if(us){us.value=u;us.dispatchEvent(new Event('input',{bubbles:true}));}
    const ps=document.getElementById('acct-pass'); if(ps){ps.value='test1234';ps.dispatchEvent(new Event('input',{bubbles:true}));}
    document.getElementById('acct-go')?.click();
  }, 'pw' + Date.now());
  await page.waitForTimeout(900);
  let entered=false;
  for (let i=0;i<16 && !entered;i++){
    const a=await page.evaluate(()=>{const vis=e=>e&&e.offsetParent!==null;
      const en=document.getElementById('cine-enter'); if(vis(en)){en.click();return 'enter';}
      for(const id of['cc-classes','cc-diwa','cc-agimat']){const c=document.querySelector('#'+id+' button');if(vis(c))c.click();}
      const nm=document.getElementById('cc-name'); if(vis(nm)&&nm.value.trim().length<2){nm.value='Bayani';nm.dispatchEvent(new Event('input',{bubbles:true}));}
      const cf=document.getElementById('cc-confirm'); if(vis(cf)&&!cf.disabled){cf.click();return 'confirm';}
      const nx=document.getElementById('cc-next'); if(vis(nx)&&!nx.disabled){nx.click();return 'next';}
      return 'idle';});
    if(a==='enter')entered=true; await page.waitForTimeout(400);
  }
  await page.waitForTimeout(1500);

  await page.evaluate(()=>{ window.openInventory2(); });
  await page.waitForTimeout(300);
  await page.evaluate(()=>{ [...document.querySelectorAll('#inv2 .i2-nav')].find(b=>b.dataset.nav==='map')?.click(); });
  // let the art image load + one redraw tick
  await page.waitForTimeout(2200);

  const info = await page.evaluate(()=>{
    const cv=document.getElementById('i2-map');
    const ctx=cv.getContext('2d');
    const d=ctx.getImageData(Math.floor(cv.width*0.4),Math.floor(cv.height*0.4),1,1).data;
    return {
      inv2Open: document.getElementById('inv2').classList.contains('open'),
      wrapOpen: document.getElementById('i2-mapwrap').classList.contains('open'),
      canvasW: cv.width, canvasH: cv.height,
      px:[d[0],d[1],d[2]], // non-black if art drawn
    };
  });
  console.log('info', JSON.stringify(info));
  await page.screenshot({ path: 'docs/map-preview.png' });
  console.log('ERRORS:', errs.length ? [...new Set(errs)].slice(0,5) : 'none');
  await browser.close();
})();
