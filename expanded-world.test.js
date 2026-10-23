const {test}=require('node:test');const assert=require('node:assert/strict');const E=require('./engine');
test('map has four times the original playable area and exactly eight rare giant tiers',()=>{
 assert.equal(E.mapBounds.width*E.mapBounds.depth,4*84*56);assert.equal(E.zombieCount,44);assert.deepEqual(E.giantTypes,[100,120,140,160,180,200,210,220]);const s=E.initial();assert.equal(s.giants.length,8);
 s.giants.forEach((g,id)=>{const r=E.rulesForGiant(id);assert.equal(r.power,95*E.giantTypes[id]);assert.equal(g.hp,r.power);});
});
test('attacking a chosen giant saves only its own damage and snapshot target',()=>{
 let s=E.initial(),t=s.last,before=s.giants.map(g=>g.hp);assert.equal(E.launchGiant(s,t,7),null);assert.equal(s.mission.enemy,20900);assert.equal(s.mission.giantId,7);const target=structuredClone(s.mission.target);
 assert.deepEqual(E.giantPosition(s,t+8000,7),target);assert.notDeepEqual(E.giantPosition(s,t,6),E.giantPosition(s,t+8000,6));E.resolve(s,t+7800);
 assert.equal(s.giants[7].hp,20900-38);s=E.migrate(JSON.parse(JSON.stringify(s)));E.resolve(s,t+15000);assert.equal(s.giants[7].hp,20900-95);assert.deepEqual(s.giants.slice(0,7).map(g=>g.hp),before.slice(0,7));assert.equal(s.gold,0);
});
test('different giants grant independent scaled loot once and independently respawn',()=>{
 let s=E.initial(),t=s.last;s.giants[2].hp=1;E.launchGiant(s,t,2);E.resolve(s,t+15000);assert.equal(s.gold,2100);const at=s.giants[2].respawnAt;
 s.giants[5].hp=1;E.launchGiant(s,t+16000,5);E.resolve(s,t+31000);assert.equal(s.gold,5100);E.advance(s,at);assert.equal(s.giants[2].hp,13300);assert.equal(s.giants[5].hp,0);E.advance(s,at+16000);assert.equal(s.giants[5].hp,19000);assert.equal(s.gold,5100);
});
test('legacy giant injuries migrate proportionally without losing the settlement or resetting twice',()=>{
 const s=E.initial();delete s.giants;s.giant={hp:475,rewardClaimed:false,generation:2,respawnAt:0};s.gold=123;s.zone=7;E.migrate(s);assert.equal(s.giant.hp,4750);assert.equal(s.giants.length,8);assert.equal(s.gold,123);assert.equal(s.zone,7);const reloaded=E.migrate(JSON.parse(JSON.stringify(s)));assert.equal(reloaded.giant.hp,4750);assert.equal(reloaded.giant,reloaded.giants[0]);
});
test('every giant patrol stays in bounds and on dry land; hills have actual elevations',()=>{
 const s=E.initial();s.giants.forEach((g,id)=>{for(let t=0;t<600000;t+=9000){const p=E.giantPosition(s,t,id);assert.ok(p.x>E.mapBounds.minX&&p.x<E.mapBounds.maxX&&p.z>E.mapBounds.minZ&&p.z<E.mapBounds.maxZ);assert.ok(!E.inLake(p.x,p.z,2));}});
 assert.equal(E.terrainHeight(-16,0),0);for(const h of E.hills)assert.equal(E.terrainHeight(h.x,h.z),h.h);assert.ok(E.terrainHeight(E.lake.x,E.lake.z)<0);
});
test('invalid giant target fails without changing progress',()=>{const s=E.initial(),before=structuredClone(s);assert.ok(E.launchGiant(s,s.last,8));assert.ok(E.launchGiant(s,s.last,-1));assert.deepEqual(s,before);});
