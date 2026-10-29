const fs = require("fs")

const content2 = `
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
`

fs.appendFileSync("src/readers/GutenbergReader.tsx", content2, "utf8")
console.log("Parte 2 OK")
