import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CategoryPicker from '../CategoryPicker.vue'
import { TRIAGE_CATEGORIES } from '../../../constants/triageCategories'

describe('CategoryPicker', () => {
  it('renders all six categories with department names and appropriate team chips', () => {
    const wrapper = mount(CategoryPicker, {
      props: {
        modelValue: 'Solid Waste & Garbage',
        adminDepartment: 'Sanitation',
      },
    })

    const options = wrapper.findAll('.ns-category-option')
    expect(options).toHaveLength(6)

    TRIAGE_CATEGORIES.forEach((cat, index) => {
      const option = options[index]
      expect(option.text()).toContain(cat.category)
      expect(option.text()).toContain(cat.department)
      if (cat.department === 'Sanitation') {
        expect(option.find('.ns-team-chip--own').exists()).toBe(true)
        expect(option.text()).toContain('Your team')
      } else {
        expect(option.find('.ns-team-chip--move').exists()).toBe(true)
        expect(option.text()).toContain('Moves team')
      }
    })
  })

  it('indicates selected category with aria-checked="true" and selected class', () => {
    const wrapper = mount(CategoryPicker, {
      props: {
        modelValue: 'Potholes & Road Damage',
      },
    })

    const selectedOption = wrapper.find('.ns-category-option--selected')
    expect(selectedOption.exists()).toBe(true)
    expect(selectedOption.text()).toContain('Potholes & Road Damage')
    expect(selectedOption.attributes('aria-checked')).toBe('true')
  })

  it('emits update:modelValue when an option is clicked or triggered via keyboard', async () => {
    const wrapper = mount(CategoryPicker, {
      props: {
        modelValue: 'Solid Waste & Garbage',
      },
    })

    const options = wrapper.findAll('.ns-category-option')
    await options[1].trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['Potholes & Road Damage'])

    await options[3].trigger('keydown.enter')
    expect(wrapper.emitted('update:modelValue')[1]).toEqual(['Streetlight'])
  })

  it('prevents selection when disabled', async () => {
    const wrapper = mount(CategoryPicker, {
      props: {
        modelValue: 'Solid Waste & Garbage',
        disabled: true,
      },
    })

    const options = wrapper.findAll('.ns-category-option')
    await options[1].trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })
})
