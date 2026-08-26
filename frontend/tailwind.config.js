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
          // Canvas & Neutral System
          canvas: '#F7F9FC',        // Pearl/slate light canvas
          surface: '#FFFFFF',       // Pure white card surface
          surfaceMuted: '#F1F5F9',  // Slate-100 secondary surface
          border: '#E5E7EB',        // Standard neutral border
          borderStrong: '#CBD5E1',  // Strong/active border

          // Typography
          textPrimary: '#111827',   // Primary high-contrast text
          textSecondary: '#475569', // Secondary body text
          textMuted: '#64748B',     // Muted secondary text
          disabled: '#94A3B8',      // Disabled text

          // Primary — Sapphire (Recovery / Product / Action)
          sapphire: '#3B5BDB',
          sapphireDark: '#3048B8',
          sapphireSoft: '#EEF2FF',
          sapphireRing: '#C7D2FE',

          // Payment Infrastructure — Aqua (Rails / Gateway / Webhooks)
          aqua: '#0891B2',
          aquaDark: '#0E7490',
          aquaSoft: '#ECFEFF',
          aquaRing: '#A5F3FC',

          // AI Intelligence — Violet (AI Decision / Confidence / Explainability)
          violet: '#7C3AED',
          violetDark: '#6D28D9',
          violetSoft: '#F5F3FF',
          violetRing: '#DDD6FE',

          // Recovery / Success — Emerald
          emerald: '#059669',
          emeraldSoft: '#ECFDF5',
          emeraldRing: '#A7F3D0',

          // Review / Escalation — Amber
          amber: '#D97706',
          amberSoft: '#FFFBEB',
          amberRing: '#FDE68A',

          // Risk / Hard Stop — Rose
          rose: '#E11D48',
          roseSoft: '#FFF1F2',
          roseRing: '#FECDD3',
        }
      },
      boxShadow: {
        'fintech-subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'fintech-card': '0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -2px rgba(0, 0, 0, 0.03), 0 0 0 1px rgba(229, 231, 235, 0.8)',
        'fintech-elevated': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.03), 0 0 0 1px rgba(229, 231, 235, 0.9)',
        'fintech-modal': '0 25px 50px -12px rgba(17, 24, 39, 0.15), 0 0 0 1px rgba(229, 231, 235, 0.8)',
        'glow-sapphire': '0 0 15px -3px rgba(59, 91, 219, 0.25)',
        'glow-emerald': '0 0 15px -3px rgba(5, 150, 105, 0.25)',
      }
    },
  },
  plugins: [],
}
