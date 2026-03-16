const BASE_URL = 'https://api.open-meteo.com/v1/forecast'

const HOURLY_VARS = [
  'temperature_2m',
  'precipitation_probability',
  'windspeed_10m',
  'winddirection_10m',
  'visibility',
  'weathercode',
].join(',')

/**
 * Returns the index of the last hourly slot that is <= the given unix timestamp.
 * @param {string[]} timeArray - ISO datetime strings from Open-Meteo
 * @param {number} unixTs - unix timestamp in seconds
 * @returns {number} index
 */
function closestHourIndex(timeArray, unixTs) {
  const targetMs = unixTs * 1000
  let best = 0
  for (let i = 0; i < timeArray.length; i++) {
    if (new Date(timeArray[i]).getTime() <= targetMs) best = i
    else break
  }
  return best
}

/**
 * Fetches weather data for all route points in a single Open-Meteo request.
 * When multiple coordinates are passed, Open-Meteo returns an array of objects.
 *
 * @param {{ lat: number, lon: number, estimatedArrival: number }[]} points
 *   estimatedArrival is a unix timestamp (seconds)
 * @returns {Promise<Array>} array of weather objects, one per point
 */
export async function fetchWeatherForPoints(points) {
  if (!points?.length) return []

  const params = new URLSearchParams()
  points.forEach((p) => {
    params.append('latitude', p.lat)
    params.append('longitude', p.lon)
  })
  params.append('hourly', HOURLY_VARS)
  params.append('forecast_days', '7')
  params.append('timezone', 'Europe/Madrid')

  const res = await fetch(`${BASE_URL}?${params.toString()}`)
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`)

  const raw = await res.json()
  // Single point → object; multiple points → array
  const responses = Array.isArray(raw) ? raw : [raw]

  return responses.map((data, i) => {
    const { lat, lon, estimatedArrival } = points[i]
    const {
      time,
      temperature_2m,
      precipitation_probability,
      windspeed_10m,
      winddirection_10m,
      visibility,
      weathercode,
    } = data.hourly

    const idx = closestHourIndex(time, estimatedArrival)

    return {
      lat,
      lon,
      estimatedArrival,
      temperature: temperature_2m[idx],
      precipitationProbability: precipitation_probability[idx],
      windspeed: windspeed_10m[idx],
      winddirection: winddirection_10m[idx],
      visibility: visibility[idx],
      weathercode: weathercode[idx],
      time: time[idx],
    }
  })
}
