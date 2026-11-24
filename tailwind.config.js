/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          navy: {
            950: '#070D1E',
            900: '#0A1128',
            800: '#0F1A3B',
            700: '#16234F',
            600: '#1E3067',
          },
          blue: {
            DEFAULT: '#2563EB',
            light: '#38BDF8',
            electric: '#00D2FF',
            glow: '#00D2FF33',
            dark: '#1D4ED8',
          },
          purple: {
            DEFAULT: '#7C3AED',
            light: '#A855F7',
            electric: '#C084FC',
            glow: '#7C3AED33',
            dark: '#6D28D9',
          },
          whatsapp: {
            DEFAULT: '#25D366',
            hover: '#20BA5A',
            dark: '#128C7E',
            deep: '#075E54',
          }
        }
      },
      boxShadow: {
        'glow-blue': '0 0 25px -5px rgba(0, 210, 255, 0.45)',
        'glow-purple': '0 0 25px -5px rgba(124, 58, 237, 0.45)',
        'glow-combo': '0 0 35px -5px rgba(37, 99, 235, 0.35), 0 0 20px -5px rgba(124, 58, 237, 0.25)',
        'glow-whatsapp': '0 0 25px -3px rgba(37, 211, 102, 0.45)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s infinite ease-in-out',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        }
      }
    },
  },
  plugins: [],
}
