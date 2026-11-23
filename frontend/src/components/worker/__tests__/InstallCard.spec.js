import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import InstallCard from '../InstallCard.vue'

const mockPromptState = {
  canInstall: ref(false),
  isInstalled: ref(false),
  isIos: ref(false),
  install: vi.fn(),
}

vi.mock('../../../composables/useInstallPrompt', () => ({
  useInstallPrompt: () => mockPromptState,
}))

describe('InstallCard', () => {
  beforeEach(() => {
    mockPromptState.canInstall.value = false
    mockPromptState.isInstalled.value = false
    mockPromptState.isIos.value = false
    mockPromptState.install.mockClear()
  })

  it('renders title, body instructions and white Install app button when canInstall is true', async () => {
    mockPromptState.canInstall.value = true

    const wrapper = mount(InstallCard)

    expect(wrapper.get('.ns-install-card__title').text()).toBe('Install NagarSetu')
    expect(wrapper.get('.ns-install-card__body').text()).toContain('Add the app to your home screen')

    const btn = wrapper.get('.ns-worker-account__install-btn')
    expect(btn.text()).toBe('Install app')

    await btn.trigger('click')
    expect(mockPromptState.install).toHaveBeenCalledTimes(1)
  })

  it('shows App installed status when isInstalled is true', () => {
    mockPromptState.isInstalled.value = true

    const wrapper = mount(InstallCard)

    expect(wrapper.get('.ns-worker-account__installed-text').text()).toContain('App installed')
    expect(wrapper.find('.ns-worker-account__install-btn').exists()).toBe(false)
  })

  it('shows iPhone hint when isIos is true and not installed', () => {
    mockPromptState.isIos.value = true
    mockPromptState.isInstalled.value = false

    const wrapper = mount(InstallCard)

    expect(wrapper.get('.ns-worker-account__ios-hint').text()).toContain(
      'On iPhone: tap Share, then Add to Home Screen.'
    )
    expect(wrapper.find('.ns-worker-account__install-btn').exists()).toBe(false)
  })

  it('renders nothing when canInstall, isInstalled, and isIos are all false', () => {
    mockPromptState.canInstall.value = false
    mockPromptState.isInstalled.value = false
    mockPromptState.isIos.value = false

    const wrapper = mount(InstallCard)

    expect(wrapper.find('.ns-install-card').exists()).toBe(false)
  })
})
