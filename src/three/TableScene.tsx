import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Sparkles, Environment, Lightformer } from '@react-three/drei';
import { RoundedBoxGeometry } from 'three-stdlib';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { ELEMENTS } from '../data';
import { CATEGORY_BY_ID } from '../data/categories';
import type { CategoryId } from '../data/types';
import { setZapStage } from '../lib/zapStage';
import { atlasOffset, drawAtlas, ATLAS_COLS, PLACEHOLDER_AC, PLACEHOLDER_LA } from './labelAtlas';

export interface TableSceneProps {
  onSelect: (z: number) => void;
  onHover: (z: number | null) => void;
  highlight: CategoryId | null;
  matches: Set<number> | null;
  selectedZ: number | null;
  motion: boolean;
  low: boolean;
  highContrast: boolean;
  locked: boolean;
  resetKey: number;
  paused: boolean;
  onContextLost: () => void;
}

const SX = 1.12;
const SY = 1.22;
const TILE_W = 1.0;
const TILE_H = 1.1;
const TILE_D = 0.32;
const COUNT = ELEMENTS.length + 2; // + 2 placeholder tiles

function layout() {
  const pos: THREE.Vector3[] = [];
  const colors: THREE.Color[] = [];
  const toXY = (col: number, row: number) => {
    const r = row <= 7 ? row : row + 0.45;
    return new THREE.Vector3((col - 9.5) * SX, -(r - 5.72) * SY, 0);
  };
  ELEMENTS.forEach((e) => {
    pos.push(toXY(e.col, e.row));
    colors.push(new THREE.Color(CATEGORY_BY_ID[e.category].color));
  });
  pos.push(toXY(3, 6), toXY(3, 7));
  colors.push(new THREE.Color(CATEGORY_BY_ID.lanthanide.color), new THREE.Color(CATEGORY_BY_ID.actinide.color));
  return { pos, colors };
}

const labelVert = /* glsl */ `
  attribute vec2 uvOffset;
  attribute float dim;
  varying vec2 vUv;
  varying float vDim;
  void main() {
    vUv = uvOffset + uv / ${ATLAS_COLS.toFixed(1)};
    vDim = dim;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;
const labelFrag = /* glsl */ `
  uniform sampler2D atlas;
  varying vec2 vUv;
  varying float vDim;
  void main() {
    vec4 c = texture2D(atlas, vUv);
    if (c.a < 0.04) discard;
    gl_FragColor = vec4(c.rgb, c.a * vDim);
    #include <colorspace_fragment>
  }
