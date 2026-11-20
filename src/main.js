import { WorldNavigation, isWalkable, surfaceHeight } from './world.js';
import { IsoRenderer, makeScene, makeCrate, makePlayer, makeNpc, makeBeacon } from './renderer.js';
const $=s=>document.querySelector(s), c=$('#stage'), overlay=$('#overlay'), ctx=overlay.getContext('2d');
const status=$('#status'),messages=$('#messages'), targetLabel=$('#targetSurface'), btnGround=$('#modeGround'), btnBridge=$('#modeBridge');
const nav=new WorldNavigation(), renderer=new IsoRenderer(c);const playerMesh=renderer.mesh(makePlayer()),npcMesh=renderer.mesh(makeNpc()),beaconMesh=renderer.mesh(makeBeacon());
const crateMesh=renderer.mesh(makeCrate());let sceneMeshes=makeScene().map(m=>renderer.mesh(m));
const player={x:2,y:0,z:9,surface:'ground',mesh:playerMesh};const npc={x:25,y:0,z:9,mesh:npcMesh};const beacon={x:12,y:3,z:9,mesh:beaconMesh};
const state={targetSurface:'ground',route:[],waypoint:0,mode:'idle',speedBoost:false,crateActive:true,clickTarget:null,info:'',lastRouteCount:0};
function notify(msg){messages.textContent=msg;state.info=msg;}
function setSurface(surface){state.targetSurface=surface;btnGround.classList.toggle('active',surface==='ground');btnBridge.classList.toggle('active',surface==='bridge');targetLabel.textContent=surface==='ground'?'地上':'橋上';}
function navTo(surface,x,z){const route=nav.route(player.surface,player.x,player.z,surface,x,z);
 if(!route?.length){notify('目的地までの経路がありません');return false;}
 state.route=route;state.waypoint=0;state.mode='auto';state.clickTarget=route.at(-1);
 state.lastRouteCount=route.length;notify(`${surface==='bridge'?'橋上':'地上'}へ移動：${route.length}地点を通過`);return true;
}
function setCrate(active){state.crateActive=Boolean(active);nav.setCrate(active);state.route=[];state.mode='idle';$('#crateToggle').textContent=active?'木箱を撤去':'木箱を再設置';notify(active?'障害物を再設置しました':'木箱を撤去しました。経路探索も更新済み');}
function updateManual(dx,dz,dt){if(dx===0&&dz===0)return;state.mode='manual';state.route=[];state.clickTarget=null;
 const mag=Math.hypot(dx,dz),speed=state.speedBoost?4.9:3.5,x0=player.x,z0=player.z,step=speed*dt;
 const move=(xx,zz)=>{let surface=player.surface;
  if(surface==='ground'){
    if(player.x<=6.6&&xx>6.6&&zz>=8.1&&zz<=9.9)surface='bridge';
    if(player.x>=19.4&&xx<19.4&&zz>=8.1&&zz<=9.9)surface='bridge';
  }else if((player.x>=6.05&&xx<6.05)||(player.x<=19.95&&xx>19.95))surface='ground';
  if(isWalkable(surface,xx,zz,nav.options)){player.x=xx;player.z=zz;player.surface=surface;player.y=surfaceHeight(surface,xx);return true;}
  return false;};
 if(!move(x0+dx/mag*step,z0+dz/mag*step)){
  if(!move(x0+dx/mag*step,z0))move(x0,z0+dz/mag*step);
 }
}
const keys=new Set();document.addEventListener('keydown',e=>{
 if(['INPUT','TEXTAREA'].includes(e.target.tagName))return;
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','q','e','Q','E'].includes(e.key)||'wasdWASD'.includes(e.key))e.preventDefault();
 keys.add(e.key.toLowerCase());if(e.key==='Escape'){state.route=[];state.mode='idle';notify('移動を停止しました');}
});document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
let previous=performance.now();function frame(t){const dt=Math.min(.04,(t-previous)/1000);previous=t;
 let dx=0,dz=0;
 if(keys.has('w')||keys.has('arrowup'))dz-=1;if(keys.has('s')||keys.has('arrowdown'))dz+=1;
 if(keys.has('a')||keys.has('arrowleft'))dx-=1;if(keys.has('d')||keys.has('arrowright'))dx+=1;
 if(keys.has('q'))renderer.yaw-=dt*.75;if(keys.has('e'))renderer.yaw+=dt*.75;
 if(dx||dz)updateManual(dx,dz,dt);
 else if(state.route.length){
   const n=state.route[state.waypoint];
   if(!n){state.route=[];state.mode='idle';notify('目的地に到着しました');}
   else {
     const dd=Math.hypot(n.x-player.x,n.z-player.z),step=(state.speedBoost?4.9:3.5)*dt;
     if(dd<=step+.015){player.x=n.x;player.y=n.y;player.z=n.z;player.surface=n.surface;state.waypoint++;}
     else {const f=step/dd;player.x+=(n.x-player.x)*f;player.z+=(n.z-player.z)*f;player.y+=(n.y-player.y)*f;
       // The movement graph permits floor changes only via stair links.
       if(dd<.50)player.surface=n.surface;}
   }
 }
 renderer.render([...sceneMeshes,...(state.crateActive?[crateMesh]:[])],player,npc,beacon);
 const dpr=window.devicePixelRatio||1,w=overlay.clientWidth,h=overlay.clientHeight;ctx.clearRect(0,0,w,h);
 if(state.route.length){ctx.strokeStyle='#ffeaa8';ctx.lineWidth=3;ctx.setLineDash([8,6]);ctx.beginPath();
   const way=[{x:player.x,y:player.y,z:player.z},...state.route.slice(state.waypoint)];
   way.forEach((n,i)=>{const s=renderer.project(n.x,n.y+.14,n.z);i?ctx.lineTo(s.x,s.y):ctx.moveTo(s.x,s.y);});ctx.stroke();ctx.setLineDash([]);
 }
 if(state.clickTarget){const n=state.clickTarget,p=renderer.project(n.x,n.y+.1,n.z);ctx.fillStyle='#ffde8a';ctx.strokeStyle='#3d5261';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.fill();ctx.stroke();}
 const p=renderer.project(player.x,player.y+1.75,player.z);
 ctx.font='bold 13px system-ui,sans-serif';ctx.textAlign='center';ctx.fillStyle='#263748';ctx.fillText('探索者（仮）',p.x+1,p.y+1);ctx.fillStyle='#fff';ctx.fillText('探索者（仮）',p.x,p.y);
 status.textContent=`X ${player.x.toFixed(1)} / Z ${player.z.toFixed(1)} / 高さ ${player.y.toFixed(2)}m / ${player.surface==='ground'?'地上':'橋上'} / ${state.mode==='auto'?'経路移動':state.mode==='manual'?'手動':'停止'}`;
 requestAnimationFrame(frame);
}
function resize(){renderer.resize();const dpr=Math.min(2,window.devicePixelRatio||1);overlay.width=Math.round(overlay.clientWidth*dpr);overlay.height=Math.round(overlay.clientHeight*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
window.addEventListener('resize',resize);resize();requestAnimationFrame(frame);
c.addEventListener('click',e=>{const rect=c.getBoundingClientRect(),p=renderer.pick(e.clientX-rect.left,e.clientY-rect.top,state.targetSurface==='bridge'?3:0);navTo(state.targetSurface,p.x,p.z);});
c.addEventListener('wheel',e=>{e.preventDefault();renderer.zoom=Math.max(8,Math.min(23,renderer.zoom*(e.deltaY>0?1.07:.93)));},{passive:false});
btnGround.addEventListener('click',()=>setSurface('ground'));btnBridge.addEventListener('click',()=>setSurface('bridge'));
$('#routeBridge').addEventListener('click',()=>navTo('bridge',13,9));
$('#routeUnder').addEventListener('click',()=>{player.x=13;player.z=4;player.y=0;player.surface='ground';navTo('ground',13,13);});
$('#routeHole').addEventListener('click',()=>navTo('ground',9,16));
$('#routeStairs').addEventListener('click',()=>navTo('ground',2,9));
$('#crateToggle').addEventListener('click',()=>setCrate(!state.crateActive));
$('#speedToggle').addEventListener('click',()=>{state.speedBoost=!state.speedBoost;$('#speedToggle').textContent=state.speedBoost?'移動速度：+40%':'移動速度：通常';});
$('#reset').addEventListener('click',()=>{player.x=2;player.y=0;player.z=9;player.surface='ground';state.route=[];state.mode='idle';state.clickTarget=null;notify('開始地点に戻りました');});
notify('クリックで移動。橋上を狙う場合は「橋上を指定」に切り替えてください。');
window.polkaDebug={
  getState:()=>({player:{...player,mesh:undefined},targetSurface:state.targetSurface,crateActive:state.crateActive,routeRemaining:state.route.length-state.waypoint,mode:state.mode,webgl:true}),
  routeTo:(surface,x,z)=>navTo(surface,x,z),
  setPlayer:(surface,x,z)=>{if(!isWalkable(surface,x,z,nav.options))throw Error('blocked position');player.x=x;player.z=z;player.y=surfaceHeight(surface,x);player.surface=surface;state.route=[];state.mode='idle';},
  setCrate,
  routeDryRun:(fromSurface,fx,fz,toSurface,tx,tz)=>nav.route(fromSurface,fx,fz,toSurface,tx,tz)?.map(({surface,x,y,z})=>({surface,x,y,z}))??null,
  countNodes:()=>nav.nodes.size,
};
