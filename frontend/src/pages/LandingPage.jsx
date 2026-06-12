import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Zap, ShoppingBag, Users, BarChart3, Bike, Bell, Star,
  Check, ArrowRight, UtensilsCrossed, Globe, MessageSquare,
  Building2, Play, CheckCircle2, ChevronRight, Menu, X
} from 'lucide-react'

const features = [
  {
    icon: ShoppingBag,
    title: 'Gestão de Pedidos',
    desc: 'Painel Kanban interativo para gerenciar cada etapa do pedido em tempo real, do preparo à entrega.',
    color: '#FF5A1F',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp Integrado',
    desc: 'Envie atualizações de status automáticas para o cliente diretamente no WhatsApp dele.',
    color: '#22C55E',
  },
  {
    icon: Users,
    title: 'CRM de Clientes',
    desc: 'Histórico de compras, ticket médio, endereço e preferências organizados por cliente.',
    color: '#6D28D9',
  },
  {
    icon: Zap,
    title: 'IA para Atendimento',
    desc: 'Atendente virtual inteligente que responde dúvidas e aceita pedidos automaticamente.',
    color: '#FF5A1F',
  },
  {
    icon: BarChart3,
    title: 'Relatórios Inteligentes',
    desc: 'Faturamento, produtos mais vendidos e performance de entrega em dashboards visuais.',
    color: '#F59E0B',
  },
  {
    icon: Building2,
    title: 'Multi Restaurante',
    desc: 'Gerencie múltiplas unidades ou filiais a partir de uma única conta administrativa.',
    color: '#22C55E',
  },
]

const plans = [
  {
    name: 'Starter',
    price: 'Grátis',
    period: 'para sempre',
    color: '#64748B',
    features: ['Até 50 pedidos/mês', '1 usuário', 'Cardápio digital', 'Relatórios simples', 'Suporte por e-mail'],
    cta: 'Começar Grátis',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 'R$ 149',
    period: '/mês',
    color: '#FF5A1F',
    features: ['Pedidos ilimitados', '5 usuários', 'Cardápio completo', 'WhatsApp integrado', 'Gestão de entregadores', 'Notificações automáticas', 'Suporte prioritário'],
    cta: 'Começar no Pro',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'R$ 349',
    period: '/mês',
    color: '#6D28D9',
    features: ['Tudo do plano Pro', 'Usuários ilimitados', 'Multi-restaurantes', 'API de Integração', 'IA avançada de atendimento', 'Gerente de conta exclusivo', 'SLA de 99.9%'],
    cta: 'Falar com Vendas',
    highlight: false,
  },
]