`;

function Tiles(props: TableSceneProps) {
  const { onSelect, onHover, highlight, matches, selectedZ, motion, highContrast, low } = props;
  const body = useRef<THREE.InstancedMesh>(null);
  const outline = useRef<THREE.InstancedMesh>(null);
  const labels = useRef<THREE.InstancedMesh>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const { pos, colors } = useMemo(layout, []);
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);

  const geo = useMemo(() => new RoundedBoxGeometry(TILE_W, TILE_H, TILE_D, 3, 0.12), []);
  const labelAttrs = useMemo(() => {
    const uv = new Float32Array(COUNT * 2);
    for (let i = 0; i < COUNT; i++) {
      const [u, v] = atlasOffset(i < ELEMENTS.length ? i : i === ELEMENTS.length ? PLACEHOLDER_LA : PLACEHOLDER_AC);
      uv[i * 2] = u;
      uv[i * 2 + 1] = v;
    }
    return { uv: new THREE.InstancedBufferAttribute(uv, 2), dim: new THREE.InstancedBufferAttribute(new Float32Array(COUNT).fill(1), 1) };
  }, []);
  const planeGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(TILE_W * 0.96, TILE_H * 0.96);
    g.setAttribute('uvOffset', labelAttrs.uv);
    g.setAttribute('dim', labelAttrs.dim);
    return g;
  }, [labelAttrs]);
  const atlas = useMemo(() => drawAtlas(highContrast, gl.capabilities.maxTextureSize), [highContrast, gl]);
  const labelMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { atlas: { value: atlas } },
        vertexShader: labelVert,
        fragmentShader: labelFrag,
        transparent: true,
        depthWrite: false,
      }),
    [atlas],
  );

  // Redraw labels once web fonts are ready (first draw may use fallback fonts).
  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (cancelled) return;
      const fresh = drawAtlas(highContrast, gl.capabilities.maxTextureSize);
      labelMat.uniforms.atlas.value = fresh;
      invalidate();
    });
    return () => {
      cancelled = true;
    };
  }, [highContrast, gl, labelMat, invalidate]);



  // Static colours
  useLayoutEffect(() => {
    const b = body.current!;
    const o = outline.current!;
    const dark = new THREE.Color('#14081c');
    for (let i = 0; i < COUNT; i++) {
      const isPlaceholder = i >= ELEMENTS.length;
      const faceColor = highContrast ? colors[i].clone() : colors[i].clone().lerp(dark, isPlaceholder ? 0.85 : 0.55);
      b.setColorAt(i, faceColor);
      o.setColorAt(i, colors[i]);
    }
    b.instanceColor!.needsUpdate = true;
    o.instanceColor!.needsUpdate = true;
    invalidate();
  }, [colors, highContrast, invalidate]);

  // Current animated state per tile
  const anim = useMemo(() => Array.from({ length: COUNT }, () => ({ lift: 0, scale: 1 })), []);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), so: new THREE.Vector3() }), []);

  useEffect(() => {
    invalidate();
  }, [highlight, matches, selectedZ, hovered, invalidate]);

  // Let Zap the mascot find tiles on screen and bounce on them.
  const poke = useRef({ i: -1, at: 0 });
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const corner = new THREE.Vector3();
    setZapStage({
      visitable: () => ELEMENTS.filter((e) => !(highlight && e.category !== highlight) && !(matches && !matches.has(e.z))).map((e) => e.z),
      tileBox(z) {
        const i = z - 1;
        if (!pos[i]) return null;
        const rect = gl.domElement.getBoundingClientRect();
        const box = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          corner.set(pos[i].x + (sx * TILE_W) / 2, pos[i].y + (sy * TILE_H) / 2, TILE_D / 2 + anim[i].lift).project(camera);
          if (corner.z > 1) return null;
          const x = rect.left + ((corner.x + 1) / 2) * rect.width;
          const y = rect.top + ((1 - corner.y) / 2) * rect.height;
          box.left = Math.min(box.left, x);
          box.right = Math.max(box.right, x);
          box.top = Math.min(box.top, y);
          box.bottom = Math.max(box.bottom, y);
        }
        const inside = box.left >= rect.left && box.right <= rect.right && box.top >= rect.top && box.bottom <= rect.bottom;
        return inside ? box : null;
      },
      poke(z) {
        poke.current = { i: z - 1, at: performance.now() };
        invalidate();
      },
    });
    return () => setZapStage(null);
  }, [anim, camera, gl, highlight, invalidate, matches, pos]);

  useFrame((state, delta) => {
    const b = body.current;
    const o = outline.current;
    const l = labels.current;
    if (!b || !o || !l) return;
    const t = state.clock.elapsedTime;
    const k = motion ? Math.min(1, delta * 10) : 1;
    let moving = false;
    // A poke is a quick dip (he lands) followed by a pop (the tile springs back).
    const pokeAge = (performance.now() - poke.current.at) / 1000;
    const pokeLift = pokeAge < 0.14 ? -0.4 : pokeAge < 0.6 ? 0.5 : null;
    if (pokeAge < 0.9) moving = true;
    for (let i = 0; i < COUNT; i++) {
      const z = i + 1;
      const isEl = i < ELEMENTS.length;
      const el = isEl ? ELEMENTS[i] : null;
      const dimmed = isEl && ((highlight && el!.category !== highlight) || (matches && !matches.has(z)));
      const active = isEl && (hovered === i || selectedZ === z);
      const targetLift = pokeLift !== null && poke.current.i === i ? pokeLift : active ? 0.45 : dimmed ? -0.35 : 0;
      const targetScale = active ? 1.12 : dimmed ? 0.88 : 1;
      const a = anim[i];
      a.lift += (targetLift - a.lift) * k;
      a.scale += (targetScale - a.scale) * k;
      if (Math.abs(targetLift - a.lift) > 0.002 || Math.abs(targetScale - a.scale) > 0.002) moving = true;
      const float = motion ? Math.sin(t * 0.9 + i * 0.37) * 0.06 : 0;
      tmp.p.copy(pos[i]);
      tmp.p.z += a.lift + float;
      tmp.q.identity();
      tmp.s.setScalar(a.scale);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      b.setMatrixAt(i, tmp.m);
      tmp.so.setScalar(a.scale * (active ? 1.1 : 1.045));
      tmp.m.compose(tmp.p, tmp.q, tmp.so);
      o.setMatrixAt(i, tmp.m);
      tmp.p.z += (TILE_D / 2) * a.scale + 0.008;
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      l.setMatrixAt(i, tmp.m);
      labelAttrs.dim.setX(i, dimmed ? 0.35 : 1);
    }
    b.instanceMatrix.needsUpdate = true;
    // Bounding sphere is cached by three.js; reset it so raycasts use the current tile positions.
    b.boundingSphere = null;
    o.instanceMatrix.needsUpdate = true;
    l.instanceMatrix.needsUpdate = true;
    labelAttrs.dim.needsUpdate = true;
    if (!motion && moving) state.invalidate();
  });

  const pick = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const id = e.instanceId;
    return id != null && id < ELEMENTS.length ? id : null;
  };

  return (
    <group>
      <instancedMesh
        ref={body}
        args={[geo, undefined, COUNT]}
        onPointerMove={(e) => {
          e.stopPropagation();
          const id = pick(e);
          if (id !== hovered) {
            setHovered(id);
            onHover(id == null ? null : id + 1);
          }
        }}
        onPointerOut={() => {
          setHovered(null);
          onHover(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          // Ignore drags (orbiting) – only real taps select.
          if (e.delta > 8) return;
          const id = pick(e);
          if (id != null) onSelect(id + 1);
        }}
      >
        <meshStandardMaterial metalness={0.55} roughness={low ? 0.4 : 0.22} envMapIntensity={1.2} />
      </instancedMesh>
      <instancedMesh ref={outline} args={[geo, undefined, COUNT]} raycast={() => null}>
        <meshBasicMaterial side={THREE.BackSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={labels} args={[planeGeo, undefined, COUNT]} material={labelMat} raycast={() => null} renderOrder={2} />
    </group>
  );
}

const floorFrag = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 60.0;
    float checker = mod(floor(p.x) + floor(p.y), 2.0);
    vec3 pink = vec3(1.0, 0.08, 0.58) * 0.32;
    vec3 black = vec3(0.03, 0.02, 0.04);
    vec3 col = mix(black, pink, checker);
    vec2 g = abs(fract(p) - 0.5);
    float line = smoothstep(0.47, 0.5, max(g.x, g.y));
    col += vec3(0.0, 0.96, 1.0) * line * 0.35;
    float fade = 1.0 - smoothstep(0.08, 0.5, distance(vUv, vec2(0.5)));
    gl_FragColor = vec4(col * fade, 1.0);
  }
`;
const floorVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

