import type { Theme } from './types'

/** Determine if the current theme is dark */
export const isDarkTheme = (theme: Theme = 'dark') => theme !== 'light'

/**
 * Shared color tokens for ClipFlow glassmorphic UI.
 * Returns Tailwind class strings for common patterns.
 */
export function themeColors(theme: Theme = 'dark') {
  const dark = isDarkTheme(theme)
  return {
    widgetBg: dark ? 'bg-[#1A1A1A]/85' : 'bg-white/90',
    surfaceBg: dark ? 'bg-[#2A2A2A]' : 'bg-gray-100',
    surfaceBgSubtle: dark ? 'bg-[#2A2A2A]/50' : 'bg-gray-50',
    surfaceHover: dark ? 'hover:bg-[#3A3A3A]' : 'hover:bg-gray-200',
    buttonHover: dark ? 'hover:bg-white/10' : 'hover:bg-black/5',
    border: dark ? 'border-white/10' : 'border-black/10',
    borderSubtle: dark ? 'border-white/5' : 'border-black/5',
    textPrimary: dark ? 'text-white' : 'text-black',
    textSecondary: dark ? 'text-gray-400' : 'text-gray-600',
    textMuted: 'text-gray-500',
    textPlaceholder: dark ? 'placeholder:text-gray-600' : 'placeholder:text-gray-500',
    inputBg: dark
      ? 'bg-[#2A2A2A] border-transparent text-white placeholder:text-gray-600'
      : 'bg-gray-100 border-transparent text-black placeholder:text-gray-500',
  } as const
}

/** Accent color (indigo-500) */
export const ACCENT = '#6366F1'
export const ACCENT_CLASS = 'bg-indigo-500'
