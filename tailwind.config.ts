import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(2 6 23)', // slate-950
        foreground: 'rgb(241 245 249)', // slate-100
      },
      animation: {
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        'idle-glow': 'idle-glow 4s ease-in-out infinite',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(52, 211, 153, 0.3)' },
          '50%': { boxShadow: '0 0 12px 4px rgba(52, 211, 153, 0.15)' },
        },
        'idle-glow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
