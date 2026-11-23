<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  userName: {
    type: String,
    default: '',
  },
  departmentName: {
    type: String,
    default: '',
  },
  openCount: {
    type: Number,
    default: 0,
  },
  overdueCount: {
    type: Number,
    default: 0,
  },
  now: {
    type: [Date, Number],
    default: () => new Date(),
  },
})

const greetingTime = computed(() => {
  const dateObj = props.now instanceof Date ? props.now : new Date(props.now)
  const hour = dateObj.getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
})

const displayName = computed(() => {
  const trimmed = typeof props.userName === 'string' ? props.userName.trim() : ''
  if (!trimmed) return 'Admin'
  return trimmed.split(' ')[0] || 'Admin'
})

const eyebrowText = computed(() => {
  const dept = typeof props.departmentName === 'string' ? props.departmentName.trim() : ''
  if (dept) {
    return `${dept.toUpperCase()} · SOLAPUR`
  }
  return 'SOLAPUR'
})

const formattedDate = computed(() => {
  const dateObj = props.now instanceof Date ? props.now : new Date(props.now)
  const weekday = new Intl.DateTimeFormat('en-IN', { weekday: 'long' }).format(dateObj)
  const day = dateObj.getDate()
  const month = new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(dateObj)
  return `${weekday}, ${day} ${month}`
})
</script>

<template>
  <section class="dashboard-hero" aria-labelledby="hero-greeting">
    <div class="dashboard-hero__content">
      <div class="dashboard-hero__main">
        <p class="dashboard-hero__eyebrow">{{ eyebrowText }}</p>
        <h2 id="hero-greeting" class="dashboard-hero__greeting">
          Good {{ greetingTime }}, {{ displayName }}
        </h2>
        <p class="dashboard-hero__date">
          {{ formattedDate }}. Here is where complaints stand today.
        </p>
      </div>

      <div class="dashboard-hero__metrics">
        <div class="dashboard-hero__metric">
          <span class="dashboard-hero__metric-value ns-num">{{ openCount }}</span>
          <span class="dashboard-hero__metric-label">Open complaints</span>
        </div>

        <div class="dashboard-hero__divider" aria-hidden="true"></div>

        <div class="dashboard-hero__metric">
          <span class="dashboard-hero__metric-value dashboard-hero__metric-value--overdue ns-num">
            {{ overdueCount }}
          </span>
          <span class="dashboard-hero__metric-label">Overdue</span>
        </div>

        <RouterLink
          :to="{ path: '/admin/complaints', query: { overdue: 'true' } }"
          class="dashboard-hero__action-btn"
          aria-label="Review overdue complaints"
        >
          <span>Review overdue</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.dashboard-hero {
  position: relative;
  background-color: #0E2233;
  background-image:
    radial-gradient(circle at 92% 0%, rgba(45, 212, 191, 0.38), transparent 48%),
    radial-gradient(circle at 0% 100%, rgba(11, 114, 133, 0.35), transparent 45%),
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size:
    100% 100%,
    100% 100%,
    30px 30px,
    30px 30px;
  border-radius: 22px;
  padding: 30px 34px;
  color: #FFFFFF;
  margin-bottom: 20px;
  box-shadow: 0 1px 2px rgba(14, 34, 51, 0.05), 0 10px 24px rgba(14, 34, 51, 0.06);
  overflow: hidden;
}

.dashboard-hero__content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

@media (min-width: 992px) {
  .dashboard-hero__content {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.dashboard-hero__main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dashboard-hero__eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: #7EE8D9;
  text-transform: uppercase;
}

.dashboard-hero__greeting {
  margin: 0;
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
  color: #FFFFFF;
}

.dashboard-hero__date {
  margin: 0;
  font-size: 14px;
  color: #C9D8E3;
}

.dashboard-hero__metrics {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
}

.dashboard-hero__metric {
  display: flex;
  flex-direction: column;
}

.dashboard-hero__metric-value {
  font-family: var(--ns-font-display, 'Sora', sans-serif);
  font-size: 44px;
  font-weight: 700;
  line-height: 1;
  color: #FFFFFF;
  font-variant-numeric: tabular-nums;
}

.dashboard-hero__metric-value--overdue {
  color: #FCA5A5;
}

.dashboard-hero__metric-label {
  font-size: 13px;
  color: #B7C7D4;
  margin-top: 4px;
}

.dashboard-hero__divider {
  width: 1px;
  height: 48px;
  background-color: rgba(255, 255, 255, 0.16);
  align-self: center;
}

.dashboard-hero__action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 50px;
  padding: 0 22px;
  border-radius: 12px;
  background-color: #FFFFFF;
  color: #0E4F6B;
  font-family: var(--ns-font-body, 'Public Sans', sans-serif);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 8px rgba(14, 34, 51, 0.12);
}

.dashboard-hero__action-btn:focus-visible {
  outline: 2px solid #2DD4BF;
  outline-offset: 2px;
}

@media (hover: hover) {
  .dashboard-hero__action-btn:hover {
    background-color: #F0FDFA;
    color: #0B3C52;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .dashboard-hero__action-btn {
    transition: background-color var(--ns-duration-fast, 120ms) ease,
                color var(--ns-duration-fast, 120ms) ease;
  }
}
</style>
