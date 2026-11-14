import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AdminSidebar from '../AdminSidebar.vue'

describe('AdminSidebar', () => {
  let router

  beforeEach(async () => {
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
          path: '/admin/workers',
          name: 'admin-workers',
          component: { template: '<div>Workers</div>' },
        },
      ],
    })
    await router.push('/admin')
    await router.isReady()
  })

  it('renders a Complaints link pointing to /admin/complaints', () => {
    const wrapper = mount(AdminSidebar, {
      global: {
        plugins: [router],
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
        plugins: [router],
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
})
