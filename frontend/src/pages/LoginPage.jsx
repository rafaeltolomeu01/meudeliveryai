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
    <div className="min-h-screen flex" style={{ background: '#1A0533' }}>
      {/* LEFT — Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0f0220 0%, #2d0a5f 50%, #1a0533 100%)' }}>
        {/* Background blobs */}
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,53,0.15) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)', filter: 'blur(60px)' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div style={{ background: 'linear-gradient(135deg, #FF6B35, #e84e15)', boxShadow: '0 0 20px rgba(255,107,53,0.4)' }} className="w-10 h-10 rounded-xl flex items-center justify-center">
            <Zap size={20} color="white" />
          </div>
          <span className="text-white font-bold text-xl">MeuDelivery<span style={{ background: 'linear-gradient(135deg, #FF6B35, #ff9a70)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI</span></span>
        </div>

        {/* Content */}
        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold text-white mb-4 leading-tight">
            Bem-vindo de <br />
            <span style={{ background: 'linear-gradient(135deg, #FF6B35, #ff9a70)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>volta! 👋</span>
          </h2>
          <p className="text-[#a991c7] text-lg mb-10 max-w-sm">
            Continue gerenciando seu delivery com inteligência e eficiência.
          </p>
          <div className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)' }} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon size={15} style={{ color: '#FF6B35' }} />
                </div>
                <span className="text-[#d4bfee] text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quote */}
        <div className="relative z-10 p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[#d4bfee] text-sm italic">"Desde que implementamos o MeuDeliveryAI, nosso faturamento cresceu 40% em 3 meses."</p>
          <p className="text-[#FF6B35] text-xs font-medium mt-2">— Marcos, Burguer Palace</p>
        </div>
      </div>

      {/* RIGHT — Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div style={{ background: 'linear-gradient(135deg, #FF6B35, #e84e15)' }} className="w-8 h-8 rounded-xl flex items-center justify-center">
              <Zap size={16} color="white" />
            </div>
            <span className="text-white font-bold text-lg">MeuDelivery<span style={{ background: 'linear-gradient(135deg, #FF6B35, #ff9a70)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI</span></span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-white mb-2">Entrar na sua conta</h1>
            <p className="text-[#a991c7] text-sm">
              Não tem conta?{' '}
              <Link to="/cadastro" className="text-[#FF6B35] hover:underline font-medium">Crie uma grátis</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
              <div className="flex justify-end mt-1.5">
                <button type="button" className="text-xs text-[#FF6B35] hover:underline">
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
            >
              Entrar no Painel
            </Button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/[0.06]"></div>
            <span className="flex-shrink mx-4 text-xs text-[#6b5880]">ou</span>
            <div className="flex-grow border-t border-white/[0.06]"></div>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            onClick={async () => {
              setForm({ email: 'demo@meudeliveryai.com', password: '123456' })
              setLoading(true)
              const result = await login('demo@meudeliveryai.com', '123456')
              setLoading(false)
              if (result.success) {
                navigate('/dashboard')
              }
            }}
            id="login-demo-shortcut"
          >
            Acessar Modo Demonstração 🚀
          </Button>

          <p className="text-center text-[#6b5880] text-xs mt-6">
            Ao entrar, você concorda com nossos{' '}
            <a href="#" className="text-[#a991c7] hover:underline">Termos</a>
            {' '}e{' '}
            <a href="#" className="text-[#a991c7] hover:underline">Privacidade</a>
          </p>
        </div>
      </div>
    </div>
  )
}
