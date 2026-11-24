<script setup>
import { computed } from 'vue'
import { formatDateTime } from '../../utils/formatDate'
import { getComplaintLocation } from '../../utils/complaintTimeline'

const props = defineProps({
  complaint: {
    type: Object,
    required: true,
  },
})

const isOverdue = computed(() => {
  return Boolean(props.complaint?.is_overdue) && props.complaint?.status !== 'Completed'
})

const locationInfo = computed(() => {
  return getComplaintLocation(props.complaint)
})

const departmentName = computed(() => {
  return props.complaint?.department?.name || props.complaint?.department || 'Sanitation'
})
</script>

<template>
  <div class="ns-summary-card mb-4">
    <div class="ns-summary-card__header">
      <h2 class="ns-summary-card__title">Complaint Details</h2>
    </div>

    <div class="ns-summary-card__body">
      <!-- Complaint Description -->
      <div class="ns-summary-desc-section mb-4">
        <h3 class="ns-section-label text-secondary mb-1">Description</h3>
        <p class="ns-desc-text mb-0 text-break">
          {{ complaint.description || 'No description provided.' }}
        </p>
      </div>

      <!-- 3-Column Facts Grid -->
      <div class="ns-facts-grid mb-4">
        <div class="ns-fact-item">
          <span class="ns-fact-label">Category</span>
          <span class="ns-fact-value fw-semibold">{{ complaint.category || '—' }}</span>
        </div>

        <div class="ns-fact-item">
          <span class="ns-fact-label">Zone</span>
          <span class="ns-fact-value">{{ complaint.zone?.name || '—' }}</span>
        </div>

        <div class="ns-fact-item">
          <span class="ns-fact-label">Department</span>
          <span class="ns-fact-value">{{ departmentName }}</span>
        </div>

        <div class="ns-fact-item">
          <span class="ns-fact-label">Submitted</span>
          <span class="ns-fact-value">{{ formatDateTime(complaint.created_at) }}</span>
        </div>

        <div class="ns-fact-item">
          <span class="ns-fact-label">Deadline</span>
          <div class="ns-fact-value d-flex align-items-center flex-wrap gap-2">
            <span>{{ formatDateTime(complaint.sla_deadline) }}</span>
            <span v-if="isOverdue" class="badge bg-danger text-white">Overdue</span>
          </div>
        </div>

        <div v-if="complaint.reported_via || complaint.channel" class="ns-fact-item">
          <span class="ns-fact-label">Reported via</span>
          <span class="ns-fact-value">{{ complaint.reported_via || complaint.channel }}</span>
        </div>
      </div>

      <!-- Location Row -->
      <div class="ns-location-section pt-3 border-top">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div class="d-flex align-items-center gap-2">
            <svg
              class="ns-location-icon text-secondary"
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
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span class="ns-location-label fw-medium">
              {{ complaint.zone?.name ? `Zone ${complaint.zone.name}` : 'Zone location' }}
            </span>
          </div>

          <a
            v-if="locationInfo.hasCoordinates && locationInfo.mapUrl"
            :href="locationInfo.mapUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="ns-maps-link"
          >
            <span>Open in Maps</span>
            <svg
              class="ns-external-icon"
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
    </div>
  </div>
</template>

<style scoped>
.ns-summary-card {
  background-color: var(--ns-complaint-card-bg, #FFFFFF);
  border: 1px solid var(--ns-complaint-card-border, #E3EAF0);
  border-radius: var(--ns-complaint-card-radius, 18px);
  box-shadow: var(--ns-complaint-card-shadow, 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06));
  overflow: hidden;
}

.ns-summary-card__header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #EEF3F7;
}

.ns-summary-card__title {
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-size: 17px;
  font-weight: 700;
  color: #0E2233;
  margin: 0;
  line-height: 1.2;
}

.ns-summary-card__body {
  padding: 20px 24px;
}

.ns-section-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ns-desc-text {
  font-size: 15px;
  color: #1E293B;
  line-height: 1.6;
}

.ns-facts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px 20px;
}

@media (max-width: 767.98px) {
  .ns-facts-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}

.ns-fact-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ns-fact-label {
  font-size: 12px;
  font-weight: 600;
  color: #5F6F7E;
}

.ns-fact-value {
  font-size: 14px;
  color: #0E2233;
  line-height: 1.4;
}

.ns-location-section {
  border-color: #EEF3F7 !important;
}

.ns-location-label {
  font-size: 13.5px;
  color: #334155;
}

.ns-maps-link {
  font-size: 13px;
  font-weight: 600;
  color: #0B7285;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  min-height: 44px;
  padding: 0 4px;
  transition: color 150ms ease;
}

.ns-maps-link:hover {
  color: #0E4F6B;
  text-decoration: underline;
}

.ns-maps-link:focus-visible {
  outline: 2px solid #0B7285;
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
