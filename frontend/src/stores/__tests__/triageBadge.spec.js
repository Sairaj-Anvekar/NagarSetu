import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTriageBadgeStore } from '../triageBadge'
import * as adminApi from '../../api/adminApi'

describe('useTriageBadgeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('initializes with pendingCount 0 and unloaded state', () => {
    const store = useTriageBadgeStore()
    expect(store.pendingCount).toBe(0)
    expect(store.hasLoaded).toBe(false)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('setPendingCount updates the count and clamps negatives to 0', () => {
    const store = useTriageBadgeStore()
    store.setPendingCount(5)
    expect(store.pendingCount).toBe(5)

    store.setPendingCount('12')
    expect(store.pendingCount).toBe(12)

    store.setPendingCount(-3)
    expect(store.pendingCount).toBe(0)

    store.setPendingCount('invalid')
    expect(store.pendingCount).toBe(0)
  })

  it('decrementPendingCount decreases count by 1 and clamps at 0', () => {
    const store = useTriageBadgeStore()
    store.setPendingCount(2)

    store.decrementPendingCount()
    expect(store.pendingCount).toBe(1)

    store.decrementPendingCount()
    expect(store.pendingCount).toBe(0)

    store.decrementPendingCount()
    expect(store.pendingCount).toBe(0)
  })

  it('fetchPendingCount fetches stats and sets pendingCount from pending_triage', async () => {
    vi.spyOn(adminApi, 'fetchStats').mockResolvedValueOnce({
      department: { id: 'd1', name: 'Sanitation' },
      totals: { total: 10 },
      pending_triage: 4,
    })

    const store = useTriageBadgeStore()
    await store.fetchPendingCount()

    expect(store.pendingCount).toBe(4)
    expect(store.hasLoaded).toBe(true)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchPendingCount defaults to 0 when pending_triage is missing or invalid', async () => {
    vi.spyOn(adminApi, 'fetchStats').mockResolvedValueOnce({
      department: { id: 'd1', name: 'Sanitation' },
      totals: { total: 10 },
    })

    const store = useTriageBadgeStore()
    await store.fetchPendingCount()

    expect(store.pendingCount).toBe(0)
    expect(store.hasLoaded).toBe(true)
  })

  it('fetchPendingCount records error when request fails without throwing unhandled exception', async () => {
    vi.spyOn(adminApi, 'fetchStats').mockRejectedValueOnce(new Error('Network error'))

    const store = useTriageBadgeStore()
    await store.fetchPendingCount()

    expect(store.error).toBe('Network error')
    expect(store.isLoading).toBe(false)
  })
})
