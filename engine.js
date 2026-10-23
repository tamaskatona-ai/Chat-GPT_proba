(function(root){
const buildings={hq:{name:'Parancsnokság',icon:'🏛️',desc:'Minden épület szintkorlátját emeli.',cost:{wood:100,metal:70}},farm:{name:'Üvegház',icon:'🌱',desc:'Élelmet termel a kiképzéshez.',cost:{wood:45,metal:15}},sawmill:{name:'Fűrésztelep',icon:'🪵',desc:'Fát termel az építkezéshez.',cost:{wood:30,metal:20}},mine:{name:'Fémfeldolgozó',icon:'⚙️',desc:'Fémet termel a fejlesztésekhez.',cost:{wood:60,metal:25}},barracks:{name:'Laktanya',icon:'🪖',desc:'Katonákat képez. Szintenként +2 harci erő.',cost:{wood:70,metal:50}},wall:{name:'Védőfal',icon:'🛡️',desc:'Szintenként +15 harci erő.',cost:{wood:80,metal:40}}};
const trainingCost={food:50,metal:20},maxMorale=5,resourcesPerGold=10;
function initial(){return {version:1,gold:0,morale:0,wood:220,metal:150,food:160,soldiers:8,zone:1,wins:0,levels:{hq:1,farm:1,sawmill:1,mine:1,barracks:1,wall:1},last:Date.now(),mission:null,log:['A túlélők megérkeztek. Építs biztonságos otthont!']};}
function migrate(s){
  // A korábbi mentések új mezőit alapértékkel egészítjük ki; a haladás megmarad.
  if(s.gold===undefined)s.gold=0;
  if(s.morale===undefined)s.morale=0;
  return s;
}
function cost(s,id){return Object.fromEntries(Object.entries(buildings[id].cost).map(([k,v])=>[k,Math.round(v*Math.pow(1.65,s.levels[id]-1))]));}
function moraleBonus(s){return (s.morale||0)*10;}
function moraleCost(s){return 30*((s.morale||0)+1);}
function goldReward(zone){return 25+zone*10;}
function power(s){return Math.floor(s.soldiers*(8+s.levels.barracks*2)*(100+moraleBonus(s))/100)+s.levels.wall*15;}
function enemy(s){return 70+s.zone*s.zone*25;}
function advance(s,now){let seconds=Math.max(0,Math.min(14400,(now-s.last)/1000));s.wood+=seconds*s.levels.sawmill*.8;s.metal+=seconds*s.levels.mine*.45;s.food+=seconds*s.levels.farm; s.last=now;return s;}
function quote(s,required){
  const missing=Object.fromEntries(Object.entries(required).map(([k,v])=>[k,Math.max(0,v-Math.floor(s[k]))]).filter(([,v])=>v>0));
  const gold=Math.ceil(Object.values(missing).reduce((a,b)=>a+b,0)/resourcesPerGold);
  return {missing,gold,canAfford:gold<=(s.gold||0)};
}
function pay(s,required,useGold){
  const q=quote(s,required);
  if(q.gold&&!useGold)return 'Nincs elég nyersanyag. A hiányt külön gombbal válthatod ki aranyból.';
  if(q.gold>(s.gold||0))return `Nincs elég arany. A hiány pótlásához ${q.gold} arany kell.`;
  for(const [k,v] of Object.entries(required))s[k]=Math.max(0,s[k]-v);
  s.gold=(s.gold||0)-q.gold;
  return null;
}
function upgrade(s,id,useGold=false){
  if(s.mission)return 'Az expedíció végéig nem fejleszthetsz.';
  if(id!=='hq'&&s.levels[id]>=s.levels.hq+1)return 'Előbb fejleszd a parancsnokságot!';
  const error=pay(s,cost(s,id),useGold);if(error)return error;
  s.levels[id]++;return null;
}
function train(s,useGold=false){
  if(s.mission)return 'A katonák expedíción vannak.';
  const error=pay(s,trainingCost,useGold);if(error)return error;
  s.soldiers+=5;return null;
}
function boostMorale(s){
  if(s.mission)return 'A morált a sereg hazatérése után növelheted.';
  if((s.morale||0)>=maxMorale)return 'A sereg morálja már maximális.';
  const amount=moraleCost(s);
  if((s.gold||0)<amount)return `A morál növeléséhez ${amount} arany kell.`;
  s.gold-=amount;s.morale=(s.morale||0)+1;return null;
}
function launch(s,now){if(s.mission)return 'Már folyamatban van egy expedíció.';if(s.soldiers<1)return 'Először képezz katonákat!';s.mission={ends:now+15000,power:power(s),enemy:enemy(s),zone:s.zone};return null;}
function resolve(s,now){if(!s.mission||now<s.mission.ends)return null;let m=s.mission;let win=m.power>=m.enemy;let loss=Math.min(s.soldiers,Math.max(1,Math.ceil(s.soldiers*(win?.12:.35))));s.soldiers-=loss;if(win){s.wood+=100+m.zone*35;s.metal+=60+m.zone*20;s.food+=80+m.zone*25;s.gold=(s.gold||0)+goldReward(m.zone);s.zone++;s.wins++;}s.mission=null;return win?`Győzelem a(z) ${m.zone}. körzetben! A zombik zsákmánya: +${goldReward(m.zone)} arany és nyersanyagok. Veszteség: ${loss} katona.`:`Visszavonulás a(z) ${m.zone}. körzetből. Veszteség: ${loss} katona. Erősítsd meg a sereget!`;}
const api={buildings,trainingCost,maxMorale,resourcesPerGold,initial,migrate,cost,moraleBonus,moraleCost,goldReward,quote,power,enemy,advance,upgrade,train,boostMorale,launch,resolve};if(typeof module!=='undefined')module.exports=api;else root.Engine=api;
})(globalThis);
