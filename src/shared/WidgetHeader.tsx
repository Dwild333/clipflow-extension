import { Settings, X } from 'lucide-react'
import { ClipFlowLogo } from '../components/ClipFlowLogo'
import { themeColors } from './theme'
import type { Theme } from './types'

interface WidgetHeaderProps {
  theme?: Theme
  title?: string
  onClose?: () => void
  onSettings?: () => void
  draggable?: boolean
  onMouseDown?: (e: React.MouseEvent) => void
  leftContent?: React.ReactNode
}

export function WidgetHeader({
  theme = 'dark',
  title = 'ClipFlow',
  onClose,
  onSettings,
  draggable = false,
  onMouseDown,
  leftContent,
}: WidgetHeaderProps) {
  const colors = themeColors(theme)

  return (
    <div
      className={`flex items-center justify-between h-11 px-4 border-b ${colors.border} ${
        draggable ? 'cursor-move' : ''
      }`}
      onMouseDown={onMouseDown}
    >
      {leftContent ?? (
        <div className="flex items-center gap-2">
          <ClipFlowLogo size={16} />
          <span className={`text-sm font-semibold ${colors.textPrimary}`}>
            {title}
          </span>
        </div>
      )}
      <div className="flex items-center gap-1">
        {onSettings && (
          <button
            onClick={onSettings}
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${colors.buttonHover}`}
          >
            <Settings className={`w-4 h-4 ${colors.textSecondary}`} />
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${colors.buttonHover}`}
          >
            <X className={`w-4 h-4 ${colors.textSecondary}`} />
          </button>
        )}
      </div>
    </div>
  )
}
