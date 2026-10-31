<script setup>
import LoadingSpinner from './LoadingSpinner.vue'
import ErrorAlert from './ErrorAlert.vue'

defineProps({
  columns: {
    type: Array,
    required: true,
  },
  rows: {
    type: Array,
    default: () => [],
  },
  rowKey: {
    type: String,
    default: 'id',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
  emptyMessage: {
    type: String,
    default: 'No records found.',
  },
})

const emit = defineEmits(['retry'])
</script>

<template>
  <LoadingSpinner v-if="loading" centered />
  <ErrorAlert v-else-if="error" :message="error" show-retry @retry="emit('retry')" />
  <div v-else-if="!rows.length" class="text-center text-muted py-4">
    {{ emptyMessage }}
  </div>
  <div v-else class="table-responsive">
    <table class="table table-hover align-middle">
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key">
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row[rowKey]">
          <td v-for="column in columns" :key="column.key">
            <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
              {{ row[column.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
