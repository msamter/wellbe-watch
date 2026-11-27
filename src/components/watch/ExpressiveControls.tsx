import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check } from 'lucide-react';
import { m3Colors, m3Shapes, m3Springs } from '../../styles/m3Tokens';

export type ExpressiveButtonVariant =
  | 'filled'
  | 'tonal'
  | 'outlined'
  | 'text'
  | 'danger'
  | 'blue';

export type ExpressiveButtonSize = 'xs' | 'sm' | 'md' | 'lg';
export type ExpressiveTone = 'dark' | 'light';

export interface ExpressiveButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'
  > {
  variant?: ExpressiveButtonVariant;
  size?: ExpressiveButtonSize;
  tone?: ExpressiveTone;
  selected?: boolean;
  fullWidth?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  accentColor?: string;
  surfaceColor?: string;
  borderColor?: string;
  children: React.ReactNode;
}

const BUTTON_SIZES: Record<
  ExpressiveButtonSize,
  { minHeight: number; paddingX: number; fontSize: number; gap: number; pressRadius: string }
> = {
  xs: { minHeight: 28, paddingX: 11, fontSize: 10.5, gap: 5, pressRadius: '10px' },
  sm: { minHeight: 34, paddingX: 14, fontSize: 11.5, gap: 6, pressRadius: '12px' },
  md: { minHeight: 40, paddingX: 18, fontSize: 12.5, gap: 7, pressRadius: '14px' },
  lg: { minHeight: 48, paddingX: 22, fontSize: 14, gap: 8, pressRadius: '16px' },
};

function resolveButtonPalette(
  variant: ExpressiveButtonVariant,
  selected: boolean,
  tone: ExpressiveTone,
  overrides?: { accentColor?: string; surfaceColor?: string; borderColor?: string }
) {
  if (overrides?.surfaceColor || overrides?.accentColor || overrides?.borderColor) {
    return {
      backgroundColor: overrides.surfaceColor ?? m3Colors.surfaceContainerHigh,
      color: overrides.accentColor ?? m3Colors.onSurface,
      borderColor: overrides.borderColor ?? 'transparent',
    };
  }

  if (tone === 'light') {
    if (selected) {
      return {
        backgroundColor: '#0f172a',
        color: '#ffffff',
        borderColor: 'transparent',
      };
    }
    switch (variant) {
      case 'filled':
        return {
          backgroundColor: '#059669',
          color: '#ffffff',
          borderColor: 'transparent',
        };
      case 'tonal':
        return {
          backgroundColor: '#e2e8f0',
          color: '#0f172a',
          borderColor: 'transparent',
        };
      case 'outlined':
        return {
          backgroundColor: '#ffffff',
          color: '#334155',
          borderColor: '#cbd5e1',
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
          color: '#0f172a',
          borderColor: 'transparent',
        };
      case 'danger':
        return {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          borderColor: '#fca5a5',
        };
      case 'blue':
        return {
          backgroundColor: '#dbeafe',
          color: '#1e3a8a',
          borderColor: '#93c5fd',
        };
    }
  }

  if (selected) {
    return {
      backgroundColor: m3Colors.primaryContainer,
      color: m3Colors.primary,
      borderColor: `${m3Colors.primary}88`,
    };
  }

  switch (variant) {
    case 'filled':
      return {
        backgroundColor: m3Colors.primary,
        color: m3Colors.onPrimary,
        borderColor: 'transparent',
      };
    case 'tonal':
      return {
        backgroundColor: m3Colors.surfaceContainerHigh,
        color: m3Colors.onSurface,
        borderColor: m3Colors.outlineVariant,
      };
    case 'outlined':
      return {
        backgroundColor: 'rgba(24, 28, 27, 0.72)',
        color: m3Colors.onSurface,
        borderColor: m3Colors.outlineVariant,
      };
    case 'text':
      return {
        backgroundColor: 'transparent',
        color: m3Colors.onSurfaceVariant,
        borderColor: 'transparent',
      };
    case 'danger':
      return {
        backgroundColor: m3Colors.errorContainer,
        color: m3Colors.onErrorContainer,
        borderColor: 'rgba(232, 155, 140, 0.55)',
      };
    case 'blue':
      return {
        backgroundColor: m3Colors.secondaryContainer,
        color: m3Colors.onSecondaryContainer,
        borderColor: 'rgba(147, 187, 224, 0.5)',
      };
  }
}

