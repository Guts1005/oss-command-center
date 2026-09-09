/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./client/index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: 'var(--color-bg-base)',
        surface: 'var(--color-bg-surface)',
        'surface-elevated': 'var(--color-bg-surface-elevated)',
        'surface-active': 'var(--color-bg-surface-active)',
        'border-subtle': 'var(--color-border-subtle)',
        'border-bold': 'var(--color-border-bold)',
        'border-active': 'var(--color-border-active)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'text-dim': 'var(--color-text-dim)',
        'status-merged': 'var(--color-status-merged)',
        'status-in-review': 'var(--color-status-in-review)',
        'status-awaiting-reply': 'var(--color-status-awaiting-reply)',
        'status-action-needed': 'var(--color-status-action-needed)',
        'status-draft': 'var(--color-status-draft)',
        'status-open': 'var(--color-status-open)',
        'status-bounty': 'var(--color-status-bounty)',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        telemetry: ['JetBrains Mono', 'monospace'],
        body: ['IBM Plex Sans', 'sans-serif'],
      },
      borderRadius: {
        none: '0px',
      }
    },
  },
  plugins: [],
}
