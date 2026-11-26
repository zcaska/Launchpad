import * as THREE from 'three';
import { CASTLE_ELEMENTS, createCastleGeometry, getCastleElementBounds, type CastleShape, type ModelPrimitive } from './castleModel';
import { createCastleMaterials } from './castleTextures';

export type CastleCameraCommand = 'left' | 'right' | 'in' | 'out' | 'reset' | 'pan-up' | 'pan-down' | 'pan-left' | 'pan-right';

/** Move the look target in camera space while keeping it within the castle grounds. */
export function panCastleTarget(
  target: THREE.Vector3,
  center: THREE.Vector3,
  yaw: number,
  pitch: number,
  dx: number,
  dy: number,
  maxOffset: number,
) {
  const view = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const up = new THREE.Vector3().crossVectors(view, right).normalize();
  const next = target.clone().addScaledVector(right, dx).addScaledVector(up, dy);
  const offset = next.clone().sub(center);
  if (offset.length() > maxOffset) next.copy(center).add(offset.setLength(maxOffset));
  return next;
}

export function getCastleInspectionFrame(bounds: THREE.Box3) {
  return {
    center: bounds.getCenter(new THREE.Vector3()),
    radius: Math.max(0.4, bounds.getBoundingSphere(new THREE.Sphere()).radius),
  };
}

function fitOverview(
  bounds: Iterable<THREE.Box3>,
  center: THREE.Vector3,
  yaw: number,
  pitch: number,
  camera: THREE.PerspectiveCamera,
) {
  const view = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const up = new THREE.Vector3().crossVectors(view, right);
  // Reserve a small edge margin while letting the fortress use more of the full-page viewport.
  const tanVertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.95;
  const tanHorizontal = tanVertical * camera.aspect;
  const point = new THREE.Vector3();
  let distance = 1;
  for (const box of bounds) {
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          point.set(x, y, z).sub(center);
          distance = Math.max(distance, point.dot(view) + Math.max(
            Math.abs(point.dot(right)) / tanHorizontal, Math.abs(point.dot(up)) / tanVertical,
          ));
        }
      }
    }
  }
  return distance;
}

