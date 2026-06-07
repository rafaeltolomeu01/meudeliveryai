const { query } = require('../config/database');
const axios = require('axios');
const QRCode = require('qrcode');
const aiService = require('../services/ai.service');

// ─── Evolution API Config ──────────────────────────────────────────────────────
function getEvoUrl() {
  return process.env.EVOLUTION_API_URL || 'http://localhost:8080';
}

function getEvoKey() {
  return process.env.EVOLUTION_API_KEY || '';
}

function isEvoConfigured() {
  return !!(process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_API_KEY.trim());
}

console.log("EVOLUTION_API_URL:", process.env.EVOLUTION_API_URL);
console.log("EVOLUTION_API_KEY existe:", !!process.env.EVOLUTION_API_KEY);

function getEvoApi() {
  return axios.create({
    baseURL: getEvoUrl(),
    headers: {
      'Content-Type': 'application/json',
      'apikey': getEvoKey(),
    },
    timeout: 20000,
  });
}

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const evoApi = getEvoApi();

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function extractQrCode(data) {
  console.log("Resposta Evolution:", JSON.stringify(data, null, 2));

  if (!data) return null;

  let qrString = null;

  qrString =
    data?.base64 ||
    data?.qrcode ||
    data?.code ||
    data?.qr ||
    data?.pairingCode ||
    data?.data?.qrcode ||
    data?.data?.base64 ||
    data?.data?.code ||
    data?.data?.qr ||
    data?.data?.pairingCode ||
    data?.qrcode?.base64 ||
    data?.qrcode?.code ||
    data?.qrcode?.qrcode ||
    data?.instance?.qrcode ||
    data?.instance?.connect?.qrcode ||
    null;

  if (!qrString) return null;

  if (typeof qrString === 'object') {
    qrString =
      qrString.base64 ||
      qrString.qrcode ||
      qrString.code ||
      qrString.qr ||
      null;
  }

  if (!qrString || typeof qrString !== 'string') return null;

  qrString = qrString.trim();

  if (qrString.startsWith('data:image')) {
    return qrString;
  }

  if (qrString.startsWith('http')) {
    return qrString;
  }

  if (qrString.length > 300) {
    return `data:image/png;base64,${qrString}`;
  }

  try {
    return await QRCode.toDataURL(qrString);
  } catch (err) {
    console.error("Erro ao gerar QR:", err.message);
    return null;
  }
}

function sessionName(restaurantId) {
  return `restaurant_${restaurantId}`;
}

async function getOrCreateConnection(restaurantId) {
  let rows = await query(
    'SELECT * FROM whatsapp_connections WHERE restaurant_id = ? LIMIT 1',
    [restaurantId]
  );

  if (rows.length === 0) {
    const name = sessionName(restaurantId);

    await query(
      `INSERT INTO whatsapp_connections (restaurant_id, session_name, status)
       VALUES (?, ?, 'disconnected')`,
      [restaurantId, name]
    );

    rows = await query(
      'SELECT * FROM whatsapp_connections WHERE restaurant_id = ? LIMIT 1',
      [restaurantId]
    );
  }

  return rows[0];
}

