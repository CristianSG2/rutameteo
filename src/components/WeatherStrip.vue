<script setup>
defineProps({
  /** Array of enriched weather points (with label, distanceFromStart) */
  points: {
    type: Array,
    default: () => [],
  },
})

const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']

function windDir(deg) {
  if (deg == null) return ''
  return DIRECTIONS[Math.round(deg / 45) % 8]
}

function formatTime(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatVis(meters) {
  if (meters == null) return '—'
  return meters >= 1000
    ? `${(meters / 1000).toFixed(0)} km`
    : `${meters} m`
}
</script>

<template>
  <div class="weather-strip" v-if="points.length">
    <div class="weather-strip__inner">
      <article
        v-for="(point, i) in points"
        :key="i"
        class="weather-card"
        :class="{
          'weather-card--warn':  point.precipitationProbability > 50,
          'weather-card--amber': point.precipitationProbability <= 50,
          'weather-card--origin': i === 0,
          'weather-card--destination': i === points.length - 1,
        }"
      >
        <div class="weather-card__label">{{ point.label }}</div>
        <div class="weather-card__time">{{ formatTime(point.time) }}</div>

        <div class="weather-card__metrics">
          <div class="metric">
            <span class="metric__icon">🌡</span>
            <span class="metric__value">
              {{ point.temperature != null ? `${Math.round(point.temperature)}°C` : '—' }}
            </span>
          </div>
          <div class="metric">
            <span class="metric__icon">🌧</span>
            <span class="metric__value">
              {{ point.precipitationProbability != null ? `${point.precipitationProbability}%` : '—' }}
            </span>
          </div>
          <div class="metric">
            <span class="metric__icon">💨</span>
            <span class="metric__value">
              {{ point.windspeed != null ? `${Math.round(point.windspeed)} km/h` : '—' }}
              <span v-if="point.winddirection != null" class="metric__dir">{{ windDir(point.winddirection) }}</span>
            </span>
          </div>
          <div class="metric">
            <span class="metric__icon">👁</span>
            <span class="metric__value">{{ formatVis(point.visibility) }}</span>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../assets/styles/variables' as *;

.weather-strip {
  flex-shrink: 0;
  background: var(--app-surface);
  border-top: 1px solid var(--app-border);
  overflow: hidden;
}

.weather-strip__inner {
  display: flex;
  gap: 10px;
  padding: 12px;
  overflow-x: auto;
  scrollbar-width: thin;

  // Snap-scroll for a polished swipe on mobile
  scroll-snap-type: x mandatory;

  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-thumb {
    background: var(--app-border);
    border-radius: 99px;
  }
}

.weather-card {
  flex-shrink: 0;
  scroll-snap-align: start;
  width: 130px;
  background: var(--app-card);
  border-radius: $radius-card;
  border-top: 3px solid var(--app-border);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: border-color 0.2s;

  // Rain condition borders
  &--warn  { border-top-color: var(--app-warn); }
  &--amber { border-top-color: var(--app-amber); }

  // Origin & destination get a subtle ring
  &--origin      { box-shadow: 0 0 0 1px rgba(232, 160, 48, 0.3); }
  &--destination { box-shadow: 0 0 0 1px rgba(61, 127, 212, 0.3); }

  @include desktop {
    width: 140px;
  }
}

.weather-card__label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--app-amber);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.weather-card__time {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text);
  margin-bottom: 4px;
}

.weather-card__metrics {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.metric {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;

  &__icon {
    width: 16px;
    text-align: center;
    font-size: 11px;
    flex-shrink: 0;
  }

  &__value {
    color: var(--app-text);
    white-space: nowrap;
  }

  &__dir {
    color: var(--app-wind);
    font-size: 10px;
    font-weight: 600;
    margin-left: 2px;
  }
}
</style>
