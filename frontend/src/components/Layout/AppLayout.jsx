import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileNav from './MobileNav'
import { subscription as subscriptionApi } from '../../services/api'
import { AlertTriangle, ShieldAlert } from 'lucide-react'

export default function AppLayout() {
  const [subscriptionData, setSubscriptionData] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  const fetchSubscription = async () => {
    try {
      const res = await subscriptionApi.get()
      if (res.success) setSubscriptionData(res.data)
    } catch (err) {
      console.warn('Erro ao carregar dados da assinatura:', err)
    }
  }

  useEffect(() => {
    document.documentElement.classList.add('mda-ifood-admin')
    document.body.classList.add('mda-ifood-admin')
    fetchSubscription()
    return () => {
      document.documentElement.classList.remove('mda-ifood-admin')
      document.body.classList.remove('mda-ifood-admin')
    }
  }, [])

  const isExpired = subscriptionData && (
    subscriptionData.status === 'canceled' ||
    subscriptionData.status === 'overdue' ||
    (subscriptionData.due_date && new Date(subscriptionData.due_date) < new Date())
  )

  const daysRemaining = subscriptionData?.days_remaining
  const showWarning = daysRemaining !== undefined && daysRemaining > 0 && daysRemaining <= 5 && !isExpired
  const [mobileWarningDismissed, setMobileWarningDismissed] = useState(() => sessionStorage.getItem('mda_mobile_warning_dismissed') === 'true')

  useEffect(() => {
    if (isExpired && location.pathname !== '/dashboard/assinatura') {
      navigate('/dashboard/assinatura', { replace: true })
    }
  }, [isExpired, location.pathname, navigate])

  return (
    <div className="min-h-screen bg-[#f7f7f7] text-[#1f2937] flex mda-admin-shell">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Header />
        {!mobileWarningDismissed && (
          <div className="lg:hidden mx-4 mt-4 p-3.5 rounded-2xl bg-white text-[#1f2937] flex items-center justify-between gap-3 shadow-sm border border-[#eeeeee]">
            <div className="flex items-center gap-2">
              <span className="text-base shrink-0">📱</span>
              <p className="text-xs font-semibold text-left leading-snug">Para gerenciar com todos os recursos, recomendamos usar computador.</p>
            </div>
            <button onClick={() => { sessionStorage.setItem('mda_mobile_warning_dismissed','true'); setMobileWarningDismissed(true) }} className="text-xs text-[#666] hover:text-[#ea1d2c] font-bold px-2.5 py-1 rounded-xl bg-[#f5f5f5]">Fechar</button>
          </div>
        )}
        {showWarning && (
          <div className="mx-4 lg:mx-6 mt-4 p-3.5 rounded-2xl bg-[#fff8e1] text-[#7a4b00] flex items-center gap-3 shadow-sm border border-[#ffe0a3]">
            <AlertTriangle className="flex-shrink-0" size={20} />
            <div className="flex-1 text-sm font-medium">Atenção: sua assinatura expira em <b>{daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}</b>.</div>
            <button onClick={() => navigate('/dashboard/assinatura')} className="px-3.5 py-1.5 bg-[#ea1d2c] text-white font-semibold rounded-xl text-xs">Renovar</button>
          </div>
        )}
        {isExpired && location.pathname === '/dashboard/assinatura' && (
          <div className="mx-4 lg:mx-6 mt-4 p-4 rounded-2xl bg-[#fff1f2] text-[#991b1b] flex items-center gap-3 shadow-sm border border-[#fecdd3]">
            <ShieldAlert className="flex-shrink-0" size={26} />
            <div><p className="font-bold text-base">Painel temporariamente bloqueado</p><p className="text-xs sm:text-sm mt-0.5">Regularize sua assinatura para reativar o painel.</p></div>
          </div>
        )}
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 overflow-auto bg-[#f7f7f7]">
          <div className={`${location.pathname === '/dashboard/pedidos' ? 'max-w-none w-full' : 'max-w-7xl mx-auto'} animate-fade-in`}>
            <Outlet context={{ subscriptionData, refreshSubscription: fetchSubscription, isExpired }} />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
