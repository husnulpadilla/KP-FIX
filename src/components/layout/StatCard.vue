<script setup>
defineProps({
  label: String,
  value: [String, Number],
  hint: String,
  accent: { type: Boolean, default: false },
})
</script>

<template>
  <div class="stat-card card" :class="{ accent }">
    <span class="label">{{ label }}</span>
    <strong class="value data-mono">{{ value }}</strong>
    <span v-if="hint" class="hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
.stat-card {
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 116px;
}

.stat-card.accent { border-top: 3px solid var(--color-accent); }

.label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.value {
  font-size: 30px;
  font-weight: 500;
  color: var(--color-primary-dark);
}

.hint { font-size: 12.5px; color: var(--color-muted); }
</style>
