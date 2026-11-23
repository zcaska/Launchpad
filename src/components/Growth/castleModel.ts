import {
  Box3, BoxGeometry, ConeGeometry, CylinderGeometry, Euler, ExtrudeGeometry, LatheGeometry,
  Matrix4, Quaternion, Shape, SphereGeometry, TorusGeometry, Vector2, Vector3,
} from 'three';
import { BLUEPRINT_PARTS } from '../../utils/castleBlueprint';
import type { CastleMaterial } from './castleTextures';

export type { CastleMaterial } from './castleTextures';
export type CastleVector = [number, number, number];
export type CastleShape = 'box' | 'cylinder' | 'cone' | 'sphere' | 'wedge' | 'teardrop' | 'torus';
export interface ModelJoint {
  kind: 'head' | 'tail' | 'wing' | 'flame' | 'ember';
  pivot: CastleVector;
  axis: 'x' | 'y' | 'z';
  amplitude: number;
  speed: number;
  phase?: number;
}
export interface ModelPrimitive {
  shape: CastleShape;
  position: CastleVector;
  size: CastleVector;
  material: CastleMaterial;
  rotation?: CastleVector;
  joint?: ModelJoint;
}
export interface ModelElement {
  id: string;
  anchor: CastleVector;
  primitives: ModelPrimitive[];
}

/** Unit meshes scaled by full extents. Cylinders, cones and teardrops point along +Y. */
export function createCastleGeometry(shape: CastleShape) {
  switch (shape) {
    case 'box': return new BoxGeometry(1, 1, 1);
    case 'cylinder': return new CylinderGeometry(.5, .5, 1, 12);
    case 'cone': return new ConeGeometry(.5, 1, 12);
    case 'sphere': return new SphereGeometry(.5, 10, 6);
    case 'torus': return new TorusGeometry(.385, .115, 8, 16);
    case 'teardrop': return new LatheGeometry([
      new Vector2(0, -.5), new Vector2(.38, -.38), new Vector2(.5, -.15),
      new Vector2(.43, .12), new Vector2(.22, .35), new Vector2(0, .5),
    ], 12);
    case 'wedge': {
      const profile = new Shape();
      profile.moveTo(-.5, -.5);
      profile.lineTo(.5, -.5);
      profile.lineTo(0, .5);
      profile.closePath();
      return new ExtrudeGeometry(profile, { depth: 1, bevelEnabled: false }).translate(0, 0, -.5);
    }
  }
}

const primitive = (
  shape: CastleShape, position: CastleVector, size: CastleVector, material: CastleMaterial = 'stone',
  rotation?: CastleVector, joint?: ModelJoint,
): ModelPrimitive => ({ shape, position, size, material, rotation, joint });
const box = (position: CastleVector, size: CastleVector, material?: CastleMaterial, rotation?: CastleVector) =>
  primitive('box', position, size, material, rotation);
const cylinder = (position: CastleVector, size: CastleVector, material?: CastleMaterial, rotation?: CastleVector) =>
  primitive('cylinder', position, size, material, rotation);
const cone = (position: CastleVector, size: CastleVector, material?: CastleMaterial, rotation?: CastleVector) =>
  primitive('cone', position, size, material, rotation);
const sphere = (position: CastleVector, size: CastleVector, material?: CastleMaterial) =>
  primitive('sphere', position, size, material);
const torus = (position: CastleVector, size: CastleVector, material?: CastleMaterial, rotation?: CastleVector) =>
  primitive('torus', position, size, material, rotation);
const wedge = (position: CastleVector, size: CastleVector, material?: CastleMaterial, rotation?: CastleVector) =>
  primitive('wedge', position, size, material, rotation);
const faceUp: CastleVector = [Math.PI / 2, 0, 0];
const faceSide: CastleVector = [0, 0, Math.PI / 2];
const row = (count: number, step: number) => Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * step);
const shift = (pieces: ModelPrimitive[], x: number, y: number, z: number): ModelPrimitive[] => pieces.map(piece => ({
  ...piece,
  position: [piece.position[0] + x, piece.position[1] + y, piece.position[2] + z],
  joint: piece.joint && {
    ...piece.joint,
    pivot: [piece.joint.pivot[0] + x, piece.joint.pivot[1] + y, piece.joint.pivot[2] + z],
  },
}));
const arch = (span: number, jamb: number, depth: number, radiusY = span * .49) => {
  const radius = span / 2;
  return [
    ...[-radius, radius].map(x => box([x, jamb / 2, 0], [.34, jamb, depth])),
    ...Array.from({ length: 9 }, (_, i) => {
      const angle = i * Math.PI / 8;
      return box([Math.cos(angle) * radius, jamb + Math.sin(angle) * radiusY, 0],
        [.38, span * .22, depth], undefined, [0, 0, angle]);
    }),
  ];
};
const buttress = (height: number, depth = 1) => [
  box([0, height / 2, 0], [.64, height, depth]),
  wedge([0, height + .42, 0], [.83, .84, depth]),
];
const wall = (width: number, height: number, depth: number) => [
  box([0, height / 2, 0], [width, height, depth]),
  box([0, height, 0], [width + .12, .19, depth + .16]),
  ...row(Math.max(2, Math.round(width / .9)), .83).map(x => box([x, height + .24, 0], [.49, .48, depth + .12])),
];
const turn = (pieces: ModelPrimitive[]) => {
  const yaw = new Quaternion().setFromEuler(new Euler(0, Math.PI / 2, 0));
  return pieces.map((piece): ModelPrimitive => {
    const orientation = new Quaternion().setFromEuler(new Euler(...(piece.rotation ?? [0, 0, 0])));
    const rotation = new Euler().setFromQuaternion(orientation.premultiply(yaw));
    return {
      ...piece,
      position: [piece.position[2], piece.position[1], -piece.position[0]],
      rotation: [rotation.x, rotation.y, rotation.z],
    };
  });
};
const stair = (count: number, width: number, rise: number, run: number) => Array.from({ length: count }, (_, i) =>
  box([0, (i + 1) * rise / 2, -i * run], [width, (i + 1) * rise, run]));
