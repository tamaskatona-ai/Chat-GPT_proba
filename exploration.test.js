const {test}=require('node:test');const assert=require('node:assert/strict');const E=require('./engine');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('iron production starts at 176 per minute and scales with the building level',()=>{
  const s=E.initial(),start=s.last,metal=s.metal;assert.equal(E.productionRate(s,'metal',start),176);
  E.advance(s,start+60000);near(s.metal,metal+176);
  s.levels.mine=2;assert.equal(E.productionRate(s,'metal',s.last),352);
  E.advance(s,start+120000);near(s.metal,metal+528);
});
test('scouting needs three free soldiers, reserves them, and prevents duplicate launches',()=>{
  const s=E.initial(),now=s.last;s.soldiers=2;let before=structuredClone(s);
  assert.ok(E.launchScout(s,now));assert.deepEqual(s,before);
  s.soldiers=8;assert.equal(E.launchScout(s,now),null);
  assert.equal(s.soldiers,8);assert.equal(E.availableSoldiers(s),5);assert.equal(E.power(s),65);
  assert.equal(s.scout.searchEnds-s.scout.searchStarts,300000);
  assert.equal(s.scout.ends-now,320000);
  before=structuredClone(s);assert.ok(E.launchScout(s,now));assert.deepEqual(s,before);
});
test('scouting can leave zero fighters while recruitment remains available',()=>{
  const s=E.initial();s.soldiers=3;E.launchScout(s,s.last);
  assert.equal(E.availableSoldiers(s),0);assert.ok(E.launch(s,s.last));
  assert.equal(E.train(s),null);assert.equal(E.availableSoldiers(s),5);
  assert.equal(E.launch(s,s.last),null);assert.equal(s.mission.soldiers,5);
});
test('scouts finish only after the search and return trip and grant nine stored bonuses once',()=>{
  const s=E.initial(),now=s.last;E.launchScout(s,now);
  assert.equal(E.resolveScout(s,now+310000),null);assert.equal(E.resolveScout(s,now+319999),null);
  const restored=E.migrate(JSON.parse(JSON.stringify(s)));
  assert.match(E.resolveScout(restored,now+320000),/75 arany/);
  assert.equal(restored.gold,75);assert.equal(restored.soldiers,8);assert.equal(E.availableSoldiers(restored),8);
  assert.deepEqual(restored.bonusInventory,{wood:3,metal:3,food:3});
  assert.deepEqual(restored.boostUntil,{wood:0,metal:0,food:0});
  assert.equal(E.resolveScout(restored,now+400000),null);assert.equal(restored.gold,75);
  assert.equal(E.launchScout(restored,now+400000),null);
});
test('combat uses only non-scout soldiers and its casualties stay stable if scouts return mid-battle',()=>{
  const s=E.initial(),now=s.last;E.launchScout(s,now);
  E.launch(s,now+315000);assert.equal(s.mission.soldiers,5);assert.equal(s.mission.power,65);
  assert.ok(E.launchScout(s,now+316000));
  E.resolveScout(s,now+320000);assert.equal(s.mission.power,65);
  E.resolve(s,now+330000);assert.equal(s.soldiers,6);assert.equal(s.gold,75);
});
test('scouts cannot take soldiers already deployed on a combat mission',()=>{
  const s=E.initial();E.launch(s,s.last);const before=structuredClone(s);
  assert.ok(E.launchScout(s,s.last));assert.deepEqual(s,before);
});
test('a bonus doubles only its selected resource and never retroactively boosts production',()=>{
  const s=E.initial(),now=s.last,metal=s.metal,wood=s.wood;s.bonusInventory.metal=1;
  assert.equal(E.activateBonus(s,'metal',now+60000),null);near(s.metal,metal+176);
  assert.equal(s.bonusInventory.metal,0);assert.equal(E.productionRate(s,'metal',now+60000),352);
  E.advance(s,now+120000);near(s.metal,metal+528);near(s.wood,wood+211.2);
  assert.equal(E.productionRate(s,'wood',now+120000),105.6);
});
test('production integrates expiry in the middle of an offline interval',()=>{
  const s=E.initial(),now=s.last,metal=s.metal;s.boostUntil.metal=now+30000;
  E.advance(s,now+60000);near(s.metal,metal+264);
  assert.equal(E.productionRate(s,'metal',now+60000),176);
});
test('reactivating a bonus extends time, does not quadruple output, and persists across reloads',()=>{
  let s=E.initial();const now=s.last;s.bonusInventory.metal=2;
  E.activateBonus(s,'metal',now);E.activateBonus(s,'metal',now+60000);
  assert.equal(s.boostUntil.metal,now+600000);assert.equal(s.bonusInventory.metal,0);
  assert.equal(E.productionRate(s,'metal',now+60000),352);
  s=E.migrate(JSON.parse(JSON.stringify(s)));E.advance(s,now+660000);
  near(s.metal,150+352*10+176);
  assert.equal(E.productionRate(s,'metal',now+660000),176);
});
test('offline cap includes only the real boosted interval and clocks cannot duplicate production',()=>{
  const s=E.initial(),now=s.last;s.boostUntil.metal=now+300000;
  E.advance(s,now+86400000);near(s.metal,150+176*245);
  const before=structuredClone(s);E.advance(s,now);assert.deepEqual(s,before);
});
test('empty and unknown bonus activations never spend resources or inventory',()=>{
  const s=E.initial(),before=structuredClone(s);
  assert.ok(E.activateBonus(s,'metal',s.last+60000));assert.deepEqual(s,before);
  assert.ok(E.activateBonus(s,'gold',s.last+60000));assert.deepEqual(s,before);
});
test('legacy saves gain empty exploration fields without changing their money or army',()=>{
  const s=E.initial();delete s.scout;delete s.bonusInventory;delete s.boostUntil;
  s.gold=222;s.soldiers=15;E.migrate(s);
  assert.equal(s.scout,null);assert.equal(s.gold,222);assert.equal(s.soldiers,15);
  assert.deepEqual(s.bonusInventory,{wood:0,metal:0,food:0});
  assert.deepEqual(s.boostUntil,{wood:0,metal:0,food:0});
});
