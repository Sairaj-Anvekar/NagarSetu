<script setup>
import { ref } from 'vue'
import StatusBadge from '../components/StatusBadge.vue'
import PriorityBadge from '../components/PriorityBadge.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import AppCard from '../components/AppCard.vue'
import DataTable from '../components/DataTable.vue'

const retryMessage = ref('')
const tableRetryMessage = ref('')

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
]

const priorityVariants = [
  { priority: 'critical', caption: 'Immediate hazard or life-safety threat' },
  { priority: 'high', caption: 'Severe disruption affecting many citizens' },
  { priority: 'medium', caption: 'Standard service maintenance request' },
  { priority: 'low', caption: 'Minor aesthetic or non-urgent civic item' },
]
</script>

<template>
  <div class="container py-5">
    <h1 class="mb-4">Design System</h1>

    <section class="mb-5">
      <h2 class="h4 mb-3">Status badges</h2>
      <div class="row g-3">
        <div v-for="item in statusVariants" :key="item.status" class="col-12 col-md-4">
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
  </div>
</template>
