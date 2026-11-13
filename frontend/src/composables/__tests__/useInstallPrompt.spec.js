import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useInstallPrompt } from '../useInstallPrompt'

const TestHost = defineComponent({
  setup() {
    const promptState = useInstallPrompt()
    return { ...promptState }
  },
  template: `
    <div>
      <span id="canInstall">{{ canInstall }}</span>
      <span id="isInstalled">{{ isInstalled }}</span>
      <span id="isIos">{{ isIos }}</span>
      <button id="installBtn" @click="install">Install</button>
    </div>
  `,
})

describe('useInstallPrompt composable', () => {
  let wrapper
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.restoreAllMocks()
    window.matchMedia = originalMatchMedia
    delete navigator.standalone
  })

  it('starts with canInstall false', () => {
    wrapper = mount(TestHost)
    expect(wrapper.vm.canInstall).toBe(false)
  })

  it('sets canInstall true and calls preventDefault when beforeinstallprompt fires', async () => {
    wrapper = mount(TestHost)
    expect(wrapper.vm.canInstall).toBe(false)

    const event = new Event('beforeinstallprompt')
    event.preventDefault = vi.fn()
    event.prompt = vi.fn()
    event.userChoice = Promise.resolve({ outcome: 'accepted' })

    window.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.canInstall).toBe(true)
  })

  it('calls prompt, awaits userChoice, and resets canInstall on install()', async () => {
    wrapper = mount(TestHost)

    let resolveChoice
    const userChoicePromise = new Promise((resolve) => {
      resolveChoice = resolve
    })

    const event = new Event('beforeinstallprompt')
    event.preventDefault = vi.fn()
    event.prompt = vi.fn()
    event.userChoice = userChoicePromise

    window.dispatchEvent(event)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.canInstall).toBe(true)

    const installPromise = wrapper.vm.install()
    expect(event.prompt).toHaveBeenCalledTimes(1)

    resolveChoice({ outcome: 'accepted' })
    await installPromise
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.canInstall).toBe(false)
  })

  it('sets isInstalled true and canInstall false when appinstalled fires', async () => {
    wrapper = mount(TestHost)

    const event = new Event('beforeinstallprompt')
    event.preventDefault = vi.fn()
    window.dispatchEvent(event)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.canInstall).toBe(true)

    window.dispatchEvent(new Event('appinstalled'))
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.isInstalled).toBe(true)
    expect(wrapper.vm.canInstall).toBe(false)
  })

  it('detects standalone mode via matchMedia', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    wrapper = mount(TestHost)
    expect(wrapper.vm.isInstalled).toBe(true)
  })

  it('detects standalone mode via navigator.standalone', () => {
    Object.defineProperty(navigator, 'standalone', {
      value: true,
      configurable: true,
      writable: true,
    })

    wrapper = mount(TestHost)
    expect(wrapper.vm.isInstalled).toBe(true)
  })

  it('detects iOS user agent', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
    )

    wrapper = mount(TestHost)
    expect(wrapper.vm.isIos).toBe(true)
  })

  it('removes window event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    wrapper = mount(TestHost)

    wrapper.unmount()

    expect(removeSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('appinstalled', expect.any(Function))
  })
})

