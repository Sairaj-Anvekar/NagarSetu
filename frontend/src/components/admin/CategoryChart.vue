<script setup>
import { computed } from 'vue'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js'
import { Bar } from 'vue-chartjs'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps({
  categories: {
    type: Array,
    default: () => [],
  },
})

const sortedCategories = computed(() => {
  if (!props.categories || !Array.isArray(props.categories)) return []
  return [...props.categories].sort((a, b) => (b.count || 0) - (a.count || 0))
})

const ariaLabel = computed(() => {
  if (sortedCategories.value.length === 0) return 'Complaints by category: No data'
  const summary = sortedCategories.value.map((item) => `${item.category} ${item.count}`).join(', ')
  return `Complaints by category: ${summary}`
})

const chartData = computed(() => ({
  labels: sortedCategories.value.map((item) => item.category),
  datasets: [
    {
      label: 'Complaints',
      data: sortedCategories.value.map((item) => item.count),
      backgroundColor: '#0B6E99',
      borderRadius: 4,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  animation: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: true,
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: {
        precision: 0,
      },
    },
  },
}
</script>

<template>
  <div class="category-chart">
    <div v-if="sortedCategories.length === 0" class="category-chart__empty text-muted">No data</div>
    <div v-else class="category-chart__container" role="img" :aria-label="ariaLabel">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<style scoped>
.category-chart {
  width: 100%;
  height: 100%;
  min-height: 240px;
}

.category-chart__empty {
  padding: 2rem 0;
  text-align: center;
  font-size: 0.875rem;
  color: var(--ns-slate);
}

.category-chart__container {
  width: 100%;
  height: 100%;
  min-height: 240px;
  position: relative;
}
</style>

