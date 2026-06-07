-- ============================================================
--  MeuDeliveryAI — Schema Completo do Banco de Dados
--  Versão: 2.0
--  Charset: utf8mb4 / Collation: utf8mb4_unicode_ci
--  Engine: InnoDB
-- ============================================================
--  Tabelas:
--   01. plans                — Planos SaaS
--   02. restaurants          — Tenants (restaurantes)
--   03. subscriptions        — Assinaturas por restaurante
--   04. users                — Usuários por restaurante
--   05. restaurant_theme     — Aparência/visual por restaurante
--   06. restaurant_settings  — Configurações operacionais
--   07. payment_settings     — Configurações de pagamento
--   08. whatsapp_settings    — Integração WhatsApp
--   09. categories           — Categorias do cardápio
--   10. products             — Produtos/itens do cardápio
--   11. customers            — Clientes por restaurante
--   12. delivery_drivers     — Entregadores por restaurante
--   13. orders               — Pedidos
--   14. order_items          — Itens de cada pedido
--   15. order_status_logs    — Histórico de status dos pedidos
--   16. system_logs          — Logs gerais do sistema
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET time_zone = '-03:00';

-- ============================================================
-- 01. PLANS — Planos SaaS disponíveis na plataforma
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
  id                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name                 VARCHAR(100) NOT NULL,               -- 'Starter', 'Pro', 'Enterprise'
  slug                 VARCHAR(50)  NOT NULL UNIQUE,        -- 'starter', 'pro', 'enterprise'
  description          TEXT,
  price_monthly        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  price_yearly         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  max_products         INT DEFAULT NULL,                    -- NULL = ilimitado
  max_orders_per_month INT DEFAULT NULL,
  max_users            INT DEFAULT NULL,
  has_reports          TINYINT(1) NOT NULL DEFAULT 0,
  has_custom_theme     TINYINT(1) NOT NULL DEFAULT 0,
  has_whatsapp         TINYINT(1) NOT NULL DEFAULT 0,
  has_drivers          TINYINT(1) NOT NULL DEFAULT 0,
  has_api_access       TINYINT(1) NOT NULL DEFAULT 0,
  support_level        ENUM('community','email','priority','dedicated') NOT NULL DEFAULT 'community',
  is_active            TINYINT(1) NOT NULL DEFAULT 1,
  position             INT NOT NULL DEFAULT 0,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_slug   (slug),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Planos SaaS da plataforma';

-- ============================================================
-- 02. RESTAURANTS — Tenants da plataforma
-- ============================================================
CREATE TABLE IF NOT EXISTS restaurants (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) NOT NULL UNIQUE,              -- URL amigável único
  owner_name  VARCHAR(255),
  email       VARCHAR(255) NOT NULL UNIQUE,
  phone       VARCHAR(20),
  whatsapp    VARCHAR(20),
  document    VARCHAR(18),                               -- CPF ou CNPJ
  city        VARCHAR(100),
  state       CHAR(2),
  address     VARCHAR(500),
  logo        VARCHAR(500),
  cover_image VARCHAR(500),
  status      ENUM('active', 'inactive', 'blocked') NOT NULL DEFAULT 'active',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_slug     (slug),
  INDEX idx_email    (email),
  INDEX idx_phone    (phone),
  INDEX idx_status   (status),
  INDEX idx_city     (city),
  INDEX idx_state    (state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tenant principal — cada restaurante na plataforma';

-- ============================================================
-- 03. SUBSCRIPTIONS — Assinatura de cada restaurante
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id INT UNSIGNED NOT NULL,
  plan_id       INT UNSIGNED NOT NULL,
  status        ENUM('trial', 'active', 'overdue', 'canceled') NOT NULL DEFAULT 'trial',
  start_date    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_date      DATETIME NULL,
  trial_days    INT NOT NULL DEFAULT 30,
  monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_restaurant (restaurant_id),
  INDEX idx_plan       (plan_id),
  INDEX idx_status     (status),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id)       REFERENCES plans(id)       ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Assinaturas SaaS por restaurante';

-- ============================================================
-- 04. USERS — Usuários de cada restaurante
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id INT UNSIGNED NULL,                      -- NULL para admin_geral
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,             -- Único globalmente no sistema
  password_hash VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  role          ENUM('admin_geral', 'dono', 'gerente', 'atendente', 'cozinha', 'entregador') NOT NULL DEFAULT 'atendente',
  status        ENUM('active', 'inactive', 'blocked') NOT NULL DEFAULT 'active',
  last_login    DATETIME DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_restaurant (restaurant_id),
  INDEX idx_email      (email),
  INDEX idx_role       (role),
  INDEX idx_status     (status),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Usuários do sistema';

