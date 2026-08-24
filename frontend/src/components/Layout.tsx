import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  ShieldCheck,
  FileText,
  FlaskConical,
  Activity,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/cases', label: 'Recovery Cases', icon: Inbox },
  { path: '/policies', label: 'Safety Policies', icon: ShieldCheck },
  { path: '/audit', label: 'Audit Trail', icon: FileText },
  { path: '/evaluation', label: 'Evaluation Lab', icon: FlaskConical },
];

export const Layout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold">
            SM
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 tracking-tight">SmartMandateRetry</h1>
            <p className="text-xs text-gray-500 font-medium">Revenue Recovery</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  active
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-4 h-4 mr-3 ${active ? 'text-green-600' : 'text-gray-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center text-xs text-gray-500">
            <Activity className="w-3.5 h-3.5 mr-2 text-green-500 animate-pulse" />
            <span>OpenRouter AI Connected</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
