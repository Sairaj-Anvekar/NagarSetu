<script setup>
import { computed } from 'vue'
import { formatDateTime } from '../../utils/formatDate'

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  selectedId: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    default: 'pending',
  },
  total: {
    type: Number,
    default: 0,
  },
  page: {
    type: Number,
    default: 1,
  },
  pageSize: {
    type: Number,
    default: 20,
  },
})

const emit = defineEmits(['select', 'page-change'])

const cardTitle = computed(() => {
  return props.status === 'reviewed' ? 'Reviewed cases' : 'Waiting for review'
})

const cardSubtitle = computed(() => {
  return props.status === 'reviewed' ? 'Most recently reviewed first' : 'Oldest first'
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(props.total / props.pageSize))
})

const displayedPages = computed(() => {
  const current = props.page
  const count = totalPages.value
  if (count <= 5) {
    return Array.from({ length: count }, (_, i) => i + 1)
  }
  let start = Math.max(1, current - 2)
  let end = Math.min(count, start + 4)
  if (end - start < 4) {
    start = Math.max(1, end - 4)
  }
  const pages = []
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

function formatWaitingTime(iso) {
  if (!iso || typeof iso !== 'string') return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diffMinutes = Math.max(0, Math.floor((Date.now() - t) / 60000))
  if (diffMinutes < 1) return '< 1 min'
  if (diffMinutes < 60) return `${diffMinutes} min`
  const hours = Math.floor(diffMinutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  return `${days} d`
}

function getConfidencePercentage(val) {
  const num = typeof val === 'number' && !Number.isNaN(val) ? val : 0
  return Math.round(num * 100)
}

function isLowConfidence(val) {
  return getConfidencePercentage(val) < 50
}

function handleSelect(item) {
  emit('select', item)
}

function handlePageChange(newPage) {
  if (newPage < 1 || newPage > totalPages.value || newPage === props.page) {
    return
  }
  emit('page-change', newPage)
}
</script>

<template>
  <div class="ns-triage-list-card" data-test="triage-list-card">
    <div class="ns-triage-list-header">
      <div class="ns-header-headings">
        <h2 class="ns-card-title">{{ cardTitle }}</h2>
        <span class="ns-card-subtitle">{{ cardSubtitle }}</span>
      </div>
      <span class="ns-list-count-badge" data-test="triage-list-count">
        {{ total }} {{ total === 1 ? 'case' : 'cases' }}
      </span>
    </div>

    <!-- Empty List State -->
    <div v-if="items.length === 0" class="ns-triage-list-empty" data-test="triage-list-empty">
      <p v-if="status === 'pending'" class="ns-empty-msg">
        Nothing to review. Every complaint was classified with high confidence.
      </p>
      <p v-else class="ns-empty-msg">
        No reviewed cases yet.
      </p>
    </div>

    <!-- Items List -->
    <ul
      v-else
      class="ns-triage-items"
      role="listbox"
      :aria-label="cardTitle"
    >
      <li
        v-for="item in items"
        :key="item.id"
        class="ns-triage-item"
        :class="{ 'ns-triage-item--selected': item.id === selectedId }"
        role="option"
        :aria-selected="item.id === selectedId"
        tabindex="0"
        :data-test="`triage-item-${item.id}`"
        @click="handleSelect(item)"
        @keydown.enter.prevent="handleSelect(item)"
        @keydown.space.prevent="handleSelect(item)"
      >
        <div class="ns-item-top">
          <span class="ns-tracking-code">{{ item.tracking_code }}</span>
          <span v-if="status === 'pending'" class="ns-wait-time">
            Waiting {{ formatWaitingTime(item.created_at) }}
          </span>
          <span v-else-if="item.reviewed_at" class="ns-reviewed-time">
            Reviewed {{ formatDateTime(item.reviewed_at) }}
          </span>
          <span v-if="item.zone" class="ns-zone-badge">
            {{ item.zone }}
          </span>
        </div>

        <div class="ns-item-body">
          <div class="ns-guess-row">
            <span class="ns-guess-label">AI guess:</span>
            <span class="ns-guess-val">{{ item.predicted_category || '—' }}</span>
          </div>

          <div v-if="status === 'reviewed'" class="ns-final-row">
            <span class="ns-final-label">Final:</span>
            <span class="ns-final-val">{{ item.final_category || '—' }}</span>
          </div>
        </div>

        <!-- Confidence Meter for Pending items -->
        <div v-if="status === 'pending'" class="ns-item-confidence">
          <div
            class="ns-meter-track"
            :class="{
              'ns-meter-track--red': isLowConfidence(item.ai_confidence),
              'ns-meter-track--amber': !isLowConfidence(item.ai_confidence),
            }"
            role="progressbar"
            :aria-valuenow="getConfidencePercentage(item.ai_confidence)"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="`AI Confidence ${getConfidencePercentage(item.ai_confidence)}% (${isLowConfidence(item.ai_confidence) ? 'Low' : 'Moderate'})`"
          >
            <div
              class="ns-meter-fill"
              :style="{ width: `${getConfidencePercentage(item.ai_confidence)}%` }"
            ></div>
          </div>

          <span
            class="ns-meter-text"
            :class="{
              'ns-meter-text--red': isLowConfidence(item.ai_confidence),
              'ns-meter-text--amber': !isLowConfidence(item.ai_confidence),
            }"
          >
            {{ getConfidencePercentage(item.ai_confidence) }}%
            <span class="ns-confidence-qualifier">
              {{ isLowConfidence(item.ai_confidence) ? '(Low)' : '(Moderate)' }}
            </span>
          </span>
        </div>
      </li>
    </ul>

    <!-- Pagination -->
    <div
      v-if="total > pageSize"
      class="ns-triage-pagination"
      role="navigation"
      aria-label="Triage list pagination"
      data-test="triage-pagination"
    >
      <button
        type="button"
        class="ns-page-nav-btn"
        :disabled="page <= 1"
        aria-label="Previous page"
        @click="handlePageChange(page - 1)"
      >
        Previous
      </button>

      <div class="ns-page-numbers">
        <button
          v-for="p in displayedPages"
          :key="p"
          type="button"
          class="ns-page-num-btn"
          :class="{ 'ns-page-num-btn--active': p === page }"
          :aria-current="p === page ? 'page' : undefined"
          @click="handlePageChange(p)"
        >
          {{ p }}
        </button>
      </div>

      <button
        type="button"
        class="ns-page-nav-btn"
        :disabled="page >= totalPages"
        aria-label="Next page"
        @click="handlePageChange(page + 1)"
      >
        Next
      </button>
    </div>
  </div>
</template>

<style scoped>
.ns-triage-list-card {
  background-color: var(--ns-paper, #FFFFFF);
  border: 1px solid var(--ns-line, #E3EAF0);
  border-radius: var(--ns-radius-card, 18px);
  box-shadow: 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06);
  padding: var(--ns-space-20, 20px);
  display: flex;
  flex-direction: column;
  gap: var(--ns-space-16, 16px);
}

.ns-triage-list-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ns-space-12, 12px);
  padding-bottom: var(--ns-space-12, 12px);
  border-bottom: 1px solid var(--ns-line, #EEF3F7);
}

.ns-header-headings {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ns-card-title {
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--ns-navy, #0E2233);
  margin-bottom: 0;
  line-height: 1.25;
}

.ns-card-subtitle {
  font-size: 0.8125rem;
  color: var(--ns-slate, #5B6B7A);
}

.ns-list-count-badge {
  font-size: 11px;
  font-weight: 700;
  color: #0B6A7C;
  background-color: #D8F1F3;
  padding: 3px 8px;
  border-radius: var(--ns-radius-pill, 999px);
  line-height: 1;
  white-space: nowrap;
}

.ns-triage-list-empty {
  padding: var(--ns-space-32, 32px) var(--ns-space-16, 16px);
  text-align: center;
}

.ns-empty-msg {
  font-size: 0.875rem;
  color: var(--ns-slate, #5F6F7E);
  margin: 0;
}

.ns-triage-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--ns-space-8, 8px);
}

.ns-triage-item {
  display: flex;
  flex-direction: column;
  gap: var(--ns-space-8, 8px);
  padding: var(--ns-space-12, 12px) var(--ns-space-16, 16px);
  border-radius: var(--ns-radius-md, 12px);
  border: 1.5px solid var(--ns-line, #E3EAF0);
  background-color: var(--ns-paper, #FFFFFF);
  cursor: pointer;
  user-select: none;
  min-height: 44px;
  transition: all var(--ns-duration-fast, 150ms) var(--ns-easing, ease);
}

.ns-triage-item:hover {
  background-color: var(--ns-surface-2, #F8FAFC);
  border-color: #CBD5E1;
}

.ns-triage-item:focus-visible {
  outline: 2px solid var(--ns-teal-600, #0B7285) !important;
  outline-offset: var(--ns-focus-ring-offset, 2px);
}

.ns-triage-item--selected {
  border-color: var(--ns-teal-600, #0B7285);
  background-color: #EFF8FA;
  box-shadow: 0 2px 8px rgba(11, 114, 133, 0.12);
}

.ns-item-top {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--ns-space-8, 8px);
}

.ns-tracking-code {
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-size: 13px;
  font-weight: 700;
  color: #0B6E99;
}

.ns-wait-time,
.ns-reviewed-time {
  font-size: 12px;
  color: var(--ns-slate, #5F6F7E);
}

.ns-zone-badge {
  font-size: 11px;
  font-weight: 600;
  color: #334155;
  background-color: #EEF3F7;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: auto;
}

.ns-item-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ns-guess-row,
.ns-final-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
}

.ns-guess-label,
.ns-final-label {
  color: var(--ns-slate, #5F6F7E);
  font-weight: 500;
}

.ns-guess-val,
.ns-final-val {
  font-weight: 600;
  color: var(--ns-ink, #0E2233);
}

.ns-final-val {
  color: #0F7A4A;
}

/* Confidence Meter */
.ns-item-confidence {
  display: flex;
  align-items: center;
  gap: var(--ns-space-12, 12px);
  margin-top: 2px;
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
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.ns-meter-text--red {
  color: #B91C1C;
}

.ns-meter-text--amber {
  color: #92400E;
}

.ns-confidence-qualifier {
  font-size: 11px;
  font-weight: 500;
}

/* Pagination Controls */
.ns-triage-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--ns-space-12, 12px);
  border-top: 1px solid var(--ns-line, #EEF3F7);
}

.ns-page-nav-btn {
  height: 40px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1.5px solid #D5DEE7;
  background-color: #FFFFFF;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--ns-duration-fast, 150ms) var(--ns-easing, ease);
}

.ns-page-nav-btn:hover:not(:disabled) {
  background-color: #F8FAFC;
  border-color: #CBD5E1;
}

.ns-page-nav-btn:focus-visible {
  outline: 2px solid #0B7285 !important;
  outline-offset: 2px;
}

.ns-page-numbers {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ns-page-num-btn {
  width: 40px;
  height: 40px;
  min-width: 40px;
  min-height: 40px;
  border-radius: 10px;
  border: 1.5px solid #D5DEE7;
  background-color: #FFFFFF;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--ns-duration-fast, 150ms) var(--ns-easing, ease);
}

.ns-page-num-btn:hover:not(.ns-page-num-btn--active) {
  background-color: #F8FAFC;
  border-color: #CBD5E1;
}

.ns-page-num-btn:focus-visible {
  outline: 2px solid #0B7285 !important;
  outline-offset: 2px;
}

.ns-page-num-btn--active {
  background: linear-gradient(135deg, #0B7285, #0E4F6B);
  color: #FFFFFF;
  border-color: transparent;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(11, 114, 133, 0.2);
}

@media (prefers-reduced-motion: reduce) {
  .ns-triage-item,
  .ns-meter-fill,
  .ns-page-nav-btn,
  .ns-page-num-btn {
    transition: none;
  }
}
</style>
