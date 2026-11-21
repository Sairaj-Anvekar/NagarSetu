<script setup>
import { RouterLink } from 'vue-router'
import AppIcon from '../AppIcon.vue'

defineProps({
  to: { type: [String, Object], default: null },
  icon: { type: String, default: 'dashboard' },
  tone: { type: String, default: 'total' },
  attention: { type: Boolean, default: false },
  label: {
    type: String,
    required: true,
  },
  value: {
    type: Number,
    default: 0,
  },
  hint: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <component
    :is="to ? RouterLink : 'div'"
    :to="to || undefined"
    class="stat-tile card"
    :class="[`stat-tile--${tone}`, { 'stat-tile--attention': attention }]"
  >
    <div class="stat-tile__body card-body">
      <span class="stat-tile__icon"><AppIcon :name="icon" /></span>
      <span class="stat-tile__label">{{ label }}</span>
      <span class="stat-tile__value ns-num">{{ value }}</span>
      <span v-if="hint" class="stat-tile__hint">{{ hint }}</span>
    </div>
  </component>
</template>

<style scoped>
.stat-tile {
  --tile-accent: var(--ns-harbour);
  --tile-soft: var(--ns-info-bg);
  background-color: var(--ns-paper);
  border: 1px solid var(--ns-line);
  border-radius: var(--ns-radius-card);
  box-shadow: var(--ns-shadow-card);
  min-height: 100px;
  height: 100%;
  text-decoration: none;
}
.stat-tile--submitted {
  --tile-accent: var(--ns-status-submitted-text);
  --tile-soft: var(--ns-status-submitted-bg);
}
.stat-tile--in-progress {
  --tile-accent: var(--ns-status-in-progress-text);
  --tile-soft: var(--ns-status-in-progress-bg);
}
.stat-tile--completed {
  --tile-accent: var(--ns-status-completed-text);
  --tile-soft: var(--ns-status-completed-bg);
}
.stat-tile--overdue {
  --tile-accent: var(--ns-danger-fg);
  --tile-soft: var(--ns-danger-bg);
}
.stat-tile--unassigned {
  --tile-accent: var(--ns-neutral-fg);
  --tile-soft: var(--ns-neutral-bg);
}
.stat-tile--attention {
  background-color: var(--tile-soft);
  border-color: color-mix(in srgb, var(--tile-accent) 35%, var(--ns-paper));
}
.stat-tile__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  margin-bottom: var(--ns-space-12);
  border-radius: var(--ns-radius-control);
  background-color: var(--tile-soft);
  color: var(--tile-accent);
}
.stat-tile[href]:focus-visible {
  outline: 2px solid var(--ns-teal-600);
  outline-offset: var(--ns-focus-ring-offset);
}
@media (hover: hover) {
  .stat-tile[href]:hover {
    box-shadow: var(--ns-shadow-md);
  }
}
@media (prefers-reduced-motion: no-preference) {
  .stat-tile[href] {
    transition: box-shadow var(--ns-duration-fast) var(--ns-easing);
  }
}

.stat-tile__body {
  padding: var(--ns-space-24) var(--ns-space-16);
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  overflow-wrap: anywhere;
}

.stat-tile__label {
  font-size: var(--ns-type-overline-size);
  font-weight: var(--ns-type-overline-weight);
  color: var(--ns-slate);
  text-transform: uppercase;
  letter-spacing: var(--ns-type-overline-letter-spacing);
  margin-bottom: 0.375rem;
}

.stat-tile__value {
  font-family: var(--ns-font-display);
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.1;
  color: var(--ns-ink);
  font-variant-numeric: var(--ns-type-numeric-variant);
}

.stat-tile__hint {
  font-size: 0.75rem;
  color: var(--ns-slate);
  margin-top: 0.375rem;
}
</style>

