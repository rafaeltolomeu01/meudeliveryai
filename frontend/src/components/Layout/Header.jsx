import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, User, Settings, ToggleLeft, ToggleRight, Download } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { usePWA } from '../../contexts/PWAContext'
import { restaurants as restaurantApi, orders as ordersApi } from '../../services/api'
import toast from 'react-hot-toast'

const pageNames = {
  '/dashboard': 'Dashboard',
  '/dashboard/pedidos': 'Pedidos',
  '/menu': 'Cardápio',
  '/dashboard/clientes': 'Clientes',
  '/dashboard/entregadores': 'Entregadores',
  '/dashboard/relatorios': 'Relatórios',
  '/dashboard/configuracoes': 'Configurações',
  '/dashboard/usuarios': 'Usuários',
}

export default function Header() {
  const { user, logout, updateUser } = useAuth()
  const { isInstallable, installApp } = usePWA()
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])

  const pageName = pageNames[location.pathname] || 'Painel'
  const isOpen = user?.restaurant?.isOpen

  const toggleRestaurant = async () => {
    const next = !isOpen
    try {
      await restaurantApi.toggleOpen()
      updateUser({ restaurant: { ...user.restaurant, isOpen: next } })
      toast.success(next ? 'Restaurante aberto! 🟢' : 'Restaurante fechado! 🔴')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao alterar status da loja.')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const fetchRecentOrders = async () => {
    if (!user) return
    try {
      const res = await ordersApi.list({ limit: 5 })
      if (res.success && res.data) {
        const notifs = res.data.map(order => {
          const createdTime = new Date(order.created_at)
          const diffMs = new Date() - createdTime
          const diffMins = Math.max(Math.floor(diffMs / 60000), 0)
          let timeText = `${diffMins}min`
          if (diffMins >= 60) {
            timeText = `${Math.floor(diffMins / 60)}h`
          }
          if (diffMins >= 1440) {
            timeText = `${Math.floor(diffMins / 1440)}d`
          }
          
          let textText = ''
          if (order.status === 'pending') {
            textText = `Novo pedido ${order.order_number || ('#' + order.id)} recebido`
          } else if (order.status === 'preparing') {
            textText = `Pedido ${order.order_number || ('#' + order.id)} em preparação`
          } else if (order.status === 'ready') {
            textText = `Pedido ${order.order_number || ('#' + order.id)} pronto para entrega`
          } else if (order.status === 'delivering') {
            textText = `Pedido ${order.order_number || ('#' + order.id)} saiu para entrega`
          } else if (order.status === 'delivered') {
            textText = `Pedido ${order.order_number || ('#' + order.id)} entregue`
          } else if (order.status === 'cancelled') {
            textText = `Pedido ${order.order_number || ('#' + order.id)} cancelado`
          } else {
            textText = `Pedido ${order.order_number || ('#' + order.id)} atualizado`
          }

          return {
            id: order.id,
            text: textText,
            time: timeText,
            unread: order.status === 'pending'
          }
        })
        setNotifications(notifs)
      }
    } catch (err) {
      console.warn('Erro ao carregar notificações no header:', err)
    }
  }

  useEffect(() => {
    fetchRecentOrders()
    const interval = setInterval(fetchRecentOrders, 15000)
    return () => clearInterval(interval)
  }, [user])

  return (
    <header className="sticky top-0 z-30 px-4 lg:px-6 py-3 flex items-center justify-between border-b border-gray-200"
      style={{ background: 'rgba(255, 255, 255, 0.94)', backdropFilter: 'blur(16px)' }}
    >
      {/* Page Title */}
      <div>
        <h1 className="text-gray-900 font-bold text-lg lg:text-xl">{pageName}</h1>
        <p className="text-gray-500 text-xs hidden sm:block">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Restaurant Status Toggle */}
        <button
          onClick={toggleRestaurant}
          className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
            isOpen
              ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
              : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
          }`}
        >
          {isOpen ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          {isOpen ? 'Aberto' : 'Fechado'}
        </button>

        {/* PWA Install Button */}
        {isInstallable && (
          <button
            onClick={installApp}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#FF6B35]/20 bg-[#ea1d2c]/10 text-[#ea1d2c] hover:bg-[#FF6B35]/20 text-xs font-bold transition-all shadow-[0_0_8px_rgba(255,107,53,0.15)] animate-pulse"
            title="Instalar Aplicativo"
          >
            <Download size={14} />
            <span className="hidden md:inline">Instalar App</span>
          </button>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setDropdownOpen(false) }}
            className="relative w-9 h-9 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Bell size={18} />
            {notifications.some(n => n.unread) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ea1d2c] rounded-full animate-pulse" />
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl border border-gray-200 shadow-2xl animate-slide-down z-50">
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-gray-900 font-semibold text-sm">Notificações</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 text-xs italic">
                    Nenhum pedido encontrado
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`px-4 py-3 border-b border-white/[0.04] hover:bg-gray-50 transition-colors cursor-pointer ${n.unread ? 'bg-white/[0.02]' : ''}`}>
                      <p className={`text-xs text-left ${n.unread ? 'text-white' : 'text-[#a991c7]'}`}>{n.text}</p>
                      <p className="text-[#6b5880] text-[10px] mt-1 text-left">{n.time} atrás</p>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-3 text-center border-t border-gray-100">
                <button onClick={() => { navigate('/dashboard/pedidos'); setNotifOpen(false) }} className="text-[#FF6B35] text-xs hover:underline">Ver todos os pedidos</button>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setDropdownOpen(!dropdownOpen); setNotifOpen(false) }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ea1d2c] to-[#ff6b35] flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.[0] || 'A'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-gray-900 text-xs font-medium leading-none">{user?.name?.split(' ')[0]}</p>
              <p className="text-gray-500 text-[10px] mt-0.5">Admin</p>
            </div>
            <ChevronDown size={14} className={`text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl border border-gray-200 shadow-2xl animate-slide-down z-50">
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-gray-900 font-medium text-sm">{user?.name}</p>
                <p className="text-gray-500 text-xs">{user?.email}</p>
              </div>
              <div className="py-1">
                <button onClick={() => { navigate('/dashboard/configuracoes'); setDropdownOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                  <User size={15} /> Meu Perfil
                </button>
                <button onClick={() => { navigate('/dashboard/configuracoes'); setDropdownOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                  <Settings size={15} /> Configurações
                </button>
              </div>
              <div className="py-1 border-t border-gray-100">
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/5 transition-colors">
                  <LogOut size={15} /> Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside handler */}
      {(dropdownOpen || notifOpen) && (
        <div className="fixed inset-0 z-40" onClick={() => { setDropdownOpen(false); setNotifOpen(false) }} />
      )}
    </header>
  )
}
