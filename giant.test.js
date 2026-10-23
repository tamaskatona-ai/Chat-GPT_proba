const {test}=require('node:test');const assert=require('node:assert/strict');const E=require('./engine');
test('giant has the strength of one hundred basic zombies and its own full health',()=>{
 const s=E.initial();assert.equal(E.giantRules.power,100*E.normalZombiePower);assert.equal(E.giantPercent(s),100);assert.equal(s.giant.hp,9500);
});
test('giant damage happens during combat, is saved, and cannot be applied twice',()=>{
 let s=E.initial(),now=s.last;assert.equal(E.launchGiant(s,now),null);
 assert.equal(E.resolve(s,now+6000),null);assert.equal(s.giant.hp,9500);
 E.resolve(s,now+6900);assert.equal(s.giant.hp,9481);assert.equal(s.mission.damageDealt,19);
 E.resolve(s,now+6900);assert.equal(s.giant.hp,9481);
 s=E.migrate(JSON.parse(JSON.stringify(s)));E.resolve(s,now+6900);assert.equal(s.giant.hp,9481);
 E.resolve(s,now+10500);assert.equal(s.giant.hp,9405);assert.equal(E.giantPercent(s),99);
 const gold=s.gold;assert.match(E.resolve(s,now+15000),/sérülése megmarad/);
 assert.equal(s.gold,gold);assert.equal(s.giant.hp,9405);assert.equal(s.soldiers,6);assert.equal(s.zone,1);
});
test('multiple weaker armies can cumulatively kill the giant and earn the full loot exactly once',()=>{
 let s=E.initial(),now=s.last;
 for(let i=0;i<100;i++){
  s.soldiers=8;assert.equal(E.launchGiant(s,now),null);E.resolve(s,now+15000);
  s=E.migrate(JSON.parse(JSON.stringify(s)));now+=16000;
 }
 assert.equal(s.giant.hp,0);assert.equal(E.giantPercent(s),0);assert.equal(s.giant.rewardClaimed,true);
 assert.equal(s.gold,1500);assert.equal(s.wood,220+2400);assert.equal(s.metal,150+1800);assert.equal(s.food,160+2000);
 const before=structuredClone(s);assert.equal(E.resolve(s,now+60000),null);assert.ok(E.launchGiant(s,now));assert.deepEqual(s,before);
});
test('a finishing blow works even if army power is lower than the full-strength giant',()=>{
 const s=E.initial();s.giant.hp=45;E.launchGiant(s,s.last);assert.equal(s.mission.enemy,9500);
 assert.match(E.resolve(s,s.last+15000),/óriászombi elesett/);assert.equal(s.gold,1500);assert.equal(s.giant.hp,0);
});
test('giant fights cannot overlap normal battles and reserve scout soldiers correctly',()=>{
 const s=E.initial(),now=s.last;E.launchScout(s,now);E.launchGiant(s,now);
 assert.equal(s.mission.soldiers,5);assert.equal(s.mission.power,65);
 let before=structuredClone(s);assert.ok(E.launch(s,now));assert.ok(E.launchGiant(s,now));assert.ok(E.train(s));assert.deepEqual(s,before);
 E.resolveScout(s,now+320000);E.resolve(s,now+330000);assert.equal(s.soldiers,6);assert.equal(s.gold,75);assert.equal(s.giant.hp,9435);
});
test('empty armies cannot attack the giant and failed commands never mutate state',()=>{
 const s=E.initial();s.soldiers=0;const before=structuredClone(s);assert.ok(E.launchGiant(s,s.last));assert.deepEqual(s,before);
});
test('a saved fight completed offline applies only its pending damage before settling losses',()=>{
 let s=E.initial(),now=s.last;E.launchGiant(s,now);E.resolve(s,now+7800);assert.equal(s.giant.hp,9462);
 s=E.migrate(JSON.parse(JSON.stringify(s)));E.resolve(s,now+600000);assert.equal(s.giant.hp,9405);assert.equal(s.soldiers,6);
 E.resolve(s,now+700000);assert.equal(s.giant.hp,9405);assert.equal(s.soldiers,6);
});
test('older saves gain a fresh giant without resetting any player progress',()=>{
 const s=E.initial();delete s.giant;s.gold=777;s.zone=4;E.migrate(s);assert.equal(s.giant.hp,9500);assert.equal(s.gold,777);assert.equal(s.zone,4);
});
test('a killing hit saved before the return trip grants its reward once after reloading',()=>{
 let s=E.initial(),now=s.last;s.giant.hp=40;E.launchGiant(s,now);
 assert.equal(E.resolve(s,now+10500),null);assert.equal(s.giant.hp,0);assert.equal(s.gold,0);assert.equal(s.giant.rewardClaimed,false);
 s=E.migrate(JSON.parse(JSON.stringify(s)));E.resolve(s,now+15000);assert.equal(s.gold,1500);assert.equal(s.giant.rewardClaimed,true);
 s=E.migrate(JSON.parse(JSON.stringify(s)));E.resolve(s,now+60000);assert.equal(s.gold,1500);
});
