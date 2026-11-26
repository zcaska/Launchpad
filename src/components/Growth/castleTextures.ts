import {
  CanvasTexture, MeshPhongMaterial, MeshStandardMaterial, NoColorSpace,
  RepeatWrapping, SRGBColorSpace,
} from 'three';

export const CASTLE_PATTERN_KEYS = [
  'stone', 'timber', 'slate', 'gold', 'water', 'banner', 'mastiffPelt',
  'catPelt', 'falconFeather', 'wyvernScale',
] as const;
export type CastlePattern = typeof CASTLE_PATTERN_KEYS[number];
export type CastleMaterial = CastlePattern | 'iron' | 'stallionPelt' | 'glass' | 'flame' | 'ember' | 'greenery';
type SurfaceChannel = 'color' | 'bump' | 'roughness' | 'specular';
export type CastleCanvasFactory = () => HTMLCanvasElement;
export const CASTLE_TILE_SIZE = 128;

export const CASTLE_MATERIAL_COLORS: Record<CastleMaterial, string> = {
  stone: '#918779', timber: '#614329', slate: '#425477', gold: '#d9ae61',
  water: '#216781', banner: '#73375d', mastiffPelt: '#745541', catPelt: '#e9d8bc',
  falconFeather: '#737f83', wyvernScale: '#424752', iron: '#39404c',
  stallionPelt: '#704337', glass: '#638dbf', flame: '#ffaf58', ember: '#79deff', greenery: '#657d46',
};

const palettes: Record<CastlePattern, readonly string[]> = {
  stone: ['#47434b', '#948b84', '#827d79', '#726b6e', '#a69b88'],
  timber: ['#352521', '#6b4e32', '#553722', '#7b593a', '#553e38'],
  slate: ['#202a3d', '#374763', '#455673', '#303f5a', '#506789'],
  gold: ['#b48743', '#dfbb75', '#f3d591', '#a27439', '#795129'],
  water: ['#183249', '#337b94', '#518c9e', '#265a79', '#82b0b6'],
  banner: ['#51233e', '#763d60', '#884767', '#663153', '#cb9c58'],
  mastiffPelt: ['#6c5341', '#45352d', '#8e6d50', '#545047', '#302c2d'],
  catPelt: ['#eee4d0', '#c47a3f', '#423d46', '#f7efe0', '#b1866c'],
  falconFeather: ['#475363', '#798391', '#34414e', '#a5a6a0', '#5d6b76'],
  wyvernScale: ['#222531', '#414955', '#535766', '#373d48', '#6c6660'],
};

/** Shared pattern source. Surface data repeats the color tile's feature placement. */
export function drawCastleTile(
  canvas: HTMLCanvasElement, key: CastlePattern, channel: SurfaceChannel = 'color',
) {
  const size = CASTLE_TILE_SIZE;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not initialize castle texture canvas');
  let seed = 7919 * (CASTLE_PATTERN_KEYS.indexOf(key) + 1);
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const palette = channel === 'color' ? palettes[key]
    : channel === 'bump' ? ['#363636', '#acacac', '#a3a3a3', '#999999', '#c1c1c1']
    : channel === 'roughness' ? ['#f3f3f3', '#c2c2c2', '#d9d9d9', '#cecece', '#e0e0e0']
    : ['#282828', '#555555', '#777777', '#5f5f5f', '#8a8a8a'];
  const fill = (color: string, x: number, y: number, width: number, height: number) => {
    context.fillStyle = color;
    context.fillRect(x, y, width, height);
  };
  const stroke = (color: string, width: number) => {
    context.strokeStyle = color;
    context.lineWidth = width;
    context.stroke();
  };
  fill(palette[0], 0, 0, size, size);
  if (key === 'stone') {
    for (let row = 0; row < 8; row++) {
      for (let column = -1; column < 4; column++) {
        const x = column * 32 + (row % 2) * 16;
        const y = row * 16;
        context.beginPath();
        context.moveTo(x + 2, y + 4);
        context.lineTo(x + 6, y + 1);
        context.lineTo(x + 29, y + 1);
        context.lineTo(x + 31, y + 5);
        context.lineTo(x + 30, y + 14);
        context.lineTo(x + 3, y + 15);
        context.closePath();
        context.fillStyle = palette[1 + Math.floor(random() * 4)];
        context.fill();
        stroke(palette[3], 1);
      }
    }
  } else if (key === 'timber') {
    for (let plank = 0; plank < 8; plank++) {
      const x = plank * 16;
      fill(palette[plank % 3 + 1], x + 1, 0, 14, size);
      for (let grain = 0; grain < 6; grain++) {
        const line = x + 2 + random() * 11;
        context.beginPath();
        context.moveTo(line, 0);
        context.bezierCurveTo(line + 3, 47, line - 2, 76, line, size);
        stroke(palette[grain % 2 === 0 ? 0 : 4], .45 + random() * .6);
      }
      for (const y of [4, size - 4]) {
        context.beginPath();
        context.arc(x + 8, y, 1.8, 0, Math.PI * 2);
        context.fillStyle = channel === 'color' ? '#3f4147' : palette[4];
        context.fill();
      }
    }
  } else if (key === 'slate' || key === 'wyvernScale' || key === 'falconFeather') {
    const width = key === 'slate' ? 16 : 8;
    for (let y = -width / 2; y < size; y += width / 2) {
      for (let x = -width + (y % width === 0 ? 0 : width / 2); x < size; x += width) {
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + width, y);
        context.lineTo(x + width * .83, y + width * .38);
        context.lineTo(x + width / 2, y + width * .62);
        context.lineTo(x + width * .17, y + width * .38);
        context.closePath();
        context.fillStyle = palette[1 + Math.floor(random() * 4)];
        context.fill();
        stroke(palette[0], .75);
      }
    }
  } else if (key === 'water') {
    for (let y = -12; y < size; y += 6) {
      context.beginPath();
      context.moveTo(0, y);
      for (let x = 0; x <= size; x += 4) {
        const wave = Math.sin(x / size * Math.PI * 4 + y * .14) * 3;
        context.lineTo(x, y + wave + Math.cos(x / size * Math.PI * 6 - y * .2) * 2);
      }
      stroke(palette[1 + Math.floor(random() * 4)], .4 + random() * 1.2);
    }
  } else if (key === 'banner') {
    for (let offset = 0; offset < size; offset += 3) {
      fill(palette[2], offset, 0, 1, size);
      fill(palette[3], 0, offset, size, 1);
    }
    for (const x of [6, 12, size - 12, size - 6]) fill(palette[4], x, 0, 1, size);
    for (const y of [32, 96]) {
      context.beginPath();
      context.moveTo(64, y - 19);
      context.lineTo(76, y);
      context.lineTo(64, y + 19);
      context.lineTo(52, y);
      context.closePath();
      stroke(palette[4], 2);
    }
  } else if (key === 'catPelt') {
    for (let spot = 0; spot < 18; spot++) {
      context.beginPath();
      context.ellipse(random() * size, random() * size, 4 + random() * 17, 3 + random() * 11,
        random() * Math.PI, 0, Math.PI * 2);
      context.fillStyle = palette[1 + spot % 4];
      context.fill();
    }
  } else {
    const brushed = key === 'gold';
    for (let mark = 0; mark < (brushed ? 260 : 155); mark++) {
      const x = random() * size;
      const y = random() * size;
      const length = 3 + random() * (brushed ? 44 : 16);
      fill(palette[1 + mark % 4], x, y, length, brushed ? .65 : 1.6);
    }
  }
  if (key === 'stone' || key === 'timber' || key === 'slate' || key === 'wyvernScale') {
    for (let i = 0; i < 450; i++) {
      context.globalAlpha = .24;
      fill(palette[1 + i % 4], random() * size, random() * size, 1.5, 1);
    }
    context.globalAlpha = 1;
  }
  return canvas;
}

