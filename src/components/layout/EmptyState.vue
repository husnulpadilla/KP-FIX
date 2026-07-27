<script setup>
defineProps({
  title: String,
  description: String,
})
</script>

<template>
  <div class="empty card">
    <div class="mark" aria-hidden="true">
      <svg width="40" height="40" viewBox="0 0 64 64">
        <path d="M6 40 C 16 30, 22 30, 32 40 C 42 50, 48 50, 58 40" stroke="#C99A2E" stroke-width="4" fill="none" stroke-linecap="round"/>
      </svg>
    </div>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty {
  padding: 48px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.mark { margin-bottom: 6px; opacity: 0.8; }
.empty h3 { font-size: 17px; }
.empty p { color: var(--color-muted); max-width: 42ch; margin: 0 0 6px; }
</style>
