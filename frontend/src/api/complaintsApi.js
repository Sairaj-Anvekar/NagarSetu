// ASSUMED CONTRACT - confirm with the backend developer
import http from './http'

function assertTask(data) {
  if (!data || typeof data !== 'object' || !data.id) {
    throw new Error('Unexpected response from the server')
  }
  return data
}

/**
 * Fetch detail for a complaint assigned to the authenticated worker.
 *
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function fetchTask(id) {
  const url = `/complaints/${encodeURIComponent(id)}`
  const { data } = await http.get(url)
  return assertTask(data)
}

/**
 * Transition a Submitted complaint to In-Progress.
 *
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function startTask(id) {
  const url = `/complaints/${encodeURIComponent(id)}/start`
  const { data } = await http.patch(url)
  return assertTask(data)
}

/**
 * Complete an In-Progress complaint with photo evidence and resolution note.
 *
 * @param {string} id
 * @param {{ photo: File|Blob, note: string }} payload
 * @returns {Promise<object>}
 */
export async function completeTask(id, { photo, note } = {}) {
  const url = `/complaints/${encodeURIComponent(id)}/complete`
  const formData = new FormData()

  if (photo) {
    formData.append('photo', photo)
  }

  const trimmedNote = typeof note === 'string' ? note.trim() : ''
  formData.append('note', trimmedNote)

  const { data } = await http.patch(url, formData)
  return assertTask(data)
}

/**
 * Defer an active complaint back to the dispatch queue.
 *
 * @param {string} id
 * @param {string} reason
 * @returns {Promise<object>}
 */
export async function deferTask(id, reason) {
  const url = `/complaints/${encodeURIComponent(id)}/defer`
  const trimmedReason = typeof reason === 'string' ? reason.trim() : ''
  const { data } = await http.patch(url, { reason: trimmedReason })
  return assertTask(data)
}

