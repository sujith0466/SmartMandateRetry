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
          // Canvas & Surfaces
          canvas: '#F8FAFC',        // Slate-50 background for clean light fintech aesthetic
          surface: '#FFFFFF',       // Card surface white
          surfaceMuted: '#F1F5F9',  // Slate-100 secondary surface
          border: '#E2E8F0',        // Slate-200 clean border
          borderSubtle: '#CBD5E1',  // Slate-300 active/focused border

          // Typography
          textPrimary: '#0F172A',   // Slate-900 high-contrast primary text
          textSecondary: '#475569', // Slate-600/700 body text
          textMuted: '#64748B',     // Slate-500 secondary/meta text
          disabled: '#94A3B8',      // Slate-400 disabled text

          // Primary: Royal Blue (Option B)
          primary: '#2563EB',       // Royal Blue 600
          primaryHover: '#1D4ED8',  // Royal Blue 700
          primaryLight: '#EFF6FF',  // Blue-50
          primaryBorder: '#BFDBFE', // Blue-200

          // Accent: Cyan (Infrastructure / Rails)
          cyan: '#06B6D4',          // Cyan 600
          cyanLight: '#ECFEFF',     // Cyan-50
          cyanBorder: '#A5F3FC',    // Cyan-200

          // AI / Intelligence: Indigo
          ai: '#6366F1',            // Indigo 500
          aiLight: '#EEF2FF',       // Indigo-50
          aiBorder: '#C7D2FE',      // Indigo-200

          // Success: Emerald (Recovery / Settled)
          emerald: '#059669',       // Emerald 600
          emeraldBg: '#ECFDF5',     // Emerald-50
          emeraldBorder: '#A7F3D0', // Emerald-200

          // Warning / Review: Amber (High-Value / Escalated)
          amber: '#D97706',         // Amber 600
          amberBg: '#FFFBEB',       // Amber-50
          amberBorder: '#FDE68A',   // Amber-200

          // Risk / Hard Stop: Rose
          rose: '#E11D48',          // Rose 600
          roseBg: '#FFF1F2',        // Rose-50
          roseBorder: '#FECDD3',    // Rose-200
        }
      },
      boxShadow: {
        'fintech-subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'fintech-card': '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(226, 232, 240, 0.8)',
        'fintech-elevated': '0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(226, 232, 240, 0.9)',
        'fintech-modal': '0 25px 50px -12px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(226, 232, 240, 0.8)',
        'glow-emerald': '0 0 15px -3px rgba(5, 150, 105, 0.25)',
        'glow-blue': '0 0 15px -3px rgba(37, 99, 235, 0.25)',
      }
    },
  },
  plugins: [],
}
