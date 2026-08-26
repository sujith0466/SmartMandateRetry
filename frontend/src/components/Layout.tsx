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
      {/* Light-First Premium Sidebar Rail */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-20 select-none shadow-xs">
        {/* Brand Identity Header */}
        <div className="p-5 border-b border-slate-100 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 flex items-center justify-center text-white font-black text-sm shadow-sm shadow-blue-500/20">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5 font-sans">
              SmartMandate
              <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                PRO
              </span>
            </h1>
            <p className="text-[11px] font-medium text-slate-500">Autonomous Mandate Recovery</p>
          </div>
        </div>

        {/* Merchant Workspace Switcher (Light-First) */}
        <div className="px-3 pt-3.5 pb-2 relative">
          <button
            onClick={() => setIsTenantOpen(!isTenantOpen)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 flex items-center justify-between transition-colors text-left group shadow-2xs"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                  {currentMerchant.name}
                </div>
                <div className="text-[10px] font-medium text-slate-500">{currentMerchant.badge}</div>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-slate-600 transition-colors" />
          </button>

          {isTenantOpen && (
            <div className="absolute top-full left-3 right-3 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
              {AVAILABLE_MERCHANTS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelectMerchant(m.id)}
                  className={`w-full px-3 py-2.5 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    m.id === activeMerchant ? 'text-blue-600 font-bold bg-blue-50/80' : 'text-slate-700'
                  }`}
                >
                  <span className="truncate">{m.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">{m.badge}</span>
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
                    className={`flex items-center px-3 py-2 text-xs font-bold rounded-xl transition-all duration-150 group ${
                      active
                        ? 'bg-blue-50 text-blue-600 border border-blue-200/80 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mr-2.5 transition-colors ${
                        active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Integration Environment Status Footer (Light-First) */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/80">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Gateway: Active
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 font-bold font-mono shadow-2xs">
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
              className="w-full text-xs pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </form>

          {/* Header Controls & Status */}
          <div className="flex items-center gap-4">
            {/* Live Webhook Health Chip (Cyan Accent) */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              <span className="font-semibold text-slate-700">Webhook Engine:</span>
              <span className="font-mono font-bold text-cyan-800">Online (SSL)</span>
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
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-blue-500/20">
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
