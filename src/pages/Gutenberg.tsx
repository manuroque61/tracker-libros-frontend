
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { listarLibrosGutenberg, type GutenbergLibro } from "../services/gutenbergApi"
import { GutenbergReader } from "../readers/GutenbergReader"

export default function GutenbergPage() {
  const [libros, setLibros] = useState<GutenbergLibro[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [idioma, setIdioma] = useState("es")
  const [busqueda, setBusqueda] = useState("")
  const [libroSeleccionado, setLibroSeleccionado] = useState<GutenbergLibro | null>(null)

  useEffect(() => {
    let activo = true
    ;(async () => {
      try {
        const data = await listarLibrosGutenberg(idioma)
        if (!activo) return
        setLibros(data)
        setError(null)
      } catch (err: any) {
        if (!activo) return
        setError(err?.message ?? "No se pudo cargar el catálogo")
        setLibros([])
      } finally {
        if (activo) setCargando(false)
      }
    })()
    return () => { activo = false }
  }, [idioma])

  const filtrados = libros.filter((libro) => {
    const texto = `${libro.titulo} ${libro.autores.map((a) => a.name).join(" ")}`.toLowerCase()
    return texto.includes(busqueda.toLowerCase())
  })

  if (cargando) {
    return <div>Cargando catálogo de Gutenberg...</div>
  }

  if (error) {
    return (
      <div style={{ padding: 20, color: "#c00" }}>
        {error}<br /><Link to="/biblioteca">Volver a la biblioteca</Link>
      </div>
    )
  }

  return (
    <section style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>
      <h1>Catálogo Gutenberg (Argentina)</h1>
      <p style={{ color: "#666", marginBottom: 20 }}>
        Libros en dominio público según la legislación argentina (vida del autor + 70 años).
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <input
          type="search"
          placeholder="Buscar por título o autor..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ padding: 8, width: 300 }}
        />
        <select
          value={idioma}
          onChange={(e) => setIdioma(e.target.value)}
          style={{ padding: 8 }}
        >
          <option value="es">Español</option>
          <option value="en">Inglés</option>
          <option value="fr">Francés</option>
        </select>
        <Link to="/biblioteca" style={{ marginLeft: "auto", padding: 8, textDecoration: "none", color: "#0066cc" }}>
          Volver a la biblioteca
        </Link>
      </div>

      <ul
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 20,
          listStyle: "none",
          padding: 0,
          margin: 0,
        }}
      >
        {filtrados.length === 0 && (
          <p>No se encontraron libros con los filtros actuales.</p>
        )}

        {filtrados.map((libro) => (
          <li
            key={libro.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 12,
              background: "#fff",
              cursor: "pointer",
              transition: "box-shadow 0.2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as any).style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)" }}
            onMouseLeave={(e) => { (e.currentTarget as any).style.boxShadow = "none" }}
          >
            {libro.portadaUrl && (
              <img
                src={libro.portadaUrl}
                alt={libro.titulo}
                style={{ width: "100%", height: 280, objectFit: "cover", borderRadius: 4, marginBottom: 8 }}
              />
            )}
            <h3 style={{ margin: "0 0 4px 0", fontSize: 16, color: "#333" }}>{libro.titulo}</h3>
            <p style={{ margin: "0 0 4px 0", fontSize: 14, color: "#666" }}>
              {libro.autores.map((a) => a.name).join(", ")}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#999" }}>
              {libro.idioma.toUpperCase()} • {libro.fechaPublicacion ?? ""}
            </p>
            <button
              type="button"
              onClick={() => setLibroSeleccionado(libro)}
              style={{
                marginTop: 8,
                padding: "6px 12px",
                background: "#0066cc",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Leer
            </button>
          </li>
        ))}
      </ul>

      {libroSeleccionado && (
        <GutenbergReader libro={libroSeleccionado} onCerrar={() => setLibroSeleccionado(null)} />
      )}
    </section>
  )
}

