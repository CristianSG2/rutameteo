<script setup>
import { ref } from 'vue'
import RouteForm from '../components/RouteForm.vue'
import MapView from '../components/MapView.vue'

// These will be populated after calling the APIs in the next step
const routeGeometry  = ref([])
const weatherPoints  = ref([])

function handleSearch(formData) {
  // TODO: call routingService + weatherService with formData
  console.log('search requested', formData)
}
</script>

<template>
  <div class="home">
    <aside class="sidebar">
      <header class="sidebar__header">
        <h1 class="sidebar__title">ruta<span class="sidebar__title--accent">meteo</span></h1>
        <p class="sidebar__subtitle">El tiempo por tramos en tu ruta</p>
      </header>
      <RouteForm @search="handleSearch" />
    </aside>

    <main class="map-area">
      <MapView
        :route-geometry="routeGeometry"
        :weather-points="weatherPoints"
      />
    </main>
  </div>
</template>

<style lang="scss" scoped>
@use '../assets/styles/variables' as *;

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
  // Mobile: limit height so the map always gets space
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
}

// ── Map area ───────────────────────────────────────────────────────────────
.map-area {
  // height: 0 + flex: 1 is the canonical way to make percentage heights
  // propagate correctly inside a flex child (Leaflet requires explicit height).
  flex: 1;
  height: 0;
  position: relative;

  @include desktop {
    height: 100vh;
    flex: none;
    width: calc(100% - #{$sidebar-width});
  }
}
</style>
