const BASE = 'https://photon.komoot.io/api/'

function buildUrl(query, limit) {
  const params = new URLSearchParams({ q: query, limit })
  return `${BASE}?${params.toString()}`
}

/**
 * Builds a displayName from a Photon GeoJSON feature.
 */
function buildDisplayName(feature) {
  const p = feature.properties
  const street = p.street && p.housenumber ? `${p.street} ${p.housenumber}` : p.street
  const parts = [p.name, street, p.city, p.county].filter(Boolean)
  return [...new Set(parts)].join(', ')
}

/**
 * Maps a Photon GeoJSON feature to our standard location object.
 */
function toLocation(feature) {
  const [lon, lat] = feature.geometry.coordinates
  return { lat, lon, displayName: buildDisplayName(feature) }
}

/**
 * Returns up to 5 location suggestions for a partial query (autocomplete).
 * @param {string} query
 * @returns {Promise<{ lat: number, lon: number, displayName: string }[]>}
 */
export async function suggestLocations(query) {
  const res = await fetch(buildUrl(query, 5))
  if (!res.ok) return []
  const data = await res.json()
  return (data.features ?? []).map(toLocation)
}

/**
 * Geocodes a free-text query, returning the best match.
 * @param {string} query
 * @returns {Promise<{ lat: number, lon: number, displayName: string }>}
 */
export async function searchLocation(query) {
  const res = await fetch(buildUrl(query, 1))
  if (!res.ok) throw new Error(`Geocoding error ${res.status} para "${query}"`)
  const data = await res.json()
  if (!data.features?.length) throw new Error(`No se encontró ningún resultado para "${query}"`)
  return toLocation(data.features[0])
}
