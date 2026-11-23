<script setup>
import { computed } from 'vue'
import { useInstallPrompt } from '../../composables/useInstallPrompt'

const props = defineProps({
  canInstall: {
    default: null,
  },
  isInstalled: {
    default: null,
  },
  isIos: {
    default: null,
  },
})

const emit = defineEmits(['install'])

const prompt = useInstallPrompt()

const canInstallEffective = computed(() =>
  typeof props.canInstall === 'boolean' ? props.canInstall : Boolean(prompt.canInstall.value)
)

const isInstalledEffective = computed(() =>
  typeof props.isInstalled === 'boolean' ? props.isInstalled : Boolean(prompt.isInstalled.value)
)

const isIosEffective = computed(() =>
  typeof props.isIos === 'boolean' ? props.isIos : Boolean(prompt.isIos.value)
)

const isVisible = computed(
  () =>
    canInstallEffective.value ||
    isInstalledEffective.value ||
    (isIosEffective.value && !isInstalledEffective.value)
)

function triggerInstall() {
  if (typeof prompt.install === 'function') {
    prompt.install()
  }
  emit('install')
}
</script>

<template>
  <div v-if="isVisible" class="ns-worker-account__install ns-install-card">
    <div class="ns-install-card__content">
      <h3 class="ns-install-card__title">Install NagarSetu</h3>
      <p class="ns-install-card__body mb-3">
        Add the app to your home screen to open it in one tap.
        <span v-if="isIosEffective && !isInstalledEffective" class="ns-worker-account__ios-hint">
          On iPhone: tap Share, then Add to Home Screen.
        </span>
      </p>

      <button
        v-if="canInstallEffective"
        type="button"
        class="ns-install-card__btn ns-worker-account__install-btn"
        @click="triggerInstall"
      >
        Install app
      </button>

      <div
        v-else-if="isInstalledEffective"
        class="ns-install-card__status ns-worker-account__installed-text"
      >
        <span class="ns-install-card__check-dot" aria-hidden="true" />
        App installed
      </div>
    </div>
  </div>
</template>

<style scoped>
.ns-install-card {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  background-color: var(--ns-login-navy, #0e2233);
  background-image: radial-gradient(
    circle at 90% 0%,
    var(--ns-worker-header-glow, rgba(45, 212, 191, 0.34)),
    transparent 60%
  );
  padding: 18px;
  color: #ffffff;
  box-shadow: 0 4px 16px rgba(14, 34, 51, 0.12);
  box-sizing: border-box;
}

.ns-install-card__title {
  margin: 0 0 6px;
  font-family: var(--ns-font-display);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.3;
  color: #ffffff;
}

.ns-install-card__body {
  font-family: var(--ns-font-body);
  font-size: 13px;
  line-height: 1.5;
  color: var(--ns-worker-header-muted, #b7c7d4);
}

.ns-install-card__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 44px;
  padding: 0 16px;
  border: none;
  border-radius: 12px;
  background-color: #ffffff;
  color: var(--ns-login-navy, #0e2233);
  font-family: var(--ns-font-display);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--ns-duration-fast, 140ms) ease;
}

.ns-install-card__btn:hover {
  opacity: 0.95;
}

.ns-install-card__btn:focus-visible {
  outline: 2px solid var(--ns-span, #14a89a);
  outline-offset: 2px;
}

.ns-install-card__status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--ns-font-body);
  font-size: 13px;
  font-weight: 600;
  color: var(--ns-login-accent, #2dd4bf);
}

.ns-install-card__check-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--ns-login-accent, #2dd4bf);
}

@media (prefers-reduced-motion: reduce) {
  .ns-install-card__btn {
    transition: none;
  }
}
</style>
