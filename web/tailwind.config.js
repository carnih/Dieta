/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Token storici dell'app (mirror delle CSS var in src/styles/index.css)
        nic: { DEFAULT: '#3B82F6', light: '#EFF6FF' }, // Nicholas (blu)
        noemi: { DEFAULT: '#E879A0', light: '#FDF2F8' }, // Noemi (rosa)
        spesa: '#059669', // verde spesa
        bg: '#F1FAF6',
        card: '#FFFFFF',
        ink: '#111827',
        muted: '#8B97A6',
        line: '#E6EFEA',
      },
      fontFamily: {
        sans: ['"Nunito Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        round: ['"Varela Round"', '"Nunito Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(60,80,70,.04), 0 8px 24px -12px rgba(60,80,70,.12)',
      },
    },
  },
  plugins: [],
};
