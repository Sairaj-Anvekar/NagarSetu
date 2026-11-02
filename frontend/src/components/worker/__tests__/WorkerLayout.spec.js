import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { saveAuth } from '../../../utils/authStorage'
import WorkerLayout from '../WorkerLayout.vue'

const TasksStub = defineComponent(() => () => h('p', 'Tasks child content'))
const HistoryStub = defineComponent(() => () => h('p', 'History child content'))
const AccountStub = defineComponent(() => () => h('p', 'Account child content'))
const LoginStub = defineComponent(() => () => h('p', 'Login page'))
const TestHost = defineComponent(() => () => h(RouterView))

describe('WorkerLayout', () => {
  let pinia
  let router
  let wrapper

  beforeEach(() => {
    localStorage.clear()
    saveAuth({
      token: 'worker-layout-test-token',
      role: 'worker',
      user: { id: '101', name: 'Ravi Patil', role: 'worker' },
    })
    pinia = createPinia()
    setActivePinia(pinia)
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/worker',
          component: WorkerLayout,
          children: [
            { path: '', name: 'worker', component: TasksStub },
            { path: 'history', name: 'worker-history', component: HistoryStub },
            { path: 'account', name: 'worker-account', component: AccountStub },
          ],
        },
        { path: '/login', component: LoginStub },
      ],
    })
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    localStorage.clear()
  })

  async function mountLayout(path = '/worker') {
    await router.push(path)
    await router.isReady()
    wrapper = mount(TestHost, { global: { plugins: [pinia, router] } })
    await flushPromises()
  }

  it('renders a skip link pointing to #worker-main', async () => {
    await mountLayout()
    const skipLink = wrapper.get('a.ns-worker-layout__skip')
    expect(skipLink.attributes('href')).toBe('#worker-main')
    expect(skipLink.text()).toBe('Skip to content')
  })

  it('renders the app bar showing NagarSetu and an svg brand mark', async () => {
    await mountLayout()
    const appBar = wrapper.get('header.ns-worker-app-bar')
    expect(appBar.text()).toContain('NagarSetu')
    expect(appBar.find('svg').exists()).toBe(true)
  })

  it('renders the child route inside main#worker-main', async () => {
    await mountLayout()
    const main = wrapper.get('main#worker-main')
    expect(main.text()).toContain('Tasks child content')
  })

  it('renders the tab bar nav with aria-label and exactly three links', async () => {
    await mountLayout()
    const nav = wrapper.get('nav[aria-label="Worker navigation"]')
    const links = nav.findAll('a')
    expect(links).toHaveLength(3)

    const labels = links.map((link) => link.text().trim())
    expect(labels).toEqual(['Tasks', 'History', 'Account'])
  })

  it('sets aria-current="page" on the active route and updates on navigation', async () => {
    await mountLayout('/worker')
    const nav = wrapper.get('nav[aria-label="Worker navigation"]')

    const tasksLink = nav.get('a[href="/worker"]')
    const historyLink = nav.get('a[href="/worker/history"]')
    const accountLink = nav.get('a[href="/worker/account"]')

    expect(tasksLink.attributes('aria-current')).toBe('page')
    expect(historyLink.attributes('aria-current')).toBeUndefined()
    expect(accountLink.attributes('aria-current')).toBeUndefined()

    await historyLink.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/worker/history')
    expect(historyLink.attributes('aria-current')).toBe('page')
    expect(tasksLink.attributes('aria-current')).toBeUndefined()
    expect(wrapper.get('main#worker-main').text()).toContain('History child content')
  })

  it('handles offline banner visibility based on window connectivity events', async () => {
    await mountLayout()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)

    window.dispatchEvent(new Event('offline'))
    await flushPromises()

    const banner = wrapper.get('[role="status"]')
    expect(banner.text()).toBe(
      'You are offline. NagarSetu needs an internet connection to load and update tasks.',
    )

    window.dispatchEvent(new Event('online'))
    await flushPromises()

    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })
})
