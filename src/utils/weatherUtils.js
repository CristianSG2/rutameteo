/**
 * Maps WMO weather interpretation codes to emoji and label.
 * https://open-meteo.com/en/docs#weathervariables
 */

const WMO_MAP = [
  { min: 0,  max: 0,  icon: '☀️',  label: 'Despejado' },
  { min: 1,  max: 2,  icon: '🌤️', label: 'Parcialmente nublado' },
  { min: 3,  max: 3,  icon: '☁️',  label: 'Nublado' },
  { min: 45, max: 48, icon: '🌫️', label: 'Niebla' },
  { min: 51, max: 67, icon: '🌧️', label: 'Lluvia' },
  { min: 71, max: 77, icon: '🌨️', label: 'Nieve' },
  { min: 80, max: 82, icon: '🌦️', label: 'Chubascos' },
  { min: 85, max: 86, icon: '🌨️', label: 'Chubascos de nieve' },
  { min: 95, max: 99, icon: '⛈️', label: 'Tormenta' },
]

function lookup(code) {
  if (code == null) return null
  return WMO_MAP.find((r) => code >= r.min && code <= r.max) ?? null
}

/**
 * Returns a weather emoji for a WMO weathercode.
 * @param {number|null} code
 * @returns {string}
 */
export function getWeatherIcon(code) {
  return lookup(code)?.icon ?? '🌡️'
}

/**
 * Returns a Spanish label for a WMO weathercode.
 * @param {number|null} code
 * @returns {string}
 */
export function getWeatherLabel(code) {
  return lookup(code)?.label ?? '—'
}
