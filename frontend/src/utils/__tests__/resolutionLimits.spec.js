import { describe, expect, it } from 'vitest'
import {
  ALLOWED_PHOTO_TYPES,
  DEFER_REASON_MAX,
  DEFER_REASON_MIN,
  MAX_PHOTO_BYTES,
  NOTE_MAX,
  NOTE_MIN,
  validatePhoto,
} from '../resolutionLimits'

describe('resolutionLimits', () => {
  it('exports the specified constants', () => {
    expect(ALLOWED_PHOTO_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp'])
    expect(MAX_PHOTO_BYTES).toBe(8 * 1024 * 1024)
    expect(NOTE_MIN).toBe(10)
    expect(NOTE_MAX).toBe(500)
    expect(DEFER_REASON_MIN).toBe(5)
    expect(DEFER_REASON_MAX).toBe(300)
  })

  describe('validatePhoto', () => {
    it('passes for each allowed photo type', () => {
      for (const type of ALLOWED_PHOTO_TYPES) {
        const file = new File(['mock'], `test.${type.split('/')[1]}`, { type })
        expect(validatePhoto(file)).toBe('')
      }
    })

    it('rejects text/plain and image/gif with the type error message', () => {
      const txtFile = new File(['mock'], 'notes.txt', { type: 'text/plain' })
      expect(validatePhoto(txtFile)).toBe('Photo must be a JPG, PNG or WebP image.')

      const gifFile = new File(['mock'], 'anim.gif', { type: 'image/gif' })
      expect(validatePhoto(gifFile)).toBe('Photo must be a JPG, PNG or WebP image.')
    })

    it('rejects a 9 MB file with the size message', () => {
      const file = new File(['mock'], 'huge.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 9 * 1024 * 1024 })
      expect(validatePhoto(file)).toBe('Photo must be 8 MB or smaller.')
    })

    it('passes for a file of exactly 8 MB', () => {
      const file = new File(['mock'], 'exact.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 8 * 1024 * 1024 })
      expect(validatePhoto(file)).toBe('')
    })

    it('returns "Choose a photo." for null, undefined, string, and object without size', () => {
      expect(validatePhoto(null)).toBe('Choose a photo.')
      expect(validatePhoto(undefined)).toBe('Choose a photo.')
      expect(validatePhoto('invalid-file')).toBe('Choose a photo.')
      expect(validatePhoto({ type: 'image/jpeg' })).toBe('Choose a photo.')
      expect(validatePhoto({})).toBe('Choose a photo.')
    })
  })
})

