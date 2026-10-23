const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createWorld,handleRequest,RULES}=require('./multiplayer');const {createServer}=require('./server');
const T=1000000;
function pair(){const w=createWorld(),a=w.join('Anna',null,T),b=w.join('Bence',a.player.room,T);return {w,a:a.player,b:b.player,at:a.token,bt:b.token};}
test('real players share an invite room, credentials remain private and other rooms stay invisible',()=>{
 const {w,a,b,at,bt}=pair(),c=w.join('Csilla',null,T).player;assert.equal(w.authenticate(at),a);assert.equal(w.authenticate(bt),b);const view=w.view(a,T);assert.deepEqual(view.players.map(p=>p.name),['Bence']);assert.ok(!JSON.stringify(view).includes(at));assert.ok(!JSON.stringify(view).includes(b.tokenHash));assert.throws(()=>w.action(a,{type:'attack',targetId:c.id},T),/Érvénytelen/);assert.throws(()=>w.authenticate('a'.repeat(48)),/nem található/);
});
test('PvP resolves once on the server, applies both casualties and conserves stolen resources',()=>{
 const {w,a,b}=pair(),zone=a.state.zone;w.action(a,{type:'attack',targetId:b.id},T);assert.equal(a.state.mission.kind,'pvp');assert.equal(b.incoming.attackerId,a.id);assert.throws(()=>w.action(b,{type:'train'},T),/védekezik/);
 w.tick(T+14999);assert.ok(a.state.mission);w.tick(T+15000);assert.equal(a.state.mission,null);assert.equal(b.incoming,null);assert.equal(a.state.soldiers,6);assert.equal(b.state.soldiers,6);assert.equal(a.state.zone,zone);assert.equal(a.reports.length,1);assert.deepEqual(a.reports,b.reports);
 const loot=a.reports[0].loot;assert.equal(loot.gold,0);assert.ok(Math.abs(a.state.wood+b.state.wood-(440+2*105.6*.25))<1e-8);assert.equal(loot.wood,Math.floor((220+105.6*.25)*.1));const soldiers=a.state.soldiers;w.tick(T+20000);assert.equal(a.reports.length,1);assert.equal(a.state.soldiers,soldiers);
 assert.throws(()=>w.action(a,{type:'attack',targetId:b.id},T+20000),/pihen/);w.tick(T+60000);assert.throws(()=>w.action(a,{type:'attack',targetId:b.id},T+60000),/csatavédelem/);
});
test('losing an attack gives no fabricated loot, scouts are not deployed or killed',()=>{
 const {w,a,b}=pair();w.action(a,{type:'scout'},T);b.state.soldiers=50;const gold=a.state.gold;w.action(a,{type:'attack',targetId:b.id},T);assert.equal(a.state.mission.soldiers,5);w.tick(T+15000);assert.equal(a.state.soldiers,6);assert.equal(a.state.scout.soldiers,3);assert.equal(a.state.gold,gold);assert.equal(a.reports[0].win,false);assert.deepEqual(a.reports[0].loot,{wood:0,metal:0,food:0,gold:0});
});
test('snapshot strengths cannot change during combat, self/concurrent/empty attacks fail',()=>{
 const {w,a,b}=pair();assert.throws(()=>w.action(a,{type:'attack',targetId:a.id},T),/Érvénytelen/);a.state.soldiers=4;assert.throws(()=>w.action(a,{type:'attack',targetId:b.id},T),/legalább 5/);a.state.soldiers=8;w.action(a,{type:'attack',targetId:b.id},T);assert.throws(()=>w.action(a,{type:'attack',targetId:b.id},T),/bevetésen/);assert.throws(()=>w.action(a,{type:'train'},T),/expedíción/);
});
test('persisted pending raids settle once after restart and retain independent PvE progress',()=>{
 const {w,a,b,at,bt}=pair();w.action(a,{type:'attack',targetId:b.id},T);const restored=createWorld(JSON.parse(JSON.stringify(w.data)));restored.tick(T+500000);const pa=restored.authenticate(at),pb=restored.authenticate(bt);assert.equal(pa.reports.length,1);assert.equal(pb.state.soldiers,6);restored.tick(T+600000);assert.equal(pa.reports.length,1);assert.equal(pa.state.zone,1);assert.equal(pa.state.giants.length,8);
});
test('forged resources and clocks are ignored; server-side PvE commands and validation are enforced',()=>{
 const {w,a}=pair();w.action(a,{type:'train',state:{gold:999999,soldiers:9999},now:T+999999999},T);assert.equal(a.state.soldiers,13);assert.equal(a.state.gold,0);assert.equal(a.state.food,110);assert.throws(()=>w.action(a,{type:'upgrade',id:'__proto__'},T),/épület/);w.action(a,{type:'giant',id:7},T);w.tick(T+15000);assert.equal(a.state.giants[7].hp,20900-145);assert.equal(a.state.giants[0].hp,9500);
});
test('names, room capacity, unknown rooms and duplicates are validated',()=>{
 const {w,a}=pair();assert.throws(()=>w.join('<script>',null,T),/név|neve/);assert.throws(()=>w.join('Anna',a.room,T),/foglalt/);assert.throws(()=>w.join('Valaki','AAAAAA',T),/szoba/);for(let i=0;i<6;i++)w.join('Játékos '+i,a.room,T);assert.throws(()=>w.join('Kilencedik',a.room,T),/megtelt/);
});
test('HTTP API authenticates, validates JSON and CORS and never returns cacheable state',async()=>{
 const w=createWorld();let response=await handleRequest(w,new Request('https://game.test/api/players',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Anna'})}),{now:T});assert.equal(response.status,201);const data=await response.json();
 response=await handleRequest(w,new Request('https://game.test/api/state',{headers:{Authorization:'Bearer '+data.token}}),{now:T});assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
 response=await handleRequest(w,new Request('https://game.test/api/state'),{now:T});assert.equal(response.status,401);
 response=await handleRequest(w,new Request('https://game.test/api/action',{method:'POST',headers:{Origin:'https://evil.test','Content-Type':'application/json'},body:'{}'}),{now:T});assert.equal(response.status,403);
 response=await handleRequest(w,new Request('https://game.test/api/action',{method:'OPTIONS',headers:{Origin:'https://tamaskatona-ai.github.io'}}),{now:T});assert.equal(response.status,204);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://tamaskatona-ai.github.io');
 response=await handleRequest(w,new Request('https://game.test/api/players',{method:'POST',headers:{'Content-Type':'application/json'},body:'{' }),{now:T});assert.equal(response.status,400);
});
test('Node server persists shared state and credentials across process restart',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vegvar-online-test-')),file=path.join(dir,'world.json');let server;const start=async()=>{server=createServer({dataFile:file,now:()=>T});await new Promise(r=>server.listen(0,'127.0.0.1',r));return `http://127.0.0.1:${server.address().port}`;};t.after(async()=>{if(server.listening)await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});});let url=await start();let response=await fetch(url+'/api/players',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Anna'})});const joined=await response.json();assert.equal(response.status,201);assert.ok(fs.existsSync(file));await new Promise(r=>server.close(r));url=await start();response=await fetch(url+'/api/state',{headers:{Authorization:'Bearer '+joined.token}});const saved=await response.json();assert.equal(saved.me.name,'Anna');assert.equal(saved.state.soldiers,8);assert.equal((await fetch(url+'/data/online.json')).status,404);
});

