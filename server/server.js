import { createHash, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import {
  normalizeDateOnly,
  normalizeDateTime,
  normalizeMoneyRows,
  pool,
} from './database.js'

const PORT = Number(process.env.PORT || 3001)
const sessions = new Map()

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex')
}

function publicUser(user) {
  const safeUser = { ...user }
  delete safeUser.password
  return safeUser
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })
  response.end(JSON.stringify(payload))
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.on('data', (chunk) => {
      body += chunk
    })
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (error) {
        reject(error)
      }
    })
    request.on('error', reject)
  })
}

function requireAuth(request, roles = []) {
  const token = request.headers.authorization?.replace('Bearer ', '')
  const user = token ? sessions.get(token) : null
  if (!user) return { error: { status: 401, message: 'Silakan login terlebih dahulu.' } }
  if (roles.length && !roles.includes(user.role)) {
    return { error: { status: 403, message: 'Hak akses tidak mencukupi.' } }
  }
  return { user }
}

function placeholders(values) {
  return values.map(() => '?').join(', ')
}

function normalizeStateRows(state) {
  return {
    users: state.users.map(publicUser),
    products: normalizeMoneyRows(state.products, ['harga_jual']),
    discounts: normalizeMoneyRows(state.discounts, ['nilai']).map((discount) => ({
      ...discount,
      masa_berlaku: normalizeDateOnly(discount.masa_berlaku),
    })),
    transactions: normalizeMoneyRows(state.transactions, [
      'total_harga',
      'total_bayar',
      'uang_tunai',
      'uang_kembali',
    ]).map((transaction) => ({
      ...transaction,
      tanggal_waktu: normalizeDateTime(transaction.tanggal_waktu),
    })),
    transaction_details: normalizeMoneyRows(state.transaction_details, ['subtotal']),
  }
}

async function getState() {
  const [users] = await pool.query(
    'SELECT id, username, nama_lengkap, role FROM users ORDER BY id',
  )
  const [products] = await pool.query('SELECT * FROM products ORDER BY nama_produk')
  const [discounts] = await pool.query('SELECT * FROM discounts ORDER BY masa_berlaku DESC, id DESC')
  const [transactions] = await pool.query(
    'SELECT * FROM transactions ORDER BY tanggal_waktu ASC, id ASC',
  )
  const [transactionDetails] = await pool.query(
    'SELECT * FROM transaction_details ORDER BY id ASC',
  )

  return normalizeStateRows({
    users,
    products,
    discounts,
    transactions,
    transaction_details: transactionDetails,
  })
}

async function login(payload) {
  const username = String(payload.username || '').trim()
  const [users] = await pool.execute('SELECT * FROM users WHERE username = ? LIMIT 1', [username])
  const user = users[0]

  if (!user || user.password !== hashPassword(String(payload.password || ''))) {
    return { status: 401, body: { message: 'Username atau password salah.' } }
  }

  const token = randomUUID()
  sessions.set(token, publicUser(user))
  return { status: 200, body: { token, user: publicUser(user) } }
}

function aggregateItems(items) {
  const map = new Map()
  for (const item of items) {
    const productId = Number(item.product_id)
    const quantity = Number(item.jumlah)
    map.set(productId, (map.get(productId) || 0) + quantity)
  }
  return [...map.entries()].map(([product_id, jumlah]) => ({ product_id, jumlah }))
}

function applyDiscount(baseTotal, quantity, discount) {
  if (!discount) return { subtotal: baseTotal }
  const discountValue =
    discount.tipe_diskon === 'persentase'
      ? (baseTotal * Number(discount.nilai)) / 100
      : Math.min(baseTotal, Number(discount.nilai) * quantity)

  return { subtotal: Math.max(0, baseTotal - discountValue) }
}

function validateTransaction(payload, cashier) {
  if (!cashier || cashier.role !== 'kasir') {
    return 'Transaksi hanya dapat diproses oleh kasir.'
  }
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return 'Item transaksi wajib diisi.'
  }
  if (Number(payload.uang_tunai) <= 0) {
    return 'Uang tunai wajib lebih dari nol.'
  }
  return ''
}

