import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Inbox,
  ShieldCheck,
  FileText,
  FlaskConical,
  BarChart3,
  Zap,
  Building2,
  ChevronDown,
  Search,
  Bell,
  Globe,
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
      { path: '/dashboard', label: 'Recovery Dashboard', icon: LayoutDashboard },
      { path: '/cases', label: 'Recovery Cases', icon: Inbox },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { path: '/analytics', label: 'Revenue Analytics', icon: BarChart3 },
      { path: '/policies', label: 'Safety Policies', icon: ShieldCheck },
    ],
  },
  {
    title: 'Governance',
    items: [
      { path: '/audit', label: 'Audit Trail', icon: FileText },
      { path: '/evaluation', label: 'Evaluation Lab', icon: FlaskConical },
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
    <div className="flex h-screen bg-[#F7F9FC] text-[#111827] antialiased overflow-hidden font-sans">
      {/* Premium Light-First Sidebar Rail */}
      <aside className="w-64 bg-white border-r border-[#E5E7EB] flex flex-col z-20 select-none shadow-xs">
        {/* Brand Identity Header with Controlled Gradient */}
        <Link to="/dashboard" className="p-5 border-b border-[#E5E7EB] flex items-center space-x-3 group">
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.15 }}
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3B5BDB] via-[#7C3AED] to-[#0891B2] flex items-center justify-center text-white font-black text-sm shadow-sm shadow-[#3B5BDB]/20"
          >
            <Zap className="w-4 h-4 text-white fill-white" />
          </motion.div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-[#111827] flex items-center gap-1.5 font-sans">
              SmartMandate
              <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE]">
                PRO
              </span>
            </h1>
            <p className="text-[11px] font-medium text-[#64748B]">Autonomous Mandate Recovery</p>
          </div>
        </Link>

        {/* Merchant Workspace Switcher */}
        <div className="px-3 pt-3.5 pb-2 relative">
          <button
            onClick={() => setIsTenantOpen(!isTenantOpen)}
            className="w-full px-3 py-2.5 rounded-xl bg-[#F7F9FC] hover:bg-[#F1F5F9] border border-[#E5E7EB] flex items-center justify-between transition-colors text-left group shadow-2xs"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="p-1.5 rounded-lg bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE]">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-[#111827] truncate group-hover:text-[#3B5BDB] transition-colors">
                  {currentMerchant.name}
                </div>
                <div className="text-[10px] font-medium text-[#64748B]">{currentMerchant.badge}</div>
              </div>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#64748B] shrink-0 group-hover:text-[#111827] transition-transform duration-150 ${
                isTenantOpen ? 'rotate-180 text-[#3B5BDB]' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {isTenantOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-full left-3 right-3 mt-1.5 bg-white border border-[#E5E7EB] rounded-xl shadow-lg z-50 py-1 overflow-hidden origin-top"
              >
                {AVAILABLE_MERCHANTS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSelectMerchant(m.id)}
                    className={`w-full px-3 py-2.5 text-left text-xs flex items-center justify-between hover:bg-[#F7F9FC] transition-colors ${
                      m.id === activeMerchant ? 'text-[#3B5BDB] font-bold bg-[#EEF2FF]' : 'text-[#475569]'
                    }`}
                  >
                    <span className="truncate">{m.name}</span>
                    <span className="text-[10px] text-[#64748B] font-mono shrink-0 ml-2">{m.badge}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Merchant Navigation Hierarchy with Fluid Active Pill */}
        <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-extrabold tracking-wider text-[#64748B] uppercase font-sans">
                {section.title}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active =
                  item.path === '/dashboard'
                    ? location.pathname === '/dashboard' || location.pathname === '/dashboard/'
                    : location.pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative flex items-center px-3 py-2 text-xs font-bold rounded-xl transition-colors duration-150 group z-0 ${
                      active ? 'text-[#3B5BDB]' : 'text-[#475569] hover:text-[#111827]'
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebarActivePill"
                        className="absolute inset-0 bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl -z-10 shadow-2xs"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon
                      className={`w-4 h-4 mr-2.5 transition-colors ${
                        active ? 'text-[#3B5BDB]' : 'text-[#64748B] group-hover:text-[#475569]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Integration Gateway Status Footer */}
        <div className="p-3 border-t border-[#E5E7EB] bg-[#F7F9FC]">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="flex items-center gap-1.5 text-[#059669] font-bold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
              Gateway: Active
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-[#475569] border border-[#E5E7EB] font-bold font-mono shadow-2xs">
              Sandbox
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Context-Aware Header */}
        <header className="h-16 bg-white border-b border-[#E5E7EB] px-8 flex items-center justify-between z-10 shrink-0">
          {/* Quick Search */}
          <form onSubmit={handleGlobalSearch} className="relative w-72 sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search invoice, customer email, case ID..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] text-[#111827] placeholder-[#64748B] focus:outline-none focus:border-[#3B5BDB] focus:bg-white transition-colors"
            />
          </form>

          {/* Header Controls & Status */}
          <div className="flex items-center gap-3.5">
            {/* View Flagship Public Website Link */}
            <Link
              to="/"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F7F9FC] border border-[#E5E7EB] text-xs font-bold text-[#475569] hover:text-[#111827] transition-colors shadow-2xs"
            >
              <Globe className="w-3.5 h-3.5 text-[#3B5BDB]" />
              <span>Public Website</span>
            </Link>

            {/* Live Webhook Status Chip (Aqua Theme) */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#ECFEFF] border border-[#A5F3FC] text-xs">
              <span className="w-2 h-2 rounded-full bg-[#0891B2] animate-pulse" />
              <span className="font-semibold text-[#475569]">Webhook Engine:</span>
              <span className="font-mono font-bold text-[#0891B2]">Online (SSL)</span>
            </div>

            {/* Escalations Notification Bell */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/cases?tab=escalations')}
              className="p-2 rounded-xl border border-[#E5E7EB] hover:bg-[#F7F9FC] text-[#475569] hover:text-[#111827] transition-colors relative"
              title="Escalations Queue"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#D97706] animate-pulse" />
            </motion.button>

            {/* Merchant User Profile Avatar */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-[#E5E7EB]">
              <div className="w-8 h-8 rounded-full bg-[#3B5BDB] text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-[#3B5BDB]/20">
                SM
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-[#111827]">SaaS Metrics Admin</div>
                <div className="text-[10px] text-[#64748B] font-medium">Finance & Operations</div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Canvas */}
        <main className="flex-1 overflow-y-auto bg-[#F7F9FC] p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
