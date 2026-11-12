import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import WorkerTaskDetailView from '../WorkerTaskDetailView.vue'
import { deferTask, fetchTask, startTask } from '../../api/complaintsApi'

vi.mock('../../api/complaintsApi', () => ({
  fetchTask: vi.fn(),
  startTask: vi.fn(),
  deferTask: vi.fn(),
}))

const baseTask = {
  id: 'task-uuid-1',
  tracking_code: 'GRV-2026-A7X3',
  category: 'Solid Waste Management',
  description: 'Large pile of uncollected garbage blocking the corner lane since yesterday morning.',
  image_url: 'https://example.com/signed-task.jpg',
  latitude: 17.68,
  longitude: 75.88,
  priority: 'high',
  status: 'Submitted',
  sla_deadline: '2026-10-20T10:00:00.000Z',
  is_overdue: true,
}

async function mountDetailView(id = 'task-uuid-1') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/worker', name: 'worker', component: { template: '<div>Queue</div>' } },
      { path: '/worker/tasks/:id', name: 'worker-task-detail', component: WorkerTaskDetailView },
    ],
  })
  await router.push(`/worker/tasks/${id}`)
  await router.isReady()

  const wrapper = mount(WorkerTaskDetailView, { global: { plugins: [router] } })
  return { wrapper, router }
}

describe('WorkerTaskDetailView — Loading, Render & Directions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner while fetchTask is pending', async () => {
    fetchTask.mockReturnValue(new Promise(() => {}))
    const { wrapper } = await mountDetailView()
    await nextTick()

    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading task...')
  })

  it('renders code, full description, badges, overdue deadline, directions link, and no coordinates', async () => {
    fetchTask.mockResolvedValueOnce({ ...baseTask })
    const { wrapper } = await mountDetailView()
    await flushPromises()

    expect(fetchTask).toHaveBeenCalledWith('task-uuid-1')
    expect(wrapper.get('h1').text()).toBe('GRV-2026-A7X3')
    expect(wrapper.text()).toContain(baseTask.description)
    expect(wrapper.find('.ns-badge--high').text()).toBe('High')
    expect(wrapper.find('.ns-badge--submitted').text()).toBe('Submitted')
    expect(wrapper.find('.worker-detail-overdue-pill').text()).toBe('Overdue')
    expect(wrapper.text()).not.toContain('17.68')
    expect(wrapper.text()).not.toContain('75.88')

    const directionsLink = wrapper.get('a.btn[target="_blank"]')
    expect(directionsLink.attributes('href')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=17.68%2C75.88',
    )
    expect(directionsLink.attributes('rel')).toBe('noopener noreferrer')
  })

  it('falls back to photo placeholder on error and disables directions if coordinates are missing', async () => {
    fetchTask.mockResolvedValueOnce({ ...baseTask, latitude: null, longitude: null })
    const { wrapper } = await mountDetailView()
    await flushPromises()

    const img = wrapper.get('img.worker-detail-photo')
    expect(img.attributes('alt')).toContain('Solid Waste Management')
    await img.trigger('error')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('Photo unavailable')

    const disabledBtn = wrapper.get('.worker-detail-directions button')
    expect(disabledBtn.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Location coordinates are unavailable')
  })

  it('shows "This task is no longer available" EmptyState on 404', async () => {
    fetchTask.mockRejectedValueOnce({ response: { status: 404 } })
    const { wrapper } = await mountDetailView()
    await flushPromises()

    expect(wrapper.text()).toContain('This task is no longer available')
    expect(wrapper.get('.ns-empty-state a[href="/worker"].btn').text()).toBe('Back to my tasks')
  })

  it('shows ErrorAlert on 403/500 errors and retries when Try again is clicked', async () => {
    fetchTask.mockRejectedValueOnce({ response: { status: 403 } })
    const { wrapper } = await mountDetailView()
    await flushPromises()

    const alert = wrapper.get('.alert-danger')
    expect(alert.text()).toContain('You do not have permission to do this.')

    fetchTask.mockResolvedValueOnce({ ...baseTask })
    await alert.get('button').trigger('click')
    await flushPromises()

    expect(fetchTask).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.alert-danger').exists()).toBe(false)
    expect(wrapper.get('h1').text()).toBe('GRV-2026-A7X3')
  })
})

