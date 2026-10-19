import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import router from '../router'
import App from '../App.vue'

describe('App', () => {
  it('renders the NagarSetu brand in the navbar', async () => {
    router.push('/login')
    await router.isReady()

    const wrapper = mount(App, { global: { plugins: [router] } })

    expect(wrapper.find('.navbar-brand').text()).toContain('NagarSetu')
  })
})