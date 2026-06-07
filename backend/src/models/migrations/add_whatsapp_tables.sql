-- ============================================================
-- Migração: Adicionar tabelas WhatsApp Conectado
-- Data: 2026-06-07
-- Descrição: Cria whatsapp_connections e whatsapp_messages_logs
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id   INT UNSIGNED NOT NULL UNIQUE,
  session_name    VARCHAR(100) NOT NULL,
  phone_number    VARCHAR(30)  DEFAULT NULL,
  profile_name    VARCHAR(255) DEFAULT NULL,
  status          ENUM('disconnected','connecting','connected','error') NOT NULL DEFAULT 'disconnected',
  qr_code         MEDIUMTEXT   DEFAULT NULL,
  instance_id     VARCHAR(255) DEFAULT NULL,
  connected_at    DATETIME     DEFAULT NULL,
  last_connection DATETIME     DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_restaurant (restaurant_id),
  INDEX idx_status     (status),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Sessões WhatsApp por restaurante (Evolution API)';

CREATE TABLE IF NOT EXISTS whatsapp_messages_logs (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id    INT UNSIGNED NOT NULL,
  event_type       VARCHAR(50) NOT NULL,
  recipient_phone  VARCHAR(30) DEFAULT NULL,
  message_text     TEXT,
  status           ENUM('sent','error','demo','pending') NOT NULL DEFAULT 'pending',
  error_message    TEXT DEFAULT NULL,
  sent_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_restaurant (restaurant_id),
  INDEX idx_status     (status),
  INDEX idx_sent_at    (sent_at),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Histórico de mensagens enviadas via WhatsApp por restaurante';

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Migração whatsapp_connections e whatsapp_messages_logs concluída!' AS resultado;
