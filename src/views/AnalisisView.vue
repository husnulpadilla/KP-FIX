<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Bar } from 'vue-chartjs'
import * as XLSX from 'xlsx'
import {
  Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale,
} from 'chart.js'
import { useDatasetStore } from '../stores/dataset.js'
import DataTable from '../components/layout/DataTable.vue'
import EmptyState from '../components/layout/EmptyState.vue'
import { formatAngka, formatDesimal } from '../utils/format.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const ds = useDatasetStore()
const route = useRoute()

const indikatorTersedia = computed(() => [...new Set(ds.seluruhBaris.map((r) => r.indikator))].sort())
const kategoriTersedia = computed(() => ds.kategoriTersedia)

const filterKategori = ref('Semua')
const indikatorPilihan = ref('')

const indikatorSesuaiKategori = computed(() => {
  if (filterKategori.value === 'Semua') return indikatorTersedia.value
  return [...new Set(
    ds.seluruhBaris.filter((r) => r.kategori === filterKategori.value).map((r) => r.indikator)
  )].sort()
})

// Terima filter awal dari query URL (mis. dari halaman Upload setelah dataset
// ditambahkan, atau saat mengklik dataset lama di tabel "Kelola Dataset Tersimpan").
if (route.query.kategori && kategoriTersedia.value.includes(route.query.kategori)) {
  filterKategori.value = route.query.kategori
}

if (route.query.indikator && indikatorTersedia.value.includes(route.query.indikator)) {
  indikatorPilihan.value = route.query.indikator
} else if (!indikatorPilihan.value && indikatorSesuaiKategori.value.length > 0) {
  indikatorPilihan.value = indikatorSesuaiKategori.value[0]
}

const hasil = computed(() => {
  if (!indikatorPilihan.value) return { labels: [], nilai: [], jenis: 'sum', satuan: '' }
  return ds.agregasiPerWilayah(indikatorPilihan.value)
})

const statistikDeskriptif = computed(() => {
  const n = hasil.value.nilai
  if (n.length === 0) return null
  const sum = n.reduce((a, b) => a + b, 0)
  const mean = sum / n.length
  const sorted = [...n].sort((a, b) => a - b)
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[(sorted.length - 1) / 2]
  const variance = n.reduce((a, v) => a + (v - mean) ** 2, 0) / n.length
  return {
    jumlahWilayah: n.length,
    total: sum,
    rataRata: mean,
    median,
    minimum: Math.min(...n),
    maksimum: Math.max(...n),
    stdDev: Math.sqrt(variance),
  }
})

const barData = computed(() => ({
  labels: hasil.value.labels,
  datasets: [{
    label: indikatorPilihan.value,
    data: hasil.value.nilai,
    backgroundColor: '#175C82',
    borderRadius: 4,
    maxBarThickness: 30,
  }],
}))

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: '#EDEAE0' }, ticks: { font: { size: 11 } } },
    y: { grid: { display: false }, ticks: { font: { size: 11.5 } } },
  },
}

const kolomTabel = computed(() => [
  { key: 'wilayah', label: 'Wilayah' },
  { key: 'nilai', label: `Nilai (${hasil.value.satuan})`, align: 'right' },
])

const barisTabel = computed(() =>
  hasil.value.labels.map((label, i) => ({
    wilayah: label,
    nilai: hasil.value.jenis === 'mean'
      ? formatDesimal(hasil.value.nilai[i], 2)
      : formatAngka(hasil.value.nilai[i]),
  }))
)

// ---------- fitur unduh ----------

// Data mentah (nilai numerik asli, bukan yang sudah diformat) — dipakai untuk semua jenis unduhan
const dataUnduh = computed(() =>
  hasil.value.labels.map((label, i) => ({
    wilayah: label,
    indikator: indikatorPilihan.value,
    kategori: filterKategori.value === 'Semua' ? '' : filterKategori.value,
    nilai: hasil.value.nilai[i],
    satuan: hasil.value.satuan,
  }))
)

