export function formatAngka(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '-'
  return new Intl.NumberFormat('id-ID').format(n)
}

export function formatDesimal(n, digit = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return '-'
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: digit,
    maximumFractionDigits: digit,
  }).format(n)
}

export function waktuSekarang() {
  const d = new Date()
  const pad = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
