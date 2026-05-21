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
  nama_produk VARCHAR(150) NOT NULL,
  kategori VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_variants (
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
  variant_id INT NOT NULL,
  discount_id INT NULL,
  jumlah INT NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  CONSTRAINT fk_details_transaction
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_details_variant
    FOREIGN KEY (variant_id) REFERENCES product_variants(id)
    ON UPDATE CASCADE,
  CONSTRAINT fk_details_discount
    FOREIGN KEY (discount_id) REFERENCES discounts(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT chk_details_qty CHECK (jumlah > 0),
  CONSTRAINT chk_details_subtotal CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_transactions_time ON transactions(tanggal_waktu);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_details_variant ON transaction_details(variant_id);

INSERT IGNORE INTO users (username, password, nama_lengkap, role) VALUES
('admin', SHA2('admin123', 256), 'Admin Labona', 'admin'),
('owner', SHA2('owner123', 256), 'Owner Labona', 'owner'),
('kasir', SHA2('kasir123', 256), 'Kasir Labona', 'kasir');

INSERT IGNORE INTO products (id, nama_produk, kategori) VALUES
(1, 'Blouse Linen Cream', 'Atasan'),
(2, 'Dress Midi Floral', 'Dress'),
(3, 'Kemeja Oversize Denim', 'Atasan'),
(4, 'Rok Plisket Navy', 'Rok'),
(5, 'Hijab Voal Premium', 'Hijab'),
(6, 'Celana Kulot Hitam', 'Bawahan');

INSERT IGNORE INTO product_variants (product_id, sku, ukuran, warna, harga_jual, stok) VALUES
(1, 'LBN-BLS-001-M-CRM', 'M', 'Cream', 159000, 18),
(2, 'LBN-DRS-002-M-FLR', 'M', 'Floral', 249000, 10),
(3, 'LBN-KMJ-003-L-DNM', 'L', 'Denim', 189000, 7),
(4, 'LBN-RK-004-ALL-NVY', 'All Size', 'Navy', 139000, 5),
(5, 'LBN-HJB-005-ALL-CRM', 'All Size', 'Cream', 79000, 24),
(6, 'LBN-CLN-006-L-HTM', 'L', 'Hitam', 169000, 12);

INSERT INTO discounts (product_id, nama_diskon, tipe_diskon, nilai, masa_berlaku)
SELECT p.id, 'Promo Dress Mingguan', 'persentase', 10, '2026-12-31'
FROM products p
WHERE p.nama_produk = 'Dress Midi Floral'
  AND NOT EXISTS (SELECT 1 FROM discounts d WHERE d.nama_diskon = 'Promo Dress Mingguan');

INSERT INTO discounts (product_id, nama_diskon, tipe_diskon, nilai, masa_berlaku)
SELECT p.id, 'Potongan Hijab', 'nominal', 5000, '2026-12-31'
FROM products p
WHERE p.nama_produk = 'Hijab Voal Premium'
  AND NOT EXISTS (SELECT 1 FROM discounts d WHERE d.nama_diskon = 'Potongan Hijab');
