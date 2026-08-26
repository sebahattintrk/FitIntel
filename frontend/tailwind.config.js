/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.tsx',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg:       '#0B0F1A',
        surface:  '#121826',
        surface2: '#171F30',
        border:   '#1F2A40',
        primary:  '#7C4DFF',
        primaryDim: '#5A36C8',
        success:  '#22C55E',
        warning:  '#F59E0B',
        danger:   '#EF4444',
        textHi:   '#F5F7FA',
        textMid:  '#B6BECF',
        textLow:  '#6F7891',
      },
      fontFamily: {
        sans: ['System'],
      },
      borderRadius: {
        xl2: '20px',
      },
    },
  },
  plugins: [],
};
