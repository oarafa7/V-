/**
 * VITAL design tokens. The source of truth for colors/fonts/spacing used by
 * non-Tailwind code (charts, SVG, inline styles). Mirrors tailwind.config.js.
 */
export const colors = {
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
} as const;

export const fonts = {
  display: 'CormorantGaramond', // serif — headings, values
  mono: 'DMMonoLight', // monospace — labels, codes
  body: 'InstrumentSans', // sans — body text
} as const;

export const radius = { sm: 2, md: 4, lg: 8 } as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Status → color, kept in sync with @vital/shared STATUS_COLORS. */
export const statusColors = {
  optimal: colors.green,
  suboptimal: colors.gold,
  alert: colors.red,
  untested: colors.textMuted,
} as const;
