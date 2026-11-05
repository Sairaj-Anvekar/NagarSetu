import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useOnlineStatus } from '../useOnlineStatus'

const TestHost = defineComponent({
  setup() {
    const { isOnline } = useOnlineStatus()
    return { isOnline }
  },
  template: '<span id="status">{{ isOnline ? "online" : "offline" }}</span>',
})

describe('useOnlineStatus composable', () => {
  let wrapper

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.restoreAllMocks()
  })

  it('starts true when navigator.onLine is true', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    wrapper = mount(TestHost)

    expect(wrapper.get('#status').text()).toBe('online')
    expect(wrapper.vm.isOnline).toBe(true)
  })

  it('starts false when navigator.onLine is false', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    wrapper = mount(TestHost)

    expect(wrapper.get('#status').text()).toBe('offline')
    expect(wrapper.vm.isOnline).toBe(false)
  })

  it('flips value when window offline and online events are dispatched', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    wrapper = mount(TestHost)

    expect(wrapper.vm.isOnline).toBe(true)

    window.dispatchEvent(new Event('offline'))
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.isOnline).toBe(false)
    expect(wrapper.get('#status').text()).toBe('offline')

    window.dispatchEvent(new Event('online'))
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.isOnline).toBe(true)
    expect(wrapper.get('#status').text()).toBe('online')
  })

  it('removes window event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    wrapper = mount(TestHost)

    wrapper.unmount()

    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function))
  })
})
