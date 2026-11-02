<script setup>
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'
</script>

<template>
  <PageHeader title="History" subtitle="Complaints you have completed." />
  <EmptyState
    title="No completed tasks yet"
    message="Tasks you complete will be listed here."
  />
</template>
