import { useId } from 'react'

interface ClipFlowLogoProps {
  size?: number
  className?: string
}

export function ClipFlowLogo({ size = 28, className = '' }: ClipFlowLogoProps) {
  const uid = useId()
  const gradId = `c2n-grad-${uid}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
    >
      <rect width="32" height="32" rx="8" fill={`url(#${gradId})`} />
      <rect x="4.5" y="5" width="15" height="18" rx="3" fill="white" opacity="0.3" />
      <rect x="12.5" y="9" width="15" height="18" rx="3" fill="white" />
      <path
        d="M16.5 18L19.5 21L24 15"
        stroke="#6366F1"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
    </svg>
  )
}
