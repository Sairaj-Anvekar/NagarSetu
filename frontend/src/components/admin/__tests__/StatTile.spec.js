import { describe, it, expect } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import StatTile from '../StatTile.vue'

describe('StatTile', () => {
  it.each([
    ['Total', '/admin/complaints'],
    ['Submitted', '/admin/complaints?status=Submitted'],
    ['In-Progress', '/admin/complaints?status=In-Progress'],
    ['Completed', '/admin/complaints?status=Completed'],
    ['Overdue', '/admin/complaints?overdue=true'],
    ['Unassigned', '/admin/complaints?unassigned=true'],
  ])('renders %s as one navigable link', async (label, to) => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/admin/complaints', component: { template: '<div />' } }],
    })
    await router.push('/admin/complaints')
    await router.isReady()
    const wrapper = mount(StatTile, {
      props: { label, value: 5, to, icon: 'tasks' },
      global: { plugins: [router] },
    })
    expect(wrapper.element.tagName).toBe('A')
    expect(wrapper.attributes('href')).toBe(to)
    expect(wrapper.element.querySelector('a, button, input, [tabindex]')).toBeNull()
    expect(wrapper.get('.stat-tile__label').text()).toBe(label)
    expect(wrapper.get('.stat-tile__value').text()).toBe('5')
    expect(wrapper.get('.stat-tile__icon svg').attributes('aria-hidden')).toBe('true')
    await wrapper.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe(to)
    wrapper.unmount()
  })

  it.each(['overdue', 'unassigned'])('shows and clears the %s attention state', async (tone) => {
    const wrapper = mount(StatTile, {
      props: { label: tone, value: 3, tone, attention: true, hint: 'Needs attention' },
    })
    expect(wrapper.classes()).toContain(`stat-tile--${tone}`)
    expect(wrapper.classes()).toContain('stat-tile--attention')
    expect(wrapper.get('.stat-tile__hint').text()).toBe('Needs attention')
    await wrapper.setProps({ value: 0, attention: false, hint: 'All clear' })
    expect(wrapper.classes()).not.toContain('stat-tile--attention')
    expect(wrapper.get('.stat-tile__value').text()).toBe('0')
    expect(wrapper.get('.stat-tile__hint').text()).toBe('All clear')
    wrapper.unmount()
  })

  it('renders label and value', () => {
    const wrapper = mount(StatTile, {
      props: {
        label: 'Total',
        value: 42,
      },
    })

    const label = wrapper.find('.stat-tile__label')
    expect(label.exists()).toBe(true)
    expect(label.text()).toBe('Total')

    const value = wrapper.find('.stat-tile__value')
    expect(value.exists()).toBe(true)
    expect(value.text()).toBe('42')
  })

  it('renders 0 correctly when value is 0', () => {
    const wrapper = mount(StatTile, {
      props: {
        label: 'Overdue',
        value: 0,
      },
    })

    expect(wrapper.find('.stat-tile__value').text()).toBe('0')
  })

  it('renders optional hint when provided', () => {
    const wrapper = mount(StatTile, {
      props: {
        label: 'Overdue',
        value: 5,
        hint: 'Exceeded SLA deadline',
      },
    })

    const hint = wrapper.find('.stat-tile__hint')
    expect(hint.exists()).toBe(true)
    expect(hint.text()).toBe('Exceeded SLA deadline')
  })

  it('does not render hint element when hint prop is omitted', () => {
    const wrapper = mount(StatTile, {
      props: {
        label: 'Submitted',
        value: 12,
      },
    })

    expect(wrapper.find('.stat-tile__hint').exists()).toBe(false)
  })
})

