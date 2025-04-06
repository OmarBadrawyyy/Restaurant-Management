/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8B5E34', // Restaurant brown/wood color
          50: '#F5F0EB',
          100: '#EBE2D7',
          200: '#D7C5B0',
          300: '#C3A989',
          400: '#AF8D62',
          500: '#8B5E34',
          600: '#7D552F',
          700: '#6F4C29',
          800: '#614224',
          900: '#53391F',
          950: '#442F19',
        },
        secondary: {
          DEFAULT: '#4A6741', // Restaurant green for accent
          50: '#EDF2EC',
          100: '#DBE6D9',
          200: '#B8CDB3',
          300: '#94B48D',
          400: '#719B68',
          500: '#4A6741',
          600: '#435D3B',
          700: '#3B5234',
          800: '#34482D',
          900: '#2C3E27',
          950: '#243320',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        serif: ['Playfair Display', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      },
    },
  },
  plugins: [],
} 