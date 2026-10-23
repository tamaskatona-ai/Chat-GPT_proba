(function(root){
const buildings={hq:{name:'Parancsnokság',icon:'🏛️',desc:'Minden épület szintkorlátját emeli.',cost:{wood:100,metal:70}},farm:{name:'Üvegház',icon:'🌱',desc:'Élelmet termel a kiképzéshez.',cost:{wood:45,metal:15}},sawmill:{name:'Fűrésztelep',icon:'🪵',desc:'Alaptermelés: 105,6 fa/perc szintenként.',cost:{wood:30,metal:20}},mine:{name:'Vasfeldolgozó',icon:'⚙️',desc:'Alaptermelés: 176 vas/perc szintenként.',cost:{wood:60,metal:25}},barracks:{name:'Laktanya',icon:'🪖',desc:'Katonákat képez. Szintenként +2 harci erő.',cost:{wood:70,metal:50}},wall:{name:'Védőfal',icon:'🛡️',desc:'Szintenként +15 harci erő.',cost:{wood:80,metal:40}}};
const trainingCost={food:50,metal:20},maxMorale=5,resourcesPerGold=10;
const resourceTypes=['wood','metal','food'];
const productionBuildings={wood:'sawmill',metal:'mine',food:'farm'};
const baseProduction={wood:105.6,metal:176,food:60};
const scoutSize=3,scoutTravelTime=10000,scoutSearchTime=300000,bonusDuration=300000;
const scoutLoot={bonuses:{wood:3,metal:3,food:3},gold:75};
const normalZombiePower=95,zombieCount=44;
const mapBounds={minX:-84,maxX:84,minZ:-56,maxZ:56,width:168,depth:112};
const giantTypes=[100,120,140,160,180,200,210,220];
const giantNames=['Pusztító','Romboló','Vasmarok','Dögvész','Földrengető','Ostromló','Végítélet','Világfaló'];
const giantRules={power:normalZombiePower*100,maxHp:9500,respawnTime:300000,loot:{gold:1500,wood:2400,metal:1800,food:2000}};
function rulesForGiant(id=0){const multiplier=giantTypes[id]??100,scale=multiplier/100;return {...giantRules,multiplier,power:normalZombiePower*multiplier,maxHp:normalZombiePower*multiplier,loot:Object.fromEntries(Object.entries(giantRules.loot).map(([k,v])=>[k,Math.round(v*scale)]))};}
function initialGiant(id=0){return {id,hp:rulesForGiant(id).maxHp,rewardClaimed:false,respawnAt:0,generation:0};}
function getGiant(s,id=0){return s.giants?.[id]||(id===0?s.giant:null);}
function giantPercent(s,id=0){return Math.ceil(getGiant(s,id).hp/rulesForGiant(id).maxHp*100);}
function initial(){const giants=giantTypes.map((_,i)=>initialGiant(i));return {version:1,giants,giant:giants[0],scout:null,bonusInventory:{wood:0,metal:0,food:0},boostUntil:{wood:0,metal:0,food:0},gold:0,morale:0,moraleUpdatedAt:Date.now(),encounters:0,wood:220,metal:150,food:160,soldiers:8,zone:1,wins:0,levels:{hq:1,farm:1,sawmill:1,mine:1,barracks:1,wall:1},last:Date.now(),mission:null,log:['A túlélők megérkeztek. Építs biztonságos otthont!']};}
function migrate(s){
  // A korábbi mentések új mezőit alapértékkel egészítjük ki; a haladás megmarad.
  if(s.gold===undefined)s.gold=0;
  if(s.morale===undefined)s.morale=0;
  if(s.moraleUpdatedAt===undefined)s.moraleUpdatedAt=s.last;
  if(s.encounters===undefined)s.encounters=0;
  if(s.scout===undefined)s.scout=null;
  if(s.giants===undefined){
    const old=s.giant;s.giants=giantTypes.map((_,i)=>initialGiant(i));
    // Az első óriás sérülésének aránya és újraéledési ideje megmarad.
    if(old)s.giants[0]={...s.giants[0],...old,hp:Math.min(9500,old.hp*10),id:0};
  }
  s.giant=s.giants[0];
  s.giants.forEach((g,id)=>{if(g.respawnAt===undefined)g.respawnAt=g.hp===0?s.last+giantRules.respawnTime:0;if(g.generation===undefined)g.generation=0;g.id=id;});
  if(s.bonusInventory===undefined)s.bonusInventory={wood:0,metal:0,food:0};
  if(s.boostUntil===undefined)s.boostUntil={wood:0,metal:0,food:0};
  return s;
}
function cost(s,id){return Object.fromEntries(Object.entries(buildings[id].cost).map(([k,v])=>[k,Math.round(v*Math.pow(1.65,s.levels[id]-1))]));}
function moraleBonus(s){return (s.morale||0)*10;}
function moraleCost(s){return 30*(Math.floor(s.morale||0)+1);}
function goldReward(zone){return 25+zone*10;}
function availableSoldiers(s){return Math.max(0,s.soldiers-(s.scout?s.scout.soldiers:0));}
function power(s){return Math.floor(availableSoldiers(s)*(8+s.levels.barracks*2)*(100+moraleBonus(s))/100)+s.levels.wall*15;}
function enemy(s){return 70+s.zone*s.zone*25;}
function baseRate(s,type){return baseProduction[type]*s.levels[productionBuildings[type]];}
function productionRate(s,type,now){return baseRate(s,type)*((s.boostUntil?.[type]||0)>now?2:1);}
const hills=[{x:54,z:30,r:20,h:6},{x:-52,z:32,r:17,h:5},{x:40,z:-38,r:16,h:7},{x:-52,z:-45,r:12,h:3}];
const lake={x:-59,z:-25,rx:11,rz:8};
function terrainHeight(x,z){const basin=((x-lake.x)/lake.rx)**2+((z-lake.z)/lake.rz)**2;return (basin<1?-2*(1-basin)**2:0)+hills.reduce((h,p)=>{const d=Math.hypot(x-p.x,z-p.z)/p.r;return h+(d<1?p.h*Math.pow(1-d*d,2):0);},0);}
function inLake(x,z,margin=0){return ((x-lake.x)/(lake.rx+margin))**2+((z-lake.z)/(lake.rz+margin))**2<1;}
function zombiePosition(index,now){
  const centers=[[24,0],[56,1],[22,34],[58,34],[20,-35],[65,-33],[-15,39],[-57,35]],c=centers[Math.floor(index/6)%centers.length];
  const t=now/1000*(.065+(index%3)*.009)+index*1.73;
  return {x:c[0]+Math.cos(t)*(3+(index%4)),z:c[1]+Math.sin(t*.79)*(3+(index%3))};
}
const giantCenters=[[38,-14],[64,-12],[19,26],[53,30],[23,-41],[65,-39],[-16,43],[-51,35]];
function giantPosition(s,now,id=0){
  const g=getGiant(s,id);
  if(s.mission?.kind==='giant'&&(s.mission.giantId??0)===id&&s.mission.target)return s.mission.target;
  if(g.hp===0&&g.deathPosition)return g.deathPosition;
  const t=now/1000*.025+g.generation*2+id,c=giantCenters[id];
  return {x:c[0]+Math.cos(t)*3,z:c[1]+Math.sin(t)*4};
}
function respawnGiant(s,now){
  let changed=false;
  (s.giants||[s.giant]).forEach((g,id)=>{
    if(g.hp===0&&g.rewardClaimed&&!(s.mission?.kind==='giant'&&(s.mission.giantId??0)===id)&&g.respawnAt>0&&now>=g.respawnAt){
      Object.assign(g,initialGiant(id),{generation:g.generation+1});delete g.deathPosition;changed=true;
    }
  });return changed;
}
function advance(s,now){
  const since=s.moraleUpdatedAt??s.last,steps=Math.floor(Math.max(0,now-since)/600000);
  if(steps){s.morale=Math.max(0,s.morale-steps*.5);s.moraleUpdatedAt=since+steps*600000;}
  respawnGiant(s,now);
  if(now<=s.last)return s;
  const start=s.last,end=Math.min(now,start+14400000);
  for(const type of resourceTypes){
    const boostedMs=Math.max(0,Math.min(end,s.boostUntil?.[type]||0)-start);
    s[type]+=baseRate(s,type)*((end-start)+boostedMs)/60000;
  }
  s.last=now;return s;
}
function activateBonus(s,type,now){
  if(!resourceTypes.includes(type))return 'Ismeretlen termelési bónusz.';
  if(!(s.bonusInventory?.[type]>0))return 'Nincs ilyen bónuszod. Küldj ki felderítőket!';
  // Előbb elszámoljuk a korábbi időszakot: a bónusz nem hat visszamenőleg.
  const at=Math.max(now,s.last);advance(s,at);
  s.bonusInventory[type]--;
  s.boostUntil[type]=Math.max(at,s.boostUntil[type])+bonusDuration;
  return null;
}
function launchScout(s,now){
  if(s.scout)return 'A felderítőcsapat már úton van.';
  if(s.mission)return 'A felderítőket a harcoló sereg hazatérése után küldheted ki.';
  if(availableSoldiers(s)<scoutSize)return 'A felderítéshez 3 katona szükséges.';
  s.scout={started:now,searchStarts:now+scoutTravelTime,searchEnds:now+scoutTravelTime+scoutSearchTime,ends:now+scoutTravelTime*2+scoutSearchTime,soldiers:scoutSize};
  return null;
}
function resolveScout(s,now){
  if(!s.scout||now<s.scout.ends)return null;
  for(const type of resourceTypes)s.bonusInventory[type]+=scoutLoot.bonuses[type];
  s.gold+=scoutLoot.gold;s.scout=null;
  return 'A 3 felderítő hazatért! Zsákmány: 9 termelési bónusz (3 fa, 3 vas, 3 élelem) és 75 arany.';
}
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
  s.gold-=amount;s.morale=Math.min(maxMorale,(s.morale||0)+1);return null;
}
function launch(s,now,targetId){if(s.mission)return 'Már folyamatban van egy expedíció.';if(availableSoldiers(s)<1)return 'Nincs szabad katona. Képezz katonákat vagy várd meg a felderítőket!';const zombie=Number.isInteger(targetId)&&targetId>=0&&targetId<zombieCount?targetId:(s.encounters||0)%zombieCount;s.encounters=(s.encounters||0)+1;s.mission={kind:'zone',targetId:zombie,target:zombiePosition(zombie,now),soldiers:availableSoldiers(s),ends:now+15000,power:power(s),enemy:enemy(s),zone:s.zone};return null;}
function launchGiant(s,now,id=0){
  if(!Number.isInteger(id)||id<0||id>=giantTypes.length)return 'Ismeretlen óriászombi.';
  const giant=getGiant(s,id),rules=rulesForGiant(id);
  if(s.mission)return 'A katonák már bevetésen vannak.';
  respawnGiant(s,now);
  if(giant.hp<=0)return 'Az óriászombi 5 perccel a halála után éled újra.';
  if(availableSoldiers(s)<1)return 'Az óriás megtámadásához legalább 1 szabad katona szükséges.';
  const strength=power(s);
  s.mission={kind:'giant',giantId:id,target:giantPosition(s,now,id),soldiers:availableSoldiers(s),ends:now+15000,power:strength,enemy:rules.power,giantHpAtStart:giant.hp,damageTotal:Math.min(giant.hp,strength),damageDealt:0,appliedTicks:0};
  return null;
}
function applyGiantDamage(s,now){
  const m=s.mission;if(!m||m.kind!=='giant')return 0;
  const giant=getGiant(s,m.giantId??0);
  // Öt találat a 6–10,5. másodperc között. A mentett találatszám kizárja a dupla sebzést.
  const ticks=Math.max(0,Math.min(5,Math.floor((now-(m.ends-15000)-6000)/900)));
  if(ticks<=m.appliedTicks)return 0;
  const total=Math.floor(m.damageTotal*ticks/5),damage=Math.min(giant.hp,Math.max(0,total-m.damageDealt));
  giant.hp-=damage;m.damageDealt+=damage;m.appliedTicks=ticks;
  if(giant.hp===0&&damage>0){
    const killingTick=Math.ceil(m.giantHpAtStart*5/m.damageTotal);
    giant.respawnAt=m.ends-15000+6000+killingTick*900+giantRules.respawnTime;
    giant.deathPosition=m.target||giantPosition(s,now,m.giantId??0);
  }
  return damage;
}
function resolve(s,now){
  applyGiantDamage(s,now);
  if(!s.mission||now<s.mission.ends){respawnGiant(s,now);return null;}
  const m=s.mission,deployed=m.soldiers??s.soldiers;
  if(m.kind==='giant'){
    const id=m.giantId??0,giant=getGiant(s,id),rules=rulesForGiant(id);
    const win=giant.hp===0;
    const loss=Math.min(deployed,Math.max(1,Math.ceil(deployed*(win?.12:.25))));
    s.soldiers-=loss;s.mission=null;
    if(win&&!giant.rewardClaimed){
      for(const [type,amount] of Object.entries(rules.loot))s[type]+=amount;
      giant.rewardClaimed=true;respawnGiant(s,now);
      return `Az óriászombi elesett! Zsákmány: ${rules.loot.gold} arany, ${rules.loot.wood} fa, ${rules.loot.metal} vas, ${rules.loot.food} élelem. Veszteség: ${loss} katona.`;
    }
    return `Az óriászombi ${m.damageDealt} sebzést kapott. Életereje: ${giantPercent(s,id)}%. A sérülése megmarad a következő támadásra. Veszteség: ${loss} katona.`;
  }
  const win=m.power>=m.enemy,loss=Math.min(s.soldiers,Math.max(1,Math.ceil(deployed*(win?.12:.35))));
  s.soldiers-=loss;
  if(win){s.wood+=100+m.zone*35;s.metal+=60+m.zone*20;s.food+=80+m.zone*25;s.gold=(s.gold||0)+goldReward(m.zone);s.zone++;s.wins++;}
  s.mission=null;
  return win?`Győzelem a(z) ${m.zone}. körzetben! A zombik zsákmánya: +${goldReward(m.zone)} arany és nyersanyagok. Veszteség: ${loss} katona.`:`Visszavonulás a(z) ${m.zone}. körzetből. Veszteség: ${loss} katona. Erősítsd meg a sereget!`;
}
const api={zombieCount,mapBounds,giantTypes,giantNames,rulesForGiant,getGiant,hills,lake,terrainHeight,inLake,zombiePosition,giantPosition,respawnGiant,normalZombiePower,giantRules,initialGiant,giantPercent,launchGiant,applyGiantDamage,resourceTypes,baseProduction,baseRate,productionRate,scoutSize,scoutTravelTime,scoutSearchTime,scoutLoot,bonusDuration,availableSoldiers,launchScout,resolveScout,activateBonus,buildings,trainingCost,maxMorale,resourcesPerGold,initial,migrate,cost,moraleBonus,moraleCost,goldReward,quote,power,enemy,advance,upgrade,train,boostMorale,launch,resolve};if(typeof module!=='undefined')module.exports=api;else root.Engine=api;
})(globalThis);