const testimonials = [
  {
    name: 'Marcos Oliveira',
    role: 'Dono — Burguer da Vila',
    text: 'Desde que implementamos o MeuDeliveryAI, nosso faturamento cresceu 40% em 3 meses. O controle de pedidos é impecável.',
    rating: 5,
    avatar: '🧔',
  },
  {
    name: 'Ana Beatriz Santos',
    role: 'Gerente — Pizzaria Napoli',
    text: 'Nunca mais perdi um pedido. O painel é extremamente intuitivo e a equipe toda aprendeu a operar em menos de um dia.',
    rating: 5,
    avatar: '👩',
  },
  {
    name: 'Ricardo Mendes',
    role: 'CEO — Sushi Flow',
    text: 'Os relatórios de ticket médio e produtos mais vendidos nos ajudam a tomar decisões reais. O desperdício caiu 25%.',
    rating: 5,
    avatar: '👨‍💼',
  },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen font-inter bg-[#F8FAFC] text-[#111827]">
      {/* HEADER */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(255, 255, 255, 0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid #E5E7EB' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FF5A1F] shadow-[0_4px_12px_rgba(255,90,31,0.3)]">
              <Zap size={18} color="white" />
            </div>
            <span className="text-[#111827] font-extrabold text-xl tracking-tight">
              MeuDelivery<span className="text-[#FF5A1F]">AI</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {['Recursos', 'Como Funciona', 'Preços', 'Depoimentos'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(' ', '-')}`}
                className="text-[#64748B] hover:text-[#111827] text-sm font-bold transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-[#64748B] hover:text-[#111827] text-sm font-bold transition-colors px-3 py-2">
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 bg-[#FF5A1F] hover:bg-[#e04f1a] shadow-[0_4px_14px_rgba(255,90,31,0.2)] hover:shadow-[0_6px_20px_rgba(255,90,31,0.3)]"
            >
              Começar Grátis
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#64748B] hover:text-[#111827]"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-[#E5E7EB] px-4 pt-2 pb-6 space-y-3">
            {['Recursos', 'Como Funciona', 'Preços', 'Depoimentos'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(' ', '-')}`}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-[#64748B] hover:text-[#111827] py-2 text-base font-bold"
              >
                {item}
              </a>
            ))}
            <div className="h-px bg-[#E5E7EB] my-3" />
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl text-sm font-bold text-[#64748B] bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Entrar
              </Link>
              <Link
                to="/cadastro"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl text-sm font-bold text-white bg-[#FF5A1F] hover:bg-[#e04f1a] transition-colors"
              >
                Cadastrar
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-28 pb-16">
        {/* Soft elegant background blobs */}
        <div style={{ position: 'absolute', top: '10%', left: '5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,90,31,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '5%', right: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,40,217,0.05) 0%, transparent 70%)', filter: 'blur(60px)' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-8 bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 text-[#FF5A1F]">
            <span className="w-2 h-2 bg-[#FF5A1F] rounded-full animate-pulse" />
            <span>Painel SaaS Premium & Inteligente</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.1] mb-6 text-[#111827] tracking-tight">
            Gerencie seu delivery <br />
            <span className="text-[#FF5A1F]">com inteligência</span>
          </h1>

          <p className="text-lg sm:text-xl text-[#64748B] max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Pedidos, WhatsApp, cardápio, entregadores e relatórios em um único painel moderno e profissional.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link
              to="/cadastro"
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-white font-bold text-base transition-all duration-200 bg-[#FF5A1F] hover:bg-[#e04f1a] shadow-[0_4px_14px_rgba(255,90,31,0.3)] hover:shadow-[0_8px_25px_rgba(255,90,31,0.4)]"
            >
              Começar grátis
              <ArrowRight size={18} />
            </Link>
            <a
              href="#como-funciona"
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-base hover:bg-slate-50 transition-colors shadow-sm"
            >
              Ver demonstração
              <Play size={16} className="text-[#FF5A1F]" />
            </a>
          </div>

          {/* Interactive CSS Mockup of Dashboard (High Fidelity) */}
          <div className="w-full max-w-5xl mx-auto rounded-3xl border border-slate-200 bg-white shadow-2xl p-3 sm:p-4 mb-16 relative hover:scale-[1.01] transition-transform duration-500">
            {/* Browser top-bar */}
            <div className="flex items-center justify-between px-3 pb-3 border-b border-slate-100 mb-3 sm:mb-4">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="px-10 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-400 font-mono">
                meudeliveryai.com.br/dashboard
              </div>
              <div className="w-10 h-1" />
            </div>

            {/* Dashboard Simulated Layout */}
            <div className="grid grid-cols-12 gap-4 text-left">
              {/* Mini-sidebar */}
              <div className="col-span-3 hidden md:block border-r border-slate-100 pr-4 space-y-2.5">
                <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-orange-50 text-[#FF5A1F] font-bold text-xs">
                  <ShoppingBag size={15} />
                  <span>Pedidos</span>
                </div>
                {['Cardápio', 'Clientes', 'Entregadores', 'Relatórios'].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 px-2.5 py-2 text-slate-500 font-semibold text-xs hover:text-slate-800 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Dashboard Content area */}
              <div className="col-span-12 md:col-span-9 space-y-4">
                {/* Stats simulation */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { l: 'Faturamento hoje', v: 'R$ 2.450,00', t: 'green' },
                    { l: 'Pedidos ativos', v: '12 pendentes', t: 'orange' },
                    { l: 'Faturamento mês', v: 'R$ 34.200,00', t: 'purple' },
                  ].map(({ l, v, t }) => (
                    <div key={l} className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{l}</span>
                      <span className="text-sm sm:text-base font-extrabold text-[#111827] mt-1 block">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Simulated Orders List */}
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50 space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Monitor em Tempo Real</h4>
                  
                  {/* Order item 1 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-[#FF5A1F] animate-pulse" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-none">#1042 — Ana Paula Santos</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium">1x Combo Burguer Duplo + Batata Frita</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-[#FF5A1F]">Aprovar</span>
                      <span className="text-xs font-bold text-slate-800">R$ 42,90</span>
                    </div>
                  </div>

                  {/* Order item 2 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-none">#1041 — Marcos Oliveira</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium">1x Pizza Calabresa G + Guaraná 2L</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Saiu para Entrega</span>
                      <span className="text-xs font-bold text-slate-800">R$ 68,00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS SECTION */}
      <section id="recursos" className="py-24 px-4 sm:px-6 bg-white border-y border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-4 bg-[#FF5A1F]/10 text-[#FF5A1F]">
              Recursos Avançados
            </span>
            <h2 className="text-3xl sm:text-5xl font-black mb-4 tracking-tight text-slate-900">
              Tudo que seu restaurante <br />
              <span className="text-[#FF5A1F]">precisa em um só lugar</span>
            </h2>
            <p className="text-[#64748B] text-lg max-w-2xl mx-auto font-medium">
              Esqueça as planilhas e sistemas complicados. Gerencie sua operação com facilidade.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="group p-8 rounded-3xl bg-[#F8FAFC] border border-[#E5E7EB] hover:bg-white hover:shadow-xl hover:border-slate-300/40 transition-all duration-300 text-left cursor-default"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                  style={{ background: `${color}10`, border: `1px solid ${color}20` }}
                >
                  <Icon size={22} style={{ color }} />
                </div>
                <h3 className="text-slate-900 font-extrabold text-lg mb-3 tracking-tight">{title}</h3>
                <p className="text-[#64748B] text-sm leading-relaxed font-medium">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA SECTION */}
      <section id="como-funciona" className="py-24 px-4 sm:px-6 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-4 bg-[#6D28D9]/10 text-[#6D28D9]">
              Processo Simples
            </span>
            <h2 className="text-3xl sm:text-5xl font-black mb-4 tracking-tight text-slate-900">
              Como funciona o sistema?
            </h2>
            <p className="text-[#64748B] text-lg max-w-2xl mx-auto font-medium">
              Em apenas três etapas simples, sua operação ganha velocidade e inteligência.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-left flex flex-col justify-between">
              <div>
                <span className="w-10 h-10 rounded-xl bg-[#FF5A1F]/10 text-[#FF5A1F] flex items-center justify-center font-black text-lg mb-6">1</span>
                <h3 className="text-slate-900 font-extrabold text-xl mb-3 tracking-tight">Cadastre seu restaurante</h3>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">
                  Crie sua conta em 1 minuto, configure seu cardápio com fotos, preços e categorias. Seu link de vendas é gerado na hora.
                </p>
              </div>
              <div className="h-2 mt-8 bg-orange-100 rounded-full w-12" />
            </div>

            {/* Step 2 */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-left flex flex-col justify-between">
              <div>
                <span className="w-10 h-10 rounded-xl bg-[#6D28D9]/10 text-[#6D28D9] flex items-center justify-center font-black text-lg mb-6">2</span>
                <h3 className="text-slate-900 font-extrabold text-xl mb-3 tracking-tight">Receba pedidos no painel</h3>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">
                  Os clientes fazem pedidos pelo cardápio no celular e você acompanha tudo pelo Kanban de produção com notificações sonoras instantâneas.
                </p>
              </div>
              <div className="h-2 mt-8 bg-purple-100 rounded-full w-12" />
            </div>

            {/* Step 3 */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-left flex flex-col justify-between">
              <div>
                <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-lg mb-6">3</span>
                <h3 className="text-slate-900 font-extrabold text-xl mb-3 tracking-tight">Automatize o atendimento</h3>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">
                  Nossa inteligência artificial atende dúvidas no WhatsApp, e o sistema despacha automaticamente o status do pedido para o cliente.
                </p>
              </div>
              <div className="h-2 mt-8 bg-emerald-100 rounded-full w-12" />
            </div>
          </div>
        </div>
      </section>

      {/* TRUSTED BY */}
      <section className="py-16 px-4 sm:px-6 border-y border-[#E5E7EB] bg-white">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-8">Confiado por mais de 2.400 restaurantes no Brasil</p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60">
            {['🍔 Burguer Palace', '🍕 Pizzaria Bella', '🍱 Sushi Flow', '🌮 Taco Loco', '🍗 Galeto Feliz', '☕ Café Premium'].map((brand) => (
              <span key={brand} className="text-slate-800 font-extrabold text-sm">{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="preços" className="py-24 px-4 sm:px-6 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-4 bg-[#FF5A1F]/10 text-[#FF5A1F]">
              Planos e Preços
            </span>
            <h2 className="text-3xl sm:text-5xl font-black mb-4 tracking-tight text-slate-900">Planos para cada fase</h2>
            <p className="text-[#64748B] text-lg font-medium">Sem letras miúdas. Comece grátis e mude quando precisar.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="relative bg-white rounded-3xl p-8 border text-left flex flex-col justify-between transition-all duration-300"
                style={{
                  borderColor: plan.highlight ? '#FF5A1F' : '#E5E7EB',
                  boxShadow: plan.highlight ? '0 10px 30px rgba(255, 90, 31, 0.08)' : '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
                }}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white bg-[#FF5A1F]">
                    Mais Recomendado
                  </div>
                )}
                <div>
                  <div className="mb-6">
                    <p className="text-slate-400 text-xs font-black uppercase tracking-wider mb-2">{plan.name}</p>
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-black text-slate-900 tracking-tight">{plan.price}</span>
                      <span className="text-slate-500 text-sm mb-1"> {plan.period}</span>
                    </div>
                  </div>
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                        <Check size={16} className="text-[#FF5A1F] shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  to="/cadastro"
                  className="block w-full text-center py-3.5 rounded-xl font-bold text-sm transition-all duration-200"
                  style={plan.highlight
                    ? { background: '#FF5A1F', color: 'white', boxShadow: '0 4px 12px rgba(255, 90, 31, 0.2)' }
                    : { background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#475569' }
                  }
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section id="depoimentos" className="py-24 px-4 sm:px-6 bg-white border-t border-[#E5E7EB]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-4 bg-emerald-100 text-emerald-600">
              Casos de Sucesso
            </span>
            <h2 className="text-3xl sm:text-5xl font-black mb-4 tracking-tight text-slate-900">O que dizem nossos clientes</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-[#F8FAFC] p-8 rounded-3xl border border-slate-200/80 shadow-sm text-left flex flex-col justify-between"
              >
                <div>
                  <div className="flex gap-0.5 mb-5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} size={15} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed italic mb-8 font-medium">"{t.text}"</p>
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-200/60">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-[#FF5A1F]/10">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-slate-900 font-extrabold text-sm leading-tight">{t.name}</p>
                    <p className="text-slate-400 text-xs font-semibold mt-0.5">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="py-24 px-4 sm:px-6 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto text-center">
          <div
            className="py-16 px-8 rounded-3xl relative overflow-hidden bg-white border border-slate-200 shadow-xl"
          >
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,90,31,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-5xl font-black mb-4 tracking-tight text-slate-900">Pronto para modernizar seu delivery?</h2>
              <p className="text-[#64748B] text-lg mb-8 max-w-xl mx-auto font-medium">
                Junte-se a mais de 2.400 restaurantes que já otimizaram sua operação.
              </p>
              <Link
                to="/cadastro"
                className="inline-flex items-center gap-2.5 px-10 py-4 rounded-2xl text-white font-bold text-base transition-all duration-200 bg-[#FF5A1F] hover:bg-[#e04f1a] shadow-[0_4px_14px_rgba(255, 90, 31, 0.3)] hover:shadow-[0_8px_25px_rgba(255, 90, 31, 0.4)]"
              >
                Começar grátis agora
                <ArrowRight size={20} />
              </Link>
              <p className="text-slate-400 text-xs mt-5 font-semibold">Sem cartão de crédito. Cancele quando quiser.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 px-4 sm:px-6 border-t border-[#E5E7EB] bg-white text-left">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#FF5A1F]">
                  <Zap size={16} color="white" />
                </div>
                <span className="text-[#111827] font-extrabold text-lg tracking-tight">MeuDelivery<span className="text-[#FF5A1F]">AI</span></span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Sistema SaaS para gestão inteligente de delivery para restaurantes.</p>
            </div>
            {[
              { title: 'Produto', links: ['Recursos', 'Preços', 'Changelog', 'Roadmap'] },
              { title: 'Empresa', links: ['Sobre nós', 'Blog', 'Carreiras', 'Contato'] },
              { title: 'Suporte', links: ['Central de ajuda', 'Documentação', 'Status', 'Comunidade'] },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-slate-900 font-extrabold text-sm mb-4">{col.title}</p>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link}><a href="#" className="text-slate-500 hover:text-[#111827] text-sm font-semibold transition-colors">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-slate-100">
            <p className="text-slate-400 text-sm font-medium">© 2026 MeuDeliveryAI. Todos os direitos reservados.</p>
            <div className="flex gap-6 mt-4 sm:mt-0">
              {['Privacidade', 'Termos', 'Cookies'].map((link) => (
                <a key={link} href="#" className="text-slate-400 hover:text-slate-600 text-sm font-semibold transition-colors">{link}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
