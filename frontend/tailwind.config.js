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
          canvas: '#090D16',
          card: '#0F172A',
          cardBorder: '#1E293B',
          cardHover: '#1E293B',
          subtle: '#334155',
          textMuted: '#94A3B8',
          textPrimary: '#F8FAFC',
          emerald: '#10B981',
          emeraldGlow: 'rgba(16, 185, 129, 0.15)',
          indigo: '#6366F1',
          indigoGlow: 'rgba(99, 102, 241, 0.15)',
          violet: '#8B5CF6',
          violetGlow: 'rgba(139, 92, 246, 0.15)',
          amber: '#F59E0B',
          amberGlow: 'rgba(245, 158, 11, 0.15)',
          rose: '#F43F5E',
          roseGlow: 'rgba(244, 63, 94, 0.15)',
          cyan: '#06B6D4',
        }
      },
      boxShadow: {
        'glow-emerald': '0 0 20px -5px rgba(16, 185, 129, 0.3)',
        'glow-indigo': '0 0 20px -5px rgba(99, 102, 241, 0.3)',
        'glow-violet': '0 0 20px -5px rgba(139, 92, 246, 0.3)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}
