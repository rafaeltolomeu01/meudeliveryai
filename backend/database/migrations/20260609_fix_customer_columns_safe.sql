-- Rode um comando por vez. Se algum retornar "Duplicate column name", pode ignorar.
ALTER TABLE customers ADD COLUMN document VARCHAR(30) NULL;
ALTER TABLE customers ADD COLUMN password_hash VARCHAR(255) NULL;
ALTER TABLE customers ADD COLUMN is_blocked TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN last_order_at DATETIME NULL;
CREATE INDEX idx_customers_restaurant_phone ON customers (restaurant_id, phone);
CREATE INDEX idx_customers_restaurant_email ON customers (restaurant_id, email);
DELETE FROM customers WHERE name = 'Ana Ferreira' AND phone = '(11) 95555-4444';
