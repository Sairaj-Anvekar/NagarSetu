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

const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
function variants(families, suffixes) {
  return families.flatMap((family) => suffixes.map((suffix) => `${family}-${suffix}`))
}

const colorGroups = {
  'Brand anchors': ['ink', 'harbour', 'harbour-dark', 'span', 'mist', 'paper', 'slate', 'line', 'navy'],
  'Primary blue': variants(['primary'], shades),
  Teal: variants(['teal'], shades.filter((shade) => shade <= 700)),
  Navy: variants(['navy'], shades),
  'Cool gray': variants(['gray'], [0, ...shades]),
  Surfaces: ['app-bg', 'surface', 'surface-2', 'surface-raised', 'sidebar', 'overlay'],
  Borders: ['border-subtle', 'border-default', 'border-strong', 'focus-ring-color'],
  'Semantic colors': [
    ...variants(['success', 'warning', 'danger', 'info'], ['solid', 'bg', 'fg']),
    ...variants(['orange', 'neutral'], ['bg', 'fg']),
  ],
  'Complaint statuses': variants(
    ['status-submitted', 'status-in-progress', 'status-completed'], ['bg', 'text', 'dot'],
  ),
  Priorities: variants(
    ['priority-critical', 'priority-high', 'priority-medium', 'priority-low'], ['bg', 'text', 'dot'],
  ),
}

const theme = getComputedStyle(document.documentElement)

const foundationGroups = {
  Spacing: variants(['space'], [4, 8, 12, 16, 24, 32, 48]),
  Corners: variants(['radius'], ['sm', 'md', 'lg', 'control', 'card', 'pill']),
  Shadows: variants(['shadow'], ['xs', 'sm', 'md', 'lg', 'card', 'pop']),
  Focus: ['focus-ring', 'focus-ring-offset'],
  Motion: ['duration-fast', 'duration-base', 'easing'],
  Layout: ['admin-content-max-width', 'page-padding', 'z-base', 'z-sticky', 'z-skip-link'],
  Fonts: ['font-body', 'font-display', 'type-numeric-variant'],
}
const typeSamples = {
  'page-title': 'Civic grievance overview', 'section-title': 'Assigned tasks',
  'card-title': 'Grievance details', body: 'Review assigned tasks and keep their progress up to date.',
  small: 'An internet connection is required to load current tasks.',
  caption: 'Last updated at 09:30', overline: 'ZONE A',
}
function typeStyle(role) {
  const token = (part) => `var(--ns-type-${role}-${part})`
  return {
    fontFamily: token('family'), fontSize: token('size'), fontWeight: token('weight'),
    lineHeight: token('line-height'), letterSpacing: role === 'overline' ? token('letter-spacing') : undefined,
  }
}

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
      <div v-for="(tokens, group) in colorGroups" :key="group" class="mb-4">
        <h4 class="h6">{{ group }}</h4>
        <div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-2">
          <div v-for="token in tokens" :key="token" class="col">
            <div class="card h-100">
              <div class="card-body">
                <div
                  class="border rounded mb-3"
                  :style="{ backgroundColor: `var(--ns-${token})`, height: '3rem' }"
                  aria-hidden="true"
                ></div>
                <code class="d-block text-body text-break">--ns-{{ token }}</code>
                <small class="text-secondary ns-num">
                  {{ theme.getPropertyValue(`--ns-${token}`).trim() }}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-for="(tokens, group) in foundationGroups" :key="group" class="mb-4">
        <h3 class="h6">{{ group }}</h3>
        <dl class="mb-0">
          <template v-for="token in tokens" :key="token">
            <dt><code class="text-body">--ns-{{ token }}</code></dt>
            <dd class="text-secondary text-break">
              {{ theme.getPropertyValue(`--ns-${token}`).trim() }}
              <span v-if="group === 'Spacing'" class="d-block bg-primary py-1"
                :style="{ width: `var(--ns-${token})` }" aria-hidden="true"></span>
              <span v-if="group === 'Corners' || group === 'Shadows'"
                class="d-block bg-white border p-3 my-2" aria-hidden="true"
                :style="{ width: '5rem', [group === 'Corners' ? 'borderRadius' : 'boxShadow']: `var(--ns-${token})` }"></span>
            </dd>
          </template>
        </dl>
        <button v-if="group === 'Motion'" type="button" class="btn btn-outline-primary"
          :style="{ transition: 'background-color var(--ns-duration-base) var(--ns-easing), color var(--ns-duration-fast) var(--ns-easing)' }">
          Hover or focus to preview
        </button>
        <div v-if="group === 'Layout'" class="border bg-white py-2"
          :style="{ paddingInline: 'var(--ns-page-padding)', maxWidth: 'var(--ns-admin-content-max-width)' }">
          <div class="bg-body-secondary">Page content</div>
        </div>
      </div>
      <h3 class="h6 mt-4 mb-3">Type scale</h3>
      <div class="card card-body">
        <div v-for="(sample, role) in typeSamples" :key="role">
          <small class="text-secondary">{{ role }}</small>
          <p :style="typeStyle(role)">{{ sample }}</p>
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
          <p class="small text-secondary">
            Hover over an enabled button, then hold the pointer down to see its pressed state.
            Use Tab to see the keyboard focus ring.
          </p>
          <h3 class="h6 mt-4 mb-3">Pressed buttons</h3>
          <div class="d-flex flex-wrap gap-3">
            <button
              v-for="variant in buttonVariants"
              :key="variant.className"
              type="button"
              class="btn active"
              :class="variant.className"
              aria-pressed="true"
              data-bs-toggle="button"
            >
              {{ variant.label }}
            </button>
          </div>
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
            <div class="col-md-6">
              <label for="design-zone-disabled" class="form-label">Assigned zone (disabled)</label>
              <input id="design-zone-disabled" class="form-control" value="Zone A" disabled />
            </div>
            <div class="col-md-6">
              <label for="design-dept-disabled" class="form-label">Department (disabled)</label>
              <select id="design-dept-disabled" class="form-select" disabled>
                <option>Sanitation</option>
              </select>
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
      <figure class="card card-body mb-3">
        <figcaption class="mb-2">Skeleton for a task summary</figcaption>
        <div aria-hidden="true">
          <span class="ns-skeleton w-50 mb-2"></span>
          <span class="ns-skeleton w-75"></span>
        </div>
      </figure>
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
      <h2 class="h4 mb-3">Alerts</h2>
      <div class="alert alert-success">Completed. The resolution photo was saved.</div>
      <div class="alert alert-warning">Offline. Reconnect to update this task.</div>
      <div class="alert alert-info">Zone A is selected. The list shows tasks in this zone.</div>
      <div class="alert alert-secondary">No filters applied. Showing all priorities.</div>
    </section>

    <section class="mt-5">
      <h2 class="h4 mb-3">Cards</h2>
      <a href="#design-tables" class="card card-body mb-3">View the sample complaints table</a>
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
      <h2 id="design-tables" class="h4 mb-3" tabindex="-1">Tables</h2>
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
