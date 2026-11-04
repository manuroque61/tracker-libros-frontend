import { GutenbergHtmlReader } from './GutenbergHtmlReader'

interface GutenbergReaderProps {
  libro: { titulo: string; urlHtml?: string; urlEpub?: string }
  onCerrar?: () => void
}

export function GutenbergReader({ libro, onCerrar }: GutenbergReaderProps) {
  return (
    <div className="reader-shell" style={{ height: '70vh', marginTop: 16, width: '100%' }}>
      <div className="reader-bar">
        <span className="reader-title">{libro.titulo}</span>
        {onCerrar && (
          <div className="reader-controls">
            {libro.urlHtml && <a className="button secondary" href={libro.urlHtml} target="_blank" rel="noreferrer">Abrir texto original</a>}
            <button type="button" className="btn-square" onClick={onCerrar} aria-label="Cerrar">
              ✕
            </button>
          </div>
        )}
      </div>
      {libro.urlHtml ? (
        <GutenbergHtmlReader src={libro.urlHtml} title={`Leer ${libro.titulo}`} />
      ) : (
        <div className="empty lector-empty">
          <p>Gutenberg no ofrece una versión HTML para leer este título dentro de la app.</p>
          {libro.urlEpub && <a className="button" href={libro.urlEpub}>Abrir EPUB de Gutenberg</a>}
        </div>
      )}
    </div>
  )
}
