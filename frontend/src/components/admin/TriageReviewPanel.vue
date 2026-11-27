<script setup>
import { computed, ref, watch } from 'vue'
import CategoryPicker from './CategoryPicker.vue'
import LoadingSpinner from '../LoadingSpinner.vue'
import {
  ADMIN_DEPARTMENT,
  CATEGORY_NAMES,
  getCategoryDepartment,
} from '../../constants/triageCategories'
import { formatDateTime } from '../../utils/formatDate'

const props = defineProps({
  item: {
    type: Object,
    default: null,
  },
  status: {
    type: String,
    default: 'pending',
  },
  isSubmitting: {
    type: Boolean,
    default: false,
  },
  adminDepartment: {
    type: String,
    default: ADMIN_DEPARTMENT,
  },
})

const emit = defineEmits(['confirm'])

const selectedCategory = ref('')
const imageError = ref(false)

function resetForm() {
  imageError.value = false
  if (!props.item) {
    selectedCategory.value = ''
    return
  }
  if (props.status === 'reviewed' && props.item.final_category) {
    selectedCategory.value = props.item.final_category
  } else if (CATEGORY_NAMES.includes(props.item.predicted_category)) {
    selectedCategory.value = props.item.predicted_category
  } else {
    selectedCategory.value = ''
  }
}

watch(
  () => props.item?.id,
  () => {
    resetForm()
  },
  { immediate: true },
)

const confidencePercentage = computed(() => {
  if (!props.item || typeof props.item.ai_confidence !== 'number') return 0
  return Math.round(props.item.ai_confidence * 100)
})

const isLowConfidence = computed(() => confidencePercentage.value < 50)

const classifierSourceLabel = computed(() => {
  const src = props.item?.classifier_source
  if (!src) return ''
  return src === 'image' ? 'Image model' : src === 'text' ? 'Text model' : src
})

function handleImageError() {
  imageError.value = true
}

function handleConfirm() {
  if (!selectedCategory.value || props.isSubmitting || !props.item) return
  emit('confirm', {
    id: props.item.id,
    category: selectedCategory.value,
  })
}
</script>

