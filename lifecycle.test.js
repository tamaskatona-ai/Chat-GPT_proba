const {test}=require('node:test');const assert=require('node:assert/strict');const E=require('./engine');
test('morale drops exactly five points every ten minutes, survives reload, and never goes negative',()=>{
 let s=E.initial(),t=s.last;s.morale=5;s.gold=1000;E.advance(s,t+599999);assert.equal(E.moraleBonus(s),50);
 E.advance(s,t+600000);assert.equal(E.moraleBonus(s),45);s=E.migrate(JSON.parse(JSON.stringify(s)));
 E.advance(s,t+1199999);assert.equal(E.moraleBonus(s),45);E.advance(s,t+1200000);assert.equal(E.moraleBonus(s),40);
 E.advance(s,t+86400000);assert.equal(E.moraleBonus(s),0);assert.equal(E.boostMorale(s),null);assert.equal(E.moraleBonus(s),10);
});
test('giant respawns exactly five minutes after death, with new loot available each life',()=>{
 let s=E.initial(),t=s.last;s.giant.hp=1;E.launchGiant(s,t);E.resolve(s,t+15000);
 const at=s.giant.respawnAt;assert.equal(at,t+10500+300000);assert.equal(s.gold,1500);
 E.advance(s,at-1);assert.equal(s.giant.hp,0);s=E.migrate(JSON.parse(JSON.stringify(s)));E.advance(s,at);
 assert.equal(s.giant.hp,9500);assert.equal(s.giant.rewardClaimed,false);assert.equal(s.giant.generation,1);
 s.giant.hp=1;E.launchGiant(s,at);E.resolve(s,at+15000);assert.equal(s.gold,3000);
});
test('offline finishing battle settles reward before respawning, without duplicated loot',()=>{
 let s=E.initial(),t=s.last;s.giant.hp=40;E.launchGiant(s,t);E.resolve(s,t+10500);
 s=E.migrate(JSON.parse(JSON.stringify(s)));E.advance(s,t+900000);E.resolve(s,t+900000);
 assert.equal(s.gold,1500);assert.equal(s.giant.hp,9500);assert.equal(s.giant.generation,1);E.resolve(s,t+1000000);assert.equal(s.gold,1500);
});
test('mobile targets roam, freeze at the encounter location, and consecutive fights select different zombies',()=>{
 const s=E.initial(),t=s.last;assert.notDeepEqual(E.giantPosition(s,t),E.giantPosition(s,t+10000));
 E.launchGiant(s,t);const target=structuredClone(s.mission.target);assert.deepEqual(E.giantPosition(s,t+8000),target);E.resolve(s,t+15000);
 E.launch(s,t+16000);const first=structuredClone(s.mission);E.resolve(s,t+31000);E.launch(s,t+32000);
 assert.notEqual(first.targetId,s.mission.targetId);assert.notDeepEqual(first.target,s.mission.target);E.resolve(s,t+47000);
 E.launch(s,t+48000,7);assert.equal(s.mission.targetId,7);assert.deepEqual(s.mission.target,E.zombiePosition(7,t+48000));
});
