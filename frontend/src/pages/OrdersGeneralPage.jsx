
import { useEffect, useState } from 'react'
import { orders as ordersApi } from '../services/api'
import { formatCurrency, formatDateTime } from '../utils/helpers'
import { Search } from 'lucide-react'

export default function OrdersGeneralPage() {
  const [orders, setOrders] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await ordersApi.list({ limit: 100 })
        if (res.success) setOrders(res.data || [])
      } finally { setLoading(false) }
    }
    load()
  }, [])

  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    return !q || String(o.order_number||o.id).toLowerCase().includes(q) || String(o.customer_name||'').toLowerCase().includes(q)
  })

  return <div className="p-6 space-y-5">
    <div className="flex items-center justify-between gap-4">
      <div><h2 className="text-2xl font-extrabold text-slate-900">Pedidos Gerais</h2><p className="text-slate-500">Histórico completo de pedidos do restaurante.</p></div>
      <div className="relative w-80 max-w-full"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className="w-full pl-10 pr-3 py-3 rounded-2xl border border-slate-200 bg-white" placeholder="Buscar pedido ou cliente" value={search} onChange={e=>setSearch(e.target.value)}/></div>
    </div>
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600"><tr><th className="p-4 text-left">Pedido</th><th className="p-4 text-left">Cliente</th><th className="p-4 text-left">Status</th><th className="p-4 text-left">Data</th><th className="p-4 text-right">Total</th></tr></thead>
        <tbody>
          {loading ? <tr><td className="p-8 text-center text-slate-500" colSpan="5">Carregando...</td></tr> : filtered.map(o => <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50"><td className="p-4 font-bold text-red-600">{o.order_number || '#'+o.id}</td><td className="p-4 text-slate-800">{o.customer_name || 'Cliente'}</td><td className="p-4 text-slate-600">{o.status}</td><td className="p-4 text-slate-500">{formatDateTime ? formatDateTime(o.created_at) : new Date(o.created_at).toLocaleString('pt-BR')}</td><td className="p-4 text-right font-extrabold">{formatCurrency(o.total)}</td></tr>)}
          {!loading && filtered.length===0 && <tr><td className="p-8 text-center text-slate-500" colSpan="5">Nenhum pedido encontrado.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>
}
