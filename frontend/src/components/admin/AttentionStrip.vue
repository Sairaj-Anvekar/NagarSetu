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
      <div class="attention-strip__icon" aria-hidden="true">
        <AppIcon name="clock" />
      </div>
      <span class="attention-strip__text">
        {{ overdue }} {{ overdue === 1 ? 'complaint is' : 'complaints are' }} overdue
      </span>
      <RouterLink
        :to="{ path: '/admin/complaints', query: { overdue: 'true' } }"
        class="attention-strip__action"
        aria-label="Review overdue complaints"
      >
        Review
      </RouterLink>
    </div>
    <div v-if="unassigned > 0" class="attention-strip__item">
      <div class="attention-strip__icon" aria-hidden="true">
        <AppIcon name="users" />
      </div>
      <span class="attention-strip__text">
        {{ unassigned }} {{ unassigned === 1 ? 'complaint is' : 'complaints are' }} unassigned
      </span>
      <RouterLink
        :to="{ path: '/admin/complaints', query: { unassigned: 'true' } }"
        class="attention-strip__action"
        aria-label="Review unassigned complaints"
      >
        Review
      </RouterLink>
    </div>
  </aside>
</template>

<style scoped>
.attention-strip {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 20px;
  margin-bottom: 20px;
  border: 1px solid #F5D9A0;
  border-radius: 16px;
  background-color: #FFF7E6;
  color: #5B3A0A;
  box-shadow: 0 1px 2px rgba(14, 34, 51, 0.04);
}

.attention-strip__item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
}

.attention-strip__icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background-color: #FEF3C7;
  color: #B45309;
  flex-shrink: 0;
}

.attention-strip__text {
  flex: 1;
  min-width: 200px;
  font-family: var(--ns-font-body, 'Public Sans', sans-serif);
  font-size: 14px;
  font-weight: 600;
  color: #5B3A0A;
}

.attention-strip__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 10px;
  background-color: #FFFFFF;
  border: 1px solid #E8CD95;
  color: #5B3A0A;
  font-family: var(--ns-font-body, 'Public Sans', sans-serif);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(91, 58, 10, 0.06);
}

.attention-strip__action:focus-visible {
  outline: 2px solid #B45309;
  outline-offset: 2px;
}

@media (hover: hover) {
  .attention-strip__action:hover {
    background-color: #FFFDF9;
    border-color: #C99632;
    color: #402804;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .attention-strip__action {
    transition: background-color var(--ns-duration-fast, 120ms) ease,
                border-color var(--ns-duration-fast, 120ms) ease;
  }
}
</style>
