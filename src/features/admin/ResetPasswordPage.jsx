function ResetPasswordPage({ onResetPassword, onSelectedUserChange, selectedUserId, users }) {
  const selectedUser = users.find((user) => String(user.id) === String(selectedUserId))

  return (
    <section className="data-page narrow-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Hak akses admin</p>
          <h2>Reset Password User</h2>
        </div>
      </div>

      <form className="form-panel" onSubmit={onResetPassword}>
        <h3>Pilih Akun</h3>
        <select
          value={selectedUserId}
          onChange={(event) => onSelectedUserChange(event.target.value)}
        >
          <option value="">Pilih user</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.nama_lengkap} - {user.role}
            </option>
          ))}
        </select>

        <div className="helper-box">
          {selectedUser ? (
            <>
              <span>Username: {selectedUser.username}</span>
              <span>Password default setelah reset: {selectedUser.username}123</span>
            </>
          ) : (
            <span>Pilih user yang password-nya ingin direset.</span>
          )}
        </div>

        <button className="danger-button" disabled={!selectedUserId} type="submit">
          Reset Password User
        </button>
      </form>
    </section>
  )
}

export default ResetPasswordPage
