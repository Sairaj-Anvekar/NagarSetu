<script setup>
import { computed } from 'vue'
import { getInitials } from '../../utils/initials'

const props = defineProps({
  name: {
    type: String,
    default: '',
  },
})

const displayName = computed(() => {
  const n = props.name
  return typeof n === 'string' && n.trim() ? n.trim() : 'Worker'
})

const initials = computed(() => getInitials(displayName.value))
</script>

<template>
  <div class="ns-account-profile-card">
    <div class="ns-worker-account__avatar" aria-hidden="true">
      {{ initials }}
    </div>
    <div class="ns-account-profile-card__info">
      <h2 class="ns-worker-account__name">{{ displayName }}</h2>
      <div class="ns-worker-account__role">Field worker</div>
    </div>
  </div>
</template>

<style scoped>
.ns-account-profile-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background-color: var(--ns-paper, #ffffff);
  border: 1px solid var(--ns-worker-tab-border, #e3eaf0);
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 8px 22px rgba(14, 34, 51, 0.08);
  box-sizing: border-box;
}

.ns-worker-account__avatar {
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--ns-login-brand-gradient, linear-gradient(135deg, #2dd4bf, #0b7285));
  color: #ffffff;
  font-family: var(--ns-font-display);
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}

.ns-account-profile-card__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.ns-worker-account__name {
  margin: 0;
  font-family: var(--ns-font-display);
  font-size: 19px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--ns-login-navy, #0e2233);
  overflow-wrap: anywhere;
}

.ns-worker-account__role {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 3px 10px;
  border-radius: 999px;
  background-color: var(--ns-worker-tab-pill-bg, #d8f1f3);
  color: var(--ns-login-control-text, #0b5c70);
  font-family: var(--ns-font-body);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
}
</style>
