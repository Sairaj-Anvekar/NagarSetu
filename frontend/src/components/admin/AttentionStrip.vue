<script setup>
import { RouterLink } from 'vue-router'
import AppIcon from '../AppIcon.vue'

defineProps({
  overdue: { type: Number, default: 0 },
  unassigned: { type: Number, default: 0 },
})
</script>

<template>
  <aside v-if="overdue > 0 || unassigned > 0" class="attention-strip" aria-label="Needs attention">
    <div v-if="overdue > 0" class="attention-strip__item">
      <AppIcon name="clock" />
      <span>{{ overdue }} {{ overdue === 1 ? 'complaint is' : 'complaints are' }} overdue</span>
      <RouterLink :to="{ path: '/admin/complaints', query: { overdue: 'true' } }"
        aria-label="Review overdue complaints">Review</RouterLink>
    </div>
    <div v-if="unassigned > 0" class="attention-strip__item">
      <AppIcon name="users" />
      <span>{{ unassigned }} {{ unassigned === 1 ? 'complaint is' : 'complaints are' }} unassigned</span>
      <RouterLink :to="{ path: '/admin/complaints', query: { unassigned: 'true' } }"
        aria-label="Review unassigned complaints">Review</RouterLink>
    </div>
  </aside>
</template>

<style scoped>
.attention-strip {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ns-space-8) var(--ns-space-24);
  padding: var(--ns-space-12) var(--ns-space-16);
  margin-bottom: var(--ns-space-24);
  border: 1px solid var(--ns-border-default);
  border-radius: var(--ns-radius-card);
  background-color: var(--ns-warning-bg);
  color: var(--ns-ink);
}
.attention-strip__item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ns-space-8);
}
.attention-strip__item a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding-inline: var(--ns-space-8);
  font-weight: var(--ns-type-overline-weight);
}
</style>
