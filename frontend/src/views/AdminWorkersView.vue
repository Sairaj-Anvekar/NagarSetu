<script setup>
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'
</script>

<template>
  <PageHeader title="Workers" subtitle="Manage field workers, their department and zone." />
  <EmptyState
    title="Worker management is coming next"
    message="You will be able to add workers and activate or deactivate them here."
  />
</template>
