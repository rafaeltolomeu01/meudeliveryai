// ============================================================
//  MeuDeliveryAI — Script de Migração do Banco de Dados
//  Uso: npm run db:migrate
// ============================================================
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs   = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const SQL_FILE = path.join(__dirname, 'db.sql');

// Tabelas na ordem esperada de criação (para log)
const EXPECTED_TABLES = [
  'plans',
  'restaurants',
  'subscriptions',
  'users',
  'restaurant_theme',
  'restaurant_settings',
  'payment_settings',
  'whatsapp_settings',
  'categories',
  'products',
  'product_options',
  'customers',
  'delivery_drivers',
  'orders',
  'order_items',
  'order_status_logs',
  'order_messages',
  'system_logs',
];

async function migrate() {
  // 1. Parse de URL de Conexão se fornecida (MYSQL_PUBLIC_URL ou DATABASE_URL)
  const urlString = process.env.MYSQL_PUBLIC_URL || process.env.DATABASE_URL;
  if (urlString) {
    try {
      const parsedUrl = new URL(urlString);
      process.env.DB_HOST = parsedUrl.hostname;
      process.env.DB_PORT = parsedUrl.port || '3306';
      process.env.DB_USER = parsedUrl.username;
      process.env.DB_PASSWORD = decodeURIComponent(parsedUrl.password);
      process.env.DB_NAME = parsedUrl.pathname.replace(/^\//, '');
    } catch (e) {
      console.error('❌ Erro ao decodificar URL do banco de dados (MYSQL_PUBLIC_URL / DATABASE_URL):', e.message);
    }
  } else {
    // 2. Normalização alternativa das variáveis DATABASE_* para DB_*
    if (process.env.DATABASE_HOST) process.env.DB_HOST = process.env.DATABASE_HOST;
    if (process.env.DATABASE_USER) process.env.DB_USER = process.env.DATABASE_USER;
    if (process.env.DATABASE_PASSWORD) process.env.DB_PASSWORD = process.env.DATABASE_PASSWORD;
    if (process.env.DATABASE_NAME) process.env.DB_NAME = process.env.DATABASE_NAME;
    if (process.env.DATABASE_PORT) process.env.DB_PORT = process.env.DATABASE_PORT;
  }

  // 3. Validação de produção: Não permitir localhost
  if (process.env.NODE_ENV === 'production') {
    const host = process.env.DB_HOST;
    if (!host || host === 'localhost' || host === '127.0.0.1') {
      throw new Error('❌ Segurança: Não é permitido usar localhost ou 127.0.0.1 como DB_HOST em ambiente de produção.');
    }
  }

  // 4. Suporte SSL para bancos em nuvem (Render, Railway, Aiven, etc.)
  const sslConfig = process.env.DB_SSL === 'true' || process.env.DATABASE_SSL === 'true' || process.env.MYSQL_PUBLIC_URL || process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : undefined;

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║       MeuDeliveryAI — Migração do Banco          ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Host    : ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
  console.log(`  Database: ${process.env.DB_NAME || 'meudeliveryai'}`);
  console.log(`  User    : ${process.env.DB_USER || 'root'}`);
  console.log('');

  let connection;

  try {
    // ── 1. Cria o banco se não existir ──────────────────────
    const rootConn = await mysql.createConnection({
      host    : process.env.DB_HOST     || 'localhost',
      port    : parseInt(process.env.DB_PORT) || 3306,
      user    : process.env.DB_USER     || 'root',
      password: process.env.DB_PASSWORD || '',
      charset : 'utf8mb4',
      ssl     : sslConfig,
    });

    const dbName = process.env.DB_NAME || 'meudeliveryai';
    await rootConn.execute(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\`
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`  ✅ Database '${dbName}' verificado/criado.`);
    await rootConn.end();

    // ── 2. Conecta ao banco criado ───────────────────────────
    connection = await mysql.createConnection({
      host              : process.env.DB_HOST     || 'localhost',
      port              : parseInt(process.env.DB_PORT) || 3306,
      user              : process.env.DB_USER     || 'root',
      password          : process.env.DB_PASSWORD || '',
      database          : dbName,
      charset           : 'utf8mb4',
      multipleStatements: true,
      ssl               : sslConfig,
    });
    console.log('  ✅ Conexão com o banco estabelecida.');

    // ── 3. Lê o arquivo SQL ──────────────────────────────────
    if (!fs.existsSync(SQL_FILE)) {
      throw new Error(`Arquivo SQL não encontrado: ${SQL_FILE}`);
    }

    const sql = fs.readFileSync(SQL_FILE, 'utf8');
    console.log('  ✅ Arquivo db.sql carregado.');

    // ── 4. Executa o schema ──────────────────────────────────
    console.log('');
    console.log('  🔄 Executando schema...');
    await connection.query(sql);
    console.log('  ✅ Schema executado com sucesso!');

    // ── 4b. Executa alterações incrementais se necessário ─────
    try {
      console.log('  🔄 Verificando e atualizando colunas incrementais de restaurant_settings...');
      const [columnsCheck] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'restaurant_settings'
      `, [dbName]);
      const columns = columnsCheck.map(c => c.COLUMN_NAME);

      if (!columns.includes('accept_orders_when_closed')) {
        await connection.query('ALTER TABLE restaurant_settings ADD COLUMN accept_orders_when_closed TINYINT(1) NOT NULL DEFAULT 0');
        console.log('     + Coluna accept_orders_when_closed adicionada.');
      }
      if (!columns.includes('welcome_message')) {
        await connection.query('ALTER TABLE restaurant_settings ADD COLUMN welcome_message TEXT');
        console.log('     + Coluna welcome_message adicionada.');
      }
      if (!columns.includes('order_confirmed_message')) {
        await connection.query('ALTER TABLE restaurant_settings ADD COLUMN order_confirmed_message TEXT');
        console.log('     + Coluna order_confirmed_message adicionada.');
      }
      if (!columns.includes('order_dispatched_message')) {
        await connection.query('ALTER TABLE restaurant_settings ADD COLUMN order_dispatched_message TEXT');
        console.log('     + Coluna order_dispatched_message adicionada.');
      }
      if (!columns.includes('support_phone')) {
        await connection.query('ALTER TABLE restaurant_settings ADD COLUMN support_phone VARCHAR(20)');
        console.log('     + Coluna support_phone adicionada.');
      }

      console.log('  🔄 Verificando e atualizando colunas incrementais de payment_settings...');
      const [payColumnsCheck] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'payment_settings'
      `, [dbName]);
      const payColumns = payColumnsCheck.map(c => c.COLUMN_NAME);

      if (!payColumns.includes('pix_receiver_name')) {
        await connection.query('ALTER TABLE payment_settings ADD COLUMN pix_receiver_name VARCHAR(255) DEFAULT NULL AFTER pix_key_type');
        console.log('     + Coluna pix_receiver_name adicionada.');
      }
      if (!payColumns.includes('pix_receiver_city')) {
        await connection.query('ALTER TABLE payment_settings ADD COLUMN pix_receiver_city VARCHAR(100) DEFAULT NULL AFTER pix_receiver_name');
        console.log('     + Coluna pix_receiver_city adicionada.');
      }
      if (!payColumns.includes('pix_instructions')) {
        await connection.query('ALTER TABLE payment_settings ADD COLUMN pix_instructions TEXT DEFAULT NULL AFTER pix_receiver_city');
        console.log('     + Coluna pix_instructions adicionada.');
      }

      console.log('  🔄 Verificando e criando tabela de chat (order_messages)...');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS order_messages (
          id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          order_id      INT UNSIGNED NOT NULL,
          restaurant_id INT UNSIGNED NOT NULL,
          sender_type   ENUM('customer', 'merchant', 'system') NOT NULL,
          message       TEXT NOT NULL,
          created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_order (order_id),
          INDEX idx_restaurant (restaurant_id),
          INDEX idx_created_at (created_at),
          FOREIGN KEY (order_id)      REFERENCES orders(id)      ON DELETE CASCADE,
          FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('     + Tabela order_messages verificada/criada.');

      console.log('  🔄 Verificando e atualizando colunas incrementais de categories...');
      const [catColumnsCheck] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'categories'
      `, [dbName]);
      const catColumns = catColumnsCheck.map(c => c.COLUMN_NAME);

      if (!catColumns.includes('icon')) {
        await connection.query('ALTER TABLE categories ADD COLUMN icon VARCHAR(255) DEFAULT NULL');
        console.log('     + Coluna icon adicionada.');
      }
      if (!catColumns.includes('color')) {
        await connection.query('ALTER TABLE categories ADD COLUMN color VARCHAR(7) DEFAULT NULL');
        console.log('     + Coluna color adicionada.');
      }

      console.log('  🔄 Verificando e atualizando colunas incrementais de products...');
      const [prodColumnsCheck] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products'
      `, [dbName]);
      const prodColumns = prodColumnsCheck.map(c => c.COLUMN_NAME);

      if (!prodColumns.includes('images')) {
        await connection.query('ALTER TABLE products ADD COLUMN images JSON DEFAULT NULL');
        console.log('     + Coluna images adicionada.');
      }

      console.log('  🔄 Verificando e atualizando colunas incrementais de customers...');
      const [custColumnsCheck] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'customers'
      `, [dbName]);
      const custColumns = custColumnsCheck.map(c => c.COLUMN_NAME);

      if (!custColumns.includes('password_hash')) {
        await connection.query('ALTER TABLE customers ADD COLUMN password_hash VARCHAR(255) DEFAULT NULL');
        console.log('     + Coluna password_hash adicionada.');
      }

      console.log('  🔄 Verificando e criando tabelas de complementos...');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS complement_groups (
          id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          restaurant_id INT UNSIGNED NOT NULL,
          name          VARCHAR(255) NOT NULL,
          description   TEXT,
          is_required   TINYINT(1) NOT NULL DEFAULT 0,
          min_quantity  INT NOT NULL DEFAULT 0,
          max_quantity  INT NOT NULL DEFAULT 1,
          is_active     TINYINT(1) NOT NULL DEFAULT 1,
          position      INT NOT NULL DEFAULT 0,
          created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('     + Tabela complement_groups verificada/criada.');

      await connection.query(`
        CREATE TABLE IF NOT EXISTS complement_items (
          id                  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          complement_group_id INT UNSIGNED NOT NULL,
          name                VARCHAR(255) NOT NULL,
          price               DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          is_active           TINYINT(1) NOT NULL DEFAULT 1,
          max_quantity        INT NOT NULL DEFAULT 1,
          position            INT NOT NULL DEFAULT 0,
          created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (complement_group_id) REFERENCES complement_groups(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('     + Tabela complement_items verificada/criada.');

      await connection.query(`
        CREATE TABLE IF NOT EXISTS product_complements (
          product_id          INT UNSIGNED NOT NULL,
          complement_group_id INT UNSIGNED NOT NULL,
          PRIMARY KEY (product_id, complement_group_id),
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          FOREIGN KEY (complement_group_id) REFERENCES complement_groups(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('     + Tabela product_complements verificada/criada.');

      console.log('  🔄 Verificando e criando tabela de endereços de clientes...');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS customer_addresses (
          id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          customer_id   INT UNSIGNED NOT NULL,
          zip_code      VARCHAR(20) NOT NULL,
          street        VARCHAR(255) NOT NULL,
          number        VARCHAR(50) NOT NULL,
          complement    VARCHAR(255),
          neighborhood  VARCHAR(255) NOT NULL,
          city          VARCHAR(100) NOT NULL,
          state         CHAR(2) NOT NULL,
          reference     VARCHAR(255),
          is_default    TINYINT(1) NOT NULL DEFAULT 0,
          created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('     + Tabela customer_addresses verificada/criada.');
    } catch (colErr) {
      console.warn('  ⚠️ Aviso ao tentar atualizar colunas incrementais:', colErr.message);
    }

    // ── 5. Lista tabelas criadas ─────────────────────────────
    const [rows] = await connection.execute('SHOW TABLES');
    const created = rows.map((r) => Object.values(r)[0]);

    console.log('');
    console.log('  📋 Tabelas no banco:');

    EXPECTED_TABLES.forEach((tbl) => {
      const ok = created.includes(tbl);
      console.log(`     ${ok ? '✓' : '✗'} ${tbl}${ok ? '' : '  ← NÃO ENCONTRADA'}`);
    });

    // Exibe tabelas extras não esperadas
    const extras = created.filter((t) => !EXPECTED_TABLES.includes(t));
    if (extras.length > 0) {
      extras.forEach((t) => console.log(`     ℹ️  ${t}  (extra)`));
    }

    // ── 6. Verifica dados de seed ────────────────────────────
    const [[planCount]]    = await connection.execute('SELECT COUNT(*) AS n FROM plans');
    const [[restCount]]    = await connection.execute('SELECT COUNT(*) AS n FROM restaurants');
    const [[userCount]]    = await connection.execute('SELECT COUNT(*) AS n FROM users');
    const [[prodCount]]    = await connection.execute('SELECT COUNT(*) AS n FROM products');
    const [[orderCount]]   = await connection.execute('SELECT COUNT(*) AS n FROM orders');

    console.log('');
    console.log('  📊 Dados de seed:');
    console.log(`     Planos SaaS : ${planCount.n}`);
    console.log(`     Restaurantes: ${restCount.n}`);
    console.log(`     Usuários    : ${userCount.n}`);
    console.log(`     Produtos    : ${prodCount.n}`);
    console.log(`     Pedidos     : ${orderCount.n}`);

    // ── 7. Resultado final ───────────────────────────────────
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   🎉  Migração concluída com sucesso!            ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
    console.log('  💡 Credenciais de acesso demo:');
    console.log('     Email: admin@burgerhouse.com');
    console.log('     Senha: Admin@123');
    console.log('');
    console.log('  🚀 Para iniciar o servidor:');
    console.log('     npm run dev');
    console.log('');

  } catch (err) {
    console.error('');
    console.error('  ❌ ERRO durante a migração:');
    console.error(`     ${err.message}`);

    if (err.code === 'ECONNREFUSED') {
      console.error('');
      console.error('  💡 O MySQL não está rodando ou está em outra porta.');
      console.error('     Verifique DB_HOST e DB_PORT no .env');
    }
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('');
      console.error('  💡 Credenciais incorretas.');
      console.error('     Verifique DB_USER e DB_PASSWORD no .env');
    }
    if (err.code === 'ER_PARSE_ERROR') {
      console.error('');
      console.error('  💡 Erro de sintaxe no SQL. Verifique o arquivo db.sql.');
    }

    console.error('');
    process.exit(1);

  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  migrate();
}

module.exports = { migrate };
