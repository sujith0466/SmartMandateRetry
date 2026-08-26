import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SceneProps {
  scrollProgress?: number;
}

export const RecoveryEngineScene: React.FC<SceneProps> = () => {
  const coreRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // 3D Spline Rails for Data Flow
  const { curve1, curve2, curve3 } = useMemo(() => {
    const c1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.5, 0.2, -0.5),
      new THREE.Vector3(-2.8, 1.4, 0.8),
      new THREE.Vector3(-1.2, 0.8, 1.2),
      new THREE.Vector3(0, 0, 0),
    ]);
    const c2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1.2, -0.8, 1.0),
      new THREE.Vector3(2.5, 0.4, 0.5),
      new THREE.Vector3(4.5, -0.2, -0.5),
    ]);
    const c3 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.0, -1.5, -0.5),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(2.0, 1.5, -0.5),
    ]);
    return { curve1: c1, curve2: c2, curve3: c3 };
  }, []);

  // Geometry for Spline Rails
  const tube1Geo = useMemo(() => new THREE.TubeGeometry(curve1, 48, 0.03, 8, false), [curve1]);
  const tube2Geo = useMemo(() => new THREE.TubeGeometry(curve2, 48, 0.03, 8, false), [curve2]);
  const tube3Geo = useMemo(() => new THREE.TubeGeometry(curve3, 32, 0.02, 8, false), [curve3]);

  // Particle Stream along curves
  const particleCount = 180;
  const { particlePositions, particleVelocities } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      const t = Math.random();
      const c = i % 3 === 0 ? curve1 : i % 3 === 1 ? curve2 : curve3;
      const p = c.getPointAt(t);
      pos[i * 3] = p.x + (Math.random() - 0.5) * 0.1;
      pos[i * 3 + 1] = p.y + (Math.random() - 0.5) * 0.1;
      pos[i * 3 + 2] = p.z + (Math.random() - 0.5) * 0.1;
      vel[i] = 0.05 + Math.random() * 0.15;
    }
    return { particlePositions: pos, particleVelocities: vel };
  }, [curve1, curve2, curve3]);

  // Animation Loop
  useFrame(({ clock, pointer }) => {
    const elapsed = clock.getElapsedTime();

    // Central core rotation & subtle breathing
    if (coreRef.current) {
      coreRef.current.rotation.y = elapsed * 0.25;
      coreRef.current.rotation.x = Math.sin(elapsed * 0.2) * 0.15;
      const scale = 1 + Math.sin(elapsed * 1.5) * 0.04;
      coreRef.current.scale.set(scale, scale, scale);

      // Subtle mouse parallax
      coreRef.current.position.x = pointer.x * 0.4;
      coreRef.current.position.y = pointer.y * 0.3;
    }

    // Orbital rings rotation
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = elapsed * 0.3;
      ring1Ref.current.rotation.x = Math.PI / 3 + Math.sin(elapsed * 0.2) * 0.1;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -elapsed * 0.22;
      ring2Ref.current.rotation.y = Math.PI / 4 + Math.cos(elapsed * 0.15) * 0.1;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.x = elapsed * 0.18;
      ring3Ref.current.rotation.z = Math.PI / 6;
    }

    // Particles traversal
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const speed = particleVelocities[i];
        const t = (elapsed * speed + (i / particleCount)) % 1;
        const c = i % 3 === 0 ? curve1 : i % 3 === 1 ? curve2 : curve3;
        const p = c.getPointAt(t);
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Central Autonomous Recovery Core */}
      <group ref={coreRef}>
        {/* Core Crystal Prism (Sapphire / Violet Energy) */}
        <mesh>
          <octahedronGeometry args={[0.9, 0]} />
          <meshPhysicalMaterial
            color="#3B5BDB"
            emissive="#7C3AED"
            emissiveIntensity={0.65}
            roughness={0.1}
            metalness={0.15}
            transmission={0.4}
            thickness={1.2}
            transparent
            opacity={0.92}
          />
        </mesh>

        {/* Inner Glowing Core Sphere */}
        <mesh>
          <sphereGeometry args={[0.42, 24, 24]} />
          <meshStandardMaterial
            color="#0891B2"
            emissive="#3B5BDB"
            emissiveIntensity={1.2}
            roughness={0.2}
          />
        </mesh>

        {/* Orbital Ring 1 (Aqua - Ingestion Rail) */}
        <mesh ref={ring1Ref}>
          <torusGeometry args={[1.6, 0.022, 16, 64]} />
          <meshStandardMaterial
            color="#0891B2"
            emissive="#0891B2"
            emissiveIntensity={0.8}
            transparent
            opacity={0.7}
          />
        </mesh>

        {/* Orbital Ring 2 (Violet - AI Decision Rail) */}
        <mesh ref={ring2Ref}>
          <torusGeometry args={[2.1, 0.02, 16, 64]} />
          <meshStandardMaterial
            color="#7C3AED"
            emissive="#7C3AED"
            emissiveIntensity={0.7}
            transparent
            opacity={0.65}
          />
        </mesh>

        {/* Orbital Ring 3 (Emerald - Deterministic Safety Boundary) */}
        <mesh ref={ring3Ref}>
          <torusGeometry args={[2.6, 0.018, 16, 64]} />
          <meshStandardMaterial
            color="#059669"
            emissive="#059669"
            emissiveIntensity={0.6}
            transparent
            opacity={0.5}
          />
        </mesh>
      </group>

      {/* 3D Spline Tubular Rails */}
      <mesh geometry={tube1Geo}>
        <meshStandardMaterial
          color="#CBD5E1"
          emissive="#0891B2"
          emissiveIntensity={0.3}
          transparent
          opacity={0.6}
          roughness={0.3}
        />
      </mesh>

      <mesh geometry={tube2Geo}>
        <meshStandardMaterial
          color="#CBD5E1"
          emissive="#3B5BDB"
          emissiveIntensity={0.3}
          transparent
          opacity={0.6}
          roughness={0.3}
        />
      </mesh>

      <mesh geometry={tube3Geo}>
        <meshStandardMaterial
          color="#E2E8F0"
          emissive="#7C3AED"
          emissiveIntensity={0.2}
          transparent
          opacity={0.4}
          roughness={0.4}
        />
      </mesh>

      {/* Flowing Energy Photon Particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.075}
          color="#3B5BDB"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Stage Anchor Nodes in 3D Space */}
      {/* Node 1: Failure Ingested (Aqua) */}
      <group position={[-4.5, 0.2, -0.5]}>
        <mesh>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshStandardMaterial color="#0891B2" emissive="#0891B2" emissiveIntensity={0.9} />
        </mesh>
      </group>

      {/* Node 2: AI Context Strategy (Violet) */}
      <group position={[-2.8, 1.4, 0.8]}>
        <mesh>
          <sphereGeometry args={[0.24, 16, 16]} />
          <meshStandardMaterial color="#7C3AED" emissive="#7C3AED" emissiveIntensity={1.0} />
        </mesh>
      </group>

      {/* Node 3: Deterministic Safety Gate (Emerald) */}
      <group position={[1.2, -0.8, 1.0]}>
        <mesh>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color="#059669" emissive="#059669" emissiveIntensity={0.9} />
        </mesh>
      </group>

      {/* Node 4: Multi-Channel Dispatch (Sapphire) */}
      <group position={[2.5, 0.4, 0.5]}>
        <mesh>
          <sphereGeometry args={[0.24, 16, 16]} />
          <meshStandardMaterial color="#3B5BDB" emissive="#3B5BDB" emissiveIntensity={1.0} />
        </mesh>
      </group>

      {/* Node 5: Reconciled Settlement (Emerald) */}
      <group position={[4.5, -0.2, -0.5]}>
        <mesh>
          <sphereGeometry args={[0.26, 16, 16]} />
          <meshStandardMaterial color="#059669" emissive="#059669" emissiveIntensity={1.1} />
        </mesh>
      </group>
    </group>
  );
};
