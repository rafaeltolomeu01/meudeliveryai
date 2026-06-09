import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, User, Settings, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { restaurants as restaurantApi, orders as ordersApi } from '../../services/api'
import toast from 'react-hot-toast'

const pageNames = {
  '/dashboard': 'Dashboard', '/dashboard/pedidos': 'Pedidos', '/dashboard/cozinha': 'Cozinha', '/dashboard/clientes': 'Clientes', '/dashboard/entregadores': 'Entregadores', '/dashboard/relatorios': 'Relatórios', '/dashboard/configuracoes': 'Configurações', '/dashboard/usuarios': 'Usuários', '/dashboard/produtos': 'Produtos', '/dashboard/categorias': 'Categorias', '/dashboard/complementos': 'Complementos', '/dashboard/whatsapp': 'WhatsApp', '/dashboard/assinatura': 'Assinatura'
}

export default function Header() {
  const { user, logout, updateUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const pageName = pageNames[location.pathname] || 'Painel'
  const isOpen = !!user?.restaurant?.isOpen

  const toggleRestaurant = async () => {
    const next = !isOpen
    try { await restaurantApi.toggleOpen() } catch (err) { console.warn(err) }
    updateUser({ restaurant: { ...user.restaurant, isOpen: next } })
    toast.success(next ? 'Restaurante aberto para receber pedidos' : 'Restaurante fechado')
  }
  const handleLogout = () => { logout(); navigate('/login') }

  useEffect(() => {
    const fetchRecentOrders = async () => {
      if (!user) return
      try {
        const res = await ordersApi.list({ limit: 5 })
        if (res.success && res.data) setNotifications(res.data.map(order => ({ id: order.id, text: order.status === 'pending' ? `Novo pedido ${order.order_number || ('#' + order.id)}` : `Pedido ${order.order_number || ('#' + order.id)} atualizado`, unread: order.status === 'pending' })))
      } catch {}
    }
    fetchRecentOrders(); const interval = setInterval(fetchRecentOrders, 15000); return () => clearInterval(interval)
  }, [user])

  return (
    <header className="sticky top-0 z-30 px-4 lg:px-6 py-4 flex items-center justify-between border-b border-[#eeeeee] bg-white/95 backdrop-blur-xl shadow-sm">
      <div><h1 className="text-[#1f2937] font-black text-xl lg:text-2xl">{pageName}</h1><p className="text-[#717171] text-xs hidden sm:block">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
      <div className="flex items-center gap-3">
        <button onClick={toggleRestaurant} className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-full font-black text-xs border ${isOpen ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>{isOpen ? <ToggleRight size={18}/> : <ToggleLeft size={18}/>} {isOpen ? 'Aberto' : 'Fechado'}</button>
        <div className="relative"><button onClick={() => { setNotifOpen(!notifOpen); setDropdownOpen(false) }} className="relative w-10 h-10 rounded-full bg-[#f5f5f5] hover:bg-[#eeeeee] border border-[#eeeeee] flex items-center justify-center text-[#333]"><Bell size={18}/>{notifications.some(n=>n.unread) && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#ea1d2c] rounded-full border-2 border-white"/>}</button>{notifOpen && <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl border border-[#eeeeee] shadow-2xl z-50 overflow-hidden"><div className="px-4 py-3 border-b border-[#eeeeee]"><p className="font-black text-[#1f2937]">Notificações</p></div><div className="max-h-80 overflow-y-auto">{notifications.length === 0 ? <div className="p-6 text-center text-sm text-[#717171]">Nenhuma notificação.</div> : notifications.map(n => <button key={n.id} onClick={() => { navigate(`/dashboard/pedidos/${n.id}`); setNotifOpen(false) }} className="w-full px-4 py-3 text-left hover:bg-[#f7f7f7] border-b border-[#f1f1f1]"><p className="text-sm font-bold text-[#1f2937]">{n.text}</p></button>)}</div></div>}</div>
        <div className="relative"><button onClick={() => { setDropdownOpen(!dropdownOpen); setNotifOpen(false) }} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[#f7f7f7]"><div className="w-9 h-9 rounded-full bg-[#ea1d2c] flex items-center justify-center text-white text-sm font-black">{user?.name?.[0] || 'A'}</div><div className="hidden md:block text-left"><p className="text-[#1f2937] text-xs font-black leading-none">{user?.name?.split(' ')[0]}</p><p className="text-[#717171] text-[10px] mt-1">Admin</p></div><ChevronDown size={14} className="text-[#717171]"/></button>{dropdownOpen && <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl border border-[#eeeeee] shadow-2xl z-50 overflow-hidden"><div className="px-4 py-3 border-b border-[#eeeeee]"><p className="text-[#1f2937] font-black text-sm">{user?.name}</p><p className="text-[#717171] text-xs truncate">{user?.email}</p></div><button onClick={()=>{navigate('/dashboard/configuracoes');setDropdownOpen(false)}} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#333] hover:bg-[#f7f7f7]"><Settings size={15}/>Configurações</button><button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#ea1d2c] hover:bg-red-50 border-t border-[#eeeeee]"><LogOut size={15}/>Sair</button></div>}</div>
      </div>
    </header>
  )
}
