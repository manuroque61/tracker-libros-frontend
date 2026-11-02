# Integración — Etapa A

Alcance de esta entrega: infraestructura/DTOs, alta con formato y biblioteca real. Las etapas B, C y D requieren revisión posterior, según la sección 7 del documento. Sin commits ni cambios al backend.

## Archivos y contratos

- `src/types/backend.ts`: DTOs de Libro y Lectura, validación de IDs y adaptadores explícitos. No se inventan fecha de catálogo, última lectura ni total de páginas por lectura.
- `src/types/index.ts`: fecha de creación bibliográfica opcional; fecha de agregado a biblioteca independiente.
- `src/services/apiClient.ts`: JWT existente, 204, Headers y FormData sin Content-Type manual; mensaje 401 según contexto; rechazo de respuestas de otra sesión.
- `src/services/librosApi.ts`: POST /api/biblioteca/libros, GET /api/libros/{id}; biblioteca derivada exclusivamente de lecturas personales con IDs deduplicados. Solo se comparten consultas simultáneas dentro de la sesión; sin caché persistente. Para ISBN ya presente, POST /api/lecturas agrega otro formato. Mensaje claro ante 409.
- `src/services/lecturasApi.ts`: listado, filtro y consulta remotos por GET /api/lecturas y GET /api/lecturas/{id}. Escrituras de progreso y borrado pendientes de Etapa B.
- `src/pages/AgregarLibro.tsx`: selector físico/PDF/EPUB, validación de páginas y navegación por libroId devuelto.
- `src/pages/Biblioteca.tsx`: reutiliza una sola respuesta de lecturas para cargar los libros; no llama ensureSeed.
- `src/pages/LibroDetalle.tsx`: aviso de funciones pendientes de integración. Componentes existentes conservados.

Los datos locales anteriores permanecen intactos; no se migran automáticamente ni se mezclan con la biblioteca remota. Las reseñas, recomendaciones, estadísticas, sesiones, anotaciones y archivos continúan con su implementación local. El aislamiento completo de estos extras corresponde a Etapa D; no se garantiza todavía separación de sus datos entre usuarios. Las funciones locales de progreso/borrado no alteran la biblioteca remota; la interfaz lo advierte. Para agregar otro formato persistente se utiliza Agregar libro. No hay endpoint contratado de edición bibliográfica, sesiones o fechas personalizadas.

## Validación

Dependencias existentes: no se ejecutó npm ci para evitar reinstalar y alterar el package-lock.json previamente modificado por el usuario.

- npm.cmd run build: aprobado; advertencia de tamaño del bundle del lector.
- npm.cmd run lint: aprobado sin errores; 7 advertencias existentes en auth, theme, lectores, useAsync y SeguimientoFisico.
- git diff --check: aprobado (solo avisos de conversión LF/CRLF).
- Verificación en Node con fetch simulado en memoria: biblioteca personal con libros deduplicados, JWT, alta inicial, formato adicional, duplicado 409, 204, FormData y rechazo por cambio de sesión: aprobado. No equivale a prueba con servidor real.

No se realizaron pruebas de navegador ni se arrancó/modificó backend o MySQL. Pendientes con backend activo: registro/login, ISBN, alta física, recarga y nueva sesión; dos usuarios con bibliotecas distintas; agregar EPUB al mismo ISBN y repetir formato (409); sesión vencida. Progreso, borrado remoto y archivos quedan para B/C. No se afirma persistencia comprobada en MySQL.
