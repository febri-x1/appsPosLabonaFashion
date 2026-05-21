USE labona_pos;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS kategori VARCHAR(100) NOT NULL DEFAULT 'Umum';

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

INSERT IGNORE INTO product_variants (product_id, sku, ukuran, warna, harga_jual, stok)
SELECT id, kode_produk, 'Default', 'Default', harga_jual, stok
FROM products
WHERE kode_produk IS NOT NULL;

ALTER TABLE transaction_details
  ADD COLUMN IF NOT EXISTS variant_id INT NULL;

UPDATE transaction_details td
JOIN product_variants pv ON pv.product_id = td.product_id
SET td.variant_id = pv.id
WHERE td.variant_id IS NULL;

ALTER TABLE transaction_details
  DROP FOREIGN KEY fk_details_product;

ALTER TABLE transaction_details
  MODIFY product_id INT NULL,
  MODIFY variant_id INT NOT NULL;

ALTER TABLE transaction_details
  ADD CONSTRAINT fk_details_variant
    FOREIGN KEY (variant_id) REFERENCES product_variants(id)
    ON UPDATE CASCADE;

ALTER TABLE products
  MODIFY kode_produk VARCHAR(50) NULL,
  MODIFY harga_jual DECIMAL(12, 2) NULL,
  MODIFY stok INT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_details_variant ON transaction_details(variant_id);
