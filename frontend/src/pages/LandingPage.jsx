import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Zap, ShoppingBag, Users, BarChart3, Bike, Bell, Star,
  ChevronRight, Check, ArrowRight, UtensilsCrossed, Globe, MessageSquare,
  TrendingUp, Shield, Clock
} from 'lucide-react'

const features = [
  {
    icon: ShoppingBag,
    title: 'Gestão de Pedidos',
    desc: 'Kanban visual com todas as etapas do pedido em tempo real. Nunca perca um pedido.',
    color: '#FF6B35',
  },
  {
    icon: UtensilsCrossed,
    title: 'Cardápio Digital',
    desc: 'Crie e gerencie seu cardápio com categorias, preços e disponibilidade em segundos.',
    color: '#a855f7',
  },
  {
    icon: Bike,
    title: 'Controle de Entregadores',
    desc: 'Gerencie sua frota de entregadores, acompanhe entregas e avaliações.',
    color: '#22c55e',
  },
  {
    icon: BarChart3,
    title: 'Relatórios Avançados',
    desc: 'Insights detalhados sobre faturamento, produtos mais vendidos e desempenho.',
    color: '#f59e0b',
  },
  {
    icon: Bell,
    title: 'Notificações em Tempo Real',
    desc: 'Alertas instantâneos para novos pedidos, cancelamentos e atualizações de status.',
    color: '#06b6d4',
  },
  {
    icon: Globe,
    title: 'Integração Multicanal',
    desc: 'Integre WhatsApp, Instagram e seus canais de venda em um único painel.',
    color: '#ec4899',
  },
]

const plans = [
  {
    name: 'Starter',
    price: 'Grátis',
    period: 'para sempre',
    color: '#6b5880',
    features: ['Até 50 pedidos/mês', '1 usuário', 'Cardápio básico', 'Relatórios simples', 'Suporte por email'],
    cta: 'Começar Grátis',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 'R$ 149',
    period: '/mês',
    color: '#FF6B35',
    features: ['Pedidos ilimitados', '5 usuários', 'Cardápio completo', 'Relatórios avançados', 'Gestão de entregadores', 'Notificações push', 'Suporte prioritário'],
    cta: 'Começar Pro',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'R$ 349',
    period: '/mês',
    color: '#a855f7',
    features: ['Tudo do Pro', 'Usuários ilimitados', 'Multi-unidades', 'API dedicada', 'Integração personalizada', 'Gerente de conta', 'SLA 99.9%'],
    cta: 'Falar com Vendas',
    highlight: false,
  },
]

