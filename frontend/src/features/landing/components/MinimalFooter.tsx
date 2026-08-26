import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, ShieldCheck } from 'lucide-react';

export const MinimalFooter: React.FC = () => {
  return (
    <footer className="bg-[#FAF8F3] border-t border-[#E8E1D5] py-14 text-[#64748B] text-xs">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <Link to="/" className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#3B5BDB] via-[#7C3AED] to-[#0891B2] flex items-center justify-center text-white font-black text-xs shadow-2xs">
                <Zap className="w-3.5 h-3.5 fill-white text-white" />
              </div>
              <span className="font-extrabold text-[#111827] text-sm">SmartMandate</span>
            </Link>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Autonomous recurring mandate recovery powered by Dual-Brain AI and deterministic safety policies.
            </p>
          </div>

          {/* Operations Links */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider">Operations</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/dashboard" className="hover:text-[#3B5BDB] transition-colors">
                  Recovery Dashboard
                </Link>
              </li>
              <li>
                <Link to="/cases" className="hover:text-[#3B5BDB] transition-colors">
                  Recovery Cases Workspace
                </Link>
              </li>
              <li>
                <Link to="/cases?tab=escalations" className="hover:text-[#3B5BDB] transition-colors">
                  Operator Escalation Queue
                </Link>
              </li>
            </ul>
          </div>

          {/* Intelligence & Governance */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider">Governance</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/analytics" className="hover:text-[#3B5BDB] transition-colors">
                  Revenue Analytics
                </Link>
              </li>
              <li>
                <Link to="/policies" className="hover:text-[#3B5BDB] transition-colors">
                  Safety Policies Guardrails
                </Link>
              </li>
              <li>
                <Link to="/audit" className="hover:text-[#3B5BDB] transition-colors">
                  Compliance Audit Trail
                </Link>
              </li>
              <li>
                <Link to="/evaluation" className="hover:text-[#3B5BDB] transition-colors">
                  Evaluation Lab & Benchmarks
                </Link>
              </li>
            </ul>
          </div>

          {/* Technical Platform Specs */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider">Platform Status</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-mono text-[#059669] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
                API & Health: Online
              </div>
              <div className="text-[11px] text-[#64748B]">
                Integration: Razorpay Mandates Engine
              </div>
              <div className="text-[11px] text-[#64748B]">
                Version: 2.0.0 Enterprise
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#E8E1D5] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <p>© 2026 SmartMandateRetry. All rights reserved.</p>
          <div className="flex items-center gap-1 text-[#059669] font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Certified Enterprise Fintech Architecture</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
