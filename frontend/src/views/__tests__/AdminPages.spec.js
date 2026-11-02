import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminView from '../AdminView.vue'
import AdminWorkersView from '../AdminWorkersView.vue'
import EmptyState from '../../components/EmptyState.vue'

describe('Admin placeholder pages', () => {
  it('renders the Dashboard heading and its empty state', () => {
    const wrapper = mount(AdminView)

    expect(wrapper.get('h1').text()).toBe('Dashboard')
    expect(wrapper.get('header p').text()).toBe('Overview of complaints and workers.')
    const emptyState = wrapper.getComponent(EmptyState)
    expect(emptyState.get('h3').text()).toBe('Dashboard metrics are on the way')
    expect(emptyState.get('p').text()).toBe(
      'Complaint totals, trends and hotspots will appear here.',
    )
  })

  it('renders the Workers heading and its empty state', () => {
    const wrapper = mount(AdminWorkersView)

    expect(wrapper.get('h1').text()).toBe('Workers')
    expect(wrapper.get('header p').text()).toBe('Manage field workers, their department and zone.')
    const emptyState = wrapper.getComponent(EmptyState)
    expect(emptyState.get('h3').text()).toBe('Worker management is coming next')
    expect(emptyState.get('p').text()).toBe(
      'You will be able to add workers and activate or deactivate them here.',
    )
  })
})
