# StreamApp Frontend

App web del backend de streaming local. React 19 + TypeScript + Vite.
Diseñada para reproducir contenido (música y video) en viewport grande.

## Puesta en marcha

```bash
npm install
npm run dev
```

Servidor de desarrollo en `http://localhost:3000`. En dev, Vite proxya
`/api` a `http://localhost:8080` (el backend), así que no hace falta CORS
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
    api.ts              Cliente HTTP (token JWT automático, errores tipados)
    auth.tsx            Contexto de autenticación (login/register/logout)
  components/
    Layout.tsx          Sidebar + navegación + footer de sesión
  pages/
    LoginPage.tsx       Login / registro
    ExplorerPage.tsx    Explorador de raíces/carpetas con reproducción
    PlayerPage.tsx      Reproductor (video/audio) con streamUrl
    FavoritesPage.tsx   Favoritos del usuario
    PlaylistsPage.tsx   CRUD de playlists e items
    AdminPage.tsx       Admin: crear usuarios y borrar contenido
```

## Rutas

| Ruta | Acceso | Descripción |
|---|---|---|
| `/login` | Público | Login / registro |
| `/` | Autenticado | Explorador |
| `/favoritos` | Autenticado | Favoritos |
| `/playlists` | Autenticado | Playlists |
| `/admin` | Solo ADMIN | Gestión de usuarios y borrado de contenido |
| `/player` | Autenticado | Reproductor (toma `src`, `title`, `type` por query) |

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
