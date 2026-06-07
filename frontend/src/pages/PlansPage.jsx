import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ShieldCheck, Zap, Heart, ArrowRight, ArrowLeft } from 'lucide-react'
import Button from '../components/ui/Button'

const plans = [
  {
    id: 1,
    name: 'Starter',
    tagline: 'Ideal para quem está iniciando a operação delivery.',
    priceMonthly: 'Grátis',
    priceYearly: 'Grátis',
    features: [
      'Até 20 produtos no cardápio',
      'Até 100 pedidos por mês',
      '1 restaurante / 2 usuários',
      'Painel de pedidos básico',
      'Suporte via comunidade',
      'Cardápio digital PWA',
    ],
    cta: 'Começar Grátis',
    icon: Heart,
    color: '#6b5880',
    highlight: false,
  },
  {
    id: 2,
    name: 'Pro',
    tagline: 'Para restaurantes em crescimento que buscam automatizar.',
    priceMonthly: 'R$ 149',
    priceYearly: 'R$ 119',
    features: [
      'Produtos e categorias ilimitados',
      'Pedidos ilimitados',
      'Até 10 usuários no painel',
      'Relatórios e métricas avançadas',
      'Controle e gestão de entregadores',
      'Integração com WhatsApp (notificações)',
      'Suporte prioritário via e-mail',
      'Temas visuais customizados',
    ],
    cta: 'Assinar Pro',
    icon: Zap,
    color: '#FF6B35',
    highlight: true,
  },
  {
    id: 3,
    name: 'Enterprise',
    tagline: 'Solução sob medida para redes de franquias e grandes volumes.',
    priceMonthly: 'R$ 349',
    priceYearly: 'R$ 279',
    features: [
      'Tudo do plano Pro',
      'Usuários e filiais ilimitadas',
      'Acesso completo a API do sistema',
      'Integrações personalizadas',
      'Suporte dedicado 24/7 (WhatsApp/Telefone)',
      'Gerente de conta exclusivo',
      'SLA garantido de 99.9%',
      'Customizações avançadas de CSS',
    ],
    cta: 'Assinar Enterprise',
    icon: ShieldCheck,
    color: '#a855f7',
    highlight: false,
  },
]

export default function PlansPage() {
  const [billingCycle, setBillingCycle] = useState('monthly') // 'monthly' | 'yearly'
  const navigate = useNavigate()

  const handleSelectPlan = (planName) => {
    navigate(`/cadastro?plan=${planName}&cycle=${billingCycle}`)
  }

  return (
    <div className="min-h-screen relative overflow-hidden font-inter text-[#f8f4ff] flex flex-col justify-between" style={{ background: '#1A0533' }}>
      
      {/* Background neon blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,53,0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div className="relative z-10">
        {/* Navigation header */}
        <header className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group text-[#a991c7] hover:text-white transition-colors">
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Voltar para Home</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <div style={{ background: 'linear-gradient(135deg, #FF6B35, #e84e15)', boxShadow: '0 0 15px rgba(255,107,53,0.3)' }} className="w-8 h-8 rounded-lg flex items-center justify-center">
              <Zap size={16} color="white" />
            </div>
            <span className="text-white font-bold text-lg">MeuDelivery<span className="text-[#FF6B35]">AI</span></span>
          </div>
        </header>

        {/* Pricing header */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
          <div className="max-w-3xl mx-auto mb-12">
            <span className="text-[#FF6B35] font-semibold tracking-wider text-xs uppercase bg-[#FF6B35]/10 px-3 py-1 rounded-full border border-[#FF6B35]/20">Nossos Planos</span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white mt-4 tracking-tight leading-none">
              O plano perfeito para o tamanho do seu negócio
            </h1>
            <p className="text-[#a991c7] mt-5 text-lg">
              Sem taxas ocultas, sem fidelidade. Crie sua conta, escolha um plano e comece a vender em menos de 10 minutos.
            </p>

            {/* Monthly / Yearly Billing Toggle */}
            <div className="mt-8 flex justify-center items-center gap-3">
              <span className={`text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'text-white' : 'text-[#a991c7]'}`}>Mensal</span>
              <button
                onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                className="w-14 h-7 rounded-full p-1 transition-colors duration-300 focus:outline-none relative"
                style={{ backgroundColor: billingCycle === 'yearly' ? '#FF6B35' : 'rgba(255,255,255,0.1)' }}
              >
                <div
                  className="w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow"
                  style={{ transform: billingCycle === 'yearly' ? 'translateX(28px)' : 'translateX(0px)' }}
                />
              </button>
              <span className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'text-white' : 'text-[#a991c7]'}`}>
                Anual
                <span className="text-xs bg-[#22c55e]/25 text-[#22c55e] border border-[#22c55e]/30 px-2 py-0.5 rounded-full font-bold">
                  Salvar 20%
                </span>
              </span>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
            {plans.map((plan) => {
              const PlanIcon = plan.icon
              const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly
              const suffix = price === 'Grátis' ? '' : '/mês'

              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 relative ${
                    plan.highlight 
                      ? 'border-2 border-[#FF6B35] shadow-[0_0_40px_rgba(255,107,53,0.15)] bg-gradient-to-b from-[#2A0F4D]/90 to-[#1A0533]/90 md:-translate-y-4' 
                      : 'border border-white/10 hover:border-white/20 bg-white/[0.03] backdrop-blur-md'
                  }`}
                >
                  {plan.highlight && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FF6B35] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg uppercase tracking-wider">
                      Mais Popular
                    </span>
                  )}

                  <div>
                    {/* Header */}
                    <div className="flex items-center gap-3.5 mb-5">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center"
                        style={{ background: `${plan.color}20`, border: `1px solid ${plan.color}35` }}
                      >
                        <PlanIcon size={20} style={{ color: plan.color }} />
                      </div>
                      <div className="text-left">
                        <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                        <p className="text-xs text-[#a991c7] mt-0.5">{plan.tagline}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-left mb-6">
                      <span className="text-4xl sm:text-5xl font-black text-white">{price}</span>
                      <span className="text-sm text-[#a991c7] ml-1.5 font-medium">{suffix}</span>
                      {billingCycle === 'yearly' && price !== 'Grátis' && (
                        <p className="text-[#22c55e] text-xs font-semibold mt-1">Cobrado anualmente</p>
                      )}
                    </div>

                    {/* Features */}
                    <div className="border-t border-white/10 pt-6 mb-8">
                      <ul className="flex flex-col gap-4 text-left">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-sm text-[#d4c8e3]">
                            <Check size={16} className="text-[#22c55e] shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => handleSelectPlan(plan.name)}
                    variant={plan.highlight ? 'default' : 'outline'}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${
                      plan.highlight
                        ? 'btn-shimmer text-white'
                        : 'border-white/20 text-white hover:bg-white/5'
                    }`}
                    style={plan.highlight ? { background: 'linear-gradient(135deg, #FF6B35, #e84e15)', border: 'none' } : {}}
                  >
                    {plan.cta}
                    <ArrowRight size={16} />
                  </Button>
                </div>
              )
            })}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 mt-12 bg-black/10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#8c75a8]">
          <p>© {new Date().getFullYear()} MeuDeliveryAI. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <Link to="/login" className="hover:text-white transition-colors">Entrar</Link>
            <Link to="/cadastro" className="hover:text-white transition-colors">Cadastrar Loja</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
