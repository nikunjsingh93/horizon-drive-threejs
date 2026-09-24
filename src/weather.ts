import * as THREE from 'three';
import type {GraphicsQuality} from './quality';

export type WeatherMode='clear'|'rain'|'snow';
const random=(n:number)=>{const v=Math.sin(n*127.1+37.7)*43758.5453;return v-Math.floor(v);};
function flakeTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const context=canvas.getContext('2d')!;const glow=context.createRadialGradient(16,16,1,16,16,15);glow.addColorStop(0,'#ffffff');glow.addColorStop(.35,'#ffffffdd');glow.addColorStop(1,'#ffffff00');context.fillStyle=glow;context.fillRect(0,0,32,32);return new THREE.CanvasTexture(canvas);}

/** Camera-local weather and a few warm insects in the headlight beams. */
export class WeatherFX {
  private snowGeometry=new THREE.BufferGeometry();
  private rainGeometry=new THREE.BufferGeometry();
  private insectGeometry=new THREE.BufferGeometry();
  private snowPositions=new Float32Array(800*3);
  private rainPositions=new Float32Array(600*2*3);
  private insectPositions=new Float32Array(18*3);
  private snowSeeds=Float32Array.from({length:800*3},(_,i)=>random(i+1));
  private rainSeeds=Float32Array.from({length:600*3},(_,i)=>random(i+2401));
  private snow:THREE.Points;
  private rain:THREE.LineSegments;
  private insects:THREE.Points;
  private center=new THREE.Vector3();
  private direction=new THREE.Vector3();
  constructor(scene:THREE.Scene){
    const texture=flakeTexture();
    this.snowGeometry.setAttribute('position',new THREE.BufferAttribute(this.snowPositions,3).setUsage(THREE.DynamicDrawUsage));
    this.rainGeometry.setAttribute('position',new THREE.BufferAttribute(this.rainPositions,3).setUsage(THREE.DynamicDrawUsage));
    this.insectGeometry.setAttribute('position',new THREE.BufferAttribute(this.insectPositions,3).setUsage(THREE.DynamicDrawUsage));
    this.snow=new THREE.Points(this.snowGeometry,new THREE.PointsMaterial({color:0xf5f7ff,map:texture,size:.38,transparent:true,opacity:.88,alphaTest:.02,depthWrite:false,blending:THREE.NormalBlending}));
    this.rain=new THREE.LineSegments(this.rainGeometry,new THREE.LineBasicMaterial({color:0xc4d5e5,transparent:true,opacity:.46,depthWrite:false}));
    this.insects=new THREE.Points(this.insectGeometry,new THREE.PointsMaterial({color:0xffe9a8,map:texture,size:.085,transparent:true,opacity:.82,depthWrite:false,blending:THREE.AdditiveBlending}));
    for(const object of [this.snow,this.rain,this.insects]){object.frustumCulled=false;object.renderOrder=8;scene.add(object);}
  }
  update(time:number,camera:THREE.Camera,vehicle:THREE.Object3D,mode:WeatherMode,headlights:boolean,quality:GraphicsQuality){
    const counts={low:[300,300,5],medium:[450,420,9],high:[650,540,14],ultra:[800,600,18]}[quality];
    this.snow.visible=mode==='snow';this.rain.visible=mode==='rain';this.insects.visible=headlights&&mode!=='snow';
    camera.getWorldDirection(this.direction);this.direction.y=0;this.direction.normalize();
    const rightX=this.direction.z,rightZ=-this.direction.x;
    const perspective=camera as THREE.PerspectiveCamera;
    const halfVertical=Math.tan(THREE.MathUtils.degToRad(perspective.fov*.5));
    const halfHorizontal=halfVertical*perspective.aspect;
    if(this.snow.visible){
      const count=counts[0];this.snowGeometry.setDrawRange(0,count);
      const wind=Math.sin(time*.38)*.5;
      for(let i=0;i<count;i++){
        const j=i*3,a=this.snowSeeds[j],b=this.snowSeeds[j+1],c=this.snowSeeds[j+2],distance=12+c*43;
        const width=8+distance*halfHorizontal*2.8,height=8+distance*halfVertical*2.8;
        const side=(a-.5)*width,fall=((b*height-time*(1.6+c*.9))%height+height)%height;
        this.snowPositions[j]=camera.position.x+this.direction.x*distance+rightX*(side+wind);
        this.snowPositions[j+1]=camera.position.y+fall-height*.5;
        this.snowPositions[j+2]=camera.position.z+this.direction.z*distance+rightZ*side;
      }
      this.snowGeometry.attributes.position.needsUpdate=true;
    }
    if(this.rain.visible){
      const count=counts[1];this.rainGeometry.setDrawRange(0,count*2);
      for(let i=0;i<count;i++){
        const seed=i*3,a=this.rainSeeds[seed],b=this.rainSeeds[seed+1],c=this.rainSeeds[seed+2],distance=12+c*48;
        const width=8+distance*halfHorizontal*2.8,height=8+distance*halfVertical*2.8;
        const side=(a-.5)*width,fall=((b*height-time*(14+c*5))%height+height)%height,j=i*6;
        const x=camera.position.x+this.direction.x*distance+rightX*side,y=camera.position.y+fall-height*.5,z=camera.position.z+this.direction.z*distance+rightZ*side;
        this.rainPositions[j]=x;this.rainPositions[j+1]=y;this.rainPositions[j+2]=z;
        this.rainPositions[j+3]=x-.10;this.rainPositions[j+4]=y-.75;this.rainPositions[j+5]=z-.08;
      }
      this.rainGeometry.attributes.position.needsUpdate=true;
    }
    if(this.insects.visible){
      const count=counts[2];this.insectGeometry.setDrawRange(0,count);
      vehicle.getWorldPosition(this.center);vehicle.getWorldDirection(this.direction);
      const rightX=this.direction.z,rightZ=-this.direction.x;
      for(let i=0;i<count;i++){
        const distance=3+random(i*7+13)*10,side=(random(i*7+14)-.5)*4,j=i*3;
        this.insectPositions[j]=this.center.x+this.direction.x*distance+rightX*side+Math.sin(time*2+i*4)*.28;
        this.insectPositions[j+1]=this.center.y+.65+random(i*7+15)*2+Math.sin(time*3+i)*.24;
        this.insectPositions[j+2]=this.center.z+this.direction.z*distance+rightZ*side+Math.cos(time*2.4+i*3)*.28;
      }
      this.insectGeometry.attributes.position.needsUpdate=true;
    }
  }
}
