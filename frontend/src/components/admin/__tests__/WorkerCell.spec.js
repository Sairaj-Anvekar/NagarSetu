import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import WorkerCell from '../WorkerCell.vue'

describe('WorkerCell', () => {
  it('renders avatar with initials and worker name when worker object is provided', () => {
    const wrapper = mount(WorkerCell, {
      props: {
        worker: { id: 'w1', name: 'Ravi Patil' },
      },
    })

    const avatar = wrapper.find('.worker-avatar')
    expect(avatar.exists()).toBe(true)
    expect(avatar.text()).toBe('RP')

    const name = wrapper.find('.worker-name')
    expect(name.exists()).toBe(true)
    expect(name.text()).toBe('Ravi Patil')

    expect(wrapper.find('.worker-unassigned-pill').exists()).toBe(false)
  })

  it('renders worker name when worker is passed as a string', () => {
    const wrapper = mount(WorkerCell, {
      props: {
        worker: 'Anita Sharma',
      },
    })

    expect(wrapper.find('.worker-avatar').text()).toBe('AS')
    expect(wrapper.find('.worker-name').text()).toBe('Anita Sharma')
  })

  it('renders amber "Unassigned" pill when worker is null', () => {
    const wrapper = mount(WorkerCell, {
      props: {
        worker: null,
      },
    })

    const pill = wrapper.find('.worker-unassigned-pill')
    expect(pill.exists()).toBe(true)
    expect(pill.text()).toBe('Unassigned')
    expect(wrapper.find('.worker-avatar').exists()).toBe(false)
  })

  it('renders amber "Unassigned" pill when worker name is empty or string "Unassigned"', () => {
    const wrapper = mount(WorkerCell, {
      props: {
        worker: { id: 'w0', name: '' },
      },
    })

    expect(wrapper.find('.worker-unassigned-pill').exists()).toBe(true)

    const wrapper2 = mount(WorkerCell, {
      props: {
        worker: 'Unassigned',
      },
    })

    expect(wrapper2.find('.worker-unassigned-pill').exists()).toBe(true)
  })
})
