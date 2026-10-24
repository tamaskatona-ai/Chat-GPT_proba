/* Saját izometrikus bázisnézet. Csak megjelenítés: minden művelet a közös játékszabályokon fut. */
(function(root){
'use strict';
function mount(getState,upgrade,train){
 const E=root.Engine,T=root.THREE,app=document.querySelector('.app');
 const section=document.createElement('section');section.id='city-screen';section.hidden=true;section.setAttribute('aria-label','Bázis belső nézete');
 section.innerHTML=`<canvas id="city-canvas" tabindex="0" aria-label="Izometrikus város. Húzással mozgatható, görgővel nagyítható. A nyílbillentyűkkel mozgathatod, plusz és mínusz billentyűvel nagyíthatod."></canvas><div class="city-shade"></div><header class="city-top"><div class="city-heading"><span class="city-kicker">VÉGVÁR · BÁZIS</span><h1>A túlélők városa</h1></div><button id="city-exit">↗ Világtérkép</button></header><div id="city-resources" class="city-resources" aria-label="A város nyersanyagai"></div><div class="city-district"><span class="city-live"></span> BIZTONSÁGOS KÖRZET <span id="city-level"></span></div><nav class="city-camera" aria-label="Város kamerája"><button id="city-plus" aria-label="Város nagyítása">+</button><button id="city-minus" aria-label="Város kicsinyítése">−</button><button id="city-home" aria-label="Teljes város">⌂</button></nav><div id="city-labels"></div><aside class="city-detail" id="city-detail"><div><span class="city-kicker" id="city-detail-type">PARANCSNOKI KÖZPONT</span><h2 id="city-detail-name"></h2><p id="city-detail-desc"></p><p id="city-detail-cost"></p><p id="city-feedback" role="status"></p></div><div class="city-actions"><button id="city-upgrade">Fejlesztés</button><button id="city-train" hidden>+5 katona kiképzése</button></div></aside><footer class="city-bottom"><span>Húzd a térképet · nagyíts a részletekhez</span><button id="city-list-toggle" aria-expanded="false">Épületek ▴</button></footer><nav id="city-building-list" hidden aria-label="Város épületei"></nav>`;
 document.body.append(section);
 const $=id=>section.querySelector('#'+id),canvas=$('city-canvas');
 let active=false,renderer,scene,camera,raf,selected='hq',lastUI=0,oldFocus,scrollY=0,zoom=1,drag=null,pinch=null,moved=false,lastFrame=0;
 const target={x:0,z:0},entries=[],actors=[],smoke=[],flags=[],materials=new Map(),geometries=new Map(),resources=[];
 const buildingLayout=[['hq',0,-12],['barracks',-20,-12],['mine',20,-12],['farm',-20,11],['sawmill',20,11],['wall',0,29]];
 const labels=[];let pickables=[];
 const locked=()=>Boolean(root.OnlineGame?.blocked()||root.CloudSave?.blocked());
 const number=n=>Math.floor(n).toLocaleString('hu-HU');
 for(const [id] of buildingLayout){
  const b=document.createElement('button');b.className='city-building-label';b.dataset.building=id;b.onclick=()=>select(id);b.innerHTML=`<span>${E.buildings[id].name}</span><small></small>`;$('city-labels').append(b);labels.push({id,el:b});
  const item=document.createElement('button');item.textContent=E.buildings[id].name;item.onclick=()=>{select(id);const entry=entries.find(e=>e.id===id);if(entry){target.x=entry.x*.6;target.z=entry.z*.6;}};$('city-building-list').append(item);
 }
 const resourceNames={wood:['🪵','Fa'],metal:['▰','Vas'],food:['🌾','Élelem'],gold:['●','Arany']};
 for(const [id,[icon,name]] of Object.entries(resourceNames)){const el=document.createElement('div');el.className='city-resource '+id;el.innerHTML=`<span class="city-resource-icon">${icon}</span><div><small>${name}</small><strong></strong></div>`;$('city-resources').append(el);resources.push({id,el:el.querySelector('strong')});}
 function select(id){selected=id;refresh();}
 function refresh(){
  const s=getState();resources.forEach(r=>r.el.textContent=number(s[r.id]));$('city-level').textContent='HQ '+s.levels.hq+' · '+number(E.availableSoldiers(s))+' katona';
  const definition=E.buildings[selected],cost=E.cost(s,selected);$('city-detail-name').textContent=definition.name+' · '+s.levels[selected]+'. szint';$('city-detail-desc').textContent=definition.desc;
  $('city-detail-type').textContent=selected==='hq'?'A VÁROS SZÍVE':selected==='wall'?'VÉDELMI VONAL':'BÁZISLÉTESÍTMÉNY';
  $('city-detail-cost').textContent='Következő szint: '+Object.entries(cost).map(([k,v])=>number(v)+' '+resourceNames[k][1].toLowerCase()).join(' · ');
  const cap=selected!=='hq'&&s.levels[selected]>=s.levels.hq;const afford=Object.entries(cost).every(([k,v])=>s[k]>=v);
  $('city-upgrade').disabled=locked()||!afford||cap;$('city-upgrade').textContent=cap?'Előbb a parancsnokságot fejleszd':!afford?'Nyersanyag gyűjtése szükséges':'Fejlesztés → '+(s.levels[selected]+1)+'. szint';
  $('city-train').hidden=selected!=='barracks';$('city-train').disabled=locked()||Object.entries(E.trainingCost).some(([k,v])=>s[k]<v);
  for(const l of labels){l.el.querySelector('small').textContent=s.levels[l.id]+'. SZINT';l.el.classList.toggle('selected',l.id===selected);}
 }
 $('city-upgrade').onclick=()=>{if(locked())return;upgrade(selected);refresh();$('city-feedback').textContent='';};
 $('city-train').onclick=()=>{if(locked())return;train();refresh();};
 $('city-list-toggle').onclick=()=>{const el=$('city-building-list');el.hidden=!el.hidden;$('city-list-toggle').setAttribute('aria-expanded',String(!el.hidden));};
 $('city-plus').onclick=()=>zoom=Math.min(2.8,zoom*1.2);$('city-minus').onclick=()=>zoom=Math.max(.65,zoom/1.2);$('city-home').onclick=()=>{zoom=1;target.x=target.z=0;};
 function material(color,metalness=0,roughness=.65){const key=color+':'+metalness+':'+roughness;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness,metalness}));return materials.get(key);}
 function geo(key,create){if(!geometries.has(key))geometries.set(key,create());return geometries.get(key);}
 function mesh(parent,g,color,x,y,z,sx=1,sy=1,sz=1){const m=new T.Mesh(g,typeof color==='string'?material(color):color);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 function box(p,w,h,d,x,y,z,c){return mesh(p,geo('box',()=>new T.BoxGeometry(1,1,1)),c,x,y,z,w,h,d);}
 function cylinder(p,r,h,x,y,z,c,rTop=r,n=16){return mesh(p,geo('c'+r+':'+rTop+':'+h+':'+n,()=>new T.CylinderGeometry(rTop,r,h,n)),c,x,y,z);}
 function sphere(p,r,x,y,z,c){return mesh(p,geo('sphere',()=>new T.SphereGeometry(1,12,8)),c,x,y,z,r,r,r);}
 function group(p,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;}
 const C={blue:'#237eac',cyan:'#7cdbef',navy:'#22465e',white:'#e7e4cf',trim:'#f6c86b',concrete:'#9ba5a5',dark:'#34464e',sand:'#c9ac73',green:'#5e8156',gold:'#d7a547',red:'#c56948'};
 function bake(g){
  g.updateMatrixWorld(true);const sets=new Map(),remove=[];const inverse=new T.Matrix4().copy(g.matrixWorld).invert();
  g.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)){const parts=sets.get(o.material)||[],copy=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();copy.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld));parts.push(copy);sets.set(o.material,parts);remove.push(o);}});
  remove.forEach(o=>o.removeFromParent());
  for(const [mat,parts] of sets){const merged=new T.BufferGeometry();for(const name of ['position','normal','uv']){const attrs=parts.map(p=>p.getAttribute(name));if(attrs.some(a=>!a))continue;const arr=new Float32Array(attrs.reduce((n,a)=>n+a.array.length,0));let offset=0;for(const a of attrs){arr.set(a.array,offset);offset+=a.array.length;}merged.setAttribute(name,new T.BufferAttribute(arr,attrs[0].itemSize));}parts.forEach(p=>p.dispose());geometries.set('merged'+geometries.size,merged);mesh(g,merged,mat,0,0,0);}
 }
 function pad(p,w,d){box(p,w,.3,d,0,.2,0,C.concrete);box(p,w-.5,.08,d-.5,0,.4,0,'#bfc3b9');}
 function windows(p,w,d,y){for(let x=-w/2+.7;x<w/2;x+=1.15){box(p,.66,.7,.09,x,y,d/2+.06,C.cyan);box(p,.66,.7,.09,x,y,-d/2-.06,C.cyan);}for(let z=-d/2+.7;z<d/2;z+=1.2){box(p,.09,.7,.65,w/2+.06,y,z,C.cyan);box(p,.09,.7,.65,-w/2-.06,y,z,C.cyan);}}
 function stairs(p,x,z,width=3){for(let i=0;i<4;i++)box(p,width,.15*(i+1),.45,x,.075*(i+1),z-i*.4,C.white);}
 function flag(p,x,y,z){cylinder(p,.065,4,x,y+2,z,C.white);const f=box(p,1.5,.85,.05,x+.75,y+3.3,z,C.blue);flags.push(f);}
 function hq(p){
  pad(p,15,12);box(p,12,2,9,0,1.4,0,C.navy);box(p,12.4,.35,9.4,0,2.5,0,C.white);box(p,10,2.9,7,0,4,0,C.white);windows(p,10,7,4.25);box(p,10.6,.5,7.6,0,5.65,0,C.blue);
  box(p,5,3.3,4.6,0,7.45,-.6,C.navy);windows(p,5,4.6,7.7);box(p,5.5,.5,5.1,0,9.25,-.6,C.blue);box(p,4.1,.14,3.7,0,9.6,-.6,C.cyan);
  for(let x=-4;x<=4;x+=2){box(p,.9,.22,1.1,x,6.05,-2.1,C.navy);for(let n=0;n<4;n++)box(p,.8,.04,.08,x,6.19,-2.45+n*.22,C.white);}
  for(const x of [-4.5,4.5]){box(p,.55,4,1.2,x,3.8,3.8,C.trim);box(p,1,.25,1.5,x,5.9,3.8,C.white);}
  box(p,2,2.1,.15,0,1.6,4.6,C.cyan);box(p,4,.3,2,0,3,5,C.blue);stairs(p,0,6.6,4);
  cylinder(p,.075,4,1.7,11.2,-1.7,C.dark);const dish=cylinder(p,1.3,.24,1.7,11.1,-1.7,C.white,1,24);dish.rotation.z=.4;flag(p,-6,.4,4);
 }
 function hangar(p){pad(p,15,12);box(p,12,2.5,8,0,1.7,-1,C.white);const roof=cylinder(p,4.2,12,0,3,-1,C.blue,4.2,24);roof.rotation.z=Math.PI/2;roof.scale.z=.48;box(p,12.2,.3,8.5,0,3.2,-1,C.blue);
  for(const x of [-3.7,0,3.7]){box(p,2.9,2.4,.15,x,1.7,3.05,C.navy);for(let y=.7;y<2.8;y+=.4)box(p,2.75,.055,.1,x,y,3.18,'#6d8794');}
  for(let x=-6;x<=6;x+=3)box(p,.22,2.8,8.2,x,1.85,-1,C.white);
  flag(p,-6,.4,4.6);for(let i=0;i<3;i++){box(p,1.2,.8,1,4.4-i*1.35,.9,4.9,C.green);}
 }
 function factory(p){pad(p,15,12);box(p,9,2.8,7,0,1.85,0,C.white);windows(p,9,7,2.3);box(p,9.5,.4,7.5,0,3.5,0,C.blue);
  for(const x of [-2.8,0,2.8]){cylinder(p,1.05,3,x,5.1,-1.8,C.dark);cylinder(p,1.2,.35,x,6.6,-1.8,C.trim);for(let i=0;i<3;i++){const smokeMaterial=material('#d0c6b2',0,1);smokeMaterial.transparent=true;smokeMaterial.opacity=.24;smokeMaterial.depthWrite=false;const s=sphere(scene,.6,0,0,0,smokeMaterial);smoke.push({mesh:s,x:p.position.x+x,z:p.position.z-1.8,phase:i/3});}}
  for(const x of [-2.6,0,2.6]){box(p,1.5,1.4,.18,x,1.4,3.6,'#e68b3e');box(p,1.1,.8,.2,x,1.35,3.72,'#ffd06b');}for(let i=0;i<4;i++)box(p,2.1,.4,1.1,-4.5+i*2.6,.7,5,C.dark);
  cylinder(p,.35,7.5,5,4.1,-3,C.white);cylinder(p,.55,.5,5,7.9,-3,C.red);
 }
 function farm(p){pad(p,15,13);for(let i=0;i<3;i++){const g=group(p,-4.7+i*4.7,0,-1);box(g,3.6,1.3,7,0,1.15,0,'#4e8e90');const roof=cylinder(g,1.9,7,0,1.8,0,material('#9ddcce',.2,.25),1.9,16);roof.rotation.x=Math.PI/2;roof.scale.z=.65;for(let z=-3;z<=3;z+=1) {const hoop=cylinder(g,1.95,.10,0,1.8,z,C.white,1.95,16);hoop.rotation.x=Math.PI/2;hoop.scale.z=.65;}box(g,1,1.5,.1,0,1.2,3.55,C.blue);}
  for(let z=4;z<6;z+=.55)for(let x=-6;x<6;x+=.5){box(p,.1,.5,.1,x,.7,z,'#dcb756');sphere(p,.14,x,.97,z,'#edd687');}
 }
 function lumber(p){pad(p,15,12);box(p,9,2.3,7,0,1.55,-1,C.white);box(p,10,.5,8,0,3,-1,C.blue);windows(p,9,7,2);box(p,3,2,.1,0,1.4,2.55,C.navy);
  for(let row=0;row<3;row++)for(let j=0;j<4-row;j++){const log=cylinder(p,.38,4,-4+j*.8+row*.4,.8+row*.65,4,C.gold,.38,12);log.rotation.z=Math.PI/2;}
  for(let i=0;i<3;i++){box(p,1.6,1,1.3,4.3,.95,2.8+i*1.2,'#b78650');box(p,.1,1.1,1.4,4.3,1,2.8+i*1.2,C.trim);}
 }
 function tank(p,x,z,rotation=0){const g=group(p,x,.4,z);g.rotation.y=rotation;for(const dx of [-.8,.8]){box(g,.5,.6,2.9,dx,.4,0,C.dark);for(let i=0;i<4;i++){const wheel=cylinder(g,.23,.16,dx,.4,-1+i*.65,'#7a8790');wheel.rotation.z=Math.PI/2;}}box(g,1.7,.55,2.5,0,.8,0,C.blue);box(g,1.2,.5,1.2,0,1.25,0,C.blue);const gun=cylinder(g,.11,2.3,0,1.4,1.15,C.white);gun.rotation.x=Math.PI/2;box(g,.6,.12,.7,0,1.57,0,C.trim);}
 function person(p,x,z,animated=false,index=0){const g=group(p,x,.45,z);const skin='#d3ab80';box(g,.42,.65,.28,0,1.1,0,C.blue);box(g,.32,.5,.3,0,1.15,.06,C.navy);sphere(g,.23,0,1.67,0,skin);cylinder(g,.27,.18,0,1.85,0,C.blue);box(g,.28,.06,.04,0,1.7,.21,C.dark);const legs=[],arms=[];for(const side of [-1,1]){legs.push(box(g,.16,.6,.18,side*.13,.48,0,C.navy));box(g,.18,.15,.32,side*.13,.18,.06,C.dark);arms.push(box(g,.14,.56,.15,side*.31,1.1,0,C.blue));}box(g,.09,.6,.11,.38,.98,.17,C.dark);if(animated)actors.push({g,legs,arms,index});return g;}
 function turret(p,x,z){const g=group(p,x,0,z);box(g,2,1.1,2,0,.65,0,C.concrete);cylinder(g,.85,.6,0,1.5,0,C.blue);for(const dx of [-.3,.3]){const gun=cylinder(g,.09,1.8,dx,1.9,.7,C.dark);gun.rotation.x=Math.PI/3;}}
 function scenery(p){
  for(const x of [-37,37])for(let z=-29;z<30;z+=5.2){box(p,.7,2.7,4.9,x,1.4,z,C.dark);box(p,.9,.25,5,x,2.9,z,C.trim);cylinder(p,.55,3.3,x,1.7,z-2.6,C.concrete);}
  for(const z of [-32,32])for(let x=-35;x<=35;x+=5){if(z===32&&Math.abs(x)<6)continue;box(p,4.8,2.7,.7,x,1.4,z,C.dark);box(p,4.9,.25,.9,x,2.9,z,C.trim);cylinder(p,.55,3.3,x-2.5,1.7,z,C.concrete);}
  for(const x of [-6,6]){box(p,2,5,2,x,2.5,32,C.concrete);box(p,2.6,.5,2.6,x,5,32,C.blue);turret(p,x,32);}box(p,12,.5,1.5,0,5,32,C.blue);box(p,8,.8,.4,0,4.6,32,C.trim);
  for(const x of [-32,32])for(const z of [-27,26])turret(p,x,z);
  for(let i=0;i<6;i++)tank(p,-29+i*4,23,Math.PI/2);
  for(let i=0;i<28;i++)person(p,-27+(i%7)*1.2,-2+Math.floor(i/7)*1.5);
  for(let i=0;i<8;i++)person(scene,0,0,true,i);
  // Ellátóudvar: konténerek, tartályok és rakodóterület.
  for(let i=0;i<5;i++){const x=-27+i*8;box(p,6,2.2,3,x,1.4,-27,i%2?C.blue:C.white);for(let n=0;n<10;n++)box(p,.08,1.9,.08,x-2.7+n*.6,1.4,-25.45,C.concrete);box(p,6.2,.2,3.2,x,2.6,-27,C.navy);}
  for(const x of [27,30]){cylinder(p,1.1,3,x,1.8,-24,C.white);cylinder(p,1.15,.25,x,3.2,-24,C.blue);box(p,.12,2.6,.15,x,1.8,-22.85,C.navy);for(let y=.7;y<3;y+=.35)box(p,.65,.06,.1,x,y,-22.7,C.navy);}
  for(let n=0;n<5;n++){box(p,.75,.8,.75,-30+n*1.1,.8,15,C.gold);box(p,.08,.8,.8,-30+n*1.1,.8,15,C.white);}
  // Parancsnoki tér: kör alakú szökőkút és burkolat.
  cylinder(p,4.4,.3,0,.45,10,C.white,4.4,40);cylinder(p,3.65,.23,0,.65,10,'#67b8c7',3.65,40);cylinder(p,1.15,1.5,0,1.4,10,C.white);sphere(p,.9,0,2.6,10,C.cyan);
  for(const x of [-9,9])for(const z of [-28,2,23]){cylinder(p,.09,4,x,2,z,C.dark);box(p,.8,.2,.8,x,4,z,C.trim);}
  for(const x of [-32,32])for(let z=-24;z<25;z+=8){cylinder(p,.18,1.7,x,.9,z,'#88734d');sphere(p,1.4,x,2.6,z,C.green);sphere(p,.9,x+.7,3.5,z,'#8da36b');box(p,3,.3,3,x,.2,z,C.white);}
  const heli=group(p,21,.45,24);cylinder(heli,5,.12,0,0,0,C.dark,5,32);for(const x of [-.9,.9])box(heli,.35,.1,2.4,x,.1,0,C.white);box(heli,1.6,.1,.35,0,.1,0,C.white);
 }
 function init(){
  if(renderer)return;
  renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(root.devicePixelRatio||1,1.75));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  scene=new T.Scene();scene.background=new T.Color('#d4b77c');camera=new T.OrthographicCamera(-50,50,35,-35,.1,400);
  const sun=new T.DirectionalLight('#fff0ce',3.8);sun.position.set(-35,65,25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,far:180});sun.shadow.normalBias=.04;sun.shadow.bias=-.0002;scene.add(sun,new T.HemisphereLight('#c6e4f5','#9b8053',2.1));
  const ground=group(scene);box(ground,280,.3,280,0,-.3,0,C.sand);box(ground,76,.4,66,0,0,0,'#b6ac94');
  for(const z of [-23,0,20]){box(ground,72,.035,4.6,0,.25,z,'#78858a');for(let x=-33;x<34;x+=3)box(ground,1.4,.045,.10,x,.28,z,C.white);}
  box(ground,5,.04,64,0,.28,0,'#78858a');for(let z=-30;z<32;z+=3)box(ground,.11,.045,1.4,0,.31,z,C.white);
  // Burkolatok: a statikus részletek anyagonként összevonva.
  for(const x of [-12,12])box(ground,.2,.04,58,x,.23,0,'#e0d2b5');
  scenery(ground);bake(ground);
  for(const [id,x,z] of buildingLayout){const g=group(scene,x,.3,z);if(id==='hq')hq(g);if(id==='barracks')hangar(g);if(id==='mine')factory(g);if(id==='farm')farm(g);if(id==='sawmill')lumber(g);if(id!=='wall')bake(g);g.traverse(o=>{if(o.isMesh){o.userData.building=id;pickables.push(o);}});entries.push({id,x,z,g});}
  const ray=new T.Raycaster(),pointer=new T.Vector2();
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.65,Math.min(2.8,zoom*Math.exp(-e.deltaY*.001)));},{passive:false});
  const pointers=new Map();
  canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY};moved=false;if(pointers.size===2){const a=[...pointers.values()];pinch=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);}});
  canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const a=[...pointers.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pinch)zoom=Math.max(.65,Math.min(2.8,zoom*d/pinch));pinch=d;moved=true;return;}if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>2)moved=true;const scale=90/zoom/canvas.clientHeight;target.x-=(dx+dy*1.4)*scale*.7;target.z+=(dx-dy*1.4)*scale*.7;target.x=Math.max(-35,Math.min(35,target.x));target.z=Math.max(-30,Math.min(30,target.z));drag={x:e.clientX,y:e.clientY};});
  canvas.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);pinch=null;if(!moved){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(pickables,false)[0];if(hit)select(hit.object.userData.building);}drag=null;});
  canvas.addEventListener('pointercancel',()=>{pointers.clear();drag=null;pinch=null;});
  canvas.addEventListener('keydown',e=>{const delta=3/zoom;if(e.key==='ArrowLeft')target.x-=delta;else if(e.key==='ArrowRight')target.x+=delta;else if(e.key==='ArrowUp')target.z-=delta;else if(e.key==='ArrowDown')target.z+=delta;else if(e.key==='+')zoom=Math.min(2.8,zoom*1.2);else if(e.key==='-')zoom=Math.max(.65,zoom/1.2);else return;e.preventDefault();});
 }
 const projected=()=>new T.Vector3();
 function frame(now){
  if(!active)return;raf=requestAnimationFrame(frame);if(now-lastFrame<33||document.hidden)return;lastFrame=now;
  const width=canvas.clientWidth,height=canvas.clientHeight;if(canvas.width!==Math.floor(width*renderer.getPixelRatio())||canvas.height!==Math.floor(height*renderer.getPixelRatio()))renderer.setSize(width,height,false);
  const extent=(width<700?48:39)/zoom,aspect=width/height;camera.left=-extent*aspect;camera.right=extent*aspect;camera.top=extent;camera.bottom=-extent;camera.position.set(target.x+80,85,target.z+80);camera.lookAt(target.x,0,target.z);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  for(const a of actors){const t=now*.00024+a.index*.8;a.g.position.set(-8+Math.sin(t)*.5,.45,Math.sin(t*.65+a.index)*25);a.g.rotation.y=Math.cos(t*.65+a.index)>0?0:Math.PI;for(let i=0;i<2;i++){a.legs[i].rotation.x=Math.sin(now*.007+a.index+i*Math.PI)*.45;a.arms[i].rotation.x=-a.legs[i].rotation.x;}}
  for(const p of smoke){const progress=(now*.00015+p.phase)%1;p.mesh.position.set(p.x+progress*1.2,7+progress*4,p.z);p.mesh.scale.setScalar(.45+progress*.8);p.mesh.visible=progress<.85;}
  for(const f of flags)f.rotation.y=Math.sin(now*.002)*.12;
  for(const l of labels){const entry=entries.find(e=>e.id===l.id),pos=projected().set(entry.x,l.id==='hq'?11:l.id==='mine'?9:5,entry.z).project(camera);l.el.style.transform=`translate(-50%,-100%) translate(${(pos.x*.5+.5)*width}px,${(-pos.y*.5+.5)*height}px)`;l.el.hidden=pos.z>1||pos.x<-1.1||pos.x>1.1||pos.y<-1||pos.y>1;}
  if(now-lastUI>500){refresh();lastUI=now;}renderer.render(scene,camera);
 }
 function close(){active=false;cancelAnimationFrame(raf);section.hidden=true;app.hidden=false;document.body.classList.remove('city-open');root.scrollTo(0,scrollY);oldFocus?.focus({preventScroll:true});}
 function open(){
  oldFocus=document.activeElement;scrollY=root.scrollY;
  if(!T){root.alert('A bázis 3D nézetéhez WebGL-t támogató böngésző szükséges. A meglévő térképen tovább játszhatsz.');return;}
  try{init();}catch(error){$('city-feedback').textContent='A 3D nézet nem indult el. A térképen tovább játszhatsz.';console.warn('City graphics unavailable',error.message);root.alert('A bázis 3D nézete ezen az eszközön nem indult el. A játékod és mentésed megmaradt.');return;}
  section.hidden=false;app.hidden=true;document.body.classList.add('city-open');active=true;refresh();canvas.focus();raf=requestAnimationFrame(frame);
 }
 $('city-exit').onclick=close;section.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 return {open,close,select,getSnapshot:()=>({active,selected,zoom,buildings:entries.map(e=>e.id),actors:actors.length,drawCalls:renderer?.info.render.calls||0,triangles:renderer?.info.render.triangles||0})};
}
root.CityView={mount};
})(globalThis);
