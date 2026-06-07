import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Building2, Users, CreditCard, Shield, Calendar, 
  ArrowLeft, Save, Loader2, RefreshCw, ShoppingBag, UtensilsCrossed
} from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { admin as adminApi } from '../services/api'
import toast from 'react-hot-toast'

export default function AdminRestaurantDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [plans, setPlans] = useState([])
  
  // Loaded data
  const [restaurant, setRestaurant] = useState(null)
  const [stats, setStats] = useState(null)

  // Form states
  const [status, setStatus] = useState('active')
  const [planId, setPlanId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [subStatus, setSubStatus] = useState('active')

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Load plans
      const plansRes = await adminApi.listPlans()
      if (plansRes.success) {
        setPlans(plansRes.data)
      }

      // Load restaurant details & stats
      const res = await adminApi.getRestaurant(id)
      if (res.success) {
        const data = res.data.restaurant
        setRestaurant(data)
        setStats(res.data.stats)

        // Initialize form states
        setStatus(data.status || 'active')
        setPlanId(data.plan_id || '')
        setSubStatus(data.subscription_status || 'active')
        
        if (data.due_date) {
          // Format date as YYYY-MM-DD for input field
          const d = new Date(data.due_date)
          const formatted = d.toISOString().split('T')[0]
          setDueDate(formatted)
        } else {
          setDueDate('')
        }
      }
    } catch (err) {
      toast.error(err.message || 'Erro ao carregar dados do restaurante.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)

      // 1. Update status if changed
      if (status !== restaurant.status) {
        await adminApi.updateStatus(id, status)
      }

      // 2. Update subscription info
      await adminApi.updateSubscription(id, {
        plan_id: parseInt(planId),
        due_date: dueDate ? `${dueDate} 23:59:59` : null,
        status: subStatus
      })

      toast.success('Alterações salvas com sucesso!')
      fetchData() // Reload latest states
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar alterações.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-white min-h-screen bg-[#1A0533]">
        <Loader2 className="animate-spin text-[#FF6B35] mb-4" size={40} />
        <p className="text-[#a991c7] text-sm">Carregando detalhes do restaurante...</p>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="py-24 text-center text-white min-h-screen bg-[#1A0533]">
        <p className="text-red-400 font-semibold mb-4">Restaurante não encontrado.</p>
        <Button variant="secondary" onClick={() => navigate('/admin/restaurantes')}>
          <ArrowLeft size={16} className="mr-2" /> Voltar
        </Button>
      </div>
    )
  }

  const isExpired = restaurant.due_date && new Date(restaurant.due_date) < new Date()

  return (
    <div className="min-h-screen bg-[#1A0533] text-white p-4 sm:p-8 font-inter">
      {/* Back button & Title */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5 text-left">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/admin/restaurantes')}
            className="w-9 h-9 rounded-xl glass hover:bg-white/5 transition-colors flex items-center justify-center text-[#a991c7] hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold">{restaurant.name}</h1>
              <Badge color={restaurant.status === 'active' ? 'green' : restaurant.status === 'blocked' ? 'red' : 'yellow'}>
                {restaurant.status === 'active' ? 'Ativo' : restaurant.status === 'blocked' ? 'Bloqueado' : 'Inativo'}
              </Badge>
            </div>
            <p className="text-[#a991c7] text-xs sm:text-sm mt-0.5">Slug único: <span className="font-mono text-white bg-white/5 px-1.5 py-0.5 rounded">{restaurant.slug}</span></p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchData} disabled={saving}>
          <RefreshCw size={14} className={saving ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Usage Summary (Resumo de Uso) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 text-left">
        {[
          { title: 'Pedidos Efetuados', val: stats?.orders_count || 0, icon: ShoppingBag, desc: 'Total de vendas registradas' },
          { title: 'Usuários Cadastrados', val: stats?.users_count || 0, icon: Users, desc: 'Contas de equipe vinculadas' },
          { title: 'Produtos Cadastrados', val: stats?.products_count || 0, icon: UtensilsCrossed, desc: 'Itens no menu do restaurante' },
        ].map((s) => (
          <div key={s.title} className="glass rounded-2xl p-5 border border-white/[0.06] flex items-center justify-between card-hover">
            <div>
              <span className="text-[#a991c7] text-[10px] font-bold uppercase tracking-wider">{s.title}</span>
              <p className="text-3xl font-black text-white mt-1">{s.val}</p>
              <p className="text-[10px] text-gray-400 mt-1">{s.desc}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <s.icon size={20} className="text-[#FF6B35]" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* Form panel for Subscription & Status management */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave}>
            <Card title="Configurações Administrativas" subtitle="Altere o plano, vencimento de assinatura e status operacional">
              
              <div className="space-y-6">
                
                {/* Plano e Valor Mensal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Plano de Assinatura</label>
                    <select
                      value={planId}
                      onChange={(e) => setPlanId(e.target.value)}
                      required
                      className="w-full bg-[#1e0a38] text-white border border-white/[0.08] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B35] transition-all"
                    >
                      <option value="" disabled>Selecione um plano</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} — R$ {parseFloat(p.price_monthly).toFixed(2)}/mês
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Status da Assinatura</label>
                    <select
                      value={subStatus}
                      onChange={(e) => setSubStatus(e.target.value)}
                      required
                      className="w-full bg-[#1e0a38] text-white border border-white/[0.08] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B35] transition-all"
                    >
                      <option value="trial">Trial (Período de Testes)</option>
                      <option value="active">Active (Ativa)</option>
                      <option value="overdue">Overdue (Vencida)</option>
                      <option value="canceled">Canceled (Cancelada)</option>
                    </select>
                  </div>
                </div>

                {/* Data de Vencimento */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                    Data de Vencimento
                    {isExpired && (
                      <span className="ml-2 text-red-400 font-bold normal-case bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 text-[10px]">
                        Vencimento Expirado
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      placeholder="Escolha a data limite"
                      leftIcon={Calendar}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
                    O painel administrativo do restaurante e novas compras públicas serão bloqueados automaticamente caso a data configurada esteja no passado ou o status esteja como overdue/canceled.
                  </p>
                </div>

                {/* Status Geral do Restaurante */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Status Operacional do Restaurante</label>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { value: 'active', label: 'Ativo', desc: 'Acesso total e cardápio online' },
                      { value: 'inactive', label: 'Inativo', desc: 'Desativado operacionalmente' },
                      { value: 'blocked', label: 'Bloqueado', desc: 'Painel travado, cardápio offline' }
                    ].map(opt => (
                      <label 
                        key={opt.value}
                        className={`flex-1 min-w-[150px] p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                          status === opt.value
                            ? 'bg-[#FF6B35]/10 border-[#FF6B35] text-white'
                            : 'bg-[#1e0a38] border-white/[0.08] text-gray-400 hover:border-white/20'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="status"
                          value={opt.value}
                          checked={status === opt.value}
                          onChange={() => setStatus(opt.value)}
                          className="sr-only"
                        />
                        <span className="font-bold text-xs uppercase tracking-wide block">{opt.label}</span>
                        <span className="text-[9px] mt-1 text-gray-400 leading-normal">{opt.desc}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <div className="border-t border-white/5 pt-6 flex justify-end">
                  <Button 
                    type="submit" 
                    variant="primary" 
                    size="md" 
                    leftIcon={saving ? Loader2 : Save} 
                    disabled={saving}
                  >
                    {saving ? 'Salvando Alterações...' : 'Salvar Configurações'}
                  </Button>
                </div>

              </div>

            </Card>
          </form>
        </div>

        {/* Informações Cadastrais */}
        <div className="space-y-6">
          <Card title="Dados do Estabelecimento" subtitle="Ficha de cadastro principal">
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-gray-500 font-semibold uppercase block">Responsável</span>
                <span className="text-white font-medium block mt-0.5">{restaurant.owner_name || 'Não cadastrado'}</span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold uppercase block">E-mail de Contato</span>
                <span className="text-white font-medium block mt-0.5">{restaurant.email}</span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold uppercase block">Telefone</span>
                <span className="text-white font-medium block mt-0.5">{restaurant.phone || 'Não cadastrado'}</span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold uppercase block">CNPJ / CPF</span>
                <span className="text-white font-medium block mt-0.5">{restaurant.document || 'Não cadastrado'}</span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold uppercase block">Cidade / Estado</span>
                <span className="text-white font-medium block mt-0.5">
                  {restaurant.city ? `${restaurant.city} - ${restaurant.state || 'SP'}` : 'Não cadastrado'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold uppercase block">Data de Cadastro</span>
                <span className="text-white font-medium block mt-0.5">
                  {restaurant.created_at ? new Date(restaurant.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                </span>
              </div>
            </div>
          </Card>
        </div>

      </div>

    </div>
  )
}
