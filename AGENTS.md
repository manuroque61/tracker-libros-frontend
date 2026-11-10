# Libros Tracker — contexto para agentes

Aplicación en español para organizar lecturas de libros físicos y digitales, leer PDF/EPUB, buscar libros y compartir actividad con amistades y clubes.

## Puesta en marcha en una PC nueva

### Requisitos

- Node.js 20.19+ o 22.12+ (Vite 8 lo exige; probado con Node 24) y npm.
- JDK 21 para el backend.
- MySQL corriendo en `localhost:3306`.
- Git.
- Conexión a internet la primera vez (npm, Maven y las APIs externas).

### Frontend (`tracker-libros-frontend`)

1. Clonar: `git clone https://github.com/manuroque61/tracker-libros-frontend.git`.
2. Instalar dependencias desde la raíz: `npm install` (o `npm ci` para replicar exactamente el lockfile).
3. No usa variables de entorno: el proxy de Vite en `vite.config.ts` envía `/api` a `http://localhost:8080`.
4. Verificar que nada esté ya escuchando en `:5173` y levantar con `npm run dev`.

### Backend (`tracker-libros-backend`)

1. Clonar: `git clone https://github.com/manuroque61/tracker-libros-backend.git` (la ruta final es libre; aquí se usa `D:\proyects\libros-tracker-back\tracker-libros-backend`).
2. Crear la base de datos en MySQL: `CREATE DATABASE tracker_libros CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
3. Copiar `src/main/resources/application.properties.example` a `application.properties` (está ignorado por Git; cada PC lo configura localmente) y completar:
   - `spring.datasource.username` y `spring.datasource.password`.
   - `security.jwt.secret` con un valor aleatorio largo.
   - `gutenberg.rapidapi.key` con una clave propia de RapidAPI. Nunca commitearla ni compartirla. Sin esta clave el catálogo en español igual funciona (usa Gutendex sin clave), pero el filtro en inglés/otro idioma y el respaldo de español fallarán.
4. Levantar con `./mvnw.cmd spring-boot:run` en Windows (`./mvnw spring-boot:run` en Unix). La primera vez el wrapper descarga Maven 3.9.16 y las dependencias (tarda más). Hibernate crea/actualiza el esquema solo (`ddl-auto=update`).
5. Comprobar el puerto `:8080` antes de arrancar para evitar instancias duplicadas.

### Orden de arranque

1. MySQL.
2. Backend (`:8080`).
3. Frontend (`:5173`).

Si el frontend está sin backend, las llamadas a `/api` fallan con «Sin conexión con el servidor» (`src/services/apiClient.ts`).

## Repositorios y estructura

- El frontend real vive en la raíz de este repositorio: `src/`, `index.html`, `package.json` y `vite.config.ts`. Usa React 19, TypeScript, Vite, React Router y oxlint.
- El backend real está en el repositorio separado `tracker-libros-backend`. Usa Spring Boot 4, Java 21, MySQL y el paquete `ies.belgrano.tracker_libros`. Su responsable habitual es Manu (`manuroque61`). En esta PC la ruta local es `D:\proyects\libros-tracker-back\tracker-libros-backend`; en otra PC puede estar donde se haya clonado.
- `backend/` dentro de este repositorio es una copia local antigua y sin Git. No leerla ni editarla.
- `frontend/` solo puede contener restos locales; el código fuente frontend está en la raíz.
- `storage/` y `uploads/` contienen archivos locales y no deben explorarse sin necesidad.

## Comandos y ejecución local

Frontend, desde la raíz:

- `npm run dev` inicia Vite en `http://localhost:5173`; `/api` se envía al backend en `:8080`.
- `npm run lint` ejecuta oxlint.
- `npm run build` ejecuta `tsc -b && vite build`.
- `npm run preview` sirve la compilación.

Backend, desde la carpeta clonada de `tracker-libros-backend`:

- `./mvnw spring-boot:run` inicia Spring Boot en `:8080` (en PowerShell puede usarse `./mvnw.cmd spring-boot:run`).
- `./mvnw test` ejecuta las pruebas.
- `./mvnw -DskipTests package` empaqueta el backend.

Antes de iniciar otro proceso, comprobar si ya hay uno escuchando en el puerto para evitar instancias duplicadas. El frontend y el backend son repositorios Git distintos: ejecutar `git status` en ambos si se editan los dos.

## Organización y convenciones

### Frontend

- Peticiones HTTP y mapeo de respuestas: `src/services/*`.
- Hooks: `src/hooks/*`; tipos compartidos: `src/types/index.ts`.
- Páginas: `src/pages/`; componentes reutilizables: `src/components/`; lectores: `src/readers/`.
- Estilos en `src/index.css`, con clases CSS; no hay librería de componentes UI.
- Mantener interfaz y textos en español.
- La autenticación del frontend es opcional: contexto en `src/auth.tsx`, cliente en `src/services/authApi.ts`, token en `localStorage` con clave `libros-tracker.token`. El backend sí expone `/api/auth/login` y `/api/auth/registro` (más `/api/usuarios/me`); verificar el backend en uso antes de depender de esos endpoints.

