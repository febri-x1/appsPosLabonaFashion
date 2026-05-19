CREATE DATABASE IF NOT EXISTS labona_pos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE labona_pos;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  nama_lengkap VARCHAR(100) NOT NULL,
  role ENUM('admin', 'owner', 'kasir') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kode_produk VARCHAR(50) NOT NULL UNIQUE,
  nama_produk VARCHAR(150) NOT NULL,
  harga_jual DECIMAL(12, 2) NOT NULL,
  stok INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_products_price CHECK (harga_jual >= 0),
  CONSTRAINT chk_products_stock CHECK (stok >= 0)
);

CREATE TABLE IF NOT EXISTS discounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NULL,
  nama_diskon VARCHAR(100) NOT NULL,
  tipe_diskon ENUM('persentase', 'nominal') NOT NULL,
  nilai DECIMAL(12, 2) NOT NULL,
  masa_berlaku DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_discounts_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT chk_discounts_value CHECK (nilai >= 0)
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  tanggal_waktu DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_harga DECIMAL(12, 2) NOT NULL,
  total_bayar DECIMAL(12, 2) NOT NULL,
  uang_tunai DECIMAL(12, 2) NOT NULL,
  uang_kembali DECIMAL(12, 2) NOT NULL,
  CONSTRAINT fk_transactions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE,
  CONSTRAINT chk_transactions_total CHECK (total_harga >= 0 AND total_bayar >= 0),
  CONSTRAINT chk_transactions_cash CHECK (uang_tunai >= total_bayar AND uang_kembali >= 0)
);

CREATE TABLE IF NOT EXISTS transaction_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  product_id INT NOT NULL,
  discount_id INT NULL,
  jumlah INT NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  CONSTRAINT fk_details_transaction
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_details_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON UPDATE CASCADE,
  CONSTRAINT fk_details_discount
    FOREIGN KEY (discount_id) REFERENCES discounts(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT chk_details_qty CHECK (jumlah > 0),
  CONSTRAINT chk_details_subtotal CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_transactions_time ON transactions(tanggal_waktu);
CREATE INDEX IF NOT EXISTS idx_details_product ON transaction_details(product_id);

INSERT IGNORE INTO users (username, password, nama_lengkap, role) VALUES
('admin', SHA2('admin123', 256), 'Admin Labona', 'admin'),
('owner', SHA2('owner123', 256), 'Owner Labona', 'owner'),
('kasir', SHA2('kasir123', 256), 'Kasir Labona', 'kasir');

INSERT IGNORE INTO products (kode_produk, nama_produk, harga_jual, stok) VALUES
('LBN-BLS-001', 'Blouse Linen Cream', 159000, 18),
('LBN-DRS-002', 'Dress Midi Floral', 249000, 10),
('LBN-KMJ-003', 'Kemeja Oversize Denim', 189000, 7),
('LBN-RK-004', 'Rok Plisket Navy', 139000, 5),
('LBN-HJB-005', 'Hijab Voal Premium', 79000, 24),
('LBN-CLN-006', 'Celana Kulot Hitam', 169000, 12);

INSERT INTO discounts (product_id, nama_diskon, tipe_diskon, nilai, masa_berlaku)
SELECT p.id, 'Promo Dress Mingguan', 'persentase', 10, '2026-12-31'
FROM products p
WHERE p.kode_produk = 'LBN-DRS-002'
  AND NOT EXISTS (SELECT 1 FROM discounts d WHERE d.nama_diskon = 'Promo Dress Mingguan');

INSERT INTO discounts (product_id, nama_diskon, tipe_diskon, nilai, masa_berlaku)
SELECT p.id, 'Potongan Hijab', 'nominal', 5000, '2026-12-31'
FROM products p
WHERE p.kode_produk = 'LBN-HJB-005'
  AND NOT EXISTS (SELECT 1 FROM discounts d WHERE d.nama_diskon = 'Potongan Hijab');
