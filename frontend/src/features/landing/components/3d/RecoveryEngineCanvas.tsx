import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { RecoveryEngineScene } from './RecoveryEngineScene';
import { useReducedMotion } from '../../../../motion/useReducedMotion';
import { Inbox, Cpu, ShieldCheck, Zap, CheckCircle2, Sparkles } from 'lucide-react';

interface CanvasProps {
  scrollProgress?: number;
}

export const RecoveryEngineCanvas: React.FC<CanvasProps> = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Check WebGL availability
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
      }
    } catch {
      setWebglSupported(false);
    }

    // IntersectionObserver to pause rendering when off-screen
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  // 2D Static / Accessible fallback if reduced motion or WebGL is unsupported
  if (reducedMotion || !webglSupported) {
    return (
      <div className="w-full h-full min-h-[480px] flex flex-col justify-center items-center p-8 bg-[#FAF8F3] rounded-3xl border border-[#E8E1D5] shadow-xs">
        <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-8 flex items-center gap-2 font-mono">
          <Sparkles className="w-4 h-4 text-[#7C3AED]" />
          <span>Autonomous Mandate Recovery Engine • 5 Pipeline Stages</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 w-full max-w-4xl">
          {[
            { name: '1. Ingestion', role: 'Webhook / Sanitized', icon: Inbox, color: 'text-[#0891B2] bg-[#ECFEFF] border-[#A5F3FC]' },
            { name: '2. AI Strategy', role: 'Dual-Brain Reasoning', icon: Cpu, color: 'text-[#7C3AED] bg-[#F5F3FF] border-[#DDD6FE]' },
            { name: '3. Safety Gate', role: 'Deterministic P0–P4', icon: ShieldCheck, color: 'text-[#059669] bg-[#ECFDF5] border-[#A7F3D0]' },
            { name: '4. Rail Dispatch', role: 'UPI / Smart Link', icon: Zap, color: 'text-[#3B5BDB] bg-[#EEF2FF] border-[#C7D2FE]' },
            { name: '5. Settlement', role: 'Reconciled Revenue', icon: CheckCircle2, color: 'text-[#059669] bg-[#ECFDF5] border-[#A7F3D0]' },
          ].map((n) => (
            <div key={n.name} className="flex flex-col items-center text-center p-4 rounded-2xl bg-white border border-[#E8E1D5] shadow-2xs">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${n.color} mb-3 shadow-2xs`}>
                <n.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#111827] font-sans">{n.name}</span>
              <span className="text-[10px] text-[#64748B] mt-1">{n.role}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[500px] lg:min-h-[580px] rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
    >
      {/* Three.js R3F Canvas */}
      {isVisible && (
        <Canvas
          camera={{ position: [0, 0.4, 7.8], fov: 42 }}
          dpr={[1, 2]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          className="w-full h-full"
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[6, 8, 5]} intensity={1.2} />
          <pointLight position={[0, 1, 3]} intensity={2.2} color="#3B5BDB" distance={10} />
          <pointLight position={[-3, 2, 2]} intensity={1.5} color="#0891B2" distance={8} />
          <pointLight position={[3, -1, 2]} intensity={1.5} color="#7C3AED" distance={8} />

          <Suspense fallback={null}>
            <RecoveryEngineScene />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
};
