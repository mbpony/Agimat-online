/* ================================================================
   AGIMAT ONLINE — co-op server (5-player prototype)
   Serves the game files + a WebSocket relay on ONE port so the
   browser can connect same-origin (works behind the preview proxy).
   ================================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

/* ---------------- ACCOUNTS: file-backed user store ---------------- */
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname,'data');   // Render: set DATA_DIR=/data (persistent disk)
const USERS_FILE = path.join(DATA_DIR,'users.json');
if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR,{recursive:true});
let USERS = {};
try{ USERS = JSON.parse(fs.readFileSync(USERS_FILE,'utf8')); }catch(e){ USERS = {}; }
/* Phase 3 stores: guilds (Tribu) + marketplace listings */
const GUILDS_FILE = path.join(DATA_DIR,'guilds.json');
const MARKET_FILE = path.join(DATA_DIR,'market.json');
let GUILDS = {};   // key -> {name, tag, owner, members:[acct], gold, created}
let MARKET = { nextId:1, listings:[] }; // listings: {id, seller, sellerName, item, price, ts}
try{ GUILDS = JSON.parse(fs.readFileSync(GUILDS_FILE,'utf8')); }catch(e){ GUILDS = {}; }
try{ MARKET = JSON.parse(fs.readFileSync(MARKET_FILE,'utf8')); }catch(e){ MARKET = { nextId:1, listings:[] }; }
let gTimer=null, mTimer=null;
function persistGuilds(){ clearTimeout(gTimer); gTimer=setTimeout(()=>{ try{ fs.writeFileSync(GUILDS_FILE, JSON.stringify(GUILDS)); }catch(e){} },250); }
function persistMarket(){ clearTimeout(mTimer); mTimer=setTimeout(()=>{ try{ fs.writeFileSync(MARKET_FILE, JSON.stringify(MARKET)); }catch(e){} },250); }
const GUILD_THRESH=[0,10000,50000,150000,400000];             // gold -> guild level 1..5
function guildLevel(g){ let l=1; for(let i=1;i<GUILD_THRESH.length;i++) if(g.gold>=GUILD_THRESH[i]) l=i+1; return l; }
function guildPerks(lvl){ return { xp:[0,3,5,8,12][lvl-1]||0, atk:[0,1,2,4,6][lvl-1]||0 }; }
function guildOf(acct){ const rec=USERS[acct]; if(!rec||!rec.guild||!GUILDS[rec.guild]) return null; return GUILDS[rec.guild]; }

/* ================================================================
   PHASE 7 — SERVER AUTHORITY (spec §25, incremental step 1: GOLD)
   The server keeps a per-account gold ledger and validates the gold
   in every save blob against plausible earnings + server-granted
   credits. Impossible jumps ("gold=999999999") are CLAMPED and
   flagged, never fatal — honest clients are unaffected.
   ================================================================ */
const GOLD_RULES={
  hourlyBase: 60000,   // generous PvE earn ceiling per hour...
  hourlyPerLevel: 12000,
  burstBase: 30000,    // ...plus a per-save burst (quest turn-ins, bag sell-offs)
  burstPerLevel: 6000,
  maxWindowH: 8,       // matches OFFLINE_CAP (pasalubong) — earnings cap at 8h
};
function parseSave(rec){ try{ return JSON.parse(rec.save||'{}'); }catch(e){ return {}; } }
function ledgerOf(rec){
  if(!rec.g){ const sv=parseSave(rec); rec.g={bal:Math.max(0,sv.gold|0), t:Date.now(), credits:0, flags:0}; }
  return rec.g;
}
function goldOf(rec){ const sv=parseSave(rec); return Math.max(0,sv.gold|0); }
/* server-granted gold (market sales, daily rewards) widens the allowance */
function creditGold(rec,amount){ const g=ledgerOf(rec); g.credits+=Math.max(0,amount|0); }
/* server-authorized spend (market buy, guild donate) lowers the baseline */
function debitGold(rec,amount){ const g=ledgerOf(rec); g.bal=Math.max(0,g.bal-Math.max(0,amount|0)); }
/* validate + possibly clamp the gold inside a save blob string.
   returns {save, clamped, gold} */
