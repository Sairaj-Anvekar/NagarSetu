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
      <div class="stat-tile__header">
        <span class="stat-tile__icon"><AppIcon :name="icon" /></span>
        <span class="stat-tile__label">{{ label }}</span>
      </div>
      <span class="stat-tile__value ns-num">{{ value }}</span>
      <span v-if="hint" class="stat-tile__hint">{{ hint }}</span>
    </div>
  </component>
</template>

<style scoped>
.stat-tile {
  --tile-accent: #0B6A7C;
  --tile-soft: #E6F4F6;
  display: block;
  background-color: #FFFFFF;
  border: 1px solid #E3EAF0;
  border-radius: 18px;
  box-shadow: 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06);
  min-height: 120px;
  height: 100%;
  text-decoration: none;
  overflow: hidden;
}

.stat-tile--total {
  --tile-accent: #0B6A7C;
  --tile-soft: #E6F4F6;
}

.stat-tile--submitted {
  --tile-accent: #1D4ED8;
  --tile-soft: #E0EEFF;
}

.stat-tile--in-progress {
  --tile-accent: #92400E;
  --tile-soft: #FEF3C7;
}

.stat-tile--completed {
  --tile-accent: #166534;
  --tile-soft: #DCFCE7;
}

.stat-tile--overdue {
  --tile-accent: #B91C1C;
  --tile-soft: #FEE2E2;
}

.stat-tile--unassigned {
  --tile-accent: #9A3412;
  --tile-soft: #FFEDD5;
}

.stat-tile--attention {
  background-color: var(--tile-soft);
  border-color: color-mix(in srgb, var(--tile-accent) 35%, #E3EAF0);
}

.stat-tile__body {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  height: 100%;
  overflow-wrap: anywhere;
}

.stat-tile__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.stat-tile__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background-color: var(--tile-soft);
  color: var(--tile-accent);
  flex-shrink: 0;
}

.stat-tile__label {
  font-family: var(--ns-font-body, 'Public Sans', sans-serif);
  font-size: 13px;
  font-weight: 600;
  color: #4B5B6B;
  text-align: right;
  letter-spacing: normal;
  text-transform: none;
}

.stat-tile__value {
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-size: 34px;
  font-weight: 700;
  line-height: 1.1;
  color: #0E2233;
  font-variant-numeric: tabular-nums;
  margin-bottom: 4px;
}

.stat-tile__hint {
  font-family: var(--ns-font-body, 'Public Sans', sans-serif);
  font-size: 13px;
  color: #5F6F7E;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-tile[href]:focus-visible {
  outline: 2px solid #0B7285;
  outline-offset: 2px;
}

@media (hover: hover) {
  .stat-tile[href]:hover {
    box-shadow: 0 4px 12px rgba(14, 34, 51, 0.08), 0 14px 28px rgba(14, 34, 51, 0.08);
    transform: translateY(-1px);
  }
}

@media (prefers-reduced-motion: no-preference) {
  .stat-tile[href] {
    transition: box-shadow var(--ns-duration-fast, 120ms) ease,
                transform var(--ns-duration-fast, 120ms) ease;
  }
}
</style>
