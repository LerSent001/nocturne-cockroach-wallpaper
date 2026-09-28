import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {modelData} from 'embedded-cockroach';

// Cockroach mesh, textures and walk cycle: Andres Bonomi / Sketchfab. See THIRD_PARTY_NOTICES.md.
const canvas=document.querySelector('#scene');
const params=new URLSearchParams(location.search), capture=params.has('capture');
let seed=7319; const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const clamp=T.MathUtils.clamp, lerp=T.MathUtils.lerp;
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const scene=new T.Scene();scene.background=new T.Color(0);
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power',preserveDrawingBuffer:capture});
renderer.setClearColor(0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.91;
renderer.outputColorSpace=T.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const camera=new T.PerspectiveCamera(34,1,.1,100);
let orbit=.0,elevation=1.08,distance=10;
function cameraUpdate(){const d=distance/Math.min(1,Math.max(.43,camera.aspect));camera.position.set(Math.sin(orbit)*Math.cos(elevation)*d,Math.sin(elevation)*d,Math.cos(orbit)*Math.cos(elevation)*d);camera.lookAt(0,.35,0);camera.updateMatrixWorld();}
cameraUpdate();
scene.add(new T.HemisphereLight(0xd6e1ea,0x362013,1.1));
function light(color,intensity,x,y,z){const l=new T.DirectionalLight(color,intensity);l.position.set(x,y,z);if(x===-3){l.castShadow=true;l.shadow.mapSize.set(2048,2048);l.shadow.camera.left=-8;l.shadow.camera.right=8;l.shadow.camera.top=8;l.shadow.camera.bottom=-8;l.shadow.bias=-.0002;l.shadow.normalBias=.018;}scene.add(l);}
light(0xffecd6,2.8,-3,6,-4);light(0xcbddeb,1.45,4,3,2);light(0xe6bc94,.6,-2,1,5);
const env=new T.Scene();env.background=new T.Color(.055,.048,.04);
function softbox(x,y,z,sx,sy,color){const m=new T.Mesh(new T.PlaneGeometry(sx,sy),new T.MeshBasicMaterial({color,side:T.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);env.add(m);}
softbox(-4,5,-2,3,6,0xffffff);softbox(4,3,3,2,5,0xabbacf);softbox(0,6,1,4,2,0xd6b99c);
const pmrem=new T.PMREMGenerator(renderer),envMap=pmrem.fromScene(env,.10);scene.environment=envMap.texture;pmrem.dispose();
env.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});


async function init(){
const gltf=await new GLTFLoader().parseAsync(Uint8Array.from(atob(modelData),c=>c.charCodeAt(0)).buffer,'');
const insect=new T.Group(),body=new T.Group();scene.add(insect);insect.add(body);
const model=gltf.scene;model.scale.setScalar(13);model.rotation.y=Math.PI;model.position.z=-.24;body.add(model);
const mixer=new T.AnimationMixer(model),walk=mixer.clipAction(gltf.animations[0]);walk.play();mixer.update(0);
const antennae=[],antennaJoints=[],torsoJoints=[],covers=[],legRoots=[],legJoints=[];
model.traverse(o=>{
 if(o.isMesh){if(o.name==='SupplementalDorsalClosure'){o.material=o.material.clone();o.material.color.setRGB(.19,.16,.12);o.material.roughness=.8;o.material.metalness=0;}o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;const m=o.material;m.envMapIntensity=.3;if(m.map)m.map.anisotropy=renderer.capabilities.getMaxAnisotropy();}
 if(o.isBone&&/^Bone02[34]$/.test(o.name))torsoJoints.push({bone:o,position:o.position.clone(),rotation:o.quaternion.clone(),scale:o.scale.clone(),settledPosition:o.position.clone(),settledRotation:o.quaternion.clone(),targetRotation:new T.Quaternion(),targetPosition:new T.Vector3()});
 if(o.isBone&&o.name.startsWith('Forewing'))covers.push({bone:o,base:o.quaternion.clone(),s:o.name.includes('L')?-1:1});
 if(o.isBone&&o.name.startsWith('Bone017'))antennae.push(o);
 if(o.isBone&&/^Bone0(17|18|19|20|21|22)/.test(o.name))antennaJoints.push({bone:o,position:o.position.clone(),rotation:o.quaternion.clone(),scale:o.scale.clone(),root:o.name.startsWith('Bone017'),side:o.name.includes('mirrored')?-1:1,angle:0});
 if(o.isBone&&/^Bone(001|007|012)(\(mirrored\))?$/.test(o.name))legRoots.push(o);
});
// Supplemental membrane wings. The free source supplies the shell and gait, but no hindwings.
function membrane(s){
 const g=new T.BufferGeometry(),pos=[],uv=[],ind=[],nu=24,nv=40;
 for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){
  const t=j/nv,w=(i/nu*2-1)*Math.pow(Math.sin(Math.PI*t),.8);
  pos.push(s*(.085*t+.020*w),.0018*Math.sin(i/nu*Math.PI*18)*Math.sin(Math.PI*t),-.080*t+.024*w);uv.push(i/nu,t);
 }
 for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+nu+1;ind.push(a,b,a+1,b,b+1,a+1);}
 g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ind);g.computeVertexNormals();
 const tex=document.createElement('canvas');tex.width=512;tex.height=768;const c=tex.getContext('2d');
 c.fillStyle='rgba(166,121,69,.40)';c.fillRect(0,0,512,768);
 for(let k=0;k<18;k++){c.beginPath();c.moveTo(256,0);c.bezierCurveTo(256+(k-9)*14,210,k*30,520,k*30,768);c.strokeStyle='rgba(76,43,17,.72)';c.lineWidth=k%3?1.1:2.2;c.stroke();}
 for(let y=120;y<750;y+=54){c.beginPath();c.moveTo(0,y);c.quadraticCurveTo(256,y+25,512,y-14);c.strokeStyle='rgba(100,61,24,.35)';c.lineWidth=.9;c.stroke();}
 const map=new T.CanvasTexture(tex);map.colorSpace=T.SRGBColorSpace;
 const m=new T.MeshPhysicalMaterial({map,color:0xb89966,transparent:true,opacity:.78,roughness:.48,metalness:0,side:T.DoubleSide,depthWrite:false,clearcoat:.12});
 const pivot=new T.Group();pivot.position.set(s*.016,.045,.012);model.add(pivot);const mesh=new T.Mesh(g,m);pivot.add(mesh);pivot.visible=false;return {pivot,mesh,s};
}
const membranes=[membrane(-1),membrane(1)];
// Keep the visual origin on the feet; skin bounds must be evaluated after the first pose.
model.updateMatrixWorld(true);let foot=Infinity;model.traverse(o=>{if(o.isSkinnedMesh){o.computeBoundingBox();const b=o.boundingBox.clone().applyMatrix4(o.matrixWorld);foot=Math.min(foot,b.min.y);}});if(Number.isFinite(foot))model.position.y-=foot;
let simTime=0,paused=capture,contextLost=false,battery=false,hostRate=60,frames=0,raf=0,lastFrame=0;
let heading=-.35,speed=0,mode='pause',modeUntil=.55,escapeUntil=0,flight=null;
const target=V(),bounds={x:2.6,z:1.9};const pointer={inside:false,last:-100,x:-1000,y:-1000,at:0,point:V()};
const ray=new T.Raycaster(),ground=new T.Plane(V(0,1,0),0);
const smooth=(a,b,t)=>{t=clamp((t-a)/(b-a),0,1);return t*t*(3-2*t)};
function angle(a){return Math.atan2(Math.sin(a),Math.cos(a))}
function choose(){mode=rnd()<.32?'pause':'wander';modeUntil=simTime+(mode==='pause'?.22+rnd()*.48:.5+rnd()*.9);target.set((rnd()-.5)*bounds.x*2,0,(rnd()-.5)*bounds.z*2);}
function fly(){if(flight)return false;flight={start:simTime,origin:insect.position.clone(),heading,distance:.95,legs:legJoints.map(b=>({bone:b,q:b.quaternion.clone()}))};mode='opening';speed=0;pointer.inside=false;return true;}
function pose(dt,opening=0,flapping=0){
 const gaitRate=flight?0:speed/.90*gltf.animations[0].duration/.5;mixer.update(dt*gaitRate);
 // Keep the authored gait in the legs without amplifying the body's roll and flex.
 for(const j of torsoJoints){
  const angle=j.rotation.angleTo(j.bone.quaternion);
  const weight=angle>1e-7?Math.min(.08,(.8*Math.PI/180)/angle):.08;
  j.targetRotation.copy(j.rotation).slerp(j.bone.quaternion,weight);
  j.targetPosition.copy(j.position).lerp(j.bone.position,.08);
  const settle=1-Math.exp(-dt*8);
  j.settledRotation.slerp(j.targetRotation,settle);j.settledPosition.lerp(j.targetPosition,settle);
  j.bone.quaternion.copy(j.settledRotation);j.bone.position.copy(j.settledPosition);j.bone.scale.copy(j.scale);
 }

 // The fast gait includes antenna keys: restore their calm pose after the mixer.
 // Only paused exploration allows an occasional small sweep on a separate clock.
 for(const j of antennaJoints){
  j.bone.position.copy(j.position);j.bone.quaternion.copy(j.rotation);j.bone.scale.copy(j.scale);
  if(j.root){
   const phase=(simTime+(j.side<0?2.7:0))%7;
   const targetAngle=!flight&&speed<.1&&mode==='pause'&&phase<1.4?j.side*.025*Math.sin(Math.PI*phase/1.4)**2:0;
   j.angle=lerp(j.angle,targetAngle,1-Math.exp(-dt*4));
   j.bone.rotateZ(j.angle);
  }
 }

 for(const c of covers){c.bone.quaternion.copy(c.base).multiply(new T.Quaternion().setFromEuler(new T.Euler(opening*.56,0,-c.s*opening*.83)));}
 for(const w of membranes){w.pivot.visible=opening>.24;const spread=smooth(.24,.86,opening);w.pivot.scale.set(.04+.96*spread,1,.28+.72*spread);w.pivot.rotation.z=w.s*(.10+flapping*.62);w.pivot.rotation.y=w.s*.23*spread;}
}
function update(dt){
 simTime+=dt;
 if(flight){
  const t=simTime-flight.start;let opening;
  if(t<.55){mode='opening';opening=smooth(0,.55,t);}
  else if(t<1.05){mode='takeoff';opening=1;}
  else if(t<2.65){mode='flying';opening=1;}
  else if(t<3.3){mode='landing';opening=1;}
  else{mode='folding';opening=1-smooth(3.3,3.92,t);}
  const air=smooth(.65,1.35,t)*(1-smooth(2.55,3.25,t));
  const travel=smooth(.78,3.18,t)*flight.distance;
  const dx=-Math.sin(flight.heading),dz=-Math.cos(flight.heading);
  insect.position.copy(flight.origin).add(V(dx*travel,0.62*air,dz*travel));
  insect.position.x=clamp(insect.position.x,-bounds.x,bounds.x);insect.position.z=clamp(insect.position.z,-bounds.z,bounds.z);
  body.rotation.x=-.19*air;body.rotation.z=.10*Math.sin(t*3.0)*air;
  const beat=smooth(.4,.78,t)*(1-smooth(3.05,3.4,t))*Math.sin(t*2*Math.PI*24);
  pose(dt,opening,beat);
  const tuck=smooth(.65,1.05,t)*(1-smooth(2.75,3.23,t));
  for(const l of flight.legs){const side=l.bone.name.includes('L')?-1:1;const knee=l.bone.name.endsWith('_B')||l.bone.name.endsWith('001');l.bone.quaternion.copy(l.q).multiply(new T.Quaternion().setFromEuler(new T.Euler(tuck*(knee?.5:.12),0,side*tuck*(knee?.30:.14))));}
  if(t>=3.95){flight=null;body.rotation.set(0,0,0);insect.position.y=0;mode='pause';modeUntil=simTime+.5;}
  return;
 }
 if(simTime<escapeUntil)mode='escape';
 else if(pointer.inside&&simTime-pointer.last<4.5){mode='investigate';target.copy(pointer.point);target.x=clamp(target.x,-bounds.x,bounds.x);target.z=clamp(target.z,-bounds.z,bounds.z);}
 else if(mode==='investigate'||mode==='escape'||simTime>modeUntil)choose();
 const delta=target.clone().sub(insect.position);delta.y=0;const dist=delta.length();
 let desired=mode==='pause'?0:mode==='escape'?6.5:mode==='investigate'?1.8:2.7;
 if(dist<(mode==='investigate'?1.35:.24)){desired=0;if(mode==='wander'){mode='pause';modeUntil=simTime+.15+rnd()*.35;}}
 if(desired>0){const wanted=Math.atan2(-delta.x,-delta.z),turn=angle(wanted-heading);heading+=clamp(turn,-dt*7.5,dt*7.5);desired*=.25+.75*Math.max(0,Math.cos(turn));}
 speed=lerp(speed,desired,1-Math.exp(-dt*16));
 insect.position.x-=Math.sin(heading)*speed*dt;insect.position.z-=Math.cos(heading)*speed*dt;
 insect.position.x=clamp(insect.position.x,-bounds.x,bounds.x);insect.position.z=clamp(insect.position.z,-bounds.z,bounds.z);insect.rotation.y=heading;
 body.rotation.x=0;body.rotation.z=0;pose(dt);
}
function point(x,y){ray.setFromCamera(new T.Vector2(x/innerWidth*2-1,1-y/innerHeight*2),camera);return ray.ray.intersectPlane(ground,V());}
function pointerMove(x,y){if(flight)return;const now=performance.now()/1000,world=point(x,y);if(!world)return;const pixels=Math.hypot(x-pointer.x,y-pointer.y),elapsed=now-pointer.at;
 if(pixels>.6)pointer.last=simTime;
 if(pixels>2&&elapsed>0&&elapsed<.25&&pixels/elapsed>600&&world.distanceTo(insect.position)<1.7){const away=insect.position.clone().sub(world).setY(0).normalize();target.copy(insect.position).addScaledVector(away,2.5);escapeUntil=simTime+.45;modeUntil=escapeUntil+.2;}
 pointer.x=x;pointer.y=y;pointer.at=now;pointer.point.copy(world);pointer.inside=true;
}
let drag=null;
canvas.addEventListener('pointermove',e=>{if(drag){orbit-=(e.clientX-drag.x)*.006;elevation=clamp(elevation+(e.clientY-drag.y)*.004,.15,1.56);drag={x:e.clientX,y:e.clientY};cameraUpdate();draw();}else pointerMove(e.clientX,e.clientY);});
canvas.addEventListener('pointerleave',()=>pointer.inside=false);
canvas.addEventListener('pointerdown',e=>{if(e.button===2||e.altKey){drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}else if(e.button===0)fly();});
canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=clamp(distance+e.deltaY*.008,6.5,20);cameraUpdate();draw();},{passive:false});
function draw(){if(!contextLost){renderer.render(scene,camera);frames++;}}
function resize(){renderer.setPixelRatio(Math.min(devicePixelRatio,battery?1:1.7));renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();cameraUpdate();bounds.x=Math.max(.6,Math.min(3.1,camera.aspect*2.2-1.3));draw();}
function running(){return !paused&&!document.hidden&&!contextLost&&hostRate>0;}
function tick(now){raf=0;if(!running())return;const step=1000/Math.min(hostRate,battery?30:60);if(now-lastFrame>=step-.5){update(Math.min(.06,(now-lastFrame)/1000));lastFrame=now;draw();}raf=requestAnimationFrame(tick);}
function restart(){if(raf)cancelAnimationFrame(raf);raf=0;lastFrame=performance.now();if(running())raf=requestAnimationFrame(tick);}
window.scenePause=v=>{paused=!!v;restart()};window.sceneRate=v=>{if(Number.isFinite(v))hostRate=clamp(v,0,60);restart()};window.scenePower=v=>{battery=!!v;resize();restart()};
window.scenePointer=pointerMove;window.scenePointerOut=()=>pointer.inside=false;window.sceneClick=fly;window.sceneFeed=fly;
window.sceneStats=()=>({ready:true,mode,speed,time:simTime,position:insect.position.toArray(),heading,frames,paused,scheduled:!!raf,hostRate,battery,flight:!!flight,source:'Andres Bonomi / Sketchfab',sourceBones:46,originalLegProportions:true,gaitCyclesPerSecond:speed/.90/.5,coverBones:covers.length,antennae:antennae.length,animationDuration:gltf.animations[0].duration,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries});
window.roach={stats:window.sceneStats,pause:window.scenePause,fly,advance(seconds){if(!paused)throw Error('Pause before advancing');for(let t=0;t<seconds;t+=1/120)update(Math.min(1/120,seconds-t));draw();},view(y,p,d){orbit=y;elevation=clamp(p,.1,1.56);distance=d;cameraUpdate();draw();},reset(){flight=null;simTime=0;speed=0;mode='pause';modeUntil=.55;escapeUntil=0;pointer.inside=false;heading=-.35;insect.position.set(0,0,0);insect.rotation.y=heading;body.rotation.set(0,0,0);mixer.setTime(0);torsoJoints.forEach(j=>{j.settledRotation.copy(j.rotation);j.settledPosition.copy(j.position);});antennaJoints.forEach(j=>j.angle=0);pose(0);draw();},project(){const p=insect.position.clone().add(V(0,.5,0)).project(camera);return {x:(p.x*.5+.5)*innerWidth,y:(-.5*p.y+.5)*innerHeight};},inspect(){return {covers:covers.map(c=>({name:c.bone.name,position:c.bone.getWorldPosition(V()).toArray()})),legRoots:legRoots.map(b=>b.name),antennaPose:antennaJoints.map(j=>({name:j.bone.name,rotation:j.bone.quaternion.toArray()})),gaitTime:walk.time,torsoMotion:torsoJoints.map(j=>({name:j.bone.name,degrees:j.rotation.angleTo(j.bone.quaternion)*180/Math.PI}))};}};
addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{pointer.inside=false;restart()});
addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();scenePause(!paused)}if(e.code==='KeyF'){if(document.fullscreenElement)document.exitFullscreen();else canvas.requestFullscreen?.()}if(e.code==='Escape'){orbit=0;elevation=1.08;distance=10;cameraUpdate();draw()}});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;restart()});canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;resize();restart()});
addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);raf=0});addEventListener('pageshow',restart);
update(0);resize();restart();window.webkit?.messageHandlers?.ready?.postMessage('ready');
}
init().catch(e=>{console.error(e);window.roachError=e.message});
