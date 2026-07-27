// Data contoh (dummy) statistik daerah Provinsi Riau.
// Skema standar: kategori, wilayah, tahun, indikator, nilai, satuan.
// Menggantikan ini dengan data BPS/OPD sungguhan tinggal mengikuti skema
// yang sama lewat halaman "Upload Data".

export const WILAYAH_RIAU = [
  'Pekanbaru', 'Dumai', 'Kampar', 'Bengkalis', 'Rokan Hulu',
  'Rokan Hilir', 'Siak', 'Kuantan Singingi', 'Indragiri Hulu',
  'Indragiri Hilir', 'Pelalawan', 'Kepulauan Meranti'
]

const penduduk2024 = [
  1117359, 324333, 878517, 573260, 613398,
  651820, 471843, 356303, 447626, 725103,
  447383, 187841
]

const tpt2024 = [
  6.8, 5.1, 3.4, 4.0, 3.6, 4.4, 3.2, 3.9, 3.1, 4.6, 3.8, 5.9
]

const tpak2024 = [
  63.1, 66.2, 71.4, 69.0, 70.5, 68.2, 72.0, 70.8, 71.9, 67.5, 69.7, 65.4
]

function buatBaris(kategori, indikator, satuan, wilayahList, nilaiList, tahun) {
  return wilayahList.map((wilayah, i) => ({
    kategori, wilayah, tahun, indikator, nilai: nilaiList[i], satuan
  }))
}

export const DATASET_AWAL = [
  {
    id: 'jumlah-penduduk',
    nama_file: 'jumlah-penduduk.csv',
    kategori: 'Kependudukan',
    diupload_oleh: 'admin',
    waktu_upload: '2026-06-02 09:14',
    rows: buatBaris('Kependudukan', 'Jumlah Penduduk', 'jiwa', WILAYAH_RIAU, penduduk2024, 2024),
  },
  {
    id: 'tpt',
    nama_file: 'tpt-tpak-agustus-2024.csv',
    kategori: 'Ketenagakerjaan',
    diupload_oleh: 'admin',
    waktu_upload: '2026-06-14 11:02',
    rows: buatBaris('Ketenagakerjaan', 'Tingkat Pengangguran Terbuka', '%', WILAYAH_RIAU, tpt2024, 2024),
  },
  {
    id: 'tpak',
    nama_file: 'tpt-tpak-agustus-2024.csv',
    kategori: 'Ketenagakerjaan',
    diupload_oleh: 'admin',
    waktu_upload: '2026-06-14 11:02',
    rows: buatBaris('Ketenagakerjaan', 'Tingkat Partisipasi Angkatan Kerja', '%', WILAYAH_RIAU, tpak2024, 2024),
  },
]

export const LOG_AWAL = [
  { id: 1, waktu: '2026-07-20 08:41', pengguna: 'admin', aksi: 'UPLOAD', dataset: 'jumlah-penduduk.csv', keterangan: '12 baris ditambahkan' },
  { id: 2, waktu: '2026-07-21 10:05', pengguna: 'admin', aksi: 'UPLOAD', dataset: 'tpt-tpak-agustus-2024.csv', keterangan: '24 baris ditambahkan' },
  { id: 3, waktu: '2026-07-22 14:22', pengguna: 'dosen_pembimbing', aksi: 'LOGIN', dataset: '-', keterangan: 'Masuk ke sistem' },
  { id: 4, waktu: '2026-07-22 14:30', pengguna: 'dosen_pembimbing', aksi: 'EXPORT', dataset: 'jumlah-penduduk.csv', keterangan: 'Diunduh sebagai CSV' },
]

// Aturan agregasi per satuan -- indikator persentase/indeks tidak masuk akal
// dijumlahkan antarwilayah, jadi memakai rata-rata (mean), bukan total (sum).
export function tentukanJenisAgregasi(indikator, satuan) {
  const overrideSum = ['Jumlah Penduduk', 'Jumlah Sekolah', 'Angkatan Kerja']
  if (overrideSum.includes(indikator)) return 'sum'
  const s = (satuan || '').trim().toLowerCase()
  if (s === '%' || s.includes('persen') || s.includes('indeks') || s.includes('tahun')) return 'mean'
  return 'sum'
}