function validateSaveGold(rec, saveStr){
  let sv; try{ sv=JSON.parse(saveStr); }catch(e){ return {save:saveStr, clamped:false}; }
  let mutated=false;
  if(typeof sv.gold!=='number'||!isFinite(sv.gold)){ sv.gold=0; mutated=true; }
  const rounded=Math.max(0,Math.round(sv.gold));
  if(rounded!==sv.gold) mutated=true;
  sv.gold=rounded;
  const g=ledgerOf(rec);
  const hours=Math.min(GOLD_RULES.maxWindowH, Math.max(0,(Date.now()-g.t)/3600000));
  const lvl=Math.max(1,Math.min(70,sv.level|0||1));
  const allowed=Math.round(g.bal + g.credits
    + hours*(GOLD_RULES.hourlyBase+GOLD_RULES.hourlyPerLevel*lvl)
    + GOLD_RULES.burstBase+GOLD_RULES.burstPerLevel*lvl);
  let clamped=false;
  if(sv.gold>allowed){ sv.gold=allowed; clamped=true; g.flags=(g.flags||0)+1; }
  /* accept & roll the ledger forward */
  g.bal=sv.gold; g.credits=0; g.t=Date.now();
  return {save:(clamped||mutated)?JSON.stringify(sv):saveStr, clamped, gold:sv.gold};
}