const window = (x: number, y: number, z: number, size = 1, material: CastleMaterial = 'glass') => [
  box([x, y, z], [.24 * size, .54 * size, .055], material),
  wedge([x, y + .36 * size, z], [.24 * size, .18 * size, .055], material),
  box([x, y - .32 * size, z + .04], [.38 * size, .07, .16], 'gold'),
];
const hall = (w: number, h: number, d: number, roof: number, material: CastleMaterial = 'stone') => [
  box([0, .14, 0], [w + .27, .28, d + .27]),
  box([0, h / 2, 0], [w, h, d], material),
  wedge([0, h + roof / 2, 0], [w + .32, roof, d + .32], 'slate'),
  box([0, h / 3, d / 2 + .025], [.48, h * .65, .065], 'timber'),
  ...row(3, w * .28).flatMap(x => window(x, h * .67, d / 2 + .035, Math.sqrt(h) * .62)),
  ...[-w / 2, w / 2].map(x => box([x, h, 0], [.14, .16, d + .1], 'timber')),
];
const tower = (diameter: number, height: number, roof = 0) => [
  cylinder([0, .25, 0], [diameter * 1.12, .5, diameter * 1.12]),
  cylinder([0, height / 2, 0], [diameter, height, diameter]),
  cylinder([0, height, 0], [diameter * 1.13, .23, diameter * 1.13]),
  ...Array.from({ length: 9 }, (_, i) => {
    const angle = i * Math.PI * 2 / 9;
    return box([Math.cos(angle) * diameter * .49, height + .26, Math.sin(angle) * diameter * .49],
      [.28, .52, .28], undefined, [0, -angle, 0]);
  }),
  ...window(0, height * .66, diameter / 2 + .03, diameter * .78, 'iron'),
  ...(roof ? [
    cone([0, height + roof / 2 + .15, 0], [diameter * 1.12, roof, diameter * 1.12], 'slate'),
    sphere([0, height + roof + .19, 0], [.18, .24, .18], 'gold'),
  ] : []),
];
const support = (height: number, width: number, depth = width) => [
  box([0, -height / 2, 0], [width * .74, height, depth * .74]),
  box([0, -.12, 0], [width, .24, depth]),
];
const pole = (height: number, width = .62, hanging = false) => [
  cylinder([0, .18, 0], [.26, .36, .26]),
  cylinder([0, height / 2, 0], [.065, height, .065], 'timber'),
  sphere([0, height + .03, 0], [.14, .15, .14], 'gold'),
  box([width / 2, height - width * (hanging ? .67 : .32), .02], [width, width * (hanging ? 1.32 : .64), .06], 'banner'),
  cylinder([width / 2, height - .035, .035], [width + .12, .062, .062], 'gold', faceSide),
];
const pedestal = (height: number, width: number) => [
  box([0, .065, 0], [width, .13, width]),
  cylinder([0, height / 2, 0], [width * .62, height, width * .62]),
  box([0, height, 0], [width * .84, .12, width * .84]),
];
const brazier = (height: number, metal: CastleMaterial = 'iron') => [
  ...pedestal(height, .46),
  cylinder([0, height + .15, 0], [.57, .18, .57], metal),
  torus([0, height + .24, 0], [.65, .65, .08], metal, faceUp),
  ...[-1, 0, 1].map((side): ModelPrimitive => primitive('teardrop',
    [side * .106, height + .38, 0], [.21, .33 - Math.abs(side) * .08, .2], 'flame', [0, 0, -side * .15],
    { kind: 'flame', pivot: [side * .1, height + .21, 0], axis: 'z', amplitude: .24, speed: 5.4, phase: side })),
];
const lantern = (h: number) => [
  ...pedestal(h, .28),
  box([0, h + .23, 0], [.24, .38, .24], 'glass'),
  ...[-1, 1].flatMap(x => [-1, 1].map(z => box([x * .13, h + .23, z * .13], [.047, .45, .047], 'gold'))),
  cone([0, h + .49, 0], [.44, .22, .44], 'iron'),
];
const shield = (h: number, metal: CastleMaterial = 'gold') => [
  ...pedestal(h * .35, .36),
  wedge([0, h * .58, 0], [h * .54, h * .44, .12], metal, [0, 0, Math.PI]),
  box([0, h * .86, 0], [h * .54, h * .22, .12], metal),
  box([0, h * .68, .067], [h * .11, h * .47, .044], 'banner'),
  box([0, h * .76, .072], [h * .48, h * .1, .044], 'banner'),
];
const bell = (h: number, count = 1) => [
  ...row(count + 1, .48).map(x => box([x, h / 2, 0], [.12, h, .17], 'timber')),
  box([0, h, 0], [(count + .6) * .48, .17, .19], 'timber'),
  ...row(count, .48).flatMap(x => [
    sphere([x, h - .21, 0], [.29, .34, .28], 'gold'),
    cylinder([x, h - .36, 0], [.38, .1, .38], 'gold'),
    sphere([x, h - .45, 0], [.085, .11, .085], 'iron'),
  ]),
];
const planters = (count: number, size: number) => row(count, size + .22).flatMap(x => [
  box([x, .14, 0], [size, .28, size * .64]),
  box([x, .26, 0], [size + .08, .09, size * .7]),
  ...row(4, size * .19).map((leaf, index) => sphere([x + leaf, .38 + (index % 2) * .08, 0], [size * .31, .3, size * .44], 'greenery')),
]);
const gargoyle = (height: number, width: number) => [
  ...pedestal(height, width),
  sphere([0, height + .32, .14], [width * .52, .59, width * .65], 'wyvernScale'),
  box([0, height + .44, width * .38], [width * .38, .23, width * .36], 'wyvernScale'),
  ...[-1, 1].flatMap(side => [
    wedge([side * width * .44, height + .41, 0], [width * .56, .64, .24], 'wyvernScale', [0, side * .4, -side * .66]),
    cone([side * width * .14, height + .7, .16], [.13, .32, .13], 'stone'),
  ]),
];
const armillary = (height: number, diameter: number) => [
  ...pedestal(height, diameter * .65),
  torus([0, height + diameter / 2, 0], [diameter, diameter, .1], 'gold'),
  torus([0, height + diameter / 2, 0], [diameter * .9, diameter * .9, .1], 'gold', faceUp),
  torus([0, height + diameter / 2, 0], [diameter * .73, diameter * .73, .1], 'gold', [0, Math.PI / 2, 0]),
  sphere([0, height + diameter / 2, 0], [diameter * .21, diameter * .21, diameter * .21], 'glass'),
];
const rose = (radius: number) => [
  cylinder([0, 0, 0], [2 * radius, .14, 2 * radius], 'glass', faceUp),
  torus([0, 0, .115], [radius * 2.12, radius * 2.12, .25], 'gold'),
  ...Array.from({ length: 8 }, (_, i) => {
    const angle = i * Math.PI / 4;
    return torus([Math.cos(angle) * radius * .51, Math.sin(angle) * radius * .51, .102],
      [radius * .71, radius * .71, .12], i % 2 ? 'gold' : 'stone');
  }),
  sphere([0, 0, .14], [radius * .29, radius * .29, .18], 'banner'),
];

const head = (pivot: CastleVector, axis: ModelJoint['axis'], amplitude: number, speed: number): ModelJoint =>
  ({ kind: 'head', pivot, axis, amplitude, speed });

function mastiff() {
  const tilt = head([0, .53, .2], 'z', .12, 1.8);
  return [
    box([0, .46, 0], [.47, .4, .72], 'mastiffPelt'),
    box([0, .51, .3], [.54, .45, .33], 'mastiffPelt'),
    box([0, .72, -.09], [.43, .16, .63], 'iron'),
    ...[-1, 1].flatMap(side => [-1, 1].flatMap(end => [
      box([side * .165, .17, end * .25], [.14, .34, .15], 'mastiffPelt'),
      box([side * .165, .06, end * .25 + .055], [.15, .12, .22], 'iron'),
    ])),
    { ...box([0, .79, .36], [.39, .32, .35], 'mastiffPelt'), joint: tilt },
    { ...box([0, .73, .58], [.28, .18, .24], 'iron'), joint: tilt },
    { ...torus([0, .66, .28], [.44, .39, .19], 'gold'), joint: tilt },
    ...[-1, 1].flatMap(side => [
      { ...cone([side * .15, .99, .32], [.16, .24, .13], 'mastiffPelt', [0, 0, -side * .31]), joint: tilt },
      { ...sphere([side * .116, .83, .537], [.056, .056, .038], 'gold'), joint: tilt },
      { ...sphere([side * .185, .68, .365], [.08, .086, .067], 'iron'), joint: tilt },
    ]),
    primitive('cylinder', [0, .55, -.45], [.1, .36, .1], 'mastiffPelt', [-1.03, 0, 0],
      { kind: 'tail', pivot: [0, .44, -.34], axis: 'y', amplitude: .19, speed: 2.2 }),
  ];
}

