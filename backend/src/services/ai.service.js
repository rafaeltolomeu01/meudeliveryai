'use strict';

/**
 * ai.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Serviço de IA para atendimento automático via WhatsApp.
 *
 * GARANTIAS DE ISOLAMENTO (multi-tenant):
 *   - Toda query SQL usa WHERE restaurant_id = ? com o ID correto.
 *   - A IA recebe APENAS dados do restaurante solicitado no system prompt.
 *   - Nunca há acesso cruzado entre restaurantes.
 *   - A IA é instruída explicitamente a não inventar dados.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const OpenAI = require('openai');
const { query } = require('../config/database');
const conv     = require('./ai.conversation');

// ─── Cliente OpenAI ───────────────────────────────────────────────────────────
let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// ─── Buscar contexto completo do restaurante no banco ─────────────────────────

/**
 * Monta um contexto textual completo do restaurante para injetar no system prompt.
 * Todas as queries são filtradas por restaurant_id.
 *
 * @param {number} restaurantId - ID do restaurante (NUNCA misturar com outros)
 * @returns {string} Contexto formatado como texto
 */
async function buildRestaurantContext(restaurantId) {
  // ── 1. Dados do restaurante ──────────────────────────────────────────────
  const [restaurant] = await query(
    'SELECT name, phone, whatsapp, city, state, address FROM restaurants WHERE id = ? LIMIT 1',
    [restaurantId]
  );
  if (!restaurant) throw new Error(`Restaurante ${restaurantId} não encontrado.`);

  // ── 2. Configurações operacionais ────────────────────────────────────────
  const [settings] = await query(
    `SELECT is_open, delivery_enabled, delivery_fee, free_delivery_above,
            min_order_value, estimated_delivery_time, pickup_enabled,
            estimated_pickup_time, opening_hours, welcome_message,
            whatsapp_number, accept_orders_when_closed
     FROM restaurant_settings WHERE restaurant_id = ? LIMIT 1`,
    [restaurantId]
  );

  // ── 3. Formas de pagamento ───────────────────────────────────────────────
  const [payments] = await query(
    `SELECT accepts_cash, accepts_credit_card, accepts_debit_card,
            accepts_pix, pix_key, pix_key_type, pix_receiver_name,
            accepts_meal_voucher
     FROM payment_settings WHERE restaurant_id = ? LIMIT 1`,
    [restaurantId]
  );

  // ── 4. Categorias ativas ─────────────────────────────────────────────────
  const categories = await query(
    `SELECT id, name, description FROM categories
     WHERE restaurant_id = ? AND is_active = 1 ORDER BY position`,
    [restaurantId]
  );

  // ── 5. Produtos disponíveis ──────────────────────────────────────────────
  const products = await query(
    `SELECT p.id, p.name, p.description, p.price, p.promotional_price,
            p.is_featured, p.is_available, p.serves_how_many,
            p.preparation_time, p.tags,
            c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.restaurant_id = ? AND p.is_available = 1
     ORDER BY c.position, p.position`,
    [restaurantId]
  );

  // ── 6. Opcionais/adicionais dos produtos ─────────────────────────────────
  const options = await query(
    `SELECT po.product_id, po.group_name, po.name, po.price, po.is_required,
            po.min_quantity, po.max_quantity
     FROM product_options po
     WHERE po.restaurant_id = ? AND po.is_active = 1
     ORDER BY po.product_id, po.position`,
    [restaurantId]
  );

  // ── Montar mapa de opcionais por produto ──
  const optsByProduct = {};
  for (const opt of options) {
    if (!optsByProduct[opt.product_id]) optsByProduct[opt.product_id] = {};
    if (!optsByProduct[opt.product_id][opt.group_name]) {
      optsByProduct[opt.product_id][opt.group_name] = [];
    }
    optsByProduct[opt.product_id][opt.group_name].push(opt);
  }

  // ─── Formatar horários ────────────────────────────────────────────────────
  let hoursText = 'Horários não configurados.';
  if (settings?.opening_hours) {
    const hours = typeof settings.opening_hours === 'string'
      ? JSON.parse(settings.opening_hours)
      : settings.opening_hours;

    const dayNames = {
      monday: 'Segunda-feira', tuesday: 'Terça-feira', wednesday: 'Quarta-feira',
      thursday: 'Quinta-feira', friday: 'Sexta-feira', saturday: 'Sábado', sunday: 'Domingo',
    };
    hoursText = Object.entries(hours).map(([day, cfg]) => {
      if (!cfg.enabled) return `${dayNames[day] || day}: Fechado`;
      return `${dayNames[day] || day}: ${cfg.open || cfg.from} às ${cfg.close || cfg.to}`;
    }).join('\n');
  }

  // ─── Formatar pagamentos ──────────────────────────────────────────────────
  const paymentMethods = [];
  if (payments?.accepts_cash)        paymentMethods.push('Dinheiro');
  if (payments?.accepts_credit_card) paymentMethods.push('Cartão de Crédito');
  if (payments?.accepts_debit_card)  paymentMethods.push('Cartão de Débito');
  if (payments?.accepts_pix)         paymentMethods.push(`Pix (${payments.pix_key_type || 'chave'}: ${payments.pix_key || 'não configurado'})`);
  if (payments?.accepts_meal_voucher) paymentMethods.push('Vale Refeição');

  // ─── Formatar cardápio ────────────────────────────────────────────────────
  let menuText = '';
  const productsByCategory = {};
  for (const p of products) {
    const cat = p.category_name || 'Sem categoria';
    if (!productsByCategory[cat]) productsByCategory[cat] = [];
    productsByCategory[cat].push(p);
  }

  for (const [catName, prods] of Object.entries(productsByCategory)) {
    menuText += `\n### ${catName}\n`;
    for (const p of prods) {
      const price = parseFloat(p.price).toFixed(2);
      const promoPrice = p.promotional_price ? parseFloat(p.promotional_price).toFixed(2) : null;
      const featured = p.is_featured ? ' ⭐ DESTAQUE' : '';
      const priceStr = promoPrice
        ? `R$ ${promoPrice} (promoção, de R$ ${price})`
        : `R$ ${price}`;

      menuText += `- **${p.name}**${featured}: ${priceStr}`;
      if (p.description) menuText += ` — ${p.description}`;
      if (p.serves_how_many && p.serves_how_many > 1) menuText += ` (serve ${p.serves_how_many} pessoas)`;

      // Opcionais
      const opts = optsByProduct[p.id];
      if (opts) {
        for (const [groupName, items] of Object.entries(opts)) {
          menuText += `\n    Adicionais - ${groupName}: `;
          menuText += items.map(o => `${o.name} (+R$ ${parseFloat(o.price).toFixed(2)})`).join(', ');
        }
      }
      menuText += '\n';
    }
  }

  if (!menuText) menuText = 'Nenhum produto disponível no momento.';

  // ─── Montar contexto final ────────────────────────────────────────────────
  const isOpen      = settings?.is_open ? 'SIM' : 'NÃO (mas pode aceitar pedidos programados)';
  const deliveryFee = settings?.delivery_fee != null ? `R$ ${parseFloat(settings.delivery_fee).toFixed(2)}` : 'consultar';
  const minOrder    = settings?.min_order_value != null ? `R$ ${parseFloat(settings.min_order_value).toFixed(2)}` : 'não informado';
  const freeDelivery = settings?.free_delivery_above
    ? `Entrega grátis em pedidos acima de R$ ${parseFloat(settings.free_delivery_above).toFixed(2)}`
    : 'Sem frete grátis disponível';
  const deliveryTime = settings?.estimated_delivery_time
    ? `${settings.estimated_delivery_time} minutos`
    : 'a confirmar';
  const pickupTime = settings?.estimated_pickup_time
    ? `${settings.estimated_pickup_time} minutos`
    : 'a confirmar';

  const context = `
=== INFORMAÇÕES DO RESTAURANTE ===
Nome: ${restaurant.name}
Cidade: ${restaurant.city || 'não informado'} / ${restaurant.state || ''}
Endereço: ${restaurant.address || 'não informado'}
WhatsApp: ${settings?.whatsapp_number || restaurant.whatsapp || 'não informado'}

=== STATUS ATUAL ===
Estabelecimento aberto agora: ${isOpen}

=== HORÁRIOS DE FUNCIONAMENTO ===
${hoursText}

=== DELIVERY E RETIRADA ===
Delivery disponível: ${settings?.delivery_enabled ? 'Sim' : 'Não'}
Taxa de entrega: ${deliveryFee}
${freeDelivery}
Pedido mínimo: ${minOrder}
Tempo estimado de entrega: ${deliveryTime}
Retirada no local: ${settings?.pickup_enabled ? `Sim (em ${pickupTime})` : 'Não'}

=== FORMAS DE PAGAMENTO ===
${paymentMethods.length > 0 ? paymentMethods.join(', ') : 'Não configurado'}

=== CARDÁPIO COMPLETO (APENAS PRODUTOS DISPONÍVEIS) ===
${menuText}
`.trim();

  return context;
}

