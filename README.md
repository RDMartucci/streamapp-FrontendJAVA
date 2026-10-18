# SVHome Frontend

Cliente web de SVHome para explorar y reproducir contenido multimedia desde un
servidor local. React 19 + TypeScript + Vite.
Diseñada para reproducir contenido (música y video) en viewport grande.

En producción, Docker construye esta aplicación y el backend la entrega junto
con la API. Por eso, los dispositivos cliente solo necesitan un navegador y la
dirección del servidor, por ejemplo `http://192.168.1.50:8081`.

## Puesta en marcha

```bash
npm install
npm run dev
```

Servidor de desarrollo en `http://localhost:3003`. En dev, Vite proxya
`/api` a `http://localhost:8081` (el backend), así que no hace falta CORS
manual ni apuntar a otra URL.

## Requisitos

- Node 20+
- El backend corriendo en `http://localhost:8081` (ver `streamapp-backend/README.md`)

Por defecto el cliente usa el mismo origen desde el que se abrió. Para generar
una copia alojada en otro sitio, copiar `.env.example` a `.env` y definir
`VITE_SERVER_URL` con la URL del servidor antes de ejecutar el build.

## Estructura

```
src/
  App.tsx               Router + guards de autenticación/roles
  types.ts              Tipos de los DTOs del backend
  lib/
    api.ts              Cliente HTTP base (token JWT automático, errores tipados)
    auth.tsx            Contexto de autenticación (login/register/logout)
  services/             Capa de API REST: un servicio por recurso del backend
    auth.ts             POST /api/auth/{login,register}
    roots.ts            GET/POST/DELETE /api/roots
    explorer.ts         GET /api/explorer
    library.ts          Búsqueda paginada, opciones de filtros y actualización del catálogo
    favorites.ts        GET/POST/DELETE /api/favorites
    playlists.ts        CRUD /api/playlists e items
    admin.ts            GET/POST /api/admin/users, DELETE /api/admin/media
  components/
    Layout.tsx          Sidebar + navegación + footer de sesión
  pages/
    LoginPage.tsx       Login / registro
    RootsPage.tsx       Configuración de raíces del usuario
    ExplorerPage.tsx    Explorador de raíces/carpetas con reproducción
    LibraryPage.tsx     Catálogo con búsqueda, filtros y actualización de biblioteca
    TitleDetailPage.tsx Detalle TMDB y acciones sobre un título
    PlayerPage.tsx      Reproductor (video/audio) con streamUrl
    FavoritesPage.tsx   Favoritos del usuario
    PlaylistsPage.tsx   CRUD de playlists e items
    AdminPage.tsx       Admin: crear usuarios y borrar contenido
```

## Arquitectura

La app consume el backend como **API REST** a través de una capa de servicios
(`src/services/`): cada recurso del backend tiene su propio módulo con métodos
tipados, y los componentes/páginas nunca llaman a `fetch` directamente — solo
usan esos servicios. El cliente HTTP base (`src/lib/api.ts`) centraliza el
token JWT, el manejo de errores y los métodos HTTP.

- Si cambia un endpoint del backend, solo se actualiza el servicio de ese
  recurso.
- Los DTOs de respuesta viven en `src/types.ts`, alineados con el backend.

## Rutas

| Ruta | Acceso | Descripción |
|---|---|---|
| `/login` | Público | Login / registro |
| `/` | Autenticado | Biblioteca |
| `/biblioteca` | Autenticado | Biblioteca |
| `/explorador` | Autenticado | Explorador de raíces/carpetas |
| `/detalle` | Autenticado | Detalle de un título |
| `/raices` | Autenticado | Configuración de raíces del usuario |
| `/favoritos` | Autenticado | Favoritos |
| `/playlists` | Autenticado | Playlists |
| `/admin` | Solo ADMIN | Gestión de usuarios y borrado de contenido |
| `/player` | Autenticado | Reproductor (toma `src`, `title`, `type`, `path` por query) |

## Biblioteca y explorador

La biblioteca permite combinar una búsqueda por título con filtros de tipo de
contenido, actor, director, año, género y puntuación mínima. Los filtros de
metadata son desplegables y sus opciones se obtienen del catálogo del usuario
mediante `GET /api/library/filter-options`; al completar una actualización se
vuelven a cargar para incluir metadata recién indexada.

Los episodios de series se agrupan en tarjetas con la portada y el nombre de
cada serie, además de la cantidad de episodios. Al seleccionar una tarjeta, se
muestran solo sus episodios; la acción para volver a todas las series devuelve
a la vista agrupada. La búsqueda y los filtros se aplican tanto a las series
como a sus episodios.

La biblioteca presenta películas, series y audio en secciones independientes,
cada una con una fila horizontal desplazable y flechas laterales cuando hay más
tarjetas fuera de vista. Cada sección se pagina independientemente, en bloques
de 12 tarjetas, con controles anterior/siguiente, botones numerados para ir
directamente a una página y un control deslizante en el encabezado (o desplazarse
horizontalmente cuando la sección solo tiene una página). Se indica el rango de títulos de la página y
cuáles están visibles en la fila. Al aplicar cualquier búsqueda o filtro, los resultados se muestran
en una grilla paginada de 24 elementos. La búsqueda, los filtros y la página actual se
exponen en los parámetros de la URL. Al abrir un título y volver al listado se
conservan los filtros, la serie seleccionada, la página y la posición de
desplazamiento. El explorador también conserva la posición al volver desde un
detalle.

**Actualizar biblioteca** muestra el estado del proceso, el tiempo transcurrido
y una barra indeterminada (no representa un porcentaje de avance). Si hay una
estimación anterior, presenta un tiempo restante aproximado; se calcula con la
duración media por título guardada localmente en el navegador y separada por
usuario. Durante el escaneo se puede solicitar la cancelación. El proceso
comprueba la solicitud entre operaciones y puede interrumpir consultas de
metadata a TMDB; los elementos ya indexados o actualizados se conservan.

La API de biblioteca usa `GET /api/library` para resultados paginados. Acepta
`page`, `size`, `q` (título), `type`, `actor`, `director`, `year`, `genre` y
`stars`. La actualización se inicia con `POST /api/library/scan` y se cancela
con `POST /api/library/scan/cancel`; estas rutas y las de consulta requieren
autenticación.

## Streaming

El explorador y las listas (favoritos/playlists) entregan `streamUrl`
(p. ej. `/api/stream/{ticket}`). El reproductor apunta la etiqueta
`<video>`/`<audio>` directamente a esa URL: el navegador emite peticiones
con `Range`, y el backend responde `206` con `Accept-Ranges: bytes`.

Para conservar sesiones existentes, las claves de almacenamiento local del
navegador (incluida `streamapp_token`) y el esquema de base de datos todavía usan el prefijo técnico
`streamapp`. El protocolo local `streamapp-player://` también se conserva para
que sigan funcionando las instalaciones existentes del puente de VLC.

## Scripts

- `npm run dev` — servidor de desarrollo (proxy a :8081)
- `npm run build` — typecheck (`tsc -b`) + build de producción
- `npm run preview` — servir el build
- `npm run lint` — oxlint
