import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ComplaintAssignedWorkerCard from '../ComplaintAssignedWorkerCard.vue'

describe('ComplaintAssignedWorkerCard', () => {
  const baseComplaint = {
    id: 'c1',
    status: 'In-Progress',
    sla_deadline: '2026-11-14T18:00:00Z',
    is_overdue: false,
    carry_forward_count: 0,
    assigned_worker: {
      id: 'w1',
      name: 'Ramesh Patil',
    },
  }

  it('renders worker name, initials avatar, and Assignment header', () => {
    const wrapper = mount(ComplaintAssignedWorkerCard, {
      props: { complaint: baseComplaint },
    })

    expect(wrapper.text()).toContain('Assignment')
    expect(wrapper.text()).toContain('Ramesh Patil')
    expect(wrapper.find('.ns-worker-avatar').text()).toBe('RP')
  })

  it('renders deadline pill when complaint has deadline', () => {
    const now = new Date('2026-11-14T15:00:00Z').getTime() // 3h before 18:00
    const wrapper = mount(ComplaintAssignedWorkerCard, {
      props: { complaint: baseComplaint, now },
    })

    const pill = wrapper.find('.deadline-pill')
    expect(pill.exists()).toBe(true)
    expect(pill.text()).toBe('Due in 3 h')
  })

  it('renders Unassigned badge when assigned_worker is null', () => {
    const wrapper = mount(ComplaintAssignedWorkerCard, {
      props: {
        complaint: {
          ...baseComplaint,
          assigned_worker: null,
        },
      },
    })

    expect(wrapper.text()).toContain('Assignment')
    expect(wrapper.text()).toContain('Unassigned')
    expect(wrapper.find('.worker-unassigned-pill').exists()).toBe(true)
    expect(wrapper.find('.ns-worker-avatar').exists()).toBe(false)
  })

  it('renders "Deferred N times" badge only when carry_forward_count > 0', () => {
    const wrapper = mount(ComplaintAssignedWorkerCard, {
      props: {
        complaint: {
          ...baseComplaint,
          carry_forward_count: 2,
        },
      },
    })

    expect(wrapper.text()).toContain('Deferred 2 times')

    const zeroWrapper = mount(ComplaintAssignedWorkerCard, {
      props: {
        complaint: {
          ...baseComplaint,
          carry_forward_count: 0,
        },
      },
    })

    expect(zeroWrapper.text()).not.toContain('Deferred')
  })

  it('renders zone cleanly when assigned worker has object zone { id, name }', () => {
    const complaintWithWorkerZone = {
      ...baseComplaint,
      assigned_worker: {
        id: 'w1',
        name: 'Ramesh Patil',
        zone: { id: 'z1', name: 'Zone A' },
      },
    }

    const wrapper = mount(ComplaintAssignedWorkerCard, {
      props: { complaint: complaintWithWorkerZone },
    })

    expect(wrapper.text()).toContain('Zone A')
    expect(wrapper.text()).not.toContain('[object Object]')
    expect(wrapper.text()).not.toContain('{')
  })
})
