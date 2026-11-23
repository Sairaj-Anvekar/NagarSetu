<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <section class="chart-card" :aria-label="title">
    <div class="chart-card__header">
      <div class="chart-card__headings">
        <h2 class="chart-card__title">{{ title }}</h2>
        <p v-if="subtitle" class="chart-card__subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="chart-card__actions">
        <slot name="actions" />
      </div>
    </div>
    <div class="chart-card__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.chart-card {
  display: flex;
  flex-direction: column;
  background-color: #FFFFFF;
  border: 1px solid #E3EAF0;
  border-radius: 18px;
  box-shadow: 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06);
  padding: 24px;
  height: 100%;
  min-width: 0;
  overflow: hidden;
}

.chart-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 16px;
  margin-bottom: 20px;
}

.chart-card__headings {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chart-card__title {
  margin: 0;
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.25;
  color: #0E2233;
}

.chart-card__subtitle {
  margin: 0;
  font-family: var(--ns-font-body, 'Public Sans', sans-serif);
  font-size: 13px;
  color: #4B5B6B;
}

.chart-card__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chart-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
</style>
