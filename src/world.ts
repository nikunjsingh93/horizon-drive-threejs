import * as THREE from 'three';
import {Landscape,clamp} from './simulation';
import {createScenery,createWilderness} from './scenery';
import {qualityPresets,type GraphicsQuality} from './quality';
const CHUNK=180;
function texture(kind:'grass'|'road'){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!;const img=ctx.createImageData(256,256);let s=198731;const rand=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
 for(let i=0;i<img.data.length;i+=4){const n=rand(),v=kind==='road'?105+n*55:155+n*90;img.data[i]=v;img.data[i+1]=v;img.data[i+2]=v;img.data[i+3]=255;}ctx.putImageData(img,0,0);
 if(kind==='grass'){for(let i=0;i<7000;i++){const x=rand()*256,y=rand()*256;ctx.strokeStyle=rand()>.5?'#bac1a055':'#3b493444';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+rand()*3-1.5,y-2-rand()*6);ctx.stroke();}}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}
function waterTexture(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d')!,img=ctx.createImageData(128,128);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4;img.data[i]=128+Math.sin(x*.39+y*.14)*42;img.data[i+1]=128+Math.cos(y*.49+x*.18)*42;img.data[i+2]=245;img.data[i+3]=255;}ctx.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(12,12);return t;}
export class WorldView {
 fields=new Map<string,THREE.Group>();
 chunks=new Map<number,THREE.Group>();waterNormal=waterTexture();grass=texture('grass');asphalt=texture('road');season='summer';
 quality:GraphicsQuality='high';
 terrainMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,map:this.grass});
 roadMat=new THREE.MeshStandardMaterial({color:0x777773,roughness:.95,map:this.asphalt});
 lineMat=new THREE.MeshStandardMaterial({color:0xecebd6,roughness:.9});
 centerLineMat=new THREE.MeshStandardMaterial({color:0xf2bc34,roughness:.9});
 vergeMat=new THREE.MeshStandardMaterial({color:0xa89b79,roughness:1,map:this.grass});
 dirtMat=new THREE.MeshStandardMaterial({color:0x806a4e,roughness:1});
 mudMat=new THREE.MeshStandardMaterial({color:0x46392e,roughness:1});
 debrisMat=new THREE.MeshStandardMaterial({color:0x4e4b42,roughness:1});
 constructor(public scene:THREE.Scene,public landscape:Landscape){}
 update(z:number,x=this.landscape.roadX(z)){this.updateFields(x,z);const center=Math.floor(z/CHUNK),preset=qualityPresets[this.quality];const needed=[];for(let i=center-preset.chunkBehind;i<=center+preset.chunkAhead;i++)needed.push(i);for(const [i,g] of this.chunks){if(!needed.includes(i)){this.dispose(g);this.chunks.delete(i);}}
 for(const i of needed)if(!this.chunks.has(i)){const g=this.chunk(i);this.chunks.set(i,g);this.scene.add(g);}
 }
 animate(time:number,playerX:number,playerZ:number){for(const chunk of this.chunks.values())for(const child of chunk.children){const animateBirds=child.userData.animateBirds as ((time:number)=>void)|undefined;animateBirds?.(time);}for(const [key,field] of this.fields){const [tx,tz]=key.split(':').map(Number),nearX=Math.max(tx*192,Math.min(playerX,(tx+1)*192)),nearZ=Math.max(tz*192,Math.min(playerZ,(tz+1)*192));if((playerX-nearX)**2+(playerZ-nearZ)**2>140**2)continue;const animateWildlife=field.children[1]?.userData.animateWildlife as ((time:number)=>void)|undefined;animateWildlife?.(time);}}
 setQuality(quality:GraphicsQuality){if(this.quality===quality)return;this.quality=quality;this.rebuild();}
 rebuild(landscape=this.landscape,season=this.season){this.landscape=landscape;this.season=season;for(const g of this.chunks.values())this.dispose(g);this.chunks.clear();for(const g of this.fields.values())this.dispose(g);this.fields.clear();}
 dispose(g:THREE.Group){this.scene.remove(g);const shared=new Set<THREE.Material>([this.terrainMat,this.roadMat,this.lineMat,this.centerLineMat,this.vergeMat,this.dirtMat,this.mudMat,this.debrisMat]);const done=new Set<THREE.Material>();g.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms)if(!shared.has(m)&&!done.has(m)){m.dispose();done.add(m);}}});}
 ribbon(start:number,length:number,left:number,right:number,mat:THREE.Material,yoff:number){const w=this.landscape,steps=Math.ceil(length/3),pos=[],uv=[],ind=[];for(let i=0;i<=steps;i++){const z=start+i/steps*length;for(const off of [left,right]){pos.push(w.roadX(z)+off*w.stretch(z),w.roadY(z)+yoff,z);uv.push(off*.32,z*.32);}}for(let i=0;i<steps;i++){const a=i*2;ind.push(a,a+2,a+1,a+1,a+2,a+3);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ind);geo.computeVertexNormals();const m=new THREE.Mesh(geo,mat);m.receiveShadow=true;return m;}
 roughShoulder(start:number,length:number,side:number):THREE.Mesh{const w=this.landscape,steps=Math.ceil(length/2.4),pos:number[]=[],uv:number[]=[],ind:number[]=[];for(let i=0;i<=steps;i++){const z=start+i/steps*length;const wave=Math.sin(z*.19+side*1.7)*.16+Math.sin(z*.071+side*4.2)*.12;const inner=side*(4.07+wave),outer=side*(5.05+wave+Math.sin(z*.43)*.07);for(const off of [inner,outer]){const x=w.roadX(z)+off*w.stretch(z);pos.push(x,w.roadY(z)+.018,z);uv.push(off*.42,z*.16);}}for(let i=0;i<steps;i++){const a=i*2;ind.push(a,a+2,a+1,a+1,a+2,a+3);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ind);geo.computeVertexNormals();const m=new THREE.Mesh(geo,this.dirtMat);m.receiveShadow=true;return m;}
 roadDetails(start:number,length:number,index:number):THREE.InstancedMesh{const w=this.landscape,mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.055,.012,.16),this.debrisMat,52),d=new THREE.Object3D();const rand=(n:number)=>{const v=Math.sin(n*91.73+index*37.17)*43758.5453;return v-Math.floor(v);};for(let i=0;i<52;i++){const z=start+3+rand(i)*174,off=(rand(i+2)*2-1)*3.58;d.position.set(w.roadX(z)+off*w.stretch(z),w.roadY(z)+.055,z);d.rotation.set(0,rand(i+5)*Math.PI,rand(i+8)*.22-.11);d.scale.set(.7+rand(i+11)*1.4,.7+rand(i+13)*.8,.45+rand(i+17)*1.4);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);}mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=false;mesh.receiveShadow=true;return mesh;}
 trailRibbon(start:number,length:number,left:number,right:number,material:THREE.Material,yOffset:number){const w=this.landscape,steps=Math.ceil(length/2),positions:number[]=[],uv:number[]=[],indices:number[]=[];for(let i=0;i<=steps;i++){const z=start+i*length/steps,slope=(w.trailX(z+.2)-w.trailX(z-.2))/.4,stretch=Math.sqrt(1+slope*slope);for(const off of [left,right]){const x=w.trailX(z)+off*stretch;positions.push(x,w.height(x,z)+yOffset,z);uv.push(off*.22,z*.15);}if(i<steps){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();const road=new THREE.Mesh(geometry,material);road.receiveShadow=true;return road;}
 chunk(index:number){const start=index*CHUNK,w=this.landscape,g=new THREE.Group();g.name=`Landscape ${index}`;
 g.add(this.ribbon(start,CHUNK,-4.7,4.7,this.vergeMat,-.075),this.roughShoulder(start,CHUNK,-1),this.roughShoulder(start,CHUNK,1),this.ribbon(start,CHUNK,-4.1,4.1,this.roadMat,.025),this.roadDetails(start,CHUNK,index));
 g.add(this.trailRibbon(start,CHUNK,-2.55,2.55,this.dirtMat,.045));
 const mud=new THREE.InstancedMesh(new THREE.CircleGeometry(1,7),this.mudMat,20),dummy=new THREE.Object3D(),rng=(n:number)=>{const v=Math.sin(n*91.73+index*37.17)*43758.5453;return v-Math.floor(v);};
 for(let i=0;i<20;i++){const z=start+8+rng(i)*164,side=i%2?-1:1,off=4.45+rng(i+3)*1.25,x=w.roadX(z)+side*off*w.stretch(z);dummy.position.set(x,w.height(x,z)+.022,z);dummy.rotation.set(-Math.PI/2,0,rng(i+7)*Math.PI);dummy.scale.set(.35+rng(i+11)*.65,.16+rng(i+13)*.34,1);dummy.updateMatrix();mud.setMatrixAt(i,dummy.matrix);}mud.instanceMatrix.needsUpdate=true;g.add(mud);
 for(const edge of [-3.91,3.80])g.add(this.ribbon(start,CHUNK,edge,edge+.11,this.lineMat,.041));
 const solid=Math.abs(w.slope(start+90)-w.slope(start))>.2;
 if(solid){g.add(this.ribbon(start,CHUNK,-.15,-.04,this.centerLineMat,.043),this.ribbon(start,CHUNK,.04,.15,this.centerLineMat,.043));}else g.add(this.dashes(start));
 g.add(createScenery(w.seed^Math.imul(index,73856093),start,CHUNK,z=>w.roadX(z),(x,z)=>w.height(x,z),this.season,qualityPresets[this.quality].vegetation,(x,z)=>w.trailDistance(x,z)));
 this.roadside(g,start,index);return g;
 }
 updateFields(x:number,z:number){
 const cx=Math.floor(x/192),cz=Math.floor(z/192),needed=new Set<string>(),radius=qualityPresets[this.quality].tileRadius;
 for(let a=cx-radius;a<=cx+radius;a++)for(let b=cz-radius;b<=cz+radius;b++){
 const key=`${a}:${b}`;needed.add(key);if(!this.fields.has(key)){const g=this.field(a,b);this.fields.set(key,g);this.scene.add(g);}}
 for(const [key,g] of this.fields)if(!needed.has(key)){this.dispose(g);this.fields.delete(key);}
 }
 field(tx:number,tz:number){
 const group=new THREE.Group(),w=this.landscape,pos:number[]=[],uv:number[]=[],colors:number[]=[],ix:number[]=[],c=new THREE.Color(),n=qualityPresets[this.quality].terrainSegments;
 for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){
 const x=tx*192+i*192/n,z=tz*192+j*192/n,y=w.height(x,z);pos.push(x,y,z);uv.push(x*.12,z*.12);
 const patch=Math.sin(x*.016+z*.006)*Math.cos(z*.011-x*.004);
 c.setHSL(this.season==='winter'?.55:this.season==='autumn'?.13:.21,this.season==='winter'?.09:.30,this.season==='winter'?.79:.33+patch*.06,THREE.SRGBColorSpace);colors.push(c.r,c.g,c.b);
 if(i<n&&j<n){const a=j*(n+1)+i;ix.push(a,a+n+1,a+1,a+1,a+n+1,a+n+2);}}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();const ground=new THREE.Mesh(geo,this.terrainMat);ground.receiveShadow=true;group.add(ground);
 group.add(createWilderness(tx,tz,w,this.season,qualityPresets[this.quality].vegetation));
 const pond=w.pond(tx,tz);if(pond){
 const waterGeo=new THREE.CircleGeometry(1,64);waterGeo.rotateX(-Math.PI/2);waterGeo.scale(pond.rx,1,pond.rz);
 const wp=waterGeo.getAttribute('position');for(let i=1;i<wp.count;i++){const a=(i-1)/64*Math.PI*2;let lo=.8,hi=1.6;for(let n=0;n<12;n++){const r=(lo+hi)/2;if(w.surface(pond.x+Math.cos(a)*pond.rx*r,pond.z-Math.sin(a)*pond.rz*r)<pond.level)lo=r;else hi=r;}wp.setXYZ(i,Math.cos(a)*pond.rx*lo,0,-Math.sin(a)*pond.rz*lo);}wp.needsUpdate=true;
 const water=new THREE.Mesh(waterGeo,new THREE.MeshPhysicalMaterial({normalMap:this.waterNormal,normalScale:new THREE.Vector2(.09,.09),color:0x456c70,roughness:.28,metalness:.35,transparent:true,opacity:.88,clearcoat:1}));water.position.set(pond.x,pond.level,pond.z);group.add(water);
 const reeds=new THREE.InstancedMesh(new THREE.ConeGeometry(.075,.9,3),new THREE.MeshStandardMaterial({color:0x617046,roughness:1,side:THREE.DoubleSide}),96),d=new THREE.Object3D();
 for(let i=0;i<96;i++){const a=i/96*Math.PI*2,idx=1+Math.floor(i/96*64),r=1.035+(i%5)*.01;const x=pond.x+wp.getX(idx)*r,z=pond.z+wp.getZ(idx)*r;d.position.set(x,w.height(x,z)+.32,z);d.rotation.set(0,a,.12*Math.sin(i));d.scale.setScalar(.65+(i%7)*.1);d.updateMatrix();reeds.setMatrixAt(i,d.matrix);}group.add(reeds);
 }
 return group;
 }
 dashes(start:number){const w=this.landscape,pos:number[]=[],indices:number[]=[];for(let z=start;z<start+CHUNK;z+=12){const end=Math.min(z+4,start+CHUNK);for(const zz of [z,end])for(const off of [-.055,.055])pos.push(w.roadX(zz)+off*w.stretch(zz),w.roadY(zz)+.043,zz);const base=pos.length/3-4;indices.push(base,base+2,base+1,base+1,base+2,base+3);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(indices);geo.computeVertexNormals();const m=new THREE.Mesh(geo,this.centerLineMat);m.receiveShadow=true;return m;}
 roadside(g:THREE.Group,start:number,index:number){const w=this.landscape,metal=new THREE.MeshStandardMaterial({color:0x9da5a1,metalness:.5,roughness:.6}),dark=new THREE.MeshStandardMaterial({color:0x384340,roughness:.8});const dummy=new THREE.Object3D();
 // Continuous rails follow road elevation; posts and reflector strips are instanced.
 if(index%3!==1){const side=index%2===0?-1:1;const railGeo=new THREE.BufferGeometry(),p:number[]=[],ix:number[]=[];for(let j=0;j<=60;j++){const z=start+j*3,x=w.roadX(z)+side*5.15*w.stretch(z),y=w.roadY(z);p.push(x,y+.46,z,x,y+.54,z);}for(let j=0;j<60;j++){const a=j*2;ix.push(a,a+1,a+2,a+1,a+3,a+2);}railGeo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));railGeo.setIndex(ix);railGeo.computeVertexNormals();metal.side=THREE.DoubleSide;const rail=new THREE.Mesh(railGeo,metal);g.add(rail);
 const posts=new THREE.InstancedMesh(new THREE.BoxGeometry(.10,.78,.13),dark,30);for(let j=0;j<30;j++){const z=start+j*6;dummy.position.set(w.roadX(z)+side*5.15*w.stretch(z),w.roadY(z)+.27,z);dummy.rotation.set(0,Math.atan(w.slope(z)),0);dummy.updateMatrix();posts.setMatrixAt(j,dummy.matrix);}g.add(posts);
 }else{metal.dispose();dark.dispose();
 const stoneMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1});const stones=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),stoneMat,1080);let n=0;const color=new THREE.Color();for(let j=0;j<180;j++){const z=start+j;for(let row=0;row<3;row++){const zz=z+(row%2)*.4,side=-1,x=w.roadX(zz)+side*6*w.stretch(zz),h=w.height(x,zz),r=Math.sin(j*39.3+row*27.8+index)*.5+.5;dummy.position.set(x,h+.17+row*.29,zz);dummy.rotation.set(0,Math.atan(w.slope(zz))+(r-.5)*.08,0);dummy.scale.set(.53-row*.07,.27+r*.07,.93);dummy.updateMatrix();stones.setMatrixAt(n,dummy.matrix);color.setHSL(.13,.07,.24+r*.12,THREE.SRGBColorSpace);stones.setColorAt(n++,color);}}stones.count=n;stones.receiveShadow=true;g.add(stones);dummy.scale.set(1,1,1);
 }
 const white=new THREE.MeshStandardMaterial({color:0xdeddd1,roughness:.8});const bollards=new THREE.InstancedMesh(new THREE.BoxGeometry(.14,.85,.12),white,12);for(let j=0;j<12;j++){const z=start+j*30%180,side=j<6?-1:1;dummy.position.set(w.roadX(z)+side*4.75*w.stretch(z),w.roadY(z)+.35,z);dummy.rotation.set(0,Math.atan(w.slope(z)),0);dummy.updateMatrix();bollards.setMatrixAt(j,dummy.matrix);}g.add(bollards);
 if(index%4===0){const z=start+80,x=w.roadX(z)-6*w.stretch(z),y=w.height(x,z);const pole=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,2.1,6),new THREE.MeshStandardMaterial({color:0x787c78}));pole.position.set(x,y+1,z);g.add(pole);const sign=new THREE.Group();const board=new THREE.Mesh(new THREE.BoxGeometry(.8,.58,.05),new THREE.MeshStandardMaterial({color:0xe8e6cd}));sign.add(board);const arrowMat=new THREE.MeshBasicMaterial({color:0x343e35});for(let k=0;k<2;k++){const a=new THREE.Mesh(new THREE.BoxGeometry(.07,.33,.06),arrowMat);a.position.set(k===0?-.08:.08,0,-.015);a.rotation.z=k===0?-.65:.65;sign.add(a);}sign.position.set(x,y+1.9,z);sign.rotation.y=Math.atan(w.slope(z));g.add(sign);}
 }
}
export function createSky(){
 const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,depthWrite:false,toneMapped:false,uniforms:{top:{value:new THREE.Color('#367dcc')},bottom:{value:new THREE.Color('#bbd0dd')},night:{value:0},cameraWorld:{value:new THREE.Matrix4()},inverseProjection:{value:new THREE.Matrix4()}},vertexShader:'varying vec2 vScreen; void main(){vScreen=position.xy;gl_Position=vec4(position.xy,1.,1.);}',fragmentShader:`
 varying vec2 vScreen;uniform mat4 cameraWorld;uniform mat4 inverseProjection;uniform vec3 top;uniform vec3 bottom;uniform float night;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<5;i++){n+=noise(p)*a;p=p*2.03+vec2(17,9);a*=.5;}return n;}
 void main(){vec3 ray=(inverseProjection*vec4(vScreen,1.,1.)).xyz;vec3 d=normalize((cameraWorld*vec4(ray,0.)).xyz);float h=max(d.y,0.);vec3 c=mix(bottom,top,pow(h,.38));
 vec3 sunDir=normalize(vec3(-.7,.55,.5));float sun=max(dot(d,sunDir),0.);
 c+=vec3(1.,.77,.44)*pow(sun,90.)*.3*(1.-night);c+=vec3(1.,.91,.73)*smoothstep(.9993,.9997,sun)*(1.-night)*2.;
 vec2 cloudUV=d.xz/max(d.y+.27,.18)*1.05;vec2 warp=vec2(fbm(cloudUV*.34+vec2(4.7,2.1)),fbm(cloudUV*.34-vec2(2.3,8.4)));cloudUV+=(warp-.5)*4.2;float broad=fbm(cloudUV*.58+vec2(3.1,1.7));float middle=fbm(cloudUV*1.28-vec2(8.0,4.0));float detail=fbm(cloudUV*2.65+vec2(11.0,2.0));float n=broad*.52+middle*.32+detail*.16;float horizonFade=smoothstep(.008,.19,h)*(1.-smoothstep(.80,.99,h));float cloud=smoothstep(.36,.69,n)*horizonFade*(1.-night);float wisps=smoothstep(.61,.79,detail)*smoothstep(.05,.3,h)*(1.-smoothstep(.62,.92,h))*(1.-night)*.18;
 float underside=1.-smoothstep(.50,.68,n);vec3 cloudColor=mix(vec3(.48,.56,.63),vec3(.99,.985,.96),smoothstep(.45,.72,n));cloudColor=mix(cloudColor,vec3(.36,.42,.47),underside*.24);float silver=smoothstep(.58,.84,sun)*cloud*(1.-night);cloudColor+=vec3(.20,.16,.10)*silver;cloudColor=mix(cloudColor,vec3(.06,.09,.15),night);
 c=mix(c,cloudColor,clamp(cloud*.78+wisps,0.,.86));
 vec2 starUV=vec2(atan(d.z,d.x),asin(d.y))*650.;vec2 cell=floor(starUV),f=fract(starUV)-.5;float star=step(.998,hash(cell))*smoothstep(.11,0.,length(f))*smoothstep(.05,.4,h)*(1.-cloud);
 c+=vec3(.7,.8,1.)*star*night;
 float moon=smoothstep(.9996,.99985,dot(d,normalize(vec3(.6,.55,.3))));c+=vec3(.65,.76,.93)*moon*night;
 gl_FragColor=vec4(c,1.);
 #include <colorspace_fragment>
 }`});material.depthTest=false;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);mesh.frustumCulled=false;mesh.renderOrder=-1000;return mesh;
}
