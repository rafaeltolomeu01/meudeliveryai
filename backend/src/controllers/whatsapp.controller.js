const { query } = require('../config/database');
const axios = require('axios');
const QRCode = require('qrcode');
const aiService = require('../services/ai.service');

// ─── WhatsApp Provider Config ──────────────────────────────────────────────────
function getProvider() { return process.env.WHATSAPP_PROVIDER || 'evolution'; }

// Evolution API Config
function getEvoUrl()  { return process.env.EVOLUTION_API_URL || 'http://localhost:8080'; }
function getEvoKey()  { return process.env.EVOLUTION_API_KEY || ''; }
function isEvoConfigured() { return !!(process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_API_KEY.trim()); }

// Z-API Config
function isZapiConfigured() { return !!(process.env.ZAPI_INSTANCE_ID && process.env.ZAPI_INSTANCE_TOKEN); }

// Logs solicitados
console.log("EVOLUTION_API_URL:", process.env.EVOLUTION_API_URL);
console.log("EVOLUTION_API_KEY existe:", !!process.env.EVOLUTION_API_KEY);
console.log("WHATSAPP_PROVIDER:", getProvider());
console.log("ZAPI_INSTANCE_ID existe:", !!process.env.ZAPI_INSTANCE_ID);

async function callEvoApi(method, path, data = null) {
  const rawBaseUrl = getEvoUrl();
  const baseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${baseUrl}${cleanPath}`;

  console.log(`[Evolution API Call] ${method.toUpperCase()} ${fullUrl}`);
  if (data) {
    console.log(`[Evolution API Request Body]:`, JSON.stringify(data));
  }

  try {
    const response = await axios({
      method: method,
      url: fullUrl,
      data: data,
      headers: {
        'Content-Type': 'application/json',
        'apikey': getEvoKey()
      },
      timeout: 15000
    });

    console.log(`[Evolution API Response] Status: ${response.status}`);
    const responseStr = JSON.stringify(response.data);
    console.log(`[Evolution API Response Body]:`, responseStr.length > 1000 ? responseStr.substring(0, 1000) + '... (truncated)' : responseStr);
    return response;
  } catch (error) {
    console.error(`[Evolution API Error] ${method.toUpperCase()} ${cleanPath} failed:`, error.message);
    if (error.response) {
      console.error(`[Evolution API Error Status]:`, error.response.status);
      console.error(`[Evolution API Error Body]:`, JSON.stringify(error.response.data));
      const apiMessage = error.response.data?.message || 
                         (error.response.data?.error && typeof error.response.data.error === 'string' ? error.response.data.error : null) ||
                         (error.response.data?.error?.message) ||
                         null;
      const detailedMessage = apiMessage ? `${error.message} - ${apiMessage}` : error.message;
      const newErr = new Error(detailedMessage);
      newErr.status = error.response.status;
      newErr.response = error.response;
      throw newErr;
    }
    throw error;
  }
}

async function ensureFreshInstance(name) {
  try {
    console.log(`[WhatsApp] reset: Deleting instance if it exists: ${name}`);
    try {
      await callEvoApi('delete', `/instance/delete/${name}`);
      console.log(`[WhatsApp] reset: Deleted instance ${name}.`);
    } catch (delErr) {
      console.log(`[WhatsApp] reset: Delete instance ${name} returned error (likely did not exist):`, delErr.message);
    }

    console.log(`[WhatsApp] reset: Creating fresh instance ${name}...`);
    await callEvoApi('post', '/instance/create', {
      instanceName: name,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    });
    console.log(`[WhatsApp] reset: Created fresh instance ${name}.`);
  } catch (err) {
    console.error(`[WhatsApp] reset: Failed to ensure fresh instance for ${name}:`, err.message);
    throw err;
  }
}

async function ensureQrDataUrl(qr) {
  if (!qr) return null;
  qr = qr.trim();
  if (qr.startsWith('data:')) {
    return qr;
  }
  if (/^[A-Za-z0-9+/=]+$/.test(qr.replace(/\s/g, '')) && qr.length > 100) {
    return `data:image/png;base64,${qr}`;
  }
  try {
    const dataUrl = await QRCode.toDataURL(qr);
    return dataUrl;
  } catch (err) {
    console.error("[WhatsApp] Error generating QR code image from text:", err.message);
    return qr;
  }
}

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

// Helper para enviar mensagens por texto abstraindo os dois provedores
async function sendTextHelper(phone, message, restaurantId) {
  const cleanPhone = phone.replace(/\D/g, '');
  if (getProvider() === 'zapi') {
    if (!isZapiConfigured()) {
      throw new Error('Z-API não configurada no .env');
    }
    await axios.post(
      `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_INSTANCE_TOKEN}/send-text`,
      {
        phone: cleanPhone,
        message: message
      },
      {
        headers: { 'client-token': process.env.ZAPI_CLIENT_TOKEN || '' },
        timeout: 15000
      }
    );
  } else {
    const conn = await getOrCreateConnection(restaurantId);
    await callEvoApi('post', `/message/sendText/${conn.session_name}`, {
      number: cleanPhone,
      text: message
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractQrCode(data) {
  console.log("Connect QR Response:", data);
  if (!data) return null;

  let qr = null;
  if (typeof data === 'string') {
    qr = data;
  } else {
    qr = data.base64 || 
         data.qrcode || 
         data.qrcode?.base64 ||
         data.qrcode?.code ||
         data.code || 
         data.pairingCode || 
         data.qr || 
         data.data?.base64 ||
         data.data?.qrcode || 
         data.data?.qrcode?.base64 ||
         data.data?.qrcode?.code ||
         data.data?.code ||
         data.data?.pairingCode ||
         data.data?.qr ||
         data.instance?.qrcode || 
         data.instance?.qrcode?.base64 ||
         data.instance?.qrcode?.code ||
         data.instance?.connect?.qrcode ||
         data.instance?.connect?.qrcode?.base64 ||
         data.instance?.connect?.qrcode?.code ||
         null;
  }

  if (typeof qr === 'object' && qr !== null) {
    qr = qr.base64 || qr.qrcode || qr.code || qr.pairingCode || null;
  }

  if (qr && typeof qr === 'string') {
    qr = qr.trim();
    if (qr.startsWith('data:')) {
      return qr;
    }
    if (/^[A-Za-z0-9+/=]+$/.test(qr.replace(/\s/g, '')) || qr.length > 100) {
      return `data:image/png;base64,${qr}`;
    }
    return qr;
  }

  return null;
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

/**
 * GET /api/v1/whatsapp/status
 * Retorna o status da conexão WhatsApp para o restaurante logado.
 */
const getStatus = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const conn = await getOrCreateConnection(restaurantId);

    // Contar mensagens enviadas hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const countRows = await query(
      `SELECT COUNT(*) as total FROM whatsapp_messages_logs
       WHERE restaurant_id = ? AND status = 'sent' AND sent_at >= ?`,
      [restaurantId, today]
    );
    const todayCount = countRows[0]?.total || 0;

    // Tenta checar status real (não-bloqueante)
    let liveStatus = conn.status;
    let isConnected = liveStatus === 'connected';
    let state = liveStatus === 'connected' ? 'open' : (liveStatus === 'connecting' ? 'connecting' : 'close');

    if (getProvider() === 'zapi') {
      if (isZapiConfigured()) {
        try {
          const resp = await axios.get(`https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_INSTANCE_TOKEN}/status`, {
            headers: { 'client-token': process.env.ZAPI_CLIENT_TOKEN || '' },
            timeout: 10000
          });
          const isConn = resp.data?.connected;
          liveStatus = isConn ? 'connected' : 'disconnected';
          isConnected = isConn;
          state = isConn ? 'open' : 'close';
          if (liveStatus !== conn.status) {
            await query(
              'UPDATE whatsapp_connections SET status = ?, updated_at = NOW() WHERE restaurant_id = ?',
              [liveStatus, restaurantId]
            );
          }
        } catch (err) {
          console.error('[WhatsApp] Z-API status error:', err.message);
        }
      }
    } else if (isEvoConfigured() && conn.status !== 'disconnected') {
      try {
        const resp = await callEvoApi('get', `/instance/connectionState/${conn.session_name}`);
        const apiState = resp.data?.instance?.state || resp.data?.state || 'close';
        state = apiState;
        if (state === 'open') {
          liveStatus = 'connected';
          isConnected = true;
        } else if (state === 'connecting') {
          liveStatus = 'connecting';
          isConnected = false;
        } else {
          liveStatus = 'disconnected';
          isConnected = false;
        }

        if (liveStatus !== conn.status) {
          await query(
            'UPDATE whatsapp_connections SET status = ?, updated_at = NOW() WHERE restaurant_id = ?',
            [liveStatus, restaurantId]
          );
        }
      } catch (_) {
        // Evolution API indisponível — usar status salvo no banco
      }
    }

    return res.json({
      success: true,
      connected: isConnected,
      state: state,
      data: {
        ...conn,
        status: liveStatus,
        messages_today: todayCount,
        evolution_configured: isEvoConfigured(),
        evolution_url: getEvoUrl(),
        zapi_configured: isZapiConfigured(),
        whatsapp_provider: getProvider(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/whatsapp/connect
 * Inicia uma sessão WhatsApp e retorna o QR Code.
 */
const connect = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const conn = await getOrCreateConnection(restaurantId);
    const name = conn.session_name;

    if (getProvider() === 'zapi') {
      if (!isZapiConfigured()) {
        return res.status(400).json({ success: false, message: 'Z-API não configurada no arquivo .env.' });
      }
      let qrBase64 = null;
      let errorDetail = null;
      try {
        const response = await axios.get(`https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_INSTANCE_TOKEN}/qr-code`, {
          headers: { 'client-token': process.env.ZAPI_CLIENT_TOKEN || '' },
          timeout: 10000
        });
        qrBase64 = response.data?.value;
        if (!qrBase64) {
          errorDetail = 'Z-API QR-code responded successfully but did not contain value field.';
        }
      } catch (qrErr) {
        console.error("[WhatsApp] Error fetching QR in Z-API connect:", qrErr.message);
        errorDetail = qrErr.message;
      }

      if (!qrBase64) {
        return res.status(422).json({
          success: false,
          message: 'A Z-API não retornou o QR Code. Certifique-se de que a instância está ativa no painel.',
          details: errorDetail
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
        instanceName: name,
        qrcode: qrBase64,
        status: "connecting",
        data: updated[0],
      });
    }

    if (!isEvoConfigured()) {
      // Modo demo: gera QR Code fictício
      const demoQr = 'DEMO_QR_' + Date.now();
      await query(
        `UPDATE whatsapp_connections SET status = 'connecting', qr_code = ?, updated_at = NOW()
         WHERE restaurant_id = ?`,
        [demoQr, restaurantId]
      );
      const updated = await query(
        'SELECT * FROM whatsapp_connections WHERE restaurant_id = ? LIMIT 1',
        [restaurantId]
      );
      return res.json({
        success: true,
        instanceName: name,
        qrcode: demoQr,
        status: "connecting",
        data: { ...updated[0], demo_mode: true },
      });
    }

    // 1. Criar a instância (não quebra se já existir)
    try {
      await callEvoApi('post', '/instance/create', {
        instanceName: name,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      });
      console.log(`[WhatsApp] Instance ${name} created successfully.`);
    } catch (createErr) {
      console.log(`[WhatsApp] Instance ${name} already exists or failed to create (ignoring error):`, createErr.message);
    }

    // 2. Chamar /instance/connect/:instanceName
    let qrRaw = null;
    let errorDetail = null;
    try {
      const response = await callEvoApi('get', `/instance/connect/${name}`);
      qrRaw = extractQrCode(response.data);
      if (!qrRaw) {
        errorDetail = 'A resposta de conexão da Evolution API não continha nenhum formato de QR Code válido (base64, code, pairingCode).';
      }
    } catch (qrErr) {
      console.error("[WhatsApp] First connect attempt failed:", qrErr.message);
      console.log(`[WhatsApp] Instance ${name} might be stuck or in a bad state. Attempting auto delete and recreate...`);
      try {
        try {
          await callEvoApi('delete', `/instance/delete/${name}`);
        } catch (delErr) {
          console.log(`[WhatsApp] Auto delete failed (ignoring):`, delErr.message);
        }
        
        await callEvoApi('post', '/instance/create', {
          instanceName: name,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        });
        
        console.log(`[WhatsApp] Instance ${name} recreated successfully. Retrying connection...`);
        const responseRetry = await callEvoApi('get', `/instance/connect/${name}`);
        qrRaw = extractQrCode(responseRetry.data);
        if (!qrRaw) {
          errorDetail = 'A resposta de conexão após recriar a instância não continha nenhum formato de QR Code válido.';
        }
      } catch (retryErr) {
        console.error("[WhatsApp] Connect retry failed:", retryErr.message);
        errorDetail = retryErr.message;
      }
    }

    // 3. Gerar imagem se for code/texto
    const qrCode = await ensureQrDataUrl(qrRaw);

    if (!qrCode) {
      return res.status(422).json({
        success: false,
        message: `Não foi possível obter o QR Code da Evolution API: ${errorDetail}`,
        details: errorDetail
      });
    }

    await query(
      `UPDATE whatsapp_connections SET status = 'connecting', qr_code = ?, updated_at = NOW()
       WHERE restaurant_id = ?`,
      [qrCode, restaurantId]
    );

    const updated = await query(
      'SELECT * FROM whatsapp_connections WHERE restaurant_id = ? LIMIT 1',
      [restaurantId]
    );

    return res.json({
      success: true,
      instanceName: name,
      qrcode: qrCode,
      status: "connecting",
      data: updated[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/whatsapp/disconnect
 * Desconecta a sessão WhatsApp.
 */
const disconnect = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const conn = await getOrCreateConnection(restaurantId);

    if (getProvider() === 'zapi') {
      if (isZapiConfigured()) {
        try {
          await axios.get(`https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_INSTANCE_TOKEN}/disconnect`, {
            headers: { 'client-token': process.env.ZAPI_CLIENT_TOKEN || '' },
            timeout: 10000
          });
        } catch (_) {}
      }
    } else if (isEvoConfigured()) {
      try {
        await callEvoApi('delete', `/instance/logout/${conn.session_name}`);
      } catch (_) {}
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

/**
 * POST /api/v1/whatsapp/reconnect
 * Tenta reconectar a sessão existente.
 */
const reconnect = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const conn = await getOrCreateConnection(restaurantId);
    const name = conn.session_name;

    if (getProvider() === 'zapi') {
      // Modo Z-API
      await query(
        "UPDATE whatsapp_connections SET status = 'connecting', qr_code = NULL, updated_at = NOW() WHERE restaurant_id = ?",
        [restaurantId]
      );
      // Aqui poderíamos chamar um disconnect/reconnect da Z-API se necessário, por ora resetamos status
      const updated = await query('SELECT * FROM whatsapp_connections WHERE restaurant_id = ? LIMIT 1', [restaurantId]);
      return res.json({ success: true, message: 'Reconectando WhatsApp...', data: updated[0] });
    }

    if (!isEvoConfigured()) {
      // Modo demo
      const demoQr = 'DEMO_QR_' + Date.now();
      await query(
        `UPDATE whatsapp_connections SET status = 'connecting', qr_code = ?, updated_at = NOW()
         WHERE restaurant_id = ?`,
        [demoQr, restaurantId]
      );
      const updated = await query('SELECT * FROM whatsapp_connections WHERE restaurant_id = ? LIMIT 1', [restaurantId]);
      return res.json({
        success: true,
        instanceName: name,
        qrcode: demoQr,
        status: "connecting",
        data: updated[0]
      });
    }

    // 1. chamar DELETE /instance/logout/restaurant_${restaurantId}
    try {
      console.log(`[WhatsApp reconnect] Logout instance: ${name}`);
      await callEvoApi('delete', `/instance/logout/${name}`);
    } catch (logoutErr) {
      console.log(`[WhatsApp reconnect] Logout returned error (ignoring):`, logoutErr.message);
    }

    // 2. chamar DELETE /instance/delete/restaurant_${restaurantId}
    try {
      console.log(`[WhatsApp reconnect] Delete instance: ${name}`);
      await callEvoApi('delete', `/instance/delete/${name}`);
    } catch (deleteErr) {
      console.log(`[WhatsApp reconnect] Delete returned error (ignoring):`, deleteErr.message);
    }

    // 3. criar novamente a instância
    try {
      console.log(`[WhatsApp reconnect] Recreating instance: ${name}`);
      await callEvoApi('post', '/instance/create', {
        instanceName: name,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      });
    } catch (createErr) {
      return res.status(500).json({
        success: false,
        message: 'Falha ao recriar a instância na Evolution API durante a reconexão.',
        details: createErr.message
      });
    }

    // 4. chamar connect novamente e obter QR Code
    let qrRaw = null;
    let errorDetail = null;
    try {
      const response = await callEvoApi('get', `/instance/connect/${name}`);
      qrRaw = extractQrCode(response.data);
      if (!qrRaw) {
        errorDetail = 'A resposta de conexão da Evolution API não continha nenhum formato de QR Code válido (base64, code, pairingCode).';
      }
    } catch (err) {
      console.error("[WhatsApp] Error connecting in reconnect:", err.message);
      errorDetail = err.message;
    }

    const qrCode = await ensureQrDataUrl(qrRaw);

    if (!qrCode) {
      return res.status(422).json({
        success: false,
        message: `Não foi possível gerar um novo QR Code ao reconectar: ${errorDetail}`,
        details: errorDetail
      });
    }

    await query(
      "UPDATE whatsapp_connections SET status = 'connecting', qr_code = ?, updated_at = NOW() WHERE restaurant_id = ?",
      [qrCode, restaurantId]
    );

    const updated = await query(
      'SELECT * FROM whatsapp_connections WHERE restaurant_id = ? LIMIT 1',
      [restaurantId]
    );

    return res.json({
      success: true,
      instanceName: name,
      qrcode: qrCode,
      status: "connecting",
      data: updated[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/whatsapp/qrcode
 * Busca o QR Code atualizado.
 */
const getQrCode = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const conn = await getOrCreateConnection(restaurantId);

    if (isEvoConfigured() && conn.status === 'connecting') {
      let qrRaw = null;
      let errorDetail = null;
      try {
        const response = await callEvoApi('get', `/instance/connect/${conn.session_name}`);
        qrRaw = extractQrCode(response.data);
        if (!qrRaw) {
          errorDetail = 'Evolution API connect responded successfully but did not contain a valid QR Code format.';
        }
      } catch (qrErr) {
        console.error("[WhatsApp] Error fetching QR in getQrCode:", qrErr.message);
        errorDetail = qrErr.message;
      }

      const qrCode = await ensureQrDataUrl(qrRaw);

      if (qrCode) {
        await query(
          'UPDATE whatsapp_connections SET qr_code = ?, updated_at = NOW() WHERE restaurant_id = ?',
          [qrCode, restaurantId]
        );
        return res.json({ success: true, data: { qr_code: qrCode } });
      } else {
        return res.status(422).json({
          success: false,
          message: `A Evolution API não retornou o QR Code ao atualizar: ${errorDetail}`,
          details: errorDetail
        });
      }
    }

    return res.json({ success: true, data: { qr_code: conn.qr_code } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/whatsapp/webhook
 * Recebe eventos da Evolution API (connection updates, QR code updates).
 */
const webhook = async (req, res, next) => {
  try {
    const payload = req.body;
    const event   = payload?.event;
    const instanceName = payload?.instance || payload?.data?.instance?.instanceName;

    console.log(`[WhatsApp Webhook LOG] Received event "${event}" for instance "${instanceName}":`, JSON.stringify(payload));

    if (!instanceName) return res.json({ success: true });

    // Resolver restaurant_id pelo session_name
    const rows = await query(
      'SELECT restaurant_id FROM whatsapp_connections WHERE session_name = ? LIMIT 1',
      [instanceName]
    );
    if (rows.length === 0) return res.json({ success: true });

    const restaurantId = rows[0].restaurant_id;

    if (event === 'connection.update' || event === 'QRCODE_UPDATED') {
      const state  = payload?.data?.state || payload?.data?.instance?.state;
      const qr     = extractQrCode(payload) || extractQrCode(payload?.data) || payload?.data?.qrcode?.base64 || null;
      const phone  = payload?.data?.wuid?.replace('@s.whatsapp.net', '') || null;
      const pname  = payload?.data?.profileName || null;

      let status = 'connecting';
      if (state === 'open')  status = 'connected';
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
        // Ignorar mensagens enviadas pelo próprio bot
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

        // Mensagem recebida de cliente — tentar responder com IA
        const customerPhone = (msg.key?.remoteJid || '').replace('@s.whatsapp.net', '');
        const customerMessage = (
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          ''
        ).trim();

        if (!customerPhone || !customerMessage) continue;

        // Salvar log da mensagem recebida
        await saveLog(restaurantId, 'received', customerPhone, customerMessage, 'sent');

        // Verificar se IA está habilitada para este restaurante
        const { enabled, settings: aiSettings } = await aiService.getAIConfig(restaurantId);
        if (!enabled || !aiSettings) continue;

        // Verificar se WhatsApp está conectado
        const connRows = await query(
          "SELECT * FROM whatsapp_connections WHERE restaurant_id = ? AND status = 'connected' LIMIT 1",
          [restaurantId]
        );
        if (connRows.length === 0) continue;
        const activeConn = connRows[0];

        // Gerar resposta da IA (com dados reais do banco)
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
          aiReply = aiSettings.ai_fallback_message ||
            'Desculpe, não consigo processar sua mensagem agora. Por favor, entre em contato diretamente conosco.';
        }

        if (!aiReply) continue;

        // Enviar resposta via Provedor Ativo
        if (isEvoConfigured() || getProvider() === 'zapi') {
          try {
            await sendTextHelper(customerPhone, aiReply, restaurantId);
            await saveLog(restaurantId, 'ai_response', customerPhone, aiReply, 'sent');
          } catch (sendErr) {
            console.error('[AI] Erro ao enviar resposta:', sendErr.message);
            await saveLog(restaurantId, 'ai_response', customerPhone, aiReply, 'error', sendErr.message);
          }
        } else {
          // Modo demo: apenas loga sem enviar
          await saveLog(restaurantId, 'ai_response', customerPhone, aiReply, 'demo', 'WhatsApp não configurado');
        }
      }
    }

    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/whatsapp/send
 * Envia mensagem manualmente a um número.
 */
const sendMessage = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const phone = req.body.phone || req.body.number;
    const message = req.body.message || req.body.text;

    if (!phone || !message) {
      return res.status(400).json({ success: false, message: 'Telefone/number e mensagem/text são obrigatórios.' });
    }

    const conn = await getOrCreateConnection(restaurantId);

    if (!isEvoConfigured() && getProvider() !== 'zapi') {
      await saveLog(restaurantId, 'manual', phone, message, 'demo', 'WhatsApp não configurado');
      return res.json({ success: true, message: '[DEMO] Mensagem registrada (sem envio real).', demo: true });
    }

    if (getProvider() === 'evolution' && conn.status !== 'connected') {
      return res.status(400).json({ success: false, message: 'WhatsApp não está conectado.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    await sendTextHelper(cleanPhone, message, restaurantId);

    await saveLog(restaurantId, 'manual', cleanPhone, message, 'sent');

    return res.json({ success: true, message: 'Mensagem enviada com sucesso!' });
  } catch (error) {
    const phone = req.body?.phone || req.body?.number;
    const message = req.body?.message || req.body?.text;
    await saveLog(req.user.restaurant_id, 'manual', phone, message, 'error', error.message);
    next(error);
  }
};

/**
 * GET /api/v1/whatsapp/logs
 * Retorna histórico de mensagens enviadas.
 */
const getLogs = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const page  = parseInt(req.query.page)  || 1;
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

/**
 * GET /api/v1/whatsapp/settings
 * Retorna configurações do WhatsApp (templates de mensagem).
 */
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

/**
 * PUT /api/v1/whatsapp/settings
 * Atualiza configurações e templates de mensagem do WhatsApp.
 */
const updateWhatsAppSettings = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const {
      is_enabled,
      notify_new_order, notify_order_confirmed, notify_order_ready,
      notify_out_for_delivery, notify_delivered, notify_cancelled,
      template_new_order, template_confirmed, template_ready,
      template_out_for_delivery, template_delivered, template_cancelled,
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
        notify_new_order ? 1 : 0, notify_order_confirmed ? 1 : 0,
        notify_order_ready ? 1 : 0, notify_out_for_delivery ? 1 : 0,
        notify_delivered ? 1 : 0, notify_cancelled ? 1 : 0,
        template_new_order || null, template_confirmed || null,
        template_ready || null, template_out_for_delivery || null,
        template_delivered || null, template_cancelled || null,
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

/**
 * GET /api/v1/whatsapp/ai-settings
 * Retorna as configurações da IA de atendimento.
 */
const getAISettings = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    let rows = await query(
      `SELECT ai_enabled, ai_name, ai_personality, ai_fallback_message, ai_model
       FROM whatsapp_settings WHERE restaurant_id = ? LIMIT 1`,
      [restaurantId]
    );

    // Criar registro se não existir
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

/**
 * PUT /api/v1/whatsapp/ai-settings
 * Atualiza as configurações da IA.
 */
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
        ai_name             || 'Assistente',
        ai_personality      || null,
        ai_fallback_message || null,
        ai_model            || 'gpt-4o-mini',
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

/**
 * POST /api/v1/whatsapp/ai-test
 * Testa a IA com uma pergunta avulsa (painel admin).
 */
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

/**
 * GET /api/v1/whatsapp/config-status
 * Retorna as configurações da Evolution API para o frontend saber se está ativa.
 */
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

// ─── Auto-send on order status change (called internally) ─────────────────────
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
      pending:          { flag: 'notify_new_order',         tmpl: 'template_new_order' },
      confirmed:        { flag: 'notify_order_confirmed',   tmpl: 'template_confirmed' },
      ready:            { flag: 'notify_order_ready',       tmpl: 'template_ready' },
      out_for_delivery: { flag: 'notify_out_for_delivery',  tmpl: 'template_out_for_delivery' },
      delivered:        { flag: 'notify_delivered',         tmpl: 'template_delivered' },
      cancelled:        { flag: 'notify_cancelled',         tmpl: 'template_cancelled' },
    };

    const mapping = fieldMap[newStatus];
    if (!mapping || !ws[mapping.flag]) return;

    let template = ws[mapping.tmpl] || '';
    if (!template) return;

    // Substituir variáveis no template
    template = template
      .replace(/{order_number}/g, order.order_number)
      .replace(/{total}/g, Number(order.total).toFixed(2))
      .replace(/{customer_name}/g, order.customer_name || 'Cliente')
      .replace(/{estimated_time}/g, order.estimated_time || '45');

    const phone = (order.customer_phone || '').replace(/\D/g, '');
    if (!phone) return;

    await sendTextHelper(phone, template, restaurantId);

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
