import { useState, useEffect } from 'react'
import { ShoppingBag, DollarSign, Users, Package, ToggleLeft, ToggleRight, Share2, Copy, ExternalLink, Clock, CheckCircle2, ChefHat } from 'lucide-react'
import { formatCurrency } from '../utils/helpers'
import { useAuth } from '../contexts/AuthContext'
import { orders as ordersApi, products as productsApi, customers as customersApi, restaurants as restaurantApi } from '../services/api'
import toast from 'react-hot-toast'

function Kpi({ title, value, icon: Icon, tone = 'red' }) {
  const tones = { red: 'bg-red-50 text-[#ea1d2c]', green: 'bg-green-50 text-green-700', amber: 'bg-amber-50 text-amber-700', blue: 'bg-blue-50 text-blue-700' }
  return <div className="bg-white rounded-3xl p-5 border border-[#eeeeee] shadow-sm flex items-center justify-between gap-4"><div><span className="text-[#717171] text-xs font-bold">{title}</span><p className="text-2xl font-black text-[#1f2937] mt-2">{value}</p></div><div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tones[tone]}`}><Icon size={22}/></div></div>
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
      const [statsRes, prodRes, custRes, ordersRes] = await Promise.all([ordersApi.stats(), productsApi.list({ limit: 1 }), customersApi.list({ limit: 1 }), ordersApi.list({ limit: 5 })])
      if (statsRes.success) {
        const s = statsRes.data
        const todayTotal = parseInt(s.today?.total || 0)
        const todayRev = parseFloat(s.today?.revenue || 0)
        let pending = 0, preparing = 0, finalized = 0
        s.by_status?.forEach(item => { if (item.status === 'pending') pending = item.count; else if (['preparing','confirmed','ready'].includes(item.status)) preparing += item.count; else if (['delivered','picked_up'].includes(item.status)) finalized += item.count })
        setStats({ revenue: todayRev, ordersCount: todayTotal, ticketAvg: todayTotal ? todayRev / todayTotal : 0, pending, preparing, finalized, totalProducts: prodRes.pagination?.total || 0, totalCustomers: custRes.pagination?.total || 0 })
      }
      if (ordersRes.success) setRecentOrders(ordersRes.data || [])
    } catch (err) { console.warn('Erro ao carregar dashboard.', err) } finally { setLoading(false) }
  }
  useEffect(() => { loadDashboardData(); const i=setInterval(loadDashboardData, 15000); return ()=>clearInterval(i) }, [])

  const toggleRestaurant = async () => {
    const next = !isOpen
    try { await restaurantApi.toggleOpen() } catch (err) { console.warn(err) }
    updateUser({ restaurant: { ...user.restaurant, isOpen: next } })
    toast.success(next ? 'Restaurante aberto para receber pedidos' : 'Restaurante fechado')
  }
  const menuLink = user?.restaurant?.slug ? `${window.location.origin}/cardapio/${user.restaurant.slug}` : ''

  return <div className="space-y-6 text-left">
    <div className="bg-white rounded-[28px] p-6 border border-[#eeeeee] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div><h2 className="text-2xl md:text-3xl font-black text-[#1f2937]">Olá, {user?.name?.split(' ')[0]} 👋</h2><p className="text-[#717171] text-sm mt-1">Resumo operacional do restaurante hoje.</p></div>
      <button onClick={toggleRestaurant} className={`flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl font-black text-sm border ${isOpen ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>{isOpen ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}<span>{isOpen ? 'Recebendo pedidos' : 'Loja fechada'}</span></button>
    </div>

    {menuLink && <div className="bg-white border border-[#eeeeee] rounded-[28px] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-sm">
      <div className="flex items-start gap-4"><div className="w-12 h-12 rounded-2xl bg-red-50 text-[#ea1d2c] flex items-center justify-center"><Share2 size={24}/></div><div><h3 className="text-xl font-black text-[#1f2937]">Link do catálogo digital</h3><p className="text-[#717171] text-sm mt-1">Compartilhe este link para receber pedidos pelo cardápio.</p><div className="mt-3 px-3 py-2 rounded-xl bg-[#f7f7f7] border border-[#eeeeee] text-[#333] text-xs font-mono break-all">{menuLink}</div></div></div>
      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto"><button onClick={()=>{navigator.clipboard.writeText(menuLink); toast.success('Link copiado!')}} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#f5f5f5] hover:bg-[#eeeeee] text-[#333] font-black text-sm"><Copy size={16}/>Copiar link</button><a href={menuLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#ea1d2c] hover:bg-[#c91422] text-white font-black text-sm"><ExternalLink size={16}/>Visualizar</a></div>
    </div>}

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"><Kpi title="Vendas do dia" value={formatCurrency(stats.revenue)} icon={DollarSign} tone="green"/><Kpi title="Pedidos hoje" value={stats.ordersCount} icon={ShoppingBag}/><Kpi title="Ticket médio" value={formatCurrency(stats.ticketAvg)} icon={Clock} tone="blue"/><Kpi title="Status" value={isOpen ? 'Aberto' : 'Fechado'} icon={CheckCircle2} tone={isOpen ? 'green' : 'amber'}/></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Kpi title="Aguardando aprovação" value={`${stats.pending} pedidos`} icon={Clock} tone="amber"/><Kpi title="Em preparação" value={`${stats.preparing} pedidos`} icon={ChefHat} tone="red"/><Kpi title="Finalizados hoje" value={`${stats.finalized} pedidos`} icon={CheckCircle2} tone="green"/></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Kpi title="Produtos no cardápio" value={`${stats.totalProducts} itens`} icon={Package} tone="blue"/><Kpi title="Clientes ativos" value={`${stats.totalCustomers} clientes`} icon={Users} tone="green"/></div>
    <div className="bg-white rounded-[28px] p-6 border border-[#eeeeee] shadow-sm"><h3 className="text-xl font-black text-[#1f2937] mb-4">Vendas recentes</h3>{recentOrders.length === 0 ? <p className="text-[#717171] text-sm">Nenhum pedido recente.</p> : <div className="divide-y divide-[#eeeeee]">{recentOrders.map(o => <div key={o.id} className="py-3 flex items-center justify-between gap-3"><div><p className="font-black text-[#1f2937]">{o.order_number || `#${o.id}`}</p><p className="text-sm text-[#717171]">{o.customer_name || o.customer?.name || 'Cliente'}</p></div><div className="text-right"><p className="font-black text-[#1f2937]">{formatCurrency(o.total || 0)}</p><span className="text-xs font-bold px-2 py-1 rounded-full bg-[#f5f5f5] text-[#555]">{o.status}</span></div></div>)}</div>}</div>
  </div>
}
