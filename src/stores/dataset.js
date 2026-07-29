import { defineStore } from 'pinia'
import { tentukanJenisAgregasi } from '../data/sample.js'
import { useLogStore } from './log.js'
import { getDatasets, getDatasetRows, uploadDataset, deleteDataset } from '../services/dataService.js'

export const useDatasetStore = defineStore('dataset', {
  state: () => ({
    datasets: [],
    loading: false,
    error: '',
  }),

  getters: {
    seluruhBaris(state) {
      return state.datasets.flatMap((d) => d.rows)
    },

    kategoriTersedia(state) {
      return [...new Set(state.datasets.map((d) => d.kategori))].sort()
    },

    wilayahTersedia() {
      return [...new Set(this.seluruhBaris.map((r) => r.wilayah))].sort()
    },

    tahunTersedia() {
      return [...new Set(this.seluruhBaris.map((r) => r.tahun))].sort()
    },

    ringkasan(state) {
      const baris = this.seluruhBaris
      return {
        totalDataset: state.datasets.length,
        totalBaris: baris.length,
        totalWilayah: this.wilayahTersedia.length,
        totalIndikator: new Set(baris.map((r) => r.indikator)).size,
      }
    },
  },

  actions: {
    // Dipanggil sekali saat aplikasi dibuka (lihat App.vue) untuk memuat
    // seluruh dataset + isi barisnya dari Supabase.
    async fetchDatasets() {
      this.loading = true
      this.error = ''
      try {
        const daftar = await getDatasets()
        const datasetsLengkap = await Promise.all(
          daftar.map(async (d) => ({
            id: d.id,
            nama_file: d.nama_file,
            kategori: d.kategori,
            diupload_oleh: d.diupload_oleh,
            waktu_upload: d.waktu_upload,
            rows: await getDatasetRows(d.id),
          }))
        )
        this.datasets = datasetsLengkap
      } catch (e) {
        this.error = e.message || 'Gagal memuat data dari server.'
        console.error('fetchDatasets:', e)
      } finally {
        this.loading = false
      }
    },

    async tambahDataset({ nama_file, kategori, rows, diupload_oleh = 'admin' }) {
      const dataset = await uploadDataset({ namaFile: nama_file, kategori, parsedRows: rows, diuploadOleh: diupload_oleh })
      this.datasets.unshift({
        id: dataset.id,
        nama_file: dataset.nama_file,
        kategori: dataset.kategori,
        diupload_oleh: dataset.diupload_oleh,
        waktu_upload: dataset.waktu_upload,
        rows,
      })
      await useLogStore().fetchLogs()
    },

    async hapusDataset(id, dihapusOleh = 'admin') {
      const target = this.datasets.find((d) => d.id === id)
      if (!target) return
      await deleteDataset(id, target.nama_file, dihapusOleh)
      this.datasets = this.datasets.filter((d) => d.id !== id)
      await useLogStore().fetchLogs()
    },

    agregasiPerWilayah(indikator, tahun = null) {
      let baris = this.seluruhBaris.filter((r) => r.indikator === indikator)
      if (tahun) baris = baris.filter((r) => String(r.tahun) === String(tahun))
      if (baris.length === 0) return { labels: [], nilai: [], jenis: 'sum', satuan: '' }

      const jenis = tentukanJenisAgregasi(indikator, baris[0].satuan)
      const perWilayah = {}
      for (const r of baris) {
        if (!perWilayah[r.wilayah]) perWilayah[r.wilayah] = []
        perWilayah[r.wilayah].push(r.nilai)
      }

      const labels = Object.keys(perWilayah).sort()
      const nilai = labels.map((w) => {
        const vals = perWilayah[w]
        if (jenis === 'mean') return vals.reduce((a, b) => a + b, 0) / vals.length
        return vals.reduce((a, b) => a + b, 0)
      })

      return { labels, nilai, jenis, satuan: baris[0].satuan }
    },

    // Menentukan apakah sebuah indikator berisi data numerik atau kategorikal (teks),
    // dengan melihat isi barisnya: kalau ada satu saja baris yang punya nilai_teks
    // terisi, indikator itu dianggap kategorikal (mis. "Status: Baik/Rusak",
    // "Jenis Kelamin"), sehingga halaman Analisis tahu harus menampilkan
    // distribusi/frekuensi, bukan total/rata-rata.
    jenisIndikator(indikator) {
      const baris = this.seluruhBaris.filter((r) => r.indikator === indikator)
      if (baris.length === 0) return 'numerik'
      const adaTeks = baris.some(
        (r) => r.nilai_teks !== null && r.nilai_teks !== undefined && String(r.nilai_teks).trim() !== ''
      )
      return adaTeks ? 'kategorikal' : 'numerik'
    },

    // Hitung distribusi/frekuensi tiap nilai kategori untuk sebuah indikator kategorikal.
    // Dipakai halaman Analisis untuk menampilkan tabel + grafik batang jumlah.
    distribusiKategori(indikator, tahun = null) {
      let baris = this.seluruhBaris.filter((r) => r.indikator === indikator)
      if (tahun) baris = baris.filter((r) => String(r.tahun) === String(tahun))

      const hitung = {}
      for (const r of baris) {
        const nilaiTampil =
          (r.nilai_teks && String(r.nilai_teks).trim()) ||
          (r.nilai !== null && r.nilai !== undefined ? String(r.nilai) : '(kosong)')
        hitung[nilaiTampil] = (hitung[nilaiTampil] || 0) + 1
      }

      const labels = Object.keys(hitung).sort()
      const jumlah = labels.map((k) => hitung[k])
      return { labels, jumlah, total: baris.length }
    },
  },
})