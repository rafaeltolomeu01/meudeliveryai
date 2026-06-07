require('dotenv').config();
require('./src/config/env');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const routes = require('./src/routes/index');
const errorHandler = require('./src/middlewares/errorHandler');
const { testConnection } = require('./src/config/database');

const app = express();

// ─── Security Middlewares ────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body Parser ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logger ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas requisições. Tente novamente em 15 minutos.' },
});
app.use('/api/', generalLimiter);

// ─── Static Files (Uploads) ──────────────────────────────────────────────────
const uploadDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
app.use('/uploads', express.static(uploadDir));

// ─── Serve Frontend Static Files ─────────────────────────────────────────────
const frontendDistDir = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistDir));

// ─── API Welcome Route ────────────────────────────────────────────────────────
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'MeuDeliveryAI API está online e rodando com sucesso!',
    docs: '/api/health'
  });
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'MeuDeliveryAI API está funcionando!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

const healthCheckHandler = async (req, res) => {
  try {
    const db = require('./src/config/database');
    await db.query('SELECT 1');
    return res.json({
      success: true,
      status: "ok",
      database: "connected",
      environment: process.env.NODE_ENV || 'production'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: "error",
      database: "disconnected",
      environment: process.env.NODE_ENV || 'production'
    });
  }
};

app.get('/api/health', healthCheckHandler);
app.get('/api/v1/health', healthCheckHandler);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// ─── SPA Fallback Route ───────────────────────────────────────────────────────
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  const indexPath = path.join(frontendDistDir, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).json({
        success: true,
        message: 'MeuDeliveryAI API está online e rodando. O frontend ainda está compilando ou não foi encontrado.',
        docs: '/api/health'
      });
    }
  });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await testConnection();

    // Auto-setup se o banco estiver vazio (sem tabelas)
    try {
      const { query } = require('./src/config/database');
      const tables = await query('SHOW TABLES');
      if (tables.length === 0) {
        console.log('⚠️  Banco de dados detectado como vazio (sem tabelas). Iniciando setup automático...');
        const setupDb = require('./scripts/setup-db');
        await setupDb();
      } else {
        console.log(`📊 Banco de dados existente detectado com ${tables.length} tabelas.`);
      }
    } catch (dbErr) {
      console.warn('⚠️  Aviso ao verificar tabelas para auto-setup:', dbErr.message);
    }

    // Executar migrações incrementais automáticas
    try {
      console.log('🔄 Executando migrações incrementais do banco de dados...');
      const { migrate } = require('./src/models/migrate');
      await migrate();
    } catch (migErr) {
      console.warn('⚠️  Erro ou aviso durante a execução de migrações automáticas:', migErr.message);
    }

    app.listen(PORT, () => {
      console.log('');
      console.log('╔════════════════════════════════════════╗');
      console.log('║       MeuDeliveryAI - Backend API      ║');
      console.log('╠════════════════════════════════════════╣');
      console.log(`║  🚀 Servidor rodando na porta ${PORT}      ║`);
      console.log(`║  📡 URL: http://localhost:${PORT}          ║`);
      console.log(`║  🌍 Ambiente: ${process.env.NODE_ENV}          ║`);
      console.log('╚════════════════════════════════════════╝');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Falha ao iniciar servidor:', error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;

// Trigger nodemon reload to pick up new environment variables

