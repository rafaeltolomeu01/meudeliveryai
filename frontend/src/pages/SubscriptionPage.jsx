import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { 
  CreditCard, Calendar, ShieldCheck, Zap, AlertTriangle, 
  ArrowUpRight, Check, CheckCircle2, RefreshCw, Sparkles 
} from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { formatCurrency } from '../utils/helpers'
import { subscription as subscriptionApi } from '../services/api'
import toast from 'react-hot-toast'

const PLANS = [
  { 
    id: 1, 
    name: 'Starter', 
    price: 0.00, 
    description: 'Recursos básicos para validação inicial de vendas.',
    features: ['Até 20 produtos', 'Até 100 pedidos/mês', 'Até 2 usuários', 'Suporte via comunidade'] 
  },
  { 
    id: 2, 
    name: 'Pro', 
    price: 149.00, 
    description: 'Acesso completo a gestão de pedidos, entregadores e automatizações WhatsApp.',
    features: ['Produtos ilimitados', 'Pedidos ilimitados', 'Até 10 usuários', 'Automatizações WhatsApp', 'Gestão de Entregadores', 'Relatórios Completos', 'Suporte por e-mail'] 
  },
  { 
    id: 3, 
    name: 'Enterprise', 
    price: 349.00, 
    description: 'Solução completa para redes, franquias e alta demanda.',
    features: ['Produtos ilimitados', 'Pedidos ilimitados', 'Usuários ilimitados', 'Tudo do Pro', 'Acesso à API', 'Suporte prioritário 24/7'] 
  }
]

