import { afterEach, describe, expect, it, vi } from 'vitest'
import { computeTargetSize, shrinkImage } from '../imageShrink'

describe('computeTargetSize', () => {
  it.each([
    [4000, 3000, { width: 1600, height: 1200 }],
    [3000, 4000, { width: 1200, height: 1600 }],
    [800, 600, { width: 800, height: 600 }],
    [1600, 1600, { width: 1600, height: 1600 }],
    [4000, 1, { width: 1600, height: 1 }],
  ])('scales (%i, %i) to %o', (width, height, expected) => {
    expect(computeTargetSize(width, height)).toEqual(expected)
  })
})

describe('shrinkImage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('resolves resolution.jpg (image/jpeg) and calls toBlob with quality 0.82', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    const ctx = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() }
    const toBlob = vi.fn((cb) => cb(new Blob(['jpeg-bytes'], { type: 'image/jpeg' })))
    const fakeCanvas = { width: 0, height: 0, getContext: vi.fn(() => ctx), toBlob }
    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'canvas' ? fakeCanvas : origCreateElement(tag),
    )

    class FakeImage {
      set src(_val) {
        this.naturalWidth = 4000
        this.naturalHeight = 3000
        queueMicrotask(() => this.onload?.())
      }
    }
    vi.stubGlobal('Image', FakeImage)

    const input = new File(['raw'], 'camera.png', { type: 'image/png' })
    const result = await shrinkImage(input)

    expect(createObjectURL).toHaveBeenCalledWith(input)
    expect(fakeCanvas.width).toBe(1600)
    expect(fakeCanvas.height).toBe(1200)
    expect(ctx.fillStyle).toBe('#ffffff')
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1600, 1200)
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.82)
    expect(result).toBeInstanceOf(File)
    expect(result.name).toBe('resolution.jpg')
    expect(result.type).toBe('image/jpeg')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('rejects with the exact error message when image decoding fails', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:bad-url')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    class FailingImage {
      set src(_val) {
        queueMicrotask(() => this.onerror?.())
      }
    }
    vi.stubGlobal('Image', FailingImage)

    const badFile = new File(['corrupt'], 'broken.jpg', { type: 'image/jpeg' })
    await expect(shrinkImage(badFile)).rejects.toThrow(
      'Could not read this photo. Please choose another.',
    )
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:bad-url')
  })
})

