<script setup>
import { ref, computed, watch } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale,
} from 'chart.js'
import { useDatasetStore } from '../stores/dataset.js'
import DataTable from '../components/layout/DataTable.vue'
import EmptyState from '../components/layout/EmptyState.vue'
import { formatAngka, formatDesimal } from '../utils/format.js'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale)

const ds = useDatasetStore()

const PALET = ['#175C82', '#C0562B', '#3E8D5D', '#8A5CB8', '#B8862F', '#3A9AA8', '#B84C6F', '#5C6BC0']

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

if (!indikatorPilihan.value && indikatorSesuaiKategori.value.length > 0) {
  indikatorPilihan.value = indikatorSesuaiKategori.value[0]
}

// Baris data untuk indikator terpilih saja
const barisIndikator = computed(() =>
  ds.seluruhBaris.filter((r) => r.indikator === indikatorPilihan.value)
)

const tahunTersedia = computed(() =>
  [...new Set(barisIndikator.value.map((r) => r.tahun))]
    .filter((t) => t !== '' && t !== null && !Number.isNaN(t))
    .sort((a, b) => a - b)
)

const wilayahTersedia = computed(() =>
  [...new Set(barisIndikator.value.map((r) => r.wilayah))].sort()
)

const wilayahTerpilih = ref([])

// Saat indikator berganti, reset pilihan wilayah ke beberapa wilayah pertama secara default
watch(wilayahTersedia, (daftar) => {
  wilayahTerpilih.value = daftar.slice(0, 6)
}, { immediate: true })

function pilihSemuaWilayah() { wilayahTerpilih.value = [...wilayahTersedia.value] }
function hapusSemuaWilayah() { wilayahTerpilih.value = [] }

// Rata-rata nilai per wilayah+tahun (jaga-jaga kalau ada baris duplikat dari beberapa dataset)
const nilaiPerWilayahTahun = computed(() => {
  const peta = new Map() // key: "wilayah|tahun" -> { total, jumlah }
  for (const r of barisIndikator.value) {
    const key = `${r.wilayah}|${r.tahun}`
    const entri = peta.get(key) || { total: 0, jumlah: 0 }
    entri.total += r.nilai
    entri.jumlah += 1
    peta.set(key, entri)
  }
  const hasil = new Map()
  for (const [key, { total, jumlah }] of peta) {
    hasil.set(key, total / jumlah)
  }
  return hasil
})

function nilaiUntuk(wilayah, tahun) {
  return nilaiPerWilayahTahun.value.get(`${wilayah}|${tahun}`)
}

const satuanIndikator = computed(() => {
  const r = barisIndikator.value[0]
  return r ? r.satuan : ''
})

const lineData = computed(() => ({
  labels: tahunTersedia.value.map(String),
  datasets: wilayahTerpilih.value.map((w, i) => ({
    label: w,
    data: tahunTersedia.value.map((t) => {
      const v = nilaiUntuk(w, t)
      return v === undefined ? null : v
    }),
    borderColor: PALET[i % PALET.length],
    backgroundColor: PALET[i % PALET.length],
    tension: 0.3,
    spanGaps: true,
    pointRadius: 3,
  })),
}))

const lineOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { font: { size: 11.5 }, boxWidth: 12 } },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${formatDesimal(ctx.parsed.y, 2)} ${satuanIndikator.value}`,
      },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: { grid: { color: '#EDEAE0' }, ticks: { font: { size: 11 } } },
  },
}))

// Ringkasan perubahan dari tahun paling awal ke paling akhir yang tersedia
const kolomPerubahan = [
  { key: 'wilayah', label: 'Wilayah' },
  { key: 'awal', label: 'Nilai Awal', align: 'right' },
  { key: 'akhir', label: 'Nilai Akhir', align: 'right' },
  { key: 'perubahan', label: 'Perubahan', align: 'right' },
  { key: 'persen', label: '% Perubahan', align: 'right' },
]

const barisPerubahan = computed(() => {
  if (tahunTersedia.value.length < 2) return []
  const tahunAwal = tahunTersedia.value[0]
  const tahunAkhir = tahunTersedia.value[tahunTersedia.value.length - 1]

  return wilayahTerpilih.value
    .map((w) => {
      const nAwal = nilaiUntuk(w, tahunAwal)
      const nAkhir = nilaiUntuk(w, tahunAkhir)
      if (nAwal === undefined || nAkhir === undefined) return null
      const delta = nAkhir - nAwal
      const persen = nAwal !== 0 ? (delta / nAwal) * 100 : null
      return {
        wilayah: w,
        awal: formatDesimal(nAwal, 2),
        akhir: formatDesimal(nAkhir, 2),
        perubahan: `${delta >= 0 ? '+' : ''}${formatDesimal(delta, 2)}`,
        persen: persen === null ? '—' : `${persen >= 0 ? '+' : ''}${formatDesimal(persen, 1)}%`,
      }
    })
    .filter(Boolean)
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <span class="eyebrow">Analisis Deret Waktu</span>
        <h1>Tren Waktu</h1>
        <p>Bandingkan perkembangan suatu indikator antar tahun, per wilayah.</p>
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
      </div>

      <div v-if="tahunTersedia.length < 2" class="card">
        <p class="muted">
          Indikator ini baru punya data untuk {{ tahunTersedia.length }} tahun
          ({{ tahunTersedia.join(', ') || '-' }}). Tren perlu data dari minimal 2 tahun berbeda untuk dibandingkan.
        </p>
      </div>

      <template v-else>
        <div class="card wilayah-picker">
          <div class="wilayah-picker-head">
            <span class="wilayah-picker-title">Pilih Wilayah untuk Dibandingkan</span>
            <div class="wilayah-picker-actions">
              <button class="link-btn" @click="pilihSemuaWilayah">Pilih Semua</button>
              <button class="link-btn" @click="hapusSemuaWilayah">Hapus Semua</button>
            </div>
          </div>
          <div class="wilayah-list">
            <label v-for="w in wilayahTersedia" :key="w" class="wilayah-item">
              <input type="checkbox" :value="w" v-model="wilayahTerpilih" />
              <span>{{ w }}</span>
            </label>
          </div>
        </div>

        <div class="card chart-card">
          <h3>{{ indikatorPilihan }} ({{ satuanIndikator }}), {{ tahunTersedia[0] }}–{{ tahunTersedia[tahunTersedia.length - 1] }}</h3>
          <div v-if="wilayahTerpilih.length === 0" class="chart-empty">
            <p class="muted">Pilih minimal satu wilayah untuk menampilkan grafik.</p>
          </div>
          <div v-else class="chart-body"><Line :data="lineData" :options="lineOptions" /></div>
        </div>

        <template v-if="barisPerubahan.length > 0">
          <h3 class="section-title">Ringkasan Perubahan {{ tahunTersedia[0] }} → {{ tahunTersedia[tahunTersedia.length - 1] }}</h3>
          <DataTable :columns="kolomPerubahan" :rows="barisPerubahan" />
        </template>
      </template>
    </template>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  align-items: flex-end;
  gap: 22px;
  padding: 18px 22px;
  margin-bottom: 18px;
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

.muted { color: var(--color-muted); font-size: 13.5px; }

.wilayah-picker { padding: 18px 22px; margin-bottom: 18px; }
.wilayah-picker-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.wilayah-picker-title { font-size: 13px; font-weight: 600; color: var(--color-ink-soft); }
.wilayah-picker-actions { display: flex; gap: 14px; }

.link-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-primary, #175C82);
  text-decoration: underline;
  cursor: pointer;
  font: inherit;
  font-size: 12.5px;
}
.link-btn:hover { opacity: 0.8; }

.wilayah-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
}
.wilayah-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13.3px;
  cursor: pointer;
}
.wilayah-item input { cursor: pointer; }

.chart-card { padding: 22px; margin-bottom: 30px; }
.chart-card h3 { font-size: 15.5px; font-weight: 600; margin-bottom: 14px; }
.chart-body { height: 360px; }
.chart-empty { height: 200px; display: flex; align-items: center; justify-content: center; }

.section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
</style>