### Backend

- Capas `controller/`, `service/`, `repository/`, `entity/` y `dto/`.
- Mantener controladores delgados y concentrar la lógica en servicios; usar repositorios Spring Data.
- Endpoints bajo `/api/...`.

## Contexto funcional y decisiones del producto

### Lectura y anotaciones

- Se admiten libros PDF y EPUB, incluidos títulos de Project Gutenberg.
- Las anotaciones deben guardar un punto de lectura útil: progreso/porcentaje y, cuando el formato lo permita, una ubicación navegable estable (por ejemplo, CFI o href del EPUB). Al seleccionar una anotación, restaurar el lector en ese punto; el porcentaje solo es una alternativa aproximada si no hay ubicación precisa.
- El progreso debe funcionar tanto en paginación como en modo cascada/scroll, y persistirse por usuario y libro cuando la API disponible lo permita.
- El lector puede recordar sesión/libro y posición para reanudar la lectura. Al cambiar de libro o cerrar sesión, no mezclar posiciones.
- No basar la creación de anotaciones exclusivamente en un evento de progreso que quizá todavía no se haya disparado: si falta porcentaje, tomar la ubicación/progreso actual del lector y ofrecer un valor seguro.
- EPUB.js crea iframes. Los avisos de Permissions Policy sobre `unload` y de sandbox pueden provenir de la librería/navegador y no implican por sí mismos un fallo de anotaciones. Investigar errores de carga, navegación y persistencia por separado; no quitar controles de sandbox a ciegas.

### Catálogos y descargas

- Open Library aporta búsqueda, portadas, metadatos y disponibilidad de préstamo cuando se pueda determinar.
- Project Gutenberg aporta obras y descargas de dominio público. La intención acordada es combinar ambas fuentes en la información del libro y permitir elegir entre versiones disponibles, por idioma y fuente/formato cuando existan.
- Los identificadores de Open Library y Gutenberg no son intercambiables. Mantener el ID externo, ISBN y/o identidad de obra junto con el libro local para conservar compatibilidad con reseñas, clubes y progreso. No crear duplicados al elegir otra edición/version.
- Una URL de Gutenberg puede redirigir a otro dominio y bloquearse por CORS desde el navegador. No asumir que el fetch directo funcionará ni cambiar la estrategia de descarga sin probarla; revisar si el backend ofrece un proxy antes de añadir uno.
- Gutenberg consulta dos fuentes desde `GutenbergService`: para español intenta primero Gutendex (`https://gutendex.com`, sin clave) con un timeout corto (`gutenberg.gutendex.timeout-ms`, 3000 ms) y si no responde cae a RapidAPI; para inglés y demás idiomas va directo a RapidAPI. La clave de RapidAPI se configura solo localmente en `src/main/resources/application.properties` del backend, archivo ignorado por Git. Nunca escribir claves en código, frontend, logs, documentación, comandos visibles, commits ni respuestas. No deshacer el ignore ni incluir ese archivo en un commit.
- Ambas fuentes devuelven páginas de 32 resultados con `next`/`page` para seguir cargando. Mantener paginación desde UI/API y no reemplazar la búsqueda por una lista fija de pocos ejemplos. No afirmar que el filtro de idioma de RapidAPI funciona sin verificarlo: los parámetros probados no dieron resultados fiables; el filtro de idioma confiable es el de Gutendex (`languages`).

### Comunidad, amistades y clubes

- La comunidad incluye amistades, invitaciones, clubes, miembros y comentarios.
- En la información del libro, los comentarios del club deben aparecer destacados visualmente y separados de los comentarios generales.
- Las reseñas generales no deben desaparecer por no ser de amistades aceptadas. Mostrar inicialmente cinco y ofrecer un botón para cargar/ver más.
- Las invitaciones deben usar el ID real del club y de la amistad/usuario; validar datos antes de llamar a una ruta para evitar URLs como `/clubes/null/...`. Las claves React también deben ser únicas incluso cuando un registro no tenga ID.
- Mantener el vínculo entre una obra y sus ediciones externas para que seleccionar Open Library o Gutenberg no rompa las relaciones del libro con clubes y reseñas.

## Cuidado con el estado del trabajo

- El árbol puede contener cambios locales del usuario sin commit. Antes de editar, revisar `git status --short` en el repositorio correspondiente; no descartar, revertir, limpiar ni sobrescribir cambios que no pertenezcan a la tarea.
- No hacer commits, push, despliegues ni publicar secretos salvo que se solicite explícitamente.
- Evitar leer `node_modules/`, `dist/`, `frontend/node_modules/`, `frontend/dist/`, `package-lock.json`, el directorio obsoleto `backend/`, `storage/` y `uploads/`.
- Ubicar archivos con `rg`/glob y leer solo los tramos pertinentes. Mantener diffs acotados y no agregar dependencias, MCP ni plugins sin autorización.
- Al tocar frontend, ejecutar lint y build; al tocar backend, ejecutar pruebas Maven cuando sean pertinentes. Si el usuario pide solo explicación/documentación, no hace falta ejecutar pruebas.
