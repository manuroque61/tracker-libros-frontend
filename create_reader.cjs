const fs = require("fs")

const content = `import React, { useEffect, useRef, useState } from "react"
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
`

fs.appendFileSync("src/readers/GutenbergReader.tsx", content, "utf8")
console.log("Parte 1 OK")
