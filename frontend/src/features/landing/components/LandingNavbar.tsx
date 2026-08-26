import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, ArrowRight, LayoutDashboard, Menu, X } from 'lucide-react';
import { useReducedMotion } from '../../../motion/useReducedMotion';

export const LandingNavbar: React.FC = () => {
  const reducedMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-white/85 backdrop-blur-md border-b border-[#E5E7EB] shadow-xs py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/landing" className="flex items-center space-x-3 group select-none">
          <motion.div
            whileHover={reducedMotion ? {} : { scale: 1.05 }}
            transition={{ duration: 0.15 }}
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3B5BDB] via-[#7C3AED] to-[#0891B2] flex items-center justify-center text-white font-black text-sm shadow-sm shadow-[#3B5BDB]/20"
          >
            <Zap className="w-4 h-4 text-white fill-white" />
          </motion.div>
          <div>
            <span className="text-base font-extrabold tracking-tight text-[#111827] flex items-center gap-1.5 font-sans">
              SmartMandate
              <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE]">
                ENTERPRISE
              </span>
            </span>
          </div>
        </Link>

        {/* Desktop Nav Anchors */}
        <nav className="hidden md:flex items-center space-x-7 text-xs font-bold text-[#475569]">
          <button onClick={() => scrollToSection('problem')} className="hover:text-[#111827] transition-colors">
            Problem
          </button>
          <button onClick={() => scrollToSection('architecture')} className="hover:text-[#111827] transition-colors">
            Dual-Brain Architecture
          </button>
          <button onClick={() => scrollToSection('how-it-works')} className="hover:text-[#111827] transition-colors">
            How It Works
          </button>
          <button onClick={() => scrollToSection('financials')} className="hover:text-[#111827] transition-colors">
            Financial Impact
          </button>
          <button onClick={() => scrollToSection('trust')} className="hover:text-[#111827] transition-colors">
            Enterprise Trust
          </button>
        </nav>

        {/* CTA Actions */}
        <div className="hidden md:flex items-center space-x-3">
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B5BDB] hover:bg-[#3048B8] text-white text-xs font-bold shadow-xs transition-all duration-150"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Open Merchant Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl bg-white border border-[#E5E7EB] text-[#475569]"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-white border-b border-[#E5E7EB] px-6 py-5 space-y-4 shadow-lg"
        >
          <nav className="flex flex-col space-y-3 text-sm font-bold text-[#475569]">
            <button onClick={() => scrollToSection('problem')} className="text-left py-1 hover:text-[#111827]">
              The Problem
            </button>
            <button onClick={() => scrollToSection('architecture')} className="text-left py-1 hover:text-[#111827]">
              Dual-Brain Architecture
            </button>
            <button onClick={() => scrollToSection('how-it-works')} className="text-left py-1 hover:text-[#111827]">
              How It Works
            </button>
            <button onClick={() => scrollToSection('financials')} className="text-left py-1 hover:text-[#111827]">
              Financial Impact
            </button>
            <button onClick={() => scrollToSection('trust')} className="text-left py-1 hover:text-[#111827]">
              Enterprise Trust
            </button>
          </nav>
          <div className="pt-3 border-t border-[#E5E7EB]">
            <Link
              to="/"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B5BDB] text-white text-xs font-bold"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Open Merchant Console</span>
            </Link>
          </div>
        </motion.div>
      )}
    </header>
  );
};
