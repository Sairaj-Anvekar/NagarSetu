import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CivicHallIllustration from '../CivicHallIllustration.vue'

describe('CivicHallIllustration', () => {
  it('renders the supplied civic hall as a decorative, non-focusable SVG', () => {
    const wrapper = mount(CivicHallIllustration)
    const svg = wrapper.get('svg.civic-hall')

    expect(svg.attributes('viewBox')).toBe('0 0 800 300')
    expect(svg.attributes('preserveAspectRatio')).toBe('xMidYMax meet')
    expect(svg.attributes('aria-hidden')).toBe('true')
    expect(svg.attributes('focusable')).toBe('false')
    expect(svg.findAll('rect[y="120"][height="96"]')).toHaveLength(6)
    expect(svg.get('circle').attributes('r')).toBe('9')
    wrapper.unmount()
  })
})
