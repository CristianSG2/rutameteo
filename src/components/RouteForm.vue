<script setup>
import { ref, computed } from 'vue'

defineProps({ loading: { type: Boolean, default: false } })
const emit = defineEmits(['search'])

// ── State ──────────────────────────────────────────────────────────────────
const origin = ref('')
const destination = ref('')
const stops = ref([])
let stopIdCounter = 0

const now = new Date()
const pad = (n) => String(n).padStart(2, '0')
const defaultDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
const defaultTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`

const departureDate = ref(defaultDate)
const departureTime = ref(defaultTime)
const intervalKm    = ref(30)

// ── Stops ──────────────────────────────────────────────────────────────────
function addStop() { stops.value.push({ id: ++stopIdCounter, value: '' }) }
function removeStop(id) { stops.value = stops.value.filter((s) => s.id !== id) }

// ── Interval ───────────────────────────────────────────────────────────────
function dec() { if (intervalKm.value > 20)  intervalKm.value -= 10 }
function inc() { if (intervalKm.value < 100) intervalKm.value += 10 }

// ── Submit ─────────────────────────────────────────────────────────────────
const departureTimestamp = computed(() => {
  const dt = new Date(`${departureDate.value}T${departureTime.value}:00`)
  return Math.floor(dt.getTime() / 1000)
})

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

    <!-- ── BLOQUE RUTA ─────────────────────────────────────────────────── -->
    <section class="form-block">
      <div class="form-block__heading">Ruta</div>

      <!-- Origen -->
      <div class="form-field">
        <label class="form-label">Origen</label>
        <div class="input-wrap">
          <span class="input-dot input-dot--amber"></span>
          <input
            v-model="origin"
            type="text"
            class="input-dotted"
            placeholder="Ciudad de origen"
            required
          />
        </div>
      </div>

      <!-- Paradas intermedias -->
      <div v-if="stops.length" class="stops-list">
        <div v-for="stop in stops" :key="stop.id" class="stop-row">
          <div class="input-wrap" style="flex:1">
            <span class="input-dot input-dot--muted"></span>
            <input
              v-model="stop.value"
              type="text"
              class="input-dotted"
              placeholder="Parada intermedia"
            />
          </div>
          <button
            type="button"
            class="btn-remove"
            @click="removeStop(stop.id)"
            aria-label="Eliminar parada"
          >×</button>
        </div>
      </div>

      <button type="button" class="btn-add-stop" @click="addStop">
        <span class="btn-add-stop__icon">+</span>Añadir parada
      </button>

      <!-- Destino -->
      <div class="form-field">
        <label class="form-label">Destino</label>
        <div class="input-wrap">
          <span class="input-dot input-dot--blue"></span>
          <input
            v-model="destination"
            type="text"
            class="input-dotted"
            placeholder="Ciudad de destino"
            required
          />
        </div>
      </div>
    </section>

    <!-- ── BLOQUE SALIDA ───────────────────────────────────────────────── -->
    <section class="form-block">
      <div class="form-block__heading">Salida</div>
      <div class="form-row">
        <div class="form-field form-field--half">
          <label class="form-label">Fecha</label>
          <input v-model="departureDate" type="date" />
        </div>
        <div class="form-field form-field--half">
          <label class="form-label">Hora</label>
          <input v-model="departureTime" type="time" />
        </div>
      </div>
    </section>

    <!-- ── BLOQUE TRAMOS ───────────────────────────────────────────────── -->
    <section class="form-block">
      <div class="form-block__heading">Tramos</div>
      <div class="form-field">
        <label class="form-label">Consultar el tiempo cada</label>
        <div class="interval-control">
          <button
            type="button"
            class="btn-interval"
            :disabled="intervalKm <= 20"
            @click="dec"
            aria-label="Reducir intervalo"
          >−</button>
          <span class="interval-value">{{ intervalKm }} km</span>
          <button
            type="button"
            class="btn-interval"
            :disabled="intervalKm >= 100"
            @click="inc"
            aria-label="Aumentar intervalo"
          >+</button>
        </div>
      </div>
    </section>

    <!-- ── SUBMIT ─────────────────────────────────────────────────────── -->
    <button type="submit" class="btn-submit" :disabled="loading">
      {{ loading ? 'Calculando…' : 'Ver el tiempo en la ruta' }}
    </button>

  </form>
</template>

<style lang="scss" scoped>
@use '../assets/styles/variables' as *;

// ── Form shell ─────────────────────────────────────────────────────────────
.route-form {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-bottom: 24px;
}

// ── Blocks ─────────────────────────────────────────────────────────────────
.form-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 20px 0;

  & + & {
    padding-top: 20px;
    border-top: 1px solid var(--app-border);
    margin-top: 20px;
  }

  &__heading {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--app-muted);
  }
}

// ── Fields ─────────────────────────────────────────────────────────────────
.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &--half { flex: 1; }
}

.form-row {
  display: flex;
  gap: 10px;
}

.form-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--app-muted);
}

// ── Dot inputs ─────────────────────────────────────────────────────────────
.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-dot {
  position: absolute;
  left: 11px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  z-index: 1;

  &--amber { background: var(--app-amber); }
  &--muted { background: var(--app-muted); }
  &--blue  { background: var(--app-blue); }
}

.input-dotted {
  padding-left: 28px;
}

// ── Stops ──────────────────────────────────────────────────────────────────
.stops-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: -4px;
}

.stop-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-remove {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
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
  transition: color 0.15s, border-color 0.15s;

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
  border: 1px dashed rgba(232, 160, 48, 0.35);
  border-radius: $radius-base;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.15s;
  align-self: flex-start;

  &:hover { background: rgba(232, 160, 48, 0.18); }

  &__icon { font-size: 16px; line-height: 1; }
}

// ── Interval ───────────────────────────────────────────────────────────────
.interval-control {
  display: flex;
  align-items: center;
  gap: 14px;
}

.interval-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--app-text);
  min-width: 60px;
  text-align: center;
}

.btn-interval {
  width: 34px;
  height: 34px;
  border-radius: $radius-base;
  background: var(--app-card);
  color: var(--app-text);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--app-border);
  transition: background 0.15s, color 0.15s, border-color 0.15s;

  &:hover:not(:disabled) {
    color: var(--app-amber);
    border-color: var(--app-amber);
  }

  &:disabled { opacity: 0.3; cursor: not-allowed; }
}

// ── Submit ─────────────────────────────────────────────────────────────────
.btn-submit {
  margin: 24px 20px 0;
  padding: 13px;
  background: var(--app-amber);
  color: #0b1220;
  font-weight: 700;
  font-size: 14px;
  border-radius: $radius-base;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s, transform 0.1s;
  letter-spacing: 0.01em;

  &:hover:not(:disabled)  { opacity: 0.88; }
  &:active:not(:disabled) { transform: scale(0.98); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
}
</style>
