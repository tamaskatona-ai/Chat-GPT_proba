const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('sw.js','utf8');
function worker(){
  const listeners={},stores=new Map(),removed=[],fetched=[];
  const scope='https://example.test/Chat-GPT_proba/';
  const key=input=>new URL(typeof input==='string'?input:input.url||String(input),scope).href;
  const caches={
    async open(name){if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);return {
      async addAll(requests){for(const req of requests){assert.ok(fs.existsSync(new URL(req.url).pathname.replace('/Chat-GPT_proba/','')||'index.html'));store.set(key(req),new Response('cached:'+key(req)));}},
      async match(request,options){const wanted=new URL(key(request));if(options?.ignoreSearch)wanted.search='';return store.get(wanted.href)?.clone();}
    };},async keys(){return [...stores.keys()];},async delete(name){removed.push(name);return stores.delete(name);}
  };
  const self={location:{href:scope+'sw.js'},addEventListener:(type,handler)=>listeners[type]=handler,clients:{async claim(){}},skipWaiting(){self.skipped=true;}};
  let offline=false;
  vm.runInNewContext(source,{self,caches,URL,Request,Response,fetch:async req=>{fetched.push(key(req));if(offline)throw Error('offline');return new Response('network');}});
  async function install(){let promise;listeners.install({waitUntil(p){promise=p;}});await promise;}
  async function request(path,mode='cors',method='GET'){let promise;const request={url:new URL(path,scope).href,mode,method};listeners.fetch({request,respondWith(p){promise=p;}});return promise;}
  return {listeners,stores,removed,fetched,self,install,request,setOffline(){offline=true;}};
}
test('manifest has scoped standalone launch and real iPhone/maskable PNG icons',()=>{
 const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest'));assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'./');assert.equal(manifest.id,'./');assert.ok(manifest.start_url.startsWith('./'));
 for(const icon of [...manifest.icons,{src:'icons/apple-touch-icon.png',sizes:'180x180'}]){
  const png=fs.readFileSync(icon.src);assert.equal(png.subarray(1,4).toString(),'PNG');const size=Number(icon.sizes.split('x')[0]);assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
 }
});
test('offline install contains all game dependencies and homescreen launch handles query strings under repository scope',async()=>{
 const w=worker();await w.install();w.setOffline();assert.match(await (await w.request('./?source=homescreen','navigate')).text(),/cached:.*index.html/);
 for(const file of ['engine.js','game.js','world3d.js','vendor/three.min.js','pwa.js','icons/apple-touch-icon.png'])assert.match(await (await w.request(file)).text(),/cached:/);
 assert.equal(w.fetched.length,0);
});
test('worker ignores cross-origin, out-of-scope and mutation requests and never replaces unknown pages with the game',async()=>{
 const w=worker();await w.install();assert.equal(await w.request('https://other.test/foo'),undefined);assert.equal(await w.request('/other-app/'),undefined);assert.equal(await w.request('engine.js','cors','POST'),undefined);
 assert.equal(await (await w.request('missing.html','navigate')).text(),'network');assert.equal(await w.request('sw.js'),undefined);assert.equal(await w.request('api/state'),undefined);
});
test('activation deletes only previous caches for this game scope and waits for explicit update',async()=>{
 const w=worker();await w.install();assert.equal(w.self.skipped,undefined);w.stores.set('vegvar-app-/Chat-GPT_proba/-old',new Map());w.stores.set('other-game',new Map());w.stores.set('vegvar-app-/another/-old',new Map());
 let promise;w.listeners.activate({waitUntil(p){promise=p;}});await promise;assert.deepEqual(w.removed,['vegvar-app-/Chat-GPT_proba/-old']);
 w.listeners.message({data:{type:'unknown'}});assert.equal(w.self.skipped,undefined);w.listeners.message({data:{type:'ACTIVATE_UPDATE'}});assert.equal(w.self.skipped,true);
});
