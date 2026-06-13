import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileNav from './MobileNav'
import { subscription as subscriptionApi, orders as ordersApi, settings as settingsApi } from '../../services/api'
import { AlertTriangle, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { startNewOrderCampainha, stopNewOrderCampainha, playNotificationSound } from '../../utils/orderSound'

export default function AppLayout() {
  const [subscriptionData, setSubscriptionData] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  const [orders, setOrders] = useState([])
  const [restaurantSettings, setRestaurantSettings] = useState(null)
  const [orderSoundEnabled, setOrderSoundEnabled] = useState(() => {
    const val = localStorage.getItem('orderSoundEnabled')
    return val === null ? true : val === 'true'
  })
  const [silencedOrderIds, setSilencedOrderIds] = useState(() => {
    return new Set(JSON.parse(localStorage.getItem('mda_silenced_orders') || '[]'))
  })

  const fetchSubscription = async () => {
    try {
      const res = await subscriptionApi.get()
      if (res.success) {
        setSubscriptionData(res.data)
      }
    } catch (err) {
      console.warn('Erro ao carregar dados da assinatura:', err)
    }
  }

  useEffect(() => {
    document.documentElement.classList.add('mda-ifood-admin')
    document.body?.classList?.add('mda-ifood-admin')
    fetchSubscription()
    return () => {
      document.documentElement.classList.remove('mda-ifood-admin')
      document.body?.classList?.remove('mda-ifood-admin')
    }
  }, [])

  // 1. Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await settingsApi.get()
        if (res.success) {
          setRestaurantSettings(res.data)
        }
      } catch (err) {
        console.warn('Erro ao carregar configurações de som:', err)
      }
    }
    fetchSettings()
  }, [])

  // 2. Sync sound state and silenced orders with localStorage and other tabs/components
  useEffect(() => {
    const handleToggle = () => {
      const val = localStorage.getItem('orderSoundEnabled')
      setOrderSoundEnabled(val === null ? true : val === 'true')
    }
    const handleSilencedChange = () => {
      const ids = new Set(JSON.parse(localStorage.getItem('mda_silenced_orders') || '[]'))
      setSilencedOrderIds(ids)
    }
    const handleStorage = (e) => {
      handleToggle()
      handleSilencedChange()
    }

    window.addEventListener('mda_sound_toggle', handleToggle)
    window.addEventListener('mda_silenced_orders_change', handleSilencedChange)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('mda_sound_toggle', handleToggle)
      window.removeEventListener('mda_silenced_orders_change', handleSilencedChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  // 3. Background polling for new pending orders
  useEffect(() => {
    const notifiedOrders = new Set(JSON.parse(localStorage.getItem('mda_notified_orders') || '[]'))

    const loadOrdersPoll = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10)
        const res = await ordersApi.list({ limit: 100, date_from: today, date_to: today })
        if (res.success && res.data) {
          setOrders(res.data)

          // Check for new pending orders
          const pendingOrders = res.data.filter(o => o.status === 'pending')
          let newOrdersFound = false

          pendingOrders.forEach(o => {
            if (!notifiedOrders.has(o.id)) {
              notifiedOrders.add(o.id)
              newOrdersFound = true

              // Show Toast
              toast(`Novo pedido #${o.order_number} recebido! 🔔`, { icon: '🔔', duration: 5000 })

              // Push notification
              const pushConfigEnabled = restaurantSettings?.push_notifications_enabled === undefined || 
                                         restaurantSettings?.push_notifications_enabled === null || 
                                         restaurantSettings?.push_notifications_enabled === 1 || 
                                         restaurantSettings?.push_notifications_enabled === true;

              if (pushConfigEnabled && Notification.permission === 'granted') {
                try {
                  const title = 'Novo pedido recebido'
                  const options = {
                    body: `Pedido #${o.order_number} - R$ ${(parseFloat(o.total) || 0).toFixed(2)}`,
                    icon: '/favicon.ico',
                    tag: `order-${o.id}`
                  }
                  const notification = new Notification(title, options)
                  notification.onclick = () => {
                    window.focus()
                    navigate('/dashboard/pedidos')
                  }
                } catch (pushErr) {
                  console.warn('Erro ao disparar push notification:', pushErr)
                }
              }
            }
          })

          if (newOrdersFound) {
            localStorage.setItem('mda_notified_orders', JSON.stringify(Array.from(notifiedOrders)))
            playNotificationSound()
            
            // Redirect to dashboard/pedidos if not already there or in cocina
            if (location.pathname !== '/dashboard/pedidos' && location.pathname !== '/dashboard/cozinha') {
              navigate('/dashboard/pedidos')
            }
          }
        }
      } catch (err) {
        console.error('Erro no polling global de pedidos:', err)
      }
    }

    // Run immediately and every 5s
    loadOrdersPoll()
    const timer = setInterval(loadOrdersPoll, 5000)

    const handleOrdersUpdated = () => {
      loadOrdersPoll()
    }
    const handleStorageChange = (e) => {
      if (e.key === 'mda_orders_updated_at') {
        loadOrdersPoll()
      }
    }

    window.addEventListener('mda_orders_updated', handleOrdersUpdated)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      clearInterval(timer)
      window.removeEventListener('mda_orders_updated', handleOrdersUpdated)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [restaurantSettings, location.pathname, navigate])

  // 4. Background campainha player trigger
  useEffect(() => {
    if (!restaurantSettings) return

    const soundConfigEnabled = restaurantSettings.order_sound_enabled === undefined || 
                                restaurantSettings.order_sound_enabled === null || 
                                restaurantSettings.order_sound_enabled === 1 || 
                                restaurantSettings.order_sound_enabled === true

    const pendingOrders = orders.filter(o => o.status === 'pending')
    const hasActivePending = pendingOrders.some(o => !silencedOrderIds.has(o.id))

    if (soundConfigEnabled && orderSoundEnabled && hasActivePending) {
      startNewOrderCampainha()
    } else {
      stopNewOrderCampainha()
    }

    return () => {
      stopNewOrderCampainha()
    }
  }, [orders, restaurantSettings, orderSoundEnabled, silencedOrderIds])

  const isExpired = subscriptionData && (
    subscriptionData.status === 'canceled' ||
    subscriptionData.status === 'overdue' ||
    (subscriptionData.due_date && new Date(subscriptionData.due_date) < new Date())
  )

  const daysRemaining = subscriptionData?.days_remaining
  const showWarning = daysRemaining !== undefined && daysRemaining > 0 && daysRemaining <= 5 && !isExpired

  const [mobileWarningDismissed, setMobileWarningDismissed] = useState(
    () => sessionStorage.getItem('mda_mobile_warning_dismissed') === 'true'
  )

  const handleDismissMobileWarning = () => {
    sessionStorage.setItem('mda_mobile_warning_dismissed', 'true')
    setMobileWarningDismissed(true)
  }

  // Bloqueio e redirecionamento caso a assinatura esteja vencida
  useEffect(() => {
    if (isExpired && location.pathname !== '/dashboard/assinatura') {
      navigate('/dashboard/assinatura', { replace: true })
    }
  }, [isExpired, location.pathname, navigate])

  return (
    <div className="min-h-screen bg-[#1A0533] flex" style={{ backgroundColor: 'var(--theme-bg, #1A0533)', color: 'var(--theme-text, #FFFFFF)' }}>
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Header />

        {/* Mobile Viewport Warning Banner */}
        {!mobileWarningDismissed && (
          <div className="lg:hidden mx-4 mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 text-white flex items-center justify-between gap-3 shadow-[0_0_15px_rgba(17,24,39,0.2)] border border-slate-700/30">
            <div className="flex items-center gap-2">
              <span className="text-base shrink-0">📱</span>
              <p className="text-xs font-semibold text-left leading-snug">
                Para gerenciar seu restaurante com todos os recursos e a melhor visualização, recomendamos usar um computador.
              </p>
            </div>
            <button
              onClick={handleDismissMobileWarning}
              className="text-xs text-white/60 hover:text-white font-extrabold px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 transition-all shrink-0"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Warning Banner (Expiring soon) */}
        {showWarning && (
          <div className="mx-4 lg:mx-6 mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#FFA800] text-white flex items-center gap-3 shadow-[0_0_20px_rgba(255,107,53,0.2)] animate-pulse">
            <AlertTriangle className="flex-shrink-0 animate-bounce" size={20} />
            <div className="flex-1 text-sm font-medium">
              Atenção: Sua assinatura expira em <span className="font-bold">{daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}</span>. 
              Renove ou faça um upgrade agora para evitar o bloqueio do painel e das vendas.
            </div>
            <button 
              onClick={() => navigate('/dashboard/assinatura')}
              className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl text-xs transition-all duration-200"
            >
              Renovar Agora
            </button>
          </div>
        )}

        {/* Blocking Alert (Panel Locked) */}
        {isExpired && location.pathname === '/dashboard/assinatura' && (
          <div className="mx-4 lg:mx-6 mt-4 p-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(239,68,68,0.35)] border border-red-500/30">
            <div className="flex items-center gap-3">
              <ShieldAlert className="flex-shrink-0 text-white animate-pulse" size={26} />
              <div>
                <p className="font-bold text-base">Painel Temporariamente Bloqueado</p>
                <p className="text-red-100 text-xs sm:text-sm mt-0.5">Sua assinatura está vencida ou suspensa. Regularize abaixo para reestabelecer o acesso imediato.</p>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 overflow-auto">
          <div className={`${location.pathname === '/dashboard/pedidos' ? 'max-w-none w-full' : 'max-w-7xl mx-auto'} animate-fade-in`}>
            <Outlet context={{ subscriptionData, refreshSubscription: fetchSubscription, isExpired }} />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav />
    </div>
  )
}
