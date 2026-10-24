'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),E=require('./engine'),{validateSave}=require('./cloud-saves'),{createWorld}=require('./multiplayer');
test('lumber production is tenfold, scales with level and doubles under the existing temporary bonus',()=>{
 const s=E.initial(),now=s.last;s.levels.sawmill=3;assert.equal(E.baseProduction.wood,1056);assert.equal(E.productionRate(s,'wood',now),3168);
 s.bonusInventory.wood=1;E.activateBonus(s,'wood',now);assert.equal(E.productionRate(s,'wood',now),6336);const wood=s.wood;E.advance(s,now+60000);assert.equal(s.wood,wood+6336);
});
test('partial NPC casualties survive reload, the next siege kills the survivors and loot is awarded once',()=>{
 let s=E.initial(),now=s.last;const d=E.npcCityDefinitions[0],gold=s.gold,zone=s.zone;
 assert.equal(E.launchNpc(s,now,0),null);assert.equal(E.resolve(s,now+14999),null);assert.equal(s.npcCities[0].guards,12);
 const first=E.resolve(s,now+15000);assert.match(first,/visszavonult/);assert.equal(s.npcCities[0].guards,2);assert.equal(s.npcCities[0].killed,10);assert.equal(s.npcKills,10);assert.equal(s.soldiers,5);assert.equal(s.gold,gold);
 s=validateSave(JSON.parse(JSON.stringify(s)));assert.equal(s.npcCities[0].guards,2);assert.equal(E.launchNpc(s,now+16000,0),null);assert.match(E.resolve(s,now+31000),/elfoglaltad/);
 assert.equal(s.npcCities[0].guards,0);assert.equal(s.npcCities[0].killed,12);assert.equal(s.npcKills,12);assert.equal(s.gold,gold+d.loot.gold);assert.equal(s.zone,zone);
 assert.equal(E.resolve(s,now+999999),null);assert.equal(s.gold,gold+d.loot.gold);assert.match(E.launchNpc(s,now+999999,0),/már elfoglaltad/);
});
test('NPC missions persist mid-siege, reject invalid targets and protect scouting soldiers',()=>{
 const s=E.initial(),now=s.last;assert.ok(E.launchNpc(s,now,-1));assert.ok(E.launchNpc(s,now,0.5));assert.equal(s.mission,null);
 E.launchScout(s,now);E.launchNpc(s,now,5);assert.equal(s.mission.soldiers,5);assert.ok(E.launchNpc(s,now,0));
 const restored=validateSave(JSON.parse(JSON.stringify(s)));assert.equal(restored.mission.npcId,5);E.resolve(restored,now+15000);assert.ok(restored.soldiers>=3);assert.equal(restored.scout.soldiers,3);assert.equal(restored.npcCities[5].guards,478);
});
test('old saves acquire untouched NPC cities without resetting existing progress; corrupted counters are rejected',()=>{
 const s=E.initial();s.levels.hq=9;s.gold=5432;delete s.npcCities;delete s.npcKills;const migrated=validateSave(s);assert.equal(migrated.levels.hq,9);assert.equal(migrated.gold,5432);assert.equal(migrated.npcCities.length,6);
 migrated.npcCities[0].killed=500;assert.throws(()=>validateSave(migrated),/érvényes/);
});
test('online NPC attacks use server strength and persist losses without granting loot twice',()=>{
 const w=createWorld(),now=Date.now(),p=w.join('NPC tester',null,now).player;
 w.action(p,{type:'npc',id:0,power:1e20,soldiers:100000},now);assert.equal(p.state.mission.power,95);w.tick(now+15000);assert.equal(p.state.npcCities[0].guards,2);assert.equal(p.state.gold,0);
 const restored=createWorld(JSON.parse(JSON.stringify(w.data))),r=restored.data.players[0];restored.action(r,{type:'npc',id:0},now+16000);restored.tick(now+31000);assert.equal(r.state.gold,200);restored.tick(now+90000);assert.equal(r.state.gold,200);assert.equal(r.state.npcKills,12);
});