let saveTimer = null;
function persistUsers(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(()=>{ try{ fs.writeFileSync(USERS_FILE, JSON.stringify(USERS)); }catch(e){} }, 250);
}
function hashPass(pass, salt){ return crypto.scryptSync(String(pass), salt, 32).toString('hex'); }
function newToken(){ return crypto.randomBytes(24).toString('hex'); }
function findByToken(tok){
  if(!tok) return null;
  for(const [u,rec] of Object.entries(USERS)) if(rec.token===tok) return {user:u, rec};
  return null;
}
function jsonBody(req, cb){
  let body=''; let over=false;
  req.on('data',c=>{ body+=c; if(body.length>1e6){ over=true; req.destroy(); } });
  req.on('end',()=>{ if(over) return cb(null); try{ cb(JSON.parse(body||'{}')); }catch(e){ cb(null); } });
}
function sendJSON(res, code, obj){
  res.writeHead(code, {'Content-Type':'application/json','Cache-Control':'no-store'});
  res.end(JSON.stringify(obj));
}
const NAME_COLORS=['#7df0ff','#ffd94a','#ff9a7e','#8aff9a','#d8a8ff','#ffb8d8','#a8c8ff','#ffe08a','#8affd8','#ff8a8a'];
function colorFor(user){
  let h=0; for(let i=0;i<user.length;i++) h=(h*31+user.charCodeAt(i))>>>0;
  return NAME_COLORS[h%NAME_COLORS.length];
}
/* daily rewards: escalating 7-day cycle */
const DAILY=[
  {gold:150,  desc:'150 Gold'},
  {gold:250,  desc:'250 Gold'},
  {gold:400,  desc:'400 Gold'},
  {gold:600,  desc:'600 Gold + Anito Dust ×2', mats:{anito_dust:2}},
  {gold:850,  desc:'850 Gold + Diwata Dew ×3', mats:{diwata_dew:3}},
  {gold:1200, desc:'1,200 Gold + Anito Dust ×4', mats:{anito_dust:4}},
  {gold:2000, desc:'2,000 Gold + MUTYA 💎', mats:{mutya:1}},
];
function dayKey(ts){ const d=new Date(ts); return d.getUTCFullYear()+'-'+(d.getUTCMonth()+1)+'-'+d.getUTCDate(); }
function handleAPI(req,res,p){
  if(req.method!=='POST') return sendJSON(res,405,{ok:false,err:'POST only'});
  jsonBody(req,(b)=>{
    if(!b) return sendJSON(res,400,{ok:false,err:'bad body'});
    if(p==='/api/daily'){
      const f=findByToken(b.token);
      if(!f) return sendJSON(res,401,{ok:false,err:'Expired session — mag-log in muli.'});
      const rec=f.rec, now=Date.now(), today=dayKey(now);
      if(rec.lastDaily===today) return sendJSON(res,200,{ok:true, claimed:false, streak:rec.streak||0, already:true});
      const yesterday=dayKey(now-86400000);
      rec.streak=(rec.lastDaily===yesterday)?((rec.streak||0)%7)+1:1;
      rec.lastDaily=today;
      const rw=DAILY[rec.streak-1];
      creditGold(rec,rw.gold||0);
      persistUsers();
      return sendJSON(res,200,{ok:true, claimed:true, streak:rec.streak, reward:rw});
    }
    if(p==='/api/friend'){
      const f=findByToken(b.token);
      if(!f) return sendJSON(res,401,{ok:false,err:'Expired session — mag-log in muli.'});
      const target=String(b.user||'').trim().toLowerCase();
      f.rec.friends=f.rec.friends||[];
      if(b.action==='add'){
        if(target===f.user) return sendJSON(res,400,{ok:false,err:'Hindi mo pwedeng i-add ang sarili mo!'});
        if(!USERS[target]) return sendJSON(res,404,{ok:false,err:'Walang ganyang user.'});
        if(f.rec.friends.includes(target)) return sendJSON(res,400,{ok:false,err:'Magkaibigan na kayo.'});
        f.rec.friends.push(target); persistUsers();
        return sendJSON(res,200,{ok:true});
      }
      if(b.action==='remove'){
        f.rec.friends=f.rec.friends.filter(x=>x!==target); persistUsers();
        return sendJSON(res,200,{ok:true});
      }
      return sendJSON(res,400,{ok:false,err:'bad action'});
    }
    if(p==='/api/friends'){
      const f=findByToken(b.token);
      if(!f) return sendJSON(res,401,{ok:false,err:'Expired session — mag-log in muli.'});
      const online={};
      for(const [pid,pl] of players) if(pl.acct) online[pl.acct]={id:pid, name:pl.name, level:pl.level};
      const list=(f.rec.friends||[]).map(u=>{
        const rec=USERS[u]; if(!rec) return null;
        let lvl=0; try{ lvl=(JSON.parse(rec.save||'{}').level)||0; }catch(e){}
        return {user:rec.display, key:u, color:colorFor(u), online:!!online[u],
          pid:online[u]?online[u].id:0, heroName:online[u]?online[u].name:'', level:online[u]?online[u].level:lvl};
      }).filter(Boolean);
      return sendJSON(res,200,{ok:true, list});
    }
    if(p==='/api/leaderboard'){
      const rows=[];
      for(const [k,rec] of Object.entries(USERS)){
        if(!rec.save) continue;
        try{
          const sv=JSON.parse(rec.save);
          rows.push({user:rec.display, color:colorFor(k), name:sv.name||rec.display, cls:sv.cls||'?',
            level:sv.level||1, gold:sv.gold||0, bossKills:(sv.bestiary&&sv.bestiary.manananggal&&sv.bestiary.manananggal.kills)||0});
        }catch(e){}
      }
      rows.sort((a,b)=> b.level-a.level || b.bossKills-a.bossKills || b.gold-a.gold);
      return sendJSON(res,200,{ok:true, rows:rows.slice(0,20)});
    }
    if(p==='/api/register'){
      const u=String(b.user||'').trim();
      if(!/^[a-zA-Z0-9_]{3,20}$/.test(u)) return sendJSON(res,400,{ok:false,err:'Username: 3-20 letters/numbers/_ lamang.'});
      if(String(b.pass||'').length<4) return sendJSON(res,400,{ok:false,err:'Password: hindi bababa sa 4 characters.'});
      const key=u.toLowerCase();
      if(USERS[key]) return sendJSON(res,409,{ok:false,err:'May gumagamit na ng pangalang iyan.'});
      const salt=crypto.randomBytes(12).toString('hex');
      USERS[key]={display:u, salt, hash:hashPass(b.pass,salt), token:newToken(), save:null, created:Date.now()};
      persistUsers();
      return sendJSON(res,200,{ok:true, token:USERS[key].token, user:u, save:null, color:colorFor(key)});
    }
    if(p==='/api/login'){
      const key=String(b.user||'').trim().toLowerCase();
      const rec=USERS[key];
      if(!rec || rec.hash!==hashPass(b.pass, rec.salt)) return sendJSON(res,401,{ok:false,err:'Maling username o password.'});
      rec.token=newToken(); persistUsers();
      return sendJSON(res,200,{ok:true, token:rec.token, user:rec.display, save:rec.save, color:colorFor(key)});
    }
    if(p==='/api/save'){
      const f=findByToken(b.token);
      if(!f) return sendJSON(res,401,{ok:false,err:'Expired session — mag-log in muli.'});
      if(typeof b.save==='string' && b.save.length<400000){
        const v=validateSaveGold(f.rec, b.save);
        f.rec.save=v.save; persistUsers();
        if(v.clamped) return sendJSON(res,200,{ok:true, clamped:true, gold:v.gold});
      }
      return sendJSON(res,200,{ok:true});
    }
    if(p==='/api/load'){
      const f=findByToken(b.token);
      if(!f) return sendJSON(res,401,{ok:false,err:'Expired session — mag-log in muli.'});
      return sendJSON(res,200,{ok:true, user:f.rec.display, save:f.rec.save});
    }
    /* ---------- [9] TRIBU (guilds) ---------- */
    if(p==='/api/guild'){
      const f=findByToken(b.token);
      if(!f) return sendJSON(res,401,{ok:false,err:'Expired session — mag-log in muli.'});
      const rec=f.rec, me=f.user, act=b.action;
      const myG=guildOf(me);
      if(act==='create'){
        if(myG) return sendJSON(res,400,{ok:false,err:'May Tribu ka na.'});
        const name=String(b.name||'').trim(), tag=String(b.tag||'').trim().toUpperCase();
        if(!/^[a-zA-Z0-9 _]{3,20}$/.test(name)) return sendJSON(res,400,{ok:false,err:'Pangalan ng Tribu: 3-20 letra/numero.'});
        if(!/^[A-Z0-9]{2,4}$/.test(tag)) return sendJSON(res,400,{ok:false,err:'Tag: 2-4 malalaking letra/numero.'});
        const key=name.toLowerCase().replace(/\s+/g,'_');
        if(GUILDS[key]) return sendJSON(res,409,{ok:false,err:'May Tribu nang ganyan ang pangalan.'});
        if(Object.values(GUILDS).some(g=>g.tag===tag)) return sendJSON(res,409,{ok:false,err:'Gamit na ang tag na iyan.'});
        GUILDS[key]={name, tag, owner:me, members:[me], gold:0, created:Date.now()};
        rec.guild=key; persistGuilds(); persistUsers();
        return sendJSON(res,200,{ok:true, guild:{name,tag,level:1}});
      }
      if(act==='list'){
        const list=Object.entries(GUILDS).map(([k,g])=>({key:k,name:g.name,tag:g.tag,members:g.members.length,level:guildLevel(g)}));
        list.sort((a,b2)=>b2.level-a.level||b2.members-a.members);
        return sendJSON(res,200,{ok:true, list:list.slice(0,30), mine:rec.guild||''});
      }
      if(act==='join'){
        if(myG) return sendJSON(res,400,{ok:false,err:'May Tribu ka na.'});
        const g=GUILDS[String(b.key||'')];
        if(!g) return sendJSON(res,404,{ok:false,err:'Walang ganyang Tribu.'});
        if(g.members.length>=30) return sendJSON(res,400,{ok:false,err:'Puno na ang Tribu (30).'});
        g.members.push(me); rec.guild=String(b.key); persistGuilds(); persistUsers();
        return sendJSON(res,200,{ok:true, guild:{name:g.name,tag:g.tag,level:guildLevel(g)}});
      }
      if(!myG) return sendJSON(res,400,{ok:false,err:'Wala kang Tribu.'});
      if(act==='info'){
        const lvl=guildLevel(myG);
        const online={}; for(const pl of players.values()) if(pl.acct) online[pl.acct]=true;
        const members=myG.members.map(u=>{
          const r2=USERS[u]; let l2=0; try{ l2=(JSON.parse((r2&&r2.save)||'{}').level)||0; }catch(e){}
          return {user:(r2&&r2.display)||u, key:u, level:l2, online:!!online[u], owner:myG.owner===u};
        });
        return sendJSON(res,200,{ok:true, name:myG.name, tag:myG.tag, gold:myG.gold, level:lvl,
          next:GUILD_THRESH[lvl]||null, perks:guildPerks(lvl), owner:myG.owner, you:me, members});
      }
      if(act==='donate'){
        const amt=Math.max(0,b.amount|0);
        if(!amt) return sendJSON(res,400,{ok:false,err:'bad amount'});
        if(goldOf(rec)<amt) return sendJSON(res,400,{ok:false,err:'Kulang ang ginto mo.'});   // §25: verify funds
        debitGold(rec,amt);
        myG.gold+=amt; persistGuilds(); persistUsers();
        return sendJSON(res,200,{ok:true, gold:myG.gold, level:guildLevel(myG)});
      }
      if(act==='leave'){
        myG.members=myG.members.filter(u=>u!==me); delete rec.guild;
        if(myG.owner===me) myG.owner=myG.members[0]||'';
        if(!myG.members.length){ for(const [k,g] of Object.entries(GUILDS)) if(g===myG) delete GUILDS[k]; }
        persistGuilds(); persistUsers();
        return sendJSON(res,200,{ok:true});
      }
      if(act==='kick'){
        if(myG.owner!==me) return sendJSON(res,403,{ok:false,err:'Pinuno lamang ang maaaring magtanggal.'});
        const t=String(b.user||'').toLowerCase();
        if(t===me) return sendJSON(res,400,{ok:false,err:'Gamitin ang \'leave\'.'});
        myG.members=myG.members.filter(u=>u!==t);
        if(USERS[t]) delete USERS[t].guild;
        persistGuilds(); persistUsers();
        return sendJSON(res,200,{ok:true});
      }
      return sendJSON(res,400,{ok:false,err:'bad action'});
    }
    /* ---------- [10] PALENGKE (marketplace, escrow + 5% tax) ---------- */
    if(p==='/api/market'){
      const f=findByToken(b.token);
      if(!f) return sendJSON(res,401,{ok:false,err:'Expired session — mag-log in muli.'});
      const rec=f.rec, me=f.user, act=b.action;
      if(act==='browse'){
        return sendJSON(res,200,{ok:true, listings:MARKET.listings.slice(-60).reverse(), you:me});
      }
      if(act==='post'){
        const price=b.price|0;
        if(price<1||price>5000000) return sendJSON(res,400,{ok:false,err:'Presyo: 1 hanggang 5,000,000.'});
        if(typeof b.item!=='object'||!b.item||JSON.stringify(b.item).length>8000) return sendJSON(res,400,{ok:false,err:'bad item'});
        if(MARKET.listings.filter(l=>l.seller===me).length>=8) return sendJSON(res,400,{ok:false,err:'Max 8 paninda — kanselahin muna ang iba.'});
        const id=MARKET.nextId++;
        MARKET.listings.push({id, seller:me, sellerName:rec.display, item:b.item, price, ts:Date.now()});
        persistMarket();
        return sendJSON(res,200,{ok:true, id});
      }
      if(act==='buy'){
        const i=MARKET.listings.findIndex(l=>l.id===(b.id|0));
        if(i<0) return sendJSON(res,404,{ok:false,err:'Nabili na o tinanggal ang paninda.'});
        const L=MARKET.listings[i];
        if(L.seller===me) return sendJSON(res,400,{ok:false,err:'Sarili mong paninda iyan — kanselahin na lang.'});
        if(goldOf(rec)<L.price) return sendJSON(res,400,{ok:false,err:'Kulang ang ginto mo para dito.'});   // §25: server verifies funds
        debitGold(rec,L.price);
        MARKET.listings.splice(i,1);
        const cut=Math.ceil(L.price*0.05), net=L.price-cut;   // 5% Tiangge tax
        const srec=USERS[L.seller];
        if(srec){ srec.mail=srec.mail||[]; srec.mail.push({gold:net, note:`Nabenta: ${L.item.name||'gamit'} (−5% buwis)`, ts:Date.now()}); persistUsers(); }
        persistMarket();
        return sendJSON(res,200,{ok:true, item:L.item, price:L.price});
      }
      if(act==='cancel'){
        const i=MARKET.listings.findIndex(l=>l.id===(b.id|0)&&l.seller===me);
        if(i<0) return sendJSON(res,404,{ok:false,err:'Wala nang ganyang paninda.'});
        const L=MARKET.listings.splice(i,1)[0]; persistMarket();
        return sendJSON(res,200,{ok:true, item:L.item});
      }
      if(act==='mine'){
        return sendJSON(res,200,{ok:true, listings:MARKET.listings.filter(l=>l.seller===me), mail:rec.mail||[]});
      }
      if(act==='mail_claim'){
        const sum=(rec.mail||[]).reduce((a,m2)=>a+(m2.gold||0),0);
        rec.mail=[]; creditGold(rec,sum); persistUsers();
        return sendJSON(res,200,{ok:true, gold:sum});
      }
      return sendJSON(res,400,{ok:false,err:'bad action'});
    }
    /* ---------- [11] ARENA ladder ---------- */
    if(p==='/api/arena'){
      const f=findByToken(b.token);
      if(!f) return sendJSON(res,401,{ok:false,err:'Expired session — mag-log in muli.'});
      const rec=f.rec;
      rec.arena=rec.arena||{r:1000,w:0,l:0};
      if(b.action==='report'){
        const now=Date.now();
        if(rec.arena.lastReport && now-rec.arena.lastReport<45000)
          return sendJSON(res,429,{ok:false,err:'Masyadong mabilis — maghintay bago mag-ulat muli.'});
        rec.arena.lastReport=now;
        if(b.win){ rec.arena.r+=25; rec.arena.w++; } else { rec.arena.r=Math.max(0,rec.arena.r-20); rec.arena.l++; }
        persistUsers();
        return sendJSON(res,200,{ok:true, arena:rec.arena});
      }
      if(b.action==='top'){
        const rows=[];
        for(const [k,r2] of Object.entries(USERS)){
          if(!r2.arena||(r2.arena.w+r2.arena.l)===0) continue;
          let nm=r2.display, lvl=0, cls='?';
          try{ const sv=JSON.parse(r2.save||'{}'); nm=sv.name||nm; lvl=sv.level||0; cls=sv.cls||'?'; }catch(e){}
          rows.push({user:r2.display, color:colorFor(k), name:nm, level:lvl, cls, r:r2.arena.r, w:r2.arena.w, l:r2.arena.l,
            tag:(guildOf(k)||{}).tag||''});
        }
        rows.sort((a,b2)=>b2.r-a.r);
        return sendJSON(res,200,{ok:true, rows:rows.slice(0,20), me:rec.arena});
      }
      return sendJSON(res,400,{ok:false,err:'bad action'});
    }
    sendJSON(res,404,{ok:false,err:'unknown endpoint'});
  });
}

