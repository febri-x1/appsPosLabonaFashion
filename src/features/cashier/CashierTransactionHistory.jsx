import { useMemo, useState } from 'react'
import { formatDateTime, formatMoney, formatReceiptCode, formatTime } from '../../utils/formatters'

const PAGE_SIZE = 5

function formatDateInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDateOnly(value) {
  return formatDateInput(new Date(value))
}

function getLastSevenDaysRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 6)

  return {
    end: formatDateInput(end),
    start: formatDateInput(start),
  }
}

function getTransactionStatus(transaction) {
  const status = String(
    transaction.status || transaction.status_transaksi || transaction.keterangan || '',
  ).toLowerCase()

  if (transaction.is_cancelled || status.includes('batal') || status.includes('retur')) {
    return { className: 'cancelled', label: 'Retur/Batal' }
  }

  return { className: 'paid', label: 'Lunas' }
}

function getPrimaryProductLabel(details) {
  const [primaryDetail] = details
  const primaryName = primaryDetail?.product?.nama_produk || 'Produk tidak ditemukan'
  const otherCount = Math.max(0, details.length - 1)

  return otherCount ? `${primaryName} (+${otherCount} item lain)` : primaryName
}

function CashierTransactionHistory({ discountsById, transactionDetails, transactions, variantsById }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [expandedTransactionId, setExpandedTransactionId] = useState(null)
  const [dateFilter, setDateFilter] = useState('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  function resetHistoryView() {
    setPage(1)
    setExpandedTransactionId(null)
  }

  function applyDateFilter(nextFilter) {
    if (nextFilter === 'today') {
      const today = formatDateInput(new Date())
      setCustomStartDate(today)
      setCustomEndDate(today)
    } else if (nextFilter === 'last7') {
      const range = getLastSevenDaysRange()
      setCustomStartDate(range.start)
      setCustomEndDate(range.end)
    } else if (nextFilter === 'all') {
      setCustomStartDate('')
      setCustomEndDate('')
    }

    setDateFilter(nextFilter)
    resetHistoryView()
  }

  const detailsByTransaction = useMemo(() => {
    return transactionDetails.reduce((map, detail) => {
      if (!map[detail.transaction_id]) map[detail.transaction_id] = []
      map[detail.transaction_id].push(detail)
      return map
    }, {})
  }, [transactionDetails])

  const enrichedTransactions = useMemo(() => {
    return transactions.map((transaction) => {
      const details = (detailsByTransaction[transaction.id] || []).map((detail) => {
        const product = variantsById[detail.variant_id]
        const discount = discountsById[detail.discount_id]
        const unitPrice = Number(product?.harga_jual || 0)
        const normalTotal = unitPrice * Number(detail.jumlah)
        const discountAmount = Math.max(0, normalTotal - Number(detail.subtotal || 0))

        return {
          ...detail,
          discount,
          discountAmount,
          normalTotal,
          product,
          unitPrice,
        }
      })

      return { ...transaction, details }
    })
  }, [detailsByTransaction, discountsById, transactions, variantsById])

  const filteredTransactions = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    const dateFilteredTransactions = enrichedTransactions.filter((transaction) => {
      if (dateFilter === 'all') return true

      const transactionDate = getDateOnly(transaction.tanggal_waktu)
      if (customStartDate && transactionDate < customStartDate) return false
      if (customEndDate && transactionDate > customEndDate) return false

      return true
    })

    if (!keyword) return dateFilteredTransactions

    return dateFilteredTransactions.filter((transaction) => {
      const haystack = [
        `nota ${transaction.id}`,
        String(transaction.id),
        formatReceiptCode(transaction),
        formatDateTime(transaction.tanggal_waktu),
        formatMoney(transaction.total_bayar),
        formatMoney(transaction.uang_tunai),
        formatMoney(transaction.uang_kembali),
        ...transaction.details.flatMap((detail) => [
          detail.product?.sku,
          detail.product?.nama_produk,
          detail.product?.ukuran,
          detail.product?.warna,
          detail.discount?.nama_diskon,
          detail.discount?.tipe_diskon,
          detail.discount ? String(detail.discount.nilai) : '',
        ]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(keyword)
    })
  }, [customEndDate, customStartDate, dateFilter, enrichedTransactions, search])

  const orderedTransactions = filteredTransactions.slice().reverse()
  const totalPages = Math.max(1, Math.ceil(orderedTransactions.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleTransactions = orderedTransactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  return (
    <section className="data-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Riwayat kasir</p>
          <h2>Riwayat Transaksi</h2>
        </div>
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            resetHistoryView()
          }}
          placeholder="Cari nota, produk, tanggal, promo"
        />
      </div>

      <div className="history-filter-panel">
        <div className="quick-filter-buttons" aria-label="Filter cepat riwayat transaksi">
          <button
            className={dateFilter === 'all' ? 'active' : ''}
            onClick={() => applyDateFilter('all')}
            type="button"
          >
            Semua
          </button>
          <button
            className={dateFilter === 'today' ? 'active' : ''}
            onClick={() => applyDateFilter('today')}
            type="button"
          >
            Hari Ini
          </button>
          <button
            className={dateFilter === 'last7' ? 'active' : ''}
            onClick={() => applyDateFilter('last7')}
            type="button"
          >
            7 Hari Terakhir
          </button>
        </div>

        <div className="custom-date-filter">
          <label>
            Dari
            <input
              type="date"
              value={customStartDate}
              onChange={(event) => {
                setCustomStartDate(event.target.value)
                setDateFilter('custom')
                resetHistoryView()
              }}
            />
          </label>
          <label>
            Sampai
            <input
              type="date"
              value={customEndDate}
              onChange={(event) => {
                setCustomEndDate(event.target.value)
                setDateFilter('custom')
                resetHistoryView()
              }}
            />
          </label>
        </div>
      </div>

      <div className="history-list">
        {orderedTransactions.length ? (
          visibleTransactions.map((transaction) => {
            const status = getTransactionStatus(transaction)
            const isExpanded = expandedTransactionId === transaction.id

            return (
              <article className="transaction-accordion" key={transaction.id}>
                <button
                  aria-expanded={isExpanded}
                  className="transaction-summary-row"
                  onClick={() => setExpandedTransactionId(isExpanded ? null : transaction.id)}
                  type="button"
                >
                  <span className="transaction-note">{formatReceiptCode(transaction, transaction.details)}</span>
                  <span>{formatTime(transaction.tanggal_waktu)}</span>
                  <strong>{getPrimaryProductLabel(transaction.details)}</strong>
                  <small className={`transaction-status ${status.className}`}>{status.label}</small>
                  <strong className="transaction-total">{formatMoney(transaction.total_harga)}</strong>
                </button>

                {isExpanded ? (
                  <div className="transaction-detail-panel">
                    <small>{formatDateTime(transaction.tanggal_waktu)}</small>
                    <div className="history-items">
                      {transaction.details.map((detail) => (
                        <div className="history-item-detail" key={detail.id}>
                          <div>
                            <span>{detail.product?.nama_produk || 'Produk tidak ditemukan'}</span>
                            <small>{detail.product?.sku} - {detail.product?.ukuran} / {detail.product?.warna}</small>
                            <small>{formatMoney(detail.unitPrice)} x {detail.jumlah}</small>
                            {detail.discount ? (
                              <small>
                                Promo: {detail.discount.nama_diskon} (
                                {detail.discount.tipe_diskon === 'persentase'
                                  ? `${detail.discount.nilai}%`
                                  : formatMoney(detail.discount.nilai)}
                                )
                              </small>
                            ) : (
                              <small>Promo: -</small>
                            )}
                          </div>
                          <small>Diskon: - {formatMoney(detail.discountAmount)}</small>
                          <strong>{formatMoney(detail.subtotal)}</strong>
                        </div>
                      ))}
                    </div>

                    <div className="history-payment">
                      <span>Total awal: {formatMoney(transaction.total_harga)}</span>
                      <span>Tunai: {formatMoney(transaction.uang_tunai)}</span>
                      <span>Kembali: {formatMoney(transaction.uang_kembali)}</span>
                    </div>
                  </div>
                ) : null}
              </article>
            )
          })
        ) : (
          <p className="empty-state">
            {transactions.length ? 'Transaksi tidak ditemukan.' : 'Belum ada transaksi untuk kasir ini.'}
          </p>
        )}
      </div>

      {orderedTransactions.length > PAGE_SIZE && (
        <div className="pagination-controls">
          <button
            className="ghost-button"
            disabled={currentPage === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            type="button"
          >
            Sebelumnya
          </button>
          <span>Halaman {currentPage} dari {totalPages}</span>
          <button
            className="ghost-button"
            disabled={currentPage === totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            type="button"
          >
            Berikutnya
          </button>
        </div>
      )}
    </section>
  )
}

export default CashierTransactionHistory
