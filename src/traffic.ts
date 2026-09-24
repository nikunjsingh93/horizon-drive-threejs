import * as THREE from 'three';
import {Landscape} from './simulation';
import {createVehicle} from './vehicle';

/** A few reusable oncoming cars. Their motion follows the same seeded road as the player. */
export class Traffic {
  private cars;
  constructor(private scene:THREE.Scene,private road:Landscape){this.cars=Array.from({length:3},(_,index)=>{
    const vehicle=createVehicle();
    vehicle.setColor(['#b6c6cf','#b64437','#d5c79d'][index]);
    vehicle.group.traverse(object=>{if(object instanceof THREE.SpotLight)object.intensity=0;});
    vehicle.group.visible=false;
    this.scene.add(vehicle.group);
    return {vehicle,z:250+index*360,speed:14+index*2};
  });}
  reset(road:Landscape,playerZ:number){this.road=road;this.cars.forEach((car,index)=>car.z=playerZ+250+index*360);}
  update(dt:number,playerZ:number,lowQuality:boolean){
    const active=lowQuality?2:3;
    this.cars.forEach((car,index)=>{
      car.vehicle.group.visible=index<active;
      if(index>=active)return;
      car.z-=car.speed*dt;
      if(car.z<playerZ-110)car.z=playerZ+520+index*230;
      else if(car.z>playerZ+1050)car.z=playerZ+330+index*190;
      const roadX=this.road.roadX(car.z),stretch=this.road.stretch(car.z);
      car.vehicle.group.position.set(roadX+1.85*stretch,this.road.roadY(car.z)+.035,car.z);
      const ahead=this.road.roadY(car.z-1.35),behind=this.road.roadY(car.z+1.35);
      car.vehicle.group.rotation.set(-Math.atan2(ahead-behind,2.7),Math.atan(this.road.slope(car.z))+Math.PI,0,'YXZ');
      car.vehicle.animate(car.speed,0,0,0,dt);
    });
  }
}