const PORT = process.env.PORT || 8000;                                  // Render/Railway/Fly inject PORT
const ROOT = __dirname;

const MIME = {
  '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml',
  '.json':'application/json', '.ico':'image/x-icon', '.pdf':'application/pdf',
  '.glb':'model/gltf-binary', '.gltf':'model/gltf+json',
  '.mp3':'audio/mpeg', '.ogg':'audio/ogg', '.wav':'audio/wav',
};

const server = http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]);
  if(p.startsWith('/api/')) return handleAPI(req,res,p);
  if(p==='/') p='/index.html';
  const file = path.join(ROOT, path.normalize(p).replace(/^(\.\.[/\\])+/,''));
  if(!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  /* block private server-state files — game data JSON stays public */
  const PRIVATE = [/[/\\]data[/\\]users\.json$/i, /[/\\]data[/\\]guilds\.json$/i, /[/\\]data[/\\]market\.json$/i, /[/\\]legacy[/\\]/i, /[/\\]\.git[/\\]/];
  if(PRIVATE.some(rx=>rx.test(file))) { res.writeHead(403); return res.end(); }
  fs.readFile(file,(err,data)=>{
    if(err){ res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, {'Content-Type': MIME[path.extname(file)]||'application/octet-stream', 'Cache-Control':'no-cache'});
    res.end(data);
  });
});