export function createCastleMaterials(createCanvas: CastleCanvasFactory = () => document.createElement('canvas')) {
  const textures: CanvasTexture[] = [];
  const ownedMaterials: (MeshStandardMaterial | MeshPhongMaterial)[] = [];
  const release = () => {
    for (const material of ownedMaterials.splice(0)) material.dispose();
    for (const texture of textures.splice(0)) texture.dispose();
  };
  const map = (key: CastlePattern, channel: SurfaceChannel = 'color') => {
    const texture = new CanvasTexture(drawCastleTile(createCanvas(), key, channel));
    texture.colorSpace = channel === 'color' ? SRGBColorSpace : NoColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    textures.push(texture);
    return texture;
  };
  const standard = (parameters: ConstructorParameters<typeof MeshStandardMaterial>[0]) => {
    const material = new MeshStandardMaterial(parameters);
    ownedMaterials.push(material);
    return material;
  };
  try {
    const colors = Object.fromEntries(CASTLE_PATTERN_KEYS.map(key => [key, map(key)])) as Record<CastlePattern, CanvasTexture>;
    const slate = new MeshPhongMaterial({
      map: colors.slate, bumpMap: map('slate', 'bump'), specularMap: map('slate', 'specular'),
      bumpScale: .1, shininess: 30, specular: '#809abc',
    });
    ownedMaterials.push(slate);
    const solid = (key: CastleMaterial, options: ConstructorParameters<typeof MeshStandardMaterial>[0] = {}) =>
      standard({ color: CASTLE_MATERIAL_COLORS[key], ...options });
    const materials = {
      stone: standard({ map: colors.stone, bumpMap: map('stone', 'bump'), roughnessMap: map('stone', 'roughness'), bumpScale: .13, roughness: 1 }),
      timber: standard({ map: colors.timber, bumpMap: map('timber', 'bump'), roughnessMap: map('timber', 'roughness'), bumpScale: .08, roughness: .96 }),
      slate,
      gold: standard({ map: colors.gold, bumpMap: map('gold', 'bump'), bumpScale: .035, metalness: .82, roughness: .25, emissive: '#b48434', emissiveIntensity: .15 }),
      water: standard({ map: colors.water, metalness: .18, roughness: .29, emissive: '#1d5c79', emissiveIntensity: .19 }),
      banner: standard({ map: colors.banner, roughness: .8 }),
      mastiffPelt: standard({ map: colors.mastiffPelt, roughness: .9 }),
      catPelt: standard({ map: colors.catPelt, roughness: .9 }),
      falconFeather: standard({ map: colors.falconFeather, roughness: .8 }),
      wyvernScale: standard({ map: colors.wyvernScale, bumpMap: map('wyvernScale', 'bump'), bumpScale: .09, metalness: .4, roughness: .75 }),
      iron: solid('iron', { metalness: .65, roughness: .5 }),
      stallionPelt: solid('stallionPelt', { map: colors.mastiffPelt, roughness: .9 }),
      glass: solid('glass', { metalness: .42, roughness: .26, emissive: '#3b5d92', emissiveIntensity: .33 }),
      flame: solid('flame', { emissive: '#ff6a1c', emissiveIntensity: 1.4 }),
      ember: solid('ember', { emissive: '#479de1', emissiveIntensity: 1.8 }),
      greenery: solid('greenery', { roughness: .95 }),
    } satisfies Record<CastleMaterial, MeshStandardMaterial | MeshPhongMaterial>;
    return { materials, waterTexture: colors.water, dispose: release };
  } catch (error) {
    release();
    throw error;
  }
}
