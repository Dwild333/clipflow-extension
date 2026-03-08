/** Shared theme type used across all Clipper components */
export type Theme = 'dark' | 'light'

/** A Notion page destination */
export interface Destination {
  id: string
  emoji: string
  name: string
}

/** Common widget props shared across most components */
export interface WidgetBaseProps {
  theme?: Theme
  onClose?: () => void
}
