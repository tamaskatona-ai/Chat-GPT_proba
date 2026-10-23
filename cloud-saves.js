'use strict';
const E=require('./engine');
const {randomBytes,randomUUID,createHash,timingSafeEqual}=require('node:crypto');
class CloudError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const fail=(text,status)=>{throw new CloudError(text,status);};
const hash=token=>createHash('sha256').update(token).digest('hex');
const finite=v=>Number.isFinite(v)&&v>=0&&v<=1e15;
function validateSave(input){
 try{
  const s=E.migrate(JSON.parse(JSON.stringify(input)));
  if(s.version!==1||!Object.keys(E.buildings).every(k=>Number.isInteger(s.levels?.[k])&&s.levels[k]>=1&&s.levels[k]<=1000000))throw Error();
  if(!['wood','metal','food','gold','last','moraleUpdatedAt'].every(k=>finite(s[k]))||!['soldiers','zone','wins','encounters'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0))throw Error();
  if(!Number.isFinite(s.morale)||s.morale<0||s.morale>5)throw Error();
  if(!E.resourceTypes.every(t=>Number.isSafeInteger(s.bonusInventory?.[t])&&s.bonusInventory[t]>=0&&finite(s.boostUntil?.[t])))throw Error();
  if(!Array.isArray(s.giants)||s.giants.length!==8||!s.giants.every((g,id)=>finite(g.hp)&&g.hp<=E.rulesForGiant(id).maxHp&&typeof g.rewardClaimed==='boolean'&&finite(g.respawnAt)&&Number.isSafeInteger(g.generation)&&g.generation>=0))throw Error();
  if(s.mission){const m=s.mission;if(!m.kind)m.kind='zone';if(m.soldiers===undefined)m.soldiers=s.soldiers;if(!['zone','giant'].includes(m.kind)||!['ends','power','enemy','soldiers'].every(k=>finite(m[k]))||!Number.isSafeInteger(m.soldiers)||m.soldiers>s.soldiers)throw Error();
   if(m.kind==='giant'&&(!Number.isInteger(m.giantId??0)||(m.giantId??0)<0||(m.giantId??0)>7||!['giantHpAtStart','damageTotal','damageDealt','appliedTicks'].every(k=>finite(m[k]))||m.appliedTicks>5||m.damageDealt>m.damageTotal))throw Error();
   if(m.kind==='zone'&&(!Number.isInteger(m.zone)||m.zone<1))throw Error();
  }
  if(s.scout&&!['started','searchStarts','searchEnds','ends','soldiers'].every(k=>finite(s.scout[k])))throw Error();
  s.log=Array.isArray(s.log)?s.log.filter(x=>typeof x==='string').slice(0,5).map(x=>x.slice(0,500)):[];
  delete s.incomingRaid;delete s.lastPvpLootGold;
  return s;
 }catch{fail('Ez nem érvényes egyjátékos mentés. A korábbi mentésedet nem módosítottuk.');}
}
async function passwordHash(password,salt){
 const key=await globalThis.crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await globalThis.crypto.subtle.deriveBits({name:'PBKDF2',salt:Buffer.from(salt,'hex'),iterations:600000,hash:'SHA-256'},key,256);
 return Buffer.from(bits).toString('hex');
}
function accountFor(data,token,now=Date.now()){
 if(typeof token!=='string'||!/^[a-f0-9]{48}$/.test(token))return null;
 const digest=hash(token);return (data.accounts||[]).find(a=>a.sessions.some(s=>s.hash===digest&&s.expires>now))||null;
}
function newSession(account,now){const token=randomBytes(24).toString('hex');account.sessions=account.sessions.filter(s=>s.expires>now).slice(-9);account.sessions.push({hash:hash(token),expires:now+30*86400000});return token;}
function device(body){if(typeof body?.deviceId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(body.deviceId))fail('Hiányzó készülékazonosító.');return body.deviceId;}
function view(account,world,deviceId){const player=world.data.players.find(p=>p.id===account.playerId);return {username:account.username,revision:account.revision,updatedAt:account.updatedAt,owner:account.activeDevice===deviceId,state:account.state,player:player?{id:player.id,name:player.name,room:player.room}:null};}
async function handleCloud(world,request,url,body,now,json){
 const data=world.data;if(!data.accounts)data.accounts=[];
 const token=request.headers.get('authorization')?.replace(/^Bearer /,'');
 const path=url.pathname;
 if(['/api/cloud/register','/api/cloud/login'].includes(path)&&request.method==='POST'){
  const username=typeof body.username==='string'?body.username.normalize('NFKC').trim().toLocaleLowerCase('hu'):'';
  if(!/^[\p{L}\p{N}_.-]{3,32}$/u.test(username))fail('A felhasználónév 3–32 betű, szám, pont, kötőjel vagy aláhúzás lehet.');
  if(typeof body.password!=='string'||body.password.length<10||body.password.length>128)fail('A jelszó 10–128 karakter legyen.');
  const id=device(body);let account=data.accounts.find(a=>a.username===username);
  if(path.endsWith('/register')){
   if(account)fail('Ez a felhasználónév már létezik. Válaszd a Bejelentkezés gombot.',409);
   if(data.accounts.length>=128)fail('A felhőmentés tárhelye megtelt.',503);
   const state=validateSave(body.state),player=body.onlineToken?world.authenticate(body.onlineToken):null;
   if(player?.accountId)fail('Ez az online bázis már másik fiókhoz tartozik.',409);
   const salt=randomBytes(16).toString('hex'),digest=await passwordHash(body.password,salt);
   account={id:randomUUID(),username,salt,passwordHash:digest,sessions:[],state,revision:1,updatedAt:now,activeDevice:id,playerId:player?.id||null};
   data.accounts.push(account);if(player)player.accountId=account.id;
  }else{
   const digest=await passwordHash(body.password,account?.salt||'0'.repeat(32));
   if(!account||!timingSafeEqual(Buffer.from(digest,'hex'),Buffer.from(account.passwordHash,'hex')))fail('Hibás felhasználónév vagy jelszó.',401);
   account.activeDevice=id;account.revision++;
  }
  return json({...view(account,world,id),token:newSession(account,now)},path.endsWith('/register')?201:200);
 }
 const account=accountFor(data,token,now);if(!account)fail('A bejelentkezés lejárt. Jelentkezz be újra.',401);
 if(path==='/api/cloud/session'&&request.method==='POST')return json(view(account,world,device(body)));
 if(path==='/api/cloud/takeover'&&request.method==='POST'){account.activeDevice=device(body);account.revision++;return json(view(account,world,body.deviceId));}
 if(path==='/api/cloud/save'&&request.method==='POST'){
  const id=device(body);if(account.activeDevice!==id||body.revision!==account.revision)return json({error:'Ezt a mentést másik készüléken nyitottad meg. A régebbi állás nem írta felül a felhőt.',conflict:true,...view(account,world,id)},409);
  const state=validateSave(body.state);account.state=state;account.revision++;account.updatedAt=now;return json({revision:account.revision,updatedAt:now});
 }
 if(path==='/api/cloud/link-player'&&request.method==='POST'){
  const player=world.authenticate(body.onlineToken);if(player.accountId&&player.accountId!==account.id)fail('Ez a bázis már másik fiókhoz tartozik.',409);
  if(account.playerId&&account.playerId!==player.id)fail('A fiókodhoz már kapcsoltál másik online bázist.',409);
  account.playerId=player.id;player.accountId=account.id;return json(view(account,world,device(body)));
 }
 if(path==='/api/cloud/logout'&&request.method==='POST'){account.sessions=account.sessions.filter(s=>s.hash!==hash(token));return json({ok:true});}
 return json({error:'Nincs ilyen felhőmentési végpont.'},404);
}
module.exports={CloudError,handleCloud,accountFor,validateSave};
