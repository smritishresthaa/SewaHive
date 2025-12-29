module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],

  safelist: [
    'fade-up',
    'step-pop',
    'step-slide',
    'animate',
  ],

  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
      },

      colors: {
        brand: {
          50: '#effaf2',
          100: '#d8f2de',
          200: '#b4e5c3',
          300: '#89d3a3',
          400: '#5cc080',
          500: '#2fae5e',
          600: '#238c4b',
          700: '#1c6c3b',
          800: '#164f2b',
          900: '#103620',
        },
      },
    },
  },

  plugins: [],
};
