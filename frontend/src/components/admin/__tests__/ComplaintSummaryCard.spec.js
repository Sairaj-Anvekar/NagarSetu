import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ComplaintSummaryCard from '../ComplaintSummaryCard.vue'

describe('ComplaintSummaryCard', () => {
  const baseComplaint = {
    id: 'c1',
    category: 'Potholes',
    zone: { id: 'z1', name: 'Zone B' },
    description: 'Deep road crater near roundabout',
    created_at: '2026-11-14T09:00:00Z',
    sla_deadline: '2026-11-14T18:00:00Z',
    is_overdue: false,
    status: 'In-Progress',
    latitude: 17.68,
    longitude: 75.88,
  }

  it('renders complaint description and 3-column facts', () => {
    const wrapper = mount(ComplaintSummaryCard, {
      props: { complaint: baseComplaint },
    })

    expect(wrapper.text()).toContain('Complaint Details')
    expect(wrapper.text()).toContain('Deep road crater near roundabout')
    expect(wrapper.text()).toContain('Potholes')
    expect(wrapper.text()).toContain('Zone B')
    expect(wrapper.text()).toContain('Sanitation')
  })

  it('renders overdue badge when overdue and not Completed', () => {
    const wrapper = mount(ComplaintSummaryCard, {
      props: {
        complaint: {
          ...baseComplaint,
          is_overdue: true,
          status: 'In-Progress',
        },
      },
    })

    expect(wrapper.find('.badge.bg-danger').exists()).toBe(true)
    expect(wrapper.find('.badge.bg-danger').text()).toBe('Overdue')
  })

  it('hides overdue badge when status is Completed', () => {
    const wrapper = mount(ComplaintSummaryCard, {
      props: {
        complaint: {
          ...baseComplaint,
          is_overdue: true,
          status: 'Completed',
        },
      },
    })

    expect(wrapper.find('.badge.bg-danger').exists()).toBe(false)
  })

  it('renders Google Maps link with rel="noopener noreferrer" without exposing raw coordinates', () => {
    const wrapper = mount(ComplaintSummaryCard, {
      props: { complaint: baseComplaint },
    })

    const mapLink = wrapper.find('a.ns-maps-link')
    expect(mapLink.exists()).toBe(true)
    expect(mapLink.attributes('target')).toBe('_blank')
    expect(mapLink.attributes('rel')).toContain('noopener')
    expect(mapLink.attributes('href')).toContain('https://www.google.com/maps/dir/')

    // Strict privacy constraint: raw numbers must never be displayed as visible text
    expect(wrapper.text()).not.toContain('17.68')
    expect(wrapper.text()).not.toContain('75.88')
  })

  it('omits Google Maps link when coordinates are null', () => {
    const wrapper = mount(ComplaintSummaryCard, {
      props: {
        complaint: {
          ...baseComplaint,
          latitude: null,
          longitude: null,
        },
      },
    })

    expect(wrapper.find('a.ns-maps-link').exists()).toBe(false)
  })
})
