/* Saját, procedurális 3D modellek. A játékszabályokat az Engine kezeli. */
(function(root){
'use strict';
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function patrolPosition(index,time){
  // A kószáló fertőzöttek a romok között maradnak, a bázis falain kívül.
  const t=time*(.085+(index%3)*.009)+index*1.73;
  return {x:24+Math.cos(t)*(4+(index%4)*1.1),z:Math.sin(t*.79)*(4+(index%3)*1.1)};
}
function mount(canvas,getState,onUpgrade,timing){
const T=root.THREE;if(!T)throw Error('A 3D megjelenítő nem tölthető be.');
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.background=new T.Color('#b5c5c6');scene.fog=new T.FogExp2('#b5c5bc',.007);
const camera=new T.PerspectiveCamera(39,1,.12,280);
const light=new T.DirectionalLight('#fff0cf',3.3);light.position.set(-22,40,22);light.castShadow=true;
light.shadow.mapSize.set(2048,2048);light.shadow.camera.left=-52;light.shadow.camera.right=52;light.shadow.camera.top=45;light.shadow.camera.bottom=-45;light.shadow.camera.far=120;light.shadow.normalBias=.015;light.shadow.bias=-.00025;
scene.add(light);scene.add(new T.HemisphereLight('#d6e9f6','#65704b',2.05));
const raycaster=new T.Raycaster(),pointer=new T.Vector2(),groundPlane=new T.Plane(new T.Vector3(0,1,0),0);
const cameraState={target:new T.Vector3(-1,0,0),distance:81,yaw:.18,pitch:.87};
const objects=[],buildingEntries=[],npcEntries=[],soldiers=[],scouts=[],civilians=[],geometries=new Map(),textures=[],materials=[];
const random=seeded(7319),v=new T.Vector3();let inView=true;let selected=null,following=null,destroyed=false,frameId,previousMission=null,aftermath=null,lastStatus='',lastSize='',lastRendered=0,frameCount=0,quality='high';
const $=id=>document.getElementById(id);
function texture(kind,size=1024){
 const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d'),r=seeded(kind.length*941+kind.charCodeAt(0));
 const colors={brick:'#a28d77',plaster:'#c4beaa',roof:'#665b4d',wood:'#806344',grass:'#667151',dirt:'#968366',cloth:'#69745c',concrete:'#9b9c8a',asphalt:'#666b60',skin:'#d8b49b',camo:'#69745e'};
 g.fillStyle=colors[kind]||'#93978a';g.fillRect(0,0,size,size);
 for(let i=0;i<size*14;i++){let n=r();g.fillStyle=n>.5?`rgba(255,248,219,${r()*.12})`:`rgba(20,30,18,${r()*.16})`;g.fillRect(r()*size,r()*size,1+r()*5,1+r()*4);}
 if(kind==='brick')for(let y=0;y<size;y+=64){for(let x=-64;x<size;x+=128){const xx=x+(y/64%2)*64;g.strokeStyle='#615e4f';g.lineWidth=4;g.strokeRect(xx,y,128,64);g.fillStyle=`rgba(50,40,25,${r()*.12})`;g.fillRect(xx+3,y+3,122,58);}}
 if(kind==='roof')for(let y=0;y<size;y+=32){g.fillStyle=y%64?'#b4a68a22':'#1c241e44';g.fillRect(0,y,size,3);for(let x=0;x<size;x+=64){g.strokeStyle='#242d2544';g.strokeRect(x+(y%64?32:0),y,64,32);}}
 if(kind==='wood'||kind==='cloth'){g.lineWidth=1;for(let i=0;i<size;i+=kind==='cloth'?5:3){g.strokeStyle=i%2?'#ffffff0a':'#0d1e1715';g.beginPath();g.moveTo(i,0);g.bezierCurveTo(i+8,size*.3,i-8,size*.7,i,size);g.stroke();}if(kind==='cloth')for(let y=0;y<size;y+=5){g.fillStyle='#ffffff08';g.fillRect(0,y,size,1);}}
 if(kind==='grass'){for(let i=0;i<18000;i++){const x=r()*size,y=r()*size;g.strokeStyle=i%2?'#a3a76d55':'#334c2d55';g.beginPath();g.moveTo(x,y);g.lineTo(x+2-r()*4,y-2-r()*7);g.stroke();}}
 if(kind==='plaster'||kind==='concrete'){for(let i=0;i<80;i++){g.strokeStyle='#25372816';g.lineWidth=r()*1.5;const x=r()*size,y=r()*size;g.beginPath();g.moveTo(x,y);g.lineTo(x+r()*20-10,y+10+r()*30);g.lineTo(x+r()*40-20,y+30+r()*50);g.stroke();}}
 if(kind==='camo'){
  for(let i=0;i<90;i++){const x=r()*size,y=r()*size;g.fillStyle=['#4f5b49','#879077','#706f56','#5a6753'][i%4];g.beginPath();g.moveTo(x,y);for(let j=0;j<12;j++){const angle=j*Math.PI/6;g.lineTo(x+Math.cos(angle)*(15+r()*60),y+Math.sin(angle)*(12+r()*40));}g.closePath();g.fill();}
 }
 if(kind==='plaster'||kind==='concrete'){
  for(let i=0;i<120;i++){const x=r()*size,y=size*(.65+r()*.35),radius=10+r()*60;const stain=g.createRadialGradient(x,y,0,x,y,radius);stain.addColorStop(0,'#37432a10');stain.addColorStop(1,'#37432a00');g.fillStyle=stain;g.fillRect(x-radius,y-radius,radius*2,radius*2);}
  for(let i=0;i<35;i++){const x=r()*size,y=r()*size;g.strokeStyle='#35402e14';g.lineWidth=.6;g.beginPath();g.moveTo(x,y);for(let j=1;j<6;j++)g.lineTo(x+(r()-.5)*12,y+j*5);g.stroke();}
 }
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.push(tex);return tex;
}
const maps={};for(const name of ['brick','plaster','roof','wood','grass','dirt','cloth','concrete','asphalt','skin','camo'])maps[name]=texture(name,name==='grass'?2048:name==='cloth'?512:1024);
function mat(color,map,roughness=.88,metalness=0){const m=new T.MeshStandardMaterial({color,map:maps[map]||null,bumpMap:maps[map]||null,bumpScale:map==='brick'?.035:.012,roughness,metalness});materials.push(m);return m;}
const M={plaster:mat('#ece2c8','plaster'),brick:mat('#d1ac89','brick'),concrete:mat('#b4b7a8','concrete'),darkConcrete:mat('#8b9188','concrete'),roof:mat('#b9aa96','roof'),metal:mat('#8a9691',null,.5,.7),iron:mat('#414c4c',null,.48,.7),wood:mat('#bd9b71','wood'),darkWood:mat('#8a7153','wood'),window:mat('#4b6a71',null,.22,.35),frame:mat('#d5d4bc'),black:mat('#232a28'),grass:mat('#9ca978','grass'),dirt:mat('#c1b390','dirt'),road:mat('#b2b6a0','asphalt'),leaf:mat('#456747'),leafLight:mat('#637b4d'),bark:mat('#81715b','wood'),gold:mat('#d0ab5c',null,.4,.35),blue:mat('#5b8794','cloth'),uniform:mat('#c2cbb6','camo'),vest:mat('#5c6855','cloth'),skin:mat('#efddd0','skin'),boots:mat('#363e38'),eyes:mat('#e1e0cd'),hair:mat('#3d3930'),zskin:mat('#98a08a'),blood:mat('#785a4e'),zcloth:mat('#7e7967','cloth'),ztrousers:mat('#686e6a','cloth'),red:mat('#ad5746'),cloth:mat('#a6aa8b','cloth')};
function geometry(key,create){if(!geometries.has(key))geometries.set(key,create());return geometries.get(key);}
function mesh(parent,geo,material,x=0,y=0,z=0,sx=1,sy=1,sz=1){const o=new T.Mesh(geo,material);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function box(parent,w,h,d,x,y,z,material){return mesh(parent,geometry('box',()=>new T.BoxGeometry(1,1,1)),material,x,y,z,w,h,d);}
function sphere(parent,rx,ry,rz,x,y,z,material){return mesh(parent,geometry('sphere',()=>new T.SphereGeometry(1,20,14)),material,x,y,z,rx,ry,rz);}
function cylinder(parent,r1,r2,h,x,y,z,material,segments=16){return mesh(parent,geometry(`c:${r1}:${r2}:${h}:${segments}`,()=>new T.CylinderGeometry(r1,r2,h,segments)),material,x,y,z);}
function capsule(parent,r,len,x,y,z,material){return mesh(parent,geometry(`cap:${r}:${len}`,()=>new T.CapsuleGeometry(r,len,5,12)),material,x,y,z);}
function group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
// A statikus alkatrészeket anyagonként egyesítjük: részletek sok ezer rajzolási hívás nélkül.
function bake(g){
 g.updateMatrixWorld(true);const sets=new Map(),remove=[];const inverse=new T.Matrix4().copy(g.matrixWorld).invert();
 g.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)){const a=sets.get(o.material)||[];const geom=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geom.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld));a.push(geom);sets.set(o.material,a);remove.push(o);}});
 for(const o of remove)o.removeFromParent();
 for(const [material,parts] of sets){const merged=new T.BufferGeometry();for(const name of ['position','normal','uv']){const arrays=parts.map(p=>p.getAttribute(name));if(arrays.some(a=>!a))continue;const size=arrays.reduce((n,a)=>n+a.array.length,0),arr=new Float32Array(size);let offset=0;for(const a of arrays){arr.set(a.array,offset);offset+=a.array.length;}merged.setAttribute(name,new T.BufferAttribute(arr,arrays[0].itemSize));}parts.forEach(p=>p.dispose());const o=mesh(g,merged,material);geometries.set(`baked:${geometries.size}`,merged);}
 return g;
}
function flat(parent,w,d,x,z,material,y=.015){const o=mesh(parent,geometry('plane',()=>new T.PlaneGeometry(1,1)),material,x,y,z,w,d,1);o.rotation.x=-Math.PI/2;o.castShadow=false;return o;}
const ground=flat(scene,185,160,0,0,M.grass,-.08);maps.grass.repeat.set(13,11);
flat(scene,31,31,-16,0,M.dirt);maps.dirt.repeat.set(5,5);
function route(points,width,material){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p[0],.035,p[1])));const vertices=[],uv=[],indices=[],count=90;for(let i=0;i<=count;i++){const t=i/count,p=curve.getPoint(t),d=curve.getTangent(t),nx=-d.z,nz=d.x;for(const side of [-1,1]){vertices.push(p.x+nx*width/2*side,p.y,p.z+nz*width/2*side);uv.push((side+1)/2,t*9);}if(i<count){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();const o=mesh(scene,geo,material);o.castShadow=false;o.material.side=T.DoubleSide;geometries.set('route:'+geometries.size,geo);return curve;}
const battleRoute=route([[-1,3],[5,5],[13,6],[17,4],[21,2]],3.5,M.road);
const giantRoute=route([[-1,3],[9,3],[22,-3],[31,-6],[34,-10]],2.4,M.road);
const scoutRoute=route([[-1,3],[2,-2],[5,-7],[9,-8.9]],1.3,M.dirt);
route([[-29,3],[-15,3],[-1,3]],2.3,M.road);route([[-18,-12],[-18,12]],2.1,M.road);
function pitchedRoof(parent,w,d,height,x,y,z,material){
 const g=new T.BufferGeometry(),a=w/2,b=d/2;
 const p=[-a,0,b,a,0,b,0,height,b,-a,0,-b,0,height,-b,a,0,-b,-a,0,-b,-a,0,b,0,height,b,-a,0,-b,0,height,b,0,height,-b,0,height,b,a,0,b,a,0,-b,0,height,b,a,0,-b,0,height,-b];
 g.setAttribute('position',new T.Float32BufferAttribute(p,3));const uv=[];for(let i=0;i<p.length/3;i++)uv.push(i%3===0?0:i%3===1?1:.5,i%3===2?1:0);g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();geometries.set('roof:'+geometries.size,g);return mesh(parent,g,material,x,y,z);
}
function windowUnit(parent,x,y,z,w=.8,h=1.1){
 box(parent,w+.16,h+.16,.1,x,y,z,M.frame);box(parent,w,h,.115,x,y,z+.02,M.window);
 box(parent,.045,h,.13,x,y,z+.06,M.frame);box(parent,w,.045,.13,x,y,z+.06,M.frame);
 box(parent,w+.28,.1,.3,x,y-h/2-.1,z+.08,M.concrete);
}
function house(parent,{w=6,d=4,h=3,roof=true,wall=M.plaster}={}){
 box(parent,w+.3,.28,d+.3,0,.14,0,M.concrete);box(parent,w,h,d,0,h/2+.28,0,wall);
 box(parent,w+.06,.3,d+.06,0,.5,0,M.brick);
 if(roof)pitchedRoof(parent,w+.7,d+.7,1.65,0,h+.28,0,M.roof);else box(parent,w+.4,.22,d+.4,0,h+.39,0,M.concrete);
 for(let x=-w/2+1;x<w/2-.5;x+=1.6)windowUnit(parent,x,1.95,d/2+.07,.8,1.1);
 const side=group(parent,w/2+.08,0,0);side.rotation.y=Math.PI/2;for(let z=-d/2+.9;z<d/2-.3;z+=1.5)windowUnit(side,z,1.95,0,.7,1.1);
 box(parent,1.02,2,.12,0,1.28,d/2+.1,M.darkWood);box(parent,.76,1.65,.15,0,1.18,d/2+.14,M.wood);sphere(parent,.035,.035,.035,.25,1.18,d/2+.24,M.gold);
 box(parent,1.5,.16,.7,0,.12,d/2+.43,M.concrete);
 box(parent,.13,.13,.45,-w/2-.14,h+.08,d/2-.2,M.metal);
 const drain=cylinder(parent,.045,.045,h,-w/2-.13,h/2,d/2-.15,M.metal,8);
 if(roof){box(parent,.65,1.6,.62,w/3,h+.7,-d/5,M.brick);box(parent,.8,.15,.75,w/3,h+1.53,-d/5,M.concrete);}
}
const siteData=[
 {id:'hq',x:-24,z:-7,w:7,d:5,h:4.1}, {id:'farm',x:-14,z:-8,w:6,d:6,h:2.5},
 {id:'barracks',x:-5,z:-7,w:6,d:4,h:2.8}, {id:'sawmill',x:-24,z:9,w:7,d:5,h:3},
 {id:'mine',x:-14,z:9,w:6,d:5,h:3.8},{id:'wall',x:-5,z:9,w:3,d:4,h:4.6}
];
function entity(o,data){o.userData.entity=data;objects.push(o);return o;}
for(const spec of siteData){
 const g=group(scene,spec.x,0,spec.z);
 if(spec.id==='farm'){
   box(g,6.5,.28,6.5,0,.14,0,M.concrete);
   const glass=new T.MeshPhysicalMaterial({color:'#b4d1b8',transparent:true,opacity:.6,roughness:.17,metalness:.08,depthWrite:false});materials.push(glass);
   box(g,6,2.3,6,0,1.4,0,glass);pitchedRoof(g,6.2,6.2,1.6,0,2.55,0,glass);
   for(let x=-3;x<=3;x+=1.5){box(g,.08,2.4,6.08,x,1.45,0,M.frame);const beam=box(g,.07,.07,3.5,x,3.22,-1.55,M.frame);beam.rotation.x=-.48;const beam2=box(g,.07,.07,3.5,x,3.22,1.55,M.frame);beam2.rotation.x=.48;}
   for(let z=-2.4;z<=2.4;z+=1.2){box(g,5,.22,.55,0,.38,z,M.darkWood);for(let x=-2;x<=2;x+=.5)sphere(g,.23,.28,.2,x,.75,z,M.leafLight);}
 }else if(spec.id==='wall'){
   house(g,{w:3.4,d:4,h:4.7,roof:false,wall:M.concrete});
   for(let x=-1.4;x<1.8;x+=.65){box(g,.45,.8,.35,x,5.05,2,M.concrete);box(g,.45,.8,.35,x,5.05,-2,M.concrete);}
   box(g,.55,.12,.55,0,5.3,0,M.iron);const search=cylinder(g,.24,.24,.5,0,5.7,0,M.metal);search.rotation.x=Math.PI/2;
 }else{
   house(g,{w:spec.w,d:spec.d,h:spec.h,wall:spec.id==='mine'?M.darkConcrete:spec.id==='sawmill'?M.brick:M.plaster});
   if(spec.id==='hq'){
     const extra=group(g,-1.6,0,-1.8);house(extra,{w:2.6,d:3,h:6.1,roof:false});
     cylinder(g,.04,.04,4,2.6,6,1.7,M.metal,8);box(g,1.2,.68,.035,3.2,7.6,1.7,M.uniform);
     for(let i=0;i<5;i++)box(g,.025,.025,2,2,6+i*.15,-1,M.iron);
   }
   if(spec.id==='mine'){
     for(let i=0;i<2;i++){cylinder(g,.4,.48,4.7,-1.5+i*1.5,5.7,-1,M.iron);cylinder(g,.62,.58,.18,-1.5+i*1.5,8.08,-1,M.metal);}
     box(g,2,1.6,1.2,4,.8,0,M.iron);for(let i=0;i<6;i++)box(g,1.4,.1,1.5,4,.3+i*.2,0,M.metal);
   }
   if(spec.id==='sawmill')for(let i=0;i<11;i++){const o=cylinder(g,.25,.25,3,-3+(i%4)*.6,.35+Math.floor(i/4)*.45,3.3,M.wood);o.rotation.z=Math.PI/2;}
   if(spec.id==='barracks'){
     for(let i=0;i<4;i++)box(g,.75,.6,.65,-2.2+i*.9,.3,3.2,M.darkWood);
     box(g,1.2,.2,.06,0,2.6,2.17,M.uniform);
   }
 }
 bake(g);const data={kind:'building',id:spec.id,name:root.Engine.buildings[spec.id].name,group:g,description:root.Engine.buildings[spec.id].desc};entity(g,data);buildingEntries.push(data);
}
// A bázisfal, kapu, rozsdás kerítések és utcai berendezések.
const architecture=group(scene);
for(let x=-32;x<-1;x+=2){box(architecture,1.96,2.1,.48,x,1.05,-16,M.concrete);box(architecture,2,.18,.62,x,2.15,-16,M.concrete);box(architecture,1.96,2.1,.48,x,1.05,16,M.concrete);}
for(let z=-15;z<16;z+=2){box(architecture,.5,2.1,1.96,-33,1.05,z,M.concrete);if(z<-1||z>5)box(architecture,.5,2.1,1.96,-1,1.05,z,M.concrete);}
for(const z of [-1,6]){box(architecture,1.2,3.4,1.2,-1,1.7,z,M.concrete);box(architecture,1.45,.2,1.45,-1,3.5,z,M.iron);}
for(let i=0;i<8;i++){const x=-31+i*4.2;for(const z of [-16,16]){cylinder(architecture,.018,.018,.7,x,2.52,z,M.iron,6);box(architecture,4.3,.025,.025,x+2.1,2.8,z,M.iron);}}
for(const [x,z] of [[-28,1],[-18,1],[-7,1],[-28,13],[-2,-13]]){
 cylinder(architecture,.055,.095,4.2,x,2.1,z,M.iron,10);const lamp=box(architecture,.55,.18,.32,x+.18,4.22,z,M.metal);box(architecture,.42,.04,.25,x+.18,4.12,z,M.frame);
}
for(let i=0;i<5;i++){const x=15+i*4.5,z=i%2?-10:12;const ruin=group(architecture,x,0,z);house(ruin,{w:4.3,d:4,h:3+(i%3),roof:i%2===0,wall:M.darkConcrete});if(i%2){for(let j=0;j<5;j++){const debris=box(ruin,.5+random(),.3+random()*.4,.7+random(),random()*5-2.5,.3,2.5+random()*2,M.brick);debris.rotation.y=random()*6;}}}
// Elhagyott kutatótábor.
const camp=group(scene,9,0,-12);
const tentFabric=M.blue.clone();tentFabric.side=T.DoubleSide;materials.push(tentFabric);
function clothPanel(points){const geo=new T.BufferGeometry(),pos=[],uv=[];for(let i=1;i<points.length-1;i++)for(const p of [points[0],points[i],points[i+1]]){pos.push(...p);uv.push((p[0]+2.25)/4.5,(p[1]-.1)/2.7);}geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeVertexNormals();geometries.set('tent:'+geometries.size,geo);mesh(camp,geo,tentFabric);}
clothPanel([[-2.25,.1,2.35],[-2.25,.1,-2.35],[0,2.8,-2.35],[0,2.8,2.35]]);
clothPanel([[0,2.8,2.35],[0,2.8,-2.35],[2.25,.1,-2.35],[2.25,.1,2.35]]);
clothPanel([[-2.25,.1,-2.35],[2.25,.1,-2.35],[0,2.8,-2.35]]);
// Nyitott, 1,3 m széles bejárat: a homloklapok ténylegesen kihagyják a nyílást.
clothPanel([[-2.25,.1,2.35],[-.65,.1,2.35],[-.65,2.02,2.35]]);
clothPanel([[.65,.1,2.35],[2.25,.1,2.35],[.65,2.02,2.35]]);
clothPanel([[-.65,2.02,2.35],[0,2.8,2.35],[.65,2.02,2.35]]);
clothPanel([[-.65,1.75,2.35],[.65,1.75,2.35],[.65,2.02,2.35],[-.65,2.02,2.35]]);
box(camp,4.2,.08,4.5,0,.06,0,M.darkWood);box(camp,1.5,.04,.7,0,.07,2.6,M.darkWood);
const rolled=cylinder(camp,.085,.085,1.45,0,1.8,2.42,M.blue);rolled.rotation.z=Math.PI/2;
for(const x of [-.69,.69])cylinder(camp,.025,.025,1.8,x,.94,2.38,M.wood,8);
box(camp,1.2,.12,2.2,-.7,.18,-.6,M.vest);box(camp,.7,.2,.4,-.7,.3,-1.4,M.cloth);
box(camp,1.2,1,.8,3,.5,1,M.wood);box(camp,1,.7,.75,3.8,.35,0,M.wood);cylinder(camp,.4,.4,.9,-3,.45,1,M.metal);
for(const side of [-1,1]){
 const points=[new T.Vector3(side*2.1,.8,1.9),new T.Vector3(side*3.1,.04,2.8)],geo=new T.BufferGeometry().setFromPoints(points),material=new T.LineBasicMaterial({color:'#bcb599'});materials.push(material);geometries.set('rope:'+side,geo);camp.add(new T.Line(geo,material));
 cylinder(camp,.035,.035,.35,side*3.1,.15,2.8,M.iron,8);
}
bake(camp);
const campEntry={kind:'landmark',id:'scout-camp',name:'Felderítők sátra',group:camp,description:'Nyitott bejáratú ellátósátor, belül fekhellyel. A felderítők a bejárat előtt gyülekeznek és kutatnak.'};entity(camp,campEntry);
bake(architecture);
// Magasabb részletességű lombkoronák, törzsek, kövek és növényzet.
const vegetation=group(scene);
const foliageCanvas=document.createElement('canvas');foliageCanvas.width=foliageCanvas.height=1024;
const fg=foliageCanvas.getContext('2d'),leafRandom=seeded(901);
for(let i=0;i<4800;i++){
 const angle=leafRandom()*Math.PI*2,r=Math.sqrt(leafRandom()),lobe=.75+.15*Math.sin(angle*7)+.08*Math.cos(angle*11);
 const x=512+Math.cos(angle)*r*450*lobe,y=510+Math.sin(angle)*r*460*lobe;
 const shade=Math.floor(leafRandom()*40);fg.fillStyle=`rgb(${46+shade},${75+shade},${35+shade*.7})`;
 fg.beginPath();fg.ellipse(x,y,5+leafRandom()*11,3+leafRandom()*6,angle,0,Math.PI*2);fg.fill();
}
const foliageTexture=new T.CanvasTexture(foliageCanvas);foliageTexture.colorSpace=T.SRGBColorSpace;textures.push(foliageTexture);
const foliageMaterial=new T.MeshStandardMaterial({map:foliageTexture,color:'#c8d6b1',alphaTest:.45,side:T.DoubleSide,roughness:.92});materials.push(foliageMaterial);
for(let i=0;i<96;i++){
 const x=random()*126-60,z=random()*94-47;
 if((x-35)**2+(z+15)**2<64||(x>-35&&x<34&&z>-19&&z<20)||(x>0&&x<15&&z>-17&&z<-5))continue;
 const h=4+random()*5;const trunk=cylinder(vegetation,.14,.27,h*.7,x,h*.35,z,M.bark,10);trunk.rotation.z=(random()-.5)*.1;
 for(let j=0;j<3;j++){const branch=cylinder(vegetation,.035,.11,h*.36,x+(j-1)*.4,h*.55,z,M.bark,8);branch.rotation.z=(j-1)*.7;branch.rotation.y=j*2;}
 for(let j=0;j<5;j++){
  const card=mesh(vegetation,geometry('foliagePlane',()=>new T.PlaneGeometry(1,1)),foliageMaterial,x,h*.76,z,4.5+h*.25,h*.7,1);card.rotation.y=j*Math.PI/5;
 }
 const top=mesh(vegetation,geometry('foliagePlane',()=>new T.PlaneGeometry(1,1)),foliageMaterial,x,h*.87,z,4.5+h*.25,4.5+h*.25,1);top.rotation.x=-Math.PI/2;
}
for(let i=0;i<115;i++){
 const x=random()*104-47,z=random()*76-38;if((x-35)**2+(z+15)**2<64||(x>-34&&x<33&&z>-19&&z<20))continue;
 const rock=mesh(vegetation,geometry('rock',()=>new T.DodecahedronGeometry(1,1)),M.darkConcrete,x,0,z,.2+random()*.7,.16+random()*.4,.25+random()*.5);rock.rotation.set(random(),random(),random());
}
bake(vegetation);
const faceMaterials=new Map();
function facialMaterial(zombie,index){
 const key=(zombie?'z':'h')+(index%4);if(faceMaterials.has(key))return faceMaterials.get(key);
 const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d'),r=seeded(540+index%4);
 const skin=zombie?'#919b84':['#caa184','#c5a18b','#d0ac90','#bf977c'][index%4];g.fillStyle=skin;g.fillRect(0,0,1024,512);
 for(let i=0;i<28000;i++){g.fillStyle=i%2?'#fff0da0c':'#5435230c';g.fillRect(r()*1024,r()*512,1+r()*1.5,1+r()*1.5);}
 const shade=g.createRadialGradient(256,260,20,256,265,170);shade.addColorStop(0,'#fff0da19');shade.addColorStop(.65,'#513b2e00');shade.addColorStop(1,'#513b2e18');g.fillStyle=shade;g.fillRect(75,100,365,350);
 for(const x of [187,325]){
  const cheek=g.createRadialGradient(x,284,0,x,284,48);cheek.addColorStop(0,zombie?'#4a574044':'#a35d4a22');cheek.addColorStop(1,'#7b4a3100');g.fillStyle=cheek;g.fillRect(x-50,234,100,100);
  g.fillStyle=zombie?'#46524166':'#71503b33';g.beginPath();g.ellipse(x,233,34,14,0,0,Math.PI*2);g.fill();
  g.fillStyle=zombie?'#c2c9ad':'#d1cbbb';g.beginPath();g.ellipse(x,229,24,8,0,0,Math.PI*2);g.fill();
  g.fillStyle=zombie?'#7f8a6c':'#4a4635';g.beginPath();g.arc(x,230,7,0,Math.PI*2);g.fill();g.fillStyle='#1f2520';g.beginPath();g.arc(x,230,3.5,0,Math.PI*2);g.fill();
  g.strokeStyle=zombie?'#4d5141':'#65503e';g.lineWidth=4;g.beginPath();g.moveTo(x-23,211);g.quadraticCurveTo(x,203,x+23,210);g.stroke();
  g.strokeStyle='#65433222';g.lineWidth=1;g.beginPath();g.moveTo(x-20,246);g.quadraticCurveTo(x,251,x+20,245);g.stroke();
 }
 g.strokeStyle='#744f3b44';g.lineWidth=3;g.beginPath();g.moveTo(244,253);g.quadraticCurveTo(239,274,248,281);g.moveTo(265,253);g.quadraticCurveTo(274,274,266,281);g.stroke();
 g.fillStyle=zombie?'#665e4e':'#926657';g.beginPath();g.ellipse(256,326,23,5,0,0,Math.PI*2);g.fill();g.strokeStyle='#493d303f';g.lineWidth=1.5;g.beginPath();g.moveTo(232,326);g.quadraticCurveTo(256,330,280,326);g.stroke();
 if(zombie){for(let i=0;i<12;i++){g.fillStyle='#5e53423d';g.beginPath();g.ellipse(155+r()*200,260+r()*100,2+r()*10,1+r()*5,r()*3,0,Math.PI*2);g.fill();}}
 else{for(let i=0;i<750;i++){const x=175+r()*160,y=292+r()*90;if(Math.abs(x-256)<30&&y<340)continue;g.fillStyle='#40362d12';g.fillRect(x,y,1,1);}}
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.push(map);
 const material=new T.MeshStandardMaterial({map,roughness:.82,metalness:0});materials.push(material);faceMaterials.set(key,material);return material;
}
function character(kind,index){
 const g=group(scene),detail=group(g),body=group(detail),zombie=kind==='zombie'||kind==='giant',civilian=kind==='civilian',scout=kind==='scout';
 const uniform=zombie?M.zcloth:scout?M.blue:civilian?M.cloth:M.uniform,skin=zombie?M.zskin:M.skin;
 const faceSurface=facialMaterial(zombie,index);
 const trousers=zombie?M.ztrousers:civilian?M.darkWood:M.uniform;
 capsule(body,.16,.26,0,1.21,0,uniform);sphere(body,.225,.135,.13,0,1.36,0,uniform);
 sphere(body,.17,.13,.13,0,.97,0,trousers);box(body,.34,.055,.26,0,1.025,0,M.boots);
 cylinder(body,.065,.07,.11,0,1.51,0,skin);
 const face=mesh(body,geometry('humanHead',()=>{const g=new T.SphereGeometry(1,32,24),p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);if(y<-.15)p.setX(i,p.getX(i)*(.86+.14*(y+1)/.85));}g.computeVertexNormals();return g;}),faceSurface,0,1.675,.01,.108,.147,.098);
 sphere(body,.016,.033,.018,-.108,1.665,0,skin);sphere(body,.016,.033,.018,.108,1.665,0,skin);
 sphere(body,.014,.028,.022,0,1.662,.105,skin);
 for(const x of [-.043,.043]){
  sphere(body,.02,.011,.009,x,1.699,.098,skin);sphere(body,.016,.0065,.007,x,1.699,.104,M.eyes);sphere(body,.0065,.0065,.004,x,1.698,.111,zombie?M.eyes:M.darkWood);sphere(body,.0033,.004,.003,x,1.698,.114,M.black);sphere(body,.0015,.0015,.001,x-.002,1.701,.117,M.eyes);
  const brow=box(body,.034,.005,.008,x,1.718,.099,zombie?M.zcloth:M.hair);brow.rotation.z=x>0?-.12:.12;
 }
 box(body,.033,.004,.005,0,1.615,.103,zombie?M.blood:M.darkWood);
 if(zombie){
   sphere(body,.033,.013,.012,.058,1.64,.107,M.blood);box(body,.085,.19,.035,-.055,1.2,.149,M.blood);
   for(let i=0;i<4;i++){const rag=box(body,.035,.13,.025,-.1+i*.065,1.02,.13,M.zcloth);rag.rotation.z=(i-2)*.14;}
 }else if(civilian){sphere(body,.113,.06,.108,0,1.776,0,M.hair);}
 else{
   const helmet=mesh(body,geometry('helmet',()=>new T.SphereGeometry(.126,24,16,0,Math.PI*2,0,Math.PI*.49)),scout?M.blue:M.vest,0,1.753,0);helmet.scale.set(1,.88,1.1);
   box(body,.23,.017,.065,0,1.755,.1,scout?M.blue:M.vest);
   box(body,.35,.23,.075,0,1.28,.139,M.vest);box(body,.31,.31,.105,0,1.25,-.15,scout?M.blue:M.vest);
   for(let i=0;i<3;i++){box(body,.085,.1,.065,-.105+i*.105,1.25,.202,M.uniform);box(body,.075,.016,.075,-.105+i*.105,1.29,.208,M.vest);}
   for(const x of [-.14,.14])box(body,.045,.32,.028,x,1.29,.145,M.vest);
   box(body,.03,.045,.025,-.19,1.34,.09,M.iron);
   if(!scout){
     const gun=group(body,.19,1.12,.28);gun.rotation.z=-.2;
     box(gun,.055,.07,.38,0,0,0,M.iron);box(gun,.075,.09,.18,0,-.015,-.23,M.darkWood);
     const barrel=cylinder(gun,.012,.012,.29,0,.01,.3,M.iron,10);barrel.rotation.x=Math.PI/2;
     box(gun,.035,.13,.06,0,-.085,.05,M.iron);box(gun,.025,.035,.12,0,.06,.025,M.black);
   }
 }
 bake(body);
 const arms=[],legs=[];
 for(const side of [-1,1]){
  const shoulder=group(detail,side*.235,1.39,0),upper=group(shoulder);
  capsule(upper,.067,.19,0,-.13,0,uniform);bake(upper);
  const elbow=group(shoulder,0,-.29,0),lower=group(elbow);
  capsule(lower,.055,.17,0,-.11,0,uniform);sphere(lower,.038,.057,.025,0,-.24,.008,skin);for(let f=0;f<4;f++)capsule(lower,.007,.026,-.025+f*.016,-.293,.014,skin);sphere(lower,.01,.027,.011,side*.041,-.25,.025,skin);bake(lower);
  shoulder.rotation.z=side*.08;elbow.rotation.x=-.25;arms.push({shoulder,elbow});
  const hip=group(detail,side*.09,.94,0),thigh=group(hip);
  capsule(thigh,.084,.25,0,-.18,0,trousers);bake(thigh);
  const knee=group(hip,0,-.39,0),shin=group(knee);
  capsule(shin,.064,.24,0,-.17,0,trousers);box(shin,.115,.16,.09,0,-.03,.057,zombie?M.zcloth:M.vest);
  box(shin,.135,.13,.255,0,-.43,.05,M.boots);box(shin,.14,.025,.27,0,-.49,.055,M.black);bake(shin);
  legs.push({hip,knee});
 }
 const low=group(g),lowBody=group(low),lowLegs=[];
 const lowCapsule=geometry('lowCapsule',()=>new T.CapsuleGeometry(1,1,2,6));
 mesh(lowBody,lowCapsule,uniform,0,1.2,0,.16,.23,.13);
 mesh(lowBody,geometry('lowHead',()=>new T.SphereGeometry(1,16,12)),faceSurface,0,1.67,.01,.11,.15,.1);
 for(const side of [-1,1]){
  mesh(lowBody,lowCapsule,uniform,side*.23,1.13,0,.055,.25,.055);
  const leg=group(low,side*.09,.94,0);mesh(leg,lowCapsule,trousers,0,-.4,0,.075,.29,.07);lowLegs.push(leg);
 }
 bake(lowBody);const actor={kind,index,group:g,detail,low,lowBody,lowLegs,body,arms,legs};
 const name=zombie?`Kószáló zombi ${index+1}`:scout?`Felderítő ${index+1}`:civilian?['Márta, kertész','Bence, szerelő','Anna, ellátmányos','Dániel, őrjárat'][index%4]:`Katona ${index+1}`;
 const description=zombie?'A romok között bolyongó fertőzött. Az expedíció során a csapat a körzet zombijaival harcol.':scout?'A háromfős felderítőcsapat tagja. Ellátmányt és bónuszcsomagokat keres a városon kívül.':civilian?'A menedék lakója. Napközben az épületek között járőrözik és dolgozik.':'A helyőrség tagja. Kiképzéssel növelheted a sereget, aranyért pedig a harci morálját.';
 const data={kind:'character',id:`${kind}-${index}`,name,group:g,description,actor};entity(g,data);npcEntries.push(data);actor.data=data;
 return actor;
}
for(let i=0;i<24;i++)soldiers.push(character('soldier',i));
for(let i=0;i<3;i++)scouts.push(character('scout',i));
const zombies=[];for(let i=0;i<11;i++)zombies.push(character('zombie',i));
for(let i=0;i<4;i++)civilians.push(character('civilian',i));
const giant=character('giant',0);giant.group.scale.set(5.2,4.1,5.2);giant.body.scale.set(1.2,1.02,1.1);giant.arms.forEach(a=>{a.shoulder.position.x*=1.3;a.shoulder.scale.set(1.2,1,1.2);});giant.group.position.set(35,0,-15);
giant.data.id='giant';giant.data.name='A Pusztító · Óriászombi';giant.data.description='Tíz alapzombi harci ereje. A megmaradt életerő minden támadás után mentésre kerül. Legyőzése egyszeri, hatalmas zsákmányt ad.';
let lastGiantHp=getState().giant.hp,giantHitUntil=0;

