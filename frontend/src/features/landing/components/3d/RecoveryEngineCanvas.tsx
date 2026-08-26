import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { RecoveryEngineScene } from './RecoveryEngineScene';
import { useReducedMotion } from '../../../../motion/useReducedMotion';
import { Inbox, Cpu, ShieldCheck, Zap, CheckCircle2, Sparkles } from 'lucide-react';

export const RecoveryEngineCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) setWebglSupported(false);
    } catch {
      setWebglSupported(false);
    }

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  if (reducedMotion || !webglSupported) {
    return (
      <div className="w-full h-full min-h-[460px] flex flex-col justify-center items-center p-8 bg-[#0F172A] rounded-3xl border border-slate-800 text-white">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2 font-mono">
          <Sparkles className="w-4 h-4 text-[#7C3AED]" />
          <span>Autonomous Mandate Recovery Engine • 5 Active Nodes</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5 w-full max-w-4xl">
          {[
            { name: '1. Ingestion', role: 'Webhook / Sanitized', icon: Inbox, color: 'text-[#0891B2] bg-[#0891B2]/10 border-[#0891B2]/30' },
            { name: '2. AI Strategy', role: 'Dual-Brain Reasoning', icon: Cpu, color: 'text-[#7C3AED] bg-[#7C3AED]/10 border-[#7C3AED]/30' },
            { name: '3. Safety Gate', role: 'Deterministic P0–P4', icon: ShieldCheck, color: 'text-[#059669] bg-[#059669]/10 border-[#059669]/30' },
            { name: '4. Rail Dispatch', role: 'UPI / Smart Link', icon: Zap, color: 'text-[#3B5BDB] bg-[#3B5BDB]/10 border-[#3B5BDB]/30' },
            { name: '5. Settlement', role: 'Reconciled Revenue', icon: CheckCircle2, color: 'text-[#059669] bg-[#059669]/10 border-[#059669]/30' },
          ].map((n) => (
            <div key={n.name} className="flex flex-col items-center text-center p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${n.color} mb-2.5`}>
                <n.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-100 font-sans">{n.name}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">{n.role}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[460px] lg:min-h-[520px] rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
    >
      {isVisible && (
        <Canvas
          camera={{ position: [0, 0.2, 6.8], fov: 45 }}
          dpr={[1, 2]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          className="w-full h-full"
        >
          <ambientLight intensity={0.9} />
          <directionalLight position={[5, 8, 5]} intensity={1.5} />
          <pointLight position={[0, 0, 3]} intensity={2.5} color="#3B5BDB" distance={10} />
          <pointLight position={[-4, 2, 2]} intensity={2.0} color="#0891B2" distance={8} />
          <pointLight position={[4, -2, 2]} intensity={2.0} color="#7C3AED" distance={8} />

          <Suspense fallback={null}>
            <RecoveryEngineScene />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
};
