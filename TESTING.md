# TESTING — Guía para probar StreamApp desde el navegador

Pasos ordenados para probar el frontend (`http://localhost:3000`) y el backend
(`http://localhost:8080`) sin Postman, desde el navegador.

**Requisito:** backend en `:8080` y front en `:3000` corriendo.

---

## 1. Punto de entrada — Front

| Paso | Qué hacer | URL | Qué esperar |
|---|---|---|---|
| 1 | Abrir el front | `http://localhost:3000` | Redirige a `/login` — pantalla de login (tema oscuro, tarjeta centrada) |

## 2. Login / Registro (Front)

| Paso | Qué hacer | URL | Qué esperar |
|---|---|---|---|
| 2 | Loguearse con admin | en `/login`, usuario `admin` / `admin1234` → botón **Entrar** | Entra al Explorador. Sidebar con **Explorador / Favoritos / Playlists / Admin** |
| 3 | (Opcional) Probar registro | botón **¿No tenés cuenta? Crear una** → usuario nuevo + pass (mín 6) | Se registra y loguea automáticamente |
| 4 | Cerrar sesión | botón **Cerrar sesión** abajo a la izquierda | Vuelve a `/login` |

> El botón **Admin** solo aparece si el usuario es `ROLE_ADMIN`. Con un USER común, no está.

## 3. Mis raíces (Front)

| Paso | Qué hacer | URL | Qué esperar |
|---|---|---|---|
| 5 | Abrir Mis raíces | `http://localhost:3000/raices` o sidebar **Mis raíces** | Panel "Agregar carpeta" + listado "Raíces configuradas (x/5)" |
| 6 | Agregar una carpeta | pegar ruta absoluta (ej. `D:/PPI-PruebasPropuestasIdeas/probando opencode/streamapp-backend/media`) → **Agregar** | Aparece en la lista |
| 7 | Quitar una raíz | botón **Quitar** en la fila | Desaparece de la lista |
| 8 | Validar cupo | agregar 6+ rutas | Error 409: "Alcanzaste el máximo de 5 rutas" |

> Sin raíces, el explorador muestra "No configuraste ninguna carpeta todavía"
> con un botón que lleva a esta página.

## 4. Explorador (Front)

| Paso | Qué hacer | URL | Qué esperar |
|---|---|---|---|
| 9 | Ver raíces | `http://localhost:3000/` (o click **Explorador**) | Cards con las raíces configuradas (ej. `media`) |
| 10 | Navegar a música | click en `media` → click en `musica` | Breadcrumbs arriba (`Inicio / media / musica`). Aparecen `cancion.mp3`, `tono.wav`, `cancion.vtt` |
| 11 | **Reproducir audio** | click en `tono.wav` | Va a `/player` — reproductor de audio con duración 3s, reproducción real |
| 12 | Probar Range (mover seek) | en el player, arrastrar la barra de progreso | El navegador manda `Range` y el backend responde `206` → el seek funciona |
| 13 | **Agregar a favoritos** | en la card de un archivo, botón **♥ Favorito** | Alerta "agregado a favoritos" |
| 14 | **Agregar a playlist** | en la card de un archivo, botón **＋ Playlist** → elegir playlist | Alerta "agregado a ..." (si no hay playlists, invita a crear una) |
| 15 | Volver | botón **← Volver** | Regresa al explorador |

> `cancion.mp3` y `ejemplo.mp4` son archivos dummy (ceros) → el navegador no
> puede reproducirlos (error de demuxer). Usá `tono.wav` para audio. Para video
> real, reemplazá `ejemplo.mp4` por un MP4 válido.

## 5. Favoritos (Front)

| Paso | Qué hacer | URL | Qué esperar |
|---|---|---|---|
| 16 | Abrir Favoritos | `http://localhost:3000/favoritos` o sidebar | Lista con los archivos marcados (botón **♥ Favorito** en el explorador o player) |
| 17 | Reproducir | click sobre el item | Abre el player |
| 18 | Quitar | botón **Quitar** | El item desaparece de la lista |

