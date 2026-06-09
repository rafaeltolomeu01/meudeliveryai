import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Bike, CheckCircle, Clipboard, CreditCard, DollarSign, Home, LogOut, MapPin, QrCode, ShieldCheck, ShoppingBag, Store, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { publicApi } from '../services/api'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

const normalizeAuthResponse = (res) => {
  const token = res?.data?.token || res?.token
  const customer = res?.data?.customer || res?.customer || res?.data
  return { token, customer }
}

const emptyForm = {
  name: '', phone: '', email: '', zipCode: '', address: '', number: '', complement: '', reference: '',
  neighborhood: '', city: '', state: '', changeFor: '', notes: '',
}

export default function PublicCheckoutPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [cart, setCart] = useState([])
  const [orderType, setOrderType] = useState('delivery')
  const [paymentMethod, setPaymentMethod] = useState('pix')
  const [customer, setCustomer] = useState(null)
  const [checkingCustomer, setCheckingCustomer] = useState(true)
  const [authMode, setAuthMode] = useState('login')
  const [authLoading, setAuthLoading] = useState(false)
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '', document: '' })
  const [savedAddresses, setSavedAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState('new')
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [copiedPix, setCopiedPix] = useState(false)

  const primaryColor = restaurant?.primary_color || '#ff6b35'
  const buttonColor = restaurant?.button_color || primaryColor
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.total_price || 0), 0), [cart])
  const deliveryFee = orderType === 'delivery' ? Number(restaurant?.delivery_fee || 0) : 0
  const total = subtotal + deliveryFee

  const fillCustomer = (data) => {
    if (!data?.id) return
    setCustomer(data)
    setForm((f) => ({ ...f, name: data.name || '', phone: data.phone || '', email: data.email || '' }))
  }

  const loadCustomerData = async () => {
    const token = localStorage.getItem(`mda_customer_token_${slug}`)
    if (!token) {
      setCheckingCustomer(false)
      return
    }
    try {
      const meRes = await publicApi.customerMe(slug)
      const data = meRes?.data?.customer || meRes?.data
      if (meRes?.success && data?.id) {
        fillCustomer(data)
        const addrRes = await publicApi.getAddresses(slug)
        const addresses = Array.isArray(addrRes?.data) ? addrRes.data : []
        setSavedAddresses(addresses)
        const defAddr = addresses.find((a) => a.is_default) || addresses[0]
        if (defAddr) selectAddress(defAddr.id?.toString(), addresses)
      } else {
        localStorage.removeItem(`mda_customer_token_${slug}`)
        setCustomer(null)
      }
    } catch (err) {
      localStorage.removeItem(`mda_customer_token_${slug}`)
      setCustomer(null)
    } finally {
      setCheckingCustomer(false)
    }
  }

  useEffect(() => {
    async function init() {
      try {
        const [restaurantRes] = await Promise.all([publicApi.getRestaurant(slug)])
        if (restaurantRes?.success) setRestaurant(restaurantRes.data)
      } catch (err) {
        toast.error('Não consegui carregar o restaurante. Atualize a página.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [slug])

  useEffect(() => {
    const savedCart = localStorage.getItem(`mda_cart_${slug}`)
    try {
      const parsed = savedCart ? JSON.parse(savedCart) : []
      if (!parsed.length) {
        toast.error('Seu carrinho está vazio.')
        navigate(`/cardapio/${slug}`)
      } else {
        setCart(parsed)
      }
    } catch {
      navigate(`/cardapio/${slug}`)
    }
    setOrderType(localStorage.getItem(`mda_order_type_${slug}`) || 'delivery')
    loadCustomerData()
  }, [slug])

  const selectAddress = (addrId, source = savedAddresses) => {
    setSelectedAddressId(addrId)
    if (addrId === 'new') {
      setForm((f) => ({ ...f, zipCode: '', address: '', number: '', complement: '', reference: '', neighborhood: '', city: '', state: '' }))
      return
    }
    const selected = source.find((a) => a.id?.toString() === addrId)
    if (selected) {
      setForm((f) => ({
        ...f,
        zipCode: selected.zip_code || '',
        address: selected.street || '',
        number: selected.number || '',
        complement: selected.complement || '',
        reference: selected.reference || '',
        neighborhood: selected.neighborhood || '',
        city: selected.city || '',
        state: selected.state || '',
      }))
    }
  }

  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    setAuthLoading(true)
    try {
      let res
      if (authMode === 'login') {
        const identifier = authForm.phone || authForm.email
        if (!identifier || !authForm.password) throw new Error('Informe WhatsApp/E-mail e senha.')
        res = await publicApi.customerLogin(slug, { email: identifier, phone: authForm.phone, password: authForm.password })
      } else {
        if (!authForm.name || !authForm.phone || !authForm.password) throw new Error('Nome, WhatsApp e senha são obrigatórios.')
        res = await publicApi.customerRegister(slug, authForm)
      }
      const { token, customer: customerData } = normalizeAuthResponse(res)
      if (!token) throw new Error('Login retornou sem token. Verifique o backend.')
      localStorage.setItem(`mda_customer_token_${slug}`, token)
      fillCustomer(customerData)
      toast.success(authMode === 'login' ? 'Login efetuado com sucesso!' : 'Cadastro realizado com sucesso!')
      await loadCustomerData()
    } catch (err) {
      toast.error(err.message || 'Erro ao entrar. Verifique os dados.')
    } finally {
      setAuthLoading(false)
    }
  }

  const logoutCustomer = () => {
    localStorage.removeItem(`mda_customer_token_${slug}`)
    setCustomer(null)
    setSavedAddresses([])
    setForm(emptyForm)
    toast('Você saiu da conta.')
  }

  const handleChange = (field) => (e) => {
    const value = field === 'state' ? e.target.value.toUpperCase().slice(0, 2) : e.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!customer) errs.customer = 'Faça login para finalizar.'
    if (orderType === 'delivery') {
      if (!form.address.trim()) errs.address = 'Endereço é obrigatório'
      if (!form.number.trim()) errs.number = 'Número é obrigatório'
      if (!form.neighborhood.trim()) errs.neighborhood = 'Bairro é obrigatório'
      if (!form.city.trim()) errs.city = 'Cidade é obrigatória'
      if (!form.state.trim()) errs.state = 'UF é obrigatória'
    }
    if (paymentMethod === 'cash' && form.changeFor) {
      const changeVal = Number(form.changeFor)
      if (Number.isNaN(changeVal) || changeVal < total) errs.changeFor = 'Troco deve ser maior que o total'
    }
    return errs
  }

  const handleCopyPix = async () => {
    if (!restaurant?.pix_key) return
    await navigator.clipboard.writeText(restaurant.pix_key)
    setCopiedPix(true)
    toast.success('Chave PIX copiada!')
    setTimeout(() => setCopiedPix(false), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      toast.error('Confira os dados antes de enviar.')
      return
    }
    setSubmitLoading(true)
    try {
      if (orderType === 'delivery' && selectedAddressId === 'new') {
        await publicApi.addAddress(slug, {
          zip_code: form.zipCode,
          street: form.address,
          number: form.number,
          complement: form.complement,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
          reference: form.reference,
        }).catch(() => null)
      }
      const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const orderData = {
        idempotency_key: idempotencyKey,
        order_type: orderType,
        payment_method: paymentMethod,
        delivery_address: form.address,
        delivery_number: form.number,
        delivery_complement: form.complement,
        delivery_neighborhood: form.neighborhood,
        delivery_city: form.city,
        delivery_state: form.state,
        delivery_zip_code: form.zipCode,
        reference: form.reference,
        items: cart.map((item) => ({ product_id: item.product_id, quantity: item.quantity, notes: item.notes, complements: item.complements, options: item.options })),
        notes: form.notes,
        change_for: paymentMethod === 'cash' ? form.changeFor : null,
      }
      const res = await publicApi.createOrder(slug, orderData)
      if (res?.success) {
        localStorage.removeItem(`mda_cart_${slug}`)
        toast.success('Pedido enviado com sucesso!')
        navigate(`/cardapio/${slug}/pedido/${res.data.id}`)
      }
    } catch (err) {
      toast.error(err.message || 'Erro ao processar pedido.')
    } finally {
      setSubmitLoading(false)
    }
  }

  if (loading || checkingCustomer) {
    return <div className="mda-public-page flex min-h-screen items-center justify-center text-slate-700 font-bold">Carregando...</div>
  }

  return (
    <div className="mda-public-page">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(`/cardapio/${slug}/carrinho`)} className="flex items-center gap-2 text-slate-600 hover:text-slate-950 font-semibold">
            <ArrowLeft size={18} /> Carrinho
          </button>
          <h1 className="font-black text-slate-950">Finalizar Pedido</h1>
          <div className="w-20" />
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-[1fr_360px] gap-6">
        <section className="space-y-5">
          {!customer ? (
            <div className="mda-card rounded-3xl p-6 md:p-8">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-4"><User size={30} /></div>
                <h2 className="text-2xl font-black text-slate-950">Entre para finalizar</h2>
                <p className="text-slate-500 mt-2">O restaurante só recebe o pedido depois que você entrar ou criar seu cadastro.</p>
              </div>
              <div className="flex bg-slate-100 rounded-2xl p-1 mb-5">
                <button type="button" onClick={() => setAuthMode('login')} className={`flex-1 py-3 rounded-xl font-bold ${authMode === 'login' ? 'bg-white shadow text-slate-950' : 'text-slate-500'}`}>Entrar</button>
                <button type="button" onClick={() => setAuthMode('register')} className={`flex-1 py-3 rounded-xl font-bold ${authMode === 'register' ? 'bg-white shadow text-slate-950' : 'text-slate-500'}`}>Criar cadastro</button>
              </div>
              <div className="grid gap-4">
                {authMode === 'register' && <Input label="Nome" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} placeholder="Seu nome" className="mda-input" />}
                <Input label="WhatsApp com DDD" value={authForm.phone} onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })} placeholder="33999998888" className="mda-input" />
                <Input label={authMode === 'login' ? 'E-mail opcional' : 'E-mail'} value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} placeholder="seu@email.com" className="mda-input" />
                {authMode === 'register' && <Input label="CPF opcional" value={authForm.document} onChange={(e) => setAuthForm({ ...authForm, document: e.target.value })} placeholder="00000000000" className="mda-input" />}
                <Input label="Senha" type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} placeholder="Sua senha" className="mda-input" />
                <Button type="button" onClick={handleAuthSubmit} disabled={authLoading} className="w-full py-4 rounded-2xl text-white font-black" style={{ backgroundColor: buttonColor }}>{authLoading ? 'Aguarde...' : authMode === 'login' ? 'Entrar na conta' : 'Criar cadastro'}</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mda-card rounded-3xl p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black">{customer.name?.[0]?.toUpperCase()}</div>
                  <div>
                    <h2 className="font-black text-slate-950">Identificado como {customer.name}</h2>
                    <p className="text-sm text-slate-500">{customer.phone} {customer.email ? `• ${customer.email}` : ''}</p>
                  </div>
                </div>
                <button type="button" onClick={logoutCustomer} className="text-red-500 font-bold flex items-center gap-1"><LogOut size={16} /> Sair</button>
              </div>

              <div className="mda-card rounded-3xl p-5 space-y-4">
                <h3 className="font-black text-xl text-slate-950 flex items-center gap-2"><Bike className="text-orange-600" /> Entrega ou retirada</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setOrderType('delivery')} className={`rounded-2xl p-4 border font-bold flex items-center justify-center gap-2 ${orderType === 'delivery' ? 'bg-orange-50 border-orange-400 text-orange-700' : 'border-slate-200 text-slate-600'}`}><Bike size={18} /> Delivery</button>
                  <button type="button" onClick={() => setOrderType('pickup')} className={`rounded-2xl p-4 border font-bold flex items-center justify-center gap-2 ${orderType === 'pickup' ? 'bg-orange-50 border-orange-400 text-orange-700' : 'border-slate-200 text-slate-600'}`}><Store size={18} /> Retirada</button>
                </div>
              </div>

              {orderType === 'delivery' && (
                <div className="mda-card rounded-3xl p-5 space-y-4">
                  <h3 className="font-black text-xl text-slate-950 flex items-center gap-2"><MapPin className="text-orange-600" /> Endereço de entrega</h3>
                  {savedAddresses.length > 0 && (
                    <select value={selectedAddressId} onChange={(e) => selectAddress(e.target.value)} className="mda-input w-full rounded-2xl px-4 py-3 font-semibold">
                      {savedAddresses.map((addr) => <option key={addr.id} value={addr.id}>{addr.street}, {addr.number} ({addr.neighborhood})</option>)}
                      <option value="new">+ Cadastrar outro endereço</option>
                    </select>
                  )}
                  <div className="grid md:grid-cols-3 gap-4">
                    <Input label="CEP" value={form.zipCode} onChange={handleChange('zipCode')} className="mda-input" />
                    <div className="md:col-span-2"><Input label="Rua / Avenida" error={errors.address} value={form.address} onChange={handleChange('address')} className="mda-input" /></div>
                    <Input label="Número" error={errors.number} value={form.number} onChange={handleChange('number')} className="mda-input" />
                    <Input label="Bairro" error={errors.neighborhood} value={form.neighborhood} onChange={handleChange('neighborhood')} className="mda-input" />
                    <Input label="Complemento" value={form.complement} onChange={handleChange('complement')} className="mda-input" />
                    <Input label="Cidade" error={errors.city} value={form.city} onChange={handleChange('city')} className="mda-input" />
                    <Input label="UF" error={errors.state} value={form.state} onChange={handleChange('state')} className="mda-input" />
                    <Input label="Referência" value={form.reference} onChange={handleChange('reference')} className="mda-input md:col-span-1" />
                  </div>
                </div>
              )}

              <div className="mda-card rounded-3xl p-5 space-y-4">
                <h3 className="font-black text-xl text-slate-950 flex items-center gap-2"><CreditCard className="text-orange-600" /> Forma de pagamento</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {restaurant?.accepts_pix ? <PayButton active={paymentMethod === 'pix'} onClick={() => setPaymentMethod('pix')} icon={<QrCode size={18} />} label="PIX" /> : null}
                  {restaurant?.accepts_credit_card ? <PayButton active={paymentMethod === 'credit_card'} onClick={() => setPaymentMethod('credit_card')} icon={<CreditCard size={18} />} label="Crédito" /> : null}
                  {restaurant?.accepts_debit_card ? <PayButton active={paymentMethod === 'debit_card'} onClick={() => setPaymentMethod('debit_card')} icon={<CreditCard size={18} />} label="Débito" /> : null}
                  {restaurant?.accepts_cash ? <PayButton active={paymentMethod === 'cash'} onClick={() => setPaymentMethod('cash')} icon={<DollarSign size={18} />} label="Dinheiro" /> : null}
                </div>
                {paymentMethod === 'pix' && restaurant?.pix_key && <div className="mda-soft-card rounded-2xl p-4 flex justify-between items-center gap-4"><div><p className="text-xs text-slate-500 font-bold">Chave PIX</p><p className="font-black text-slate-950 break-all">{restaurant.pix_key}</p></div><button type="button" onClick={handleCopyPix} className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold flex items-center gap-2"><Clipboard size={16} /> {copiedPix ? 'Copiado' : 'Copiar'}</button></div>}
                {paymentMethod === 'cash' && <Input label="Troco para quanto?" error={errors.changeFor} value={form.changeFor} onChange={handleChange('changeFor')} className="mda-input" />}
              </div>

              <div className="mda-card rounded-3xl p-5 space-y-3">
                <h3 className="font-black text-xl text-slate-950">Observações</h3>
                <textarea value={form.notes} onChange={handleChange('notes')} rows={3} className="mda-input w-full rounded-2xl px-4 py-3" placeholder="Ex.: retirar cebola, entregar na portaria..." />
              </div>
            </>
          )}
        </section>

        {customer && (
          <aside className="space-y-4">
            <div className="mda-card rounded-3xl p-5 sticky top-24">
              <h3 className="font-black text-xl text-slate-950 flex items-center gap-2 border-b border-slate-200 pb-4"><ShoppingBag className="text-orange-600" /> Resumo</h3>
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {cart.map((item) => <div key={item.id} className="py-3 flex justify-between gap-3"><div><p className="font-black text-slate-950">{item.quantity}x {item.name}</p>{item.optionsDetails?.length ? <p className="text-xs text-slate-500">{item.optionsDetails.map((o) => o.name).join(', ')}</p> : null}</div><p className="font-bold text-slate-800">R$ {Number(item.total_price || 0).toFixed(2)}</p></div>)}
              </div>
              <div className="pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><b>R$ {subtotal.toFixed(2)}</b></div>
                {orderType === 'delivery' && <div className="flex justify-between text-slate-600"><span>Taxa de entrega</span><b>R$ {deliveryFee.toFixed(2)}</b></div>}
                <div className="flex justify-between items-center border-t border-slate-200 pt-3"><span className="font-black text-slate-950">Total</span><span className="font-black text-2xl text-orange-600">R$ {total.toFixed(2)}</span></div>
              </div>
              <Button type="submit" disabled={submitLoading} className="w-full mt-5 py-4 rounded-2xl text-white font-black" style={{ backgroundColor: buttonColor }}>{submitLoading ? 'Enviando...' : <><CheckCircle size={18} /> Confirmar e enviar</>}</Button>
              <p className="mt-4 text-center text-xs text-slate-500 font-semibold flex items-center justify-center gap-1"><ShieldCheck size={14} className="text-green-600" /> Compra 100% protegida</p>
            </div>
          </aside>
        )}
      </form>
    </div>
  )
}

function PayButton({ active, onClick, icon, label }) {
  return <button type="button" onClick={onClick} className={`rounded-2xl p-4 border font-bold flex flex-col items-center justify-center gap-2 ${active ? 'bg-orange-50 border-orange-400 text-orange-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{icon}{label}</button>
}
