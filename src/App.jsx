import { useCallback, useEffect, useMemo, useState } from 'react'
import LoginPage from './components/auth/LoginPage'
import ConfirmDialog from './components/common/ConfirmDialog'
import AppLayout from './components/layout/AppLayout'
import AddDiscountPage from './features/admin/AddDiscountPage'
import AddProductPage from './features/admin/AddProductPage'
import AdminDashboard from './features/admin/AdminDashboard'
import AdminTransactionHistory from './features/admin/AdminTransactionHistory'
import ResetPasswordPage from './features/admin/ResetPasswordPage'
import CashierPage from './features/cashier/CashierPage'
import CashierTransactionHistory from './features/cashier/CashierTransactionHistory'
import ReceiptModal from './features/cashier/ReceiptModal'
import OwnerDashboard from './features/owner/OwnerDashboard'
import { emptyData, roleLabels } from './utils/appData'
import {
  clearStoredSession,
  isCurrentTabActive,
  isSessionStorageEvent,
  markTabAsActive,
  readStoredSession,
  storeSession,
} from './utils/browserSession'
import { formatMoney } from './utils/formatters'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const adminNavItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'add-product', label: 'Tambah Produk' },
  { id: 'add-discount', label: 'Tambah Diskon' },
  { id: 'transaction-history', label: 'Riwayat Transaksi' },
  { id: 'reset-password', label: 'Reset Password' },
]

const cashierNavItems = [
  { id: 'transaction', label: 'Transaksi' },
  { id: 'transaction-history', label: 'Riwayat Transaksi' },
]

