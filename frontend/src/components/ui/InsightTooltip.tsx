import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { useReducedMotion } from '../../motion/useReducedMotion';

interface InsightTooltipProps {
  content: string;
  title?: string;
  children?: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const InsightTooltip: React.FC<InsightTooltipProps> = ({
  content,
  title,
  children,
  side = 'top',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const reducedMotion = useReducedMotion();

  const getPositionClasses = () => {
    switch (side) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      case 'top':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children || (
        <button
          type="button"
          aria-label="More information"
          className="text-[#94A3B8] hover:text-[#3B5BDB] focus:outline-none focus:text-[#3B5BDB] transition-colors p-0.5 rounded"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      )}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: side === 'top' ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: side === 'top' ? 2 : -2 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            role="tooltip"
            className={`absolute z-50 w-64 p-3 bg-[#0F172A] text-white rounded-xl shadow-xl border border-slate-700/60 pointer-events-none text-left ${getPositionClasses()}`}
          >
            {title && (
              <div className="text-[11px] font-bold text-slate-100 mb-1 font-sans flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3B5BDB]" />
                {title}
              </div>
            )}
            <p className="text-[11px] text-slate-300 leading-relaxed font-normal">{content}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
