import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { saveAuth } from '../../../utils/authStorage'
import AdminLayout from '../AdminLayout.vue'

const DashboardPage = defineComponent(() => () => h('p', 'Dashboard child content'))
const ComplaintsPage = defineComponent(() => () => h('p', 'Complaints child content'))
const WorkersPage = defineComponent(() => () => h('p', 'Workers child content'))
const LoginPage = defineComponent(() => () => h('p', 'Login page'))
const TestHost = defineComponent(() => () => h(RouterView))

describe('AdminLayout', () => {
  let pinia
  let router
  let wrapper

  beforeEach(() => {
    localStorage.clear()
    saveAuth({
      token: 'admin-layout-test-token',
      role: 'admin',
      user: { id: '1', name: 'Demo Admin', role: 'admin' },
    })
    pinia = createPinia()
    setActivePinia(pinia)
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/admin',
          component: AdminLayout,
          children: [
            { path: '', name: 'admin', component: DashboardPage },
            { path: 'complaints', name: 'admin-complaints', component: ComplaintsPage },
            { path: 'workers', name: 'admin-workers', component: WorkersPage },
          ],
        },
        { path: '/login', component: LoginPage },
      ],
    })
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    localStorage.clear()
  })

  async function mountLayout(path = '/admin') {
    await router.push(path)
    await router.isReady()
    wrapper = mount(TestHost, { global: { plugins: [pinia, router] } })
    await flushPromises()
  }

  it('shows the admin name and initials in the top bar', async () => {
    await mountLayout()
    const topbar = wrapper.get('header.ns-admin-topbar')

    expect(topbar.get('.ns-admin-topbar__avatar').text()).toBe('DA')
    expect(topbar.get('#admin-user-menu').text()).toContain('Demo Admin')
    expect(topbar.get('#admin-user-menu').attributes('aria-label')).toBe('Demo Admin user menu')
    expect(topbar.get('.dropdown-header').text()).toContain('Demo Admin')
    expect(topbar.get('.dropdown-header').text()).toContain('Administrator')
  })

  it('falls back to Admin when the session user has no name', async () => {
    saveAuth({
      token: 'admin-layout-test-token',
      role: 'admin',
      user: { id: '1', role: 'admin' },
    })
    await mountLayout()
    const topbar = wrapper.get('header.ns-admin-topbar')

    expect(topbar.get('.ns-admin-topbar__avatar').text()).toBe('A')
    expect(topbar.get('#admin-user-menu').text()).toContain('Admin')
    expect(topbar.get('#admin-user-menu').attributes('aria-label')).toBe('Admin user menu')
    expect(topbar.get('.dropdown-header .fw-semibold').text()).toBe('Admin')
  })

  it.each([
    ['/admin', 'Dashboard child content'],
    ['/admin/workers', 'Workers child content'],
  ])('renders the child page for %s inside main', async (path, content) => {
    await mountLayout(path)

    expect(wrapper.get('main#admin-main').text()).toBe(content)
  })

  it('connects the menu button to the labelled sidebar', async () => {
    await mountLayout()
    const menuButton = wrapper.get('button[aria-label="Open menu"]')
    const sidebar = wrapper.get('aside#adminSidebar')

    expect(menuButton.attributes('aria-controls')).toBe('adminSidebar')
    expect(menuButton.attributes('data-bs-target')).toBe('#adminSidebar')
    expect(sidebar.attributes('id')).toBe('adminSidebar')
    expect(sidebar.attributes('aria-labelledby')).toBe('admin-sidebar-brand')
    expect(sidebar.get('#admin-sidebar-brand').text()).toBe('NagarSetu')
  })

  it('provides a skip link targeting the main content area', async () => {
    await mountLayout()
    const skipLink = wrapper.get('a[href="#admin-main"]')

    expect(skipLink.text()).toBe('Skip to content')
    expect(skipLink.attributes('href')).toBe('#admin-main')
    expect(wrapper.get('main#admin-main').attributes('tabindex')).toBe('-1')
  })

  it('clears the stored session and navigates to login when Log out is clicked', async () => {
    await mountLayout()
    expect(localStorage.getItem('nagarsetu_auth')).not.toBeNull()
    const logoutButton = wrapper.get('header.ns-admin-topbar button.dropdown-item')
    expect(logoutButton.text()).toBe('Log out')

    await logoutButton.trigger('click')
    await flushPromises()

    expect(localStorage.getItem('nagarsetu_auth')).toBeNull()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(wrapper.text()).toBe('Login page')
  })

  it('shows Dashboard, Complaints, and Workers links in the sidebar', async () => {
    await mountLayout()
    const links = wrapper.get('nav[aria-label="Admin navigation"]').findAll('a')

    expect(links.map((link) => link.text())).toEqual(['Dashboard', 'Complaints', 'Workers'])
    expect(links.map((link) => link.attributes('href'))).toEqual([
      '/admin',
      '/admin/complaints',
      '/admin/workers',
    ])
  })

  it('marks only the exact current page after navigating to Workers', async () => {
    await mountLayout()
    const nav = wrapper.get('nav[aria-label="Admin navigation"]')

    expect(nav.get('a[href="/admin"]').attributes('aria-current')).toBe('page')
    expect(nav.get('a[href="/admin/workers"]').attributes('aria-current')).toBeUndefined()

    await nav.get('a[href="/admin/workers"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/admin/workers')
    expect(nav.get('a[href="/admin/workers"]').attributes('aria-current')).toBe('page')
    expect(nav.get('a[href="/admin"]').attributes('aria-current')).toBeUndefined()
  })

  it('marks only the Complaints page with aria-current="page" after navigating to Complaints', async () => {
    await mountLayout()
    const nav = wrapper.get('nav[aria-label="Admin navigation"]')

    expect(nav.get('a[href="/admin"]').attributes('aria-current')).toBe('page')
    expect(nav.get('a[href="/admin/complaints"]').attributes('aria-current')).toBeUndefined()

    await nav.get('a[href="/admin/complaints"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/admin/complaints')
    expect(nav.get('a[href="/admin/complaints"]').attributes('aria-current')).toBe('page')
    expect(nav.get('a[href="/admin"]').attributes('aria-current')).toBeUndefined()
    expect(nav.get('a[href="/admin/workers"]').attributes('aria-current')).toBeUndefined()
  })
})
