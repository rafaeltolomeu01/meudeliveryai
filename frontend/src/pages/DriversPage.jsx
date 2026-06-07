import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Star, ToggleLeft, ToggleRight, Phone, Bike, Package, Edit2, Search, Power, Trash2 } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import { formatCurrency } from '../utils/helpers'
import { drivers as driversApi } from '../services/api'
import toast from 'react-hot-toast'

const avatarColors = [
  'from-[#FF6B35] to-[#e84e15]',
  'from-purple-500 to-purple-700',
  'from-blue-500 to-blue-700',
  'from-green-500 to-green-700',
  'from-pink-500 to-pink-700',
]

const vehicleTypeLabels = {
  bicycle: 'Bicicleta 🚲',
  motorcycle: 'Moto 🛵',
  car: 'Carro 🚗',
  van: 'Van 🚐',
  on_foot: 'A pé 🚶',
}

export default function DriversPage() {
  const navigate = useNavigate()
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadDriversList = async () => {
    try {
      setLoading(true)
      const res = await driversApi.list()
      if (res.success && res.data) {
        setDrivers(res.data)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar lista de entregadores.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDriversList()
  }, [])

  // Toggle is_active (Ativar/Inativar)
  const toggleActiveStatus = async (driver) => {
    try {
      const newStatus = driver.is_active === 1 ? 0 : 1
      const res = await driversApi.update(driver.id, { is_active: newStatus })
      if (res.success) {
        toast.success(newStatus ? 'Entregador ativado! 🟢' : 'Entregador inativado! 🔴')
        setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, is_active: newStatus } : d))
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao alterar status do entregador.')
    }
  }

  // Toggle availability (Online/Offline)
  const toggleAvailabilityStatus = async (driver) => {
    try {
      const res = await driversApi.toggleAvailable(driver.id)
      if (res.success) {
        const isOnlineNow = res.data.is_available
        toast.success(isOnlineNow ? 'Entregador agora está disponível! 🛵' : 'Entregador indisponível.')
        setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, is_available: isOnlineNow ? 1 : 0 } : d))
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao alterar disponibilidade.')
    }
  }

  // Deletar entregador (Soft delete ou inativação completa)
  const handleDeleteDriver = async (id) => {
    if (!window.confirm('Deseja realmente inativar definitivamente este entregador?')) return
    try {
      const res = await driversApi.delete(id)
      if (res.success) {
        toast.success('Entregador removido/desativado com sucesso.')
        loadDriversList()
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir entregador.')
    }
  }

  // Filtragem local por nome ou telefone
  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.phone || '').includes(search)
  )

  const activeDrivers = drivers.filter(d => d.is_active === 1)
  const availableDrivers = drivers.filter(d => d.is_active === 1 && d.is_available === 1)
  const offlineDrivers = drivers.filter(d => d.is_active === 1 && d.is_available === 0)

  return (
    <div className="space-y-6 text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Entregadores</h2>
          <p className="text-[#a991c7] text-sm">
            <span className="text-green-400 font-bold">{availableDrivers.length} disponíveis</span>
            {' · '}
            <span className="text-[#6b5880] font-semibold">{offlineDrivers.length} offline</span>
          </p>
        </div>
        <Button variant="primary" size="md" leftIcon={Plus} onClick={() => navigate('/dashboard/entregadores/novo')}>
          Novo Entregador
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Cadastrado', value: drivers.length, emoji: '🏍️' },
          { label: 'Disponíveis Agora', value: availableDrivers.length, emoji: '✅' },
          { label: 'Entregas Totais', value: drivers.reduce((s, d) => s + (d.total_deliveries || 0), 0), emoji: '📦' },
          { label: 'Ganhos Acumulados', value: formatCurrency(drivers.reduce((s, d) => s + parseFloat(d.total_earned || 0), 0)), emoji: '💰' },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-3xl p-5 border border-white/[0.06] bg-[#220d3a]/40 shadow-md">
            <div className="text-2xl mb-1.5">{stat.emoji}</div>
            <p className="text-white font-black text-lg sm:text-xl tracking-tight">{stat.value}</p>
            <p className="text-[#6b5880] text-xs font-semibold mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b5880]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone do entregador..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#6b5880] focus:outline-none focus:border-[#FF6B35]/50 focus:bg-white/10"
        />
      </div>

      {/* Drivers List */}
      {loading && drivers.length === 0 ? (
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-[#FF6B35]" size={32} />
            <p className="text-[#a991c7] text-sm">Carregando lista de entregadores...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrivers.map((driver, i) => (
            <div
              key={driver.id}
              className={`glass rounded-3xl border border-white/[0.06] card-hover p-5 relative overflow-hidden flex flex-col justify-between ${
                driver.is_active === 0 ? 'opacity-60 bg-red-950/5 border-red-500/10' : 'bg-[#220d3a]/30'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white font-black text-base shadow-md`}>
                        {driver.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <span className="absolute -bottom-1.5 -right-1.5 text-base">
                        {driver.vehicle_type === 'bicycle' ? '🚲' : driver.vehicle_type === 'car' ? '🚗' : '🛵'}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-extrabold text-sm leading-snug">{driver.name}</p>
                      <p className="text-[#6b5880] text-xs font-semibold mt-0.5">
                        {vehicleTypeLabels[driver.vehicle_type] || driver.vehicle_type}
                        {driver.vehicle_model ? ` (${driver.vehicle_model})` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Options Menu */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => navigate(`/dashboard/entregadores/editar/${driver.id}`)}
                      className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all"
                      title="Editar Entregador"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteDriver(driver.id)}
                      className="p-1.5 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-all"
                      title="Excluir Entregador"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Info Fields */}
                <div className="space-y-2.5 text-xs border-t border-white/5 pt-3 mb-4 leading-relaxed text-gray-300">
                  <div className="flex justify-between">
                    <span className="text-[#6b5880] font-semibold">Telefone</span>
                    <span className="text-white font-bold">{driver.phone || 'Não informado'}</span>
                  </div>
                  {driver.license_plate && (
                    <div className="flex justify-between">
                      <span className="text-[#6b5880] font-semibold">Placa</span>
                      <span className="text-white font-bold uppercase">{driver.license_plate}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#6b5880] font-semibold">Status Sistema</span>
                    <Badge color={driver.is_active === 1 ? 'green' : 'red'} size="sm">
                      {driver.is_active === 1 ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  {[
                    { label: 'Entregas', value: driver.total_deliveries || 0, icon: Package },
                    { label: 'Ganhos', value: formatCurrency(driver.total_earned || 0), icon: Bike },
                    { label: 'Avaliação', value: driver.rating ? `${parseFloat(driver.rating).toFixed(1)} ★` : 'N/A', icon: Star },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-2 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <p className="text-white font-black text-xs leading-none">{value}</p>
                      <p className="text-[#6b5880] text-[9px] font-bold uppercase tracking-wider mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Switchers */}
              {driver.is_active === 1 && (
                <div className="flex gap-2 border-t border-white/5 pt-3.5 mt-2">
                  
                  {/* Disponibilidade Online */}
                  <button
                    onClick={() => toggleAvailabilityStatus(driver)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                      driver.is_available === 1
                        ? 'bg-green-600/10 border-green-500/20 text-green-400 hover:bg-green-600/20'
                        : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <Power size={13} />
                    {driver.is_available === 1 ? 'Disponível' : 'Indisponível'}
                  </button>

                  {/* Ativar/Inativar (status) */}
                  <button
                    onClick={() => toggleActiveStatus(driver)}
                    className="px-3 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all"
                    title="Inativar Entregador"
                  >
                    Inativar
                  </button>
                </div>
              )}

              {driver.is_active === 0 && (
                <div className="border-t border-white/5 pt-3.5 mt-2">
                  <button
                    onClick={() => toggleActiveStatus(driver)}
                    className="w-full py-2 bg-green-600/10 hover:bg-green-600/20 border border-green-500/20 text-green-400 rounded-xl text-xs font-bold transition-all"
                  >
                    Ativar Entregador
                  </button>
                </div>
              )}

            </div>
          ))}
        </div>
      )}

      {filteredDrivers.length === 0 && !loading && (
        <div className="text-center py-16 text-[#6b5880]">
          <p className="text-5xl mb-3">🔍</p>
          <p className="text-sm font-bold">Nenhum entregador cadastrado ou encontrado.</p>
        </div>
      )}

    </div>
  )
}
