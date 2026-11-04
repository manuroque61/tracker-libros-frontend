import { useTheme } from '../theme'

interface GutenbergHtmlReaderProps {
  src: string
  title: string
  className?: string
}

export function GutenbergHtmlReader({ src, title, className }: GutenbergHtmlReaderProps) {
  const { theme } = useTheme()

  return (
    <iframe
      className={className}
      title={title}
      src={src}
      style={{
        flex: 1,
        width: '100%',
        minHeight: 0,
        border: 0,
        background: theme === 'night' ? '#151515' : '#fff',
        filter: theme === 'night' ? 'invert(1) hue-rotate(180deg)' : 'none',
      }}
    />
  )
}
