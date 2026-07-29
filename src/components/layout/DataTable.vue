<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  columns: { type: Array, required: true },  // [{key,label,align,sortable}]
  rows: { type: Array, required: true },
  paginate: { type: Boolean, default: false },
  pageSize: { type: Number, default: 10 },
})

const sortKey = ref('')
const sortDir = ref('asc') // 'asc' | 'desc'
const page = ref(1)

function toggleSort(col) {
  if (col.sortable === false) return
  if (sortKey.value === col.key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = col.key
    sortDir.value = 'asc'
  }
  page.value = 1
}

const rowsSorted = computed(() => {
  if (!sortKey.value) return props.rows
  const arr = [...props.rows]
  arr.sort((a, b) => {
    const va = a[sortKey.value]
    const vb = b[sortKey.value]
    if (va == null) return 1
    if (vb == null) return -1
    if (typeof va === 'number' && typeof vb === 'number') {
      return sortDir.value === 'asc' ? va - vb : vb - va
    }
    return sortDir.value === 'asc'
      ? String(va).localeCompare(String(vb), 'id')
      : String(vb).localeCompare(String(va), 'id')
  })
  return arr
})

const totalPages = computed(() =>
  props.paginate ? Math.max(1, Math.ceil(rowsSorted.value.length / props.pageSize)) : 1
)

const rowsTampil = computed(() => {
  if (!props.paginate) return rowsSorted.value
  const start = (page.value - 1) * props.pageSize
  return rowsSorted.value.slice(start, start + props.pageSize)
})

function gantiHalaman(n) {
  if (n < 1 || n > totalPages.value) return
  page.value = n
}
</script>

<template>
  <div class="table-wrap card">
    <table>
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :style="{ textAlign: col.align || 'left' }"
            :class="{ sortable: col.sortable !== false }"
            @click="toggleSort(col)"
          >
            {{ col.label }}
            <span v-if="col.sortable !== false" class="sort-icon">
              {{ sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅' }}
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rowsTampil" :key="row.id ?? i">
          <td v-for="col in columns" :key="col.key" :style="{ textAlign: col.align || 'left' }">
            <slot :name="`cell-${col.key}`" :row="row">{{ row[col.key] }}</slot>
          </td>
        </tr>
        <tr v-if="rowsTampil.length === 0">
          <td :colspan="columns.length" class="empty-row">Belum ada data.</td>
        </tr>
      </tbody>
    </table>

    <div v-if="paginate && totalPages > 1" class="pagination">
      <button :disabled="page === 1" @click="gantiHalaman(page - 1)">‹ Sebelumnya</button>
      <span class="page-info">Halaman {{ page }} dari {{ totalPages }}</span>
      <button :disabled="page === totalPages" @click="gantiHalaman(page + 1)">Berikutnya ›</button>
    </div>
  </div>
</template>

<style scoped>
.table-wrap { overflow-x: auto; }

table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }

thead th {
  text-align: left;
  padding: 12px 18px;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-ink-soft);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
  user-select: none;
}
thead th.sortable { cursor: pointer; }
thead th.sortable:hover { color: var(--color-primary); }
.sort-icon { font-size: 10px; margin-left: 4px; opacity: 0.6; }

tbody td {
  padding: 12px 18px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-ink-soft);
  font-weight: 450;
  white-space: nowrap;
}

tbody tr:last-child td { border-bottom: none; }
tbody tr:hover td { background: var(--color-surface-alt); }

.empty-row { text-align: center; color: var(--color-muted); padding: 28px; }

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 14px 18px;
  border-top: 1px solid var(--color-border);
}
.pagination button {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 7px;
  padding: 6px 12px;
  font-size: var(--text-xs);
  cursor: pointer;
}
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.pagination button:not(:disabled):hover { background: var(--color-surface-alt); }
.page-info { font-size: var(--text-xs); color: var(--color-muted); }
</style>