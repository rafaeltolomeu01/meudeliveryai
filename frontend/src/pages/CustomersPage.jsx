import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Search, Plus, Eye, ShoppingBag, DollarSign, ChevronRight, Edit2, Loader2, X, MapPin, User, Mail, Phone, FileText, Check } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { formatCurrency, formatDate, getInitials } from '../utils/helpers'
import { customers as customersApi } from '../services/api'
import toast from 'react-hot-toast'

const avatarColors = [
  'from-[#FF5A1F] to-[#e84e15]',
  'from-violet-500 to-violet-700',
  'from-blue-500 to-blue-700',
  'from-emerald-500 to-emerald-700',
  'from-pink-500 to-pink-700',
]

const orderStatusColors = {
  pending: 'yellow',
  confirmed: 'blue',
  preparing: 'orange',
  ready: 'purple',
  out_for_delivery: 'cyan',
  delivered: 'green',
  picked_up: 'green',
  cancelled: 'red',
}

const orderStatusLabels = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Pronto',
  out_for_delivery: 'Em Rota',
  delivered: 'Entregue',
  picked_up: 'Retirado',
  cancelled: 'Cancelado',
}

export default function CustomersPage() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  
  // Histórico de pedidos do cliente selecionado
  const [ordersHistory, setOrdersHistory] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  // Modais de Criação / Edição
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    address_number: '',
    neighborhood: '',
    complement: '',
    city: '',
    state: '',
    zip_code: '',
    notes: '',
  })

  // Carregar lista de clientes
  const loadCustomers = async () => {
    try {
      setLoading(true)
      const res = await customersApi.list({ search, limit: 100 })
      if (res.success && res.data) {
        setCustomers(res.data)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao buscar clientes.')
    } finally {
      setLoading(false)
    }
  }

  // Monitorar busca com delay simples
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadCustomers()
    }, 400)
    return () => clearTimeout(delayDebounce)
  }, [search])

  // Carregar histórico de pedidos do cliente selecionado
  const loadOrdersHistory = async (customerId) => {
    try {
      setLoadingOrders(true)
      const res = await customersApi.orders(customerId)
      if (res.success && res.data) {
        setOrdersHistory(res.data)
      }
    } catch (err) {
      console.error('Erro ao buscar histórico de pedidos:', err)
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    if (selected) {
      loadOrdersHistory(selected.id)
    } else {
      setOrdersHistory([])
    }
  }, [selected])

  // Abrir formulário para Criar
  const handleOpenCreate = () => {
    setIsEditMode(false)
    setForm({
      name: '',
      email: '',
      phone: '',
      address: '',
      address_number: '',
      neighborhood: '',
      complement: '',
      city: '',
      state: '',
      zip_code: '',
      notes: '',
    })
    setFormModalOpen(true)
  }

  // Abrir formulário para Editar
  const handleOpenEdit = (customer) => {
    setIsEditMode(true)
    setForm({
      id: customer.id,
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      address_number: customer.address_number || '',
      neighborhood: customer.neighborhood || '',
      complement: customer.complement || '',
      city: customer.city || '',
      state: customer.state || '',
      zip_code: customer.zip_code || '',
      notes: customer.notes || '',
    })
    setSelected(null) // Fecha modal de detalhes para focar no de edição
    setFormModalOpen(true)
  }

  // Salvar formulário (Create ou Update)
  const handleSaveCustomer = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('O nome do cliente é obrigatório.')
      return
    }

    setSubmitting(true)
    try {
      if (isEditMode) {
        const res = await customersApi.update(form.id, form)
        if (res.success) {
          toast.success('Cadastro do cliente atualizado! 📝')
          setFormModalOpen(false)
          loadCustomers()
        }
      } else {
        const res = await customersApi.create(form)
        if (res.success) {
          toast.success('Cliente cadastrado com sucesso! 👥')
          setFormModalOpen(false)
          loadCustomers()
        }
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Erro ao salvar cliente.')
    } finally {
      setSubmitting(false)
    }
  }

  // Estatísticas calculadas dinamicamente
  const totalCustomers = customers.length
  const totalSpentAll = customers.reduce((sum, c) => sum + parseFloat(c.total_spent || 0), 0)
  const totalOrdersAll = customers.reduce((sum, c) => sum + parseInt(c.total_orders || 0, 10), 0)
  const avgOrders = totalCustomers > 0 ? (totalOrdersAll / totalCustomers).toFixed(1) : '0'
  const topCustomer = [...customers].sort((a, b) => parseFloat(b.total_spent || 0) - parseFloat(a.total_spent || 0))[0]

  return (
    <div className="space-y-6 text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#111827] tracking-tight">Clientes</h2>
          <p className="text-[#64748B] text-sm">{totalCustomers} clientes ativos no painel</p>
        </div>
        <Button variant="primary" size="md" leftIcon={Plus} onClick={handleOpenCreate} className="shadow-[0_4px_12px_rgba(255,90,31,0.2)]">
          Novo Cliente
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Clientes Cadastrados', value: totalCustomers, icon: '👥', tone: 'purple' },
          { label: 'Faturamento Clientes', value: formatCurrency(totalSpentAll), icon: '💰', tone: 'green' },
          { label: 'Média de Pedidos', value: `${avgOrders} / cli`, icon: '📦', tone: 'orange' },
          { label: 'Top Cliente', value: topCustomer ? topCustomer.name.split(' ')[0] : 'Nenhum', icon: '⭐', tone: 'amber' },
        ].map((stat) => {
          const tones = {
            orange: 'bg-orange-50 text-[#FF5A1F]',
            green: 'bg-emerald-50 text-emerald-600',
            amber: 'bg-amber-50 text-amber-600',
            purple: 'bg-violet-50 text-violet-600'
          }
          return (
            <div key={stat.label} className="bg-white rounded-3xl p-5 border border-[#E5E7EB] shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 flex items-center justify-between gap-4">
              <div>
                <span className="text-[#64748B] text-xs font-bold uppercase tracking-wider">{stat.label}</span>
                <p className="text-2xl font-black text-[#111827] mt-2 tracking-tight">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${tones[stat.tone]}`}>
                {stat.icon}
              </div>
            </div>
          )
        })}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone do cliente..."
          className="w-full bg-white border border-[#E5E7EB] rounded-2xl pl-12 pr-4 py-3 text-sm text-[#111827] placeholder-[#64748B] focus:outline-none focus:border-[#FF5A1F]/50 focus:ring-1 focus:ring-[#FF5A1F]/30"
        />
      </div>

      {/* Customers List Table */}
      {loading && customers.length === 0 ? (
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-[#FF5A1F]" size={32} />
            <p className="text-[#64748B] text-sm font-medium">Carregando lista de clientes...</p>
          </div>
        </div>
      ) : (
        <Card noPad className="border border-[#E5E7EB] shadow-sm overflow-hidden bg-white rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F8FAFC]">
                  {['Cliente', 'Telefone', 'Endereço Principal', 'Pedidos', 'Total Gasto', 'Último Pedido', ''].map((h) => (
                    <th key={h} className="text-left px-6 py-4 text-[#64748B] text-xs font-bold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {customers.map((customer, i) => (
                  <tr key={customer.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-sm`}>
                          {getInitials(customer.name)}
                        </div>
                        <div>
                          <p className="text-[#111827] text-sm font-bold leading-none">{customer.name}</p>
                          {customer.email && <p className="text-[#64748B] text-[10px] mt-1.5 font-medium">{customer.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#111827] text-xs font-semibold">{customer.phone || 'Não informado'}</td>
                    <td className="px-6 py-4">
                      {customer.address ? (
                        <div className="text-xs text-[#4B5563]">
                          <p className="font-semibold text-[#111827]">{customer.address}, N° {customer.address_number || 'S/N'}</p>
                          <p className="text-[#64748B] mt-1 font-medium">{customer.neighborhood} — {customer.city || ''}/{customer.state || ''}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-[#64748B] italic">Nenhum endereço cadastrado</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag size={14} className="text-[#FF5A1F]" />
                        <span className="text-[#111827] text-sm font-bold">{customer.total_orders}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#FF5A1F] font-black text-sm">{formatCurrency(customer.total_spent)}</span>
                    </td>
                    <td className="px-6 py-4 text-[#64748B] text-xs font-semibold">
                      {customer.last_order_at ? formatDate(customer.last_order_at) : 'Nunca comprou'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setSelected(customer)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-[#4B5563] hover:text-[#111827] rounded-xl transition-all"
                          title="Visualizar Histórico"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(customer)}
                          className="p-2 bg-slate-100 hover:bg-[#FF5A1F]/10 text-[#4B5563] hover:text-[#FF5A1F] rounded-xl transition-all"
                          title="Editar Cadastro"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {customers.length === 0 && (
              <div className="text-center py-16 text-[#64748B]">
                <p className="text-5xl mb-3">🔍</p>
                <p className="text-sm font-bold">Nenhum cliente cadastrado com esses parâmetros.</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Customer Detail & Orders History Modal */}
      {selected && (
        <Modal
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          title={`Ficha do Cliente: ${selected.name}`}
          size="md"
        >
          <div className="space-y-6 text-left">
            
            {/* Header info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF5A1F] to-[#6D28D9] flex items-center justify-center text-white text-xl font-bold shadow-md">
                  {getInitials(selected.name)}
                </div>
                <div>
                  <h3 className="text-[#111827] text-lg font-extrabold">{selected.name}</h3>
                  <div className="flex flex-col gap-0.5 text-xs text-[#64748B] mt-1 font-medium">
                    <span className="flex items-center gap-1.5"><Phone size={12} className="text-[#64748B]" /> {selected.phone || 'Sem telefone'}</span>
                    {selected.email && <span className="flex items-center gap-1.5"><Mail size={12} className="text-[#64748B]" /> {selected.email}</span>}
                  </div>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={Edit2}
                onClick={() => handleOpenEdit(selected)}
              >
                Editar
              </Button>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Pedidos', value: selected.total_orders },
                { label: 'Total Gasto', value: formatCurrency(selected.total_spent) },
                { label: 'Ticket Médio', value: formatCurrency(selected.total_orders > 0 ? (selected.total_spent / selected.total_orders) : 0) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#F8FAFC] rounded-2xl p-3 border border-[#E5E7EB] text-center shadow-sm">
                  <p className="text-[#FF5A1F] font-black text-sm sm:text-base">{value}</p>
                  <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-wider mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Address & Notes */}
            <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E5E7EB] space-y-3.5 text-xs shadow-sm">
              <div>
                <span className="text-[#64748B] font-bold uppercase tracking-wider text-[10px] block mb-1">Endereço Principal</span>
                {selected.address ? (
                  <div className="flex gap-2">
                    <MapPin size={14} className="text-[#FF5A1F] shrink-0 mt-0.5" />
                    <div className="text-[#4B5563]">
                      <p className="font-semibold text-[#111827]">{selected.address}, N° {selected.address_number || 'S/N'}</p>
                      {selected.complement && <p className="text-[#64748B] font-medium mt-0.5">Compl/Ref: {selected.complement}</p>}
                      <p className="text-[#64748B] mt-0.5">{selected.neighborhood} — {selected.city}/{selected.state} — CEP: {selected.zip_code || 'S/CEP'}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[#64748B] italic pl-1">Endereço não cadastrado.</p>
                )}
              </div>

              {selected.notes && (
                <div className="border-t border-[#E5E7EB] pt-3.5">
                  <span className="text-[#64748B] font-bold uppercase tracking-wider text-[10px] block mb-1">Observações Internas</span>
                  <div className="flex gap-2">
                    <FileText size={14} className="text-[#6D28D9] shrink-0 mt-0.5" />
                    <p className="text-[#4B5563] italic font-medium">"{selected.notes}"</p>
                  </div>
                </div>
              )}
            </div>

            {/* Orders History List */}
            <div className="space-y-3">
              <span className="text-[#64748B] font-bold uppercase tracking-wider text-[10px] block">Histórico de Pedidos</span>
              {loadingOrders ? (
                <div className="py-8 flex justify-center items-center">
                  <Loader2 className="animate-spin text-[#FF5A1F]" size={20} />
                </div>
              ) : ordersHistory.length === 0 ? (
                <p className="text-xs text-[#64748B] italic py-4">Nenhum pedido localizado no sistema.</p>
              ) : (
                <div className="border border-[#E5E7EB] rounded-2xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-[#E5E7EB] no-scrollbar">
                  {ordersHistory.map((ord) => (
                    <div key={ord.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-[#F8FAFC]">
                      <div>
                        <Link 
                          to={`/dashboard/pedidos/${ord.id}`}
                          className="text-[#FF5A1F] font-black hover:underline"
                        >
                          {ord.order_number}
                        </Link>
                        <p className="text-[#64748B] text-[10px] mt-0.5 font-medium">{new Date(ord.created_at).toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge color={orderStatusColors[ord.status]} size="sm">
                          {orderStatusLabels[ord.status] || ord.status}
                        </Badge>
                        <span className="text-[#111827] font-bold">{formatCurrency(ord.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </Modal>
      )}

      {/* Create / Edit Form Modal */}
      {formModalOpen && (
        <Modal
          isOpen={formModalOpen}
          onClose={() => setFormModalOpen(false)}
          title={isEditMode ? 'Editar Cadastro do Cliente' : 'Cadastrar Novo Cliente'}
          size="md"
        >
          <form onSubmit={handleSaveCustomer} className="space-y-4 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Nome */}
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-xs font-bold text-[#4B5563]">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Maria Silva"
                  className="bg-white border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-xs text-[#111827] placeholder-gray-400 focus:outline-none focus:border-[#FF5A1F] focus:ring-1 focus:ring-[#FF5A1F]/30"
                />
              </div>

              {/* Telefone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#4B5563]">Telefone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Ex: (11) 99999-9999"
                  className="bg-white border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-xs text-[#111827] placeholder-gray-400 focus:outline-none focus:border-[#FF5A1F] focus:ring-1 focus:ring-[#FF5A1F]/30"
                />
              </div>

              {/* E-mail */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#4B5563]">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Ex: cliente@email.com"
                  className="bg-white border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-xs text-[#111827] placeholder-gray-400 focus:outline-none focus:border-[#FF5A1F] focus:ring-1 focus:ring-[#FF5A1F]/30"
                />
              </div>

              {/* Endereço */}
              <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                <label className="text-xs font-bold text-[#4B5563]">Endereço (Rua, Av.)</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Ex: Rua das Flores"
                  className="bg-white border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-xs text-[#111827] placeholder-gray-400 focus:outline-none focus:border-[#FF5A1F] focus:ring-1 focus:ring-[#FF5A1F]/30"
                />
              </div>

              {/* Número */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#4B5563]">Número</label>
                <input
                  type="text"
                  value={form.address_number}
                  onChange={(e) => setForm({ ...form, address_number: e.target.value })}
                  placeholder="Ex: 123"
                  className="bg-white border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-xs text-[#111827] placeholder-gray-400 focus:outline-none focus:border-[#FF5A1F] focus:ring-1 focus:ring-[#FF5A1F]/30"
                />
              </div>

              {/* Bairro */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#4B5563]">Bairro</label>
                <input
                  type="text"
                  value={form.neighborhood}
                  onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                  placeholder="Ex: Centro"
                  className="bg-white border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-xs text-[#111827] placeholder-gray-400 focus:outline-none focus:border-[#FF5A1F] focus:ring-1 focus:ring-[#FF5A1F]/30"
                />
              </div>

              {/* Complemento */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#4B5563]">Complemento / Ref</label>
                <input
                  type="text"
                  value={form.complement}
                  onChange={(e) => setForm({ ...form, complement: e.target.value })}
                  placeholder="Ex: Apto 101, fundos"
                  className="bg-white border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-xs text-[#111827] placeholder-gray-400 focus:outline-none focus:border-[#FF5A1F] focus:ring-1 focus:ring-[#FF5A1F]/30"
                />
              </div>

              {/* Cidade */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#4B5563]">Cidade</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Ex: São Paulo"
                  className="bg-white border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-xs text-[#111827] placeholder-gray-400 focus:outline-none focus:border-[#FF5A1F] focus:ring-1 focus:ring-[#FF5A1F]/30"
                />
              </div>

              {/* Estado */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#4B5563]">Estado (UF)</label>
                <input
                  type="text"
                  maxLength={2}
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                  placeholder="Ex: SP"
                  className="bg-white border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-xs text-[#111827] placeholder-gray-400 focus:outline-none focus:border-[#FF5A1F] focus:ring-1 focus:ring-[#FF5A1F]/30"
                />
              </div>

              {/* CEP */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#4B5563]">CEP</label>
                <input
                  type="text"
                  value={form.zip_code}
                  onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
                  placeholder="Ex: 01234-567"
                  className="bg-white border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-xs text-[#111827] placeholder-gray-400 focus:outline-none focus:border-[#FF5A1F] focus:ring-1 focus:ring-[#FF5A1F]/30"
                />
              </div>

              {/* Observações */}
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-xs font-bold text-[#4B5563]">Observações Internas (Alergias, restrições, etc.)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Ex: Cliente prefere sachê de maionese extra. Atenção para pedidos sem cebola."
                  rows={3}
                  className="w-full bg-white border border-[#D1D5DB] rounded-xl p-3 text-xs text-[#111827] placeholder-gray-400 focus:outline-none focus:border-[#FF5A1F] focus:ring-1 focus:ring-[#FF5A1F]/30 resize-none"
                />
              </div>

            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[#E5E7EB]">
              <Button type="button" variant="ghost" size="sm" onClick={() => setFormModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={submitting} className="shadow-[0_4px_12px_rgba(255,90,31,0.2)]">
                Salvar Cadastro
              </Button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  )
}
