import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth'
import { Header } from './components/Header'
import { ThemeProvider } from './theme'
import AgregarLibro from './pages/AgregarLibro'
import Biblioteca from './pages/Biblioteca'
import Estadisticas from './pages/Estadisticas'
import LibroDetalle from './pages/LibroDetalle'
import Login from './pages/Login'
import Register from './pages/Register'
import Gutenberg from './pages/Gutenberg'
import SeguimientoFisico from './pages/SeguimientoFisico'

const Lector = lazy(() => import('./pages/Lector'))

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="app">
            <Header />
            <main className="main">
              <Routes>
                <Route path="/" element={<Navigate to="/biblioteca" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
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
                <Route path="/gutenberg" element={<Gutenberg />} />
                <Route path="*" element={<Navigate to="/biblioteca" replace />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
