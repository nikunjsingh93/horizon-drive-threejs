import * as THREE from 'three';

/** Build deterministic roadside scenery for one terrain chunk. */
export function createScenery(
  seed: number,
  startZ: number,
  length: number,
  roadX: (z: number) => number,
  height: (x: number, z: number) => number,
  season: string,
): THREE.Group {
  const group = new THREE.Group();
  const random = randomSource(seed >>> 0);
  const winter = season === 'winter';
  const autumn = season === 'autumn';

  const trunkMaterial = new THREE.MeshStandardMaterial({ color: winter ? 0x786b5b : 0x665e4d, map: makeBarkTexture(), roughness: 1 });
  const coniferMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, map: makePineTexture(), alphaTest:.3, roughness: 0.96, vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  const grassMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, vertexColors: true, side: THREE.DoubleSide });
  const shrubMaterial = new THREE.MeshStandardMaterial({ color: winter ? 0x9ca69d : autumn ? 0x987049 : 0x657b3c, map:makeBroadleafTexture(), alphaTest:.34, side:THREE.DoubleSide, roughness:1 });
  const rockMaterial = new THREE.MeshStandardMaterial({ color: winter ? 0x9da6a8 : 0x77786e, roughness: 1, flatShading: true });
  const fernMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.98, flatShading: true, side: THREE.DoubleSide });
  const flowerStemMaterial = new THREE.MeshStandardMaterial({ color: 0x61774e, roughness: 1 });
  const flowerHeadMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });

  const coniferTrunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.42, 3.6, 7), trunkMaterial, 180);
  const coniferCrown = new THREE.InstancedMesh(makeConiferCrownGeometry(), coniferMaterial, 180);
  const broadleafTrunkGeometry = makeBroadleafTrunk();
  const broadleafTrunk = new THREE.InstancedMesh(broadleafTrunkGeometry, trunkMaterial, 180);
  const birchTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, map: makeBirchBarkTexture(), roughness: 1 });
  const birchTrunks = new THREE.InstancedMesh(broadleafTrunkGeometry.clone().scale(.75,1.12,.75), birchTrunkMaterial, 180);
  // A cutout leaf canopy uses crossed, branching silhouettes. It avoids the
  // smooth ball crowns and pointed leaf cards that made the previous trees
  // read as ornamental topiary.
  const broadleafMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: makeBroadleafTexture(), roughness: 1, vertexColors: true,
    alphaTest: 0.34, side: THREE.DoubleSide,
  });
  const broadleafCrowns = [
    new THREE.InstancedMesh(makeBroadleafCrownGeometry('oak'), broadleafMaterial.clone(), 180),
    new THREE.InstancedMesh(makeBroadleafCrownGeometry('birch'), broadleafMaterial.clone(), 180),
    new THREE.InstancedMesh(makeBroadleafCrownGeometry('wide'), broadleafMaterial.clone(), 180),
  ];
  const grass = new THREE.InstancedMesh(makeGrassGeometry(), grassMaterial, 4500);
  const ferns = new THREE.InstancedMesh(makeFernGeometry(), fernMaterial, 180);
  const flowerStems = new THREE.InstancedMesh(makeFlowerStems(), flowerStemMaterial, 180);
  const flowerHeads = new THREE.InstancedMesh(makeFlowerHeads(), flowerHeadMaterial, 180);
  const shrubs = new THREE.InstancedMesh(makeShrubGeometry(), shrubMaterial, 480);
  const rocks = new THREE.InstancedMesh(makeRockGeometry(), rockMaterial, 150);
  const dummy = new THREE.Object3D();

  let conifers = 0;
  let broadleaves = 0;
  let birches = 0;
  const broadleafCrownCounts = [0, 0, 0];
  let grasses = 0;
  let fernCount = 0;
  let flowerCount = 0;
  let shrubCount = 0;
  let rockCount = 0;
  const endZ = startZ + length;
  const span = Math.max(0, length);
  const count = Math.min(180, Math.round(span * 0.72));

  // Trees arrive in small groves with broad open gaps between them, but stay
  // close enough to read as individual trees from the chase camera.
  for (let i = 0; i < count; i++) {
    // Alternate evenly along both verges; overlapping canopies build the
    // continuous woodland wall visible from the road in the reference.
    const z = clamp(startZ + ((i + random() * 0.72) / count) * span, startZ + 1, endZ - 1);
    const side = i % 2 === 0 ? 1 : -1;
    const offset = 7.5 + Math.pow(random(), 1.6) * 23;
    const x = roadX(z) + side * offset;
    const scale = .9 + random() * 0.55;
    const isConifer = random() < (winter ? 0.52 : 0.28);
    dummy.position.set(x, height(x, z), z);
    dummy.rotation.set(0, random() * Math.PI * 2, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    const trunkMatrix = dummy.matrix.clone();
    const crownMatrix = dummy.matrix.clone();
    // The procedural crown geometry is authored with its base at y=0.
    trunkMatrix.elements[13] += (isConifer ? 1.8 : 0) * scale;
    if (isConifer) {
      coniferTrunk.setMatrixAt(conifers, trunkMatrix);
      coniferCrown.setMatrixAt(conifers, crownMatrix);
      coniferCrown.setColorAt(conifers, new THREE.Color(winter ? pick(random, [0xb4c3bc, 0xc0c9c1, 0xa9bab2]) : pick(random, [0x34533b, 0x426548, 0x385a3d, 0x4b704b])));
      conifers++;
    } else {
      const isBirch = random() < 0.24;
      if (isBirch) { birchTrunks.setMatrixAt(birches, trunkMatrix); birches++; }
      else broadleafTrunk.setMatrixAt(broadleaves++, trunkMatrix);
      const crownType = isBirch ? 1 : random()<.5 ? 0 : 2;
      const crown = broadleafCrowns[crownType];
      crown.setMatrixAt(broadleafCrownCounts[crownType], crownMatrix);
      const leafColor = winter ? pick(random, [0xe2e4d8, 0xcfd4c8, 0xf0eee0]) : autumn ? pick(random, [0xb28a54, 0xc49a5d, 0x95794d]) : pick(random, [0x52672c, 0x63783a, 0x465c2c, 0x718044]);
      crown.setColorAt(broadleafCrownCounts[crownType], new THREE.Color(leafColor));
      broadleafCrownCounts[crownType]++;

    }
  }

  // Ferns, low flowering plants, and flower heads add readable ground-level
  // variety between the close grass edge and the more distant trees.
  const understoryCount = Math.floor(span * 0.55);
  for (let i = 0; i < understoryCount; i++) {
    const z = startZ + random() * span;
    const side = random() < 0.5 ? -1 : 1;
    const x = roadX(z) + side * (6.5 + random() * 17);
    const y = height(x, z);
    const scale = 0.45 + random() * 0.65;
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, random() * Math.PI * 2, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    if (random() < 0.58) {
      ferns.setMatrixAt(fernCount, dummy.matrix);
      ferns.setColorAt(fernCount, new THREE.Color(pick(random, winter ? [0x899987, 0xa5ac8c] : [0x527844, 0x66884b, 0x799450, 0x456a43])));
      fernCount++;
    } else {
      flowerStems.setMatrixAt(flowerCount, dummy.matrix);
      flowerHeads.setMatrixAt(flowerCount, dummy.matrix);
      flowerHeads.setColorAt(flowerCount, new THREE.Color(winter ? pick(random, [0xd9d4c1, 0xe8e4d3]) : autumn ? pick(random, [0xd7a64d, 0xbe6953]) : pick(random, [0xe3c96c, 0xd98d92, 0xb4a7d3, 0xf0e2c6])));
      flowerCount++;
    }
  }

  // Fine grass clumps soften the road edge and fade quickly into open fields.
  const grassRows = Math.ceil(span / 1.8);
  for (let i = 0; i < grassRows * 27; i++) {
    const z = startZ + random() * span;
    const side = random() < 0.5 ? -1 : 1;
    const offset = 5.35 + random() * 5.4;
    const x = roadX(z) + side * offset;
    dummy.position.set(x, height(x, z), z);
    dummy.rotation.set(0, random() * Math.PI * 2, 0);
    const s = 0.45 + random() * 0.95;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    grass.setMatrixAt(grasses, dummy.matrix);
    const color = winter
      ? pick(random, [0xd1d2c7, 0xe0ddd0, 0xc3cec4])
      : autumn
        ? pick(random, [0xb4a26d, 0xc3a25d, 0x97966e])
        : pick(random, [0x9ab580, 0xb0c38a, 0x819b73, 0xb3b181]);
    grass.setColorAt(grasses, new THREE.Color(color));
    grasses++;
  }

  // Scattered low shrubs and weathered stones make the open slopes read at speed.
  const smallCount = Math.floor(span * 2.25);
  for (let i = 0; i < smallCount; i++) {
    const z = startZ + random() * span;
    const side = random() < 0.5 ? -1 : 1;
    const x = roadX(z) + side * (6.2 + Math.pow(random(),2) * 32);
    dummy.position.set(x, height(x, z), z);
    dummy.rotation.set(random() * 0.25, random() * Math.PI * 2, random() * 0.25);
    const sx = 0.45 + random() * 1.15;
    dummy.scale.set(sx * (0.8 + random() * 0.5), 0.35 + random() * 0.7, sx * (0.8 + random() * 0.5));
    dummy.updateMatrix();
    if (random() < 0.68 && shrubCount < 480) {
      shrubs.setMatrixAt(shrubCount++, dummy.matrix);
    } else if (rockCount < 150) {
      dummy.position.y -= 0.25;
      dummy.updateMatrix();
      rocks.setMatrixAt(rockCount++, dummy.matrix);
    }
  }

  addInstanced(group, coniferTrunk, conifers);
  addInstanced(group, coniferCrown, conifers);
  addInstanced(group, broadleafTrunk, broadleaves);
  addInstanced(group, birchTrunks, birches);
  for (let i = 0; i < broadleafCrowns.length; i++) addInstanced(group, broadleafCrowns[i], broadleafCrownCounts[i]);
  for(const tree of [broadleafTrunk,birchTrunks,...broadleafCrowns]) {tree.castShadow=true;tree.receiveShadow=true;}
  addInstanced(group, grass, grasses);
  addInstanced(group, ferns, fernCount);
  addInstanced(group, flowerStems, flowerCount);
  addInstanced(group, flowerHeads, flowerCount);
  addInstanced(group, shrubs, shrubCount);
  addInstanced(group, rocks, rockCount);
  addBirdFlocks(group,random,roadX,height,startZ,span);
  return group;
}

