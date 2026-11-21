import { useEffect, useId, useRef, useState } from 'react';
import { BLUEPRINT_PARTS } from '../../utils/castleBlueprint';
import { castleElements } from './castleModel';
export interface CastleSceneProps { ownedIds: readonly string[]; compact?: boolean; className?: string; id?: string }
export const CASTLE_PARTS = BLUEPRINT_PARTS;
export type CastlePartId = string;
export function CastleScene({ ownedIds, compact = false, className = '', id }: CastleSceneProps) {
  const titleId = useId(), host = useRef<HTMLDivElement>(null);
  const command = useRef<(action: string) => void>(() => {});
  const [status,setStatus] = useState('Loading interactive 3D construction.');
  const [recovery,setRecovery] = useState(0);
  const ownedKey = [...new Set(ownedIds)].sort().join('|');
  const built = BLUEPRINT_PARTS.filter(p => ownedIds.includes(p.id));
  useEffect(() => {
    let cancelled=false, dispose = () => {};
    setStatus('Loading interactive 3D construction.');
    import('three').then(T => {
      if(cancelled || !host.current) return;
      const container=host.current;
      const renderer=new T.WebGLRenderer({antialias:true,alpha:true});
      const cleanup: (() => void)[] = [()=>renderer.dispose(),()=>renderer.domElement.remove()];
      dispose=()=>{for(const release of cleanup) release();};
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,2));
      renderer.outputColorSpace=T.SRGBColorSpace; renderer.toneMapping=T.ACESFilmicToneMapping;
      container.appendChild(renderer.domElement);
      const scene=new T.Scene(); scene.fog=new T.Fog(0x0b1423,30,65);
      const camera=new T.PerspectiveCamera(40,1,.1,100);
      const materials={stone:new T.MeshStandardMaterial({color:0xc3b8a3,roughness:.9}),gold:new T.MeshStandardMaterial({color:0xeac36c,metalness:.72,roughness:.28}),roof:new T.MeshStandardMaterial({color:0x263e55,metalness:.25,roughness:.6}),flag:new T.MeshStandardMaterial({color:0x813a67,side:T.DoubleSide}),dark:new T.MeshStandardMaterial({color:0x33463c,roughness:1}),wood:new T.MeshStandardMaterial({color:0x382319,roughness:.9})};
      cleanup.push(()=>Object.values(materials).forEach(m=>m.dispose()));
      const geometries={box:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(1,1,1,24),cone:new T.ConeGeometry(1,1,24)};
      cleanup.push(()=>Object.values(geometries).forEach(g=>g.dispose()));
      const place=(shape:keyof typeof geometries,position:number[],size:number[],material:keyof typeof materials,rotation=0) => {const mesh=new T.Mesh(geometries[shape],materials[material]);mesh.position.set(position[0],position[1],position[2]);mesh.scale.set(size[0],size[1],size[2]);mesh.rotation.z=rotation;scene.add(mesh);};
      place('cylinder',[0,-.55,0],[11,.7,9],'dark');
      // All repeated masonry uses a single instanced draw per shape/material.
      const groups=new Map<string,ReturnType<typeof castleElements>[number]['primitives']>();
      for(const element of castleElements(ownedKey.split('|'))) for(const primitive of element.primitives) {const key=primitive.shape+':'+primitive.material;const list=groups.get(key)||[];list.push(primitive);groups.set(key,list);}
      const instances: InstanceType<typeof T.InstancedMesh>[]=[];
      for(const list of groups.values()) { const first=list[0]; const mesh=new T.InstancedMesh(geometries[first.shape],materials[first.material],list.length);const dummy=new T.Object3D();list.forEach((p,i)=>{dummy.position.set(...p.position);dummy.scale.set(...p.size);dummy.rotation.set(0,0,p.rotation||0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();scene.add(mesh);instances.push(mesh);cleanup.push(()=>mesh.dispose()); }
      scene.add(new T.HemisphereLight(0xb6d4ff,0x33271b,2));
      const sun=new T.DirectionalLight(0xffdc9a,4);sun.position.set(-10,18,12);scene.add(sun);
      const moon=new T.DirectionalLight(0x719bff,2);moon.position.set(12,8,-12);scene.add(moon);
      let yaw=.55,pitch=.57,distance=26,lost=false;
      const render=()=>{if(lost)return;camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance,3+Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(0,3,0);renderer.render(scene,camera);};
      const resize=()=>{const w=container.clientWidth,h=container.clientHeight;if(w&&h){renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();render();}};
      const observer=new ResizeObserver(resize);cleanup.push(()=>observer.disconnect());observer.observe(container);
      command.current=(action)=>{if(action==='reset'){yaw=.55;pitch=.57;distance=26;}else if(action==='left')yaw-=.2;else if(action==='right')yaw+=.2;else if(action==='in')distance=Math.max(13,distance-2);else if(action==='out')distance=Math.min(42,distance+2);render();};
      let pointer: {id:number;x:number;y:number}|null=null;
      const down=(e:PointerEvent)=>{pointer={id:e.pointerId,x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);};
      const move=(e:PointerEvent)=>{if(!pointer||pointer.id!==e.pointerId)return;yaw-=(e.clientX-pointer.x)*.008;pitch=Math.max(.15,Math.min(1.2,pitch+(e.clientY-pointer.y)*.006));pointer.x=e.clientX;pointer.y=e.clientY;render();};
      const up=()=>{pointer=null;};
      const wheel=(e:WheelEvent)=>{e.preventDefault();distance=Math.max(13,Math.min(42,distance+e.deltaY*.02));render();};
      const contextLost=(e:Event)=>{e.preventDefault();lost=true;setStatus('3D graphics context was lost. Restore the 3D view to try again.');};
      const restored=()=>{setRecovery(n=>n+1);};
      const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('webglcontextlost',contextLost);canvas.addEventListener('webglcontextrestored',restored);
      dispose=()=>{observer.disconnect();command.current=()=>{};canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('webglcontextlost',contextLost);canvas.removeEventListener('webglcontextrestored',restored);instances.forEach(m=>m.dispose());Object.values(geometries).forEach(g=>g.dispose());Object.values(materials).forEach(m=>m.dispose());renderer.dispose();canvas.remove();};
      resize();setStatus('');
    }).catch((error)=>{console.error('3D castle initialization failed',error);dispose();if(!cancelled)setStatus('Interactive 3D is unavailable on this device. Your purchased construction remains saved.');});
    return()=>{cancelled=true;dispose();};
  },[ownedKey,recovery]);
  return <div id={id} className={`castle-artwork castle-3d ${compact?'castle-artwork--compact':''} ${className}`} data-built-count={built.length} data-complete={built.length===120}>
    <h3 id={titleId} className="castle-artwork__accessible">{built.length===120?'Your completed stronghold':built.length?'Your rising fortress':'Your castle construction site'}</h3>
    <div className="castle-3d__viewport" ref={host} role="img" aria-labelledby={titleId} aria-describedby={`${titleId}-summary`} />
    <p id={`${titleId}-summary`} className="castle-artwork__accessible">{built.length} of 120 physical elements built. {built.length?`Built: ${built.map(p=>p.label).join(', ')}.`:'Earn and purchase your first foundation element to begin.'} Purchased structures remain yours permanently. Drag to orbit; use the buttons to rotate and zoom.</p>
    {status&&<div className="castle-3d__status" role="status">{status}<button type="button" onClick={()=>setRecovery(n=>n+1)}>Restore 3D view</button></div>}
    <div className="castle-3d__controls" role="group" aria-label="3D castle view"><button type="button" aria-label="Rotate castle left" onClick={()=>command.current('left')}>Left</button><button type="button" aria-label="Rotate castle right" onClick={()=>command.current('right')}>Right</button><button type="button" aria-label="Zoom into castle" onClick={()=>command.current('in')}>+</button><button type="button" aria-label="Zoom out of castle" onClick={()=>command.current('out')}>-</button><button type="button" onClick={()=>command.current('reset')}>Reset view</button></div>
  </div>;
}
export default CastleScene;



