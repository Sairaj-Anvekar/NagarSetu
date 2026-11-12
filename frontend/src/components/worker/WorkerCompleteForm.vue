<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from '../AppIcon.vue'
import ErrorAlert from '../ErrorAlert.vue'
import LoadingSpinner from '../LoadingSpinner.vue'
import { completeTask } from '../../api/complaintsApi'
import { getErrorMessage } from '../../utils/apiError'
import { getFieldErrors } from '../../utils/fieldErrors'
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES, NOTE_MAX, NOTE_MIN } from '../../utils/resolutionLimits'
import { shrinkImage } from '../../utils/imageShrink'

const props = defineProps({
  taskId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['completed'])

const fileInputRef = ref(null)
const preparedPhoto = ref(null)
const previewUrl = ref('')
const isPreparingPhoto = ref(false)
const photoError = ref('')

const note = ref('')
const noteTouched = ref(false)
const submitAttempted = ref(false)
const noteServerError = ref('')

const isSubmitting = ref(false)
const submitError = ref('')
const conflictMessage = ref('')

let isMounted = true
let photoRequestId = 0

const trimmedNote = computed(() => note.value.trim())
const trimmedNoteLength = computed(() => trimmedNote.value.length)
const isNoteTooLong = computed(() => trimmedNoteLength.value > NOTE_MAX)
const isNoteValid = computed(
  () => trimmedNoteLength.value >= NOTE_MIN && trimmedNoteLength.value <= NOTE_MAX,
)

const clientNoteError = computed(() => {
  if (!noteTouched.value && !submitAttempted.value) return ''
  if (trimmedNoteLength.value < NOTE_MIN) {
    return `Enter at least ${NOTE_MIN} characters.`
  }
  if (trimmedNoteLength.value > NOTE_MAX) {
    return `Note must be ${NOTE_MAX} characters or fewer.`
  }
  return ''
})

const displayedNoteError = computed(() => noteServerError.value || clientNoteError.value)
const canSubmit = computed(
  () =>
    Boolean(preparedPhoto.value) &&
    isNoteValid.value &&
    !isPreparingPhoto.value &&
    !isSubmitting.value,
)

watch(note, () => {
  if (noteServerError.value) {
    noteServerError.value = ''
  }
})

function revokePreviewUrl() {
  if (previewUrl.value) {
    URL.revokeObjectURL?.(previewUrl.value)
    previewUrl.value = ''
  }
}

function clearPhoto({ clearError = false } = {}) {
  photoRequestId += 1
  preparedPhoto.value = null
  revokePreviewUrl()
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
  if (clearError) {
    photoError.value = ''
  }
}

function openFilePicker() {
  fileInputRef.value?.click()
}

function retakePhoto() {
  isPreparingPhoto.value = false
  clearPhoto({ clearError: true })
  submitError.value = ''
  conflictMessage.value = ''
}

async function onFileChange(event) {
  const file = event?.target?.files?.[0]
  if (!file) return

  photoError.value = ''
  submitError.value = ''
  conflictMessage.value = ''

  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    clearPhoto()
    photoError.value = 'Please choose a JPG, PNG or WebP photo.'
    return
  }

  const currentPhotoRequestId = ++photoRequestId
  preparedPhoto.value = null
  revokePreviewUrl()
  isPreparingPhoto.value = true

  try {
    const shrunk = await shrinkImage(file)
    if (!isMounted || currentPhotoRequestId !== photoRequestId) return

    if (shrunk.size > MAX_PHOTO_BYTES) {
      clearPhoto()
      photoError.value = 'This photo is too large. Please retake it.'
      return
    }

    preparedPhoto.value = shrunk
    previewUrl.value = URL.createObjectURL(shrunk)
  } catch (err) {
    if (!isMounted || currentPhotoRequestId !== photoRequestId) return

    clearPhoto()
    photoError.value = err?.message || 'Could not read this photo. Please choose another.'
  } finally {
    if (isMounted && currentPhotoRequestId === photoRequestId) {
      isPreparingPhoto.value = false
      if (fileInputRef.value) {
        fileInputRef.value.value = ''
      }
    }
  }
}

async function handleSubmit() {
  if (isSubmitting.value || isPreparingPhoto.value) return

  submitAttempted.value = true
  submitError.value = ''
  conflictMessage.value = ''

  if (!preparedPhoto.value) {
    if (!photoError.value) {
      photoError.value = 'Choose a photo.'
    }
    return
  }

  if (!isNoteValid.value) {
    return
  }

  isSubmitting.value = true

  try {
    const completedTask = await completeTask(props.taskId, {
      photo: preparedPhoto.value,
      note: trimmedNote.value,
    })
    if (!isMounted) return

    emit('completed', completedTask)
  } catch (err) {
    if (!isMounted) return

    const status = err?.response?.status
    if (status === 422) {
      const serverErrors = getFieldErrors(err)
      if (serverErrors.photo) {
        photoError.value = serverErrors.photo
      }
      if (serverErrors.note) {
        noteServerError.value = serverErrors.note
      }
      if (!serverErrors.photo && !serverErrors.note) {
        submitError.value = getErrorMessage(err)
      }
    } else if (status === 409) {
      conflictMessage.value = 'This task is no longer in progress.'
    } else if (status === 413) {
      photoError.value = 'The photo is too large to upload. Please retake it.'
    } else {
      submitError.value = getErrorMessage(err)
    }
  } finally {
    if (isMounted) {
      isSubmitting.value = false
    }
  }
}

