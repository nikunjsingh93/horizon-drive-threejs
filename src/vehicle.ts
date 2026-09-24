import * as THREE from 'three';

/** Original compact three-door hatchback. +Z is forward; all dimensions in metres. */
export function createVehicle() {
  const group=new THREE.Group(), cabin=new THREE.Group(); group.add(cabin);
  group.name='Horizon compact';
  const paint=new THREE.MeshPhysicalMaterial({color:0xe5e8e2,metalness:.38,roughness:.34,clearcoat:.5,side:THREE.DoubleSide});
  const black=new THREE.MeshStandardMaterial({color:0x171b1b,roughness:.82,side:THREE.DoubleSide});
  const cloth=new THREE.MeshStandardMaterial({color:0x343732,roughness:1});
  const silver=new THREE.MeshStandardMaterial({color:0x9aa4a6,metalness:.65,roughness:.38});
  const glass=new THREE.MeshStandardMaterial({color:0x526a70,roughness:.16,metalness:.18,transparent:true,opacity:.68,depthWrite:false,side:THREE.DoubleSide});
  const white=new THREE.MeshStandardMaterial({color:0xe9ece3,emissive:0xb1b3a0,emissiveIntensity:.2});
  const amber=new THREE.MeshStandardMaterial({color:0xd38724,roughness:.4});
  const red=new THREE.MeshStandardMaterial({color:0x9c241b,emissive:0x2b0503,emissiveIntensity:.55,roughness:.35});
  // A direct-color overlay guarantees saturated red under the renderer's night tone mapping.
  const brakeRed=new THREE.MeshBasicMaterial({color:0xff0000,transparent:true,opacity:0,depthWrite:false});
  const mesh=(g:THREE.BufferGeometry,m:THREE.Material,p:THREE.Object3D=cabin)=>{const o=new THREE.Mesh(g,m);o.castShadow=true;o.receiveShadow=false;p.add(o);return o;};
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:THREE.Material,p:THREE.Object3D=cabin)=>{const o=mesh(new THREE.BoxGeometry(w,h,d),m,p);o.position.set(x,y,z);return o;};
  type P=[number,number,number];
  const panel=(points:P[],m:THREE.Material)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.setAttribute('uv',new THREE.Float32BufferAttribute([1,0,0,0,0,1,1,1],2));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();return mesh(g,m);};
  const beam=(a:P,b:P,width:number,m:THREE.Material)=>{const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av);const o=mesh(new THREE.BoxGeometry(width,d.length(),width),m);o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;};
  // Stamped side panels with real wheel openings, not a solid slab through the tires.
  for(const s of [-1,1]) {
    const p:number[]=[], idx:number[]=[];
    for(let i=0;i<=100;i++) {
      const z=-1.91+3.82*i/100;
      let bottom=.28;for(const wz of [-1.22,1.20]){const dz=z-wz;if(Math.abs(dz)<.385)bottom=Math.max(bottom,.33+Math.sqrt(.385*.385-dz*dz));}
      const top=z>.65?1.0-(z-.65)*.119:1.0;
      p.push(s*.79,bottom,z,s*.79,top,z);
      if(i<100){const q=i*2;idx.push(q,q+1,q+2,q+1,q+3,q+2);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();mesh(g,paint);
    box(s*.79,.32,-.02,.045,.12,1.63,black);
    box(s*.799,.62,-.04,.025,.055,1.67,black);
    beam([s*.797,.34,-.57],[s*.797,1,-.57],.009,black);
    box(s*.816,.92,-.39,.04,.04,.17,black);
  }
  box(0,.28,0,1.48,.09,3.55,black);
  panel([[-.79,1,.65],[.79,1,.65],[.79,.85,1.91],[-.79,.85,1.91]],paint);
  box(0,.62,1.91,1.58,.33,.04,paint);
  box(0,.43,1.94,1.65,.23,.16,black);
  box(0,.34,1.98,.85,.055,.018,cloth);
  box(0,.73,1.94,.55,.04,.015,black);
  box(0,.69,-1.91,1.58,.58,.05,paint);
  box(0,.4,-1.94,1.65,.20,.15,black);
  box(0,.69,-1.946,.4,.14,.015,black);
  box(0,.69,-1.956,.31,.09,.012,silver);
  const brakeLamps:THREE.Mesh[]=[];
  for(const s of [-1,1]){
    box(s*.54,.745,1.943,.34,.14,.025,white);
    box(s*.755,.745,1.94,.09,.14,.034,amber);
    box(s*.728,.79,-1.951,.12,.26,.035,red);
    // The lower rear marker stays red so the brake signature cannot be mistaken for an amber turn signal.
    box(s*.728,.69,-1.972,.12,.07,.014,red);
    brakeLamps.push(box(s*.728,.79,-1.992,.125,.27,.012,brakeRed));
  }
  // Tall flat roof, upright hatch and strongly raked windshield match the reference silhouette.
  const roofFront=.12, roofBack=-1.63, roofY=1.65;
  box(0,roofY,-.755,1.38,.055,1.81,paint);
  panel([[-.77,1,.65],[.77,1,.65],[.665,1.615,roofFront],[-.665,1.615,roofFront]],glass);
  panel([[-.77,1,-1.88],[-.67,1.62,roofBack],[.67,1.62,roofBack],[.77,1,-1.88]],glass);
  for(const s of [-1,1]) {
    panel([[s*.775,1,.61],[s*.667,1.615,.10],[s*.667,1.615,-.57],[s*.775,1,-.57]],glass);
    panel([[s*.775,1,-.63],[s*.667,1.615,-.63],[s*.667,1.615,-1.60],[s*.775,1,-1.85]],glass);
    beam([s*.79,1,.65],[s*.68,roofY,.12],.065,paint);
    beam([s*.79,1,-1.89],[s*.68,roofY,-1.63],.085,paint);
    beam([s*.78,1,-.60],[s*.68,roofY,-.60],.045,black);
    beam([s*.78,1,-1.88],[s*.78,1,.65],.035,paint);
    box(s*.86,1.04,.49,.16,.095,.15,black);
    box(s*.86,1.04,.41,.12,.065,.009,silver);
    box(s*.72,.8,-.08,.07,.29,1.24,cloth);
  }
  beam([-.68,1.62,.12],[.68,1.62,.12],.045,black);
  beam([-.67,1.61,-1.63],[.67,1.61,-1.63],.035,black);
  beam([-.77,1.015,-1.88],[.77,1.015,-1.88],.035,black);
  beam([0,1.04,-1.91],[.40,1.12,-1.88],.012,black);
  beam([-.77,1,.65],[.77,1,.65],.04,black);
  // Wheel assemblies stay grounded while the sprung body rolls around them.
  const wheels:Array<{pivot:THREE.Group,spin:THREE.Group,front:boolean}>=[];
  for(const z of [-1.22,1.20])for(const s of [-1,1]){
    const pivot=new THREE.Group();pivot.position.set(s*.77,.33,z);group.add(pivot);
    const spin=new THREE.Group();pivot.add(spin);
    const tire=mesh(new THREE.CylinderGeometry(.33,.33,.20,32),black,spin);tire.rotation.z=Math.PI/2;
    const cap=mesh(new THREE.CylinderGeometry(.235,.235,.018,24),silver,spin);cap.rotation.z=Math.PI/2;cap.position.x=s*.109;
    const hub=mesh(new THREE.CylinderGeometry(.068,.068,.022,20),silver,spin);hub.rotation.z=Math.PI/2;hub.position.x=s*.123;
    for(let k=0;k<8;k++){const a=k*Math.PI/4;const vent=box(s*.121,Math.sin(a)*.189,Math.cos(a)*.189,.012,.042,.033,black,spin);vent.rotation.x=-a;}
    wheels.push({pivot,spin,front:z>0});
  }
  // Complete, enclosed cockpit. The eye mount and furnishings share this exact transform.
  for(const s of [-1,1]){
    box(s*.36,.49,-.54,.49,.16,.51,cloth);
    const back=box(s*.36,.79,-.79,.49,.59,.13,cloth);back.rotation.x=-.1;
    box(s*.36,1.17,-.84,.28,.20,.12,cloth);
  }
  box(0,.6,-1.4,1.28,.2,.43,cloth);box(0,.88,-1.65,1.28,.48,.13,cloth);
  box(0,.88,.48,1.45,.22,.35,cloth);
  box(0,1.005,.5,1.47,.045,.38,black);
  box(.36,1.02,.33,.42,.16,.14,black);
  const dialCanvas=document.createElement('canvas');dialCanvas.width=512;dialCanvas.height=192;
  const ctx=dialCanvas.getContext('2d')!;ctx.fillStyle='#171c1b';ctx.fillRect(0,0,512,192);
  for(const cx of [135,377]){ctx.strokeStyle='#7d897d';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,100,75,0,Math.PI*2);ctx.stroke();for(let i=0;i<11;i++){const a=.7+i*.49;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*60,100+Math.sin(a)*60);ctx.lineTo(cx+Math.cos(a)*70,100+Math.sin(a)*70);ctx.stroke();}ctx.strokeStyle='#e0ddd0';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx,100);ctx.lineTo(cx-40,137);ctx.stroke();}
  ctx.fillStyle='#d5dfd0';ctx.font='22px sans-serif';ctx.fillText('km/h',108,140);ctx.fillText('rpm',356,140);
  const dialMat=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(dialCanvas),side:THREE.DoubleSide});
  panel([[.16,.95,.254],[.56,.95,.254],[.56,1.09,.254],[.16,1.09,.254]],dialMat);
  for(const x of [-.56,-.06]){box(x,.89,.297,.22,.095,.018,black);for(let k=0;k<4;k++)box(x,.86+k*.02,.28,.20,.006,.01,silver);}
  const steering=new THREE.Group();steering.position.set(.36,.99,.045);steering.rotation.x=.18;cabin.add(steering);
  mesh(new THREE.TorusGeometry(.195,.019,10,40),black,steering);
  box(0,0,0,.30,.035,.04,black,steering);box(0,-.075,0,.03,.15,.04,black,steering);box(0,0,-.015,.12,.075,.055,cloth,steering);
  box(0,.51,-.04,.17,.20,.44,black);beam([0,.61,-.08],[0,.77,-.02],.023,black);
  box(0,1.49,.25,.23,.075,.04,black);
  const eye=new THREE.Object3D();eye.position.set(.36,1.36,-.39);cabin.add(eye);
  const lamps:THREE.SpotLight[]=[];
  for(const side of [-1,1]){const light=new THREE.SpotLight(0xffedca,0,150,.43,.65,1.5);light.position.set(side*.54,.76,1.97);light.target.position.set(side*.8,-.9,65);group.add(light,light.target);lamps.push(light);}
  let rotation=0,tailLights=false;
  return {group,eye,setLights(on:boolean){tailLights=on;for(const lamp of lamps)lamp.intensity=on?1350:0;white.emissiveIntensity=on?3:.2;red.emissiveIntensity=on?1.45:.28;red.emissive.set(on?0xff2418:0x2b0503);},
    animate(speed:number,steer:number,roll:number,pitch:number,dt:number,brake=0){rotation+=speed*Math.min(dt,.1)/.33;for(const w of wheels){w.spin.rotation.x=rotation;if(w.front)w.pivot.rotation.y=-THREE.MathUtils.clamp(steer,-.65,.65);}cabin.rotation.set(THREE.MathUtils.clamp(pitch,-.16,.16),0,THREE.MathUtils.clamp(roll,-.22,.22));steering.rotation.z=THREE.MathUtils.clamp(steer*3.5,-1.6,1.6);red.color.set(0x9c241b);red.emissiveIntensity=tailLights?1.45:.28;red.emissive.set(tailLights?0xff2418:0x2b0503);brakeRed.opacity=brake>.01?1:0;},
    setColor(color:string){paint.color.set(color);},
    setInterior(inside:boolean){glass.visible=!inside;},
  };
}
