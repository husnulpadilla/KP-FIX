import { defineStore } from 'pinia'
import { useLogStore } from './log.js'

// Autentikasi demo di sisi klien. Untuk produksi, ganti login() agar
// memanggil endpoint backend sungguhan (mis. POST /api/auth/login) dan
// simpan token, bukan mencocokkan kredensial di JavaScript.
const AKUN_DEMO = { admin: 'admin123' }

export const useAuthStore = defineStore('auth', {
  state: () => ({
    username: null,
  }),

  getters: {
    sudahLogin: (state) => state.username !== null,
  },

  actions: {
    login(username, password) {
      const cocok = AKUN_DEMO[username] && AKUN_DEMO[username] === password
      if (cocok) {
        this.username = username
        useLogStore().tambahLog({
          pengguna: username, aksi: 'LOGIN', dataset: '-', keterangan: 'Masuk ke sistem',
        })
        return true
      }
      return false
    },

    logout() {
      if (this.username) {
        useLogStore().tambahLog({
          pengguna: this.username, aksi: 'LOGOUT', dataset: '-', keterangan: 'Keluar dari sistem',
        })
      }
      this.username = null
    },
  },
})
