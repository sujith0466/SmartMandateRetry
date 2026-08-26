import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  Inbox,
  BarChart3,
  ShieldCheck,
  FileText,
  FlaskConical,
  ShieldAlert,
  CheckCircle2,
  Sliders,
  ArrowRight,
  Sparkles,
  X,
} from 'lucide-react';
import { useReducedMotion } from '../../motion/useReducedMotion';

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Quick Filters' | 'Governance & Simulation';
  icon: React.ElementType;
  shortcut?: string;
  action: () => void;
  badge?: string;
}

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandMenu: React.FC<CommandMenuProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commandItems: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Recovery Dashboard',
      category: 'Navigation',
      icon: LayoutDashboard,
      shortcut: 'G D',
      action: () => navigate('/dashboard'),
    },
    {
      id: 'nav-cases',
      title: 'Recovery Cases Workspace',
      category: 'Navigation',
      icon: Inbox,
      shortcut: 'G C',
      action: () => navigate('/cases'),
    },
    {
      id: 'nav-analytics',
      title: 'Revenue Analytics',
      category: 'Navigation',
      icon: BarChart3,
      shortcut: 'G A',
      action: () => navigate('/analytics'),
    },
    {
      id: 'nav-policies',
      title: 'Safety Policies & Guardrails',
      category: 'Navigation',
      icon: ShieldCheck,
      shortcut: 'G P',
      action: () => navigate('/policies'),
    },
    {
      id: 'nav-audit',
      title: 'Compliance Audit Trail',
      category: 'Navigation',
      icon: FileText,
      shortcut: 'G L',
      action: () => navigate('/audit'),
    },
    {
      id: 'nav-evaluation',
      title: 'Evaluation Benchmark Lab',
      category: 'Navigation',
      icon: FlaskConical,
      shortcut: 'G E',
      action: () => navigate('/evaluation'),
    },

    // Quick Filters
    {
      id: 'filter-escalations',
      title: 'View Escalated Cases (Review Queue)',
      category: 'Quick Filters',
      icon: ShieldAlert,
      badge: 'Action Required',
      action: () => navigate('/cases?tab=escalations'),
    },
    {
      id: 'filter-recovered',
      title: 'View Recovered Settlement Cases',
      category: 'Quick Filters',
      icon: CheckCircle2,
      badge: '+17.1 pp Uplift',
      action: () => navigate('/cases?tab=recovered'),
    },
    {
      id: 'filter-active',
      title: 'View Active Interventions (Smart Retry & Links)',
      category: 'Quick Filters',
      icon: Sparkles,
      action: () => navigate('/cases?tab=active'),
    },

    // Governance & Simulation
    {
      id: 'gov-whatif',
      title: 'Open What-If Policy Simulation Studio',
      category: 'Governance & Simulation',
      icon: Sliders,
      badge: 'Instant / Non-Mutating',
      action: () => navigate('/policies'),
    },
  ];

  const filteredItems = commandItems.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation inside menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
        />

        {/* Command Box */}
        <motion.div
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] overflow-hidden z-10 flex flex-col max-h-[75vh]"
        >
          {/* Search Input Bar */}
          <div className="flex items-center px-4 py-3.5 border-b border-[#E5E7EB] bg-white gap-3">
            <Search className="w-4 h-4 text-[#64748B] shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Type a command, page name, or quick filter..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 text-sm bg-transparent border-none outline-none text-[#111827] placeholder-[#94A3B8] font-medium"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
                ESC
              </span>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#111827] hover:bg-[#F1F5F9] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B]">
                No commands matching &ldquo;<span className="text-[#111827] font-semibold">{query}</span>&rdquo;
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const Icon = item.icon;
                const isSelected = index === selectedIndex;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      item.action();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                      isSelected ? 'bg-[#EEF2FF] text-[#3B5BDB]' : 'hover:bg-[#F7F9FC] text-[#475569]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-1.5 rounded-lg border ${
                          isSelected
                            ? 'bg-white border-[#C7D2FE] text-[#3B5BDB]'
                            : 'bg-[#F7F9FC] border-[#E5E7EB] text-[#64748B]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={`font-bold ${isSelected ? 'text-[#111827]' : 'text-[#334155]'}`}>
                          {item.title}
                        </div>
                        <div className="text-[10px] text-[#64748B]">{item.category}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                          {item.badge}
                        </span>
                      )}
                      {item.shortcut && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
                          {item.shortcut}
                        </span>
                      )}
                      {isSelected && <ArrowRight className="w-3.5 h-3.5 text-[#3B5BDB]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Guide */}
          <div className="px-4 py-2.5 bg-[#F7F9FC] border-t border-[#E5E7EB] flex items-center justify-between text-[11px] text-[#64748B]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="font-mono px-1 py-0.2 rounded bg-white border border-[#E2E8F0]">↑</span>
                <span className="font-mono px-1 py-0.2 rounded bg-white border border-[#E2E8F0]">↓</span> Navigate
              </span>
              <span className="flex items-center gap-1">
                <span className="font-mono px-1 py-0.2 rounded bg-white border border-[#E2E8F0]">↵</span> Select
              </span>
            </div>
            <span className="text-[10px] font-mono">SmartMandate Quick Action</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
