const { chromium } = require('playwright-core');
(async()=>{
  const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await browser.newContext({viewport:{width:412,height:915},hasTouch:true,isMobile:true,deviceScaleFactor:2,userAgent:'Mozilla/5.0 (Linux; Android 10; SM-A107F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36 UCBrowser/13 Quetta'});
  const page=await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(String(e.message||e).slice(0,200)));
  await page.goto('http://localhost:8000/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(500);
  await page.evaluate(()=>{ try{ localStorage.setItem('agimat_user',JSON.stringify({id:'mob'+Date.now(),pw:'x',char:{name:'MobTest',class:'bagani',lvl:20,exp:0,zone:'map_starting',pos:{x:0,y:0},hp:100,maxHp:100,mana:50,maxMana:50,stamina:100,statPoints:0,skillPoints:0,skillLevels:{},equip:[],inventory:[],gold:0,kills:0,deaths:0,playtime:0,quests:{},flags:{},created:Date.now(),seenIntro:true}})); }catch(e){} });
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  try{ await page.waitForFunction(()=>window.MAPS&&window.MAPS.length>0,{timeout:40000}); }catch(e){ console.log('NO MAPS (mobile)'); }
  await page.evaluate(()=>enterWorld&&enterWorld());
  await page.waitForTimeout(7000);
  const info=await page.evaluate(()=>({ mob: (typeof isMobileGPU!=='undefined')?isMobileGPU:'n/a', hud:!!document.getElementById('hud')&&getComputedStyle(document.getElementById('hud')).display!=='none' }));
  console.log('MOBILE: isMobileGPU='+info.mob+' HUD='+info.hud+' ERR='+(errs.length?errs.join('|').slice(0,150):'none'));
  await browser.close();
})();
