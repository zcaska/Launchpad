import { BLUEPRINT_PARTS } from '../../utils/castleBlueprint';
export type ModelPrimitive = { shape: 'box' | 'cylinder' | 'cone'; position: [number, number, number]; size: [number, number, number]; material: 'stone' | 'gold' | 'roof' | 'flag' | 'dark' | 'wood'; rotation?: number };
export interface ModelElement { id: string; primitives: ModelPrimitive[] }
/** A deterministic geometric plan: ownership adds physical masonry, never a texture reveal. */
export function castleElements(ownedIds: readonly string[]): ModelElement[] {
  const owned = new Set(ownedIds);
  return BLUEPRINT_PARTS.filter(p => owned.has(p.id)).map(p => {
    const s = p.slot, primitives: ModelPrimitive[] = [];
    const add = (shape: ModelPrimitive['shape'], position: ModelPrimitive['position'], size: ModelPrimitive['size'], material: ModelPrimitive['material'] = 'stone', rotation?: number) => primitives.push({ shape, position, size, material, rotation });
    const block = (x: number, y: number, z: number, w: number, h: number, d: number) => add('box', [x,y,z], [w,h,d]);
    if (p.kind === 'foundation') {
      block((s%5-2)*2.8,.2,Math.floor(s/5)*5-2.5,2.72,.4,4.9);
    } else if (['west-wall','east-wall','north-wall','south-wall'].includes(p.kind)) {
      const vertical = p.kind === 'west-wall' || p.kind === 'east-wall';
      const side = p.kind === 'west-wall' || p.kind === 'north-wall' ? -1 : 1;
      const along = (s%5-2)*2.4, y = .95+Math.floor(s/5)*1.35;
      if(p.kind === 'south-wall' && s%5 === 2) {
        // Purchased jamb courses frame a walk-through entrance instead of sealing it.
        block(-1.42,y,5,.28,1.28,.85);block(1.42,y,5,.28,1.28,.85);
      } else for(let i=0;i<4;i++) block(vertical?side*6:along+(i-1.5)*.59,y,vertical?along+(i-1.5)*.59:side*5,vertical?.8:.56,1.28,vertical?.56:.8);
      if(s>=5 && !(p.kind === 'south-wall' && s%5 === 2)) for(let i=0;i<2;i++) block(vertical?side*6:along+(i-.5)*1.15,2.98,vertical?along+(i-.5)*1.15:side*5,vertical?.85:.55,.65,vertical?.55:.85);
    } else if(p.kind === 'gatehouse') {
      if(s<6) block(s%2===0?-1.65:1.65,.95+Math.floor(s/2)*1.05,5.1,1,1.02,1.7);
      else { for(let k=0;k<2;k++){const a=((s-6)*2+k)/7*Math.PI;add('box',[Math.cos(a)*1.55,3.05+Math.sin(a)*1.45,5.1],[.65,.65,1.7],'stone',a-Math.PI/2);} }
      if(s===9){add('box',[0,1.6,5.25],[2.1,2.5,.18],'wood');for(let k=0;k<5;k++)add('box',[(k-2)*.4,1.6,5.36],[.055,2.4,.06],'gold');for(const y of [.8,2.3])add('box',[0,y,5.39],[2.05,.08,.07],'gold');}
    } else if(p.kind === 'west-tower' || p.kind === 'east-tower') {
      const x=p.kind==='west-tower'?-6:6;
      const z=s<5?5:-5, level=s%5;
      add('cylinder',[x,.95+level*1.05,z],[1.35,1.02,1.35]);
      if(level===4) for(let i=0;i<10;i++){const a=i*Math.PI/5;block(x+Math.cos(a)*1.15,5.6,z+Math.sin(a)*1.15,.42,.65,.42);}
      if(level>0) add('box',[x,1+level*1.05,z+1.36],[.32,.55,.05],'gold');
    } else if(p.kind==='keep') {
      if(s<8) { const level=Math.floor(s/2);block(s%2===0?-1.45:1.45,1.15+level*1.4,-.65,2.85,1.36,4); for(let k=0;k<3;k++) add('box',[(s%2===0?-1.45:1.45)+(k-1)*.75,1.25+level*1.4,1.37],[.27,.65,.04],'gold'); }
      else {add('cylinder',[s===8?-2.8:2.8,4,-2.5],[.85,7.2,.85]);}
    } else if(p.kind==='roofs') {
      const sites=[[-6,5.9,5],[6,5.9,5],[-6,5.9,-5],[6,5.9,-5],[-2.8,8,-2.5],[2.8,8,-2.5],[-1.45,6.4,-.65],[1.45,6.4,-.65],[-1.65,4.1,5.1],[1.65,4.1,5.1]];
      const [x,y,z]=sites[s]; add('cone',[x,y+1,z],[s<4?1.6:1.2,2.6,s<4?1.6:1.2],'roof');add('cylinder',[x,y+2.4,z],[.09,.35,.09],'gold');
    } else if(p.kind==='banners') {
      const x=(s%5-2)*2.4,z=s<5?5.5:-5.5;
      add('cylinder',[x,4,z],[.045,2.2,.045],'gold');add('box',[x+.38,4.55,z],[.75,.65,.045],'flag');
    } else { const a=s*Math.PI/5; add('cylinder',[Math.cos(a)*1.55,8.8,Math.sin(a)*1.55-.65],[.12,1.6,.12],'gold');add('cone',[Math.cos(a)*1.55,9.9,Math.sin(a)*1.55-.65],[.25,.6,.25],'gold'); }
    return {id:p.id,primitives};
  });
}


