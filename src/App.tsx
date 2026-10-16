import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import { ThemeProvider } from './theme'
import AgregarLibro from './pages/AgregarLibro'
import Biblioteca from './pages/Biblioteca'
import Estadisticas from './pages/Estadisticas'
import LibroDetalle from './pages/LibroDetalle'
import SeguimientoFisico from './pages/SeguimientoFisico'

const Lector = lazy(() => import('./pages/Lector'))

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="app">
          <Header />
          <main className="main">
            <Routes>
              <Route path="/" element={<Navigate to="/biblioteca" replace />} />
              <Route path="/biblioteca" element={<Biblioteca />} />
              <Route path="/agregar" element={<AgregarLibro />} />
              <Route path="/libro/:id" element={<LibroDetalle />} />
              <Route path="/libro/:id/seguimiento" element={<SeguimientoFisico />} />
              <Route
                path="/leer/:bookId"
                element={
                  <Suspense fallback={<p className="muted placeholder">Cargando el lector…</p>}>
                    <Lector />
                  </Suspense>
                }
              />
              <Route path="/estadisticas" element={<Estadisticas />} />
              <Route path="*" element={<Navigate to="/biblioteca" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  )
}
