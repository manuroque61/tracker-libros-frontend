# Documentación del Proyecto Integrador

**Tracker de Libros (físicos y digitales) con lector PDF/EPUB, búsqueda ISBN y estadísticas**

---

## 1. Portada

| Campo | Valor |
|-------|-------|
| **Nombre del proyecto** | Libros Tracker |
| **Materia** | Proyecto Integrador |
| **Carrera** | Tecnicatura en Programación / Sistemas |
| **Año lectivo** | 2026 |
| **Curso** | Unidad 8 |
| **Integrantes** | [Completar con nombres y apellidos] |

---

## 2. Descripción del proyecto

**Objetivo del proyecto:** Desarrollar una aplicación web completa de gestión de biblioteca personal que permita a los usuarios registrar, organizar y dar seguimiento a sus libros físicos y digitales. El sistema debe integrar la búsqueda de libros por ISBN a través de Open Library, la importación de títulos de dominio público desde Project Gutenberg, la lectura directa de archivos EPUB y PDF en el navegador, el registro de lecturas con progreso y estado, la generación de estadísticas de lectura y la obtención de recomendaciones personalizadas basadas en el historial del usuario.

La aplicación consta de un frontend desarrollado con React 19, TypeScript y Vite, y un backend en Spring Boot (Java 21) con base de datos MySQL, siguiendo una arquitectura MVC con capas definidas (controller, service, repository, entity, dto).

---

## 3. Alcance y funcionalidades

### Módulos principales

1. **Biblioteca (Home)**
   - Listado de libros registrados con filtros por formato y estado de lectura.
   - Búsqueda por título y autor.
   - Estadísticas rápidas: total de libros, pendientes a leer, leyendo y terminados.
   - Recomendaciones personalizadas basadas en géneros y autores del usuario.
   - Botón "Leer en línea" para libros digitales.

2. **Agregar libro**
   - Búsqueda por ISBN mediante Open Library.
   - Pestaña Project Gutenberg: catálogo de libros de dominio público (español, inglés, francés).
   - Carga manual de datos del libro.

3. **Detalle del libro**
   - Información completa: ISBN, editorial, fecha de publicación, páginas, género, descripción.
   - Progreso de lectura (%).
   - Libros relacionados (mismo autor / mismo género).
   - Botón "Leer en línea" para versiones digitales.
   - Gestión de lecturas (agregar, editar, eliminar).
   - Reseñas y anotaciones.

4. **Lector (PDF / EPUB)**
   - Lectura directa de archivos en el navegador (funciona de forma local, sin subir al servidor).
   - Guardado automático de progreso y posición.
   - Panel de anotaciones (notas, resaltados, marcadores).

5. **Estadísticas**
   - Resumen global: libros totales, terminados, leyendo, pendientes, minutos, páginas leídas, sesiones.
   - Gráficos por formato y por mes (últimos 6 meses).

6. **Seguimiento físico**
   - Registro de sesiones de lectura para libros en papel.

---

## 4. Arquitectura técnica

### Frontend (repositorio raíz)

- **Framework:** React 19 + TypeScript + Vite
- **Enrutamiento:** react-router-dom
- **Estilos:** CSS puro con variables CSS (modo claro/noche)
- **Capas:**
  - `src/pages/` — páginas principales (Biblioteca, AgregarLibro, LibroDetalle, Lector, Estadísticas, Gutenberg, etc.)
  - `src/components/` — componentes reutilizables (LibroCard, Recomendaciones, BuscadorISBN, BuscadorGutenberg, LibrosRelacionados, etc.)
  - `src/services/` — lógica HTTP y acceso a datos (librosApi, gutenbergApi, estadisticasApi, archivosApi, lecturasApi, etc.)
  - `src/hooks/` — hooks personalizados (useAsync, useLecturaSync, useLocalStorage)
  - `src/readers/` — lectores EpubReader y PdfReader
  - `src/types/` — interfaces compartidas (Libro, Lectura, Usuario, etc.)

### Backend (repositorio separado: `tracker-libros-backend`)

- **Framework:** Spring Boot 4 / Java 21
- **Base de datos:** MySQL
- **Capas:** controller, service, repository, entity, dto
- **Endpoint clave:** `GET /api/libros/buscar-isbn/{isbn}` (Open Library)

---

## 5. Artefactos de diseño

### DER (Diagrama Entidad-Relación)

Entidades principales:

- **Usuario** (id, nombre, email, fechaRegistro)
- **Libro** (id, isbn, título, autor, género, descripción, cantidadPaginas, editorial, fechaPublicacion, portadaUrl, creadoEn)
- **Lectura** (id, libroId, formato, estado, porcentaje, paginaActual, totalPaginas, ubicaciónDigital, últimaLectura, fechaInicio, fechaFin)
- **Sesión** (id, lecturaId, fecha, minutos, paginasLeidas, paginaActual, nota)
- **ArchivoDigital** (id, libroId, nombre, formato, tamaño, creadoEn)
- **Anotación** (id, libroId, lecturaId, tipo, texto, cita, ubicación, porcentaje, creadoEn)
- **Reseña** (libroId, estrellas, texto, actualizadoEn)

