import icon from '../../assets/icon.png'

interface ClipFlowLogoProps {
  size?: number
  className?: string
}

export function ClipFlowLogo({ size = 28, className = '' }: ClipFlowLogoProps) {
  return (
    <img
      src={icon}
      width={size}
      height={size}
      alt="ClipFlow"
      className={`inline-block shrink-0 rounded-lg ${className}`}
    />
  )
}
