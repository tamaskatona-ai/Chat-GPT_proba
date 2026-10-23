const E=Engine, key='vegvar-save-v1';
let state=E.initial(),storageAvailable=true,selectedBuilding=null,pendingPurchase=null,lastBuildingMarkup='';
try{
  const raw=localStorage.getItem(key);
  if(raw){
    const s=E.migrate(JSON.parse(raw));
    if(s.version===1&&Object.keys(E.buildings).every(k=>Number.isInteger(s.levels?.[k])&&s.levels[k]>=1)&&['wood','metal','food','soldiers','zone','last','wins','gold'].every(k=>Number.isFinite(s[k])&&s[k]>=0)&&Number.isInteger(s.morale)&&s.morale>=0&&s.morale<=E.maxMorale&&Array.isArray(s.log))state=s;
  }
}catch{storageAvailable=false;}
const $=id=>document.getElementById(id);
const resourceNames={wood:'fa',metal:'fém',food:'élelem'};
const number=value=>Math.floor(value).toLocaleString('hu-HU');
function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{storageAvailable=false;}$('saved').textContent=storageAvailable?'● Helyi mentés aktív':'○ Mentés nem elérhető';}
let timer;
function toast(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(timer);timer=setTimeout(()=>$('toast').style.display='none',5000);}
function log(message){state.log.unshift(message);state.log=state.log.slice(0,5);}
function sync(){E.advance(state,Date.now());const result=E.resolve(state,Date.now());if(result){log(result);toast(result);}}
function render(){
  const data=[['wood','🪵','FA',state.levels.sawmill*.8],['metal','⚙️','FÉM',state.levels.mine*.45],['food','🌾','ÉLELEM',state.levels.farm],['gold','🪙','ARANY',null],['soldiers','🪖','KATONÁK',null]];
  $('resources').innerHTML=data.map(([id,icon,label,rate])=>`<div class="resource ${id==='gold'?'gold-resource':''}"><span class="icon">${icon}</span><div><small>${label}</small><strong id="resource-${id}">${number(state[id])}</strong><em>${id==='gold'?'Zombiktól zsákmányolva':rate===null?(state.mission?'Expedíción':'Bevetésre készen'):`+${(rate*60).toLocaleString('hu-HU')} / perc`}</em></div></div>`).join('');
  const buildingMarkup=Object.entries(E.buildings).map(([id,b])=>{
    const c=E.cost(state,id),q=E.quote(state,c),locked=id!=='hq'&&state.levels[id]>=state.levels.hq+1;
    return `<article class="building ${selectedBuilding===id?'selected':''}"><span class="level">${state.levels[id]}. SZINT</span><span class="art" aria-hidden="true">${b.icon}</span><h3>${b.name}</h3><p>${b.desc}</p><button data-upgrade="${id}" ${state.mission||locked||q.gold?'disabled':''}>${locked?'Parancsnokság fejlesztése szükséges':`Fejlesztés · ${c.wood} fa / ${c.metal} fém`}</button>${q.gold&&!locked?`<button class="gold-button" data-gold-upgrade="${id}" ${state.mission||!q.canAfford?'disabled':''}>Hiány kiváltása · ${number(q.gold)} arany</button>`:''}</article>`;
  }).join('');
  if(lastBuildingMarkup!==buildingMarkup){$('buildings').innerHTML=buildingMarkup;lastBuildingMarkup=buildingMarkup;}
  $('power').textContent=E.power(state);$('enemy').textContent=E.enemy(state);$('soldiers').textContent=state.soldiers;
  $('zones').textContent=String(state.wins).padStart(2,'0');$('rank').textContent=state.levels.hq>3?'Túlélők erődje':'Kezdő település';
  $('target').textContent=`${state.zone}. körzet · ${['Elhagyott külváros','Romos ipartelep','Fertőzött raktár','Elveszett városközpont'][(state.zone-1)%4]}`;
  $('forecast').textContent=state.mission?'A csapat bevetésen van…':E.power(state)>=E.enemy(state)?'Erőfölényben vagy. A győzelem várható.':'Az ellenség erősebb. Képezz katonákat vagy növeld a morált!';
  $('loot-preview').textContent=`Győzelmi zsákmány: ${E.goldReward(state.mission?.zone||state.zone)} arany + nyersanyagok`;
  $('expedition').disabled=Boolean(state.mission)||state.soldiers<1;$('map-expedition').disabled=$('expedition').disabled;
  $('map-expedition').textContent=state.mission?'A sereg bevetésen van…':'Sereg indítása →';
  $('expedition').textContent=state.mission?`Expedíció folyamatban · ${Math.max(0,Math.ceil((state.mission.ends-Date.now())/1000))} mp`:'Expedíció indítása →';
  const training=E.quote(state,E.trainingCost);
  $('train').disabled=Boolean(state.mission)||training.gold>0;
  $('train-gold').hidden=training.gold===0;
  $('train-gold').disabled=Boolean(state.mission)||!training.canAfford;
  $('train-gold').textContent=`Kiképzés · hiány kiváltása ${number(training.gold)} arany`;
  $('morale-level').textContent=`${state.morale} / ${E.maxMorale}. SZINT`;
  $('morale-bonus').textContent=`+${E.moraleBonus(state)}% katonai harci erő`;
  $('morale-meter').innerHTML=Array.from({length:E.maxMorale},(_,i)=>`<span class="${i<state.morale?'filled':''}"></span>`).join('');
  const maxed=state.morale>=E.maxMorale;
  $('boost-morale').disabled=Boolean(state.mission)||maxed||state.gold<E.moraleCost(state);
  $('boost-morale').textContent=maxed?'Maximális morál':`Morál +10% · ${E.moraleCost(state)} arany`;
  $('log').replaceChildren(...state.log.map(message=>{const li=document.createElement('li');li.textContent=message;return li;}));
}
function perform(kind,id,useGold=false){
  sync();const before=state.gold;
  const error=kind==='upgrade'?E.upgrade(state,id,useGold):E.train(state,useGold);
  if(error)toast(error);
  else{
    let message=kind==='upgrade'?`${E.buildings[id].name} fejlesztve: ${state.levels[id]}. szint.`:'5 új katona csatlakozott a helyőrséghez.';
    if(before>state.gold)message+=` Hiányzó nyersanyagok: −${before-state.gold} arany.`;
    log(message);toast(message);
  }
  save();render();
}
function purchaseWithGold(kind,id){
  sync();render();
  const required=kind==='upgrade'?E.cost(state,id):E.trainingCost,q=E.quote(state,required);
  if(q.gold===0){perform(kind,id);return;}
  if(!q.canAfford){toast(`Nincs elég arany. Szükséges: ${q.gold} arany.`);return;}
  pendingPurchase={kind,id,maxGold:q.gold};
  $('gold-dialog-details').textContent=`${kind==='upgrade'?E.buildings[id].name+' fejlesztése':'5 katona kiképzése'}. Hiányzik: ${Object.entries(q.missing).map(([k,v])=>`${number(v)} ${resourceNames[k]}`).join(', ')}.`;
  $('gold-dialog-total').textContent=`Legfeljebb ${q.gold} arany · Egyenleged: ${state.gold} arany`;
  $('gold-dialog').showModal();
}
$('confirm-gold').onclick=()=>{
  if(!pendingPurchase)return;
  const {kind,id,maxGold}=pendingPurchase;
  sync();const q=E.quote(state,kind==='upgrade'?E.cost(state,id):E.trainingCost);
  if(q.gold>maxGold){$('gold-dialog').close();purchaseWithGold(kind,id);return;}
  $('gold-dialog').close();perform(kind,id,true);
};
$('gold-dialog').addEventListener('close',()=>{if(!$('gold-dialog').open)pendingPurchase=null;});
$('buildings').addEventListener('click',event=>{
  const gold=event.target.closest('[data-gold-upgrade]');
  if(gold&&!gold.disabled){purchaseWithGold('upgrade',gold.dataset.goldUpgrade);return;}
  const button=event.target.closest('[data-upgrade]');
  if(button&&!button.disabled)perform('upgrade',button.dataset.upgrade);
});
$('train').onclick=()=>perform('train');
$('train-gold').onclick=()=>purchaseWithGold('train');
$('boost-morale').onclick=()=>{
  sync();const before=state.gold,error=E.boostMorale(state);
  if(error)toast(error);
  else{const message=`A sereg morálja nőtt: +${E.moraleBonus(state)}% katonai harci erő. Költség: ${before-state.gold} arany.`;log(message);toast(message);}
  save();render();
};
$('expedition').onclick=()=>{
  sync();const error=E.launch(state,Date.now());
  if(error)toast(error);
  else{log(`Az expedíció elindult a(z) ${state.zone}. körzetbe.`);$('world-title').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
  save();render();
};
$('reset').onclick=()=>{if(confirm('Új települést kezdesz? A jelenlegi haladás törlődik.')){state=E.initial();save();render();}};
$('map-expedition').onclick=()=>$('expedition').click();
sync();save();render();setInterval(()=>{sync();render();save();},1000);
document.addEventListener('visibilitychange',()=>{sync();save();render();});
BattleScene.mount($('world-canvas'),()=>state,id=>{
  selectedBuilding=id;
  const button=$('buildings').querySelector(`[data-upgrade="${id}"]`),card=button.closest('.building');
  card.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
  document.querySelectorAll('.building.selected').forEach(el=>el.classList.remove('selected'));card.classList.add('selected');
  toast(`${E.buildings[id].name}: ${state.levels[id]}. szint. A fejlesztéshez használd az épület gombját.`);
});
