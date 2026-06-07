import { useState, useEffect, useCallback } from 'react'
import { Calendar, DollarSign, ShoppingBag, TrendingUp, XCircle, Users, Loader2 } from 'lucide-react'
import Card from '../components/ui/Card'
import { formatCurrency } from '../utils/helpers'
import { reports as reportsApi } from '../services/api'
import toast from 'react-hot-toast'

const periods = [
  { key: 'today', label: 'Hoje' },
  { key: 'yesterday', label: 'Ontem' },
  { key: 'week', label: 'Últimos 7 dias' },
  { key: 'month', label: 'Mês Atual' },
  { key: 'custom', label: 'Personalizado' },
]

const getPeriodDates = (periodKey, customFrom, customTo) => {
  const today = new Date();
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  switch (periodKey) {
    case 'today':
      return { date_from: formatDate(today), date_to: formatDate(today) };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      return { date_from: formatDate(yesterday), date_to: formatDate(yesterday) };
    }
    case 'week': {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);
      return { date_from: formatDate(sevenDaysAgo), date_to: formatDate(today) };
    }
    case 'month': {
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { date_from: formatDate(firstDayOfMonth), date_to: formatDate(today) };
    }
    case 'custom':
      return { date_from: customFrom, date_to: customTo };
    default:
      return { date_from: formatDate(today), date_to: formatDate(today) };
  }
};

