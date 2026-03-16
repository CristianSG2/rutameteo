<script setup>
import { ref, computed } from 'vue'

defineProps({ loading: { type: Boolean, default: false } })
const emit = defineEmits(['search'])

// ── State ──────────────────────────────────────────────────────────────────
const origin = ref('')
const destination = ref('')
const stops = ref([])   // array of { id, value }
let stopIdCounter = 0

const now = new Date()
const padTwo = (n) => String(n).padStart(2, '0')
const defaultDate = `${now.getFullYear()}-${padTwo(now.getMonth() + 1)}-${padTwo(now.getDate())}`
const defaultTime = `${padTwo(now.getHours())}:${padTwo(now.getMinutes())}`

const departureDate = ref(defaultDate)
const departureTime = ref(defaultTime)
const intervalKm    = ref(30)

// ── Stops helpers ──────────────────────────────────────────────────────────
function addStop() {
  stops.value.push({ id: ++stopIdCounter, value: '' })
}

function removeStop(id) {
  stops.value = stops.value.filter((s) => s.id !== id)
}

// ── Interval control ───────────────────────────────────────────────────────
function decreaseInterval() {
  if (intervalKm.value > 20) intervalKm.value -= 10
}
function increaseInterval() {
  if (intervalKm.value < 100) intervalKm.value += 10
}

// ── Departure unix timestamp ───────────────────────────────────────────────
const departureTimestamp = computed(() => {
  const dt = new Date(`${departureDate.value}T${departureTime.value}:00`)
  return Math.floor(dt.getTime() / 1000)
})

// ── Submit ─────────────────────────────────────────────────────────────────
function handleSubmit() {
  if (!origin.value.trim() || !destination.value.trim()) return

  emit('search', {
    origin: origin.value.trim(),
    stops: stops.value.map((s) => s.value.trim()).filter(Boolean),
    destination: destination.value.trim(),
    departureTimestamp: departureTimestamp.value,
    intervalKm: intervalKm.value,
  })
}
</script>

<template>
  <form class="route-form" @submit.prevent="handleSubmit">
    <div class="form-section">
      <label class="form-label">Origen</label>
      <input
        v-model="origin"
        type="text"
        placeholder="Ciudad de origen"
        required
      />
    </div>

    <div v-if="stops.length" class="form-section">
      <label class="form-label">Paradas</label>
      <div
        v-for="stop in stops"
        :key="stop.id"
        class="stop-row"
      >
        <input
          v-model="stop.value"
          type="text"
          placeholder="Parada intermedia"
        />
        <button type="button" class="btn-icon btn-remove" @click="removeStop(stop.id)" aria-label="Eliminar parada">
          ×
        </button>
      </div>
    </div>

    <button type="button" class="btn-add-stop" @click="addStop">
      <span class="btn-add-stop__icon">+</span>
      Añadir parada
    </button>

    <div class="form-section">
      <label class="form-label">Destino</label>
      <input
        v-model="destination"
        type="text"
        placeholder="Ciudad de destino"
        required
      />
    </div>

    <div class="form-row">
      <div class="form-section form-section--half">
        <label class="form-label">Fecha de salida</label>
        <input v-model="departureDate" type="date" />
      </div>
      <div class="form-section form-section--half">
        <label class="form-label">Hora de salida</label>
        <input v-model="departureTime" type="time" />
      </div>
    </div>

    <div class="form-section">
      <label class="form-label">Consultar tiempo cada</label>
      <div class="interval-control">
        <button
          type="button"
          class="btn-icon btn-interval"
          :disabled="intervalKm <= 20"
          @click="decreaseInterval"
          aria-label="Reducir intervalo"
        >−</button>
        <span class="interval-value">{{ intervalKm }} km</span>
        <button
          type="button"
          class="btn-icon btn-interval"
          :disabled="intervalKm >= 100"
          @click="increaseInterval"
          aria-label="Aumentar intervalo"
        >+</button>
      </div>
    </div>

    <button type="submit" class="btn-submit" :disabled="loading">
      {{ loading ? 'Calculando…' : 'Ver el tiempo en la ruta' }}
    </button>
  </form>
</template>

<style lang="scss" scoped>
@use '../assets/styles/variables' as *;

.route-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.form-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--app-muted);
  margin-bottom: 6px;
}

.form-section {
  display: flex;
  flex-direction: column;

  &--half { flex: 1; }
}

.form-row {
  display: flex;
  gap: 12px;
}

// ── Stops ──────────────────────────────────────────────────────────────────
.stop-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;

  &:last-child { margin-bottom: 0; }

  input { flex: 1; }
}

.btn-remove {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: $radius-base;
  background: transparent;
  color: var(--app-muted);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--app-border);
  transition: color 0.2s, border-color 0.2s;

  &:hover {
    color: var(--app-warn);
    border-color: var(--app-warn);
  }
}

.btn-add-stop {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--app-amber-dim);
  color: var(--app-amber);
  border: 1px dashed rgba(232, 160, 48, 0.3);
  border-radius: $radius-base;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.2s;
  margin-top: -4px;

  &:hover { background: rgba(232, 160, 48, 0.18); }

  &__icon {
    font-size: 16px;
    line-height: 1;
  }
}

// ── Interval ───────────────────────────────────────────────────────────────
.interval-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.interval-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text);
  min-width: 56px;
  text-align: center;
}

.btn-interval {
  width: 32px;
  height: 32px;
  border-radius: $radius-base;
  background: var(--app-surface);
  color: var(--app-text);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--app-border);
  transition: background 0.2s, color 0.2s;

  &:hover:not(:disabled) {
    background: var(--app-card);
    color: var(--app-amber);
    border-color: var(--app-amber);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

// ── Submit ─────────────────────────────────────────────────────────────────
.btn-submit {
  margin-top: 4px;
  padding: 12px;
  background: var(--app-amber);
  color: #0b1220;
  font-weight: 700;
  font-size: 14px;
  border-radius: $radius-base;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s, transform 0.1s;

  &:hover:not(:disabled) { opacity: 0.9; }
  &:active:not(:disabled) { transform: scale(0.98); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}
</style>
