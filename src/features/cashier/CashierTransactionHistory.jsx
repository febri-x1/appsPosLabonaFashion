import { useMemo, useState } from 'react'
import { formatDateTime, formatMoney } from '../../utils/formatters'

const PAGE_SIZE = 5

function CashierTransactionHistory({ discountsById, transactionDetails, transactions, variantsById }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

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
    if (!keyword) return enrichedTransactions

    return enrichedTransactions.filter((transaction) => {
      const haystack = [
        `nota ${transaction.id}`,
        String(transaction.id),
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
  }, [enrichedTransactions, search])

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
            setPage(1)
          }}
          placeholder="Cari nota, produk, tanggal, promo"
        />
      </div>

      <div className="history-list">
        {orderedTransactions.length ? (
          visibleTransactions.map((transaction) => {
            return (
              <article className="history-card" key={transaction.id}>
                <div className="history-card-head">
                  <div>
                    <span>Nota #{transaction.id}</span>
                    <strong>{formatDateTime(transaction.tanggal_waktu)}</strong>
                  </div>
                  <strong>{formatMoney(transaction.total_bayar)}</strong>
                </div>

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
