<script setup>
defineProps({
  columns: { type: Array, required: true }, // [{key,label,align}]
  rows: { type: Array, required: true },
})
</script>

<template>
  <div class="table-wrap card">
    <table>
      <thead>
        <tr>
          <th v-for="col in columns" :key="col.key" :style="{ textAlign: col.align || 'left' }">
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="row.id ?? i">
          <td v-for="col in columns" :key="col.key" :style="{ textAlign: col.align || 'left' }">
            <slot :name="`cell-${col.key}`" :row="row">{{ row[col.key] }}</slot>
          </td>
        </tr>
        <tr v-if="rows.length === 0">
          <td :colspan="columns.length" class="empty-row">Belum ada data.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-wrap { overflow-x: auto; }

table { width: 100%; border-collapse: collapse; font-size: 13.8px; }

thead th {
  text-align: left;
  padding: 12px 18px;
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-muted);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

tbody td {
  padding: 12px 18px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-ink-soft);
  white-space: nowrap;
}

tbody tr:last-child td { border-bottom: none; }
tbody tr:hover td { background: var(--color-surface-alt); }

.empty-row { text-align: center; color: var(--color-muted); padding: 28px; }
</style>
