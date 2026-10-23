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

test('scout graphics search for a full five minutes between outbound and return animations',()=>{
  const E=require('./engine'),{scoutView}=require('./scene'),s=E.initial(),now=s.last;
  E.launchScout(s,now);
  assert.equal(scoutView(s.scout,now).phase,'outbound');
  assert.equal(scoutView(s.scout,now+5000).travel,.5);
  assert.equal(scoutView(s.scout,now+10000).phase,'search');
  assert.equal(scoutView(s.scout,now+309999).phase,'search');
  assert.equal(scoutView(s.scout,now+310000).phase,'return');
  assert.equal(scoutView(s.scout,now+315000).travel,.5);
  assert.equal(scoutView(s.scout,now+320000).phase,'done');
  assert.equal(scoutView(s.scout,now+320000).travel,0);
  assert.equal(scoutView(null,now).phase,'idle');
});

test('finishing a wounded giant is shown as victory even below its original full strength',()=>{
  const E=require('./engine'),s=E.initial();s.giant.hp=40;E.launchGiant(s,s.last);
  assert.ok(s.mission.power<s.mission.enemy);assert.equal(missionView(s.mission,s.last+12000).win,true);
  E.resolve(s,s.last+15000);assert.equal(s.giant.rewardClaimed,true);
});
