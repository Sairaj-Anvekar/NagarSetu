<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import EmptyState from '../components/EmptyState.vue'
import WorkerTaskCard from '../components/worker/WorkerTaskCard.vue'
import { fetchMyTasks } from '../api/workerApi'
import { getErrorMessage } from '../utils/apiError'

const items = ref([])
const total = ref(0)
const isLoading = ref(false)
const hasLoaded = ref(false)
const error = ref('')

let requestId = 0
let isMounted = false

const subtitle = computed(() => {
  if (!hasLoaded.value) {
    return 'Complaints assigned to you.'
  }
  const count = items.value.length
  if (count === 0) {
    return 'No tasks right now.'
  }
  const taskText = count === 1 ? '1 task' : `${count} tasks`
  const overdueCount = items.value.filter((t) => t.is_overdue).length
  if (overdueCount > 0) {
    return `${taskText} · ${overdueCount} overdue`
  }
  return taskText
})

async function loadTasks() {
  const currentRequestId = ++requestId
  isLoading.value = true
  error.value = ''

  try {
    const data = await fetchMyTasks()
    if (!isMounted || currentRequestId !== requestId) return

    items.value = data.items
    total.value = data.total
    hasLoaded.value = true
  } catch (err) {
    if (!isMounted || currentRequestId !== requestId) return

    error.value = getErrorMessage(err)
  } finally {
    if (isMounted && currentRequestId === requestId) {
      isLoading.value = false
    }
  }
}

onMounted(() => {
  isMounted = true
  loadTasks()
})

onBeforeUnmount(() => {
  isMounted = false
})

defineExpose({
  loadTasks,
})
</script>

<template>
  <div class="worker-tasks-page">
    <PageHeader title="My tasks" :subtitle="subtitle">
      <template #actions>
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm worker-refresh-btn d-inline-flex align-items-center gap-1"
          :disabled="isLoading"
          @click="loadTasks"
        >
          <LoadingSpinner v-if="isLoading" size="sm" label="Refreshing" />
          <span>Refresh</span>
        </button>
      </template>
    </PageHeader>

    <LoadingSpinner
      v-if="isLoading && !hasLoaded"
      centered
      label="Loading your tasks..."
    />

    <template v-else>
      <ErrorAlert
        v-if="error"
        class="mb-3"
        title="Could not load tasks"
        :message="error"
        show-retry
        @retry="loadTasks"
      />

      <EmptyState
        v-if="hasLoaded && !error && items.length === 0"
        title="No tasks assigned"
        message="New complaints assigned to you will appear here."
      >
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm worker-refresh-btn"
          :disabled="isLoading"
          @click="loadTasks"
        >
          Refresh
        </button>
      </EmptyState>

      <ul v-if="items.length > 0" class="list-unstyled d-grid gap-3 mb-0">
        <li v-for="task in items" :key="task.id">
          <WorkerTaskCard :task="task" />
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.worker-refresh-btn {
  min-height: 44px;
}
</style>
