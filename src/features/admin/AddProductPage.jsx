import { formatMoney } from '../../utils/formatters'

function AddProductPage({
  onAddProduct,
  onProductFormChange,
  onUpdateStock,
  productForm,
  products,
}) {
  return (
    <section className="data-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Hak akses admin</p>
          <h2>Tambah Produk</h2>
        </div>
      </div>

      <div className="product-management-grid">
        <form className="form-panel" onSubmit={onAddProduct}>
          <h3>Data Produk Baru</h3>
          <input
            value={productForm.kode_produk}
            onChange={(event) => onProductFormChange({ ...productForm, kode_produk: event.target.value })}
            placeholder="Kode produk"
          />
          <input
            value={productForm.nama_produk}
            onChange={(event) => onProductFormChange({ ...productForm, nama_produk: event.target.value })}
            placeholder="Nama produk"
          />
          <input
            type="number"
            value={productForm.harga_jual}
            onChange={(event) => onProductFormChange({ ...productForm, harga_jual: event.target.value })}
            placeholder="Harga jual"
          />
          <input
            type="number"
            value={productForm.stok}
            onChange={(event) => onProductFormChange({ ...productForm, stok: event.target.value })}
            placeholder="Stok awal"
          />
          <button className="primary-button">Simpan Produk</button>
        </form>

        <section className="report-panel">
          <h3>Produk dan Stok</h3>
          <div className="table-wrap embedded-table">
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
        </section>
      </div>
    </section>
  )
}

export default AddProductPage
