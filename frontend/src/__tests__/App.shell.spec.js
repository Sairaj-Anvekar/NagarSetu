import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '../App.vue'

const PageStub = defineComponent(() => () => h('p', 'Page content'))
const AdminShellStub = defineComponent(() => () => h('main', { id: 'admin-main' }, 'Admin content'))

describe('App shell navbar visibility', () => {
  let pinia
  let router
  let wrapper

  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', redirect: '/login' },
        { path: '/admin', component: AdminShellStub, meta: { noNavbar: true } },
        { path: '/login', component: PageStub },
      ],
    })
  })

  afterEach(() => {
    wrapper?.unmount()
    localStorage.clear()
  })

  it('uses the admin shell main landmark and preserves the main wrapper on login', async () => {
    await router.push('/admin')
    await router.isReady()
    wrapper = mount(App, { global: { plugins: [pinia, router] } })
    await flushPromises()

    expect(wrapper.findAll('main')).toHaveLength(1)
    expect(wrapper.get('main#admin-main').text()).toBe('Admin content')
    expect(wrapper.find('main main').exists()).toBe(false)

    await router.push('/login')
    await flushPromises()

    expect(wrapper.findAll('main')).toHaveLength(1)
    expect(wrapper.get('main').text()).toBe('Page content')
    expect(wrapper.find('#admin-main').exists()).toBe(false)
  })

  it('hides the navbar for noNavbar and restores it on a normal route', async () => {
    await router.push('/admin')
    await router.isReady()
    wrapper = mount(App, { global: { plugins: [pinia, router] } })
    await flushPromises()
    expect(wrapper.find('.navbar-brand').exists()).toBe(false)

    await router.push('/login')
    await flushPromises()
    expect(wrapper.get('.navbar-brand').text()).toBe('NagarSetu')

    await router.push('/admin')
    await flushPromises()
    expect(wrapper.find('.navbar-brand').exists()).toBe(false)
  })
})
