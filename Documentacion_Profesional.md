# DOCUMENTACIÓN DEL PROYECTO INTEGRADOR

## TRACKER DE LIBROS (FÍSICOS Y DIGITALES)
### Con Lector PDF/EPUB, Búsqueda ISBN y Estadísticas

---

## PORTADA

| Campo | Valor |
|-------|-------|
| **Nombre del proyecto** | Libros Tracker |
| **Materia** | Proyecto Integrador |
| **Carrera** | Tecnicatura en Programación / Sistemas |
| **Año lectivo** | 2026 |
| **Curso** | Unidad 8 |
| **Integrantes** | [Completar con nombres y apellidos] |

---

## ÍNDICE

1. [Descripción del proyecto](#1-descripción-del-proyecto)
2. [Alcance y funcionalidades](#2-alcance-y-funcionalidades)
3. [Arquitectura técnica](#3-arquitectura-técnica)
4. [Diagrama de arquitectura](#4-diagrama-de-arquitectura)
5. [Manual de uso](#5-manual-de-uso)
6. [Repositorio de código fuente](#6-repositorio-de-código-fuente)
7. [Tecnologías utilizadas](#7-tecnologías-utilizadas)
8. [Anexos](#8-anexos)

---

## 1. DESCRIPCIÓN DEL PROYECTO

### Objetivo del proyecto

Desarrollar una aplicación web completa de gestión de biblioteca personal que permita a los usuarios registrar, organizar y dar seguimiento a sus libros físicos y digitales.

El sistema integra:

- Búsqueda de libros por ISBN a través de **Open Library**
- Importación de títulos de dominio público desde **Project Gutenberg**
- Lectura directa de archivos **EPUB y PDF** en el navegador
- Registro de lecturas con progreso y estado
- Generación de **estadísticas de lectura**
- Recomendaciones personalizadas basadas en el historial del usuario

### Arquitectura general

La aplicación consta de:

- **Frontend:** React 19, TypeScript y Vite
- **Backend:** Spring Boot (Java 21) con base de datos MySQL
- **Patrón de diseño:** MVC con capas definidas (controller, service, repository, entity, dto)

---

## 2. ALCANCE Y FUNCIONALIDADES

### Módulos principales

#### 2.1 Biblioteca (Home)

- Listado de libros registrados con filtros por formato y estado de lectura
- Búsqueda por título y autor
- Estadísticas rápidas: total de libros, pendientes a leer, leyendo y terminados
- Recomendaciones personalizadas basadas en géneros y autores del usuario

## 3. ARQUITECTURA TÉCNICA

### Frontend (repositorio raíz)

| Componente | Tecnología |
|------------|------------|
| Framework | React 19 + TypeScript + Vite |
| Enrutamiento | react-router-dom |
| Estilos | CSS puro con variables CSS (modo claro/noche) |
| Lectores PDF | pdf.js |
| Lectores EPUB | epubjs |
| Linting | oxlint |

#### Estructura de capas (src/)

| Carpeta | Descripción |
|---------|-------------|
| `src/pages/` | Páginas principales (Biblioteca, AgregarLibro, LibroDetalle, Lector, Estadísticas, Gutenberg, etc.) |
| `src/components/` | Componentes reutilizables (LibroCard, Recomendaciones, BuscadorISBN, BuscadorGutenberg, LibrosRelacionados, etc.) |
| `src/services/` | Lógica HTTP y acceso a datos (librosApi, gutenbergApi, estadisticasApi, archivosApi, lecturasApi, etc.) |
| `src/hooks/` | Hooks personalizados (useAsync, useLecturaSync, useLocalStorage) |
| `src/readers/` | Lectores EpubReader y PdfReader |
| `src/types/` | Interfaces compartidas (Libro, Lectura, Usuario, etc.) |

### Backend (repositorio separado: `tracker-libros-backend`)

| Componente | Tecnología |
|------------|------------|
| Framework | Spring Boot 4 / Java 21 |
| Base de datos | MySQL 8.0 |
| Patrón | MVC (controller, service, repository, entity, dto) |

#### Endpoints principales

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/registro` | POST | Registro de usuarios |
| `/api/auth/login` | POST | Inicio de sesión |
| `/api/usuarios/me` | GET | Datos del usuario autenticado |
| `/api/libros` | GET/POST | Listado y creación de libros |
| `/api/libros/{id}` | GET | Detalle de un libro |
| `/api/libros/buscar-isbn/{isbn}` | GET | Búsqueda por ISBN |
| `/api/libros/{id}` | PUT | Actualizar libro |

## 4. DIAGRAMA DE ARQUITECTURA

```
┌─────────────────────────────────────────────────────────────────┐
│                      CAPA DE PRESENTACIÓN                        │
│              (Frontend - React 19 + TypeScript + Vite)          │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Páginas   │  │ Componentes │  │   Lectores  │              │
│  │ (pages/)    │  │ (components/│ │ (readers/)   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│           │              │              │                       │
│           └──────────────┴──────────────┘                       │
│                        │                                        │
│              ┌─────────────────────┐                            │
│              │    Servicios HTTP   │                            │
│              │    (services/)      │                            │
│              └─────────────────────┘                            │
│                        │                                        │
└────────────────────────┼─────────────────────────────────────────┘
                         │ proxy /api
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CAPA DE NEGOCIO                             │
│              (Backend - Spring Boot 4 + Java 21)                 │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Controllers │  │  Services   │  │   DTOs      │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                        │                                        │
│              ┌─────────────────────┐                            │
│              │  Repositorios     │                            │
│              │  (Spring Data)    │                            │
│              └─────────────────────┘                            │
│                        │                                        │
└────────────────────────┼─────────────────────────────────────────┘
                         │ JDBC / JPA
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CAPA DE DATOS                               │
│                        MySQL 8.0                                 │
└─────────────────────────────────────────────────────────────────┘

## 5. MANUAL DE USO

### 5.1 Iniciar la aplicación

1. **Frontend:** Desde la raíz del repo, ejecutar `npm run dev`. La aplicación corre en `http://localhost:5173`.
2. **Backend:** Desde `D:\proyects\libros-tracker-back\tracker-libros-backend`, ejecutar `./mvnw spring-boot:run`. El backend corre en `http://localhost:8080`.

### 5.2 Agregar un libro

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

### 5.3 Leer un libro

1. Desde la **Biblioteca**, buscar un libro con formato digital (PDF o EPUB).
2. Presionar **Leer en línea**.
3. En el lector, presionar **Abrir archivo** y seleccionar el EPUB o PDF local.
4. El archivo no se sube a ningún servidor; el progreso se guarda localmente.

### 5.4 Estadísticas

1. Ir a **Estadísticas** en el menú superior.
2. Ver resumen de libros, pendientes, leyendo, terminados, minutos y páginas.
3. Filtrar por formato (Todos, Físico, PDF, EPUB).

## 6. REPOSITORIO DE CÓDIGO FUENTE

El código fuente completo del frontend está disponible en el repositorio público de GitHub:

**Enlace:** [https://github.com/TU-USUARIO/libros-tracker](https://github.com/TU-USUARIO/libros-tracker)

> Reemplazar `TU-USUARIO` con el nombre de usuario real de GitHub antes de entregar.

---

## 7. TECNOLOGÍAS UTILIZADAS

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

## 8. ANEXOS

### 8.1 Comandos de desarrollo

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo en :5173 |
| `npm run build` | Compila TypeScript y genera build de producción |
| `npm run lint` | Ejecuta oxlint para revisar el código |
| `npm run preview` | Vista previa del build de producción |
| `./mvnw spring-boot:run` | Inicia el backend en :8080 |
| `./mvnw test` | Ejecuta pruebas del backend |
| `./mvnw -DskipTests package` | Empaqueta el backend |

### 8.2 Filtro de dominio público (Argentina)

Según la legislación argentina, una obra pasa al dominio público 70 años después de la muerte del autor. El sistema aplica este filtro al mostrar libros de Project Gutenberg:

```
Si muerte_autor + 70 <= año_actual → Dominio público
Si no hay muerte_autor → usar fecha_publicación + 70
```

---

*Documentación generada para el Proyecto Integrador - Unidad 8*
4. Ver gráficos por formato y actividad de los últimos 6 meses.

### 5.5 Recomendaciones

En la página de **Biblioteca** se muestra la sección **Recomendados para vos**, con libros sugeridos según los géneros y autores que ya has leído o estás leyendo.

Además, en la sección **Descubre en Project Gutenberg** aparecen 4 libros de dominio público con dos botones:

- **Información:** agrega el libro a tu biblioteca y abre su detalle.
- **Leer:** agrega el libro y abre la lectura directamente.

### 5.6 Detalle del libro

Desde cualquier libro de la biblioteca, presionar **Ver detalle** para ver:

- Información completa del libro.
- Progreso de lectura.
- Libros relacionados (mismo autor / mismo género).
- Reseñas y anotaciones.
- Botón para eliminar el libro.

---
```

---
| `/api/lecturas` | GET/POST | Listado y creación de lecturas |
| `/api/lecturas/{id}` | GET | Detalle de una lectura |
| `/api/lecturas/{id}/progreso` | PATCH | Actualizar progreso |
| `/api/lecturas/{id}/estado` | PATCH | Cambiar estado de lectura |
| `/api/lecturas/{id}` | DELETE | Eliminar lectura |
| `/api/libros/anotaciones/{libroId}` | GET/POST | Anotaciones de un libro |
| `/api/libros/resenas/{libroId}` | GET/PUT/DELETE | Reseñas de un libro |
| `/api/estadisticas` | GET | Estadísticas de lectura |

---
- Botón "Leer en línea" para libros digitales

#### 2.2 Agregar libro

- Búsqueda por ISBN mediante Open Library
- Pestaña Project Gutenberg: catálogo de libros de dominio público (español, inglés, francés)
- Carga manual de datos del libro

#### 2.3 Detalle del libro

- Información completa: ISBN, editorial, fecha de publicación, páginas, género, descripción
- Progreso de lectura (%)
- Libros relacionados (mismo autor / mismo género)
- Botón "Leer en línea" para versiones digitales
- Gestión de lecturas (agregar, editar, eliminar)
- Reseñas y anotaciones

#### 2.4 Lector (PDF / EPUB)

- Lectura directa de archivos en el navegador (funciona de forma local, sin subir al servidor)
- Guardado automático de progreso y posición
- Panel de anotaciones (notas, resaltados, marcadores)

#### 2.5 Estadísticas

- Resumen global: libros totales, terminados, leyendo, pendientes, minutos, páginas leídas, sesiones
- Gráficos por formato y por mes (últimos 6 meses)

#### 2.6 Seguimiento físico

- Registro de sesiones de lectura para libros en papel

---