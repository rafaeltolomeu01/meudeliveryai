/**
 * scripts/setup-db.js
 * Script para configurar automaticamente o banco de dados e aplicar o schema.sql
 */
'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Carrega as variáveis de ambiente
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Parse de URL de Conexão se fornecida (MYSQL_PUBLIC_URL ou DATABASE_URL)
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
    console.error('❌ Erro ao decodificar URL do banco de dados (setup-db):', e.message);
  }
} else {
  // Normalização alternativa das variáveis DATABASE_* para DB_*
  if (process.env.DATABASE_HOST) process.env.DB_HOST = process.env.DATABASE_HOST;
  if (process.env.DATABASE_USER) process.env.DB_USER = process.env.DATABASE_USER;
  if (process.env.DATABASE_PASSWORD) process.env.DB_PASSWORD = process.env.DATABASE_PASSWORD;
  if (process.env.DATABASE_NAME) process.env.DB_NAME = process.env.DATABASE_NAME;
  if (process.env.DATABASE_PORT) process.env.DB_PORT = process.env.DATABASE_PORT;
}

// Validação de produção: Não permitir localhost
if (process.env.NODE_ENV === 'production') {
  const host = process.env.DB_HOST;
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    throw new Error('❌ Segurança: Não é permitido usar localhost ou 127.0.0.1 como DB_HOST em ambiente de produção.');
  }
}

async function setup() {
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'meudeliveryai';

  console.log('🔄 Iniciando setup do banco de dados...');
  console.log(`   Host:     ${host}`);
  console.log(`   Port:     ${port}`);
  console.log(`   User:     ${user}`);
  console.log(`   Database: ${database}`);

  // Suporte SSL para bancos em nuvem (Render, Railway, Aiven, etc.)
  const sslConfig = process.env.DB_SSL === 'true' || process.env.DATABASE_SSL === 'true' || urlString
    ? { rejectUnauthorized: false }
    : undefined;

  let connection;
  try {
    // 1. Conectar sem especificar banco para verificar/criar o banco
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      ssl: sslConfig
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.end();

    // 2. Conectar ao banco de dados especificado
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true,
      ssl: sslConfig
    });

    // Ler schema.sql
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Arquivo de schema não encontrado: ${schemaPath}`);
    }

    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('🔄 Executando scripts de criação do banco de dados (schema.sql)...');
    await connection.query(sql);
    console.log('✅ Banco de dados configurado e populado com sucesso (sem apagar dados antigos)!');
    
  } catch (err) {
    console.error('❌ Falha ao conectar no MySQL. Verifique DB_HOST, DB_PORT, DB_USER, DB_PASSWORD e DB_NAME.');
    console.error(`   Erro: ${err.message}`);
    throw err;
  } finally {
    if (connection && connection.end) {
      try {
        await connection.end();
      } catch (_) {}
    }
  }
}

// Se executado diretamente pelo terminal
if (require.main === module) {
  setup().catch(() => process.exit(1));
}

module.exports = setup;