function addBirdFlocks(parent:THREE.Group,random:()=>number,roadX:(z:number)=>number,height:(x:number,z:number)=>number,startZ:number,span:number):void{
  const material=new THREE.MeshStandardMaterial({color:0x252e2a,roughness:1,side:THREE.DoubleSide});
  const wingGeometry=new THREE.BufferGeometry();
  wingGeometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,.30,.035,0,.15,-.045,.015, 0,0,0,.15,-.045,.015,-.30,.035,0],3));
  wingGeometry.setIndex([0,1,2,3,4,5]);wingGeometry.computeVertexNormals();
  const bodyGeometry=new THREE.SphereGeometry(1,6,5);bodyGeometry.scale(.035,.025,.095);
  const flocks:THREE.Group[]=[];
  for(let f=0;f<2;f++){
    const z=startZ+span*(.2+random()*.6),x=roadX(z)+(random()-.5)*90,flock=new THREE.Group();
    flock.position.set(x,height(x,z)+22+random()*15,z);flock.userData.base={x,z,y:flock.position.y};
    const birds=4+Math.floor(random()*4);
    for(let i=0;i<birds;i++){
      const bird=new THREE.Group(),left=new THREE.Group(),right=new THREE.Group();
      bird.position.set((random()-.5)*5,(random()-.5)*1.5,(random()-.5)*8);bird.rotation.y=(random()-.5)*.8;
      const body=new THREE.Mesh(bodyGeometry,material);body.rotation.y=Math.PI/2;bird.add(body);
      left.position.x=-.025;right.position.x=.025;left.add(new THREE.Mesh(wingGeometry,material));right.add(new THREE.Mesh(wingGeometry,material));
      left.rotation.y=Math.PI;bird.add(left,right);bird.userData.wings=[left,right];bird.userData.phase=random()*Math.PI*2;flock.add(bird);
    }
    flocks.push(flock);parent.add(flock);
  }
  parent.userData.animateBirds=(time:number)=>{
    for(const flock of flocks){const base=flock.userData.base as {x:number;z:number;y:number};flock.position.x=base.x+Math.sin(time*.13+base.z)*2.2;flock.position.y=base.y+Math.sin(time*1.1+base.x)*.5;flock.position.z=base.z+Math.cos(time*.11+base.x)*2.2;
      for(const bird of flock.children){const phase=bird.userData.phase as number,wings=bird.userData.wings as THREE.Group[];const flap=Math.sin(time*7+phase)*.48;wings[0].rotation.z=flap;wings[1].rotation.z=-flap;}}
  };
}

