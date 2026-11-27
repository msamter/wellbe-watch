// Material 3 Expressive design tokens & spring physics adapted for WELLBE+ Watch (Dark OLED)

export const m3Colors = {
  surface: '#121514',
  surfaceContainerLow: '#161A18',
  surfaceContainer: '#181C1B',
  surfaceContainerHigh: '#202523',
  surfaceContainerHighest: '#262C2A',
  primary: '#63D4A3',
  onPrimary: '#0B1A13',
  primaryContainer: '#152920',
  onPrimaryContainer: '#A4DCC0',
  secondaryContainer: '#23303B',
  onSecondaryContainer: '#B0CCE5',
  tertiaryContainer: '#332D1F',
  onTertiaryContainer: '#F0D57B',
  errorContainer: '#372622',
  onErrorContainer: '#F0B0A3',
  onSurface: '#F4F6F5',
  onSurfaceVariant: '#9CA3A0',
  outlineVariant: '#2B312F',
} as const;

// Official Material 3 Expressive Spring Schemes (motion/react)
export const m3Springs = {
  // For small interactive elements (buttons, chips, toggles, shape morphs)
  fastSpatial: {
    type: 'spring' as const,
    stiffness: 800,
    damping: 32,
    mass: 1,
  },
  // For cards, layout shifts, and staggered list reveals
  defaultSpatial: {
    type: 'spring' as const,
    stiffness: 380,
    damping: 26,
    mass: 1,
  },
  // Critically damped (no bounce) for opacity and tonal transitions
  defaultEffects: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 40,
    mass: 1,
  },
};

// Organic Material 3 Expressive shape masks
export const m3Shapes = {
  pill: '999px',
  extraLarge: '28px',
  cardWatch: '20px',
  large: '16px',
  squirclePress: '14px',
  medium: '12px',
  selectedChip: '10px',
  // Organic "Cookie / Squircle" silhouette
  organicBlob: '38% 62% 63% 37% / 41% 44% 56% 59%',
  // 8-sided Scalloped "Cookie" polygon
  cookie8:
    'polygon(50% 0%, 68% 9%, 88% 12%, 91% 32%, 100% 50%, 91% 68%, 88% 88%, 68% 91%, 50% 100%, 32% 91%, 12% 88%, 9% 68%, 0% 50%, 9% 32%, 12% 12%, 32% 9%)',
} as const;
