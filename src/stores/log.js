import { defineStore } from 'pinia'
import { getLogs, addLog } from '../services/dataService.js'

export const useLogStore = defineStore('log', {
  state: () => ({
    logs: [],
    loading: false,
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
    // Ambil log terbaru dari Supabase. Kolom tabel (aktor/target) dipetakan
    // ke nama field yang dipakai UI (pengguna/dataset) supaya semua view
    // yang sudah ada tidak perlu diubah.
    async fetchLogs() {
      this.loading = true
      try {
        const data = await getLogs()
        this.logs = data.map((l) => ({
          id: l.id,
          waktu: l.waktu,
          pengguna: l.aktor,
          aksi: l.aksi,
          dataset: l.target || '-',
          keterangan: l.keterangan,
        }))
      } catch (e) {
        console.error('fetchLogs:', e)
      } finally {
        this.loading = false
      }
    },

    async tambahLog({ pengguna, aksi, dataset, keterangan }) {
      await addLog({ aktor: pengguna, aksi, target: dataset, keterangan })
      await this.fetchLogs()
    },

    bersihkanLog() {
      // Catatan: ini cuma mengosongkan tampilan lokal, data di Supabase tidak
      // ikut terhapus. Kalau perlu hapus permanen, tambahkan fungsi baru
      // di dataService.js yang memanggil supabase.from('logs').delete().
      this.logs = []
    },
  },
})