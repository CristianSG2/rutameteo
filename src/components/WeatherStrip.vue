<script setup>
import { getWeatherIcon, getWeatherLabel } from '../utils/weatherUtils.js'

defineProps({
  points: { type: Array, default: () => [] },
})

const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
function windDir(deg) {
  if (deg == null) return ''
  return DIRECTIONS[Math.round(deg / 45) % 8]
}
function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}
function formatVis(m) {
  if (m == null) return '—'
  return m >= 1000 ? `${(m / 1000).toFixed(0)} km` : `${m} m`
}
</script>

<template>
  <div v-if="points.length" class="weather-strip">
    <div class="weather-strip__inner">
      <article
        v-for="(point, i) in points"
        :key="i"
        class="weather-card"
        :class="{
          'weather-card--warn':        point.precipitationProbability > 50,
          'weather-card--amber':       point.precipitationProbability <= 50,
          'weather-card--origin':      i === 0,
          'weather-card--destination': i === points.length - 1,
        }"
      >
        <!-- Point name: reverse-geocoded locality or km fallback -->
        <div class="weather-card__label">{{ point.locationName ?? point.label }}</div>

        <!-- Hour -->
        <div class="weather-card__time">{{ formatTime(point.time) }}</div>

        <!-- Weather icon -->
        <div class="weather-card__emoji">{{ getWeatherIcon(point.weathercode) }}</div>

        <!-- Temperature -->
        <div class="weather-card__temp">
          {{ point.temperature != null ? `${Math.round(point.temperature)}°` : '—' }}
        </div>

        <!-- Condition label -->
        <div class="weather-card__cond">{{ getWeatherLabel(point.weathercode) }}</div>

        <!-- Metrics row -->
        <div class="weather-card__metrics">
          <div class="metric">
            <span class="metric__icon">🌧</span>
            <span>{{ point.precipitationProbability != null ? `${point.precipitationProbability}%` : '—' }}</span>
          </div>
          <div class="metric">
            <span class="metric__icon">💨</span>
            <span>
              {{ point.windspeed != null ? `${Math.round(point.windspeed)}` : '—' }}
              <span v-if="point.windspeed != null" class="metric__unit">km/h</span>
              <span v-if="point.winddirection != null" class="metric__dir">{{ windDir(point.winddirection) }}</span>
            </span>
          </div>
          <div class="metric">
            <span class="metric__icon">👁</span>
            <span>{{ formatVis(point.visibility) }}</span>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '../assets/styles/variables' as *;

// ── Strip container ────────────────────────────────────────────────────────
.weather-strip {
  flex-shrink: 0;
  background: var(--app-surface);
  border-top: 1px solid var(--app-border);
}

.weather-strip__inner {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
  scrollbar-color: var(--app-border) transparent;

  &::-webkit-scrollbar        { height: 4px; }
  &::-webkit-scrollbar-thumb  { background: var(--app-border); border-radius: 99px; }
  &::-webkit-scrollbar-track  { background: transparent; }
}

// ── Card ───────────────────────────────────────────────────────────────────
.weather-card {
  flex-shrink: 0;
  scroll-snap-align: start;
  width: 120px;
  background: var(--app-card);
  border-radius: $radius-card;
  border-top: 3px solid var(--app-border);
  padding: 12px 12px 10px;
  display: flex;
  flex-direction: column;

  @include desktop { width: 130px; }

  &--warn  { border-top-color: var(--app-warn); }
  &--amber { border-top-color: var(--app-amber); }
  &--origin      { box-shadow: 0 0 0 1px rgba(232, 160, 48, 0.25); }
  &--destination { box-shadow: 0 0 0 1px rgba(61, 127, 212, 0.25); }
}

// ── Card content ───────────────────────────────────────────────────────────
.weather-card__label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--app-amber);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 1px;
}

.weather-card__time {
  font-size: 11px;
  color: var(--app-muted);
  margin-bottom: 8px;
}

.weather-card__emoji {
  font-size: 26px;
  line-height: 1;
  margin-bottom: 4px;
}

.weather-card__temp {
  font-size: 28px;
  font-weight: 800;
  color: var(--app-text);
  line-height: 1;
  letter-spacing: -0.02em;
  margin-bottom: 2px;
}

.weather-card__cond {
  font-size: 10px;
  color: var(--app-muted);
  line-height: 1.3;
  margin-bottom: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// ── Metrics ────────────────────────────────────────────────────────────────
.weather-card__metrics {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: auto;        // push to bottom of card
  padding-top: 8px;
  border-top: 1px solid var(--app-border);
}

.metric {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--app-text);

  &__icon   { font-size: 11px; width: 15px; text-align: center; flex-shrink: 0; }
  &__unit   { color: var(--app-muted); font-size: 10px; margin-left: 1px; }
  &__dir    { color: var(--app-wind); font-size: 10px; font-weight: 700; margin-left: 2px; }
}
</style>
