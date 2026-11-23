import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import NeedsAttentionTable from '../NeedsAttentionTable.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Home</div>' } },
      {
        path: '/admin/complaints/:id',
        name: 'admin-complaint-detail',
        component: { template: '<div>Complaint Detail</div>' },
      },
    ],
  })
}

describe('NeedsAttentionTable', () => {
  const sampleItems = [
    {
      id: 'c1',
      tracking_code: 'SAN-001',
      category: 'Solid Waste & Garbage',
      zone: { id: 'z1', name: 'Zone A' },
      priority: 'critical',
      sla_deadline: '2026-11-23T06:00:00Z',
      assigned_worker: { id: 'w1', name: 'Ravi Patil' },
    },
    {
      id: 'c2',
      tracking_code: 'SAN-002',
      category: 'Drainage',
      zone: 'Zone B',
      priority: 'high',
      sla_deadline: '2026-11-23T08:00:00Z',
      assigned_worker: null,
    },
    {
      id: 'c3',
      tracking_code: 'SAN-003',
      category: 'Garbage Dump',
      zone: { id: 'z3', name: 'Zone C' },
      priority: 'medium',
      sla_deadline: '2026-11-23T09:00:00Z',
      assigned_worker: { id: 'w2', name: 'Anita Sharma' },
    },
    {
      id: 'c4',
      tracking_code: 'SAN-004',
      category: 'Street Cleaning',
      zone: 'Zone D',
      priority: 'low',
      sla_deadline: '2026-11-23T09:30:00Z',
      assigned_worker: null,
    },
    {
      id: 'c5',
      tracking_code: 'SAN-005',
      category: 'Extra Overflow',
      zone: 'Zone A',
      priority: 'high',
      sla_deadline: '2026-11-23T09:45:00Z',
      assigned_worker: null,
    },
  ]

  it('renders up to 4 rows even when more items are provided', () => {
    const router = createTestRouter()
    const wrapper = mount(NeedsAttentionTable, {
      props: {
        items: sampleItems,
        now: new Date('2026-11-23T10:00:00Z'),
      },
      global: { plugins: [router] },
    })

    const rows = wrapper.findAll('.needs-attention-row')
    expect(rows).toHaveLength(4)
  })

  it('renders tracking code link with correct route target', () => {
    const router = createTestRouter()
    const wrapper = mount(NeedsAttentionTable, {
      props: {
        items: sampleItems.slice(0, 1),
        now: new Date('2026-11-23T10:00:00Z'),
      },
      global: { plugins: [router] },
    })

    const link = wrapper.get('.needs-attention-link')
    expect(link.text()).toBe('SAN-001')
    expect(link.attributes('href')).toBe('/admin/complaints/c1')
  })

  it('renders priority chips with correct classes and labels', () => {
    const router = createTestRouter()
    const wrapper = mount(NeedsAttentionTable, {
      props: {
        items: sampleItems.slice(0, 4),
        now: new Date('2026-11-23T10:00:00Z'),
      },
      global: { plugins: [router] },
    })

    const chips = wrapper.findAll('.priority-chip')
    expect(chips[0].classes()).toContain('priority-chip--critical')
    expect(chips[0].text()).toBe('Critical')

    expect(chips[1].classes()).toContain('priority-chip--high')
    expect(chips[1].text()).toBe('High')

    expect(chips[2].classes()).toContain('priority-chip--medium')
    expect(chips[2].text()).toBe('Medium')

    expect(chips[3].classes()).toContain('priority-chip--low')
    expect(chips[3].text()).toBe('Low')
  })

  it('renders assigned worker name or unassigned pill', () => {
    const router = createTestRouter()
    const wrapper = mount(NeedsAttentionTable, {
      props: {
        items: sampleItems.slice(0, 2),
        now: new Date('2026-11-23T10:00:00Z'),
      },
      global: { plugins: [router] },
    })

    const rows = wrapper.findAll('.needs-attention-row')
    expect(rows[0].get('.worker-name').text()).toBe('Ravi Patil')
    expect(rows[1].get('.unassigned-pill').text()).toBe('Unassigned')
  })

  it('renders "No overdue complaints" when items list is empty', () => {
    const router = createTestRouter()
    const wrapper = mount(NeedsAttentionTable, {
      props: { items: [] },
      global: { plugins: [router] },
    })

    expect(wrapper.get('.needs-attention-empty td').text()).toBe('No overdue complaints')
  })

  it('renders loading indicator when loading is true', () => {
    const router = createTestRouter()
    const wrapper = mount(NeedsAttentionTable, {
      props: { loading: true },
      global: { plugins: [router] },
    })

    expect(wrapper.find('.needs-attention-loading').exists()).toBe(true)
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('renders error alert when error is provided', () => {
    const router = createTestRouter()
    const wrapper = mount(NeedsAttentionTable, {
      props: { error: 'Failed to fetch overdue complaints' },
      global: { plugins: [router] },
    })

    expect(wrapper.get('.needs-attention-error').text()).toBe(
      'Failed to fetch overdue complaints',
    )
    expect(wrapper.find('table').exists()).toBe(false)
  })
})
