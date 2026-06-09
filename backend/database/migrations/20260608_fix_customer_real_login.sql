-- Corrige/fortalece cadastro real de cliente público
-- Rode no MySQL uma vez.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS document VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS is_blocked TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_order_at DATETIME NULL;

-- Evita duplicar o mesmo telefone/e-mail dentro do mesmo restaurante.
-- Se der erro de índice duplicado, procure clientes repetidos antes de rodar de novo.
CREATE INDEX idx_customers_restaurant_phone ON customers (restaurant_id, phone);
CREATE INDEX idx_customers_restaurant_email ON customers (restaurant_id, email);

-- Opcional: se o cliente Ana Ferreira for somente dado de teste, remova manualmente depois de conferir.
-- DELETE FROM customers WHERE name = 'Ana Ferreira' AND phone = '(11) 95555-4444';
