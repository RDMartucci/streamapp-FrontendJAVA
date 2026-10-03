// const API_KEY = "cb3b91bce1b8118caa2032852cf3e3f3";
// const accessToken = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYjNiOTFiY2UxYjgxMThjYWEyMDMyODUyY2YzZTNmMyIsIm5iZiI6MTc1NDQzMDk0Ny43NjEsInN1YiI6IjY4OTI3ZGUzMDJhZmFhYjRjZmRiZmEwNCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.OcPkjJY0s2jfZEfzaxLBwGz3xAQsE37-yBsn7QGBt04';
// const BASE_URL = "https://api.themoviedb.org/3";

// export const searchMovie = async (query) => {
//   try {

//     const url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`;
//     const options = {
//       method: 'GET',
//       headers: {
//         accept: 'application/json',
//         Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYjNiOTFiY2UxYjgxMThjYWEyMDMyODUyY2YzZTNmMyIsIm5iZiI6MTc1NDQzMDk0Ny43NjEsInN1YiI6IjY4OTI3ZGUzMDJhZmFhYjRjZmRiZmEwNCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.OcPkjJY0s2jfZEfzaxLBwGz3xAQsE37-yBsn7QGBt04'
//       }
//     };

//       const res = await fetch(url, options)
//       if(!res.ok) throw new Error(`Error HTTP: ${res.status}`);
//       const data = await res.json();
//       return data.results[0] || null;
//     } catch(error) {
//       console.error("Error buscando en TMDB:", error);
//       return null;
//     }
//   };

// const API_KEY = "cb3b91bce1b8118caa2032852cf3e3f3";
// const BASE_URL = "https://api.themoviedb.org/3";

// export const searchMovie = async (query) => {
//    try {
//      const url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`;
//      const res = await fetch(url);
//      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
//      const data = await res.json();
//      return data.results[0] || null;
//    } catch (error) {
//      console.error("Error buscando en TMDB:", error);
//      return null;
//    }
//  };

/*********************************************** */
// la api de tmdb para buscar por nombre y año...
// ***********************************************
// const url = 'https://api.themoviedb.org/3/search/movie?query=Last%20Breath&include_adult=false&language=en-US&page=1&year=2025';
// const options = {
//   method: 'GET',
//   headers: {
//     accept: 'application/json',
//     Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYjNiOTFiY2UxYjgxMThjYWEyMDMyODUyY2YzZTNmMyIsIm5iZiI6MTc1NDQzMDk0Ny43NjEsInN1YiI6IjY4OTI3ZGUzMDJhZmFhYjRjZmRiZmEwNCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.OcPkjJY0s2jfZEfzaxLBwGz3xAQsE37-yBsn7QGBt04'
//   }
// };

// fetch(url, options)
//   .then(res => res.json())
//   .then(json => console.log(json))
//   .catch(err => console.error(err));
/************************************************ */

// const API_KEY = "cb3b91bce1b8118caa2032852cf3e3f3";
// const BASE_URL = "https://api.themoviedb.org/3";

/**
 * Busca una película en TMDb por nombre y opcionalmente por año.
 * @param {string} query - Nombre de la película.
 * @param {number|string} [year] - Año de la película (opcional).
 * @returns {Promise<object|null>}
 */
// export const searchMovie = async (query, year) => {
//   console.log("searchMovie->Parámetros recibidos:", { query, year });
//   if (!query) {
//     console.log("searchMovie->Nombre de película vacío, no se puede buscar.");
//     return null;
//   }
//   try {

//     let url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`;

//     if (year) {
//       url += `&year=${encodeURIComponent(year)}`;
//     }
//     console.log("URL de búsqueda:", url);

//     const res = await fetch(url);
//     if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

//     const data = await res.json();
//     console.log("Resultados de búsqueda:", data.results);

//     return data.results[0] || null;

//   } catch (error) {
//     console.error("Error buscando en TMDB:", error);
//     return null;
//   }
// };
// const API_KEY = "cb3b91bce1b8118caa2032852cf3e3f3";
// const BASE_URL = "https://api.themoviedb.org/3";


// export async function searchMovie(query, year) {
//   if (!query) return null;
//   try {
//     const res = await fetch(
//       `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}${year ? `&year=${year}` : ""}&language=es-ES`
//     );
//     const data = await res.json();
//     if (!data.results || data.results.length === 0) return null;

//     const movie = data.results[0];

//     // 🔹 Buscar videos (trailers)
//     const videosRes = await fetch(
//       `${BASE_URL}/movie/${movie.id}/videos?api_key=${API_KEY}&language=es-ES`
//     );
//     const videosData = await videosRes.json();
//     const trailer = videosData.results.find(
//       (vid) => vid.type === "Trailer" && vid.site === "YouTube"
//     );

//     return {
//       ...movie,
//       trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
//     };
//   } catch (err) {
//     console.error("Error en searchMovie:", err);
//     return null;
//   }
// }


// /*********************************************************** */
// /*********************************************************** */
//const API_KEY = "cb3b91bce1b8118caa2032852cf3e3f3";
//VITE_TMDB_KEY = "cb3b91bce1b8118caa2032852cf3e3f3";  en el .env

export async function searchMovie(title, year) {
  if (!title) return [];
  const API_KEY = import.meta.env.VITE_TMDB_KEY;
  if (!API_KEY) {
    console.error("Falta VITE_TMDB_KEY en .env");
    return [];
  }


  const params = new URLSearchParams({
    api_key: API_KEY,
    query: title,
    include_adult: "false",
    language: "es-ES",
  });
  if (year) params.set("year", String(year));


  const url = `https://api.themoviedb.org/3/search/movie?${params.toString()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB search error: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch (e) {
    console.error("searchMovie() ->", e);
    return [];
  }
}

export async function getMovieDetails(id) {
  const API_KEY = import.meta.env.VITE_TMDB_KEY;
  if (!API_KEY || !id) return null;
  const params = new URLSearchParams({
    api_key: API_KEY,
    language: "es-ES",
    append_to_response: "videos",
  });
  const options = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYjNiOTFiY2UxYjgxMThjYWEyMDMyODUyY2YzZTNmMyIsIm5iZiI6MTc1NDQzMDk0Ny43NjEsInN1YiI6IjY4OTI3ZGUzMDJhZmFhYjRjZmRiZmEwNCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.OcPkjJY0s2jfZEfzaxLBwGz3xAQsE37-yBsn7QGBt04'
  }
};
  const url = `https://api.themoviedb.org/3/movie/${id}?${params.toString()}`;
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`TMDB details error: ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error("getMovieDetails() ->", e);
    return null;
  }
}

//Función para buscar los creditos de los titulos.
export async function getMovieCredits(id) {
  const API_KEY = import.meta.env.VITE_TMDB_KEY;
  if (!API_KEY || !id) return null;

  const params = new URLSearchParams({
    api_key: API_KEY,
    language: "es-ES",
    append_to_response: "videos",
  });

  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYjNiOTFiY2UxYjgxMThjYWEyMDMyODUyY2YzZTNmMyIsIm5iZiI6MTc1NDQzMDk0Ny43NjEsInN1YiI6IjY4OTI3ZGUzMDJhZmFhYjRjZmRiZmEwNCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.OcPkjJY0s2jfZEfzaxLBwGz3xAQsE37-yBsn7QGBt04'
    }
  };
  const url = `https://api.themoviedb.org/3/movie/${id}/credits?${params.toString()}`;
  
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`TMDB credits error: ${res.status}`);
    return await res.json();
  }
  catch (e) {
    console.error("getMovieCredits() ->", e);
    return null;
  }
}