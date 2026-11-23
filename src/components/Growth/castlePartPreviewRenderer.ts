import { Euler, Vector3 } from 'three';
import { createCastleGeometry, getCastleElement, type CastleShape, type CastleVector } from './castleModel';
import {
  CASTLE_MATERIAL_COLORS, CASTLE_PATTERN_KEYS, drawCastleTile, type CastleMaterial, type CastlePattern,
} from './castleTextures';

type Point = [number, number];
type PreviewFace = {
  points: [Point, Point, Point];
  material: CastleMaterial;
  depth: number;
  light: number;
  support: boolean;
};
const project = (point: Vector3): Point => [(point.x - point.z) * .866, (point.x + point.z) * .4 - point.y];
const previewMeshes = new Map<CastleShape, CastleVector[]>();
const previews = new Map<string, PreviewFace[]>();
const tilesByDocument = new WeakMap<Document, Map<CastlePattern, HTMLCanvasElement>>();
const patternKeys = new Set<CastleMaterial>(CASTLE_PATTERN_KEYS);

function meshTriangles(shape: CastleShape) {
  let triangles = previewMeshes.get(shape);
  if (!triangles) {
    const geometry = createCastleGeometry(shape);
    const vertices = geometry.getAttribute('position');
    const index = geometry.getIndex();
    triangles = Array.from({ length: index?.count ?? vertices.count }, (_, offset): CastleVector => {
      const i = index?.getX(offset) ?? offset;
      return [vertices.getX(i), vertices.getY(i), vertices.getZ(i)];
    });
    previewMeshes.set(shape, triangles);
    geometry.dispose();
  }
  return triangles;
}

/** Project the scene's own unit meshes in a fixed isometric view. */
export function getCastlePreview(assetId: string): PreviewFace[] {
  const cached = previews.get(assetId);
  if (cached) return cached;
  const element = getCastleElement(assetId);
  if (!element) return [];
  const faces: PreviewFace[] = [];
  const toCamera = new Vector3(1, .8, 1);
  const toKeyLight = new Vector3(-.38, .67, .63).normalize();
  const normal = new Vector3(), edge = new Vector3();
  for (const piece of element.primitives) {
    const rotation = new Euler(...(piece.rotation ?? [0, 0, 0]));
    const scale = new Vector3(...piece.size);
    const position = new Vector3(...piece.position);
    const vertices = meshTriangles(piece.shape).map(vertex =>
      new Vector3(...vertex).multiply(scale).applyEuler(rotation).add(position));
    for (let i = 0; i < vertices.length; i += 3) {
      const [a, b, c] = [vertices[i], vertices[i + 1], vertices[i + 2]];
      normal.subVectors(b, a).cross(edge.subVectors(c, a));
      if (normal.dot(toCamera) <= 1e-7) continue;
      faces.push({
        points: [project(a), project(b), project(c)],
        material: piece.material,
        depth: (toCamera.dot(a) + toCamera.dot(b) + toCamera.dot(c)) / 3,
        light: .18 - .35 * normal.normalize().dot(toKeyLight),
        support: piece.material === 'stone' && piece.position[1] + piece.size[1] / 2 <= .05,
      });
    }
  }
  faces.sort((first, second) => first.depth - second.depth);
  previews.set(assetId, faces);
  return faces;
}

function getPattern(context: CanvasRenderingContext2D, material: CastleMaterial) {
  const key = material === 'stallionPelt' ? 'mastiffPelt' : material;
  if (!patternKeys.has(key)) return null;
  const patternKey = key as CastlePattern;
  const owner = context.canvas.ownerDocument;
  let tiles = tilesByDocument.get(owner);
  if (!tiles) {
    tiles = new Map();
    tilesByDocument.set(owner, tiles);
  }
  let tile = tiles.get(patternKey);
  if (!tile) {
    tile = drawCastleTile(owner.createElement('canvas'), patternKey);
    tiles.set(patternKey, tile);
  }
  const pattern = context.createPattern(tile, 'repeat');
  if (typeof DOMMatrix !== 'undefined') pattern?.setTransform(new DOMMatrix().scale(.31));
  return pattern;
}

export function drawCastlePartPreview(context: CanvasRenderingContext2D, assetId: string) {
  const { width, height } = context.canvas;
  const faces = getCastlePreview(assetId);
  context.clearRect(0, 0, width, height);
  if (faces.length === 0) return;
  const subjects = faces.filter(face => !face.support);
  const points = (subjects.length > 0 ? subjects : faces).flatMap(face => face.points);
  const left = Math.min(...points.map(point => point[0]));
  const right = Math.max(...points.map(point => point[0]));
  const top = Math.min(...points.map(point => point[1]));
  const bottom = Math.max(...points.map(point => point[1]));
  const scale = Math.min((width - 28) / Math.max(right - left, .1), (height - 32) / Math.max(bottom - top, .1));
  const offsetX = width / 2 - (left + right) * scale / 2;
  const offsetY = height / 2 - (top + bottom) * scale / 2;
  const fills = new Map<CastleMaterial, CanvasPattern | string>();
  for (const face of faces) {
    let fill = fills.get(face.material);
    if (!fill) {
      fill = getPattern(context, face.material) ?? CASTLE_MATERIAL_COLORS[face.material];
      fills.set(face.material, fill);
    }
    const [[ax, ay], [bx, by], [cx, cy]] = face.points;
    context.beginPath();
    context.moveTo(ax * scale + offsetX, ay * scale + offsetY);
    context.lineTo(bx * scale + offsetX, by * scale + offsetY);
    context.lineTo(cx * scale + offsetX, cy * scale + offsetY);
    context.closePath();
    context.fillStyle = fill;
    context.fill();
    if (face.material === 'flame' || face.material === 'ember') continue;
    context.fillStyle = face.light > 0 ? '#101727' : '#fff1db';
    context.globalAlpha = Math.abs(face.light);
    context.fill();
    context.globalAlpha = 1;
  }
}
