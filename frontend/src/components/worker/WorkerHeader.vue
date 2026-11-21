<script setup>
import { computed } from 'vue'
import { getInitials } from '../../utils/initials'

const props = defineProps({
  variant: {
    type: String,
    default: 'title',
    validator: (value) => ['greeting', 'title'].includes(value),
  },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  name: { type: String, default: '' },
  chip: { type: String, default: '' },
  hour: {
    type: Number,
    default: () => new Date().getHours(),
    validator: (value) => Number.isInteger(value) && value >= 0 && value <= 23,
  },
})

const greeting = computed(() => {
  if (props.hour < 12) return 'Good morning'
  return props.hour < 17 ? 'Good afternoon' : 'Good evening'
})
</script>

<template>
  <header class="ns-worker-header">
    <div class="ns-worker-header__row">
      <template v-if="variant === 'greeting'">
        <span class="ns-worker-header__avatar" aria-hidden="true">{{ getInitials(name) }}</span>
        <div class="ns-worker-header__text">
          <p class="ns-worker-header__greeting">{{ greeting }}</p>
          <h1 class="ns-worker-header__name">{{ name }}</h1>
        </div>
      </template>
      <div v-else class="ns-worker-header__text">
        <h1 class="ns-worker-header__title">{{ title }}</h1>
        <p v-if="subtitle" class="ns-worker-header__subtitle">{{ subtitle }}</p>
      </div>
      <span v-if="chip.trim()" class="ns-worker-header__chip">
        <span class="ns-worker-header__dot" aria-hidden="true" />
        {{ chip }}
      </span>
    </div>
    <div v-if="$slots.default" class="ns-worker-header__content"><slot /></div>
  </header>
</template>

<style scoped>
.ns-worker-header {
  box-sizing: border-box;
  min-height: 150px;
  padding: max(56px, env(safe-area-inset-top, 0px)) 20px 0;
  border-radius: 0 0 var(--ns-worker-header-radius) var(--ns-worker-header-radius);
  background-color: var(--ns-login-navy);
  background-image: radial-gradient(circle at 90% 0%, var(--ns-worker-header-glow), transparent 55%),
    linear-gradient(var(--ns-login-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--ns-login-grid) 1px, transparent 1px);
  background-size: auto, 28px 28px, 28px 28px;
  color: var(--ns-paper);
  font-family: var(--ns-font-body);
}
.ns-worker-header__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.ns-worker-header__avatar {
  display: grid;
  place-items: center;
  flex: 0 0 46px;
  height: 46px;
  border-radius: var(--ns-radius-pill);
  background: var(--ns-login-brand-gradient);
  color: var(--ns-paper);
  font: 700 16px var(--ns-font-display);
}
.ns-worker-header__text {
  flex: 1 1 120px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.ns-worker-header__greeting {
  margin: 0 0 3px;
  color: var(--ns-worker-header-muted);
  font-size: 13px;
}
.ns-worker-header__name {
  margin: 0;
  color: var(--ns-paper);
  font: 700 20px/1.2 var(--ns-font-display);
}
.ns-worker-header__title {
  margin: 0;
  color: var(--ns-paper);
  font: 700 26px/1.2 var(--ns-font-display);
}
.ns-worker-header__subtitle {
  margin: 6px 0 0;
  color: var(--ns-worker-header-muted);
  font-size: 14px;
}
.ns-worker-header__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  max-width: 100%;
  margin-left: auto;
  padding: 0 12px;
  border-radius: var(--ns-radius-pill);
  background: var(--ns-worker-chip-bg);
  color: var(--ns-worker-chip-text);
  font-size: 12px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.ns-worker-header__dot {
  flex: 0 0 7px;
  height: 7px;
  border-radius: var(--ns-radius-pill);
  background: var(--ns-login-accent);
}
.ns-worker-header__content { margin-top: 16px; }
</style>
