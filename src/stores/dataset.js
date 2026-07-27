import { defineStore } from 'pinia'
import { DATASET_AWAL, tentukanJenisAgregasi } from '../data/sample.js'
import { useLogStore } from './log.js'
import { waktuSekarang } from '../utils/format.js'

let counter = DATASET_AWAL.length

export const useDatasetStore = defineStore('dataset', {
  state: () => ({
    datasets: JSON.parse(JSON.stringify(DATASET_AWAL)),
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
    tambahDataset({ nama_file, kategori, rows, diupload_oleh = 'admin' }) {
      counter += 1
      this.datasets.unshift({
        id: `ds-${counter}`,
        nama_file,
        kategori,
        rows,
        diupload_oleh,
        waktu_upload: waktuSekarang(),
      })

      useLogStore().tambahLog({
        pengguna: diupload_oleh,
        aksi: 'UPLOAD',
        dataset: nama_file,
        keterangan: `${rows.length} baris ditambahkan`,
      })
    },

    hapusDataset(id, dihapusOleh = 'admin') {
      const target = this.datasets.find((d) => d.id === id)
      if (!target) return
      this.datasets = this.datasets.filter((d) => d.id !== id)

      useLogStore().tambahLog({
        pengguna: dihapusOleh,
        aksi: 'DELETE',
        dataset: target.nama_file,
        keterangan: 'Dataset dihapus dari sistem',
      })
    },

    agregasiPerWilayah(indikator) {
      const baris = this.seluruhBaris.filter((r) => r.indikator === indikator)
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
  },
})
