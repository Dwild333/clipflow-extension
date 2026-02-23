interface NotionWorkspaceIconProps {
  size?: number
  className?: string
}

/** A Notion-style workspace avatar (dark square with bold "N") */
export function NotionWorkspaceIcon({ size = 32, className = '' }: NotionWorkspaceIconProps) {
  return (
    <div
      className={`rounded-lg bg-[#2F2F2F] flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="text-white font-serif"
        style={{ fontSize: size * 0.5, lineHeight: 1 }}
      >
        N
      </span>
    </div>
  )
}
