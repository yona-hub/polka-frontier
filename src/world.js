// Polka Frontier: deterministic, artwork-independent 3D walkability model.
// Coordinates: X/Z horizontal, Y up. Units: metres. Rendering must consume this model,
// never invent a second collidable geometry definition.
export const WORLD = Object.freeze({ width: 28, depth: 20, playerRadius: 0.27 });
export const BRIDGE = Object.freeze({ left: 6, westEnd: 10, eastStart: 16, right: 20, zMin: 7.6, zMax: 10.4, deckY: 3 });
export const HOLE = Object.freeze({ x: 6, z: 15, radius: 1.63 });
export const TREES = Object.freeze([
  { x: 4, z: 5, radius: 0.67 }, { x: 22, z: 15, radius: 0.72 },
  { x: 24, z: 4, radius: 0.67 }, { x: 14, z: 16, radius: 0.7 },
  { x: 3, z: 12, radius: 0.65 }, { x: 25, z: 12, radius: 0.65 },
]);
export const WALLS = Object.freeze([
  { minX: 2, maxX: 5.1, minZ: 3, maxZ: 3.45 },
  { minX: 22.3, maxX: 23, minZ: 7, maxZ: 10 },
]);
export const CRATE = Object.freeze({ minX: 19.65, maxX: 20.4, minZ: 12.65, maxZ: 13.35 });

export function surfaceHeight(surface, x) {
  if (surface === 'ground') return 0;
  if (surface !== 'bridge') throw new Error(`unknown surface ${surface}`);
  if (x <= BRIDGE.westEnd) return Math.max(0, (x - BRIDGE.left) * 0.75);
  if (x >= BRIDGE.eastStart) return Math.max(0, (BRIDGE.right - x) * 0.75);
  return BRIDGE.deckY;
}
export function rectangleContainsInflated(rect, x, z, radius = WORLD.playerRadius) {
  const xx = Math.max(rect.minX, Math.min(rect.maxX, x));
  const zz = Math.max(rect.minZ, Math.min(rect.maxZ, z));
  return Math.hypot(x - xx, z - zz) < radius;
}
export function isWalkable(surface, x, z, { crateActive = true } = {}) {
  const r = WORLD.playerRadius;
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  if (x < r || x > WORLD.width - 1 - r || z < r || z > WORLD.depth - 1 - r) return false;
  if (surface === 'bridge') {
    return x >= BRIDGE.left + 0.01 && x <= BRIDGE.right - 0.01 &&
      z >= BRIDGE.zMin + r && z <= BRIDGE.zMax - r;
  }
  if (surface !== 'ground') return false;
  if (Math.hypot(x - HOLE.x, z - HOLE.z) < HOLE.radius + r) return false;
  if (TREES.some(t => Math.hypot(x - t.x, z - t.z) < t.radius + r)) return false;
  if (WALLS.some(w => rectangleContainsInflated(w, x, z, r))) return false;
  if (crateActive && rectangleContainsInflated(CRATE, x, z, r)) return false;
  // Ramps occupy this volume. The walkable top is represented by the bridge surface.
  if (z >= BRIDGE.zMin - r && z <= BRIDGE.zMax + r &&
      ((x >= BRIDGE.left + .5 && x < BRIDGE.westEnd - .02) ||
       (x > BRIDGE.eastStart + .02 && x <= BRIDGE.right - .5))) return false;
  return true;
}
export function pointOnSurface(surface, x, z) { return { surface, x, z, y: surfaceHeight(surface, x) }; }
export function canTraverseStraight(a, b, opts = {}) {
  const dx=b.x-a.x, dz=b.z-a.z;
  const d=Math.hypot(dx,dz);
  const sampleCount=Math.max(2,Math.ceil(d/.12));
  for (let i=1;i<=sampleCount;i++) {
    const t=i/sampleCount;
    const x=a.x+dx*t,z=a.z+dz*t;
    let surface=a.surface;
    if (a.surface!==b.surface) {
      const crossingWest=(Math.min(a.x,b.x)<=7&&Math.max(a.x,b.x)>=6)&&z>=8&&z<=10;
      const crossingEast=(Math.min(a.x,b.x)<=20&&Math.max(a.x,b.x)>=19)&&z>=8&&z<=10;
      if (!(crossingWest||crossingEast)) return false;
      // Ground and ramp join without a vertical discontinuity.
      surface=t>.01? 'bridge':'ground';
    }
    if (!isWalkable(surface,x,z,opts)) return false;
  }
  return Math.abs(b.y-a.y)<=Math.max(0.81,d*.76+0.08);
}

