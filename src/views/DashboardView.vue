<script setup>
import { computed } from 'vue'
import { Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS, Title, Tooltip, Legend, BarElement,
  CategoryScale, LinearScale, ArcElement,
} from 'chart.js'
import { useDatasetStore } from '../stores/dataset.js'
import StatCard from '../components/layout/StatCard.vue'
import DataTable from '../components/layout/DataTable.vue'
import EmptyState from '../components/layout/EmptyState.vue'
import { formatAngka } from '../utils/format.js'
import TableSkeleton from '../components/layout/TableSkeleton.vue'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement)

const ds = useDatasetStore()

const penduduk = computed(() => ds.agregasiPerWilayah('Jumlah Penduduk'))

const barData = computed(() => ({
  labels: penduduk.value.labels,
  datasets: [{
    label: 'Jumlah Penduduk',
    data: penduduk.value.nilai,
    backgroundColor: '#0B3D5C',
    borderRadius: 4,
    maxBarThickness: 34,
  }],
}))

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: { grid: { color: '#EDEAE0' }, ticks: { font: { size: 11 } } },
  },
}

const kategoriData = computed(() => {
  const map = {}
  for (const r of ds.seluruhBaris) map[r.kategori] = (map[r.kategori] || 0) + 1
  return {
    labels: Object.keys(map),
    datasets: [{
      data: Object.values(map),
      backgroundColor: ['#0B3D5C', '#C99A2E', '#175C82', '#2F7D5C', '#B3492F'],
      borderWidth: 0,
    }],
  }
})

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11.5 } } } },
}

const kolomTerbaru = [
  { key: 'nama_file', label: 'File' },
  { key: 'kategori', label: 'Kategori' },
  { key: 'diupload_oleh', label: 'Diupload Oleh' },
  { key: 'waktu_upload', label: 'Waktu' },
  { key: 'jumlah', label: 'Baris', align: 'right' },
]

const datasetTerbaru = computed(() =>
  ds.datasets.map((d) => ({ ...d, jumlah: d.rows.length }))
)
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <span class="eyebrow">Ringkasan</span>
        <h1>Dashboard Statistik Daerah</h1>
        <p>Gambaran umum data statistik yang tersedia untuk mendukung pengambilan keputusan di Provinsi Riau.</p>
      </div>
    </div>

    <div class="stat-grid">
      <StatCard label="Total Dataset" :value="ds.ringkasan.totalDataset" hint="File yang tersimpan" accent />
      <StatCard label="Total Baris Data" :value="formatAngka(ds.ringkasan.totalBaris)" hint="Seluruh titik data" />
      <StatCard label="Wilayah Tercakup" :value="ds.ringkasan.totalWilayah" hint="Kabupaten/Kota" />
      <StatCard label="Indikator" :value="ds.ringkasan.totalIndikator" hint="Jenis indikator berbeda" />
    </div>

    <TableSkeleton v-if="ds.loading && ds.datasets.length === 0" :rows="5" />
<EmptyState
  v-else-if="ds.datasets.length === 0"
  title="Belum ada dataset"
  description="Unggah dataset pertama Anda lewat halaman Upload Data untuk mulai melihat visualisasi di sini."
/>


    <template v-else>
      <div class="chart-grid">
        <div class="card chart-card">
          <div class="chart-head">
            <h3>Jumlah Penduduk per Kabupaten/Kota</h3>
            <span class="tag">{{ penduduk.satuan }} · {{ penduduk.jenis }}</span>
          </div>
          <div class="chart-body"><Bar :data="barData" :options="barOptions" /></div>
        </div>

        <div class="card chart-card">
          <div class="chart-head"><h3>Distribusi Data per Kategori</h3></div>
          <div class="chart-body"><Doughnut :data="kategoriData" :options="doughnutOptions" /></div>
        </div>
      </div>

      <h3 class="section-title">Dataset Terbaru</h3>
      <DataTable :columns="kolomTerbaru" :rows="datasetTerbaru" />
    </template>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 28px;
}

.chart-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 18px;
  margin-bottom: 32px;
}

.chart-card { padding: 22px; }

.chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.chart-head h3 { font-size: 15.5px; font-weight: 600; }

.tag {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-muted);
  text-transform: uppercase;
}

.chart-body { height: 260px; }

.section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }

@media (max-width: 1100px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .chart-grid { grid-template-columns: 1fr; }
}
</style>
