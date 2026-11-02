<script setup>
import { RouterView, useRoute } from 'vue-router'
import AppNavbar from './components/AppNavbar.vue'

const route = useRoute()
</script>

<template>
  <AppNavbar v-if="!route.meta.noNavbar" />
  <component :is="route.meta.noNavbar ? 'div' : 'main'">
    <RouterView />
  </component>
</template>
