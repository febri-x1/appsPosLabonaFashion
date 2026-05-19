function LogoutPanel({ roleLabel, user, onLogout }) {
  return (
    <div className="session-box">
      <span>Login sebagai</span>
      <strong>{user.nama_lengkap}</strong>
      <small>{roleLabel}</small>
      <button className="ghost-button" onClick={onLogout}>
        Keluar
      </button>
    </div>
  )
}

export default LogoutPanel
