/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,html}'],
  theme: {
    extend: {
      colors: {
        background: '#0f0f0f',
        surface: '#1a1a1a',
        'surface-hover': '#252525',
        border: '#2a2a2a',
        primary: '#6366f1',
        'primary-hover': '#818cf8',
        text: '#ffffff',
        'text-secondary': '#888888',
        'text-muted': '#666666',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      spacing: {
        'toolbar': '56px',
        'sidebar': '320px',
        'status': '32px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': '11px',
        'sm': '12px',
        'base': '13px',
        'lg': '14px',
      },
    }
  },
  plugins: [],
}