async function createTransaction(payload, cashier) {
  const validationMessage = validateTransaction(payload, cashier)
  if (validationMessage) {
    return { status: 422, body: { message: validationMessage } }
  }

  const items = aggregateItems(payload.items)
  if (items.some((item) => !Number.isInteger(item.jumlah) || item.jumlah <= 0)) {
    return { status: 422, body: { message: 'Jumlah item transaksi tidak valid.' } }
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const productIds = items.map((item) => item.product_id)
    const [products] = await connection.query(
      `SELECT * FROM products WHERE id IN (${placeholders(productIds)}) FOR UPDATE`,
      productIds,
    )
    const [discounts] = await connection.query(
      `SELECT * FROM discounts WHERE product_id IN (${placeholders(productIds)}) AND masa_berlaku >= CURDATE() ORDER BY id DESC`,
      productIds,
    )
    const productsById = Object.fromEntries(products.map((product) => [product.id, product]))
    const discountsByProductId = Object.fromEntries(
      discounts.map((discount) => [discount.product_id, discount]),
    )

    let totalHarga = 0
    let totalBayar = 0
    const details = []

    for (const item of items) {
      const product = productsById[item.product_id]
      if (!product) {
        await connection.rollback()
        return { status: 404, body: { message: `Produk ${item.product_id} tidak ditemukan.` } }
      }
      if (product.stok < item.jumlah) {
        await connection.rollback()
        return {
          status: 422,
          body: { message: `Stok ${product.nama_produk} hanya tersisa ${product.stok}.` },
        }
      }

      const baseTotal = Number(product.harga_jual) * item.jumlah
      const discount = discountsByProductId[product.id]
      const { subtotal } = applyDiscount(baseTotal, item.jumlah, discount)
      totalHarga += baseTotal
      totalBayar += subtotal
      details.push({
        product_id: product.id,
        discount_id: discount ? discount.id : null,
        jumlah: item.jumlah,
        subtotal,
      })
    }

    const cash = Number(payload.uang_tunai)
    if (cash < totalBayar) {
      await connection.rollback()
      return { status: 422, body: { message: 'Uang tunai belum mencukupi total bayar.' } }
    }

    const [transactionResult] = await connection.execute(
      `INSERT INTO transactions
        (user_id, tanggal_waktu, total_harga, total_bayar, uang_tunai, uang_kembali)
       VALUES (?, NOW(), ?, ?, ?, ?)`,
      [cashier.id, totalHarga, totalBayar, cash, cash - totalBayar],
    )
    const transactionId = transactionResult.insertId

    for (const detail of details) {
      await connection.execute(
        `INSERT INTO transaction_details
          (transaction_id, product_id, discount_id, jumlah, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [transactionId, detail.product_id, detail.discount_id, detail.jumlah, detail.subtotal],
      )
      await connection.execute('UPDATE products SET stok = stok - ? WHERE id = ?', [
        detail.jumlah,
        detail.product_id,
      ])
    }

    await connection.commit()

    return {
      status: 201,
      body: {
        transaction: {
          id: transactionId,
          user_id: cashier.id,
          tanggal_waktu: new Date().toISOString(),
          total_harga: totalHarga,
          total_bayar: totalBayar,
          uang_tunai: cash,
          uang_kembali: cash - totalBayar,
        },
        details,
      },
    }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function createProduct(payload) {
  const product = {
    kode_produk: String(payload.kode_produk || '').trim(),
    nama_produk: String(payload.nama_produk || '').trim(),
    harga_jual: Number(payload.harga_jual),
    stok: Number(payload.stok),
  }

  if (!product.kode_produk || !product.nama_produk || product.harga_jual < 0 || product.stok < 0) {
    return { status: 422, body: { message: 'Data produk belum valid.' } }
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO products (kode_produk, nama_produk, harga_jual, stok)
       VALUES (?, ?, ?, ?)`,
      [product.kode_produk, product.nama_produk, product.harga_jual, product.stok],
    )
    return { status: 201, body: { product: { id: result.insertId, ...product } } }
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return { status: 409, body: { message: 'Kode produk sudah digunakan.' } }
    }
    throw error
  }
}

