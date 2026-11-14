/**
 * Formats a Date object into a complaints CSV export filename: complaints-YYYY-MM-DD.csv
 * Defaults to the current date if no valid date is provided.
 *
 * @param {Date} [date=new Date()]
 * @returns {string} e.g. "complaints-2026-11-14.csv"
 */
export function buildComplaintsCsvFilename(date = new Date()) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `complaints-${year}-${month}-${day}.csv`
}

/**
 * Initiates a browser file download from a given Blob object.
 * Creates an ephemeral Object URL, attaches a temporary anchor element to trigger
 * the download, and immediately cleans up the anchor and URL to prevent memory leaks.
 *
 * @param {Blob} blob - The raw file data Blob to download
 * @param {string} filename - The target filename presented to the user
 */
export function downloadBlob(blob, filename) {
  if (!blob || typeof blob !== 'object') {
    throw new TypeError('A valid Blob must be provided to downloadBlob')
  }

  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename || 'download')
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  window.URL.revokeObjectURL(url)
}
