import { formatDateTime, formatMoney } from '../../utils/formatters'

function ReceiptModal({ onClose, receipt }) {
  const { cashier, details, transaction } = receipt
  const totalDiscount = Number(transaction.total_harga) - Number(transaction.total_bayar)

  return (
    <div className="dialog-backdrop receipt-backdrop" role="presentation">
      <section className="receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
        <div className="receipt-header">
          <p className="eyebrow">Labona Fashion</p>
          <h2 id="receipt-title">Nota Transaksi</h2>
          <span>Nota #{transaction.id}</span>
          <small>{formatDateTime(transaction.tanggal_waktu)}</small>
          <small>Kasir: {cashier.nama_lengkap}</small>
        </div>

        <div className="receipt-items">
          {details.map((detail) => (
            <div className="receipt-item" key={`${detail.variant_id}-${detail.jumlah}`}>
              <div>
                <strong>{detail.product?.nama_produk || 'Produk tidak ditemukan'}</strong>
                <small>{detail.product?.sku} - {detail.product?.ukuran} / {detail.product?.warna}</small>
                <small>{formatMoney(detail.unit_price)} x {detail.jumlah}</small>
                {detail.discount_amount > 0 ? (
                  <small>Diskon item: - {formatMoney(detail.discount_amount)}</small>
                ) : null}
              </div>
              <strong>{formatMoney(detail.subtotal)}</strong>
            </div>
          ))}
        </div>

        <div className="receipt-totals">
          <div><span>Total awal</span><strong>{formatMoney(transaction.total_harga)}</strong></div>
          <div><span>Diskon</span><strong>- {formatMoney(totalDiscount)}</strong></div>
          <div><span>Total bayar</span><strong>{formatMoney(transaction.total_bayar)}</strong></div>
          <div><span>Uang tunai</span><strong>{formatMoney(transaction.uang_tunai)}</strong></div>
          <div><span>Kembalian</span><strong>{formatMoney(transaction.uang_kembali)}</strong></div>
        </div>

        <div className="receipt-actions">
          <button className="ghost-button" onClick={() => window.print()} type="button">
            Cetak
          </button>
          <button className="primary-button" onClick={onClose} type="button">
            Tutup
          </button>
        </div>
      </section>
    </div>
  )
}

export default ReceiptModal
