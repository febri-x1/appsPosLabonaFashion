import mysql from 'mysql2/promise'
import { dbConfig } from '../server/database.js'

const connection = await mysql.createConnection(dbConfig)

async function getColumns(tableName) {
  const [columns] = await connection.query(`SHOW COLUMNS FROM ${tableName}`)
  return columns.map((column) => column.Field)
}

async function hasColumn(tableName, columnName) {
  return (await getColumns(tableName)).includes(columnName)
}

async function hasTable(tableName) {
  const [tables] = await connection.query('SHOW TABLES')
  return tables.some((row) => Object.values(row)[0] === tableName)
}

async function hasForeignKey(tableName, constraintName) {
  const [rows] = await connection.execute(
    `SELECT CONSTRAINT_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [tableName, constraintName],
  )
  return rows.length > 0
}

async function hasIndex(tableName, indexName) {
  const [rows] = await connection.execute(
    `SELECT INDEX_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    [tableName, indexName],
  )
  return rows.length > 0
}

try {
  if (!(await hasColumn('products', 'kategori'))) {
    await connection.query(
      "ALTER TABLE products ADD COLUMN kategori VARCHAR(100) NOT NULL DEFAULT 'Umum'",
    )
  }

  const productColumns = await getColumns('products')
  if (productColumns.includes('kode_produk')) {
    await connection.query('ALTER TABLE products MODIFY kode_produk VARCHAR(50) NULL')
  }
  if (productColumns.includes('harga_jual')) {
    await connection.query('ALTER TABLE products MODIFY harga_jual DECIMAL(12, 2) NULL')
  }
  if (productColumns.includes('stok')) {
    await connection.query('ALTER TABLE products MODIFY stok INT NULL DEFAULT 0')
  }

  if (!(await hasTable('product_variants'))) {
    await connection.query(
      `CREATE TABLE product_variants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        sku VARCHAR(50) NOT NULL UNIQUE,
        ukuran VARCHAR(50) NOT NULL,
        warna VARCHAR(50) NOT NULL,
        harga_jual DECIMAL(12, 2) NOT NULL,
        stok INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_variants_product
          FOREIGN KEY (product_id) REFERENCES products(id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT chk_variants_price CHECK (harga_jual >= 0),
        CONSTRAINT chk_variants_stock CHECK (stok >= 0)
      )`,
    )
  }

  const variantHasProductFk = await hasForeignKey('product_variants', 'fk_variants_product')
  if (!variantHasProductFk) {
    await connection.query(
      `ALTER TABLE product_variants
       ADD CONSTRAINT fk_variants_product
       FOREIGN KEY (product_id) REFERENCES products(id)
       ON UPDATE CASCADE
       ON DELETE CASCADE`,
    )
  }

  if (!(await hasIndex('product_variants', 'idx_variants_product'))) {
    await connection.query('CREATE INDEX idx_variants_product ON product_variants(product_id)')
  }

  const latestProductColumns = await getColumns('products')
  if (
    latestProductColumns.includes('kode_produk') &&
    latestProductColumns.includes('harga_jual') &&
    latestProductColumns.includes('stok')
  ) {
    await connection.query(
      `INSERT IGNORE INTO product_variants (product_id, sku, ukuran, warna, harga_jual, stok)
       SELECT id, kode_produk, 'Default', 'Default', harga_jual, stok
       FROM products
       WHERE kode_produk IS NOT NULL`,
    )
  }

  if (!(await hasColumn('transaction_details', 'variant_id'))) {
    await connection.query('ALTER TABLE transaction_details ADD COLUMN variant_id INT NULL')
  }

  if ((await hasColumn('transaction_details', 'product_id'))) {
    await connection.query(
      `UPDATE transaction_details td
       JOIN product_variants pv ON pv.product_id = td.product_id
       SET td.variant_id = pv.id
       WHERE td.variant_id IS NULL`,
    )
    await connection.query('ALTER TABLE transaction_details MODIFY product_id INT NULL')
  }

  await connection.query(
    `UPDATE transaction_details td
     JOIN product_variants pv ON pv.id = td.variant_id
     SET td.variant_id = pv.id
     WHERE td.variant_id IS NULL`,
  )

  await connection.query('ALTER TABLE transaction_details MODIFY variant_id INT NOT NULL')

  if (!(await hasForeignKey('transaction_details', 'fk_details_variant'))) {
    await connection.query(
      `ALTER TABLE transaction_details
       ADD CONSTRAINT fk_details_variant
       FOREIGN KEY (variant_id) REFERENCES product_variants(id)
       ON UPDATE CASCADE`,
    )
  }

  if (!(await hasIndex('transaction_details', 'idx_details_variant'))) {
    await connection.query('CREATE INDEX idx_details_variant ON transaction_details(variant_id)')
  }

  console.log('Database berhasil disesuaikan untuk produk varian.')
} finally {
  await connection.end()
}
