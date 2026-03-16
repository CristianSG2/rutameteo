<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getWeatherIcon, getWeatherLabel } from '../utils/weatherUtils.js'

const props = defineProps({
  routeGeometry: { type: Array, default: () => [] },
  weatherPoints:  { type: Array, default: () => [] },
})

const mapEl = ref(null)
let map = null
let routeLayer = null
let markersLayer = null
let resizeObserver = null

// ── Helpers ────────────────────────────────────────────────────────────────
const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
function windArrow(deg) {
  if (deg == null) return ''
  return DIRECTIONS[Math.round(deg / 45) % 8]
}

// ── Popup HTML ─────────────────────────────────────────────────────────────
function buildPopup(point) {
  const icon  = getWeatherIcon(point.weathercode)
  const cond  = getWeatherLabel(point.weathercode)
  const temp  = point.temperature != null ? `${Math.round(point.temperature)}°C` : '—'
  const rain  = point.precipitationProbability != null ? `${point.precipitationProbability}%` : '—'
  const wind  = point.windspeed != null ? `${Math.round(point.windspeed)} km/h` : '—'
  const dir   = windArrow(point.winddirection)
  const vis   = point.visibility != null
    ? point.visibility >= 1000 ? `${(point.visibility / 1000).toFixed(0)} km` : `${point.visibility} m`
    : '—'
  const time  = point.estimatedArrival != null
    ? new Date(point.estimatedArrival * 1000).toLocaleTimeString('es-ES', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid',
      })
    : ''

  return `
    <div class="wp-popup">
      ${point.label ? `<div class="wp-popup__label">${point.label}</div>` : ''}
      <div class="wp-popup__hero">
        <span class="wp-popup__hero-icon">${icon}</span>
        <div>
          <div class="wp-popup__temp">${temp}</div>
          <div class="wp-popup__cond">${cond}</div>
        </div>
      </div>
      ${time ? `<div class="wp-popup__time">Paso estimado: ${time}</div>` : ''}
      <div class="wp-popup__divider"></div>
      <div class="wp-popup__row"><span class="wp-popup__metric-icon">🌧</span><span>${rain} prob. lluvia</span></div>
      <div class="wp-popup__row"><span class="wp-popup__metric-icon">💨</span><span>${wind}${dir ? ` ${dir}` : ''}</span></div>
      <div class="wp-popup__row"><span class="wp-popup__metric-icon">👁</span><span>${vis} visibilidad</span></div>
    </div>
  `
}

// ── Marker icons ───────────────────────────────────────────────────────────
const ROLE_BORDERS = {
  origin:       '#E8A030',
  destination:  '#3d7fd4',
  intermediate: 'rgba(255,255,255,0.15)',
}

function makeIcon(point) {
  const emoji = getWeatherIcon(point.weathercode)
  const temp  = point.temperature != null ? `${Math.round(point.temperature)}°` : '?'
  const border = ROLE_BORDERS[point.role] ?? ROLE_BORDERS.intermediate

  const html = `
    <div class="wp-marker" style="border-color:${border}">
      <span class="wp-marker__emoji">${emoji}</span>
      <span class="wp-marker__temp">${temp}</span>
    </div>
  `
  return L.divIcon({
    className: '',      // suppress Leaflet's default white box
    html,
    iconSize:    [52, 56],
    iconAnchor:  [26, 56],
    popupAnchor: [0, -60],
  })
}

// ── Draw layers ────────────────────────────────────────────────────────────
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
    const marker = L.marker([point.lat, point.lon], { icon: makeIcon(point) })
    marker.bindPopup(buildPopup(point), { maxWidth: 220, className: 'wp-popup-wrap' })
    markersLayer.addLayer(marker)
  })

  const bounds = props.routeGeometry.length > 1
    ? L.latLngBounds(props.routeGeometry)
    : props.weatherPoints.length
      ? L.latLngBounds(props.weatherPoints.map((p) => [p.lat, p.lon]))
      : null

  if (bounds?.isValid()) {
    map.fitBounds(bounds, { padding: [56, 56] })
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => {
  map = L.map(mapEl.value, { center: [40.4, -3.7], zoom: 6 })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)

  drawRoute()

  // Automatically call invalidateSize whenever the container is resized
  // (handles mobile→tablet breakpoint switch and any other layout changes)
  resizeObserver = new ResizeObserver(() => map?.invalidateSize())
  resizeObserver.observe(mapEl.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  map?.remove()
  map = null
})

watch(() => [props.routeGeometry, props.weatherPoints], drawRoute, { deep: true })
</script>

<template>
  <div class="map-wrapper">
    <div ref="mapEl" class="map-container" />
    <div v-if="!routeGeometry.length && !weatherPoints.length" class="map-placeholder">
      <div class="map-placeholder__inner">
        <span class="map-placeholder__icon">🗺️</span>
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
  height: 100%;
}

.map-container {
  width: 100%;
  height: 100%;
  min-height: 300px;
}

.map-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(11, 18, 32, 0.6);
  pointer-events: none;
  z-index: 1000;

  &__inner {
    text-align: center;
    color: var(--app-muted);
    padding: 24px;
  }

  &__icon {
    font-size: 44px;
    display: block;
    margin-bottom: 14px;
  }

  p {
    font-size: 14px;
    line-height: 1.6;
    strong { color: var(--app-amber); font-weight: 600; }
  }
}
</style>

<!-- Unscoped: Leaflet divIcon + popup (injected into DOM outside Vue scope) -->
<style lang="scss">
@use '../assets/styles/variables' as *;

// ── Custom marker ──────────────────────────────────────────────────────────
.wp-marker {
  background: $card;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 5px 8px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.55);
  // Tail / caret at the bottom
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: -7px;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: $card;
  }

  &__emoji {
    font-size: 20px;
    line-height: 1;
  }

  &__temp {
    font-size: 12px;
    font-weight: 700;
    color: $text;
    line-height: 1;
  }
}

// ── Popup wrapper ──────────────────────────────────────────────────────────
.wp-popup-wrap {
  .leaflet-popup-content-wrapper {
    background: $card;
    color: $text;
    border: 1px solid $border;
    border-radius: $radius-card;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    padding: 0;
  }
  .leaflet-popup-content { margin: 0; }
  .leaflet-popup-tip-container { margin-top: -1px; }
  .leaflet-popup-tip { background: $card; }
}

// ── Popup content ──────────────────────────────────────────────────────────
.wp-popup {
  padding: 14px 16px 12px;
  font-size: 13px;
  line-height: 1.5;
  min-width: 180px;

  &__label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: $amber;
    margin-bottom: 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 190px;
  }

  &__hero {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
  }

  &__hero-icon { font-size: 28px; line-height: 1; }

  &__temp {
    font-size: 22px;
    font-weight: 800;
    color: $text;
    line-height: 1;
  }

  &__cond {
    font-size: 12px;
    color: $muted;
    margin-top: 2px;
  }

  &__time {
    font-size: 11px;
    color: $amber;
    font-weight: 600;
    margin-bottom: 8px;
  }

  &__divider {
    height: 1px;
    background: $border;
    margin: 8px 0;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 6px;
    color: $muted;
    font-size: 12px;
    margin-bottom: 3px;

    &:last-child { margin-bottom: 0; }
  }

  &__metric-icon {
    font-size: 12px;
    width: 18px;
    text-align: center;
    flex-shrink: 0;
  }
}
</style>
