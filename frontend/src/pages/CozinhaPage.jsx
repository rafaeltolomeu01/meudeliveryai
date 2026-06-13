import { playNewOrderBell } from '../utils/orderSound'
import { printOrderTicket } from '../utils/printOrder'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChefHat, Clock, Check, Play, Bell, LogOut, Loader2, Volume2, VolumeX, RefreshCw, LayoutDashboard, Printer } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { orders as ordersApi } from '../services/api'

export default function CozinhaPage() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState({})
  
  // Timer para re-renderizar tempos relativos
  const [, setTimeTick] = useState(0)

  // Configuração de áudio (persiste no localStorage)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('mda_kitchen_sound')
    return saved !== 'false'
  })

  const prevOrderIds = useRef(new Set())
  const isFirstLoad = useRef(true)

  // Duplo bipe usando Web Audio API
  const playBeep = () => {
    if (!soundEnabled) return
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      
      const osc1 = audioCtx.createOscillator()
      const gain1 = audioCtx.createGain()
      osc1.connect(gain1)
      gain1.connect(audioCtx.destination)
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(660, audioCtx.currentTime) // E5
      gain1.gain.setValueAtTime(0.04, audioCtx.currentTime)
      osc1.start()
      gain1.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.15)
      osc1.stop(audioCtx.currentTime + 0.15)
      
      setTimeout(() => {
        if (audioCtx.state === 'closed') return
        const osc2 = audioCtx.createOscillator()
        const gain2 = audioCtx.createGain()
        osc2.connect(gain2)
        gain2.connect(audioCtx.destination)
        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(880, audioCtx.currentTime) // A5
        gain2.gain.setValueAtTime(0.04, audioCtx.currentTime)
        osc2.start()
        gain2.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.15)
        osc2.stop(audioCtx.currentTime + 0.15)
      }, 120)
    } catch (err) {
      console.error('Falha ao reproduzir áudio:', err)
    }
  }

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const newVal = !prev
      localStorage.setItem('mda_kitchen_sound', String(newVal))
      return newVal
    })
    toast.success(!soundEnabled ? 'Sons ativados! 🔊' : 'Sons desativados! 🔇')
  }

  const loadKitchenOrders = async (isSilent = false) => {
    try {
      if (!isSilent) setRefreshing(true)
      const res = await ordersApi.list({ limit: 100 })
      if (res.success && res.data) {
        // Filtrar apenas pendentes de aprovação e em preparo
        const kitchenList = res.data.filter(
          (o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing'
        )
        
        // Ordenar FIFO (pedidos mais antigos primeiro)
        const sorted = kitchenList.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        
        setOrders(sorted)

        // Verificar se há novos pedidos pendentes para disparar o som
        const newIds = new Set(sorted.map((o) => o.id))
        const hasNewPending = sorted.some(
          (o) => o.status === 'pending' && !prevOrderIds.current.has(o.id)
        )

        if (hasNewPending && !isFirstLoad.current) {
          playNewOrderBell(5000)
          toast('Novo pedido na fila da cozinha!', { icon: '🔔', duration: 4000 })
        }

        prevOrderIds.current = newIds
        isFirstLoad.current = false
      }
    } catch (err) {
      console.error('Erro ao buscar pedidos da cozinha:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadKitchenOrders()
    
    // Polling a cada 8 segundos
    const pollInterval = setInterval(() => {
      loadKitchenOrders(true)
    }, 8000)

    // Forçar atualização do tempo decorrido a cada 30 segundos
    const timeInterval = setInterval(() => {
      setTimeTick((t) => t + 1)
    }, 30000)

    return () => {
      clearInterval(pollInterval)
      clearInterval(timeInterval)
    }
  }, [soundEnabled])

  const handleUpdateStatus = async (orderId, newStatus, orderNumber) => {
    setActionLoading((prev) => ({ ...prev, [orderId]: true }))
    try {
      const res = await ordersApi.updateStatus(orderId, newStatus)
      if (res.success) {
        const nextLabels = {
          preparing: 'Iniciado preparo',
          ready: 'Pronto e enviado para entrega',
        }
        toast.success(`Pedido ${orderNumber}: ${nextLabels[newStatus] || newStatus}! 🎉`)
        
        localStorage.setItem('mda_orders_updated_at', String(Date.now()))
        window.dispatchEvent(new Event('mda_orders_updated'))

        // Atualiza a lista local removendo ou atualizando o estado do item
        await loadKitchenOrders(true)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar status do pedido.')
    } finally {
      setActionLoading((prev) => ({ ...prev, [orderId]: false }))
    }
  }

  const getMinutesElapsed = (createdAt) => {
    const diffMs = new Date() - new Date(createdAt)
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'agora mesmo'
    if (diffMins === 1) return 'há 1 min'
    return `há ${diffMins} min`
  }

  const getFormattedTime = (createdAt) => {
    return new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const itemOptions = (value) => {
    if (!value) return []
    try { return typeof value === 'string' ? JSON.parse(value) : value } catch { return [] }
  }

  const isDrinkItem = (name = '') => /bebida|refrigerante|coca|guaran|suco|água|agua|lat(a|ão)|refri|drink|vitamina/i.test(name)

  const hasImportantDetails = (order) => {
    return !!order.notes || order.items?.some(i => i.notes || isDrinkItem(i.product_name || i.name || ''))
  }

  const printKitchen = (order) => {
    printOrderTicket(order, { restaurantName: user?.restaurant?.name || 'Restaurante', type: 'kitchen', size: '80mm' })
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] text-[#1f1f1f] p-4 sm:p-6 font-inter text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-[#e8e8e8] pb-5">
        <div className="flex items-center gap-3">
          <div style={{ background: 'linear-gradient(135deg, #FF6B35, #e84e15)' }} className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(255,107,53,0.4)]">
            <ChefHat size={26} color="white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Monitor da Cozinha</h1>
            <p className="text-[#717171] text-sm mt-0.5">
              {user?.restaurant?.name || 'Painel de Produção'} — {orders.length} pedidos ativos
            </p>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            
            {/* Atualizar Manual */}
            <button
              onClick={() => loadKitchenOrders(false)}
              disabled={refreshing}
              className="p-3 bg-white/5 hover:bg-white/10 text-[#717171] hover:text-white rounded-xl transition-all disabled:opacity-50"
              title="Atualizar Pedidos"
            >
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>

            {/* Controle de Som */}
            <button
              onClick={toggleSound}
              className={`p-3 rounded-xl transition-all ${
                soundEnabled 
                  ? 'bg-green-600/10 text-green-400 border border-green-500/20 hover:bg-green-600/20' 
                  : 'bg-white/5 text-[#717171] hover:bg-white/10'
              }`}
              title={soundEnabled ? 'Desativar bip de novos pedidos' : 'Ativar bip de novos pedidos'}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          </div>

          <Button variant="secondary" size="md" leftIcon={LayoutDashboard} onClick={() => navigate('/dashboard')}>
            Voltar ao Painel
          </Button>

          <Button variant="danger" size="md" leftIcon={LogOut} onClick={logout}>
            Sair
          </Button>
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-[#FF6B35]" size={36} />
            <p className="text-[#717171] text-lg font-medium">Carregando painel de produção...</p>
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="glass rounded-3xl p-12 border border-white/[0.06] text-center max-w-md mx-auto mt-16 shadow-2xl">
          <p className="text-6xl mb-5">🎉</p>
          <h3 className="text-xl font-bold text-white mb-2">Cozinha sem pendências!</h3>
          <p className="text-[#717171] text-sm leading-relaxed">Nenhum pedido aguardando preparo ou em produção no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => {
            const isPending = order.status === 'pending' || order.status === 'confirmed'
            
            return (
              <div
                key={order.id}
                className={`mda-card rounded-[26px] border flex flex-col justify-between overflow-hidden transition-all duration-300 bg-white ${order.status === 'pending' || hasImportantDetails(order) ? 'kitchen-blink' : ''}`}
              >
                {/* Header do Card */}
                <div className="p-6 border-b border-[#e8e8e8] flex items-center justify-between bg-white">
                  <div>
                    <span className="text-[#1f1f1f] font-black text-2xl tracking-tight">{order.order_number}</span>
                    <div className="flex items-center gap-2 text-[#717171] text-xs font-semibold mt-1">
                      <Clock size={13} className="text-[#FF6B35]" />
                      <span>{getFormattedTime(order.created_at)}</span>
                      <span className="text-[#717171]">({getMinutesElapsed(order.created_at)})</span>
                    </div>
                  </div>
                  <Badge color={isPending ? 'yellow' : 'orange'} size="md">
                    {isPending ? 'Aguardando' : 'Em Preparo'}
                  </Badge>
                </div>

                {/* Itens do Pedido */}
                <div className="p-6 flex-1 space-y-5">
                  <div className="space-y-4">
                    {order.items?.map((item, idx) => {
                      const opts = itemOptions(item.options)
                      
                      return (
                        <div key={idx} className="border-b border-[#e8e8e8] pb-3.5 last:border-0 last:pb-0 text-left">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-lg font-bold text-[#1f1f1f] leading-snug">
                              <span className="text-[#FF6B35] font-black text-2xl mr-2.5">{item.quantity}x</span>
                              {item.product_name || item.name}
                            </p>
                          </div>
                          
                          {/* Opcionais do item */}
                          {opts.length > 0 && (
                            <div className="mt-1.5 pl-8 space-y-0.5">
                              {opts.map((o, oIdx) => (
                                <p key={oIdx} className="text-xs text-[#717171] font-medium">+ {o.name}</p>
                              ))}
                            </div>
                          )}

                          {isDrinkItem(item.product_name || item.name || '') && (
                            <div className="mt-2 pl-8"><div className="drink-alert">🥤 BEBIDA / GELADEIRA: conferir e separar</div></div>
                          )}

                          {item.notes && (
                            <div className="mt-2 pl-8"><div className="note-alert">⚠️ OBS DO ITEM: {item.notes}</div></div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Observação Geral do Pedido */}
                  {order.notes && (
                    <div className="note-alert text-sm text-left">
                      <p className="font-extrabold uppercase tracking-wider mb-1">⚠️ Observação do Pedido:</p>
                      <p>"{order.notes}"</p>
                    </div>
                  )}
                </div>

                {/* Footer do Card - Botões Grandes */}
                <div className="p-6 border-t border-[#e8e8e8] bg-[#fafafa] space-y-3">
                  <button onClick={() => printKitchen(order)} className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#e8e8e8] bg-white py-3 text-sm font-black text-[#1f1f1f] hover:bg-[#f5f5f5]">
                    <Printer size={16} /> Imprimir Cozinha
                  </button>
                  {isPending ? (
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      leftIcon={actionLoading[order.id] ? Loader2 : Play}
                      loading={actionLoading[order.id]}
                      onClick={() => handleUpdateStatus(order.id, 'preparing', order.order_number)}
                      className="py-4 text-base font-bold shadow-[0_0_15px_rgba(255,107,53,0.25)] h-14"
                    >
                      Iniciar Preparo
                    </Button>
                  ) : (
                    <Button
                      variant="success"
                      size="lg"
                      fullWidth
                      leftIcon={actionLoading[order.id] ? Loader2 : Check}
                      loading={actionLoading[order.id]}
                      onClick={() => handleUpdateStatus(order.id, 'ready', order.order_number)}
                      className="py-4 text-base font-bold shadow-[0_0_15px_rgba(34,197,94,0.25)] h-14"
                    >
                      Marcar Pronto
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
