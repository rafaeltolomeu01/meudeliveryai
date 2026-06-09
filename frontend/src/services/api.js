import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mda_token')
    if (token && !config.headers?.Authorization) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const url = error.config?.url || ''
    const isPublicCustomerRoute = url.includes('/public/')

    // Não derruba o login do painel quando um token do cliente público expira.
    if (error.response?.status === 401 && !isPublicCustomerRoute) {
      localStorage.removeItem('mda_token')
      localStorage.removeItem('mda_user')
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    const message = error.response?.data?.message || 'Erro inesperado. Tente novamente.'
    const details = error.response?.data?.details || null
    return Promise.reject({ message, details, status: error.response?.status, original: error })
  }
)

const normalizeCustomerAuthResponse = (res) => {
  const payload = res?.data || {}
  return {
    ...res,
    token: res?.token || payload?.token || null,
    customer: res?.customer || payload?.customer || null,
    data: payload?.customer || payload || null,
  }
}

const cleanPhone = (value = '') => String(value).replace(/\D/g, '')
const cleanEmail = (value = '') => String(value).trim().toLowerCase()

// ===== AUTH =====
export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
}

export const restaurants = {
  get: () => api.get('/restaurant'),
  update: (data) => api.put('/restaurant', data),
  updateHours: (hours) => api.put('/settings/opening-hours', { opening_hours: hours }),
  toggleOpen: () => api.patch('/settings/toggle-open'),
  uploadLogo: (formData) => api.post('/restaurant/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadCover: (formData) => api.post('/restaurant/cover', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
}

export const products = {
  list: (params) => api.get('/products', { params }),
  get: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  toggleAvailable: (id) => api.patch(`/products/${id}/toggle`),
  uploadImage: (id, formData) => api.post(`/products/${id}/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
}

export const categories = {
  list: () => api.get('/categories'),
  get: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
  reorder: (items) => api.put('/categories/reorder', { items }),
}

export const orders = {
  list: (params) => api.get('/orders', { params }),
  get: (id) => api.get(`/orders/${id}`),
  create: (data, config = {}) => api.post('/orders', data, config),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  markAsPaid: (id) => api.patch(`/orders/${id}/mark-as-paid`),
  cancel: (id, reason) => api.patch(`/orders/${id}/cancel`, { reason }),
  assignDriver: (id, driverId) => api.patch(`/orders/${id}/assign-driver`, { driverId }),
  stats: (params) => api.get('/orders/stats', { params }),
  getMessages: (id) => api.get(`/orders/${id}/messages`),
  sendMessage: (id, message) => api.post(`/orders/${id}/messages`, { message }),
}

export const customers = {
  list: (params) => api.get('/customers', { params }),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  orders: (id, params) => api.get(`/customers/${id}/orders`, { params }),
}

export const drivers = {
  list: (params) => api.get('/drivers', { params }),
  get: (id) => api.get(`/drivers/${id}`),
  create: (data) => api.post('/drivers', data),
  update: (id, data) => api.put(`/drivers/${id}`, data),
  delete: (id) => api.delete(`/drivers/${id}`),
  toggleAvailable: (id) => api.patch(`/drivers/${id}/toggle`),
  performance: (id, params) => api.get(`/drivers/${id}/performance`, { params }),
}

export const reports = {
  overview: (params) => api.get('/reports/overview', { params }),
  sales: (params) => api.get('/reports/sales', { params }),
  products: (params) => api.get('/reports/products', { params }),
  customers: (params) => api.get('/reports/customers', { params }),
  drivers: (params) => api.get('/reports/drivers', { params }),
  export: (type, params) => api.get(`/reports/export/${type}`, { params, responseType: 'blob' }),
}

export const settings = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  updateDelivery: (data) => api.put('/settings/delivery', data),
  getPayments: () => api.get('/settings/payments'),
  updatePayments: (data) => api.put('/settings/payments', data),
  updateIntegrations: (data) => api.put('/settings/integrations', data),
  getAppearance: () => api.get('/settings/appearance'),
  updateAppearance: (data) => api.put('/settings/appearance', data),
}

export const users = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
}

export const subscription = {
  get: () => api.get('/subscription'),
  renew: () => api.post('/subscription/renew'),
  upgrade: (planId) => api.post('/subscription/upgrade', { plan_id: planId }),
}

// ===== PUBLIC (CARDAPIO) =====
export const publicApi = {
  getRestaurant: (slug) => api.get(`/public/restaurant/${slug}`),
  getMenu: (slug) => api.get(`/public/restaurant/${slug}/menu`),
  createOrder: (slug, data) => {
    const token = localStorage.getItem(`mda_customer_token_${slug}`)
    return api.post(`/public/restaurant/${slug}/orders`, data, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  },
  getOrder: (slug, orderId) => api.get(`/public/restaurant/${slug}/orders/${orderId}`),
  getMessages: (slug, orderId) => api.get(`/public/restaurant/${slug}/orders/${orderId}/messages`),
  sendMessage: (slug, orderId, message) => api.post(`/public/restaurant/${slug}/orders/${orderId}/messages`, { message }),
  customerRegister: (slug, data) => api.post(`/public/restaurant/${slug}/auth/register`, {
    ...data,
    email: cleanEmail(data.email || ''),
    phone: cleanPhone(data.phone || ''),
    document: cleanPhone(data.document || ''),
  }).then(normalizeCustomerAuthResponse),
  customerLogin: (slug, data) => {
    const phone = cleanPhone(data.phone || '')
    const emailOrPhone = phone || cleanEmail(data.email || '')
    return api.post(`/public/restaurant/${slug}/auth/login`, {
      identifier: emailOrPhone,
      email: emailOrPhone,
      phone,
      password: data.password,
    }).then(normalizeCustomerAuthResponse)
  },
  customerMe: (slug) => {
    const token = localStorage.getItem(`mda_customer_token_${slug}`)
    return api.get(`/public/restaurant/${slug}/auth/me`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  },
  getCustomerOrders: (slug) => {
    const token = localStorage.getItem(`mda_customer_token_${slug}`)
    return api.get(`/public/restaurant/${slug}/customer/orders`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  },
  getAddresses: (slug) => {
    const token = localStorage.getItem(`mda_customer_token_${slug}`)
    return api.get(`/public/restaurant/${slug}/customer/addresses`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  },
  addAddress: (slug, data) => {
    const token = localStorage.getItem(`mda_customer_token_${slug}`)
    return api.post(`/public/restaurant/${slug}/customer/addresses`, data, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  },
  deleteAddress: (slug, id) => {
    const token = localStorage.getItem(`mda_customer_token_${slug}`)
    return api.delete(`/public/restaurant/${slug}/customer/addresses/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  },
}

export const admin = {
  listRestaurants: (params) => api.get('/admin/restaurants', { params }),
  getRestaurant: (id) => api.get(`/admin/restaurants/${id}`),
  updateStatus: (id, status) => api.patch(`/admin/restaurants/${id}/status`, { status }),
  updateSubscription: (id, data) => api.put(`/admin/restaurants/${id}/subscription`, data),
  listPlans: () => api.get('/admin/plans'),
}

export const whatsapp = {
  status: () => api.get('/whatsapp/status'),
  configStatus: () => api.get('/whatsapp/config-status'),
  connect: () => api.post('/whatsapp/connect'),
  disconnect: () => api.post('/whatsapp/disconnect'),
  reconnect: () => api.post('/whatsapp/reconnect'),
  qrcode: () => api.get('/whatsapp/qrcode'),
  send: (data) => api.post('/whatsapp/send', data),
  logs: (params) => api.get('/whatsapp/logs', { params }),
  getSettings: () => api.get('/whatsapp/settings'),
  updateSettings: (data) => api.put('/whatsapp/settings', data),
  getAISettings: () => api.get('/whatsapp/ai-settings'),
  updateAISettings: (data) => api.put('/whatsapp/ai-settings', data),
  testAI: (question) => api.post('/whatsapp/ai-test', { question }),
}

export const complements = {
  listGroups: () => api.get('/complements/groups'),
  getGroup: (id) => api.get(`/complements/groups/${id}`),
  createGroup: (data) => api.post('/complements/groups', data),
  updateGroup: (id, data) => api.put(`/complements/groups/${id}`, data),
  deleteGroup: (id) => api.delete(`/complements/groups/${id}`),
  reorderGroups: (items) => api.put('/complements/groups/reorder', { items }),
  listItems: (groupId) => api.get(`/complements/groups/${groupId}/items`),
  createItem: (data) => api.post('/complements/items', data),
  updateItem: (id, data) => api.put(`/complements/items/${id}`),
  deleteItem: (id) => api.delete(`/complements/items/${id}`),
  reorderItems: (items) => api.put('/complements/items/reorder', { items }),
}

export default api
