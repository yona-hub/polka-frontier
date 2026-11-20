import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BRIDGE, HOLE, WORLD, WorldNavigation, isWalkable, surfaceHeight, canTraverseStraight } from '../src/world.js';
const world=new WorldNavigation();

test('one planar point can be ground underpass or upper bridge at different heights',()=>{
  assert.equal(world.get('ground',13,9).y,0);
  assert.equal(world.get('bridge',13,9).y,3);
  assert.equal(surfaceHeight('bridge',8),1.5);
  assert.equal(surfaceHeight('bridge',18),1.5);
});
test('stairs join ground and elevated walkway in both directions',()=>{
 for(const [s,e] of [[['ground',3,9],['bridge',13,9]],[['bridge',13,9],['ground',22,9]]]){
  const path=world.route(...s,...e);assert.ok(path?.length>3,JSON.stringify({s,e}));
  assert.ok(path.some(p=>p.surface==='bridge'&&p.y>0&&p.y<3));
 }
});
test('underpass route does not teleport onto bridge',()=>{
 const path=world.route('ground',13,4,'ground',13,13);
 assert.ok(path?.length>3);assert.ok(path.every(p=>p.surface==='ground'&&p.y===0));
});
test('hole, trees, walls and ramp undersides are blocked',()=>{
 for(const [x,z] of [[HOLE.x,HOLE.z],[4,5],[3,3.2],[22.5,8],[8,9]]) assert.equal(isWalkable('ground',x,z),false,`${x},${z}`);
 for(const [x,z] of [[13,9],[12,3],[6,9]]) assert.equal(isWalkable('ground',x,z),true);
});
test('dynamic crate changes walkability without changing world floor coordinates',()=>{
 assert.equal(isWalkable('ground',20,13),false);
 const nav=new WorldNavigation({crateActive:false});assert.equal(nav.get('ground',20,13).y,0);
 nav.setCrate(true);assert.equal(nav.get('ground',20,13),undefined);
 nav.setCrate(false);assert.ok(nav.get('ground',20,13));
});
test('every graph edge stays on valid navigable 3D volume and has reciprocal link',()=>{
 for(const [key,edges] of world.edges){const node=world.nodes.get(key);
  for(const {to} of edges){const next=world.nodes.get(to);
   assert.ok(next,`missing edge ${to}`);
   assert.ok(world.edges.get(to).some(x=>x.to===key),`non-reciprocal ${key}->${to}`);
   assert.ok(canTraverseStraight(node,next,world.options)||node.surface!==next.surface,`bad edge ${key}->${to}`);
  }
 }
});
test('1000 deterministic random routes are collision-valid and do not jump between floors',()=>{
 let seed=20261121;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 const nodes=[...world.nodes.values()];
 for(let attempt=0;attempt<1000;attempt++) {
  const a=nodes[Math.floor(rand()*nodes.length)],b=nodes[Math.floor(rand()*nodes.length)];
  const route=world.find(a,b);assert.ok(route,`unreachable ${a.key}->${b.key}`);
  for(let j=1;j<route.length;j++){
   const prev=route[j-1],next=route[j];
   assert.ok(world.edges.get(prev.key).some(e=>e.to===next.key),`not adjacent ${prev.key}->${next.key}`);
   if(prev.surface===next.surface)assert.ok(canTraverseStraight(prev,next,world.options),`invalid segment ${prev.key}->${next.key}`);
   else assert.ok([6,7,19,20].includes(prev.x)&&[6,7,19,20].includes(next.x),`floor switch outside stair ${prev.key}->${next.key}`);
  }
 }
});
test('all valid nodes are within world and obey radius-aware collision',()=>{
 for(const n of world.nodes.values()) {
  assert.ok(n.x>=0&&n.x<WORLD.width&&n.z>=0&&n.z<WORLD.depth);
  assert.ok(isWalkable(n.surface,n.x,n.z));
  if(n.surface==='bridge')assert.ok(n.y>=0&&n.y<=BRIDGE.deckY);
 }
});
