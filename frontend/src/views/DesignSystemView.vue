<script setup>
import StatusBadge from '../components/StatusBadge.vue'
import PriorityBadge from '../components/PriorityBadge.vue'

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
  </div>
</template>
