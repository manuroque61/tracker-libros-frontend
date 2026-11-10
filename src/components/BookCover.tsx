import { useState } from 'react'

interface BookCoverProps {
  src?: string
  title: string
}

export function BookCover({ src, title }: BookCoverProps) {
  const [failedSrc, setFailedSrc] = useState<string | undefined>()
  const failed = failedSrc === src

  if (!src || failed) {
    return (
      <div className="cover-wrap">
        <div className="cover-fallback" aria-hidden="true">
          <span className="cover-fallback-title">{title}</span>
          <span className="cover-fallback-mark">Libros Tracker</span>
        </div>
      </div>
    )
  }

  return (
    <div className="cover-wrap">
      <img
        className="cover"
        src={src}
        alt={title}
        loading="lazy"
        onError={() => setFailedSrc(src)}
      />
    </div>
  )
}
