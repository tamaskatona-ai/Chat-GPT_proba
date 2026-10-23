// Függőségek és hálózati kérés nélkül újraépíti az önálló játékfájlt.
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
// Az offline kiadás azonosítója minden játék- vagy ikonváltozáskor frissül.
const crypto=require('node:crypto');
const workerPath=path.join(root,'sw.js');
let worker=fs.readFileSync(workerPath,'utf8');
const coreMatch=worker.match(/const CORE_FILES = (\[[\s\S]*?\]);/);
if(!coreMatch)throw Error('Hiányzó offline fájllista.');
const core=Function('return '+coreMatch[1])();
const hash=crypto.createHash('sha256');
hash.update(worker.replace(/const CACHE_VERSION = '[^']*';/,"const CACHE_VERSION = '';"));
for(const file of core){const name=file==='./'?'index.html':file;hash.update(name);hash.update(fs.readFileSync(path.join(root,name)));}
worker=worker.replace(/const CACHE_VERSION = '[^']*';/,"const CACHE_VERSION = '"+hash.digest('hex').slice(0,16)+"';");
fs.writeFileSync(workerPath,worker);
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+fs.readFileSync(path.join(root,'style.css'),'utf8')+'</style>');
html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,file)=>{
 const full=path.resolve(root,file);
 if(!full.startsWith(root+path.sep))throw Error('Érvénytelen szkriptútvonal.');
 return '<script>'+fs.readFileSync(full,'utf8').replace(/<\/script/gi,'<\\/script')+'</script>';
});
html=html.replace(/(?:href|src)="icons\/([^"]+\.png)"/g,(match,file)=>match.slice(0,match.indexOf('"')+1)+'data:image/png;base64,'+fs.readFileSync(path.join(root,'icons',file)).toString('base64')+'"');
html=html.replace('<link rel="manifest" href="manifest.webmanifest">','');
html=html.replace('</head>' ,'<!--\n'+fs.readFileSync(path.join(root,'vendor/THREE-LICENSE.txt'),'utf8')+'\n--></head>');
fs.writeFileSync(path.join(root,'vegvar.html'),html);
console.log('Elkészült: vegvar.html (minden grafika és szkript beágyazva).');
