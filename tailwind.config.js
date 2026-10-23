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
        serene: {
          bg: {
            light: '#faf9fb',
            dark: '#000000',
          },
          surface: {
            light: '#ffffff',
            dark: '#141417',
          },
          surfaceAlt: {
            light: '#f3f2f5',
            dark: '#212126',
          },
          border: {
            light: '#e2e0e5',
            dark: '#2e2e36',
          },
          primary: {
            DEFAULT: '#264d44',
            hover: '#1d3c35',
            light: '#3e655b',
            soft: '#e6f3ef',
            dark: '#34d399',
            darkHover: '#6ee7b7',
          },
          secondary: {
            DEFAULT: '#416279',
            light: '#e8f2f8',
            dark: '#38bdf8',
          },
          text: {
            primary: '#1b1c1e',
            secondary: '#5f6764',
            muted: '#54625e',
            darkPrimary: '#ffffff',
            darkSecondary: '#d4d4dc',
            darkMuted: '#a1a1aa',
          },
          accent: {
            amber: '#d97706',
            emerald: '#059669',
            sky: '#0284c7',
            rose: '#e11d48',
            purple: '#7c3aed',
          }
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card': '0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 1px 4px -1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 8px 24px -4px rgba(38, 77, 68, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'card-dark-hover': '0 8px 24px -4px rgba(0, 0, 0, 0.4), 0 4px 12px -2px rgba(165, 207, 195, 0.08)',
        'modal': '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.14s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.14s cubic-bezier(0.16, 1, 0.3, 1)',
        scaleIn: 'scaleIn 0.14s cubic-bezier(0.16, 1, 0.3, 1)',
        breathe: 'breathe 8s ease-in-out infinite',
      }
    },
  },
  plugins: [
    require('@tailwindcss/container-queries'),
  ],
}
