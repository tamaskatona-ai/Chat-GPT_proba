'use strict';
const E=require('./engine');
const {randomBytes,randomUUID,createHash}=require('node:crypto');
const RULES={duration:15000,cooldown:60000,shield:120000,minSoldiers:5,maxPlayers:8,maxWorldPlayers:256};
class GameError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const fail=(message,status)=>{throw new GameError(message,status);};
const hash=token=>createHash('sha256').update(token).digest('hex');
function createWorld(saved){
 const data=saved||{version:1,revision:0,players:[]};if(data.version!==1||!Array.isArray(data.players))throw Error('Érvénytelen online mentés.');
 if(data.revision===undefined)data.revision=0;
 for(const p of data.players)E.migrate(p.state);
 const players=()=>data.players;
 const byId=id=>players().find(p=>p.id===id);
 function log(p,text){p.state.log.unshift(text);p.state.log=p.state.log.slice(0,5);}
 function tick(now){
  data.revision++;
  for(const p of players()){
   E.advance(p.state,now);
   if(p.state.mission?.kind!=='pvp'){const result=E.resolve(p.state,now);if(result)log(p,result);}
   const scout=E.resolveScout(p.state,now);if(scout)log(p,scout);
  }
  for(const p of players()){
   const m=p.state.mission;if(m?.kind!=='pvp'||m.ends>now)continue;
   const defender=byId(m.defenderId);if(!defender)throw Error('Hiányzó védő a mentésben.');
   const win=m.power>=m.enemy;
   const attackLoss=Math.min(m.soldiers,Math.max(1,Math.ceil(m.soldiers*(win?.15:.35))));
   const defenseLoss=Math.min(m.defenderSoldiers,Math.max(1,Math.ceil(m.defenderSoldiers*(win?.25:.10))));
   p.state.soldiers-=attackLoss;defender.state.soldiers-=defenseLoss;
   const loot={wood:0,metal:0,food:0,gold:0};
   if(win)for(const type of Object.keys(loot)){loot[type]=Math.min(type==='gold'?150:400,Math.floor(defender.state[type]*.1));defender.state[type]-=loot[type];p.state[type]+=loot[type];}
   const result={id:m.id,at:m.ends,attackerId:p.id,attackerName:p.name,defenderId:defender.id,defenderName:defender.name,win,attackLoss,defenseLoss,loot};
   p.reports.unshift(result);defender.reports.unshift(result);p.reports=p.reports.slice(0,10);defender.reports=defender.reports.slice(0,10);
   defender.incoming=null;defender.shieldUntil=m.ends+RULES.shield;p.state.mission=null;
   log(p,`${win?'Győzelem':'Vereség'} ${defender.name} ellen. Veszteség: ${attackLoss} katona. Zsákmány: ${loot.gold} arany, ${loot.wood} fa, ${loot.metal} vas, ${loot.food} élelem.`);
   log(defender,`${p.name} megtámadta a bázisodat. ${win?'A támadó győzött.':'A védők győztek!'} Veszteség: ${defenseLoss} katona. Elveszett arany: ${loot.gold}.`);
  }
 }
 function authenticate(token){if(typeof token!=='string'||! /^[a-f0-9]{48}$/.test(token))fail('Hiányzó vagy érvénytelen visszatérési kód.',401);const p=players().find(p=>p.tokenHash===hash(token));if(!p)fail('A visszatérési kód nem található.',401);return p;}
 function join(name,room,now){
  if(typeof name!=='string'||name.trim().length<2||name.trim().length>24||/[\u0000-\u001f<>]/.test(name))fail('A parancsnok neve 2–24 karakter legyen, HTML-jelek nélkül.');
  name=name.trim();
  if(players().length>=RULES.maxWorldPlayers)fail('A szerver megtelt.',503);
  if(room){room=String(room).trim().toUpperCase();if(!/^[A-F0-9]{6}$/.test(room)||!players().some(p=>p.room===room))fail('Nincs ilyen szoba. Kérj meghívólinket a barátodtól.',404);}
  else do{room=randomBytes(3).toString('hex').toUpperCase();}while(players().some(p=>p.room===room));
  const members=players().filter(p=>p.room===room);
  if(members.length>=RULES.maxPlayers)fail('Ez a szoba megtelt (8 játékos).',409);
  if(members.some(p=>p.name.toLocaleLowerCase('hu')===name.toLocaleLowerCase('hu')))fail('Ez a név már foglalt a szobában.',409);
  const token=randomBytes(24).toString('hex'),state=E.initial();state.last=now;state.moraleUpdatedAt=now;
  const p={id:randomUUID(),tokenHash:hash(token),name,room,state,incoming:null,cooldownUntil:0,shieldUntil:0,reports:[],lastSeen:now};players().push(p);return {player:p,token};
 }
 function action(p,command,now){
  if(!command||typeof command!=='object')fail('Hiányzó parancs.');
  if(p.incoming)fail('A bázisod éppen védekezik. Várd meg a csata végét.',409);
  let error;
  switch(command.type){
   case 'train':if(command.useGold===true&&(!Number.isInteger(command.maxGold)||E.quote(p.state,E.trainingCost).gold>command.maxGold))fail('A nyersanyaghiány ára megváltozott. Erősítsd meg újra.');error=E.train(p.state,command.useGold===true);break;
   case 'upgrade':if(!Object.hasOwn(E.buildings,command.id))fail('Ismeretlen épület.');if(command.useGold===true&&(!Number.isInteger(command.maxGold)||E.quote(p.state,E.cost(p.state,command.id)).gold>command.maxGold))fail('A nyersanyaghiány ára megváltozott. Erősítsd meg újra.');error=E.upgrade(p.state,command.id,command.useGold===true);break;
   case 'morale':error=E.boostMorale(p.state);break;
   case 'scout':error=E.launchScout(p.state,now);break;
   case 'bonus':error=E.activateBonus(p.state,command.id,now);break;
   case 'zombie':error=E.launch(p.state,now,command.targetId);break;
   case 'giant':error=E.launchGiant(p.state,now,command.id);break;
   case 'attack':{
    if(p.state.mission)fail('A sereged már bevetésen van.',409);
    if(now<p.cooldownUntil)fail('A sereg pihen. Új támadás egy percenként indítható.',409);
    const d=byId(command.targetId);
    if(!d||d.room!==p.room||d.id===p.id)fail('Érvénytelen ellenfél.',404);
    if(d.incoming||d.state.mission)fail('Az ellenfél már csatában van. Várd meg a hazatérését.',409);
    if(now<d.shieldUntil)fail('Az ellenfelet még kétperces csatavédelem óvja.',409);
    const soldiers=E.availableSoldiers(p.state);if(soldiers<RULES.minSoldiers)fail('A támadáshoz legalább 5 szabad katona szükséges.');
    const m={kind:'pvp',id:randomUUID(),defenderId:d.id,defenderName:d.name,soldiers,defenderSoldiers:E.availableSoldiers(d.state),power:E.power(p.state),enemy:E.power(d.state),ends:now+RULES.duration,target:{x:53,z:22}};
    p.state.mission=m;p.cooldownUntil=now+RULES.cooldown;d.incoming={attackerId:p.id,attackerName:p.name,ends:m.ends,soldiers:m.soldiers,power:m.power,enemy:m.enemy};
    log(p,`A sereg elindult ${d.name} bázisa ellen.`);log(d,`${p.name} serege közeledik! A bázisod automatikusan védekezik.`);break;
   }
   default:fail('Ismeretlen parancs.');
  }
  if(error)fail(error,409);
 }
 function view(p,now){p.lastSeen=now;return {revision:data.revision,serverTime:now,me:{id:p.id,name:p.name,room:p.room,incoming:p.incoming,cooldownUntil:p.cooldownUntil,shieldUntil:p.shieldUntil},state:p.state,reports:p.reports,rules:RULES,players:players().filter(d=>d.room===p.room&&d.id!==p.id).map(d=>({id:d.id,name:d.name,power:E.power(d.state),soldiers:E.availableSoldiers(d.state),level:d.state.levels.hq,busy:Boolean(d.incoming||d.state.mission),shieldUntil:d.shieldUntil,online:now-d.lastSeen<20000}))};}
 return {data,tick,join,authenticate,action,view};
}
async function handleRequest(world,request,options={}){
 const now=options.now??Date.now(),url=new URL(request.url),origin=request.headers.get('origin');
 const origins=options.allowedOrigins||['https://tamaskatona-ai.github.io'];
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
 if(origin&&origin!==url.origin&&!origins.includes(origin))return new Response(JSON.stringify({error:'Ez a webcím nincs engedélyezve a szerveren.'}),{status:403,headers});
 if(origin){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Methods']='GET, POST, OPTIONS';headers['Access-Control-Allow-Headers']='Authorization, Content-Type';}
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 try{
  if(url.pathname==='/api/online'&&request.method==='GET')return json({game:'vegvar',version:1});
  if(!['GET','POST'].includes(request.method))return json({error:'Nem támogatott kérés.'},405);
  let body;
  if(request.method==='POST'){
   if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON-kérés szükséges.'},415);
   const text=await request.text();if(text.length>8192)return json({error:'Túl nagy kérés.'},413);
   try{body=JSON.parse(text);}catch{return json({error:'Érvénytelen JSON.'},400);}
   if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Érvénytelen kérés.'},400);
  }
  world.tick(now);
  if(url.pathname==='/api/players'&&request.method==='POST'){
   const {player,token}=world.join(body.name,body.room,now);return json({...world.view(player,now),token},201);
  }
  const token=request.headers.get('authorization')?.replace(/^Bearer /,'');const p=world.authenticate(token);
  if(url.pathname==='/api/state'&&request.method==='GET')return json(world.view(p,now));
  if(url.pathname==='/api/action'&&request.method==='POST'){world.action(p,body,now);return json(world.view(p,now));}
  return json({error:'Nincs ilyen végpont.'},404);
 }catch(error){if(error instanceof GameError)return json({error:error.message},error.status);throw error;}
}
module.exports={createWorld,handleRequest,RULES};
