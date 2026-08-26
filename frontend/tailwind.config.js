/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fintech: {
          canvas: '#F8FAFC',        // Slate-50 background for clean light fintech aesthetic
          surface: '#FFFFFF',       // Card surface white
          surfaceMuted: '#F1F5F9',  // Slate-100 secondary surface
          border: '#E2E8F0',        // Slate-200 clean border
          borderSubtle: '#CBD5E1',  // Slate-300 active/focused border
          textPrimary: '#0F172A',   // Slate-900 high-contrast primary text
          textSecondary: '#334155', // Slate-700 body text
          textMuted: '#64748B',     // Slate-500 secondary/meta text
          navy: '#0B132B',          // Deep navy sidebar & brand anchor
          navySurface: '#1C2541',   // Navy sidebar card surface
          emerald: '#059669',       // Recovery / Success Green
          emeraldBg: '#ECFDF5',     // Emerald-50
          emeraldBorder: '#A7F3D0', // Emerald-200
          indigo: '#4338CA',        // Primary Indigo Brand / Action
          indigoBg: '#EEF2FF',      // Indigo-50
          indigoBorder: '#C7D2FE',  // Indigo-200
          violet: '#7C3AED',        // AI Intelligence Purple
          violetBg: '#F5F3FF',      // Violet-50
          violetBorder: '#DDD6FE',  // Violet-200
          amber: '#D97706',         // Review / Warning Amber
          amberBg: '#FFFBEB',       // Amber-50
          amberBorder: '#FDE68A',   // Amber-200
          rose: '#E11D48',          // Hard Decline / Error Rose
          roseBg: '#FFF1F2',        // Rose-50
          roseBorder: '#FECDD3',    // Rose-200
          cyan: '#0284C7',          // Automation / Gateway Blue
          cyanBg: '#F0F9FF',        // Sky-50
          cyanBorder: '#BAE6FD',    // Sky-200
        }
      },
      boxShadow: {
        'fintech-subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'fintech-card': '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(226, 232, 240, 0.8)',
        'fintech-elevated': '0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(226, 232, 240, 0.9)',
        'fintech-modal': '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
        'glow-emerald': '0 0 15px -3px rgba(5, 150, 105, 0.25)',
        'glow-indigo': '0 0 15px -3px rgba(67, 56, 202, 0.25)',
      }
    },
  },
  plugins: [],
}
