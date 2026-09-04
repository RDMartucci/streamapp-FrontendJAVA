# StreamApp Frontend

App web del backend de streaming local. React 19 + TypeScript + Vite.
Diseñada para reproducir contenido (música y video) en viewport grande.

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
- El backend corriendo en `http://localhost:8080` (ver `streamapp-backend/README.md`)

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
    favorites.ts        GET/POST/DELETE /api/favorites
    playlists.ts        CRUD /api/playlists e items
    admin.ts            GET/POST /api/admin/users, DELETE /api/admin/media
  components/
    Layout.tsx          Sidebar + navegación + footer de sesión
  pages/
    LoginPage.tsx       Login / registro
    RootsPage.tsx       Configuración de raíces del usuario
    ExplorerPage.tsx    Explorador de raíces/carpetas con reproducción
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
| `/` | Autenticado | Explorador |
| `/raices` | Autenticado | Configuración de raíces del usuario |
| `/favoritos` | Autenticado | Favoritos |
| `/playlists` | Autenticado | Playlists |
| `/admin` | Solo ADMIN | Gestión de usuarios y borrado de contenido |
| `/player` | Autenticado | Reproductor (toma `src`, `title`, `type`, `path` por query) |

## Streaming

El explorador y las listas (favoritos/playlists) entregan `streamUrl`
(p. ej. `/api/stream/{ticket}`). El reproductor apunta la etiqueta
`<video>`/`<audio>` directamente a esa URL: el navegador emite peticiones
con `Range`, y el backend responde `206` con `Accept-Ranges: bytes`.

## Scripts

- `npm run dev` — servidor de desarrollo (proxy a :8080)
- `npm run build` — typecheck (`tsc -b`) + build de producción
- `npm run preview` — servir el build
- `npm run lint` — oxlint
