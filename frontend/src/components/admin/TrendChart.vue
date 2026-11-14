<script setup>
import { computed } from 'vue'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
} from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
)

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/**
 * Formats an ISO date string (YYYY-MM-DD) to "D Mon" (e.g. "14 Nov")
 * by splitting the string manually to avoid timezone shifting.
 *
 * @param {string} dateStr
 * @returns {string}
 */
function formatTrendDate(dateStr) {
  if (typeof dateStr !== 'string') return ''
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const monthIdx = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)
  if (Number.isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11 || Number.isNaN(day)) {
    return dateStr
  }
  return `${day} ${MONTH_NAMES[monthIdx]}`
}

const props = defineProps({
  trends: {
    type: Array,
    default: () => [],
  },
})

const labels = computed(() => {
  if (!props.trends || !Array.isArray(props.trends)) return []
  return props.trends.map((item) => formatTrendDate(item.date))
})

const ariaLabel = computed(() => {
  if (!props.trends || props.trends.length === 0) return 'Complaint trends: No data'
  const totalCreated = props.trends.reduce((acc, cur) => acc + (cur.created || 0), 0)
  const totalCompleted = props.trends.reduce((acc, cur) => acc + (cur.completed || 0), 0)
  return `Complaint trends over ${props.trends.length} days: ${totalCreated} created, ${totalCompleted} completed`
})

const chartData = computed(() => ({
  labels: labels.value,
  datasets: [
    {
      label: 'Created',
      data: (props.trends || []).map((item) => item.created || 0),
      borderColor: '#0B6E99',
      backgroundColor: '#0B6E99',
      borderWidth: 2,
      borderDash: [],
      tension: 0.1,
    },
    {
      label: 'Completed',
      data: (props.trends || []).map((item) => item.completed || 0),
      borderColor: '#0F7A4A',
      backgroundColor: '#0F7A4A',
      borderWidth: 2,
      borderDash: [5, 5],
      tension: 0.1,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: {
      display: true,
      position: 'top',
    },
    tooltip: {
      enabled: true,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      min: 0,
      ticks: {
        precision: 0,
        stepSize: 1,
      },
    },
    x: {
      grid: {
        display: false,
      },
    },
  },
}
</script>

<template>
  <div class="trend-chart">
    <div v-if="!trends || trends.length === 0" class="trend-chart__empty text-muted">No data</div>
    <div v-else class="trend-chart__container" role="img" :aria-label="ariaLabel">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<style scoped>
.trend-chart {
  width: 100%;
  height: 100%;
  min-height: 280px;
}

.trend-chart__empty {
  padding: 3rem 0;
  text-align: center;
  font-size: 0.875rem;
  color: var(--ns-slate);
}

.trend-chart__container {
  width: 100%;
  height: 100%;
  min-height: 280px;
  position: relative;
}
</style>
