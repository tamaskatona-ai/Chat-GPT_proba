const {test}=require('node:test');const assert=require('node:assert/strict');
const {patrolPosition}=require('./world3d');
test('roaming zombies move over time and stay outside the base and buildings',()=>{
 for(let i=0;i<11;i++){
  const first=patrolPosition(i,0),next=patrolPosition(i,10);assert.notDeepEqual(first,next);
  for(let t=0;t<600;t+=7){const p=patrolPosition(i,t);assert.ok(p.x>=16.7&&p.x<=31.3);assert.ok(Math.abs(p.z)<=6.2);}
 }
});
