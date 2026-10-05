/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./client/index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundColor: {
        base: 'var(--color-bg-base)',
      },
      colors: {
        substrate: 'var(--color-bg-base)',
        surface: 'var(--color-bg-surface)',
        'surface-card': 'var(--color-bg-surface-card)',
        'surface-elevated': 'var(--color-bg-surface-elevated)',
        'surface-active': 'var(--color-bg-surface-active)',
        'border-subtle': 'var(--color-border-subtle)',
        'border-bold': 'var(--color-border-bold)',
        'border-active': 'var(--color-border-active)',
        'text-primary': 'var(--color-text-primary)',
        'text-whisper': 'var(--color-text-whisper)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'text-dim': 'var(--color-text-dim)',
        'accent-sapphire': 'var(--color-accent-sapphire)',
        'accent-glacial': 'var(--color-accent-glacial)',
        'status-merged': 'var(--color-status-merged)',
        'status-in-review': 'var(--color-status-in-review)',
        'status-awaiting-reply': 'var(--color-status-awaiting-reply)',
        'status-action-needed': 'var(--color-status-action-needed)',
        'status-draft': 'var(--color-status-draft)',
        'status-open': 'var(--color-status-open)',
        'status-bounty': 'var(--color-status-bounty)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'IBM Plex Sans', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'IBM Plex Sans', 'sans-serif'],
        body: ['IBM Plex Sans', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        telemetry: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        'elevated': 'var(--shadow-elevated)',
        'glow-sapphire': '0 0 24px -2px rgba(116, 157, 208, 0.25)',
      }
    },
  },
  plugins: [],
}
