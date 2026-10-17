import { useState } from 'react'

interface Props {
  className?: string
}

export function BrandLogo({ className = '' }: Props) {
  const [videoFailed, setVideoFailed] = useState(false)
  const identityClass = `brand-identity ${className}`.trim()

  if (videoFailed) {
    return (
      <div className={identityClass}>
        <img className="brand-logo" src="/logo%20videoteca.gif" alt="" />
        <span className="brand-name">SVHome</span>
      </div>
    )
  }

  return (
    <div className={identityClass}>
      <video
        className="brand-logo"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        onError={() => setVideoFailed(true)}
      >
        <source src="/logo%20videoteca.mp4" type="video/mp4" />
      </video>
      <span className="brand-name">SVHome</span>
    </div>
  )
}