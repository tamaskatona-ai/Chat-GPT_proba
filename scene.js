/* A térkép kizárólag megjelenít: a csata eredményét továbbra is az Engine dönti el. */
(function (root) {
  const duration = 15000;
  function missionView(mission, now) {
    if (!mission) return { phase: 'idle', progress: 0, travel: 0, battle: 0 };
    const progress = Math.max(0, Math.min(1, (now - (mission.ends - duration)) / duration));
    const phase = progress < .4 ? 'outbound' : progress < .7 ? 'battle' : progress < 1 ? 'return' : 'done';
    const travel = progress < .4 ? progress / .4 : progress < .7 ? 1 : Math.max(0, 1 - (progress - .7) / .3);
    return { phase, progress, travel, battle: Math.max(0, Math.min(1, (progress - .4) / .3)), win: mission.kind==='giant'?mission.damageTotal>=mission.giantHpAtStart:mission.power >= mission.enemy };
  }
  function scoutView(scout, now) {
    if(!scout)return {phase:'idle',progress:0,travel:0};
    const progress=Math.max(0,Math.min(1,(now-scout.started)/(scout.ends-scout.started)));
    const phase=now<scout.searchStarts?'outbound':now<scout.searchEnds?'search':now<scout.ends?'return':'done';
    const travel=phase==='outbound'?Math.max(0,(now-scout.started)/(scout.searchStarts-scout.started)):phase==='search'?1:Math.max(0,1-(now-scout.searchEnds)/(scout.ends-scout.searchEnds));
    return {phase,progress,travel};
  }
  const sites = [
    { id: 'hq', x: 170, y: 270, w: 102, h: 75, color: '#829a78', roof: '#445d52' },
    { id: 'farm', x: 315, y: 260, w: 92, h: 53, color: '#93bea0', roof: '#578d80' },
    { id: 'sawmill', x: 170, y: 410, w: 96, h: 55, color: '#ac8861', roof: '#665e48' },
    { id: 'mine', x: 315, y: 410, w: 87, h: 65, color: '#9a9f91', roof: '#596872' },
    { id: 'barracks', x: 450, y: 280, w: 87, h: 57, color: '#89966b', roof: '#4e6343' },
    { id: 'wall', x: 493, y: 425, w: 76, h: 42, color: '#899384', roof: '#566557' }
  ];
  function mountFallback(canvas, getState, onSelect) {
    const ctx = canvas.getContext('2d');
    const W = 1100, H = 590;
    const status = document.getElementById('scene-status');
    const progressBar = document.getElementById('march-progress');
    const phaseText = { idle: 'A helyőrség készen áll', outbound: 'A sereg kivonul a bázisról', battle: 'Összecsapás a fertőzöttekkel', return: 'A túlélők hazafelé tartanak', done: 'Az expedíció véget ért' };
    let selected = 'hq', previousMission = null, aftermath = null, frameId, lastStatus = '';
    function poly(points, color, stroke) {
      ctx.beginPath(); points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
      ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
    }
    function ellipse(x,y,rx,ry,color) {ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
    function text(value,x,y,size=12,color='#e9efdb',align='center') {ctx.font=`600 ${size}px system-ui, sans-serif`;ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(value,x,y);}
    function box(x,y,w,h,color,roof) {
      poly([[x-w/2,y],[x+w/2,y],[x+w/2,y-h],[x-w/2,y-h]],color);
      poly([[x+w/2,y],[x+w/2+17,y-12],[x+w/2+17,y-h-12],[x+w/2,y-h]],'#39483d');
      poly([[x-w/2,y-h],[x-w/2+17,y-h-12],[x+w/2+17,y-h-12],[x+w/2,y-h]],roof);
    }
    function tree(x,y,s=1) {
      ellipse(x+6*s,y+3*s,14*s,5*s,'#142d2b55');
      ctx.fillStyle='#604e39';ctx.fillRect(x-2*s,y-20*s,4*s,22*s);
      poly([[x-19*s,y-12*s],[x,y-52*s],[x+19*s,y-12*s]],'#274c3e');
      poly([[x-15*s,y-25*s],[x,y-62*s],[x+15*s,y-25*s]],'#3d6650');
      poly([[x,y-62*s],[x+15*s,y-25*s],[x+4*s,y-25*s]],'#315641');
    }
    function road() {
      ctx.beginPath();ctx.moveTo(490,350);ctx.bezierCurveTo(650,360,680,440,805,361);ctx.bezierCurveTo(855,330,900,330,960,325);
      ctx.strokeStyle='#35433c';ctx.lineWidth=67;ctx.stroke();ctx.strokeStyle='#8f8e70';ctx.lineWidth=51;ctx.stroke();
      ctx.setLineDash([9,13]);ctx.strokeStyle='#c3ba8b77';ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);
    }
    function point(t,isGiant=false,target=null) {
      // Bézier-útvonal a bázis kapujától a fertőzött körzetig.
      const u=1-t;
      if(target)return {x:510+(650+target.x*5-510)*t,y:351+(345+target.z*3.5-351)*t};
      return isGiant?{x:u*u*u*510+3*u*u*t*700+3*u*t*t*850+t*t*t*980,y:u*u*u*351+3*u*u*t*300+3*u*t*t*260+t*t*t*300}:{x:u*u*u*510+3*u*u*t*680+3*u*t*t*710+t*t*t*896,y:u*u*u*351+3*u*u*t*400+3*u*t*t*451+t*t*t*345};
    }
    function human(x,y,time,i,zombie=false,facing=1,moving=true,dead=false,scout=false) {
      ctx.save();ctx.translate(x,y);ctx.scale(facing,1);
      if(dead){ctx.rotate(-Math.PI/2);ctx.globalAlpha=.4;}
      ellipse(1,2,8,3,'#11201d66');
      const step=moving?Math.sin(time*11+i*1.9)*4:Math.sin(time*2+i)*.5;
      ctx.lineWidth=3;ctx.lineCap='round';ctx.strokeStyle=zombie?'#514c42':'#273e3b';
      ctx.beginPath();ctx.moveTo(-3,-7);ctx.lineTo(-4+step,1);ctx.moveTo(3,-7);ctx.lineTo(4-step,1);ctx.stroke();
      ctx.fillStyle=zombie?'#7c8861':scout?'#6bb9be':'#5d8172';ctx.fillRect(-5,-19,10,12);
      ctx.fillStyle=zombie?'#9ba56b':'#e0b78a';ctx.fillRect(-4,-27,8,8);
      if(!zombie){ellipse(0,-27,6,3,scout?'#367f8c':'#3c6255');ctx.fillStyle='#253733';ctx.fillRect(1,-17,12,3);ctx.fillStyle='#93a283';ctx.fillRect(-7,-18,3,9);}
      else {ctx.strokeStyle='#99a56f';ctx.beginPath();ctx.moveTo(3,-17);ctx.lineTo(12,-14+step*.3);ctx.stroke();}
      ctx.restore();
    }
    function building(site,state,time) {
      const {id,x,y,w,h,color,roof}=site;
      if(selected===id){ellipse(x+4,y+6,w*.78,22,'#d6ed9122');ctx.strokeStyle='#d6ed91';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x+4,y+6,w*.78,22,0,0,Math.PI*2);ctx.stroke();}
      ellipse(x+12,y+6,w*.7,13,'#14261b66');box(x,y,w,h,color,roof);
      if(id==='farm'){
        for(let i=0;i<4;i++){ctx.fillStyle='#8ec9b4';ctx.fillRect(x-w/2+5+i*22,y-h+7,16,h-14);ctx.strokeStyle='#dae2bc';ctx.strokeRect(x-w/2+5+i*22,y-h+7,16,h-14);}
      } else {
        for(let i=0;i<Math.floor(w/24);i++){ctx.fillStyle='#263e3d';ctx.fillRect(x-w/2+10+i*24,y-h+13,13,14);ctx.fillStyle='#f1ca7866';ctx.fillRect(x-w/2+12+i*24,y-h+15,5,10);}
        ctx.fillStyle='#34433c';ctx.fillRect(x-7,y-23,18,23);
      }
      if(id==='hq'){box(x-8,y-h+4,30,22,'#7b8f77','#556b5a');ctx.strokeStyle='#c4c3a0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+27,y-h);ctx.lineTo(x+27,y-h-38);ctx.stroke();poly([[x+28,y-h-38],[x+53,y-h-32+Math.sin(time*3)*3],[x+28,y-h-23]],'#d6ed91');}
      if(id==='mine'){box(x+19,y-h+1,15,33,'#6e7b75','#45594f');for(let i=0;i<3;i++)ellipse(x+27+Math.sin(time+i)*5,y-h-38-((time*12+i*15)%36),7+i*3,5+i*2,'#d2d7b41a');}
      if(id==='sawmill'){for(let i=0;i<4;i++){ctx.fillStyle='#b6986c';ctx.fillRect(x-w/2-12,y-12+i*5,35,4);}}
      if(id==='wall'){ctx.fillStyle='#bac1a3';for(let i=0;i<5;i++)ctx.fillRect(x-w/2+i*17,y-h-5,10,10);}
      ctx.fillStyle='#172b25e8';ctx.fillRect(x-67,y+13,140,23);text(`${root.Engine.buildings[id].name} · ${state.levels[id]}`,x+3,y+29,10);
    }
    function draw(now) {
      const state=getState(),time=now/1000;
      if(previousMission&&!state.mission)aftermath={until:now+3500,win:missionView(previousMission,previousMission.ends).win,gold:previousMission.kind==='giant'?root.Engine.rulesForGiant(previousMission.giantId??0).loot.gold:previousMission.kind==='pvp'?(state.lastPvpLootGold||0):root.Engine.goldReward(previousMission.zone)};
      previousMission=state.mission;
      if(aftermath&&now>aftermath.until)aftermath=null;
      const view=missionView(state.mission,now),scout=scoutView(state.scout,now);
      const dpr=Math.min(root.devicePixelRatio||1,2),width=Math.round(canvas.clientWidth*dpr),height=Math.round(canvas.clientHeight*dpr);
      if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
      ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
      const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#628465');bg.addColorStop(.6,'#4b6950');bg.addColorStop(1,'#3d5148');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
      poly([[0,45],[170,20],[340,93],[550,25],[760,56],[990,10],[1100,49],[1100,0],[0,0]],'#92a382');
      for(let i=0;i<170;i++){const x=(i*137.7)%W,y=(i*97.3)%H;ellipse(x,y,1+(i%3),1,'#d2d1971a');}
      // A kibővített vidék 2D tartaléknézete is mutatja a tavakat, dombokat és vetéseket.
      for(const h of root.Engine.hills){const x=650+h.x*5,y=345+h.z*3.5;ellipse(x,y,h.r*5,h.r*2.7,'#a3ae6d');ellipse(x-8,y-9,h.r*3,h.r*1.5,'#b8ba7c');}
      const lake=root.Engine.lake;ellipse(650+lake.x*5,345+lake.z*3.5,lake.rx*5+4,lake.rz*3.5+4,'#baa579');ellipse(650+lake.x*5,345+lake.z*3.5,lake.rx*5,lake.rz*3.5,'#6c9ca6');
      ctx.fillStyle='#857048';ctx.fillRect(25,230,65,85);for(let i=0;i<9;i++){ctx.fillStyle=i%2?'#c5b476':'#9b995b';ctx.fillRect(30+i*6,234,3,77);}
      road();
      ctx.beginPath();ctx.moveTo(565,350);ctx.bezierCurveTo(614,315,625,225,730,215);
      ctx.strokeStyle='#93c1b355';ctx.lineWidth=17;ctx.stroke();
      ctx.setLineDash([4,7]);ctx.strokeStyle='#a4dbcc';ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);
      for(let i=0;i<35;i++){const x=(i*131)%W,y=(i*79)%H;if((x>75&&x<580&&y>130&&y<500)||(y>295&&y<470))continue;tree(x,y,.65+(i%4)*.12);}
      // Sol en pierre et enceinte du camp.
      poly([[87,172],[526,172],[557,470],[87,470]],'#a7ab8066','#bbc09255');
      ctx.strokeStyle='#b4af85';ctx.lineWidth=25;ctx.beginPath();ctx.moveTo(120,332);ctx.lineTo(515,332);ctx.moveTo(260,208);ctx.lineTo(260,447);ctx.stroke();
      ctx.strokeStyle='#566b5a';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(70,480);ctx.lineTo(70,150);ctx.lineTo(559,150);ctx.lineTo(559,317);ctx.moveTo(559,387);ctx.lineTo(559,480);ctx.lineTo(70,480);ctx.stroke();
      for(let x=78;x<558;x+=22){box(x,154,13,17,'#87937a','#a6ac8f');box(x,484,13,17,'#87937a','#a6ac8f');}
      sites.forEach(site=>building(site,state,time));
      box(563,320,30,51,'#889a84','#556d58');box(563,404,30,51,'#889a84','#556d58');
      text('ÉSZAKI MENEDÉK',300,112,17,'#e3e9ce');text(`HARCI MORÁL +${root.Engine.moraleBonus(state)}%`,300,516,12,'#f3d486');text('A bázis épületeire kattintva fejleszthetsz',300,132,10,'#d3dfbd');
      // Romok, barikádok és a célterület.
      for(let i=0;i<4;i++){let x=874+(i%2)*116,y=208+Math.floor(i/2)*244;box(x,y,65,50+(i%3)*17,'#78817a','#4c5d56');poly([[x-30,y-50],[x-10,y-65],[x+2,y-45],[x+17,y-56],[x+32,y-50]],'#43574b');ctx.fillStyle='#2a3934';ctx.fillRect(x-12,y-29,14,29);}
      text(`FERTŐZÖTT KÖRZET · ${state.mission?.zone||state.zone}`,924,104,14,'#f1d3a5');
      ellipse(913,353,80,50,'#d6a36a12');
      // A felderítők külön táborban kutatnak, távol a harcoló seregtől.
      ellipse(730,211,62,30,'#b3d9bc22');
      poly([[690,211],[721,169],[754,211]],'#78a69b');
      poly([[721,169],[754,211],[774,198],[745,164]],'#486f68');
      poly([[708,211],[721,186],[736,211]],'#294c43');
      box(774,228,22,17,'#c0a16b','#d9bb7e');box(791,213,18,14,'#aa8b5e','#cbb37b');
      text('ELHAGYOTT ELLÁTÓHELY',735,143,11,'#c9f1df');
      const bossMission=state.mission?.kind==='giant',raidMission=state.mission?.kind==='pvp';
      const armySoldiers=state.mission?(state.mission.soldiers??root.Engine.availableSoldiers(state)):root.Engine.availableSoldiers(state);
      const armyCount=Math.min(24,armySoldiers);
      let center=view.phase==='idle'?{x:395,y:340}:point(view.travel,bossMission,state.mission?.target);
      let showCount=armyCount;
      if(view.phase==='return'||view.phase==='done')showCount=Math.max(0,armyCount-Math.max(1,Math.ceil(armyCount*(view.win?(raidMission?.15:.12):bossMission?.25:.35))));
      const moving=view.phase==='outbound'||view.phase==='return';
      for(let i=0;i<showCount;i++){
        let x=center.x+(i%4)*13-25,y=center.y+Math.floor(i/4)*14-15;
        human(x,y,time,i,false,view.phase==='return'?-1:1,moving);
      }
      if(showCount)text(`${view.phase==='idle'?'HELYŐRSÉG':'SEREG'} · ${view.phase==='return'?Math.max(0,armySoldiers-Math.max(1,Math.ceil(armySoldiers*(view.win?(raidMission?.15:.12):bossMission?.25:.35)))):armySoldiers}`,center.x,center.y-57,11,'#f2f5d9');
      if(state.scout){
        const t=scout.travel,u=1-t;
        const sx=u*u*u*565+3*u*u*t*614+3*u*t*t*625+t*t*t*730;
        const sy=u*u*u*350+3*u*u*t*315+3*u*t*t*225+t*t*t*215;
        for(let i=0;i<state.scout.soldiers;i++){
          const x=sx+(i-1)*16,y=sy+(i%2)*11;
          human(x,y,time,i,false,scout.phase==='return'?-1:1,scout.phase!=='search',false,true);
          if(scout.phase==='return'){ctx.fillStyle='#e1bd74';ctx.fillRect(x-9,y-19,6,9);}
          if(scout.phase==='search'){
            ctx.strokeStyle='#b0e8e4';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+11+Math.sin(time*2+i)*3,y-19,4,0,Math.PI*2);ctx.moveTo(x+14,y-16);ctx.lineTo(x+19,y-10);ctx.stroke();
          }
        }
        const remaining=Math.max(0,Math.ceil((state.scout.ends-now)/1000));
        const clock=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
        text(`3 FELDERÍTŐ · ${scout.phase==='search'?'KUTATÁS':scout.phase==='return'?'HAZATÉRÉS':'KIVONULÁS'} · ${clock}`,sx,sy-46,10,'#d2fff5');
      }
      const zombies=root.Engine.zombieCount;
      for(let i=0;i<zombies;i++){
        const engaged=Boolean(state.mission)&&!bossMission&&!raidMission&&i===(state.mission.targetId??0),fighting=engaged&&view.phase==='battle',dead=engaged&&view.win&&(view.phase==='return'||view.phase==='done'||(fighting&&view.battle>.8));
        const p=root.Engine.zombiePosition(i,now),target=engaged?(state.mission.target||p):p;
        const x=650+target.x*5,y=345+target.z*3.5;
        if(!dead||view.phase==='battle')human(x,y,time,i,true,-1,fighting,dead);
      }
      if(raidMission){for(let i=0;i<Math.min(12,state.mission.defenderSoldiers);i++)human(650+state.mission.target.x*5+(i%3)*12,345+state.mission.target.z*3.5+Math.floor(i/3)*12,time,i,false,-1,false);text(state.mission.defenderName+' bázisa',920,355,12,'#f0bc91');}
      if(view.phase==='battle'){
        for(let i=0;i<4;i++){
          const p=(time*3+i*.24)%1,start={x:center.x+10,y:center.y-26+i*12};
          ctx.strokeStyle='#ffe7a1';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(start.x+p*62,start.y);ctx.lineTo(start.x+p*62+12,start.y);ctx.stroke();
          if(p<.28){ellipse(start.x+9,start.y,6,3,'#ffda81');}
        }
        text('ÖSSZECSAPÁS',916,290,13,'#ffe1a1');
      }
      state.giants.forEach((giant,id)=>{
       const gp=root.Engine.giantPosition(state,now,id),gx=650+gp.x*5,gy=345+gp.z*3.5,scale=2.1+id*.08;
       ctx.save();ctx.translate(gx,gy);ctx.scale(scale,scale);human(0,0,time,id,true,-1,giant.hp>0,giant.hp===0);ctx.restore();
       const percent=root.Engine.giantPercent(state,id);ctx.fillStyle='#2b231de8';ctx.fillRect(gx-46,gy-93,92,27);text(`${root.Engine.giantTypes[id]}× · ${percent}%`,gx,gy-80,10,'#ffd7a6');
       ctx.fillStyle='#59402c';ctx.fillRect(gx-40,gy-74,80,4);ctx.fillStyle='#df9c63';ctx.fillRect(gx-40,gy-74,80*giant.hp/root.Engine.rulesForGiant(id).maxHp,4);
      });
      if(aftermath){ctx.fillStyle='#14281ff0';ctx.fillRect(357,42,386,43);text(aftermath.win?`GYŐZELEM · +${aftermath.gold} ARANY ÉS ZSÁKMÁNY`:'VISSZAVONULÁS · Erősítsd a sereget!',550,69,14,aftermath.win?'#d6ed91':'#f0bc91');}
      // A térkép jelmagyarázata az alsó sávban.
      ctx.fillStyle='#152b25d9';ctx.fillRect(0,548,W,42);text('● SAJÁT BÁZIS',28,574,10,'#d6ed91','left');text('━ EXPEDÍCIÓ ÚTVONALA',210,574,10,'#d2caa6','left');text('● FERTŐZÖTTEK',W-30,574,10,'#e8bb8b','right');
      const label=state.scout&&view.phase==='idle'?`Felderítők: ${scout.phase==='search'?'ellátmányt keresnek':scout.phase==='return'?'hazafelé tartanak':'elhagyják a várost'}`:aftermath?(aftermath.win?'Győzelem! A sereg hazatért.':'A sereg visszavonult.'):phaseText[view.phase];
      if(label!==lastStatus){status.textContent=label;lastStatus=label;}
      progressBar.style.width=`${view.progress*100}%`;
      frameId=root.requestAnimationFrame(()=>draw(Date.now()));
    }
    function selectAt(event) {
      const r=canvas.getBoundingClientRect(),x=(event.clientX-r.left)/r.width*W,y=(event.clientY-r.top)/r.height*H;
      const site=sites.find(s=>x>s.x-s.w/2-8&&x<s.x+s.w/2+22&&y>s.y-s.h-20&&y<s.y+38);
      if(site){selected=site.id;onSelect(site.id);}
    }
    canvas.addEventListener('click',selectAt);
    draw(Date.now());
    return { destroy(){root.cancelAnimationFrame(frameId);canvas.removeEventListener('click',selectAt);} };
  }
  function mount(canvas,getState,onSelect){
    if(root.World3D){
      try{return root.World3D.mount(canvas,getState,onSelect,{missionView,scoutView});}
      catch(error){console.warn('A 3D térkép nem indult el:',error.message);}
    }
    const notice=document.getElementById('graphics-notice');
    if(notice){notice.hidden=false;notice.textContent='A 3D nézethez WebGL-t támogató böngésző és bekapcsolt grafikus gyorsítás szükséges. Most a 2D tartaléknézet látható.';}
    document.getElementById('map-controls')?.setAttribute('hidden','');
    const replacement=canvas.cloneNode(false);canvas.replaceWith(replacement);
    return mountFallback(replacement,getState,onSelect);
  }
  const api={missionView,scoutView,mount};
  if(typeof module!=='undefined')module.exports=api;else root.BattleScene=api;
})(globalThis);
