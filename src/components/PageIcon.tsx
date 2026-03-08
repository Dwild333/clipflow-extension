interface PageIconProps {
  emoji: string
  iconUrl?: string
  size?: number
  className?: string
  type?: 'page' | 'database'
}

export function PageIcon({ emoji, iconUrl, size = 18, className = '', type = 'page' }: PageIconProps) {
  const isDatabase = type === 'database'
  
  const icon = iconUrl ? (
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
  ) : (
    <span
      className={`shrink-0 leading-none ${className}`}
      style={{ fontSize: `${size}px`, lineHeight: 1 }}
    >
      {emoji}
    </span>
  )

  if (isDatabase) {
    return (
      <div className="relative inline-block shrink-0">
        {icon}
        <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-indigo-500 border border-white dark:border-black rounded-full" title="Database" />
      </div>
    )
  }

  return icon
}
