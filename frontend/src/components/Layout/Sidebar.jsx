import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingBag, UtensilsCrossed, Users,
  Bike, BarChart3, Settings, LogOut, Zap, ChevronRight,
  ChefHat, Tag, Palette, UserCheck, CreditCard, MessageSquare, Layers
} from 'lucide-react'
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
  { to: '/dashboard/aparencia', icon: Palette, label: 'Aparência' },
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
        if (res.success && res.pagination) {
          setPendingCount(res.pagination.total)
        } else if (res.success && res.data) {
          setPendingCount(res.data.length)
        }
      } catch (err) {
        console.warn('Erro ao carregar contagem de pedidos na sidebar:', err)
      }
    }

    fetchPendingCount()
    const interval = setInterval(fetchPendingCount, 10000)
    return () => clearInterval(interval)
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 z-40"
      style={{ background: '#111827', borderRight: '1px solid #1F2937' }}
    >
      {/* Logo */}
      <div className="px-5 py-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div style={{ background: 'linear-gradient(135deg, #FF5A1F, #e84e15)', boxShadow: '0 0 20px rgba(255,90,31,0.4)' }} className="w-9 h-9 rounded-xl flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-base tracking-tight">MeuDelivery</span>
            <span className="text-[#FF5A1F] font-bold text-base">AI</span>
          </div>
        </div>
      </div>

      {/* Restaurant Status */}
      <div className="px-5 py-3 border-b border-gray-800">
        <div className="bg-gray-800/40 rounded-xl px-3 py-2.5 flex items-center justify-between border border-gray-800/60">
          <div className="flex items-center gap-2">
            <span className="text-lg">🍔</span>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold leading-none truncate max-w-[100px]">{user?.restaurant?.name || 'Restaurante'}</p>
              <p className="text-gray-400 text-[10px] mt-0.5 capitalize">{user?.restaurant?.type || 'Delivery'}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${user?.restaurant?.isOpen ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${user?.restaurant?.isOpen ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            {user?.restaurant?.isOpen ? 'Aberto' : 'Fechado'}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider px-2 mb-3">Menu Principal</p>
        {navItems.map(({ to, icon: Icon, label }) => {
          const isOrders = to === '/dashboard/pedidos'
          const badge = isOrders && pendingCount > 0 ? pendingCount : null

          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => [
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative',
                isActive
                  ? 'bg-[#FF5A1F]/10 text-[#FF5A1F] border border-[#FF5A1F]/15'
                  : 'text-gray-400 hover:text-white hover:bg-white/5',
              ].join(' ')}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={`flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-[#FF5A1F]' : ''}`} />
                  <span className="flex-1">{label}</span>
                  {badge !== null && (
                    <span className="bg-[#FF5A1F] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                  {isActive && (
                    <ChevronRight size={14} className="text-[#FF5A1F] opacity-60" />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User & Logout */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-2">
        {/* Plan Badge */}
        <div className="px-3 py-2 bg-gray-800/40 rounded-xl flex items-center justify-between border border-gray-800/30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF5A1F] to-[#6D28D9] flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.[0] || 'A'}
            </div>
            <div>
              <p className="text-white text-xs font-medium leading-none">{user?.name?.split(' ')[0]}</p>
              <p className="text-gray-400 text-[10px] mt-0.5 capitalize">{user?.restaurant?.plan || 'starter'}</p>
            </div>
          </div>
          <span className="text-[10px] bg-[#FF5A1F]/20 text-[#FF5A1F] px-2 py-0.5 rounded-full font-medium capitalize">
            {user?.restaurant?.plan?.toUpperCase() || 'PRO'}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 group"
        >
          <LogOut size={16} className="group-hover:rotate-12 transition-transform" />
          <span>Sair da conta</span>
        </button>
      </div>
    </aside>
  )
}
