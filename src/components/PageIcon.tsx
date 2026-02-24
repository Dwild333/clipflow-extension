interface PageIconProps {
  emoji: string
  iconUrl?: string
  size?: number
  className?: string
}

export function PageIcon({ emoji, iconUrl, size = 18, className = '' }: PageIconProps) {
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        width={size}
        height={size}
        className={`rounded-sm object-cover shrink-0 ${className}`}
        onError={(e) => {
          // Fall back to emoji span on load error
          const span = document.createElement('span')
          span.textContent = emoji
          span.style.fontSize = `${size}px`
          span.style.lineHeight = '1'
          ;(e.currentTarget as HTMLImageElement).replaceWith(span)
        }}
      />
    )
  }
  return (
    <span
      className={`shrink-0 leading-none ${className}`}
      style={{ fontSize: `${size}px`, lineHeight: 1 }}
    >
      {emoji}
    </span>
  )
}
