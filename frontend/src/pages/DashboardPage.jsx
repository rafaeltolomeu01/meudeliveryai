import { useState, useEffect } from 'react'
import {
  ShoppingBag, DollarSign, Clock, Users, TrendingUp, TrendingDown,
  ArrowUpRight, Package, ChevronRight, ToggleLeft, ToggleRight,
  TrendingUp as TicketIcon, Play, CheckCircle2, AlertCircle, Sparkles, Loader2
} from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { formatCurrency } from '../utils/helpers'
import { useAuth } from '../contexts/AuthContext'
import { orders as ordersApi, products as productsApi, customers as customersApi, restaurants as restaurantApi } from '../services/api'
import toast from 'react-hot-toast'

const weeklyData = [
  { day: 'Seg', orders: 32, revenue: 2890 },
  { day: 'Ter', orders: 41, revenue: 3650 },
  { day: 'Qua', orders: 38, revenue: 3200 },
  { day: 'Qui', orders: 55, revenue: 4870 },
  { day: 'Sex', orders: 72, revenue: 6340 },
  { day: 'Sáb', orders: 89, revenue: 7820 },
  { day: 'Dom', orders: 47, revenue: 3847 },
]

const recentOrders = [
  { id: '#BP-2847', customer: 'Maria Silva', items: 'X-Burguer + Batata G + Coca-Cola', total: 68.90, status: 'delivering', time: '18min' },
  { id: '#BP-2846', customer: 'João Mendes', items: 'Double Smash + Onion Rings', total: 54.50, status: 'preparing', time: '25min' },
  { id: '#BP-2845', customer: 'Ana Oliveira', items: 'Veggie Burguer + Batata P', total: 42.00, status: 'confirmed', time: '32min' },
  { id: '#BP-2844', customer: 'Carlos Souza', items: '2x X-Bacon + 2x Suco de Laranja', total: 98.00, status: 'delivered', time: '1h' },
  { id: '#BP-2843', customer: 'Patricia Lima', items: 'Combo Família (4 pessoas)', total: 156.00, status: 'delivered', time: '1h20' },
]

const statusMap = {
  pending: { label: 'Pendente', color: 'yellow' },
  confirmed: { label: 'Confirmado', color: 'blue' },
  preparing: { label: 'Preparando', color: 'orange' },
  ready: { label: 'Pronto', color: 'purple' },
  delivering: { label: 'A caminho', color: 'cyan' },
  delivered: { label: 'Entregue', color: 'green' },
  cancelled: { label: 'Cancelado', color: 'red' },
}

