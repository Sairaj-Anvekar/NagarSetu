import http from '../http'
import { createMockAdapter } from './mockAdapter'
import { authRoutes } from './authHandlers'

let originalAdapter = null
let isOriginalSaved = false

export function installMockApi({ delayMs } = {}) {
  if (!isOriginalSaved) {
    originalAdapter = http.defaults.adapter
    isOriginalSaved = true
  }

  http.defaults.adapter = createMockAdapter(authRoutes, { delayMs })
  console.info('[mock-api] enabled (development only)')
}

export function uninstallMockApi() {
  if (isOriginalSaved) {
    http.defaults.adapter = originalAdapter
  }
}
