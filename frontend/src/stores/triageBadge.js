import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchStats } from '../api/adminApi'

export const useTriageBadgeStore = defineStore('triageBadge', () => {
  const pendingCount = ref(0)
  const isLoading = ref(false)
  const hasLoaded = ref(false)
  const error = ref(null)

  /**
   * Sets the pending count explicitly (e.g. from triage list total or stats payload).
   * Clamps negative inputs to 0.
   *
   * @param {number|string} count
   */
  function setPendingCount(count) {
    const parsed = parseInt(count, 10)
    pendingCount.value = !Number.isNaN(parsed) && parsed > 0 ? parsed : 0
  }

  /**
   * Decrements the pending count by 1 (e.g. after confirming a triage item).
   * Clamps at 0.
   */
  function decrementPendingCount() {
    if (pendingCount.value > 0) {
      pendingCount.value -= 1
    }
  }

  /**
   * Fetches latest department statistics and updates pendingCount from pending_triage.
   */
  async function fetchPendingCount() {
    isLoading.value = true
    error.value = null
    try {
      const stats = await fetchStats()
      const count =
        typeof stats?.pending_triage === 'number' && !Number.isNaN(stats.pending_triage)
          ? stats.pending_triage
          : 0
      pendingCount.value = Math.max(0, count)
      hasLoaded.value = true
    } catch (err) {
      error.value = err?.message || 'Failed to fetch pending triage count'
    } finally {
      isLoading.value = false
    }
  }

  return {
    pendingCount,
    isLoading,
    hasLoaded,
    error,
    setPendingCount,
    decrementPendingCount,
    fetchPendingCount,
  }
})
