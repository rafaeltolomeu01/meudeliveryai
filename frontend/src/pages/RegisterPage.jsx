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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6" style={{ background: '#1A0533' }}>
      {/* Background blobs */}
      <div style={{ position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,53,0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div style={{ background: 'linear-gradient(135deg, #FF6B35, #e84e15)', boxShadow: '0 0 20px rgba(255,107,53,0.4)' }} className="w-10 h-10 rounded-xl flex items-center justify-center">
            <Zap size={20} color="white" />
          </div>
          <span className="text-white font-bold text-2xl">MeuDelivery<span style={{ background: 'linear-gradient(135deg, #FF6B35, #ff9a70)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI</span></span>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(42,15,74,0.5)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '32px' }}>
          {/* Header */}
          <div className="text-center mb-8">
            {selectedPlan && (
              <div className="mb-4">
                <span className="text-[#22c55e] font-semibold text-xs bg-[#22c55e]/10 px-3 py-1 rounded-full border border-[#22c55e]/20 uppercase tracking-wider">
                  Plano Selecionado: {selectedPlan}
                </span>
              </div>
            )}
            <h1 className="text-2xl font-extrabold text-white mb-1">Crie sua conta grátis</h1>
            <p className="text-[#a991c7] text-sm">
              Já tem conta?{' '}
              <Link to="/login" className="text-[#FF6B35] hover:underline font-medium">Entrar</Link>
            </p>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3 mb-8">
            {steps.map((s) => (
              <div key={s.n} className="flex-1 flex flex-col items-center gap-1.5 relative">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 z-10"
                  style={{
                    background: step > s.n ? 'linear-gradient(135deg, #22c55e, #16a34a)' : step === s.n ? 'linear-gradient(135deg, #FF6B35, #e84e15)' : 'rgba(255,255,255,0.05)',
                    border: step >= s.n ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    color: step >= s.n ? 'white' : '#6b5880',
                    boxShadow: step === s.n ? '0 0 20px rgba(255,107,53,0.4)' : 'none',
                  }}
                >
                  {step > s.n ? <Check size={14} /> : s.n}
                </div>
                <span className="text-xs font-medium" style={{ color: step >= s.n ? '#d4bfee' : '#6b5880' }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="h-1 rounded-full mb-8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%`, background: 'linear-gradient(90deg, #FF6B35, #e84e15)' }}
            />
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
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

              <Button variant="primary" size="lg" fullWidth rightIcon={ArrowRight} onClick={handleNext} id="reg-next">
                Próximo passo
              </Button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
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

              <div className="flex gap-3 pt-2">
                <Button variant="ghost" size="lg" leftIcon={ArrowLeft} onClick={() => setStep(1)} type="button" id="reg-back">
                  Voltar
                </Button>
                <Button variant="primary" size="lg" fullWidth loading={loading} rightIcon={ArrowRight} type="submit" id="reg-submit">
                  Criar Conta Grátis
                </Button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-[#6b5880] text-xs mt-6">
          Ao criar sua conta, você concorda com nossos{' '}
          <a href="#" className="text-[#a991c7] hover:underline">Termos de Uso</a>
          {' '}e{' '}
          <a href="#" className="text-[#a991c7] hover:underline">Política de Privacidade</a>
        </p>
      </div>
    </div>
  )
}
