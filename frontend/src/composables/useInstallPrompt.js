import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useInstallPrompt() {
  const canInstall = ref(false)

  const isStandalone =
    (typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches) ||
    (typeof navigator !== 'undefined' && Boolean(navigator.standalone)) ||
    false

  const isInstalled = ref(Boolean(isStandalone))

  const isIos = ref(
    typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent || '')
  )

  let deferredPrompt = null

  function handleBeforeInstallPrompt(event) {
    event.preventDefault()
    deferredPrompt = event
    canInstall.value = true
  }

  function handleAppInstalled() {
    isInstalled.value = true
    canInstall.value = false
    deferredPrompt = null
  }

  async function install() {
    if (!deferredPrompt) {
      return
    }

    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    deferredPrompt = null
    canInstall.value = false
  }

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('appinstalled', handleAppInstalled)
  })

  return {
    canInstall,
    isInstalled,
    isIos,
    install,
  }
}

