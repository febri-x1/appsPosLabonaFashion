import LogoutPanel from '../auth/LogoutPanel'

function AppLayout({ children, loading, notice, onLogout, roleLabel, user }) {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Labona Fashion</p>
          <h1>{roleLabel} Panel</h1>
        </div>
        <LogoutPanel roleLabel={roleLabel} user={user} onLogout={onLogout} />
      </aside>

      <section className="workspace">
        {loading ? <p className="empty-state">Memuat sistem Labona Fashion...</p> : null}
        {notice ? <div className="notice">{notice}</div> : null}
        {children}
      </section>
    </main>
  )
}

export default AppLayout
