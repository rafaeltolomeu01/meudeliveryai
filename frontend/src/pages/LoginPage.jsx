import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Zap, ArrowRight, ShoppingBag, BarChart3, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

const features = [
  { icon: ShoppingBag, text: 'Gestão completa de pedidos' },
  { icon: BarChart3, text: 'Relatórios em tempo real' },
  { icon: Users, text: 'CRM de clientes integrado' },
]

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const errs = {}
    if (!form.email) errs.email = 'Email é obrigatório'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Email inválido'
    if (!form.password) errs.password = 'Senha é obrigatória'
    else if (form.password.length < 6) errs.password = 'Mínimo de 6 caracteres'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    const result = await login(form.email, form.password)
    setLoading(false)
    if (result.success) {
      const role = result.user?.role
      if (role === 'admin_geral') {
        navigate('/admin')
      } else if (role === 'cozinha') {
        navigate('/dashboard/cozinha')
      } else if (role === 'entregador') {
        navigate('/dashboard/entregador')
      } else {
        navigate('/dashboard')
      }
    }
  }

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  return (
    <div className="min-h-screen flex mda-auth-container" style={{ background: '#F8FAFC' }}>
      {/* LEFT — Branding (Dark Elegant SaaS) */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: '#111827' }}>
        
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        
        {/* Background blobs for visual depth */}
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,90,31,0.15) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,40,217,0.15) 0%, transparent 70%)', filter: 'blur(80px)' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FF5A1F] shadow-[0_4px_12px_rgba(255,90,31,0.3)]">
            <Zap size={20} color="white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">
            MeuDelivery<span className="text-[#FF5A1F]">AI</span>
          </span>
        </div>

        {/* CSS Mockup Dashboard */}
        <div className="relative z-10 my-auto flex flex-col items-center">
          <div className="w-full max-w-md mb-8">
            <h2 className="text-3xl font-extrabold text-white mb-3 tracking-tight leading-tight">
              Gerencie seu delivery <br />
              com <span className="text-[#FF5A1F]">inteligência</span>
            </h2>
            <p className="text-slate-400 text-base max-w-sm">
              Pedidos, WhatsApp, cardápio, entregadores e relatórios em um único painel.
            </p>
          </div>

          {/* Premium CSS Mockup Browser */}
          <div className="w-full max-w-md aspect-[4/3] bg-slate-950/40 rounded-2xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-sm relative">
            {/* Mockup Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-900/60">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="px-3 py-0.5 bg-slate-950/60 border border-white/5 rounded-md text-[9px] text-slate-500 font-mono select-none">
                meudeliveryai.com.br/painel
              </div>
              <div className="w-8" />
            </div>
            {/* Mockup Body */}
            <div className="p-4 space-y-4 text-left text-white">
              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Faturamento</p>
                  <p className="text-xs font-black text-white mt-1">R$ 1.840,00</p>
                </div>
                <div className="p-2 rounded-xl bg-[#FF5A1F]/10 border border-[#FF5A1F]/20">
                  <p className="text-[8px] text-[#FF5A1F] font-bold uppercase tracking-wider">Pedidos</p>
                  <p className="text-xs font-black text-[#FF5A1F] mt-1">42 novos</p>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Ticket Médio</p>
                  <p className="text-xs font-black text-white mt-1">R$ 43,80</p>
                </div>
              </div>

              {/* Order simulator list */}
              <div className="space-y-2">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Últimos Pedidos</p>
                <div className="space-y-2">
                  <div className="p-2 rounded-xl bg-[#FF5A1F]/15 border border-[#FF5A1F]/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-[#FF5A1F] rounded-full animate-pulse" />
                      <div>
                        <p className="text-[10px] font-bold text-white leading-none">#1042 — Pizzaria Italia</p>
                        <p className="text-[8px] text-slate-400 mt-1">1x Pizza Família + Refrigerante</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#FF5A1F] text-white">Novo</span>
                  </div>

                  <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between opacity-80">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-400 rounded-full" />
                      <div>
                        <p className="text-[10px] font-bold text-white leading-none">#1041 — Hamburgueria Vila</p>
                        <p className="text-[8px] text-slate-400 mt-1">2x Combo Duplo Smash</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">Preparando</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Quote */}
        <div className="relative z-10 p-5 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-slate-300 text-sm italic">"Desde que implementamos o MeuDeliveryAI, nosso faturamento cresceu 40% em 3 meses."</p>
          <p className="text-[#FF5A1F] text-xs font-semibold mt-2">— Marcos, Burguer Palace</p>
        </div>
      </div>

      {/* RIGHT — Login Form Section */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-[#F8FAFC]">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FF5A1F] shadow-[0_4px_12px_rgba(255,90,31,0.2)]">
              <Zap size={18} color="white" />
            </div>
            <span className="text-slate-900 font-bold text-xl tracking-tight">
              MeuDelivery<span className="text-[#FF5A1F]">AI</span>
            </span>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-100">
            <div className="mb-6 text-left">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Entrar na sua conta</h1>
              <p className="text-slate-500 text-sm">
                Não tem conta?{' '}
                <Link to="/cadastro" className="text-[#FF5A1F] hover:underline font-bold transition-all">Crie uma grátis</Link>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <Input
                label="Email"
                type="email"
                placeholder="seu@restaurante.com.br"
                leftIcon={Mail}
                value={form.email}
                onChange={handleChange('email')}
                error={errors.email}
                required
                id="login-email"
              />

              <div>
                <Input
                  label="Senha"
                  type="password"
                  placeholder="••••••••"
                  leftIcon={Lock}
                  value={form.password}
                  onChange={handleChange('password')}
                  error={errors.password}
                  required
                  id="login-password"
                />
                <div className="flex justify-end mt-2">
                  <button type="button" className="text-xs text-[#FF5A1F] hover:underline font-bold">
                    Esqueci minha senha
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                rightIcon={ArrowRight}
                id="login-submit"
                className="mt-6 py-3.5 rounded-xl font-bold bg-[#FF5A1F]"
              >
                Entrar no Painel
              </Button>
            </form>
          </div>

          <p className="text-center text-slate-500 text-xs mt-8">
            Ao entrar, você concorda com nossos{' '}
            <a href="#" className="hover:text-slate-900 font-semibold transition-colors">Termos</a>
            {' '}e{' '}
            <a href="#" className="hover:text-slate-900 font-semibold transition-colors">Privacidade</a>
          </p>
        </div>
      </div>
    </div>
  )
}