export default function SubscriptionPage() {
  const context = useOutletContext()
  const subscriptionData = context?.subscriptionData
  const refreshSubscription = context?.refreshSubscription
  const isExpired = context?.isExpired

  const [loadingAction, setLoadingAction] = useState(false)

  // Caso o layout ainda não tenha carregado os dados de assinatura, forçar carregamento
  useEffect(() => {
    if (!subscriptionData && refreshSubscription) {
      refreshSubscription()
    }
  }, [subscriptionData, refreshSubscription])

  const handleRenew = async () => {
    try {
      setLoadingAction(true)
      const res = await subscriptionApi.renew()
      if (res.success) {
        toast.success(res.message || 'Assinatura renovada com sucesso por 30 dias!')
        if (refreshSubscription) await refreshSubscription()
      }
    } catch (err) {
      toast.error(err.message || 'Erro ao renovar assinatura.')
    } finally {
      setLoadingAction(false)
    }
  }

  const handleUpgrade = async (planId) => {
    try {
      setLoadingAction(true)
      const res = await subscriptionApi.upgrade(planId)
      if (res.success) {
        toast.success(res.message || 'Upgrade de plano realizado com sucesso!')
        if (refreshSubscription) await refreshSubscription()
      }
    } catch (err) {
      toast.error(err.message || 'Erro ao realizar upgrade.')
    } finally {
      setLoadingAction(false)
    }
  }

  if (!subscriptionData) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin text-[#FF6B35] mb-4" size={40} />
        <p className="text-[#a991c7] text-sm font-medium">Carregando dados da assinatura...</p>
      </div>
    )
  }

  const sub = subscriptionData
  const currentPlan = PLANS.find(p => p.id === sub.plan_id) || PLANS[0]
  const isTrial = sub.status === 'trial'
  
  // Mapeamento de status e cores
  const statusLabels = {
    trial: 'Período de Testes',
    active: 'Assinatura Ativa',
    overdue: 'Assinatura Vencida',
    canceled: 'Assinatura Cancelada'
  }

  const statusColors = {
    trial: 'blue',
    active: 'green',
    overdue: 'red',
    canceled: 'gray'
  }

  return (
    <div className="space-y-8 text-left animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <CreditCard className="text-[#FF6B35]" size={20} />
          Sua Assinatura
        </h2>
        <p className="text-[#a991c7] text-sm">Gerencie seu plano de assinatura, status e faça simulações de renovação ou upgrade</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Detalhes da Assinatura Atual */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`glass rounded-3xl p-6 border transition-all duration-300 relative overflow-hidden ${
            isExpired ? 'border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.05)]' : 'border-white/5'
          }`}>
            <div className="absolute top-0 right-0 p-8 opacity-5 text-white pointer-events-none">
              <Zap size={180} />
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
              <div>
                <span className="text-[10px] font-bold bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/20 px-3 py-1 rounded-full uppercase tracking-wider">
                  Plano Atual
                </span>
                <h3 className="text-3xl font-black text-white mt-2.5 capitalize flex items-center gap-2">
                  {sub.plan_name}
                  {sub.status === 'active' && <Sparkles size={20} className="text-yellow-400 animate-pulse" />}
                </h3>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed min-h-[36px]">
                  {currentPlan.description}
                </p>
              </div>

              <div className="shrink-0 flex flex-col items-start sm:items-end gap-1">
                <span className="text-[10px] text-gray-500 font-semibold uppercase">STATUS</span>
                <Badge color={statusColors[sub.status] || 'gray'}>
                  {statusLabels[sub.status] || sub.status}
                </Badge>
              </div>
            </div>

            {/* Grid de Informações Financeiras e Datas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-6 border-b border-white/5 text-xs text-gray-300">
              <div className="flex items-start gap-3">
                <Calendar size={18} className="text-[#FF6B35] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Data de Vencimento</p>
                  <p className="mt-1 font-medium text-gray-400">
                    {sub.due_date ? new Date(sub.due_date).toLocaleDateString('pt-BR') : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ShieldCheck size={18} className="text-[#FF6B35] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Valor Mensal</p>
                  <p className="mt-1 font-semibold text-[#FF6B35]">
                    {formatCurrency(sub.monthly_price)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Zap size={18} className="text-[#FF6B35] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Dias Restantes</p>
                  <p className={`mt-1 font-bold ${
                    isExpired ? 'text-red-400' : sub.days_remaining <= 5 ? 'text-yellow-400 animate-pulse' : 'text-green-400'
                  }`}>
                    {isExpired ? 'Assinatura vencida' : `${sub.days_remaining} ${sub.days_remaining === 1 ? 'dia' : 'dias'}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Ações da Assinatura Atual */}
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-gray-400 max-w-md text-center sm:text-left">
                {isExpired 
                  ? 'Seu painel está bloqueado. Simule a renovação abaixo para estender por mais 30 dias e liberar o acesso na hora.' 
                  : 'Quer estender o seu vencimento atual ou reativar sua assinatura? Use o botão ao lado para simular renovação.'}
              </p>
              
              <Button 
                variant={isExpired ? 'primary' : 'secondary'} 
                size="md" 
                onClick={handleRenew}
                disabled={loadingAction}
                className={isExpired ? 'shadow-[0_0_20px_rgba(255,107,53,0.35)]' : ''}
              >
                {loadingAction ? (
                  <RefreshCw size={16} className="animate-spin mr-2" />
                ) : null}
                Renovar (+30 dias)
              </Button>
            </div>
          </div>
        </div>

        {/* Card informativo de segurança */}
        <Card title="Simulação de Sandbox" subtitle="Informações do Módulo de Assinaturas" noPad>
          <div className="p-5 space-y-4 text-xs text-gray-300 leading-relaxed">
            <div className="flex gap-2.5 items-start">
              <CheckCircle2 size={16} className="text-[#FF6B35] shrink-0 mt-0.5" />
              <p>Os botões de renovação e upgrade operam em modo simulação direta com gravação automática no banco de dados.</p>
            </div>
            <div className="flex gap-2.5 items-start">
              <CheckCircle2 size={16} className="text-[#FF6B35] shrink-0 mt-0.5" />
              <p>O bloqueio do painel e do cardápio público é validado em tempo real no servidor a cada requisição operacional.</p>
            </div>
            <div className="flex gap-2.5 items-start">
              <CheckCircle2 size={16} className="text-[#FF6B35] shrink-0 mt-0.5" />
              <p>O banner de vencimento aparece automaticamente ao atingir 5 dias ou menos do prazo limite.</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Seção de Planos para Upgrade/Mudança */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="text-yellow-400" size={18} />
            Escolha seu Plano ou Faça Upgrade
          </h3>
          <p className="text-[#a991c7] text-xs mt-1">Conheça nossos planos e selecione o ideal para a escala de suas operações</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = sub.plan_id === plan.id
            
            return (
              <div 
                key={plan.id}
                className={`glass rounded-3xl p-6 border flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
                  isCurrent 
                    ? 'border-[#FF6B35]/40 bg-[#FF6B35]/[0.03] shadow-[0_0_30px_rgba(255,107,53,0.05)]' 
                    : 'border-white/5 hover:border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-white">{plan.name}</h4>
                    {isCurrent && (
                      <span className="text-[9px] font-bold bg-[#FF6B35]/20 text-[#FF6B35] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Plano Atual
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-4 flex items-baseline text-white">
                    <span className="text-3xl font-extrabold tracking-tight">{formatCurrency(plan.price)}</span>
                    <span className="ml-1 text-xs text-gray-400">/mês</span>
                  </div>

                  <p className="text-xs text-gray-400 mt-2 leading-relaxed min-h-[36px]">
                    {plan.description}
                  </p>

                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                        <Check size={14} className="text-[#FF6B35] shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  <Button 
                    variant={isCurrent ? 'secondary' : plan.id > sub.plan_id ? 'primary' : 'secondary'}
                    className="w-full justify-center"
                    disabled={isCurrent || loadingAction}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {isCurrent 
                      ? 'Plano Atual Ativo' 
                      : plan.id > sub.plan_id 
                        ? 'Fazer Upgrade' 
                        : 'Mudar de Plano'
                    }
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Loader2({ size, className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  )
}
