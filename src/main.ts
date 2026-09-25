import * as THREE from 'three';
import type {WebGPURenderer} from 'three/webgpu';
import type {SkyMesh} from 'three/addons/objects/SkyMesh.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {Landscape,Driving,clamp,damp,type Input} from './simulation';
import {WorldView,createSky} from './world';
import {createVehicle} from './vehicle';
import {Traffic} from './traffic';
import {WeatherFX,type WeatherMode} from './weather';
import {DriveAudio} from './audio';
import {SkidMarks,skidAmount} from './skid';
import {graphicsQuality,graphicsStyle,qualityPresets,styledPixelRatio,renderResolution,type RenderResolution} from './quality';
import './style.css';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const touchPointer=matchMedia('(pointer: coarse)');
let observedTouch=false;
function showTouchControls(){
  document.documentElement.classList.toggle('touch-device',observedTouch||touchPointer.matches||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
}
showTouchControls();
touchPointer.addEventListener('change',showTouchControls);
window.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'){observedTouch=true;showTouchControls();}},{passive:true});
const defaults={seed:'OPEN-ROAD',style:'flowing',season:'summer',light:'day',weather:'clear' as WeatherMode,quality:navigator.maxTouchPoints>0?'low':'high',graphicsStyle:'modern',resolution:'auto' as RenderResolution,renderBackend:'webgl',color:'#e5e8e2',volume:.35,muted:false,view:'chase',transmission:'automatic'};
let settings={...defaults};try{settings={...defaults,...JSON.parse(localStorage.getItem('horizon-settings')||'{}')};}catch{}
settings.quality=graphicsQuality(settings.quality);
settings.graphicsStyle=graphicsStyle(settings.graphicsStyle);
settings.resolution=renderResolution(settings.resolution);
const activeQuality=()=>graphicsQuality(settings.quality);
if(settings.renderBackend!=='webgpu'||!('gpu' in navigator))settings.renderBackend='webgl';
if(!['clear','rain','snow'].includes(settings.weather))settings.weather='clear';
if(settings.season!=='winter'&&settings.weather==='snow')settings.weather='clear';
const save=()=>{try{localStorage.setItem('horizon-settings',JSON.stringify(settings));}catch{}};
const useGPURenderer=settings.renderBackend==='webgpu';
let renderer:THREE.WebGLRenderer|WebGPURenderer,activeBackend='WebGL';
const canvas=$<HTMLCanvasElement>('world');
if(useGPURenderer){
 try{const {WebGPURenderer}=await import('three/webgpu');const gpu=new WebGPURenderer({canvas,antialias:true} as ConstructorParameters<typeof WebGPURenderer>[0]);await gpu.init();renderer=gpu;activeBackend=(gpu.backend as {isWebGPUBackend?:boolean}).isWebGPUBackend?'WebGPU':'WebGL2 fallback';}
 catch(error){console.warn('WebGPU initialization failed; using WebGL.',error);settings.renderBackend='webgl';const replacement=canvas.cloneNode(false) as HTMLCanvasElement;canvas.replaceWith(replacement);renderer=new THREE.WebGLRenderer({canvas:replacement,antialias:true,powerPreference:'high-performance'});}
}else renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(styledPixelRatio(innerHeight,devicePixelRatio,activeQuality(),settings.resolution,graphicsStyle(settings.graphicsStyle)));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;if(renderer instanceof THREE.WebGLRenderer)renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();scene.background=new THREE.Color('#bcd7ec');scene.fog=new THREE.Fog('#bcd7ec',450,1500);
const camera=new THREE.PerspectiveCamera(53,innerWidth/innerHeight,.08,2500);
let gpuSky:SkyMesh|undefined;
if(!(renderer instanceof THREE.WebGLRenderer)){const {SkyMesh}=await import('three/addons/objects/SkyMesh.js');gpuSky=new SkyMesh();gpuSky.scale.setScalar(900);gpuSky.renderOrder=-1000;}
const sky=gpuSky??createSky();scene.add(sky);
const hemi=new THREE.HemisphereLight(0xd8eafc,0x787c57,2.3);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff1d5,3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:240});sun.shadow.bias=-.00025;sun.shadow.normalBias=.06;scene.add(sun,sun.target);
if(renderer instanceof THREE.WebGLRenderer){const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromScene(new RoomEnvironment(),.04);scene.environment=env.texture;scene.environmentIntensity=.45;pmrem.dispose();}
else{try{const {PMREMGenerator}=await import('three/webgpu');const pmrem=new PMREMGenerator(renderer);const env=await pmrem.fromSceneAsync(new RoomEnvironment(),.04);scene.environment=env.texture;scene.environmentIntensity=.45;pmrem.dispose();}catch(error){console.warn('WebGPU environment lighting unavailable.',error);}}
let landscape=new Landscape(settings.seed,settings.style);let drive=new Driving(landscape);drive.transmission=settings.transmission;const world=new WorldView(scene,landscape);world.quality=activeQuality();world.season=settings.season;world.update(drive.z,drive.x);
const skidMarks=new SkidMarks(scene,landscape);
const traffic=new Traffic(scene,landscape);
const vehicle=createVehicle();vehicle.setColor(settings.color);scene.add(vehicle.group);
const weatherFX=new WeatherFX(scene);
const audio=new DriveAudio();audio.setVolume(settings.volume);audio.setMuted(settings.muted);
let started=false,paused=false,camReady=false,last=performance.now(),accumulator=0,view=settings.view,frameCount=0,statsStart=performance.now(),fps=0,lastHUD=0,prevYaw=drive.heading;
const keys=new Set<string>();let touchKeys=new Set<string>();let previous={x:drive.x,y:drive.y,z:drive.z,heading:drive.heading};
let panel:string|null=null;const STEP=1/120,camLook=new THREE.Vector3(),desired=new THREE.Vector3(),look=new THREE.Vector3(),euler=new THREE.Euler(0,0,0,'YXZ');const q=new THREE.Quaternion();const followPosition=new THREE.Vector3();let headlights=false;
let mouseDragging=false,mousePointer=-1,mouseX=0,mouseY=0,mouseYaw=0,mousePitch=0,mouseReleaseAt=0;
const telemetry={frames:0,elapsed:0,simulated:0,meanMs:0,p95Ms:0,maxMs:0,triangles:0,drawCalls:0,chunks:0,memoryGeometries:0,errors:0,gamepad:false,maxLateral:0,seed:settings.seed};let samples:number[]=[];let gamepadButtons:boolean[]=[];
window.addEventListener('error',()=>telemetry.errors++);window.addEventListener('unhandledrejection',()=>telemetry.errors++);
function toast(s:string){$('toast').textContent=s;$('toast').style.opacity='1';setTimeout(()=>$('toast').style.opacity='0',2400);}
function begin(){if(!started){started=true;document.body.classList.add('driving');$('intro').hidden=true;$('hint').hidden=false;setTimeout(()=>$('hint').style.opacity='0',11000);}void audio.start();}
function toggleAuto(){begin();drive.auto=!drive.auto;syncAuto();toast(drive.auto?'Autodrive · enjoy the view':'You’re in control');}
function syncAuto(){$('auto').classList.toggle('active',drive.auto);$('autoState').textContent=drive.auto?'ON':'OFF';}
function syncTouchGears(){document.querySelector<HTMLElement>('.touch-gears')?.toggleAttribute('hidden',settings.transmission!=='manual');}
function togglePause(){if(!started)return;paused=!paused;$('pauseLabel').hidden=!paused;$('pause').textContent=paused?'▶':'Ⅱ';keys.clear();}
function setView(v:string){view=v;settings.view=v;vehicle.setInterior(v==='interior');$<HTMLSelectElement>('view').value=v;camReady=false;save();}
function cycleView(){setView(view==='chase'?'interior':view==='interior'?'bonnet':'chase');toast(view==='chase'?'Chase camera':view==='interior'?'Driver’s seat':'Bonnet camera');}
function mute(){settings.muted=!settings.muted;audio.setMuted(settings.muted);$('sound').textContent=settings.muted?'Sound off':'Sound on';save();}
function setPanel(id:string|null){document.querySelectorAll<HTMLElement>('.panel').forEach(p=>p.hidden=p.id!==id);panel=id;document.querySelectorAll<HTMLButtonElement>('[data-panel]').forEach(b=>b.classList.toggle('active',b.dataset.panel===id));}
document.querySelectorAll<HTMLButtonElement>('[data-panel]').forEach(b=>b.onclick=()=>setPanel(panel===b.dataset.panel?null:b.dataset.panel!));document.querySelectorAll<HTMLButtonElement>('.close').forEach(b=>b.onclick=()=>setPanel(null));
$('begin').onclick=begin;$('auto').onclick=toggleAuto;$('pause').onclick=togglePause;$('camera').onclick=cycleView;$('sound').onclick=mute;$('reset').onclick=()=>{drive.reset();camReady=false;toast('Back on the road');};$('helpButton').onclick=()=>setPanel(panel==='helpPanel'?null:'helpPanel');
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(!e.repeat){if(k==='f')toggleAuto();if(k==='c')cycleView();if(k==='m')mute();if(k==='q')shiftGear(-1);if(k==='e')shiftGear(1);if(k==='h'){headlights=!headlights;vehicle.setLights(headlights);toast(headlights?'Headlights on':'Headlights off');}if(k==='r'){drive.reset();camReady=false;toast('Back on the road');}if(k==='escape'){if(panel)setPanel(null);else togglePause();}}if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)){begin();if(drive.auto){drive.auto=false;syncAuto();}keys.add(k);}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
renderer.domElement.addEventListener('pointerdown',e=>{if(e.button!==0||!started||paused||panel||mouseDragging)return;if(e.pointerType==='touch')e.preventDefault();mouseDragging=true;mousePointer=e.pointerId;mouseX=e.clientX;mouseY=e.clientY;mouseReleaseAt=performance.now()+2600;renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!mouseDragging||e.pointerId!==mousePointer)return;if(e.pointerType==='touch')e.preventDefault();const dx=e.clientX-mouseX,dy=e.clientY-mouseY;mouseX=e.clientX;mouseY=e.clientY;const sensitivity=e.pointerType==='touch'?.008:.0052;mouseYaw=THREE.MathUtils.euclideanModulo(mouseYaw+dx*sensitivity+Math.PI,Math.PI*2)-Math.PI;mousePitch=THREE.MathUtils.clamp(mousePitch-dy*(e.pointerType==='touch'?.004:.003),-.42,.46);mouseReleaseAt=performance.now()+2600;});
const endMouseLook=(e:PointerEvent)=>{if(mouseDragging&&e.pointerId===mousePointer){mouseDragging=false;mouseReleaseAt=performance.now()+2600;}};
renderer.domElement.addEventListener('pointerup',endMouseLook);renderer.domElement.addEventListener('pointercancel',endMouseLook);
document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(b=>{b.onpointerdown=e=>{begin();drive.auto=false;syncAuto();touchKeys.add(b.dataset.key!);b.setPointerCapture(e.pointerId);};b.onpointerup=b.onpointercancel=()=>touchKeys.delete(b.dataset.key!);});
document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();begin();shiftGear(b.dataset.action==='gearUp'?1:-1);b.setPointerCapture(e.pointerId);};});
function input():Input{const down=(...ks:string[])=>ks.some(k=>keys.has(k)||touchKeys.has(k));let throttle=down('w','arrowup')?1:0,brake=down('s','arrowdown')?1:0,steer=(down('d','arrowright')?1:0)-(down('a','arrowleft')?1:0);let handbrake=down(' ');const pad=Array.from(navigator.getGamepads?.()||[]).find(Boolean);telemetry.gamepad=!!pad;
 if(pad){const dz=(v:number)=>Math.abs(v)<.12?0:Math.sign(v)*(Math.abs(v)-.12)/.88;const ps=dz(pad.axes[0]||0),pt=pad.buttons[7]?.value||0,pb=pad.buttons[6]?.value||0;if(Math.abs(ps)>.1||pt>.1||pb>.1){begin();drive.auto=false;syncAuto();}steer=steer||ps;throttle=Math.max(throttle,pt);brake=Math.max(brake,pb);handbrake=handbrake||!!pad.buttons[1]?.pressed;if(pad.buttons[4]?.pressed&&!gamepadButtons[4])shiftGear(-1);if(pad.buttons[5]?.pressed&&!gamepadButtons[5])shiftGear(1);if(pad.buttons[0]?.pressed&&!gamepadButtons[0])toggleAuto();if(pad.buttons[3]?.pressed&&!gamepadButtons[3])cycleView();if(pad.buttons[9]?.pressed&&!gamepadButtons[9])togglePause();gamepadButtons=pad.buttons.map(b=>b.pressed);$('gamepad').textContent='Gamepad connected · left stick + triggers';}return{throttle,brake,steer,handbrake};}
