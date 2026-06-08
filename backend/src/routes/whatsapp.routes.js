const express = require('express');
const router  = express.Router();
const authMiddleware        = require('../middlewares/authMiddleware');
const roleMiddleware        = require('../middlewares/roleMiddleware');
const tenantMiddleware      = require('../middlewares/tenantMiddleware');
const subscriptionMiddleware = require('../middlewares/subscriptionMiddleware');
const {
  getStatus,
  connect,
  disconnect,
  reconnect,
  getQrCode,
  webhook,
  sendMessage,
  getLogs,
  getWhatsAppSettings,
  updateWhatsAppSettings,
  getAISettings,
  updateAISettings,
  testAIEndpoint,
  getConfigStatus,
  diagnose,
} = require('../controllers/whatsapp.controller');

// ─── Webhook público (sem JWT — chamado pela Evolution API) ────────────────────
router.post('/webhook', webhook);

// Configuração e status público da Evolution API (sem JWT)
router.get('/config-status', getConfigStatus);
router.get('/diagnose', diagnose);

// ─── Todas as rotas abaixo exigem autenticação ────────────────────────────────
router.use(authMiddleware);
router.use(tenantMiddleware);

// Status e QR Code
router.get('/status',  getStatus);
router.get('/qrcode',  getQrCode);

// Controle de sessão (dono / gerente / admin_geral)
router.post('/connect',    subscriptionMiddleware, roleMiddleware('dono', 'gerente', 'admin_geral'), connect);
router.post('/disconnect', subscriptionMiddleware, roleMiddleware('dono', 'gerente', 'admin_geral'), disconnect);
router.post('/reconnect',  subscriptionMiddleware, roleMiddleware('dono', 'gerente', 'admin_geral'), reconnect);

// Envio manual de mensagem
router.post('/send', subscriptionMiddleware, roleMiddleware('dono', 'gerente', 'atendente', 'admin_geral'), sendMessage);
router.post('/send-test', subscriptionMiddleware, roleMiddleware('dono', 'gerente', 'atendente', 'admin_geral'), sendMessage);

// Histórico de mensagens
router.get('/logs', getLogs);

// Configurações e templates de mensagem
router.get('/settings', getWhatsAppSettings);
router.put('/settings',  subscriptionMiddleware, roleMiddleware('dono', 'gerente', 'admin_geral'), updateWhatsAppSettings);

// IA Atendente
router.get('/ai-settings', getAISettings);
router.put('/ai-settings', subscriptionMiddleware, roleMiddleware('dono', 'gerente', 'admin_geral'), updateAISettings);
router.post('/ai-test',    subscriptionMiddleware, roleMiddleware('dono', 'gerente', 'admin_geral'), testAIEndpoint);

module.exports = router;
