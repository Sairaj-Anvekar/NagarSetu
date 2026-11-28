import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AdminSidebar from '../AdminSidebar.vue'
import { useAuthStore } from '../../../stores/auth'
import { useTriageBadgeStore } from '../../../stores/triageBadge'

describe('AdminSidebar', () => {
  let router
  let pinia

  beforeEach(async () => {
    localStorage.clear()
    pinia = createPinia()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/admin', name: 'admin', component: { template: '<div>Dashboard</div>' } },
        {
          path: '/admin/complaints',
          name: 'admin-complaints',
          component: { template: '<div>Complaints</div>' },
        },
        {
          path: '/admin/triage',
          name: 'admin-triage',
          component: { template: '<div>Triage</div>' },
        },
        {
          path: '/admin/hotspots',
          name: 'admin-hotspots',
          component: { template: '<div>Hotspots</div>' },
        },
        {
          path: '/admin/workers',
          name: 'admin-workers',
          component: { template: '<div>Workers</div>' },
        },
      ],
    })
    await router.push('/admin')
    await router.isReady()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('groups exactly five ordered links under non-link section labels', () => {
    const wrapper = mount(AdminSidebar, { global: { plugins: [pinia, router] } })
    const nav = wrapper.get('nav[aria-label="Admin navigation"]')
    const labels = nav.findAll('.ns-admin-sidebar__section-label')
    expect(labels.map((label) => label.text())).toEqual(['Overview', 'Manage'])
    labels.forEach((label) => {
      expect(label.element.closest('a')).toBeNull()
      expect(label.find('a').exists()).toBe(false)
    })
    expect(labels[0].element.nextElementSibling.textContent.trim()).toBe('Dashboard')
    expect(nav.findAll('a').map((link) => [link.text(), link.attributes('href')])).toEqual([
      ['Dashboard', '/admin'],
      ['Complaints', '/admin/complaints'],
      ['Triage', '/admin/triage'],
      ['Hotspots', '/admin/hotspots'],
      ['Workers', '/admin/workers'],
    ])
    wrapper.unmount()
  })

  it('shows the admin identity and department in the user card', () => {
    const auth = useAuthStore(pinia)
    auth.user = { name: '  Demo Admin  ', department: { id: '1', name: 'Sanitation' } }
    const wrapper = mount(AdminSidebar, { global: { plugins: [pinia, router] } })
    const card = wrapper.get('.ns-admin-sidebar__user')
    expect(card.get('.ns-admin-sidebar__avatar').text()).toBe('DA')
    expect(card.get('.fw-semibold').text()).toBe('Demo Admin')
    expect(card.get('.ns-admin-sidebar__caption').text()).toBe('Sanitation')
    wrapper.unmount()
  })

  it('shows honest fallbacks for missing identity fields', () => {
    useAuthStore(pinia).user = { name: ' ', department: { name: ' ' } }
    const wrapper = mount(AdminSidebar, { global: { plugins: [pinia, router] } })
    const card = wrapper.get('.ns-admin-sidebar__user')
    expect(card.get('.ns-admin-sidebar__avatar').text()).toBe('A')
    expect(card.get('.fw-semibold').text()).toBe('Admin')
    expect(card.get('.ns-admin-sidebar__caption').text()).toBe('Department unavailable')
    wrapper.unmount()
  })

  it('renders a Complaints link pointing to /admin/complaints', () => {
    const wrapper = mount(AdminSidebar, {
      global: {
        plugins: [pinia, router],
      },
    })

    const links = wrapper.findAll('.ns-admin-sidebar__link')
    const complaintsLink = links.find((link) => link.text().includes('Complaints'))

    expect(complaintsLink).toBeDefined()
    expect(complaintsLink.attributes('href')).toBe('/admin/complaints')
  })

  it('sets aria-current="page" on the Complaints link when active on that route', async () => {
    await router.push('/admin/complaints')
    await flushPromises()

    const wrapper = mount(AdminSidebar, {
      global: {
        plugins: [pinia, router],
      },
    })

    const complaintsLink = wrapper
      .findAll('.ns-admin-sidebar__link')
      .find((link) => link.text().includes('Complaints'))

    expect(complaintsLink.attributes('aria-current')).toBe('page')

    const dashboardLink = wrapper
      .findAll('.ns-admin-sidebar__link')
      .find((link) => link.text().includes('Dashboard'))

    expect(dashboardLink.attributes('aria-current')).toBeUndefined()
  })

  it('renders a Hotspots link pointing to /admin/hotspots', () => {
    const wrapper = mount(AdminSidebar, {
      global: {
        plugins: [pinia, router],
      },
    })

    const links = wrapper.findAll('.ns-admin-sidebar__link')
    const hotspotsLink = links.find((link) => link.text().includes('Hotspots'))

    expect(hotspotsLink).toBeDefined()
    expect(hotspotsLink.attributes('href')).toBe('/admin/hotspots')
  })

  it('sets aria-current="page" on the Hotspots link when active on that route', async () => {
    await router.push('/admin/hotspots')
    await flushPromises()

    const wrapper = mount(AdminSidebar, {
      global: {
        plugins: [pinia, router],
      },
    })

    const hotspotsLink = wrapper
      .findAll('.ns-admin-sidebar__link')
      .find((link) => link.text().includes('Hotspots'))

    expect(hotspotsLink.attributes('aria-current')).toBe('page')

    const dashboardLink = wrapper
      .findAll('.ns-admin-sidebar__link')
      .find((link) => link.text().includes('Dashboard'))

    expect(dashboardLink.attributes('aria-current')).toBeUndefined()
  })

  it('renders a Triage link pointing to /admin/triage', () => {
    const wrapper = mount(AdminSidebar, { global: { plugins: [pinia, router] } })
    const links = wrapper.findAll('.ns-admin-sidebar__link')
    const triageLink = links.find((link) => link.text().includes('Triage'))

    expect(triageLink).toBeDefined()
    expect(triageLink.attributes('href')).toBe('/admin/triage')
  })

  it('sets aria-current="page" on the Triage link when active on that route', async () => {
    await router.push('/admin/triage')
    await flushPromises()

    const wrapper = mount(AdminSidebar, { global: { plugins: [pinia, router] } })
    const triageLink = wrapper
      .findAll('.ns-admin-sidebar__link')
      .find((link) => link.text().includes('Triage'))

    expect(triageLink.attributes('aria-current')).toBe('page')

    const dashboardLink = wrapper
      .findAll('.ns-admin-sidebar__link')
      .find((link) => link.text().includes('Dashboard'))
    expect(dashboardLink.attributes('aria-current')).toBeUndefined()
  })

  it('shows the triage count badge when pending_triage > 0', () => {
    const store = useTriageBadgeStore(pinia)
    store.setPendingCount(5)

    const wrapper = mount(AdminSidebar, { global: { plugins: [pinia, router] } })
    const badge = wrapper.find('[data-test="triage-badge"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('5')
  })

  it('hides the triage count badge when pending_triage is 0', () => {
    const store = useTriageBadgeStore(pinia)
    store.setPendingCount(0)

    const wrapper = mount(AdminSidebar, { global: { plugins: [pinia, router] } })
    const badge = wrapper.find('[data-test="triage-badge"]')
    expect(badge.exists()).toBe(false)
  })

  it('displays the full name without early truncation in the user card', () => {
    const auth = useAuthStore(pinia)
    auth.user = {
      name: 'Sanitation Administrator Special Operations',
      department: { id: '1', name: 'Sanitation' },
    }
    const wrapper = mount(AdminSidebar, { global: { plugins: [pinia, router] } })
    const userCard = wrapper.get('.ns-admin-sidebar__user')
    expect(userCard.get('.fw-semibold').text()).toBe(
      'Sanitation Administrator Special Operations',
    )
    wrapper.unmount()
  })

  it('resolves string and object department values via labelOf', () => {
    const auth = useAuthStore(pinia)
    auth.user = {
      name: 'Admin User',
      department: 'Solid Waste Management',
    }
    const wrapper = mount(AdminSidebar, { global: { plugins: [pinia, router] } })
    const userCard = wrapper.get('.ns-admin-sidebar__user')
    expect(userCard.get('.ns-admin-sidebar__caption').text()).toBe('Solid Waste Management')
    wrapper.unmount()
  })

  it('has accessible aria-labels on the user card and Log out button', () => {
    const auth = useAuthStore(pinia)
    auth.user = { name: 'Demo Admin', department: { name: 'Sanitation' } }
    const wrapper = mount(AdminSidebar, { global: { plugins: [pinia, router] } })
    const userCard = wrapper.get('.ns-admin-sidebar__user')
    expect(userCard.attributes('aria-label')).toBe('User profile: Demo Admin')
    const logoutBtn = wrapper.get('button.ns-admin-sidebar__logout')
    expect(logoutBtn.attributes('aria-label')).toBe('Log out')
    expect(logoutBtn.text()).toContain('Log out')
    wrapper.unmount()
  })

  it('clears auth session and navigates to login when Log out is clicked', async () => {
    router.addRoute({ path: '/login', component: { template: '<div>Login</div>' } })
    const auth = useAuthStore(pinia)
    auth.token = 'admin-token'
    auth.role = 'admin'
    auth.user = { id: '1', name: 'Demo Admin', role: 'admin' }
    const wrapper = mount(AdminSidebar, { global: { plugins: [pinia, router] } })
    const logoutBtn = wrapper.get('button.ns-admin-sidebar__logout')

    await logoutBtn.trigger('click')
    await flushPromises()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
    expect(router.currentRoute.value.path).toBe('/login')
    wrapper.unmount()
  })
})
