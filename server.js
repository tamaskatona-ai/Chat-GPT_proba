const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const assets = ['index.html','style.css','game.js','engine.js','scene.js','world3d.js','vendor/three.min.js','vegvar.html','pwa.js','sw.js','manifest.webmanifest','icons/apple-touch-icon.png','icons/icon-192.png','icons/icon-512.png'];
const files = Object.fromEntries(assets.map(file=>['/'+file,file]));files['/']='index.html';
const mime = {'.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.png':'image/png','.html':'text/html; charset=utf-8'};
http.createServer((req,res)=>{
  const file=files[new URL(req.url,'http://localhost').pathname];
  if(!file){res.writeHead(404);res.end('Not found');return;}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  if(file==='sw.js'||file==='index.html')res.setHeader('Cache-Control','no-cache');
  fs.createReadStream(path.join(root,file)).pipe(res);
}).listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log(`Végvár elindult a ${Number(process.env.PORT)||3000}-es porton.`));
