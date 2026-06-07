/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff4ee',
          100: '#ffe6d5',
          200: '#ffc9a8',
          300: '#ffa070',
          400: '#ff7a40',
          500: '#FF6B35',
          600: '#e84e15',
          700: '#c03a0f',
          800: '#9a3015',
          900: '#7c2b16',
          950: '#431208',
        },
        dark: {
          50: '#f5f0ff',
          100: '#ede2ff',
          200: '#d9c5ff',
          300: '#be97ff',
          400: '#9f5fff',
          500: '#8332ff',
          600: '#7010f5',
          700: '#5e0dd8',
          800: '#4e0fb0',
          900: '#3d0d8c',
          950: '#1A0533',
        },
        surface: {
          50: '#2a0f4a',
          100: '#241040',
          200: '#1e0d38',
          300: '#180b30',
          400: '#140928',
          500: '#100720',
          600: '#0c0518',
          700: '#080310',
          800: '#040208',
          900: '#020104',
        },
        card: {
          DEFAULT: 'rgba(42, 15, 74, 0.6)',
          solid: '#2a0f4a',
        }
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-in': 'slideIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'bounce-subtle': 'bounceSubtle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(255, 107, 53, 0.3)',
        'glow-lg': '0 0 40px rgba(255, 107, 53, 0.4)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.3)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #1A0533 0%, #2d0a5f 50%, #1a0533 100%)',
      }
    },
  },
  plugins: [],
}
