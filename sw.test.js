'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function worker(cache,{brokenCache=false}={}){
 const listeners={},network=[];
 const context={URL,Request,Response,Promise,self:{location:{href:'https://game.test/sw.js'},addEventListener:(name,fn)=>listeners[name]=fn},caches:{open:async()=>{if(brokenCache)throw Error('Storage unavailable');return cache;}},fetch:async request=>{network.push(request.url);return new Response('network');}};
 vm.runInNewContext(fs.readFileSync(require.resolve('./sw.js'),'utf8'),context);
 return {listeners,network,navigate(path='/'){let response;listeners.fetch({request:{method:'GET',url:'https://game.test'+path,mode:'navigate'},respondWith:r=>response=r});return response;}};
}
test('offline installation caches the canonical root without the redirecting index URL',async()=>{
 let requests;const w=worker({addAll:async r=>requests=r});let installed;w.listeners.install({waitUntil:p=>installed=p});await installed;
 assert.ok(requests.some(r=>r.url==='https://game.test/'));assert.ok(!requests.some(r=>r.url.endsWith('/index.html')));
});
test('navigation prefers the canonical root for both URL spellings and query strings',async()=>{
 const w=worker({match:async url=>String(url)==='https://game.test/'?new Response('cached game'):undefined});
 for(const path of ['/','/index.html','/?resume=1'])assert.equal(await (await w.navigate(path)).text(),'cached game');assert.deepEqual(w.network,[]);
});
test('redirected legacy cached HTML is reconstructed into a valid navigation response',async()=>{
 const w=worker({match:async url=>{if(!String(url).endsWith('/index.html'))return;const response=new Response('saved game',{headers:{'Content-Type':'text/html'}});Object.defineProperty(response,'redirected',{value:true});return response;}});
 const response=await w.navigate();assert.equal(response.redirected,false);assert.equal(response.headers.get('Content-Type'),'text/html');assert.equal(await response.text(),'saved game');
});
test('unavailable cache falls back to the network and API requests bypass the worker',async()=>{
 const w=worker(null,{brokenCache:true});assert.equal(await (await w.navigate()).text(),'network');assert.deepEqual(w.network,['https://game.test/']);assert.equal(w.navigate('/api/online'),undefined);
});
