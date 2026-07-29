<script setup>
import { ref, computed } from 'vue'
import Papa from 'papaparse'
import { useRouter } from 'vue-router'
import { useDatasetStore } from '../stores/dataset.js'
import { useAuthStore } from '../stores/auth.js'
import DataTable from '../components/layout/DataTable.vue'

const ds = useDatasetStore()
const auth = useAuthStore()
const router = useRouter()

const SKEMA_STANDAR = ['kategori', 'wilayah', 'tahun', 'indikator', 'nilai', 'satuan']
const BULAN = [
  'januari', 'februari', 'maret', 'april', 'mei', 'juni',
  'juli', 'agustus', 'september', 'oktober', 'november', 'desember',
]

const fileName = ref('')
const parseError = ref('')
const successMsg = ref('')
const fileInput = ref(null)

// mode: null | 'standar' | 'wide'
const modeKonversi = ref(null)

// --- mode 'standar' (CSV sudah sesuai skema kategori,wilayah,tahun,indikator,nilai,satuan) ---
const rawStandarRows = ref([])

// --- mode 'wide' (format lain: BPS lebar-per-tahun, bulanan, gabungan indikator/periode, dst) ---
// Catatan: mode ini tetap khusus data numerik/deret waktu, karena proses
// melt/unpivot-nya (menjumlah/menyusun nilai per kolom tahun/bulan) memang
// cuma masuk akal untuk angka. Dukungan data kategorikal (teks) disediakan
// lewat mode 'standar' di atas.
const wideRows = ref([])
const kolomWilayah = ref('')
const kolomTahun = ref([]) // [{ field, tahunEksplisit, labelIndikator, subLabel }]
const labelRowDetected = ref(false)
const wilayahTunggal = ref('') // terisi kalau wilayah cuma 1 & ditebak dari nama file
const inputKategori = ref('')
const inputIndikator = ref('')
const inputSatuan = ref('')
const inputTahun = ref('')

const kolomPreview = SKEMA_STANDAR.map((k) => ({ key: k, label: k }))

// ---------- util kecil ----------