const showUnduhMenu = ref(false)

function namaFileUnduh(ekstensi) {
  const dasar = (indikatorPilihan.value || 'analisis')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return `analisis-${dasar}.${ekstensi}`
}

function triggerDownload(blob, namaFile) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = namaFile
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function escapeCsv(nilai) {
  const s = String(nilai ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function unduhCSV() {
  if (dataUnduh.value.length === 0) return
  const header = ['Wilayah', 'Indikator', 'Kategori', 'Nilai', 'Satuan']
  const baris = dataUnduh.value.map((r) => [r.wilayah, r.indikator, r.kategori, r.nilai, r.satuan])
  const csv = [header, ...baris].map((row) => row.map(escapeCsv).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }) // BOM agar Excel baca UTF-8 dengan benar
  triggerDownload(blob, namaFileUnduh('csv'))
  showUnduhMenu.value = false
}

function unduhJSON() {
  if (dataUnduh.value.length === 0) return
  const payload = {
    indikator: indikatorPilihan.value,
    kategori: filterKategori.value === 'Semua' ? null : filterKategori.value,
    ringkasan: statistikDeskriptif.value,
    data: dataUnduh.value,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  triggerDownload(blob, namaFileUnduh('json'))
  showUnduhMenu.value = false
}

function unduhExcel() {
  if (dataUnduh.value.length === 0) return
  const sheetData = XLSX.utils.json_to_sheet(
    dataUnduh.value.map((r) => ({
      Wilayah: r.wilayah,
      Indikator: r.indikator,
      Kategori: r.kategori,
      Nilai: r.nilai,
      Satuan: r.satuan,
    }))
  )
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheetData, 'Data')

  if (statistikDeskriptif.value) {
    const s = statistikDeskriptif.value
    const sheetRingkasan = XLSX.utils.json_to_sheet([
      { Metrik: 'Jumlah Wilayah', Nilai: s.jumlahWilayah },
      { Metrik: 'Total', Nilai: s.total },
      { Metrik: 'Rata-rata', Nilai: s.rataRata },
      { Metrik: 'Median', Nilai: s.median },
      { Metrik: 'Minimum', Nilai: s.minimum },
      { Metrik: 'Maksimum', Nilai: s.maksimum },
      { Metrik: 'Std. Deviasi', Nilai: s.stdDev },
    ])
    XLSX.utils.book_append_sheet(wb, sheetRingkasan, 'Ringkasan')
  }

  XLSX.writeFile(wb, namaFileUnduh('xlsx'))
  showUnduhMenu.value = false
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <span class="eyebrow">Statistik Deskriptif</span>
        <h1>Analisis Data</h1>
        <p>Eksplorasi indikator per wilayah dengan pendekatan deskriptif: total/rata-rata, sebaran, dan nilai ekstrem.</p>
      </div>
    </div>

    <div v-if="ds.datasets.length === 0">
      <EmptyState title="Belum ada data untuk dianalisis" description="Unggah dataset terlebih dahulu lewat halaman Upload Data." />
    </div>

    <template v-else>
      <div class="card filter-bar">
        <div class="field">
          <label>Kategori</label>
          <select v-model="filterKategori">
            <option value="Semua">Semua Kategori</option>
            <option v-for="k in kategoriTersedia" :key="k" :value="k">{{ k }}</option>
          </select>
        </div>
        <div class="field">
          <label>Indikator</label>
          <select v-model="indikatorPilihan">
            <option v-for="i in indikatorSesuaiKategori" :key="i" :value="i">{{ i }}</option>
          </select>
        </div>
        <span class="badge badge-info">Agregasi: {{ hasil.jenis === 'mean' ? 'Rata-rata' : 'Total' }}</span>

        <div class="unduh-wrap">
          <button
            class="btn btn-outline"
            :disabled="dataUnduh.length === 0"
            @click="showUnduhMenu = !showUnduhMenu"
          >
            ⬇️ Unduh Data
          </button>
          <div v-if="showUnduhMenu" class="unduh-menu" @mouseleave="showUnduhMenu = false">
            <button @click="unduhCSV">CSV (.csv)</button>
            <button @click="unduhExcel">Excel (.xlsx)</button>
            <button @click="unduhJSON">JSON (.json)</button>
          </div>
        </div>
      </div>

      <div class="grid" v-if="statistikDeskriptif">
        <div class="card chart-card">
          <h3>{{ indikatorPilihan }} per Wilayah</h3>
          <div class="chart-body"><Bar :data="barData" :options="barOptions" /></div>
        </div>

        <div class="card stat-list">
          <h3>Ringkasan Statistik</h3>
          <dl>
            <div><dt>Jumlah Wilayah</dt><dd>{{ statistikDeskriptif.jumlahWilayah }}</dd></div>
            <div><dt>Total</dt><dd>{{ formatAngka(statistikDeskriptif.total) }}</dd></div>
            <div><dt>Rata-rata</dt><dd>{{ formatDesimal(statistikDeskriptif.rataRata, 2) }}</dd></div>
            <div><dt>Median</dt><dd>{{ formatDesimal(statistikDeskriptif.median, 2) }}</dd></div>
            <div><dt>Minimum</dt><dd>{{ formatDesimal(statistikDeskriptif.minimum, 2) }}</dd></div>
            <div><dt>Maksimum</dt><dd>{{ formatDesimal(statistikDeskriptif.maksimum, 2) }}</dd></div>
            <div><dt>Std. Deviasi</dt><dd>{{ formatDesimal(statistikDeskriptif.stdDev, 2) }}</dd></div>
          </dl>
        </div>
      </div>

      <h3 class="section-title">Rincian per Wilayah</h3>
      <DataTable :columns="kolomTabel" :rows="barisTabel" />
    </template>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  align-items: flex-end;
  gap: 22px;
  padding: 18px 22px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.field { display: flex; flex-direction: column; gap: 6px; min-width: 220px; }
.field label { font-size: 12px; color: var(--color-muted); font-weight: 600; }
.field select {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 9px 10px;
  font-size: 13.8px;
  font-family: var(--font-body);
  background: var(--color-surface);
}

.unduh-wrap {
  position: relative;
  margin-left: auto;
}

.btn-outline {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 8px;
  padding: 9px 14px;
  font-size: 13.5px;
  cursor: pointer;
  transition: border-color 0.12s ease, background 0.12s ease;
}
.btn-outline:hover:not(:disabled) { border-color: var(--color-primary-light, #175C82); background: var(--color-surface-alt); }
.btn-outline:disabled { opacity: 0.5; cursor: not-allowed; }

.unduh-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  min-width: 160px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}
.unduh-menu button {
  background: none;
  border: none;
  text-align: left;
  padding: 10px 14px;
  font-size: 13.5px;
  cursor: pointer;
  color: var(--color-ink, #222);
}
.unduh-menu button:hover { background: var(--color-surface-alt); }
.unduh-menu button + button { border-top: 1px solid var(--color-border); }

.grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 18px;
  margin-bottom: 30px;
}

.chart-card, .stat-list { padding: 22px; }
.chart-card h3, .stat-list h3 { font-size: 15.5px; font-weight: 600; margin-bottom: 14px; }
.chart-body { height: 300px; }

.stat-list dl { display: flex; flex-direction: column; gap: 10px; margin: 0; }
.stat-list dl > div { display: flex; justify-content: space-between; border-bottom: 1px dashed var(--color-border); padding-bottom: 8px; }
.stat-list dt { color: var(--color-muted); font-size: 13px; }
.stat-list dd { margin: 0; font-family: var(--font-mono); font-weight: 500; }

.section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }

@media (max-width: 1100px) {
  .grid { grid-template-columns: 1fr; }
}
</style>