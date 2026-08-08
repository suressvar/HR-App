/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#7C3AED',
          hover: '#6D28D9',
          light: '#EDE4FC',
          accent: '#A78BFA',
        },
        ink: {
          DEFAULT: '#1E1B2E',
          muted: '#6B6580',
        },
        border: '#E4DEF2',
      },
    },
  },
  plugins: [],
}
