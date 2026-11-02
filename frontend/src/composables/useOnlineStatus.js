import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useOnlineStatus() {
  const initialStatus =
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true

  const isOnline = ref(initialStatus)

  function updateOnline() {
    isOnline.value = true
  }

  function updateOffline() {
    isOnline.value = false
  }

  onMounted(() => {
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOffline)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('online', updateOnline)
    window.removeEventListener('offline', updateOffline)
  })

  return { isOnline }
}
