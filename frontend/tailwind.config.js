/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        canvas: '#F8FAF8',
        card: '#FFFFFF',
        mint: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          500: '#10B981',
          700: '#047857',
          900: '#064E3B',
        },
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '28px',
      },
    },
  },
  plugins: [],
};