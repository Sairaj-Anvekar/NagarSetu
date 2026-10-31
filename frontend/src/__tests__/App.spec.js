import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import router from '../router'
import App from '../App.vue'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the NagarSetu brand in the navbar', async () => {
    router.push('/login')
    await router.isReady()

    const wrapper = mount(App, { global: { plugins: [router, createPinia()] } })

    expect(wrapper.find('.navbar-brand').text()).toContain('NagarSetu')
  })
})