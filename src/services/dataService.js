import { supabase } from '../lib/supabase'

// ---- LOG AKTIVITAS ----
export async function addLog({ aktor, aksi, target = null, keterangan = '' }) {
  const { error } = await supabase.from('logs').insert({ aktor, aksi, target, keterangan })
  if (error) console.error('Gagal mencatat log:', error.message)
}

export async function getLogs() {
  const { data, error } = await supabase
    .from('logs')
    .select('*')
    .order('waktu', { ascending: false })
  if (error) throw error
  return data
}

// ---- DATASET ----
export async function getDatasets() {
  const { data, error } = await supabase
    .from('datasets')
    .select('*')
    .order('waktu_upload', { ascending: false })
  if (error) throw error
  return data
}

export async function getDatasetRows(datasetId) {
  const { data, error } = await supabase
    .from('dataset_rows')
    .select('*')
    .eq('dataset_id', datasetId)
  if (error) throw error
  return data
}

// parsedRows = hasil PapaParse, array of
// { kategori, wilayah, tahun, indikator, nilai, nilai_teks, satuan }
// -- nilai (angka) dan nilai_teks (teks) saling eksklusif: salah satu berisi
// data, yang lain null, tergantung apakah nilai mentahnya numerik atau teks.
export async function uploadDataset({ namaFile, kategori, parsedRows, diuploadOleh }) {
  const { data: dataset, error: errDataset } = await supabase
    .from('datasets')
    .insert({
      nama_file: namaFile,
      kategori,
      jumlah_baris: parsedRows.length,
      diupload_oleh: diuploadOleh,
    })
    .select()
    .single()

  if (errDataset) throw errDataset

  const rowsToInsert = parsedRows.map((row) => ({
    dataset_id: dataset.id,
    kategori: row.kategori,
    wilayah: row.wilayah,
    tahun: row.tahun ? Number(row.tahun) : null,
    indikator: row.indikator,
    // Catatan: sebelumnya `row.nilai ? Number(row.nilai) : null` -- ini salah
    // untuk nilai 0 (falsy), karena 0 akan ikut jadi null. Diperbaiki jadi
    // pengecekan null/undefined/string kosong secara eksplisit.
    nilai: row.nilai !== null && row.nilai !== undefined && row.nilai !== ''
      ? Number(row.nilai)
      : null,
    nilai_teks: row.nilai_teks ?? null,
    satuan: row.satuan,
  }))

  const { error: errRows } = await supabase.from('dataset_rows').insert(rowsToInsert)
  if (errRows) throw errRows

  await addLog({
    aktor: diuploadOleh,
    aksi: 'UPLOAD',
    target: namaFile,
    keterangan: `${parsedRows.length} baris ditambahkan`,
  })

  return dataset
}

export async function deleteDataset(datasetId, namaFile, aktor) {
  const { error } = await supabase.from('datasets').delete().eq('id', datasetId)
  if (error) throw error

  await addLog({
    aktor,
    aksi: 'DELETE',
    target: namaFile,
    keterangan: 'Dataset dihapus',
  })
}

// ---- ANALISIS DESKRIPTIF ----
export async function getStatistikByIndikator(indikator) {
  let query = supabase.from('dataset_rows').select('wilayah, nilai, tahun')
  if (indikator && indikator !== 'semua') {
    query = query.eq('indikator', indikator)
  }
  const { data, error } = await query
  if (error) throw error

  const nilaiArr = data.map((d) => d.nilai).filter((n) => n !== null)
  const total = nilaiArr.reduce((a, b) => a + b, 0)
  const rataRata = nilaiArr.length ? total / nilaiArr.length : 0
  const sorted = [...nilaiArr].sort((a, b) => a - b)
  const median = sorted.length
    ? sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]
    : 0

  return {
    perWilayah: data,
    total,
    rataRata,
    median,
    minimum: sorted[0] ?? 0,
    maksimum: sorted[sorted.length - 1] ?? 0,
  }
}