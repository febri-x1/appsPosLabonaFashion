import mysql from 'mysql2/promise'

export const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'labona_pos',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
}

export const pool = mysql.createPool(dbConfig)

export function normalizeDateOnly(value) {
  if (!value) return value
  if (typeof value === 'string') return value.slice(0, 10)
  return value.toISOString().slice(0, 10)
}

export function normalizeDateTime(value) {
  if (!value) return value
  if (typeof value === 'string') return value
  return value.toISOString()
}

export function normalizeMoneyRows(rows, fields = []) {
  return rows.map((row) => {
    const normalized = { ...row }
    for (const field of fields) {
      normalized[field] = Number(normalized[field] || 0)
    }
    return normalized
  })
}
