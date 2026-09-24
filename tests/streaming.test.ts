import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Landscape} from '../src/simulation';
import {WorldView} from '../src/world';
// Drawing itself is verified in-browser; here exercise actual mesh generation and disposal.
const drawing=new Proxy({createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(obj,key)=>key in obj?(obj as any)[key]:()=>{}});
(globalThis as any).document={createElement:()=>({width:0,height:0,getContext:()=>drawing})};
const scene=new THREE.Scene(),land=new Landscape('OPEN-ROAD'),world=new WorldView(scene,land);
for(const z of [-1200,-1,0,1,179.99,180,460,1199.99,1200,1200.01,2400]){
 const x=land.trailX(z);
 assert.ok(Math.abs(land.height(x,z)-land.trailY(z))<.001,'dirt track must match terrain height');
 assert.ok(Math.abs(land.trailX(z+.001)-x)<.02,'dirt track must remain continuous');
}
let disposals=0;
world.update(30,0);
const nearbyWildlife=world.fields.get('0:0')?.children[1] as THREE.Group;
const rabbits=nearbyWildlife?.getObjectByName('Rabbits and foxes') as THREE.InstancedMesh;
assert.ok(rabbits?.count>1,'nearby wildlife should include rabbits');
const before=new THREE.Matrix4(),after=new THREE.Matrix4(),rabbitScale=new THREE.Vector3();
rabbits.getMatrixAt(1,before);before.decompose(new THREE.Vector3(),new THREE.Quaternion(),rabbitScale);
assert.ok(rabbitScale.x<1,'rabbits should be smaller than the previous model');
world.animate(1,0,30);rabbits.getMatrixAt(1,after);
assert.notDeepEqual(after.elements,before.elements,'nearby rabbits should move');
const deer=nearbyWildlife.getObjectByName('Deer') as THREE.InstancedMesh;
const deerLegs=nearbyWildlife.getObjectByName('Deer legs') as THREE.InstancedMesh;
assert.ok(deer?.count>0&&deerLegs?.count===deer.count*4,'each deer needs four separate legs');
const deerBodyMatrix=new THREE.Matrix4(),deerLegMatrix=new THREE.Matrix4();
deer.getMatrixAt(0,deerBodyMatrix);deerLegs.getMatrixAt(0,deerLegMatrix);
const relativeLegAtOne=deerBodyMatrix.clone().invert().multiply(deerLegMatrix);
world.animate(2,0,30);deer.getMatrixAt(0,deerBodyMatrix);deerLegs.getMatrixAt(0,deerLegMatrix);
const relativeLegAtTwo=deerBodyMatrix.clone().invert().multiply(deerLegMatrix);
assert.notDeepEqual(relativeLegAtOne.elements,relativeLegAtTwo.elements,'deer legs must swing relative to the body');
const matrix=new THREE.Matrix4(),position=new THREE.Vector3();
for(const chunk of world.chunks.values()){
 const roadside=chunk.children.find(child=>child instanceof THREE.Group) as THREE.Group;
 assert.ok(roadside,'roadside vegetation should be present');
 roadside.traverse(object=>{
  if(!(object instanceof THREE.InstancedMesh))return;
  for(let i=0;i<object.count;i++){
   object.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);
   assert.ok(Math.abs(land.trailDistance(position.x,position.z))>4.8,'roadside vegetation must clear the dirt track');
  }
 });
}
for(const field of world.fields.values()){
 const wilderness=field.children[1];
 wilderness.traverse(object=>{
  if(!(object instanceof THREE.InstancedMesh))return;
  for(let i=0;i<object.count;i++){
   object.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);
   assert.ok(Math.abs(land.trailDistance(position.x,position.z))>4.8,'wilderness vegetation must clear the dirt track');
  }
 });
}
for(const g of world.fields.values())g.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.addEventListener('dispose',()=>disposals++);});
for(const [x,z] of [[2100,30],[2100,2100],[-2300,-2100],[0,30]]){
 world.update(z,x);assert.equal(world.fields.size,49);assert.equal(world.chunks.size,11);
 const g=world.fields.get(`${Math.floor(x/192)}:${Math.floor(z/192)}`)!;assert.ok(g,'terrain must exist below car');
 const positions=(g.children[0] as THREE.Mesh).geometry.getAttribute('position');
 for(let i=0;i<positions.count;i+=53)assert.ok(Math.abs(positions.getY(i)-land.height(positions.getX(i),positions.getZ(i)))<.0001);
 assert.equal(scene.children.length,60,'old world groups must be removed');
}
assert.ok(disposals>150,'obsolete terrain and vegetation geometries must be disposed');
console.log('streaming tests passed: 2D terrain coverage across ±2 km, bounded tile count, deterministic heights and geometry disposal');
