import { useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  protons: number;
  neutrons: number;
  shells: number[];
  motion: boolean;
  low: boolean;
}

/** Points packed in a ball (Fibonacci shells) for the nucleus. */
function nucleusPositions(count: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const r0 = 0.16;
  for (let i = 0; i < count; i++) {
    const radius = r0 * Math.cbrt(i + 1) * 1.15;
    // R2 low-discrepancy sequence → evenly scattered directions (no spiral artefacts)
    const y = 1 - ((i * 0.7548776662 + 0.5) % 1) * 2;
    const rr = Math.sqrt(1 - y * y);
    const theta = 2 * Math.PI * ((i * 0.5698402910 + 0.5) % 1);
    pts.push(new THREE.Vector3(Math.cos(theta) * rr * radius, y * radius, Math.sin(theta) * rr * radius));
  }
  return pts;
}

function Nucleus({ protons, neutrons, maxParticles }: { protons: number; neutrons: number; maxParticles: number }) {
  const total = protons + neutrons;
  const shown = Math.min(total, maxParticles);
  // Keep the proton:neutron ratio when we have to simplify a big nucleus.
  const shownP = Math.max(protons > 0 ? 1 : 0, Math.round((protons / Math.max(total, 1)) * shown));
  const ref = useRef<THREE.InstancedMesh>(null);
  const positions = useMemo(() => nucleusPositions(shown), [shown]);
  const geo = useMemo(() => new THREE.SphereGeometry(0.15, 16, 12), []);
  useLayoutEffect(() => {
    {
      const m = ref.current;
      if (!m) return;
      const mat = new THREE.Matrix4();
      const pink = new THREE.Color('#ff1493');
      const blue = new THREE.Color('#7fd8ff');
      positions.forEach((p, i) => {
        mat.setPosition(p);
        m.setMatrixAt(i, mat);
        // interleave protons/neutrons for a mixed look
        const isProton = (i * shownP) % shown < shownP;
        m.setColorAt(i, isProton ? pink : blue);
      });
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }, [positions, shown, shownP]);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, shown]} key={shown}>
      <meshStandardMaterial roughness={0.35} metalness={0.2} />
    </instancedMesh>
  );
}

function Shell({ index, count, radius, motion }: { index: number; count: number; radius: number; motion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const tilt = useMemo(() => new THREE.Euler(((index * 37) % 90) * (Math.PI / 180) * 0.6, ((index * 53) % 180) * (Math.PI / 180), 0), [index]);
  useFrame((_, dt) => {
    if (motion && group.current) group.current.rotation.z += dt * (0.9 / (index + 1));
  });
  return (
    <group rotation={tilt}>
      <mesh>
        <torusGeometry args={[radius, 0.012, 6, 96]} />
        <meshBasicMaterial color="#00f5ff" transparent opacity={0.5} />
      </mesh>
      <group ref={group}>
        {Array.from({ length: count }, (_, k) => {
          const a = (k / count) * Math.PI * 2;
          return (
            <mesh key={k} position={[Math.cos(a) * radius, Math.sin(a) * radius, 0]}>
              <sphereGeometry args={[0.07, 10, 8]} />
              <meshBasicMaterial color="#b6ff00" />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

export default function AtomModel3D({ protons, neutrons, shells, motion, low }: Props) {
  const nucleusR = 0.16 * Math.cbrt(Math.min(protons + neutrons, low ? 60 : 120)) * 1.2;
  const outer = nucleusR + 0.45 + Math.max(shells.length - 1, 0) * 0.42;
  const dist = Math.max(5, ((outer + 0.6) * 1.25) / Math.tan((22.5 * Math.PI) / 180));
  return (
    <Canvas
      dpr={low ? [1, 1.5] : [1, 2]}
      frameloop={motion ? 'always' : 'demand'}
      camera={{ position: [0, 0, dist], fov: 45 }}
      gl={{ antialias: !low, powerPreference: 'low-power' }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[4, 4, 4]} intensity={40} color="#ff9ad5" />
      <pointLight position={[-4, -2, 3]} intensity={30} color="#00f5ff" />
      <Nucleus protons={protons} neutrons={neutrons} maxParticles={low ? 60 : 120} />
      {shells.map((count, i) => (
        <Shell key={i} index={i} count={count} radius={nucleusR + 0.45 + i * 0.42} motion={motion} />
      ))}
      <OrbitControls enablePan={false} enableZoom={false} autoRotate={motion} autoRotateSpeed={0.8} />
    </Canvas>
  );
}
