<script setup>
import { RouterView } from 'vue-router'
import AppNavbar from './components/AppNavbar.vue'
</script>

<template>
  <AppNavbar />
  <main>
    <RouterView />
  </main>
</template>