<script setup>
import { ref } from 'vue'
import StatusBadge from '../components/StatusBadge.vue'
import PriorityBadge from '../components/PriorityBadge.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import AppCard from '../components/AppCard.vue'
import DataTable from '../components/DataTable.vue'
import EmptyState from '../components/EmptyState.vue'

const retryMessage = ref('')
const tableRetryMessage = ref('')
const emptyActionMessage = ref('')

const buttonVariants = [
  { label: 'Primary', className: 'btn-primary' },
  { label: 'Outline primary', className: 'btn-outline-primary' },
  { label: 'Outline secondary', className: 'btn-outline-secondary' },
  { label: 'Light', className: 'btn-light' },
]
const buttonSizes = [
  { label: 'Small', className: 'btn-sm' },
  { label: 'Default', className: '' },
  { label: 'Large', className: 'btn-lg' },
]

const colorTokens = [
  { name: '--ns-ink', value: '#14202B' },
  { name: '--ns-harbour', value: '#0B6E99' },
  { name: '--ns-harbour-dark', value: '#095A7E' },
  { name: '--ns-span', value: '#14A89A' },
  { name: '--ns-mist', value: '#F5F7FA' },
  { name: '--ns-paper', value: '#FFFFFF' },
  { name: '--ns-slate', value: '#5B6B7A' },
  { name: '--ns-line', value: '#E3E8EE' },
  { name: '--ns-navy', value: '#0F2233' },
  { name: '--ns-surface-2', value: '#F8FAFC' },
  { name: '--ns-success-bg', value: '#E6F6EE' },
  { name: '--ns-success-fg', value: '#0F7A4A' },
  { name: '--ns-warning-bg', value: '#FFF4DB' },
  { name: '--ns-warning-fg', value: '#8A5A00' },
  { name: '--ns-danger-bg', value: '#FDECEC' },
  { name: '--ns-danger-fg', value: '#B42318' },
  { name: '--ns-info-bg', value: '#E4F1F8' },
  { name: '--ns-info-fg', value: '#0B5C80' },
  { name: '--ns-orange-bg', value: '#FFEDE0' },
  { name: '--ns-orange-fg', value: '#B54708' },
  { name: '--ns-neutral-bg', value: '#EEF1F5' },
  { name: '--ns-neutral-fg', value: '#475467' },
]

const foundationTokens = [
  { name: '--ns-radius-card', value: '12px' },
  { name: '--ns-radius-control', value: '8px' },
  { name: '--ns-radius-pill', value: '999px' },
  { name: '--ns-shadow-card', value: '0 1px 2px rgba(16, 24, 40, 0.05)' },
  { name: '--ns-shadow-pop', value: '0 8px 24px rgba(16, 24, 40, 0.12)' },
  {
    name: '--ns-font-body',
    value:
      "'Public Sans Variable', 'Noto Sans Devanagari', system-ui, -apple-system, " +
      "'Segoe UI', sans-serif",
  },
  {
    name: '--ns-font-display',
    value: "'Sora Variable', 'Public Sans Variable', system-ui, sans-serif",
  },
]

const sampleColumns = [
  { key: 'code', label: 'Code' },
  { key: 'category', label: 'Category' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'deadline', label: 'Deadline' },
]

const sampleRows = [
  {
    id: 1,
    code: 'GRV-2026-A7X3',
    category: 'Roads & Footpaths',
    status: 'In-Progress',
    priority: 'critical',
    deadline: '2026-10-25',
  },
  {
    id: 2,
    code: 'GRV-2026-B8K1',
    category: 'Water Supply',
    status: 'Submitted',
    priority: 'high',
    deadline: '2026-10-27',
  },
  {
    id: 3,
    code: 'GRV-2026-C2M9',
    category: 'Street Lighting',
    status: 'Submitted',
    priority: 'medium',
    deadline: '2026-10-30',
  },
  {
    id: 4,
    code: 'GRV-2026-D4P5',
    category: 'Garbage Disposal',
    status: 'Completed',
    priority: 'low',
    deadline: '2026-10-22',
  },
]

