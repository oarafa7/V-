/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        obsidian: '#090B0E',
        deep: '#0D1117',
        surface: '#131920',
        border: '#1E2830',
        borderLight: '#243040',
        gold: '#C9A84C',
        goldLight: '#E8C878',
        goldDim: '#8A6E30',
        text: '#D4DCE8',
        textDim: '#7A8FA6',
        textMuted: '#3D5068',
        white: '#F0F4F8',
        red: '#E05252',
        green: '#4CAF84',
        cyan: '#4A9FB5',
      },
      fontFamily: {
        display: ['CormorantGaramond'],
        mono: ['DMMonoLight'],
        body: ['InstrumentSans'],
      },
      borderRadius: {
        sm: '2px',
        md: '4px',
        lg: '8px',
      },
    },
  },
  plugins: [],
};
