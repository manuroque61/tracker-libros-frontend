import { useState } from 'react'

interface BookCoverProps {
  src?: string
  title: string
}

export function BookCover({ src, title }: BookCoverProps) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className="cover-fallback" aria-hidden="true">
        <span>{title}</span>
      </div>
    )
  }

  return (
    <img
      className="cover"
      src={src}
      alt={title}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
