const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'
const OSRM_TABLE = 'https://router.project-osrm.org/table/v1/driving'

/**
 * Haversine distance in meters between two [lat, lon] points.
 */
function haversineMeters([lat1, lon1], [lat2, lon2]) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

/**
 * Fetches a driving route from OSRM.
 *
 * @param {{ lat: number, lon: number }[]} waypoints  at least 2 entries
 * @returns {Promise<{ geometry: [number,number][], duration: number, distance: number }>}
 */
export async function getRoute(waypoints) {
  if (waypoints.length < 2) throw new Error('At least 2 waypoints required')

  // OSRM expects coordinates in lon,lat order
  const coords = waypoints.map(({ lat, lon }) => `${lon},${lat}`).join(';')
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson&steps=false`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`OSRM error: ${res.status}`)

  const data = await res.json()
  if (data.code !== 'Ok') throw new Error(`OSRM: ${data.message || data.code}`)

  const route = data.routes[0]
  // GeoJSON coordinates are [lon, lat] — swap to [lat, lon] for Leaflet
  const geometry = route.geometry.coordinates.map(([lon, lat]) => [lat, lon])

  return {
    geometry,
    duration: route.duration,   // seconds
    distance: route.distance,   // meters
  }
}

/**
 * Uses the OSRM Table API to get accurate travel durations (seconds) from
 * origin to each point in the list.
 *
 * @param {{ lat: number, lon: number }} origin
 * @param {{ lat: number, lon: number }[]} points
 * @returns {Promise<number[]>} durations[j] = seconds from origin to points[j]
 */
async function getAccurateTravelTimes(origin, points) {
  const coords = [origin, ...points]
    .map((p) => `${p.lon},${p.lat}`)
    .join(';')
  const url = `${OSRM_TABLE}/${coords}?sources=0&annotations=duration`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`OSRM Table error: ${res.status}`)

  const data = await res.json()
  if (data.code !== 'Ok') throw new Error(`OSRM Table: ${data.message || data.code}`)

  // durations[0] is the row for source 0 (origin).
  // Index 0 = origin→origin (0s), index j+1 = origin→points[j].
  const row = data.durations[0]
  return points.map((_, j) => row[j + 1])
}

/**
 * Samples points every `intervalKm` km along the route geometry, then
 * replaces the interpolated arrival times with accurate values from the
 * OSRM Table API.
 *
 * @param {[number,number][]} geometry       [lat,lon] array from getRoute()
 * @param {number}            departureTime  Unix timestamp in seconds
 * @param {number}            intervalKm     Spacing in km between samples
 * @param {number}            totalDuration  Total route duration in seconds (from OSRM)
 * @returns {Promise<{ lat: number, lon: number, estimatedArrival: number, distanceFromStart: number }[]>}
 */
export async function getIntermediatePoints(geometry, departureTime, intervalKm, totalDuration) {
  if (!geometry?.length) return []

  const intervalM = intervalKm * 1000

  // ── Step 1: sample geometric points along the polyline ────────────────────
  const points = []
  let accDist = 0
  let nextTarget = intervalM

  points.push({
    lat: geometry[0][0],
    lon: geometry[0][1],
    estimatedArrival: departureTime,
    distanceFromStart: 0,
  })

  for (let i = 1; i < geometry.length; i++) {
    const segDist = haversineMeters(geometry[i - 1], geometry[i])
    const prevAccDist = accDist
    accDist += segDist

    while (nextTarget <= accDist) {
      const t = segDist > 0 ? (nextTarget - prevAccDist) / segDist : 0
      points.push({
        lat: geometry[i - 1][0] + t * (geometry[i][0] - geometry[i - 1][0]),
        lon: geometry[i - 1][1] + t * (geometry[i][1] - geometry[i - 1][1]),
        estimatedArrival: 0,   // filled in step 2
        distanceFromStart: nextTarget,
      })
      nextTarget += intervalM
    }
  }

  const lastP = geometry[geometry.length - 1]
  points.push({
    lat: lastP[0],
    lon: lastP[1],
    estimatedArrival: 0,   // filled in step 2
    distanceFromStart: accDist,
  })

  // ── Step 2: replace interpolated times with OSRM Table API values ─────────
  const origin = points[0]
  const rest   = points.slice(1)   // intermediate + destination

  const durations = await getAccurateTravelTimes(origin, rest)
  rest.forEach((p, j) => {
    p.estimatedArrival = departureTime + Math.round(durations[j])
  })

  // Fallback: if Table API returned null for the last point, use OSRM route duration
  const last = points[points.length - 1]
  if (!last.estimatedArrival) last.estimatedArrival = departureTime + Math.round(totalDuration)

  return points
}
