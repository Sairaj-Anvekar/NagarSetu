export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024
export const NOTE_MIN = 10
export const NOTE_MAX = 500
export const DEFER_REASON_MIN = 5
export const DEFER_REASON_MAX = 300

/**
 * Validate a resolution photo file object.
 * Plain JS, never throws.
 *
 * @param {unknown} file
 * @returns {string} Empty string if valid, otherwise error message.
 */
export function validatePhoto(file) {
  try {
    if (
      !file ||
      typeof file !== 'object' ||
      typeof file.size !== 'number' ||
      Number.isNaN(file.size) ||
      typeof file.type !== 'string'
    ) {
      return 'Choose a photo.'
    }

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      return 'Photo must be a JPG, PNG or WebP image.'
    }

    if (file.size > MAX_PHOTO_BYTES) {
      return 'Photo must be 8 MB or smaller.'
    }

    return ''
  } catch {
    return 'Choose a photo.'
  }
}