function calico() {
  const tail: ModelJoint = { kind: 'tail', pivot: [0, .28, -.27], axis: 'z', amplitude: .15, speed: 1.5 };
  return [
    ...support(.65, .98, .63),
    cylinder([0, .22, 0], [.28, .59, .31], 'catPelt', faceUp),
    sphere([0, .32, .3], [.32, .29, .29], 'catPelt'),
    ...[-1, 1].flatMap(side => [
      cone([side * .107, .478, .31], [.123, .18, .105], 'catPelt', [0, 0, -side * .23]),
      sphere([side * .069, .342, .432], [.045, .044, .034], 'gold'),
      ...[-1, 1].map(end => cylinder([side * .103, .074, end * .175], [.112, .148, .112], 'catPelt')),
    ]),
    primitive('cylinder', [0, .33, -.356], [.093, .25, .093], 'catPelt', [-.75, 0, 0], tail),
    primitive('cylinder', [0, .47, -.394], [.088, .2, .088], 'catPelt', [.32, 0, 0], tail),
    primitive('sphere', [0, .56, -.365], [.09, .095, .098], 'catPelt', undefined, tail),
  ];
}

function stallion() {
  const nod = head([0, .86, .36], 'x', .085, 1.65);
  return [
    box([0, .73, 0], [.46, .45, 1.13], 'stallionPelt'),
    sphere([0, .7, -.46], [.5, .49, .42], 'stallionPelt'),
    box([0, .99, -.04], [.48, .11, .45], 'banner'),
    box([0, 1.06, -.05], [.365, .08, .36], 'timber'),
    ...[-1, 1].flatMap(side => [-1, 1].flatMap(end => [
      cylinder([side * .16, .32, end * .39], [.136, .61, .13], 'stallionPelt', [end * .08, 0, 0]),
      box([side * .16, .067, end * .39 + .03], [.16, .14, .2], 'iron'),
    ])),
    { ...wedge([0, 1.12, .44], [.38, .7, .47], 'stallionPelt', [.41, 0, 0]), joint: nod },
    { ...box([0, 1.19, .255], [.18, .57, .14], 'iron', [.35, 0, 0]), joint: nod },
    { ...box([0, 1.41, .61], [.26, .28, .45], 'stallionPelt', [.31, 0, 0]), joint: nod },
    { ...box([0, 1.32, .79], [.228, .18, .22], 'iron'), joint: nod },
    ...[-1, 1].map(side => ({ ...cone([side * .075, 1.61, .51], [.1, .23, .11], 'stallionPelt'), joint: nod })),
    primitive('cylinder', [0, .58, -.68], [.13, .62, .14], 'iron', [.38, 0, 0],
      { kind: 'tail', pivot: [0, .86, -.53], axis: 'z', amplitude: .18, speed: 1.9 }),
  ];
}

function falcon() {
  const scan = head([0, .57, .02], 'y', .29, 1.35);
  return [
    ...support(4.4, .48, .55),
    box([0, .035, 0], [.64, .11, .14], 'timber'),
    primitive('teardrop', [0, .37, -.055], [.28, .54, .3], 'falconFeather', [-.3, 0, 0]),
    { ...sphere([0, .628, .055], [.26, .26, .25], 'falconFeather'), joint: scan },
    { ...cone([0, .588, .205], [.123, .15, .115], 'gold', faceUp), joint: scan },
    ...[-1, 1].flatMap(side => [
      primitive('wedge', [side * .11, .37, -.15], [.18, .44, .26], 'falconFeather',
        [.37, side * .17, side * .36], { kind: 'wing', pivot: [side * .08, .47, -.06], axis: 'z', amplitude: side * .09, speed: 2.1 }),
      cylinder([side * .072, .126, .02], [.048, .135, .048], 'gold'),
      cylinder([side * .072, .097, .07], [.065, .16, .05], 'gold', faceUp),
      { ...sphere([side * .08, .66, .145], [.044, .053, .037], 'iron'), joint: scan },
    ]),
    wedge([0, .247, -.29], [.176, .26, .075], 'falconFeather', [-.65, 0, 0]),
  ];
}

function wyvern() {
  const look = head([0, .65, .14], 'y', .15, 1.3);
  const tail: ModelJoint = { kind: 'tail', pivot: [0, .32, -.16], axis: 'y', amplitude: .12, speed: 1.35 };
  return [
    ...support(11.75, .58, .69),
    sphere([0, .38, -.045], [.41, .71, .69], 'wyvernScale'),
    cylinder([0, .58, .18], [.25, .56, .27], 'wyvernScale', [.5, 0, 0]),
    { ...sphere([0, .89, .355], [.33, .33, .43], 'wyvernScale'), joint: look },
    { ...box([0, .82, .61], [.22, .14, .32], 'wyvernScale'), joint: look },
    { ...box([0, .73, .59], [.21, .095, .3], 'iron'), joint: look },
    ...[-1, 1].flatMap(side => [
      { ...cone([side * .11, 1.07, .26], [.14, .33, .13], 'gold', [-.43, 0, -side * .29]), joint: look },
      { ...sphere([side * .096, .91, .53], [.067, .06, .076], 'ember'), joint: look },
      box([side * .13, .095, .132], [.16, .19, .3], 'wyvernScale'),
      primitive('wedge', [side * .46, .61, -.12], [.62, .74, .25], 'wyvernScale', [.43, 0, -side * .86],
        { kind: 'wing', pivot: [side * .16, .52, -.07], axis: 'z', amplitude: side * .14, speed: 2 }),
      primitive('wedge', [side * .68, .49, -.33], [.36, .37, .18], 'wyvernScale', [.62, 0, -side],
        { kind: 'wing', pivot: [side * .16, .52, -.07], axis: 'z', amplitude: side * .14, speed: 2 }),
    ]),
    primitive('cylinder', [0, .23, -.47], [.16, .52, .17], 'wyvernScale', [-1.55, 0, 0], tail),
    primitive('cone', [.035, .23, -.78], [.157, .25, .16], 'wyvernScale', [-1.35, 0, -.3], tail),
    ...[0, 1, 2].map(i => primitive('sphere', [i * .035 - .035, .78 + i * .042, .81 + i * .12],
      [.064 - i * .013, .066 - i * .013, .069 - i * .013], 'ember', undefined,
      { kind: 'ember', pivot: [0, .76, .69], axis: 'x', amplitude: .36, speed: 3.1, phase: i * .8 })),
  ];
}

type Site = { anchor: CastleVector; build: () => ModelPrimitive[] };
const site = (anchor: CastleVector, build: Site['build']): Site => ({ anchor, build });
const stoneRows = (width: number, depth: number, tiers: number) =>
  Array.from({ length: tiers }, (_, index) => box([0, .12 + index * .24, 0], [width - index * .12, .24, depth - index * .16]));
