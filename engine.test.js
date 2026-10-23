const {test}=require('node:test');const assert=require('node:assert/strict');const E=require('./engine');
test('production credits elapsed time, capped at four hours',()=>{const s=E.initial();const old=s.wood;E.advance(s,s.last+60000);assert.equal(s.wood,old+105.6);const before=s.food;E.advance(s,s.last+86400000);assert.equal(s.food,before+14400);});
test('upgrades spend resources and respect HQ level gate',()=>{const s=E.initial();assert.equal(E.upgrade(s,'farm'),null);assert.equal(s.levels.farm,2);assert.equal(s.wood,175);assert.ok(E.upgrade(s,'farm'));assert.equal(s.levels.farm,2);});
test('training cannot spend unavailable resources',()=>{const s=E.initial();s.food=0;assert.ok(E.train(s));assert.equal(s.soldiers,8);s.food=50;assert.equal(E.train(s),null);assert.equal(s.soldiers,13);});
test('expedition resolves once, rewards victory and prevents concurrent actions',()=>{const s=E.initial(),now=s.last;assert.equal(E.launch(s,now),null);assert.ok(E.launch(s,now));assert.ok(E.train(s));assert.ok(E.upgrade(s,'wall'));assert.equal(E.resolve(s,now+14000),null);assert.match(E.resolve(s,now+15000),/Győzelem/);assert.equal(s.zone,2);assert.equal(s.soldiers,7);assert.equal(E.resolve(s,now+20000),null);});
test('defeat costs soldiers without granting rewards or advancing zone',()=>{const s=E.initial();s.soldiers=1;const wood=s.wood;E.launch(s,s.last);assert.match(E.resolve(s,s.last+15000),/Visszavonulás/);assert.equal(s.soldiers,0);assert.equal(s.zone,1);assert.equal(s.wood,wood);});

test('winning zombies grants gold once; defeats and passive production grant none',()=>{
  const s=E.initial();E.launch(s,s.last);E.resolve(s,s.last+15000);
  assert.equal(s.gold,35);E.resolve(s,s.last+16000);assert.equal(s.gold,35);
  E.advance(s,s.last+60000);assert.equal(s.gold,35);
  s.soldiers=1;E.launch(s,s.last);E.resolve(s,s.last+15000);assert.equal(s.gold,35);
});
test('morale purchases are persistent soldier bonuses, not wall multipliers',()=>{
  const s=E.initial();s.gold=300;assert.equal(E.power(s),95);
  assert.equal(E.boostMorale(s),null);assert.equal(s.gold,270);assert.equal(s.morale,1);
  assert.equal(E.power(s),103);assert.equal(E.moraleCost(s),60);
  assert.equal(E.boostMorale(s),null);assert.equal(s.gold,210);assert.equal(E.power(s),111);
  const restored=E.migrate(JSON.parse(JSON.stringify(s)));assert.equal(E.power(restored),111);
});
test('morale cannot exceed its cap, overdraw gold, or change during a mission',()=>{
  const s=E.initial();let before=structuredClone(s);assert.ok(E.boostMorale(s));assert.deepEqual(s,before);
  s.gold=1000;E.launch(s,s.last);before=structuredClone(s);assert.ok(E.boostMorale(s));assert.deepEqual(s,before);
  E.resolve(s,s.last+15000);for(let i=0;i<5;i++)assert.equal(E.boostMorale(s),null);
  assert.equal(s.morale,5);before=structuredClone(s);assert.ok(E.boostMorale(s));assert.deepEqual(s,before);
});
test('resource substitution needs opt-in and charges only the combined shortage',()=>{
  const s=E.initial();s.wood=40;s.metal=10;s.gold=10;
  assert.deepEqual(E.quote(s,E.cost(s,'farm')),{missing:{wood:5,metal:5},gold:1,canAfford:true});
  const before=structuredClone(s);assert.ok(E.upgrade(s,'farm'));assert.deepEqual(s,before);
  assert.equal(E.upgrade(s,'farm',true),null);assert.equal(s.gold,9);assert.equal(s.wood,0);assert.equal(s.metal,0);assert.equal(s.levels.farm,2);
});
test('gold covers missing food and metal for training, with upward rounding',()=>{
  const s=E.initial();s.food=35;s.metal=19;s.gold=8;
  assert.equal(E.quote(s,E.trainingCost).gold,2);
  assert.equal(E.train(s,true),null);assert.equal(s.gold,6);assert.equal(s.soldiers,13);assert.equal(s.food,0);assert.equal(s.metal,0);
});
test('insufficient gold causes no partial spending; gold cannot bypass HQ or missions',()=>{
  const s=E.initial();s.food=0;s.metal=0;s.gold=6;
  let before=structuredClone(s);assert.ok(E.train(s,true));assert.deepEqual(s,before);
  s.gold=1000;s.levels.farm=2;before=structuredClone(s);assert.ok(E.upgrade(s,'farm',true));assert.deepEqual(s,before);
  E.launch(s,s.last);before=structuredClone(s);assert.ok(E.train(s,true));assert.ok(E.upgrade(s,'hq',true));assert.deepEqual(s,before);
});
test('full resource payment never consumes gold even with substitution enabled',()=>{
  const s=E.initial();s.gold=50;assert.equal(E.train(s,true),null);assert.equal(s.gold,50);
  assert.equal(E.upgrade(s,'farm',true),null);assert.equal(s.gold,50);
});
test('legacy saves receive empty gold and neutral morale without losing progress',()=>{
  const s=E.initial();delete s.gold;delete s.morale;s.zone=4;s.wins=3;s.soldiers=22;
  E.launch(s,s.last);const saved=structuredClone(s);E.migrate(s);
  assert.equal(s.gold,0);assert.equal(s.morale,0);assert.equal(s.zone,4);assert.equal(s.wins,3);assert.equal(s.soldiers,22);assert.deepEqual(s.mission,saved.mission);
  assert.equal(E.power(s),235);
});
