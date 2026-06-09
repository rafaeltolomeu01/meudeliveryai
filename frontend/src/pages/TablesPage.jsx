import { useMemo, useState } from 'react'
import { QrCode, Copy, Download, Plus, Armchair, CheckCircle, CircleDot } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function TablesPage() {
  const { user } = useAuth()
  const slug = user?.restaurant?.slug
  const [tables, setTables] = useState(() => {
    const saved = localStorage.getItem('mda_tables')
    return saved ? JSON.parse(saved) : Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `Mesa ${i + 1}`, available: true }))
  })

  const baseUrl = useMemo(() => slug ? `${window.location.origin}/cardapio/${slug}` : '', [slug])
  const save = (next) => { setTables(next); localStorage.setItem('mda_tables', JSON.stringify(next)) }
  const toggle = (id) => save(tables.map(t => t.id === id ? { ...t, available: !t.available } : t))
  const addTable = () => { const id = Math.max(0, ...tables.map(t => t.id)) + 1; save([...tables, { id, name: `Mesa ${id}`, available: true }]) }
  const qrUrl = (table) => `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(`${baseUrl}?mesa=${table.id}`)}`

  return <div className="mda-light-page space-y-6">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div><h2 className="text-2xl font-black">Mesas e QR Code</h2><p className="text-[#717171] text-sm">Gere QR Codes para o cliente abrir o cardápio direto na mesa.</p></div>
      <button onClick={addTable} className="inline-flex items-center gap-2 rounded-xl bg-[#ea1d2c] px-4 py-3 text-white font-black"><Plus size={18}/>Adicionar mesa</button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {tables.map(table => <div key={table.id} className="mda-card rounded-2xl border p-5 bg-white space-y-4">
        <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-[#fff1f2] text-[#ea1d2c] flex items-center justify-center"><Armchair/></div><div><h3 className="font-black text-lg">{table.name}</h3><p className="text-xs text-[#717171]">{baseUrl}?mesa={table.id}</p></div></div><button onClick={() => toggle(table.id)} className={`px-3 py-1 rounded-full text-xs font-black ${table.available?'bg-green-50 text-green-700':'bg-red-50 text-red-700'}`}>{table.available?'Disponível':'Ocupada'}</button></div>
        {slug ? <img src={qrUrl(table)} alt={`QR ${table.name}`} className="w-48 h-48 mx-auto rounded-xl border"/> : <div className="p-8 text-center text-red-600 font-bold">Cadastre o link/slug da loja primeiro.</div>}
        <div className="flex gap-2"><button onClick={()=>{navigator.clipboard.writeText(`${baseUrl}?mesa=${table.id}`);toast.success('Link copiado')}} className="flex-1 rounded-xl border py-2 font-bold flex items-center justify-center gap-2"><Copy size={16}/>Copiar</button><a href={qrUrl(table)} download={`mesa-${table.id}.png`} className="flex-1 rounded-xl border py-2 font-bold flex items-center justify-center gap-2"><Download size={16}/>Baixar</a></div>
      </div>)}
    </div>
  </div>
}