function App() {
  const [session, setSession] = useState(() => {
    const stored = readStoredSession()
    if (stored) markTabAsActive(stored)
    return stored
  })
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [data, setData] = useState(emptyData)
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState([])
  const [cash, setCash] = useState('')
  const [notice, setNotice] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeAdminPage, setActiveAdminPage] = useState('dashboard')
  const [activeCashierPage, setActiveCashierPage] = useState('transaction')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [selectedResetUserId, setSelectedResetUserId] = useState('')
  const [editingDiscountId, setEditingDiscountId] = useState(null)
  const [productForm, setProductForm] = useState({
    kode_produk: '',
    nama_produk: '',
    harga_jual: '',
    stok: '',
  })
  const [discountForm, setDiscountForm] = useState({
    product_id: '',
    nama_diskon: '',
    tipe_diskon: 'persentase',
    nilai: '',
    masa_berlaku: '',
  })

  const resetWorkspace = useCallback(() => {
    setSession(null)
    setData(emptyData())
    setCart([])
    setCash('')
    setReceipt(null)
    setQuery('')
    setActiveAdminPage('dashboard')
    setActiveCashierPage('transaction')
    setSelectedResetUserId('')
    setEditingDiscountId(null)
  }, [])

  const deactivateCurrentTab = useCallback((message) => {
    resetWorkspace()
    setNotice(message)
  }, [resetWorkspace])

  const authHeaders = useMemo(() => {
    return session ? { Authorization: `Bearer ${session.token}` } : {}
  }, [session])

  async function apiFetch(path, options = {}) {
    if (session && !isCurrentTabActive(session)) {
      const message = 'Sesi dipindahkan ke tab browser lain.'
      deactivateCurrentTab(message)
      throw new Error(message)
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...authHeaders,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.message || 'Permintaan gagal diproses.')
    return payload
  }

  async function loadData() {
    if (session && !isCurrentTabActive(session)) {
      deactivateCurrentTab('Sesi dipindahkan ke tab browser lain.')
      return
    }

    setLoading(true)
    try {
      setData(await apiFetch('/state'))
    } catch (error) {
      setNotice(error.message)
      if (error.message.includes('login')) logout()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) loadData()
    // loadData intentionally uses the latest session token through authHeaders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, deactivateCurrentTab])

  useEffect(() => {
    function handleStorage(event) {
      if (!isSessionStorageEvent(event)) return

      const stored = readStoredSession()
      if (!stored) {
        deactivateCurrentTab('Sesi telah logout dari tab lain.')
        return
      }

      if (session && !isCurrentTabActive(session)) {
        deactivateCurrentTab('Sesi dipindahkan ke tab browser lain.')
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [session, deactivateCurrentTab])

  const productsById = useMemo(() => {
    return Object.fromEntries(data.products.map((product) => [product.id, product]))
  }, [data.products])

  const discountsById = useMemo(() => {
    return Object.fromEntries(data.discounts.map((discount) => [discount.id, discount]))
  }, [data.discounts])

  const activeDiscounts = useMemo(() => data.discounts.filter((discount) => {
    return new Date(`${discount.masa_berlaku}T23:59:59`) >= new Date()
  }), [data.discounts])

  const filteredProducts = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return data.products
    return data.products.filter((product) => {
      return (
        product.nama_produk.toLowerCase().includes(keyword) ||
        product.kode_produk.toLowerCase().includes(keyword)
      )
    })
  }, [data.products, query])

  const productsWithPromos = useMemo(() => {
    return filteredProducts.map((product) => {
      const discount = activeDiscounts.find((entry) => entry.product_id === product.id)
      const price = Number(product.harga_jual || 0)
      let promoPrice = price

      if (discount) {
        promoPrice =
          discount.tipe_diskon === 'persentase'
            ? Math.max(0, price - (price * Number(discount.nilai)) / 100)
            : Math.max(0, price - Number(discount.nilai))
      }

      return {
        ...product,
        discount,
        hasPromo: Boolean(discount),
        promoPrice,
      }
    })
  }, [activeDiscounts, filteredProducts])

  const cartRows = useMemo(() => {
    return cart.map((item) => {
      const product = productsById[item.product_id]
      const qty = item.jumlah
      return {
        ...item,
        product,
        total: product ? Number(product.harga_jual) * qty : 0,
      }
    })
  }, [cart, productsById])

  const totalBeforeDiscount = cartRows.reduce((sum, item) => sum + item.total, 0)
  const estimatedDiscount = cartRows.reduce((sum, item) => {
    const discount = activeDiscounts.find((entry) => entry.product_id === item.product_id)
    if (!discount) return sum
    if (discount.tipe_diskon === 'persentase') {
      return sum + (item.total * Number(discount.nilai)) / 100
    }
    return sum + Math.min(item.total, Number(discount.nilai) * item.jumlah)
  }, 0)
  const grandTotal = Math.max(0, totalBeforeDiscount - estimatedDiscount)
  const change = Math.max(0, Number(cash || 0) - grandTotal)

  const dashboard = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const todayTransactions = data.transactions.filter((transaction) =>
      transaction.tanggal_waktu.startsWith(today),
    )
    const revenue = data.transactions.reduce(
      (sum, transaction) => sum + Number(transaction.total_bayar),
      0,
    )
    const todayRevenue = todayTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.total_bayar),
      0,
    )
    const lowStock = data.products.filter((product) => product.stok <= 5).length
    const soldByProduct = data.transaction_details.reduce((map, detail) => {
      map[detail.product_id] = (map[detail.product_id] || 0) + detail.jumlah
      return map
    }, {})
    const bestSellers = Object.entries(soldByProduct)
      .map(([id, qty]) => ({ product: productsById[id], qty }))
      .filter((item) => item.product)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)

    return { revenue, todayRevenue, todayTransactions, lowStock, bestSellers }
  }, [data, productsById])

  const cashierTransactions = useMemo(() => {
    if (!session?.user) return []
    return data.transactions.filter((transaction) => transaction.user_id === session.user.id)
  }, [data.transactions, session])

  async function login(event) {
    event.preventDefault()
    setNotice('')
    try {
      const result = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      const payload = await result.json()
      if (!result.ok) throw new Error(payload.message || 'Login gagal.')
      storeSession(payload)
      setSession(payload)
    } catch (error) {
      setNotice(error.message)
    }
  }

  function logout() {
    clearStoredSession()
    resetWorkspace()
    setNotice('')
    setShowLogoutConfirm(false)
  }

  async function resetUserPassword(event) {
    event.preventDefault()
    const selectedUser = data.users.find((user) => String(user.id) === String(selectedResetUserId))
    if (!selectedUser) {
      setNotice('Pilih user yang akan direset passwordnya.')
      return
    }

    const confirmed = window.confirm(
      `Reset password ${selectedUser.nama_lengkap}? Password akan menjadi ${selectedUser.username}123.`,
    )
    if (!confirmed) return

    try {
      const result = await apiFetch('/users/reset-password', {
        method: 'POST',
        body: JSON.stringify({ user_id: Number(selectedResetUserId) }),
      })
      setNotice(
        `${result.message} Default: ${result.credential.username} / ${result.credential.password}`,
      )
      setSelectedResetUserId('')
    } catch (error) {
      setNotice(error.message)
    }
  }

  function addToCart(product) {
    if (product.stok <= 0) {
      setNotice(`${product.nama_produk} sedang habis.`)
      return
    }

    setCart((current) => {
      const existing = current.find((item) => item.product_id === product.id)
      if (existing) {
        if (existing.jumlah >= product.stok) return current
        return current.map((item) =>
          item.product_id === product.id ? { ...item, jumlah: item.jumlah + 1 } : item,
        )
      }
      return [...current, { product_id: product.id, jumlah: 1 }]
    })
  }

  function updateQty(productId, delta) {
    setCart((current) =>
      current
        .map((item) => {
          if (item.product_id !== productId) return item
          const stock = productsById[productId]?.stok || 0
          return { ...item, jumlah: Math.min(stock, Math.max(0, item.jumlah + delta)) }
        })
        .filter((item) => item.jumlah > 0),
    )
  }

  async function submitTransaction() {
    setNotice('')
    if (!cart.length) {
      setNotice('Keranjang masih kosong.')
      return
    }
    if (Number(cash || 0) < grandTotal) {
      setNotice('Uang tunai belum mencukupi total bayar.')
      return
    }

    try {
      const result = await apiFetch('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          items: cart,
          uang_tunai: Number(cash),
        }),
      })
      setReceipt({
        cashier: session.user,
        details: result.details.map((detail) => {
          const product = productsById[detail.product_id]
          const unitPrice = Number(product?.harga_jual || 0)
          const lineTotal = unitPrice * Number(detail.jumlah)

          return {
            ...detail,
            product,
            unit_price: unitPrice,
            discount_amount: Math.max(0, lineTotal - Number(detail.subtotal)),
          }
        }),
        transaction: result.transaction,
      })
      setNotice(`Transaksi #${result.transaction.id} berhasil. Kembali ${formatMoney(result.transaction.uang_kembali)}.`)
      setCart([])
      setCash('')
      await loadData()
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function addProduct(event) {
    event.preventDefault()
    try {
      await apiFetch('/products', { method: 'POST', body: JSON.stringify(productForm) })
      setNotice('Produk baru berhasil ditambahkan.')
      setProductForm({ kode_produk: '', nama_produk: '', harga_jual: '', stok: '' })
      setActiveAdminPage('dashboard')
      await loadData()
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function updateStock(product, stok) {
    try {
      await apiFetch(`/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stok: Number(stok) }),
      })
      await loadData()
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function addDiscount(event) {
    event.preventDefault()
    try {
      if (editingDiscountId) {
        await apiFetch(`/discounts/${editingDiscountId}`, {
          method: 'POST',
          body: JSON.stringify({ ...discountForm, _method: 'PATCH' }),
        })
        setNotice('Diskon berhasil diperbarui.')
      } else {
        await apiFetch('/discounts', { method: 'POST', body: JSON.stringify(discountForm) })
        setNotice('Diskon baru berhasil ditambahkan.')
      }
      setDiscountForm({
        product_id: '',
        nama_diskon: '',
        tipe_diskon: 'persentase',
        nilai: '',
        masa_berlaku: '',
      })
      setEditingDiscountId(null)
      setActiveAdminPage('dashboard')
      await loadData()
    } catch (error) {
      setNotice(error.message)
    }
  }

  function startEditDiscount(discount) {
    setEditingDiscountId(discount.id)
    setDiscountForm({
      product_id: String(discount.product_id),
      nama_diskon: discount.nama_diskon,
      tipe_diskon: discount.tipe_diskon,
      nilai: String(discount.nilai),
      masa_berlaku: discount.masa_berlaku,
    })
  }

  function cancelEditDiscount() {
    setEditingDiscountId(null)
    setDiscountForm({
      product_id: '',
      nama_diskon: '',
      tipe_diskon: 'persentase',
      nilai: '',
      masa_berlaku: '',
    })
  }

  if (!session) {
    return (
      <LoginPage
        form={loginForm}
        notice={notice}
        onChange={setLoginForm}
        onSubmit={login}
      />
    )
  }

  return (
    <AppLayout
      activeNav={
        session.user.role === 'admin'
          ? activeAdminPage
          : session.user.role === 'kasir'
            ? activeCashierPage
            : undefined
      }
      loading={loading}
      navItems={
        session.user.role === 'admin'
          ? adminNavItems
          : session.user.role === 'kasir'
            ? cashierNavItems
            : []
      }
      notice={notice}
      onLogout={() => setShowLogoutConfirm(true)}
      onNavChange={session.user.role === 'admin' ? setActiveAdminPage : setActiveCashierPage}
      roleLabel={roleLabels[session.user.role]}
      user={session.user}
    >
      {session.user.role === 'kasir' && activeCashierPage === 'transaction' ? (
        <CashierPage
          cartRows={cartRows}
          cash={cash}
          change={change}
          estimatedDiscount={estimatedDiscount}
          filteredProducts={productsWithPromos}
          grandTotal={grandTotal}
          onAddToCart={addToCart}
          onCashChange={setCash}
          onClearCart={() => setCart([])}
          onQueryChange={setQuery}
          onSubmitTransaction={submitTransaction}
          onUpdateQty={updateQty}
          query={query}
          totalBeforeDiscount={totalBeforeDiscount}
        />
      ) : null}

      {session.user.role === 'kasir' && activeCashierPage === 'transaction-history' ? (
        <CashierTransactionHistory
          discountsById={discountsById}
          productsById={productsById}
          transactionDetails={data.transaction_details}
          transactions={cashierTransactions}
        />
      ) : null}

      {session.user.role === 'owner' ? (
        <OwnerDashboard
          dashboard={dashboard}
          onRefresh={loadData}
          transactions={data.transactions}
        />
      ) : null}

      {session.user.role === 'admin' && activeAdminPage === 'dashboard' ? (
        <AdminDashboard
          discounts={data.discounts}
          products={data.products}
          productsById={productsById}
        />
      ) : null}

      {session.user.role === 'admin' && activeAdminPage === 'add-product' ? (
        <AddProductPage
          onAddProduct={addProduct}
          onProductFormChange={setProductForm}
          onUpdateStock={updateStock}
          productForm={productForm}
          products={data.products}
        />
      ) : null}

      {session.user.role === 'admin' && activeAdminPage === 'add-discount' ? (
        <AddDiscountPage
          discountForm={discountForm}
          discounts={data.discounts}
          editingDiscountId={editingDiscountId}
          onCancelEditDiscount={cancelEditDiscount}
          onAddDiscount={addDiscount}
          onDiscountFormChange={setDiscountForm}
          onEditDiscount={startEditDiscount}
          products={data.products}
          productsById={productsById}
        />
      ) : null}

      {session.user.role === 'admin' && activeAdminPage === 'transaction-history' ? (
        <AdminTransactionHistory
          productsById={productsById}
          transactionDetails={data.transaction_details}
          transactions={data.transactions}
          users={data.users}
        />
      ) : null}

      {session.user.role === 'admin' && activeAdminPage === 'reset-password' ? (
        <ResetPasswordPage
          onResetPassword={resetUserPassword}
          onSelectedUserChange={setSelectedResetUserId}
          selectedUserId={selectedResetUserId}
          users={data.users}
        />
      ) : null}

      {showLogoutConfirm ? (
        <ConfirmDialog
          cancelText="Tetap Login"
          confirmText="Logout"
          message="Anda yakin ingin keluar dari sistem Labona POS?"
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={logout}
          title="Konfirmasi Logout"
        />
      ) : null}

      {receipt ? (
        <ReceiptModal
          onClose={() => setReceipt(null)}
          receipt={receipt}
        />
      ) : null}
    </AppLayout>
  )
}

export default App
