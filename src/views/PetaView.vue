<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useDatasetStore } from '../stores/dataset.js'
import EmptyState from '../components/layout/EmptyState.vue'
import { formatDesimal } from '../utils/format.js'

const ds = useDatasetStore()

// URL GeoJSON batas kabupaten/kota se-Indonesia (basis GADM), diakses lewat CDN jsDelivr
// supaya bebas masalah CORS/robots. Kalau nanti mau di-hosting sendiri (disarankan untuk
// produksi, supaya tidak bergantung pihak ketiga), simpan filenya di /public/geo/riau.json
// dan ganti URL_GEOJSON menjadi '/geo/riau.json'.
const URL_GEOJSON = 'https://cdn.jsdelivr.net/gh/rifani/geojson-political-indonesia/IDN_adm_2_kabkota.json'
const NAMA_PROVINSI_GEOJSON = 'Riau' // nilai NAME_1 pada file GADM untuk Provinsi Riau

// Alias: kunci = nama wilayah versi dataset (huruf kecil, tanpa prefiks "kab./kota"),
// nilai = nama wilayah versi GeoJSON (NAME_2, tanpa prefiks). Lengkapi/perbaiki sesuai
// nama wilayah yang benar-benar dipakai di dataset kamu.
const WILAYAH_RIAU_ALIAS = {
  tembilahan: 'indragiri hilir', // Tembilahan = ibu kota Kab. Indragiri Hilir
}

function normalisasiNama(nama) {
  let s = String(nama ?? '').toLowerCase().trim()
  s = s.replace(/^kab\.?\s+/, '').replace(/^kabupaten\s+/, '').replace(/^kota\s+/, '')
  s = s.trim()
  return WILAYAH_RIAU_ALIAS[s] || s
}

const mapEl = ref(null)
let map = null
let geoLayer = null

const geojsonRiau = ref(null)
const loadingGeo = ref(true)
const errorGeo = ref('')

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

const hasil = computed(() => {
  if (!indikatorPilihan.value) return { labels: [], nilai: [], jenis: 'sum', satuan: '' }
  return ds.agregasiPerWilayah(indikatorPilihan.value)
})

// Peta: nama wilayah (dinormalisasi) -> nilai
const nilaiPerWilayah = computed(() => {
  const peta = new Map()
  hasil.value.labels.forEach((label, i) => {
    peta.set(normalisasiNama(label), hasil.value.nilai[i])
  })
  return peta
})

// Wilayah di dataset yang tidak berhasil dicocokkan ke GeoJSON (untuk peringatan ke admin)
const wilayahTakCocok = ref([])

// Klasifikasi 5 kelas warna berbasis kuantil dari nilai yang ada
const kelasWarna = computed(() => {
  const nilai = [...nilaiPerWilayah.value.values()].filter((v) => !Number.isNaN(v))
  if (nilai.length === 0) return []
  const sorted = [...nilai].sort((a, b) => a - b)
  const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))]
  return [q(0), q(0.25), q(0.5), q(0.75), q(1)]
})

const PALET = ['#DCE9F0', '#A9C9DA', '#6FA0BE', '#3A7595', '#175C82']

function warnaUntukNilai(nilai) {
  if (nilai === undefined || Number.isNaN(nilai) || kelasWarna.value.length === 0) return '#E9E5D8' // abu-krem: tidak ada data
  const [b0, b1, b2, b3, b4] = kelasWarna.value
  if (nilai <= b1) return PALET[0]
  if (nilai <= b2) return PALET[1]
  if (nilai <= b3) return PALET[2]
  if (nilai <= b4) return PALET[3]
  return PALET[4]
}

async function muatGeoJSON() {
  loadingGeo.value = true
  errorGeo.value = ''
  try {
    const res = await fetch(URL_GEOJSON)
    if (!res.ok) throw new Error('Gagal memuat data batas wilayah.')
    const semua = await res.json()
    const fitur = semua.features.filter(
      (f) => (f.properties.NAME_1 || '').toLowerCase() === NAMA_PROVINSI_GEOJSON.toLowerCase()
    )
    geojsonRiau.value = { type: 'FeatureCollection', features: fitur }
  } catch (e) {
    errorGeo.value = 'Tidak dapat memuat peta batas wilayah. Cek koneksi internet atau ganti sumber GeoJSON.'
  } finally {
    loadingGeo.value = false
  }
}

