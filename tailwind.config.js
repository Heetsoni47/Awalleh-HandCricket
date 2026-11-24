/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        deep: '#0f0f10',
        bg: '#141415',
        card: '#19191b',
        raised: '#232325',
        raised2: '#2b2b2e',
        fg: '#ededed',
        fg2: '#a1a1a6',
        fg3: '#85858b',
        accent: '#f0b54a',
        'accent-ink': '#1f1606',
        pos: '#4cc38a',
        neg: '#e5484d',
        four: '#6b9cf0',
        teamA: '#5fb3a1',
        teamB: '#e0896b',
        hair: 'rgba(237,237,237,0.08)',
      },
      divideColor: {
        line: 'rgba(237,237,237,0.08)',
      },
      borderColor: {
        line: 'rgba(237,237,237,0.08)',
        line2: 'rgba(237,237,237,0.14)',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      transitionTimingFunction: { out: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      keyframes: {
        rise: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        pop: { from: { opacity: 0, transform: 'scale(0.96)' }, to: { opacity: 1, transform: 'none' } },
        float: {
          '0%': { opacity: 0, transform: 'translateY(0)' },
          '12%': { opacity: 1 },
          '100%': { opacity: 0, transform: 'translateY(-140px)' },
        },
        sheet: { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
      },
      animation: {
        rise: 'rise 400ms cubic-bezier(0.22, 1, 0.36, 1) both',
        pop: 'pop 300ms cubic-bezier(0.22, 1, 0.36, 1) both',
        float: 'float 2400ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        sheet: 'sheet 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};
