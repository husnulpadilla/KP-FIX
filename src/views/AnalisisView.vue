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
import TableSkeleton from '../components/layout/TableSkeleton.vue'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const ds = useDatasetStore()
const route = useRoute()

const indikatorTersedia = computed(() => [...new Set(ds.seluruhBaris.map((r) => r.indikator))].sort())
const kategoriTersedia = computed(() => ds.kategoriTersedia)

const filterKategori = ref('Semua')
const indikatorPilihan = ref('')
const tahunPilihan = ref('')

const indikatorSesuaiKategori = computed(() => {
  if (filterKategori.value === 'Semua') return indikatorTersedia.value
  return [...new Set(
    ds.seluruhBaris.filter((r) => r.kategori === filterKategori.value).map((r) => r.indikator)
  )].sort()
})

// Kalau semua opsi indikator berbagi awalan kalimat yang sama & panjang
// (mis. hasil konversi data bulanan), tampilkan cuma bagian pembedanya saja
// di dropdown -- supaya tidak perlu baca ulang kalimat panjang 12x.
function cariAwalanSama(daftar) {
  if (daftar.length < 2) return ''
  let awalan = daftar[0]
  for (const s of daftar.slice(1)) {
    let i = 0
    while (i < awalan.length && i < s.length && awalan[i] === s[i]) i++
    awalan = awalan.slice(0, i)
  }
  // Potong balik ke pemisah kata/tanda baca terdekat, biar tidak motong di tengah kata
  const batas = Math.max(awalan.lastIndexOf(' - '), awalan.lastIndexOf(', '), awalan.lastIndexOf(' '))
  return batas > 10 ? awalan.slice(0, batas + 1) : ''
}

const awalanBerulang = computed(() => cariAwalanSama(indikatorSesuaiKategori.value))

function labelIndikatorRingkas(namaLengkap) {
  if (!awalanBerulang.value || namaLengkap.length <= awalanBerulang.value.length) return namaLengkap
  const sisa = namaLengkap.slice(awalanBerulang.value.length).trim()
  return sisa.replace(/^-\s*/, '') || namaLengkap
}

