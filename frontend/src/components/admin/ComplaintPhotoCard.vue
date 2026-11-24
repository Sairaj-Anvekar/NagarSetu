<script setup>
import { computed, ref, watch } from 'vue'
import { formatDateTime } from '../../utils/formatDate'

const props = defineProps({
  variant: {
    type: String,
    default: 'citizen',
    validator: (v) => ['citizen', 'resolution'].includes(v),
  },
  title: {
    type: String,
    default: '',
  },
  photoUrl: {
    type: String,
    default: null,
  },
  resolution: {
    type: Object,
    default: null,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
})

const hasImageError = ref(false)

watch(
  () => props.photoUrl,
  () => {
    hasImageError.value = false
  },
)

const cardTitle = computed(() => {
  if (props.title) return props.title
  return props.variant === 'citizen' ? 'Photo from citizen' : 'Resolution'
})

const resolvedByName = computed(() => {
  return props.resolution?.worker?.name || ''
})

const completedTime = computed(() => {
  return props.resolution?.completed_at ? formatDateTime(props.resolution.completed_at) : ''
})

const captionText = computed(() => {
  if (resolvedByName.value && completedTime.value) {
    return `Added by ${resolvedByName.value} on ${completedTime.value}`
  }
  if (resolvedByName.value) {
    return `Added by ${resolvedByName.value}`
  }
  if (completedTime.value) {
    return `Completed on ${completedTime.value}`
  }
  return ''
})

function handleImageError() {
  hasImageError.value = true
}
</script>

<template>
  <div class="ns-photo-card mb-4">
    <div class="ns-photo-card__header">
      <h2 class="ns-photo-card__title">{{ cardTitle }}</h2>
    </div>

    <div class="ns-photo-card__body">
      <!-- Citizen Photo Variant -->
      <template v-if="variant === 'citizen'">
        <div v-if="hasImageError" class="ns-photo-fallback alert alert-warning mb-0" role="alert">
          <div class="d-flex align-items-center gap-2">
            <svg
              class="ns-alert-icon flex-shrink-0"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>Photo unavailable. Reload the page to get a fresh link.</span>
          </div>
        </div>

        <div v-else-if="photoUrl" class="ns-photo-display">
          <div class="ns-photo-frame mb-2">
            <img
              :src="photoUrl"
              alt="Citizen photo"
              class="ns-evidence-photo img-fluid"
              @error="handleImageError"
            />
          </div>
          <div class="d-flex align-items-center justify-content-between pt-1">
            <span class="text-secondary small">Submitted with complaint</span>
            <a
              :href="photoUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="ns-photo-full-link citizen-photo-link"
            >
              <span>Open full size</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>
        </div>
      </template>

      <!-- Resolution Variant -->
      <template v-else-if="variant === 'resolution'">
        <!-- Completed State with Note and Optional Photo -->
        <div v-if="isCompleted" class="ns-resolution-content">
          <dl class="row mb-0">
            <dt class="col-sm-3 text-secondary">Resolution note</dt>
            <dd class="col-sm-9 mb-3 text-break">
              {{ resolution?.note || 'No resolution note provided.' }}
            </dd>

            <template v-if="resolvedByName">
              <dt class="col-sm-3 text-secondary">Resolved by</dt>
              <dd class="col-sm-9 mb-3">{{ resolvedByName }}</dd>
            </template>

            <template v-if="resolution?.completed_at">
              <dt class="col-sm-3 text-secondary">Completed at</dt>
              <dd class="col-sm-9 mb-3">{{ completedTime }}</dd>
            </template>

            <template v-if="photoUrl">
              <dt class="col-sm-3 text-secondary">Evidence photo</dt>
              <dd class="col-sm-9 mb-0">
                <div v-if="hasImageError" class="ns-photo-fallback alert alert-warning mb-0" role="alert">
                  <div class="d-flex align-items-center gap-2">
                    <svg
                      class="ns-alert-icon flex-shrink-0"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>Photo unavailable. Reload the page to get a fresh link.</span>
                  </div>
                </div>

                <div v-else class="ns-resolution-photo-wrapper">
                  <a
                    :href="photoUrl"
                    target="_blank"
                    rel="noopener"
                    class="resolution-photo-link d-inline-block"
                  >
                    <img
                      :src="photoUrl"
                      alt="Resolution photo"
                      class="img-thumbnail resolution-photo"
                      @error="handleImageError"
                    />
                  </a>
                  <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-2">
                    <span v-if="captionText" class="text-secondary small ns-photo-caption">
                      {{ captionText }}
                    </span>
                    <a
                      :href="photoUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="ns-photo-full-link resolution-full-link"
                    >
                      <span>Open full size</span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </a>
                  </div>
                </div>
              </dd>
            </template>
          </dl>
        </div>

        <!-- Not Yet Completed Dashed Empty State -->
        <div v-else class="ns-resolution-empty-state">
          <div class="ns-empty-dashed-box text-center p-4">
            <svg
              class="ns-empty-dashed-icon mb-2"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94A3B8"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <p class="ns-empty-dashed-text mb-0">
              No resolution photo yet. The worker adds a photo when they mark this complaint Completed.
            </p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ns-photo-card {
  background-color: var(--ns-complaint-card-bg, #FFFFFF);
  border: 1px solid var(--ns-complaint-card-border, #E3EAF0);
  border-radius: var(--ns-complaint-card-radius, 18px);
  box-shadow: var(--ns-complaint-card-shadow, 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06));
  overflow: hidden;
}

.ns-photo-card__header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #EEF3F7;
}

.ns-photo-card__title {
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-size: 17px;
  font-weight: 700;
  color: #0E2233;
  margin: 0;
  line-height: 1.2;
}

.ns-photo-card__body {
  padding: 20px 24px;
}

.ns-photo-frame {
  max-width: 480px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #E2E8F0;
  background-color: #F8FAFC;
}

.ns-evidence-photo {
  width: 100%;
  max-height: 320px;
  object-fit: cover;
  display: block;
}

.resolution-photo {
  max-width: 320px;
  max-height: 240px;
  object-fit: cover;
  border-radius: 10px;
}

.resolution-photo-link:focus-visible,
.ns-photo-full-link:focus-visible {
  outline: 2px solid #0B7285;
  outline-offset: 2px;
  border-radius: 4px;
}

.ns-photo-full-link {
  font-size: 13px;
  font-weight: 600;
  color: #0B7285;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  min-height: 44px;
  padding: 0 4px;
}

.ns-photo-full-link:hover {
  color: #0E4F6B;
  text-decoration: underline;
}

.ns-photo-fallback {
  border-radius: 12px;
  padding: 14px 18px;
  font-size: 14px;
  font-weight: 500;
  color: #92400E;
  background-color: #FEF3C7;
  border-color: #FDE68A;
}

.ns-empty-dashed-box {
  border: 2px dashed #CBD5E1;
  border-radius: 14px;
  background-color: #F8FAFC;
}

.ns-empty-dashed-text {
  font-size: 14px;
  color: #64748B;
  line-height: 1.5;
}
</style>
