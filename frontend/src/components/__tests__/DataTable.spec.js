import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DataTable from '../DataTable.vue'

describe('DataTable', () => {
  const sampleColumns = [
    { key: 'code', label: 'Grievance Code' },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status' },
  ]

  const sampleRows = [
    { id: 1, code: 'GRV-001', category: 'Sanitation', status: 'Submitted' },
    { id: 2, code: 'GRV-002', category: 'Water Supply', status: 'In-Progress' },
  ]

  it('renders one header cell per column and one body row per row', () => {
    const wrapper = mount(DataTable, {
      props: {
        columns: sampleColumns,
        rows: sampleRows,
      },
    })

    const headers = wrapper.findAll('thead th')
    expect(headers).toHaveLength(3)
    expect(headers[0].text()).toBe('Grievance Code')
    expect(headers[1].text()).toBe('Category')
    expect(headers[2].text()).toBe('Status')

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
  })

  it('renders default cell content showing row[key]', () => {
    const wrapper = mount(DataTable, {
      props: {
        columns: sampleColumns,
        rows: sampleRows,
      },
    })

    const firstRowCells = wrapper.findAll('tbody tr:first-child td')
    expect(firstRowCells[0].text()).toBe('GRV-001')
    expect(firstRowCells[1].text()).toBe('Sanitation')
    expect(firstRowCells[2].text()).toBe('Submitted')
  })

  it('overrides a cell using the cell-<key> scoped slot receiving row and value', () => {
    const wrapper = mount(DataTable, {
      props: {
        columns: sampleColumns,
        rows: sampleRows,
      },
      slots: {
        'cell-status': `
          <template #cell-status="{ row, value }">
            <span class="custom-badge">{{ row.code }}: {{ value }}</span>
          </template>
        `,
      },
    })

    const customBadges = wrapper.findAll('.custom-badge')
    expect(customBadges).toHaveLength(2)
    expect(customBadges[0].text()).toBe('GRV-001: Submitted')
    expect(customBadges[1].text()).toBe('GRV-002: In-Progress')
  })

  it('shows loading spinner with role="status" and no table when loading is true', () => {
    const wrapper = mount(DataTable, {
      props: {
        columns: sampleColumns,
        rows: sampleRows,
        loading: true,
      },
    })

    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('shows error alert with role="alert" and no table when error is set', () => {
    const wrapper = mount(DataTable, {
      props: {
        columns: sampleColumns,
        rows: sampleRows,
        error: 'Failed to fetch complaints',
      },
    })

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to fetch complaints')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('emits retry when clicking "Try again" in error alert', async () => {
    const wrapper = mount(DataTable, {
      props: {
        columns: sampleColumns,
        rows: sampleRows,
        error: 'Failed to fetch complaints',
      },
    })

    const retryButton = wrapper.find('button')
    expect(retryButton.exists()).toBe(true)
    expect(retryButton.text()).toBe('Try again')

    await retryButton.trigger('click')

    expect(wrapper.emitted('retry')).toBeTruthy()
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('shows emptyMessage and no table when rows is empty', () => {
    const wrapper = mount(DataTable, {
      props: {
        columns: sampleColumns,
        rows: [],
        emptyMessage: 'No grievances match your filter.',
      },
    })

    expect(wrapper.text()).toContain('No grievances match your filter.')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('gives loading priority over error', () => {
    const wrapper = mount(DataTable, {
      props: {
        columns: sampleColumns,
        rows: sampleRows,
        loading: true,
        error: 'Failed to load',
      },
    })

    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.find('table').exists()).toBe(false)
  })
})
