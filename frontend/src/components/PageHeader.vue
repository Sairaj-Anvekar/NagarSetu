<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <header class="ns-page-header">
    <div class="ns-page-header__text">
      <h1 class="mb-0">{{ title }}</h1>
      <p v-if="subtitle" class="ns-page-header__subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="ns-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.ns-page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.ns-page-header__text {
  flex: 1 1 16rem;
  min-width: 0;
  overflow-wrap: anywhere;
}
.ns-page-header__subtitle {
  margin: 0.5rem 0 0;
  color: var(--ns-slate);
}
.ns-page-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-left: auto;
  max-width: 100%;
}
@media (max-width: 575.98px) {
  .ns-page-header__actions {
    flex-basis: 100%;
  }
}
</style>
