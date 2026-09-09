// Drive the 4 UI fixes through the REAL buttons in a fully started game. Local only.
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8000';

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  // register
  await page.evaluate((u) => {
    document.getElementById('btn-start')?.click();
    document.getElementById('acct-tab-reg')?.click();
    const us=document.getElementById('acct-user'); if(us){us.value=u;us.dispatchEvent(new Event('input',{bubbles:true}));}
    const ps=document.getElementById('acct-pass'); if(ps){ps.value='test1234';ps.dispatchEvent(new Event('input',{bubbles:true}));}
    document.getElementById('acct-go')?.click();
  }, 'pw' + Date.now());
  await page.waitForTimeout(900);
  // walk the 6-step character wizard, then the birth cinematic (#cine-enter -> chooseClass)
  let entered = false;
  for (let i = 0; i < 16 && !entered; i++) {
    const act = await page.evaluate(() => {
      const vis = e => e && e.offsetParent !== null;
      const enter = document.getElementById('cine-enter');
      if (vis(enter)) { enter.click(); return 'enter'; }
      for (const id of ['cc-classes','cc-diwa','cc-agimat']) {
        const c = document.querySelector('#'+id+' button'); if (vis(c)) { c.click(); }
      }
      const nm = document.getElementById('cc-name');
      if (vis(nm) && nm.value.trim().length < 2) { nm.value='Bayani'; nm.dispatchEvent(new Event('input',{bubbles:true})); }
      const conf = document.getElementById('cc-confirm');
      if (vis(conf) && !conf.disabled) { conf.click(); return 'confirm'; }
      const nx = document.getElementById('cc-next');
      if (vis(nx) && !nx.disabled) { nx.click(); return 'next'; }
      return 'idle';
    });
    if (act === 'enter') entered = true;
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(1500);

  const out = await page.evaluate(() => {
    const r = {};
    r.started = !document.getElementById('welcome-screen') || document.getElementById('welcome-screen').classList.contains('hidden');
    window.openInventory2();
    const inv2 = document.getElementById('inv2');
    r.inv2Open = inv2.classList.contains('open');

    // (1) duplicate Alaga
    const navs = [...document.querySelectorAll('#inv2 .i2-nav')];
    r.navLabels = navs.map(b => b.dataset.nav);
    r.alagaCount = navs.filter(b => b.dataset.nav === 'pets').length;

    // (4) doll size (now laid out)
    const doll = document.querySelector('.i2-doll');
    r.dollFlex = doll ? getComputedStyle(doll).flex : null;
    r.dollW = doll ? Math.round(doll.getBoundingClientRect().width) : null;
    r.dollH = doll ? Math.round(doll.getBoundingClientRect().height) : null;

    // (3) skills tab + open the FULL tree, count nodes
    navs.find(b => b.dataset.nav === 'skills')?.click();
    const pw = document.getElementById('i2-profwrap');
    r.skillsFreeShown = pw ? /skill point/i.test(pw.textContent) : null;
    r.skillsHasTreeBtn = !!document.getElementById('i2-opentree');
    document.getElementById('i2-opentree')?.click();
    const st = document.getElementById('sktree');
    r.sktreeShown = st ? getComputedStyle(st).display : null;
    r.sktreeNodeCount = st ? st.querySelectorAll('.skt-node').length : null;
    r.sktreeText = st ? st.textContent.replace(/\s+/g,' ').trim().length : null;

    // close tree, then (2) Bag Settings stacking
    document.querySelector('#skt-close')?.click();
    st?.classList.remove('open');
    document.getElementById('i2-bagset')?.click();
    const bd = document.getElementById('modal-backdrop');
    r.bdShown = bd ? getComputedStyle(bd).display : null;
    r.bdZ = bd ? getComputedStyle(bd).zIndex : null;
    r.inv2Z = getComputedStyle(inv2).zIndex;
    r.bdAboveInv2 = bd ? (+getComputedStyle(bd).zIndex > +r.inv2Z) : null;
    return r;
  });

  console.log(JSON.stringify(out, null, 2));
  console.log('ERRORS:', errs.length ? [...new Set(errs)].slice(0,6) : 'none');
  await browser.close();
})();
