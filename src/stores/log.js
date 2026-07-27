import { defineStore } from 'pinia'
import { LOG_AWAL } from '../data/sample.js'
import { waktuSekarang } from '../utils/format.js'

let counter = LOG_AWAL.length

export const useLogStore = defineStore('log', {
  state: () => ({
    logs: JSON.parse(JSON.stringify(LOG_AWAL)),
  }),

  getters: {
    terbaru(state) {
      return [...state.logs].sort((a, b) => (a.waktu < b.waktu ? 1 : -1))
    },

    statistik(state) {
      return {
        total: state.logs.length,
        upload: state.logs.filter((l) => l.aksi === 'UPLOAD').length,
        hapus: state.logs.filter((l) => l.aksi === 'DELETE').length,
        penggunaAktif: new Set(state.logs.map((l) => l.pengguna)).size,
      }
    },
  },

  actions: {
    tambahLog({ pengguna, aksi, dataset, keterangan }) {
      counter += 1
      this.logs.unshift({
        id: counter,
        waktu: waktuSekarang(),
        pengguna,
        aksi,
        dataset,
        keterangan,
      })
    },

    bersihkanLog() {
      this.logs = []
    },
  },
})