const flashMaterial=new T.MeshBasicMaterial({color:'#ffdf8f'});materials.push(flashMaterial);
const flashes=Array.from({length:8},()=>{const o=sphere(scene,.065,.065,.065,0,1.2,0,flashMaterial);o.castShadow=false;return o;});
const selectionRing=mesh(scene,geometry('selectRing',()=>new T.RingGeometry(.55,.59,64)),new T.MeshBasicMaterial({color:'#d6ef94',side:T.DoubleSide,transparent:true,opacity:.9}));materials.push(selectionRing.material);selectionRing.rotation.x=-Math.PI/2;selectionRing.visible=false;selectionRing.castShadow=false;
const labelLayer=$('world-labels');
const giantLabel=document.createElement('button');giantLabel.className='giant-world-health';giantLabel.id='giant-world-health';
giantLabel.innerHTML=`<span>ÓRIÁSZOMBI</span><strong id="giant-map-percent">${root.Engine.giantPercent(getState())}%</strong><i class="giant-map-track"><i></i></i>`;
giantLabel.addEventListener('click',()=>select(giant.data));labelLayer.append(giantLabel);

for(const entry of buildingEntries){const button=document.createElement('button');button.className='world-label';button.dataset.worldBuilding=entry.id;button.textContent=entry.name;button.addEventListener('click',()=>select(entry));labelLayer.append(button);entry.label=button;}
function updateCamera(){
 const c=cameraState;c.distance=clamp(c.distance,4.2,125);c.pitch=clamp(c.pitch,.25,1.33);c.target.x=clamp(c.target.x,-42,42);c.target.z=clamp(c.target.z,-28,28);
 const horizontal=Math.cos(c.pitch)*c.distance;
 camera.position.set(c.target.x+Math.sin(c.yaw)*horizontal,c.target.y+Math.sin(c.pitch)*c.distance,c.target.z+Math.cos(c.yaw)*horizontal);
 camera.lookAt(c.target);camera.updateMatrixWorld();
 const zoomLabel=`${Math.round(81/c.distance*100)}%`;if($('zoom-level').textContent!==zoomLabel)$('zoom-level').textContent=zoomLabel;
 canvas.dataset.zoom=String(81/c.distance);
}
function focus(entry){
 if(!entry)return;canvas.scrollIntoView({behavior:'instant',block:'center'});select(entry);following=entry.kind==='character'?entry:null;
 entry.group.getWorldPosition(cameraState.target);cameraState.target.y=entry.id==='giant'?(getState().giant.hp>0?4:1):entry.kind==='character'?1.05:1.7;
 cameraState.distance=entry.id==='giant'?18:entry.id==='scout-camp'?12:entry.kind==='character'?4.8:entry.id==='hq'?21:17;
 cameraState.pitch=entry.kind==='character'?.28:.64;if(entry.kind==='character')cameraState.yaw=entry.group.rotation.y;updateCamera();
}
function select(entry){
 selected=entry;const info=$('map-inspector');info.hidden=false;
 $('inspector-title').textContent=entry.name;
 $('inspector-type').textContent=entry.kind==='building'?'BÁZISÉPÜLET':entry.kind==='landmark'?'FELDERÍTŐTÁBOR':entry.id==='giant'?'ÓRIÁSZOMBI · 10× HARCI ERŐ':entry.actor.kind==='zombie'?'KÓSZÁLÓ FERTŐZÖTT':entry.actor.kind==='civilian'?'A MENEDÉK LAKÓJA':'A SAJÁT CSAPATOD';
 $('inspector-description').textContent=entry.description;
 $('inspect-upgrade').hidden=entry.kind!=='building';$('inspect-giant-attack').hidden=entry.id!=='giant';
 canvas.dataset.selected=entry.id;
}
function clearSelection(){selected=null;following=null;selectionRing.visible=false;$('map-inspector').hidden=true;delete canvas.dataset.selected;}
function home(){following=null;clearSelection();cameraState.target.set(-1,0,0);cameraState.distance=81;cameraState.yaw=.18;cameraState.pitch=.87;updateCamera();}
function groundAt(x,y){const r=canvas.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const out=new T.Vector3();return raycaster.ray.intersectPlane(groundPlane,out)?out:null;}
function zoom(factor,x,y){
 following=null;const before=x===undefined?null:groundAt(x,y);cameraState.distance*=factor;updateCamera();
 if(before){const after=groundAt(x,y);if(after){cameraState.target.add(before.sub(after));updateCamera();}}
}
function pick(x,y){
 const r=canvas.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);
 const hits=raycaster.intersectObjects(objects,true);
 for(const hit of hits){let o=hit.object;while(o&&!o.userData.entity)o=o.parent;if(o&&o.visible){let visible=true,n=hit.object;while(n){if(!n.visible)visible=false;n=n.parent;}if(visible)return o.userData.entity;}}
 return null;
}
const pointers=new Map();let dragging=null,pinching=null;
function onPointerDown(e){
 canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointers.size===2){const [a,b]=[...pointers.values()];pinching={distance:Math.hypot(a.x-b.x,a.y-b.y),x:(a.x+b.x)/2,y:(a.y+b.y)/2};dragging=null;}
 else dragging={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,button:e.button,moved:false};
}
function onPointerMove(e){
 if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});following=null;
 if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y),x=(a.x+b.x)/2,y=(a.y+b.y)/2;if(pinching&&distance>0){zoom(pinching.distance/distance,x,y);const p=groundAt(pinching.x,pinching.y),q=groundAt(x,y);if(p&&q)cameraState.target.add(p.sub(q));updateCamera();}pinching={distance,x,y};return;}
 if(!dragging)return;const dx=e.clientX-dragging.x,dy=e.clientY-dragging.y;
 if(Math.hypot(e.clientX-dragging.startX,e.clientY-dragging.startY)>5)dragging.moved=true;
 if(dragging.button===2||e.shiftKey){cameraState.yaw-=dx*.006;cameraState.pitch+=dy*.004;}
 else{const p=groundAt(dragging.x,dragging.y),q=groundAt(e.clientX,e.clientY);if(p&&q)cameraState.target.add(p.sub(q));}
 dragging.x=e.clientX;dragging.y=e.clientY;updateCamera();
}
function onPointerUp(e){
 const click=e.type!=='pointercancel'&&dragging&&!dragging.moved&&!pinching&&pointers.size===1&&e.button===0;
 pointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
 if(click){const found=pick(e.clientX,e.clientY);if(found)select(found);else clearSelection();}
 if(pointers.size===0){dragging=null;pinching=null;}else dragging=null;
}
function onWheel(e){e.preventDefault();zoom(Math.exp(clamp(e.deltaY,-120,120)*.0024),e.clientX,e.clientY);}
function onDoubleClick(e){const found=pick(e.clientX,e.clientY);if(found)focus(found);}
function onContext(e){e.preventDefault();}
function onKey(e){
 const c=cameraState,step=c.distance*.045;let used=true;
 if(e.key==='+'||e.key==='=')zoom(.8);else if(e.key==='-')zoom(1.25);else if(e.key==='Home')home();
 else if(e.key==='ArrowLeft'){c.target.x-=Math.cos(c.yaw)*step;c.target.z+=Math.sin(c.yaw)*step;}
 else if(e.key==='ArrowRight'){c.target.x+=Math.cos(c.yaw)*step;c.target.z-=Math.sin(c.yaw)*step;}
 else if(e.key==='ArrowUp'){c.target.x-=Math.sin(c.yaw)*step;c.target.z-=Math.cos(c.yaw)*step;}
 else if(e.key==='ArrowDown'){c.target.x+=Math.sin(c.yaw)*step;c.target.z+=Math.cos(c.yaw)*step;}
 else if(e.key==='Escape')clearSelection();else used=false;
 if(used){e.preventDefault();following=null;updateCamera();}
}
const events={pointerdown:onPointerDown,pointermove:onPointerMove,pointerup:onPointerUp,pointercancel:onPointerUp,wheel:onWheel,dblclick:onDoubleClick,contextmenu:onContext,keydown:onKey};
for(const [name,handler] of Object.entries(events))canvas.addEventListener(name,handler,name==='wheel'?{passive:false}:undefined);
$('zoom-in').onclick=()=>zoom(.76);$('zoom-out').onclick=()=>zoom(1/.76);$('camera-home').onclick=home;
$('rotate-map').onclick=()=>{following=null;cameraState.yaw+=Math.PI/4;updateCamera();};
$('inspector-close').onclick=clearSelection;$('inspect-closeup').onclick=()=>focus(selected);
$('inspect-giant-attack').onclick=()=>$('attack-giant').click();
$('inspect-upgrade').onclick=()=>{if(selected?.kind==='building')onUpgrade(selected.id);};
for(const button of document.querySelectorAll('[data-camera]'))button.onclick=()=>{
 const id=button.dataset.camera;
 if(id==='base')focus(buildingEntries[0]);
 else if(id==='army'){const available=soldiers.filter(s=>s.group.visible);focus(available[Math.min(3,available.length-1)]?.data||civilians[0].data);}
 else if(id==='zombies')focus(zombies[0].data);
 else if(id==='giant')focus(giant.data);
 else if(id==='scouts'){if(getState().scout)focus(scouts[0].data);else focus(campEntry);}
};
function setQuality(value){
 quality=value;renderer.setPixelRatio(Math.min(root.devicePixelRatio||1,value==='high'?2:1));
 renderer.shadowMap.enabled=value==='high';renderer.shadowMap.needsUpdate=true;lastSize='';
 for(const material of materials){if(!material.isMeshStandardMaterial)continue;if(material.bumpMap&&!material.userData.originalBump)material.userData.originalBump=material.bumpMap;if(material.userData.originalBump){material.bumpMap=value==='high'?material.userData.originalBump:null;material.needsUpdate=true;}}
 $('graphics-quality').value=value;canvas.dataset.quality=value;
}
$('graphics-quality').onchange=e=>setQuality(e.target.value);
const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
const software=debug&&/swiftshader|llvmpipe|software/i.test(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL));
setQuality(root.innerWidth<700||software?'low':'high');
function walk(actor,time,moving=true,zombie=false,battle=false){
 const phase=time*(zombie?4.1:7)+actor.index*.7,amplitude=moving?(zombie?.37:.58):.025;
 const detailed=camera.position.distanceTo(actor.group.position)<(actor.kind==='giant'?65:30);
 actor.detail.visible=detailed;actor.low.visible=!detailed;
 actor.lowBody.position.y=moving?Math.abs(Math.sin(phase))*.02:0;
 actor.lowLegs.forEach((leg,i)=>leg.rotation.x=Math.sin(phase+i*Math.PI)*amplitude);
 actor.body.position.y=moving?Math.abs(Math.sin(phase))*.022:Math.sin(time*1.8+actor.index)*.006;
 actor.body.rotation.z=zombie?Math.sin(phase*.5)*.035:0;
 actor.body.rotation.x=zombie?.09:0;
 actor.legs.forEach((leg,i)=>{const wave=Math.sin(phase+i*Math.PI);leg.hip.rotation.x=wave*amplitude;leg.knee.rotation.x=Math.max(0,-wave)*amplitude*.9;});
 actor.arms.forEach((arm,i)=>{arm.shoulder.rotation.x=zombie?-1.05+Math.sin(phase+i)*.16:battle?-.9:Math.sin(phase+i*Math.PI+Math.PI)*amplitude*.7;arm.elbow.rotation.x=zombie?-.18:battle?-.85:-.3;});
}
function project(world){v.copy(world).project(camera);const r=canvas.getBoundingClientRect();return {x:(v.x*.5+.5)*r.width,y:(-.5*v.y+.5)*r.height,visible:v.z>-1&&v.z<1&&Math.abs(v.x)<1&&Math.abs(v.y)<1};}
let oldLevelSignature='';
const visibilityObserver=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;},{rootMargin:'80px'});visibilityObserver.observe(canvas);
function animate(timestamp){
 if(destroyed)return;frameId=root.requestAnimationFrame(animate);if(!inView||document.hidden)return;if(timestamp-lastRendered<(software?120:32))return;lastRendered=timestamp;
 const now=Date.now(),time=now/1000,state=getState(),mission=timing.missionView(state.mission,now),scout=timing.scoutView(state.scout,now);
 if(previousMission&&!state.mission)aftermath={until:now+3500,win:timing.missionView(previousMission,previousMission.ends).win};previousMission=state.mission;
 if(aftermath&&now>aftermath.until)aftermath=null;
 const actual=state.mission?(state.mission.soldiers??root.Engine.availableSoldiers(state)):root.Engine.availableSoldiers(state);
 const bossMission=state.mission?.kind==='giant',activeRoute=bossMission?giantRoute:battleRoute;
 const count=mission.phase==='return'?Math.max(0,actual-Math.max(1,Math.ceil(actual*(mission.win?.12:bossMission?.25:.35)))):actual;
 const center=state.mission?activeRoute.getPointAt(mission.travel):new T.Vector3(-8,0,3);
 const tangent=state.mission?activeRoute.getTangentAt(mission.travel):new T.Vector3(1,0,0),direction=Math.atan2(tangent.x,tangent.z)+(mission.phase==='return'?Math.PI:0);
 soldiers.forEach((actor,i)=>{actor.group.visible=i<Math.min(24,count);if(!actor.group.visible)return;const col=i%4-1.5,row=Math.floor(i/4);actor.group.position.set(center.x+col*.62,0,center.z+row*.72);actor.group.rotation.y=direction;walk(actor,time,mission.phase==='outbound'||mission.phase==='return',false,mission.phase==='battle');});
 scouts.forEach((actor,i)=>{actor.group.visible=Boolean(state.scout);if(!state.scout)return;const p=scoutRoute.getPointAt(scout.travel),d=scoutRoute.getTangentAt(scout.travel);actor.group.position.set(p.x+(i-1)*.65,0,p.z+(i%2)*.7);actor.group.rotation.y=Math.atan2(d.x,d.z)+(scout.phase==='return'?Math.PI:0);walk(actor,time,scout.phase!=='search');if(scout.phase==='search')actor.group.rotation.y+=Math.sin(time*.4+i)*.8;});
 zombies.forEach((actor,i)=>{
 const p=patrolPosition(i,time),q=patrolPosition(i,time+.1);actor.group.visible=!(!bossMission&&mission.win&&((mission.phase==='battle'&&mission.battle>(i+1)/11)||mission.phase==='return'));
 if(!bossMission&&mission.phase==='battle'){actor.group.position.set(24+(i%3)*.6,0,(Math.floor(i/3)-1)*.9+2);actor.group.rotation.y=-Math.PI/2;}else{actor.group.position.set(p.x,0,p.z);actor.group.rotation.y=Math.atan2(q.x-p.x,q.z-p.z);}
 walk(actor,time,true,true,!bossMission&&mission.phase==='battle');
 });
 const deadGiant=state.giant.hp===0;
 if(state.giant.hp<lastGiantHp)giantHitUntil=now+350;lastGiantHp=state.giant.hp;
 giant.group.position.set(35,deadGiant?1.0:0,-15);giant.group.rotation.set(0,deadGiant?0:-.24,deadGiant?Math.PI/2:0);
 if(!deadGiant){walk(giant,time,false,true,bossMission&&mission.phase==='battle');if(now<giantHitUntil)giant.body.rotation.z+=Math.sin(time*35)*.09;}
 else{giant.detail.visible=true;giant.low.visible=false;}
 $('inspect-giant-attack').disabled=Boolean(state.mission)||deadGiant||root.Engine.availableSoldiers(state)<1;
 if(selected?.id==='giant')$('inspector-description').textContent=`Életerő: ${root.Engine.giantPercent(state)}%. Harci erő: ${root.Engine.giantRules.power}. A sérülés megmarad. Jutalom: 1500 arany és nagy nyersanyagzsákmány.`;
 civilians.forEach((actor,i)=>{const t=time*.075+i*1.6;actor.group.position.set(-16+Math.sin(t)*11,0,3.5+Math.cos(t*.7+i)*.85);actor.group.rotation.y=Math.cos(t)>0?Math.PI/2:-Math.PI/2;walk(actor,time,true);});
 flashes.forEach((o,i)=>{o.visible=mission.phase==='battle'&&(time*7+i)%1<.5;if(o.visible){const t=(time*4+i/8)%1;o.position.set(center.x+((bossMission?35:24)-center.x)*t,1.22+(bossMission?2.3*t:0),center.z+((bossMission?-15:center.z)-center.z)*t+(i%3-1)*.3);}});
 if(following){if(following.group.visible){following.group.getWorldPosition(cameraState.target);cameraState.target.y=following.id==='giant'?(state.giant.hp>0?4:1):1.05;}else following=null;}
 vegetation.visible=quality==='high'||cameraState.distance>25;
 const far=cameraState.distance<25?42:190;if(camera.far!==far){camera.far=far;camera.updateProjectionMatrix();}
 scene.fog.density=cameraState.distance<25?.023:.007;
 updateCamera();
 if(selected&&selected.group.visible){selectionRing.visible=true;selectionRing.position.copy(selected.group.position);selectionRing.position.y=.065;const scale=selected.kind==='building'||selected.id==='giant'?4:1;selectionRing.scale.set(scale,scale,1);}else selectionRing.visible=false;
 const r=canvas.getBoundingClientRect(),size=`${Math.round(r.width)}:${Math.round(r.height)}:${quality}`;
 if(size!==lastSize&&r.width&&r.height){renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();lastSize=size;}
 const levelSignature=JSON.stringify(state.levels);
 for(const entry of buildingEntries){const p=project(entry.group.position.clone().add(new T.Vector3(0,entry.id==='hq'?7:5.2,0)));entry.label.hidden=!p.visible||cameraState.distance<25;entry.label.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;if(levelSignature!==oldLevelSignature)entry.label.textContent=`${entry.name} · ${state.levels[entry.id]}`;}
 const gp=project(new T.Vector3(35,deadGiant?2.2:8.6,-15));giantLabel.hidden=!gp.visible;
 const compactHealth=r.width<600&&gp.y<160;
 giantLabel.style.transform=`translate(${compactHealth?76:clamp(gp.x,80,r.width-80)}px,${Math.max(64,gp.y)}px) translate(-50%,-100%)`;
 const percent=root.Engine.giantPercent(state);$('giant-map-percent').textContent=percent+'%';giantLabel.querySelector('.giant-map-track>i').style.width=(state.giant.hp/root.Engine.giantRules.maxHp*100)+'%';
 giantLabel.setAttribute('aria-label',`Óriászombi életerő: ${percent}%. Kijelölés.`);
 oldLevelSignature=levelSignature;
 const phases={idle:'A helyőrség készen áll',outbound:'A sereg kivonul a bázisról',battle:'Összecsapás a fertőzöttekkel',return:'A túlélők hazafelé tartanak',done:'Az expedíció véget ért'};
 const label=state.mission?(bossMission?(mission.phase==='battle'?'Harc az óriászombival':mission.phase==='outbound'?'A sereg az óriászombihoz vonul':'A csapat hazatér az óriástól'):phases[mission.phase]):aftermath?(aftermath.win?'Győzelem! A sereg hazatért.':'A sereg visszavonult.'):state.scout?`Felderítők: ${scout.phase==='search'?'ellátmányt keresnek':scout.phase==='return'?'hazafelé tartanak':'elhagyják a várost'}`:phases.idle;
 if(label!==lastStatus){$('scene-status').textContent=label;lastStatus=label;}
 $('march-progress').style.width=`${mission.progress*100}%`;
 // A mozgó árnyékokat ritkábban frissítjük, mint a geometriát.
 const shadowSize=clamp(cameraState.distance*.65,10,55);
 light.position.set(cameraState.target.x-22,40,cameraState.target.z+22);light.target.position.copy(cameraState.target);light.target.updateMatrixWorld();
 light.shadow.camera.left=-shadowSize;light.shadow.camera.right=shadowSize;light.shadow.camera.top=shadowSize;light.shadow.camera.bottom=-shadowSize;light.shadow.camera.updateProjectionMatrix();
 renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=frameCount++%4===0;
 renderer.render(scene,camera);canvas.dataset.renderer='webgl';
}
updateCamera();frameId=root.requestAnimationFrame(animate);
const onLost=e=>{e.preventDefault();$('graphics-notice').hidden=false;$('graphics-notice').textContent='A grafikus kapcsolat megszakadt. A játék mentése megmaradt; töltsd újra az oldalt a térkép folytatásához.';};canvas.addEventListener('webglcontextlost',onLost);
return {
 focusBuilding(id){focus(buildingEntries.find(b=>b.id===id));},
 focusGiant(){focus(giant.data);},
 getSnapshot(){return {renderer:'webgl',zoom:81/cameraState.distance,target:cameraState.target.toArray(),camera:camera.position.toArray(),selected:selected?.id||null,pixelRatio:renderer.getPixelRatio(),width:canvas.width,height:canvas.height,detailedCharacters:npcEntries.filter(e=>e.group.visible&&e.actor.detail.visible).length,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,buildings:buildingEntries.map(e=>({id:e.id,...project(e.group.position.clone().add(new T.Vector3(0,1,0)))})),npcs:zombies.map(a=>({id:a.data.id,x:a.group.position.x,z:a.group.position.z,visible:a.group.visible,screen:project(a.group.position.clone().add(new T.Vector3(0,1,0)))})),giant:{hp:getState().giant.hp,percent:root.Engine.giantPercent(getState()),screen:project(new T.Vector3(35,3.5,-15))},camp:{entranceDepth:new T.Raycaster(new T.Vector3(9,1.2,-7.3),new T.Vector3(0,0,-1)).intersectObject(camp,true)[0]?.distance||0},soldiers:soldiers.filter(a=>a.group.visible).length,scouts:scouts.filter(a=>a.group.visible).length};},
 destroy(){destroyed=true;root.cancelAnimationFrame(frameId);for(const [name,handler] of Object.entries(events))canvas.removeEventListener(name,handler);canvas.removeEventListener('webglcontextlost',onLost);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();visibilityObserver.disconnect();labelLayer.replaceChildren();}
};
}
const api={mount,patrolPosition};if(typeof module!=='undefined')module.exports=api;else root.World3D=api;
})(globalThis);
