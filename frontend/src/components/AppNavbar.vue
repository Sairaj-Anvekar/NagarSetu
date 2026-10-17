<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <nav class="navbar navbar-expand-md navbar-dark bg-primary">
    <div class="container">
      <RouterLink class="navbar-brand" to="/">NagarSetu</RouterLink>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#mainNav"
        aria-controls="mainNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="mainNav">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item">
            <RouterLink class="nav-link" to="/login">Login</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" to="/admin">Admin</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" to="/worker">Worker</RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>