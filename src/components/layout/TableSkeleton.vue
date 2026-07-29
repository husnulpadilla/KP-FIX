<script setup>
defineProps({
  rows: { type: Number, default: 4 },
})
</script>

<template>
  <div class="skeleton-wrap card">
    <div v-for="i in rows" :key="i" class="skeleton-row">
      <span class="bar" style="width: 22%"></span>
      <span class="bar" style="width: 30%"></span>
      <span class="bar" style="width: 15%"></span>
      <span class="bar" style="width: 18%"></span>
    </div>
  </div>
</template>

<style scoped>
.skeleton-wrap { padding: 18px 22px; display: flex; flex-direction: column; gap: 16px; }
.skeleton-row { display: flex; gap: 24px; }
.bar {
  height: 14px;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--color-surface-alt) 25%, #e8e4d6 50%, var(--color-surface-alt) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.3s ease-in-out infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>