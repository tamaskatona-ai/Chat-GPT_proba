const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const files = {'/':'index.html','/index.html':'index.html','/style.css':'style.css','/game.js':'game.js','/engine.js':'engine.js','/scene.js':'scene.js','/vegvar.html':'vegvar.html'};
http.createServer((req,res)=>{ const file=files[new URL(req.url,'http://localhost').pathname]; if(!file){res.writeHead(404);res.end('Not found');return;} res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html; charset=utf-8');fs.createReadStream(path.join(root,file)).pipe(res); }).listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log(`Végvár elindult a ${Number(process.env.PORT)||3000}-es porton.`));
