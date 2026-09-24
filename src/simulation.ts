export const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export const damp=(a:number,b:number,k:number,dt:number)=>a+(b-a)*(1-Math.exp(-k*dt));
export function hashSeed(s:string){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
export class Landscape {
 pondCache=new Map<string,{x:number;z:number;rx:number;rz:number;level:number}|null>();
 seed:number; phase:number; winding:number;
 constructor(seed='OPEN-ROAD',style='flowing'){this.seed=hashSeed(seed);this.phase=(this.seed%10000)/1000;this.winding=style==='winding'?1.65:style==='gentle'?.55:1;}
 roadX(z:number){const p=this.phase;return this.winding*(46*Math.sin(z*.004+p)+24*Math.sin(z*.009+p*2)+8*Math.sin(z*.018+p));}
 roadY(z:number){const p=this.phase;return 18+11*Math.sin(z*.0038+p)+4*Math.sin(z*.009+p*1.7)+1.6*Math.sin(z*.019+p);}
 slope(z:number){return (this.roadX(z+.1)-this.roadX(z-.1))/.2;}
 stretch(z:number){return Math.sqrt(1+this.slope(z)**2);}
 lateral(x:number,z:number){return (x-this.roadX(z))/this.stretch(z);}
 trailX(z:number){const weave=Math.sin(Math.PI*z/1200);return this.roadX(z)+(7+68*weave*weave+7*Math.sin(z*.012+this.phase)*weave*weave)*this.stretch(z);}
 trailY(z:number){return this.rawHeight(this.trailX(z),z);}
 trailDistance(x:number,z:number){const slope=(this.trailX(z+.2)-this.trailX(z-.2))/.4;return (x-this.trailX(z))/Math.sqrt(1+slope*slope);}
 rawHeight(x:number,z:number){const d=this.lateral(x,z),a=Math.abs(d),p=this.phase;const t=clamp((a-5.1)/100,0,1),blend=t*t*(3-2*t);const hills=12*Math.sin(x*.008+z*.002+p)+9*Math.sin(z*.008+x*.003+p)+3*Math.sin(x*.024-z*.009);const contour=Math.tanh(d/65)*(19+8*Math.sin(z*.002+p));const distant=clamp((a-200)/600,0,1)*(38+30*Math.sin(x*.003+z*.001+p));return this.roadY(z)-.12+blend*(hills+contour+distant)+.04*Math.sin(x*1.7+z*.8)*blend;}
 pond(tx:number,tz:number){
 const key=`${tx}:${tz}`;if(this.pondCache.has(key))return this.pondCache.get(key)!;
 const h=hashSeed(`${this.seed}:${tx}:${tz}`),x=tx*192+70+(h%53),z=tz*192+70+((h>>>8)%53);
 let pond:null|{x:number;z:number;rx:number;rz:number;level:number}=null;
 if(h%4===0&&Math.abs(this.lateral(x,z))>85&&Math.abs(this.trailDistance(x,z))>55){const rx=17+(h%14),rz=13+((h>>>5)%12);let level=this.rawHeight(x,z)-1.1;
 for(let i=0;i<16;i++){const a=i*Math.PI/8;level=Math.min(level,this.rawHeight(x+Math.cos(a)*rx*1.6,z+Math.sin(a)*rz*1.6)-.4);}pond={x,z,rx,rz,level};}
 if(this.pondCache.size>512)this.pondCache.delete(this.pondCache.keys().next().value!);this.pondCache.set(key,pond);return pond;
 }
 height(x:number,z:number){let y=this.rawHeight(x,z);const trail=Math.abs(this.trailDistance(x,z));if(trail<7){const t=clamp((trail-2.6)/4.4,0,1),blend=t*t*(3-2*t);y=this.trailY(z)*(1-blend)+y*blend;}const p=this.pond(Math.floor(x/192),Math.floor(z/192));
 if(p){const r=Math.hypot((x-p.x)/p.rx,(z-p.z)/p.rz);if(r<1.6){const t=clamp((r-.82)/.78,0,1),blend=t*t*(3-2*t);y=(p.level-.85)*(1-blend)+y*blend;}}return y;}
 surface(x:number,z:number){
 if(Math.abs(this.lateral(x,z))<4.16)return this.roadY(z);
 // Match the rendered four-metre terrain triangles exactly, including pond banks.
 const bx=Math.floor(x/4)*4,bz=Math.floor(z/4)*4,u=(x-bx)/4,v=(z-bz)/4;
 const a=this.height(bx,bz),b=this.height(bx+4,bz),c=this.height(bx,bz+4),d=this.height(bx+4,bz+4);
 return u+v<=1?a+u*(b-a)+v*(c-a):d+(1-u)*(c-d)+(1-v)*(b-d);
 }
}
export interface Input {throttle:number;brake:number;steer:number;handbrake:boolean;}
export class Driving {
 x=0;z=30;y=0;heading=0;travelHeading=0;speed=0;steer=0;distance=0;roll=0;pitch=0;acceleration=0;auto=false;offroad=false;throttle=0;slip=0;
 transmission='automatic';gear=1;rpm=850;shiftTime=0;
 shift(direction:number){const next=clamp(this.gear+direction,-1,6);if((next<=0||this.gear<=0)&&Math.abs(this.speed)>1.5)return false;this.gear=next;this.shiftTime=.18;return true;}
 constructor(public world:Landscape){this.reset();}
 reset(){this.x=this.world.roadX(this.z)-1.85*this.world.stretch(this.z);this.heading=Math.atan(this.world.slope(this.z));this.travelHeading=this.heading;this.y=this.world.surface(this.x,this.z)+.04;this.speed=0;this.steer=0;this.roll=0;this.pitch=0;this.offroad=false;this.throttle=0;this.acceleration=0;this.slip=0;this.gear=1;this.rpm=850;}
 step(dt:number,input:Input){
 let {throttle,brake,steer,handbrake}=input;const w=this.world;
 this.offroad=Math.abs(w.lateral(this.x,this.z))>4.35;
 if(this.auto){const ahead=clamp(10+Math.abs(this.speed)*.75,12,38),targetZ=this.z+ahead,targetX=w.roadX(targetZ)-1.85*w.stretch(targetZ);let error=Math.atan2(targetX-this.x,targetZ-this.z)-this.heading;error=Math.atan2(Math.sin(error),Math.cos(error));const desired=Math.atan(2*2.7*Math.sin(error)/ahead);steer=-desired/this.maxSteer();const curve=Math.abs(Math.atan(w.slope(this.z+30))-Math.atan(w.slope(this.z)));const target=clamp(24-curve*35,10,24);throttle=clamp((target-this.speed)*.35,0,1);brake=clamp((this.speed-target)*.28,0,.7);handbrake=false;}
 this.throttle=throttle;this.steer=damp(this.steer,clamp(steer,-1,1)*this.maxSteer(),5.2,dt);
 const old=this.speed,drag=.006*this.speed*Math.abs(this.speed)+.2*Math.sign(this.speed);const gradient=(w.surface(this.x+Math.sin(this.heading),this.z+Math.cos(this.heading))-w.surface(this.x-Math.sin(this.heading),this.z-Math.cos(this.heading)))/2;
 let force=throttle*(this.speed<-.3?10:5.5)-drag-gradient*5;
 if(brake>0){if(this.speed>.35)force-=brake*11;else force-=brake*3.2;}
 // Locked rear wheels shed speed while preserving enough momentum to slide.
 if(handbrake)force-=Math.sign(this.speed)*Math.min(Math.abs(this.speed)/dt,4.8);
 // Grass has the same power and terminal speed as asphalt; grip and sound still differ.
 const manual=this.transmission==='manual'&&!this.auto;
 const limits=[0,12,20,29,38,46,55];
 this.shiftTime=Math.max(0,this.shiftTime-dt);
 if(manual){
   const limit=this.gear<0?8:limits[this.gear];
   this.rpm=this.gear===0?850+throttle*5400:clamp(850+Math.abs(this.speed)/limit*5650,850,6500);
   const direction=Math.sign(this.gear),ratio=this.gear<0?3.2:[0,9,8.5,8,7.5,7,6.5][this.gear];
   const power=this.shiftTime>0||this.rpm>6400?0:throttle*ratio*direction;
   force=power-drag-gradient*5;
   if(brake>0)force-=Math.sign(this.speed)*Math.min(Math.abs(this.speed)/dt,brake*11);
   if(handbrake)force-=Math.sign(this.speed)*Math.min(Math.abs(this.speed)/dt,4.8);
 }else{this.gear=this.speed<-.3?-1:Math.min(6,1+Math.floor(Math.abs(this.speed)/8));this.rpm=850+Math.abs(this.speed)/(this.gear<0?8:limits[this.gear])*4700;}

 if((throttle===0||manual&&this.gear===0)&&brake===0&&Math.abs(this.speed)<.15){this.speed=0;}else this.speed=clamp(this.speed+force*dt,-7,47);
 if((brake>0||handbrake)&&old>.35&&this.speed<0)this.speed=0;
 this.acceleration=(this.speed-old)/dt;
 // With local +Z forward, world -X appears on the right side of the screen.
 // Positive user steering must therefore yaw toward negative world X.
 // Keep the eased wheel input, but allow a shorter arc once the wheel turns.
 const baseTurn=clamp(-this.speed/3.0*Math.tan(this.steer),-0.56,0.56)*(this.offroad?.72:1);
 const sliding=handbrake&&Math.abs(this.speed)>3;
 const turn=baseTurn*(sliding?1.65:1);
 this.heading+=turn*dt;
 // Tire grip aligns travel with the car's nose. A handbrake slide sharply
 // reduces that grip, allowing the body to rotate while its momentum carries on.
 const delta=Math.atan2(Math.sin(this.heading-this.travelHeading),Math.cos(this.heading-this.travelHeading));
 const grip=sliding ? 0.75 : this.offroad ? 4.5 : 12;
 this.travelHeading+=delta*(1-Math.exp(-grip*dt));
 this.slip=Math.atan2(Math.sin(this.heading-this.travelHeading),Math.cos(this.heading-this.travelHeading));
 this.x+=Math.sin(this.travelHeading)*this.speed*dt;this.z+=Math.cos(this.travelHeading)*this.speed*dt;
 this.y=w.surface(this.x,this.z)+.035;this.distance+=Math.abs(this.speed)*dt;
 // In local +Z forward space, negative X rotation lifts the nose and
 // negative Z rotation lowers the outside (+X) side of a right-hand turn.
 this.roll=damp(this.roll,clamp(turn*this.speed*.007,-.12,.12),6,dt);
 this.pitch=damp(this.pitch,clamp(-this.acceleration*.009,-.09,.09),5,dt);
 }
 maxSteer(){return .43/(1+Math.abs(this.speed)*.20);}
}
