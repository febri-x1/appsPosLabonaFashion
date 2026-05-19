import { formatMoney } from '../../utils/formatters'

function AdminMasterData({
  discountForm,
  discounts,
  onAddDiscount,
  onAddProduct,
  onDiscountFormChange,
  onProductFormChange,
  onUpdateStock,
  productForm,
  products,
  productsById,
}) {
  return (
    <section className="data-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Hak akses admin</p>
          <h2>Data Master Produk dan Diskon</h2>
        </div>
      </div>

      <div className="admin-grid">
        <form className="form-panel" onSubmit={onAddProduct}>
          <h3>Tambah Produk</h3>
          <input value={productForm.kode_produk} onChange={(event) => onProductFormChange({ ...productForm, kode_produk: event.target.value })} placeholder="Kode produk" />
          <input value={productForm.nama_produk} onChange={(event) => onProductFormChange({ ...productForm, nama_produk: event.target.value })} placeholder="Nama produk" />
          <input type="number" value={productForm.harga_jual} onChange={(event) => onProductFormChange({ ...productForm, harga_jual: event.target.value })} placeholder="Harga jual" />
          <input type="number" value={productForm.stok} onChange={(event) => onProductFormChange({ ...productForm, stok: event.target.value })} placeholder="Stok awal" />
          <button className="primary-button">Simpan Produk</button>
        </form>

        <form className="form-panel" onSubmit={onAddDiscount}>
          <h3>Tambah Diskon</h3>
          <select value={discountForm.product_id} onChange={(event) => onDiscountFormChange({ ...discountForm, product_id: event.target.value })}>
            <option value="">Pilih produk</option>
            {products.map((product) => (
              <option value={product.id} key={product.id}>{product.nama_produk}</option>
            ))}
          </select>
          <input value={discountForm.nama_diskon} onChange={(event) => onDiscountFormChange({ ...discountForm, nama_diskon: event.target.value })} placeholder="Nama diskon" />
          <select value={discountForm.tipe_diskon} onChange={(event) => onDiscountFormChange({ ...discountForm, tipe_diskon: event.target.value })}>
            <option value="persentase">Persentase</option>
            <option value="nominal">Nominal</option>
          </select>
          <input type="number" value={discountForm.nilai} onChange={(event) => onDiscountFormChange({ ...discountForm, nilai: event.target.value })} placeholder="Nilai diskon" />
          <input type="date" value={discountForm.masa_berlaku} onChange={(event) => onDiscountFormChange({ ...discountForm, masa_berlaku: event.target.value })} />
          <button className="primary-button">Simpan Diskon</button>
        </form>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Produk</th>
              <th>Harga</th>
              <th>Stok</th>
              <th>Update Stok</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.kode_produk}</td>
                <td>{product.nama_produk}</td>
                <td>{formatMoney(product.harga_jual)}</td>
                <td>{product.stok}</td>
                <td>
                  <input
                    className="stock-input"
                    type="number"
                    defaultValue={product.stok}
                    onBlur={(event) => onUpdateStock(product, event.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="discount-strip">
        {discounts.map((discount) => (
          <article key={discount.id}>
            <span>{discount.nama_diskon}</span>
            <strong>
              {discount.tipe_diskon === 'persentase' ? `${discount.nilai}%` : formatMoney(discount.nilai)}
            </strong>
            <small>{productsById[discount.product_id]?.nama_produk}</small>
            <small>Berlaku sampai {discount.masa_berlaku}</small>
          </article>
        ))}
      </div>
    </section>
  )
}

export default AdminMasterData