const fencing = (width: number, height: number, material: CastleMaterial = 'timber') => [
  ...row(Math.round(width / .3) + 1, .3).map(x => box([x, height / 2, 0], [.09, height, .1], material)),
  box([0, height * .73, 0], [width + .12, .084, .15], material),
  box([0, height * .28, 0], [width + .12, .075, .15], material),
];
const moat = (innerX: number, innerZ: number, border: number, y: number, height: number, material: CastleMaterial) => [
  ...[-1, 1].flatMap(sign => [
    box([0, y, sign * (innerZ + border / 2)], [(innerX + border) * 2, height, border], material),
    box([sign * (innerX + border / 2), y, 0], [border, height, innerZ * 2], material),
  ]),
];
const crown = (h: number, diameter: number) => [
  box([0, -h + .14, 0], [.83, .28, .83]),
  cylinder([0, -h / 2, 0], [.28, h, .28]),
  cone([0, -.29, 0], [.87, .61, .87], 'stone', [0, 0, Math.PI]),
  cylinder([0, .16, 0], [diameter, .32, diameter], 'gold'),
  torus([0, .329, 0], [diameter * 1.12, diameter * 1.12, .16], 'gold', faceUp),
  ...Array.from({ length: 8 }, (_, index) => {
    const angle = index * Math.PI / 4;
    const x = Math.cos(angle) * diameter * .435;
    const z = Math.sin(angle) * diameter * .435;
    return [
      cone([x, .65, z], [.27, .75, .27], 'gold', [Math.sin(angle) * .17, 0, -Math.cos(angle) * .17]),
      sphere([x * 1.1, 1.01, z * 1.1], [.142, .153, .143], 'gold'),
    ];
  }).flat(),
  sphere([0, .38, 0], [diameter * .53, .29, diameter * .53], 'banner'),
];

