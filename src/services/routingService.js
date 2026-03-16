const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

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
 * @param {{ lat: number, lon: number }[]} waypoints  at least 2 entries
 * @returns {Promise<{ geometry: [number,number][], duration: number, distance: number, legs: any[] }>}
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
    legs: route.legs,
  }
}

/**
 * Samples intermediate points every `intervalKm` km along the route geometry
 * and estimates the arrival time at each, based on OSRM's average speed.
 *
 * @param {[number,number][]} geometry      decoded polyline from getRoute()
 * @param {number} departureTime            unix timestamp (seconds)
 * @param {number} intervalKm              spacing in km between samples
 * @param {number} totalDuration           total route duration in seconds (from OSRM)
 * @param {number} totalDistance           total route distance in meters (from OSRM)
 * @returns {{ lat: number, lon: number, estimatedArrival: number, distanceFromStart: number }[]}
 */
export function getIntermediatePoints(geometry, departureTime, intervalKm, totalDuration, totalDistance) {
  if (!geometry?.length) return []

  const intervalM = intervalKm * 1000
  const avgSpeedMps = totalDistance / totalDuration // m/s

  const points = []
  let accumulated = 0
  let nextTarget = intervalM

  // Always include start
  points.push({
    lat: geometry[0][0],
    lon: geometry[0][1],
    estimatedArrival: departureTime,
    distanceFromStart: 0,
  })

  for (let i = 1; i < geometry.length; i++) {
    const segDist = haversineMeters(geometry[i - 1], geometry[i])
    const prevAcc = accumulated
    accumulated += segDist

    while (nextTarget <= accumulated) {
      // Interpolate position along this segment
      const t = (nextTarget - prevAcc) / segDist
      const lat = geometry[i - 1][0] + t * (geometry[i][0] - geometry[i - 1][0])
      const lon = geometry[i - 1][1] + t * (geometry[i][1] - geometry[i - 1][1])
      const traveledSeconds = nextTarget / avgSpeedMps
      points.push({
        lat,
        lon,
        estimatedArrival: departureTime + Math.round(traveledSeconds),
        distanceFromStart: nextTarget,
      })
      nextTarget += intervalM
    }
  }

  // Always include end
  const lastP = geometry[geometry.length - 1]
  points.push({
    lat: lastP[0],
    lon: lastP[1],
    estimatedArrival: departureTime + Math.round(totalDuration),
    distanceFromStart: totalDistance,
  })

  return points
}