// Daftar tahun yang tersedia khusus untuk indikator yang sedang dipilih.
// Dropdown Tahun cuma tampil kalau indikatornya memang punya >1 tahun data.
const tahunTersedia = computed(() => {
  const set = new Set(
    ds.seluruhBaris
      .filter((r) => r.indikator === indikatorPilihan.value)
      .map((r) => r.tahun)
      .filter(Boolean)
  )
  return [...set].sort((a, b) => b - a) // terbaru dulu
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

// Jenis indikator yang sedang dipilih -- menentukan apakah halaman ini
// menampilkan statistik numerik (total/rata-rata/dst.) atau distribusi
// kategorikal (tabel frekuensi + grafik batang jumlah).
const jenisAnalisis = computed(() => ds.jenisIndikator(indikatorPilihan.value))

// ---------- jalur NUMERIK ----------

const hasil = computed(() => {
  if (!indikatorPilihan.value) return { labels: [], nilai: [], jenis: 'sum', satuan: '' }
  return ds.agregasiPerWilayah(indikatorPilihan.value, tahunPilihan.value || null)
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

// ---------- jalur KATEGORIKAL ----------

const hasilKategorikal = computed(() => {
  if (jenisAnalisis.value !== 'kategorikal' || !indikatorPilihan.value) {
    return { labels: [], jumlah: [], total: 0 }
  }
  return ds.distribusiKategori(indikatorPilihan.value, tahunPilihan.value || null)
})

const statistikKategorikal = computed(() => {
  const h = hasilKategorikal.value
  if (h.labels.length === 0) return null
  let idxMax = 0
  let idxMin = 0
  h.jumlah.forEach((v, i) => {
    if (v > h.jumlah[idxMax]) idxMax = i
    if (v < h.jumlah[idxMin]) idxMin = i
  })
  return {
    jumlahKategori: h.labels.length,
    totalData: h.total,
    terbanyakLabel: h.labels[idxMax],
    terbanyakJumlah: h.jumlah[idxMax],
    tersedikitLabel: h.labels[idxMin],
    tersedikitJumlah: h.jumlah[idxMin],
  }
})

// Guard tunggal untuk menampilkan/menyembunyikan blok grafik + statistik,
// terlepas dari jenis analisisnya.
const adaData = computed(() =>
  jenisAnalisis.value === 'kategorikal' ? !!statistikKategorikal.value : !!statistikDeskriptif.value
)

const judulGrafik = computed(() =>
  jenisAnalisis.value === 'kategorikal'
    ? `Distribusi ${indikatorPilihan.value}`
    : `${indikatorPilihan.value} per Wilayah`
)

const judulRincian = computed(() =>
  jenisAnalisis.value === 'kategorikal' ? 'Rincian Distribusi Kategori' : 'Rincian per Wilayah'
)

// ---------- grafik (dipakai kedua jalur) ----------

const chartRef = ref(null)

const barData = computed(() => {
  if (jenisAnalisis.value === 'kategorikal') {
    return {
      labels: hasilKategorikal.value.labels,
      datasets: [{
        label: `Jumlah ${indikatorPilihan.value}`,
        data: hasilKategorikal.value.jumlah,
        backgroundColor: '#C0562B',
        borderRadius: 4,
        maxBarThickness: 30,
      }],
    }
  }
  return {
    labels: hasil.value.labels,
    datasets: [{
      label: indikatorPilihan.value,
      data: hasil.value.nilai,
      backgroundColor: '#175C82',
      borderRadius: 4,
      maxBarThickness: 30,
    }],
  }
})

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

// ---------- tabel rincian (dipakai kedua jalur, bentuk kolom beda) ----------

const kolomTabel = computed(() => {
  if (jenisAnalisis.value === 'kategorikal') {
    return [
      { key: 'kategori', label: 'Kategori' },
      { key: 'jumlah', label: 'Jumlah', align: 'right', sortable: false },
      { key: 'persentase', label: 'Persentase', align: 'right', sortable: false },
    ]
  }
  return [
    { key: 'wilayah', label: 'Wilayah' },
    { key: 'nilai', label: `Nilai (${hasil.value.satuan})`, align: 'right', sortable: false },
  ]
})

const barisTabel = computed(() => {
  if (jenisAnalisis.value === 'kategorikal') {
    const h = hasilKategorikal.value
    return h.labels.map((label, i) => ({
      kategori: label,
      jumlah: formatAngka(h.jumlah[i]),
      persentase: h.total ? `${formatDesimal((h.jumlah[i] / h.total) * 100, 1)}%` : '-',
    }))
  }
  return hasil.value.labels.map((label, i) => ({
    wilayah: label,
    nilai: hasil.value.jenis === 'mean'
      ? formatDesimal(hasil.value.nilai[i], 2)
      : formatAngka(hasil.value.nilai[i]),
  }))
})

// ---------- fitur unduh ----------

// Data mentah numerik (nilai asli, bukan yang sudah diformat) -- dipakai saat jenisnya numerik
const dataUnduh = computed(() =>
  hasil.value.labels.map((label, i) => ({
    wilayah: label,
    indikator: indikatorPilihan.value,
    kategori: filterKategori.value === 'Semua' ? '' : filterKategori.value,
    tahun: tahunPilihan.value || 'Semua',
    nilai: hasil.value.nilai[i],
    satuan: hasil.value.satuan,
  }))
)

// Menyatukan data unduhan numerik & kategorikal jadi satu bentuk generik
// (headerCsv/baseRowsCsv untuk CSV, sheetRows untuk Excel, jsonPayload untuk JSON)
// supaya fungsi unduhCSV/unduhExcel/unduhJSON tidak perlu tahu jenis analisisnya.
const eksporData = computed(() => {
  if (jenisAnalisis.value === 'kategorikal') {
    const h = hasilKategorikal.value
    const rows = h.labels.map((label, i) => ({
      kategori: label,
      jumlah: h.jumlah[i],
      persentase: h.total ? Number(((h.jumlah[i] / h.total) * 100).toFixed(1)) : 0,
    }))
    return {
      rows,
      headerCsv: ['Kategori', 'Jumlah', 'Persentase (%)'],
      baseRowsCsv: rows.map((r) => [r.kategori, r.jumlah, r.persentase]),
      sheetRows: rows.map((r) => ({ Kategori: r.kategori, Jumlah: r.jumlah, 'Persentase (%)': r.persentase })),
      jsonPayload: {
        indikator: indikatorPilihan.value,
        kategori: filterKategori.value === 'Semua' ? null : filterKategori.value,
        tahun: tahunPilihan.value || 'Semua',
        jenis: 'kategorikal',
        ringkasan: statistikKategorikal.value,
        data: rows,
      },
    }
  }

  const rows = dataUnduh.value
  return {
    rows,
    headerCsv: ['Wilayah', 'Indikator', 'Kategori', 'Tahun', 'Nilai', 'Satuan'],
    baseRowsCsv: rows.map((r) => [r.wilayah, r.indikator, r.kategori, r.tahun, r.nilai, r.satuan]),
    sheetRows: rows.map((r) => ({
      Wilayah: r.wilayah, Indikator: r.indikator, Kategori: r.kategori, Tahun: r.tahun, Nilai: r.nilai, Satuan: r.satuan,
    })),
    jsonPayload: {
      indikator: indikatorPilihan.value,
      kategori: filterKategori.value === 'Semua' ? null : filterKategori.value,
      tahun: tahunPilihan.value || 'Semua',
      jenis: 'numerik',
      ringkasan: statistikDeskriptif.value,
      data: rows,
    },
  }
})

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
  if (eksporData.value.rows.length === 0) return
  const csv = [eksporData.value.headerCsv, ...eksporData.value.baseRowsCsv]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }) // BOM agar Excel baca UTF-8 dengan benar
  triggerDownload(blob, namaFileUnduh('csv'))
  showUnduhMenu.value = false
}

function unduhJSON() {
  if (eksporData.value.rows.length === 0) return
  const blob = new Blob([JSON.stringify(eksporData.value.jsonPayload, null, 2)], { type: 'application/json' })
  triggerDownload(blob, namaFileUnduh('json'))
  showUnduhMenu.value = false
}

function unduhExcel() {
  if (eksporData.value.rows.length === 0) return
  const sheetData = XLSX.utils.json_to_sheet(eksporData.value.sheetRows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheetData, 'Data')

  if (jenisAnalisis.value === 'kategorikal' && statistikKategorikal.value) {
    const s = statistikKategorikal.value
    const sheetRingkasan = XLSX.utils.json_to_sheet([
      { Metrik: 'Jumlah Kategori', Nilai: s.jumlahKategori },
      { Metrik: 'Total Data', Nilai: s.totalData },
      { Metrik: 'Kategori Terbanyak', Nilai: `${s.terbanyakLabel} (${s.terbanyakJumlah})` },
      { Metrik: 'Kategori Tersedikit', Nilai: `${s.tersedikitLabel} (${s.tersedikitJumlah})` },
    ])
    XLSX.utils.book_append_sheet(wb, sheetRingkasan, 'Ringkasan')
  } else if (statistikDeskriptif.value) {
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

function unduhGrafikPNG() {
  const chart = chartRef.value?.chart
  if (!chart) return

  // Chart.js menghasilkan kanvas transparan secara default; di sini kita
  // "tempel" hasil grafik di atas kanvas putih baru supaya file PNG yang
  // diunduh punya latar putih solid -- aman ditempel ke dokumen/laporan.
  const kanvasAsli = chart.canvas
  const kanvasPutih = document.createElement('canvas')
  kanvasPutih.width = kanvasAsli.width
  kanvasPutih.height = kanvasAsli.height

  const ctx = kanvasPutih.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, kanvasPutih.width, kanvasPutih.height)
  ctx.drawImage(kanvasAsli, 0, 0)

  const url = kanvasPutih.toDataURL('image/png', 1)
  const a = document.createElement('a')
  a.href = url
  a.download = namaFileUnduh('png')
  a.click()
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <span class="eyebrow">Statistik Deskriptif</span>
        <h1>Analisis Data</h1>
        <p>
          Eksplorasi indikator per wilayah. Indikator numerik ditampilkan sebagai total/rata-rata,
          sebaran, dan nilai ekstrem; indikator kategorikal (teks) ditampilkan sebagai distribusi/frekuensi.
        </p>
      </div>
    </div>

    <TableSkeleton v-if="ds.loading && ds.datasets.length === 0" :rows="5" />
    <EmptyState
      v-else-if="ds.datasets.length === 0"
      title="Belum ada dataset"
      description="Unggah dataset pertama Anda lewat halaman Upload Data untuk mulai melihat visualisasi di sini."
    />

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
          <select v-model="indikatorPilihan" :title="indikatorPilihan">
            <option v-for="i in indikatorSesuaiKategori" :key="i" :value="i">
              {{ labelIndikatorRingkas(i) }}
            </option>
          </select>
        </div>
        <div class="field" v-if="tahunTersedia.length > 1">
          <label>Tahun</label>
          <select v-model="tahunPilihan">
            <option value="">Semua Tahun</option>
            <option v-for="t in tahunTersedia" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>

        <span v-if="jenisAnalisis === 'numerik'" class="badge badge-info">
          Agregasi: {{ hasil.jenis === 'mean' ? 'Rata-rata' : 'Total' }}
        </span>
        <span v-else class="badge badge-info">Jenis: Kategorikal (distribusi)</span>

        <div class="unduh-wrap">
          <button
            class="btn btn-outline"
            :disabled="eksporData.rows.length === 0"
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

      <div class="grid" v-if="adaData">
        <div class="card chart-card">
          <div class="chart-head-row">
            <h3>{{ judulGrafik }}</h3>
            <button class="btn-outline btn-sm" @click="unduhGrafikPNG">🖼️ Unduh PNG</button>
          </div>
          <div class="chart-body"><Bar ref="chartRef" :data="barData" :options="barOptions" /></div>
        </div>

        <div class="card stat-list">
          <h3>Ringkasan Statistik</h3>

          <dl v-if="jenisAnalisis === 'numerik'">
            <div><dt>Jumlah Wilayah</dt><dd>{{ statistikDeskriptif.jumlahWilayah }}</dd></div>
            <div><dt>Total</dt><dd>{{ formatAngka(statistikDeskriptif.total) }}</dd></div>
            <div><dt>Rata-rata</dt><dd>{{ formatDesimal(statistikDeskriptif.rataRata, 2) }}</dd></div>
            <div><dt>Median</dt><dd>{{ formatDesimal(statistikDeskriptif.median, 2) }}</dd></div>
            <div><dt>Minimum</dt><dd>{{ formatDesimal(statistikDeskriptif.minimum, 2) }}</dd></div>
            <div><dt>Maksimum</dt><dd>{{ formatDesimal(statistikDeskriptif.maksimum, 2) }}</dd></div>
            <div><dt>Std. Deviasi</dt><dd>{{ formatDesimal(statistikDeskriptif.stdDev, 2) }}</dd></div>
          </dl>

          <dl v-else>
            <div><dt>Jumlah Kategori</dt><dd>{{ statistikKategorikal.jumlahKategori }}</dd></div>
            <div><dt>Total Data</dt><dd>{{ formatAngka(statistikKategorikal.totalData) }}</dd></div>
            <div><dt>Kategori Terbanyak</dt><dd>{{ statistikKategorikal.terbanyakLabel }} ({{ statistikKategorikal.terbanyakJumlah }})</dd></div>
            <div><dt>Kategori Tersedikit</dt><dd>{{ statistikKategorikal.tersedikitLabel }} ({{ statistikKategorikal.tersedikitJumlah }})</dd></div>
          </dl>
        </div>
      </div>

      <h3 class="card-title">{{ judulRincian }}</h3>
      <DataTable :columns="kolomTabel" :rows="barisTabel" paginate :pageSize="10" />
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

.field { display: flex; flex-direction: column; gap: 6px; min-width: 180px; }
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

.btn-sm { padding: 5px 10px; font-size: 12px; }

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
.chart-card h3, .stat-list h3 { font-size: 15.5px; font-weight: 600; }
.stat-list h3 { margin-bottom: 14px; }

.chart-head-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }

.chart-body { height: 300px; }

.stat-list dl { display: flex; flex-direction: column; gap: 10px; margin: 0; }
.stat-list dl > div { display: flex; justify-content: space-between; border-bottom: 1px dashed var(--color-border); padding-bottom: 8px; }
.stat-list dt { color: var(--color-muted); font-size: 13px; }
.stat-list dd { margin: 0; font-family: var(--font-mono); font-weight: 500; }

@media (max-width: 1100px) {
  .grid { grid-template-columns: 1fr; }
  .field { min-width: 140px; }
}
</style>