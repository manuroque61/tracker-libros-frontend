import { useState } from 'react'

interface BookCoverProps {
  src?: string
  title: string
}

export function BookCover({ src, title }: BookCoverProps) {
  const [failed, setFailed] = useState(false)

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
        onError={() => setFailed(true)}
      />
    </div>
  )
}
