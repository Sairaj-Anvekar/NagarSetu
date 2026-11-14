import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildComplaintsCsvFilename, downloadBlob } from '../downloadBlob'

describe('downloadBlob utility', () => {
  describe('buildComplaintsCsvFilename', () => {
    it('formats a provided Date object as complaints-YYYY-MM-DD.csv with zero-padding', () => {
      const date = new Date(2026, 0, 5) // January 5, 2026
      expect(buildComplaintsCsvFilename(date)).toBe('complaints-2026-01-05.csv')
    })

    it('formats double-digit month and day correctly', () => {
      const date = new Date(2026, 10, 24) // November 24, 2026
      expect(buildComplaintsCsvFilename(date)).toBe('complaints-2026-11-24.csv')
    })

    it('defaults to the current date when no argument or an invalid date is given', () => {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const expected = `complaints-${year}-${month}-${day}.csv`

      expect(buildComplaintsCsvFilename()).toBe(expected)
      expect(buildComplaintsCsvFilename(new Date('invalid-date'))).toBe(expected)
    })
  })

  describe('downloadBlob', () => {
    let originalCreateObjectURL
    let originalRevokeObjectURL
    let createdUrl
    let revokedUrl
    let clickedElement
    let appendedElements
    let removedElements

    beforeEach(() => {
      createdUrl = 'blob:http://localhost:3000/mock-uuid'
      revokedUrl = null
      clickedElement = null
      appendedElements = []
      removedElements = []

      originalCreateObjectURL = window.URL.createObjectURL
      originalRevokeObjectURL = window.URL.revokeObjectURL

      window.URL.createObjectURL = vi.fn(() => createdUrl)
      window.URL.revokeObjectURL = vi.fn((url) => {
        revokedUrl = url
      })

      vi.spyOn(document.body, 'appendChild').mockImplementation((el) => {
        appendedElements.push(el)
        return el
      })

      vi.spyOn(document.body, 'removeChild').mockImplementation((el) => {
        removedElements.push(el)
        return el
      })

      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function mockClick() {
        clickedElement = this
      })
    })

    afterEach(() => {
      window.URL.createObjectURL = originalCreateObjectURL
      window.URL.revokeObjectURL = originalRevokeObjectURL
      vi.restoreAllMocks()
    })

    it('creates an object URL, clicks a temporary anchor with the filename, and cleans up', () => {
      const blob = new Blob(['test,csv\n1,2'], { type: 'text/csv' })
      const filename = 'complaints-2026-11-14.csv'

      downloadBlob(blob, filename)

      expect(window.URL.createObjectURL).toHaveBeenCalledWith(blob)
      expect(appendedElements.length).toBe(1)
      expect(removedElements.length).toBe(1)
      expect(appendedElements[0]).toBe(removedElements[0])

      const anchor = appendedElements[0]
      expect(anchor.tagName.toLowerCase()).toBe('a')
      expect(anchor.href).toBe(createdUrl)
      expect(anchor.getAttribute('download')).toBe(filename)
      expect(anchor.style.display).toBe('none')

      expect(clickedElement).toBe(anchor)
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith(createdUrl)
      expect(revokedUrl).toBe(createdUrl)
    })

    it('falls back to "download" as the default filename when omitted', () => {
      const blob = new Blob(['data'], { type: 'text/plain' })

      downloadBlob(blob)

      expect(appendedElements[0].getAttribute('download')).toBe('download')
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith(createdUrl)
    })

    it('throws a TypeError if an invalid blob is passed', () => {
      expect(() => downloadBlob(null, 'test.csv')).toThrow(TypeError)
      expect(() => downloadBlob(undefined, 'test.csv')).toThrow(TypeError)
      expect(() => downloadBlob('not-a-blob', 'test.csv')).toThrow(TypeError)
    })
  })
})