function addInstanced(group: THREE.Group, mesh: THREE.InstancedMesh, count: number): void {
  if (!count) {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    return;
  }
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = true;
  group.add(mesh);
}

// Branch endpoints are shared by the woody skeleton and the foliage volume.
function branchTips(): THREE.Vector3[] {
  const tips: THREE.Vector3[]=[];
  for(let i=0;i<13;i++) {const a=i*2.39996+.23*Math.sin(i*4.1),r=2.15+Math.sin(i*1.7)*.68;
    tips.push(new THREE.Vector3(Math.cos(a)*r,3.65+(i%4)*.85,Math.sin(a)*r));}
  tips.push(new THREE.Vector3(.12,7.7,.15));return tips;
}
function makeBroadleafCrownGeometry(form: 'oak' | 'birch' | 'wide'): THREE.BufferGeometry {
  const rng=randomSource(form==='oak'?413:form==='birch'?819:217);
  const positions:number[]=[],uvs:number[]=[],colors:number[]=[],normals:number[]=[],indices:number[]=[];
  const tips=branchTips();
  // Hundreds of small leaf-bearing twigs fill a real 3D volume. No crown-sized planes or spheres.
  for(const tip of tips) for(let j=0;j<24;j++) {
    const a=rng()*Math.PI*2, r=Math.sqrt(rng())*1.24;
    const center=tip.clone().add(new THREE.Vector3(Math.cos(a)*r,(rng()-.5)*1.7,Math.sin(a)*r));
    const normal=new THREE.Vector3(rng()-.5,.18+rng()*.55,rng()-.5).normalize();
    const u=new THREE.Vector3().crossVectors(normal,new THREE.Vector3(0,1,0)).normalize();
    const v=new THREE.Vector3().crossVectors(normal,u).normalize();
    const size=.70+rng()*.48;u.multiplyScalar(size);v.multiplyScalar(size*.8);
    const shade=.45+rng()*.38+Math.max(0,(center.y-4)/20);
    const base=positions.length/3;
    for(const [x,y] of [[-1,-1],[1,-1],[1,1],[-1,1]]) {
      const point=center.clone().addScaledVector(u,x).addScaledVector(v,y);
      positions.push(point.x,point.y,point.z);uvs.push((x+1)/2,(y+1)/2);
      colors.push(shade,shade,shade);normals.push(normal.x,normal.y,normal.z);
    }
    indices.push(base,base+1,base+2,base,base+2,base+3);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);if(form==='birch')g.scale(.75,1.12,.75);return g;
}

function makeShrubGeometry(): THREE.BufferGeometry {
  const g=makeBroadleafCrownGeometry('oak');const tip=branchTips()[0];g.translate(-tip.x,-tip.y+.8,-tip.z);g.scale(.7,.7,.7);g.setDrawRange(0,24*6);return g;
}

