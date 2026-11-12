import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import WorkerCompleteForm from '../WorkerCompleteForm.vue'
import { completeTask } from '../../../api/complaintsApi'
import { shrinkImage } from '../../../utils/imageShrink'

vi.mock('../../../api/complaintsApi', () => ({
  completeTask: vi.fn(),
}))

vi.mock('../../../utils/imageShrink', () => ({
  shrinkImage: vi.fn(),
}))

async function selectFile(wrapper, file) {
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  await flushPromises()
}

describe('WorkerCompleteForm — Photo & Note Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview-1')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders file input with accept="image/*" and capture="environment"', () => {
    const wrapper = mount(WorkerCompleteForm, { props: { taskId: 'task-1' } })
    const input = wrapper.get('input[type="file"]')

    expect(input.attributes('accept')).toBe('image/*')
    expect(input.attributes('capture')).toBe('environment')
    expect(input.attributes('aria-label')).toBe('Photo of the finished work')
  })

  it('rejects non-image file types and keeps Complete work disabled', async () => {
    const wrapper = mount(WorkerCompleteForm, { props: { taskId: 'task-1' } })
    await selectFile(wrapper, new File(['bad'], 'note.txt', { type: 'text/plain' }))

    expect(shrinkImage).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Please choose a JPG, PNG or WebP photo.')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('shows preview, validates note bounds (9/10/500/501), and clears preview on Retake', async () => {
    const shrunkFile = new File(['jpg'], 'resolution.jpg', { type: 'image/jpeg' })
    shrinkImage.mockResolvedValueOnce(shrunkFile)

    const wrapper = mount(WorkerCompleteForm, { props: { taskId: 'task-1' } })
    await selectFile(wrapper, new File(['raw'], 'raw.jpg', { type: 'image/jpeg' }))

    const img = wrapper.get('img')
    expect(img.attributes('src')).toBe('blob:preview-1')
    expect(img.attributes('alt')).toBe('Photo of the finished work')

    const noteEl = wrapper.get('#complete-note')
    const submitBtn = wrapper.get('button[type="submit"]')

    await noteEl.setValue('123456789')
    expect(submitBtn.attributes('disabled')).toBeDefined()

    await noteEl.setValue('1234567890')
    expect(submitBtn.attributes('disabled')).toBeUndefined()

    await noteEl.setValue('a'.repeat(500))
    expect(submitBtn.attributes('disabled')).toBeUndefined()

    await noteEl.setValue('a'.repeat(501))
    expect(submitBtn.attributes('disabled')).toBeDefined()

    await wrapper.findAll('button').find((b) => b.text() === 'Retake').trigger('click')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview-1')
    expect(completeTask).not.toHaveBeenCalled()
  })
})

describe('WorkerCompleteForm — Submit & Double-Submit Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview-2')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls completeTask once with shrunk photo and trimmed note, prevents double submit, and emits completed', async () => {
    const shrunkFile = new File(['jpg'], 'resolution.jpg', { type: 'image/jpeg' })
    shrinkImage.mockResolvedValueOnce(shrunkFile)

    let resolveSubmit
    completeTask.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSubmit = resolve
      }),
    )

    const wrapper = mount(WorkerCompleteForm, { props: { taskId: 'task-42' } })
    await selectFile(wrapper, new File(['raw'], 'photo.png', { type: 'image/png' }))
    await wrapper.get('#complete-note').setValue('  Cleared blockage and flushed pipe  ')

    const form = wrapper.get('form')
    await form.trigger('submit')
    await nextTick()

    const submitBtn = wrapper.get('button[type="submit"]')
    expect(submitBtn.attributes('disabled')).toBeDefined()
    expect(submitBtn.text()).toContain('Completing work...')

    await form.trigger('submit')
    expect(completeTask).toHaveBeenCalledTimes(1)
    expect(completeTask).toHaveBeenCalledWith('task-42', {
      photo: shrunkFile,
      note: 'Cleared blockage and flushed pipe',
    })

    const completedPayload = { id: 'task-42', status: 'Completed' }
    resolveSubmit(completedPayload)
    await flushPromises()

    expect(wrapper.emitted('completed')).toEqual([[completedPayload]])
  })
})

describe('WorkerCompleteForm — Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview-err')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function mountReadyForm() {
    shrinkImage.mockResolvedValueOnce(new File(['jpg'], 'resolution.jpg', { type: 'image/jpeg' }))
    const wrapper = mount(WorkerCompleteForm, { props: { taskId: 'task-99' } })
    await selectFile(wrapper, new File(['raw'], 'photo.jpg', { type: 'image/jpeg' }))
    await wrapper.get('#complete-note').setValue('Repaired broken curb drain')
    return wrapper
  }

  it('maps 422 errors onto photo and note fields', async () => {
    completeTask.mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          detail: [
            { loc: ['body', 'photo'], msg: 'Photo must be a valid image' },
            { loc: ['body', 'note'], msg: 'Note is too short' },
          ],
        },
      },
    })

    const wrapper = await mountReadyForm()
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Photo must be a valid image')
    expect(wrapper.text()).toContain('Note is too short')
    expect(wrapper.emitted('completed')).toBeUndefined()
  })

  it('shows inline conflict message on 409 and emits nothing', async () => {
    completeTask.mockRejectedValueOnce({ response: { status: 409 } })

    const wrapper = await mountReadyForm()
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('This task is no longer in progress.')
    expect(wrapper.emitted('completed')).toBeUndefined()
  })

  it('shows large-photo message on 413', async () => {
    completeTask.mockRejectedValueOnce({ response: { status: 413 } })

    const wrapper = await mountReadyForm()
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('The photo is too large to upload. Please retake it.')
    expect(wrapper.emitted('completed')).toBeUndefined()
  })

  it('shows ErrorAlert on generic error and keeps photo and note for retry', async () => {
    completeTask.mockRejectedValueOnce({ response: { status: 500 } })

    const wrapper = await mountReadyForm()
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('.alert-danger').text()).toContain('Server error. Please try again later.')
    expect(wrapper.get('img').attributes('src')).toBe('blob:preview-err')
    expect(wrapper.get('#complete-note').element.value).toBe('Repaired broken curb drain')
  })
})
