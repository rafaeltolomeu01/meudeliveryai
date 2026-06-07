import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, CreditCard, DollarSign, QrCode, Clipboard, ShoppingBag, ShieldCheck } from 'lucide-react'
import { publicApi } from '../services/api'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import { applyTheme, removeTheme } from '../utils/theme'

// Mock fallback for burger-house when offline
const MOCK_RESTAURANT = {
  name: 'Burger House',
  slug: 'burger-house',
  delivery_fee: 5.00,
  primary_color: '#FF6B35',
  background_color: '#0F0F0F',
  text_color: '#FFFFFF',
  font_family: 'Inter',
  accepts_pix: 1,
  accepts_cash: 1,
  accepts_credit_card: 1,
  accepts_debit_card: 1,
  pix_key: 'contato@burgerhouse.com',
  pix_key_type: 'email'
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
  const [copiedPix, setCopiedPix] = useState(false)

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    zipCode: '',
    address: '',
    number: '',
    complement: '',
    reference: '',
    neighborhood: '',
    city: '',
    state: '',
    changeFor: '',
    notes: '',
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    async function loadData() {
      try {
        const res = await publicApi.getRestaurant(slug)
        if (res.success) setRestaurant(res.data)
      } catch (err) {
        console.warn('Erro ao carregar restaurante para checkout, usando mock.', err)
        if (slug === 'burger-house') {
          setRestaurant(MOCK_RESTAURANT)
        }
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [slug])

  // Load cart and orderType preference
  useEffect(() => {
    const savedCart = localStorage.getItem(`mda_cart_${slug}`)
    if (savedCart && JSON.parse(savedCart).length > 0) {
      setCart(JSON.parse(savedCart))
    } else {
      toast.error('Seu carrinho está vazio.')
      navigate(`/cardapio/${slug}`)
    }

    const savedType = localStorage.getItem(`mda_order_type_${slug}`)
    if (savedType) {
      setOrderType(savedType)
    }
  }, [slug, navigate])

  // Apply visual theme from database dynamically
  useEffect(() => {
    if (restaurant) {
      applyTheme(restaurant)
    }
    return () => {
      removeTheme()
    }
  }, [restaurant])

  const handleChange = (field) => (e) => {
    let value = e.target.value
    if (field === 'state') value = value.toUpperCase().slice(0, 2)
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Nome é obrigatório'
    if (!form.phone.trim()) errs.phone = 'WhatsApp é obrigatório'
    
    if (orderType === 'delivery') {
      if (!form.address.trim()) errs.address = 'Endereço é obrigatório'
      if (!form.number.trim()) errs.number = 'Número é obrigatório'
      if (!form.neighborhood.trim()) errs.neighborhood = 'Bairro é obrigatório'
      if (!form.city.trim()) errs.city = 'Cidade é obrigatória'
      if (!form.state.trim()) errs.state = 'UF é obrigatória'
    }

    if (paymentMethod === 'cash' && form.changeFor) {
      const changeVal = parseFloat(form.changeFor)
      if (isNaN(changeVal) || changeVal < total) {
        errs.changeFor = 'Troco deve ser maior que o valor total'
      }
    }

    return errs
  }

  const handleCopyPix = () => {
    if (restaurant?.pix_key) {
      navigator.clipboard.writeText(restaurant.pix_key)
      setCopiedPix(true)
      toast.success('Chave PIX copiada!')
      setTimeout(() => setCopiedPix(false), 3000)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error('Por favor, corrija os erros do formulário.')
      return
    }

    const isClosedAndBlocking = (!restaurant?.is_open || restaurant?.is_open === 0) && (!restaurant?.accept_orders_when_closed || restaurant?.accept_orders_when_closed === 0);
    if (isClosedAndBlocking) {
      toast.error('O restaurante está fechado no momento e não está aceitando novos pedidos.')
      return
    }

    setSubmitLoading(true)

    const orderData = {
      customer_name: form.name,
      customer_phone: form.phone,
      customer_email: form.email,
      order_type: orderType,
      payment_method: paymentMethod,
      delivery_address: form.address,
      delivery_number: form.number,
      delivery_complement: form.complement.trim() + (form.reference?.trim() ? ` (Ref: ${form.reference.trim()})` : ''),
      delivery_neighborhood: form.neighborhood,
      delivery_city: form.city,
      delivery_state: form.state,
      delivery_zip_code: form.zipCode,
      items: cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        notes: item.notes,
        options: item.options
      })),
      notes: form.notes,
      change_for: paymentMethod === 'cash' ? form.changeFor : null
    }

    try {
      const res = await publicApi.createOrder(slug, orderData)
      if (res.success) {
        toast.success('Pedido enviado com sucesso! 🚀')
        // Clean cart
        localStorage.removeItem(`mda_cart_${slug}`)
        navigate(`/cardapio/${slug}/pedido/${res.data.id}`)
      }
    } catch (err) {
      console.warn('Erro ao conectar com servidor para checkout, simulando.', err)
      // Dev simulation when backend is down/offline
      if (err.message?.includes('Network Error') || err.status === undefined) {
        toast.success('Pedido enviado com sucesso! (Modo Simulação) 🚀')
        localStorage.removeItem(`mda_cart_${slug}`)
        const mockOrderId = Math.floor(1000 + Math.random() * 9000)
        navigate(`/cardapio/${slug}/pedido/${mockOrderId}`)
      } else {
        toast.error(err.message || 'Erro ao processar pedido.')
      }
    } finally {
      setSubmitLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--theme-bg, #0F0F0F)' }}>
        <div className="text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--theme-primary, #FF6B35)', borderTopColor: 'transparent' }} />
          <p className="text-gray-400 text-sm font-medium">Carregando checkout...</p>
        </div>
      </div>
    )
  }

  const primaryColor = restaurant?.primary_color || '#FF6B35'
  const bgColor = restaurant?.background_color || '#0F0F0F'
  const buttonColor = restaurant?.button_color || primaryColor
  const buttonRadiusClass = restaurant?.border_radius === 'quadrada' ? 'rounded-none' : 'rounded-xl'
  const borderRadiusClass = restaurant?.border_radius === 'quadrada' ? 'rounded-none' : 'rounded-3xl'

  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0)
  const deliveryFee = orderType === 'delivery' ? parseFloat(restaurant?.delivery_fee || 0) : 0
  const total = subtotal + deliveryFee

  return (
    <div className="min-h-screen font-inter pb-12" style={{ backgroundColor: bgColor, color: restaurant?.text_color || '#FFFFFF' }}>
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6">
        
        {/* Navigation header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(`/cardapio/${slug}/carrinho`)}
            className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Carrinho</span>
          </button>
          <span className="text-white font-extrabold text-base">Finalizar Pedido</span>
          <div className="w-6" /> {/* spacer */}
        </div>

        {/* Main Grid */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          
          {/* Checkout forms */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Customer info */}
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <span className="w-1.5 h-4.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                Seus Dados
              </h3>

              <Input
                label="Seu Nome"
                placeholder="Ex: Rafael Silva"
                value={form.name}
                onChange={handleChange('name')}
                error={errors.name}
                required
                id="chk-name"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="WhatsApp (Celular)"
                  placeholder="Ex: (11) 99999-9999"
                  value={form.phone}
                  onChange={handleChange('phone')}
                  error={errors.phone}
                  required
                  id="chk-phone"
                />
                <Input
                  label="E-mail (Opcional)"
                  placeholder="Ex: rafael@email.com"
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  error={errors.email}
                  id="chk-email"
                />
              </div>
            </div>

            {/* Address fields for Delivery */}
            {orderType === 'delivery' && (
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4 animate-fade-in">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-4.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                  Endereço de Entrega
                </h3>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <Input
                      label="CEP"
                      placeholder="01310-100"
                      value={form.zipCode}
                      onChange={handleChange('zipCode')}
                      error={errors.zipCode}
                      id="chk-zipcode"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label="Rua / Avenida"
                      placeholder="Ex: Avenida Paulista"
                      value={form.address}
                      onChange={handleChange('address')}
                      error={errors.address}
                      required
                      id="chk-address"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <Input
                      label="Número"
                      placeholder="Ex: 100"
                      value={form.number}
                      onChange={handleChange('number')}
                      error={errors.number}
                      required
                      id="chk-number"
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      label="Complemento"
                      placeholder="Ex: Apto 42"
                      value={form.complement}
                      onChange={handleChange('complement')}
                      id="chk-complement"
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      label="Referência"
                      placeholder="Ex: Próximo à praça"
                      value={form.reference}
                      onChange={handleChange('reference')}
                      id="chk-reference"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1.5">
                    <Input
                      label="Bairro"
                      placeholder="Bela Vista"
                      value={form.neighborhood}
                      onChange={handleChange('neighborhood')}
                      error={errors.neighborhood}
                      required
                      id="chk-neighborhood"
                    />
                  </div>
                  <div className="col-span-1.5">
                    <Input
                      label="Cidade"
                      placeholder="São Paulo"
                      value={form.city}
                      onChange={handleChange('city')}
                      error={errors.city}
                      required
                      id="chk-city"
                    />
                  </div>
                  <div className="col-span-0.5">
                    <Input
                      label="UF"
                      placeholder="SP"
                      value={form.state}
                      onChange={handleChange('state')}
                      error={errors.state}
                      required
                      id="chk-state"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Address display for Pickup */}
            {orderType === 'pickup' && (
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4 animate-fade-in">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-4.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                  Local de Retirada
                </h3>
                <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 text-sm leading-relaxed text-gray-300">
                  <p className="font-semibold text-white">{restaurant.name}</p>
                  <p className="mt-1">Retire seu pedido diretamente no balcão do estabelecimento.</p>
                  <p className="mt-3 text-xs text-gray-400">Tempo estimado para retirada: <strong className="text-white">{restaurant.estimated_pickup_time || 20} minutos</strong>.</p>
                </div>
              </div>
            )}

            {/* Payment Method selector */}
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <span className="w-1.5 h-4.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                Forma de Pagamento
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {restaurant.accepts_pix && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-4 ${buttonRadiusClass} border text-center flex flex-col items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'pix'
                        ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-alpha15)] text-white'
                        : 'border-white/5 bg-white/[0.01] text-gray-400 hover:text-white hover:border-white/10'
                    }`}
                    style={paymentMethod === 'pix' ? { borderColor: primaryColor, backgroundColor: 'var(--theme-primary-alpha15)' } : {}}
                  >
                    <QrCode size={20} style={paymentMethod === 'pix' ? { color: primaryColor } : {}} />
                    <span className="text-xs font-bold">PIX</span>
                  </button>
                )}

                {restaurant.accepts_credit_card && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`p-4 ${buttonRadiusClass} border text-center flex flex-col items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'credit_card'
                        ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-alpha15)] text-white'
                        : 'border-white/5 bg-white/[0.01] text-gray-400 hover:text-white hover:border-white/10'
                    }`}
                    style={paymentMethod === 'credit_card' ? { borderColor: primaryColor, backgroundColor: 'var(--theme-primary-alpha15)' } : {}}
                  >
                    <CreditCard size={20} style={paymentMethod === 'credit_card' ? { color: primaryColor } : {}} />
                    <span className="text-xs font-bold text-ellipsis overflow-hidden whitespace-nowrap w-full">C. Crédito</span>
                  </button>
                )}

                {restaurant.accepts_debit_card && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('debit_card')}
                    className={`p-4 ${buttonRadiusClass} border text-center flex flex-col items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'debit_card'
                        ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-alpha15)] text-white'
                        : 'border-white/5 bg-white/[0.01] text-gray-400 hover:text-white hover:border-white/10'
                    }`}
                    style={paymentMethod === 'debit_card' ? { borderColor: primaryColor, backgroundColor: 'var(--theme-primary-alpha15)' } : {}}
                  >
                    <CreditCard size={20} style={paymentMethod === 'debit_card' ? { color: primaryColor } : {}} />
                    <span className="text-xs font-bold text-ellipsis overflow-hidden whitespace-nowrap w-full">C. Débito</span>
                  </button>
                )}

                {restaurant.accepts_cash && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-4 ${buttonRadiusClass} border text-center flex flex-col items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-alpha15)] text-white'
                        : 'border-white/5 bg-white/[0.01] text-gray-400 hover:text-white hover:border-white/10'
                    }`}
                    style={paymentMethod === 'cash' ? { borderColor: primaryColor, backgroundColor: 'var(--theme-primary-alpha15)' } : {}}
                  >
                    <DollarSign size={20} style={paymentMethod === 'cash' ? { color: primaryColor } : {}} />
                    <span className="text-xs font-bold">Dinheiro</span>
                  </button>
                )}
              </div>

              {/* PIX copy-paste area */}
              {paymentMethod === 'pix' && restaurant.pix_key && (
                <div className={`p-5 ${buttonRadiusClass} border space-y-4 animate-fade-in text-left`} style={{ borderColor: 'var(--theme-primary-alpha20)', backgroundColor: 'var(--theme-primary-alpha15)', borderWidth: '1px' }}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white flex items-center gap-1">
                        <QrCode size={14} style={{ color: primaryColor }} />
                        Chave Pix ({restaurant.pix_key_type === 'cpf' ? 'CPF' : restaurant.pix_key_type === 'cnpj' ? 'CNPJ' : restaurant.pix_key_type === 'email' ? 'E-mail' : restaurant.pix_key_type === 'phone' ? 'Celular' : 'Chave Aleatória'})
                      </p>
                      <p className="text-base font-black tracking-wide select-all" style={{ color: primaryColor }}>{restaurant.pix_key}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-center"
                    >
                      {copiedPix ? <CheckCircle size={14} className="text-green-500" /> : <Clipboard size={14} />}
                      <span>{copiedPix ? 'Copiado!' : 'Copiar Chave Pix'}</span>
                    </button>
                  </div>

                  {/* Receiver data */}
                  {(restaurant.pix_receiver_name || restaurant.pix_receiver_city) && (
                    <div className="border-t border-white/10 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {restaurant.pix_receiver_name && (
                        <div>
                          <span className="text-gray-400 block">Recebedor</span>
                          <span className="text-white font-bold">{restaurant.pix_receiver_name}</span>
                        </div>
                      )}
                      {restaurant.pix_receiver_city && (
                        <div>
                          <span className="text-gray-400 block">Cidade</span>
                          <span className="text-white font-bold">{restaurant.pix_receiver_city}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment instructions */}
                  {restaurant.pix_instructions && (
                    <div className="border-t border-white/10 pt-3 text-xs leading-relaxed">
                      <span className="text-gray-400 block font-bold mb-1">Instruções de Pagamento:</span>
                      <p className="text-gray-300 bg-black/20 p-3 rounded-xl whitespace-pre-wrap">{restaurant.pix_instructions}</p>
                    </div>
                  )}
                  
                  <p className="text-[10px] text-gray-400 border-t border-white/5 pt-2 text-center">
                    Seu pedido será salvo como aguardando confirmação de pagamento.
                  </p>
                </div>
              )}

              {/* Cash change field */}
              {paymentMethod === 'cash' && (
                <div className="animate-fade-in max-w-xs">
                  <Input
                    label="Precisa de troco para quanto?"
                    placeholder="Ex: R$ 50,00"
                    type="number"
                    value={form.changeFor}
                    onChange={handleChange('changeFor')}
                    error={errors.changeFor}
                    id="chk-change"
                  />
                </div>
              )}
            </div>

            {/* Notes field */}
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <span className="w-1.5 h-4.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                Observações
              </h3>
              <textarea
                placeholder="Ex: Ponto da carne mal passado, campainha quebrada..."
                className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-[#FF6B35] transition-colors resize-none h-24"
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

          </div>

          {/* Cart summary */}
          <div className="space-y-6">
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 space-y-5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                <ShoppingBag size={16} style={{ color: primaryColor }} />
                Resumo da Compra
              </h3>

              {/* Items List */}
              <div className="divide-y divide-white/5 max-h-48 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="py-3 flex justify-between gap-4 text-xs">
                    <div className="text-left">
                      <p className="font-bold text-white">
                        {item.quantity}x {item.name}
                      </p>
                      {item.optionsDetails?.length > 0 && (
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {item.optionsDetails.map(o => o.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="font-semibold text-gray-300">R$ {item.total_price.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Pricing breakdown */}
              <div className="border-t border-white/5 pt-3.5 space-y-2.5 text-xs text-gray-400">
                <div className="flex justify-between items-center">
                  <span>Subtotal</span>
                  <span className="font-semibold text-white">R$ {subtotal.toFixed(2)}</span>
                </div>
                {orderType === 'delivery' && (
                  <div className="flex justify-between items-center">
                    <span>Taxa de entrega</span>
                    <span className="font-semibold text-white">R$ {deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-white/5 pt-3 flex justify-between items-center text-white">
                  <span className="font-bold text-sm">Total</span>
                  <span className="font-black text-lg" style={{ color: primaryColor }}>
                    R$ {total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action submit */}
            <div className="space-y-4">
              <Button
                type="submit"
                disabled={submitLoading || ((!restaurant?.is_open || restaurant?.is_open === 0) && (!restaurant?.accept_orders_when_closed || restaurant?.accept_orders_when_closed === 0))}
                className={`w-full py-4 ${buttonRadiusClass} font-extrabold text-xs uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2 bg-[#FF6B35]`}
                style={{ backgroundColor: buttonColor }}
              >
                {submitLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Confirmar e Enviar</span>
                    <span>•</span>
                    <span>R$ {total.toFixed(2)}</span>
                  </>
                )}
              </Button>
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500 font-semibold">
                <ShieldCheck size={14} className="text-green-600" />
                <span>Compra 100% Protegida</span>
              </div>
            </div>
          </div>

        </form>

      </div>
    </div>
  )
}
