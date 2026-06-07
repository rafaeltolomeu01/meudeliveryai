import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, User, Settings, ToggleLeft, ToggleRight, Download } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { usePWA } from '../../contexts/PWAContext'

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

  const pageName = pageNames[location.pathname] || 'Painel'
  const isOpen = user?.restaurant?.isOpen

  const toggleRestaurant = () => {
    updateUser({ restaurant: { ...user.restaurant, isOpen: !isOpen } })
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const notifications = [
    { id: 1, text: 'Novo pedido #BP-2847 recebido', time: '2min', unread: true },
    { id: 2, text: 'Entregador João saiu para entrega', time: '8min', unread: true },
    { id: 3, text: 'Relatório semanal disponível', time: '1h', unread: false },
  ]

  return (
    <header className="sticky top-0 z-30 px-4 lg:px-6 py-3 flex items-center justify-between border-b border-white/[0.06]"
      style={{ background: 'rgba(26, 5, 51, 0.8)', backdropFilter: 'blur(16px)' }}
    >
      {/* Page Title */}
      <div>
        <h1 className="text-white font-bold text-lg lg:text-xl">{pageName}</h1>
        <p className="text-[#a991c7] text-xs hidden sm:block">
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#FF6B35]/20 bg-[#FF6B35]/10 text-[#FF6B35] hover:bg-[#FF6B35]/20 text-xs font-bold transition-all shadow-[0_0_8px_rgba(255,107,53,0.15)] animate-pulse"
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
            className="relative w-9 h-9 rounded-xl glass flex items-center justify-center text-[#a991c7] hover:text-white transition-colors"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF6B35] rounded-full animate-pulse" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-12 w-72 glass rounded-2xl border border-white/[0.08] shadow-2xl animate-slide-down z-50">
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-white font-semibold text-sm">Notificações</p>
              </div>
              {notifications.map((n) => (
                <div key={n.id} className={`px-4 py-3 border-b border-white/[0.04] hover:bg-white/5 transition-colors cursor-pointer ${n.unread ? 'bg-white/[0.02]' : ''}`}>
                  <p className={`text-xs ${n.unread ? 'text-white' : 'text-[#a991c7]'}`}>{n.text}</p>
                  <p className="text-[#6b5880] text-[10px] mt-1">{n.time} atrás</p>
                  {n.unread && <span className="inline-block w-1.5 h-1.5 bg-[#FF6B35] rounded-full mt-1" />}
                </div>
              ))}
              <div className="px-4 py-3 text-center">
                <button className="text-[#FF6B35] text-xs hover:underline">Ver todas</button>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setDropdownOpen(!dropdownOpen); setNotifOpen(false) }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B35] to-purple-600 flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.[0] || 'A'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-white text-xs font-medium leading-none">{user?.name?.split(' ')[0]}</p>
              <p className="text-[#a991c7] text-[10px] mt-0.5">Admin</p>
            </div>
            <ChevronDown size={14} className={`text-[#a991c7] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-12 w-52 glass rounded-2xl border border-white/[0.08] shadow-2xl animate-slide-down z-50">
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-white font-medium text-sm">{user?.name}</p>
                <p className="text-[#a991c7] text-xs">{user?.email}</p>
              </div>
              <div className="py-1">
                <button onClick={() => { navigate('/dashboard/configuracoes'); setDropdownOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#a991c7] hover:text-white hover:bg-white/5 transition-colors">
                  <User size={15} /> Meu Perfil
                </button>
                <button onClick={() => { navigate('/dashboard/configuracoes'); setDropdownOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#a991c7] hover:text-white hover:bg-white/5 transition-colors">
                  <Settings size={15} /> Configurações
                </button>
              </div>
              <div className="py-1 border-t border-white/[0.06]">
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
