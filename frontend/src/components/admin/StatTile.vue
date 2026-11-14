<script setup>
defineProps({
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
  <div class="stat-tile card">
    <div class="stat-tile__body card-body">
      <span class="stat-tile__label">{{ label }}</span>
      <span class="stat-tile__value ns-num">{{ value }}</span>
      <span v-if="hint" class="stat-tile__hint">{{ hint }}</span>
    </div>
  </div>
</template>

<style scoped>
.stat-tile {
  background-color: var(--ns-paper);
  border: 1px solid var(--ns-line);
  border-radius: var(--ns-radius-card);
  box-shadow: var(--ns-shadow-card);
  min-height: 100px;
  height: 100%;
}

.stat-tile__body {
  padding: 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.stat-tile__label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ns-slate);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.375rem;
}

.stat-tile__value {
  font-family: var(--ns-font-display);
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.1;
  color: var(--ns-ink);
}

.stat-tile__hint {
  font-size: 0.75rem;
  color: var(--ns-slate);
  margin-top: 0.375rem;
}
</style>

