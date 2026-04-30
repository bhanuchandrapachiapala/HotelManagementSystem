import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        orange: {
          DEFAULT: '#F47920',
          dark: '#C95E10',
          light: '#FEF0E6',
        },
        yellow: {
          hotel: '#FDB924',
          light: '#FFF8E7',
        },
        brand: {
          black: '#1A1A1A',
        },
        green: {
          DEFAULT: '#2D8653',
          light: '#E8F5EE',
        },
        red: {
          DEFAULT: '#D64045',
          light: '#FDEEEE',
        },
        blue: {
          DEFAULT: '#1A6FAB',
          light: '#E8F0FB',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Source Sans 3', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}

export default config
