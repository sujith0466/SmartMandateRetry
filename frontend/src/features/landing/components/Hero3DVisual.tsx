import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useReducedMotion } from '../../../motion/useReducedMotion';
import { Inbox, Cpu, ShieldCheck, Zap, CheckCircle2 } from 'lucide-react';

interface NodeData {
  name: string;
  role: string;
  color: number;
  hex: string;
  pos: [number, number, number];
}

const NODES: NodeData[] = [
  { name: 'Failure Ingested', role: 'Webhook / Sanitized', color: 0x0891b2, hex: '#0891B2', pos: [-3.2, 0.4, 0] },
  { name: 'AI Decision', role: 'Dual-Brain Strategy', color: 0x7c3aed, hex: '#7C3AED', pos: [-1.6, 1.2, 0.5] },
  { name: 'Safety Gate', role: 'Deterministic P0–P4', color: 0x059669, hex: '#059669', pos: [0.2, 0.2, -0.2] },
  { name: 'Channel Dispatch', role: 'UPI / Smart Link', color: 0x3b5bdb, hex: '#3B5BDB', pos: [1.8, 1.0, 0.4] },
  { name: 'Settlement', role: 'Reconciled Revenue', color: 0x059669, hex: '#059669', pos: [3.4, 0.3, 0] },
];

export const Hero3DVisual: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const container = containerRef.current;
    if (!container) return;

    // Check WebGL support
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    let isVisible = true;
    let animationFrameId: number;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 380;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 7.2);
    camera.lookAt(0, 0.4, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.appendChild(renderer.domElement);

    // Ambient and Point Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x3b5bdb, 2, 12);
    pointLight.position.set(0, 2, 3);
    scene.add(pointLight);

    // Group for nodes and rails
    const networkGroup = new THREE.Group();
    scene.add(networkGroup);

    // Create 3D Nodes
    const nodeMeshes: THREE.Mesh[] = [];
    const haloMeshes: THREE.Mesh[] = [];

    NODES.forEach((node) => {
      // Core sphere
      const geometry = new THREE.SphereGeometry(0.32, 24, 24);
      const material = new THREE.MeshStandardMaterial({
        color: node.color,
        roughness: 0.2,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...node.pos);
      networkGroup.add(mesh);
      nodeMeshes.push(mesh);

      // Outer glowing ring
      const ringGeo = new THREE.RingGeometry(0.38, 0.44, 28);
      const ringMat = new THREE.MeshBasicMaterial({
        color: node.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(...node.pos);
      networkGroup.add(ring);
      haloMeshes.push(ring);
    });

    // Create connecting 3D Spline Rails
    const points: THREE.Vector3[] = NODES.map((n) => new THREE.Vector3(...n.pos));
    const curve = new THREE.CatmullRomCurve3(points);

    const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.035, 12, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.2,
      roughness: 0.4,
      transparent: true,
      opacity: 0.75,
    });
    const railMesh = new THREE.Mesh(tubeGeo, tubeMat);
    networkGroup.add(railMesh);

    // Flowing Photon Packets along curve
    const packetCount = 4;
    const packetMeshes: THREE.Mesh[] = [];
    const packetGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const packetMat = new THREE.MeshBasicMaterial({ color: 0x3b5bdb });

    for (let i = 0; i < packetCount; i++) {
      const pMesh = new THREE.Mesh(packetGeo, packetMat);
      networkGroup.add(pMesh);
      packetMeshes.push(pMesh);
    }

    // Mouse parallax interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetX = x * 0.25;
      targetY = y * 0.2;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // IntersectionObserver to pause rendering when off-screen
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    // Animation Loop
    const startTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isVisible) return;

      const elapsedTime = (performance.now() - startTime) * 0.001;

      // Smooth camera parallax
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;
      networkGroup.rotation.y = mouseX;
      networkGroup.rotation.x = -mouseY;

      // Pulse node halos
      haloMeshes.forEach((halo, idx) => {
        const scale = 1 + Math.sin(elapsedTime * 2.5 + idx * 0.8) * 0.08;
        halo.scale.set(scale, scale, scale);
      });

      // Animate flowing photon packets along Catmull-Rom curve
      packetMeshes.forEach((packet, idx) => {
        const t = (elapsedTime * 0.35 + idx / packetCount) % 1;
        const pos = curve.getPointAt(t);
        packet.position.copy(pos);
      });

      renderer.render(scene, camera);
    };

    animate();

    // Teardown and GPU cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();

      nodeMeshes.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      haloMeshes.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      packetMeshes.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      tubeGeo.dispose();
      tubeMat.dispose();
      renderer.dispose();

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [reducedMotion]);

  // Fallback 2D visualization if reduced motion or WebGL unsupported
  if (reducedMotion || !webglSupported) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center p-6 bg-gradient-to-br from-[#F7F9FC] to-[#EEF2FF] rounded-3xl border border-[#E5E7EB] shadow-sm">
        <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-6 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#059669]" />
          Autonomous Mandate Recovery Network
        </div>
        <div className="grid grid-cols-5 gap-3 w-full max-w-2xl">
          {[
            { name: 'Failure Ingested', icon: Inbox, color: 'text-[#0891B2] bg-[#ECFEFF] border-[#A5F3FC]' },
            { name: 'AI Decision', icon: Cpu, color: 'text-[#7C3AED] bg-[#F5F3FF] border-[#DDD6FE]' },
            { name: 'Safety Gate', icon: ShieldCheck, color: 'text-[#059669] bg-[#ECFDF5] border-[#A7F3D0]' },
            { name: 'Channel Dispatch', icon: Zap, color: 'text-[#3B5BDB] bg-[#EEF2FF] border-[#C7D2FE]' },
            { name: 'Settlement', icon: CheckCircle2, color: 'text-[#059669] bg-[#ECFDF5] border-[#A7F3D0]' },
          ].map((n, i) => (
            <div key={n.name} className="flex flex-col items-center text-center p-3 rounded-2xl bg-white border border-[#E5E7EB] shadow-2xs">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${n.color} mb-2 shadow-2xs`}>
                <n.icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-[#111827]">{i + 1}. {n.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[380px] sm:h-[420px] rounded-3xl overflow-hidden bg-gradient-to-b from-[#F7F9FC] via-[#FFFFFF] to-[#F7F9FC] border border-[#E5E7EB] shadow-inner flex items-center justify-center">
      {/* Background Depth Ring */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(59,91,219,0.06)_0%,transparent_65%)] pointer-events-none" />

      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Node Indicators */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none px-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-sm border border-[#E5E7EB] shadow-2xs text-[11px] font-bold text-[#475569]">
          <span className="w-2 h-2 rounded-full bg-[#0891B2] animate-pulse" />
          Interactive 3D Recovery Rail
        </div>
        <div className="text-[10px] font-mono text-[#64748B] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-[#E5E7EB]">
          5 Nodes • Dual-Brain Pipeline
        </div>
      </div>
    </div>
  );
};