const statusVariants = [
  { status: 'Submitted', caption: 'Initial state when citizen files grievance' },
  { status: 'In-Progress', caption: 'Assigned worker has started resolution work' },
  { status: 'Completed', caption: 'Field work finished and grievance resolved' },
  { status: 'Unknown', caption: 'Fallback preview only; not an accepted complaint status' },
]

const priorityVariants = [
  { priority: 'critical', caption: 'Immediate hazard or life-safety threat' },
  { priority: 'high', caption: 'Severe disruption affecting many citizens' },
  { priority: 'medium', caption: 'Standard service maintenance request' },
  { priority: 'low', caption: 'Minor aesthetic or non-urgent civic item' },
  { priority: 'unknown', caption: 'Fallback preview only; not an accepted priority' },
]
</script>

<template>
  <div class="container py-5 ns-design">
    <h1 class="mb-4">Design System</h1>

    <section class="mb-5" aria-labelledby="foundations-heading">
      <h2 id="foundations-heading" class="h4 mb-3">Foundations</h2>
      <h3 class="h6 mb-3">Color tokens</h3>
      <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3 mb-4">
        <div v-for="token in colorTokens" :key="token.name" class="col">
          <div class="card h-100">
            <div class="card-body">
              <div
                class="border rounded mb-3"
                :style="{ backgroundColor: `var(${token.name})`, height: '3rem' }"
                aria-hidden="true"
              ></div>
              <code class="d-block text-body text-break">{{ token.name }}</code>
              <small class="text-secondary ns-num">{{ token.value }}</small>
            </div>
          </div>
        </div>
      </div>
      <h3 class="h6 mb-3">Corners, shadows, and fonts</h3>
      <dl class="row mb-0">
        <template v-for="token in foundationTokens" :key="token.name">
          <dt class="col-md-4 mb-1"><code class="text-body">{{ token.name }}</code></dt>
          <dd class="col-md-8 mb-3 text-secondary text-break">{{ token.value }}</dd>
        </template>
      </dl>
      <h3 class="h6 mt-4 mb-3">Type scale</h3>
      <div class="card">
        <div class="card-body">
          <small class="d-block text-secondary mb-1">h1 · Sora · 1.75rem · weight 600</small>
          <p class="h1 mb-4">Civic grievance overview</p>
          <small class="d-block text-secondary mb-1">h2 · Sora · 1.375rem · weight 600</small>
          <p class="h2 mb-4">Assigned tasks</p>
          <small class="d-block text-secondary mb-1">h3 · Sora · 1.125rem · weight 600</small>
          <p class="h3 mb-4">Grievance details</p>
          <small class="d-block text-secondary mb-1">h4 · Sora · 1rem · weight 600</small>
          <p class="h4 mb-4">Latest update</p>
          <small class="d-block text-secondary mb-1">Body · Public Sans · 1rem</small>
          <p class="mb-4">Review assigned tasks and keep their progress up to date.</p>
          <small class="d-block text-secondary mb-1">Small · Public Sans · 0.8125rem</small>
          <small class="d-block">An internet connection is required to load current tasks.</small>
        </div>
      </div>
    </section>

    <section class="mb-5" aria-labelledby="buttons-forms-heading">
      <h2 id="buttons-forms-heading" class="h4 mb-3">Buttons and forms</h2>
      <div class="card">
        <div class="card-body">
          <h3 class="h6 mb-3">Button variants and sizes</h3>
          <div v-for="variant in buttonVariants" :key="variant.className" class="mb-4">
            <p class="fw-semibold mb-2">{{ variant.label }}</p>
            <div class="d-flex flex-wrap align-items-center gap-3">
              <button
                v-for="size in buttonSizes"
                :key="size.label"
                type="button"
                class="btn"
                :class="[variant.className, size.className]"
              >
                {{ variant.label }} · {{ size.label }}
              </button>
            </div>
          </div>
          <small class="text-secondary">Preview only. Use Tab to inspect keyboard focus.</small>
          <h3 class="h6 mt-4 mb-3">Disabled buttons</h3>
          <p class="small text-secondary">
            These actions are unavailable. Disabled buttons are skipped during Tab navigation.
          </p>
          <div v-for="variant in buttonVariants" :key="variant.className" class="mb-4">
            <p class="fw-semibold mb-2">{{ variant.label }}</p>
            <div class="d-flex flex-wrap align-items-center gap-3">
              <button
                v-for="size in buttonSizes"
                :key="size.label"
                type="button"
                class="btn"
                :class="[variant.className, size.className]"
                disabled
              >
                {{ variant.label }} · {{ size.label }} · Disabled
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="card mt-4">
        <div class="card-body">
          <h3 class="h6 mb-3">Form controls</h3>
          <p class="small text-secondary">Validation examples are fixed previews; nothing is saved.</p>
          <div class="row g-4">
            <div class="col-md-6">
              <label for="design-search" class="form-label">Search grievances</label>
              <input
                id="design-search" type="text" class="form-control"
                placeholder="Enter a grievance code" aria-describedby="design-search-help"
              />
              <div id="design-search-help" class="form-text">Example: GRV-2026-A7X3</div>
            </div>
            <div class="col-md-6">
              <label for="design-priority" class="form-label">Priority</label>
              <select id="design-priority" class="form-select">
                <option value="">Choose a priority</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div class="col-md-6">
              <label for="design-valid" class="form-label">Grievance code (valid example)</label>
              <input
                id="design-valid" type="text" class="form-control is-valid"
                value="GRV-2026-A7X3" aria-describedby="design-valid-feedback" readonly
              />
              <div id="design-valid-feedback" class="valid-feedback">Grievance code accepted.</div>
            </div>
            <div class="col-md-6">
              <label for="design-invalid" class="form-label">Work note (invalid example)</label>
              <input
                id="design-invalid" type="text" class="form-control is-invalid"
                aria-invalid="true" aria-describedby="design-invalid-feedback" readonly
              />
              <div id="design-invalid-feedback" class="invalid-feedback">Enter a work note.</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mb-5">
      <h2 class="h4 mb-3">Status badges</h2>
      <div class="row g-3">
        <div v-for="item in statusVariants" :key="item.status" class="col-12 col-sm-6 col-lg-3">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <div class="mb-2">
                <StatusBadge :status="item.status" />
              </div>
              <small class="text-muted">{{ item.caption }}</small>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2 class="h4 mb-3">Priority badges</h2>
      <div class="row g-3">
        <div v-for="item in priorityVariants" :key="item.priority" class="col-12 col-sm-6 col-md-3">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <div class="mb-2">
                <PriorityBadge :priority="item.priority" />
              </div>
              <small class="text-muted">{{ item.caption }}</small>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mt-5">
      <h2 class="h4 mb-3">Loading states</h2>
      <div class="row g-3">
        <div class="col-12 col-md-4">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <div class="mb-2">
                <LoadingSpinner size="sm" />
              </div>
              <small class="text-muted">Small spinner</small>
            </div>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <div class="mb-2">
                <LoadingSpinner size="md" />
              </div>
              <small class="text-muted">Default medium spinner</small>
            </div>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <div class="mb-2">
                <LoadingSpinner size="lg" />
              </div>
              <small class="text-muted">Large spinner (3rem)</small>
            </div>
          </div>
        </div>
        <div class="col-12">
          <div class="card shadow-sm">
            <div class="card-body">
              <LoadingSpinner centered label="Fetching civic records..." />
              <div class="text-center">
                <small class="text-muted">Centered spinner with custom label</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mt-5">
      <h2 class="h4 mb-3">Error states</h2>
      <div class="row g-3">
        <div class="col-12 col-md-6">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <ErrorAlert message="Unable to load grievances from the server." />
              <small class="text-muted">Standard alert with message only</small>
            </div>
          </div>
        </div>
        <div class="col-12 col-md-6">
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <ErrorAlert
                title="Connection failed"
                message="Server is unreachable. Please check your network connection."
                show-retry
                @retry="retryMessage = 'Retry clicked'"
              />
              <small class="text-muted">Alert with retry button</small>
              <small v-if="retryMessage" class="d-block mt-2 text-primary">{{ retryMessage }}</small>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mt-5">
      <h2 class="h4 mb-3">Cards</h2>
      <div class="row g-3">
        <div class="col-12 col-md-4">
          <AppCard title="Grievance Details">
            <p class="mb-0">Pothole reported near Ward 7 market area requiring asphalt resurfacing.</p>
          </AppCard>
        </div>
        <div class="col-12 col-md-4">
          <AppCard>
            <p class="mb-0">This card has no header title and presents direct body content cleanly.</p>
          </AppCard>
        </div>
        <div class="col-12 col-md-4">
          <AppCard title="Assigned Worker">
            <p class="mb-0">Field operative deployed for inspection and photographic evidence collection.</p>
            <template #footer>
              <small class="text-muted">Updated 10 minutes ago</small>
            </template>
          </AppCard>
        </div>
      </div>
    </section>

    <section class="mt-5">
      <h2 class="h4 mb-3">Tables</h2>
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <DataTable :columns="sampleColumns" :rows="sampleRows">
            <template #cell-status="{ value }">
              <StatusBadge :status="value" />
            </template>
            <template #cell-priority="{ value }">
              <PriorityBadge :priority="value" />
            </template>
          </DataTable>
          <small class="text-muted">Standard data table with custom badge slots</small>
        </div>
      </div>

      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <DataTable :columns="sampleColumns" :rows="sampleRows" loading />
          <small class="text-muted">Loading state with centered spinner</small>
        </div>
      </div>

      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <DataTable
            :columns="sampleColumns"
            :rows="sampleRows"
            error="Could not load complaints."
            @retry="tableRetryMessage = 'Retry clicked'"
          />
          <small class="text-muted">Error state with retry action</small>
          <small v-if="tableRetryMessage" class="d-block mt-2 text-primary">
            {{ tableRetryMessage }}
          </small>
        </div>
      </div>

      <div class="card shadow-sm">
        <div class="card-body">
          <DataTable :columns="sampleColumns" :rows="[]" />
          <small class="text-muted">Empty state when no rows are available</small>
        </div>
      </div>
    </section>
    <section class="mt-5" aria-labelledby="empty-states-heading">
      <h2 id="empty-states-heading" class="h4 mb-3">Empty states</h2>
      <div class="row g-3">
        <div class="col-md-6">
          <AppCard class="h-100">
            <EmptyState
              title="No assigned tasks"
              message="New assignments will appear here. Refresh to check for updates."
            >
              <button
                type="button"
                class="btn btn-outline-primary"
                @click="emptyActionMessage = 'Preview only: no task request was sent.'"
              >
                Refresh tasks
              </button>
            </EmptyState>
            <p class="small text-secondary text-center mb-0" role="status">
              {{ emptyActionMessage }}
            </p>
          </AppCard>
        </div>
        <div class="col-md-6">
          <AppCard class="h-100">
            <EmptyState title="No grievances to display" />
          </AppCard>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ns-design > section > h2 {
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--ns-line);
}

.ns-design code {
  overflow-wrap: anywhere;
}

.ns-design .btn {
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
}

.ns-design dt,
.ns-design dd {
  min-width: 0;
}

@media (max-width: 575.98px) {
  .ns-design .card-body {
    padding: 1rem;
  }

  .ns-design .h1 {
    overflow-wrap: anywhere;
  }
}
</style>