function tebakDariNamaFile(nama) {
  let s = nama.replace(/\.csv$/i, '')
  s = s.replace(/[-_]+(clean|fixed|final|revisi)$/i, '')
  s = s.replace(/[-_]+/g, ' ').trim()
  return s
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function tebakWilayahDariNamaFile(nama) {
  const base = nama.replace(/\.csv$/i, '')
  const m = base.match(/(kabupaten|kota|provinsi)[-_]([a-z0-9-_]+)/i)
  if (!m) return ''
  const jenis = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase()
  let sisa = m[2].replace(/[-_](fixed|clean|final|revisi)$/i, '')
  sisa = sisa.replace(/[-_]+/g, ' ').trim()
  sisa = sisa.split(' ').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  return sisa ? `${jenis} ${sisa}` : ''
}

function nilaiKosong(v) {
  if (v === null || v === undefined) return true
  const s = String(v).trim()
  return s === '' || /^(\.{2,}|-{1,2}|n\/?a|tidak tersedia)$/i.test(s)
}

function parseAngka(v) {
  let s = String(v).trim()
  if (s.includes(',') && !s.includes('.')) {
    s = s.replace(',', '.')
  } else {
    s = s.replace(/,/g, '')
  }
  return parseFloat(s)
}

// Cek apakah sebuah nilai mentah dari CSV memang murni angka (boleh pakai
// koma/titik sebagai desimal, boleh minus) -- bukan cuma "diawali" angka.
// Ini yang membedakan nilai numerik ("75.21") dari nilai kategorikal ("Baik").
function apakahNumerik(v) {
  const s = String(v ?? '').trim()
  if (s === '') return false
  return /^-?[\d.,]+$/.test(s) && /\d/.test(s)
}

// Ubah nilai mentah jadi salah satu dari { nilai, nilai_teks } -- keduanya
// saling eksklusif. Dipakai supaya skema standar bisa menyimpan indikator
// numerik (mis. "75.21") maupun kategorikal (mis. "Baik", "Laki-laki") dalam
// kolom yang tepat, tanpa memaksa semuanya jadi angka.
function prosesNilai(mentah) {
  if (nilaiKosong(mentah)) return { nilai: null, nilai_teks: null }
  if (apakahNumerik(mentah)) return { nilai: parseAngka(mentah), nilai_teks: null }
  return { nilai: null, nilai_teks: String(mentah).trim() }
}

// Cari baris header asli di antara baris-baris file (melewati baris judul/metadata di atasnya).
// Heuristik: baris dengan jumlah sel terisi terbanyak (di antara ~20 baris pertama);
// kalau ada beberapa baris dengan jumlah sama, ambil yang pertama muncul.
function cariBarisHeader(semuaBaris) {
  const batas = Math.min(semuaBaris.length, 20)
  let maxIsi = 0
  for (let i = 0; i < batas; i++) {
    const isi = semuaBaris[i].filter((c) => String(c ?? '').trim() !== '').length
    if (isi > maxIsi) maxIsi = isi
  }
  if (maxIsi < 2) return -1
  for (let i = 0; i < batas; i++) {
    const isi = semuaBaris[i].filter((c) => String(c ?? '').trim() !== '').length
    if (isi === maxIsi) return i
  }
  return -1
}

// Cari tahun konteks dari baris-baris metadata sebelum header (mis. baris yang isinya cuma "2025").
function cariTahunKonteks(barisSebelumHeader) {
  for (let i = barisSebelumHeader.length - 1; i >= 0; i--) {
    for (const cell of barisSebelumHeader[i]) {
      const s = String(cell ?? '').trim()
      if (/^(19|20)\d{2}$/.test(s)) return parseInt(s, 10)
    }
  }
  for (let i = barisSebelumHeader.length - 1; i >= 0; i--) {
    const teks = barisSebelumHeader[i].join(' ')
    const m = teks.match(/(19|20)\d{2}/)
    if (m) return parseInt(m[0], 10)
  }
  return null
}

function cariTahunDariNamaFile(nama) {
  const semua = [...nama.matchAll(/(19|20)\d{2}/g)]
  if (semua.length === 0) return null
  return parseInt(semua[semua.length - 1][0], 10)
}

// Klasifikasi tiap kolom (selain kolom wilayah) menjadi salah satu pola:
// - kolom tahun eksplisit (mis. "Tahun 2022")
// - kolom bulan (mis. "Januari") -> tahun diambil dari konteks/input admin
// - kolom gabungan "Indikator - Periode" (mis. "TPT - Februari")
// - fallback: kolom dianggap indikator tersendiri (mis. "Tahunan")
function klasifikasikanKolom(header) {
  const h = header.trim()
  const mYear = h.match(/(19|20)\d{2}/)
  if (mYear) {
    return { field: header, tahunEksplisit: parseInt(mYear[0], 10), labelIndikator: null, subLabel: null }
  }
  // Cek pola gabungan "Indikator - Periode" lebih dulu, sebelum cek nama bulan —
  // supaya kolom seperti "TPT - Februari" tidak salah terklasifikasi sebagai kolom bulan biasa.
  if (h.includes(' - ')) {
    const bagian = h.split(' - ')
    const depan = bagian[0].trim()
    const belakang = bagian.slice(1).join(' - ').trim()
    return { field: header, tahunEksplisit: null, labelIndikator: depan, subLabel: belakang }
  }
  const hLower = h.toLowerCase()
  const bulanKetemu = BULAN.find((b) => hLower === b)
  if (bulanKetemu) {
    return { field: header, tahunEksplisit: null, labelIndikator: null, subLabel: h }
  }
  return { field: header, tahunEksplisit: null, labelIndikator: h, subLabel: null }
}

function resetHasilParse() {
  parseError.value = ''
  successMsg.value = ''
  modeKonversi.value = null
  rawStandarRows.value = []
  wideRows.value = []
  kolomWilayah.value = ''
  kolomTahun.value = []
  labelRowDetected.value = false
  wilayahTunggal.value = ''
  inputKategori.value = ''
  inputIndikator.value = ''
  inputSatuan.value = ''
  inputTahun.value = ''
}

// ---------- penanganan file ----------

async function handleFile(e) {
  const file = e.target.files[0]
  resetHasilParse()
  if (!file) return

  if (!file.name.toLowerCase().endsWith('.csv')) {
    parseError.value = 'File harus berformat CSV.'
    return
  }

  fileName.value = file.name

  const teksAsli = await file.text()
  const teks = teksAsli.replace(/^\uFEFF/, '') // buang BOM di awal file kalau ada

  const hasilMentah = Papa.parse(teks, { skipEmptyLines: 'greedy' })
  const semuaBaris = hasilMentah.data

  if (!semuaBaris || semuaBaris.length === 0) {
    parseError.value = 'File CSV kosong atau tidak terbaca.'
    return
  }

  const idxHeader = cariBarisHeader(semuaBaris)
  if (idxHeader === -1) {
    parseError.value = 'Tidak dapat menemukan baris header pada file ini.'
    return
  }

  const headerMentah = semuaBaris[idxHeader].map((h) => String(h ?? '').trim())
  const barisDataMentah = semuaBaris
    .slice(idxHeader + 1)
    .filter((r) => r.some((c) => String(c ?? '').trim() !== ''))

  if (barisDataMentah.length === 0) {
    parseError.value = 'File tidak berisi baris data.'
    return
  }

  const dataObjek = barisDataMentah.map((r) => {
    const obj = {}
    headerMentah.forEach((h, i) => { obj[h] = r[i] })
    return obj
  })

  // Kasus 1: CSV sudah memakai skema standar dashboard -> pakai langsung.
  // Nilai tiap baris otomatis dideteksi: kalau murni angka masuk ke `nilai`,
  // kalau teks/kategori (mis. "Baik", "Laki-laki") masuk ke `nilai_teks`.
  const fieldsNorm = headerMentah.map((f) => f.toLowerCase())
  const cocokStandar = SKEMA_STANDAR.every((s) => fieldsNorm.includes(s))

  if (cocokStandar) {
    const petaField = {}
    SKEMA_STANDAR.forEach((s) => { petaField[s] = headerMentah[fieldsNorm.indexOf(s)] })
    modeKonversi.value = 'standar'
    rawStandarRows.value = dataObjek.map((o) => {
      const { nilai, nilai_teks } = prosesNilai(o[petaField.nilai])
      const tahunParsed = parseInt(o[petaField.tahun], 10)
      return {
        kategori: String(o[petaField.kategori] ?? '').trim(),
        wilayah: String(o[petaField.wilayah] ?? '').trim(),
        tahun: Number.isNaN(tahunParsed) ? null : tahunParsed,
        indikator: String(o[petaField.indikator] ?? '').trim(),
        nilai,
        nilai_teks,
        satuan: String(o[petaField.satuan] ?? '').trim(),
      }
    })
    return
  }

  // Kasus 2: format lain -> coba auto-convert (lebar-per-tahun, bulanan, gabungan, dst)
  const kolomWilayahField = headerMentah[0]
  const kolomLainHeader = headerMentah.slice(1).filter(Boolean)

  if (!kolomWilayahField || kolomLainHeader.length === 0) {
    parseError.value = 'Format CSV tidak dikenali. Pastikan ada kolom pertama untuk wilayah/label dan minimal satu kolom data lain.'
    return
  }

  kolomWilayah.value = kolomWilayahField
  const klasifikasi = kolomLainHeader.map((h) => klasifikasikanKolom(h))
  kolomTahun.value = klasifikasi

  const tahunKonteks = cariTahunKonteks(semuaBaris.slice(0, idxHeader)) ?? cariTahunDariNamaFile(file.name)
  inputTahun.value = tahunKonteks ? String(tahunKonteks) : ''

  // Deteksi kasus "1 wilayah per file" (wilayah tertanam di nama file, kolom pertama sebenarnya deskripsi indikator)
  const nilaiWilayahUnik = new Set(dataObjek.map((o) => String(o[kolomWilayahField] ?? '').trim()))
  let dataRows = dataObjek

  if (nilaiWilayahUnik.size === 1) {
    const tebakanWilayah = tebakWilayahDariNamaFile(file.name)
    const deskripsi = [...nilaiWilayahUnik][0]
    wilayahTunggal.value = tebakanWilayah || deskripsi
    if (deskripsi) inputIndikator.value = deskripsi
  } else {
    // Deteksi baris label indikator: baris pertama bernilai 0/kosong di semua kolom bertahun eksplisit
    // (pola umum file BPS yang menaruh nama indikator sebagai "baris wilayah" pertama)
    const kolomTahunEksplisit = klasifikasi.filter((k) => k.tahunEksplisit !== null)
    if (kolomTahunEksplisit.length > 0) {
      const baris0 = dataObjek[0]
      const semuaNol = kolomTahunEksplisit.every((k) => {
        const v = baris0[k.field]
        return nilaiKosong(v) || parseAngka(v) === 0
      })
      if (semuaNol) {
        labelRowDetected.value = true
        const labelGuess = String(baris0[kolomWilayahField] ?? '').trim()
        if (labelGuess) inputIndikator.value = labelGuess
        dataRows = dataObjek.slice(1)
      }
    }
  }

  wideRows.value = dataRows

  if (!inputIndikator.value) inputIndikator.value = tebakDariNamaFile(file.name)
  if (!inputKategori.value) inputKategori.value = tebakDariNamaFile(file.name)

  modeKonversi.value = 'wide'
}

// Ubah data non-standar menjadi baris-baris skema standar (melt/unpivot),
// mengikuti kategori/indikator/satuan/tahun yang diisi admin di panel konversi.
// Mode ini tetap khusus numerik -- baris dengan nilai bukan angka dilewati.
const parsedRowsWide = computed(() => {
  if (modeKonversi.value !== 'wide') return []
  const hasil = []
  for (const baris of wideRows.value) {
    const wilayah = wilayahTunggal.value || String(baris[kolomWilayah.value] ?? '').trim()
    for (const k of kolomTahun.value) {
      const mentah = baris[k.field]
      if (nilaiKosong(mentah)) continue
      const nilai = parseAngka(mentah)
      if (Number.isNaN(nilai)) continue

      const tahun = k.tahunEksplisit ?? (inputTahun.value ? parseInt(inputTahun.value, 10) : null)
      const indikatorDasar = k.labelIndikator || inputIndikator.value.trim() || fileName.value
      const indikator = k.subLabel ? `${indikatorDasar} - ${k.subLabel}` : indikatorDasar

      hasil.push({
        kategori: inputKategori.value.trim() || 'Tanpa Kategori',
        wilayah,
        tahun: tahun ?? '',
        indikator,
        nilai,
        nilai_teks: null,
        satuan: inputSatuan.value.trim(),
      })
    }
  }
  return hasil
})

const parsedRows = computed(() => {
  if (modeKonversi.value === 'standar') return rawStandarRows.value
  if (modeKonversi.value === 'wide') return parsedRowsWide.value
  return []
})

const infoKolom = computed(() => {
  if (modeKonversi.value !== 'wide') return null
  const jmlTahun = kolomTahun.value.filter((k) => k.tahunEksplisit !== null).length
  const jmlBulan = kolomTahun.value.filter((k) => k.subLabel !== null && k.tahunEksplisit === null && k.labelIndikator === null).length
  const jmlGabungan = kolomTahun.value.filter((k) => k.labelIndikator !== null).length
  return { total: kolomTahun.value.length, jmlTahun, jmlBulan, jmlGabungan }
})

// Setelah berhasil disimpan, arahkan admin langsung ke halaman Analisis
// dengan filter kategori & indikator sesuai dataset yang baru diupload.
async function prosesUpload() {
  if (parsedRows.value.length === 0) return
  const kategori = parsedRows.value[0].kategori || 'Tanpa Kategori'
  const indikator = parsedRows.value[0].indikator

  successMsg.value = ''
  parseError.value = ''

  try {
    await ds.tambahDataset({
      nama_file: fileName.value,
      kategori,
      rows: parsedRows.value,
      diupload_oleh: auth.username || 'admin',
    })
    resetHasilParse()
    fileName.value = ''
    if (fileInput.value) fileInput.value.value = ''
    router.push({ name: 'analisis', query: { kategori, indikator } })
  } catch (e) {
    parseError.value = 'Gagal menyimpan ke server: ' + (e.message || 'terjadi kesalahan tidak diketahui')
    console.error('prosesUpload gagal:', e)
  }
}

function hapus(id) {
  ds.hapusDataset(id, auth.username || 'admin')
}

// Klik nama file dataset lama di tabel -> lompat ke Analisis dengan filter dataset itu.
function lihatAnalisis(row) {
  const indikatorPertama = row.rows && row.rows[0] ? row.rows[0].indikator : ''
  router.push({ name: 'analisis', query: { kategori: row.kategori, indikator: indikatorPertama } })
}

const kolomKelola = [
  { key: 'nama_file', label: 'Nama File' },
  { key: 'kategori', label: 'Kategori' },
  { key: 'jumlah', label: 'Baris', align: 'right' },
  { key: 'diupload_oleh', label: 'Diupload Oleh' },
  { key: 'waktu_upload', label: 'Waktu Upload' },
  { key: 'aksi', label: '' },
]

const datasetTabel = computed(() => ds.datasets.map((d) => ({ ...d, jumlah: d.rows.length })))
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <span class="eyebrow">Kelola Data</span>
        <h1>Upload Dataset Baru</h1>
        <p>
          Mendukung CSV skema standar (<code>kategori, wilayah, tahun, indikator, nilai, satuan</code>) —
          baik nilai numerik maupun teks/kategori dideteksi otomatis — serta format lebar khas BPS
          (wilayah + kolom tahun), data bulanan, maupun kolom gabungan indikator/periode untuk data numerik.
          Halaman ini khusus admin — upload &amp; hapus dataset memerlukan login.
        </p>
      </div>
    </div>

    <div v-if="!auth.sudahLogin" class="card gate">
      <p>🔐 Silakan login sebagai admin (lihat tombol <strong>Login Admin</strong> di kanan atas) untuk mengunggah atau menghapus dataset.</p>
      <p class="muted">Melihat dashboard &amp; analisis tetap terbuka untuk semua orang tanpa login.</p>
    </div>

    <template v-else>
      <div class="card upload-box">
        <label class="file-drop">
          <input ref="fileInput" type="file" accept=".csv" @change="handleFile" hidden />
          <span class="drop-icon">⬆️</span>
          <strong>Pilih atau tarik file CSV ke sini</strong>
          <span class="muted">Skema standar otomatis dipakai langsung; format lain otomatis dikonversi.</span>
        </label>

        <p v-if="parseError" class="msg error">{{ parseError }}</p>
        <p v-if="successMsg" class="msg success">{{ successMsg }}</p>

        <div v-if="modeKonversi === 'wide'" class="card konversi-box">
          <p class="konversi-info">
            🔄 Format non-standar terdeteksi — {{ infoKolom.total }} kolom data ditemukan
            ({{ infoKolom.jmlTahun }} kolom tahun, {{ infoKolom.jmlBulan }} kolom bulan, {{ infoKolom.jmlGabungan }} kolom gabungan indikator/periode).
            <span v-if="labelRowDetected">Baris pertama terdeteksi sebagai label indikator dan sudah dipisahkan dari data.</span>
            <span v-if="wilayahTunggal">Wilayah tunggal terdeteksi dari nama file — cek/perbaiki di kolom Wilayah.</span>
          </p>
          <p class="muted">Lengkapi/perbaiki info berikut sebelum ditambahkan ke dashboard:</p>
          <div class="konversi-fields">
            <label>
              Kategori
              <input v-model="inputKategori" type="text" placeholder="mis. Demografi" />
            </label>
            <label>
              Indikator
              <input v-model="inputIndikator" type="text" placeholder="mis. Angka Harapan Hidup" />
            </label>
            <label>
              Satuan
              <input v-model="inputSatuan" type="text" placeholder="mis. tahun, %, jiwa" />
            </label>
            <label>
              Tahun <span class="muted">(dipakai untuk kolom tanpa tahun eksplisit)</span>
              <input v-model="inputTahun" type="text" placeholder="mis. 2025" />
            </label>
            <label v-if="wilayahTunggal">
              Wilayah
              <input v-model="wilayahTunggal" type="text" placeholder="mis. Kabupaten Kuantan Singingi" />
            </label>
          </div>
        </div>

        <div v-if="parsedRows.length > 0" class="preview">
          <p class="preview-label">🔎 Pratinjau — {{ parsedRows.length }} baris terbaca dari <strong>{{ fileName }}</strong></p>
          <DataTable :columns="kolomPreview" :rows="parsedRows.slice(0, 8)">
            <template #cell-nilai="{ row }">
              {{ row.nilai !== null && row.nilai !== undefined ? row.nilai : (row.nilai_teks || '-') }}
            </template>
          </DataTable>
          <button class="btn btn-primary" @click="prosesUpload">Proses &amp; Tambahkan ke Dashboard</button>
        </div>
      </div>
    </template>

    <h3 class="card-title">Kelola Dataset Tersimpan</h3>
    <DataTable :columns="kolomKelola" :rows="datasetTabel">
      <template #cell-nama_file="{ row }">
        <button class="link-btn" @click="lihatAnalisis(row)">{{ row.nama_file }}</button>
      </template>
      <template #cell-aksi="{ row }">
        <button v-if="auth.sudahLogin" class="btn btn-danger" @click="hapus(row.id)">Hapus</button>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.gate {
  padding: 22px 24px;
  margin-bottom: 26px;
  background: var(--color-info-bg);
  border-color: #cfe0e9;
}
.gate p { margin: 0 0 4px; }
.muted { color: var(--color-muted); font-size: 13px; }

.upload-box { padding: 26px; margin-bottom: 32px; }

.file-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
  border: 1.5px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: 40px 20px;
  cursor: pointer;
  transition: border-color 0.12s ease, background 0.12s ease;
}
.file-drop:hover { border-color: var(--color-primary-light); background: var(--color-surface-alt); }
.drop-icon { font-size: 26px; }

.msg { padding: 10px 14px; border-radius: 8px; font-size: 13.5px; margin-top: 14px; }
.msg.error { background: var(--color-danger-bg); color: var(--color-danger); }
.msg.success { background: var(--color-success-bg); color: var(--color-success); }

.konversi-box {
  margin-top: 18px;
  padding: 18px 20px;
  background: var(--color-info-bg);
  border-color: #cfe0e9;
}
.konversi-info { margin: 0 0 6px; font-size: 13.5px; }
.konversi-fields {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 10px;
}
.konversi-fields label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12.5px;
  color: var(--color-ink-soft);
}
.konversi-fields input {
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 7px;
  font-size: 13.5px;
}

.preview { margin-top: 20px; display: flex; flex-direction: column; gap: 12px; }
.preview-label { font-size: 13.5px; color: var(--color-ink-soft); }

.link-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-primary, #175C82);
  text-decoration: underline;
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.link-btn:hover { opacity: 0.8; }

code {
  font-family: var(--font-mono);
  background: var(--color-surface-alt);
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 12.5px;
}
</style>