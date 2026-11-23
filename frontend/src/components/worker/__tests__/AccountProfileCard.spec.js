import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AccountProfileCard from '../AccountProfileCard.vue'

describe('AccountProfileCard', () => {
  it('renders avatar with initials, worker name, and Field worker role chip', () => {
    const wrapper = mount(AccountProfileCard, {
      props: {
        name: 'Ravi Patil',
      },
    })

    expect(wrapper.get('.ns-worker-account__avatar').text()).toBe('RP')
    expect(wrapper.get('.ns-worker-account__name').text()).toBe('Ravi Patil')
    expect(wrapper.get('.ns-worker-account__role').text()).toBe('Field worker')
  })

  it('falls back to "Worker" and "W" when name is empty or missing', () => {
    const wrapper = mount(AccountProfileCard, {
      props: {
        name: '',
      },
    })

    expect(wrapper.get('.ns-worker-account__avatar').text()).toBe('W')
    expect(wrapper.get('.ns-worker-account__name').text()).toBe('Worker')
  })
})
