/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // ── Cybersecurity dark palette ─────────────────────────────────────────
      colors: {
        cyber: {
          bg:       '#0a0f1e',   // deepest background
          surface:  '#0f172a',   // card / panel background
          border:   '#1e293b',   // subtle borders
          muted:    '#334155',   // muted text / dividers
          text:     '#e2e8f0',   // primary text
          dim:      '#94a3b8',   // secondary text
          accent:   '#38bdf8',   // sky-blue accent / links
          green:    '#22d3ee',   // success / info
          yellow:   '#fbbf24',   // warning / medium severity
          orange:   '#f97316',   // high severity
          red:      '#f43f5e',   // critical / danger
          purple:   '#a78bfa',   // charts / misc
        },
      },
      // ── Glassmorphism utilities ────────────────────────────────────────────
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        glass:  '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        glow:   '0 0 20px rgba(56, 189, 248, 0.3)',
        danger: '0 0 20px rgba(244, 63, 94, 0.3)',
      },
      // ── Animation ─────────────────────────────────────────────────────────
      animation: {
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':     'fadeIn 0.3s ease-in-out',
        'slide-in':    'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%':   { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',      opacity: '1' },
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
