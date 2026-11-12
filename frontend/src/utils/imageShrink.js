/**
 * Compute target dimensions so the longer side is at most `maxSide` pixels,
 * preserving aspect ratio, never upscaling, and keeping both sides at least 1 px.
 *
 * @param {number} width
 * @param {number} height
 * @param {number} [maxSide=1600]
 * @returns {{ width: number, height: number }}
 */
export function computeTargetSize(width, height, maxSide = 1600) {
  const safeWidth = Math.max(1, Math.round(width))
  const safeHeight = Math.max(1, Math.round(height))
  const longest = Math.max(safeWidth, safeHeight)

  if (longest <= maxSide) {
    return { width: safeWidth, height: safeHeight }
  }

  const scale = maxSide / longest
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  }
}

const READ_ERROR_MESSAGE = 'Could not read this photo. Please choose another.'

function loadImage(objectUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(READ_ERROR_MESSAGE))
    img.src = objectUrl
  })
}

/**
 * Resize and re-encode an image file to a JPEG named `resolution.jpg`.
 * Re-encoding through canvas also strips EXIF metadata.
 *
 * @param {File|Blob} file
 * @param {{ maxSide?: number, quality?: number }} [options]
 * @returns {Promise<File>}
 */
export async function shrinkImage(file, { maxSide = 1600, quality = 0.82 } = {}) {
  if (!file || typeof URL?.createObjectURL !== 'function') {
    throw new Error(READ_ERROR_MESSAGE)
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImage(objectUrl)
    const rawWidth = img.naturalWidth || img.width
    const rawHeight = img.naturalHeight || img.height
    if (!rawWidth || !rawHeight) {
      throw new Error(READ_ERROR_MESSAGE)
    }

    const { width, height } = computeTargetSize(rawWidth, rawHeight, maxSide)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext?.('2d')
    if (!ctx) {
      throw new Error(READ_ERROR_MESSAGE)
    }

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)

    const blob = await new Promise((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/jpeg', quality)
    })
    if (!blob) {
      throw new Error(READ_ERROR_MESSAGE)
    }

    return new File([blob], 'resolution.jpg', { type: 'image/jpeg' })
  } catch (err) {
    if (err instanceof Error && err.message === READ_ERROR_MESSAGE) {
      throw err
    }
    throw new Error(READ_ERROR_MESSAGE, { cause: err })
  } finally {
    URL.revokeObjectURL?.(objectUrl)
  }
}