class Heap {
  constructor(){this.heap=[];}
  push(item){const a=this.heap;a.push(item);let i=a.length-1;while(i>0){let p=(i-1)>>1;if(a[p].score<=item.score)break;a[i]=a[p];i=p;}a[i]=item;}
  pop(){const a=this.heap,top=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].score<a[c].score)c++;if(last.score<=a[c].score)break;a[i]=a[c];i=c;}a[i]=last;}return top;}
  get size(){return this.heap.length;}
}
export const nodeKey=(surface,x,z)=>`${surface[0]}:${x}:${z}`;
export class WorldNavigation {
  constructor(options={}) {this.options={crateActive:true,...options};this.rebuild();}
  rebuild(){
    this.nodes=new Map();this.edges=new Map();
    for(let x=0;x<WORLD.width;x++)for(let z=0;z<WORLD.depth;z++) {
      if(isWalkable('ground',x,z,this.options))this.add('ground',x,z);
      if(x>=7&&x<=19&&z>=8&&z<=10&&isWalkable('bridge',x,z,this.options))this.add('bridge',x,z);
    }
    const adjacent=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
    for (const n of this.nodes.values()) {
      const edges=[];
      for(const [dx,dz] of adjacent){
        const other=this.nodes.get(nodeKey(n.surface,n.x+dx,n.z+dz));
        if(!other)continue;
        if(dx&&dz){
          // Prevent cutting through a corner of a tree, wall or hole.
          if(!this.nodes.has(nodeKey(n.surface,n.x+dx,n.z))||!this.nodes.has(nodeKey(n.surface,n.x,n.z+dz))) continue;
        }
        if(canTraverseStraight(n,other,this.options))edges.push({to:other.key,cost:Math.hypot(dx,dz,other.y-n.y)});
      }
      if(n.surface==='ground' && [6,20].includes(n.x) && n.z>=8&&n.z<=10){
        const bx=n.x===6?7:19;
        const next=this.nodes.get(nodeKey('bridge',bx,n.z));
        if(next)edges.push({to:next.key,cost:Math.hypot(1,next.y-n.y)});
      }
      if(n.surface==='bridge' && [7,19].includes(n.x)){
        const gx=n.x===7?6:20;
        const next=this.nodes.get(nodeKey('ground',gx,n.z));
        if(next)edges.push({to:next.key,cost:Math.hypot(1,next.y-n.y)});
      }
      this.edges.set(n.key,edges);
    }
  }
  add(surface,x,z){const node={...pointOnSurface(surface,x,z),key:nodeKey(surface,x,z)};this.nodes.set(node.key,node);}
  nearest(surface,x,z){let best=null,bd=Infinity;for(const node of this.nodes.values()){if(node.surface!==surface)continue;const d=(x-node.x)**2+(z-node.z)**2;if(d<bd){best=node;bd=d;}}return best;}
  get(surface,x,z){return this.nodes.get(nodeKey(surface,x,z));}
  find(start,end){
    if(!start||!end)return null;
    if(start.key===end.key)return [start];
    const g=new Map([[start.key,0]]),came=new Map(),h=(n)=>Math.hypot(n.x-end.x,n.z-end.z,n.y-end.y);
    const heap=new Heap();heap.push({key:start.key,score:h(start)});
    while(heap.size){const {key}=heap.pop();const here=this.nodes.get(key);
      if(key===end.key){const route=[here];let cur=key;while(came.has(cur)){cur=came.get(cur);route.push(this.nodes.get(cur));}return route.reverse();}
      const dist=g.get(key);
      for(const {to,cost} of this.edges.get(key)||[]){const cand=dist+cost;if(cand<(g.get(to)??Infinity)){g.set(to,cand);came.set(to,key);heap.push({key:to,score:cand+h(this.nodes.get(to))});}}
    }return null;
  }
  route(startSurface,startX,startZ,endSurface,endX,endZ){return this.find(this.nearest(startSurface,startX,startZ),this.nearest(endSurface,endX,endZ));}
  setCrate(active){this.options.crateActive=Boolean(active);this.rebuild();}
}
