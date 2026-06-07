const mysql = require('mysql2/promise');

// Normalizar variáveis DATABASE_* (Render / MySQL Externo) para DB_*
if (process.env.DATABASE_HOST) process.env.DB_HOST = process.env.DATABASE_HOST;
if (process.env.DATABASE_USER) process.env.DB_USER = process.env.DATABASE_USER;
if (process.env.DATABASE_PASSWORD) process.env.DB_PASSWORD = process.env.DATABASE_PASSWORD;
if (process.env.DATABASE_NAME) process.env.DB_NAME = process.env.DATABASE_NAME;
if (process.env.DATABASE_PORT) process.env.DB_PORT = process.env.DATABASE_PORT;

// Suporte a SSL para bancos de dados gerenciados/externos na nuvem (como Render, AWS RDS, etc.)
const sslConfig = process.env.DB_SSL === 'true' || process.env.DATABASE_SSL === 'true'
  ? { rejectUnauthorized: false }
  : undefined;

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'meudeliveryai',
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
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
    console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com MySQL:', error.message);
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