## 6. Playlists (Front)

| Paso | Qué hacer | URL | Qué esperar |
|---|---|---|---|
| 19 | Abrir Playlists | `http://localhost:3000/playlists` | Barra "Nombre de la nueva playlist" + listado |
| 20 | Crear | tipear nombre → **Crear** | Aparece en la lista; se abre el panel de detalle |
| 21 | Agregar item | pegar path del archivo en "Path del archivo" → **Agregar** | Ej: `D:/PPI-PruebasPropuestasIdeas/probando opencode/streamapp-backend/media/musica/tono.wav` → aparece en items |
| 22 | Reproducir item | click sobre el item | Player |
| 23 | Renombrar / Quitar / Eliminar | botones del panel | Cada acción actualiza la lista |
| 24 | Seleccionar otra | click en otra playlist | Cambia el panel de detalle |

## 7. Admin (Front, solo ADMIN)

| Paso | Qué hacer | URL | Qué esperar |
|---|---|---|---|
| 25 | Abrir Admin | `http://localhost:3000/admin` | 3 paneles: **Crear usuario**, **Borrar contenido**, **Usuarios** |
| 26 | Crear usuario | usuario + pass + rol (USER/ADMIN) → **Crear** | Aparece en la tabla |
| 27 | Borrar contenido | path absoluto → **Borrar** | Ej: `.../media/musica/tono.wav` → resultado con `filesDeleted` |
| 28 | Probar protección | borrar una root (`.../media`) | Error `403` (rojo) |

## 8. Swagger (Backend, desde el navegador)

| Paso | Qué hacer | URL | Qué esperar |
|---|---|---|---|
| 29 | Abrir Swagger UI | `http://localhost:8080/swagger-ui.html` | Documentación OpenAPI interactiva |
| 30 | Autenticarse en la UI | botón **Authorize** → pegar token | Probar endpoints protegidos desde ahí |

Para obtener un token sin Postman: loguearse en el front (`localhost:3000`) y
copiar el token desde DevTools → Application → Local Storage →
`streamapp_token`.

## 9. Endpoints públicos (navegador directo)

| Método | URL | Qué esperar |
|---|---|---|
| GET | `http://localhost:3000/api/stream/{ticket}` | Stream de rango (206). El ticket sale en DevTools al reproducir, o copiándolo del JSON de favoritos/playlists |
| GET | `http://localhost:8080/v3/api-docs` | JSON de la spec OpenAPI |
| GET | `http://localhost:8080/api/auth/me` | `401` (requiere token — esperado) |

## 10. Biblioteca, filtros y regreso desde detalle

| Qué hacer | Qué esperar |
|---|---|
| Abrir `/` o `/biblioteca` | Se muestra la biblioteca con paginación numérica y filtros |
| Buscar por título y combinar los filtros de tipo, actor, director, año, género y puntuación | Los desplegables ofrecen opciones del catálogo y los resultados cumplen los filtros seleccionados |
| Avanzar a otra página y abrir un título desde una card | El detalle abre para el título seleccionado |
| Pulsar **← Volver al explorador** desde el detalle | Regresa a la biblioteca conservando filtros, búsqueda, número de página y posición de desplazamiento |
| Abrir un detalle desde `/explorador` y volver | Regresa a la misma ruta/carpeta y posición del explorador |
| Pulsar **Actualizar biblioteca** | Se muestra el estado activo, tiempo transcurrido y barra indeterminada; una estimación aparece si hay historial local de duración |
| Pulsar **Cancelar actualización** durante el escaneo | El escaneo se detiene cooperativamente y se conservan los elementos procesados antes de cancelar |
| Completar una actualización y revisar los filtros | Las opciones de metadata se recargan para incluir los valores encontrados durante el escaneo |
