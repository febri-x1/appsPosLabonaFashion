import { useState } from 'react'
import { formatDateTime, formatMoney } from '../../utils/formatters'

const PAGE_SIZE = 5

function AdminTransactionHistory({ transactionDetails, transactions, users, variantsById }) {
  const [page, setPage] = useState(1)
  const usersById = Object.fromEntries(users.map((user) => [user.id, user]))
  const detailsByTransaction = transactionDetails.reduce((map, detail) => {
    if (!map[detail.transaction_id]) map[detail.transaction_id] = []
    map[detail.transaction_id].push(detail)
    return map
  }, {})
  const orderedTransactions = transactions.slice().reverse()
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
          <p className="eyebrow">Hak akses admin</p>
          <h2>Riwayat Transaksi User</h2>
        </div>
      </div>

      <div className="history-list">
        {orderedTransactions.length ? (
          visibleTransactions.map((transaction) => {
            const cashier = usersById[transaction.user_id]
            const details = detailsByTransaction[transaction.id] || []

            return (
              <article className="history-card" key={transaction.id}>
                <div className="history-card-head">
                  <div>
                    <span>Nota #{transaction.id}</span>
                    <strong>{cashier?.nama_lengkap || 'User tidak ditemukan'}</strong>
                    <small>{cashier?.role || 'unknown'} - {formatDateTime(transaction.tanggal_waktu)}</small>
                  </div>
                  <strong>{formatMoney(transaction.total_bayar)}</strong>
                </div>

                <div className="history-items">
                  {details.map((detail) => (
                    <div key={detail.id}>
                      <span>{variantsById[detail.variant_id]?.nama_produk || 'Produk tidak ditemukan'}</span>
                      <small>
                        {variantsById[detail.variant_id]?.sku} - {variantsById[detail.variant_id]?.ukuran} / {variantsById[detail.variant_id]?.warna}
                      </small>
                      <small>Qty {detail.jumlah}</small>
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
          <p className="empty-state">Belum ada transaksi.</p>
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

export default AdminTransactionHistory
