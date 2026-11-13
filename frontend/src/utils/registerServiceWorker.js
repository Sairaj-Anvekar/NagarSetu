export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    window.addEventListener(
      'load',
      async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js')
          resolve(registration)
        } catch (error) {
          console.warn('Service worker registration failed:', error)
          resolve(null)
        }
      },
      { once: true }
    )
  })
}