const SITES: Record<string, Site> = {
  // Outer Bailey & Moat
  'bailey-foundation': site([0, 0, -1], () => moat(10.9, 10.15, .72, .18, .36, 'stone')),
  'moat-excavation': site([0, 0, -1], () => moat(11.85, 11.42, 2.55, .043, .085, 'water')),
  'moat-piers': site([0, 0, 11.72], () => [-1.15, 1.15].flatMap(x => shift(stoneRows(.66, .86, 3), x, 0, 0))),
  'retaining-walls': site([0, 0, -1], () => [
    ...moat(11.65, 11.22, .29, .28, .56, 'stone').flatMap(piece => {
      if (piece.position[2] < 0 || piece.position[2] === 0) return [piece];
      const width = (piece.size[0] - 3.8) / 2;
      return [-1, 1].map(sign => box([sign * (1.9 + width / 2), .28, piece.position[2]], [width, .56, .29]));
    }),
  ]),
  'heavy-drawbridge': site([0, 0, 11.72], () => [
    ...row(10, .43).map(z => box([0, .26, z], [2.58, .21, .435], 'timber')),
    ...[-1, 1].flatMap(side => [
      box([side * 1.21, .42, 0], [.16, .2, 4.45], 'timber'),
      box([side * 1.37, 1.18, -2.03], [.23, 2.36, .28], 'timber'),
      ...Array.from({ length: 12 }, (_, i) => torus([side * 1.24, .56 + i * .117, 1.84 - i * .29],
        [.16, .31, .11], 'iron', [1.13, 0, i % 2 * 1.57])),
    ]),
    box([0, 2.32, -2.03], [2.99, .24, .26], 'timber'),
  ]),
  'outer-barbican': site([0, 0, 8.84], () => [
    ...arch(3.27, 1.67, 1.25, 1.1),
    ...[-1, 1].flatMap(sign => shift(tower(1.68, 3.7, 1.61), sign * 2.2, 0, 0)),
    box([0, 3.04, 0], [3.72, .33, 1.18]),
    ...row(4, .83).map(x => box([x, 3.34, .32], [.45, .38, .5])),
  ]),
  'portcullis': site([0, 0, 8.31], () => [
    ...[-1, 1].flatMap(sign => shift(buttress(2.6, .48), sign * 1.33, 0, 0)),
    ...row(7, .32).map(x => box([x, 1.5, 0], [.087, 2.05, .1], 'iron')),
    ...[1, 1.6, 2.2].map(y => box([0, y, 0], [2.13, .12, .11], 'iron')),
    box([0, 2.71, 0], [2.98, .3, .43]),
  ]),
  'west-masonry': site([-5.6, 0, 10.16], () => stoneRows(2.7, .94, 3)),
  'center-masonry': site([0, 0, 7.32], () => stoneRows(2.65, 2, 2)),
  'east-masonry': site([5.72, 0, 10.16], () => stoneRows(3.18, 1.14, 3)),
  'west-curtain': site([-10.96, 0, -.62], () => turn(wall(20.85, 2.25, .81))),
  'east-curtain': site([10.96, 0, -.62], () => turn(wall(20.85, 2.35, .81))),
  'north-curtain': site([0, 0, -11.17], () => wall(21.55, 2.54, .91)),
  'south-curtain': site([0, 0, 9.35], () => [-1, 1].flatMap(side => shift(wall(8.15, 2.18, .82), side * 6.84, 0, 0))),
  'iron-torch-braziers': site([0, 0, 9.79], () => [-1, 1].flatMap(side => shift(brazier(.62), side * 3.51, 0, 0))),
  'stone-sentry-posts': site([0, 0, 8.94], () => [-1, 1].flatMap(side => shift([
    ...arch(.82, .64, .68), wedge([0, 1.27, 0], [1.2, .68, .97], 'slate'),
  ], side * 4.9, 0, 0))),
  'moat-sluice': site([12.86, .13, 5.92], () => [
    ...arch(1.03, .32, .54),
    box([0, .29, .04], [.95, .58, .21], 'timber'),
    ...row(4, .22).map(x => box([x, .3, .17], [.058, .6, .061], 'iron')),
    box([0, .09, .96], [1.17, .18, 1.47], 'stone'),
    box([0, .19, .97], [.68, .08, 1.48], 'water'),
  ]),
  'chain-hoist': site([2.17, 0, 10.9], () => [
    ...pedestal(.72, .88),
    cylinder([0, .93, 0], [.53, .66, .53], 'timber', faceSide),
    ...[-1, 1].map(sign => torus([sign * .31, .93, 0], [.75, .75, .2], 'iron', [0, Math.PI / 2, 0])),
  ]),
  'bailey-postern': site([-11.31, 0, 3.4], () => turn([
    ...arch(1.08, .91, .36), box([0, .63, -.08], [.89, 1.26, .22], 'timber'),
    box([0, .58, -.207], [.81, .096, .073], 'iron'),
  ])),
  'archer-gallery': site([0, 0, 8.28], () => shift([
    ...wall(3.29, 1.25, .67),
    ...row(4, .91).map(x => box([x, 1.71, .23], [.14, 1.04, .14], 'timber')),
    wedge([0, 2.34, 0], [3.43, .72, .97], 'slate'),
  ], -7.71, 0, 0)),
  'golden-walls': site([0, 0, 8.21], () => [-1, 1].flatMap(side => shift([
    box([0, .47, 0], [.37, .94, 1.72]),
    box([0, .97, 0], [.43, .17, 1.79], 'gold'),
  ], side * 3.47, 0, .78))),
  'watch-stair': site([-9.65, 0, 7.92], () => stair(8, .94, .28, .32)),
  'parapet-capstones': site([8.62, 0, 8.88], () => [
    box([0, .86, 0], [3.2, 1.72, .54]),
    ...row(5, .65).map(x => cylinder([x, 1.79, 0], [.52, .13, .47])),
  ]),
  'gatehouse-bell': site([-3.58, 0, 7.93], () => bell(1.58)),
  'moat-markers': site([-3.58, 0, 12.75], () => row(3, .66).flatMap((x, i) => shift([
    ...pedestal(.46 + .13 * i, .37), box([0, .22 + .1 * i, .148], [.2, .14, .05], 'gold'),
  ], x, 0, 0))),
  'gatehouse-lanterns': site([0, 0, 7.17], () => [-1, 1].flatMap(side => shift(lantern(1.31), side * 1.62, 0, 0))),
  'bridge-abutment': site([0, 0, 14.23], () => [
    ...stoneRows(3.36, 1.1, 2), box([0, .48, 0], [2.86, .08, .86], 'timber'),
  ]),
  'bank-revetment': site([5.06, 0, 13.22], () => row(6, .65).flatMap((x, i) =>
    shift(stoneRows(.62, .93 - .04 * i, 2), x, 0, i * -.09))),
  'bailey-standard': site([3.15, 0, 12.71], () => pole(2.25, .78)),
  'mastiff': site([-1.9, 0, 10.69], mastiff),

  // Courtyard & Citadel
  'banqueting-hall': site([-4.93, 0, .03], () => hall(3.25, 2.46, 3.4, 1.55, 'timber')),
  'arched-stables': site([5.65, 0, 1.22], () => [
    box([0, .12, 0], [3.4, .24, 2.8]),
    box([0, .8, -1.07], [3.31, 1.6, .46]),
    ...row(3, 1.07).flatMap(x => shift(arch(.88, .75, .54), x, 0, 1.07)),
    wedge([0, 1.92, 0], [3.54, 1.12, 2.82], 'slate'),
  ]),
  'stable-hayloft': site([7.85, 0, 1.55], () => [
    ...row(2, 1.22).flatMap(x => [-.57, .57].map(z => box([x, .61, z], [.16, 1.22, .16], 'timber'))),
    ...shift(hall(1.43, .83, 1.32, .67, 'timber'), 0, 1.18, 0),
  ]),
  'blacksmith-forge': site([5.42, 0, -1.73], () => [
    ...hall(2.52, 1.43, 1.95, .85),
    box([.73, 1.95, -.58], [.57, 2.14, .56]),
    box([.73, 3.06, -.58], [.76, .17, .73]),
    ...shift(brazier(.15), -.85, 0, 1.21),
  ]),
  'knights-barracks': site([-4.59, 0, 3.24], () => hall(3.4, 1.81, 1.83, .66)),
  'inner-wall-ring': site([0, 0, 2.45], () => [
    ...[-1, 1].flatMap(sign => shift(turn(wall(3.4, .75, .33)), sign * 2.68, 0, 1.35)),
    ...[-1, 1].flatMap(sign => shift(wall(1.4, .88, .37), sign * 2.07, 0, 3.18)),
  ]),
  'cobblestone-plaza': site([0, .013, 2.78], () => [
    cylinder([0, .078, 0], [5.02, .155, 4.01]),
    ...Array.from({ length: 12 }, (_, i) => {
      const angle = i * Math.PI / 6;
      return box([Math.cos(angle) * 2.18, .163, Math.sin(angle) * 1.74], [.42, .09, .81],
        'stone', [0, -angle, 0]);
    }),
  ]),
  'tiered-fountain': site([0, .18, 2.73], () => [
    cylinder([0, .12, 0], [1.66, .24, 1.66]),
    cylinder([0, .244, 0], [1.52, .043, 1.52], 'water'),
    torus([0, .263, 0], [1.7, 1.7, .17], 'stone', faceUp),
    cylinder([0, .63, 0], [.31, 1.1, .31]),
    ...[.58, .96, 1.24].flatMap((y, index) => {
      const diameter = 1 - index * .22;
      return [
        torus([0, y, 0], [diameter, diameter, .15], 'stone', faceUp),
        cylinder([0, y - .033, 0], [diameter * .88, .077, diameter * .88], 'water'),
      ];
    }),
    sphere([0, 1.34, 0], [.12, .22, .12], 'water'),
  ]),
  'heraldic-shields': site([-5.06, 0, 2.08], () => row(3, .65).flatMap(x => shift(shield(1.04), x, 0, 0))),
  'wall-crests': site([2.21, 0, 5.48], () => [
    ...pedestal(1.02, .51), ...shift(rose(.28), 0, 1.35, .1),
  ]),
  'herb-gardens': site([-3.28, 0, 5.54], () => [
    ...planters(3, .63), ...shift(planters(3, .54), 0, 0, .74),
  ]),
  'stone-planters': site([3.6, 0, 5.5], () => planters(3, .55)),
  'kitchen-wing': site([-7.78, 0, 1.75], () => [
    ...hall(1.69, 1.42, 1.69, .64), box([-.46, 1.7, -.31], [.33, 1.33, .32]),
  ]),
  'covered-market': site([6.79, 0, 4.82], () => [
    ...row(3, .98).flatMap(x => [-.5, .5].map(z => box([x, .72, z], [.13, 1.44, .14], 'timber'))),
    wedge([0, 1.68, 0], [2.34, .48, 1.35], 'banner'),
    box([0, .58, .4], [2.11, .11, .43], 'timber'),
  ]),
  'cistern-house': site([8.02, 0, -1.32], () => [
    cylinder([0, .38, 0], [1.8, .76, 1.8]),
    torus([0, .77, 0], [1.83, 1.83, .21], 'stone', faceUp),
    cylinder([0, .75, 0], [1.61, .077, 1.61], 'water'),
    ...[-.71, .71].map(x => box([x, 1.1, 0], [.13, 2.2, .14], 'timber')),
    wedge([0, 2.02, 0], [1.89, .76, 1.53], 'slate'),
  ]),
  'brew-house': site([-7.71, 0, -1.11], () => [
    ...hall(1.91, 1.5, 1.62, .72, 'timber'),
    ...row(3, .41).map(x => cylinder([x, .3, .95], [.35, .59, .36], 'timber')),
  ]),
  'training-yard': site([4.4, 0, 3.72], () => [
    box([0, .062, 0], [1.68, .124, 1.15], 'timber'),
    ...row(2, .69).flatMap(x => [
      box([x, .53, -.43], [.12, 1.06, .11], 'timber'),
      cylinder([x, .96, -.35], [.49, .106, .49], 'banner', faceUp),
      torus([x, .96, -.284], [.31, .31, .092], 'gold'),
    ]),
  ]),
  'citadel-arcade': site([-1.9, 0, -.12], () => row(3, .87).flatMap(x => shift(arch(.73, .79, .32), x, 0, 0))),
  'smith-anvil': site([4.15, 0, -.38], () => [
    cylinder([0, .22, 0], [.43, .44, .41], 'timber'),
    box([0, .516, 0], [.47, .19, .26], 'iron'),
    cone([.31, .541, 0], [.19, .34, .19], 'iron', [0, 0, -Math.PI / 2]),
  ]),
  'horse-trough': site([7.09, 0, 3.4], () => [
    box([0, .14, 0], [1.45, .28, .59]), box([0, .29, 0], [1.3, .062, .44], 'water'),
    ...[-1, 1].flatMap(side => [
      box([0, .3, side * .265], [1.45, .18, .11]), box([side * .72, .3, 0], [.12, .18, .59]),
    ]),
  ]),
  'courtyard-benches': site([0, 0, 4.59], () => [-1, 1].flatMap(sign => shift([
    ...[-.46, .46].map(x => box([x, .17, 0], [.22, .34, .24])),
    box([0, .36, 0], [1.29, .15, .39]),
  ], sign * 1.43, 0, 0))),
  'hall-lanterns': site([-3.1, 0, 2.03], () => [-.38, .38].flatMap(z => shift(lantern(.99), 0, 0, z))),
  'cloister-columns': site([-4.68, 0, 5.32], () => row(3, .71).flatMap(x => shift(pedestal(1.15, .31), x, 0, 0))),
  'citadel-gate': site([0, 0, 5.62], () => [
    ...arch(2.04, 1.14, .4, .69), ...[-.53, .53].map(x => box([x, .75, -.11], [.98, 1.51, .18], 'timber')),
    box([0, .62, .025], [1.96, .12, .066], 'iron'),
  ]),
  'inner-watch': site([-1.71, 0, 6.78], () => hall(1.19, 1.27, 1.05, .77)),
  'plaza-mosaic': site([0, .055, 4.98], () => [
    cylinder([0, .05, 0], [1.04, .093, 1.04], 'slate'),
    ...Array.from({ length: 8 }, (_, i) => {
      const angle = i * Math.PI / 4;
      return box([Math.cos(angle) * .18, .11, Math.sin(angle) * .18], [.69, .04, .076],
        i % 2 ? 'glass' : 'gold', [0, -angle, 0]);
    }),
  ]),
  'granary': site([-7.78, 0, 4.09], () => [
    ...row(2, 1.12).flatMap(x => [-.64, .64].map(z => box([x, .35, z], [.19, .7, .2]))),
    ...shift(hall(1.63, 1.32, 1.67, .59, 'timber'), 0, .62, 0),
  ]),
  'garden-trellis': site([-2.09, 0, 4.57], () => [
    ...[-.47, .47].flatMap(z => row(3, .49).map(x => box([x, .65, z], [.081, 1.3, .09], 'timber'))),
    ...row(5, .27).map(x => box([x, 1.31, 0], [.078, .09, 1.19], 'timber')),
    ...row(4, .26).map(x => sphere([x, 1.4, -.22], [.26, .21, .49], 'greenery')),
  ]),
  'cat': site([-2.68, .65, 3.93], calico),
  'stallion': site([5.54, 0, 2.84], stallion),

  // High Bastions & Armory
  'north-bastion': site([-9.35, 0, -8.87], () => tower(2.95, 5.48, 1.98)),
  'south-bastion': site([9.73, 0, 7.62], () => tower(2.71, 4.68, 1.61)),
  'machicolated-parapets': site([-9.64, 0, -3.94], () => [
    ...turn(wall(5.78, 3.62, .79)),
    ...row(7, .8).map(z => box([.49, 3.48, z], [.54, .49, .26], 'stone', [0, 0, -.32])),
    box([.37, 3.72, 0], [.37, .164, 5.85]),
  ]),
  'treasury-vault': site([-5.53, 0, -4.14], () => [
    ...shift(hall(2.35, 1.3, 2.25, .6), 0, 1.15, 0),
    box([0, .59, 0], [2.6, 1.19, 2.5]),
    ...shift(arch(1.42, 1.3, .42), 0, .25, 1.24),
    box([0, 1.17, 1.28], [1.16, 1.83, .22], 'iron'),
  ]),
  'falconry-aerie': site([7.93, 0, -6.77], () => [
    box([0, 1.88, 0], [1.33, 3.76, 1.13]),
    box([0, 3.84, 0], [1.69, .27, 1.58]),
    ...[-.63, .63].flatMap(x => [-.58, .58].map(z => box([x, 4.38, z], [.155, 1.03, .14], 'timber'))),
    wedge([0, 5.16, 0], [1.89, .8, 1.78], 'slate'),
  ]),
  'falconry-turret': site([9.77, 0, -8.93], () => tower(1.64, 5.82, 2.47)),
  'stone-gargoyles': site([-8.9, 2.8, -1.47], () => [
    ...support(2.8, .72, 1.8),
    ...[-.58, .58].flatMap(z => shift(gargoyle(.09, .58), 0, 0, z)),
  ]),
  'silk-pennants': site([8.95, 2.66, 6.26], () => [
    ...support(2.66, 1.6, .4), ...[-.55, .55].flatMap(x => shift(pole(1.24, .48), x, 0, 0)),
  ]),
  'wall-banners': site([-8.42, 2.9, -5.07], () => [
    ...support(2.9, 1.98, .46), ...[-.51, .51].flatMap(x => shift(pole(1.43, .69, true), x, 0, 0)),
  ]),
  'weapon-displays': site([5.63, 0, -3.31], () => [
    box([0, .69, 0], [1.02, 1.38, .18], 'timber'), ...shift(shield(1, 'iron'), 0, .34, .15),
    ...[-1, 1].map(side => box([side * .22, 1.11, .171], [.1, .87, .09], 'gold', [0, 0, side * .36])),
  ]),
  'armory-sconces': site([6.59, 0, -4.09], () => [-.43, .43].flatMap(x => shift(brazier(1.42), x, 0, 0))),
  'west-casemate': site([-9.3, 0, 3.48], () => [
    ...arch(1.46, 1.12, .8), ...shift(buttress(2.12, 1.4), -.97, 0, -.14),
    box([0, 2.05, -.76], [1.9, .29, 1.56]),
  ]),
  'east-casemate': site([9.52, 0, 2.03], () => [
    ...arch(1.64, 1.37, .98), ...shift(buttress(2.36, 1.42), 1.1, 0, -.13),
    box([0, 2.51, -.94], [2.36, .31, 1.89]),
  ]),
  'bastion-bridge': site([8.89, 0, -7.85], () => [
    ...turn(arch(1.6, 2.41, .59, .52)),
    box([0, 3.16, 0], [.86, .23, 2.45], 'timber'),
    ...[-.35, .35].flatMap(x => shift(turn(fencing(2.31, .54)), x, 3.25, 0)),
  ]),
  'armory-hall': site([5.57, 0, -5.54], () => [
    box([0, .7, 0], [2.99, 1.4, 2.08]),
    ...shift(hall(2.77, 1.63, 1.88, .83), 0, 1.34, 0),
    ...shift(stair(5, .65, .27, .2), -1.03, 0, 1.97),
  ]),
  'shielded-lookout': site([-6.71, 0, -8.7], () => [
    ...shift(support(3.69, 1.25), 0, 3.69, 0),
    ...[-.48, .48].flatMap(x => [-.47, .47].map(z => box([x, 4.16, z], [.16, .93, .15], 'timber'))),
    cone([0, 4.95, 0], [1.65, .79, 1.65], 'slate'),
    ...shift(fencing(1.11, .35), 0, 3.67, .55),
  ]),
  'signal-tower': site([-9.43, 0, 6.44], () => [
    ...tower(1.98, 4.47),
    ...shift(lantern(.23), 0, 4.47, 0),
    cone([0, 5.54, 0], [1.56, .71, 1.56], 'slate'),
  ]),
  'bastion-stair': site([9.49, 0, 5.2], () => stair(10, .89, .31, .34)),
  'treasury-doors': site([-5.48, 0, -2.58], () => [
    ...arch(1.39, 1.43, .31, .58), ...[-.33, .33].map(x => box([x, .88, 0], [.64, 1.75, .12], 'iron')),
    ...[-.3, .3].flatMap(x => [.52, 1.02, 1.45].map(y => sphere([x, y, .088], [.096, .092, .06], 'gold'))),
  ]),
  'bastion-beacon': site([-9.08, 3.49, -.14], () => [
    ...support(3.49, .77), ...brazier(.38),
    cone([0, 1.28, 0], [.69, .22, .69], 'iron'),
    ...[-.23, .23].map(x => box([x, .94, 0], [.066, .6, .062], 'iron')),
  ]),
  'falcon-perches': site([7.95, 0, -4.96], () => [-.4, .4].flatMap(z => [
    box([0, .51, z], [.14, 1.02, .13], 'timber'),
    box([0, 1.04, z], [.76, .14, .17], 'timber'),
    ...row(6, .098).map(x => torus([x, 1.04, z], [.22, .22, .057], 'iron', [0, Math.PI / 2, 0])),
  ])),
  'armory-crates': site([4.28, 0, -3.22], () => [-.32, .32].flatMap((x, index) => [
    box([x, .23, index * .23], [.59, .46, .52], 'timber'),
    ...[-.19, .19].map(delta => box([x + delta, .452, index * .23], [.077, .054, .54], 'iron')),
  ])),
  'treasury-seal': site([-4.01, 0, -3.04], () => [
    ...pedestal(1.06, .28), ...shift(rose(.26), 0, 1.36, .041),
  ]),
  'arched-viaduct': site([-5.88, 0, -7.11], () => [
    ...row(3, 1.46).flatMap(x => shift(arch(1.37, 1.59, .66, .63), x, 0, 0)),
    box([0, 2.43, 0], [4.48, .31, .84]),
    ...shift(fencing(4.34, .44, 'stone'), 0, 2.55, .31),
  ]),
  'bastion-merlons': site([9.21, 0, -3.4], () => [
    ...turn(wall(2.61, 2.58, .61)), ...row(4, .73).map(z => box([0, 2.87, z], [.7, .54, .41])),
  ]),
  'ridge-buttresses': site([-8.61, 0, -3.91], () => row(4, 1.12).flatMap(z => shift(buttress(2.76, .62), 0, 0, z))),
  'bastion-weathercock': site([-5.64, 1.74, -6.27], () => [
    ...support(1.74, .49), ...pedestal(.32, .28),
    cylinder([0, .76, 0], [.055, .94, .055], 'gold'),
    box([0, 1.21, 0], [.66, .061, .052], 'gold'),
    wedge([.34, 1.22, 0], [.23, .24, .067], 'gold', [0, 0, -Math.PI / 2]),
    ...[-.25, -.15].map(x => wedge([x, 1.3, 0], [.16, .22, .059], 'banner', [0, 0, .5])),
  ]),
  'parapet-bells': site([8.9, 2.13, .03], () => [...support(2.13, 1.87, .45), ...bell(.81, 3)]),
  'quartermaster-lodge': site([7.81, 0, -3.44], () => hall(1.61, 1.46, 1.33, .65)),
  'falcon': site([7.86, 4.4, -6.03], falcon),

  // Royal Sanctuary & Spires
  'throne-keep': site([0, 0, -4.64], () => [
    box([0, .31, 0], [4.27, .62, 3.32]),
    ...shift(hall(3.7, 5.56, 2.92, 1.77), 0, .55, 0),
    ...[-1, 1].flatMap(side => shift(tower(1.2, 5.9, 1.71), side * 1.94, 0, .99)),
    ...shift(arch(1.21, 1.08, .29, .68), 0, 0, 1.72),
    ...row(3, .68).flatMap(x => window(x, 4.72, 1.52, 1.19)),
  ]),
  'royal-sanctuary': site([3.1, 0, -8.04], () => [
    box([0, 1.19, 0], [3.52, 2.38, 2.54]),
    ...shift(hall(3.11, 2.27, 2.37, 1.66), 0, 2.25, 0),
    ...[-1, 1].flatMap(side => shift(buttress(3.43, .73), side * 1.55, 0, 1.04)),
    ...row(3, .77).flatMap(x => window(x, 3.53, 1.26, 1.45)),
  ]),
  'cathedral-spire': site([-.36, 0, -9.06], () => [
    box([0, .55, 0], [2.25, 1.1, 2.21]),
    box([0, 4.06, 0], [1.61, 7.12, 1.63]),
    box([0, 7.51, 0], [1.87, .27, 1.87]),
    ...[-.43, .43].flatMap(x => window(x, 6.35, .85, 1.47)),
    cone([0, 9.59, 0], [2.29, 4.21, 2.29], 'slate'),
    ...[-1, 1].flatMap(x => [-1, 1].flatMap(z => [
      cone([x * .76, 7.94, z * .76], [.43, 1.08, .43], 'slate'),
      sphere([x * .76, 8.5, z * .76], [.14, .21, .139], 'gold'),
    ])),
    sphere([0, 11.76, 0], [.22, .3, .22], 'gold'),
  ]),
  'flying-buttresses': site([-.36, 0, -8.95], () => [-1, 1].flatMap(side => [
    ...shift(buttress(3.65, .65), side * 2.08, 0, .39),
    ...Array.from({ length: 7 }, (_, i) => {
      const angle = i / 6 * Math.PI / 2;
      return box([side * (.48 + Math.cos(angle) * 1.58), 3.46 + Math.sin(angle) * 1.5, .38],
        [.454, .472, .39], 'stone', [0, 0, side * (angle - .28)]);
    }),
  ])),
  'astral-clock-tower': site([-3.92, 0, -8.68], () => [
    box([0, 4.17, 0], [1.73, 8.34, 1.75]),
    ...[.87, 3.44, 6.18, 8.31].map(y => box([0, y, 0], [1.88, .17, 1.89])),
    cone([0, 9.47, 0], [2.16, 2.3, 2.15], 'slate'),
    ...shift(rose(.54), 0, 7.33, .914),
    box([.13, 7.43, 1.06], [.39, .076, .055], 'gold', [0, 0, .58]),
    box([0, 7.51, 1.07], [.065, .39, .055], 'gold'),
  ]),
  'sun-observatory': site([6.21, 0, -8.71], () => [
    cylinder([0, 2.2, 0], [1.95, 4.4, 1.95]),
    cylinder([0, 4.39, 0], [2.11, .25, 2.11]),
    sphere([0, 4.52, 0], [2.11, 2.05, 2.11], 'slate'),
    torus([0, 4.91, 0], [1.99, 1.99, .094], 'gold', faceUp),
    ...shift(armillary(.17, .78), 0, 5.28, 0),
  ]),
  'rose-windows': site([3.03, 2.48, -6.72], () => [
    ...support(2.48, 1.31, .46), ...arch(1.12, .71, .32, .56), ...shift(rose(.48), 0, .72, .21),
  ]),
  'gilded-railings': site([2.81, 2.05, -5.86], () => [
    ...support(2.05, 2.04, .51), ...fencing(1.91, .61, 'gold'),
  ]),
  'royal-braziers': site([2.9, 2.06, -6.19], () => [-.67, .67].flatMap(x =>
    shift([...support(2.06, .42), ...brazier(.29, 'gold')], x, 0, 0))),
  'armillary-sphere': site([6.58, 0, -7.13], () => armillary(1.14, 1.17)),
  'throne-hall': site([2.77, 0, -3.82], () => [
    ...hall(1.92, 3.69, 2.61, 1.05),
    ...row(3, .6).map(x => box([x, 1.27, 1.34], [.17, 2.54, .31])),
    ...shift(arch(.83, 1.07, .22), 0, 0, 1.6),
  ]),
  'royal-library': site([-3.15, 0, -5.77], () => [
    ...hall(1.76, 3.35, 1.75, 1.14), ...row(2, .66).flatMap(x => window(x, 2.54, .918, 1.1)),
  ]),
  'choir-chapel': site([-.45, 0, -6.76], () => [
    ...hall(2.02, 3.29, 1.44, .91), ...shift(rose(.39), 0, 2.56, .781),
  ]),
  'star-gallery': site([5.37, 0, -9.93], () => [
    ...shift(support(2.68, 2.87, .65), 0, 2.68, 0),
    ...row(3, .91).flatMap(x => shift(arch(.81, .71, .42), x, 2.69, 0)),
    box([0, 3.93, 0], [2.87, .32, .63]),
  ]),
  'west-spire': site([-2.19, 0, -9.76], () => tower(1.05, 6.77, 2.88)),
  'east-spire': site([1.41, 0, -9.72], () => tower(1.07, 7.07, 3.13)),
  'royal-skybridge': site([0, 0, -7.78], () => [
    ...arch(2.72, 3.42, .76, .92),
    box([0, 4.55, 0], [3.13, .29, 1.1]),
    ...row(3, .83).flatMap(x => shift(arch(.69, .48, .36), x, 4.61, .3)),
    wedge([0, 5.64, 0], [3.29, .6, 1.18], 'slate'),
  ]),
  'gilded-loggia': site([.28, 0, -2.73], () => [
    box([0, .192, 0], [2.43, .39, 1.27]),
    ...row(4, .64).flatMap(x => shift(pedestal(1.68, .28), x, .4, .48)),
    box([0, 2.18, .15], [2.55, .31, .98]),
    ...shift(fencing(2.31, .44, 'gold'), 0, .4, .71),
  ]),
  'sanctuary-statues': site([2.96, 0, -6.41], () => [-.73, .73].flatMap(x => shift([
    ...pedestal(.32, .35), cylinder([0, .56, 0], [.19, .46, .19]),
    sphere([0, .873, 0], [.21, .235, .19]), cone([0, 1.04, 0], [.15, .15, .13], 'gold'),
  ], x, 0, 0))),
  'summit-parapet': site([.13, 0, -10.55], () => wall(5.38, 2.96, .54)),
  'clock-bells': site([-3.87, 5.22, -7.68], () => [...support(5.22, 1.94, .44), ...bell(.81, 3)]),
  'observatory-transit': site([6.33, 0, -10.23], () => [
    ...pedestal(1.14, .43), ...[-.28, .28].map(x => box([x, 1.31, 0], [.082, .39, .088], 'gold')),
    cylinder([0, 1.5, 0], [.154, .9, .16], 'gold', [0, 0, .87]),
    sphere([.33, 1.23, 0], [.19, .15, .19], 'glass'),
  ]),
  'royal-coat-of-arms': site([0, 1.57, -3.1], () => [...support(1.57, .47), ...shield(1.34)]),
  'moon-dial': site([-2.99, 0, -7.06], () => [
    ...pedestal(.71, .5),
    cylinder([0, .8, 0], [.68, .16, .68], 'glass', [.45, 0, 0]),
    box([0, .92, 0], [.27, .045, .13], 'gold', [0, 0, .34]),
    ...[-.18, .18].map(x => sphere([x, .86, .19], [.07, .052, .07], 'gold')),
  ]),
  'spire-finials': site([-2.19, 5.96, -8.94], () => [
    ...support(5.96, 1.38, .47), ...row(3, .46).flatMap((x, i) => [
      cone([x, .3 + i * .06, 0], [.23, .65 + i * .12, .23], 'gold'),
      sphere([x, .66 + i * .11, 0], [.095, .13, .095], 'gold'),
    ]),
  ]),
  'royal-oratory': site([1.44, 0, -5.95], () => [
    ...hall(1.26, 2.23, 1.28, .75),
    ...shift(rose(.23), 0, 1.78, .69),
  ]),
  'imperial-standard': site([-.82, 5.95, -3.23], () => [...support(5.95, .5), ...pole(1.86, .87, true)]),
  'spire-grotesques': site([-.36, 6.29, -8.05], () => [-.7, .7].flatMap(x =>
    shift([...support(6.29, .54), ...gargoyle(.14, .54)], x, 0, 0))),
  'wyvern': site([.27, 11.75, -8.08], wyvern),
  'imperial-crown': site([-.36, 11.94, -9.06], () => crown(11.94, 1.6)),
};

