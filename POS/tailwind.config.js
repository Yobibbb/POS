/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'pos-primary': '#0066cc',
        'pos-secondary': '#003d7a',
        'pos-success': '#00a651',
        'pos-danger': '#d32f2f',
        'pos-warning': '#ff9800',
        'pos-dark': '#1a1a1a',
        'pos-gray': '#2d3748',
      },
      fontFamily: {
        'mono': ['Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
