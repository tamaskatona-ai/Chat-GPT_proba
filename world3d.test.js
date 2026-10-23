const {test}=require('node:test');const assert=require('node:assert/strict');const E=require('./engine');
test('all roaming zombies move within the larger map, outside the base and lake',()=>{
 for(let i=0;i<E.zombieCount;i++){
  assert.notDeepEqual(E.zombiePosition(i,0),E.zombiePosition(i,10000));
  for(let t=0;t<600000;t+=7000){const p=E.zombiePosition(i,t);assert.ok(p.x>=E.mapBounds.minX&&p.x<=E.mapBounds.maxX);assert.ok(p.z>=E.mapBounds.minZ&&p.z<=E.mapBounds.maxZ);assert.ok(!(p.x>-34&&p.x<0&&Math.abs(p.z)<17));assert.ok(!E.inLake(p.x,p.z,1));}
 }
});
