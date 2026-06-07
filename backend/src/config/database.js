const mysql = require('mysql2/promise');

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

// 4. Logs seguros no startup (sem exibir senha)
console.log('🔌 Conectando ao MySQL com as seguintes configurações:');
console.log(`   Host:     ${process.env.DB_HOST || 'não definido'}`);
console.log(`   Port:     ${process.env.DB_PORT || '3306'}`);
console.log(`   User:     ${process.env.DB_USER || 'não definido'}`);
console.log(`   Database: ${process.env.DB_NAME || 'não definido'}`);

// 5. Suporte SSL para bancos em nuvem (Render, Railway, Aiven, etc.)
const sslConfig = process.env.DB_SSL === 'true' || process.env.DATABASE_SSL === 'true' || process.env.MYSQL_PUBLIC_URL || process.env.DATABASE_URL
  ? { rejectUnauthorized: false }
  : undefined;

// 6. Criação do pool conforme regras de produção (mysql2)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
  timezone: '-03:00',
  ssl: sslConfig,
});

/**
 * Executa uma query SQL com prepared statements
 * @param {string} sql - Query SQL
 * @param {Array} params - Parâmetros da query
 * @returns {Promise<Array>} Resultado da query
 */
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Testa a conexão com o banco de dados
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexão com MySQL estabelecida com sucesso!');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Falha ao conectar no MySQL. Verifique DB_HOST, DB_PORT, DB_USER, DB_PASSWORD e DB_NAME.');
    console.error(`   Detalhes do erro: ${error.message}`);
    throw error;
  }
}

/**
 * Inicia uma transação
 * @returns {Promise<Connection>} Conexão com transação ativa
 */
async function beginTransaction() {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  return connection;
}

/**
 * Executa query dentro de uma transação
 * @param {Connection} connection
 * @param {string} sql
 * @param {Array} params
 */
async function queryTransaction(connection, sql, params = []) {
  const [rows] = await connection.execute(sql, params);
  return rows;
}

module.exports = {
  pool,
  query,
  testConnection,
  beginTransaction,
  queryTransaction,
};