function shiftGear(direction:number){if(settings.transmission!=='manual'){toast('Choose Manual in Vehicle settings first');return;}if(drive.auto){toast('Autodrive shifts for you');return;}if(!drive.shift(direction))toast('Stop before selecting reverse or neutral');}
$('gearDown').onclick=()=>shiftGear(-1);$('gearUp').onclick=()=>shiftGear(1);
$<HTMLSelectElement>('transmission').value=settings.transmission;
$('transmission').onchange=()=>{settings.transmission=$<HTMLSelectElement>('transmission').value;drive.transmission=settings.transmission;syncTouchGears();save();toast(settings.transmission==='manual'?'Manual · Q down / E up · automatic clutch':'Automatic transmission');};
function regenerate(){landscape=new Landscape(settings.seed,settings.style);drive=new Driving(landscape);drive.transmission=settings.transmission;world.rebuild(landscape,settings.season);world.update(drive.z,drive.x);skidMarks.clear(landscape);traffic.reset(landscape,drive.z);previous={x:drive.x,y:drive.y,z:drive.z,heading:drive.heading};camReady=false;syncAuto();telemetry.seed=settings.seed;telemetry.maxLateral=0;save();toast('A new road is waiting');}
function atmosphere(){
 const night=settings.light==='night',golden=settings.light==='golden'&&settings.weather==='clear',overcast=settings.light==='overcast'||settings.weather!=='clear';
 const top=night?'#030817':golden?'#7192b0':overcast?'#83949e':'#367dcc',bottom=night?'#15243a':golden?'#e3b184':overcast?'#b7c3c7':'#bbd0dd';
 if(gpuSky){gpuSky.visible=!night;gpuSky.turbidity.value=overcast?7:2;gpuSky.rayleigh.value=overcast?.35:1.4;gpuSky.sunPosition.value.set(-.7,night?-.5:golden?.18:.55,.5).normalize();}
 else{const uniforms=(sky.material as THREE.ShaderMaterial).uniforms;uniforms.top.value.set(top);uniforms.bottom.value.set(bottom);uniforms.night.value=night?1:0;}
 const visibility=qualityPresets[activeQuality()].fogFar*(night?.57:.78)*(settings.weather==='clear'?1:settings.weather==='snow'?.72:.82);
 (scene.fog as THREE.Fog).color.set(bottom);(scene.fog as THREE.Fog).near=visibility*(night?.13:.19);(scene.fog as THREE.Fog).far=visibility;scene.background=new THREE.Color(bottom);
 sun.color.set(night?'#8ca9e1':golden?'#ffbd78':overcast?'#d9e4ed':'#fff1d5');sun.intensity=night?.16:overcast?.8:golden?2.2:2.4;hemi.intensity=night?.16:overcast?1.7:golden?1.25:1.5;
 scene.environmentIntensity=night?.035:.45;renderer.toneMappingExposure=night?1.2:1.05;headlights=night;vehicle.setLights(headlights);vehicle.setWipers(settings.weather==='rain');
 $('place').textContent=`THE HIGHLANDS · ${night?'NIGHT':settings.season.toUpperCase()}${settings.weather==='clear'?'':` · ${settings.weather.toUpperCase()}`}`;save();
}
function updateRenderResolution(){renderer.setPixelRatio(styledPixelRatio(innerHeight,devicePixelRatio,activeQuality(),settings.resolution,graphicsStyle(settings.graphicsStyle)));renderer.setSize(innerWidth,innerHeight);renderer.domElement.style.imageRendering=settings.graphicsStyle==='retro'?'pixelated':'';renderer.domElement.style.filter=settings.graphicsStyle==='retro'?'saturate(.82) contrast(1.08)':'';}
function quality(){const selected=activeQuality(),preset=qualityPresets[selected];settings.quality=graphicsQuality(settings.quality);updateRenderResolution();renderer.shadowMap.enabled=preset.shadowSize>0;sun.castShadow=preset.shadowSize>0;if(preset.shadowSize){sun.shadow.mapSize.set(preset.shadowSize,preset.shadowSize);}sun.shadow.map?.dispose();sun.shadow.map=null;if(!gpuSky)(sky.material as THREE.ShaderMaterial).uniforms.cloudDetail.value=selected==='low'?0:1;world.setQuality(selected);world.update(drive.z,drive.x);atmosphere();save();}
function syncWeatherOptions(){const snow=$<HTMLSelectElement>('weather').querySelector<HTMLOptionElement>('option[value="snow"]')!;snow.disabled=settings.season!=='winter';if(snow.disabled&&settings.weather==='snow'){settings.weather='clear';$<HTMLSelectElement>('weather').value='clear';}}
for(const [id,key] of [['seed','seed'],['roadStyle','style'],['season','season'],['light','light'],['weather','weather'],['quality','quality'],['graphicsStyle','graphicsStyle'],['resolution','resolution'],['carColor','color'],['volume','volume'],['view','view']] as const){const el=$<HTMLInputElement|HTMLSelectElement>(id);el.value=String(settings[key]);el.addEventListener('change',()=>{if(key==='volume'){settings.volume=Number(el.value);audio.setVolume(settings.volume);}else{(settings as Record<string,unknown>)[key]=el.value;}if(key==='season'){syncWeatherOptions();world.rebuild(landscape,settings.season);world.update(drive.z,drive.x);atmosphere();}if(key==='light'||key==='weather')atmosphere();if(key==='quality')quality();if(key==='graphicsStyle')updateRenderResolution();if(key==='resolution'){settings.resolution=renderResolution(settings.resolution);settings.graphicsStyle='modern';$<HTMLSelectElement>('graphicsStyle').value='modern';updateRenderResolution();}if(key==='color')vehicle.setColor(settings.color);if(key==='view')setView(el.value);save();});}
const backendSelect=$<HTMLSelectElement>('renderBackend');backendSelect.value=settings.renderBackend;
backendSelect.querySelector<HTMLOptionElement>('option[value="webgpu"]')!.disabled=!('gpu' in navigator);
$('renderBackendInfo').textContent=`Running ${activeBackend} · changing renderer restarts the drive.`;
backendSelect.addEventListener('change',()=>{settings.renderBackend=backendSelect.value;save();location.reload();});
syncWeatherOptions();
$('random').onclick=()=>{$<HTMLInputElement>('seed').value=Math.random().toString(36).slice(2,10).toUpperCase();settings.seed=$<HTMLInputElement>('seed').value;};$('generate').onclick=()=>{settings.seed=$<HTMLInputElement>('seed').value||'OPEN-ROAD';settings.style=$<HTMLSelectElement>('roadStyle').value;regenerate();setPanel(null);};$<HTMLInputElement>('showStats').onchange=()=>$('stats').hidden=!$<HTMLInputElement>('showStats').checked;
const fullscreenButton=$<HTMLButtonElement>('fullscreen');
const installedFullscreen=window.matchMedia('(display-mode: fullscreen)');
function syncFullscreenButton(){
 const active=!!document.fullscreenElement||installedFullscreen.matches;
 fullscreenButton.textContent=installedFullscreen.matches?'Fullscreen active':active?'Exit fullscreen':'Enter fullscreen';
 fullscreenButton.disabled=installedFullscreen.matches;
 fullscreenButton.setAttribute('aria-pressed',String(active));
}
fullscreenButton.onclick=async()=>{
 try{
  if(document.fullscreenElement)await document.exitFullscreen();
  else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();
  else toast('Fullscreen is unavailable in this browser');
 }catch{toast('Fullscreen is unavailable in this browser');}
 syncFullscreenButton();
};
document.addEventListener('fullscreenchange',syncFullscreenButton);
installedFullscreen.addEventListener('change',syncFullscreenButton);
syncFullscreenButton();
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();updateRenderResolution();});
atmosphere();quality();setView(view);syncTouchGears();$('sound').textContent=settings.muted?'Sound off':'Sound on';
// Explicit, visible test controls are available only in the local QA URL.
let qaThrottle=false,qaBrake=false,qaSlide=false,hardBrakeSeconds=0;
if(new URLSearchParams(location.search).has('qa')){
 const bar=document.createElement('div');bar.style.cssText='position:fixed;top:115px;left:24px;background:#142423ee;padding:12px;z-index:20';bar.textContent='Playtest: ';
 for(const label of ['Off-road drive','Dirt road','Pond visit','Road speed','Hard brake','Handbrake slide','Stop test']){const b=document.createElement('button');b.textContent=label;b.style.padding='8px';bar.append(b);b.onclick=()=>{
 begin();drive.auto=false;syncAuto();qaBrake=label==='Hard brake';qaSlide=label==='Handbrake slide';qaThrottle=label!=='Stop test'&&!qaBrake&&!qaSlide;if(!qaThrottle&&!qaBrake&&!qaSlide)return;
 drive.reset();drive.heading=drive.travelHeading=label==='Off-road drive'?-Math.PI/2:0;
 if(qaBrake||qaSlide){drive.heading=drive.travelHeading=Math.atan(landscape.slope(drive.z));drive.speed=28;}
 if(label==='Off-road drive'){drive.x=landscape.roadX(30)-65;drive.z=30;drive.speed=28;}
 if(label==='Dirt road'){drive.z=460;drive.x=landscape.trailX(drive.z);drive.heading=drive.travelHeading=Math.atan((landscape.trailX(drive.z+1)-landscape.trailX(drive.z-1))/2);drive.speed=14;qaThrottle=false;}
 if(label==='Road speed'){drive.heading=drive.travelHeading=Math.atan(landscape.slope(drive.z));drive.speed=28;drive.auto=true;qaThrottle=false;syncAuto();}
 if(label==='Hard brake')drive.speed=44;
 if(label==='Pond visit'){outer:for(let tx=-2;tx<=2;tx++)for(let tz=0;tz<=3;tz++){const p=landscape.pond(tx,tz);if(p){drive.x=p.x;drive.z=p.z-p.rz*1.7;drive.speed=0;qaThrottle=false;break outer;}}}
 drive.y=landscape.surface(drive.x,drive.z)+.035;previous={x:drive.x,y:drive.y,z:drive.z,heading:drive.heading};camReady=false;
 };}document.body.append(bar);
}
function frame(now:number){requestAnimationFrame(frame);const raw=(now-last)/1000,dt=Math.min(raw,.1);last=now;const controls=input();if(qaThrottle){controls.throttle=1;controls.brake=0;controls.steer=0;}if(qaBrake){controls.throttle=0;controls.brake=1;controls.steer=0;}if(qaSlide){controls.throttle=0;controls.brake=0;controls.steer=1;controls.handbrake=true;}
 if(!mouseDragging&&now>mouseReleaseAt){mouseYaw=damp(mouseYaw,0,1.7,dt);mousePitch=damp(mousePitch,0,1.7,dt);if(Math.abs(mouseYaw)<.001)mouseYaw=0;if(Math.abs(mousePitch)<.001)mousePitch=0;}
 if(started&&!paused){accumulator+=dt;while(accumulator>=STEP){previous={x:drive.x,y:drive.y,z:drive.z,heading:drive.heading};drive.step(STEP,controls);telemetry.simulated+=STEP;accumulator-=STEP;}telemetry.elapsed+=raw;telemetry.frames++;samples.push(raw*1000);if(samples.length>3600)samples.shift();telemetry.maxMs=Math.max(telemetry.maxMs,raw*1000);telemetry.maxLateral=Math.max(telemetry.maxLateral,Math.abs(landscape.lateral(drive.x,drive.z)));}else{accumulator=0;previous={x:drive.x,y:drive.y,z:drive.z,heading:drive.heading};}
 if(qaBrake&&drive.speed<1)qaBrake=false;
 if(qaSlide&&(drive.offroad||Math.abs(drive.speed)<4))qaSlide=false;
 const a=started&&!paused?accumulator/STEP:1;const x=THREE.MathUtils.lerp(previous.x,drive.x,a),z=THREE.MathUtils.lerp(previous.z,drive.z,a),y=THREE.MathUtils.lerp(previous.y,drive.y,a),yaw=THREE.MathUtils.lerp(previous.heading,drive.heading,a);world.update(z,x);
 const forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));const front=landscape.surface(x+forward.x*1.35,z+forward.z*1.35),back=landscape.surface(x-forward.x*1.35,z-forward.z*1.35);const groundPitch=-Math.atan2(front-back,2.7);const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),ry=landscape.surface(x+right.x*.9,z+right.z*.9),ly=landscape.surface(x-right.x*.9,z-right.z*.9);const groundRoll=Math.atan2(ry-ly,1.8);
  vehicle.group.position.set(x,y,z);vehicle.group.rotation.set(groundPitch,yaw,groundRoll,'YXZ');vehicle.animate(paused?0:drive.speed,drive.steer,drive.roll,drive.pitch,paused?0:dt,(controls.brake||controls.handbrake)?1:0);
 hardBrakeSeconds=started&&!paused&&controls.brake>.68?hardBrakeSeconds+dt:0;
 const skid=started&&!paused?skidAmount(drive.speed,controls.brake,controls.handbrake,drive.slip,drive.offroad,hardBrakeSeconds):0;
 skidMarks.update(x,z,yaw,skid);
 if(view==='chase'){const dist=6.7;/* Screen-right drag should move the chase camera to screen-right, GTA-style. */const orbitYaw=yaw-mouseYaw;const orbitForward=new THREE.Vector3(Math.sin(orbitYaw),0,Math.cos(orbitYaw));desired.set(x-orbitForward.x*dist,y+2.8+mousePitch*dist,z-orbitForward.z*dist);desired.y=Math.max(desired.y,landscape.height(desired.x,desired.z)+1.3);look.set(x+orbitForward.x*8,y+1.05+mousePitch*3,z+orbitForward.z*8);}else{
  const interior=view==='interior';
  if(interior){
    vehicle.group.updateMatrixWorld(true);
    vehicle.eye.getWorldPosition(desired);
    vehicle.eye.getWorldQuaternion(q);
    const orbit=new THREE.Quaternion().setFromEuler(new THREE.Euler(mousePitch,mouseYaw,0,'YXZ'));
    q.multiply(orbit);
    look.copy(desired).add(new THREE.Vector3(0,-.10,1).applyQuaternion(q).multiplyScalar(50));
    camera.up.set(0,1,0).applyQuaternion(q);
  }else{
    euler.set(groundPitch+mousePitch,yaw+mouseYaw,groundRoll,'YXZ');q.setFromEuler(euler);
    desired.set(0,1.62,2.1).applyQuaternion(q).add(vehicle.group.position);
    look.copy(desired).add(new THREE.Vector3(0,-.04,1).applyQuaternion(q).multiplyScalar(50));
  }
 }
 if(view==='chase'&&camReady){const delta=vehicle.group.position.clone().sub(followPosition);camera.position.add(delta);camLook.add(delta);}followPosition.copy(vehicle.group.position);
 if(view!=='interior')camera.up.set(0,1,0);
 if(!camReady||view!=='chase'){camera.position.copy(desired);camLook.copy(look);camReady=true;}else{camera.position.lerp(desired,1-Math.exp(-(view==='chase'?5:18)*dt));camLook.lerp(look,1-Math.exp(-(view==='chase'?7:20)*dt));}camera.lookAt(camLook);camera.fov=damp(camera.fov,view==='chase'?53:65,3,dt);camera.updateProjectionMatrix();sky.position.copy(camera.position);camera.updateMatrixWorld();if(!gpuSky){const uniforms=(sky.material as THREE.ShaderMaterial).uniforms;uniforms.cameraWorld.value.copy(camera.matrixWorld);uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);}
 sun.position.set(x-70,y+90,z+50);sun.target.position.set(x,y,z);audio.update(paused?0:drive.speed,paused?0:drive.throttle,drive.offroad,paused?0:drive.slip,dt,drive.rpm,skid);
 world.animate(now/1000,x,z);traffic.update(started&&!paused?dt:0,z,activeQuality()==='low');weatherFX.update(now/1000,camera,vehicle.group,settings.weather,headlights,activeQuality());renderer.render(scene,camera);frameCount++;if(now-statsStart>1000){fps=frameCount*1000/(now-statsStart);frameCount=0;statsStart=now;const sorted=[...samples].sort((a,b)=>a-b);telemetry.meanMs=samples.reduce((a,b)=>a+b,0)/Math.max(samples.length,1);telemetry.p95Ms=sorted[Math.floor(sorted.length*.95)]||0;telemetry.triangles=renderer.info.render.triangles;telemetry.drawCalls=renderer.info.render.calls;telemetry.chunks=world.chunks.size;telemetry.memoryGeometries=renderer.info.memory.geometries;}
 if(now-lastHUD>120){$('speed').textContent=Math.abs(drive.speed*3.6).toFixed(0);$('gearReadout').textContent=`${settings.transmission==='manual'?'M':'AUTO'} · ${drive.gear<0?'R':drive.gear===0?'N':drive.gear} · ${Math.round(drive.rpm)} RPM`;$('distance').textContent=(drive.distance/1000).toFixed(1);$('stats').textContent=`${fps.toFixed(0)} FPS · ${telemetry.p95Ms.toFixed(1)} ms p95\n${telemetry.drawCalls} draws · ${(telemetry.triangles/1000).toFixed(0)}k triangles\n${telemetry.chunks} chunks · ${telemetry.elapsed.toFixed(0)}s driving`;lastHUD=now;}
 // A read-only DOM status supports reproducible browser verification.
 document.body.dataset.drivingState=JSON.stringify({started,paused,auto:drive.auto,speed:drive.speed,x:drive.x,z:drive.z,y:drive.y,lateral:landscape.lateral(drive.x,drive.z),distance:drive.distance,view,lookYaw:mouseYaw,lookPitch:mousePitch,gear:drive.gear,rpm:drive.rpm,transmission:drive.transmission,renderer:activeBackend,headlights,quality:settings.quality,graphicsStyle:settings.graphicsStyle,effectiveQuality:activeQuality(),resolution:settings.resolution,renderWidth:renderer.domElement.width,renderHeight:renderer.domElement.height,weather:settings.weather,terrainTiles:world.fields.size,cameraDistance:camera.position.distanceTo(vehicle.group.position),cameraSeatError:view==='interior'?camera.position.distanceTo(desired):null,season:settings.season,slip:drive.slip,skid,hardBrakeSeconds,skidMarks:skidMarks.mesh.geometry.drawRange.count/6,roll:drive.roll,pitch:drive.pitch,handbrake:controls.handbrake,...telemetry});prevYaw=yaw;
}
requestAnimationFrame(frame);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(error => console.warn('Offline install unavailable:', error));
  });
}


