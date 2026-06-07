import { useState, useEffect } from 'react'
import { Bike, MapPin, Phone, Check, Navigation, LogOut, DollarSign, Loader2, Play } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { orders as ordersApi } from '../services/api'
import { formatCurrency } from '../utils/helpers'

const paymentLabels = {
  pix: '💠 Pix (Pago Online/No Recebimento)',
  credit_card: '💳 Cartão de Crédito',
  debit_card: '💳 Cartão de Débito',
  cash: '💵 Dinheiro',
  meal_voucher: '🎫 Vale-refeição',
  online: '🌐 Pagamento Online'
}

export default function EntregadorPage() {
  const { logout, user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState({})

  const loadDriverDeliveries = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true)
      const res = await ordersApi.list({ limit: 100 })
      if (res.success && res.data) {
        setOrders(res.data)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar entregas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDriverDeliveries()
    // Polling a cada 10 segundos
    const interval = setInterval(() => {
      loadDriverDeliveries(true)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleUpdateStatus = async (orderId, newStatus, orderNumber) => {
    setActionLoading(prev => ({ ...prev, [orderId]: true }))
    try {
      const res = await ordersApi.updateStatus(orderId, newStatus)
      if (res.success) {
        if (newStatus === 'out_for_delivery') {
          toast.success(`Pedido ${orderNumber} em rota de entrega! 🛵`)
        } else if (newStatus === 'delivered') {
          toast.success(`Pedido ${orderNumber} entregue com sucesso! 🏁`)
        }
        loadDriverDeliveries(true)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar status da entrega.')
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: false }))
    }
  }

  // Filtrar fila de entregas ativas (Pronto e Saiu para Entrega)
  const activeDeliveries = orders.filter(
    o => o.status === 'ready' || o.status === 'out_for_delivery'
  )

  // Estatísticas de hoje baseadas nas entregas concluídas
  const todayStr = new Date().toDateString()
  const completedToday = orders.filter(
    o => (o.status === 'delivered' || o.status === 'picked_up') &&
         new Date(o.updated_at || o.created_at).toDateString() === todayStr
  )
  const totalEarnedToday = completedToday.reduce((sum, o) => sum + parseFloat(o.delivery_fee || 0), 0)

  return (
    <div className="min-h-screen bg-[#1A0533] text-white p-4 sm:p-8 font-inter text-left">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 border-b border-white/[0.06] pb-5">
        <div className="flex items-center gap-3">
          <div style={{ background: 'linear-gradient(135deg, #FF6B35, #e84e15)' }} className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,107,53,0.4)]">
            <Bike size={22} color="white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Painel do Entregador</h1>
            <p className="text-[#a991c7] text-xs sm:text-sm">Olá, {user?.name || 'Entregador'} — Frota Local</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="danger" size="sm" leftIcon={LogOut} onClick={logout}>
            Sair
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        <div className="glass rounded-2xl p-5 border border-white/[0.06] flex items-center justify-between bg-[#220d3a]/30">
          <div className="space-y-1">
            <span className="text-[#a991c7] text-xs font-semibold uppercase tracking-wider">Ganhos Estimados (Hoje)</span>
            <p className="text-2xl font-extrabold text-white">{formatCurrency(totalEarnedToday)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <DollarSign size={20} className="text-green-400" />
          </div>
        </div>
        <div className="glass rounded-2xl p-5 border border-white/[0.06] flex items-center justify-between bg-[#220d3a]/30">
          <div className="space-y-1">
            <span className="text-[#a991c7] text-xs font-semibold uppercase tracking-wider">Entregas Concluídas (Hoje)</span>
            <p className="text-2xl font-extrabold text-white">{completedToday.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center">
            <Bike size={20} className="text-[#FF6B35]" />
          </div>
        </div>
      </div>

      {/* Fila de Entregas */}
      <h2 className="text-lg font-bold text-white mb-4">Minha Fila de Entregas</h2>
      
      {loading && orders.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-[#FF6B35]" size={32} />
          <p className="text-[#a991c7] text-sm font-semibold">Carregando fila de entregas...</p>
        </div>
      ) : activeDeliveries.length === 0 ? (
        <div className="glass rounded-3xl p-12 border border-white/[0.06] text-center max-w-md mx-auto mt-6 bg-[#220d3a]/20">
          <p className="text-4xl mb-4">🙌</p>
          <h3 className="text-lg font-bold text-white mb-1">Sem entregas a caminho!</h3>
          <p className="text-[#a991c7] text-sm">Aguarde novos pedidos ficarem prontos na cozinha para iniciar a rota.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeDeliveries.map((d) => {
            const isReady = d.status === 'ready'
            const fullAddress = `${d.delivery_address || ''}, N° ${d.delivery_number || ''} ${d.delivery_complement ? `- ${d.delivery_complement}` : ''}, ${d.delivery_neighborhood || ''} — ${d.delivery_city || ''}/${d.delivery_state || ''}`

            return (
              <div
                key={d.id}
                className="glass rounded-3xl border border-white/[0.06] flex flex-col justify-between overflow-hidden shadow-lg transition-all duration-300 hover:border-[#FF6B35]/40 bg-[#220d3a]/40"
              >
                {/* Header */}
                <div className="p-5 border-b border-white/[0.05] flex items-center justify-between bg-black/10">
                  <div>
                    <span className="text-white font-extrabold text-lg">{d.order_number}</span>
                    <p className="text-xs text-[#a991c7] mt-0.5">Taxa de entrega: <span className="text-green-400 font-bold">{formatCurrency(d.delivery_fee)}</span></p>
                  </div>
                  <Badge color={isReady ? 'purple' : 'cyan'} size="sm">
                    {isReady ? 'Pronto (Retirar)' : 'Em rota'}
                  </Badge>
                </div>

                {/* Body */}
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex items-start gap-3">
                    <UserIcon className="flex-shrink-0 mt-0.5 text-[#FF6B35]" />
                    <div>
                      <p className="text-xs text-[#a991c7] font-semibold">Cliente</p>
                      <p className="text-sm font-bold text-white">{d.customer_name}</p>
                      {d.customer_phone && (
                        <a href={`tel:${d.customer_phone.replace(/\D/g, '')}`} className="text-xs text-[#FF6B35] flex items-center gap-1 mt-1 font-medium hover:underline">
                          <Phone size={10} />
                          {d.customer_phone}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-[#a991c7] font-semibold">Endereço de Entrega</p>
                      <p className="text-sm font-medium text-white">{fullAddress}</p>
                    </div>
                  </div>

                  {d.notes && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/[0.04] text-xs text-amber-300">
                      <p className="font-bold mb-0.5">Observação do Pedido:</p>
                      <p className="italic">"{d.notes}"</p>
                    </div>
                  )}

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/[0.04] space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#a991c7]">Forma de Pagamento:</span>
                      <span className="text-white font-bold">{paymentLabels[d.payment_method] || d.payment_method}</span>
                    </div>
                    {d.change_for && (
                      <div className="flex justify-between text-xs">
                        <span className="text-amber-400 font-semibold">Troco para:</span>
                        <span className="text-amber-400 font-bold">{formatCurrency(d.change_for)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm pt-1 border-t border-white/[0.03]">
                      <span className="text-[#a991c7] font-medium">Valor Total a Cobrar:</span>
                      <span className="text-[#FF6B35] font-extrabold text-base">
                        {d.payment_method === 'online' ? 'R$ 0,00 (Pago)' : formatCurrency(d.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer / Actions */}
                <div className="p-5 border-t border-white/[0.05] bg-black/10 flex gap-3">
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1"
                  >
                    <Button variant="ghost" size="md" fullWidth leftIcon={Navigation}>
                      GPS
                    </Button>
                  </a>
                  
                  {isReady ? (
                    <Button
                      variant="primary"
                      size="md"
                      fullWidth
                      leftIcon={actionLoading[d.id] ? Loader2 : Play}
                      loading={actionLoading[d.id]}
                      onClick={() => handleUpdateStatus(d.id, 'out_for_delivery', d.order_number)}
                      className="flex-1 shadow-[0_0_12px_rgba(255,107,53,0.2)] h-11"
                    >
                      Iniciar Rota
                    </Button>
                  ) : (
                    <Button
                      variant="success"
                      size="md"
                      fullWidth
                      leftIcon={actionLoading[d.id] ? Loader2 : Check}
                      loading={actionLoading[d.id]}
                      onClick={() => handleUpdateStatus(d.id, 'delivered', d.order_number)}
                      className="flex-1 shadow-[0_0_12px_rgba(34,197,94,0.2)] h-11"
                    >
                      Entregue
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

function UserIcon(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
