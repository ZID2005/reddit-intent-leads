/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        carbon: {
          DEFAULT: '#171717',
          dark: '#171717',
          card: '#1E1E1E',
          light: '#262626',
        },
        lime: {
          DEFAULT: '#C6FF34',
          accent: '#C6FF34',
        },
        mutedText: '#888888',
        amberAccent: '#FFB347',
        slateAccent: '#555555'
      },
      fontFamily: {
        mono: ['"DM Mono"', 'monospace'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
