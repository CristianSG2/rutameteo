<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  /** Array of [lat, lon] pairs — the route polyline */
  routeGeometry: {
    type: Array,
    default: () => [],
  },
  /** Array of weather point objects from weatherService */
  weatherPoints: {
    type: Array,
    default: () => [],
  },
})

const mapEl = ref(null)
let map = null
let routeLayer = null
let markersLayer = null

// ── Wind direction helper ────────────────────────────────────────────────
function windArrow(deg) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
  return directions[Math.round(deg / 45) % 8]
}

// ── Build popup HTML ──────────────────────────────────────────────────────
function buildPopup(point) {
  const temp   = point.temperature   != null ? `${point.temperature}°C` : '—'
  const rain   = point.precipitationProbability != null ? `${point.precipitationProbability}%` : '—'
  const wind   = point.windspeed     != null ? `${point.windspeed} km/h` : '—'
  const dir    = point.winddirection != null ? windArrow(point.winddirection) : ''
  const vis    = point.visibility    != null ? `${(point.visibility / 1000).toFixed(1)} km` : '—'
  const time   = point.time ? new Date(point.time).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : ''

  return `
    <div class="wp-popup">
      ${point.label ? `<div class="wp-popup__label">${point.label}</div>` : ''}
      ${time ? `<div class="wp-popup__time">${time}</div>` : ''}
      <div class="wp-popup__row">
        <span class="wp-popup__icon" title="Temperatura">🌡</span>
        <span>${temp}</span>
      </div>
      <div class="wp-popup__row">
        <span class="wp-popup__icon" title="Prob. lluvia">🌧</span>
        <span>${rain}</span>
      </div>
      <div class="wp-popup__row">
        <span class="wp-popup__icon" title="Viento">💨</span>
        <span>${wind}${dir ? ` ${dir}` : ''}</span>
      </div>
      <div class="wp-popup__row">
        <span class="wp-popup__icon" title="Visibilidad">👁</span>
        <span>${vis}</span>
      </div>
    </div>
  `
}

// ── Custom marker icons by role ───────────────────────────────────────────
const ROLE_COLORS = {
  origin:       { bg: '#E8A030', text: '#0b1220' },
  destination:  { bg: '#3d7fd4', text: '#ffffff' },
  intermediate: { bg: '#1a2640', text: '#e8edf5' },
}

function makeIcon(point) {
  const label = point.temperature != null ? `${Math.round(point.temperature)}°` : '?'
  const { bg, text } = ROLE_COLORS[point.role] ?? ROLE_COLORS.intermediate
  return L.divIcon({
    className: '',
    html: `<div class="wp-marker" style="background:${bg};color:${text}">${label}</div>`,
    iconSize: [40, 28],
    iconAnchor: [20, 14],
    popupAnchor: [0, -18],
  })
}

// ── Draw / update map layers ───────────────────────────────────────────────
function drawRoute() {
  if (!map) return

  routeLayer?.remove()
  markersLayer?.remove()

  if (props.routeGeometry.length > 1) {
    routeLayer = L.polyline(props.routeGeometry, {
      color: '#E8A030',
      weight: 4,
      opacity: 0.9,
    }).addTo(map)
  }

  markersLayer = L.layerGroup().addTo(map)

  props.weatherPoints.forEach((point) => {
    const marker = L.marker([point.lat, point.lon], {
      icon: makeIcon(point),
    })
    marker.bindPopup(buildPopup(point), { maxWidth: 210 })
    markersLayer.addLayer(marker)
  })

  // Fit bounds to route, or markers if no route yet
  const bounds = props.routeGeometry.length > 1
    ? L.latLngBounds(props.routeGeometry)
    : props.weatherPoints.length
      ? L.latLngBounds(props.weatherPoints.map((p) => [p.lat, p.lon]))
      : null

  if (bounds?.isValid()) {
    map.fitBounds(bounds, { padding: [48, 48] })
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => {
  map = L.map(mapEl.value, {
    center: [40.4, -3.7],
    zoom: 6,
    zoomControl: true,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)

  drawRoute()
})

onUnmounted(() => {
  map?.remove()
  map = null
})

watch(
  () => [props.routeGeometry, props.weatherPoints],
  () => drawRoute(),
  { deep: true }
)
</script>

<template>
  <div class="map-wrapper">
    <div ref="mapEl" class="map-container" />
    <div v-if="!routeGeometry.length && !weatherPoints.length" class="map-placeholder">
      <div class="map-placeholder__inner">
        <span class="map-placeholder__icon">🗺</span>
        <p>Introduce tu ruta y pulsa <strong>Ver el tiempo en la ruta</strong></p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../assets/styles/variables' as *;

.map-wrapper {
  position: relative;
  width: 100%;
  // Fill whatever height the flex parent gives us.
  // height: 100% works here because .map-area uses height: 0 + flex: 1.
  height: 100%;
}

.map-container {
  width: 100%;
  height: 100%;
  // Leaflet hard requirement: container must have a pixel height.
  // The min-height is a fallback in case the flex chain breaks.
  min-height: 300px;
}

.map-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(11, 18, 32, 0.55);
  pointer-events: none;
  z-index: 1000;

  &__inner {
    text-align: center;
    color: var(--app-muted);
    padding: 24px;
  }

  &__icon {
    font-size: 40px;
    display: block;
    margin-bottom: 12px;
  }

  p {
    font-size: 14px;
    line-height: 1.5;
    strong { color: var(--app-amber); }
  }
}
</style>

<!-- Unscoped: Leaflet dynamic content (divIcons, popups) -->
<style lang="scss">
@use '../assets/styles/variables' as *;

.wp-marker {
  background: var(--app-blue);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  border-radius: 6px;
  padding: 3px 7px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  border: 1.5px solid rgba(255, 255, 255, 0.2);
}

.wp-popup {
  font-size: 13px;
  line-height: 1.6;

  &__label {
    font-weight: 700;
    font-size: 13px;
    color: var(--app-text);
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
  }

  &__time {
    font-weight: 700;
    color: var(--app-amber);
    margin-bottom: 6px;
    font-size: 12px;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__icon {
    font-size: 14px;
    width: 20px;
    text-align: center;
  }
}
</style>
