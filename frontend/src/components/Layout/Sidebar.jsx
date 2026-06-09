import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Users, Bike, BarChart3, Settings, LogOut, Zap, ChevronRight, ChefHat, Tag, UserCheck, CreditCard, MessageSquare, Layers, QrCode } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { orders as ordersApi } from '../../services/api'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Início' },
  { to: '/dashboard/pedidos', icon: ShoppingBag, label: 'Pedidos' },
  { to: '/dashboard/cozinha', icon: ChefHat, label: 'Cozinha' },
  { to: '/dashboard/produtos', icon: UtensilsCrossed, label: 'Produtos' },
  { to: '/dashboard/categorias', icon: Tag, label: 'Categorias' },
  { to: '/dashboard/complementos', icon: Layers, label: 'Complementos' },
  { to: '/dashboard/clientes', icon: Users, label: 'Clientes' },
  { to: '/dashboard/entregadores', icon: Bike, label: 'Entregadores' },
  { to: '/dashboard/relatorios', icon: BarChart3, label: 'Relatórios' },
  { to: '/dashboard/configuracoes', icon: Settings, label: 'Configurações' },
  { to: '/dashboard/usuarios', icon: UserCheck, label: 'Usuários' },
  { to: '/dashboard/assinatura', icon: CreditCard, label: 'Assinatura' },
  { to: '/dashboard/whatsapp', icon: MessageSquare, label: 'WhatsApp' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!user) return
    const fetchPendingCount = async () => {
      try {
        const res = await ordersApi.list({ status: 'pending', limit: 1 })
        setPendingCount(res.success ? (res.pagination?.total || res.data?.length || 0) : 0)
      } catch {}
    }
    fetchPendingCount()
    const interval = setInterval(fetchPendingCount, 10000)
    return () => clearInterval(interval)
  }, [user])

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 z-40 bg-[#171717] border-r border-[#2a2a2a]">
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#ea1d2c] flex items-center justify-center shadow-lg shadow-red-900/20"><Zap size={19} className="text-white" /></div>
          <div><span className="text-white font-black text-lg tracking-tight">MeuDelivery</span><span className="text-[#ea1d2c] font-black text-lg">AI</span></div>
        </div>
      </div>
      <div className="px-4 py-4 border-b border-white/10">
        <div className="rounded-2xl px-3 py-3 flex items-center justify-between bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 min-w-0"><span className="text-lg">🍔</span><div className="min-w-0"><p className="text-white text-xs font-bold truncate">{user?.restaurant?.name || 'Restaurante'}</p><p className="text-white/50 text-[10px] mt-0.5 truncate">{user?.restaurant?.type || 'Delivery'}</p></div></div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${user?.restaurant?.isOpen ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}><span className={`w-1.5 h-1.5 rounded-full ${user?.restaurant?.isOpen ? 'bg-green-400' : 'bg-red-400'}`} />{user?.restaurant?.isOpen ? 'Aberto' : 'Fechado'}</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        <p className="text-white/35 text-[10px] font-bold uppercase tracking-wider px-2 mb-3">Menu principal</p>
        {navItems.map(({ to, icon: Icon, label }) => {
          const badge = to === '/dashboard/pedidos' && pendingCount > 0 ? pendingCount : null
          return <NavLink key={to} to={to} className={({ isActive }) => ['flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 group relative', isActive ? 'bg-[#ea1d2c] text-white shadow-lg shadow-red-950/20' : 'text-white/68 hover:text-white hover:bg-white/8'].join(' ')}>
            {({ isActive }) => <><Icon size={18} className="flex-shrink-0"/><span className="flex-1">{label}</span>{badge !== null && <span className="bg-white text-[#ea1d2c] text-[10px] font-black min-w-5 h-5 px-1 rounded-full flex items-center justify-center">{badge}</span>}{isActive && <ChevronRight size={14} className="text-white/80"/>}</>}
          </NavLink>
        })}
      </nav>
      <div className="px-3 py-4 border-t border-white/10 space-y-2">
        <div className="px-3 py-3 bg-white/5 rounded-2xl flex items-center justify-between border border-white/10">
          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-[#ea1d2c] flex items-center justify-center text-white text-xs font-black">{user?.name?.[0] || 'A'}</div><div><p className="text-white text-xs font-bold leading-none">{user?.name?.split(' ')[0]}</p><p className="text-white/45 text-[10px] mt-1 capitalize">{user?.restaurant?.plan || 'starter'}</p></div></div>
          <span className="text-[10px] bg-white/10 text-white px-2 py-0.5 rounded-full font-bold uppercase">{user?.restaurant?.plan || 'PRO'}</span>
        </div>
        <button onClick={() => { logout(); navigate('/login') }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white/65 hover:text-white hover:bg-white/8 transition-all"><LogOut size={16}/><span>Sair da conta</span></button>
      </div>
    </aside>
  )
}
