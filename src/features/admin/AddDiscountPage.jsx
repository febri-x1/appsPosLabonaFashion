import { formatMoney } from '../../utils/formatters'

function AddDiscountPage({
  discountForm,
  discounts,
  editingDiscountId,
  onAddDiscount,
  onCancelEditDiscount,
  onDiscountFormChange,
  onEditDiscount,
  products,
  productsById,
}) {
  const sortedDiscounts = discounts.slice().sort((a, b) => {
    return new Date(b.masa_berlaku) - new Date(a.masa_berlaku)
  })

  return (
    <section className="data-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Hak akses admin</p>
          <h2>Tambah Diskon</h2>
        </div>
      </div>

      <div className="discount-management-grid">
        <form className="form-panel" onSubmit={onAddDiscount}>
          <div className="form-title-row">
            <h3>{editingDiscountId ? 'Edit Diskon' : 'Data Diskon Baru'}</h3>
            {editingDiscountId ? (
              <button className="ghost-button compact-button" onClick={onCancelEditDiscount} type="button">
                Batal
              </button>
            ) : null}
          </div>
          <select
            value={discountForm.product_id}
            onChange={(event) => onDiscountFormChange({ ...discountForm, product_id: event.target.value })}
          >
            <option value="">Pilih produk</option>
            {products.map((product) => (
              <option value={product.id} key={product.id}>{product.nama_produk}</option>
            ))}
          </select>
          <input
            value={discountForm.nama_diskon}
            onChange={(event) => onDiscountFormChange({ ...discountForm, nama_diskon: event.target.value })}
            placeholder="Nama diskon"
          />
          <select
            value={discountForm.tipe_diskon}
            onChange={(event) => onDiscountFormChange({ ...discountForm, tipe_diskon: event.target.value })}
          >
            <option value="persentase">Persentase</option>
            <option value="nominal">Nominal</option>
          </select>
          <input
            type="number"
            value={discountForm.nilai}
            onChange={(event) => onDiscountFormChange({ ...discountForm, nilai: event.target.value })}
            placeholder="Nilai diskon"
          />
          <input
            type="date"
            value={discountForm.masa_berlaku}
            onChange={(event) => onDiscountFormChange({ ...discountForm, masa_berlaku: event.target.value })}
          />
          <button className="primary-button">
            {editingDiscountId ? 'Simpan Perubahan' : 'Simpan Diskon'}
          </button>
        </form>

        <section className="report-panel">
          <h3>Produk yang Sedang Diskon</h3>
          <div className="discount-list">
            {sortedDiscounts.length ? (
              sortedDiscounts.map((discount) => (
                <article className={editingDiscountId === discount.id ? 'selected-discount' : ''} key={discount.id}>
                  <div>
                    <span>{productsById[discount.product_id]?.nama_produk || 'Produk tidak ditemukan'}</span>
                    <strong>{discount.nama_diskon}</strong>
                    <small>
                      {discount.tipe_diskon === 'persentase'
                        ? `${discount.nilai}%`
                        : formatMoney(discount.nilai)}
                    </small>
                    <small>Berlaku sampai {discount.masa_berlaku}</small>
                  </div>
                  <button className="ghost-button compact-button" onClick={() => onEditDiscount(discount)} type="button">
                    Edit
                  </button>
                </article>
              ))
            ) : (
              <p className="empty-state">Belum ada produk yang sedang diskon.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  )
}

export default AddDiscountPage