let pineTexture:THREE.CanvasTexture|undefined;
function makePineTexture(){
 if(pineTexture)return pineTexture;const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d')!;const rng=randomSource(1819);
 for(let k=0;k<9;k++){const a=(k/8-.5)*2.1,ex=64+Math.sin(a)*55,ey=64-Math.cos(a)*55;
 ctx.strokeStyle='#847c52';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(64,112);ctx.lineTo(ex,ey);ctx.stroke();
 for(let i=0;i<45;i++){const t=rng(),x=64+(ex-64)*t,y=112+(ey-112)*t;ctx.strokeStyle=['#a8b687','#d4dbb7','#7f996a'][i%3];ctx.lineWidth=1+rng();ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(rng()-.5)*22,y-5-rng()*9);ctx.stroke();}}
 pineTexture=new THREE.CanvasTexture(c);pineTexture.colorSpace=THREE.SRGBColorSpace;return pineTexture;
}
function makeConiferCrownGeometry():THREE.BufferGeometry {
 const rng=randomSource(551),p:number[]=[],uv:number[]=[],colors:number[]=[],ix:number[]=[];
 for(let tier=0;tier<15;tier++){
 const y=.8+tier*.43,reach=2.3*Math.pow(1-tier/15,.85)+.1;
 for(let branch=0;branch<9;branch++){
 const a=branch*Math.PI*2/9+tier*1.7;
 for(let twig=0;twig<5;twig++){
 const t=.2+twig*.18,r=reach*t,angle=a+(rng()-.5)*.35;
 const center=new THREE.Vector3(Math.cos(angle)*r,y-.25*t+Math.sin(t*Math.PI)*.22,Math.sin(angle)*r);
 const u=new THREE.Vector3(-Math.sin(angle),0,Math.cos(angle)).multiplyScalar((.38+reach*.16)*(1-t*.35));
 const v=new THREE.Vector3(Math.cos(angle)*.45,.4,Math.sin(angle)*.45).multiplyScalar(.8+rng()*.35);
 const n=p.length/3,shade=.55+rng()*.4;
 for(const [x,z] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const pt=center.clone().addScaledVector(u,x).addScaledVector(v,z);p.push(pt.x,pt.y,pt.z);uv.push((x+1)/2,(z+1)/2);colors.push(shade,shade,shade);}
 ix.push(n,n+1,n+2,n,n+2,n+3);
 }}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(ix);g.computeVertexNormals();return g;
}

function addPointedLeaf(positions: number[], base: THREE.Vector3, direction: THREE.Vector3, sideHint: THREE.Vector3, length: number, width: number): void {
  const dir = direction.clone().normalize();
  const side = new THREE.Vector3().crossVectors(dir, sideHint).normalize();
  if (side.lengthSq() < 0.01) side.set(1, 0, 0);
  const shoulder = base.clone().addScaledVector(dir, length * 0.52);
  const tip = base.clone().addScaledVector(dir, length);
  const a = shoulder.clone().addScaledVector(side, width);
  const b = shoulder.clone().addScaledVector(side, -width);
  positions.push(base.x, base.y, base.z, a.x, a.y, a.z, tip.x, tip.y, tip.z);
  positions.push(base.x, base.y, base.z, tip.x, tip.y, tip.z, b.x, b.y, b.z);
}

function addTubeBetween(positions: number[], start: THREE.Vector3, end: THREE.Vector3, radius: number, sides: number): void {
  const axis = end.clone().sub(start).normalize();
  const u = new THREE.Vector3().crossVectors(axis, Math.abs(axis.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize();
  const v = new THREE.Vector3().crossVectors(axis, u).normalize();
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const b = ((i + 1) / sides) * Math.PI * 2;
    const a0 = start.clone().addScaledVector(u, Math.cos(a) * radius).addScaledVector(v, Math.sin(a) * radius);
    const a1 = start.clone().addScaledVector(u, Math.cos(b) * radius).addScaledVector(v, Math.sin(b) * radius);
    const b0 = end.clone().addScaledVector(u, Math.cos(a) * radius * 0.55).addScaledVector(v, Math.sin(a) * radius * 0.55);
    const b1 = end.clone().addScaledVector(u, Math.cos(b) * radius * 0.55).addScaledVector(v, Math.sin(b) * radius * 0.55);
    positions.push(a0.x, a0.y, a0.z, b0.x, b0.y, b0.z, b1.x, b1.y, b1.z);
    positions.push(a0.x, a0.y, a0.z, b1.x, b1.y, b1.z, a1.x, a1.y, a1.z);
  }
}

function geometryFromPositions(positions: number[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  // Break up the uniform green surfaces with subtle deterministic variation
  // across needle sprays and leaf faces. Instance color still controls season.
  const colors: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i < positions.length; i += 9) {
    const face = i / 9;
    const noise = ((Math.sin(face * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1;
    const shade = 0.76 + noise * 0.38;
    const rgb = [shade * 0.82, shade, shade * 0.78];
    for (let vertex = 0; vertex < 3; vertex++) {
      colors.push(...rgb);
      const p = i + vertex * 3;
      uvs.push(positions[p] * 1.8 + positions[p + 2] * 1.8, positions[p + 1] * 1.8);
    }
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

let broadleafTexture: THREE.CanvasTexture | undefined;
function makeBroadleafTexture(): THREE.CanvasTexture {
  if(broadleafTexture)return broadleafTexture;
  const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!;
  const rng=randomSource(439);ctx.lineCap='round';
  // A small branch with individual, pointed oval leaves and visible gaps.
  for(let branch=0;branch<7;branch++){
    const a=branch*2.399, endX=128+Math.cos(a)*92,endY=128+Math.sin(a)*92;
    ctx.strokeStyle='#72705a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(128,128);ctx.lineTo(endX,endY);ctx.stroke();
    for(let j=0;j<18;j++){
      const t=.15+rng()*.85,x=128+(endX-128)*t+(rng()-.5)*48,y=128+(endY-128)*t+(rng()-.5)*48;
      const length=8+rng()*8,angle=a+(rng()-.5)*2;
      ctx.save();ctx.translate(x,y);ctx.rotate(angle);const value=125+Math.floor(rng()*120);ctx.fillStyle=`rgb(${value},${value},${Math.floor(value*.89)})`;
      ctx.beginPath();ctx.moveTo(-length,0);ctx.quadraticCurveTo(0,-length*.65,length,0);ctx.quadraticCurveTo(0,length*.65,-length,0);ctx.fill();ctx.restore();
    }
  }
  broadleafTexture=new THREE.CanvasTexture(c);broadleafTexture.colorSpace=THREE.SRGBColorSpace;broadleafTexture.anisotropy=4;return broadleafTexture;
}

let canopyTexture: THREE.CanvasTexture | undefined;
function makeCanopyTexture(): THREE.CanvasTexture {
  if (canopyTexture) return canopyTexture;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const rng = randomSource(0x51d3a7);
    ctx.fillStyle = '#a0a0a0'; ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1200; i++) {
      const x = rng() * 128, y = rng() * 128, len = 3 + rng() * 10;
      const shade = Math.round(54 + rng() * 150);
      ctx.strokeStyle = `rgba(${shade},${shade},${shade},${0.26 + rng() * 0.48})`;
      ctx.lineWidth = 0.45 + rng() * 1.2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rng() - 0.5) * 4, y - len); ctx.stroke();
    }
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rng() * 0.12})`;
      ctx.fillRect(rng() * 128, rng() * 128, 1, 1);
    }
  }
  canopyTexture = new THREE.CanvasTexture(canvas);
  canopyTexture.colorSpace = THREE.SRGBColorSpace;
  canopyTexture.wrapS = canopyTexture.wrapT = THREE.RepeatWrapping;
  canopyTexture.anisotropy = 4;
  canopyTexture.needsUpdate = true;
  return canopyTexture;
}

let birchBarkTexture: THREE.CanvasTexture | undefined;
function makeBirchBarkTexture(): THREE.CanvasTexture {
  if (birchBarkTexture) return birchBarkTexture;
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;
  const ctx=canvas.getContext('2d');
  if(ctx){
    const rng=randomSource(0xb17c42);
    ctx.fillStyle='#d4d2c7';ctx.fillRect(0,0,128,256);
    for(let i=0;i<320;i++){
      const x=rng()*128,y=rng()*256;
      ctx.strokeStyle=`rgba(72,75,70,${.08+rng()*.15})`;ctx.lineWidth=.5+rng()*1.2;
      ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+(rng()-.5)*5,y+18,x+(rng()-.5)*3,y+42,x+(rng()-.5)*5,y+55*rng());ctx.stroke();
    }
    for(let i=0;i<85;i++){
      const x=rng()*128,y=rng()*256;ctx.fillStyle=`rgba(42,45,43,${.48+rng()*.45})`;
      ctx.beginPath();ctx.ellipse(x,y,2+rng()*9,.6+rng()*1.5,rng()*.18,0,Math.PI*2);ctx.fill();
    }
  }
  birchBarkTexture=new THREE.CanvasTexture(canvas);birchBarkTexture.colorSpace=THREE.SRGBColorSpace;
  birchBarkTexture.wrapS=birchBarkTexture.wrapT=THREE.RepeatWrapping;birchBarkTexture.anisotropy=4;birchBarkTexture.needsUpdate=true;
  return birchBarkTexture;
}

let barkTexture: THREE.CanvasTexture | undefined;
function makeBarkTexture(): THREE.CanvasTexture {
  if (barkTexture) return barkTexture;
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const rng = randomSource(0x7a4c13);
    ctx.fillStyle = '#b4a083'; ctx.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 420; i++) {
      const x = rng() * 128, y = rng() * 256, length = 8 + rng() * 64;
      const shade = Math.round(76 + rng() * 100);
      ctx.strokeStyle = `rgba(${shade},${Math.round(shade * .9)},${Math.round(shade * .78)},${0.16 + rng() * .42})`;
      ctx.lineWidth = 0.5 + rng() * 2.2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + (rng() - .5) * 5, y + length * .3, x + (rng() - .5) * 4, y + length * .7, x + (rng() - .5) * 3, y + length); ctx.stroke();
    }
  }
  barkTexture = new THREE.CanvasTexture(canvas);
  barkTexture.colorSpace = THREE.SRGBColorSpace;
  barkTexture.wrapS = barkTexture.wrapT = THREE.RepeatWrapping;
  barkTexture.anisotropy = 4;
  barkTexture.needsUpdate = true;
  return barkTexture;
}

function makeFernGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let f = 0; f < 9; f++) {
    const angle = f * Math.PI * 2 / 9;
    const direction = new THREE.Vector3(Math.cos(angle) * 0.55, 0.82, Math.sin(angle) * 0.55).normalize();
    const stem = new THREE.CylinderGeometry(0.012, 0.023, 0.78, 4);
    stem.applyMatrix4(new THREE.Matrix4().compose(
      new THREE.Vector3(direction.x * 0.32, 0.38, direction.z * 0.32),
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction),
      new THREE.Vector3(1, 1, 1),
    ));
    parts.push(stem);
    for (let n = 1; n <= 6; n++) for (const side of [-1, 1]) {
      const along = n / 7;
      const leaflet = new THREE.PlaneGeometry(0.18 * (1 - along * 0.45), 0.07);
      leaflet.rotateY(angle + side * Math.PI / 2);
      leaflet.rotateZ(side * 0.32);
      leaflet.translate(direction.x * 0.64 * along, 0.08 + 0.67 * along, direction.z * 0.64 * along);
      parts.push(leaflet);
    }
  }
  return combine(parts);
}

function makeFlowerStems(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    const h = 0.31 + (i % 3) * 0.055;
    const stem = new THREE.CylinderGeometry(0.009, 0.015, h, 4);
    stem.translate(Math.cos(a) * 0.11, h / 2, Math.sin(a) * 0.11);
    parts.push(stem);
  }
  return combine(parts);
}

function makeFlowerHeads(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    const h = 0.31 + (i % 3) * 0.055;
    const bloom = new THREE.SphereGeometry(0.065, 8, 5);
    bloom.scale(1, 0.64, 1);
    bloom.translate(Math.cos(a) * 0.11, h + 0.005, Math.sin(a) * 0.11);
    parts.push(bloom);
  }
  return combine(parts);
}

const TREE_TEXTURES = new Map<string, THREE.CanvasTexture>();
function makeTreeTexture(kind: 'conifer' | 'broadleaf'): THREE.CanvasTexture {
  const key = `${kind}:summer-autumn-winter`;
  const cached = TREE_TEXTURES.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const rng = randomSource(kind === 'conifer' ? 0x73ac39 : 0x4bd231);
    if (kind === 'broadleaf') drawBroadleaf(ctx, rng);
    else drawConifer(ctx, rng);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  TREE_TEXTURES.set(key, texture);
  return texture;
}

function drawBroadleaf(ctx: CanvasRenderingContext2D, random: () => number): void {
  // Fine branching underneath loose sprays of individual leaves gives a broken, natural edge.
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#604a35';
  ctx.fillStyle = '#604a35';
  ctx.lineWidth = 13;
  ctx.beginPath(); ctx.moveTo(258, 516); ctx.bezierCurveTo(244, 402, 274, 244, 257, 52); ctx.stroke();
  const tips: Array<{ x: number; y: number }> = [];
  const grow = (x: number, y: number, length: number, angle: number, width: number, depth: number): void => {
    const ex = x + Math.cos(angle) * length;
    const ey = y + Math.sin(angle) * length;
    ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo((x + ex) * 0.5 + (random() - 0.5) * 9, (y + ey) * 0.5, ex, ey); ctx.stroke();
    if (depth <= 0) { tips.push({ x: ex, y: ey }); return; }
    const spread = 0.32 + random() * 0.18;
    grow(ex, ey, length * (0.65 + random() * 0.12), angle - spread, width * 0.68, depth - 1);
    grow(ex, ey, length * (0.65 + random() * 0.12), angle + spread, width * 0.68, depth - 1);
  };
  for (let level = 0; level < 7; level++) {
    const y = 395 - level * 43;
    const reach = 68 + (6 - level) * 14 + random() * 17;
    const angle = 0.08 + (random() - 0.5) * 0.16;
    grow(255, y, reach, -angle, 5.3 - level * 0.42, 4);
    grow(255, y + 3, reach * (0.83 + random() * 0.18), -Math.PI + angle, 5.1 - level * 0.4, 4);
  }
  // A sparse, irregular crown of overlapping twig sprays; each terminal twig gets small leaves.
  for (const tip of tips) {
    if (random() < 0.13) continue;
    // At driving distance individual leaves merge into soft foliage masses.
    // Give each branch tip an uneven cluster first, then retain leaf detail on
    // its edge so the silhouette reads as a tree instead of bare scaffolding.
    const clusterRadius = 10 + random() * 13;
    ctx.fillStyle = pick(random, ['#526b43', '#60794b', '#718954', '#647d4d']);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = i / 10 * Math.PI * 2;
      const radius = clusterRadius * (0.72 + random() * 0.38);
      const x = tip.x + Math.cos(angle) * radius;
      const y = tip.y + Math.sin(angle) * radius * 0.78;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    const n = 22 + Math.floor(random() * 22);
    for (let i = 0; i < n; i++) {
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(random()) * (12 + random() * 18);
      const x = tip.x + Math.cos(angle) * radius;
      const y = tip.y + Math.sin(angle) * radius * 0.74;
      const length = 4.5 + random() * 4.5;
      const rotation = random() * Math.PI;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
      ctx.fillStyle = random() < 0.2 ? '#bccd96' : random() < 0.5 ? '#a9bc7b' : '#91a868';
      ctx.beginPath(); ctx.ellipse(0, 0, length * 0.42, length, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(112,133,91,0.55)'; ctx.lineWidth = 0.65;
      ctx.beginPath(); ctx.moveTo(0, length * 0.75); ctx.lineTo(0, -length * 0.68); ctx.stroke();
      ctx.restore();
    }
  }
}

function drawConifer(ctx: CanvasRenderingContext2D, random: () => number): void {
  // Long leaders and drooping boughs with thousands of fine needle strokes, not tiered cones.
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#705c43'; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(256, 514); ctx.bezierCurveTo(245, 370, 267, 200, 256, 16); ctx.stroke();
  for (let tier = 0; tier < 21; tier++) {
    const y = 48 + tier * 21.2;
    const t = tier / 20;
    const reach = 10 + 168 * Math.pow(t, 0.84) * (0.91 + random() * 0.12);
    for (const side of [-1, 1]) {
      const endX = 256 + side * reach;
      const endY = y + 17 + t * 8;
      ctx.strokeStyle = '#75664d'; ctx.lineWidth = 1.3 + t * 2.1;
      ctx.beginPath(); ctx.moveTo(256, y); ctx.quadraticCurveTo(256 + side * reach * 0.56, y + 27 + t * 12, endX, endY); ctx.stroke();
      // Smaller secondary sprays break up the broad branch outline.
      for (let branch = 1; branch <= 8; branch++) {
        const f = branch / 9;
        const bx = 256 + side * reach * f;
        const by = y + (27 + t * 12) * (2 * f - f * f);
        const len = (5 + reach * 0.16) * (1 - f * 0.3);
        ctx.strokeStyle = '#78906c'; ctx.lineWidth = 0.8 + random() * 0.75;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + side * len * 0.45, by - len * 0.66); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + side * len, by + len * 0.48); ctx.stroke();
        // Short individually varied needles catch light while preserving a fine silhouette.
        for (let needle = 0; needle < 18; needle++) {
          const along = (random() * 0.88 + 0.06) * len;
          const nx = bx + side * along * 0.72;
          const ny = by - along * 0.28 + random() * len * 0.42;
          const angle = (random() - 0.5) * 1.8 + side * 0.2;
          const needleLength = 2.3 + random() * 3.6;
          ctx.strokeStyle = random() < 0.28 ? '#a9bd88' : random() < 0.5 ? '#839f68' : '#718f5d';
          ctx.lineWidth = 0.85 + random() * 0.55;
          ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx + Math.cos(angle) * needleLength, ny + Math.sin(angle) * needleLength); ctx.stroke();
        }
      }
    }
  }
}

function makeBroadleafTrunk(): THREE.BufferGeometry {
  const parts:THREE.BufferGeometry[]=[];
  const limb=(a:THREE.Vector3,b:THREE.Vector3,r0:number,r1:number)=>{
    const d=b.clone().sub(a),g=new THREE.CylinderGeometry(r1,r0,d.length(),7,1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());parts.push(g);
  };
  limb(new THREE.Vector3(0,0,0),new THREE.Vector3(.1,3.1,.08),.28,.16);
  limb(new THREE.Vector3(.1,3.1,.08),new THREE.Vector3(.12,7.7,.15),.16,.025);
  branchTips().forEach((tip,i)=>{
    const root=new THREE.Vector3(.1,1.8+(i%4)*.5,.08),mid=root.clone().lerp(tip,.53);mid.y-=.3;mid.x+=Math.sin(i*3.7)*.28;mid.z+=Math.cos(i*2.8)*.25;
    limb(root,mid,.09,.045);limb(mid,tip,.045,.01);
    for(let j=0;j<3;j++){const a=i*2.4+j*2.1;const end=tip.clone().add(new THREE.Vector3(Math.cos(a)*.9,.2+j*.25,Math.sin(a)*.9));limb(mid.clone().lerp(tip,.6),end,.038,.008);}
  });
  return combine(parts);
}

function makeGrassGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const blades = 11;
  for (let i = 0; i < blades; i++) {
    const a = i * Math.PI * 2 / blades;
    const dx = Math.cos(a), dz = Math.sin(a);
    const width = 0.012 + (i % 3) * 0.006;
    const tipX = dx * (0.11 + (i % 4) * 0.025), tipZ = dz * (0.11 + (i % 4) * 0.025);
    const color = new THREE.Color(i % 2 ? 0xe9eadf : 0xdde5d1);
    const bladeHeight = 0.15 + (i % 4) * 0.075;
    for (const v of [[-dz * width, 0, dx * width], [dz * width, 0, -dx * width], [tipX, bladeHeight, tipZ]]) {
      positions.push(v[0], v[1], v[2]); colors.push(color.r, color.g, color.b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

function makeRockGeometry(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
    const wobble = 0.84 + 0.13 * Math.sin(i * 12.73);
    v.multiplyScalar(wobble);
    v.y *= 0.72;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function combine(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  let hasUv = false;
  for (const source of parts) {
    const part = source.index ? source.toNonIndexed() : source;
    const p = part.getAttribute('position');
    const n = part.getAttribute('normal');
    const uv = part.getAttribute('uv');
    const partColor = part.getAttribute('color');
    if (uv) hasUv = true;
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      normals.push(n.getX(i), n.getY(i), n.getZ(i));
      if (uv) uvs.push(uv.getX(i), uv.getY(i));
      else uvs.push(0, 0);
      const shade = 0.88 + (i % 7) * 0.018;
      colors.push(partColor ? partColor.getX(i)*shade : shade,partColor ? partColor.getY(i)*shade : shade,partColor ? partColor.getZ(i)*shade : shade);
    }
    part.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  if (hasUv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return g;
}

function randomSource(seed: number): () => number {
  let state = seed || 0x6d2b79f5;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: () => number, values: T[]): T { return values[Math.floor(random() * values.length)]; }
function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }

function makeAnimalGeometry(kind:'body'|'head'|'ear'|'tail'): THREE.BufferGeometry {
  if (kind === 'body') {
    const g = new THREE.SphereGeometry(1, 10, 7); g.scale(.34, .25, .52); return g;
  }
  if (kind === 'head') {
    const g = new THREE.SphereGeometry(1, 10, 7); g.scale(.21, .2, .22); return g;
  }
  if (kind === 'ear') {
    const g = new THREE.SphereGeometry(1, 9, 8); g.scale(.056,.20,.075); g.translate(0,.17,0); return g;
  }
  const g = new THREE.SphereGeometry(1, 8, 6); g.scale(.16, .16, .18); return g;
}
function makeAnimalDetailGeometry(kind:'leg'|'eye'|'nose'):THREE.BufferGeometry{
  if(kind==='leg')return new THREE.CylinderGeometry(.036,.052,.18,7);
  const g=new THREE.SphereGeometry(1,8,6);g.scale(kind==='eye'?.035:.055,kind==='eye'?.035:.045,kind==='eye'?.035:.055);return g;
}

function makeDeerGeometry(): THREE.BufferGeometry {
  const parts:THREE.BufferGeometry[]=[];
  const brown=0xa27853,deep=0x765239,cream=0xd1b99a,hoof=0x38322b,antler=0x725039;
  const add=(geo:THREE.BufferGeometry,color:number)=>{const c=new THREE.Color(color),count=geo.getAttribute('position').count,values:number[]=[];for(let i=0;i<count;i++)values.push(c.r,c.g,c.b);geo.setAttribute('color',new THREE.Float32BufferAttribute(values,3));parts.push(geo);};
  const oval=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:number)=>{const geo=new THREE.SphereGeometry(1,12,9);geo.scale(sx,sy,sz);geo.translate(x,y,z);add(geo,color);};
  const limb=(a:THREE.Vector3,b:THREE.Vector3,base:number,tip:number,color:number)=>{const vector=b.clone().sub(a),geo=new THREE.CylinderGeometry(tip,base,vector.length(),8);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),vector.clone().normalize()));geo.translate(...a.clone().add(b).multiplyScalar(.5).toArray());add(geo,color);};
  // Overlapping shoulder, neck and head volumes make a single continuous silhouette.
  oval(0,.94,0,.47,.34,.83,brown);oval(0,.93,-.52,.45,.36,.39,brown);oval(0,1.01,.49,.42,.39,.39,brown);
  limb(new THREE.Vector3(0,1.04,.55),new THREE.Vector3(0,1.42,.78),.23,.16,brown);
  oval(0,1.42,.88,.23,.20,.31,brown);oval(0,1.34,1.12,.15,.12,.20,cream);oval(0,.70,.20,.31,.09,.40,cream);
  for(const side of [-1,1]){
    const ear=new THREE.SphereGeometry(1,9,7);ear.scale(.17,.075,.095);ear.rotateZ(side*.38);ear.translate(side*.26,1.58,.78);add(ear,deep);
    oval(side*.19,1.46,1.01,.027,.03,.027,hoof);
    for(const z of [-.57,.56]){const x=side*.29,knee=new THREE.Vector3(x*.93,.39,z+(z<0?-.04:.04));limb(new THREE.Vector3(x,.80,z),knee,.085,.055,brown);limb(knee,new THREE.Vector3(x,.10,z),.052,.035,deep);oval(x,.065,z,.075,.065,.105,hoof);}
    const root=new THREE.Vector3(side*.11,1.61,.76),mid=new THREE.Vector3(side*.23,1.89,.75),tip=new THREE.Vector3(side*.37,2.11,.67);
    limb(root,mid,.042,.030,antler);limb(mid,tip,.030,.012,antler);
    limb(new THREE.Vector3(side*.19,1.80,.75),new THREE.Vector3(side*.38,1.93,.90),.023,.008,antler);
    limb(new THREE.Vector3(side*.29,1.98,.72),new THREE.Vector3(side*.48,2.08,.82),.020,.007,antler);
  }
  oval(0,.99,-.84,.10,.11,.17,cream);
  return combine(parts);
}

function addWildlife(g:THREE.Group, rng:()=>number, world:{height:(x:number,z:number)=>number;lateral:(x:number,z:number)=>number;pond:(x:number,z:number)=>{x:number;z:number;rx:number;rz:number}|null}, tx:number,tz:number, season:string): void {
  const capacity=18;
  // Instance colors are multiplied by the material; a white base preserves
  // the intended fur palette instead of turning every animal nearly black.
  const bodyMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.95});
  const headMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.95});
  const earMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.98});
  const tailMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.98});
  const bodies=new THREE.InstancedMesh(makeAnimalGeometry('body'),bodyMat,capacity);
  const heads=new THREE.InstancedMesh(makeAnimalGeometry('head'),headMat,capacity);
  const ears=new THREE.InstancedMesh(makeAnimalGeometry('ear'),earMat,capacity*2);
  const tails=new THREE.InstancedMesh(makeAnimalGeometry('tail'),tailMat,capacity);
  const legs=new THREE.InstancedMesh(makeAnimalDetailGeometry('leg'),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}),capacity*4);
  const eyes=new THREE.InstancedMesh(makeAnimalDetailGeometry('eye'),new THREE.MeshStandardMaterial({color:0x171512,roughness:.7}),capacity*2);
  const noses=new THREE.InstancedMesh(makeAnimalDetailGeometry('nose'),new THREE.MeshStandardMaterial({color:0x33231c,roughness:.8}),capacity);
  const deerMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.98,vertexColors:true});
  const deer=new THREE.InstancedMesh(makeDeerGeometry(),deerMat,4);
  const bodyColor=new THREE.Color(),headColor=new THREE.Color(),earColor=new THREE.Color(),tailColor=new THREE.Color();
  const d=new THREE.Object3D(); let count=0;
  const pond=world.pond(tx,tz);
  for(let tries=0;tries<capacity*12 && count<capacity;tries++){
    const x=tx*192+rng()*192,z=tz*192+rng()*192;
    if(Math.abs(world.lateral(x,z))<17||pond&&Math.hypot((x-pond.x)/pond.rx,(z-pond.z)/pond.rz)<1.4)continue;
    const fox=(count%7===0 && season!=='winter');
    const scale=fox?1.48:1.28+rng()*.24; const y=world.height(x,z)+.22*scale; const heading=rng()*Math.PI*2;
    d.position.set(x,y,z); d.rotation.set(0,heading,0); d.scale.setScalar(scale); d.updateMatrix(); bodies.setMatrixAt(count,d.matrix);
    bodyColor.set(fox?0xa96338:(count%3===0?0x9d866b:0x786653)); bodies.setColorAt(count,bodyColor);
    d.position.set(x+Math.sin(heading)*.22*scale,y+.13*scale,z+Math.cos(heading)*.22*scale); d.scale.setScalar(scale); d.updateMatrix(); heads.setMatrixAt(count,d.matrix);
    headColor.set(fox?0xb87343:(count%3===0?0xb09270:0x816d56)); heads.setColorAt(count,headColor);
    const legColor=new THREE.Color(fox?0x543a2b:0x65533f);
    for(let l=0;l<4;l++){const side=l%2===0?-1:1,fore=l<2,fx=x+Math.sin(heading)*(fore?.35:-.34)*scale+Math.cos(heading)*side*.2*scale,fz=z+Math.cos(heading)*(fore?.35:-.34)*scale-Math.sin(heading)*side*.2*scale;d.position.set(fx,world.height(x,z)+.10*scale,fz);d.rotation.set((rng()-.5)*.14,heading,(rng()-.5)*.12);d.scale.setScalar(scale);d.updateMatrix();legs.setMatrixAt(count*4+l,d.matrix);legs.setColorAt(count*4+l,legColor);}
    for(let e=0;e<2;e++){const side=e===0?-1:1;d.position.set(x+Math.sin(heading)*.34*scale+Math.cos(heading)*side*.145*scale,y+.17*scale,z+Math.cos(heading)*.34*scale-Math.sin(heading)*side*.145*scale);d.rotation.set(0,heading,0);d.scale.setScalar(scale);d.updateMatrix();eyes.setMatrixAt(count*2+e,d.matrix);}
    d.position.set(x+Math.sin(heading)*.43*scale,y+.105*scale,z+Math.cos(heading)*.43*scale);d.rotation.set(0,heading,0);d.scale.setScalar(scale);d.updateMatrix();noses.setMatrixAt(count,d.matrix);
    const earY=y+.22*scale;
    for(let e=0;e<2;e++){
      const side=e===0?-1:1; d.position.set(x+Math.sin(heading)*.23*scale+Math.cos(heading)*side*.105*scale,earY,z+Math.cos(heading)*.23*scale-Math.sin(heading)*side*.105*scale); d.rotation.set(0,heading,side*.12); d.scale.setScalar(scale*(fox?.67:1)); d.updateMatrix(); ears.setMatrixAt(count*2+e,d.matrix); earColor.set(fox?0xa96338:0x987258); ears.setColorAt(count*2+e,earColor);
    }
    d.position.set(x-Math.sin(heading)*.34*scale,y+.04*scale,z-Math.cos(heading)*.34*scale); d.rotation.set(0,heading,0); d.scale.setScalar(scale*(fox?1.4:1)); d.updateMatrix(); tails.setMatrixAt(count,d.matrix); tailColor.set(fox?0xb56c3d:0xd9d2c1); tails.setColorAt(count,tailColor);
    count++;
  }
  let deerCount=0;
  for(let tries=0;tries<48&&deerCount<4;tries++){
    const x=tx*192+rng()*192,z=tz*192+rng()*192;
    if(Math.abs(world.lateral(x,z))<20||pond&&Math.hypot((x-pond.x)/pond.rx,(z-pond.z)/pond.rz)<1.35)continue;
    d.position.set(x,world.height(x,z),z);d.rotation.set(0,rng()*Math.PI*2,0);d.scale.setScalar(1.08+rng()*.20);d.updateMatrix();deer.setMatrixAt(deerCount++,d.matrix);
  }
  addInstanced(g,bodies,count); addInstanced(g,heads,count); addInstanced(g,ears,count*2); addInstanced(g,tails,count); addInstanced(g,legs,count*4); addInstanced(g,eyes,count*2); addInstanced(g,noses,count); addInstanced(g,deer,deerCount);
}



/** Sparse groves and dense ground cover continue in every direction away from the road. */
export function createWilderness(tx:number,tz:number,world:{seed:number;height:(x:number,z:number)=>number;lateral:(x:number,z:number)=>number;pond:(x:number,z:number)=>{x:number;z:number;rx:number;rz:number}|null},season:string){
 const g=new THREE.Group(),rng=randomSource(world.seed^Math.imul(tx,73856093)^Math.imul(tz,19349663));
 const mat=new THREE.MeshStandardMaterial({color:season==='winter'?0xc9d1c4:0x627942,map:makeBroadleafTexture(),alphaTest:.34,side:THREE.DoubleSide,roughness:1,vertexColors:true});
 const foliage=new THREE.InstancedMesh(makeBroadleafCrownGeometry('oak'),mat,40);
 const trunks=new THREE.InstancedMesh(makeBroadleafTrunk(),new THREE.MeshStandardMaterial({color:0x675b48,map:makeBarkTexture(),roughness:1}),40);
 const grass=new THREE.InstancedMesh(makeGrassGeometry(),new THREE.MeshStandardMaterial({color:season==='winter'?0xccd5c5:0x78924f,side:THREE.DoubleSide,vertexColors:true}),1800);
 const shrub=new THREE.InstancedMesh(makeShrubGeometry(),mat.clone(),70);
 const d=new THREE.Object3D();let trees=0,grasses=0,shrubs=0;const pond=world.pond(tx,tz);
 for(let i=0;i<2000;i++){
 const x=tx*192+rng()*192,z=tz*192+rng()*192;
 if(Math.abs(world.lateral(x,z))<38||pond&&Math.hypot((x-pond.x)/pond.rx,(z-pond.z)/pond.rz)<1.25)continue;
 d.position.set(x,world.height(x,z),z);d.rotation.set(0,rng()*Math.PI*2,0);d.scale.setScalar(.85+rng()*.6);d.updateMatrix();
 if(i<140&&trees<40){foliage.setMatrixAt(trees,d.matrix);trunks.setMatrixAt(trees++,d.matrix);}
 else if(i<120&&shrubs<70){shrub.setMatrixAt(shrubs++,d.matrix);}
 else if(grasses<1800){grass.setMatrixAt(grasses++,d.matrix);}}
 addInstanced(g,foliage,trees);addInstanced(g,trunks,trees);addInstanced(g,grass,grasses);addInstanced(g,shrub,shrubs);
 addWildlife(g,rng,world,tx,tz,season);
 return g;
}
