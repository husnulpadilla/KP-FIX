# Statistik Riau — Dashboard

**Analisis dan Visualisasi Data Statistik Daerah dengan Pendekatan Deskriptif untuk Mendukung Pengambilan Keputusan pada Dinas Komunikasi, Informatika dan Statistik Provinsi Riau.**

Proyek Kerja Praktek, dibangun dengan Vue 3 + Vite.

## Halaman

- **Dashboard** — ringkasan KPI, grafik jumlah penduduk per kab/kota, distribusi kategori data.
- **Upload Data** — unggah dataset CSV (skema: `kategori, wilayah, tahun, indikator, nilai, satuan`), pratinjau otomatis, kelola/hapus dataset. Memerlukan login admin.
- **Analisis** — filter kategori & indikator, grafik per wilayah, statistik deskriptif (total/rata-rata, median, min, maks, std. deviasi).
- **Log Aktivitas** — audit trail login, upload, dan hapus dataset, dengan filter dan ekspor CSV.

## Menjalankan proyek

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`.

Build produksi:

```bash
npm run build
npm run preview
```

## Login demo

Halaman Upload Data memerlukan login (tombol "Login Admin" di kanan atas):

```
Username: admin
Password: admin123
```

## Struktur folder

```
src/
  components/layout/   Sidebar, Topbar, StatCard, DataTable, EmptyState
  data/sample.js        Data contoh statistik Riau + aturan agregasi
  router/index.js        Routing 4 halaman utama
  stores/                Pinia: dataset, log aktivitas, auth (state di memori)
  utils/format.js         Format angka & tanggal ala Indonesia
  views/                  4 halaman: Dashboard, Upload, Analisis, Log Aktivitas
```

## Menghubungkan ke backend sungguhan

Saat ini seluruh data disimpan di memori browser (Pinia store) sebagai demo —
akan reset setiap refresh halaman. Untuk produksi:

1. Ganti isi `src/stores/dataset.js` dan `src/stores/log.js` agar memanggil
   REST API (mis. lewat `axios` atau `fetch`) alih-alih memakai data contoh.
2. Ganti `src/stores/auth.js` agar memanggil endpoint login sungguhan dan
   menyimpan token (mis. JWT) alih-alih mencocokkan kredensial di JavaScript.
3. Skema CSV di `UploadView.vue` (`SKEMA_STANDAR`) bisa disesuaikan dengan
   skema tabel di database backend.
