import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Database, Clock, Users, Sparkles, CheckCircle2 } from 'lucide-react';
import { useReducedMotion } from '../../../motion/useReducedMotion';

export const ProductIntelligenceSection: React.FC = () => {
  const reducedMotion = useReducedMotion();

  const signals = [
    { name: 'Failure Reason Classification', desc: 'Distinguishes soft liquidity dips from hard account closures (14 failure families).', icon: Database, color: 'text-[#0891B2] bg-[#ECFEFF] border-[#A5F3FC]' },
    { name: 'Customer Historical Track Record', desc: 'Considers subscriber tenure (12+ mos) and historical mandate recovery success.', icon: Users, color: 'text-[#7C3AED] bg-[#F5F3FF] border-[#DDD6FE]' },
    { name: 'Liquidity Clearing Windows', desc: 'Identifies optimal debit timing (06:00 IST) to align with bank settlement liquidity.', icon: Clock, color: 'text-[#3B5BDB] bg-[#EEF2FF] border-[#C7D2FE]' },
    { name: 'Merchant Safety Policy Limits', desc: 'Enforces hard retry caps, 24hr cooldown intervals, and high-value holds.', icon: ShieldCheck, color: 'text-[#059669] bg-[#ECFDF5] border-[#A7F3D0]' },
  ];

  return (
    <section id="intelligence" className="py-24 bg-[#FAF8F3] relative">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] text-xs font-bold text-[#7C3AED]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Product Intelligence Engine</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#111827] tracking-tight font-sans">
            Not Just a Retry Scheduler. A Decision Engine.
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] font-medium leading-relaxed">
            SmartMandate evaluates multi-dimensional signals before every payment action, balancing recovery yield against customer trust.
          </p>
        </div>

        {/* 4 Multi-Dimensional Signal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {signals.map((s, i) => (
            <motion.div
              key={s.name}
              initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className="p-6 rounded-3xl bg-white border border-[#E8E1D5] shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className={`p-3 rounded-2xl border w-fit shadow-2xs ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#111827] font-sans">{s.name}</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">{s.desc}</p>
              </div>
              <div className="pt-2 border-t border-[#E8E1D5] text-[10px] font-mono text-[#059669] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE SIGNAL INGESTED
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
