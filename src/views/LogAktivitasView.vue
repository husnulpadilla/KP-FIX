<script setup>
import { ref, computed } from 'vue'
import { useLogStore } from '../stores/log.js'
import StatCard from '../components/layout/StatCard.vue'
import DataTable from '../components/layout/DataTable.vue'
import EmptyState from '../components/layout/EmptyState.vue'

const log = useLogStore()

const filterAksi = ref('Semua')
const kataKunci = ref('')

const opsiAksi = computed(() => ['Semua', ...new Set(log.logs.map((l) => l.aksi))])

const hasilFilter = computed(() => {
  return log.terbaru.filter((l) => {
    const cocokAksi = filterAksi.value === 'Semua' || l.aksi === filterAksi.value
    const teks = `${l.pengguna} ${l.dataset} ${l.keterangan}`.toLowerCase()
    const cocokKeyword = !kataKunci.value || teks.includes(kataKunci.value.toLowerCase())
    return cocokAksi && cocokKeyword
  })
})

const kolom = [
  { key: 'waktu', label: 'Waktu' },
  { key: 'pengguna', label: 'Pengguna' },
  { key: 'aksi', label: 'Aksi' },
  { key: 'dataset', label: 'Dataset' },
  { key: 'keterangan', label: 'Keterangan' },
]

function warnaBadge(aksi) {
  if (aksi === 'UPLOAD') return 'badge-success'
  if (aksi === 'DELETE') return 'badge-danger'
  return 'badge-info'
}

function exportCsv() {
  const header = kolom.map((c) => c.label).join(',')
  const rows = hasilFilter.value.map((r) => kolom.map((c) => `"${r[c.key]}"`).join(','))
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'log-aktivitas.csv'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <span class="eyebrow">Audit Trail</span>
        <h1>Log Aktivitas</h1>
        <p>Jejak seluruh aktivitas penting: login, upload, dan penghapusan dataset — untuk menjaga akuntabilitas data.</p>
      </div>
      <button class="btn btn-ghost" @click="exportCsv">⬇️ Ekspor CSV</button>
    </div>

    <div class="stat-grid">
      <StatCard label="Total Aktivitas" :value="log.statistik.total" accent />
      <StatCard label="Upload" :value="log.statistik.upload" />
      <StatCard label="Hapus" :value="log.statistik.hapus" />
      <StatCard label="Pengguna Aktif" :value="log.statistik.penggunaAktif" />
    </div>

    <div class="card filter-bar">
      <div class="field">
        <label>Jenis Aksi</label>
        <select v-model="filterAksi">
          <option v-for="a in opsiAksi" :key="a" :value="a">{{ a }}</option>
        </select>
      </div>
      <div class="field grow">
        <label>Cari</label>
        <input v-model="kataKunci" type="text" placeholder="Cari pengguna, dataset, atau keterangan…" />
      </div>
    </div>

    <EmptyState
      v-if="log.logs.length === 0"
      title="Belum ada aktivitas"
      description="Aktivitas login, upload, dan hapus dataset akan tercatat otomatis di sini."
    />
    <DataTable v-else :columns="kolom" :rows="hasilFilter">
      <template #cell-aksi="{ row }">
        <span class="badge" :class="warnaBadge(row.aksi)">{{ row.aksi }}</span>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 24px;
}

.filter-bar {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  padding: 16px 22px;
  margin-bottom: 22px;
  flex-wrap: wrap;
}

.field { display: flex; flex-direction: column; gap: 6px; min-width: 200px; }
.field.grow { flex: 1; }
.field label { font-size: 12px; color: var(--color-muted); font-weight: 600; }
.field select, .field input {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 9px 10px;
  font-size: 13.8px;
  font-family: var(--font-body);
  background: var(--color-surface);
}

@media (max-width: 1100px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
