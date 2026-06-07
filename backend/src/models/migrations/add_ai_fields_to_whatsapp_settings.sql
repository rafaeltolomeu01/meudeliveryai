-- ============================================================
-- Migração: Adicionar campos de IA ao whatsapp_settings
-- Data: 2026-06-07
-- Descrição: Suporte ao atendente IA via OpenAI
-- ============================================================

-- Adicionar ai_enabled
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'whatsapp_settings' AND COLUMN_NAME = 'ai_enabled');
SET @sql = IF(@col = 0,
  'ALTER TABLE whatsapp_settings ADD COLUMN ai_enabled TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''Ativa o atendente IA''',
  'SELECT ''ai_enabled já existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Adicionar ai_name
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'whatsapp_settings' AND COLUMN_NAME = 'ai_name');
SET @sql = IF(@col = 0,
  'ALTER TABLE whatsapp_settings ADD COLUMN ai_name VARCHAR(100) NOT NULL DEFAULT ''Assistente'' COMMENT ''Nome do atendente IA''',
  'SELECT ''ai_name já existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Adicionar ai_personality
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'whatsapp_settings' AND COLUMN_NAME = 'ai_personality');
SET @sql = IF(@col = 0,
  'ALTER TABLE whatsapp_settings ADD COLUMN ai_personality TEXT DEFAULT NULL COMMENT ''Personalidade/tom da IA''',
  'SELECT ''ai_personality já existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Adicionar ai_fallback_message
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'whatsapp_settings' AND COLUMN_NAME = 'ai_fallback_message');
SET @sql = IF(@col = 0,
  'ALTER TABLE whatsapp_settings ADD COLUMN ai_fallback_message TEXT DEFAULT NULL COMMENT ''Mensagem de fallback''',
  'SELECT ''ai_fallback_message já existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Adicionar ai_model
SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'whatsapp_settings' AND COLUMN_NAME = 'ai_model');
SET @sql = IF(@col = 0,
  'ALTER TABLE whatsapp_settings ADD COLUMN ai_model VARCHAR(50) NOT NULL DEFAULT ''gpt-4o-mini'' COMMENT ''Modelo OpenAI''',
  'SELECT ''ai_model já existe'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'Migração add_ai_fields concluída!' AS resultado;