Relaciones:
- Usuario 1:N Libro (un usuario tiene muchos libros)
- Libro 1:N Lectura (un libro tiene muchas lecturas)
- Lectura 1:N Sesión (una lectura tiene muchas sesiones)
- Libro 1:N ArchivoDigital
- Libro 1:N Anotación
- Libro 1:N Reseña

### Diagrama de clases (Frontend MVC)

```
┌─────────────────────────────────────────────────────────────┐
│  Capa de Presentación (React)                               │
│  - Pages: Biblioteca, AgregarLibro, LibroDetalle, Lector... │
│  - Components: LibroCard, Recomendaciones, BuscadorISBN...  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Capa de Servicios (HTTP y lógica de negocio)               │
│  - librosApi.ts, gutenbergApi.ts, estadisticasApi.ts        │
│  - archivosApi.ts, lecturasApi.ts, authApi.ts, etc.         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Capa de Datos / Almacenamiento                             │
│  - localStorage (libros, lecturas, sesiones, archivos...)   │
│  - Backend remoto (Spring Boot + MySQL)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Manual de uso

### 6.1 Iniciar la aplicación

1. **Frontend:** Desde la raíz del repo, ejecutar `npm run dev`. La aplicación corre en `http://localhost:5173`.
2. **Backend:** Desde `D:\proyects\libros-tracker-back\tracker-libros-backend`, ejecutar `./mvnw spring-boot:run`. El backend corre en `http://localhost:8080`.

### 6.2 Agregar un libro

#### Opción A: Por ISBN (Open Library)
1. Ir a **Agregar libro** → pestaña **Buscar por ISBN**.
2. Ingresar el ISBN-13 o ISBN-10 y presionar **Buscar ISBN** (o Enter).
3. Si se encuentra, los datos se prellenan automáticamente. Revisar y editar si es necesario.
4. Presionar **Guardar libro**.

#### Opción B: Project Gutenberg
1. Ir a **Agregar libro** → pestaña **Project Gutenberg**.
2. Seleccionar idioma (Español, Inglés, Francés) y buscar por título, autor o tema.
3. Seleccionar un libro de dominio público y presionar **Usar este libro**.
4. Los datos se prellenan en el formulario. Presionar **Guardar libro**.

#### Opción C: Carga manual
1. Ir a **Agregar libro** → pestaña **Carga manual**.
2. Completar al menos Título y Autor (obligatorios).
3. Presionar **Guardar libro**.

### 6.3 Leer un libro

1. Desde la **Biblioteca**, buscar un libro con formato digital (PDF o EPUB).
2. Presionar **Leer en línea**.
3. En el lector, presionar **Abrir archivo** y seleccionar el EPUB o PDF local.
4. El archivo no se sube a ningún servidor; el progreso se guarda localmente.

### 6.4 Estadísticas

1. Ir a **Estadísticas** en el menú superior.
2. Ver resumen de libros, pendientes, leyendo, terminados, minutos y páginas.
3. Filtrar por formato (Todos, Físico, PDF, EPUB).
4. Ver gráficos por formato y actividad de los últimos 6 meses.

### 6.5 Recomendaciones

En la página de **Biblioteca** se muestra la sección **Recomendados para vos**, con libros sugeridos según los géneros y autores que ya has leído o estás leyendo.

Además, en la sección **Descubre en Project Gutenberg** aparecen 4 libros de dominio público con dos botones:
- **Información:** agrega el libro a tu biblioteca y abre su detalle.
- **Leer:** agrega el libro y abre la lectura directamente.

### 6.6 Detalle del libro

Desde cualquier libro de la biblioteca, presionar **Ver detalle** para ver:
- Información completa del libro.
- Progreso de lectura.
- Libros relacionados (mismo autor / mismo género).
- Reseñas y anotaciones.
- Botón para eliminar el libro.

---

## 7. Repositorio de código fuente

El código fuente completo del frontend está disponible en el repositorio público de GitHub:

**Enlace:** [https://github.com/TU-USUARIO/libros-tracker](https://github.com/TU-USUARIO/libros-tracker)

> Reemplazar `TU-USUARIO` con el nombre de usuario real de GitHub antes de entregar.

---

## 8. Tecnologías utilizadas

| Capa | Tecnología |
|------|------------|
| Frontend | React 19, TypeScript, Vite |
| Estilos | CSS puro (variables CSS, modo claro/noche) |
| Enrutamiento | react-router-dom |
| Lectores PDF/EPUB | pdf.js, epubjs (lectores locales) |
| Backend | Spring Boot 4, Java 21 |
| Base de datos | MySQL 8.0 |
| APIs externas | Open Library (ISBN), Gutendex (Project Gutenberg) |
| Linting | oxlint |

---

*Documentación generada para el Proyecto Integrador - Unidad 8*
