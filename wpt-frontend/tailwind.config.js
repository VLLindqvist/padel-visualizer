module.exports = {
  mode: 'jit',
  purge: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'media', // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        transparent: 'transparent',
        current: 'currentColor',
        primary: {
          300: '#505C6E',
          400: '#36404E',
          500: '#1F2937',
          600: '#131F2E',
          700: '#091321'
        },
        secondary: {
          300: '#A78875',
          400: '#775E4E',
          500: '#543B2C',
          600: '#472B1A',
          700: '#32190A'
        },
        third: {
          300: '#A79C75',
          400: '#776E4E',
          500: '#544B2C',
          600: '#473D1A',
          700: '#322A0A'
        }
      }
    }
  },
  variants: {
    extend: {}
  },
  plugins: []
};
