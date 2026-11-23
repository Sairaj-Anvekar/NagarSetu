import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusTabs from '../StatusTabs.vue'

describe('StatusTabs', () => {
  it('renders all four status tabs with All selected by default when modelValue is empty', () => {
    const wrapper = mount(StatusTabs, {
      props: {
        modelValue: '',
      },
    })

    const buttons = wrapper.findAll('.status-tab')
    expect(buttons).toHaveLength(4)
    expect(buttons[0].text()).toContain('All')
    expect(buttons[1].text()).toContain('Submitted')
    expect(buttons[2].text()).toContain('In-Progress')
    expect(buttons[3].text()).toContain('Completed')

    expect(buttons[0].classes()).toContain('status-tab--active')
    expect(buttons[0].attributes('aria-selected')).toBe('true')
    expect(buttons[1].classes()).not.toContain('status-tab--active')
    expect(buttons[1].attributes('aria-selected')).toBe('false')
  })

  it('emits update:modelValue with corresponding status on click', async () => {
    const wrapper = mount(StatusTabs, {
      props: {
        modelValue: '',
      },
    })

    const buttons = wrapper.findAll('.status-tab')
    await buttons[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['Submitted'])

    await wrapper.setProps({ modelValue: 'Submitted' })
    await buttons[2].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toHaveLength(2)
    expect(wrapper.emitted('update:modelValue')[1]).toEqual(['In-Progress'])

    await wrapper.setProps({ modelValue: 'In-Progress' })
    await buttons[3].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toHaveLength(3)
    expect(wrapper.emitted('update:modelValue')[2]).toEqual(['Completed'])

    await wrapper.setProps({ modelValue: 'Completed' })
    await buttons[0].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toHaveLength(4)
    expect(wrapper.emitted('update:modelValue')[3]).toEqual([''])
  })

  it('renders count badges when counts prop is provided', () => {
    const wrapper = mount(StatusTabs, {
      props: {
        modelValue: 'Submitted',
        counts: {
          all: 19,
          submitted: 8,
          inProgress: 6,
          completed: 5,
        },
      },
    })

    const counts = wrapper.findAll('.status-tab__count')
    expect(counts).toHaveLength(4)
    expect(counts[0].text()).toBe('19')
    expect(counts[1].text()).toBe('8')
    expect(counts[2].text()).toBe('6')
    expect(counts[3].text()).toBe('5')

    // Second button ('Submitted') is active
    const buttons = wrapper.findAll('.status-tab')
    expect(buttons[1].classes()).toContain('status-tab--active')
  })

  it('supports snake_case keys in counts prop', () => {
    const wrapper = mount(StatusTabs, {
      props: {
        modelValue: '',
        counts: {
          total: 12,
          submitted: 4,
          in_progress: 5,
          completed: 3,
        },
      },
    })

    const counts = wrapper.findAll('.status-tab__count')
    expect(counts).toHaveLength(4)
    expect(counts[0].text()).toBe('12')
    expect(counts[1].text()).toBe('4')
    expect(counts[2].text()).toBe('5')
    expect(counts[3].text()).toBe('3')
  })

  it('omits count badges when counts prop is not provided', () => {
    const wrapper = mount(StatusTabs, {
      props: {
        modelValue: '',
      },
    })

    expect(wrapper.find('.status-tab__count').exists()).toBe(false)
  })
})
