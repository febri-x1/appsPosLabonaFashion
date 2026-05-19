import { useEffect, useMemo, useState } from 'react'
import LoginPage from './components/auth/LoginPage'
import AppLayout from './components/layout/AppLayout'
import AdminMasterData from './features/admin/AdminMasterData'
import CashierPage from './features/cashier/CashierPage'
import OwnerDashboard from './features/owner/OwnerDashboard'
import { emptyData, roleLabels } from './utils/appData'
import { formatMoney } from './utils/formatters'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function App() {
  const [session, setSession] = useState(() => {
    const stored = localStorage.getItem('labona-session')
    return stored ? JSON.parse(stored) : null
  })
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [data, setData] = useState(emptyData)
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState([])
  const [cash, setCash] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
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

  const authHeaders = useMemo(() => {
    return session ? { Authorization: `Bearer ${session.token}` } : {}
  }, [session])

  async function apiFetch(path, options = {}) {
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
  }, [session])

  const productsById = useMemo(() => {
    return Object.fromEntries(data.products.map((product) => [product.id, product]))
  }, [data.products])

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
  const activeDiscounts = data.discounts.filter((discount) => {
    return new Date(`${discount.masa_berlaku}T23:59:59`) >= new Date()
  })
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
      localStorage.setItem('labona-session', JSON.stringify(payload))
      setSession(payload)
    } catch (error) {
      setNotice(error.message)
    }
  }

  function logout() {
    localStorage.removeItem('labona-session')
    setSession(null)
    setData(emptyData())
    setCart([])
    setCash('')
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
      await apiFetch('/discounts', { method: 'POST', body: JSON.stringify(discountForm) })
      setNotice('Diskon baru berhasil ditambahkan.')
      setDiscountForm({
        product_id: '',
        nama_diskon: '',
        tipe_diskon: 'persentase',
        nilai: '',
        masa_berlaku: '',
      })
      await loadData()
    } catch (error) {
      setNotice(error.message)
    }
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
      loading={loading}
      notice={notice}
      onLogout={logout}
      roleLabel={roleLabels[session.user.role]}
      user={session.user}
    >
      {session.user.role === 'kasir' ? (
        <CashierPage
          cartRows={cartRows}
          cash={cash}
          change={change}
          estimatedDiscount={estimatedDiscount}
          filteredProducts={filteredProducts}
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

      {session.user.role === 'owner' ? (
        <OwnerDashboard
          dashboard={dashboard}
          onRefresh={loadData}
          transactions={data.transactions}
        />
      ) : null}

      {session.user.role === 'admin' ? (
        <AdminMasterData
          discountForm={discountForm}
          discounts={data.discounts}
          onAddDiscount={addDiscount}
          onAddProduct={addProduct}
          onDiscountFormChange={setDiscountForm}
          onProductFormChange={setProductForm}
          onUpdateStock={updateStock}
          productForm={productForm}
          products={data.products}
          productsById={productsById}
        />
      ) : null}
    </AppLayout>
  )
}

export default App
