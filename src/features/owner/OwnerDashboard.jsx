import { formatDateTime, formatMoney } from '../../utils/formatters'

function OwnerDashboard({ dashboard, onRefresh, transactions }) {
  return (
    <section className="owner-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Hak akses owner</p>
          <h2>Dashboard Penjualan</h2>
        </div>
        <button className="ghost-button" onClick={onRefresh}>Refresh</button>
      </div>
      <div className="metric-grid">
        <article><span>Omzet total</span><strong>{formatMoney(dashboard.revenue)}</strong></article>
        <article><span>Omzet hari ini</span><strong>{formatMoney(dashboard.todayRevenue)}</strong></article>
        <article><span>Transaksi hari ini</span><strong>{dashboard.todayTransactions.length}</strong></article>
        <article><span>Stok menipis</span><strong>{dashboard.lowStock}</strong></article>
      </div>
      <div className="report-grid">
        <section className="report-panel">
          <h3>Grafik Produk Terjual</h3>
          <div className="bar-list">
            {dashboard.bestSellers.map((item) => (
              <div className="bar-row" key={item.product.id}>
                <span>{item.product.nama_produk}</span>
                <div><i style={{ width: `${Math.max(12, item.qty * 18)}px` }} /></div>
                <b>{item.qty}</b>
              </div>
            ))}
          </div>
        </section>
        <section className="report-panel">
          <h3>Transaksi Terbaru</h3>
          <div className="transaction-list">
            {transactions.slice(-8).reverse().map((transaction) => (
              <div key={transaction.id}>
                <span>Nota #{transaction.id}</span>
                <strong>{formatMoney(transaction.total_bayar)}</strong>
                <small>{formatDateTime(transaction.tanggal_waktu)}</small>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}

export default OwnerDashboard