async function saveLog(restaurantId, event, to, message, status, errorMessage = null) {
  try {
    await query(
      `INSERT INTO whatsapp_messages_logs
         (restaurant_id, event_type, recipient_phone, message_text, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [restaurantId, event, to, message, status, errorMessage]
    );
  } catch (e) {
    console.error('[WhatsApp] saveLog error:', e.message);
  }
}

// ─── Controllers ──────────────────────────────────────────────────────────────

const getStatus = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const conn = await getOrCreateConnection(restaurantId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const countRows = await query(
      `SELECT COUNT(*) as total FROM whatsapp_messages_logs
       WHERE restaurant_id = ? AND status = 'sent' AND sent_at >= ?`,
      [restaurantId, today]
    );

    const todayCount = countRows[0]?.total || 0;
    let liveStatus = conn.status;

    if (isEvoConfigured() && conn.status !== 'disconnected') {
      try {
        const resp = await evoApi.get(`/instance/connectionState/${conn.session_name}`);
        const state = resp.data?.instance?.state;

        if (state === 'open') liveStatus = 'connected';
        else if (state === 'connecting') liveStatus = 'connecting';
        else liveStatus = 'disconnected';

        if (liveStatus !== conn.status) {
          await query(
            'UPDATE whatsapp_connections SET status = ?, updated_at = NOW() WHERE restaurant_id = ?',
            [liveStatus, restaurantId]
          );
        }
      } catch (e) {
        console.error('[WhatsApp] Erro ao consultar status:', e.message);
      }
    }

    return res.json({
      success: true,
      data: {
        ...conn,
        status: liveStatus,
        messages_today: todayCount,
        evolution_configured: isEvoConfigured(),
        evolution_url: getEvoUrl(),
      },
    });
  } catch (error) {
    next(error);
  }
};

const connect = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const conn = await getOrCreateConnection(restaurantId);
    const name = conn.session_name;

    if (!isEvoConfigured()) {
      await query(
        `UPDATE whatsapp_connections SET status = 'connecting', qr_code = ?, updated_at = NOW()
         WHERE restaurant_id = ?`,
        ['DEMO_QR_' + Date.now(), restaurantId]
      );

      const updated = await query(
        'SELECT * FROM whatsapp_connections WHERE restaurant_id = ? LIMIT 1',
        [restaurantId]
      );

      return res.json({
        success: true,
        message: 'Modo demo: Evolution API não configurada.',
        data: { ...updated[0], demo_mode: true },
      });
    }

    try {
      await evoApi.post('/instance/create', {
        instanceName: name,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      });
    } catch (e) {
      console.log('[WhatsApp] Instância já existe ou erro ignorado:', e.response?.data || e.message);
    }

    let qrBase64 = null;
    let errorDetail = null;

    try {
      const response = await evoApi.get(`/instance/connect/${name}`);
      qrBase64 = await extractQrCode(response.data);

      if (!qrBase64) {
        errorDetail = 'Evolution API não retornou QR em formato reconhecido.';
      }
    } catch (qrErr) {
      console.error("[WhatsApp] Error fetching QR in connect:", qrErr.message);
      errorDetail = qrErr.message;

      if (qrErr.response) {
        console.error("[WhatsApp] Error detail:", qrErr.response.data);
        errorDetail += ' - ' + JSON.stringify(qrErr.response.data);
      }
    }

    if (!qrBase64) {
      return res.status(422).json({
        success: false,
        message: 'A Evolution API não retornou o QR Code. Certifique-se de que a instância está ativa.',
        details: errorDetail,
      });
    }

    await query(
      `UPDATE whatsapp_connections SET status = 'connecting', qr_code = ?, updated_at = NOW()
       WHERE restaurant_id = ?`,
      [qrBase64, restaurantId]
    );

    const updated = await query(
      'SELECT * FROM whatsapp_connections WHERE restaurant_id = ? LIMIT 1',
      [restaurantId]
    );

    return res.json({
      success: true,
      message: 'QR Code gerado! Escaneie com o WhatsApp.',
      data: updated[0],
    });
  } catch (error) {
    next(error);
  }
};

const disconnect = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const conn = await getOrCreateConnection(restaurantId);

    if (isEvoConfigured()) {
      try {
        await evoApi.delete(`/instance/logout/${conn.session_name}`);
      } catch (e) {
        console.error('[WhatsApp] Erro ao desconectar:', e.message);
      }
    }

    await query(
      `UPDATE whatsapp_connections
       SET status = 'disconnected', qr_code = NULL, phone_number = NULL,
           profile_name = NULL, updated_at = NOW()
       WHERE restaurant_id = ?`,
      [restaurantId]
    );

    return res.json({ success: true, message: 'WhatsApp desconectado.' });
  } catch (error) {
    next(error);
  }
};

const reconnect = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const conn = await getOrCreateConnection(restaurantId);

    if (isEvoConfigured()) {
      try {
        await evoApi.post(`/instance/restart/${conn.session_name}`);
      } catch (e) {
        console.error('[WhatsApp] Erro ao reconectar:', e.message);
      }
    }

    await query(
      `UPDATE whatsapp_connections SET status = 'connecting', updated_at = NOW()
       WHERE restaurant_id = ?`,
      [restaurantId]
    );

    return res.json({ success: true, message: 'Reconectando WhatsApp...' });
  } catch (error) {
    next(error);
  }
};

const getQrCode = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const conn = await getOrCreateConnection(restaurantId);

    if (isEvoConfigured() && conn.status === 'connecting') {
      let qrBase64 = null;
      let errorDetail = null;

      try {
        const response = await evoApi.get(`/instance/connect/${conn.session_name}`);
        qrBase64 = await extractQrCode(response.data);

        if (!qrBase64) {
          errorDetail = 'Evolution API não retornou QR em formato reconhecido.';
        }
      } catch (qrErr) {
        console.error("[WhatsApp] Error fetching QR in getQrCode:", qrErr.message);
        errorDetail = qrErr.message;

        if (qrErr.response) {
          console.error("[WhatsApp] Error detail:", qrErr.response.data);
          errorDetail += ' - ' + JSON.stringify(qrErr.response.data);
        }
      }

      if (qrBase64) {
        await query(
          'UPDATE whatsapp_connections SET qr_code = ?, updated_at = NOW() WHERE restaurant_id = ?',
          [qrBase64, restaurantId]
        );

        return res.json({ success: true, data: { qr_code: qrBase64 } });
      }

      return res.status(422).json({
        success: false,
        message: 'A Evolution API não retornou o QR Code ao atualizar.',
        details: errorDetail,
      });
    }

    return res.json({ success: true, data: { qr_code: conn.qr_code } });
  } catch (error) {
    next(error);
  }
};

const webhook = async (req, res, next) => {
  try {
    const payload = req.body;
    const event = payload?.event;
    const instanceName = payload?.instance || payload?.data?.instance?.instanceName;

    if (!instanceName) return res.json({ success: true });

    const rows = await query(
      'SELECT restaurant_id FROM whatsapp_connections WHERE session_name = ? LIMIT 1',
      [instanceName]
    );

    if (rows.length === 0) return res.json({ success: true });

    const restaurantId = rows[0].restaurant_id;

    if (event === 'connection.update' || event === 'QRCODE_UPDATED') {
      const state = payload?.data?.state || payload?.data?.instance?.state;
      const qr = await extractQrCode(payload) || await extractQrCode(payload?.data);
      const phone = payload?.data?.wuid?.replace('@s.whatsapp.net', '') || null;
      const pname = payload?.data?.profileName || null;

      let status = 'connecting';
      if (state === 'open') status = 'connected';
      if (state === 'close') status = 'disconnected';

      await query(
        `UPDATE whatsapp_connections
         SET status = ?,
             qr_code = COALESCE(?, qr_code),
             phone_number = COALESCE(?, phone_number),
             profile_name = COALESCE(?, profile_name),
             connected_at = IF(? = 'connected', NOW(), connected_at),
             last_connection = NOW(),
             updated_at = NOW()
         WHERE restaurant_id = ?`,
        [status, qr, phone, pname, status, restaurantId]
      );
    }

    if (event === 'messages.upsert') {
      const messages = payload?.data?.messages || [];

      for (const msg of messages) {
        if (msg.key?.fromMe) {
          await saveLog(
            restaurantId,
            'outbound',
            msg.key?.remoteJid?.replace('@s.whatsapp.net', ''),
            msg.message?.conversation || '',
            'sent'
          );
          continue;
        }

        const customerPhone = (msg.key?.remoteJid || '').replace('@s.whatsapp.net', '');
        const customerMessage = (
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          ''
        ).trim();

        if (!customerPhone || !customerMessage) continue;

        await saveLog(restaurantId, 'received', customerPhone, customerMessage, 'sent');

        const { enabled, settings: aiSettings } = await aiService.getAIConfig(restaurantId);
        if (!enabled || !aiSettings) continue;

        const connRows = await query(
          "SELECT * FROM whatsapp_connections WHERE restaurant_id = ? AND status = 'connected' LIMIT 1",
          [restaurantId]
        );

        if (connRows.length === 0) continue;

        const activeConn = connRows[0];

        let aiReply = null;

        try {
          aiReply = await aiService.processIncomingMessage(
            restaurantId,
            customerPhone,
            customerMessage,
            aiSettings
          );
        } catch (aiErr) {
          console.error('[AI] Erro ao processar mensagem:', aiErr.message);
          aiReply =
            aiSettings.ai_fallback_message ||
            'Desculpe, não consigo processar sua mensagem agora. Por favor, entre em contato diretamente conosco.';
        }

        if (!aiReply) continue;

        if (EVOLUTION_API_KEY) {
          try {
            const jid = `${customerPhone}@s.whatsapp.net`;

            await evoApi.post(`/message/sendText/${activeConn.session_name}`, {
              number: jid,
              textMessage: { text: aiReply },
            });

            await saveLog(restaurantId, 'ai_response', customerPhone, aiReply, 'sent');
          } catch (sendErr) {
            console.error('[AI] Erro ao enviar resposta:', sendErr.message);
            await saveLog(restaurantId, 'ai_response', customerPhone, aiReply, 'error', sendErr.message);
          }
        } else {
          await saveLog(restaurantId, 'ai_response', customerPhone, aiReply, 'demo', 'Evolution API não configurada');
        }
      }
    }

    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ success: false, message: 'Telefone e mensagem são obrigatórios.' });
    }

    const conn = await getOrCreateConnection(restaurantId);

    if (!isEvoConfigured()) {
      await saveLog(restaurantId, 'manual', phone, message, 'demo', 'Evolution API não configurada');
      return res.json({ success: true, message: '[DEMO] Mensagem registrada (sem envio real).', demo: true });
    }

    if (conn.status !== 'connected') {
      return res.status(400).json({ success: false, message: 'WhatsApp não está conectado.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const jid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;

    await evoApi.post(`/message/sendText/${conn.session_name}`, {
      number: jid,
      textMessage: { text: message },
    });

    await saveLog(restaurantId, 'manual', cleanPhone, message, 'sent');

    return res.json({ success: true, message: 'Mensagem enviada com sucesso!' });
  } catch (error) {
    await saveLog(req.user.restaurant_id, 'manual', req.body?.phone, req.body?.message, 'error', error.message);
    next(error);
  }
};

const getLogs = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const logs = await query(
      `SELECT * FROM whatsapp_messages_logs
       WHERE restaurant_id = ?
       ORDER BY sent_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [restaurantId]
    );

    const countRows = await query(
      'SELECT COUNT(*) as total FROM whatsapp_messages_logs WHERE restaurant_id = ?',
      [restaurantId]
    );

    return res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total: countRows[0]?.total || 0,
        pages: Math.ceil((countRows[0]?.total || 0) / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getWhatsAppSettings = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;

    let rows = await query(
      'SELECT * FROM whatsapp_settings WHERE restaurant_id = ? LIMIT 1',
      [restaurantId]
    );

    if (rows.length === 0) {
      await query(
        `INSERT INTO whatsapp_settings (restaurant_id, is_enabled) VALUES (?, 0)`,
        [restaurantId]
      );

      rows = await query(
        'SELECT * FROM whatsapp_settings WHERE restaurant_id = ? LIMIT 1',
        [restaurantId]
      );
    }

    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

const updateWhatsAppSettings = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;

    const {
      is_enabled,
      notify_new_order,
      notify_order_confirmed,
      notify_order_ready,
      notify_out_for_delivery,
      notify_delivered,
      notify_cancelled,
      template_new_order,
      template_confirmed,
      template_ready,
      template_out_for_delivery,
      template_delivered,
      template_cancelled,
    } = req.body;

    await query(
      `INSERT INTO whatsapp_settings (restaurant_id, is_enabled,
         notify_new_order, notify_order_confirmed, notify_order_ready,
         notify_out_for_delivery, notify_delivered, notify_cancelled,
         template_new_order, template_confirmed, template_ready,
         template_out_for_delivery, template_delivered, template_cancelled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         is_enabled = VALUES(is_enabled),
         notify_new_order = VALUES(notify_new_order),
         notify_order_confirmed = VALUES(notify_order_confirmed),
         notify_order_ready = VALUES(notify_order_ready),
         notify_out_for_delivery = VALUES(notify_out_for_delivery),
         notify_delivered = VALUES(notify_delivered),
         notify_cancelled = VALUES(notify_cancelled),
         template_new_order = VALUES(template_new_order),
         template_confirmed = VALUES(template_confirmed),
         template_ready = VALUES(template_ready),
         template_out_for_delivery = VALUES(template_out_for_delivery),
         template_delivered = VALUES(template_delivered),
         template_cancelled = VALUES(template_cancelled)`,
      [
        restaurantId,
        is_enabled ? 1 : 0,
        notify_new_order ? 1 : 0,
        notify_order_confirmed ? 1 : 0,
        notify_order_ready ? 1 : 0,
        notify_out_for_delivery ? 1 : 0,
        notify_delivered ? 1 : 0,
        notify_cancelled ? 1 : 0,
        template_new_order || null,
        template_confirmed || null,
        template_ready || null,
        template_out_for_delivery || null,
        template_delivered || null,
        template_cancelled || null,
      ]
    );

    const updated = await query(
      'SELECT * FROM whatsapp_settings WHERE restaurant_id = ? LIMIT 1',
      [restaurantId]
    );

    return res.json({ success: true, message: 'Configurações salvas!', data: updated[0] });
  } catch (error) {
    next(error);
  }
};

const getAISettings = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;

    let rows = await query(
      `SELECT ai_enabled, ai_name, ai_personality, ai_fallback_message, ai_model
       FROM whatsapp_settings WHERE restaurant_id = ? LIMIT 1`,
      [restaurantId]
    );

    if (rows.length === 0) {
      await query(
        `INSERT INTO whatsapp_settings (restaurant_id, is_enabled, ai_enabled)
         VALUES (?, 0, 0)`,
        [restaurantId]
      );

      rows = await query(
        `SELECT ai_enabled, ai_name, ai_personality, ai_fallback_message, ai_model
         FROM whatsapp_settings WHERE restaurant_id = ? LIMIT 1`,
        [restaurantId]
      );
    }

    const openaiConfigured = !!process.env.OPENAI_API_KEY;

    return res.json({
      success: true,
      data: {
        ...rows[0],
        openai_configured: openaiConfigured,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateAISettings = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;

    const {
      ai_enabled,
      ai_name,
      ai_personality,
      ai_fallback_message,
      ai_model,
    } = req.body;

    await query(
      `INSERT INTO whatsapp_settings (restaurant_id, ai_enabled, ai_name, ai_personality, ai_fallback_message, ai_model)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         ai_enabled          = VALUES(ai_enabled),
         ai_name             = VALUES(ai_name),
         ai_personality      = VALUES(ai_personality),
         ai_fallback_message = VALUES(ai_fallback_message),
         ai_model            = VALUES(ai_model)`,
      [
        restaurantId,
        ai_enabled ? 1 : 0,
        ai_name || 'Assistente',
        ai_personality || null,
        ai_fallback_message || null,
        ai_model || 'gpt-4o-mini',
      ]
    );

    const updated = await query(
      `SELECT ai_enabled, ai_name, ai_personality, ai_fallback_message, ai_model
       FROM whatsapp_settings WHERE restaurant_id = ? LIMIT 1`,
      [restaurantId]
    );

    return res.json({ success: true, message: 'Configurações da IA salvas!', data: updated[0] });
  } catch (error) {
    next(error);
  }
};

const testAIEndpoint = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const { question } = req.body;

    if (!question || question.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Pergunta inválida.' });
    }

    const result = await aiService.testAI(restaurantId, question.trim());

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getConfigStatus = async (req, res, next) => {
  try {
    return res.json({
      configured: isEvoConfigured(),
      apiUrl: getEvoUrl(),
      hasApiKey: !!getEvoKey(),
    });
  } catch (error) {
    next(error);
  }
};

async function autoSendOrderNotification(restaurantId, order, newStatus) {
  try {
    const settingsRows = await query(
      'SELECT * FROM whatsapp_settings WHERE restaurant_id = ? AND is_enabled = 1 LIMIT 1',
      [restaurantId]
    );

    if (settingsRows.length === 0) return;

    const ws = settingsRows[0];

    const connRows = await query(
      "SELECT * FROM whatsapp_connections WHERE restaurant_id = ? AND status = 'connected' LIMIT 1",
      [restaurantId]
    );

    if (connRows.length === 0) return;

    const conn = connRows[0];

    const fieldMap = {
      pending: { flag: 'notify_new_order', tmpl: 'template_new_order' },
      confirmed: { flag: 'notify_order_confirmed', tmpl: 'template_confirmed' },
      ready: { flag: 'notify_order_ready', tmpl: 'template_ready' },
      out_for_delivery: { flag: 'notify_out_for_delivery', tmpl: 'template_out_for_delivery' },
      delivered: { flag: 'notify_delivered', tmpl: 'template_delivered' },
      cancelled: { flag: 'notify_cancelled', tmpl: 'template_cancelled' },
    };

    const mapping = fieldMap[newStatus];
    if (!mapping || !ws[mapping.flag]) return;

    let template = ws[mapping.tmpl] || '';
    if (!template) return;

    template = template
      .replace(/{order_number}/g, order.order_number)
      .replace(/{total}/g, Number(order.total).toFixed(2))
      .replace(/{customer_name}/g, order.customer_name || 'Cliente')
      .replace(/{estimated_time}/g, order.estimated_time || '45');

    const phone = (order.customer_phone || '').replace(/\D/g, '');
    if (!phone) return;

    const jid = `${phone}@s.whatsapp.net`;

    await evoApi.post(`/message/sendText/${conn.session_name}`, {
      number: jid,
      textMessage: { text: template },
    });

    await saveLog(restaurantId, `order_${newStatus}`, phone, template, 'sent');
  } catch (e) {
    console.error('[WhatsApp] autoSend error:', e.message);
  }
}

module.exports = {
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
  autoSendOrderNotification,
};