function renderLayer() {
  if (!map || !geojsonRiau.value) return
  if (geoLayer) {
    map.removeLayer(geoLayer)
  }

  const takCocok = new Set()

  geoLayer = L.geoJSON(geojsonRiau.value, {
    style: (feature) => {
      const namaGeo = normalisasiNama(feature.properties.NAME_2)
      const nilai = nilaiPerWilayah.value.get(namaGeo)
      if (nilai === undefined) takCocok.add(feature.properties.NAME_2)
      return {
        fillColor: warnaUntukNilai(nilai),
        weight: 1.3,
        color: '#ffffff',
        fillOpacity: 0.9,
      }
    },
    onEachFeature: (feature, layer) => {
      const namaAsli = feature.properties.NAME_2
      const namaGeo = normalisasiNama(namaAsli)
      const nilai = nilaiPerWilayah.value.get(namaGeo)
      const teksNilai = nilai === undefined
        ? 'Tidak ada data'
        : `${formatDesimal(nilai, 2)} ${hasil.value.satuan || ''}`

      layer.bindTooltip(`<strong>${namaAsli}</strong><br/>${teksNilai}`, { sticky: true })

      layer.on('mouseover', () => layer.setStyle({ weight: 3, color: '#175C82' }))
      layer.on('mouseout', () => layer.setStyle({ weight: 1.3, color: '#ffffff' }))
    },
  }).addTo(map)

  wilayahTakCocok.value = [...takCocok]

  if (geoLayer.getBounds().isValid()) {
    map.fitBounds(geoLayer.getBounds(), { padding: [16, 16] })
  }
}

onMounted(async () => {
  await nextTick()
  map = L.map(mapEl.value, { scrollWheelZoom: true }).setView([0.5, 101.5], 7)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map)

  await muatGeoJSON()
  renderLayer()
})

onBeforeUnmount(() => {
  if (map) map.remove()
})

watch([indikatorPilihan, geojsonRiau], () => {
  renderLayer()
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <span class="eyebrow">Visualisasi Spasial</span>
        <h1>Peta Interaktif</h1>
        <p>Sebaran indikator per kabupaten/kota di Provinsi Riau dalam bentuk peta choropleth.</p>
      </div>
    </div>

    <div v-if="ds.datasets.length === 0">
      <EmptyState title="Belum ada data untuk dipetakan" description="Unggah dataset terlebih dahulu lewat halaman Upload Data." />
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

      <p v-if="errorGeo" class="msg error">{{ errorGeo }}</p>
      <p v-if="wilayahTakCocok.length > 0" class="msg warn">
        ⚠️ {{ wilayahTakCocok.length }} wilayah pada peta tidak ditemukan padanannya di dataset:
        {{ wilayahTakCocok.join(', ') }}. Periksa penulisan nama wilayah di dataset atau daftar alias.
      </p>

      <div class="card map-card">
        <div v-if="loadingGeo" class="map-loading">Memuat peta…</div>
        <div ref="mapEl" class="map-container"></div>

        <div class="legend" v-if="kelasWarna.length > 0">
          <span class="legend-title">{{ indikatorPilihan }}</span>
          <div class="legend-scale">
            <span
              v-for="(warna, i) in ['#DCE9F0', '#A9C9DA', '#6FA0BE', '#3A7595', '#175C82']"
              :key="i"
              class="legend-swatch"
              :style="{ background: warna }"
            ></span>
          </div>
          <div class="legend-labels">
            <span>{{ formatDesimal(kelasWarna[0], 1) }}</span>
            <span>{{ formatDesimal(kelasWarna[4], 1) }}</span>
          </div>
        </div>
      </div>
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

.msg { padding: 10px 14px; border-radius: 8px; font-size: 13.5px; margin-bottom: 14px; }
.msg.error { background: var(--color-danger-bg); color: var(--color-danger); }
.msg.warn { background: #FFF6DD; color: #8A6116; }

.map-card { padding: 0; overflow: hidden; position: relative; }
.map-container { height: 560px; width: 100%; z-index: 0; }
.map-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.75);
  z-index: 10;
  font-size: 13.5px;
  color: var(--color-muted);
}

.legend {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 5;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 14px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  max-width: 220px;
}
.legend-title { display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; }
.legend-scale { display: flex; height: 10px; border-radius: 4px; overflow: hidden; }
.legend-swatch { flex: 1; }
.legend-labels { display: flex; justify-content: space-between; font-size: 11px; color: var(--color-muted); margin-top: 4px; }
</style>