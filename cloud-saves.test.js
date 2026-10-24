const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('./engine'),{createWorld,handleRequest}=require('./multiplayer'),{validateSave}=require('./cloud-saves');
const pc='pc-device-0000000000001',phone='phone-device-000000001',password='sajat-hosszu-jelszo-2026';
function client(w){return async(path,body,token)=>{const response=await handleRequest(w,new Request('https://game.test/api/cloud/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)}));return {status:response.status,...await response.json()};};}
test('PC registration preserves the existing high-level base; phone login loads it with the same credentials',async()=>{
 const w=createWorld(),api=client(w),state=E.initial();state.levels.hq=7;state.soldiers=123;state.gold=999;state.zone=8;
 const reg=await api('register',{username:'Parancsnok',password,deviceId:pc,state});assert.equal(reg.status,201);assert.equal(reg.state.levels.hq,7);assert.equal(reg.owner,true);
 assert.ok(!JSON.stringify(w.data).includes(password));assert.ok(!JSON.stringify(w.data).includes(reg.token));
 const login=await api('login',{username:'parancsnok',password,deviceId:phone});assert.equal(login.status,200);assert.equal(login.state.soldiers,123);assert.equal(login.state.gold,999);assert.equal(login.state.levels.hq,7);
 const persisted=createWorld(JSON.parse(JSON.stringify(w.data))),again=await client(persisted)('session',{deviceId:phone},login.token);assert.equal(again.state.levels.hq,7);assert.equal(again.owner,true);
});
test('an old device and stale revision cannot overwrite the latest cloud save',async()=>{
 const w=createWorld(),api=client(w),reg=await api('register',{username:'anna',password,deviceId:pc,state:E.initial()});
 const state=structuredClone(reg.state);state.levels.hq=5;const saved=await api('save',{deviceId:pc,revision:reg.revision,state},reg.token);assert.equal(saved.status,200);
 const phoneLogin=await api('login',{username:'anna',password,deviceId:phone});assert.equal(phoneLogin.state.levels.hq,5);
 const stale=await api('save',{deviceId:pc,revision:saved.revision,state:E.initial()},reg.token);assert.equal(stale.status,409);assert.equal(stale.owner,false);
 const duplicate=await api('save',{deviceId:phone,revision:reg.revision,state:E.initial()},phoneLogin.token);assert.equal(duplicate.status,409);
 const current=await api('session',{deviceId:phone},phoneLogin.token);assert.equal(current.state.levels.hq,5);
 const takeover=await api('takeover',{deviceId:pc},reg.token);assert.equal(takeover.owner,true);assert.equal(takeover.state.levels.hq,5);
});
test('duplicate signup, bad passwords, unauthenticated access and expired logout sessions do not replace progress',async()=>{
 const w=createWorld(),api=client(w),reg=await api('register',{username:'bence',password,deviceId:pc,state:E.initial()});
 assert.equal((await api('register',{username:'bence',password,deviceId:phone,state:E.initial()})).status,409);
 assert.equal((await api('login',{username:'bence',password:'hibas-hosszu-jelszo',deviceId:phone})).status,401);
 assert.equal((await api('session',{deviceId:phone},'a'.repeat(48))).status,401);
 assert.equal((await api('logout',{},reg.token)).status,200);assert.equal((await api('session',{deviceId:pc},reg.token)).status,401);
});
test('existing authoritative multiplayer progress can be linked and resumed with the cloud account session',async()=>{
 const w=createWorld(),api=client(w),p=w.join('Anna',null,Date.now());p.player.state.levels.hq=9;p.player.state.soldiers=333;
 const reg=await api('register',{username:'online-anna',password,deviceId:pc,state:E.initial(),onlineToken:p.token});assert.equal(reg.player.id,p.player.id);
 const login=await api('login',{username:'online-anna',password,deviceId:phone});assert.equal(w.authenticate(login.token).state.levels.hq,9);assert.equal(w.authenticate(login.token).state.soldiers,333);
 const other=await api('register',{username:'other',password,deviceId:phone,state:E.initial(),onlineToken:p.token});assert.equal(other.status,409);
});
test('invalid or PvP snapshots cannot corrupt the personal cloud save or become competitive resources',async()=>{
 assert.throws(()=>validateSave({}),/érvényes/);const state=E.initial();state.gold=Infinity;assert.throws(()=>validateSave(state),/érvényes/);state.gold=0;state.mission={kind:'pvp'};assert.throws(()=>validateSave(state),/érvényes/);
 const w=createWorld(),api=client(w),reg=await api('register',{username:'karoly',password,deviceId:pc,state:E.initial()});assert.equal((await api('save',{deviceId:pc,revision:reg.revision,state:{}},reg.token)).status,400);assert.equal(w.data.accounts[0].state.soldiers,8);
});

test('downloaded HTML can import via null origin while unrelated websites remain blocked',async()=>{const w=createWorld();const request=new Request('https://game.test/api/cloud/register',{method:'POST',headers:{'Content-Type':'application/json',Origin:'null'},body:JSON.stringify({username:'file-user',password,deviceId:pc,state:E.initial()})});const response=await handleRequest(w,request);assert.equal(response.status,201);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'null');const rejected=await handleRequest(w,new Request('https://game.test/api/cloud/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.test'},body:'{}'}));assert.equal(rejected.status,403);});

test('cloud signup and login respect the production 100000-iteration crypto limit',async t=>{
 const subtle=globalThis.crypto.subtle,derive=subtle.deriveBits.bind(subtle);let calls=0;
 t.mock.method(subtle,'deriveBits',(algorithm,...args)=>{assert.ok(algorithm.iterations<=100000);calls++;return derive(algorithm,...args);});
 const world=createWorld(),api=client(world),state=E.initial();state.levels.hq=9;
 const registered=await api('register',{username:'production-compatible',password,deviceId:pc,state});assert.equal(registered.status,201);assert.equal(calls,6);
 const login=await api('login',{username:'production-compatible',password,deviceId:phone});assert.equal(login.status,200);assert.equal(login.state.levels.hq,9);assert.equal(calls,12);
 assert.equal((await api('login',{username:'production-compatible',password:'incorrect-password',deviceId:phone})).status,401);
});

test('a wounded NPC garrison and an ongoing second siege follow the account onto another device',async()=>{
 const w=createWorld(),api=client(w),state=E.initial(),now=state.last;
 E.launchNpc(state,now,0);E.resolve(state,now+15000);E.launchNpc(state,now+16000,0);
 const reg=await api('register',{username:'npc-campaign',password,deviceId:pc,state});assert.equal(reg.status,201);
 const phoneLogin=await api('login',{username:'npc-campaign',password,deviceId:phone});assert.equal(phoneLogin.status,200);assert.equal(phoneLogin.state.npcKills,10);assert.equal(phoneLogin.state.npcCities[0].guards,2);assert.equal(phoneLogin.state.mission.kind,'npc');
 const resumed=structuredClone(phoneLogin.state);E.resolve(resumed,now+31000);
 const saved=await api('save',{deviceId:phone,revision:phoneLogin.revision,state:resumed},phoneLogin.token);assert.equal(saved.status,200);
 const current=await api('session',{deviceId:phone},phoneLogin.token);assert.equal(current.state.npcCities[0].looted,true);assert.equal(current.state.npcKills,12);assert.equal(current.state.gold,200);
});