const testimonials = [
  {
    name: 'Marcos Oliveira',
    role: 'Dono — Burguer da Vila',
    text: 'Desde que implementei o MeuDeliveryAI, meu faturamento cresceu 40% em 3 meses. O controle de pedidos é simplesmente impecável.',
    rating: 5,
    avatar: '🧔',
  },
  {
    name: 'Ana Beatriz Santos',
    role: 'Gerente — Pizzaria Napoli',
    text: 'Nunca mais perdi um pedido. O painel é intuitivo e a equipe toda conseguiu aprender em menos de um dia.',
    rating: 5,
    avatar: '👩',
  },
  {
    name: 'Ricardo Mendes',
    role: 'CEO — Sushi Flow',
    text: 'Os relatórios me ajudam a tomar decisões com dados reais. Reduzi o desperdício em 25% só com as análises de produtos.',
    rating: 5,
    avatar: '👨‍💼',
  },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen font-inter" style={{ background: '#1A0533', color: '#f8f4ff' }}>
      {/* HEADER */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(26, 5, 51, 0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div style={{ background: 'linear-gradient(135deg, #FF6B35, #e84e15)', boxShadow: '0 0 20px rgba(255,107,53,0.4)' }} className="w-9 h-9 rounded-xl flex items-center justify-center">
              <Zap size={18} color="white" />
            </div>
            <span className="text-white font-bold text-xl">MeuDelivery<span style={{ background: 'linear-gradient(135deg, #FF6B35, #ff9a70)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            {['Recursos', 'Preços', 'Depoimentos'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-[#a991c7] hover:text-white text-sm font-medium transition-colors">{item}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-[#a991c7] hover:text-white text-sm font-medium transition-colors px-3 py-2">
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 btn-shimmer"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #e84e15)', boxShadow: '0 0 20px rgba(255,107,53,0.3)' }}
            >
              Começar Grátis
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Background blobs */}
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,53,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-8"
            style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)', color: '#FF6B35' }}>
            <span className="w-2 h-2 bg-[#FF6B35] rounded-full animate-pulse" />
            <span>🚀 Novo: Integração com WhatsApp Business</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-tight mb-6">
            Gerencie seu delivery
            <br />
            <span style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #ff9a70 50%, #ffb347 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              com inteligência
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-[#a991c7] max-w-3xl mx-auto mb-10 leading-relaxed">
            O sistema SaaS completo para restaurantes que querem crescer. Pedidos, cardápio, entregadores e relatórios em um único painel poderoso.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              to="/cadastro"
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-white font-bold text-base transition-all duration-200 btn-shimmer"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #e84e15)', boxShadow: '0 0 40px rgba(255,107,53,0.4)' }}
            >
              Começar Grátis Agora
              <ArrowRight size={20} />
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
            {[
              { value: '2.400+', label: 'Restaurantes' },
              { value: 'R$ 50M+', label: 'Processados/mês' },
              { value: '99.9%', label: 'Uptime' },
            ].map((stat) => (
              <div key={stat.label} className="text-center" style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-2xl font-extrabold" style={{ background: 'linear-gradient(135deg, #FF6B35, #ffb347)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {stat.value}
                </p>
                <p className="text-[#6b5880] text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="recursos" className="py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-4" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: '#a855f7' }}>
              Funcionalidades
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-4">
              Tudo que seu restaurante <br />
              <span style={{ background: 'linear-gradient(135deg, #FF6B35, #ff9a70)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>precisa em um só lugar</span>
            </h2>
            <p className="text-[#a991c7] text-lg max-w-2xl mx-auto">
              Do pedido à entrega, gerencie toda a operação do seu delivery com ferramentas poderosas e intuitivas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="group card-hover cursor-default"
                style={{ padding: '28px', borderRadius: '20px', background: 'rgba(42,15,74,0.5)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ background: `${color}15`, border: `1px solid ${color}25` }}
                >
                  <Icon size={22} style={{ color }} />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
                <p className="text-[#a991c7] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUSTED BY */}
      <section className="py-12 px-4 sm:px-6 border-y" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-[#6b5880] text-sm mb-8">Confiado por mais de 2.400 restaurantes no Brasil</p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-40">
            {['🍔 Burguer Palace', '🍕 Pizzaria Bella', '🍱 Sushi Flow', '🌮 Taco Loco', '🍗 Galeto Feliz', '☕ Café Premium'].map((brand) => (
              <span key={brand} className="text-white font-bold text-sm">{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="preços" className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-4" style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)', color: '#FF6B35' }}>
              Preços
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-4">Planos para cada fase</h2>
            <p className="text-[#a991c7] text-lg">Comece grátis e escale quando precisar.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="relative card-hover"
                style={{
                  padding: '32px 28px',
                  borderRadius: '24px',
                  background: plan.highlight ? 'linear-gradient(145deg, rgba(255,107,53,0.15) 0%, rgba(42,15,74,0.8) 100%)' : 'rgba(42,15,74,0.5)',
                  backdropFilter: 'blur(16px)',
                  border: plan.highlight ? `2px solid rgba(255,107,53,0.4)` : '1px solid rgba(255,255,255,0.07)',
                  boxShadow: plan.highlight ? '0 0 40px rgba(255,107,53,0.15)' : 'none',
                }}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #FF6B35, #e84e15)' }}>
                    Mais Popular
                  </div>
                )}
                <div className="mb-6">
                  <p className="text-[#a991c7] text-sm font-medium mb-1">{plan.name}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                    <span className="text-[#6b5880] text-sm mb-1">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-[#d4bfee]">
                      <Check size={14} style={{ color: plan.color, flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/cadastro"
                  className="block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all duration-200 btn-shimmer"
                  style={plan.highlight
                    ? { background: 'linear-gradient(135deg, #FF6B35, #e84e15)', color: 'white', boxShadow: '0 0 20px rgba(255,107,53,0.3)' }
                    : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d4bfee' }
                  }
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="depoimentos" className="py-24 px-4 sm:px-6" style={{ background: 'rgba(0,0,0,0.15)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-4" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}>
              Depoimentos
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-4">O que dizem nossos clientes</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="card-hover"
                style={{ padding: '28px', borderRadius: '20px', background: 'rgba(42,15,74,0.5)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} size={14} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                  ))}
                </div>
                <p className="text-[#d4bfee] text-sm leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: 'rgba(255,107,53,0.1)' }}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-[#6b5880] text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div
            className="py-16 px-8 rounded-3xl relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.2) 0%, rgba(168,85,247,0.15) 100%)', border: '1px solid rgba(255,107,53,0.2)' }}
          >
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,53,0.1) 0%, transparent 70%)', filter: 'blur(40px)' }} />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-5xl font-extrabold mb-4">Pronto para crescer?</h2>
              <p className="text-[#a991c7] text-lg mb-8 max-w-xl mx-auto">
                Junte-se a mais de 2.400 restaurantes que já transformaram seu delivery.
              </p>
              <Link
                to="/cadastro"
                className="inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl text-white font-bold text-lg transition-all duration-200 btn-shimmer"
                style={{ background: 'linear-gradient(135deg, #FF6B35, #e84e15)', boxShadow: '0 0 40px rgba(255,107,53,0.4)' }}
              >
                Começar Grátis Agora
                <ArrowRight size={22} />
              </Link>
              <p className="text-[#6b5880] text-sm mt-4">Sem cartão de crédito. Cancele quando quiser.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-4 sm:px-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div style={{ background: 'linear-gradient(135deg, #FF6B35, #e84e15)' }} className="w-8 h-8 rounded-xl flex items-center justify-center">
                  <Zap size={16} color="white" />
                </div>
                <span className="text-white font-bold text-lg">MeuDelivery<span style={{ background: 'linear-gradient(135deg, #FF6B35, #ff9a70)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI</span></span>
              </div>
              <p className="text-[#6b5880] text-sm leading-relaxed">Sistema SaaS para gestão inteligente de delivery para restaurantes.</p>
            </div>
            {[
              { title: 'Produto', links: ['Recursos', 'Preços', 'Changelog', 'Roadmap'] },
              { title: 'Empresa', links: ['Sobre nós', 'Blog', 'Carreiras', 'Contato'] },
              { title: 'Suporte', links: ['Central de ajuda', 'Documentação', 'Status', 'Comunidade'] },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-white font-semibold text-sm mb-4">{col.title}</p>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link}><a href="#" className="text-[#6b5880] hover:text-[#a991c7] text-sm transition-colors">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-[#6b5880] text-sm">© 2024 MeuDeliveryAI. Todos os direitos reservados.</p>
            <div className="flex gap-6 mt-4 sm:mt-0">
              {['Privacidade', 'Termos', 'Cookies'].map((link) => (
                <a key={link} href="#" className="text-[#6b5880] hover:text-[#a991c7] text-sm transition-colors">{link}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
