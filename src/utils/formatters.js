const money = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function formatMoney(value) {
  return money.format(Number(value || 0))
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatTime(value) {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatReceiptCode(transaction) {
  const transactionDate = new Date(transaction.tanggal_waktu)
  const day = String(transactionDate.getDate()).padStart(2, '0')
  const month = String(transactionDate.getMonth() + 1).padStart(2, '0')
  const year = String(transactionDate.getFullYear()).slice(-2)
  const receiptId = String(transaction.daily_receipt_number || transaction.id).padStart(3, '0')

  return `LBF${day}${month}${year}${receiptId}`
}
