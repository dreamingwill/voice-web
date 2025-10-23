/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0f766e',
        danger: '#dc2626',
        warning: '#f59e0b',
      },
    },
  },
  plugins: [],
}
