/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,jsx}",
    "./chordSelectorModal.jsx",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Times New Roman', 'Georgia', 'serif'],
        chord: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        modalFadeIn: {
          '0%': { 
            opacity: '0',
            transform: 'scale(0.95) translateY(-10px)',
          },
          '100%': { 
            opacity: '1',
            transform: 'scale(1) translateY(0)',
          },
        },
        zoomIn: {
          '0%': { 
            opacity: '0',
            transform: 'scale(0.95)',
          },
          '100%': { 
            opacity: '1',
            transform: 'scale(1)',
          },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'modal-fade-in': 'modalFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'zoom-in': 'zoomIn 0.3s ease-out',
      },
    },
  },
  plugins: [],
}


