// Offline WebGL1 graybox renderer: genuine 3D vertices, depth-tested occlusion,
// orthographic isometric camera. No remote libraries/assets or copied game art.
import { BRIDGE, CRATE, HOLE, TREES, WALLS, WORLD } from './world.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const col=(hex,shade=1)=>{const v=parseInt(hex.slice(1),16);return [((v>>16)&255)/255*shade,((v>>8)&255)/255*shade,(v&255)/255*shade];};
const add=(a,b)=>a.map((x,i)=>x+b[i]),mul=(a,n)=>a.map(x=>x*n);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>mul(a,1/Math.hypot(...a));
class Mesh {
  constructor(){this.p=[];this.c=[];}
  tri(a,b,c,color){this.p.push(...a,...b,...c);for(let j=0;j<3;j++)this.c.push(...color);}
  quad(a,b,c,d,color){this.tri(a,b,c,color);this.tri(a,c,d,color);}
  box(cx,cy,cz,sx,sy,sz,hex,shade=1){
    const x=cx-sx/2,X=cx+sx/2,y=cy-sy/2,Y=cy+sy/2,z=cz-sz/2,Z=cz+sz/2;
    const c=col(hex,shade),c2=col(hex,shade*.78),c3=col(hex,shade*.62),c4=col(hex,shade*.9);
    this.quad([x,Y,z],[X,Y,z],[X,Y,Z],[x,Y,Z],c);
    this.quad([x,y,z],[X,y,z],[X,Y,z],[x,Y,z],c2);
    this.quad([X,y,z],[X,y,Z],[X,Y,Z],[X,Y,z],c3);
    this.quad([X,y,Z],[x,y,Z],[x,Y,Z],[X,Y,Z],c4);
    this.quad([x,y,Z],[x,y,z],[x,Y,z],[x,Y,Z],c3);
  }
  ramp(x0,x1,z0,z1,h0,h1,hex){
    const c=col(hex),side=col(hex,.74);
    const a=[x0,h0,z0],b=[x1,h1,z0],c0=[x1,h1,z1],d=[x0,h0,z1];
    this.quad(a,b,c0,d,c);
    this.quad([x0,0,z0],[x1,0,z0],b,a,side);
    this.quad([x0,0,z1],[x1,0,z1],c0,d,side);
    this.quad([x0,0,z0],[x0,0,z1],d,a,col(hex,.7));
    this.quad([x1,0,z0],[x1,0,z1],c0,b,col(hex,.7));
  }
  cylinder(cx,cy,cz,r,h,hex,segments=9){
    for(let j=0;j<segments;j++){
      const t=j*2*Math.PI/segments,T=(j+1)*2*Math.PI/segments;
      const x=cx+Math.cos(t)*r,z=cz+Math.sin(t)*r,X=cx+Math.cos(T)*r,Z=cz+Math.sin(T)*r;
      this.quad([x,cy-h/2,z],[X,cy-h/2,Z],[X,cy+h/2,Z],[x,cy+h/2,z],col(hex,.65+.26*(1+Math.sin(t))/2));
      this.tri([cx,cy+h/2,cz],[x,cy+h/2,z],[X,cy+h/2,Z],col(hex,1.1));
    }
  }
  cone(cx,cy,cz,r,h,hex,segments=8){
    for(let j=0;j<segments;j++){
      const t=j*2*Math.PI/segments,T=(j+1)*2*Math.PI/segments;
      this.tri([cx,cy+h/2,cz],[cx+Math.cos(t)*r,cy-h/2,cz+Math.sin(t)*r],
        [cx+Math.cos(T)*r,cy-h/2,cz+Math.sin(T)*r],col(hex,.76+.22*Math.abs(Math.cos(t))));
    }
  }
  diamond(cx,cy,cz,r,h,hex){
    const top=[cx,cy+h/2,cz],bottom=[cx,cy-h/2,cz],p=[[cx+r,cy,cz],[cx,cy,cz+r],[cx-r,cy,cz],[cx,cy,cz-r]];
    for(let j=0;j<4;j++){this.tri(top,p[j],p[(j+1)%4],col(hex,.7+j*.08));this.tri(bottom,p[(j+1)%4],p[j],col(hex,.65+j*.07));}
  }
}
export function makeScene({crateActive=true}={}){
  const world=new Mesh(), deco=new Mesh();
  for(let x=0;x<WORLD.width;x++)for(let z=0;z<WORLD.depth;z++){
    if(Math.hypot(x-HOLE.x,z-HOLE.z)<HOLE.radius+0.1)continue;
    const stone=z>=7.4&&z<=10.6&&x>=10&&x<=16;
    const sw=(x*27+z*71+x*z*3)%13;
    const tile=stone?(sw%3?'#a8adab':'#919aa0'):(sw===0?'#a1c49b':sw%4===0?'#93bb96':'#9bc39a');
    world.box(x,-.20,z,.995,.38,.995,tile);
  }
  // Hole: pit floor and walls remain below walkable height; no traversable top.
  world.box(HOLE.x,-1.62,HOLE.z,3.3,.24,3.3,'#273f55');
  world.box(HOLE.x,-.84,HOLE.z-1.74,3.6,1.6,.25,'#756a65');
  world.box(HOLE.x,-.84,HOLE.z+1.74,3.6,1.6,.25,'#756a65');
  world.box(HOLE.x-1.74,-.84,HOLE.z,.25,1.6,3.5,'#756a65');
  world.box(HOLE.x+1.74,-.84,HOLE.z,.25,1.6,3.5,'#756a65');
  // Upper deck is separate geometry; the lower underpass remains real walkable ground.
  world.box(13,2.84,9,6.10,.32,2.9,'#dbbd8d');
  world.ramp(6,10,7.65,10.35,0,3,'#cfb795');
  world.ramp(16,20,7.65,10.35,3,0,'#cfb795');
  for(let x=7;x<=19;x++){
    const y=x<10?(x-6)*.75:x>16?(20-x)*.75:3;
    for(const z of [7.63,10.37]){
      world.box(x,y+.15,z,.11,.33,.15,'#786e6a');
    }
    if(x<10||x>16)deco.box(x,y+.025,9, .045,.06,2.67,'#e7d9c0');
  }
  for(const z of [7.5,10.5]){
    for(let x=10;x<=16;x+=1.5)world.box(x,3.34,z,.15,.73,.15,'#857969');
    world.box(13,3.57,z,6.6,.15,.15,'#b4a080');
  }
  for(const x of [10.5,15.5])for(const z of [7.35,10.65]){
    world.cylinder(x,1.31,z,.32,2.62,'#9e9183');
  }
  // Trees: visible canopy meshes depth-test against the player naturally.
  TREES.forEach((t,i)=>{
    world.cylinder(t.x,.9,t.z,.27,1.8,'#765f4f',9);
    world.cone(t.x,2.16,t.z,1.5,2.45,i%2?'#417f65':'#477c5b',8);
    world.cone(t.x,3.22,t.z,1.07,1.85,i%2?'#5b9972':'#5c956e',8);
    world.cone(t.x,4.12,t.z,.58,1.28,'#6ca983',7);
  });
  for(const w of WALLS)world.box((w.minX+w.maxX)/2,.57,(w.minZ+w.maxZ)/2,w.maxX-w.minX,1.12,w.maxZ-w.minZ,'#a7a098');
  // Striped low obstacles make collision checks visually obvious.
  for(const [x,z] of [[9,15],[9.75,15.2],[10.6,14.8],[2,16]]) {
    deco.box(x,.22,z,.8,.45,.7,'#a7a39b');
    deco.box(x,.46,z,.39,.12,.40,'#bfb7a9');
  }
  // Portal and map landmarks.
  deco.cylinder(25,.13,9,.95,.25,'#8aa7b5',14);
  for(const dx of [-.68,.68])deco.cylinder(25+dx,1.15,9,.19,2.15,'#677a92');
  deco.box(25,2.33,9,1.7,.33,.40,'#9aa9be');
  deco.diamond(25,1.25,9,.27,.66,'#68d9d3');
  return [world,deco];
}
export function makeCrate(){const mesh=new Mesh();mesh.box(20,.48,13,.8,.94,.8,'#b07b4e');mesh.box(20,.94,13,.74,.10,.72,'#d9b283');return mesh;}
export function makePlayer(){const mesh=new Mesh();
  mesh.cylinder(0,.65,0,.35,1.00,'#5077ae',10);
  mesh.cylinder(0,1.33,0,.29,.45,'#ffe0bf',12);
  mesh.cone(0,1.63,0,.43,.38,'#6b4868',10);
  mesh.box(-.17,.14,0,.20,.30,.20,'#384762');mesh.box(.17,.14,0,.20,.30,.20,'#384762');
  return mesh;
}
export function makeNpc(){const mesh=new Mesh();mesh.cylinder(0,.45,0,.30,.80,'#cf7c65');mesh.cylinder(0,1.08,0,.28,.48,'#fff3d6');mesh.cone(0,1.47,0,.38,.40,'#8f634d');return mesh;}
export function makeBeacon(){const mesh=new Mesh();mesh.cylinder(0,.42,0,.11,.85,'#c7b298');mesh.diamond(0,1.0,0,.34,.74,'#5dc5bb');return mesh;}
const shader=(gl,type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
export class IsoRenderer {
  constructor(canvas){this.canvas=canvas;this.gl=canvas.getContext('webgl',{alpha:false,antialias:true,depth:true,preserveDrawingBuffer:true});
    if(!this.gl)throw Error('WebGL is unavailable. Enable GPU/WebGL support in your browser.');
    const gl=this.gl;
    const v=shader(gl,gl.VERTEX_SHADER,`attribute vec3 p;attribute vec3 c;uniform vec3 right,up,forward,target,shift;uniform vec2 ext;varying vec3 vCol;void main(){vec3 q=p+shift-target;gl_Position=vec4(dot(q,right)/ext.x,dot(q,up)/ext.y,-dot(q,forward)/65.,1.);vCol=c;}`);
    const f=shader(gl,gl.FRAGMENT_SHADER,`precision mediump float;varying vec3 vCol;void main(){gl_FragColor=vec4(vCol,1.);}`);
    const pr=this.program=gl.createProgram();gl.attachShader(pr,v);gl.attachShader(pr,f);gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(pr));gl.useProgram(pr);
    this.loc={p:gl.getAttribLocation(pr,'p'),c:gl.getAttribLocation(pr,'c'),right:gl.getUniformLocation(pr,'right'),up:gl.getUniformLocation(pr,'up'),forward:gl.getUniformLocation(pr,'forward'),target:gl.getUniformLocation(pr,'target'),shift:gl.getUniformLocation(pr,'shift'),ext:gl.getUniformLocation(pr,'ext')};
    this.yaw=.69;this.zoom=13.6;this.target=[13.5,.8,9.5];this.resize();
  }
  mesh(mesh){const gl=this.gl, pos=gl.createBuffer(),color=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pos);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.p),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,color);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.c),gl.STATIC_DRAW);return{pos,color,count:mesh.p.length/3};}
  disposeMesh(mesh){if(!mesh)return;this.gl.deleteBuffer(mesh.pos);this.gl.deleteBuffer(mesh.color);}
  resize(){const rect=this.canvas.getBoundingClientRect();const dpr=Math.min(2,window.devicePixelRatio||1);this.canvas.width=Math.max(1,Math.round(rect.width*dpr));this.canvas.height=Math.max(1,Math.round(rect.height*dpr));this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}
  basis(){const forward=norm([Math.cos(this.yaw)*.72,.93,Math.sin(this.yaw)*.72]);const right=norm(cross([0,1,0],forward));const up=norm(cross(forward,right));return {forward,right,up,halfH:this.zoom,halfW:this.zoom*this.canvas.width/this.canvas.height};}
  uniforms(){const gl=this.gl,l=this.loc,b=this.basis();gl.uniform3fv(l.right,b.right);gl.uniform3fv(l.up,b.up);gl.uniform3fv(l.forward,b.forward);gl.uniform3fv(l.target,this.target);gl.uniform2f(l.ext,b.halfW,b.halfH);return b;}
  drawMesh(mesh,x=0,y=0,z=0){const gl=this.gl,l=this.loc;if(!mesh||mesh.count<1)return;gl.uniform3f(l.shift,x,y,z);
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pos);gl.enableVertexAttribArray(l.p);gl.vertexAttribPointer(l.p,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.color);gl.enableVertexAttribArray(l.c);gl.vertexAttribPointer(l.c,3,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,mesh.count);
  }
  render(meshes,player,npc,beacon){const gl=this.gl;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(.79,.87,.88,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.BLEND);this.uniforms();for(const m of meshes)this.drawMesh(m);
    this.drawMesh(npc.mesh,npc.x,npc.y,npc.z);this.drawMesh(beacon.mesh,beacon.x,beacon.y,beacon.z);this.drawMesh(player.mesh,player.x,player.y,player.z);
  }
  project(x,y,z){const b=this.basis(),q=[x-this.target[0],y-this.target[1],z-this.target[2]];
    return {x:this.canvas.clientWidth*(.5+dot(q,b.right)/(2*b.halfW)),y:this.canvas.clientHeight*(.5-dot(q,b.up)/(2*b.halfH))};}
  pick(pixelX,pixelY,planeY){const b=this.basis();const nx=pixelX/this.canvas.clientWidth*2-1,ny=1-pixelY/this.canvas.clientHeight*2;
    const origin=add(add(this.target,mul(b.right,nx*b.halfW)),mul(b.up,ny*b.halfH));
    const t=(origin[1]-planeY)/b.forward[1];return {x:origin[0]-b.forward[0]*t,z:origin[2]-b.forward[2]*t};
  }
}