export default function ReportsPage() {
  const [period, setPeriod] = useState('week')
  const [loading, setLoading] = useState(true)
  
  // Custom dates inputs
  const todayStr = new Date().toISOString().split('T')[0];
  const [customFrom, setCustomFrom] = useState(todayStr)
  const [customTo, setCustomTo] = useState(todayStr)
  
  const [reportData, setReportData] = useState({
    sales_today: 0,
    sales_month: 0,
    total_orders: 0,
    cancelled_orders: 0,
    delivered_orders: 0,
    total_revenue: 0,
    avg_ticket: 0,
    topProducts: [],
    topCustomers: [],
    payments: [],
    chartData: []
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const dates = getPeriodDates(period, customFrom, customTo)
      
      if (period === 'custom' && (!customFrom || !customTo)) {
        return;
      }
      
      const res = await reportsApi.overview(dates)
      if (res.success && res.data) {
        setReportData(res.data)
      } else {
        toast.error('Erro ao processar dados de relatórios.')
      }
    } catch (err) {
      console.error('Erro ao carregar relatórios:', err)
      toast.error(err.message || 'Falha ao buscar dados no servidor.')
    } finally {
      setLoading(false)
    }
  }, [period, customFrom, customTo])

  useEffect(() => {
    loadData()
  }, [loadData])

  const maxChart = Math.max(...reportData.chartData.map((d) => d.value), 1)

  const kpis = [
    { label: 'Vendas de Hoje', value: formatCurrency(reportData.sales_today), subtitle: 'Hoje', icon: DollarSign, color: '#22c55e' },
    { label: 'Vendas do Mês', value: formatCurrency(reportData.sales_month), subtitle: 'Mês atual', icon: DollarSign, color: '#3b82f6' },
    { label: 'Total Faturado', value: formatCurrency(reportData.total_revenue), subtitle: 'No período', icon: TrendingUp, color: '#a855f7' },
    { label: 'Pedidos no Período', value: `${reportData.total_orders} un`, subtitle: 'Total realizados', icon: ShoppingBag, color: '#FF6B35' },
    { label: 'Ticket Médio', value: formatCurrency(reportData.avg_ticket), subtitle: 'No período', icon: TrendingUp, color: '#06b6d4' },
    { label: 'Pedidos Cancelados', value: `${reportData.cancelled_orders} un`, subtitle: 'No período', icon: XCircle, color: '#ef4444' },
  ]

  return (
    <div className="space-y-5 text-left">
      {/* Header */}
      <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Painel de Relatórios</h2>
          <p className="text-[#a991c7] text-sm mt-0.5">Análise e métricas reais de faturamento por restaurante</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto items-start sm:items-center">
          {/* Custom Range Picker */}
          {period === 'custom' && (
            <div className="flex items-center gap-2 glass rounded-xl px-3 py-1.5 border border-white/[0.06] text-xs">
              <Calendar size={14} className="text-[#FF6B35]" />
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-transparent text-white focus:outline-none border-none [color-scheme:dark]"
              />
              <span className="text-[#6b5880]">até</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-transparent text-white focus:outline-none border-none [color-scheme:dark]"
              />
            </div>
          )}
          
          {/* Period Select buttons */}
          <div className="flex flex-wrap gap-1 glass rounded-xl p-1 border border-white/[0.06] w-full sm:w-auto justify-start">
            {periods.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-initial text-center ${
                  period === key
                    ? 'bg-[#FF6B35] text-white shadow-[0_0_12px_rgba(255,107,53,0.3)]'
                    : 'text-[#a991c7] hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-[#FF6B35]" size={36} />
            <p className="text-[#a991c7] text-sm font-semibold">Carregando métricas e relatórios...</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {kpis.map(({ label, value, subtitle, icon: Icon, color }) => (
              <div key={label} className="glass rounded-2xl p-4 border border-white/[0.06] flex flex-col justify-between min-h-[120px]">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <span className="text-[10px] font-bold text-[#6b5880] uppercase">{subtitle}</span>
                </div>
                <div>
                  <p className="text-xl font-black text-white leading-tight">{value}</p>
                  <p className="text-[#a991c7] text-[10px] font-semibold mt-1">{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Revenue Chart */}
            <Card title="Faturamento por Período" subtitle="Valores acumulados em vendas concluídas" className="lg:col-span-2">
              <div className="flex items-end gap-2 h-56 pt-6">
                {reportData.chartData.map(({ label, value }, i) => {
                  const pct = (value / maxChart) * 100
                  return (
                    <div key={label} className="flex-1 flex flex-col items-center gap-2 group relative">
                      {/* Tooltip on hover */}
                      <span className="absolute -top-7 scale-0 group-hover:scale-100 transition-all bg-[#1A0533] border border-white/10 text-white font-bold text-[10px] px-2 py-1 rounded shadow-xl z-10 whitespace-nowrap">
                        {formatCurrency(value)}
                      </span>
                      <span className="text-[9px] text-[#a991c7] font-semibold">
                        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value > 0 ? value.toFixed(0) : ''}
                      </span>
                      <div
                        className="w-full rounded-t-md transition-all duration-700 hover:brightness-110 cursor-pointer"
                        style={{
                          height: `${Math.max(pct, 3)}%`,
                          background: i === reportData.chartData.length - 1
                            ? 'linear-gradient(180deg, #FF6B35, #e84e15)'
                            : 'rgba(255, 107, 53, 0.25)',
                          boxShadow: i === reportData.chartData.length - 1 ? '0 0 12px rgba(255, 107, 53, 0.3)' : 'none',
                        }}
                      />
                      <span className="text-[10px] text-[#6b5880] font-bold truncate max-w-full">{label}</span>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Payment Breakdown */}
            <Card title="Formas de Pagamento" subtitle="Métodos mais usados no período">
              {reportData.payments.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-gray-500 text-sm italic">
                  Nenhuma transação concluída no período.
                </div>
              ) : (
                <div className="space-y-4">
                  {reportData.payments.map(({ method, pct, color }) => (
                    <div key={method}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[#a991c7] text-sm font-semibold">{method}</span>
                        <span className="text-white font-bold text-sm">{pct}%</span>
                      </div>
                      <div className="h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Tables Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top Products Table */}
            <Card title="Produtos Mais Vendidos" subtitle="Ranking de quantidade e receita no período" noPad>
              {reportData.topProducts.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm italic">
                  Sem vendas de produtos registradas neste período.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.05]">
                        {['Pos.', 'Produto', 'Qtd Vendida', 'Receita Gerada', 'Performance'].map((h) => (
                          <th key={h} className="text-left px-5 py-3 text-[#6b5880] text-xs font-bold uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.topProducts.map(({ name, qty, revenue, pct }, i) => (
                        <tr key={name} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3.5">
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                              i === 0 ? 'bg-yellow-500/20 text-yellow-400' : 
                              i === 1 ? 'bg-gray-400/20 text-gray-300' : 
                              i === 2 ? 'bg-orange-500/20 text-orange-400' : 
                              'bg-white/5 text-[#a991c7]'
                            }`}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-white text-sm font-semibold">🍔 {name}</td>
                          <td className="px-5 py-3.5 text-[#a991c7] text-sm font-medium">{qty} un.</td>
                          <td className="px-5 py-3.5 text-[#FF6B35] font-black text-sm">{formatCurrency(revenue)}</td>
                          <td className="px-5 py-3.5 w-32">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #FF6B35, #f59e0b)' }} />
                              </div>
                              <span className="text-[10px] text-[#6b5880] font-bold">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Top Customers Table */}
            <Card title="Clientes que Mais Compram" subtitle="Ranking de clientes fidelizados no período" noPad>
              {reportData.topCustomers.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm italic">
                  Sem dados de clientes para este período.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.05]">
                        {['Pos.', 'Cliente', 'Qtd Pedidos', 'Total Gasto', 'Fidelidade'].map((h) => (
                          <th key={h} className="text-left px-5 py-3 text-[#6b5880] text-xs font-bold uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.topCustomers.map(({ name, orders_count, total_spent }, i) => {
                        // Calculate a mock badge or simple level based on position
                        const loyaltyLevel = i === 0 ? 'Lenda' : i === 1 ? 'VIP' : i === 2 ? 'Super' : 'Ativo';
                        const loyaltyColor = i === 0 ? 'text-yellow-400 bg-yellow-500/10' : i === 1 ? 'text-purple-400 bg-purple-500/10' : 'text-green-400 bg-green-500/10';

                        return (
                          <tr key={name} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                            <td className="px-5 py-3.5">
                              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                                i === 0 ? 'bg-yellow-500/20 text-yellow-400' : 
                                i === 1 ? 'bg-purple-500/20 text-purple-400' : 
                                i === 2 ? 'bg-green-500/20 text-green-400' : 
                                'bg-white/5 text-[#a991c7]'
                              }`}>
                                {i + 1}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-white text-sm font-semibold">👤 {name}</td>
                            <td className="px-5 py-3.5 text-[#a991c7] text-sm font-medium">{orders_count} pedidos</td>
                            <td className="px-5 py-3.5 text-[#FF6B35] font-black text-sm">{formatCurrency(total_spent)}</td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${loyaltyColor}`}>
                                {loyaltyLevel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
