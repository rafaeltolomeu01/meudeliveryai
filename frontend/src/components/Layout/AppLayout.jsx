import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileNav from './MobileNav'
import { settings as settingsApi, subscription as subscriptionApi } from '../../services/api'
import { applyTheme, removeTheme } from '../../utils/theme'
import { AlertTriangle, ShieldAlert } from 'lucide-react'

export default function AppLayout() {
  const [subscriptionData, setSubscriptionData] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

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
    async function loadTheme() {
      try {
        const res = await settingsApi.getAppearance()
        if (res.success && res.data) {
          applyTheme(res.data)
        }
      } catch (err) {
        console.warn('Erro ao carregar tema do restaurante no painel:', err)
      }
    }
    loadTheme()
    fetchSubscription()

    return () => {
      removeTheme()
    }
  }, [])

  const isExpired = subscriptionData && (
    subscriptionData.status === 'canceled' ||
    subscriptionData.status === 'overdue' ||
    (subscriptionData.due_date && new Date(subscriptionData.due_date) < new Date())
  )

  const daysRemaining = subscriptionData?.days_remaining
  const showWarning = daysRemaining !== undefined && daysRemaining > 0 && daysRemaining <= 5 && !isExpired

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
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet context={{ subscriptionData, refreshSubscription: fetchSubscription, isExpired }} />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav />
    </div>
  )
}
