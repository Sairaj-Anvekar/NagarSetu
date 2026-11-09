import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import http from '../http'
import { installMockApi, uninstallMockApi } from '../mock'
import { resetMockTasks, resetMockWorkers } from '../mock/mockData'
import { saveAuth } from '../../utils/authStorage'
import { getFieldErrors } from '../../utils/fieldErrors'
import { completeTask, deferTask, fetchTask, startTask } from '../complaintsApi'

describe('complaintsApi', () => {
  beforeEach(() => {
    localStorage.clear()
    installMockApi({ delayMs: 0 })
  })

  afterEach(() => {
    resetMockTasks()
    resetMockWorkers()
    uninstallMockApi()
    localStorage.clear()
  })

  describe('authenticated worker success operations', () => {
    beforeEach(() => {
      saveAuth({ token: 'mock-token-worker-101', role: 'worker', user: null })
    })

    it('fetchTask resolves with task detail matching the requested id', async () => {
      const task = await fetchTask('t1')
      expect(task).toBeDefined()
      expect(task.id).toBe('t1')
      expect(task.tracking_code).toBe('GRV-2026-A7X3')
    })

    it('startTask resolves with updated In-Progress status', async () => {
      const task = await startTask('t1')
      expect(task).toBeDefined()
      expect(task.id).toBe('t1')
      expect(task.status).toBe('In-Progress')
    })

    it('completeTask resolves with Completed status when given valid photo and note', async () => {
      const photo = new File(['evidence'], 'repaired.jpg', { type: 'image/jpeg' })
      const note = 'Repaired the road pothole with bitumen patch'

      const task = await completeTask('t2', { photo, note })
      expect(task).toBeDefined()
      expect(task.id).toBe('t2')
      expect(task.status).toBe('Completed')
    })

    it('deferTask resolves when given a valid deferral reason', async () => {
      const task = await deferTask('t3', 'Road blocked by a parked truck')
      expect(task).toBeDefined()
      expect(task.id).toBe('t3')
      expect(task.status).toBe('Submitted')
    })
  })

  describe('authentication and authorization gates', () => {
    const validPhoto = new File(['evidence'], 'fix.jpg', { type: 'image/jpeg' })
    const validNote = 'Repaired the road pothole properly'

    it('rejects each function with 401 when no auth is saved', async () => {
      await expect(fetchTask('t1')).rejects.toMatchObject({
        response: { status: 401 },
      })
      await expect(startTask('t1')).rejects.toMatchObject({
        response: { status: 401 },
      })
      await expect(
        completeTask('t2', { photo: validPhoto, note: validNote }),
      ).rejects.toMatchObject({
        response: { status: 401 },
      })
      await expect(deferTask('t3', 'Road blocked by a parked truck')).rejects.toMatchObject({
        response: { status: 401 },
      })
    })

    it('rejects each function with 403 when authenticated as admin', async () => {
      saveAuth({ token: 'mock-token-admin-1', role: 'admin', user: null })

      await expect(fetchTask('t1')).rejects.toMatchObject({
        response: { status: 403 },
      })
      await expect(startTask('t1')).rejects.toMatchObject({
        response: { status: 403 },
      })
      await expect(
        completeTask('t2', { photo: validPhoto, note: validNote }),
      ).rejects.toMatchObject({
        response: { status: 403 },
      })
      await expect(deferTask('t3', 'Road blocked by a parked truck')).rejects.toMatchObject({
        response: { status: 403 },
      })
    })
  })

  describe('error conditions and validations', () => {
    beforeEach(() => {
      saveAuth({ token: 'mock-token-worker-101', role: 'worker', user: null })
    })

    it('rejects with 500 when acting on task t4', async () => {
      await expect(startTask('t4')).rejects.toMatchObject({
        response: { status: 500 },
      })
    })

    it('rejects with 409 when starting a task twice', async () => {
      await startTask('t1')
      await expect(startTask('t1')).rejects.toMatchObject({
        response: { status: 409 },
      })
    })

    it('rejects with 422 and getFieldErrors returns the photo message on invalid photo', async () => {
      const badPhoto = new File(['bad'], 'notes.txt', { type: 'text/plain' })
      try {
        await completeTask('t2', {
          photo: badPhoto,
          note: 'Repaired the road pothole properly',
        })
        expect.unreachable('Should have failed with 422')
      } catch (error) {
        expect(error?.response?.status).toBe(422)
        const fields = getFieldErrors(error)
        expect(fields.photo).toBe('Photo must be a JPG, PNG or WebP image.')
      }
    })
  })

  describe('request payload formatting verification', () => {
    it('sends completeTask data as FormData with raw File and trimmed note, and sends deferTask with trimmed reason JSON', async () => {
      const originalAdapter = http.defaults.adapter
      try {
        let recordedConfig = null
        http.defaults.adapter = async (config) => {
          recordedConfig = config
          return {
            data: { id: 't-test', status: 'In-Progress' },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          }
        }

        const photoFile = new File(['mock-data'], 'proof.png', { type: 'image/png' })
        await completeTask('t-test', {
          photo: photoFile,
          note: '   Paved smoothly with cold asphalt   ',
        })

        expect(recordedConfig).not.toBeNull()
        expect(recordedConfig.data).toBeInstanceOf(FormData)
        expect(recordedConfig.data.get('photo')).toBe(photoFile)
        expect(recordedConfig.data.get('note')).toBe('Paved smoothly with cold asphalt')

        await deferTask('t-test', '   Heavy traffic on site requires police assistance   ')
        const parsedBody =
          typeof recordedConfig.data === 'string'
            ? JSON.parse(recordedConfig.data)
            : recordedConfig.data
        expect(parsedBody).toEqual({
          reason: 'Heavy traffic on site requires police assistance',
        })
      } finally {
        http.defaults.adapter = originalAdapter
      }
    })

    it('makes each function reject with Unexpected response from the server when response lacks valid id', async () => {
      const originalAdapter = http.defaults.adapter
      try {
        http.defaults.adapter = async (config) => ({
          data: { nope: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })

        await expect(fetchTask('t1')).rejects.toThrow('Unexpected response from the server')
        await expect(startTask('t1')).rejects.toThrow('Unexpected response from the server')
        await expect(
          completeTask('t1', {
            photo: new File(['x'], 'fix.jpg', { type: 'image/jpeg' }),
            note: 'Valid resolution note text',
          }),
        ).rejects.toThrow('Unexpected response from the server')
        await expect(deferTask('t1', 'Valid defer reason')).rejects.toThrow(
          'Unexpected response from the server',
        )
      } finally {
        http.defaults.adapter = originalAdapter
      }
    })
  })
})
