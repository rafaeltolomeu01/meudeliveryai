import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Phone, Bike, Clock, HelpCircle, Check, Loader2, AlertTriangle } from 'lucide-react'
import { publicApi } from '../services/api'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'

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

  const [messages, setMessages] = useState([])
  const [newMessageText, setNewMessageText] = useState('')

  const loadData = async (isPoll = false) => {
    try {
      if (!isPoll) setLoading(true)
      const restRes = await publicApi.getRestaurant(slug)
      const orderRes = await publicApi.getOrder(slug, id)

      if (restRes.success) setRestaurant(restRes.data)
      if (orderRes.success) setOrder(orderRes.data)

      // Load chat messages
      if (!isSimulated) {
        const chatRes = await publicApi.getMessages(slug, id)
        if (chatRes.success && chatRes.data) {
          setMessages(chatRes.data)
        }
      }
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

          const statusChatMessages = {
            confirmed: 'Seu pedido foi confirmado pelo estabelecimento! ✅',
            preparing: 'Seu pedido já está em andamento / preparação! 👨‍🍳',
            ready: 'Seu pedido está pronto! 📦',
            out_for_delivery: 'Seu pedido saiu para entrega! 🛵',
            delivered: 'Seu pedido foi entregue! Agradecemos a preferência! 🍔',
          };
          const chatMsg = statusChatMessages[nextStatus]
          if (chatMsg) {
            setMessages(m => [
              ...m,
              {
                id: Date.now(),
                order_id: id,
                sender_type: 'system',
                message: chatMsg,
                created_at: new Date().toISOString()
              }
            ])
          }

          toast.success(`Status do pedido atualizado: ${STATUS_STEPS[nextStep].label}! 🎉`)
          return nextStep
        }
        return prev
      })
    }, 20000)
    return () => clearInterval(timer)
  }, [isSimulated, order])

  const loadChatMessages = async () => {
    if (isSimulated) return
    try {
      const res = await publicApi.getMessages(slug, id)
      if (res.success && res.data) {
        setMessages(res.data)
      }
    } catch (err) {
      console.warn('Erro ao carregar chat:', err)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessageText.trim()) return

    const txt = newMessageText.trim()
    setNewMessageText('')

    if (isSimulated) {
      const customerMsg = {
        id: Date.now(),
        order_id: id,
        sender_type: 'customer',
        message: txt,
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, customerMsg])

      setTimeout(() => {
        const merchantMsg = {
          id: Date.now() + 1,
          order_id: id,
          sender_type: 'merchant',
          message: 'Olá! Recebemos sua mensagem. Seu pedido está sendo preparado e qualquer dúvida estamos à disposição! 👍',
          created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, merchantMsg])
      }, 3000)
      return
    }

    try {
      const res = await publicApi.sendMessage(slug, id, txt)
      if (res.success && res.data) {
        setMessages(prev => [...prev, res.data])
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao enviar mensagem.')
    }
  }

  // Initialize mock messages on simulation mode start
  useEffect(() => {
    if (isSimulated) {
      setMessages([
        {
          id: 1,
          order_id: id,
          sender_type: 'system',
          message: 'Pedido enviado! Aguardando confirmação do estabelecimento. ⏳',
          created_at: new Date().toISOString()
        }
      ])
    }
  }, [isSimulated])

  // Polling for chat messages
  useEffect(() => {
    if (isSimulated) return
    const timer = setInterval(() => {
      loadChatMessages()
    }, 5000)
    return () => clearInterval(timer)
  }, [slug, id, isSimulated])

  // Scroll chat messages to bottom
  useEffect(() => {
    const container = document.getElementById('chat-messages-container')
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages])
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#FF5A1F]" size={40} />
          <p className="text-slate-500 text-sm font-semibold">Buscando status do pedido...</p>
        </div>
      </div>
    )
  }

  if (error || !restaurant || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#F8FAFC]">
        <AlertTriangle size={48} className="mb-4 text-[#FF5A1F]" />
        <h2 className="text-xl font-black text-slate-900 mb-2">Pedido não localizado</h2>
        <p className="text-slate-500 text-sm max-w-sm mb-6">{error || 'Verifique o link enviado pelo estabelecimento.'}</p>
        <Link to={`/cardapio/${slug}`} className="text-sm font-extrabold px-6 py-3 rounded-2xl text-white bg-[#FF5A1F] hover:bg-[#e04f1a] transition-all shadow-md">
          Ir para o Cardápio
        </Link>
      </div>
    )
  }

  const primaryColor = restaurant.primary_color || '#FF5A1F'
  const buttonColor = primaryColor
  const buttonRadiusClass = restaurant.border_radius === 'quadrada' ? 'rounded-none' : 'rounded-2xl'
  const borderRadiusClass = restaurant.border_radius === 'quadrada' ? 'rounded-none' : 'rounded-3xl'

  // Stepper calculations
  const currentStepIndex = STATUS_STEPS.findIndex(s => s.status === order.status)
  const isCancelled = order.status === 'cancelled'

  // WhatsApp click text
  const supportContact = restaurant.whatsapp_number || restaurant.support_phone || restaurant.whatsapp || restaurant.phone || ''
  const cleanPhone = supportContact.replace(/\D/g, '')
  const formattedPhone = cleanPhone.length === 11 || cleanPhone.length === 10 ? `55${cleanPhone}` : cleanPhone
  const whatsappUrl = formattedPhone ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(`Olá! Gostaria de informações sobre o meu pedido ${order.order_number}.`)}` : `tel:${supportContact}`

  return (
    <div className="min-h-screen font-inter pb-12 text-left bg-[#F8FAFC] text-[#111827]">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6">
        
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(`/cardapio/${slug}`)}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-950 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Voltar ao Cardápio</span>
          </button>
          <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
            <Loader2 size={12} className="animate-spin text-[#FF5A1F]" />
            <span>Atualizando automático</span>
          </span>
        </div>

        {/* simulated status notice */}
        {isSimulated && (
          <div className="mb-6 p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700 text-center animate-pulse shadow-sm">
            Simulador de Entrega Ativo: O status mudará automaticamente a cada 20 segundos para fins de teste.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* Tracking Stepper */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Status Card */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Acompanhe seu Pedido</h2>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">Pedido ID: <span className="font-extrabold text-slate-900">{order.order_number}</span></p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">FEITO EM</span>
                  <span className="text-xs font-black text-slate-800">
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Cancelled Block */}
              {isCancelled ? (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 mb-2 text-left">
                  <h4 className="text-sm font-extrabold text-rose-950">Pedido Cancelado</h4>
                  <p className="text-xs text-rose-700 mt-1">
                    Este pedido foi cancelado pelo estabelecimento. Entre em contato para maiores detalhes.
                  </p>
                </div>
              ) : (
                /* Stepper */
                <div className="relative pl-8 space-y-8 py-2 border-l border-slate-200 ml-4">
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
                          className={`absolute -left-[44px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all duration-300 ${
                            isCompleted
                              ? 'bg-green-600 text-white shadow-sm'
                              : isActive
                              ? 'text-white shadow-sm'
                              : 'bg-slate-100 border border-slate-200 text-slate-400'
                          }`}
                          style={isActive ? { backgroundColor: primaryColor, boxShadow: `0 0 15px ${primaryColor}40` } : {}}
                        >
                          {isCompleted ? <Check size={12} /> : idx + 1}
                        </div>

                        {/* Text */}
                        <div className="text-left">
                          <h4
                            className={`text-sm font-extrabold ${
                              isActive ? 'text-slate-900' : isCompleted ? 'text-slate-600' : 'text-slate-400'
                            }`}
                          >
                            {step.label}
                          </h4>
                          <p
                            className={`text-xs mt-0.5 ${
                              isActive ? 'text-slate-700 font-medium' : 'text-slate-500'
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
            <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Bike size={16} style={{ color: primaryColor }} />
                Detalhes da Entrega
              </h3>
              
              {order.order_type === 'delivery' ? (
                <div className="text-xs text-slate-650 leading-relaxed font-semibold">
                  <p className="font-bold text-slate-800">Endereço de Envio:</p>
                  <p className="mt-1">
                    {order.delivery_address}, N° {order.delivery_number}
                    {order.delivery_complement && `, ${order.delivery_complement}`}
                  </p>
                  <p>{order.delivery_neighborhood} — {order.delivery_city}/{order.delivery_state}</p>
                  {order.driver_name && (
                    <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">ENTREGADOR DESIGNADO</p>
                        <p className="text-xs font-extrabold text-slate-900 mt-0.5">{order.driver_name}</p>
                      </div>
                      {order.driver_phone && (
                        <a href={`tel:${order.driver_phone}`} className="p-2 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-[#FF5A1F] transition-all shadow-sm">
                          <Phone size={15} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-semibold">Este pedido foi feito para **Retirada no Balcão**.</p>
              )}
            </div>

            {/* Chat com o Estabelecimento */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full" style={{ backgroundColor: primaryColor }} />
                Chat do Pedido 💬
              </h3>
              
              <div className="flex flex-col h-[300px] bg-slate-50 border border-slate-200/80 rounded-2xl overflow-hidden">
                {/* Message History */}
                <div 
                  className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col no-scrollbar scroll-smooth bg-white" 
                  id="chat-messages-container"
                >
                  {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-white">
                      <MessageSquare size={24} className="text-slate-400 mb-2 animate-pulse" />
                      <p className="text-[10px] text-slate-500 italic">Nenhuma mensagem. Envie um oi para falar com o restaurante!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isCustomer = msg.sender_type === 'customer'
                      const isSystem = msg.sender_type === 'system'
                      
                      if (isSystem) {
                        return (
                          <div key={msg.id} className="self-center bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full text-[10px] text-slate-500 font-bold max-w-[90%] text-center shadow-sm">
                            {msg.message}
                          </div>
                        )
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed flex flex-col shadow-sm ${
                            isCustomer
                              ? 'self-end text-white rounded-tr-none'
                              : 'self-start bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
                          }`}
                          style={isCustomer ? { backgroundColor: primaryColor } : {}}
                        >
                          <span className={`font-bold text-[9px] mb-1 ${isCustomer ? 'text-white/85' : 'text-slate-500'}`}>
                            {isCustomer ? 'Você' : (restaurant.name || 'Estabelecimento')}
                          </span>
                          <span>{msg.message}</span>
                          <span className={`text-[8px] self-end mt-1 font-bold ${isCustomer ? 'text-white/75' : 'text-slate-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Message Input Form */}
                <form onSubmit={handleSendMessage} className="p-3 bg-slate-50 border-t border-slate-200/50 flex gap-2">
                  <input
                    type="text"
                    placeholder="Digite sua mensagem para o restaurante..."
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF5A1F] focus:ring-1 focus:ring-[#FF5A1F]/30"
                  />
                  <button 
                    type="submit" 
                    className="px-4 py-2 text-xs font-bold text-white rounded-xl hover:opacity-90 transition-opacity shrink-0 animate-fade-in"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Enviar
                  </button>
                </form>
              </div>
            </div>

          </div>

          {/* Details Summary & WhatsApp contact */}
          <div className="space-y-6">
            
            {/* WhatsApp Contact */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-4 ${buttonRadiusClass} bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all`}
            >
              <MessageSquare size={16} />
              Contatar Estabelecimento
            </a>

            {restaurant.support_phone && (
              <div className="text-center p-3.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-500 shadow-sm">
                Suporte por telefone: <a href={`tel:${restaurant.support_phone}`} className="font-extrabold text-slate-950 hover:underline">{restaurant.support_phone}</a>
              </div>
            )}

            {/* Order details summary */}
            <div className={`bg-white border border-slate-200 shadow-sm p-5 space-y-4 ${borderRadiusClass}`}>
              <h3 className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider">Resumo do Pedido</h3>
              
              <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto pr-1">
                {order.items?.map((item) => (
                  <div key={item.id} className="py-2 flex justify-between gap-4 text-xs">
                    <span className="text-slate-800 font-bold">{item.quantity}x {item.product_name}</span>
                    <span className="text-slate-500 font-semibold">R$ {parseFloat(item.total_price).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-500">
                <div className="flex justify-between items-center">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-900">R$ {parseFloat(order.subtotal).toFixed(2)}</span>
                </div>
                {order.order_type === 'delivery' && (
                  <div className="flex justify-between items-center">
                    <span>Taxa de entrega</span>
                    <span className="font-bold text-slate-900">R$ {parseFloat(order.delivery_fee).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-slate-900">
                  <span className="font-extrabold text-slate-900 text-sm">Total</span>
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
