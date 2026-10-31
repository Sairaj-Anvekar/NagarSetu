import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BrandMark from '../BrandMark.vue'

describe('BrandMark', () => {
  it('renders an svg with width and height 28 by default and has aria-hidden="true"', () => {
    const wrapper = mount(BrandMark)
    const svg = wrapper.find('svg')

    expect(svg.exists()).toBe(true)
    expect(svg.attributes('width')).toBe('28')
    expect(svg.attributes('height')).toBe('28')
    expect(svg.attributes('aria-hidden')).toBe('true')
  })

  it('renders with custom size when size prop is passed', () => {
    const wrapper = mount(BrandMark, {
      props: { size: 40 },
    })
    const svg = wrapper.find('svg')

    expect(svg.attributes('width')).toBe('40')
    expect(svg.attributes('height')).toBe('40')
  })
})
