/* A szerver a hiteles játékállás; offline mentést nem töltünk fel a közös világba. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),panel=$('online-panel');
 let base='',token='',active=false,connected=false,busy=false,polling=false,snapshot=null,generation=0;
 const storageKey=()=>`vegvar-online-token:${base}`;
 const stored=(key)=>{try{return localStorage.getItem(key)||'';}catch{return '';}};
 const store=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
 const normalize=value=>{
  const url=new URL(value||location.origin);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('HTTP vagy HTTPS játékcímet adj meg.');
  if(location.protocol==='https:'&&url.protocol!=='https:')throw Error('Erről az oldalról HTTPS-szerverhez csatlakozhatsz.');
  return url.origin;
 };
 const message=text=>{$('online-status').textContent=text;};
 async function api(path,body,auth=token){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(base+path,{method:body?'POST':'GET',cache:'no-store',headers:{...(body?{'Content-Type':'application/json'}:{}),...(auth?{Authorization:'Bearer '+auth}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal});
   if(!response.headers.get('content-type')?.includes('application/json'))throw Error('Ezen a címen nincs többjátékos szerver. A GitHub Pages mellé közös szerver szükséges.');
   const data=await response.json();if(!response.ok)throw Error(data.error||'A szerver nem elérhető.');return data;
  }catch(error){if(error.name==='AbortError')throw Error('A szerver nem válaszol. Próbáld újra.');throw error;}finally{clearTimeout(timeout);}
 }
 function apply(data){if(snapshot&&data.revision<snapshot.revision)return;snapshot=data;data.state.incomingRaid=data.me.incoming;data.state.lastPvpLootGold=data.reports[0]?.attackerId===data.me.id?data.reports[0].loot.gold:0;connected=true;window.OnlineGame.applyState(data.state);draw();}
 function draw(){
  $('online-setup').hidden=active;$('online-game').hidden=!active;
  if(!active)return;
  const {me,players,reports,serverTime}=snapshot;
  $('online-name').textContent=me.name;$('online-room').textContent=me.room;
  message(!connected?'Nincs kapcsolat. Az online műveletek szünetelnek.':me.incoming?`${me.incoming.attackerName} megtámadott! A bázisod védekezik.`:snapshot.state.mission?.kind==='pvp'?`Támadás: ${snapshot.state.mission.defenderName} bázisa ellen.`:'Kapcsolódva · a haladás a közös szerveren mentődik');
  const link=new URL(base+'/');link.searchParams.set('room',me.room);$('online-invite').value=link.href;
  $('online-recovery-code').value=token;
  const list=$('online-players');list.replaceChildren();
  if(!players.length){const p=document.createElement('p');p.textContent='Még egyedül vagy a szobában. Küldd el a meghívólinket egy barátodnak!';list.append(p);}
  for(const player of players){
   const row=document.createElement('article');row.className='online-player';
   const info=document.createElement('div'),name=document.createElement('strong'),stats=document.createElement('p');name.textContent=player.name;stats.textContent=`${player.soldiers} katona · ${player.power} erő · ${player.level}. szint · ${player.online?'online':'távollévő'}`;info.append(name,stats);
   const button=document.createElement('button'),shield=player.shieldUntil>serverTime,cooldown=me.cooldownUntil>serverTime;
   button.textContent=shield?'Csatavédelem':player.busy?'Csatában van':cooldown?'Sereg pihen':'Megtámadom';
   button.disabled=!connected||busy||Boolean(snapshot.state.mission)||Boolean(me.incoming)||shield||player.busy||cooldown||Engine.availableSoldiers(snapshot.state)<5;
   button.onclick=()=>{const dialog=$('pvp-dialog');$('pvp-confirm-text').textContent=`${player.name} bázisa: ${player.power} harci erő, ${player.soldiers} katona. Saját erőd: ${Engine.power(snapshot.state)}. A támadás 15 másodperc, katonaveszteséggel jár. Győzelemkor a készletének 10%-át zsákmányolod (legfeljebb 400/nyersanyag és 150 arany).`;pendingTarget=player.id;dialog.showModal();};row.append(info,button);list.append(row);
  }
  const reportList=$('online-reports');reportList.replaceChildren();
  for(const report of reports){const item=document.createElement('li'),attacker=report.attackerId===me.id;item.textContent=`${new Date(report.at).toLocaleTimeString('hu-HU')} · ${report.attackerName} → ${report.defenderName}: ${report.win?'a támadó győzött':'a védők győztek'}. Veszteséged: ${attacker?report.attackLoss:report.defenseLoss} katona. ${attacker?'Zsákmány':'Elvitt készlet'}: ${report.loot.gold} arany, ${report.loot.wood} fa, ${report.loot.metal} vas, ${report.loot.food} élelem.`;reportList.append(item);}
  $('online-leave').disabled=busy;
 }
 let pendingTarget=null;
 $('pvp-confirm').onclick=()=>{$('pvp-dialog').close();if(pendingTarget)window.OnlineGame.action({type:'attack',targetId:pendingTarget});pendingTarget=null;};
 $('pvp-cancel').onclick=()=>$('pvp-dialog').close();
 async function enter(recover){
  if(busy)return;generation++;busy=true;$('online-connect').disabled=true;$('online-recover').disabled=true;
  try{
   base=normalize($('online-server').value);let data;
   if(recover){token=$('online-code').value.trim();data=await api('/api/state');}
   else{data=await api('/api/players',{name:$('online-player-name').value.trim(),room:$('online-room-input').value.trim()},'');token=data.token;}
   store(storageKey(),token);store('vegvar-online-server',base);active=true;generation++;window.OnlineGame.start();apply(data);
  }catch(error){message(error.message);}
  finally{busy=false;$('online-connect').disabled=false;$('online-recover').disabled=false;if(active)draw();}
 }
 $('online-connect').onclick=()=>enter(false);$('online-recover').onclick=()=>enter(true);
 $('online-leave').onclick=()=>{if(busy)return;active=false;generation++;connected=false;snapshot=null;window.OnlineGame.stop();$('online-setup').hidden=false;$('online-game').hidden=true;message('Visszatértél az egyjátékos mentésedhez. Az online bázisod a szerveren megmarad.');};
 $('online-copy-code').onclick=async()=>{try{await navigator.clipboard.writeText(token);message('Saját visszatérési kód másolva. Mentsd el magadnak!');}catch{const input=$('online-recovery-code');input.type='text';input.focus();input.select();message('Másold és mentsd el a saját kódodat.');}};
 $('online-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('online-invite').value);message('Meghívólink másolva. Küldd el a barátodnak!');}catch{$('online-invite').focus();$('online-invite').select();message('Jelöld ki és másold a meghívólinket.');}};
 window.OnlineGame={
  active:()=>active,blocked:()=>active&&(!connected||busy||Boolean(snapshot?.me.incoming)),
  start(){},stop(){},applyState(){},
  async action(command){
   if(!active||busy)return;if(!connected){message('Nincs kapcsolat. Az online állás nem módosítható internet nélkül.');return;}
   busy=true;window.OnlineGame.refreshControls?.();draw();
   try{apply(await api('/api/action',command));}
   catch(error){message(error.message);window.OnlineGame.notify?.(error.message);}
   finally{busy=false;window.OnlineGame.refreshControls?.();draw();}
  }
 };
 let params=new URLSearchParams(location.search);
 $('online-server').value=params.get('server')||stored('vegvar-online-server')||(['http:','https:'].includes(location.protocol)?location.origin:'');
 $('online-room-input').value=params.get('room')||'';
 if(params.get('room'))panel.scrollIntoView({block:'start'});
 async function refresh(){
  if(!active||busy||polling||document.hidden)return;polling=true;
  const current=generation;
  try{const data=await api('/api/state');if(active&&current===generation)apply(data);}
  catch{if(!active||current!==generation)return;connected=false;draw();window.OnlineGame.refreshControls?.();}
  finally{polling=false;}
 }
 setInterval(refresh,2000);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 window.addEventListener('offline',()=>{if(active){connected=false;draw();window.OnlineGame.refreshControls?.();}});
 // Automatikus visszatérés csak az ehhez a szerverhez korábban eltett saját kulccsal.
 window.addEventListener('load',async()=>{
  try{const current=generation;base=normalize($('online-server').value);const saved=stored(storageKey());if(!saved)return;token=saved;const data=await api('/api/state');if(current!==generation||busy)return;active=true;generation++;window.OnlineGame.start();apply(data);}catch{message('Az online módhoz csatlakozz vagy add meg a saját visszatérési kódodat.');}
 });
})();
