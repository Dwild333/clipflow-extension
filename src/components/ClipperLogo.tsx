import icon from '../../assets/icon.png'

interface ClipperLogoProps {
  size?: number
  className?: string
}

export function ClipperLogo({ size = 28, className = '' }: ClipperLogoProps) {
  return (
    <img
      src={icon}
      width={size}
      height={size}
      alt="Clipper by NotionFlow"
      className={`inline-block shrink-0 rounded-lg ${className}`}
    />
  )
}
