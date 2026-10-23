const {test}=require('node:test');const assert=require('node:assert/strict');
const {missionView}=require('./scene');
const mission={ends:16000,power:120,enemy:95};
test('mission animation travels out, fights, and returns during the real mission',()=>{
  assert.equal(missionView(mission,1000).phase,'outbound');
  assert.equal(missionView(mission,1000).travel,0);
  assert.equal(missionView(mission,4000).travel,.5);
  assert.equal(missionView(mission,8000).phase,'battle');
  assert.equal(missionView(mission,8000).travel,1);
  assert.equal(missionView(mission,13000).phase,'return');
  assert.ok(missionView(mission,13000).travel<1);
  assert.equal(missionView(mission,16000).travel,0);
  assert.equal(missionView(mission,16000).phase,'done');
});
test('reloaded missions derive the same visual position from their saved end time',()=>{
  assert.deepEqual(missionView(JSON.parse(JSON.stringify(mission)),9000),missionView(mission,9000));
  assert.equal(missionView(null,9000).phase,'idle');
  assert.equal(missionView(mission,0).progress,0);
  assert.equal(missionView(mission,20000).progress,1);
});
test('visual battle outcome matches actual army and enemy strengths',()=>{
  assert.equal(missionView(mission,8000).win,true);
  assert.equal(missionView({...mission,power:50},8000).win,false);
});
