import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Phone, Bike, Clock, HelpCircle, Check, Loader2, AlertTriangle } from 'lucide-react'
import { publicApi } from '../services/api'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import { applyTheme, removeTheme } from '../utils/theme'

// Mock fallback for tracking orders when offline
const MOCK_RESTAURANT = {
  name: 'Burger House',
  slug: 'burger-house',
  whatsapp: '5511999990000',
  primary_color: '#FF6B35',
  background_color: '#0F0F0F',
  text_color: '#FFFFFF'
}

const MOCK_ORDER = {
  id: 1234,
  order_number: '#20260606-0001',
  order_type: 'delivery',
  status: 'pending', // 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered'
  payment_method: 'pix',
  subtotal: 63.80,
  delivery_fee: 5.00,
  total: 68.80,
  delivery_address: 'Rua Augusta',
  delivery_number: '1500',
  delivery_neighborhood: 'Consolação',
  delivery_city: 'São Paulo',
  delivery_state: 'SP',
  notes: 'Sem cebola no burger',
  created_at: new Date().toISOString(),
  items: [
    { id: 1, product_name: 'Classic Burger', quantity: 1, unit_price: 28.90, total_price: 28.90, options: null },
    { id: 2, product_name: 'Combo Classic', quantity: 1, unit_price: 45.90, total_price: 45.90, options: null }
  ],
  logs: [
    { to_status: 'pending', notes: 'Pedido enviado pelo cardápio público', created_at: new Date().toISOString() }
  ]
}

const STATUS_STEPS = [
  { status: 'pending', label: 'Enviado', desc: 'Aguardando confirmação do restaurante' },
  { status: 'confirmed', label: 'Confirmado', desc: 'Pedido aceito e na fila' },
  { status: 'preparing', label: 'Em Preparo', desc: 'Sua refeição está sendo preparada' },
  { status: 'ready', label: 'Pronto', desc: 'Preparação concluída' },
  { status: 'out_for_delivery', label: 'Em Rota', desc: 'Saiu para entrega ou pronto para retirada' },
  { status: 'delivered', label: 'Entregue', desc: 'Pedido entregue com sucesso!' },
]