/**
 * Busca pedidos recentes do cliente para responder sobre status.
 * @param {number} restaurantId
 * @param {string} phone - Número do cliente (apenas dígitos)
 * @returns {string} Texto com os pedidos recentes
 */
async function getCustomerOrdersContext(restaurantId, phone) {
  const cleanPhone = phone.replace(/\D/g, '');

  // Buscar pedidos dos últimos 7 dias pelo telefone do cliente
  const orders = await query(
    `SELECT o.order_number, o.status, o.total, o.payment_method, o.payment_status,
            o.order_type, o.created_at, o.estimated_time,
            c.name AS customer_name
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     WHERE o.restaurant_id = ?
       AND (
         c.phone LIKE ? OR c.phone LIKE ?
         OR o.delivery_address LIKE ?
       )
       AND o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     ORDER BY o.created_at DESC
     LIMIT 5`,
    [restaurantId, `%${cleanPhone}%`, `%${cleanPhone.slice(-8)}%`, `%`]
  );

  if (orders.length === 0) {
    return 'Nenhum pedido recente encontrado para este número de telefone.';
  }

  const statusMap = {
    pending:          '⏳ Aguardando confirmação',
    confirmed:        '✅ Confirmado',
    preparing:        '👨‍🍳 Em preparo',
    ready:            '🎉 Pronto para entrega/retirada',
    out_for_delivery: '🛵 Saiu para entrega',
    delivered:        '🏠 Entregue',
    picked_up:        '✅ Retirado',
    cancelled:        '❌ Cancelado',
  };

  let text = 'Pedidos recentes:\n';
  for (const o of orders) {
    const status = statusMap[o.status] || o.status;
    const date   = new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    text += `- Pedido #${o.order_number}: ${status} | Total: R$ ${parseFloat(o.total).toFixed(2)} | Data: ${date}\n`;
  }

  return text;
}