export const CASTLE_ELEMENTS: readonly ModelElement[] = BLUEPRINT_PARTS.map(part => {
  const location = SITES[part.modelKey];
  if (!location) throw new Error('Missing castle geometry for ' + part.modelKey);
  return { id: part.id, anchor: location.anchor, primitives: location.build() };
});
const elementsById = new Map(CASTLE_ELEMENTS.map(element => [element.id, element] as const));

export function getCastleElement(id: string) {
  return elementsById.get(id);
}

export function castleElements(ownedIds: readonly string[]): ModelElement[] {
  const owned = new Set(ownedIds);
  return CASTLE_ELEMENTS.filter(element => owned.has(element.id));
}

const unitBounds = new Map<CastleShape, Box3>();
function getUnitBounds(shape: CastleShape) {
  let bounds = unitBounds.get(shape);
  if (!bounds) {
    const geometry = createCastleGeometry(shape);
    geometry.computeBoundingBox();
    bounds = geometry.boundingBox!.clone();
    unitBounds.set(shape, bounds);
    geometry.dispose();
  }
  return bounds;
}

/** Conservative occupied bounds after applying each primitive's own transform and its world anchor. */
export function getCastleElementBounds(element: ModelElement): Box3 {
  const bounds = new Box3();
  const anchor = new Vector3(...element.anchor);
  const rotation = new Quaternion();
  const matrix = new Matrix4();
  const volume = new Box3();
  for (const piece of element.primitives) {
    const position = new Vector3(...piece.position).add(anchor);
    rotation.setFromEuler(new Euler(...(piece.rotation ?? [0, 0, 0])));
    matrix.compose(position, rotation, new Vector3(...piece.size));
    bounds.union(volume.copy(getUnitBounds(piece.shape)).applyMatrix4(matrix));
  }
  return bounds;
}