export function mountCastleScene(
  container: HTMLElement,
  initialOwnership: readonly string[],
  onInspect: (id: string) => void,
  onContextLoss: () => void,
  onContextRestore: () => void,
) {
  const releases: (() => void)[] = [];
  let frame = 0;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    for (const release of releases.reverse()) release();
  };
  try {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    releases.push(() => { renderer.dispose(); canvas.remove(); });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1322);
    scene.fog = new THREE.FogExp2(0x0c1322, 0.024);
    const assets = new THREE.Group();
    scene.add(assets);
    const boundsById = new Map(CASTLE_ELEMENTS.map(element => [element.id, getCastleElementBounds(element)]));
    const closeupBounds = new Map(CASTLE_ELEMENTS.flatMap(element => {
      if (element.anchor[1] < 1.5) return [];
      const primitives = element.primitives.filter(item => item.position[1] >= -0.4);
      if (!primitives.length) return [];
      return [[element.id, getCastleElementBounds({ ...element, primitives })] as const];
    }));
    const worldBounds = new THREE.Box3();
    for (const bounds of boundsById.values()) worldBounds.union(bounds);
    const world = getCastleInspectionFrame(worldBounds);
    const span = worldBounds.getSize(new THREE.Vector3());
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, world.radius * 12);
    const selection = new THREE.Box3Helper(new THREE.Box3(), 0x79f7eb);
    Object.assign(selection.material, {
      depthTest: false, depthWrite: false, transparent: true, fog: false, toneMapped: false,
    });
    selection.renderOrder = 2;
    selection.visible = false;
    scene.add(selection);
    releases.push(() => selection.dispose());

    const textures = createCastleMaterials();
    releases.push(textures.dispose);
    const phantom = new THREE.MeshStandardMaterial({
      color: 0x425165, roughness: 0.95, metalness: 0.04,
      emissive: 0x1c2b40, emissiveIntensity: 0.45,
      transparent: true, opacity: 0.58, depthWrite: false,
    });
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x192431, roughness: 1 });
    const groundGeometry = new THREE.CylinderGeometry(1, 0.84, 0.9, 64);
    releases.push(() => { phantom.dispose(); groundMaterial.dispose(); groundGeometry.dispose(); });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.set(world.center.x, Math.min(-0.55, worldBounds.min.y - 0.35), world.center.z);
    ground.scale.set(span.x * 0.59, 1, span.z * 0.59);
    ground.receiveShadow = true;
    scene.add(ground);

    const ambient = new THREE.HemisphereLight(0xb9d2f5, 0x55483d, 2.7);
    scene.add(ambient);
    const moon = new THREE.DirectionalLight(0xe2edff, 3.8);
    moon.position.set(-14, 22, 16);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    moon.shadow.camera.left = moon.shadow.camera.bottom = -world.radius;
    moon.shadow.camera.right = moon.shadow.camera.top = world.radius;
    moon.shadow.camera.far = world.radius * 4;
    moon.shadow.normalBias = 0.035;
    scene.add(moon);
    releases.push(() => moon.shadow.dispose());
    const fill = new THREE.DirectionalLight(0xffdca0, 1.8);
    fill.position.set(world.radius * 1.4, world.radius * 0.85, -world.radius * 1.8);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0x9ccfff, 1.35);
    rim.position.set(world.radius * 1.7, world.radius * 1.3, world.radius * 0.3);
    scene.add(rim);

    const geometries = new Map<CastleShape, THREE.BufferGeometry>();
    releases.push(() => geometries.forEach(geometry => geometry.dispose()));
    const geometryFor = (shape: CastleShape) => {
      let geometry = geometries.get(shape);
      if (!geometry) {
        geometry = createCastleGeometry(shape);
        geometries.set(shape, geometry);
      }
      return geometry;
    };
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const beacons = new Map<string, { mesh: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>; started: number }>();
    const beaconGeometry = new THREE.CylinderGeometry(0.55, 0.09, 7, 12, 1, true);
    const removeBeacon = (id: string) => {
      const beacon = beacons.get(id);
      if (!beacon) return;
      scene.remove(beacon.mesh);
      beacon.mesh.material.dispose();
      beacons.delete(id);
    };
    releases.push(() => { beacons.forEach((_, id) => removeBeacon(id)); beaconGeometry.dispose(); });
    const flash = (id: string) => {
      const bounds = boundsById.get(id);
      if (!bounds || motionPreference.matches) return;
      removeBeacon(id);
      const material = new THREE.MeshBasicMaterial({
        color: 0xf5c565, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(beaconGeometry, material);
      mesh.position.copy(bounds.getCenter(new THREE.Vector3()));
      mesh.position.y = bounds.max.y + 3;
      scene.add(mesh);
      beacons.set(id, { mesh, started: performance.now() });
    };

    let owned = new Set<string>();
    let dirty = true;
    const updateTheme = () => {
      const light = !document.documentElement.classList.contains('dark');
      const background = light ? 0xdce8ea : 0x0c1322;
      (scene.background as THREE.Color).setHex(background);
      (scene.fog as THREE.FogExp2).color.setHex(background);
      phantom.color.setHex(light ? 0x536b70 : 0x425165);
      phantom.emissive.setHex(light ? 0x536b70 : 0x1c2b40);
      phantom.opacity = light ? 0.6 : 0.58;
      groundMaterial.color.setHex(light ? 0x9aadaa : 0x192431);
      ambient.color.setHex(light ? 0xf0f8f6 : 0xb9d2f5);
      ambient.groundColor.setHex(light ? 0xa6b2a8 : 0x55483d);
      moon.color.setHex(light ? 0xfff2d8 : 0xe2edff);
      dirty = true;
    };
    updateTheme();
    const themeObserver = new MutationObserver(updateTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    releases.push(() => themeObserver.disconnect());
    let hasWater = false;
    const onMotionChange = () => { dirty = true; };
    motionPreference.addEventListener('change', onMotionChange);
    releases.push(() => motionPreference.removeEventListener('change', onMotionChange));
    const picks = new Map<THREE.Object3D, readonly string[]>();
    const moving: { pivot: THREE.Group; joint: NonNullable<ModelPrimitive['joint']> }[] = [];
    const clearAssets = () => {
      for (const object of picks.keys()) if (object instanceof THREE.InstancedMesh) object.dispose();
      assets.clear();
      picks.clear();
      moving.length = 0;
    };
    releases.push(clearAssets);
    const updateOwnership = (ids: readonly string[], celebrate = true) => {
      const next = new Set(ids.filter(id => boundsById.has(id)));
      if (celebrate && next.size === owned.size && [...next].every(id => owned.has(id))) return;
      if (celebrate) for (const id of next) if (!owned.has(id)) flash(id);
      for (const id of beacons.keys()) if (!next.has(id)) removeBeacon(id);
      owned = next;
      clearAssets();
      dirty = true;
      hasWater = false;
      let hasEmissiveAnimation = false;
      type Instance = { id: string; position: THREE.Vector3; primitive: ModelPrimitive };
      const batches = new Map<string, { material: THREE.Material; items: Instance[]; phantom: boolean }>();
      for (const element of CASTLE_ELEMENTS) {
        const built = owned.has(element.id);
        const anchor = new THREE.Vector3(...element.anchor);
        for (const primitive of element.primitives) {
          const material = built ? textures.materials[primitive.material] : phantom;
          if (built && primitive.material === 'water') hasWater = true;
          if (built && (primitive.material === 'flame' || primitive.material === 'ember')) hasEmissiveAnimation = true;
          const position = new THREE.Vector3(...primitive.position).add(anchor);
          const joint = primitive.joint;
          if (built && joint) {
            const pivot = new THREE.Group();
            pivot.position.set(...joint.pivot).add(anchor);
            const mesh = new THREE.Mesh(geometryFor(primitive.shape), material);
            mesh.position.copy(position).sub(pivot.position);
            mesh.scale.set(...primitive.size);
            if (primitive.rotation) mesh.rotation.set(...primitive.rotation);
            mesh.castShadow = mesh.receiveShadow = true;
            pivot.add(mesh);
            assets.add(pivot);
            picks.set(mesh, [element.id]);
            moving.push({ pivot, joint });
            continue;
          }
          const key = `${primitive.shape}:${built ? primitive.material : 'phantom'}`;
          let batch = batches.get(key);
          if (!batch) {
            batch = { material, items: [], phantom: !built };
            batches.set(key, batch);
          }
          batch.items.push({ id: element.id, position, primitive });
        }
      }
      const transform = new THREE.Object3D();
      for (const { material, items, phantom: transparent } of batches.values()) {
        const mesh = new THREE.InstancedMesh(geometryFor(items[0].primitive.shape), material, items.length);
        items.forEach(({ position, primitive }, index) => {
          transform.position.copy(position);
          transform.scale.set(...primitive.size);
          transform.rotation.set(...(primitive.rotation ?? [0, 0, 0]));
          transform.updateMatrix();
          mesh.setMatrixAt(index, transform.matrix);
        });
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.renderOrder = transparent ? 1 : 0;
        mesh.computeBoundingSphere();
        assets.add(mesh);
        picks.set(mesh, items.map(item => item.id));
      }
      assets.userData.hasEmissiveAnimation = hasEmissiveAnimation;
    };
    updateOwnership(initialOwnership, false);

    const target = world.center.clone();
    const desiredTarget = target.clone();
    let yaw = 0.57;
    let pitch = 0.42;
    let distance = 0;
    let desiredDistance = 0;
    let selectedId: string | undefined;
    let lost = false;
    let inViewport = true;
    const fitDistance = (radius: number) => {
      const halfVertical = THREE.MathUtils.degToRad(camera.fov / 2);
      const halfHorizontal = Math.atan(Math.tan(halfVertical) * camera.aspect);
      return radius / Math.sin(Math.min(halfVertical, halfHorizontal));
    };
    const inspect = (id: string) => {
      const bounds = boundsById.get(id);
      if (!bounds) return;
      selectedId = id;
      dirty = true;
      selection.box.copy(bounds).expandByScalar(0.08);
      selection.visible = true;
      const framing = getCastleInspectionFrame(closeupBounds.get(id) ?? bounds);
      desiredTarget.copy(framing.center);
      desiredDistance = Math.max(3.2, fitDistance(framing.radius) * 1.1);
    };
    const reset = () => {
      selectedId = undefined;
      selection.visible = false;
      yaw = 0.57;
      pitch = 0.42;
      desiredTarget.copy(world.center);
      desiredDistance = fitOverview(boundsById.values(), world.center, yaw, pitch, camera);
      dirty = true;
    };
    const command = (action: CastleCameraCommand) => {
      if (action === 'reset') reset();
      if (action === 'left') yaw -= 0.22;
      if (action === 'right') yaw += 0.22;
      if (action === 'in') desiredDistance = Math.max(2, desiredDistance * 0.85);
      if (action === 'out') desiredDistance = Math.min(fitDistance(world.radius) * 1.4, desiredDistance * 1.18);
      if (action.startsWith('pan-')) {
        const step = Math.max(0.12, distance * 0.055);
        const dx = action === 'pan-left' ? -step : action === 'pan-right' ? step : 0;
        const dy = action === 'pan-up' ? step : action === 'pan-down' ? -step : 0;
        desiredTarget.copy(panCastleTarget(desiredTarget, world.center, yaw, pitch, dx, dy, world.radius * 0.85));
      }
      dirty = true;
    };
    const resize = () => {
      if (lost || !container.clientWidth || !container.clientHeight) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      const firstLayout = distance === 0;
      const oldFit = fitDistance(world.radius);
      renderer.setSize(width, height, false);
      dirty = true;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (selectedId) inspect(selectedId);
      else if (firstLayout) reset();
      else desiredDistance *= fitDistance(world.radius) / oldFit;
      if (firstLayout) distance = desiredDistance;
    };
    reset();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    releases.push(() => resizeObserver.disconnect());
    resize();
    const visibilityObserver = new IntersectionObserver(entries => {
      inViewport = entries[0]?.isIntersecting ?? true;
      dirty = true;
    });
    visibilityObserver.observe(container);
    releases.push(() => visibilityObserver.disconnect());

    const clickable = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let pointer: { id: number; startX: number; startY: number; x: number; y: number; dragged: boolean } | undefined;
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || pointer) return;
      pointer = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, dragged: false };
      canvas.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      pointer.dragged ||= Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 5;
      if (pointer.dragged) {
        dirty = true;
        yaw -= (event.clientX - pointer.x) * 0.008;
        pitch = THREE.MathUtils.clamp(pitch + (event.clientY - pointer.y) * 0.006, 0.12, 1.35);
      }
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };
    const cancel = (event: PointerEvent) => { if (pointer?.id === event.pointerId) pointer = undefined; };
    const up = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      const dragged = pointer.dragged;
      pointer = undefined;
      if (dragged || lost) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointerNdc.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
      clickable.setFromCamera(pointerNdc, camera);
      const hit = clickable.intersectObject(assets, true)[0];
      const id = hit && picks.get(hit.object)?.[hit.instanceId ?? 0];
      if (id) { inspect(id); onInspect(id); }
    };
    const wheel = (event: WheelEvent) => {
      if (lost || (!event.deltaX && !event.deltaY)) return;
      event.preventDefault();
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? container.clientHeight : 1;
      const deltaX = event.deltaX * unit;
      const deltaY = event.deltaY * unit;
      if (event.shiftKey || event.ctrlKey) {
        desiredDistance = THREE.MathUtils.clamp(desiredDistance * Math.exp((deltaY || deltaX) * 0.001), 2, fitDistance(world.radius) * 1.4);
      } else {
        const scale = Math.max(0.0012, distance * 0.0012);
        desiredTarget.copy(panCastleTarget(
          desiredTarget, world.center, yaw, pitch,
          -deltaX * scale, -deltaY * scale, world.radius * 0.85,
        ));
      }
      dirty = true;
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      cancelAnimationFrame(frame);
      onContextLoss();
    };
    const listen = <K extends keyof HTMLElementEventMap>(name: K, handler: (event: HTMLElementEventMap[K]) => void, options?: AddEventListenerOptions) => {
      canvas.addEventListener(name, handler, options);
      releases.push(() => canvas.removeEventListener(name, handler, options));
    };
    listen('pointerdown', down);
    listen('pointermove', move);
    listen('pointerup', up);
    listen('pointercancel', cancel);
    listen('lostpointercapture', cancel);
    listen('wheel', wheel, { passive: false });
    canvas.addEventListener('webglcontextlost', contextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestore);
    releases.push(() => {
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestore);
    });

    let lastTime = performance.now();
    let elapsed = 0;
    const tick = (now: number) => {
      if (lost || disposed) return;
      frame = requestAnimationFrame(tick);
      const dt = Math.min(0.075, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      if (!inViewport || document.hidden || !distance) return;
      const reduced = motionPreference.matches;
      const transitioning = Math.abs(distance - desiredDistance) > 0.002 || target.distanceToSquared(desiredTarget) > 0.000004;
      if (!dirty && !transitioning && !beacons.size && (reduced || (!moving.length && !hasWater && !assets.userData.hasEmissiveAnimation))) return;
      dirty = false;
      const easing = reduced ? 1 : 1 - Math.exp(-dt * 8);
      distance = THREE.MathUtils.lerp(distance, desiredDistance, easing);
      target.lerp(desiredTarget, easing);
      camera.position.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))
        .multiplyScalar(distance).add(target);
      camera.lookAt(target);
      if (!reduced) elapsed += dt;
      for (const { pivot, joint } of moving) {
        pivot.rotation[joint.axis] = reduced ? 0 : Math.sin(elapsed * joint.speed + (joint.phase ?? 0)) * joint.amplitude;
      }
      textures.waterTexture.offset.set(elapsed * 0.035 % 1, elapsed * 0.016 % 1);
      textures.materials.flame.emissiveIntensity = reduced ? 1.4 : 1.15 + Math.sin(elapsed * 4.2) * 0.32;
      textures.materials.ember.emissiveIntensity = reduced ? 1.8 : 1.55 + Math.sin(elapsed * 2.6 + 0.8) * 0.4;
      for (const [id, beacon] of beacons) {
        const life = (now - beacon.started) / 850;
        if (reduced || life >= 1) removeBeacon(id);
        else beacon.mesh.material.opacity = Math.sin(life * Math.PI) * 0.72;
      }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(tick);
    return { updateOwnership, inspect, command, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
