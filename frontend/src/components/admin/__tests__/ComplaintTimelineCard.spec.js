import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ComplaintTimelineCard from '../ComplaintTimelineCard.vue'

describe('ComplaintTimelineCard', () => {
  const baseComplaint = {
    id: 'c1',
    status: 'In-Progress',
    created_at: '2026-11-14T09:00:00Z',
    logs: [
      {
        event_type: 'created',
        actor_type: 'citizen',
        created_at: '2026-11-14T09:00:00Z',
      },
      {
        event_type: 'assigned',
        actor_type: 'admin',
        created_at: '2026-11-14T10:00:00Z',
      },
      {
        event_type: 'started',
        actor_type: 'worker',
        created_at: '2026-11-14T11:00:00Z',
      },
    ],
  }

  it('renders all 3 steps with proper progression', () => {
    const wrapper = mount(ComplaintTimelineCard, {
      props: { complaint: baseComplaint },
    })

    const steps = wrapper.findAll('.ns-stepper-step')
    expect(steps).toHaveLength(3)

    // In-Progress status: Submitted is done, In-Progress is current, Completed is future
    expect(steps[0].classes()).toContain('ns-stepper-step--done')
    expect(steps[0].find('.ns-check-icon').exists()).toBe(true)

    expect(steps[1].classes()).toContain('ns-stepper-step--current')
    expect(steps[1].find('.ns-current-indicator').exists()).toBe(true)

    expect(steps[2].classes()).toContain('ns-stepper-step--future')
  })

  it('renders step timestamps and textual state labels so meaning is not by colour alone', () => {
    const wrapper = mount(ComplaintTimelineCard, {
      props: { complaint: baseComplaint },
    })

    expect(wrapper.text()).toContain('Submitted')
    expect(wrapper.text()).toContain('In-Progress')
    expect(wrapper.text()).toContain('Completed')

    expect(wrapper.text()).toContain('Done')
    expect(wrapper.text()).toContain('In progress')
    expect(wrapper.text()).toContain('Pending')
  })

  it('renders chronological status history entries when logs exist', () => {
    const wrapper = mount(ComplaintTimelineCard, {
      props: { complaint: baseComplaint },
    })

    expect(wrapper.text()).toContain('Status history')
    const listItems = wrapper.findAll('.timeline-list li')
    expect(listItems).toHaveLength(3)

    expect(listItems[0].text()).toContain('Submitted')
    expect(listItems[0].text()).toContain('by Citizen')

    expect(listItems[1].text()).toContain('Assigned')
    expect(listItems[1].text()).toContain('by Administrator')

    expect(listItems[2].text()).toContain('Work started')
    expect(listItems[2].text()).toContain('by Worker')
  })

  it('omits timeline-list when logs array is empty', () => {
    const wrapper = mount(ComplaintTimelineCard, {
      props: {
        complaint: {
          ...baseComplaint,
          logs: [],
        },
      },
    })

    expect(wrapper.find('.timeline-list').exists()).toBe(false)
  })
})