test('online gold purchases honor the confirmed maximum and never partially spend on a changed quote',()=>{const {w,a}=pair();a.state.food=0;a.state.metal=0;a.state.gold=100;assert.throws(()=>w.action(a,{type:'train',useGold:true,maxGold:1},T),/ára megváltozott/);assert.equal(a.state.gold,100);assert.equal(a.state.soldiers,8);w.action(a,{type:'train',useGold:true,maxGold:7},T);assert.equal(a.state.gold,93);assert.equal(a.state.soldiers,13);});

test('wealthy bases transfer capped gold and resources exactly once; a second attacker cannot overlap',()=>{const {w,a,b}=pair();a.state.soldiers=1000;b.state.gold=10000;for(const type of ['wood','metal','food'])b.state[type]=10000;const c=w.join('Csilla',a.room,T).player;w.action(a,{type:'attack',targetId:b.id},T);assert.throws(()=>w.action(c,{type:'attack',targetId:b.id},T),/csatában/);w.tick(T+15000);assert.deepEqual(a.reports[0].loot,{wood:400,metal:400,food:400,gold:150});assert.equal(a.state.gold,150);assert.equal(b.state.gold,9850);w.tick(T+15001);assert.equal(a.state.gold,150);assert.equal(b.state.gold,9850);});
