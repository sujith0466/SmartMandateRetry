import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

export const RecoveryEngineScene: React.FC = () => {
  const coreRef = useRef<THREE.Group>(null);
  const safetyRingRef = useRef<THREE.Mesh>(null);
  const aiRingRef = useRef<THREE.Mesh>(null);
  const packetRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Main 6-Stage Autonomous Recovery 3D Spline Path
  // 1. Failure (-3.6, 1.6) -> 2. Context (-1.8, 0.8) -> 3. AI Core (0, 0) -> 4. Safety Gate (1.6, -0.2) -> 5. Dispatch (2.8, 0.6) -> 6. Settlement (3.6, -1.2)
  const recoverySpline = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.6, 1.5, -0.4),  // 1. Failure
      new THREE.Vector3(-1.8, 0.7, 0.6),   // 2. Context Evaluation
      new THREE.Vector3(0, 0, 0.8),        // 3. AI Strategy Decision
      new THREE.Vector3(1.6, -0.3, 0.6),   // 4. Deterministic Safety Gate
      new THREE.Vector3(2.7, 0.6, 0.2),    // 5. Recovery Rail Dispatch
      new THREE.Vector3(3.6, -1.3, -0.4),  // 6. Revenue Settlement
    ]);
  }, []);

  // Alternate Blocked Path (shows Safety Gate rejecting unauthorized retry)
  const blockedSpline = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0.8),
      new THREE.Vector3(1.3, -1.2, 0.4),
      new THREE.Vector3(2.2, -1.8, -0.2), // Blocked node (Rose)
    ]);
  }, []);

  const mainTubeGeo = useMemo(() => new THREE.TubeGeometry(recoverySpline, 64, 0.038, 8, false), [recoverySpline]);
  const blockedTubeGeo = useMemo(() => new THREE.TubeGeometry(blockedSpline, 32, 0.02, 8, false), [blockedSpline]);

  // Photon Stream along the authorized recovery path
  const particleCount = 140;
  const { particlePositions, particleOffsets } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const offsets = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      offsets[i] = i / particleCount;
      const p = recoverySpline.getPointAt(offsets[i]);
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
    }
    return { particlePositions: pos, particleOffsets: offsets };
  }, [recoverySpline]);

  // Ambient Star Dust Field
  const dustCount = 100;
  const dustPositions = useMemo(() => {
    const pos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8.5;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    return pos;
  }, []);

  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime();

    // Central AI Core gentle floating & pulse
    if (coreRef.current) {
      coreRef.current.rotation.y = t * 0.3;
      coreRef.current.rotation.x = Math.sin(t * 0.2) * 0.15;
      const scale = 1 + Math.sin(t * 2.0) * 0.04;
      coreRef.current.scale.set(scale, scale, scale);

      // Inertial mouse parallax
      coreRef.current.position.x = THREE.MathUtils.lerp(coreRef.current.position.x, pointer.x * 0.4, 0.04);
      coreRef.current.position.y = THREE.MathUtils.lerp(coreRef.current.position.y, pointer.y * 0.3, 0.04);
    }

    // Safety Gate Ring oscillation
    if (safetyRingRef.current) {
      safetyRingRef.current.rotation.z = t * 0.22;
      safetyRingRef.current.rotation.y = Math.PI / 4 + Math.sin(t * 0.3) * 0.1;
    }

    // AI Gyroscope Ring
    if (aiRingRef.current) {
      aiRingRef.current.rotation.z = -t * 0.28;
      aiRingRef.current.rotation.x = Math.PI / 3 + Math.cos(t * 0.2) * 0.1;
    }

    // Lead Photon Packet traversing full recovery path (0 -> 1 loop every 3.5s)
    if (packetRef.current) {
      const packetProgress = (t * 0.28) % 1;
      const pt = recoverySpline.getPointAt(packetProgress);
      packetRef.current.position.copy(pt);
      const pulse = 1 + Math.sin(t * 8) * 0.25;
      packetRef.current.scale.set(pulse, pulse, pulse);
    }

    // Continuous photon stream update
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const progress = (t * 0.2 + particleOffsets[i]) % 1;
        const pt = recoverySpline.getPointAt(progress);
        positions[i * 3] = pt.x + (Math.random() - 0.5) * 0.04;
        positions[i * 3 + 1] = pt.y + (Math.random() - 0.5) * 0.04;
        positions[i * 3 + 2] = pt.z + (Math.random() - 0.5) * 0.04;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* 3D Main Authorized Spline Conduit */}
      <mesh geometry={mainTubeGeo}>
        <meshStandardMaterial
          color="#38BDF8"
          emissive="#3B5BDB"
          emissiveIntensity={0.65}
          transparent
          opacity={0.7}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>

      {/* 3D Blocked Unauthorized Spline Conduit (Vetoed by Safety Gate) */}
      <mesh geometry={blockedTubeGeo}>
        <meshStandardMaterial
          color="#F43F5E"
          emissive="#E11D48"
          emissiveIntensity={0.5}
          transparent
          opacity={0.4}
          roughness={0.4}
        />
      </mesh>

      {/* Lead High-Energy Photon Packet */}
      <mesh ref={packetRef}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color="#FFFFFF"
          emissive="#60A5FA"
          emissiveIntensity={3.5}
          roughness={0.1}
        />
      </mesh>

      {/* Flowing Energy Stream Particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particlePositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          color="#93C5FD"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Ambient Stardust Field */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dustPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.035}
          color="#C4B5FD"
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* ======================================================== */}
      {/* 6 PRODUCT LIFECYCLE NODES IN 3D SPACE                    */}
      {/* ======================================================== */}

      {/* Stage 1: Payment Failure (Aqua Node) */}
      <group position={[-3.6, 1.5, -0.4]}>
        <mesh>
          <sphereGeometry args={[0.26, 24, 24]} />
          <meshStandardMaterial color="#0891B2" emissive="#0891B2" emissiveIntensity={1.6} roughness={0.1} />
        </mesh>
        <mesh>
          <ringGeometry args={[0.34, 0.38, 24]} />
          <meshBasicMaterial color="#0891B2" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Stage 2: Context Evaluation (Violet Context Rings) */}
      <group position={[-1.8, 0.7, 0.6]}>
        <mesh>
          <sphereGeometry args={[0.22, 24, 24]} />
          <meshStandardMaterial color="#7C3AED" emissive="#7C3AED" emissiveIntensity={1.5} roughness={0.15} />
        </mesh>
        <mesh>
          <torusGeometry args={[0.42, 0.015, 12, 32]} />
          <meshBasicMaterial color="#A78BFA" transparent opacity={0.7} />
        </mesh>
      </group>

      {/* Stage 3: AI Recovery Core (Center Faceted Crystal Prism) */}
      <group position={[0, 0, 0.8]} ref={coreRef}>
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.4}>
          <mesh>
            <icosahedronGeometry args={[0.85, 0]} />
            <meshPhysicalMaterial
              color="#3B5BDB"
              emissive="#7C3AED"
              emissiveIntensity={0.8}
              roughness={0.08}
              metalness={0.2}
              transmission={0.6}
              thickness={1.4}
              transparent
              opacity={0.92}
              reflectivity={0.9}
              clearcoat={1.0}
            />
          </mesh>
          <mesh ref={aiRingRef}>
            <torusGeometry args={[1.35, 0.02, 16, 64]} />
            <meshStandardMaterial color="#7C3AED" emissive="#7C3AED" emissiveIntensity={0.9} transparent opacity={0.7} />
          </mesh>
        </Float>
      </group>

      {/* Stage 4: Deterministic Safety Gate (Emerald Ring Boundary) */}
      <group position={[1.6, -0.3, 0.6]}>
        <mesh>
          <sphereGeometry args={[0.24, 24, 24]} />
          <meshStandardMaterial color="#059669" emissive="#059669" emissiveIntensity={1.8} roughness={0.1} />
        </mesh>
        <mesh ref={safetyRingRef}>
          <torusGeometry args={[0.55, 0.022, 16, 48]} />
          <meshStandardMaterial color="#059669" emissive="#059669" emissiveIntensity={1.2} transparent opacity={0.85} />
        </mesh>
      </group>

      {/* Vetoed Node (Safety Gate Blocking Unsafe Retry) */}
      <group position={[2.2, -1.8, -0.2]}>
        <mesh>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial color="#E11D48" emissive="#E11D48" emissiveIntensity={1.4} roughness={0.3} />
        </mesh>
      </group>

      {/* Stage 5: Recovery Dispatch Rail (Sapphire Node) */}
      <group position={[2.7, 0.6, 0.2]}>
        <mesh>
          <sphereGeometry args={[0.24, 24, 24]} />
          <meshStandardMaterial color="#3B5BDB" emissive="#3B5BDB" emissiveIntensity={1.6} roughness={0.1} />
        </mesh>
      </group>

      {/* Stage 6: Settlement Reconciled (Emerald Settlement Node) */}
      <group position={[3.6, -1.3, -0.4]}>
        <mesh>
          <sphereGeometry args={[0.28, 24, 24]} />
          <meshStandardMaterial color="#059669" emissive="#059669" emissiveIntensity={2.0} roughness={0.1} />
        </mesh>
        <mesh>
          <ringGeometry args={[0.38, 0.44, 24]} />
          <meshBasicMaterial color="#059669" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
};
