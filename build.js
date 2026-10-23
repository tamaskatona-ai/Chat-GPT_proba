// Függőségek és hálózati kérés nélkül újraépíti az önálló játékfájlt.
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+fs.readFileSync(path.join(root,'style.css'),'utf8')+'</style>');
html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,file)=>{
 const full=path.resolve(root,file);
 if(!full.startsWith(root+path.sep))throw Error('Érvénytelen szkriptútvonal.');
 return '<script>'+fs.readFileSync(full,'utf8').replace(/<\/script/gi,'<\\/script')+'</script>';
});
html=html.replace('</head>','<!--\n'+fs.readFileSync(path.join(root,'vendor/THREE-LICENSE.txt'),'utf8')+'\n--></head>');
fs.writeFileSync(path.join(root,'vegvar.html'),html);
console.log('Elkészült: vegvar.html (minden grafika és szkript beágyazva).');
