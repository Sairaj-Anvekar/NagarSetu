<script setup>
import { computed } from 'vue'

const props = defineProps({
  department: {
    type: [String, Object],
    default: '',
  },
  zone: {
    type: [String, Object],
    default: '',
  },
  phone: {
    type: String,
    default: '',
  },
})

function extractName(value) {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object' && typeof value.name === 'string') {
    return value.name.trim()
  }
  return ''
}

function maskPhoneNumber(value) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''

  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 5) return ''

  const last5 = digits.slice(-5)
  if (trimmed.startsWith('+91')) {
    return `+91 ••••• ${last5}`
  }
  return `••••• ${last5}`
}

const rows = computed(() => {
  const list = []
  const dept = extractName(props.department)
  if (dept) {
    list.push({ id: 'dept', label: 'Department', value: dept })
  }

  const zn = extractName(props.zone)
  if (zn) {
    list.push({ id: 'zone', label: 'Zone', value: zn })
  }

  const masked = maskPhoneNumber(props.phone)
  if (masked) {
    list.push({ id: 'phone', label: 'Phone', value: masked })
  }

  return list
})
</script>

<template>
  <div v-if="rows.length > 0" class="ns-account-info-card">
    <dl class="ns-account-info-card__list mb-0">
      <div
        v-for="row in rows"
        :key="row.id"
        class="ns-account-info-card__row"
      >
        <dt class="ns-account-info-card__label">{{ row.label }}</dt>
        <dd class="ns-account-info-card__value mb-0">{{ row.value }}</dd>
      </div>
    </dl>
  </div>
</template>

<style scoped>
.ns-account-info-card {
  background-color: var(--ns-paper, #ffffff);
  border: 1px solid var(--ns-worker-tab-border, #e3eaf0);
  border-radius: 18px;
  padding: 0 16px;
  box-shadow: 0 2px 8px rgba(14, 34, 51, 0.05);
  box-sizing: border-box;
}

.ns-account-info-card__list {
  display: flex;
  flex-direction: column;
}

.ns-account-info-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  padding: 12px 0;
  border-bottom: 1px solid #e9eef3;
  font-size: 14px;
  line-height: 1.4;
}

.ns-account-info-card__row:last-child {
  border-bottom: none;
}

.ns-account-info-card__label {
  margin: 0;
  font-family: var(--ns-font-body);
  font-weight: 500;
  color: var(--ns-slate, #5b6b7a);
}

.ns-account-info-card__value {
  font-family: var(--ns-font-body);
  font-weight: 600;
  color: var(--ns-ink, #0e2233);
  text-align: right;
  overflow-wrap: anywhere;
}
</style>
