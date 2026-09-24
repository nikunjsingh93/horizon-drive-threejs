import * as THREE from 'three';
import type {Landscape} from './simulation';

const clamp01=(value:number)=>Math.max(0,Math.min(1,value));

/** One grip-loss signal drives both the tire sound and the road marks. */
export function skidAmount(speed:number,brake:number,handbrake:boolean,slip:number,offroad:boolean):number {
  if(offroad)return 0;
  const velocity=Math.abs(speed),rolling=clamp01((velocity-5)/12);
  const hardBrake=clamp01((brake-.68)/.32)*rolling;
  const lockedRear=handbrake?clamp01((velocity-4)/8)*.85:0;
  const sideways=clamp01((Math.abs(slip)-.09)/.25)*rolling;
  return Math.max(hardBrake,lockedRear,sideways);
}

const MAX_MARKS=1024;
type WheelPair=[THREE.Vector3,THREE.Vector3];

/** A single dynamic mesh holds a bounded ring of dark rear-tire strips. */
export class SkidMarks {
  private positions=new Float32Array(MAX_MARKS*4*3);
  private geometry=new THREE.BufferGeometry();
  private cursor=0;
  private count=0;
  private previous:WheelPair|null=null;
  readonly mesh:THREE.Mesh;

  constructor(scene:THREE.Scene,private landscape:Landscape){
    const indices=new Uint16Array(MAX_MARKS*6);
    for(let i=0;i<MAX_MARKS;i++){const v=i*4,j=i*6;indices.set([v,v+1,v+2,v+1,v+3,v+2],j);}
    this.geometry.setIndex(new THREE.BufferAttribute(indices,1));
    this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setDrawRange(0,0);
    const material=new THREE.MeshBasicMaterial({color:0x171915,transparent:true,opacity:.42,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
    this.mesh=new THREE.Mesh(this.geometry,material);
    this.mesh.frustumCulled=false;
    this.mesh.renderOrder=2;
    scene.add(this.mesh);
  }

  clear(landscape=this.landscape){this.landscape=landscape;this.previous=null;this.cursor=0;this.count=0;this.geometry.setDrawRange(0,0);}

  update(x:number,z:number,yaw:number,amount:number):void {
    if(amount<.2){this.previous=null;return;}
    const forwardX=Math.sin(yaw),forwardZ=Math.cos(yaw),rightX=Math.cos(yaw),rightZ=-Math.sin(yaw);
    const wheels:WheelPair=[-1,1].map(side=>new THREE.Vector3(x-forwardX*1.22+rightX*side*.62,0,z-forwardZ*1.22+rightZ*side*.62)) as WheelPair;
    if(this.previous){
      const distance=this.previous[0].distanceTo(wheels[0]);
      if(distance>=.25&&distance<3){for(let i=0;i<2;i++)this.add(this.previous[i],wheels[i]);}
      if(distance<.25)return;
    }
    this.previous=wheels;
  }

  private add(from:THREE.Vector3,to:THREE.Vector3):void {
    const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz);
    if(length<.001)return;
    const sideX=-dz/length*.08,sideZ=dx/length*.08;
    const corners=[[from.x-sideX,from.z-sideZ],[from.x+sideX,from.z+sideZ],[to.x-sideX,to.z-sideZ],[to.x+sideX,to.z+sideZ]];
    const offset=this.cursor*12;
    for(let i=0;i<4;i++){const [x,z]=corners[i],j=offset+i*3;this.positions[j]=x;this.positions[j+1]=this.landscape.roadY(z)+.045;this.positions[j+2]=z;}
    this.geometry.attributes.position.needsUpdate=true;
    this.cursor=(this.cursor+1)%MAX_MARKS;
    this.count=Math.min(MAX_MARKS,this.count+1);
    this.geometry.setDrawRange(0,this.count*6);
  }
}
