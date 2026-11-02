<script setup>
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'
</script>

<template>
  <PageHeader title="My tasks" subtitle="Your assigned complaints will appear here." />
  <EmptyState
    title="Your task list is coming next"
    message="Assigned complaints, with priority and deadline, will be listed here."
  />
</template>