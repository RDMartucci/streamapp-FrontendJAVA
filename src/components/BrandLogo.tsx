import { useState } from 'react'

interface Props {
  className?: string
}

export function BrandLogo({ className = '' }: Props) {
  const [videoFailed, setVideoFailed] = useState(false)
  const logoClass = `brand-logo ${className}`.trim()

  if (videoFailed) {
    return <img className={logoClass} src="/logo%20videoteca.gif" alt="Videoteca" />
  }

  return (
    <video
      className={logoClass}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      role="img"
      aria-label="Videoteca"
      onError={() => setVideoFailed(true)}
    >
      <source src="/logo%20videoteca.mp4" type="video/mp4" />
      <img src="/logo%20videoteca.gif" alt="Videoteca" />
    </video>
  )
}