-- Reforma MeuDeliveryAI: tema iFood, impressão, mesas, cliente real e cache.
-- Rode uma vez no MySQL do Railway.

DROP PROCEDURE IF EXISTS add_col_if_missing;
DROP PROCEDURE IF EXISTS add_index_if_missing;
DELIMITER $$
CREATE PROCEDURE add_col_if_missing(IN p_table VARCHAR(64), IN p_column VARCHAR(64), IN p_def TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_column
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', p_table, ' ADD COLUMN ', p_column, ' ', p_def);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
CREATE PROCEDURE add_index_if_missing(IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_def TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND INDEX_NAME = p_index
  ) THEN
    SET @sql = CONCAT('CREATE ', p_def);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL add_col_if_missing('restaurant_settings', 'auto_print_enabled', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL add_col_if_missing('restaurant_settings', 'kitchen_print_enabled', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL add_col_if_missing('orders', 'table_number', 'VARCHAR(20) NULL');
CALL add_col_if_missing('orders', 'idempotency_key', 'VARCHAR(120) NULL');
CALL add_col_if_missing('customers', 'document', 'VARCHAR(30) NULL');
CALL add_col_if_missing('customers', 'password_hash', 'VARCHAR(255) NULL');
CALL add_col_if_missing('customers', 'is_blocked', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL add_col_if_missing('customers', 'last_order_at', 'DATETIME NULL');

CALL add_index_if_missing('orders', 'idx_orders_restaurant_table', 'INDEX idx_orders_restaurant_table ON orders (restaurant_id, table_number)');
CALL add_index_if_missing('customers', 'idx_customers_restaurant_phone', 'INDEX idx_customers_restaurant_phone ON customers (restaurant_id, phone)');
CALL add_index_if_missing('customers', 'idx_customers_restaurant_email', 'INDEX idx_customers_restaurant_email ON customers (restaurant_id, email)');
CALL add_index_if_missing('orders', 'idx_orders_restaurant_idempotency', 'UNIQUE INDEX idx_orders_restaurant_idempotency ON orders (restaurant_id, idempotency_key)');

DROP PROCEDURE IF EXISTS add_col_if_missing;
DROP PROCEDURE IF EXISTS add_index_if_missing;

DELETE FROM customers WHERE name = 'Ana Ferreira' AND phone = '(11) 95555-4444';
