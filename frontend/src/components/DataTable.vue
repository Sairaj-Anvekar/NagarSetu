<script setup>
import LoadingSpinner from './LoadingSpinner.vue'
import ErrorAlert from './ErrorAlert.vue'

const props = defineProps({
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
  variant: {
    type: String,
    default: 'default',
  },
  clickableRows: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['retry', 'row-click'])

function handleRowClick(event, row) {
  if (props.variant === 'admin' || props.clickableRows) {
    if (event.target.closest('a, button, input, select, textarea, [role="button"]')) {
      return
    }
    emit('row-click', row)
  }
}
</script>

<template>
  <LoadingSpinner v-if="loading" centered />
  <ErrorAlert v-else-if="error" :message="error" show-retry @retry="emit('retry')" />
  <div v-else-if="!rows.length" class="text-center text-muted py-4">
    {{ emptyMessage }}
  </div>
  <div v-else class="table-responsive">
    <table
      class="table align-middle"
      :class="[
        variant === 'admin' ? 'ns-table--admin' : 'table-hover',
      ]"
    >
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key">
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row[rowKey]"
          :class="{ 'ns-table-row--clickable': variant === 'admin' || clickableRows }"
          :tabindex="(variant === 'admin' || clickableRows) ? 0 : undefined"
          @click="handleRowClick($event, row)"
          @keydown.enter.prevent="handleRowClick($event, row)"
        >
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

<style scoped>
/* Admin variant table styles */
.ns-table--admin {
  margin-bottom: 0;
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
}

.ns-table--admin thead th {
  background-color: #F6F9FB;
  color: #4B5B6B;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 12px 16px;
  border-bottom: 1px solid #E3EAF0;
  border-top: none;
  white-space: nowrap;
}

.ns-table--admin tbody td {
  padding: 14px 16px;
  border-bottom: 1px solid #EEF3F7;
  border-top: none;
  color: #0E2233;
  background-color: #FFFFFF;
  transition: background-color 120ms ease;
}

.ns-table--admin tbody tr.ns-table-row--clickable {
  cursor: pointer;
}

.ns-table--admin tbody tr.ns-table-row--clickable:hover td {
  background-color: #F3F8FA;
}

.ns-table--admin tbody tr.ns-table-row--clickable:focus-visible {
  outline: 2px solid #0B7285;
  outline-offset: -2px;
}

@media (prefers-reduced-motion: reduce) {
  .ns-table--admin tbody td {
    transition: none;
  }
}
</style>
