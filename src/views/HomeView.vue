<script setup>
import { ref } from 'vue'
import RouteForm from '../components/RouteForm.vue'
import MapView from '../components/MapView.vue'
import WeatherStrip from '../components/WeatherStrip.vue'
import { searchLocation, reverseGeocode } from '../services/geocodingService.js'
import { getRoute, getIntermediatePoints } from '../services/routingService.js'
import { fetchWeatherForPoints } from '../services/weatherService.js'

const routeGeometry = ref([])
const weatherPoints = ref([])
const loading = ref(false)
const error = ref(null)

async function handleSearch(formData) {
  loading.value = true
  error.value = null
  routeGeometry.value = []
  weatherPoints.value = []

  try {
    // 1. Resolve coordinates — use pre-geocoded coords when available (autocomplete),
    //    fall back to Nominatim search only for manually typed values.
    const allEntries = [
      { text: formData.origin,      coords: formData.originCoords },
      ...formData.stops,
      { text: formData.destination, coords: formData.destinationCoords },
    ]
    const geocoded = await Promise.all(
      allEntries.map(({ text, coords }) => coords ? Promise.resolve(coords) : searchLocation(text))
    )

    // 2. Driving route from OSRM
    let route
    try {
      route = await getRoute(geocoded)
    } catch {
      throw new Error('Error al calcular la ruta. Inténtalo de nuevo en unos segundos.')
    }
    routeGeometry.value = route.geometry

    // 3. Sample points with estimated arrival times
    const rawPoints = getIntermediatePoints(
      route.geometry,
      formData.departureTimestamp,
      formData.intervalKm,
      route.duration,
      route.distance,
    )

    // 4. Fetch weather + reverse-geocode all points in parallel
    const [weather, locationNames] = await Promise.all([
      fetchWeatherForPoints(rawPoints),
      Promise.all(rawPoints.map((p) => reverseGeocode(p.lat, p.lon))),
    ])

    // 5. Enrich with labels, locationName, distance and role
    weatherPoints.value = weather.map((w, i) => {
      const isOrigin = i === 0
      const isDestination = i === weather.length - 1
      const kmFallback = `km ${Math.round(rawPoints[i].distanceFromStart / 1000)}`

      return {
        ...w,
        distanceFromStart: rawPoints[i].distanceFromStart,
        locationName: isOrigin ? formData.origin
          : isDestination ? formData.destination
          : (locationNames[i] ?? kmFallback),
        label: isOrigin ? formData.origin
          : isDestination ? formData.destination
          : kmFallback,
        role: isOrigin ? 'origin' : isDestination ? 'destination' : 'intermediate',
      }
    })
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="app-shell">

    <!-- ── Topbar ──────────────────────────────────────────────────────── -->
    <header class="topbar">
      <div class="topbar__brand">
        <span class="topbar__logo">ruta<span class="topbar__logo--accent">meteo</span></span>
        <span class="topbar__tagline">El tiempo por tramos en tu ruta</span>
      </div>
    </header>

    <!-- ── Main layout ────────────────────────────────────────────────── -->
    <div class="home">

      <!-- Sidebar -->
      <aside class="sidebar">
        <RouteForm :loading="loading" @search="handleSearch" />

        <transition name="fade">
          <div v-if="error" class="sidebar__error">
            <span class="sidebar__error-icon">⚠</span>
            {{ error }}
          </div>
        </transition>
      </aside>

      <!-- Content: map + strip -->
      <div class="content">

        <!-- Loading overlay — covers map area only, not sidebar -->
        <transition name="fade">
          <div v-if="loading" class="loading-overlay">
            <div class="loading-spinner" />
            <p class="loading-text">Calculando tu ruta…</p>
          </div>
        </transition>

        <div class="map-area">
          <MapView
            :route-geometry="routeGeometry"
            :weather-points="weatherPoints"
          />
        </div>

        <WeatherStrip :points="weatherPoints" />
      </div>

    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../assets/styles/variables' as *;

$topbar-height: 52px;

// ── Shell ──────────────────────────────────────────────────────────────────
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--app-bg);
}

// ── Topbar ─────────────────────────────────────────────────────────────────
.topbar {
  height: $topbar-height;
  flex-shrink: 0;
  background: var(--app-surface);
  border-bottom: 1px solid var(--app-border);
  display: flex;
  align-items: center;
  padding: 0 20px;

  &__brand {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  &__logo {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--app-text);

    &--accent { color: var(--app-amber); }
  }

  &__tagline {
    font-size: 12px;
    color: var(--app-muted);
    display: none;

    @include tablet { display: block; }
  }
}

// ── Home row (sidebar + content) ───────────────────────────────────────────
.home {
  flex: 1;
  height: 0;            // flex trick: allows height:100% to resolve in children
  display: flex;
  flex-direction: column;

  @include desktop {
    flex-direction: row;
  }
}

// ── Sidebar ────────────────────────────────────────────────────────────────
.sidebar {
  width: 100%;
  background: var(--app-surface);
  border-bottom: 1px solid var(--app-border);
  overflow-y: auto;
  flex-shrink: 0;
  max-height: 44vh;

  @include tablet { max-height: 48vh; }

  @include desktop {
    width: $sidebar-width;
    height: 100%;
    max-height: 100%;
    border-bottom: none;
    border-right: 1px solid var(--app-border);
  }

  &__error {
    margin: 0 20px 20px;
    padding: 10px 12px;
    background: rgba(232, 132, 74, 0.08);
    border: 1px solid rgba(232, 132, 74, 0.3);
    border-radius: $radius-base;
    color: var(--app-warn);
    font-size: 13px;
    line-height: 1.5;
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }

  &__error-icon {
    flex-shrink: 0;
    font-size: 14px;
    margin-top: 1px;
  }
}

// ── Content (map + strip) ──────────────────────────────────────────────────
.content {
  flex: 1;
  height: 0;            // flex trick
  display: flex;
  flex-direction: column;
  position: relative;   // anchor for loading-overlay

  @include desktop {
    height: 100%;
    flex: none;
    width: calc(100% - #{$sidebar-width});
  }
}

// ── Map area ───────────────────────────────────────────────────────────────
.map-area {
  flex: 1;
  height: 0;            // flex trick: Leaflet needs a resolved pixel height
  position: relative;
}

// ── Loading overlay (map-only) ─────────────────────────────────────────────
.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 2000;
  background: rgba(11, 18, 32, 0.78);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  backdrop-filter: blur(3px);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--app-border);
  border-top-color: var(--app-amber);
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}

.loading-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--app-muted);
  letter-spacing: 0.01em;
}

@keyframes spin { to { transform: rotate(360deg); } }

// ── Transitions ────────────────────────────────────────────────────────────
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to     { opacity: 0; }
</style>