<template>
  <div v-if="!item" class="ns-triage-review-card ns-review-placeholder" data-test="review-placeholder">
    <p class="text-secondary">Select a case from the list to review.</p>
  </div>

  <div v-else class="ns-triage-review-card" data-test="triage-review-panel">
    <!-- Header -->
    <div class="ns-review-header">
      <div class="ns-review-headings">
        <span class="ns-review-eyebrow">CASE DETAILS</span>
        <h2 class="ns-review-title">Reviewing {{ item.tracking_code }}</h2>
      </div>
      <span v-if="item.zone" class="ns-review-zone-chip" data-test="review-zone-chip">
        {{ item.zone }}
      </span>
    </div>

    <!-- Citizen Photo Section -->
    <div class="ns-review-photo-section">
      <div v-if="!item.image_url" class="ns-photo-empty" data-test="photo-empty">
        <svg
          class="ns-photo-icon"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        <span>No photo attached</span>
      </div>

      <div v-else-if="imageError" class="ns-photo-fallback" data-test="photo-fallback">
        <svg
          class="ns-fallback-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p class="ns-fallback-text">Photo unavailable. Reload the page to get a fresh link.</p>
      </div>

      <div v-else class="ns-photo-wrapper">
        <img
          :src="item.image_url"
          alt="Citizen grievance photo"
          class="ns-review-img"
          data-test="review-photo"
          @error="handleImageError"
        />
      </div>
    </div>

    <!-- Description -->
    <div class="ns-review-desc-section">
      <span class="ns-section-label">Citizen description</span>
      <p class="ns-review-desc">{{ item.description || 'No description provided.' }}</p>
    </div>

    <!-- AI Suggestion Box -->
    <div class="ns-ai-suggestion-box" data-test="ai-suggestion-box">
      <div class="ns-suggestion-header">
        <span class="ns-suggestion-tag">AI suggestion</span>
        <span v-if="classifierSourceLabel" class="ns-source-tag">
          Source: {{ classifierSourceLabel }}
        </span>
      </div>

      <div class="ns-suggestion-category">
        {{ item.predicted_category || 'Uncertain' }}
      </div>

      <div class="ns-meter-row">
        <div
          class="ns-meter-track"
          :class="{
            'ns-meter-track--red': isLowConfidence,
            'ns-meter-track--amber': !isLowConfidence,
          }"
          role="progressbar"
          :aria-valuenow="confidencePercentage"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`AI Confidence ${confidencePercentage}%`"
        >
          <div
            class="ns-meter-fill"
            :style="{ width: `${confidencePercentage}%` }"
          ></div>
        </div>

        <span
          class="ns-meter-text"
          :class="{
            'ns-meter-text--red': isLowConfidence,
            'ns-meter-text--amber': !isLowConfidence,
          }"
        >
          {{ confidencePercentage }}%
        </span>
      </div>

      <p class="ns-suggestion-hint">
        Below 70%, so a person should confirm.
      </p>
    </div>

    <!-- Action Section: Pending (Picker + Confirm) -->
    <div v-if="status === 'pending'" class="ns-review-actions-section" data-test="pending-actions">
      <div class="ns-picker-heading-row">
        <h3 class="ns-section-title">Correct category</h3>
        <span class="ns-picker-hint">Confirm AI guess or select the right team</span>
      </div>

      <CategoryPicker
        v-model="selectedCategory"
        :predicted-category="item.predicted_category"
        :admin-department="adminDepartment"
        :disabled="isSubmitting"
      />

      <div class="ns-move-note" data-test="move-note">
        <svg
          class="ns-note-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          Choosing a category from another department moves this complaint to that team. It then leaves your lists.
        </span>
      </div>

      <button
        type="button"
        class="btn ns-confirm-btn"
        :disabled="!selectedCategory || isSubmitting"
        data-test="confirm-btn"
        @click="handleConfirm"
      >
        <LoadingSpinner v-if="isSubmitting" size="sm" label="Confirming..." />
        <span v-else>Confirm category</span>
      </button>
    </div>

    <!-- Read-Only Section: Reviewed cases -->
    <div v-else class="ns-reviewed-summary" data-test="reviewed-summary">
      <span class="ns-section-label">Review decision</span>
      <div class="ns-reviewed-detail-card">
        <div class="ns-reviewed-field">
          <span class="ns-field-lbl">Final category:</span>
          <span class="ns-field-val fw-semibold">{{ item.final_category || '—' }}</span>
        </div>
        <div class="ns-reviewed-field">
          <span class="ns-field-lbl">Department:</span>
          <span class="ns-field-val">{{ getCategoryDepartment(item.final_category) || '—' }}</span>
        </div>
        <div v-if="item.reviewed_at" class="ns-reviewed-field">
          <span class="ns-field-lbl">Reviewed:</span>
          <span class="ns-field-val text-secondary">{{ formatDateTime(item.reviewed_at) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ns-triage-review-card {
  background-color: var(--ns-paper, #FFFFFF);
  border: 1px solid var(--ns-line, #E3EAF0);
  border-radius: var(--ns-radius-card, 18px);
  box-shadow: 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06);
  padding: var(--ns-space-24, 24px);
  display: flex;
  flex-direction: column;
  gap: var(--ns-space-20, 20px);
}

.ns-review-placeholder {
  min-height: 320px;
  display: grid;
  place-items: center;
  text-align: center;
}

.ns-review-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ns-space-12, 12px);
  padding-bottom: var(--ns-space-12, 12px);
  border-bottom: 1px solid var(--ns-line, #EEF3F7);
}

.ns-review-headings {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ns-review-eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #0B6A7C;
  text-transform: uppercase;
}

.ns-review-title {
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ns-navy, #0E2233);
  margin-bottom: 0;
  line-height: 1.25;
}

.ns-review-zone-chip {
  font-size: 12px;
  font-weight: 600;
  color: #0B6A7C;
  background-color: #D8F1F3;
  padding: 4px 10px;
  border-radius: var(--ns-radius-pill, 999px);
}

/* Photo Section */
.ns-photo-wrapper {
  border-radius: var(--ns-radius-control, 10px);
  overflow: hidden;
  max-height: 320px;
  background-color: var(--ns-surface-2, #F8FAFC);
  display: flex;
  justify-content: center;
}

.ns-review-img {
  width: 100%;
  max-height: 320px;
  object-fit: cover;
  border-radius: var(--ns-radius-control, 10px);
}

.ns-photo-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 36px 16px;
  border-radius: var(--ns-radius-control, 10px);
  background-color: var(--ns-surface-2, #F8FAFC);
  border: 1.5px dashed var(--ns-line, #CBD5E1);
  color: var(--ns-slate, #64748B);
  font-size: 13px;
  font-weight: 500;
}

.ns-photo-fallback {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: var(--ns-radius-control, 10px);
  background-color: #FEF3C7;
  border: 1px solid #FDE68A;
  color: #92400E;
}

.ns-fallback-text {
  font-size: 13px;
  font-weight: 600;
  margin: 0;
  line-height: 1.4;
}

/* Description */
.ns-review-desc-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ns-section-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ns-slate, #5B6B7A);
}

.ns-review-desc {
  font-size: 14px;
  line-height: 1.5;
  color: var(--ns-ink, #1E293B);
  margin: 0;
}

/* AI Suggestion Box */
.ns-ai-suggestion-box {
  background-color: #F8FAFC;
  border: 1.5px solid #E2E8F0;
  border-radius: var(--ns-radius-control, 10px);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ns-suggestion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ns-suggestion-tag {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #0B7285;
}

.ns-source-tag {
  font-size: 11px;
  color: #64748B;
  background-color: #EEF2F6;
  padding: 2px 8px;
  border-radius: var(--ns-radius-pill, 999px);
}

.ns-suggestion-category {
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-size: 16px;
  font-weight: 700;
  color: #0E2233;
}

.ns-meter-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ns-meter-track {
  flex: 1;
  height: 8px;
  border-radius: var(--ns-radius-pill, 999px);
  background-color: #E2E8F0;
  overflow: hidden;
}

.ns-meter-fill {
  height: 100%;
  border-radius: var(--ns-radius-pill, 999px);
  transition: width var(--ns-duration-fast, 150ms) var(--ns-easing, ease);
}

.ns-meter-track--red .ns-meter-fill {
  background-color: #DC2626;
}

.ns-meter-track--amber .ns-meter-fill {
  background-color: #D97706;
}

.ns-meter-text {
  font-size: 13px;
  font-weight: 700;
}

.ns-meter-text--red {
  color: #B91C1C;
}

.ns-meter-text--amber {
  color: #92400E;
}

.ns-suggestion-hint {
  font-size: 12px;
  color: #64748B;
  margin: 0;
}

/* Actions Section */
.ns-review-actions-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ns-picker-heading-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ns-section-title {
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-size: 1rem;
  font-weight: 700;
  color: #0E2233;
  margin: 0;
}

.ns-picker-hint {
  font-size: 12px;
  color: #5B6B7A;
}

.ns-move-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: #F8FAFC;
  border: 1px solid #E2E8F0;
  color: #475569;
  font-size: 12px;
  line-height: 1.45;
}

.ns-note-icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: #0B7285;
}

.ns-confirm-btn {
  height: 46px;
  min-height: 46px;
  border-radius: var(--ns-radius-control, 10px);
  background: linear-gradient(135deg, #0B7285, #0E4F6B);
  color: #FFFFFF;
  border: none;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all var(--ns-duration-fast, 150ms) var(--ns-easing, ease);
}

.ns-confirm-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #095A7E, #094760);
  box-shadow: 0 4px 12px rgba(11, 114, 133, 0.25);
}

.ns-confirm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ns-confirm-btn:focus-visible {
  outline: 2px solid #0B7285 !important;
  outline-offset: 2px;
}

/* Reviewed Read-Only Detail */
.ns-reviewed-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ns-reviewed-detail-card {
  padding: 16px;
  border-radius: 10px;
  background-color: #F8FAFC;
  border: 1px solid #E2E8F0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ns-reviewed-field {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.ns-field-lbl {
  color: #64748B;
  min-width: 100px;
}

.ns-field-val {
  color: #0E2233;
}

@media (prefers-reduced-motion: reduce) {
  .ns-confirm-btn,
  .ns-meter-fill {
    transition: none;
  }
}
</style>
