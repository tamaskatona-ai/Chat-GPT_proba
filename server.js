'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {createWorld,handleRequest}=require('./multiplayer');
function createServer({dataFile=path.join(__dirname,'data','online.json'),now=Date.now}={}){
 const root=__dirname,assets=['index.html','style.css','game.js','engine.js','scene.js','world3d.js','vendor/three.min.js','vendor/THREE-LICENSE.txt','vegvar.html','pwa.js','sw.js','manifest.webmanifest','multiplayer-client.js','icons/apple-touch-icon.png','icons/icon-192.png','icons/icon-512.png'];
 const files=Object.fromEntries(assets.map(file=>['/'+file,file]));files['/']='index.html';
 const mime={'.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.png':'image/png','.txt':'text/plain; charset=utf-8','.html':'text/html; charset=utf-8'};
 // Hibás mentést nem írunk felül üres világgal.
 let world=createWorld(dataFile&&fs.existsSync(dataFile)?JSON.parse(fs.readFileSync(dataFile,'utf8')):undefined);
 const persist=()=>{if(!dataFile)return;fs.mkdirSync(path.dirname(dataFile),{recursive:true});fs.writeFileSync(dataFile+'.tmp',JSON.stringify(world.data),{mode:0o600});fs.renameSync(dataFile+'.tmp',dataFile);};
 const rates=new Map();let queue=Promise.resolve();
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://'+(req.headers.host||'localhost'));
  if(url.pathname.startsWith('/api/')){
   const ip=req.socket.remoteAddress,t=now();let rate=rates.get(ip);if(!rate||t-rate.at>60000){rate={at:t,count:0,joins:0};rates.set(ip,rate);}if(rates.size>4096)for(const [k,v] of rates)if(t-v.at>60000)rates.delete(k);
   if(++rate.count>240||(url.pathname==='/api/players'&&req.method==='POST'&&++rate.joins>10)){res.writeHead(429,{'Content-Type':'application/json','Retry-After':'60'});res.end(JSON.stringify({error:'Túl sok kérés. Várj egy percet.'}));req.resume();return;}
   try{
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>8192){res.writeHead(413);res.end();return;}chunks.push(chunk);}
    const request=new Request(url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})});
    const run=queue.then(async()=>{const before=JSON.stringify(world.data);try{const response=await handleRequest(world,request,{now:now(),allowedOrigins:process.env.ALLOWED_ORIGINS?.split(',')});persist();return response;}catch(error){world=createWorld(JSON.parse(before));throw error;}});queue=run.catch(()=>{});
    const response=await run;res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
   }catch(error){console.error('Online szerverhiba:',error.message);if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'A szerver nem tudta biztonságosan menteni a műveletet. Próbáld újra később.'}));}
   return;
  }
  const file=files[url.pathname];if(!file){res.writeHead(404);res.end('Not found');return;}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');if(file==='sw.js'||file==='index.html')res.setHeader('Cache-Control','no-cache');fs.createReadStream(path.join(root,file)).pipe(res);
 });
 const settle=setInterval(()=>{if(!world.data.players.some(p=>p.state.mission?.kind==='pvp'&&p.state.mission.ends<=now()))return;const run=queue.then(()=>{const before=JSON.stringify(world.data);try{world.tick(now());persist();}catch(error){world=createWorld(JSON.parse(before));console.error('A csata mentése sikertelen:',error.message);}});queue=run.catch(()=>{});},1000);settle.unref();server.on('close',()=>clearInterval(settle));return server;
}
if(require.main===module)createServer().listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log(`Végvár elindult a ${Number(process.env.PORT)||3000}-es porton. Online mód: /api/online`));
module.exports={createServer};
