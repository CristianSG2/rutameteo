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
 * Finds the closest hourly index to a given unix timestamp.
 * @param {string[]} timeArray - ISO datetime strings from Open-Meteo
 * @param {number} unixTs - unix timestamp in seconds
 * @returns {number} index
 */
function closestHourIndex(timeArray, unixTs) {
  const target = unixTs * 1000 // ms
  let best = 0
  let bestDiff = Infinity
  for (let i = 0; i < timeArray.length; i++) {
    const diff = Math.abs(new Date(timeArray[i]).getTime() - target)
    if (diff < bestDiff) {
      bestDiff = diff
      best = i
    }
  }
  return best
}

/**
 * Fetches weather data for an array of route points.
 * @param {{ lat: number, lon: number, estimatedArrival: number }[]} points
 *   estimatedArrival is a unix timestamp (seconds)
 * @returns {Promise<Array>} array of weather objects, one per point
 */
export async function fetchWeatherForPoints(points) {
  if (!points?.length) return []

  const results = await Promise.all(
    points.map(async ({ lat, lon, estimatedArrival }) => {
      const url = new URL(BASE_URL)
      url.searchParams.set('latitude', lat)
      url.searchParams.set('longitude', lon)
      url.searchParams.set('hourly', HOURLY_VARS)
      url.searchParams.set('forecast_days', 7)
      url.searchParams.set('timezone', 'auto')

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`Open-Meteo error for (${lat},${lon}): ${res.status}`)

      const data = await res.json()
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
  )

  return results
}