export default function PublicOrderTrackingPage() {
  const { slug, id } = useParams()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Simulation/mock state
  const [isSimulated, setIsSimulated] = useState(false)
  const [simStep, setSimStep] = useState(0)

  const loadData = async (isPoll = false) => {
    try {
      if (!isPoll) setLoading(true)
      const restRes = await publicApi.getRestaurant(slug)
      const orderRes = await publicApi.getOrder(slug, id)

      if (restRes.success) setRestaurant(restRes.data)
      if (orderRes.success) setOrder(orderRes.data)
    } catch (err) {
      console.warn('Erro ao conectar com API para rastreamento, usando simulador.', err)
      // Activate mock simulator
      if (slug === 'burger-house' || id) {
        setIsSimulated(true)
        setRestaurant(MOCK_RESTAURANT)
        // If simulated, maintain current order object but dynamically mutate status
        setOrder(prev => {
          if (prev) return prev
          return {
            ...MOCK_ORDER,
            id,
            order_number: `#20260606-${id.slice(-4)}`
          }
        })
      } else {
        setError('Pedido ou estabelecimento não encontrado.')
      }
    } finally {
      if (!isPoll) setLoading(false)
    }
  }

  // Load initially
  useEffect(() => {
    loadData()
  }, [slug, id])

  // Polling every 10 seconds if backend is online
  useEffect(() => {
    if (isSimulated) return
    const timer = setInterval(() => {
      loadData(true)
    }, 10000)
    return () => clearInterval(timer)
  }, [slug, id, isSimulated])

  // Simulated status progression for demo purposes (advances every 20s)
  useEffect(() => {
    if (!isSimulated || !order) return
    const timer = setInterval(() => {
      setSimStep(prev => {
        const nextStep = prev + 1
        if (nextStep < STATUS_STEPS.length) {
          const nextStatus = STATUS_STEPS[nextStep].status
          setOrder(o => ({
            ...o,
            status: nextStatus,
            logs: [...o.logs, { to_status: nextStatus, notes: STATUS_STEPS[nextStep].desc, created_at: new Date().toISOString() }]
          }))
          toast.success(`Status do pedido atualizado: ${STATUS_STEPS[nextStep].label}! 🎉`)
          return nextStep
        }
        return prev
      })
    }, 20000)
    return () => clearInterval(timer)
  }, [isSimulated, order])

  // Apply visual theme from database dynamically
  useEffect(() => {
    if (restaurant) {
      applyTheme(restaurant)
    }
    return () => {
      removeTheme()
    }
  }, [restaurant])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--theme-bg, #0F0F0F)' }}>
        <div className="text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--theme-primary, #FF6B35)', borderTopColor: 'transparent' }} />
          <p className="text-gray-400 text-sm font-medium">Buscando status do pedido...</p>
        </div>
      </div>
    )
  }

  if (error || !restaurant || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: 'var(--theme-bg, #0F0F0F)' }}>
        <AlertTriangle size={48} className="mb-4" style={{ color: 'var(--theme-primary, #FF6B35)' }} />
        <h2 className="text-xl font-bold text-white mb-2">Pedido não localizado</h2>
        <p className="text-gray-400 text-sm max-w-sm mb-6">{error || 'Verifique o link enviado pelo estabelecimento.'}</p>
        <Link to={`/cardapio/${slug}`} className="text-sm font-semibold px-6 py-2.5 rounded-xl text-white" style={{ backgroundColor: 'var(--theme-primary, #FF6B35)' }}>
          Ir para o Cardápio
        </Link>
      </div>
    )
  }

  const primaryColor = restaurant.primary_color || '#FF6B35'
  const bgColor = restaurant.background_color || '#0F0F0F'
  const buttonColor = restaurant.button_color || primaryColor
  const buttonRadiusClass = restaurant.border_radius === 'quadrada' ? 'rounded-none' : 'rounded-xl'
  const borderRadiusClass = restaurant.border_radius === 'quadrada' ? 'rounded-none' : 'rounded-3xl'

  // Stepper calculations
  const currentStepIndex = STATUS_STEPS.findIndex(s => s.status === order.status)
  const isCancelled = order.status === 'cancelled'

  // WhatsApp click text
  const supportContact = restaurant.support_phone || restaurant.whatsapp || ''
  const cleanPhone = supportContact.replace(/\D/g, '')
  const formattedPhone = cleanPhone.length === 11 || cleanPhone.length === 10 ? `55${cleanPhone}` : cleanPhone
  const whatsappUrl = `https://wa.me/${formattedPhone || restaurant.whatsapp}?text=Olá! Gostaria de informações sobre o meu pedido ${order.order_number}.`

  return (
    <div className="min-h-screen font-inter pb-12 text-left" style={{ backgroundColor: bgColor, color: restaurant.text_color || '#FFFFFF' }}>
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6">
        
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(`/cardapio/${slug}`)}
            className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Voltar ao Cardápio</span>
          </button>
          <span className="text-xs font-semibold text-gray-400 bg-white/5 border border-white/10 px-3 py-1 rounded-full flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" style={{ color: primaryColor }} />
            <span>Atualizando automático</span>
          </span>
        </div>

        {/* simulated status notice */}
        {isSimulated && (
          <div className="mb-6 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 text-center animate-pulse">
            Simulador de Entrega Ativo: O status mudará automaticamente a cada 20 segundos para fins de teste.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* Tracking Stepper */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Status Card */}
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-black text-white">Acompanhe seu Pedido</h2>
                  <p className="text-xs text-gray-400 mt-1">Pedido ID: <span className="font-bold text-white">{order.order_number}</span></p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 font-semibold block">FEITO EM</span>
                  <span className="text-xs font-bold text-gray-300">
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Cancelled Block */}
              {isCancelled ? (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 mb-2">
                  <h4 className="text-sm font-bold text-red-500">Pedido Cancelado</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Este pedido foi cancelado pelo estabelecimento. Entre em contato para maiores detalhes.
                  </p>
                </div>
              ) : (
                /* Stepper */
                <div className="relative pl-6 space-y-8 py-2 border-l border-white/10 ml-3">
                  {STATUS_STEPS.map((step, idx) => {
                    const isCompleted = idx < currentStepIndex
                    const isActive = idx === currentStepIndex
                    const isPending = idx > currentStepIndex

                    let description = step.desc
                    if (step.status === 'confirmed' && restaurant.order_confirmed_message) {
                      description = restaurant.order_confirmed_message
                    } else if (step.status === 'out_for_delivery' && restaurant.order_dispatched_message) {
                      description = restaurant.order_dispatched_message
                    }

                    return (
                      <div key={step.status} className="relative">
                        {/* Dot badge */}
                        <div
                          className={`absolute -left-[35px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all duration-300 ${
                            isCompleted
                              ? 'bg-green-600 text-white'
                              : isActive
                              ? 'text-white'
                              : 'bg-[#1A0533] border border-white/10 text-gray-600'
                          }`}
                          style={isActive ? { backgroundColor: primaryColor, boxShadow: `0 0 15px ${primaryColor}40` } : {}}
                        >
                          {isCompleted ? <Check size={12} /> : idx + 1}
                        </div>

                        {/* Text */}
                        <div className="text-left">
                          <h4
                            className={`text-sm font-bold ${
                              isActive ? 'text-white' : isCompleted ? 'text-gray-300' : 'text-gray-600'
                            }`}
                          >
                            {step.label}
                          </h4>
                          <p
                            className={`text-xs mt-0.5 ${
                              isActive ? 'text-gray-300 font-medium' : 'text-gray-500'
                            }`}
                          >
                            {description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Delivery address / details */}
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bike size={16} style={{ color: primaryColor }} />
                Detalhes da Entrega
              </h3>
              
              {order.order_type === 'delivery' ? (
                <div className="text-xs text-gray-300 leading-relaxed">
                  <p className="font-semibold text-white">Endereço de Envio:</p>
                  <p className="mt-1">
                    {order.delivery_address}, N° {order.delivery_number}
                    {order.delivery_complement && `, ${order.delivery_complement}`}
                  </p>
                  <p>{order.delivery_neighborhood} — {order.delivery_city}/{order.delivery_state}</p>
                  {order.driver_name && (
                    <div className="mt-4 p-3 rounded-2xl bg-white/[0.01] border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-gray-500 font-semibold uppercase">ENTREGADOR DESIGNADO</p>
                        <p className="text-xs font-bold text-white mt-0.5">{order.driver_name}</p>
                      </div>
                      {order.driver_phone && (
                        <a href={`tel:${order.driver_phone}`} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-[#FF6B35] transition-all" style={{ color: primaryColor }}>
                          <Phone size={15} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Este pedido foi feito para **Retirada no Balcão**.</p>
              )}
            </div>

          </div>

          {/* Details Summary & WhatsApp contact */}
          <div className="space-y-6">
            
            {/* WhatsApp Contact */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-4 ${buttonRadiusClass} bg-green-600 hover:bg-green-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all`}
            >
              <MessageSquare size={16} />
              Contatar Estabelecimento
            </a>

            {restaurant.support_phone && (
              <div className="text-center p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-gray-400">
                Suporte por telefone: <a href={`tel:${restaurant.support_phone}`} className="font-bold text-white hover:underline">{restaurant.support_phone}</a>
              </div>
            )}

            {/* Order details summary */}
            <div className={`bg-white/[0.02] border border-white/5 p-5 space-y-4 ${borderRadiusClass}`}>
              <h3 className="text-xs font-bold text-white border-b border-white/5 pb-3">Resumo do Pedido</h3>
              
              <div className="divide-y divide-white/5 max-h-40 overflow-y-auto pr-1">
                {order.items?.map((item) => (
                  <div key={item.id} className="py-2 flex justify-between gap-4 text-xs">
                    <span className="text-gray-300 font-semibold">{item.quantity}x {item.product_name}</span>
                    <span className="text-gray-400">R$ {parseFloat(item.total_price).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/5 pt-3.5 space-y-2 text-xs text-gray-400">
                <div className="flex justify-between items-center">
                  <span>Subtotal</span>
                  <span className="font-semibold text-white">R$ {parseFloat(order.subtotal).toFixed(2)}</span>
                </div>
                {order.order_type === 'delivery' && (
                  <div className="flex justify-between items-center">
                    <span>Taxa de entrega</span>
                    <span className="font-semibold text-white">R$ {parseFloat(order.delivery_fee).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-white/5 pt-3.5 flex justify-between items-center text-white">
                  <span className="font-bold text-sm">Total</span>
                  <span className="font-black text-base" style={{ color: primaryColor }}>
                    R$ {parseFloat(order.total).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
