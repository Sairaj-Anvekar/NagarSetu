import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ComplaintPhotoCard from '../ComplaintPhotoCard.vue'

describe('ComplaintPhotoCard', () => {
  describe('Citizen photo variant', () => {
    it('renders citizen photo with open full size link', () => {
      const wrapper = mount(ComplaintPhotoCard, {
        props: {
          variant: 'citizen',
          photoUrl: 'https://storage.local/citizen-pic.jpg',
        },
      })

      expect(wrapper.text()).toContain('Photo from citizen')
      const img = wrapper.get('img[alt="Citizen photo"]')
      expect(img.attributes('src')).toBe('https://storage.local/citizen-pic.jpg')

      const link = wrapper.get('a.citizen-photo-link')
      expect(link.attributes('href')).toBe('https://storage.local/citizen-pic.jpg')
      expect(link.attributes('target')).toBe('_blank')
      expect(link.attributes('rel')).toContain('noopener')
    })

    it('shows fallback text when citizen photo fails to load', async () => {
      const wrapper = mount(ComplaintPhotoCard, {
        props: {
          variant: 'citizen',
          photoUrl: 'https://storage.local/broken-citizen.jpg',
        },
      })

      const img = wrapper.get('img[alt="Citizen photo"]')
      await img.trigger('error')

      expect(wrapper.find('img[alt="Citizen photo"]').exists()).toBe(false)
      expect(wrapper.text()).toContain('Photo unavailable. Reload the page to get a fresh link.')
    })
  })

  describe('Resolution photo variant', () => {
    const resolutionData = {
      note: 'Road cleared and leveled.',
      photo_url: 'https://storage.local/resolved-site.jpg',
      completed_at: '2026-11-14T16:30:00Z',
      worker: { id: 'w1', name: 'Sunil Jadhav' },
    }

    it('renders resolution note, worker, and evidence photo when completed', () => {
      const wrapper = mount(ComplaintPhotoCard, {
        props: {
          variant: 'resolution',
          isCompleted: true,
          photoUrl: resolutionData.photo_url,
          resolution: resolutionData,
        },
      })

      expect(wrapper.text()).toContain('Resolution')
      expect(wrapper.text()).toContain('Resolution note')
      expect(wrapper.text()).toContain('Road cleared and leveled.')
      expect(wrapper.text()).toContain('Sunil Jadhav')

      const img = wrapper.get('img[alt="Resolution photo"]')
      expect(img.attributes('src')).toBe('https://storage.local/resolved-site.jpg')

      const link = wrapper.get('a.resolution-photo-link')
      expect(link.attributes('href')).toBe('https://storage.local/resolved-site.jpg')
      expect(link.attributes('target')).toBe('_blank')
      expect(link.attributes('rel')).toContain('noopener')
    })

    it('shows fallback text when resolution photo fails to load', async () => {
      const wrapper = mount(ComplaintPhotoCard, {
        props: {
          variant: 'resolution',
          isCompleted: true,
          photoUrl: 'https://storage.local/broken-resolution.jpg',
          resolution: {
            ...resolutionData,
            photo_url: 'https://storage.local/broken-resolution.jpg',
          },
        },
      })

      const img = wrapper.get('img[alt="Resolution photo"]')
      await img.trigger('error')

      expect(wrapper.find('img[alt="Resolution photo"]').exists()).toBe(false)
      expect(wrapper.text()).toContain('Photo unavailable. Reload the page to get a fresh link.')
      // Resolution note remains visible even if photo fails
      expect(wrapper.text()).toContain('Road cleared and leveled.')
    })

    it('renders note without img tag when resolution photo_url is null', () => {
      const wrapper = mount(ComplaintPhotoCard, {
        props: {
          variant: 'resolution',
          isCompleted: true,
          photoUrl: null,
          resolution: {
            ...resolutionData,
            photo_url: null,
          },
        },
      })

      expect(wrapper.text()).toContain('Road cleared and leveled.')
      expect(wrapper.find('img[alt="Resolution photo"]').exists()).toBe(false)
    })

    it('renders dashed empty state when complaint is not completed', () => {
      const wrapper = mount(ComplaintPhotoCard, {
        props: {
          variant: 'resolution',
          isCompleted: false,
          photoUrl: null,
          resolution: null,
        },
      })

      expect(wrapper.text()).toContain(
        'No resolution photo yet. The worker adds a photo when they mark this complaint Completed.',
      )
      expect(wrapper.text()).not.toContain('Resolution note')
      expect(wrapper.find('img[alt="Resolution photo"]').exists()).toBe(false)
    })
  })
})
