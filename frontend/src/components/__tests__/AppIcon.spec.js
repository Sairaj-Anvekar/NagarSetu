import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppIcon from '../AppIcon.vue'

describe('AppIcon', () => {
  it.each([
    'dashboard',
    'users',
    'menu',
    'logout',
    'chevron-down',
    'tasks',
    'history',
    'user',
  ])('renders %s as a decorative SVG at the default size', (name) => {
      const wrapper = mount(AppIcon, { props: { name } })
      const svg = wrapper.get('svg')

      expect(svg.attributes('aria-hidden')).toBe('true')
      expect(svg.attributes('focusable')).toBe('false')
      expect(svg.attributes('width')).toBe('20')
      expect(svg.attributes('height')).toBe('20')
      expect(svg.attributes('viewBox')).toBe('0 0 24 24')
      expect(svg.findAll('path, rect, circle').length).toBeGreaterThan(0)
    },
  )

  it('applies a custom size to both dimensions', () => {
    const wrapper = mount(AppIcon, { props: { name: 'menu', size: 32 } })

    expect(wrapper.get('svg').attributes('width')).toBe('32')
    expect(wrapper.get('svg').attributes('height')).toBe('32')
  })

  it('renders no SVG and does not throw for an unknown name', () => {
    let wrapper

    expect(() => {
      wrapper = mount(AppIcon, { props: { name: 'unknown' } })
    }).not.toThrow()
    expect(wrapper.find('svg').exists()).toBe(false)
  })
})
