/**
 * Validação das variáveis de ambiente obrigatórias
 * Lança erro se alguma variável crítica estiver faltando
 */

// Normalizar variáveis DATABASE_* (Render / MySQL Externo) para DB_*
if (process.env.DATABASE_HOST) process.env.DB_HOST = process.env.DATABASE_HOST;
if (process.env.DATABASE_USER) process.env.DB_USER = process.env.DATABASE_USER;
if (process.env.DATABASE_PASSWORD) process.env.DB_PASSWORD = process.env.DATABASE_PASSWORD;
if (process.env.DATABASE_NAME) process.env.DB_NAME = process.env.DATABASE_NAME;
if (process.env.DATABASE_PORT) process.env.DB_PORT = process.env.DATABASE_PORT;

const requiredVars = [
  'DB_HOST',
  'DB_USER',
  'DB_NAME',
  'JWT_SECRET',
];

const missingVars = requiredVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  console.error('❌ Variáveis de ambiente obrigatórias não encontradas:');
  missingVars.forEach((v) => console.error(`   - ${v}`));
  console.error('\n💡 Copie o arquivo .env.example para .env e preencha os valores.');
  throw new Error(`Variáveis de ambiente faltando: ${missingVars.join(', ')}`);
}

// Validações de formato
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.warn('⚠️  JWT_SECRET muito curto. Use pelo menos 32 caracteres em produção.');
}

if (process.env.NODE_ENV === 'production') {
  if (process.env.JWT_SECRET === 'your_super_secret_jwt_key_change_in_production') {
    throw new Error('❌ JWT_SECRET padrão detectado em produção! Altere para uma chave segura.');
  }
  if (!process.env.DB_PASSWORD) {
    console.warn('⚠️  DB_PASSWORD vazio em produção. Configure uma senha forte.');
  }
}

console.log('✅ Variáveis de ambiente validadas com sucesso!');

module.exports = {
  port: parseInt(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
  },
  cors: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
    dir: process.env.UPLOAD_DIR || 'uploads',
  },
};