/**
 * Material 3 Expressive Button
 * Pill (999px) at rest -> morphs to rounded squircle on press or selected state using fastSpatial springs.
 */
export const ExpressiveButton: React.FC<ExpressiveButtonProps> = ({
  variant = 'filled',
  size = 'md',
  tone = 'dark',
  selected = false,
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  accentColor,
  surfaceColor,
  borderColor,
  children,
  className = '',
  style,
  disabled,
  onClick,
  type = 'button',
  ...rest
}) => {
  const prefersReducedMotion = useReducedMotion();
  const dims = BUTTON_SIZES[size];
  const palette = resolveButtonPalette(variant, selected, tone, {
    accentColor,
    surfaceColor,
    borderColor,
  });

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected || undefined}
      whileHover={disabled || prefersReducedMotion ? undefined : { scale: 1.025, filter: 'brightness(1.07)' }}
      whileTap={
        disabled || prefersReducedMotion
          ? undefined
          : {
              scale: 0.94,
              borderRadius: dims.pressRadius,
            }
      }
      animate={{
        borderRadius: selected ? dims.pressRadius : m3Shapes.pill,
        backgroundColor: palette.backgroundColor,
        color: palette.color,
        borderColor: palette.borderColor,
      }}
      transition={prefersReducedMotion ? m3Springs.defaultEffects : m3Springs.fastSpatial}
      style={{
        minHeight: dims.minHeight,
        paddingLeft: dims.paddingX,
        paddingRight: dims.paddingX,
        fontSize: dims.fontSize,
        gap: dims.gap,
        width: fullWidth ? '100%' : undefined,
        ...style,
      }}
      className={`inline-flex shrink-0 items-center justify-center border font-semibold leading-none whitespace-nowrap select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#63D4A3]/60 disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
      {...rest}
    >
      {leadingIcon && <span className="inline-flex shrink-0 items-center">{leadingIcon}</span>}
      <span>{children}</span>
      {trailingIcon && <span className="inline-flex shrink-0 items-center">{trailingIcon}</span>}
    </motion.button>
  );
};

export type ExpressiveIconButtonVariant = 'standard' | 'filled' | 'tonal' | 'outlined';

export interface ExpressiveIconButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'
  > {
  variant?: ExpressiveIconButtonVariant;
  tone?: ExpressiveTone;
  toggled?: boolean;
  size?: number;
  ariaLabel: string;
  accentColor?: string;
  surfaceColor?: string;
  borderColor?: string;
  children: React.ReactNode;
}

/**
 * Material 3 Expressive Icon Button
 * Circular/pill (999px) at rest -> morphs into a crisp squircle on press or active toggle.
 */
export const ExpressiveIconButton: React.FC<ExpressiveIconButtonProps> = ({
  variant = 'tonal',
  tone = 'dark',
  toggled = false,
  size = 40,
  ariaLabel,
  accentColor,
  surfaceColor,
  borderColor,
  children,
  className = '',
  style,
  disabled,
  onClick,
  type = 'button',
  ...rest
}) => {
  const prefersReducedMotion = useReducedMotion();
  const squircleRadius = size <= 30 ? '9px' : size <= 38 ? '12px' : '14px';

  const palette = (() => {
    if (surfaceColor || accentColor || borderColor) {
      return {
        backgroundColor: surfaceColor ?? m3Colors.surfaceContainerHigh,
        color: accentColor ?? m3Colors.onSurface,
        borderColor: borderColor ?? 'transparent',
      };
    }

    if (tone === 'light') {
      if (toggled) {
        return { backgroundColor: '#059669', color: '#ffffff', borderColor: 'transparent' };
      }
      if (variant === 'outlined') {
        return { backgroundColor: '#ffffff', color: '#475569', borderColor: '#cbd5e1' };
      }
      return { backgroundColor: '#f1f5f9', color: '#0f172a', borderColor: 'transparent' };
    }

    if (toggled) {
      return {
        backgroundColor: m3Colors.primaryContainer,
        color: m3Colors.primary,
        borderColor: `${m3Colors.primary}77`,
      };
    }

    switch (variant) {
      case 'filled':
        return {
          backgroundColor: m3Colors.primary,
          color: m3Colors.onPrimary,
          borderColor: 'transparent',
        };
      case 'tonal':
        return {
          backgroundColor: m3Colors.surfaceContainerHigh,
          color: m3Colors.onSurface,
          borderColor: m3Colors.outlineVariant,
        };
      case 'outlined':
        return {
          backgroundColor: 'rgba(24, 28, 27, 0.85)',
          color: m3Colors.onSurface,
          borderColor: m3Colors.outlineVariant,
        };
      case 'standard':
      default:
        return {
          backgroundColor: 'transparent',
          color: m3Colors.onSurfaceVariant,
          borderColor: 'transparent',
        };
    }
  })();

  return (
    <motion.button
      type={type}
      aria-label={ariaLabel}
      aria-pressed={toggled || undefined}
      disabled={disabled}
      onClick={onClick}
      whileHover={disabled || prefersReducedMotion ? undefined : { scale: 1.06, filter: 'brightness(1.08)' }}
      whileTap={
        disabled || prefersReducedMotion
          ? undefined
          : {
              scale: 0.9,
              borderRadius: squircleRadius,
            }
      }
      animate={{
        borderRadius: toggled ? squircleRadius : m3Shapes.pill,
        backgroundColor: palette.backgroundColor,
        color: palette.color,
        borderColor: palette.borderColor,
      }}
      transition={prefersReducedMotion ? m3Springs.defaultEffects : m3Springs.fastSpatial}
      style={{
        width: size,
        height: size,
        ...style,
      }}
      className={`inline-flex shrink-0 items-center justify-center border select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#63D4A3]/60 disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
};

