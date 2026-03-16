<script setup>
import { ref } from 'vue'
import RouteForm from '../components/RouteForm.vue'
import MapView from '../components/MapView.vue'
import WeatherStrip from '../components/WeatherStrip.vue'
import { searchLocation } from '../services/geocodingService.js'
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
    // ── 1. Geocode all locations in parallel ─────────────────────────────
    const allNames = [formData.origin, ...formData.stops, formData.destination]
    const geocoded = await Promise.all(allNames.map((q) => searchLocation(q)))

    // ── 2. Get driving route from OSRM ───────────────────────────────────
    const route = await getRoute(geocoded)
    routeGeometry.value = route.geometry

    // ── 3. Sample intermediate points with estimated arrival times ───────
    const rawPoints = getIntermediatePoints(
      route.geometry,
      formData.departureTimestamp,
      formData.intervalKm,
      route.duration,
      route.distance,
    )

    // ── 4. Fetch weather for every sampled point ─────────────────────────
    const weather = await fetchWeatherForPoints(rawPoints)

    // ── 5. Enrich points with labels and distance ────────────────────────
    weatherPoints.value = weather.map((w, i) => {
      let label
      if (i === 0) label = formData.origin
      else if (i === weather.length - 1) label = formData.destination
      else label = `km ${Math.round(rawPoints[i].distanceFromStart / 1000)}`

      return {
        ...w,
        distanceFromStart: rawPoints[i].distanceFromStart,
        label,
        role: i === 0 ? 'origin' : i === weather.length - 1 ? 'destination' : 'intermediate',
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
  <div class="home">
    <!-- ── Sidebar ─────────────────────────────────────────────────────── -->
    <aside class="sidebar">
      <header class="sidebar__header">
        <h1 class="sidebar__title">
          ruta<span class="sidebar__title--accent">meteo</span>
        </h1>
        <p class="sidebar__subtitle">El tiempo por tramos en tu ruta</p>
      </header>

      <RouteForm :loading="loading" @search="handleSearch" />

      <transition name="fade">
        <div v-if="error" class="sidebar__error">
          <span class="sidebar__error-icon">⚠</span>
          {{ error }}
        </div>
      </transition>
    </aside>

    <!-- ── Content (map + strip) ─────────────────────────────────────── -->
    <div class="content">
      <!-- Loading overlay -->
      <transition name="fade">
        <div v-if="loading" class="loading-overlay">
          <div class="loading-spinner" />
          <p class="loading-text">Calculando ruta y consultando el tiempo…</p>
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
</template>

<style lang="scss" scoped>
@use '../assets/styles/variables' as *;

// ── Root layout ────────────────────────────────────────────────────────────
.home {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: var(--app-bg);
  overflow: hidden;

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
  max-height: 45vh;

  @include tablet {
    max-height: 50vh;
  }

  @include desktop {
    width: $sidebar-width;
    height: 100vh;
    max-height: 100vh;
    border-bottom: none;
    border-right: 1px solid var(--app-border);
  }

  &__header {
    padding: 20px 20px 0;
  }

  &__title {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--app-text);

    &--accent { color: var(--app-amber); }
  }

  &__subtitle {
    font-size: 12px;
    color: var(--app-muted);
    margin-top: 2px;
  }

  &__error {
    margin: 0 20px 20px;
    padding: 10px 12px;
    background: rgba(232, 132, 74, 0.1);
    border: 1px solid rgba(232, 132, 74, 0.3);
    border-radius: $radius-base;
    color: var(--app-warn);
    font-size: 13px;
    line-height: 1.4;
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

// ── Content column (map + strip) ───────────────────────────────────────────
.content {
  flex: 1;
  height: 0;           // flex trick: makes height:100% work for children
  display: flex;
  flex-direction: column;
  position: relative;

  @include desktop {
    height: 100vh;
    flex: none;
    width: calc(100% - #{$sidebar-width});
  }
}

// ── Map area ───────────────────────────────────────────────────────────────
.map-area {
  flex: 1;
  height: 0;           // flex trick: Leaflet child can resolve height:100%
  position: relative;
}

// ── Loading overlay ────────────────────────────────────────────────────────
.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 2000;
  background: rgba(11, 18, 32, 0.75);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  backdrop-filter: blur(2px);
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--app-border);
  border-top-color: var(--app-amber);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  font-size: 14px;
  color: var(--app-muted);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// ── Transitions ────────────────────────────────────────────────────────────
.fade-enter-active,
.fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from,
.fade-leave-to    { opacity: 0; }
</style>
