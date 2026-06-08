import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        siesa: {
          blue: '#1F6CF0',
          'blue-dark': '#1557C9',
          sky: '#4C9FE6',
          'blue-50': '#EAF2FE',
          'blue-100': '#D8E8FD',
          green: '#16B364',
          'green-50': '#E7F8EF',
          'green-100': '#C3EDD5',
          violet: '#6E56E0',
          'violet-50': '#EEEBFB',
          amber: '#F59E0B',
          'amber-50': '#FEF3E2',
          red: '#EF4444',
          'red-50': '#FDECEC',
          ink: '#15233B',
          text: '#5A6B85',
          muted: '#97A4B8',
          bg: '#F4F7FB',
          surface: '#FFFFFF',
          border: '#E8EDF4',
          // Legacy aliases
          primary: '#1F6CF0',
          manufactura: '#1F6CF0',
          calidad: '#16B364',
          dark: '#15233B',
          success: '#16B364',
          warning: '#F59E0B',
          danger: '#EF4444',
        },
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        figtree: ['Figtree', 'sans-serif'],
        roboto: ['Figtree', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

export default config
