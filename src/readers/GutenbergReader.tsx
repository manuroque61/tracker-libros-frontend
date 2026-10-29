import React, { useEffect, useRef, useState } from "react"
import ePub from "epubjs"
import { useTheme } from "../theme"

interface GutenbergLibro {
  id: string
  titulo: string
  urlEpub?: string
  portadaUrl?: string
  autores?: { name: string }[]
  idioma?: string
  fechaPublicacion?: string
  cantidadPaginas?: string
}

interface GutenbergReaderProps {
  libro: GutenbergLibro
  onCerrar?: () => void
}

export function GutenbergReader({ libro, onCerrar }: GutenbergReaderProps) {
  const { theme } = useTheme()
  const containerRef = React.useRef(null)
  const bookRef = React.useRef(null)
  const renditionRef = React.useRef(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [toc, setToc] = useState<any[]>([])
  const [loc, setLoc] = useState<string | null>(null)

  const themeRef = React.useRef(theme)
  themeRef.current = theme

  const flattenToc = (items: any[]): any[] => {
    const flat: any[] = []
    for (const item of items) {
      flat.push(item)
      if (item.subitems && item.subitems.length > 0) {
        flat.push(...flattenToc(item.subitems))
      }
    }
    return flat
  }

  const computePercent = (loc: any): number => {
    const total = parseInt(libro.cantidadPaginas || "1000", 10) || 100
    return Math.min(100, Math.max(0, (loc?.start?.page || 0) / total * 100))
  }

  useEffect(() => {
    let cancelled = false

    async function loadBook() {
      try {
        setCargando(true)
        setError(null)

        const book = ePub("pg" + libro.id)
        bookRef.current = book

        const rendition = book.renderTo(containerRef.current!, {
          width: "100%",
          height: "100%",
          flow: "paginated"
        })
        renditionRef.current = rendition

        const response = await fetch(libro.urlEpub!)
        const blob = await response.blob()
        const arrayBuffer = await blob.arrayBuffer()
        await book.open(arrayBuffer)

        const toc = await book.getTableOfContents()
        const items = toc ? flattenToc(toc) : []
        setToc(items)

        rendition.on("relocated", (loc: any) => {
          if (cancelled) return
          setLoc(loc.start.cfi)
          const percent = computePercent(loc)
          setProgress(percent)
        })

        await rendition.display()
        setCargando(false)

      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el libro")
      } finally {
        setCargando(false)
      }
    }

    loadBook()

    return () => {
      cancelled = true
      if (bookRef.current) {
        bookRef.current?.destroy()
      }
      if (renditionRef.current) {
        renditionRef.current?.destroy()
      }
    }
  }, [libro, libro.urlEpub])
