import { useCallback, useState } from 'react'
import { useAsync } from '../hooks/useAsync'
import type { FiltroFormato } from '../services/estadisticasApi'
import { obtener } from '../services/estadisticasApi'
import { FORMATOS, FORMATO_LABEL } from '../types'

function Tarjeta({ valor, etiqueta }: { valor: number | string; etiqueta: string }) {
  return (
    <li className="stat-card">
      <span className="stat-valor">{valor}</span>
      <span className="stat-etiqueta">{etiqueta}</span>
    </li>
  )
}

export default function Estadisticas() {
  const [filtro, setFiltro] = useState<FiltroFormato>('TODOS')
  const loader = useCallback(() => obtener(filtro), [filtro])
  const { data, loading, error, reload } = useAsync(loader)

  return (
    <section>
      <header className="page-header">
        <h1>Estadísticas</h1>
        <p className="muted">Resumen de tu actividad de lectura. Podés filtrar por formato físico o digital.</p>
      </header>

      <div className="chips-row">
        <span className="chips-label">Filtro:</span>
        <div className="genre-chips" role="group" aria-label="Filtrar estadísticas por formato">
          <button type="button" className={`chip${filtro === 'TODOS' ? ' chip-active' : ''}`} onClick={() => setFiltro('TODOS')}>
            Todos
          </button>
          {FORMATOS.map((formato) => (
            <button
              key={formato}
              type="button"
              className={`chip${filtro === formato ? ' chip-active' : ''}`}
              onClick={() => setFiltro(formato)}
            >
              {FORMATO_LABEL[formato]}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="muted placeholder">
          <span className="spinner" /> Calculando estadísticas…
        </p>
      )}
      {error && (
        <div className="alert">
          {error} <button type="button" className="link" onClick={reload}>Reintentar</button>
        </div>
      )}

      {data && !loading && !error && (
        <>
          <ul className="stat-grid">
            <Tarjeta valor={data.totalLibros} etiqueta="Libros" />
            <Tarjeta valor={data.terminados} etiqueta="Terminados" />
            <Tarjeta valor={data.leyendo} etiqueta="Leyendo" />
            <Tarjeta valor={data.pendientes} etiqueta="Pendientes" />
            <Tarjeta valor={data.minutosTotales} etiqueta="Minutos" />
            <Tarjeta valor={data.paginasLeidas} etiqueta="Páginas leídas" />
            <Tarjeta valor={data.sesionesTotal} etiqueta="Sesiones" />
          </ul>

          <h2 className="home-heading">Por formato</h2>
          <ul className="bar-list">
            {data.porFormato.map((item) => {
              const max = Math.max(...data.porFormato.map((entry) => entry.total), 1)
              return (
                <li key={item.formato}>
                  <span className="bar-label">{FORMATO_LABEL[item.formato]}</span>
                  <span className="bar-track">
                    <span className="bar-fill" style={{ width: `${(item.total / max) * 100}%` }} />
                  </span>
                  <span className="bar-value">{item.total}</span>
                </li>
              )
            })}
          </ul>

          <h2 className="home-heading">Últimos 6 meses</h2>
          {data.porMes.every((mes) => mes.minutos === 0 && mes.paginas === 0) ? (
            <p className="muted">Todavía no hay sesiones registradas en este período.</p>
          ) : (
            <ul className="bar-list">
              {data.porMes.map((mes) => {
                const max = Math.max(...data.porMes.map((entry) => entry.minutos), 1)
                return (
                  <li key={mes.clave}>
                    <span className="bar-label">{mes.etiqueta}</span>
                    <span className="bar-track">
                      <span className="bar-fill" style={{ width: `${(mes.minutos / max) * 100}%` }} />
                    </span>
                    <span className="bar-value">{mes.minutos} min</span>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
