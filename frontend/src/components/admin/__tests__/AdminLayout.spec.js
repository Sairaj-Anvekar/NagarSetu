import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { saveAuth } from '../../../utils/authStorage'
import { useAuthStore } from '../../../stores/auth'
import AdminLayout from '../AdminLayout.vue'

const DashboardPage = defineComponent(() => () => h('p', 'Dashboard child content'))
const ComplaintsPage = defineComponent(() => () => h('p', 'Complaints child content'))
const HotspotsPage = defineComponent(() => () => h('p', 'Hotspots child content'))
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
            { path: 'hotspots', name: 'admin-hotspots', component: HotspotsPage },
            { path: 'workers', name: 'admin-workers', component: WorkersPage },
            { path: 'complaints/:id', name: 'admin-complaint-detail', component: ComplaintsPage },
            { path: 'workers/new', name: 'admin-worker-new', component: WorkersPage },
          ],
        },
        { path: '/login', component: LoginPage },
      ],
    })
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.useRealTimers()
    localStorage.clear()
  })

  async function mountLayout(path = '/admin') {
    await router.push(path)
    await router.isReady()
    wrapper = mount(TestHost, { global: { plugins: [pinia, router] } })
    await flushPromises()
  }

  it.each([
    ['/admin', 'Dashboard'],
    ['/admin/complaints', 'Complaints'],
    ['/admin/complaints/123', 'Complaint details'],
    ['/admin/hotspots', 'Hotspots'],
    ['/admin/workers', 'Workers'],
    ['/admin/workers/new', 'Add worker'],
  ])('updates the breadcrumb title when navigating to %s', async (path, title) => {
    await mountLayout()
    await router.push(path)
    await flushPromises()
    expect(wrapper.get('.ns-admin-topbar__page').text()).toBe(`Admin / ${title}`)
  })

  it('shows the session department and a fallback when it is missing', async () => {
    await mountLayout()
    const pill = wrapper.get('.ns-admin-topbar__department')
    expect(pill.text()).toBe('Department unavailable')
    useAuthStore(pinia).user.department = { id: '1', name: 'Sanitation' }
    await flushPromises()
    expect(pill.text()).toBe('Sanitation')
  })

  it('shows the local date and refreshes it across midnight', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date(2026, 10, 17, 23, 59, 30))
    await mountLayout()
    const date = wrapper.get('.ns-admin-topbar time')
    expect(date.text()).toBe('Tue, 17 Nov')
    expect(date.attributes('datetime')).toBe('2026-11-17')
    await vi.advanceTimersByTimeAsync(60000)
    await flushPromises()
    expect(date.text()).toBe('Wed, 18 Nov')
    expect(date.attributes('datetime')).toBe('2026-11-18')
  })

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

  it('shows Dashboard, Complaints, Hotspots, and Workers links in the sidebar in order', async () => {
    await mountLayout()
    const links = wrapper.get('nav[aria-label="Admin navigation"]').findAll('a')

    expect(links.map((link) => link.text())).toEqual([
      'Dashboard',
      'Complaints',
      'Hotspots',
      'Workers',
    ])
    expect(links.map((link) => link.attributes('href'))).toEqual([
      '/admin',
      '/admin/complaints',
      '/admin/hotspots',
      '/admin/workers',
    ])
  })

  it('marks only the Hotspots page with aria-current="page" after navigating to Hotspots', async () => {
    await mountLayout()
    const nav = wrapper.get('nav[aria-label="Admin navigation"]')

    expect(nav.get('a[href="/admin"]').attributes('aria-current')).toBe('page')
    expect(nav.get('a[href="/admin/hotspots"]').attributes('aria-current')).toBeUndefined()

    await nav.get('a[href="/admin/hotspots"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/admin/hotspots')
    expect(nav.get('a[href="/admin/hotspots"]').attributes('aria-current')).toBe('page')
    expect(nav.get('a[href="/admin"]').attributes('aria-current')).toBeUndefined()
    expect(nav.get('a[href="/admin/complaints"]').attributes('aria-current')).toBeUndefined()
    expect(nav.get('a[href="/admin/workers"]').attributes('aria-current')).toBeUndefined()
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
    expect(nav.get('a[href="/admin/hotspots"]').attributes('aria-current')).toBeUndefined()
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
    expect(nav.get('a[href="/admin/hotspots"]').attributes('aria-current')).toBeUndefined()
    expect(nav.get('a[href="/admin/workers"]').attributes('aria-current')).toBeUndefined()
  })
})
