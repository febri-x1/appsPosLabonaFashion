function LoginPage({ form, notice, onChange, onSubmit }) {
  return (
    <main className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <p className="eyebrow">Labona Fashion</p>
        <h1>Login POS</h1>
        {notice ? <div className="notice">{notice}</div> : null}
        <label>
          Username
          <input
            value={form.username}
            onChange={(event) => onChange({ ...form, username: event.target.value })}
            placeholder="admin / owner / kasir"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) => onChange({ ...form, password: event.target.value })}
            placeholder="Masukkan password"
          />
        </label>
        <button className="primary-button">Masuk</button>
      </form>
    </main>
  )
}

export default LoginPage
