/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['"Geist Sans"', 'system-ui', 'sans-serif'],
        display: ['"Geist Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'Menlo', 'Monaco', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
          50: 'hsl(var(--accent-50) / <alpha-value>)',
          100: 'hsl(var(--accent-100) / <alpha-value>)',
          200: 'hsl(var(--accent-200) / <alpha-value>)',
          300: 'hsl(var(--accent-300) / <alpha-value>)',
          400: 'hsl(var(--accent-400) / <alpha-value>)',
          500: 'hsl(var(--accent-500) / <alpha-value>)',
          600: 'hsl(var(--accent-600) / <alpha-value>)',
          700: 'hsl(var(--accent-700) / <alpha-value>)',
          800: 'hsl(var(--accent-800) / <alpha-value>)',
          900: 'hsl(var(--accent-900) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        surface: {
          100: 'hsl(var(--surface-100) / <alpha-value>)',
          200: 'hsl(var(--surface-200) / <alpha-value>)',
          300: 'hsl(var(--surface-300) / <alpha-value>)',
          400: 'hsl(var(--surface-400) / <alpha-value>)',
          500: 'hsl(var(--surface-500) / <alpha-value>)',
          600: 'hsl(var(--surface-600) / <alpha-value>)',
          700: 'hsl(var(--surface-700) / <alpha-value>)',
          800: 'hsl(var(--surface-800) / <alpha-value>)',
          900: 'hsl(var(--surface-900) / <alpha-value>)',
          950: 'hsl(var(--surface-950) / <alpha-value>)',
        },
        warning: {
          300: 'hsl(var(--warning-300) / <alpha-value>)',
          400: 'hsl(var(--warning-400) / <alpha-value>)',
          500: 'hsl(var(--warning-500) / <alpha-value>)',
          600: 'hsl(var(--warning-600) / <alpha-value>)',
          700: 'hsl(var(--warning-700) / <alpha-value>)',
        },
        danger: {
          300: 'hsl(var(--danger-300) / <alpha-value>)',
          400: 'hsl(var(--danger-400) / <alpha-value>)',
          500: 'hsl(var(--danger-500) / <alpha-value>)',
          600: 'hsl(var(--danger-600) / <alpha-value>)',
          700: 'hsl(var(--danger-700) / <alpha-value>)',
        },
        action: {
          primary: {
            DEFAULT: 'hsl(var(--action-primary) / <alpha-value>)',
            foreground: 'hsl(var(--action-primary-foreground) / <alpha-value>)',
            hover: 'hsl(var(--action-primary-hover) / <alpha-value>)',
            border: 'hsl(var(--action-primary-border) / <alpha-value>)',
          },
        },
        banner: {
          warning: {
            DEFAULT: 'hsl(var(--warning-banner) / <alpha-value>)',
            foreground: 'hsl(var(--warning-banner-foreground) / <alpha-value>)',
            link: 'hsl(var(--warning-banner-link) / <alpha-value>)',
          },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.18s ease-out',
        'slide-in-right': 'slideInRight 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};
