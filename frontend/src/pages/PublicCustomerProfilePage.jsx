import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Plus, Trash2, LogOut, Loader2, Clipboard,
  Clock, CheckCircle2, User, KeyRound, Smartphone, Mail, FileText,
  ChevronRight, ShoppingBag, AlertCircle, ShieldAlert, Star
} from 'lucide-react'
import { publicApi } from '../services/api'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import toast from 'react-hot-toast'

export default function PublicCustomerProfilePage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')

  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState(null)
  const [customerToken, setCustomerToken] = useState(() => localStorage.getItem(`mda_customer_token_${slug}`))
  
  // Tabs: 'addresses' | 'orders' | 'profile'
  const [activeTab, setActiveTab] = useState('addresses')

  // Auth States
  const [authMode, setAuthMode] = useState('login') // 'login' | 'register'
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    document: ''
  })
  const [authLoading, setAuthLoading] = useState(false)

  // Address Management States
  const [addresses, setAddresses] = useState([])
  const [addressLoading, setAddressLoading] = useState(false)
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [addressForm, setAddressForm] = useState({
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    reference: '',
    neighborhood: '',
    city: '',
    state: '',
    isDefault: false
  })
  const [addressFormErrors, setAddressFormErrors] = useState({})

  // Orders History State
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  // Load Customer Profile and associated data
  const loadCustomerData = async () => {
    const token = localStorage.getItem(`mda_customer_token_${slug}`)
    if (!token) {
      setCustomer(null)
      setLoading(false)
      return
    }
    
    try {
      const meRes = await publicApi.customerMe(slug)
      if (meRes.success && meRes.data) {
        setCustomer(meRes.data)
        
        // Fetch addresses
        setAddressLoading(true)
        const addrRes = await publicApi.getAddresses(slug)
        if (addrRes.success && addrRes.data) {
          setAddresses(addrRes.data)
        }
        setAddressLoading(false)

        // Fetch orders
        setOrdersLoading(true)
        const ordersRes = await publicApi.getCustomerOrders(slug)
        if (ordersRes.success && ordersRes.data) {
          setOrders(ordersRes.data)
        }
        setOrdersLoading(false)
      }
    } catch (err) {
      console.warn('Erro ao carregar dados do cliente:', err)
      localStorage.removeItem(`mda_customer_token_${slug}`)
      setCustomer(null)
      setCustomerToken(null)
    } finally {
      setLoading(false)
    }
  }

  // Load restaurant theme and details
  useEffect(() => {
    async function loadRestaurant() {
      try {
        const res = await publicApi.getRestaurant(slug)
        if (res.success) setRestaurant(res.data)
      } catch (err) {
        console.warn('Erro ao carregar restaurante para perfil.', err)
      } finally {
        if (!customerToken) setLoading(false)
      }
    }
    loadRestaurant()
  }, [slug, customerToken])

  useEffect(() => {
    if (customerToken) {
      loadCustomerData()
    }
  }, [customerToken, slug])
  // Handle Login & Register submission
  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    setAuthLoading(true)
    try {
      if (authMode === 'login') {
        if (!authForm.email && !authForm.phone) {
          toast.error('Informe seu WhatsApp ou E-mail para entrar.')
          setAuthLoading(false)
          return
        }
        const res = await publicApi.customerLogin(slug, {
          email: authForm.email || authForm.phone,
          phone: authForm.phone,
          password: authForm.password
        })
        if (res.success) {
          localStorage.setItem(`mda_customer_token_${slug}`, res?.data?.token || res?.token)
          setCustomerToken(res?.data?.token || res?.token)
          toast.success('Login efetuado com sucesso! ðŸ‘‹')
          if (redirect === 'checkout') {
            navigate(`/cardapio/${slug}/checkout`)
          }
        }
      } else {
        if (!authForm.name || !authForm.password || !authForm.phone) {
          toast.error('Nome, Senha e WhatsApp sÃ£o obrigatÃ³rios.')
          setAuthLoading(false)
          return
        }
        const res = await publicApi.customerRegister(slug, {
          name: authForm.name,
          email: authForm.email,
          phone: authForm.phone,
          password: authForm.password,
          document: authForm.document
        })
        if (res.success) {
          localStorage.setItem(`mda_customer_token_${slug}`, res?.data?.token || res?.token)
          setCustomerToken(res?.data?.token || res?.token)
          toast.success('Cadastro realizado com sucesso! ðŸŽ‰')
          if (redirect === 'checkout') {
            navigate(`/cardapio/${slug}/checkout`)
          }
        }
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Erro na autenticaÃ§Ã£o. Verifique os dados.')
    } finally {
      setAuthLoading(false)
    }
  }

  // Handle Add Address Submission
  const validateAddressForm = () => {
    const errs = {}
    if (!addressForm.street.trim()) errs.street = 'Rua Ã© obrigatÃ³ria'
    if (!addressForm.number.trim()) errs.number = 'NÃºmero Ã© obrigatÃ³rio'
    if (!addressForm.neighborhood.trim()) errs.neighborhood = 'Bairro Ã© obrigatÃ³rio'
    if (!addressForm.city.trim()) errs.city = 'Cidade Ã© obrigatÃ³ria'
    if (!addressForm.state.trim()) errs.state = 'UF Ã© obrigatÃ³ria'
    return errs
  }

  const handleAddAddressSubmit = async (e) => {
    e.preventDefault()
    const errs = validateAddressForm()
    if (Object.keys(errs).length > 0) {
      setAddressFormErrors(errs)
      return
    }

    setAddressLoading(true)
    try {
      const res = await publicApi.addAddress(slug, {
        zip_code: addressForm.zipCode,
        street: addressForm.street,
        number: addressForm.number,
        complement: addressForm.complement,
        neighborhood: addressForm.neighborhood,
        city: addressForm.city,
        state: addressForm.state,
        reference: addressForm.reference,
        is_default: addressForm.isDefault ? 1 : 0
      })

      if (res.success) {
        toast.success('EndereÃ§o salvo com sucesso!')
        setShowAddAddress(false)
        setAddressForm({
          zipCode: '',
          street: '',
          number: '',
          complement: '',
          reference: '',
          neighborhood: '',
          city: '',
          state: '',
          isDefault: false
        })
        // Refresh Addresses
        const addrRes = await publicApi.getAddresses(slug)
        if (addrRes.success && addrRes.data) {
          setAddresses(addrRes.data)
        }
      }
    } catch (err) {
      toast.error(err.message || 'Erro ao adicionar endereÃ§o.')
    } finally {
      setAddressLoading(false)
    }
  }

  // Handle Delete Address
  const handleDeleteAddress = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este endereÃ§o?')) return
    setAddressLoading(true)
    try {
      const res = await publicApi.deleteAddress(slug, id)
      if (res.success) {
        toast.success('EndereÃ§o excluÃ­do.')
        setAddresses(prev => prev.filter(a => a.id !== id))
      }
    } catch (err) {
      toast.error(err.message || 'Erro ao excluir endereÃ§o.')
    } finally {
      setAddressLoading(false)
    }
  }

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem(`mda_customer_token_${slug}`)
    setCustomer(null)
    setCustomerToken(null)
    setAddresses([])
    setOrders([])
    toast.success('VocÃª saiu da sua conta.')
    navigate(`/cardapio/${slug}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#FF5A1F]" size={40} />
          <p className="text-slate-500 text-sm font-semibold">Carregando seus dados...</p>
        </div>
      </div>
    )
  }

  const primaryColor = restaurant?.primary_color || '#FF5A1F'
  const buttonColor = primaryColor
  const buttonRadiusClass = restaurant?.border_radius === 'quadrada' ? 'rounded-none' : 'rounded-2xl'
  const borderRadiusClass = restaurant?.border_radius === 'quadrada' ? 'rounded-none' : 'rounded-3xl'

  const orderStatusMap = {
    pending: { label: 'Pendente', color: 'text-amber-700 bg-amber-50 border-amber-200' },
    confirmed: { label: 'Confirmado', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    preparing: { label: 'Em Preparo', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
    ready: { label: 'Pronto p/ Retirada', color: 'text-purple-700 bg-purple-50 border-purple-200' },
    out_for_delivery: { label: 'Saiu p/ Entrega', color: 'text-orange-700 bg-orange-50 border-orange-200' },
    delivered: { label: 'Entregue', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    cancelled: { label: 'Cancelado', color: 'text-red-700 bg-red-50 border-red-200' }
  }

  return (
    <div className="min-h-screen pb-12 font-inter text-left bg-[#F8FAFC] text-[#111827]">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6">
        
        {/* Navigation header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(`/cardapio/${slug}`)}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Cardápio Principal</span>
          </button>
          <span className="text-slate-900 font-extrabold text-base tracking-tight">Minha Conta</span>
          <div className="w-6" /> {/* spacer */}
        </div>

        {/* =========================================== */}
        {/* NOT LOGGED IN STATE - LOGIN / REGISTER      */}
        {/* =========================================== */}
        {!customer ? (
          <div className="max-w-md mx-auto">
            {redirect === 'checkout' && (
              <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-amber-50 border border-amber-200 mb-6 text-amber-900">
                <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs leading-normal font-semibold">
                  Atenção: Você precisa se identificar ou cadastrar para prosseguir com a finalização do seu pedido.
                </p>
              </div>
            )}

            <div className="bg-white border border-slate-200 shadow-xl rounded-3xl p-6 space-y-6">
              <div className="flex border-b border-slate-100 pb-1 gap-6">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`pb-3 text-sm font-extrabold transition-all relative ${
                    authMode === 'login' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-650'
                  }`}
                >
                  Entrar na Conta
                  {authMode === 'login' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 animate-fade-in" style={{ backgroundColor: primaryColor }} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`pb-3 text-sm font-extrabold transition-all relative ${
                    authMode === 'register' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-650'
                  }`}
                >
                  Criar Cadastro
                  {authMode === 'register' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 animate-fade-in" style={{ backgroundColor: primaryColor }} />
                  )}
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === 'register' && (
                  <Input
                    label="Nome Completo *"
                    placeholder="Ex: João da Silva"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    required
                  />
                )}

                <Input
                  label="WhatsApp (com DDD) *"
                  placeholder="Ex: 33999998888"
                  value={authForm.phone}
                  onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value.replace(/\D/g, '') })}
                  required
                />

                <Input
                  label="E-mail (Opcional)"
                  placeholder="Ex: joao@email.com"
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                />

                {authMode === 'register' && (
                  <Input
                    label="CPF (Opcional)"
                    placeholder="Ex: 12345678909"
                    value={authForm.document}
                    onChange={(e) => setAuthForm({ ...authForm, document: e.target.value.replace(/\D/g, '') })}
                  />
                )}

                <Input
                  label="Senha *"
                  type="password"
                  placeholder="Sua senha de acesso"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={authLoading}
                  className="w-full py-3.5 rounded-2xl font-bold shadow-md mt-2 text-white"
                  style={{ backgroundColor: buttonColor }}
                >
                  {authMode === 'login' ? 'Entrar' : 'Confirmar Cadastro'}
                </Button>
              </form>
            </div>
          </div>
        ) : (
          /* =========================================== */
          /* LOGGED IN STATE - PROFILE DASHBOARD         */
          /* =========================================== */
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            {/* Sidebar Navigation */}
            <div className="md:col-span-1 space-y-4">
              <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-extrabold text-2xl shadow-md" style={{ backgroundColor: primaryColor }}>
                  {customer.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight truncate max-w-[150px]">{customer.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{customer.phone}</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-2.5 border border-slate-200 shadow-sm flex flex-col gap-1.5">
                {[
                  { key: 'addresses', label: 'Meus Endereços', icon: MapPin },
                  { key: 'orders', label: 'Meus Pedidos', icon: ShoppingBag },
                  { key: 'profile', label: 'Meus Dados', icon: User }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key)
                      setShowAddAddress(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                      activeTab === tab.key
                        ? 'text-white shadow-sm'
                        : 'text-slate-655 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                    style={activeTab === tab.key ? { backgroundColor: primaryColor } : {}}
                  >
                    <tab.icon size={16} />
                    <span>{tab.label}</span>
                  </button>
                ))}
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-red-600 hover:bg-red-50 transition-all border border-transparent hover:border-red-100 mt-2"
                >
                  <LogOut size={16} />
                  <span>Sair da Conta</span>
                </button>
              </div>
            </div>

            {/* Content Display */}
            <div className="md:col-span-3 space-y-6">
              
              {/* TAB 1: ADDRESSES */}
              {activeTab === 'addresses' && (
                <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-black text-slate-900">Endereços Salvos</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Cadastre seus endereços de entrega para checkouts mais rápidos.</p>
                    </div>
                    {!showAddAddress && (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={Plus}
                        onClick={() => setShowAddAddress(true)}
                        className="rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold"
                      >
                        Novo Endereço
                      </Button>
                    )}
                  </div>

                  {/* Add Address Form */}
                  {showAddAddress && (
                    <form onSubmit={handleAddAddressSubmit} className="p-5 rounded-2xl bg-slate-50/50 border border-slate-200/80 space-y-4 animate-fade-in text-left">
                      <div className="flex items-center justify-between mb-2 border-b border-slate-200/50 pb-2">
                        <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <MapPin size={16} style={{ color: primaryColor }} />
                          Cadastrar Novo Endereço
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddAddress(false)
                            setAddressFormErrors({})
                          }}
                          className="text-xs font-bold text-slate-500 hover:text-slate-900"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                          <Input
                            label="CEP"
                            placeholder="01310-100"
                            value={addressForm.zipCode}
                            onChange={(e) => setAddressForm({ ...addressForm, zipCode: e.target.value })}
                            error={addressFormErrors.zipCode}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            label="Rua / Avenida *"
                            placeholder="Ex: Avenida Paulista"
                            value={addressForm.street}
                            onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                            error={addressFormErrors.street}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                          <Input
                            label="Número *"
                            placeholder="Ex: 100"
                            value={addressForm.number}
                            onChange={(e) => setAddressForm({ ...addressForm, number: e.target.value })}
                            error={addressFormErrors.number}
                            required
                          />
                        </div>
                        <div className="col-span-1">
                          <Input
                            label="Complemento"
                            placeholder="Ex: Apto 42"
                            value={addressForm.complement}
                            onChange={(e) => setAddressForm({ ...addressForm, complement: e.target.value })}
                          />
                        </div>
                        <div className="col-span-1">
                          <Input
                            label="Referência"
                            placeholder="Ex: Próximo ao metrô"
                            value={addressForm.reference}
                            onChange={(e) => setAddressForm({ ...addressForm, reference: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                          <Input
                            label="Bairro *"
                            placeholder="Bela Vista"
                            value={addressForm.neighborhood}
                            onChange={(e) => setAddressForm({ ...addressForm, neighborhood: e.target.value })}
                            error={addressFormErrors.neighborhood}
                            required
                          />
                        </div>
                        <div className="col-span-1">
                          <Input
                            label="Cidade *"
                            placeholder="São Paulo"
                            value={addressForm.city}
                            onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                            error={addressFormErrors.city}
                            required
                          />
                        </div>
                        <div className="col-span-1">
                          <Input
                            label="UF *"
                            placeholder="SP"
                            value={addressForm.state}
                            onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value.toUpperCase().slice(0, 2) })}
                            error={addressFormErrors.state}
                            required
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 py-1 select-none">
                        <input
                          type="checkbox"
                          id="isDefault"
                          checked={addressForm.isDefault}
                          onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                          className="w-4 h-4 accent-[#FF5A1F] bg-transparent border-slate-300 rounded focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor="isDefault" className="text-xs text-slate-700 font-semibold cursor-pointer">
                          Definir como endereço padrão de entrega
                        </label>
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        loading={addressLoading}
                        className="px-6 py-2.5 rounded-xl font-bold shadow-md text-xs uppercase text-white"
                        style={{ backgroundColor: buttonColor }}
                      >
                        Salvar Endereço
                      </Button>
                    </form>
                  )}

                  {/* Addresses List */}
                  {addressLoading && addresses.length === 0 ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="animate-spin text-[#FF5A1F]" size={24} />
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="text-center py-12 space-y-3 bg-slate-50 border border-slate-200/60 rounded-2xl p-8">
                      <MapPin size={32} className="mx-auto text-slate-400" />
                      <p className="text-xs text-slate-505 font-semibold">Nenhum endereço cadastrado ainda.</p>
                      <button
                        type="button"
                        onClick={() => setShowAddAddress(true)}
                        className="text-xs font-black hover:underline"
                        style={{ color: primaryColor }}
                      >
                        Cadastrar primeiro endereço
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {addresses.map((addr) => (
                        <div key={addr.id} className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-sm flex justify-between gap-4 relative hover:border-slate-350 transition-all text-left">
                          <div className="space-y-1.5 max-w-[85%]">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-900">
                                {addr.street}, {addr.number}
                              </span>
                              {addr.is_default === 1 && (
                                <span className="text-[8px] bg-green-50 text-green-700 border border-green-200 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Padrão
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-505 font-medium">
                              {addr.complement ? `${addr.complement} • ` : ''} {addr.neighborhood}
                            </p>
                            <p className="text-xs text-slate-505 font-medium">
                              {addr.city} - {addr.state} • CEP {addr.zip_code}
                            </p>
                            {addr.reference && (
                              <p className="text-[10px] text-slate-400 italic mt-1.5">
                                Ref: {addr.reference}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition-colors self-start"
                            title="Excluir Endereço"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ORDERS */}
              {activeTab === 'orders' && (
                <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Histórico de Pedidos</h2>
                    <p className="text-xs text-slate-505 mt-0.5">Veja e acompanhe os seus pedidos realizados neste restaurante.</p>
                  </div>

                  {ordersLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="animate-spin text-[#FF5A1F]" size={24} />
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12 space-y-3 bg-slate-50 border border-slate-200/60 rounded-2xl p-8">
                      <ShoppingBag size={32} className="mx-auto text-slate-400" />
                      <p className="text-xs text-slate-500 font-semibold">Você ainda não fez nenhum pedido.</p>
                      <Link
                        to={`/cardapio/${slug}`}
                        className="inline-block text-xs font-black hover:underline"
                        style={{ color: primaryColor }}
                      >
                        Navegar pelo cardápio
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((ord) => {
                        const statusInfo = orderStatusMap[ord.status] || { label: ord.status, color: 'text-slate-600 bg-slate-100 border-slate-200' }
                        return (
                          <div key={ord.id} className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-left hover:border-slate-350 transition-all">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <span className="font-extrabold text-sm text-slate-900">Pedido #{ord.order_number || ord.id}</span>
                                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${statusInfo.color}`}>
                                  {statusInfo.label}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-450 font-medium">
                                Realizado em {new Date(ord.created_at).toLocaleString('pt-BR')}
                              </p>
                              <div className="text-xs text-slate-500 font-medium mt-2">
                                <span className="font-extrabold text-slate-800">Itens: </span>
                                {ord.items?.map(item => `${item.quantity}x ${item.product_name || 'Produto'}`).join(', ')}
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-0 border-slate-100 pt-3 sm:pt-0">
                              <div className="text-left sm:text-right">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Valor Total</p>
                                <p className="text-base font-black" style={{ color: primaryColor }}>R$ {parseFloat(ord.total).toFixed(2)}</p>
                              </div>
                              <button
                                onClick={() => navigate(`/cardapio/${slug}/pedido/${ord.id}`)}
                                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-slate-200/50"
                              >
                                <span>Acompanhar</span>
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PROFILE INFO */}
              {activeTab === 'profile' && (
                <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Meus Dados Cadastrais</h2>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Informações de identificação da sua conta.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 border border-slate-200/80 p-6 rounded-2xl text-left">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Nome Completo</span>
                      <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <User size={14} style={{ color: primaryColor }} />
                        {customer.name}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">WhatsApp</span>
                      <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <Smartphone size={14} style={{ color: primaryColor }} />
                        {customer.phone}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">E-mail</span>
                      <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <Mail size={14} style={{ color: primaryColor }} />
                        {customer.email || <span className="text-slate-400 font-normal italic">Não informado</span>}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">CPF</span>
                      <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <FileText size={14} style={{ color: primaryColor }} />
                        {customer.document || <span className="text-slate-400 font-normal italic">Não informado</span>}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 flex items-start gap-2.5">
                    <AlertCircle size={16} className="text-slate-400 shrink-0 mt-0.5" />
                    <p className="leading-normal">
                      Seus dados de cadastro são confidenciais e armazenados de forma segura, sendo compartilhados apenas com o estabelecimento para a emissão e entrega dos seus pedidos.
                    </p>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  )
}