describe('WorkerTaskDetailView — Start work', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows Start work only for Submitted, updates badge in-place without refetching, and hides Complete', async () => {
    fetchTask.mockResolvedValueOnce({ ...baseTask, status: 'Submitted' })
    let resolveStart
    startTask.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveStart = resolve
      }),
    )

    const { wrapper } = await mountDetailView()
    await flushPromises()

    const startBtn = wrapper.findAll('button').find((b) => b.text().includes('Start work'))
    expect(startBtn).toBeDefined()
    expect(wrapper.text()).not.toContain('Complete')

    await startBtn.trigger('click')
    await nextTick()
    expect(startBtn.attributes('disabled')).toBeDefined()
    expect(startBtn.text()).toContain('Starting work...')

    resolveStart({ ...baseTask, status: 'In-Progress' })
    await flushPromises()

    expect(startTask).toHaveBeenCalledWith('task-uuid-1')
    expect(fetchTask).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.ns-badge--in-progress').text()).toBe('In-Progress')
    expect(wrapper.findAll('button').find((b) => b.text().includes('Start work'))).toBeUndefined()
  })

  it('shows conflict notice and refetches once when startTask returns 409', async () => {
    fetchTask
      .mockResolvedValueOnce({ ...baseTask, status: 'Submitted' })
      .mockResolvedValueOnce({ ...baseTask, status: 'In-Progress' })
    startTask.mockRejectedValueOnce({ response: { status: 409 } })

    const { wrapper } = await mountDetailView()
    await flushPromises()

    const startBtn = wrapper.findAll('button').find((b) => b.text().includes('Start work'))
    await startBtn.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('This task has already changed. Refreshing.')
    expect(fetchTask).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.ns-badge--in-progress').text()).toBe('In-Progress')
  })
})

describe('WorkerTaskDetailView — Defer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates 4-char and 301-char reasons without calling deferTask and accepts 5 and 300', async () => {
    fetchTask.mockResolvedValueOnce({ ...baseTask, status: 'In-Progress' })
    deferTask.mockResolvedValue({ id: 'task-uuid-1', status: 'Submitted', carry_forward_count: 1 })

    const { wrapper } = await mountDetailView()
    await flushPromises()

    await wrapper.findAll('button').find((b) => b.text() === 'Defer task').trigger('click')
    const textarea = wrapper.get('#defer-reason')
    const submitBtn = wrapper.get('button[type="submit"]')

    await textarea.setValue('abcd')
    expect(submitBtn.attributes('disabled')).toBeDefined()
    await wrapper.get('form').trigger('submit')
    expect(deferTask).not.toHaveBeenCalled()

    await textarea.setValue('a'.repeat(301))
    expect(submitBtn.attributes('disabled')).toBeDefined()
    await wrapper.get('form').trigger('submit')
    expect(deferTask).not.toHaveBeenCalled()

    await textarea.setValue('12345')
    expect(submitBtn.attributes('disabled')).toBeUndefined()
    await textarea.setValue('a'.repeat(300))
    expect(submitBtn.attributes('disabled')).toBeUndefined()
  })

  it('shows deferred panel on success without refetching or rendering defer payload as a task', async () => {
    fetchTask.mockResolvedValueOnce({ ...baseTask, status: 'Submitted' })
    deferTask.mockResolvedValueOnce({ id: 'task-uuid-1', status: 'Submitted', carry_forward_count: 2 })

    const { wrapper } = await mountDetailView()
    await flushPromises()

    await wrapper.findAll('button').find((b) => b.text() === 'Defer task').trigger('click')
    await wrapper.get('#defer-reason').setValue('Need drainage pump truck')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(deferTask).toHaveBeenCalledWith('task-uuid-1', 'Need drainage pump truck')
    expect(fetchTask).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Task deferred. It has been returned to the queue.')
    expect(wrapper.get('.worker-detail-deferred a[href="/worker"].btn').text()).toBe(
      'Back to my tasks',
    )
    expect(wrapper.find('.ns-badge').exists()).toBe(false)
  })

  it('maps 422 validation errors onto the Reason field and shows an error on 409', async () => {
    fetchTask.mockResolvedValueOnce({ ...baseTask, status: 'In-Progress' })
    deferTask
      .mockRejectedValueOnce({
        response: { status: 422, data: { detail: [{ loc: ['body', 'reason'], msg: 'Reason is too vague' }] } },
      })
      .mockRejectedValueOnce({ response: { status: 409, data: { detail: 'Already completed' } } })

    const { wrapper } = await mountDetailView()
    await flushPromises()

    await wrapper.findAll('button').find((b) => b.text() === 'Defer task').trigger('click')
    await wrapper.get('#defer-reason').setValue('Valid length reason')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('.invalid-feedback').text()).toBe('Reason is too vague')

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('.alert-danger').text()).toContain('Already completed')
  })
})

