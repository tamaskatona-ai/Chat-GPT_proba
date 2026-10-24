/* Személyes felhőmentés. A helyi eredetit és a szerveren kezelt PvP-bázist külön őrizzük. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),LOGIN='vegvar-cloud-login';
 let active=false,connected=false,owner=false,working=false,saving=false,revision=0,username='',token='',server='',player=null,generation=0,changeTimer;
 const makeId=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
 let deviceId;try{deviceId=sessionStorage.getItem('vegvar-device')||makeId();sessionStorage.setItem('vegvar-device',deviceId);}catch{deviceId=makeId();}
 const get=k=>{try{return localStorage.getItem(k);}catch{return null;}};
 const put=(k,v)=>{try{localStorage.setItem(k,v);}catch{}};
 const tell=text=>{$('cloud-status').textContent=text;};
 function draw(){
  $('cloud-login').hidden=active;$('cloud-account').hidden=!active;
  if(active){$('cloud-name').textContent=username;$('cloud-takeover').hidden=owner&&connected;$('cloud-player').hidden=!player;$('cloud-link-player').hidden=!window.OnlineGame?.active()||Boolean(player);}
  for(const id of ['cloud-register','cloud-signin','cloud-takeover','cloud-signout','cloud-player','cloud-link-player','cloud-save-now','cloud-import-original'])$(id).disabled=working||saving;
  $('cloud-import-original').disabled=working||saving||!owner||!connected||Boolean(window.OnlineGame?.active());
  window.GameSave?.refresh();
 }
 async function api(path,body,auth=token){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{const response=await fetch(server+path,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},body:JSON.stringify(body),signal:controller.signal});
   if(!response.headers.get('content-type')?.includes('application/json'))throw Error('A szerveren még nincs felhőmentés. Frissítsd a Cloudflare-közzétételt a legújabb GitHub-verzióra.');
   const data=await response.json();if(!response.ok){const error=Error(data.error||'A felhőmentés nem elérhető.');error.status=response.status;error.data=data;throw error;}return data;
  }catch(error){if(error.name==='AbortError')throw Error('A felhőszerver nem válaszol. A helyi eredetid megmaradt.');throw error;}finally{clearTimeout(timer);}
 }
 function normalize(value){const url=new URL(value);if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw Error('A felhőmentéshez HTTPS-játékcímet adj meg.');if(url.username||url.password)throw Error('Érvénytelen szervercím.');return url.origin;}
 function storeLogin(){put(LOGIN,JSON.stringify({server,token,username}));}
 async function open(data,resumePlayer=false){
  if(window.OnlineGame?.active())window.OnlineGame.leave();
  if(window.OnlineGame?.active())throw Error('Várd meg az online művelet végét.');
  if(!active)window.GameSave.beginCloud();
  active=true;connected=true;owner=data.owner;revision=data.revision;username=data.username;player=data.player;generation++;
  window.GameSave.load(data.state);storeLogin();draw();
  tell(owner?'Felhőmentés betöltve. A változások automatikusan mentődnek.':'Ezt a fiókot másik készüléken használod. A folytatáshoz válaszd ezt a készüléket.');
  if(resumePlayer&&player)await window.OnlineGame.loginWithCloud(server,token);
 }
 async function signIn(register){
  if(working||saving)return;working=true;generation++;draw();tell(register?'A meglévő bázis biztonságos mentése…':'Bejelentkezés…');
  try{
   server=normalize($('cloud-server').value);const capabilities=await fetch(server+'/api/online',{cache:'no-store'}).then(r=>r.json());if(!capabilities.cloudSaves)throw Error('A szerveren még a régi játék fut. Várd meg a Cloudflare-frissítést, majd próbáld újra.');const credentials=window.OnlineGame?.credentials();
   const body={username:$('cloud-username').value,password:$('cloud-password').value,deviceId};
   if(register){body.state=window.GameSave.readSolo();if(credentials?.server===server)body.onlineToken=credentials.token;}
   const data=await api('/api/cloud/'+(register?'register':'login'),body,'');token=data.token;$('cloud-password').value='';await open(data,true);
  }catch(error){tell(error.message);}finally{working=false;draw();}
 }
 async function saveNow(){
  if(!active||working||saving||!owner||window.OnlineGame?.active())return;
  saving=true;const current=generation;draw();
  try{const result=await api('/api/cloud/save',{deviceId,revision,state:window.GameSave.readSolo()});if(current!==generation)return;revision=result.revision;connected=true;tell('✓ Mentve a felhőbe · '+new Date(result.updatedAt).toLocaleTimeString('hu-HU'));}
  catch(error){if(current!==generation)return;if(error.status===409){owner=false;connected=true;tell(error.message);}else{connected=false;tell('A felhőmentés nem sikerült: '+error.message+' A játékot a kapcsolat helyreállása után folytathatod.');}}
  finally{saving=false;draw();}
 }
 $('cloud-password').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();signIn(false);}});
 $('cloud-import-original').onclick=async()=>{if(working||saving||!owner)return;const original=window.GameSave.original();if(!confirm(`A felhős egyjátékos állásodat lecseréled az ezen a készüléken eredetileg meglévő bázisra? Parancsnokság: ${original.levels.hq}. szint, katonák: ${original.soldiers}. A közös szoba bázisa külön marad.`))return;working=true;draw();try{const result=await api('/api/cloud/save',{deviceId,revision,state:original});revision=result.revision;window.GameSave.load(original);tell('Az eredeti helyi bázisod felhőbe került. Telefonon bejelentkezve ezt folytathatod.');}catch(error){tell(error.message);}finally{working=false;draw();}};
 $('cloud-register').onclick=()=>signIn(true);$('cloud-signin').onclick=()=>signIn(false);$('cloud-save-now').onclick=saveNow;
 $('cloud-takeover').onclick=async()=>{
  if(working||saving)return;working=true;draw();try{await open(await api('/api/cloud/takeover',{deviceId}),false);}catch(error){tell(error.message);}finally{working=false;draw();}
 };
 $('cloud-player').onclick=async()=>{try{await window.OnlineGame.loginWithCloud(server,token);draw();tell('A fiókodhoz kapcsolt online bázis betöltve.');}catch(error){tell(error.message);}};
 $('cloud-link-player').onclick=async()=>{const credentials=window.OnlineGame?.credentials();if(!credentials||credentials.server!==server){tell('Ehhez a szerverhez tartozó online szobába lépj be.');return;}try{const data=await api('/api/cloud/link-player',{deviceId,onlineToken:credentials.token});player=data.player;draw();tell('Az online bázisod mostantól ugyanazzal a felhasználónévvel és jelszóval folytatható.');}catch(error){tell(error.message);}};
 $('cloud-signout').onclick=async()=>{
  if(working||saving)return;await saveNow();working=true;draw();
  try{if(window.OnlineGame?.active())window.OnlineGame.leave();await api('/api/cloud/logout',{});}
  catch{/* A helyi kijelentkezés hálózat nélkül is működik; a szerveres munkamenet lejár. */}
  finally{active=false;connected=false;owner=false;generation++;try{localStorage.removeItem(LOGIN);}catch{}window.GameSave.endCloud();working=false;draw();tell('Kijelentkeztél. A felhőmentésed megmaradt, a helyi eredeti bázisodat látod.');}
 };
 document.addEventListener('click',event=>{if(window.CloudSave?.blocked()&&event.target.closest('[data-attack-npc],#inspect-npc-attack,[data-upgrade],[data-gold-upgrade],[data-activate-bonus],#train,#train-gold,#boost-morale,#attack-giant,#expedition,#map-expedition,#launch-scout,#reset')){event.preventDefault();event.stopImmediatePropagation();tell('A folytatáshoz állítsd helyre a kapcsolatot, vagy válaszd ezt a készüléket.');}},true);
 window.CloudSave={active:()=>active,blocked:()=>active&&!window.OnlineGame?.active()&&(!connected||!owner||working),switching:()=>working,
  cache(state){put('vegvar-cloud-cache:'+server+':'+username,JSON.stringify({revision,state,at:Date.now()}));},
  changed(){if(!active)return;clearTimeout(changeTimer);changeTimer=setTimeout(saveNow,500);},
  draw
 };
 const defaultServer=['localhost','127.0.0.1'].includes(location.hostname)?location.origin:location.hostname.endsWith('.workers.dev')?location.origin:'https://vegvar-online.tamas-katona.workers.dev';
 $('cloud-server').value=defaultServer;
 setInterval(saveNow,5000);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)saveNow();});
 window.addEventListener('offline',()=>{if(active){connected=false;draw();tell('Nincs internet. A felhős bázis módosítása szünetel, a mentésed megmaradt.');}});
 window.addEventListener('online',()=>{if(active)saveNow();});
 window.addEventListener('load',async()=>{
  const current=generation;
  try{const login=JSON.parse(get(LOGIN)||'null');if(!login)return;server=normalize(login.server);token=login.token;username=login.username;$('cloud-server').value=server;
   const data=await api('/api/cloud/session',{deviceId});if(current!==generation||working)return;await open(data,true);
  }catch(error){tell(error.message+' Jelentkezz be újra; a helyi eredeti bázisod megmaradt.');}
 });
})();
