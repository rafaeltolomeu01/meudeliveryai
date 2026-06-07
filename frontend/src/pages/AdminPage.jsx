import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Building2, Users, CreditCard, Shield, Search, Plus, 
  ShieldCheck, Ban, Power, RefreshCw, AlertTriangle
} from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { useAuth } from '../contexts/AuthContext'
import { admin as adminApi } from '../services/api'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchRestaurants = async () => {
    try {
      setLoading(true)
      const res = await adminApi.listRestaurants({
        search: searchTerm,
        status: statusFilter
      })
      if (res.success) {
        setRestaurants(res.data)
      }
    } catch (err) {
      toast.error(err.message || 'Erro ao carregar restaurantes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRestaurants()
  }, [statusFilter]) // Refetches when status filter changes

  // Perform search on Enter or clicking search
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchRestaurants()
  }

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active'
    const confirmMessage = currentStatus === 'active' 
      ? 'Tem certeza que deseja BLOQUEAR este restaurante? O painel e as vendas dele serão suspensos.' 
      : 'Tem certeza que deseja ATIVAR este restaurante?'
    
    if (!window.confirm(confirmMessage)) return

    try {
      setActionLoading(true)
      const res = await adminApi.updateStatus(id, newStatus)
      if (res.success) {
        toast.success(res.message || 'Status atualizado com sucesso!')
        fetchRestaurants()
      }
    } catch (err) {
      toast.error(err.message || 'Erro ao atualizar status.')
    } finally {
      setActionLoading(false)
    }
  }

  // Calculate statistics from the full list (or list loaded)
  const stats = {
    total: restaurants.length,
    active: restaurants.filter(r => r.status === 'active').length,
    blocked: restaurants.filter(r => r.status === 'blocked').length,
    inactive: restaurants.filter(r => r.status === 'inactive').length,
  }

  return (
    <div className="min-h-screen bg-[#1A0533] text-white p-4 sm:p-8 font-inter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-white/[0.06] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#e84e15] flex items-center justify-center shadow-[0_0_20px_rgba(255,107,53,0.4)]">
            <ShieldCheck size={22} color="white" />
          </div>
          <div className="text-left">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Painel Admin Geral</h1>
            <p className="text-[#a991c7] text-xs sm:text-sm">Olá, {user?.name || 'Administrador'} — Controle Global SaaS</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={fetchRestaurants} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button variant="danger" size="sm" onClick={() => { logout(); navigate('/login') }}>
            Sair
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          { title: 'Total de Restaurantes', val: stats.total, icon: Building2, color: 'blue' },
          { title: 'Restaurantes Ativos', val: stats.active, icon: ShieldCheck, color: 'green' },
          { title: 'Restaurantes Bloqueados', val: stats.blocked, icon: Ban, color: 'red' },
          { title: 'Restaurantes Inativos', val: stats.inactive, icon: AlertTriangle, color: 'yellow' },
        ].map((s) => (
          <div key={s.title} className="glass rounded-2xl p-5 border border-white/[0.06] flex items-center justify-between card-hover text-left">
            <div className="space-y-1">
              <span className="text-[#a991c7] text-xs font-semibold uppercase tracking-wider">{s.title}</span>
              <p className="text-3xl font-black text-white">{s.val}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <s.icon size={20} className="text-[#FF6B35]" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Table */}
      <Card
        title="Restaurantes Cadastrados"
        subtitle="Gerenciamento de tenants, planos de assinatura e status"
        action={
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Status Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#1e0a38] text-white border border-white/[0.08] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#FF6B35] transition-all"
            >
              <option value="">Todos os Status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
              <option value="blocked">Bloqueados</option>
            </select>
            
            {/* Search Input */}
            <div className="w-48 sm:w-64 flex gap-2">
              <Input
                placeholder="Buscar por nome..."
                leftIcon={Search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                containerClassName="!mb-0"
              />
              <Button type="submit" variant="primary" size="md" disabled={loading}>
                Buscar
              </Button>
            </div>
          </form>
        }
      >
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-white">
            <Loader2 className="animate-spin text-[#FF6B35] mb-2" size={32} />
            <p className="text-[#a991c7] text-xs">Carregando estabelecimentos...</p>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="py-20 text-center text-[#a991c7] text-sm">
            Nenhum restaurante cadastrado ou encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs font-semibold text-[#a991c7] uppercase">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Restaurante</th>
                  <th className="px-6 py-4">Responsável</th>
                  <th className="px-6 py-4">Plano</th>
                  <th className="px-6 py-4">Vencimento Assinatura</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-left">
                {restaurants.map((r) => {
                  const isBlocked = r.status === 'blocked'
                  const isExpired = r.due_date && new Date(r.due_date) < new Date()
                  
                  return (
                    <tr key={r.id} className="text-sm hover:bg-white/[0.02] transition-all">
                      <td className="px-6 py-4 font-semibold text-[#a991c7]">#{r.id}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-white">{r.name}</p>
                          <p className="text-xs text-[#a991c7]">{r.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#d4bfee]">{r.owner_name || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <Badge color={r.plan_name === 'Enterprise' ? 'purple' : r.plan_name === 'Pro' ? 'orange' : 'gray'}>
                          {r.plan_name || 'Starter'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className={isExpired ? 'text-red-400 font-medium' : 'text-[#a991c7]'}>
                          {r.due_date ? new Date(r.due_date).toLocaleDateString('pt-BR') : 'Sem Vencimento'}
                        </span>
                        {isExpired && (
                          <span className="ml-1.5 text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-medium">
                            Vencida
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge color={r.status === 'active' ? 'green' : r.status === 'blocked' ? 'red' : 'yellow'}>
                          {r.status === 'active' ? 'Ativo' : r.status === 'blocked' ? 'Bloqueado' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => navigate(`/admin/restaurantes/${r.id}`)}
                        >
                          Gerenciar
                        </Button>
                        <Button
                          variant={isBlocked ? 'success' : 'danger'}
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => handleToggleStatus(r.id, r.status)}
                        >
                          {isBlocked ? <Power size={14} className="mr-1 inline" /> : <Ban size={14} className="mr-1 inline" />}
                          {isBlocked ? 'Ativar' : 'Bloquear'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
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
