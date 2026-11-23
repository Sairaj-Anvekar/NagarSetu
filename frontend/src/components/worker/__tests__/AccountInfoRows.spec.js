import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AccountInfoRows from '../AccountInfoRows.vue'

describe('AccountInfoRows', () => {
  it('renders Department, Zone, and masked phone when all values are present', () => {
    const wrapper = mount(AccountInfoRows, {
      props: {
        department: 'Solid Waste Management',
        zone: 'Zone A',
        phone: '+919876543210',
      },
    })

    const text = wrapper.text()
    expect(text).toContain('Department')
    expect(text).toContain('Solid Waste Management')
    expect(text).toContain('Zone')
    expect(text).toContain('Zone A')
    expect(text).toContain('Phone')
    expect(text).toContain('+91 ••••• 43210')

    // Verifies full raw phone number is NEVER shown
    expect(text).not.toContain('9876543210')
  })

  it('omits rows conditionally when fields are missing or empty', () => {
    const wrapper = mount(AccountInfoRows, {
      props: {
        department: 'Solid Waste Management',
        zone: '',
        phone: '',
      },
    })

    expect(wrapper.text()).toContain('Department')
    expect(wrapper.text()).not.toContain('Zone')
    expect(wrapper.text()).not.toContain('Phone')
  })

  it('handles department and zone passed as objects { id, name }', () => {
    const wrapper = mount(AccountInfoRows, {
      props: {
        department: { id: 'd1', name: 'Water Supply Board' },
        zone: { id: 'z2', name: 'Zone B' },
      },
    })

    expect(wrapper.text()).toContain('Water Supply Board')
    expect(wrapper.text()).toContain('Zone B')
  })

  it('renders nothing when no data is provided', () => {
    const wrapper = mount(AccountInfoRows, {
      props: {
        department: '',
        zone: '',
        phone: '',
      },
    })

    expect(wrapper.find('.ns-account-info-card').exists()).toBe(false)
  })
})