/* ---------------- WebSocket relay: CHANNEL SYSTEM ---------------- */
/* Phase 2: the world is split into channels (parallel copies of the map).
   Each channel holds up to PER_CHANNEL players and has its own host
   (authoritative enemy simulation). 10 channels x 5 = 50 concurrent. */
const wss = new WebSocketServer({ server, path:'/ws' });
let nextId = 1;
const PER_CHANNEL = 5;
const MAX_CHANNELS = 10;
const players = new Map(); // id -> {ws, ch, name, color, acct, title, cls, app, x, z, yaw, moving, hpPct, level}
const hosts = new Map();   // ch -> authoritative host id

function chCount(ch){ let n=0; for(const p of players.values()) if(p.ch===ch && p.name) n++; return n; }
function chanList(){ const l=[]; for(let c=1;c<=MAX_CHANNELS;c++) l.push({ch:c, n:chCount(c)}); return l; }
function autoChannel(pref){
  if(pref>=1 && pref<=MAX_CHANNELS && chCount(pref)<PER_CHANNEL) return pref;
  for(let c=1;c<=MAX_CHANNELS;c++) if(chCount(c)<PER_CHANNEL) return c;   // overflow to the next open channel
  return 0;
}
function pickHost(ch){
  if(!ch) return;
  const ids=[...players.keys()].filter(id=>{ const p=players.get(id); return p.name && p.ch===ch; });
  const newHost=ids.length?Math.min(...ids):0;
  if(newHost!==(hosts.get(ch)||0)){
    hosts.set(ch,newHost);
    if(newHost && players.has(newHost)) send(players.get(newHost).ws,{t:'host'});
  }
}
function send(ws,obj){ if(ws.readyState===1) ws.send(JSON.stringify(obj)); }
function chBroadcast(ch,obj,exceptId){
  const s = JSON.stringify(obj);
  for(const [id,p] of players){ if(p.ch===ch && p.name && id!==exceptId && p.ws.readyState===1) p.ws.send(s); }
}
function broadcastAll(obj,exceptId){
  const s = JSON.stringify(obj);
  for(const [id,p] of players){ if(p.name && id!==exceptId && p.ws.readyState===1) p.ws.send(s); }
}
function roster(ch){
  const list = [];
  for(const [id,p] of players){
    if(!p.name || p.ch!==ch) continue;
    list.push({id, name:p.name, color:p.color||'', title:p.title||'', gtag:p.gtag||'', cls:p.cls, app:p.app, x:p.x, z:p.z, yaw:p.yaw, level:p.level, hp:p.hpPct==null?100:p.hpPct});
  }
  return list;
}
function spawnMsg(id,p){
  return {t:'spawn', p:{id, name:p.name, color:p.color||'', title:p.title||'', gtag:p.gtag||'', cls:p.cls, app:p.app, x:p.x, z:p.z, yaw:p.yaw, level:p.level}};
}