export default function DashboardPage() {
  const { user, updateUser } = useAuth()
  const [isOpen, setIsOpen] = useState(user?.restaurant?.isOpen ?? true)
  const [loading, setLoading] = useState(true)
  
  const [stats, setStats] = useState({
    revenue: 3847.50,
    ordersCount: 47,
    ticketAvg: 81.86,
    pending: 8,
    preparing: 14,
    finalized: 25,
    totalProducts: 34,
    totalCustomers: 234
  })

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [statsRes, prodRes, custRes] = await Promise.all([
        ordersApi.stats(),
        productsApi.list({ limit: 1 }),
        customersApi.list({ limit: 1 })
      ])
      
      if (statsRes.success) {
        const s = statsRes.data
        const todayTotal = parseInt(s.today?.total || 0)
        const todayRev = parseFloat(s.today?.revenue || 0)
        
        let pendingCount = 0
        let preparingCount = 0
        let finalizedCount = 0
        
        s.by_status?.forEach(item => {
          if (item.status === 'pending') {
            pendingCount = item.count
          } else if (item.status === 'preparing' || item.status === 'confirmed' || item.status === 'ready') {
            preparingCount += item.count
          } else if (item.status === 'delivered' || item.status === 'picked_up') {
            finalizedCount += item.count
          }
        })

        setStats({
          revenue: todayRev,
          ordersCount: todayTotal,
          ticketAvg: todayTotal > 0 ? todayRev / todayTotal : 0,
          pending: pendingCount,
          preparing: preparingCount,
          finalized: finalizedCount,
          totalProducts: prodRes.pagination?.total || 0,
          totalCustomers: custRes.pagination?.total || 0
        })
      }
    } catch (err) {
      console.warn('Erro ao conectar com API do dashboard, mantendo simulações padrão.', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const toggleRestaurant = async () => {
    const next = !isOpen
    setIsOpen(next)
    
    try {
      await restaurantApi.toggleOpen()
      updateUser({ restaurant: { ...user.restaurant, isOpen: next } })
      toast.success(next ? 'Restaurante aberto para receber pedidos! 🟢' : 'Restaurante fechado temporariamente. 🔴')
    } catch (err) {
      // Local fallback
      updateUser({ restaurant: { ...user.restaurant, isOpen: next } })
      toast.success(next ? 'Restaurante aberto! (Modo Simulação)' : 'Restaurante fechado! (Modo Simulação)')
    }
  }

  const maxOrders = Math.max(...weeklyData.map((d) => d.orders))

  return (
    <div className="space-y-6 text-left">
      
      {/* Welcome & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.02] border border-white/5 rounded-3xl p-5">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            Olá, {user?.name?.split(' ')[0]} 👋
            <span className="text-xs font-bold bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/20 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={11} />
              {user?.role || 'Dono'}
            </span>
          </h2>
          <p className="text-[#a991c7] text-xs mt-1">Veja um resumo operacional e o faturamento do seu restaurante hoje.</p>
        </div>

        <button
          onClick={toggleRestaurant}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-300 shadow-md ${
            isOpen
              ? 'bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20'
              : 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
          }`}
        >
          {isOpen ? <ToggleRight size={22} className="text-green-400" /> : <ToggleLeft size={22} className="text-red-400" />}
          <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          <span>{isOpen ? 'Restaurante Aberto' : 'Restaurante Fechado'}</span>
        </button>
      </div>

      {/* Main KPI Grid (Vendas, Pedidos, Ticket, Status) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vendas do Dia */}
        <div className="glass rounded-2xl p-5 border border-white/[0.06] flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[#a991c7] text-xs font-semibold">Vendas do Dia</span>
            <p className="text-2xl font-black text-white">{formatCurrency(stats.revenue)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/10 text-green-400">
            <DollarSign size={20} />
          </div>
        </div>

        {/* Pedidos do Dia */}
        <div className="glass rounded-2xl p-5 border border-white/[0.06] flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[#a991c7] text-xs font-semibold">Pedidos Hoje</span>
            <p className="text-2xl font-black text-white">{stats.ordersCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FF6B35]/10 text-[#FF6B35]">
            <ShoppingBag size={20} />
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="glass rounded-2xl p-5 border border-white/[0.06] flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[#a991c7] text-xs font-semibold">Ticket Médio</span>
            <p className="text-2xl font-black text-white">{formatCurrency(stats.ticketAvg)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-400">
            <TicketIcon size={20} />
          </div>
        </div>

        {/* Status do Restaurante */}
        <div className="glass rounded-2xl p-5 border border-white/[0.06] flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[#a991c7] text-xs font-semibold">Status de Funcionamento</span>
            <p className={`text-base font-black ${isOpen ? 'text-green-400' : 'text-red-400'}`}>
              {isOpen ? 'Recebendo Pedidos' : 'Pedidos Suspensos'}
            </p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOpen ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            <span className={`w-3.5 h-3.5 rounded-full ${isOpen ? 'bg-green-400 animate-ping' : 'bg-red-400'}`} />
          </div>
        </div>
      </div>

      {/* Operational Pipeline Row (Aprovação, Preparo, Finalizados) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Aguardando Aprovação */}
        <div className="glass rounded-2xl p-5 border border-white/[0.06] flex items-center gap-4 hover:border-yellow-500/20 transition-all">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-yellow-500/10 text-yellow-400 shrink-0">
            <AlertCircle size={24} />
          </div>
          <div className="text-left">
            <p className="text-[#a991c7] text-xs font-semibold">Aguardando Aprovação</p>
            <p className="text-xl font-black text-white mt-0.5">{stats.pending} pedidos</p>
          </div>
        </div>

        {/* Em Preparo */}
        <div className="glass rounded-2xl p-5 border border-white/[0.06] flex items-center gap-4 hover:border-orange-500/20 transition-all">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-orange-500/10 text-orange-400 shrink-0">
            <Play size={24} className="animate-pulse" />
          </div>
          <div className="text-left">
            <p className="text-[#a991c7] text-xs font-semibold">Em Preparação</p>
            <p className="text-xl font-black text-white mt-0.5">{stats.preparing} pedidos</p>
          </div>
        </div>

        {/* Pedidos Finalizados */}
        <div className="glass rounded-2xl p-5 border border-white/[0.06] flex items-center gap-4 hover:border-green-500/20 transition-all">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-500/10 text-green-400 shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div className="text-left">
            <p className="text-[#a991c7] text-xs font-semibold">Pedidos Finalizados (Hoje)</p>
            <p className="text-xl font-black text-white mt-0.5">{stats.finalized} pedidos</p>
          </div>
        </div>
      </div>

      {/* Inventory & Clients Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Resumo de Produtos */}
        <div
          onClick={() => window.location.href = '/dashboard/produtos'}
          className="glass rounded-2xl p-5 border border-white/[0.06] flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.04] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-400">
              <Package size={24} />
            </div>
            <div className="text-left">
              <p className="text-[#a991c7] text-xs font-semibold">Resumo de Produtos</p>
              <p className="text-xl font-black text-white mt-0.5">{stats.totalProducts} itens no cardápio</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-500" />
        </div>

        {/* Resumo de Clientes */}
        <div
          onClick={() => window.location.href = '/dashboard/clientes'}
          className="glass rounded-2xl p-5 border border-white/[0.06] flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.04] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-400">
              <Users size={24} />
            </div>
            <div className="text-left">
              <p className="text-[#a991c7] text-xs font-semibold">Resumo de Clientes</p>
              <p className="text-xl font-black text-white mt-0.5">{stats.totalCustomers} clientes ativos</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-500" />
        </div>
      </div>

      {/* Charts & Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Chart */}
        <Card
          title="Pedidos nos Últimos 7 Dias"
          className="lg:col-span-2"
          subtitle="Comparação diária de pedidos"
        >
          <div className="flex items-end gap-2 h-40 pt-2">
            {weeklyData.map(({ day, orders }, i) => {
              const pct = (orders / maxOrders) * 100
              const isToday = i === weeklyData.length - 1
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[10px] text-[#a991c7]">{orders}</span>
                  <div className="w-full relative group" style={{ height: `${pct}%`, minHeight: 8 }}>
                    <div
                      className="w-full h-full rounded-t-lg transition-all duration-700 progress-bar animate-grow-height"
                      style={{
                        background: isToday
                          ? 'linear-gradient(180deg, #FF6B35, #e84e15)'
                          : 'rgba(255,107,53,0.3)',
                        boxShadow: isToday ? '0 0 12px rgba(255,107,53,0.4)' : 'none',
                      }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${isToday ? 'text-[#FF6B35]' : 'text-[#6b5880]'}`}>{day}</span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* simulated status notice */}
        <Card title="Canais Ativos" subtitle="Origem dos pedidos hoje">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5 text-gray-300">
                <span>WhatsApp</span>
                <span className="font-bold">60%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '60%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5 text-gray-300">
                <span>Cardápio Digital PWA</span>
                <span className="font-bold">30%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-[#FF6B35] rounded-full" style={{ width: '30%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5 text-gray-300">
                <span>iFood / Integrações</span>
                <span className="font-bold">10%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: '10%' }} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card
        title="Pedidos Recentes"
        subtitle="Últimos 5 pedidos cadastrados"
        action={
          <Button
            variant="ghost"
            size="sm"
            rightIcon={ChevronRight}
            onClick={() => window.location.href = '/orders'}
          >
            Ver todos
          </Button>
        }
        noPad
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['Pedido', 'Cliente', 'Itens', 'Total', 'Status', 'Tempo'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[#6b5880] text-xs font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5 text-[#FF6B35] font-bold text-sm">{order.id}</td>
                  <td className="px-5 py-3.5 text-white text-sm font-medium">{order.customer}</td>
                  <td className="px-5 py-3.5 text-[#a991c7] text-xs max-w-[200px] truncate">{order.items}</td>
                  <td className="px-5 py-3.5 text-white text-sm font-semibold">{formatCurrency(order.total)}</td>
                  <td className="px-5 py-3.5">
                    <Badge color={statusMap[order.status]?.color || 'gray'}>
                      {statusMap[order.status]?.label}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-[#6b5880] text-xs">{order.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