function Floor() {
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: floorVert, fragmentShader: floorFrag }), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -7.6, 0]} material={mat}>
      <planeGeometry args={[90, 90]} />
    </mesh>
  );
}

function CameraRig({ resetKey, locked }: { resetKey: number; locked: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const invalidate = useThree((s) => s.invalidate);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    // Fit the 18-column table to the viewport width (or height on tall screens).
    const aspect = size.width / size.height;
    const halfW = 10.4;
    const halfH = 6.6;
    const vFov = (camera.fov * Math.PI) / 180;
    const distH = halfH / Math.tan(vFov / 2);
    const distW = halfW / (Math.tan(vFov / 2) * aspect);
    const dist = Math.max(distH, distW) * 1.02;
    camera.position.set(0, locked ? 0 : -0.8, dist);
    const fog = scene.fog as THREE.Fog | null;
    if (fog) {
      fog.near = dist + 8;
      fog.far = dist + 50;
    }
    camera.lookAt(0, 0, 0);
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.maxDistance = dist * 1.6;
      controls.update();
    }
    invalidate();
  }, [resetKey, locked, size.width, size.height, camera, controls, invalidate, scene]);
  return null;
}

export default function TableScene(props: TableSceneProps) {
  const { motion, low, locked, resetKey, paused, onContextLost } = props;
  return (
    <Canvas
      dpr={low ? [1, 1.5] : [1, 2]}
      frameloop={motion && !paused ? 'always' : 'demand'}
      camera={{ fov: 42, near: 0.1, far: 200, position: [0, 0, 26] }}
      gl={{ antialias: !low, powerPreference: 'high-performance', alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor('#050307');
        gl.domElement.addEventListener('webglcontextlost', (ev) => {
          ev.preventDefault();
          onContextLost();
        });
      }}
      aria-hidden="true"
    >
      <fog attach="fog" args={['#050307', 28, 70]} />
      <ambientLight intensity={0.35} />
      {/* pink / cyan rim lights */}
      <directionalLight position={[-12, 8, 10]} intensity={2.2} color="#ff1493" />
      <directionalLight position={[12, -6, 10]} intensity={2.0} color="#00f5ff" />
      <directionalLight position={[0, 4, 14]} intensity={1.1} color="#ffffff" />
      {/* Local, generated environment for glossy/iridescent reflections – no downloads */}
      <Environment resolution={low ? 32 : 64} frames={1}>
        <Lightformer form="rect" intensity={3} color="#ff1493" position={[-6, 3, 6]} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={3} color="#00f5ff" position={[6, -2, 6]} scale={[8, 3, 1]} />
        <Lightformer form="ring" intensity={2} color="#b6ff00" position={[0, 6, 4]} scale={3} />
        <Lightformer form="rect" intensity={1.5} color="#9d00ff" position={[0, 0, -8]} scale={[20, 10, 1]} />
      </Environment>
      <Tiles {...props} />
      <Floor />
      {!low && motion && (
        // Decorative sparkles live behind the table so they never cross text.
        <Sparkles count={50} scale={[26, 14, 2]} position={[0, 0, -4]} size={3} speed={0.25} color="#ff7fd1" />
      )}
      <OrbitControls
        makeDefault
        enableRotate={!locked}
        enablePan
        enableZoom
        minDistance={6}
        maxDistance={40}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.62}
        minAzimuthAngle={-Math.PI / 3}
        maxAzimuthAngle={Math.PI / 3}
        enableDamping={motion}
        screenSpacePanning
        // In the locked straight-on view, one finger / left mouse slides the table instead of spinning it.
        mouseButtons={locked ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN } : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
        touches={locked ? { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN } : { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      />
      <CameraRig resetKey={resetKey} locked={locked} />
    </Canvas>
  );
}
