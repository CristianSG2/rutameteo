const BASE = 'https://nominatim.openstreetmap.org/search'
const HEADERS = {
  'User-Agent': 'rutameteo/1.0',
  'Accept-Language': 'es',
}

/**
 * Geocodes a free-text query using Nominatim (OpenStreetMap).
 * @param {string} query  e.g. "Madrid", "Calle Gran Vía, Barcelona"
 * @returns {Promise<{ lat: number, lon: number, displayName: string }>}
 */
export async function searchLocation(query) {
  const url = new URL(BASE)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')

  const res = await fetch(url.toString(), { headers: HEADERS })
  if (!res.ok) throw new Error(`Nominatim error ${res.status} para "${query}"`)

  const data = await res.json()
  if (!data.length) throw new Error(`No se encontró ningún resultado para "${query}"`)

  const [result] = data
  return {
    lat: parseFloat(result.lat),
    lon: parseFloat(result.lon),
    displayName: result.display_name,
  }
}
