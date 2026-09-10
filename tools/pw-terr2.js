const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();
  const read=async(url,path)=>{
    const p=await (await b.newContext({viewport:{width:1100,height:700}})).newPage();
    await p.goto(url,{waitUntil:'networkidle'});
    await p.waitForTimeout(2500);
    const m=await p.evaluate(()=>window._dbgMap&&window._dbgMap());
    await p.screenshot({path});
    await p.context().close();
    return m;
  };
  const base=await read('http://127.0.0.1:8000/','docs/terrain-banaue.png');
  const sag=await read('http://127.0.0.1:8000/?map=map_sagada','docs/terrain-sagada.png');
  console.log('banaue maxH:',base&&base.maxH,'fog',base&&base.fog);
  console.log('sagada maxH:',sag&&sag.maxH,'fog',sag&&sag.fog);
  await b.close();
})();
