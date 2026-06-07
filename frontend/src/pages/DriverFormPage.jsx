import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, Bike, Mail, User, Phone, CheckSquare } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { drivers as driversApi } from '../services/api'
import toast from 'react-hot-toast'

export default function DriverFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditMode = !!id

  const [loading, setLoading] = useState(isEditMode)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    vehicle_type: 'motorcycle',
    vehicle_model: '',
    license_plate: '',
    is_active: true,
  })

  useEffect(() => {
    if (isEditMode) {
      const loadDriver = async () => {
        try {
          const res = await driversApi.get(id)
          if (res.success && res.data) {
            const d = res.data
            setForm({
              name: d.name || '',
              email: d.email || '',
              phone: d.phone || '',
              vehicle_type: d.vehicle_type || 'motorcycle',
              vehicle_model: d.vehicle_model || '',
              license_plate: d.license_plate || '',
              is_active: d.is_active === 1,
            })
          } else {
            toast.error('Entregador não localizado.')
            navigate('/dashboard/entregadores')
          }
        } catch (err) {
          console.error(err)
          toast.error('Erro ao carregar dados do entregador.')
          navigate('/dashboard/entregadores')
        } finally {
          setLoading(false)
        }
      }
      loadDriver()
    }
  }, [id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Nome do entregador é obrigatório.')
      return
    }
    if (!form.phone.trim()) {
      toast.error('Telefone do entregador é obrigatório.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...form,
        is_active: form.is_active ? 1 : 0
      }

      if (isEditMode) {
        const res = await driversApi.update(id, payload)
        if (res.success) {
          toast.success('Entregador atualizado com sucesso! 📝')
          navigate('/dashboard/entregadores')
        }
      } else {
        const res = await driversApi.create(payload)
        if (res.success) {
          toast.success('Entregador cadastrado com sucesso! 🛵')
          navigate('/dashboard/entregadores')
        }
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Erro ao salvar entregador.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#FF6B35]" size={32} />
          <p className="text-[#a991c7] text-sm">Carregando dados do entregador...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-left max-w-3xl mx-auto">
      
      {/* Navigation & Title */}
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard/entregadores"
          className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-white">
            {isEditMode ? 'Editar Entregador' : 'Novo Entregador'}
          </h2>
          <p className="text-[#a991c7] text-xs mt-0.5">
            {isEditMode ? 'Atualize as informações cadastrais do entregador' : 'Cadastre um novo entregador na frota do estabelecimento'}
          </p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Nome */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-gray-300">Nome Completo *</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Lucas Moreira"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FF6B35] focus:bg-white/10"
                />
              </div>
            </div>

            {/* Telefone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-300">Telefone / WhatsApp *</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Ex: (11) 99999-9999"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FF6B35] focus:bg-white/10"
                />
              </div>
            </div>

            {/* E-mail */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-300">E-mail (Para vincular login de entregador)</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Ex: entregador@email.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FF6B35] focus:bg-white/10"
                />
              </div>
            </div>

            {/* Tipo de Veículo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-300">Tipo de Veículo</label>
              <select
                value={form.vehicle_type}
                onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
                className="w-full bg-[#1A0533] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FF6B35] focus:bg-white/10"
              >
                <option value="motorcycle">Moto 🛵</option>
                <option value="bicycle">Bicicleta 🚲</option>
                <option value="car">Carro 🚗</option>
                <option value="van">Van 🚐</option>
                <option value="on_foot">A pé 🚶</option>
              </select>
            </div>

            {/* Modelo do Veículo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-300">Modelo do Veículo</label>
              <div className="relative">
                <Bike size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={form.vehicle_model}
                  onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })}
                  placeholder="Ex: Honda CG 160 Fan Preta"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FF6B35] focus:bg-white/10"
                />
              </div>
            </div>

            {/* Placa do Veículo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-300">Placa do Veículo</label>
              <input
                type="text"
                value={form.license_plate}
                onChange={(e) => setForm({ ...form, license_plate: e.target.value })}
                placeholder="Ex: ABC1D23"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FF6B35] focus:bg-white/10 uppercase"
              />
            </div>

            {/* Status (Ativo/Inativo) */}
            <div className="flex items-center gap-2.5 pt-6">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-white/10 bg-white/5 text-[#FF6B35] focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="is_active" className="text-xs font-bold text-gray-300 cursor-pointer select-none">
                Entregador Ativo no Sistema (Liberado para trabalhar)
              </label>
            </div>

          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-5 border-t border-white/5">
            <Link to="/dashboard/entregadores">
              <Button type="button" variant="ghost" size="md">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" variant="primary" size="md" loading={submitting} leftIcon={Save}>
              Salvar Entregador
            </Button>
          </div>
        </form>
      </Card>

    </div>
  )
}
