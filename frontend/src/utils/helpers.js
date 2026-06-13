/**
 * Format a number as Brazilian Real currency
 * @param {number} value
 * @returns {string} e.g. "R$ 1.234,56"
 */
export function formatCurrency(value) {
  if (value === null || value === undefined) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/**
 * Format a date as DD/MM/YYYY
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return '--'
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR')
}

/**
 * Format a date as DD/MM/YYYY HH:mm
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDateTime(date) {
  if (!date) return '--'
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Format time in minutes as "Xh Ym" or "Xmin"
 * @param {number} minutes
 * @returns {string}
 */
export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

/**
 * Get Tailwind CSS classes for order status
 * @param {string} status
 * @returns {string}
 */
export function getStatusColor(status) {
  const map = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    preparing: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    ready: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    delivering: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    delivered: 'bg-green-500/10 text-green-400 border-green-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
    available: 'bg-green-500/10 text-green-400 border-green-500/20',
    unavailable: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    active: 'bg-green-500/10 text-green-400 border-green-500/20',
    inactive: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  }
  return map[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
}

/**
 * Get Portuguese label for order status
 * @param {string} status
 * @returns {string}
 */
export function getStatusLabel(status) {
  const map = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    ready: 'Pronto',
    delivering: 'A caminho',
    delivered: 'Entregue',
    cancelled: 'Cancelado',
    available: 'Disponível',
    unavailable: 'Indisponível',
    active: 'Ativo',
    inactive: 'Inativo',
    open: 'Aberto',
    closed: 'Fechado',
  }
  return map[status] || status
}

/**
 * Get Portuguese label for payment method
 * @param {string} method
 * @returns {string}
 */
export function getPaymentLabel(method) {
  const map = {
    pix: 'PIX',
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
    cash: 'Dinheiro',
    online: 'Online',
    voucher: 'Vale-refeição',
  }
  return map[method] || method
}

/**
 * Truncate a string to n characters
 * @param {string} str
 * @param {number} n
 * @returns {string}
 */
export function truncate(str, n = 50) {
  if (!str) return ''
  return str.length > n ? str.substring(0, n - 3) + '...' : str
}

/**
 * Generate a random order number like #BP-2847
 * @returns {string}
 */
export function generateOrderNumber() {
  const prefix = 'BP'
  const num = Math.floor(1000 + Math.random() * 9000)
  return `#${prefix}-${num}`
}

/**
 * Calculate percentage change
 * @param {number} current
 * @param {number} previous
 * @returns {{ value: number, positive: boolean, label: string }}
 */
export function calcChange(current, previous) {
  if (!previous || previous === 0) return { value: 0, positive: true, label: '0%' }
  const diff = ((current - previous) / previous) * 100
  return {
    value: Math.abs(diff),
    positive: diff >= 0,
    label: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`,
  }
}

/**
 * Get relative time string
 * @param {string|Date} date
 * @returns {string}
 */
export function getRelativeTime(date) {
  if (!date) return ''
  const now = new Date()
  const d = new Date(date)
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}min atrás`
  if (diffH < 24) return `${diffH}h atrás`
  if (diffD === 1) return 'ontem'
  return formatDate(date)
}

/**
 * Format phone number as (XX) XXXXX-XXXX
 * @param {string} phone
 * @returns {string}
 */
export function formatPhone(phone) {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

/**
 * Get initials from name
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

/**
 * Format CPF as XXX.XXX.XXX-XX
 * @param {string} cpf
 * @returns {string}
 */
export function formatCPF(cpf) {
  if (!cpf) return ''
  const cleaned = cpf.replace(/\D/g, '')
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Resolves the absolute backend URL for relative image paths starting with /uploads.
 * Works across development (with localhost:3001) and production environments.
 * @param {string} url - The image path
 * @returns {string} The full absolute image URL
 */
export function formatImageUrl(url) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }
  
  let backendUrl = ''
  if (import.meta.env && import.meta.env.VITE_API_URL) {
    backendUrl = import.meta.env.VITE_API_URL.replace('/api/v1', '')
  } else {
    backendUrl = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:3001'
      : (typeof window !== 'undefined' ? window.location.origin : '')
  }
  
  const baseUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl
  const relativePath = url.startsWith('/') ? url : `/${url}`
  return `${baseUrl}${relativePath}`
}
