'use strict';
require('./build');
const fs=require('node:fs'),path=require('node:path');
const files=['index.html','style.css','engine.js','game.js','scene.js','world3d.js','multiplayer-client.js','pwa.js','sw.js','manifest.webmanifest','vendor/three.min.js','vendor/THREE-LICENSE.txt','icons/apple-touch-icon.png','icons/icon-192.png','icons/icon-512.png'];
fs.rmSync(path.join(__dirname,'public'),{recursive:true,force:true});
for(const file of files){const target=path.join(__dirname,'public',file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(__dirname,file),target);}
console.log('A közös szerverhez szükséges alkalmazás elkészült: public/');
