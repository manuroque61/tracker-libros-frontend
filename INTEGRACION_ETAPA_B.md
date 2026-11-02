# Integración — Etapa B

## Cambios

- `src/services/lecturasApi.ts`: creación real con `{libroId, formato}`, progreso físico con `{paginaActual}`, progreso PDF/EPUB con `{porcentajeDigital, ubicacionDigital}`, estado mediante PATCH independiente y eliminación con DELETE/204. Validación de IDs, formato, páginas y porcentaje. Mensaje específico para duplicados 409 y para progreso guardado seguido de fallo al cambiar estado. El formato se consulta al servidor antes de construir el progreso.
- `src/pages/LibroDetalle.tsx`: agregar y quitar lecturas reales, selector de estado independiente para cualquier formato. Eliminar libro quita sus lecturas propias sin modificar catálogo global ni borrar datos locales anteriores; se informa si una eliminación múltiple queda incompleta.
- `src/pages/SeguimientoFisico.tsx`: cargar la pantalla no crea lecturas. Creación explícita, comprobación de formato físico y guardado real. El porcentaje proviene del servidor y utiliza las páginas del catálogo, no el total editable local. Mensajes distinguen cambios remotos y provisionales.
- `src/hooks/useLecturaSync.ts`: cola por lectura con debounce, serialización, flush al desmontar, rechazo de respuestas visuales tardías y retención del progreso pendiente para reintentar. Fallos visibles mientras la pantalla está montada; si falla un flush después de salir se registra el error en consola. Se advierte al cerrar si quedan cambios pendientes. El cierre forzado del navegador no garantiza completar una petición.
- `src/pages/Lector.tsx`: muestra errores y permite reintentar; elige/crea una lectura del mismo formato que el archivo seleccionado. No cambia archivo si falla el guardado previo. Ajusta el texto sobre progreso remoto y archivo local; la subida/descarga siguen pendientes de Etapa C.
- `src/pages/Biblioteca.tsx`: actualiza el aviso de alcance de integración.
- `scripts/verificar-etapa-b.cjs`: prueba ejecutable con HTTP y almacenamiento simulados, sin acceder a backend o datos reales.

## Datos provisionales conservados

Fechas editables, total de páginas por lectura y sesiones permanecen en localStorage, en claves nuevas asociadas al usuario (`sub` del JWT). Nunca se incluyen en peticiones al backend. Las fechas oficiales del servidor permanecen separadas de las fechas editables locales. Los errores de escritura local se informan.

Los datos anteriores, incluidas sesiones, libros y anotaciones, no se borran ni se migran automáticamente: pertenecen al almacenamiento legado sin usuario identificado. Las nuevas sesiones de seguimiento usan almacenamiento por usuario; las estadísticas legadas aún no consumen esas nuevas sesiones. Su compatibilidad completa corresponde a Etapa D. Reseñas, anotaciones, estadísticas y archivos mantienen las limitaciones locales anteriores.

## Validación

- `node scripts/verificar-etapa-b.cjs`: contratos físicos y digitales, estado independiente, JWT, 409, DELETE/204, fallo parcial progreso/estado, validaciones, separación de nuevos datos locales por usuario y preservación de datos anteriores.
- `npm.cmd run build` (equivalente a `npm run build` en Windows).
- `npm.cmd run lint` (equivalente a `npm run lint`).
- `git diff --check` con excepción de propiedad aplicada solo al comando, sin cambiar configuración global.

Se usaron las dependencias existentes. No se modificaron backend ni package-lock.json en esta etapa. No se hicieron commits ni push.

Resultado final: verificación de contratos y build aprobados; lint sin errores, con 6 advertencias en patrones ya existentes de React/Fast Refresh. Build advierte el tamaño del bundle del lector. Diff sin errores de espacios, con avisos de normalización LF/CRLF.

## Pruebas pendientes con backend y navegador

No se arrancó backend/MySQL ni se realizaron pruebas de navegador en esta entrega. Verificar:

1. Agregar formatos físico, PDF y EPUB desde detalle, y mensaje 409 al repetir formato.
2. Abrir seguimiento sin lectura física: no debe existir POST hasta pulsar Crear lectura física.
3. Guardar página física, recargar y reabrir sesión; confirmar porcentaje calculado con páginas del catálogo.
4. Cambiar estados desde detalle y seguimiento; revisar en Network los PATCH separados y provocar un fallo de estado después de guardar progreso.
5. Editar fechas/total y registrar sesión: comprobar persistencia solo local y ausencia de esos campos en las peticiones; comprobar otro usuario.
6. Leer PDF/EPUB, cambiar de posición rápidamente, reintentar errores de red y cambiar lectura; comprobar restauración de ubicación al seleccionar de nuevo el archivo. La cola se revisó en código; requiere validación interactiva de navegación y cierre.
7. Quitar una lectura y comprobar que no vuelve en biblioteca después de recargar; quitar la última debe sacar el libro de biblioteca. Confirmar que backend elimina su archivo asociado y conserva el catálogo.
8. Token vencido, backend desconectado y eliminación múltiple parcialmente fallida.

No se afirma persistencia comprobada en MySQL. No se inventaron endpoints para sesiones, fechas, total por lectura o edición del catálogo.