async function updateProduct(productId, payload) {
  const [products] = await pool.execute('SELECT * FROM products WHERE id = ? LIMIT 1', [productId])
  const product = products[0]
  if (!product) return { status: 404, body: { message: 'Produk tidak ditemukan.' } }

  const nextProduct = {
    nama_produk:
      payload.nama_produk !== undefined ? String(payload.nama_produk).trim() : product.nama_produk,
    harga_jual:
      payload.harga_jual !== undefined ? Number(payload.harga_jual) : Number(product.harga_jual),
    stok: payload.stok !== undefined ? Number(payload.stok) : Number(product.stok),
  }

  if (!nextProduct.nama_produk || nextProduct.harga_jual < 0 || nextProduct.stok < 0) {
    return { status: 422, body: { message: 'Data produk belum valid.' } }
  }

  await pool.execute(
    'UPDATE products SET nama_produk = ?, harga_jual = ?, stok = ? WHERE id = ?',
    [nextProduct.nama_produk, nextProduct.harga_jual, nextProduct.stok, productId],
  )

  return {
    status: 200,
    body: {
      product: {
        ...product,
        ...nextProduct,
        harga_jual: Number(nextProduct.harga_jual),
        stok: Number(nextProduct.stok),
      },
    },
  }
}

async function createDiscount(payload) {
  const discount = {
    product_id: Number(payload.product_id),
    nama_diskon: String(payload.nama_diskon || '').trim(),
    tipe_diskon: payload.tipe_diskon === 'nominal' ? 'nominal' : 'persentase',
    nilai: Number(payload.nilai),
    masa_berlaku: String(payload.masa_berlaku || '').slice(0, 10),
  }

  const [products] = await pool.execute('SELECT id FROM products WHERE id = ? LIMIT 1', [
    discount.product_id,
  ])
  if (!products.length || !discount.nama_diskon || discount.nilai < 0 || !discount.masa_berlaku) {
    return { status: 422, body: { message: 'Data diskon belum valid.' } }
  }

  const [result] = await pool.execute(
    `INSERT INTO discounts (product_id, nama_diskon, tipe_diskon, nilai, masa_berlaku)
     VALUES (?, ?, ?, ?, ?)`,
    [
      discount.product_id,
      discount.nama_diskon,
      discount.tipe_diskon,
      discount.nilai,
      discount.masa_berlaku,
    ],
  )
  return { status: 201, body: { discount: { id: result.insertId, ...discount } } }
}

async function updateDiscount(discountId, payload) {
  const [discounts] = await pool.execute('SELECT * FROM discounts WHERE id = ? LIMIT 1', [
    discountId,
  ])
  const currentDiscount = discounts[0]
  if (!currentDiscount) {
    return { status: 404, body: { message: 'Diskon tidak ditemukan.' } }
  }

  const discount = {
    product_id:
      payload.product_id !== undefined ? Number(payload.product_id) : Number(currentDiscount.product_id),
    nama_diskon:
      payload.nama_diskon !== undefined
        ? String(payload.nama_diskon).trim()
        : currentDiscount.nama_diskon,
    tipe_diskon:
      payload.tipe_diskon !== undefined
        ? payload.tipe_diskon === 'nominal'
          ? 'nominal'
          : 'persentase'
        : currentDiscount.tipe_diskon,
    nilai: payload.nilai !== undefined ? Number(payload.nilai) : Number(currentDiscount.nilai),
    masa_berlaku:
      payload.masa_berlaku !== undefined
        ? String(payload.masa_berlaku).slice(0, 10)
        : normalizeDateOnly(currentDiscount.masa_berlaku),
  }

  const [products] = await pool.execute('SELECT id FROM products WHERE id = ? LIMIT 1', [
    discount.product_id,
  ])
  if (!products.length || !discount.nama_diskon || discount.nilai < 0 || !discount.masa_berlaku) {
    return { status: 422, body: { message: 'Data diskon belum valid.' } }
  }

  await pool.execute(
    `UPDATE discounts
     SET product_id = ?, nama_diskon = ?, tipe_diskon = ?, nilai = ?, masa_berlaku = ?
     WHERE id = ?`,
    [
      discount.product_id,
      discount.nama_diskon,
      discount.tipe_diskon,
      discount.nilai,
      discount.masa_berlaku,
      discountId,
    ],
  )

  return { status: 200, body: { discount: { id: discountId, ...discount } } }
}