// ─── Verificar se IA está configurada e ativa ─────────────────────────────────

/**
 * Verifica se a IA está habilitada para o restaurante.
 * @param {number} restaurantId
 * @returns {{ enabled: boolean, settings: object|null }}
 */
async function getAIConfig(restaurantId) {
  const rows = await query(
    `SELECT ai_enabled, ai_name, ai_personality, ai_fallback_message, ai_model
     FROM whatsapp_settings WHERE restaurant_id = ? LIMIT 1`,
    [restaurantId]
  );
  if (rows.length === 0 || !rows[0].ai_enabled) {
    return { enabled: false, settings: null };
  }
  return { enabled: true, settings: rows[0] };
}

// ─── Processar mensagem recebida do cliente ───────────────────────────────────

/**
 * Processa uma mensagem recebida de um cliente WhatsApp e retorna a resposta da IA.
 *
 * @param {number}  restaurantId - ID do restaurante (isolamento garantido)
 * @param {string}  phone        - Número do cliente (apenas dígitos)
 * @param {string}  message      - Mensagem do cliente
 * @param {object}  aiSettings   - Configurações da IA (nome, personalidade, etc.)
 * @returns {string|null} Resposta da IA ou null se não conseguir responder
 */
async function processIncomingMessage(restaurantId, phone, message, aiSettings) {
  const client = getOpenAIClient();
  if (!client) {
    console.warn('[AI] OPENAI_API_KEY não configurada — IA desabilitada.');
    return null;
  }

  // ── Verificar se a mensagem menciona pedido/status ──
  const mentionsOrder = /pedido|status|onde|entrega|chegou|saiu/i.test(message);

  // ── Buscar contexto do restaurante do banco ──
  const restaurantContext = await buildRestaurantContext(restaurantId);

  // ── Buscar pedidos do cliente se relevante ──
  let ordersContext = '';
  if (mentionsOrder) {
    ordersContext = '\n\n=== PEDIDOS DO CLIENTE ===\n' + await getCustomerOrdersContext(restaurantId, phone);
  }

  // ── Montar system prompt ──────────────────────────────────────────────────
  const aiName        = aiSettings.ai_name        || 'Assistente';
  const aiPersonality = aiSettings.ai_personality || 'Seja simpático, prestativo e objetivo.';
  const aiModel       = aiSettings.ai_model        || 'gpt-4o-mini';

  const systemPrompt = `Você é ${aiName}, o atendente virtual do restaurante abaixo via WhatsApp.

${aiPersonality}

═══════════════════════════════════════════════════════════
DADOS REAIS DO RESTAURANTE (USE APENAS ESTES DADOS):
═══════════════════════════════════════════════════════════
${restaurantContext}${ordersContext}
═══════════════════════════════════════════════════════════

REGRAS OBRIGATÓRIAS — NUNCA VIOLE ESTAS REGRAS:
1. Use APENAS os dados fornecidos acima. NÃO invente produtos, preços, promoções ou informações.
2. Se o cliente perguntar por um produto que não está no cardápio, diga que não temos esse item.
3. Se o cliente perguntar por um preço diferente do listado, use APENAS o preço real cadastrado.
4. NÃO crie promoções, descontos ou ofertas que não estejam listadas como "promoção" no cardápio.
5. Para status de pedido, use APENAS os dados de pedido fornecidos acima.
6. Se não souber algo, diga honestamente: "Não tenho essa informação, entre em contato pelo telefone do restaurante."
7. Responda em português do Brasil, de forma amigável, curta e adequada ao WhatsApp.
8. Não use markdown como **negrito** ou # cabeçalhos — escreva texto simples para WhatsApp.
9. Não informe dados de outros restaurantes — você representa APENAS o restaurante acima.
10. Nunca confirme um pedido — explique como fazer o pedido pelo cardápio digital.`;

  // ── Histórico da conversa ──
  const history = conv.getHistory(restaurantId, phone);

  // ── Adicionar mensagem do usuário ao histórico ──
  conv.addUserMessage(restaurantId, phone, message);

  // ── Chamar OpenAI ─────────────────────────────────────────────────────────
  const completion = await client.chat.completions.create({
    model: aiModel,
    max_tokens: 500,
    temperature: 0.5,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ],
  });

  const reply = completion.choices[0]?.message?.content?.trim() || null;

  // ── Adicionar resposta ao histórico ──
  if (reply) {
    conv.addAssistantMessage(restaurantId, phone, reply);
  }

  return reply;
}