onBeforeUnmount(() => {
  isMounted = false
  revokePreviewUrl()
})
</script>

<template>
  <section class="worker-complete-form" aria-labelledby="complete-work-heading">
    <h2 id="complete-work-heading" class="worker-complete-form__heading">Complete this work</h2>

    <form class="d-flex flex-column gap-3" novalidate @submit.prevent="handleSubmit">
      <div class="worker-complete-form__photo-section d-flex flex-column gap-2">
        <label for="complete-photo-input" class="visually-hidden">
          Photo of the finished work
        </label>
        <input
          id="complete-photo-input"
          ref="fileInputRef"
          type="file"
          accept="image/*"
          capture="environment"
          aria-label="Photo of the finished work"
          class="visually-hidden"
          :disabled="isPreparingPhoto || isSubmitting"
          @change="onFileChange"
        />

        <div v-if="isPreparingPhoto" class="d-flex align-items-center gap-2" role="status">
          <LoadingSpinner size="sm" label="Preparing photo" />
          <span class="worker-complete-form__status-text">Preparing photo...</span>
        </div>

        <div v-else-if="previewUrl" class="d-flex flex-column gap-2">
          <img
            :src="previewUrl"
            alt="Photo of the finished work"
            class="worker-complete-form__preview"
          />
          <button
            type="button"
            class="btn btn-outline-secondary worker-complete-form__btn w-100"
            :disabled="isSubmitting"
            @click="retakePhoto"
          >
            Retake
          </button>
        </div>

        <button
          v-else
          type="button"
          class="btn btn-outline-primary worker-complete-form__btn d-inline-flex align-items-center justify-content-center gap-2 w-100"
          :disabled="isSubmitting"
          @click="openFilePicker"
        >
          <AppIcon name="camera" :size="20" />
          <span>Take photo</span>
        </button>

        <div v-if="photoError" class="invalid-feedback d-block" role="alert">
          {{ photoError }}
        </div>
      </div>

      <div class="worker-complete-form__note-section">
        <div class="d-flex align-items-center justify-content-between gap-2 mb-1">
          <label for="complete-note" class="form-label mb-0">Note about the work done</label>
          <span
            class="worker-complete-form__counter"
            :class="{ 'worker-complete-form__counter--invalid': isNoteTooLong }"
          >
            {{ trimmedNoteLength }} / {{ NOTE_MAX }}
          </span>
        </div>
        <textarea
          id="complete-note"
          v-model="note"
          rows="3"
          class="form-control"
          :class="{ 'is-invalid': Boolean(displayedNoteError) }"
          placeholder="Describe what was fixed or cleared"
          :disabled="isSubmitting"
          aria-describedby="complete-note-help"
          @blur="noteTouched = true"
        />
        <div id="complete-note-help" class="form-text">
          {{ NOTE_MIN }} to {{ NOTE_MAX }} characters required.
        </div>
        <div v-if="displayedNoteError" class="invalid-feedback d-block" role="alert">
          {{ displayedNoteError }}
        </div>
      </div>

      <div v-if="conflictMessage" class="alert alert-warning mb-0" role="alert">
        {{ conflictMessage }}
      </div>

      <ErrorAlert v-if="submitError" title="Could not complete task" :message="submitError" />

      <button
        type="submit"
        class="btn btn-primary worker-complete-form__btn d-inline-flex align-items-center justify-content-center gap-2 w-100"
        :disabled="!canSubmit"
      >
        <LoadingSpinner v-if="isSubmitting" size="sm" label="Completing work" />
        <span>{{ isSubmitting ? 'Completing work...' : 'Complete work' }}</span>
      </button>
    </form>
  </section>
</template>

<style scoped>
.worker-complete-form {
  background-color: var(--ns-paper);
  border: 1px solid var(--ns-line);
  border-radius: var(--ns-radius-card);
  box-shadow: var(--ns-shadow-card);
  padding: 16px;
}

.worker-complete-form__heading {
  font-family: var(--ns-font-display);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--ns-ink);
  margin: 0 0 12px;
}

.worker-complete-form__btn {
  min-height: 44px;
}

.worker-complete-form__preview {
  width: 100%;
  max-height: 280px;
  object-fit: cover;
  border-radius: var(--ns-radius-control);
  border: 1px solid var(--ns-line);
  background-color: var(--ns-neutral-bg);
  display: block;
}

.worker-complete-form__status-text {
  font-size: 0.875rem;
  color: var(--ns-slate);
}

.worker-complete-form__counter {
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  color: var(--ns-slate);
}

.worker-complete-form__counter--invalid {
  color: var(--ns-danger-fg);
  font-weight: 600;
}
</style>