export interface ExpressiveChipProps {
  label: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  leadingDotColor?: string;
  trailing?: React.ReactNode;
  showCheckOnSelect?: boolean;
  size?: 'xs' | 'sm' | 'md';
  accentColor?: string;
  selectedSurface?: string;
  selectedBorder?: string;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  title?: string;
}

const CHIP_SIZES: Record<'xs' | 'sm' | 'md', { height: number; px: number; text: number; gap: number }> = {
  xs: { height: 24, px: 9, text: 9.5, gap: 4 },
  sm: { height: 28, px: 11, text: 10.5, gap: 5 },
  md: { height: 34, px: 14, text: 12, gap: 6 },
};

/**
 * Material 3 Expressive Filter / Choice Chip
 * Unselected: Pill (999px) on tonal surfaceContainer.
 * Selected / Pressed: Morphs into a 10px–11px squircle on primaryContainer/secondaryContainer with fastSpatial spring.
 */
export const ExpressiveChip: React.FC<ExpressiveChipProps> = ({
  label,
  selected = false,
  onClick,
  icon,
  leadingDotColor,
  trailing,
  showCheckOnSelect = false,
  size = 'sm',
  accentColor,
  selectedSurface,
  selectedBorder,
  className = '',
  style,
  ariaLabel,
  title,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const dims = CHIP_SIZES[size];

  const bg = selected
    ? selectedSurface ?? m3Colors.primaryContainer
    : m3Colors.surfaceContainer;
  const fg = selected
    ? accentColor ?? m3Colors.primary
    : m3Colors.onSurfaceVariant;
  const border = selected
    ? selectedBorder ?? accentColor ?? `${m3Colors.primary}88`
    : m3Colors.outlineVariant;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={ariaLabel}
      title={title}
      whileHover={prefersReducedMotion ? undefined : { scale: 1.03, filter: 'brightness(1.06)' }}
      whileTap={
        prefersReducedMotion
          ? undefined
          : {
              scale: 0.92,
              borderRadius: m3Shapes.selectedChip,
            }
      }
      animate={{
        borderRadius: selected ? m3Shapes.selectedChip : m3Shapes.pill,
        backgroundColor: bg,
        color: fg,
        borderColor: border,
      }}
      transition={prefersReducedMotion ? m3Springs.defaultEffects : m3Springs.fastSpatial}
      style={{
        minHeight: dims.height,
        paddingLeft: dims.px,
        paddingRight: dims.px,
        fontSize: dims.text,
        gap: dims.gap,
        ...style,
      }}
      className={`inline-flex shrink-0 items-center justify-center border font-semibold leading-none whitespace-nowrap select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#63D4A3]/60 ${className}`}
    >
      {selected && showCheckOnSelect ? (
        <motion.span
          initial={prefersReducedMotion ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={m3Springs.fastSpatial}
          className="inline-flex shrink-0 items-center"
        >
          <Check className="h-3 w-3 stroke-[2.8]" />
        </motion.span>
      ) : leadingDotColor ? (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: leadingDotColor }}
        />
      ) : (
        icon && <span className="inline-flex shrink-0 items-center">{icon}</span>
      )}
      <span>{label}</span>
      {trailing && <span className="inline-flex shrink-0 items-center">{trailing}</span>}
    </motion.button>
  );
};

