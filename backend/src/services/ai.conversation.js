'use strict';

/**
 * ai.conversation.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Cache em memória de histórico de conversas por restaurante + telefone.
 * TTL padrão: 30 minutos de inatividade.
 * Histórico limitado a 10 turnos (20 mensagens) para controlar tokens.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const CONVERSATION_TTL_MS  = 30 * 60 * 1000; // 30 minutos
const MAX_HISTORY_MESSAGES = 20;              // 10 turnos (user + assistant)

// Mapa: `${restaurantId}:${phone}` → { messages: [], lastActivity: timestamp }
const store = new Map();

/**
 * Retorna chave única de conversa.
 */
function key(restaurantId, phone) {
  return `${restaurantId}:${phone}`;
}

/**
 * Limpa conversas expiradas periodicamente.
 */
setInterval(() => {
  const now = Date.now();
  for (const [k, conv] of store.entries()) {
    if (now - conv.lastActivity > CONVERSATION_TTL_MS) {
      store.delete(k);
    }
  }
}, 5 * 60 * 1000); // executa a cada 5 minutos

/**
 * Obtém o histórico de uma conversa.
 * @param {number} restaurantId
 * @param {string} phone
 * @returns {Array} array de { role, content }
 */
function getHistory(restaurantId, phone) {
  const k = key(restaurantId, phone);
  const conv = store.get(k);
  if (!conv) return [];
  if (Date.now() - conv.lastActivity > CONVERSATION_TTL_MS) {
    store.delete(k);
    return [];
  }
  return conv.messages;
}

/**
 * Adiciona mensagem do usuário ao histórico.
 * @param {number} restaurantId
 * @param {string} phone
 * @param {string} content
 */
function addUserMessage(restaurantId, phone, content) {
  const k = key(restaurantId, phone);
  if (!store.has(k)) {
    store.set(k, { messages: [], lastActivity: Date.now() });
  }
  const conv = store.get(k);
  conv.messages.push({ role: 'user', content });
  conv.lastActivity = Date.now();
  trimHistory(conv);
}

/**
 * Adiciona mensagem do assistente ao histórico.
 * @param {number} restaurantId
 * @param {string} phone
 * @param {string} content
 */
function addAssistantMessage(restaurantId, phone, content) {
  const k = key(restaurantId, phone);
  if (!store.has(k)) {
    store.set(k, { messages: [], lastActivity: Date.now() });
  }
  const conv = store.get(k);
  conv.messages.push({ role: 'assistant', content });
  conv.lastActivity = Date.now();
  trimHistory(conv);
}

/**
 * Limita o histórico a MAX_HISTORY_MESSAGES.
 */
function trimHistory(conv) {
  if (conv.messages.length > MAX_HISTORY_MESSAGES) {
    conv.messages = conv.messages.slice(conv.messages.length - MAX_HISTORY_MESSAGES);
  }
}

/**
 * Limpa a conversa de um cliente (ex: após pedido confirmado).
 * @param {number} restaurantId
 * @param {string} phone
 */
function clearConversation(restaurantId, phone) {
  store.delete(key(restaurantId, phone));
}

/**
 * Quantidade de conversas ativas no momento.
 */
function activeConversations() {
  return store.size;
}

module.exports = {
  getHistory,
  addUserMessage,
  addAssistantMessage,
  clearConversation,
  activeConversations,
};