-- ============================================================
-- 05. RESTAURANT_THEME — Aparência visual por restaurante
-- ============================================================
CREATE TABLE IF NOT EXISTS restaurant_theme (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id     INT UNSIGNED NOT NULL UNIQUE,
  primary_color     VARCHAR(7)   NOT NULL DEFAULT '#FF6B35',
  secondary_color   VARCHAR(7)   NOT NULL DEFAULT '#1A0533',
  accent_color      VARCHAR(7)   NOT NULL DEFAULT '#FFC300',
  background_color  VARCHAR(7)   NOT NULL DEFAULT '#0F0F0F',
  button_color      VARCHAR(7)   NOT NULL DEFAULT '#FF6B35',
  text_color        VARCHAR(7)   NOT NULL DEFAULT '#FFFFFF',
  font_family       VARCHAR(100) NOT NULL DEFAULT 'Inter',
  font_url          VARCHAR(500),                           -- Google Fonts ou CDN
  logo_url          VARCHAR(500),
  cover_url         VARCHAR(500),
  logo              VARCHAR(500),                           -- Caminho local/upload do logo
  cover_image       VARCHAR(500),                           -- Caminho local/upload da capa
  favicon_url       VARCHAR(500),
  border_radius     VARCHAR(50)  NOT NULL DEFAULT 'arredondada', -- 'quadrada' ou 'arredondada'
  card_style        VARCHAR(50)  NOT NULL DEFAULT 'moderno',     -- 'simples', 'moderno', 'arredondado'
  button_style      ENUM('filled','outlined','ghost')  NOT NULL DEFAULT 'filled',
  theme_mode        VARCHAR(10)  NOT NULL DEFAULT 'dark',        -- 'light' ou 'dark'
  dark_mode         TINYINT(1) NOT NULL DEFAULT 1,
  custom_css        TEXT,                                   -- CSS customizado avançado
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_restaurant (restaurant_id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Aparência visual/tema por restaurante';

-- ============================================================
-- 06. RESTAURANT_SETTINGS — Configurações operacionais
-- ============================================================
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id                      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id           INT UNSIGNED NOT NULL UNIQUE,
  -- Horários de funcionamento (JSON por dia da semana)
  opening_hours           JSON,
  -- Delivery
  delivery_enabled        TINYINT(1) NOT NULL DEFAULT 1,
  delivery_radius_km      DECIMAL(5,2) DEFAULT 10.00,
  delivery_fee            DECIMAL(10,2) DEFAULT 5.00,
  free_delivery_above     DECIMAL(10,2) DEFAULT NULL,       -- Frete grátis acima de X
  min_order_value         DECIMAL(10,2) DEFAULT 20.00,
  estimated_delivery_time INT DEFAULT 45                    COMMENT 'Minutos',
  -- Retirada no local
  pickup_enabled          TINYINT(1) NOT NULL DEFAULT 1,
  estimated_pickup_time   INT DEFAULT 20                    COMMENT 'Minutos',
  -- Operacional
  is_open                 TINYINT(1) NOT NULL DEFAULT 0,
  auto_accept_orders      TINYINT(1) NOT NULL DEFAULT 0,
  order_notification_sound TINYINT(1) NOT NULL DEFAULT 1,
  max_simultaneous_orders INT DEFAULT NULL,
  accept_orders_when_closed TINYINT(1) NOT NULL DEFAULT 0,
  -- Mensagens e Suporte
  welcome_message         TEXT,
  order_confirmed_message TEXT,
  order_dispatched_message TEXT,
  support_phone           VARCHAR(20),
  -- Contato
  whatsapp_number         VARCHAR(20),
  instagram_url           VARCHAR(500),
  facebook_url            VARCHAR(500),
  website_url             VARCHAR(500),
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_restaurant (restaurant_id),
  INDEX idx_is_open    (is_open),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Configurações operacionais do restaurante';

-- ============================================================
-- 07. PAYMENT_SETTINGS — Configurações de pagamento
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_settings (
  id                         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id              INT UNSIGNED NOT NULL UNIQUE,
  -- Dinheiro
  accepts_cash               TINYINT(1) NOT NULL DEFAULT 1,
  cash_change_enabled        TINYINT(1) NOT NULL DEFAULT 1, -- Aceita troco
  -- Cartão
  accepts_credit_card        TINYINT(1) NOT NULL DEFAULT 1,
  accepts_debit_card         TINYINT(1) NOT NULL DEFAULT 1,
  credit_card_brands         JSON,                          -- ["visa","mastercard","amex"]
  card_surcharge_percent     DECIMAL(5,2) DEFAULT 0.00,     -- Taxa cartão
  -- PIX
  accepts_pix                TINYINT(1) NOT NULL DEFAULT 1,
  pix_key                    VARCHAR(255),
  pix_key_type               ENUM('cpf','cnpj','email','phone','random') DEFAULT NULL,
  pix_receiver_name          VARCHAR(255) DEFAULT NULL,
  pix_receiver_city          VARCHAR(100) DEFAULT NULL,
  pix_instructions           TEXT DEFAULT NULL,
  pix_qr_code_url            VARCHAR(500),
  -- Vale refeição
  accepts_meal_voucher       TINYINT(1) NOT NULL DEFAULT 0,
  meal_voucher_brands        JSON,                          -- ["vr","alelo","ticket"]
  -- Online (futuro)
  online_payment_enabled     TINYINT(1) NOT NULL DEFAULT 0,
  payment_gateway            VARCHAR(50),                   -- 'mercadopago', 'stripe', etc.
  gateway_public_key         VARCHAR(500),
  gateway_webhook_secret     VARCHAR(500),
  created_at                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_restaurant (restaurant_id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Configurações de meios de pagamento por restaurante';

-- ============================================================
-- 08. WHATSAPP_SETTINGS — Integração WhatsApp
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id                         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id              INT UNSIGNED NOT NULL UNIQUE,
  is_enabled                 TINYINT(1) NOT NULL DEFAULT 0,
  phone_number               VARCHAR(20),                   -- Número com DDI (55...)
  api_provider               VARCHAR(50) DEFAULT NULL,      -- 'z-api', 'twilio', 'official'
  api_token                  VARCHAR(500),
  instance_id                VARCHAR(255),
  -- Notificações automáticas
  notify_new_order           TINYINT(1) NOT NULL DEFAULT 1,
  notify_order_confirmed     TINYINT(1) NOT NULL DEFAULT 1,
  notify_order_ready         TINYINT(1) NOT NULL DEFAULT 1,
  notify_out_for_delivery    TINYINT(1) NOT NULL DEFAULT 1,
  notify_delivered           TINYINT(1) NOT NULL DEFAULT 1,
  notify_cancelled           TINYINT(1) NOT NULL DEFAULT 0,
  -- Templates de mensagem
  template_new_order         TEXT,
  template_confirmed         TEXT,
  template_ready             TEXT,
  template_out_for_delivery  TEXT,
  template_delivered         TEXT,
  template_cancelled         TEXT,
  -- Status da conexão
  connection_status          ENUM('disconnected','connecting','connected','error') NOT NULL DEFAULT 'disconnected',
  last_connected_at          DATETIME,
  created_at                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_restaurant (restaurant_id),
  INDEX idx_enabled    (is_enabled),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Configurações da integração WhatsApp por restaurante';

-- ============================================================
-- 09. CATEGORIES — Categorias do cardápio
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id INT UNSIGNED NOT NULL,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  image_url     VARCHAR(500),
  position      INT NOT NULL DEFAULT 0,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_restaurant        (restaurant_id),
  INDEX idx_restaurant_active (restaurant_id, is_active),
  INDEX idx_position          (position),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Categorias do cardápio por restaurante';

-- ============================================================
-- 10. PRODUCTS — Produtos / itens do cardápio
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id      INT UNSIGNED NOT NULL,
  category_id        INT UNSIGNED,
  name               VARCHAR(255) NOT NULL,
  description        TEXT,
  price              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  promotional_price  DECIMAL(10,2) DEFAULT NULL,
  cost_price         DECIMAL(10,2) DEFAULT NULL,            -- Custo interno
  image_url          VARCHAR(500),
  sku                VARCHAR(100),                          -- Código interno
  barcode            VARCHAR(50),
  is_available       TINYINT(1) NOT NULL DEFAULT 1,
  is_featured        TINYINT(1) NOT NULL DEFAULT 0,
  track_stock        TINYINT(1) NOT NULL DEFAULT 0,
  stock_quantity     INT DEFAULT NULL,
  serves_how_many    INT DEFAULT 1,
  preparation_time   INT DEFAULT 15                         COMMENT 'Minutos',
  calories           INT DEFAULT NULL,
  position           INT NOT NULL DEFAULT 0,
  tags               JSON,                                  -- ["vegano","sem-gluten"]
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_restaurant           (restaurant_id),
  INDEX idx_category             (category_id),
  INDEX idx_restaurant_available (restaurant_id, is_available),
  INDEX idx_restaurant_featured  (restaurant_id, is_featured),
  INDEX idx_sku                  (sku),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id)   REFERENCES categories(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Produtos e itens do cardápio por restaurante';

-- ============================================================
-- 10b. PRODUCT_OPTIONS — Adicionais / opções dos produtos
-- ============================================================
CREATE TABLE IF NOT EXISTS product_options (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id  INT UNSIGNED NOT NULL,
  product_id     INT UNSIGNED NOT NULL,
  group_name     VARCHAR(255) NOT NULL,                     -- 'Adicionais', 'Tamanho', 'Massa'
  name           VARCHAR(255) NOT NULL,
  price          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_required    TINYINT(1) NOT NULL DEFAULT 0,
  min_quantity   INT NOT NULL DEFAULT 0,
  max_quantity   INT NOT NULL DEFAULT 1,
  position       INT NOT NULL DEFAULT 0,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_restaurant (restaurant_id),
  INDEX idx_product    (product_id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)    REFERENCES products(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Adicionais e opções dos produtos';

-- ============================================================
-- 11. CUSTOMERS — Clientes por restaurante
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id     INT UNSIGNED NOT NULL,
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(255),
  phone             VARCHAR(20),
  document          VARCHAR(14),                            -- CPF
  birth_date        DATE,
  gender            ENUM('M','F','other','not_informed') DEFAULT 'not_informed',
  -- Endereço padrão
  address           VARCHAR(500),
  address_number    VARCHAR(20),
  complement        VARCHAR(255),
  neighborhood      VARCHAR(255),
  city              VARCHAR(100),
  state             CHAR(2),
  zip_code          VARCHAR(10),
  -- Métricas
  total_orders      INT UNSIGNED NOT NULL DEFAULT 0,
  total_spent       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  average_ticket    DECIMAL(10,2) GENERATED ALWAYS AS (
    CASE WHEN total_orders > 0 THEN ROUND(total_spent / total_orders, 2) ELSE 0.00 END
  ) STORED,
  last_order_at     DATETIME,
  -- Controle
  notes             TEXT,
  is_blocked        TINYINT(1) NOT NULL DEFAULT 0,
  block_reason      TEXT,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_restaurant       (restaurant_id),
  INDEX idx_phone            (phone),
  INDEX idx_email            (email),
  INDEX idx_document         (document),
  INDEX idx_restaurant_phone (restaurant_id, phone),
  INDEX idx_restaurant_email (restaurant_id, email),
  INDEX idx_last_order       (last_order_at),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Clientes por restaurante';

-- ============================================================
-- 12. DELIVERY_DRIVERS — Entregadores por restaurante
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_drivers (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id     INT UNSIGNED NOT NULL,
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(255),
  phone             VARCHAR(20)  NOT NULL,
  document          VARCHAR(14),                            -- CPF
  vehicle_type      ENUM('bicycle','motorcycle','car','van','on_foot') NOT NULL DEFAULT 'motorcycle',
  vehicle_model     VARCHAR(100),
  license_plate     VARCHAR(20),
  cnh_number        VARCHAR(20),
  cnh_expiry        DATE,
  avatar_url        VARCHAR(500),
  is_available      TINYINT(1) NOT NULL DEFAULT 0,
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  -- Métricas
  total_deliveries  INT UNSIGNED NOT NULL DEFAULT 0,
  total_earned      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  rating            DECIMAL(3,2) DEFAULT NULL,              -- 0.00 a 5.00
  rating_count      INT UNSIGNED NOT NULL DEFAULT 0,
  -- Localização (para futura integração de rastreio)
  last_lat          DECIMAL(10,8) DEFAULT NULL,
  last_lng          DECIMAL(11,8) DEFAULT NULL,
  last_seen_at      DATETIME,
  notes             TEXT,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_restaurant           (restaurant_id),
  INDEX idx_phone                (phone),
  INDEX idx_restaurant_available (restaurant_id, is_available),
  INDEX idx_restaurant_active    (restaurant_id, is_active),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Entregadores por restaurante';

-- ============================================================
-- 13. ORDERS — Pedidos
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id                     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id          INT UNSIGNED NOT NULL,
  customer_id            INT UNSIGNED,
  driver_id              INT UNSIGNED,
  -- Identificação
  order_number           VARCHAR(20) NOT NULL,              -- Ex.: "BH-20240101-0001"
  order_type             ENUM('delivery','pickup','dine_in') NOT NULL DEFAULT 'delivery',
  source                 ENUM('panel','whatsapp','site','app','ifood','rappi') NOT NULL DEFAULT 'panel',
  -- Status
  status                 ENUM(
                           'pending',           -- Aguardando confirmação
                           'confirmed',         -- Confirmado pelo restaurante
                           'preparing',         -- Em preparo
                           'ready',             -- Pronto para entrega/retirada
                           'out_for_delivery',  -- Saiu para entrega
                           'delivered',         -- Entregue
                           'picked_up',         -- Retirado pelo cliente
                           'cancelled'          -- Cancelado
                         ) NOT NULL DEFAULT 'pending',
  -- Pagamento
  payment_method         ENUM('cash','credit_card','debit_card','pix','meal_voucher','online') NOT NULL DEFAULT 'cash',
  payment_status         ENUM('pending','paid','partial','refunded','failed') NOT NULL DEFAULT 'pending',
  change_for             DECIMAL(10,2) DEFAULT NULL,        -- Troco para quanto
  -- Valores
  subtotal               DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  delivery_fee           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount               DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  surcharge              DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Taxa adicional
  total                  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  -- Endereço de entrega
  delivery_address       VARCHAR(500),
  delivery_number        VARCHAR(20),
  delivery_complement    VARCHAR(255),
  delivery_neighborhood  VARCHAR(255),
  delivery_city          VARCHAR(100),
  delivery_state         CHAR(2),
  delivery_zip_code      VARCHAR(10),
  delivery_lat           DECIMAL(10,8) DEFAULT NULL,
  delivery_lng           DECIMAL(11,8) DEFAULT NULL,
  -- Tempos
  estimated_time         INT DEFAULT NULL                   COMMENT 'Minutos',
  accepted_at            DATETIME,
  preparing_at           DATETIME,
  ready_at               DATETIME,
  dispatched_at          DATETIME,
  delivered_at           DATETIME,
  cancelled_at           DATETIME,
  -- Extras
  notes                  TEXT,
  internal_notes         TEXT,                              -- Notas internas (não visíveis ao cliente)
  cancellation_reason    TEXT,
  rated_at               DATETIME,
  rating                 TINYINT DEFAULT NULL,              -- 1 a 5
  rating_comment         TEXT,
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_order_number (restaurant_id, order_number),
  INDEX idx_restaurant        (restaurant_id),
  INDEX idx_customer          (customer_id),
  INDEX idx_driver            (driver_id),
  INDEX idx_status            (status),
  INDEX idx_payment_status    (payment_status),
  INDEX idx_order_number      (order_number),
  INDEX idx_created_at        (created_at),
  INDEX idx_restaurant_status (restaurant_id, status),
  INDEX idx_restaurant_date   (restaurant_id, created_at),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)      ON DELETE CASCADE,
  FOREIGN KEY (customer_id)   REFERENCES customers(id)        ON DELETE SET NULL,
  FOREIGN KEY (driver_id)     REFERENCES delivery_drivers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Pedidos por restaurante';

-- ============================================================
-- 14. ORDER_ITEMS — Itens de cada pedido
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id      INT UNSIGNED NOT NULL,
  restaurant_id INT UNSIGNED NOT NULL,
  product_id    INT UNSIGNED,
  product_name  VARCHAR(255) NOT NULL,                      -- Snapshot do nome no momento do pedido
  product_image VARCHAR(500),
  quantity      INT NOT NULL DEFAULT 1,
  unit_price    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_price   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  options       JSON,                                       -- Adicionais selecionados (snapshot)
  notes         TEXT,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_order      (order_id),
  INDEX idx_product    (product_id),
  INDEX idx_restaurant (restaurant_id),
  FOREIGN KEY (order_id)      REFERENCES orders(id)       ON DELETE CASCADE,
  FOREIGN KEY (product_id)    REFERENCES products(id)     ON DELETE SET NULL,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Itens dos pedidos com snapshot dos dados';

-- ============================================================
-- 15. ORDER_STATUS_LOGS — Histórico de mudança de status
-- ============================================================
CREATE TABLE IF NOT EXISTS order_status_logs (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id      INT UNSIGNED NOT NULL,
  restaurant_id INT UNSIGNED NOT NULL,
  user_id       INT UNSIGNED,                               -- Quem fez a mudança (NULL = sistema)
  from_status   VARCHAR(50),                               -- Status anterior
  to_status     VARCHAR(50) NOT NULL,                      -- Novo status
  notes         TEXT,                                      -- Observação da mudança
  ip_address    VARCHAR(45),
  user_agent    VARCHAR(500),
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_order      (order_id),
  INDEX idx_restaurant (restaurant_id),
  INDEX idx_user       (user_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (order_id)      REFERENCES orders(id)      ON DELETE CASCADE,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)       REFERENCES users(id)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Histórico de mudanças de status dos pedidos';

-- ============================================================
-- 16. SYSTEM_LOGS — Logs gerais do sistema
-- ============================================================
CREATE TABLE IF NOT EXISTS system_logs (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id INT UNSIGNED,                               -- NULL = log de sistema geral
  user_id       INT UNSIGNED,
  level         ENUM('debug','info','warn','error','critical') NOT NULL DEFAULT 'info',
  category      VARCHAR(50) NOT NULL,                       -- 'auth', 'order', 'payment', 'api', etc.
  action        VARCHAR(100) NOT NULL,                      -- 'user.login', 'order.created', etc.
  message       TEXT NOT NULL,
  context       JSON,                                       -- Dados adicionais em JSON
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  request_id    VARCHAR(36),                                -- UUID da requisição
  duration_ms   INT UNSIGNED,                               -- Duração em ms (para performance)
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_restaurant (restaurant_id),
  INDEX idx_user       (user_id),
  INDEX idx_level      (level),
  INDEX idx_category   (category),
  INDEX idx_action     (action),
  INDEX idx_created_at (created_at),
  INDEX idx_request_id (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Logs gerais do sistema para auditoria e debugging'
  ROW_FORMAT=COMPRESSED;

-- ============================================================
-- 17. WHATSAPP_CONNECTIONS — Sessões WhatsApp por restaurante
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id   INT UNSIGNED NOT NULL UNIQUE,
  session_name    VARCHAR(100) NOT NULL,                    -- Ex.: "restaurant_1"
  phone_number    VARCHAR(30)  DEFAULT NULL,                -- Número conectado (com DDI)
  profile_name    VARCHAR(255) DEFAULT NULL,                -- Nome exibido no WhatsApp
  status          ENUM('disconnected','connecting','connected','error') NOT NULL DEFAULT 'disconnected',
  qr_code         MEDIUMTEXT   DEFAULT NULL,                -- Base64 do QR Code
  instance_id     VARCHAR(255) DEFAULT NULL,                -- ID da instância na Evolution API
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

-- ============================================================
-- 18. WHATSAPP_MESSAGES_LOGS — Histórico de mensagens enviadas
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_messages_logs (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id    INT UNSIGNED NOT NULL,
  event_type       VARCHAR(50) NOT NULL,                    -- 'order_confirmed', 'manual', etc.
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

-- ============================================================
-- Reativa verificação de chaves estrangeiras
-- ============================================================
SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================
-- SEED DATA — Dados iniciais de exemplo
-- ============================================================

-- ------------------------------------------------------------
-- Planos SaaS
-- ------------------------------------------------------------
INSERT IGNORE INTO plans
  (id, name, slug, description, price_monthly, price_yearly,
   max_products, max_orders_per_month, max_users,
   has_reports, has_custom_theme, has_whatsapp, has_drivers, has_api_access,
   support_level, is_active, position)
VALUES
  (1, 'Starter', 'starter',
   'Plano gratuito para quem está começando. Ideal para testar a plataforma.',
   0.00, 0.00, 20, 100, 2,
   0, 0, 0, 0, 0, 'community', 1, 1),

  (2, 'Pro', 'pro',
   'Para restaurantes em crescimento. Produtos ilimitados, relatórios completos e WhatsApp.',
   149.00, 1490.00, NULL, NULL, 10,
   1, 1, 1, 1, 0, 'email', 1, 2),

  (3, 'Enterprise', 'enterprise',
   'Solução completa para redes e franquias. Suporte prioritário e acesso à API.',
   349.00, 3490.00, NULL, NULL, NULL,
   1, 1, 1, 1, 1, 'priority', 1, 3);

-- ------------------------------------------------------------
-- Restaurante demo: Burger House
-- ------------------------------------------------------------
INSERT IGNORE INTO restaurants
  (id, name, slug, owner_name, email, phone, whatsapp, document,
   city, state, address, logo, cover_image, status)
VALUES
  (1, 'Burger House', 'burger-house', 'Rafael Admin', 'admin@burgerhouse.com',
   '(11) 99999-0000', '5511999990000', '12.345.678/0001-90',
   'São Paulo', 'SP', 'Rua das Hamburguers, 123 - Vila Madalena', NULL, NULL, 'active');

-- ------------------------------------------------------------
-- Assinatura Pro (trial 30 dias)
-- ------------------------------------------------------------
INSERT IGNORE INTO subscriptions
  (restaurant_id, plan_id, status, start_date, due_date, trial_days, monthly_price)
VALUES
  (1, 2, 'trial', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 30, 149.00);

-- ------------------------------------------------------------
-- Usuário owner — senha: Admin@123
-- Hash bcrypt gerado com 12 rounds para 'Admin@123'
-- ------------------------------------------------------------
-- Usuários iniciais
-- ------------------------------------------------------------
-- Usuário dono (Burger House) — senha: Admin@123
INSERT IGNORE INTO users
  (id, restaurant_id, name, email, password_hash, phone, role, status)
VALUES
  (1, 1, 'Rafael Admin', 'admin@burgerhouse.com',
   '$2a$12$TxfwgsP1wKaZGboGhzTd6uZ/0VTX6da2aEh/Oc1keXo.slITkwbXe',
   '(11) 99999-0000', 'dono', 'active');

-- Usuário gerente (Burger House) — senha: Admin@123
INSERT IGNORE INTO users
  (id, restaurant_id, name, email, password_hash, phone, role, status)
VALUES
  (2, 1, 'Maria Gerente', 'gerente@burgerhouse.com',
   '$2a$12$TxfwgsP1wKaZGboGhzTd6uZ/0VTX6da2aEh/Oc1keXo.slITkwbXe',
   '(11) 98888-0000', 'gerente', 'active');

-- Usuário admin_geral (Plataforma) — senha: Admin@123
INSERT IGNORE INTO users
  (id, restaurant_id, name, email, password_hash, phone, role, status)
VALUES
  (3, NULL, 'Suporte Antigravity', 'admin@meudeliveryai.com',
   '$2a$12$TxfwgsP1wKaZGboGhzTd6uZ/0VTX6da2aEh/Oc1keXo.slITkwbXe',
   '(11) 97777-0000', 'admin_geral', 'active');

-- ------------------------------------------------------------
-- Tema visual padrão
-- ------------------------------------------------------------
INSERT IGNORE INTO restaurant_theme
  (restaurant_id, primary_color, secondary_color, accent_color,
   background_color, text_color, font_family, border_radius, dark_mode)
VALUES
  (1, '#FF6B35', '#1A0533', '#FFC300', '#0F0F0F', '#FFFFFF', 'Inter', 'lg', 1);

-- ------------------------------------------------------------
-- Configurações operacionais
-- ------------------------------------------------------------
INSERT IGNORE INTO restaurant_settings
  (restaurant_id, delivery_enabled, delivery_radius_km, delivery_fee, free_delivery_above,
   min_order_value, estimated_delivery_time, pickup_enabled, estimated_pickup_time,
   is_open, auto_accept_orders, whatsapp_number, instagram_url, facebook_url,
   opening_hours)
VALUES (
  1, 1, 10.00, 5.00, 80.00, 25.00, 45, 1, 20, 1, 0,
  '5511999990000',
  'https://instagram.com/burgerhouse',
  'https://facebook.com/burgerhouse',
  JSON_OBJECT(
    'monday',    JSON_OBJECT('enabled', true,  'open', '11:00', 'close', '23:00'),
    'tuesday',   JSON_OBJECT('enabled', true,  'open', '11:00', 'close', '23:00'),
    'wednesday', JSON_OBJECT('enabled', true,  'open', '11:00', 'close', '23:00'),
    'thursday',  JSON_OBJECT('enabled', true,  'open', '11:00', 'close', '23:00'),
    'friday',    JSON_OBJECT('enabled', true,  'open', '11:00', 'close', '00:00'),
    'saturday',  JSON_OBJECT('enabled', true,  'open', '11:00', 'close', '00:00'),
    'sunday',    JSON_OBJECT('enabled', true,  'open', '12:00', 'close', '22:00')
  )
);

-- ------------------------------------------------------------
-- Configurações de pagamento
-- ------------------------------------------------------------
INSERT IGNORE INTO payment_settings
  (restaurant_id, accepts_cash, accepts_credit_card, accepts_debit_card, accepts_pix,
   pix_key, pix_key_type, credit_card_brands)
VALUES
  (1, 1, 1, 1, 1,
   'admin@burgerhouse.com', 'email',
   JSON_ARRAY('visa', 'mastercard', 'elo', 'amex'));

-- ------------------------------------------------------------
-- Configurações WhatsApp
-- ------------------------------------------------------------
INSERT IGNORE INTO whatsapp_settings
  (restaurant_id, is_enabled, phone_number,
   notify_new_order, notify_order_confirmed, notify_order_ready,
   notify_out_for_delivery, notify_delivered,
   template_new_order, template_confirmed, template_ready, template_delivered)
VALUES (
  1, 0, '5511999990000',
  1, 1, 1, 1, 1,
  '🍔 *Novo pedido recebido!*\nPedido: #{order_number}\nTotal: R$ {total}\n\nEstamos preparando seu pedido!',
  '✅ *Pedido confirmado!*\nSeu pedido #{order_number} foi confirmado e está sendo preparado.\nTempo estimado: {estimated_time} minutos.',
  '🎉 *Pedido pronto!*\nSeu pedido #{order_number} está pronto e sairá para entrega em breve!',
  '🏠 *Pedido entregue!*\nSeu pedido #{order_number} foi entregue. Obrigado pela preferência!\nAvalie nosso atendimento: {rating_url}'
);

-- ------------------------------------------------------------
-- Categorias do cardápio
-- ------------------------------------------------------------
INSERT IGNORE INTO categories
  (id, restaurant_id, name, description, position, is_active)
VALUES
  (1, 1, 'Burgers',          'Nossos hambúrgueres artesanais',                  1, 1),
  (2, 1, 'Combos',           'Burgers + batata + bebida com preço especial',     2, 1),
  (3, 1, 'Bebidas',          'Refrigerantes, sucos, cervejas e milkshakes',      3, 1),
  (4, 1, 'Acompanhamentos',  'Batatas, onion rings e outros acompanhamentos',    4, 1),
  (5, 1, 'Sobremesas',       'Doces e sobremesas para finalizar',                5, 1);

-- ------------------------------------------------------------
-- Produtos
-- ------------------------------------------------------------
INSERT IGNORE INTO products
  (id, restaurant_id, category_id, name, description,
   price, promotional_price, is_available, is_featured,
   serves_how_many, preparation_time, position, tags)
VALUES
  -- Burgers
  (1, 1, 1, 'Classic Burger',
   'Pão brioche tostado, 180g de carne angus, queijo cheddar, alface americana, tomate e molho especial da casa.',
   28.90, NULL, 1, 1, 1, 15, 1, JSON_ARRAY('destaque')),

  (2, 1, 1, 'Double Smash',
   'Dois smash burgers de 90g cada, queijo americano duplo, picles artesanal e nosso molho secreto.',
   34.90, 29.90, 1, 1, 1, 18, 2, JSON_ARRAY('mais-vendido', 'promocao')),

  (3, 1, 1, 'BBQ Bacon King',
   'Hambúrguer 200g Black Angus, bacon crocante, queijo gouda, cebola caramelizada e molho BBQ defumado.',
   38.90, NULL, 1, 0, 1, 20, 3, JSON_ARRAY('premium')),

  (4, 1, 1, 'Veggie Burger',
   'Hambúrguer de grão-de-bico e quinoa, queijo minas, rúcula fresca, tomate seco e aioli de ervas.',
   32.90, NULL, 1, 0, 1, 15, 4, JSON_ARRAY('vegetariano', 'sem-gluten')),

  (5, 1, 1, 'Frango Crispy',
   'Filé de frango empanado crocante, queijo suíço, alface, tomate e maionese temperada.',
   27.90, NULL, 1, 0, 1, 15, 5, NULL),

  -- Combos
  (6, 1, 2, 'Combo Classic',
   'Classic Burger + Batata Frita G + Refrigerante Lata. Economia garantida!',
   45.90, NULL, 1, 1, 1, 20, 1, JSON_ARRAY('combo', 'destaque')),

  (7, 1, 2, 'Combo Double Smash',
   'Double Smash + Batata Frita G + Refrigerante Lata ou Suco Natural.',
   52.90, NULL, 1, 0, 1, 22, 2, JSON_ARRAY('combo')),

  -- Bebidas
  (8, 1, 3, 'Coca-Cola Lata',
   'Lata 350ml bem gelada. Original, Zero ou Laranja.',
   6.00, NULL, 1, 0, 1, 2, 1, NULL),

  (9, 1, 3, 'Suco Natural',
   'Suco natural 400ml. Laranja, limão, maracujá ou abacaxi com hortelã.',
   9.90, NULL, 1, 0, 1, 5, 2, JSON_ARRAY('natural')),

  (10, 1, 3, 'Cerveja Artesanal',
   'Long neck 355ml. Escolha entre IPA, Amber Ale, Weiss ou Pilsen.',
   15.90, NULL, 1, 0, 1, 2, 3, NULL),

  (11, 1, 3, 'Milkshake',
   'Milkshake cremoso 400ml. Chocolate, baunilha, morango, Oreo ou Nutella.',
   22.90, 18.90, 1, 1, 1, 10, 4, JSON_ARRAY('sobremesa-liquida')),

  -- Acompanhamentos
  (12, 1, 4, 'Batata Frita',
   'Porção crocante de batata frita palito 200g. Acompanha ketchup e maionese.',
   16.90, NULL, 1, 0, 2, 12, 1, NULL),

  (13, 1, 4, 'Batata Rústica',
   'Batata rústica temperada com ervas e alho 200g. Acompanha molho de parmesão.',
   18.90, NULL, 1, 0, 2, 15, 2, NULL),

  (14, 1, 4, 'Onion Rings',
   'Anéis de cebola empanados crocantes (8 unidades). Acompanha molho especial.',
   18.90, NULL, 1, 0, 2, 12, 3, NULL),

  -- Sobremesas
  (15, 1, 5, 'Brownie com Sorvete',
   'Brownie de chocolate quente (120g) com bola de sorvete de creme e calda de chocolate.',
   18.90, NULL, 1, 0, 1, 8, 1, NULL),

  (16, 1, 5, 'Cheesecake',
   'Fatia de cheesecake de frutas vermelhas com calda fresca. 150g.',
   16.90, NULL, 1, 0, 1, 5, 2, NULL);

-- Adicionais do Classic Burger
INSERT IGNORE INTO product_options
  (restaurant_id, product_id, group_name, name, price, is_required, min_quantity, max_quantity, position)
VALUES
  (1, 1, 'Adicional', 'Bacon',           3.00, 0, 0, 3, 1),
  (1, 1, 'Adicional', 'Ovo frito',       2.00, 0, 0, 1, 2),
  (1, 1, 'Adicional', 'Queijo extra',    2.00, 0, 0, 2, 3),
  (1, 1, 'Adicional', 'Cebola crispy',   2.50, 0, 0, 1, 4),
  (1, 1, 'Ponto da carne', 'Ao ponto',   0.00, 1, 1, 1, 1),
  (1, 1, 'Ponto da carne', 'Mal passado',0.00, 1, 1, 1, 2),
  (1, 1, 'Ponto da carne', 'Bem passado',0.00, 1, 1, 1, 3);

-- ------------------------------------------------------------
-- Clientes de exemplo
-- ------------------------------------------------------------
INSERT IGNORE INTO customers
  (id, restaurant_id, name, email, phone, document,
   address, address_number, neighborhood, city, state, zip_code,
   total_orders, total_spent, last_order_at)
VALUES
  (1, 1, 'João Silva',     'joao.silva@gmail.com',    '(11) 98888-1111', '123.456.789-00',
   'Rua Augusta', '1500', 'Consolação', 'São Paulo', 'SP', '01305-100',
   8, 312.50, DATE_SUB(NOW(), INTERVAL 3 DAY)),

  (2, 1, 'Maria Santos',   'maria.santos@hotmail.com', '(11) 97777-2222', '987.654.321-00',
   'Av. Paulista', '900', 'Bela Vista', 'São Paulo', 'SP', '01310-100',
   5, 189.70, DATE_SUB(NOW(), INTERVAL 1 DAY)),

  (3, 1, 'Pedro Costa',    NULL,                       '(11) 96666-3333', NULL,
   'Rua Oscar Freire', '300', 'Jardins', 'São Paulo', 'SP', '01426-001',
   2, 78.80, DATE_SUB(NOW(), INTERVAL 7 DAY)),

  (4, 1, 'Ana Ferreira',   'ana.f@gmail.com',          '(11) 95555-4444', NULL,
   'Rua Haddock Lobo', '200', 'Cerqueira César', 'São Paulo', 'SP', '01414-003',
   1, 45.90, DATE_SUB(NOW(), INTERVAL 14 DAY)),

  (5, 1, 'Carlos Oliveira', 'carlos.o@email.com',      '(11) 94444-5555', '456.789.123-00',
   'Al. Santos', '700', 'Jardim Paulista', 'São Paulo', 'SP', '01419-001',
   3, 124.70, DATE_SUB(NOW(), INTERVAL 2 DAY));

-- ------------------------------------------------------------
-- Entregadores de exemplo
-- ------------------------------------------------------------
INSERT IGNORE INTO delivery_drivers
  (id, restaurant_id, name, phone, vehicle_type, vehicle_model, license_plate,
   is_available, is_active, total_deliveries, rating, rating_count)
VALUES
  (1, 1, 'Carlos Moto',    '(11) 95555-6666', 'motorcycle', 'Honda Biz 125', 'ABC-1D34', 1, 1, 250, 4.85, 230),
  (2, 1, 'Ana Bike',       '(11) 94444-7777', 'bicycle',    'Caloi 10',       NULL,       1, 1, 120, 4.92, 110),
  (3, 1, 'Roberto Carro',  '(11) 93333-8888', 'car',        'Fiat Argo',      'XYZ-5E67', 0, 1,  80, 4.70,  75),
  (4, 1, 'Lucas Moto',     '(11) 92222-9999', 'motorcycle', 'Yamaha Fazer',   'DEF-2F89', 0, 0,  15, 4.60,  12);

-- ------------------------------------------------------------
-- Pedidos de exemplo
-- ------------------------------------------------------------
INSERT IGNORE INTO orders
  (id, restaurant_id, customer_id, driver_id, order_number, order_type, source,
   status, payment_method, payment_status,
   subtotal, delivery_fee, discount, total,
   delivery_address, delivery_number, delivery_neighborhood, delivery_city, delivery_state,
   estimated_time, notes, accepted_at, preparing_at, ready_at, dispatched_at, created_at)
VALUES
  (1, 1, 1, 1, 'BH-001', 'delivery', 'panel',
   'out_for_delivery', 'pix', 'paid',
   63.80, 5.00, 0.00, 68.80,
   'Rua Augusta', '1500', 'Consolação', 'São Paulo', 'SP',
   40, 'Sem cebola no burger, por favor.',
   DATE_SUB(NOW(), INTERVAL 35 MINUTE),
   DATE_SUB(NOW(), INTERVAL 30 MINUTE),
   DATE_SUB(NOW(), INTERVAL 10 MINUTE),
   DATE_SUB(NOW(), INTERVAL 5 MINUTE),
   DATE_SUB(NOW(), INTERVAL 40 MINUTE)),

  (2, 1, 2, NULL, 'BH-002', 'delivery', 'whatsapp',
   'preparing', 'cash', 'pending',
   45.90, 5.00, 0.00, 50.90,
   'Av. Paulista', '900', 'Bela Vista', 'São Paulo', 'SP',
   45, NULL,
   DATE_SUB(NOW(), INTERVAL 15 MINUTE),
   DATE_SUB(NOW(), INTERVAL 10 MINUTE),
   NULL, NULL,
   DATE_SUB(NOW(), INTERVAL 18 MINUTE)),

  (3, 1, 3, NULL, 'BH-003', 'pickup', 'panel',
   'confirmed', 'credit_card', 'paid',
   34.90, 0.00, 5.00, 29.90,
   NULL, NULL, NULL, NULL, NULL,
   20, 'Combo sem batata.',
   DATE_SUB(NOW(), INTERVAL 5 MINUTE),
   NULL, NULL, NULL,
   DATE_SUB(NOW(), INTERVAL 8 MINUTE)),

  (4, 1, 5, NULL, 'BH-004', 'delivery', 'site',
   'pending', 'pix', 'pending',
   52.90, 5.00, 0.00, 57.90,
   'Al. Santos', '700', 'Jardim Paulista', 'São Paulo', 'SP',
   50, NULL,
   NULL, NULL, NULL, NULL,
   DATE_SUB(NOW(), INTERVAL 2 MINUTE)),

  (5, 1, 1, 1, 'BH-000', 'delivery', 'panel',
   'delivered', 'pix', 'paid',
   38.90, 5.00, 0.00, 43.90,
   'Rua Augusta', '1500', 'Consolação', 'São Paulo', 'SP',
   40, NULL,
   DATE_SUB(NOW(), INTERVAL 3 HOUR),
   DATE_SUB(NOW(), INTERVAL 170 MINUTE),
   DATE_SUB(NOW(), INTERVAL 150 MINUTE),
   DATE_SUB(NOW(), INTERVAL 120 MINUTE),
   DATE_SUB(NOW(), INTERVAL 3 HOUR));

-- Itens dos pedidos
INSERT IGNORE INTO order_items
  (order_id, restaurant_id, product_id, product_name, quantity, unit_price, total_price)
VALUES
  -- Pedido BH-001
  (1, 1, 2, 'Double Smash',    1, 29.90, 29.90),
  (1, 1, 6, 'Combo Classic',   1, 45.90, 45.90), -- erro intencional seria sum, mas para seed ok
  -- Pedido BH-002
  (2, 1, 6, 'Combo Classic',   1, 45.90, 45.90),
  -- Pedido BH-003
  (3, 1, 2, 'Double Smash',    1, 29.90, 29.90),
  (3, 1, 8, 'Coca-Cola Lata',  1,  6.00,  6.00),
  -- Pedido BH-004
  (4, 1, 7, 'Combo Double Smash', 1, 52.90, 52.90),
  -- Pedido BH-000
  (5, 1, 3, 'BBQ Bacon King',  1, 38.90, 38.90);

-- Logs de status dos pedidos
INSERT IGNORE INTO order_status_logs
  (order_id, restaurant_id, user_id, from_status, to_status, notes, created_at)
VALUES
  (1, 1, 1, NULL,              'pending',          'Pedido criado',           DATE_SUB(NOW(), INTERVAL 40 MINUTE)),
  (1, 1, 1, 'pending',         'confirmed',        'Pedido confirmado',        DATE_SUB(NOW(), INTERVAL 35 MINUTE)),
  (1, 1, 1, 'confirmed',       'preparing',        'Em preparo na cozinha',    DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
  (1, 1, 1, 'preparing',       'ready',            'Pronto para entrega',      DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
  (1, 1, 1, 'ready',           'out_for_delivery', 'Saiu com Carlos Moto',     DATE_SUB(NOW(), INTERVAL  5 MINUTE)),
  (2, 1, 1, NULL,              'pending',          'Pedido criado via WhatsApp',DATE_SUB(NOW(), INTERVAL 18 MINUTE)),
  (2, 1, 1, 'pending',         'confirmed',        NULL,                       DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
  (2, 1, 1, 'confirmed',       'preparing',        NULL,                       DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
  (3, 1, 1, NULL,              'pending',          'Pedido para retirada',     DATE_SUB(NOW(), INTERVAL  8 MINUTE)),
  (3, 1, 1, 'pending',         'confirmed',        NULL,                       DATE_SUB(NOW(), INTERVAL  5 MINUTE)),
  (4, 1, 1, NULL,              'pending',          'Pedido criado',            DATE_SUB(NOW(), INTERVAL  2 MINUTE)),
  (5, 1, 1, NULL,              'pending',          NULL,                       DATE_SUB(NOW(), INTERVAL 3 HOUR)),
  (5, 1, 1, 'pending',         'confirmed',        NULL,                       DATE_SUB(NOW(), INTERVAL 175 MINUTE)),
  (5, 1, 1, 'confirmed',       'preparing',        NULL,                       DATE_SUB(NOW(), INTERVAL 170 MINUTE)),
  (5, 1, 1, 'preparing',       'ready',            NULL,                       DATE_SUB(NOW(), INTERVAL 150 MINUTE)),
  (5, 1, 1, 'ready',           'out_for_delivery', NULL,                       DATE_SUB(NOW(), INTERVAL 120 MINUTE)),
  (5, 1, 1, 'out_for_delivery','delivered',        'Entregue com sucesso',     DATE_SUB(NOW(), INTERVAL  90 MINUTE));

-- Log de sistema inicial
INSERT IGNORE INTO system_logs
  (restaurant_id, user_id, level, category, action, message, context)
VALUES
  (NULL, NULL, 'info',  'system',  'system.started',    'MeuDeliveryAI iniciado com sucesso', JSON_OBJECT('version', '2.0.0')),
  (1,    1,    'info',  'auth',    'user.login',         'Usuário autenticado', JSON_OBJECT('email', 'admin@burgerhouse.com')),
  (1,    1,    'info',  'order',   'order.created',      'Novo pedido criado', JSON_OBJECT('order_number', 'BH-004', 'total', 57.90));

-- ============================================================
-- FIM DO SCHEMA
-- ============================================================