export interface ExpressiveSegmentButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'
  > {
  selected: boolean;
  tone?: ExpressiveTone;
  selectedBg?: string;
  selectedColor?: string;
  selectedBorder?: string;
  idleBg?: string;
  idleColor?: string;
  idleBorder?: string;
  selectedRadius?: string;
  idleRadius?: string;
  children: React.ReactNode;
}

/**
 * Material 3 Expressive Segmented / Toggle Button
 * Ideal for grid/row segmented controls (7D/30D, duration bars, Quick Settings tiles, studio toggles).
 */
export const ExpressiveSegmentButton: React.FC<ExpressiveSegmentButtonProps> = ({
  selected,
  tone = 'dark',
  selectedBg,
  selectedColor,
  selectedBorder,
  idleBg,
  idleColor,
  idleBorder,
  selectedRadius = m3Shapes.selectedChip,
  idleRadius = m3Shapes.pill,
  children,
  className = '',
  style,
  onClick,
  disabled,
  type = 'button',
  ...rest
}) => {
  const prefersReducedMotion = useReducedMotion();

  const resolvedSelectedBg =
    selectedBg ?? (tone === 'light' ? '#0f172a' : m3Colors.surfaceContainerHighest);
  const resolvedSelectedColor =
    selectedColor ?? (tone === 'light' ? '#ffffff' : m3Colors.onSurface);
  const resolvedSelectedBorder =
    selectedBorder ?? (tone === 'light' ? 'transparent' : `${m3Colors.primary}70`);

  const resolvedIdleBg = idleBg ?? 'transparent';
  const resolvedIdleColor =
    idleColor ?? (tone === 'light' ? '#475569' : m3Colors.onSurfaceVariant);
  const resolvedIdleBorder = idleBorder ?? 'transparent';

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      whileHover={disabled || prefersReducedMotion ? undefined : { scale: 1.02 }}
      whileTap={
        disabled || prefersReducedMotion
          ? undefined
          : {
              scale: 0.92,
              borderRadius: selectedRadius,
            }
      }
      animate={{
        borderRadius: selected ? selectedRadius : idleRadius,
        backgroundColor: selected ? resolvedSelectedBg : resolvedIdleBg,
        color: selected ? resolvedSelectedColor : resolvedIdleColor,
        borderColor: selected ? resolvedSelectedBorder : resolvedIdleBorder,
      }}
      transition={prefersReducedMotion ? m3Springs.defaultEffects : m3Springs.fastSpatial}
      style={style}
      className={`inline-flex items-center justify-center border font-semibold select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#63D4A3]/60 disabled:opacity-45 ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
};
