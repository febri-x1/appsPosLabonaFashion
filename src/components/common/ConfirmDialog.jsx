function ConfirmDialog({
  cancelText = 'Batal',
  confirmText = 'Ya, lanjutkan',
  message,
  onCancel,
  onConfirm,
  title,
}) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="dialog-actions">
          <button className="ghost-button" onClick={onCancel} type="button">
            {cancelText}
          </button>
          <button className="danger-button" onClick={onConfirm} type="button">
            {confirmText}
          </button>
        </div>
      </section>
    </div>
  )
}

export default ConfirmDialog