wss.on('connection',(ws)=>{
  if(players.size >= PER_CHANNEL*MAX_CHANNELS){
    send(ws,{t:'full'}); ws.close(); return;
  }
  const id = nextId++;
  players.set(id, {ws, ch:0, name:null, cls:null, app:null, x:102, z:110, yaw:0, moving:false, level:1, title:''});
  send(ws,{t:'hello', id, max:PER_CHANNEL});

  ws.on('message',(raw)=>{
    let m; try{ m=JSON.parse(raw); }catch(e){ return; }
    const p = players.get(id); if(!p) return;
    switch(m.t){
      case 'join': {                                 // {name, cls, app, x, z, level, color, acct, title, ch?}
        const ch = autoChannel(m.ch|0);
        if(!ch){ send(ws,{t:'full'}); ws.close(); return; }
        p.ch=ch;
        p.name=String(m.name||'Bayani').slice(0,16);
        p.color=(typeof m.color==='string'&&/^#[0-9a-fA-F]{6}$/.test(m.color))?m.color:'';
        p.acct=String(m.acct||'').trim().toLowerCase()||null;
        p.title=String(m.title||'').slice(0,30);
        p.gtag=String(m.gtag||'').slice(0,4);
        p.cls=m.cls; p.app=m.app; p.level=m.level|0;
        if(typeof m.x==='number'){p.x=m.x; p.z=m.z;}
        send(ws,{t:'chan', ch, max:PER_CHANNEL});
        send(ws,{t:'roster', players:roster(ch).filter(q=>q.id!==id)});
        chBroadcast(ch, spawnMsg(id,p), id);
        pickHost(ch);
        break; }
      case 'chan': {                                 // {ch} switch channel
        const to=m.ch|0;
        if(!p.name || to<1 || to>MAX_CHANNELS || to===p.ch) break;
        if(chCount(to)>=PER_CHANNEL){ send(ws,{t:'chanfull', ch:to}); break; }
        const old=p.ch; p.ch=to;
        chBroadcast(old,{t:'leave', id});
        if(hosts.get(old)===id){ hosts.set(old,0); }
        pickHost(old);
        send(ws,{t:'chan', ch:to, max:PER_CHANNEL});
        send(ws,{t:'roster', players:roster(to).filter(q=>q.id!==id)});
        chBroadcast(to, spawnMsg(id,p), id);
        pickHost(to);
        break; }
      case 'chanlist':
        send(ws,{t:'chanlist', list:chanList(), you:p.ch||0, per:PER_CHANNEL});
        break;
      case 'title':                                  // equip a title -> update nametags
        p.title=String(m.title||'').slice(0,30);
        chBroadcast(p.ch,{t:'title', id, title:p.title}, id);
        break;
      case 'gtag':                                   // guild tag changed -> update nametags
        p.gtag=String(m.tag||'').slice(0,4);
        chBroadcast(p.ch,{t:'gtag', id, tag:p.gtag}, id);
        break;
      case 'es':                                     // host -> channel: enemy world state
        if(id===hosts.get(p.ch)) chBroadcast(p.ch,{t:'es', list:m.list}, id);
        break;
      case 'ehit': {                                 // guest damage -> channel host only
        const h=hosts.get(p.ch);
        if(h && players.has(h)) send(players.get(h).ws, {t:'ehit', nid:m.nid, dmg:m.dmg, from:id});
        break; }
      case 'ekill':                                  // host -> channel: enemy died
        if(id===hosts.get(p.ch)) chBroadcast(p.ch,{t:'ekill', nid:m.nid, x:m.x, z:m.z, contribs:m.contribs}, id);
        break;
      case 'pdmg':                                   // host -> a specific same-channel player takes damage
        if(id===hosts.get(p.ch) && players.has(m.to) && players.get(m.to).ch===p.ch)
          send(players.get(m.to).ws, {t:'pdmg', dmg:m.dmg, opts:m.opts||{}});
        break;
      case 'boss':                                   // host announces the Manananggal (channel-local)
        if(id===hosts.get(p.ch)) chBroadcast(p.ch,{t:'boss'}, id);
        break;
      case 'finv': {                                 // party invite: route to a friend anywhere + tell them our channel
        const target=String(m.toUser||'').toLowerCase();
        for(const [pid,pl] of players){
          if(pl.acct===target && pl.ws.readyState===1){
            send(pl.ws,{t:'finv', fromId:id, fromName:p.name||'Kaibigan', ch:p.ch});
            break;
          }
        }
        break;
      }
      case 'facc':                                   // invite accepted -> tell the inviter (cross-channel ok)
        if(players.has(m.to)) send(players.get(m.to).ws,{t:'facc', fromId:id, fromName:p.name});
        break;
      case 'duel': {                                 // duels only within the same channel
        const q=players.get(m.to);
        if(q && q.ch===p.ch) send(q.ws,
          {t:'duel', act:m.act, from:id, fromName:p.name, dmg:m.dmg|0, crit:!!m.crit, result:m.result||''});
        break; }
      case 's':                                      // state tick {x,z,yaw,mv,hp(0-100)}
        p.x=m.x; p.z=m.z; p.yaw=m.yaw; p.moving=!!m.mv; p.hpPct=(m.hp==null?100:m.hp|0);
        chBroadcast(p.ch,{t:'s', id, x:m.x, z:m.z, yaw:m.yaw, mv:m.mv?1:0, hp:p.hpPct}, id);
        break;
      case 'atk':                                    // attack swing (visual)
        chBroadcast(p.ch,{t:'atk', id}, id);
        break;
      case 'skill':                                  // {i} skill index (visual)
        chBroadcast(p.ch,{t:'skill', id, i:m.i}, id);
        break;
      case 'chat':                                   // {msg, ch} -- world & friends chat cross ALL channels; 'near' is channel-local
        { const disp=(p.gtag?'⛨'+p.gtag+' ':'')+p.name;
        if(m.ch==='near') chBroadcast(p.ch,{t:'chat', id, name:disp, color:p.color||'', acct:p.acct||'', ch:'near', msg:String(m.msg||'').slice(0,120)}, undefined);
        else broadcastAll({t:'chat', id, name:disp, color:p.color||'', acct:p.acct||'', ch:(m.ch==='f')?'f':'all', msg:String(m.msg||'').slice(0,120)}); }
        break;
      case 'voice':                                  // {data} short voice message (channel-local)
        if(typeof m.data==='string' && m.data.length<400000 && m.data.startsWith('data:audio'))
          chBroadcast(p.ch,{t:'voice', id, name:p.name, color:p.color||'', data:m.data}, id);
        break;
      case 'lvl':
        p.level=m.level|0;
        chBroadcast(p.ch,{t:'lvl', id, level:p.level}, id);
        break;
    }
  });
  ws.on('close',()=>{
    const p=players.get(id);
    players.delete(id);
    if(p && p.name){
      chBroadcast(p.ch,{t:'leave', id});
      if(hosts.get(p.ch)===id){ hosts.set(p.ch,0); pickHost(p.ch); }
    }
  });
  ws.on('error',()=>{});
});

server.listen(PORT, '0.0.0.0', ()=>{
  console.log('AGIMAT ONLINE server on http://0.0.0.0:'+PORT+'  (ws: /ws, '+MAX_CHANNELS+' channels x '+PER_CHANNEL+')');
});
