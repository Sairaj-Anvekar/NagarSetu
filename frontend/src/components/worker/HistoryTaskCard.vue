<script setup>
import { computed } from 'vue'
import { formatCompletionTime } from '../../utils/historyGroups'

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
})

const zoneName = computed(() => {
  const z = props.task?.zone
  if (typeof z === 'string' && z.trim()) return z.trim()
  if (z && typeof z === 'object' && typeof z.name === 'string' && z.name.trim()) {
    return z.name.trim()
  }
  return ''
})

const timeStr = computed(() => formatCompletionTime(props.task?.resolved_at))

const metaText = computed(() => {
  const code = props.task?.tracking_code || ''
  if (code && timeStr.value) {
    return `${code} · ${timeStr.value}`
  }
  return code || timeStr.value || ''
})
</script>

<template>
  <article class="worker-history-card">
    <div class="worker-history-card__badge" aria-hidden="true">
      <svg
        class="worker-history-card__check-icon"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M16.6666 5L7.49998 14.1667L3.33331 10"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>

    <div class="worker-history-card__content">
      <div class="worker-history-card__top">
        <h2 class="worker-history-card__category">{{ task.category }}</h2>
        <span v-if="zoneName" class="worker-history-card__zone-pill">{{ zoneName }}</span>
      </div>
      <p v-if="metaText" class="worker-history-card__meta">
        <span class="worker-history-card__tracking">{{ task.tracking_code }}</span>
        <template v-if="task.tracking_code && timeStr"> · </template>
        <time v-if="task.resolved_at && timeStr" :datetime="task.resolved_at">{{ timeStr }}</time>
      </p>
    </div>
  </article>
</template>

<style scoped>
.worker-history-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background-color: var(--ns-paper, #ffffff);
  border: 1px solid var(--ns-worker-tab-border, #e3eaf0);
  border-radius: 18px;
  padding: 14px 16px;
  box-shadow: 0 2px 8px rgba(14, 34, 51, 0.05);
  box-sizing: border-box;
}

.worker-history-card__badge {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 50%;
  background-color: #dcfce7;
  color: #166534;
}

.worker-history-card__check-icon {
  width: 20px;
  height: 20px;
}

.worker-history-card__content {
  flex: 1 1 auto;
  min-width: 0;
}

.worker-history-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}

.worker-history-card__category {
  margin: 0;
  font-family: var(--ns-font-display);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--ns-login-navy, #0e2233);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.worker-history-card__zone-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  background-color: #eef3f7;
  color: #334155;
  font-family: var(--ns-font-body);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  flex-shrink: 0;
}

.worker-history-card__meta {
  margin: 0;
  font-family: var(--ns-font-body);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  color: var(--ns-login-text-muted, #4b5b6b);
}

.worker-history-card__tracking {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
</style>
