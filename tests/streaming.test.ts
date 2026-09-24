import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Landscape} from '../src/simulation';
import {WorldView} from '../src/world';
// Drawing itself is verified in-browser; here exercise actual mesh generation and disposal.
const drawing=new Proxy({createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(obj,key)=>key in obj?(obj as any)[key]:()=>{}});
(globalThis as any).document={createElement:()=>({width:0,height:0,getContext:()=>drawing})};
const scene=new THREE.Scene(),land=new Landscape('OPEN-ROAD'),world=new WorldView(scene,land);
let disposals=0;
world.update(30,0);
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