async function resetUserPassword(payload) {
  const userId = Number(payload.user_id)
  const [users] = await pool.execute(
    'SELECT id, username, nama_lengkap, role FROM users WHERE id = ? LIMIT 1',
    [userId],
  )
  const user = users[0]

  if (!user) {
    return { status: 404, body: { message: 'User tidak ditemukan.' } }
  }

  const password = `${user.username}123`
  await pool.execute('UPDATE users SET password = ? WHERE id = ?', [
    hashPassword(password),
    user.id,
  ])

  return {
    status: 200,
    body: {
      message: `Password ${user.nama_lengkap} berhasil direset.`,
      credential: {
        username: user.username,
        password,
        role: user.role,
      },
    },
  }
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {})
    return
  }

  try {
    const url = new URL(request.url, `http://${request.headers.host}`)

    if (request.method === 'POST' && url.pathname === '/api/login') {
      const result = await login(await readBody(request))
      sendJson(response, result.status, result.body)
      return
    }

    if (request.method === 'GET' && url.pathname === '/api/state') {
      const auth = requireAuth(request)
      if (auth.error) {
        sendJson(response, auth.error.status, { message: auth.error.message })
        return
      }
      sendJson(response, 200, await getState())
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/transactions') {
      const auth = requireAuth(request, ['kasir'])
      if (auth.error) {
        sendJson(response, auth.error.status, { message: auth.error.message })
        return
      }
      const result = await createTransaction(await readBody(request), auth.user)
      sendJson(response, result.status, result.body)
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/products') {
      const auth = requireAuth(request, ['admin'])
      if (auth.error) {
        sendJson(response, auth.error.status, { message: auth.error.message })
        return
      }
      const result = await createProduct(await readBody(request))
      sendJson(response, result.status, result.body)
      return
    }

    const productMatch = url.pathname.match(/^\/api\/products\/(\d+)$/)
    if (request.method === 'PATCH' && productMatch) {
      const auth = requireAuth(request, ['admin'])
      if (auth.error) {
        sendJson(response, auth.error.status, { message: auth.error.message })
        return
      }
      const result = await updateProduct(Number(productMatch[1]), await readBody(request))
      sendJson(response, result.status, result.body)
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/discounts') {
      const auth = requireAuth(request, ['admin'])
      if (auth.error) {
        sendJson(response, auth.error.status, { message: auth.error.message })
        return
      }
      const result = await createDiscount(await readBody(request))
      sendJson(response, result.status, result.body)
      return
    }

    const discountMatch = url.pathname.match(/^\/api\/discounts\/(\d+)$/)
    if ((request.method === 'PATCH' || request.method === 'POST') && discountMatch) {
      const auth = requireAuth(request, ['admin'])
      if (auth.error) {
        sendJson(response, auth.error.status, { message: auth.error.message })
        return
      }
      const payload = await readBody(request)
      if (request.method === 'POST' && payload._method !== 'PATCH') {
        sendJson(response, 404, { message: 'Endpoint tidak ditemukan.' })
        return
      }
      const result = await updateDiscount(Number(discountMatch[1]), payload)
      sendJson(response, result.status, result.body)
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/users/reset-password') {
      const auth = requireAuth(request, ['admin'])
      if (auth.error) {
        sendJson(response, auth.error.status, { message: auth.error.message })
        return
      }
      const result = await resetUserPassword(await readBody(request))
      sendJson(response, result.status, result.body)
      return
    }

    sendJson(response, 404, { message: 'Endpoint tidak ditemukan.' })
  } catch (error) {
    sendJson(response, 500, { message: error.message })
  }
})

server.listen(PORT, () => {
  console.log(`Labona POS API running at http://localhost:${PORT}/api`)
})
