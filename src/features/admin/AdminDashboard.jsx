import { formatMoney } from '../../utils/formatters'

function AdminDashboard({ discounts, products, productsById, variants }) {
  const totalStock = variants.reduce((sum, variant) => sum + Number(variant.stok || 0), 0)
  const inventoryValue = variants.reduce(
    (sum, variant) => sum + Number(variant.harga_jual || 0) * Number(variant.stok || 0),
    0,
  )
  const lowStock = variants.filter((variant) => Number(variant.stok) <= 5).length
  const activeDiscounts = discounts.filter((discount) => {
    return new Date(`${discount.masa_berlaku}T23:59:59`) >= new Date()
  }).length

  return (
    <section className="data-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Hak akses admin</p>
          <h2>Dashboard Admin</h2>
        </div>
      </div>

      <div className="metric-grid">
        <article><span>Total produk</span><strong>{products.length}</strong></article>
        <article><span>Total varian</span><strong>{variants.length}</strong></article>
        <article><span>Total stok</span><strong>{totalStock}</strong></article>
        <article><span>Nilai inventori</span><strong>{formatMoney(inventoryValue)}</strong></article>
        <article><span>Stok menipis</span><strong>{lowStock}</strong></article>
      </div>

      <div className="report-grid dashboard-report-grid">
        <section className="report-panel">
          <h3>Diskon Aktif</h3>
          <div className="discount-list">
            {discounts.length ? (
              discounts.map((discount) => (
                <article key={discount.id}>
                  <span>{discount.nama_diskon}</span>
                  <strong>
                    {discount.tipe_diskon === 'persentase'
                      ? `${discount.nilai}%`
                      : formatMoney(discount.nilai)}
                  </strong>
                  <small>{productsById[discount.product_id]?.nama_produk}</small>
                  <small>Berlaku sampai {discount.masa_berlaku}</small>
                </article>
              ))
            ) : (
              <p className="empty-state">Belum ada diskon.</p>
            )}
          </div>
          <div className="summary-line">
            <span>Diskon yang masih berlaku</span>
            <strong>{activeDiscounts}</strong>
          </div>
        </section>
      </div>
    </section>
  )
}

export default AdminDashboard
