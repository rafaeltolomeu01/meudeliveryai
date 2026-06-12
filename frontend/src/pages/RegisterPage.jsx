import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Building2, Phone, MapPin, User, Mail, Lock, Zap, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedPlan = searchParams.get('plan')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    restaurantName: '',
    whatsapp: '',
    city: '',
    state: '',
    adminName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const handleChange = (field) => (e) => {
    let value = e.target.value
    if (field === 'state') {
      value = value.toUpperCase().slice(0, 2)
    }
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validateStep1 = () => {
    const errs = {}
    if (!form.restaurantName.trim()) errs.restaurantName = 'Nome do restaurante é obrigatório'
    if (!form.whatsapp.trim()) errs.whatsapp = 'WhatsApp é obrigatório'
    return errs
  }

  const validateStep2 = () => {
    const errs = {}
    if (!form.adminName.trim()) errs.adminName = 'Nome do responsável é obrigatório'
    if (!form.email.trim()) {
      errs.email = 'E-mail é obrigatório'
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      errs.email = 'E-mail inválido'
    }
    if (!form.password) {
      errs.password = 'Senha é obrigatória'
    } else if (form.password.length < 6) {
      errs.password = 'Senha deve ter no mínimo 6 caracteres'
    }
    if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'As senhas não coincidem'
    }
    return errs
  }

  const handleNext = () => {
    const errs = validateStep1()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setErrors({})
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validateStep2()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setLoading(true)
    // Se o plano estiver selecionado, passa junto no cadastro
    const result = await register({ ...form, plan: selectedPlan })
    setLoading(false)
    if (result.success) {
      navigate('/dashboard')
    }
  }

  const steps = [
    { n: 1, label: 'Restaurante' },
    { n: 2, label: 'Responsável' },
  ]
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 mda-auth-container" style={{ background: '#F8FAFC' }}>
      {/* Subtle grid pattern background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FF5A1F] shadow-[0_4px_12px_rgba(255,90,31,0.2)]">
            <Zap size={20} color="white" />
          </div>
          <span className="text-slate-900 font-bold text-2xl tracking-tight">
            MeuDelivery<span className="text-[#FF5A1F]">AI</span>
          </span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-100/50">
          {/* Header */}
          <div className="text-center mb-8">
            {selectedPlan && (
              <div className="mb-4">
                <span className="text-[#22c55e] font-semibold text-xs bg-[#22c55e]/10 px-3 py-1 rounded-full border border-[#22c55e]/20 uppercase tracking-wider">
                  Plano Selecionado: {selectedPlan}
                </span>
              </div>
            )}
            <h1 className="text-2xl font-black text-slate-900 mb-1 tracking-tight">Crie sua conta grátis</h1>
            <p className="text-slate-500 text-sm">
              Já tem conta?{' '}
              <Link to="/login" className="text-[#FF5A1F] hover:underline font-bold transition-all">Entrar</Link>
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-3 mb-8">
            {steps.map((s) => (
              <div key={s.n} className="flex-1 flex flex-col items-center gap-1.5 relative">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 z-10"
                  style={{
                    background: step > s.n ? '#22c55e' : step === s.n ? '#FF5A1F' : '#F1F5F9',
                    color: step >= s.n ? 'white' : '#64748B',
                    boxShadow: step === s.n ? '0 0 15px rgba(255,90,31,0.25)' : 'none',
                  }}
                >
                  {step > s.n ? <Check size={12} /> : s.n}
                </div>
                <span className="text-[11px] font-bold" style={{ color: step === s.n ? '#111827' : '#64748B' }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="h-1 rounded-full mb-8 overflow-hidden bg-slate-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%`, background: '#FF5A1F' }}
            />
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in text-left">
              <Input
                label="Nome do Restaurante"
                placeholder="Ex: Pizzaria do João"
                leftIcon={Building2}
                value={form.restaurantName}
                onChange={handleChange('restaurantName')}
                error={errors.restaurantName}
                required
                id="reg-restaurant-name"
              />

              <Input
                label="WhatsApp"
                placeholder="(11) 99999-9999"
                leftIcon={Phone}
                type="tel"
                value={form.whatsapp}
                onChange={handleChange('whatsapp')}
                error={errors.whatsapp}
                required
                id="reg-whatsapp"
              />

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Input
                    label="Cidade"
                    placeholder="São Paulo"
                    leftIcon={MapPin}
                    value={form.city}
                    onChange={handleChange('city')}
                    error={errors.city}
                    id="reg-city"
                  />
                </div>
                <div>
                  <Input
                    label="Estado"
                    placeholder="SP"
                    value={form.state}
                    maxLength={2}
                    onChange={handleChange('state')}
                    error={errors.state}
                    id="reg-state"
                  />
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                rightIcon={ArrowRight}
                onClick={handleNext}
                id="reg-next"
                className="mt-6 py-3.5 bg-[#FF5A1F] font-bold"
              >
                Próximo passo
              </Button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in text-left">
              <Input
                label="Nome do Responsável"
                placeholder="João Silva"
                leftIcon={User}
                value={form.adminName}
                onChange={handleChange('adminName')}
                error={errors.adminName}
                required
                id="reg-admin-name"
              />

              <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                leftIcon={Mail}
                value={form.email}
                onChange={handleChange('email')}
                error={errors.email}
                required
                id="reg-email"
              />

              <Input
                label="Senha"
                type="password"
                placeholder="Mínimo 6 caracteres"
                leftIcon={Lock}
                value={form.password}
                onChange={handleChange('password')}
                error={errors.password}
                required
                id="reg-password"
              />

              <Input
                label="Confirmar Senha"
                type="password"
                placeholder="Repita a senha"
                leftIcon={Lock}
                value={form.confirmPassword}
                onChange={handleChange('confirmPassword')}
                error={errors.confirmPassword}
                required
                id="reg-confirm-password"
              />

              <div className="flex gap-3 pt-4">
                <Button
                  variant="ghost"
                  size="lg"
                  leftIcon={ArrowLeft}
                  onClick={() => setStep(1)}
                  type="button"
                  id="reg-back"
                  className="font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl"
                >
                  Voltar
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  rightIcon={ArrowRight}
                  type="submit"
                  id="reg-submit"
                  className="bg-[#FF5A1F] font-bold"
                >
                  Criar Conta Grátis
                </Button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-slate-500 text-xs mt-8">
          Ao criar sua conta, você concorda com nossos{' '}
          <a href="#" className="hover:text-slate-900 font-semibold transition-colors">Termos de Uso</a>
          {' '}e{' '}
          <a href="#" className="hover:text-slate-900 font-semibold transition-colors">Política de Privacidade</a>
        </p>
      </div>
    </div>
  )
}

