import React from 'react';
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
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/cases', label: 'Recovery Cases', icon: Inbox },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/audit', label: 'Audit Trail', icon: FileText },
  { path: '/policies', label: 'Safety Policies', icon: ShieldCheck },
  { path: '/observability', label: 'Observability', icon: Cpu },
  { path: '/evaluation', label: 'Evaluation Lab', icon: FlaskConical },
];

export const Layout: React.FC = () => {
  const location = useLocation();

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
            <p className="text-[11px] font-medium text-slate-400">Revenue Recovery Engine</p>
          </div>
        </div>

        {/* Tenant Chip */}
        <div className="px-4 pt-4 pb-2">
          <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Merchant</span>
            <span className="text-xs font-bold font-mono text-indigo-400">m_demo_01</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.path === '/'
                ? location.pathname === '/' || location.pathname === '/dashboard'
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2.5 text-xs font-semibold rounded-xl transition-all duration-150 ${
                  active
                    ? 'bg-gradient-to-r from-indigo-950/80 to-slate-900 text-indigo-300 border border-indigo-700/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mr-3 transition-colors ${
                    active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Engine Status Bottom Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-[#090D15]">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
              Engine Online
            </span>
            <span className="font-mono text-[11px] text-slate-500">v2.0-FROZEN</span>
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
