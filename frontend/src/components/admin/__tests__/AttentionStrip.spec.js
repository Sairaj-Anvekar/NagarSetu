import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AttentionStrip from '../AttentionStrip.vue'

async function mountStrip(props = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/admin/complaints', component: { template: '<div />' } }],
  })
  await router.push('/admin/complaints')
  await router.isReady()
  return mount(AttentionStrip, { props, global: { plugins: [router] } })
}

describe('AttentionStrip', () => {
  it.each([{}, { overdue: 0, unassigned: 0 }])('renders nothing for zero counts %j', async (props) => {
    const wrapper = await mountStrip(props)
    expect(wrapper.find('aside').exists()).toBe(false)
    expect(wrapper.findAll('a')).toHaveLength(0)
    wrapper.unmount()
  })

  it.each([
    ['overdue', 1, '1 complaint is overdue'],
    ['overdue', 5, '5 complaints are overdue'],
    ['unassigned', 1, '1 complaint is unassigned'],
    ['unassigned', 3, '3 complaints are unassigned'],
  ])('shows only the positive %s count %i', async (flag, count, message) => {
    const wrapper = await mountStrip({ [flag]: count })
    expect(wrapper.findAll('.attention-strip__item')).toHaveLength(1)
    expect(wrapper.get('.attention-strip__item > span').text()).toBe(message)
    expect(wrapper.findAll('svg')).toHaveLength(1)
    expect(wrapper.get('a').text()).toBe('Review')
    expect(wrapper.get('a').attributes('href')).toBe(`/admin/complaints?${flag}=true`)
    expect(wrapper.get('a').attributes('aria-label')).toBe(`Review ${flag} complaints`)
    wrapper.unmount()
  })

  it('shows both messages with separate filter destinations', async () => {
    const wrapper = await mountStrip({ overdue: 5, unassigned: 1 })
    expect(wrapper.get('aside').text()).toContain('5 complaints are overdue')
    expect(wrapper.get('aside').text()).toContain('1 complaint is unassigned')
    expect(wrapper.findAll('a').map((link) => link.attributes('href'))).toEqual([
      '/admin/complaints?overdue=true', '/admin/complaints?unassigned=true',
    ])
    wrapper.unmount()
  })
})
