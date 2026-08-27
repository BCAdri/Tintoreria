<template>
  <span class="badge" :class="`status-${status}`">{{ labels[status] }}</span>
</template>

<script setup>
defineProps({ status: { type: String, required: true } })
const labels = { received: 'Recibido', processing: 'En proceso', ready: 'Listo', delivered: 'Entregado' }
</script>

<style scoped>
.badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 100px; font-size: 12px; font-weight: 600; }
</style>
