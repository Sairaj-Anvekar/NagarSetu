<script setup>
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'
</script>

<template>
  <PageHeader title="Dashboard" subtitle="Overview of complaints and workers." />
  <EmptyState
    title="Dashboard metrics are on the way"
    message="Complaint totals, trends and hotspots will appear here."
  />
</template>
