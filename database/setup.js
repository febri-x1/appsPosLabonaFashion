import mysql from 'mysql2/promise'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const schemaPath = join(__dirname, 'schema.sql')

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
})

try {
  const schema = await readFile(schemaPath, 'utf8')
  await connection.query(schema)
  console.log('Database labona_pos siap digunakan.')
} finally {
  await connection.end()
}
