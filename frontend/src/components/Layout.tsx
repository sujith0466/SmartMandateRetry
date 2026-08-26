import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  ShieldCheck,
  FileText,
  FlaskConical,
  BarChart3,
  Cpu,
  Zap,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { getActiveMerchantId, setActiveMerchantId } from '../services/api';

interface MerchantOption {
  id: string;
  name: string;
  badge: string;
}

const AVAILABLE_MERCHANTS: MerchantOption[] = [
  { id: 'merch_saas_metrics_01', name: 'SaaS Metrics Cloud', badge: 'Primary Tenant' },
  { id: 'm_demo_merchant_01', name: 'SaaS Metrics (Demo)', badge: 'Sandbox' },
];

const NAV_SECTIONS = [
  {
    title: 'Operations',
    items: [
      { path: '/', label: 'Recovery Dashboard', icon: LayoutDashboard },
      { path: '/cases', label: 'Recovery Cases', icon: Inbox },
    ],
  },
  {
    title: 'Intelligence & Governance',
    items: [
      { path: '/analytics', label: 'Recovery Analytics', icon: BarChart3 },
      { path: '/policies', label: 'Safety Policies', icon: ShieldCheck },
      { path: '/audit', label: 'Audit Trail', icon: FileText },
    ],
  },
  {
    title: 'Diagnostic Lab',
    items: [
      { path: '/evaluation', label: 'Evaluation Lab', icon: FlaskConical },
      { path: '/observability', label: 'Observability', icon: Cpu },
    ],
  },
];

export const Layout: React.FC = () => {
  const location = useLocation();
  const [activeMerchant, setActiveMerchant] = useState<string>(getActiveMerchantId());
  const [isTenantOpen, setIsTenantOpen] = useState(false);

  const handleSelectMerchant = (merchantId: string) => {
    setActiveMerchantId(merchantId);
    setActiveMerchant(merchantId);
    setIsTenantOpen(false);
    // Reload page to re-fetch all active tenant queries with fresh isolation headers
    window.location.reload();
  };

  const currentMerchant = AVAILABLE_MERCHANTS.find((m) => m.id === activeMerchant) || AVAILABLE_MERCHANTS[0];

  return (
    <div className="flex h-screen bg-[#070A10] text-slate-100 antialiased overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0B0F19] border-r border-slate-800/80 flex flex-col z-20 shadow-2xl">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
              SmartMandate
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                PRO
              </span>
            </h1>
            <p className="text-[11px] font-medium text-slate-400">Autonomous Mandate Recovery</p>
          </div>
        </div>

        {/* Tenant Selector */}
        <div className="px-3 pt-3 pb-1 relative">
          <button
            onClick={() => setIsTenantOpen(!isTenantOpen)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex items-center justify-between transition-colors text-left"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="truncate">
                <div className="text-xs font-semibold text-white truncate">{currentMerchant.name}</div>
                <div className="text-[10px] font-medium text-slate-400">{currentMerchant.badge}</div>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {isTenantOpen && (
            <div className="absolute top-full left-3 right-3 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
              {AVAILABLE_MERCHANTS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelectMerchant(m.id)}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                    m.id === activeMerchant ? 'text-indigo-400 font-semibold bg-indigo-950/30' : 'text-slate-300'
                  }`}
                >
                  <span>{m.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{m.badge}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                {section.title}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active =
                  item.path === '/'
                    ? location.pathname === '/' || location.pathname === '/dashboard'
                    : location.pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-150 ${
                      active
                        ? 'bg-gradient-to-r from-indigo-950/80 to-slate-900 text-indigo-300 border border-indigo-700/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mr-2.5 transition-colors ${
                        active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Integration Environment Status Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-[#090D15]">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
              Razorpay Webhook: Active
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
              Sandbox Mode
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-[#070A10] p-8 relative">
        {/* Subtle background ambient lighting */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
