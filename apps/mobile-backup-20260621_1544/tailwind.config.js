/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{vue,ts,js}'],
  theme: {
    extend: {
      colors: {
        background: '#faf8f5',
        foreground: '#2c2c2c',
        card: '#ffffff',
        'card-foreground': '#2c2c2c',
        primary: {
          DEFAULT: '#c41e3a',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#f5f1eb',
          foreground: '#2c2c2c',
        },
        muted: {
          DEFAULT: '#f0ebe5',
          foreground: '#999999',
        },
        accent: {
          DEFAULT: '#c9a96e',
          foreground: '#2c2c2c',
        },
        destructive: {
          DEFAULT: '#ff4d4f',
          foreground: '#ffffff',
        },
        border: '#e8e0d5',
        input: '#f5f1eb',
        ring: '#c41e3a',
        brand: { DEFAULT: '#c41e3a', soft: '#d94452' },
        gold: '#c9a96e',
        surface: { DEFAULT: '#ffffff', base: '#faf8f5', sunken: '#f2efea' },
        line: '#e8e0d5',
        ink: { DEFAULT: '#2c2c2c', soft: '#666666', faint: '#999999' },
        info: '#1890ff',
        success: '#52c41a',
        warning: '#fa8c16',
        danger: '#ff4d4f',
        operator: { DEFAULT: '#722ed1', soft: '#9254de' },
        institute: { DEFAULT: '#13c2c2', soft: '#36cfc9' },
        live: { DEFAULT: '#eb2f96', soft: '#f759ab' },
        station: { DEFAULT: '#52c41a', soft: '#73d13d' },
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'fade-in-up': { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'slide-in-from-bottom': { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        'slide-in-from-left': { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(0)' } },
        'slide-in-from-right': { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'skeleton-pulse': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-in-up': 'fade-in-up 0.4s ease-out',
        'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out',
        'slide-in-from-left': 'slide-in-from-left 0.3s ease-out',
        'slide-in-from-right': 'slide-in-from-right 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'pulse-slow': 'skeleton-pulse 2s ease-in-out infinite',
        'in': 'fade-in 0.3s ease-out',
        'spin-slow': 'spin 2s linear infinite',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
      },
      fontFamily: {
        sans: ['Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'system-ui', 'sans-serif'],
        serif: ['Noto Serif SC', 'Songti SC', 'SimSun', 'serif'],
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // 禁用 Tailwind 的 CSS Reset，UniApp 有自己的基础样式
  },
}
