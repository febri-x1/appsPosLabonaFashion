import LogoutPanel from '../auth/LogoutPanel'

function AppLayout({
  activeNav,
  children,
  loading,
  navItems = [],
  notice,
  onLogout,
  onNavChange,
  roleLabel,
  user,
}) {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-main">
          <div>
            <p className="eyebrow">Labona Fashion</p>
            <h1>{roleLabel} Panel</h1>
          </div>

          {navItems.length ? (
            <nav className="nav-tabs" aria-label="Menu utama">
              {navItems.map((item) => (
                <button
                  className={activeNav === item.id ? 'active' : ''}
                  key={item.id}
                  onClick={() => onNavChange(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          ) : null}
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