/**
 * Testa a IA com uma pergunta avulsa (sem histórico).
 * Usado no painel de administração.
 *
 * @param {number} restaurantId
 * @param {string} question - Pergunta de teste
 * @returns {{ response: string, context_preview: string, openai_configured: boolean }}
 */
async function testAI(restaurantId, question) {
  const openaiConfigured = !!process.env.OPENAI_API_KEY;

  // Buscar config da IA
  const { enabled, settings } = await getAIConfig(restaurantId);

  // Buscar contexto (mesmo sem IA ativa, para preview)
  const restaurantContext = await buildRestaurantContext(restaurantId);
  const contextPreview    = restaurantContext.substring(0, 500) + '...';

  if (!openaiConfigured) {
    return {
      response: '[DEMO] OPENAI_API_KEY não configurada. Configure a chave no arquivo .env do backend e reinicie o servidor.',
      context_preview: contextPreview,
      openai_configured: false,
    };
  }

  const aiSettings = settings || {
    ai_name:        'Assistente',
    ai_personality: 'Seja simpático, prestativo e objetivo.',
    ai_model:       'gpt-4o-mini',
    ai_fallback_message: null,
  };

  const response = await processIncomingMessage(
    restaurantId,
    'test_admin',
    question,
    aiSettings
  );

  // Limpar conversa de teste
  conv.clearConversation(restaurantId, 'test_admin');

  return {
    response: response || 'A IA não gerou uma resposta.',
    context_preview: contextPreview,
    openai_configured: true,
  };
}

module.exports = {
  processIncomingMessage,
  buildRestaurantContext,
  getCustomerOrdersContext,
  getAIConfig,
  testAI,
};
