<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { suggestLocations } from '../services/geocodingService.js'

const props = defineProps({
  modelValue: { type: String,  default: '' },
  placeholder: { type: String,  default: '' },
  dotColor:    { type: String,  default: '' },
  required:    { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'selectLocation'])

const wrapEl      = ref(null)   // the .ac-wrap div (contains input)
const inputEl     = ref(null)   // the <input>
const dropdownEl  = ref(null)   // the teleported dropdown div

const suggestions  = ref([])
const isOpen       = ref(false)
const isSearching  = ref(false)
const dropdownPos  = ref({ top: 0, left: 0, width: 0 })

let debounceTimer = null

// ── Position ───────────────────────────────────────────────────────────────
function updatePos() {
  if (!inputEl.value) return
  const r = inputEl.value.getBoundingClientRect()
  dropdownPos.value = {
    top:   r.bottom + 4,
    left:  r.left,
    width: r.width,
  }
}

// ── Input handler ──────────────────────────────────────────────────────────
function onInput(e) {
  const val = e.target.value
  emit('update:modelValue', val)
  // User is typing → any previously stored coords are stale
  emit('selectLocation', null)

  clearTimeout(debounceTimer)
  if (val.length < 3) {
    suggestions.value = []
    isOpen.value = false
    return
  }

  debounceTimer = setTimeout(async () => {
    isSearching.value = true
    try {
      suggestions.value = await suggestLocations(val)
      if (suggestions.value.length) {
        updatePos()
        isOpen.value = true
      } else {
        // Show "sin resultados" feedback only if the user is still waiting
        updatePos()
        isOpen.value = true
      }
    } catch {
      suggestions.value = []
    } finally {
      isSearching.value = false
    }
  }, 400)
}

// ── Selection ──────────────────────────────────────────────────────────────
function select(suggestion) {
  // Use @mousedown.prevent on each option so focus stays on input
  emit('update:modelValue', suggestion.displayName)
  emit('selectLocation', suggestion)
  isOpen.value = false
  suggestions.value = []
}

// ── Keyboard ───────────────────────────────────────────────────────────────
function onKeydown(e) {
  if (e.key === 'Escape') {
    isOpen.value = false
  }
}

// ── Click outside ──────────────────────────────────────────────────────────
function onClickOutside(e) {
  const inWrap     = wrapEl.value?.contains(e.target)
  const inDropdown = dropdownEl.value?.contains(e.target)
  if (!inWrap && !inDropdown) isOpen.value = false
}

// Close on scroll (sidebar scrolls, position would drift)
function onScroll() { isOpen.value = false }

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
  window.addEventListener('scroll', onScroll, true)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', onClickOutside)
  window.removeEventListener('scroll', onScroll, true)
  clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="ac-wrap" ref="wrapEl">
    <!-- Dot -->
    <span
      v-if="dotColor"
      class="ac-dot"
      :style="{ background: dotColor }"
    />

    <!-- Input -->
    <input
      ref="inputEl"
      type="text"
      class="ac-input"
      :class="{ 'ac-input--dotted': dotColor }"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      autocomplete="off"
      @input="onInput"
      @keydown="onKeydown"
    />

    <!-- Dropdown — teleported to body to escape overflow:auto clipping -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="dropdownEl"
        class="ac-dropdown"
        :style="{
          top:   dropdownPos.top + 'px',
          left:  dropdownPos.left + 'px',
          width: dropdownPos.width + 'px',
        }"
      >
        <template v-if="suggestions.length">
          <button
            v-for="(s, i) in suggestions"
            :key="i"
            type="button"
            class="ac-option"
            @mousedown.prevent="select(s)"
          >
            {{ s.displayName }}
          </button>
        </template>
        <div v-else-if="!isSearching" class="ac-empty">
          Sin resultados
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
@use '../assets/styles/variables' as *;

.ac-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.ac-dot {
  position: absolute;
  left: 11px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  z-index: 1;
  pointer-events: none;
}

.ac-input {
  width: 100%;
  background: var(--app-surface);
  color: var(--app-text);
  border: 1px solid var(--app-border);
  border-radius: $radius-base;
  padding: 8px 12px;
  font-family: inherit;
  font-size: 14px;
  transition: border-color 0.2s;

  &::placeholder { color: var(--app-muted); }
  &:focus { border-color: var(--app-blue); outline: none; }

  &--dotted { padding-left: 28px; }
}
</style>

<!-- Unscoped: dropdown is teleported outside the component's DOM scope -->
<style lang="scss">
@use '../assets/styles/variables' as *;

.ac-dropdown {
  position: fixed;
  z-index: 9999;
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: $radius-base;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  overflow: hidden;
  // Animate in
  animation: ac-slide 0.12s ease;
}

@keyframes ac-slide {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.ac-option {
  display: block;
  width: 100%;
  padding: 9px 12px;
  text-align: left;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--app-border);
  color: var(--app-text);
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
  font-family: inherit;
  // Truncate long display_names
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.1s;

  &:last-child { border-bottom: none; }

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--app-amber);
  }
}

.ac-empty {
  padding: 10px 12px;
  font-size: 13px;
  color: var(--app-muted);
  font-style: italic;
}
</style>
