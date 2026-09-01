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
        primary: {
          50: '#E8F0FE',
          100: '#D2E3FC',
          200: '#AECBFA',
          300: '#8AB4F8',
          400: '#669DF6',
          500: '#1A73E8',
          600: '#185ABC',
          700: '#1557B0',
          800: '#174EA6',
          900: '#0D3C61',
          DEFAULT: '#1A73E8',
        },
        success: {
          50: '#E6F4EA',
          100: '#CEEAD6',
          500: '#34A853',
          600: '#2D9247',
          700: '#1E8E3E',
          DEFAULT: '#34A853',
        },
        warning: {
          50: '#FEF7E0',
          100: '#FEEFC3',
          500: '#FBBC04',
          600: '#F29900',
          700: '#E37400',
          DEFAULT: '#FBBC04',
        },
        danger: {
          50: '#FCE8E6',
          100: '#FAD2CF',
          500: '#EA4335',
          600: '#D93025',
          700: '#C5221F',
          DEFAULT: '#EA4335',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#1E293B',
          alt: '#F8F9FA'
        }
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
        tajawal: ['Tajawal', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
      },
      boxShadow: {
        'medical': '0 4px 20px -2px rgba(26, 115, 232, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'emergency': '0 0 25px rgba(234, 67, 53, 0.35)',
        'card-hover': '0 10px 30px -5px rgba(26, 115, 232, 0.15)',
      },
      keyframes: {
        pulseFast: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.75, transform: 'scale(1.05)' },
        },
        waveform: {
          '0%, 100%': { height: '8px' },
          '50%': { height: '32px' },
        }
      },
      animation: {
        'pulse-fast': 'pulseFast 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'waveform': 'waveform 1s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
