import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  Search,
  Bell,
} from 'lucide-react';
import { getActiveMerchantId, setActiveMerchantId } from '../services/api';

interface MerchantOption {
  id: string;
  name: string;
  badge: string;
}

const AVAILABLE_MERCHANTS: MerchantOption[] = [
  { id: 'merch_saas_metrics_01', name: 'SaaS Metrics Cloud Pvt Ltd', badge: 'Production Workspace' },
  { id: 'm_demo_merchant_01', name: 'SaaS Metrics Cloud (Demo)', badge: 'Sandbox Simulator' },
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
    title: 'Intelligence & Controls',
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
      { path: '/observability', label: 'System Health', icon: Cpu },
    ],
  },
];

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeMerchant, setActiveMerchant] = useState<string>(getActiveMerchantId());
  const [isTenantOpen, setIsTenantOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const handleSelectMerchant = (merchantId: string) => {
    setActiveMerchantId(merchantId);
    setActiveMerchant(merchantId);
    setIsTenantOpen(false);
    window.location.reload();
  };

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/cases?search=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  const currentMerchant = AVAILABLE_MERCHANTS.find((m) => m.id === activeMerchant) || AVAILABLE_MERCHANTS[0];

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 antialiased overflow-hidden font-sans">
      {/* Premium Deep-Navy Sidebar Rail */}
      <aside className="w-64 bg-[#0B132B] border-r border-[#1C2541] flex flex-col z-20 shadow-xl select-none">
        {/* Brand Identity Header */}
        <div className="p-5 border-b border-[#1C2541] flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-indigo-500 flex items-center justify-center text-slate-950 font-black text-sm shadow-glow-emerald">
            <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5 font-sans">
              SmartMandate
              <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                PRO
              </span>
            </h1>
            <p className="text-[11px] font-medium text-slate-400">Autonomous Mandate Recovery</p>
          </div>
        </div>

        {/* Merchant Workspace Switcher */}
        <div className="px-3 pt-3.5 pb-2 relative">
          <button
            onClick={() => setIsTenantOpen(!isTenantOpen)}
            className="w-full px-3 py-2.5 rounded-xl bg-[#1C2541]/70 hover:bg-[#1C2541] border border-slate-700/60 hover:border-slate-600 flex items-center justify-between transition-colors text-left group"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-100 truncate group-hover:text-white">{currentMerchant.name}</div>
                <div className="text-[10px] font-medium text-slate-400">{currentMerchant.badge}</div>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-white" />
          </button>

          {isTenantOpen && (
            <div className="absolute top-full left-3 right-3 mt-1.5 bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
              {AVAILABLE_MERCHANTS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelectMerchant(m.id)}
                  className={`w-full px-3 py-2.5 text-left text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                    m.id === activeMerchant ? 'text-indigo-300 font-bold bg-indigo-950/40' : 'text-slate-300'
                  }`}
                >
                  <span className="truncate">{m.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">{m.badge}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase font-sans">
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
                    className={`flex items-center px-3 py-2 text-xs font-bold rounded-xl transition-all duration-150 ${
                      active
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-[#1C2541]/70 hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mr-2.5 transition-colors ${
                        active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
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
        <div className="p-3 border-t border-[#1C2541] bg-[#070D1E]">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Gateway: Active
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-bold font-mono">
              Sandbox
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area with Enterprise Top Header */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Context-Aware Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-10 shrink-0">
          {/* Quick Search */}
          <form onSubmit={handleGlobalSearch} className="relative w-72 sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoice, customer email, case ID..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            />
          </form>

          {/* Header Controls & Status */}
          <div className="flex items-center gap-4">
            {/* Live Webhook Health Chip */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-slate-700">Webhook Engine:</span>
              <span className="font-mono font-bold text-emerald-700">Online (SSL)</span>
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => navigate('/cases?tab=escalations')}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors relative"
              title="Escalations Queue"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
            </button>

            {/* Merchant User Profile Avatar */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                SM
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-slate-900">SaaS Metrics Admin</div>
                <div className="text-[10px] text-slate-500 font-medium">Finance & Operations</div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Canvas */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
