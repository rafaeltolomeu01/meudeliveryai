/**
 * script: create-admin-geral.js
 * Uso: node src/scripts/create-admin-geral.js "<nome>" "<email>" "<senha>"
 * Exemplo: node src/scripts/create-admin-geral.js "Admin Geral" admin@meudeliveryai.com SenhaSegura123
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const bcrypt = require('bcryptjs');
const { query, testConnection } = require('../config/database');

// Normalizar variáveis DATABASE_* (Render / MySQL Externo) para DB_*
if (process.env.DATABASE_HOST) process.env.DB_HOST = process.env.DATABASE_HOST;
if (process.env.DATABASE_USER) process.env.DB_USER = process.env.DATABASE_USER;
if (process.env.DATABASE_PASSWORD) process.env.DB_PASSWORD = process.env.DATABASE_PASSWORD;
if (process.env.DATABASE_NAME) process.env.DB_NAME = process.env.DATABASE_NAME;
if (process.env.DATABASE_PORT) process.env.DB_PORT = process.env.DATABASE_PORT;

async function run() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('\n❌ Argumentos insuficientes!');
    console.log('Uso: node src/scripts/create-admin-geral.js "<nome>" "<email>" "<senha>"');
    console.log('Exemplo: node src/scripts/create-admin-geral.js "Admin Geral" admin@meudeliveryai.com SenhaSegura123\n');
    process.exit(1);
  }

  const [name, email, password] = args;

  try {
    // Testar conexão
    await testConnection();

    // Verificar se email já existe
    const existing = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) {
      console.error(`\n❌ Erro: O e-mail "${email}" já está cadastrado no sistema.`);
      process.exit(1);
    }

    // Hash da senha
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Inserir administrador geral (restaurant_id = NULL)
    const result = await query(
      `INSERT INTO users (restaurant_id, name, email, password_hash, role, status)
       VALUES (NULL, ?, ?, ?, 'admin_geral', 'active')`,
      [name, email, passwordHash]
    );

    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║   🎉  Administrador Geral criado com sucesso!    ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log(`  ID    : ${result.insertId}`);
    console.log(`  Nome  : ${name}`);
    console.log(`  E-mail: ${email}`);
    console.log(`  Perfil: admin_geral`);
    console.log('');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro ao criar Administrador Geral:', error.message);
    process.exit(1);
  }
}

run();
