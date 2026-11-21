import { castleElements, type ModelPrimitive } from './castleModel';

type Point = [number, number, number];
const colors: Record<ModelPrimitive['material'], [string, string, string]> = {
  stone: ['#ddd3be', '#b3a890', '#807a6e'], gold: ['#ffe5a0', '#ce9d36', '#856724'],
  roof: ['#657b94', '#2c435d', '#182b42'], flag: ['#ca80b5', '#91456e', '#5e304e'],
  dark: ['#657868', '#3c5145', '#263a31'], wood: ['#936b43', '#624229', '#3e2b1d'],
};
const project = ([x, y, z]: Point): [number, number] => [(x - z) * .866, (x + z) * .4 - y];

/** Lightweight thumbnails of the same geometry that gets placed in the WebGL model. */
export function CastlePartPreview({ assetId, label }: { assetId: string; label: string }) {
  const primitives = castleElements([assetId])[0]?.primitives || [];
  const faces: { points: [number, number][]; fill: string; depth: number }[] = [];
  for (const primitive of primitives) {
    const [width, height, depth] = primitive.size;
    const [cx, cy, cz] = primitive.position;
    const a = primitive.rotation || 0;
    const world = (x: number, y: number, z: number): Point => [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a), cz + z];
    const palette = colors[primitive.material];
    const add = (points: Point[], color: number) => faces.push({ points: points.map(project), fill: palette[color], depth: points.reduce((sum, [x, y, z]) => sum + x + z + y * .01, 0) / points.length });
    if (primitive.shape === 'box') {
      const x = width / 2, y = height / 2, z = depth / 2;
      add([world(-x,y,-z),world(x,y,-z),world(x,y,z),world(-x,y,z)],0);
      add([world(-x,-y,z),world(x,-y,z),world(x,y,z),world(-x,y,z)],1);
      add([world(x,-y,-z),world(x,-y,z),world(x,y,z),world(x,y,-z)],2);
    } else {
      const ring = (angle: number, y: number) => world(Math.cos(angle) * width, y, Math.sin(angle) * depth);
      for (let i = 0; i < 12; i++) {
        const angle = i * Math.PI / 6, next = (i + 1) * Math.PI / 6;
        add(primitive.shape === 'cone'
          ? [ring(angle,-height/2),ring(next,-height/2),world(0,height/2,0)]
          : [ring(angle,-height/2),ring(next,-height/2),ring(next,height/2),ring(angle,height/2)],i < 6 ? 1 : 2);
      }
      if (primitive.shape === 'cylinder') add(Array.from({length:12},(_,i)=>ring(i*Math.PI/6,height/2)),0);
    }
  }
  const points = faces.flatMap(face => face.points);
  const left = Math.min(...points.map(([x])=>x)), right = Math.max(...points.map(([x])=>x));
  const top = Math.min(...points.map(([,y])=>y)), bottom = Math.max(...points.map(([,y])=>y));
  const extent = Math.max(right-left,bottom-top,.1), padding = extent * .13;
  return <svg className="cp-thumb cp-geometry-preview" role="img" aria-label={`Construction preview: ${label}`} viewBox={points.length ? `${left-padding} ${top-padding} ${right-left+padding*2} ${bottom-top+padding*2}` : '0 0 1 1'}>
    {faces.sort((a,b)=>a.depth-b.depth).map((face,index)=><polygon key={index} points={face.points.map(p=>p.join(',')).join(' ')} fill={face.fill} stroke="#e9d8b9" strokeOpacity=".16" strokeWidth={extent*.007} strokeLinejoin="round" />)}
  </svg>;
}
