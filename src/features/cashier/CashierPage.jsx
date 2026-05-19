import { formatMoney } from '../../utils/formatters'

function CashierPage({
  cartRows,
  cash,
  change,
  estimatedDiscount,
  filteredProducts,
  grandTotal,
  onAddToCart,
  onCashChange,
  onClearCart,
  onQueryChange,
  onSubmitTransaction,
  onUpdateQty,
  query,
  totalBeforeDiscount,
}) {
  return (
    <section className="cashier-layout">
      <div className="product-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Transaksi kasir</p>
            <h2>Pilih Produk</h2>
          </div>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Cari kode atau nama produk"
          />
        </div>
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <button className="product-card" key={product.id} onClick={() => onAddToCart(product)}>
              <span>{product.kode_produk}</span>
              <strong>{product.nama_produk}</strong>
              <b>{formatMoney(product.harga_jual)}</b>
              <small className={product.stok <= 5 ? 'danger' : ''}>Stok {product.stok}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="cart-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Nota aktif</p>
            <h2>Keranjang</h2>
          </div>
          <button className="ghost-button" onClick={onClearCart}>Kosongkan</button>
        </div>

        <div className="cart-list">
          {cartRows.length ? (
            cartRows.map((item) => (
              <div className="cart-row" key={item.product_id}>
                <div>
                  <strong>{item.product?.nama_produk}</strong>
                  <span>{formatMoney(item.product?.harga_jual)} x {item.jumlah}</span>
                </div>
                <div className="qty-control">
                  <button onClick={() => onUpdateQty(item.product_id, -1)}>-</button>
                  <b>{item.jumlah}</b>
                  <button onClick={() => onUpdateQty(item.product_id, 1)}>+</button>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-state">Belum ada barang di keranjang.</p>
          )}
        </div>

        <div className="payment-box">
          <div><span>Total awal</span><strong>{formatMoney(totalBeforeDiscount)}</strong></div>
          <div><span>Diskon otomatis</span><strong>- {formatMoney(estimatedDiscount)}</strong></div>
          <div className="grand-total"><span>Total bayar</span><strong>{formatMoney(grandTotal)}</strong></div>
          <label>
            Uang tunai
            <input
              type="number"
              min="0"
              value={cash}
              onChange={(event) => onCashChange(event.target.value)}
              placeholder="Masukkan nominal"
            />
          </label>
          <div><span>Kembalian</span><strong>{formatMoney(change)}</strong></div>
          <button className="primary-button" onClick={onSubmitTransaction}>Simpan Transaksi</button>
        </div>
      </div>
    </section>
  )
}

export default CashierPage
