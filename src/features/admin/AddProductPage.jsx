import { formatMoney } from '../../utils/formatters'

function AddProductPage({
  editingProductId,
  onCancelEditProduct,
  onEditProduct,
  onProductFormChange,
  onSubmitProduct,
  onUpdateStock,
  productForm,
  variants,
}) {
  function updateVariant(index, field, value) {
    const nextVariants = productForm.variants.map((variant, variantIndex) => {
      return variantIndex === index ? { ...variant, [field]: value } : variant
    })
    onProductFormChange({ ...productForm, variants: nextVariants })
  }

  function addVariant() {
    onProductFormChange({
      ...productForm,
      variants: [
        ...productForm.variants,
        { sku: '', ukuran: '', warna: '', harga_jual: '', stok: '' },
      ],
    })
  }

  function removeVariant(index) {
    onProductFormChange({
      ...productForm,
      variants: productForm.variants.filter((_, variantIndex) => variantIndex !== index),
    })
  }

  return (
    <section className="data-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Hak akses admin</p>
          <h2>{editingProductId ? 'Edit Produk' : 'Tambah Produk'}</h2>
        </div>
      </div>

      <div className="product-management-grid">
        <form className="form-panel" onSubmit={onSubmitProduct}>
          <div className="form-title-row">
            <h3>{editingProductId ? 'Edit Data Produk' : 'Data Produk Baru'}</h3>
            {editingProductId ? (
              <button className="ghost-button compact-button" onClick={onCancelEditProduct} type="button">
                Batal
              </button>
            ) : null}
          </div>
          <input
            value={productForm.nama_produk}
            onChange={(event) => onProductFormChange({ ...productForm, nama_produk: event.target.value })}
            placeholder="Nama produk"
          />
          <input
            value={productForm.kategori}
            onChange={(event) => onProductFormChange({ ...productForm, kategori: event.target.value })}
            placeholder="Kategori"
          />

          <div className="variant-form-head">
            <h3>Varian Produk</h3>
            <button className="ghost-button compact-button" onClick={addVariant} type="button">
              Tambah Varian
            </button>
          </div>

          {productForm.variants.map((variant, index) => (
            <div className="variant-input-row" key={index}>
              <input
                value={variant.sku}
                onChange={(event) => updateVariant(index, 'sku', event.target.value)}
                placeholder="SKU"
              />
              <input
                value={variant.ukuran}
                onChange={(event) => updateVariant(index, 'ukuran', event.target.value)}
                placeholder="Ukuran"
              />
              <input
                value={variant.warna}
                onChange={(event) => updateVariant(index, 'warna', event.target.value)}
                placeholder="Warna"
              />
              <input
                type="number"
                value={variant.harga_jual}
                onChange={(event) => updateVariant(index, 'harga_jual', event.target.value)}
                placeholder="Harga jual"
              />
              <input
                type="number"
                value={variant.stok}
                onChange={(event) => updateVariant(index, 'stok', event.target.value)}
                placeholder="Stok"
              />
              {productForm.variants.length > 1 && !variant.id ? (
                <button className="ghost-button compact-button" onClick={() => removeVariant(index)} type="button">
                  Hapus
                </button>
              ) : null}
            </div>
          ))}
          <button className="primary-button">
            {editingProductId ? 'Simpan Perubahan' : 'Simpan Produk'}
          </button>
        </form>

        <section className="report-panel">
          <h3>Produk dan Stok</h3>
          <div className="table-wrap embedded-table">
            <table>
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Kategori</th>
                  <th>SKU</th>
                  <th>Varian</th>
                  <th>Harga</th>
                  <th>Stok</th>
                  <th>Update Stok</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant) => (
                  <tr key={variant.id}>
                    <td>{variant.nama_produk}</td>
                    <td>{variant.kategori}</td>
                    <td>{variant.sku}</td>
                    <td>{variant.ukuran} / {variant.warna}</td>
                    <td>{formatMoney(variant.harga_jual)}</td>
                    <td>{variant.stok}</td>
                    <td>
                      <input
                        className="stock-input"
                        type="number"
                        defaultValue={variant.stok}
                        onBlur={(event) => onUpdateStock(variant, event.target.value)}
                      />
                    </td>
                    <td>
                      <button className="ghost-button compact-button" onClick={() => onEditProduct(variant)} type="button">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {!variants.length ? (
                  <tr>
                    <td colSpan="8">
                      <p className="empty-state">Belum ada produk.</p>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  )
}

export default AddProductPage
