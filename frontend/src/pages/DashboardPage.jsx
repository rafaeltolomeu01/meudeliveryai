import { useState, useEffect } from 'react'
import { ShoppingBag, DollarSign, Users, Package, ToggleLeft, ToggleRight, Share2, Copy, ExternalLink, Clock, CheckCircle2, ChefHat } from 'lucide-react'
import { formatCurrency } from '../utils/helpers'
import { useAuth } from '../contexts/AuthContext'
import { orders as ordersApi, products as productsApi, customers as customersApi, restaurants as restaurantApi } from '../services/api'
import toast from 'react-hot-toast'

function Kpi({ title, value, icon: Icon, tone = 'orange' }) {
  const tones = {
    orange: 'bg-orange-50 text-[#FF5A1F]',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600'
  }
  return (
    <div className="bg-white rounded-[24px] p-6 border border-[#E5E7EB] shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex items-center justify-between gap-4">
      <div>
        <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">{title}</span>
        <p className="text-3xl font-extrabold text-[#111827] mt-2 tracking-tight">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tones[tone] || tones.orange}`}>
        <Icon size={22} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, updateUser } = useAuth()
  const isOpen = !!user?.restaurant?.isOpen
  const [loading, setLoading] = useState(true)
  const [recentOrders, setRecentOrders] = useState([])
  const [stats, setStats] = useState({ revenue: 0, ordersCount: 0, ticketAvg: 0, pending: 0, preparing: 0, finalized: 0, totalProducts: 0, totalCustomers: 0 })

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [statsRes, prodRes, custRes, ordersRes] = await Promise.all([
        ordersApi.stats(),
        productsApi.list({ limit: 1 }),
        customersApi.list({ limit: 1 }),
        ordersApi.list({ limit: 5 })
      ])
      if (statsRes.success) {
        const s = statsRes.data
        const todayTotal = parseInt(s.today?.total || 0, 10)
        const todayRev = parseFloat(s.today?.revenue || 0)
        let pending = 0, preparing = 0, finalized = 0
        s.by_status?.forEach(item => {
          if (item.status === 'pending') pending = item.count;
          else if (['preparing', 'confirmed', 'ready'].includes(item.status)) preparing += item.count;
          else if (['delivered', 'picked_up'].includes(item.status)) finalized += item.count;
        })
        setStats({
          revenue: todayRev,
          ordersCount: todayTotal,
          ticketAvg: todayTotal ? todayRev / todayTotal : 0,
          pending,
          preparing,
          finalized,
          totalProducts: prodRes.pagination?.total || 0,
          totalCustomers: custRes.pagination?.total || 0
        })
      }
      if (ordersRes.success) setRecentOrders(ordersRes.data || [])
    } catch (err) {
      console.warn('Erro ao carregar dashboard.', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
    const i = setInterval(loadDashboardData, 15000)
    return () => clearInterval(i)
  }, [])

  const toggleRestaurant = async () => {
    const next = !isOpen
    try {
      await restaurantApi.toggleOpen()
      updateUser({ restaurant: { ...user.restaurant, isOpen: next } })
      window.dispatchEvent(new CustomEvent('mda:restaurant-status-changed', { detail: { is_open: next } }))
      toast.success(next ? 'Restaurante aberto para receber pedidos 🟢' : 'Restaurante fechado 🔴')
    } catch (err) {
      console.warn(err)
      toast.error('Erro ao alterar status da loja.')
    }
  }

  const menuLink = user?.restaurant?.slug ? `${window.location.origin}/cardapio/${user.restaurant.slug}` : ''

  return (
    <div className="space-y-6 text-left">
      {/* Welcome & Status */}
      <div className="bg-white rounded-[28px] p-6 border border-[#E5E7EB] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#111827] tracking-tight">Olá, {user?.name?.split(' ')[0]} 👋</h2>
          <p className="text-[#64748B] text-sm mt-1">Resumo operacional do seu restaurante hoje.</p>
        </div>
        <button
          onClick={toggleRestaurant}
          className={`flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-semibold text-sm border transition-all duration-200 ${
            isOpen
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/60'
              : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100/60'
          }`}
        >
          {isOpen ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
          <span>{isOpen ? 'Recebendo pedidos' : 'Loja fechada'}</span>
        </button>
      </div>

      {/* Catalog Link Widget */}
      {menuLink && (
        <div className="bg-white border border-[#E5E7EB] rounded-[28px] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF5A1F] flex items-center justify-center shrink-0">
              <Share2 size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#111827]">Link do catálogo digital</h3>
              <p className="text-[#64748B] text-sm mt-1">Compartilhe este link para receber pedidos pelo cardápio.</p>
              <div className="mt-3 px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] text-[#111827] text-xs font-mono break-all">
                {menuLink}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={() => {
                navigator.clipboard.writeText(menuLink)
                toast.success('Link copiado!')
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition-colors"
            >
              <Copy size={16} />
              Copiar link
            </button>
            <a
              href={menuLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#FF5A1F] hover:bg-[#e04f1a] text-white font-semibold text-sm transition-colors shadow-[0_4px_12px_rgba(255,90,31,0.2)]"
            >
              <ExternalLink size={16} />
              Visualizar
            </a>
          </div>
        </div>
      )}

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="Vendas do dia" value={formatCurrency(stats.revenue)} icon={DollarSign} tone="green" />
        <Kpi title="Pedidos hoje" value={stats.ordersCount} icon={ShoppingBag} tone="orange" />
        <Kpi title="Ticket médio" value={formatCurrency(stats.ticketAvg)} icon={Clock} tone="blue" />
        <Kpi title="Status" value={isOpen ? 'Aberto' : 'Fechado'} icon={CheckCircle2} tone={isOpen ? 'green' : 'amber'} />
      </div>

      {/* Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Kpi title="Aguardando aprovação" value={`${stats.pending} pedidos`} icon={Clock} tone="amber" />
        <Kpi title="Em preparação" value={`${stats.preparing} pedidos`} icon={ChefHat} tone="orange" />
        <Kpi title="Finalizados hoje" value={`${stats.finalized} pedidos`} icon={CheckCircle2} tone="green" />
      </div>

      {/* Catalog & Customers counts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Kpi title="Produtos no cardápio" value={`${stats.totalProducts} itens`} icon={Package} tone="blue" />
        <Kpi title="Clientes ativos" value={`${stats.totalCustomers} clientes`} icon={Users} tone="green" />
      </div>

      {/* Recent Sales */}
      <div className="bg-white rounded-[28px] p-6 border border-[#E5E7EB] shadow-sm">
        <h3 className="text-xl font-bold text-[#111827] mb-4">Vendas recentes</h3>
        {recentOrders.length === 0 ? (
          <p className="text-[#64748B] text-sm">Nenhum pedido recente registrado hoje.</p>
        ) : (
          <div className="divide-y divide-[#E5E7EB]">
            {recentOrders.map(o => (
              <div key={o.id} className="py-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 px-2 rounded-xl transition-colors">
                <div>
                  <p className="font-extrabold text-[#FF5A1F]">{o.order_number || `#${o.id}`}</p>
                  <p className="text-sm text-[#111827] font-semibold mt-0.5">{o.customer_name || o.customer?.name || 'Cliente'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#111827]">{formatCurrency(o.total || 0)}</p>
                  <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase mt-1">
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
