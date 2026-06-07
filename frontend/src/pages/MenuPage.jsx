import { useState } from 'react'
import { Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { formatCurrency } from '../utils/helpers'

const mockCategories = [
  { id: 1, name: 'Burguers', emoji: '🍔', count: 8 },
  { id: 2, name: 'Combos', emoji: '🎁', count: 4 },
  { id: 3, name: 'Batatas', emoji: '🍟', count: 3 },
  { id: 4, name: 'Bebidas', emoji: '🥤', count: 6 },
  { id: 5, name: 'Sobremesas', emoji: '🍦', count: 4 },
  { id: 6, name: 'Vegano', emoji: '🥗', count: 3 },
]

const mockProducts = [
  { id: 1, name: 'X-Burguer Clássico', cat: 1, price: 28.90, desc: 'Pão brioche, carne 160g, queijo prato, alface, tomate, molho especial', available: true, emoji: '🍔' },
  { id: 2, name: 'Double Smash Burguer', cat: 1, price: 42.90, desc: 'Dois smash patties, queijo cheddar, cebola caramelizada, picles, molho da casa', available: true, emoji: '🍔' },
  { id: 3, name: 'X-Bacon Duplo', cat: 1, price: 38.90, desc: 'Pão brioche, carne 200g, bacon crocante, queijo cheddar, molho barbecue', available: true, emoji: '🥓' },
  { id: 4, name: 'Frango Crispy', cat: 1, price: 32.90, desc: 'Frango empanado artesanal, alface americana, maionese temperada', available: true, emoji: '🍗' },
  { id: 5, name: 'Veggie Burguer', cat: 6, price: 34.90, desc: 'Hambúrguer de grão-de-bico, queijo vegano, rúcula, tomate seco', available: false, emoji: '🥗' },
  { id: 6, name: 'Combo Clássico', cat: 2, price: 52.90, desc: 'X-Burguer Clássico + Batata Frita Média + Bebida 350ml', available: true, emoji: '🎁' },
  { id: 7, name: 'Combo Família', cat: 2, price: 156.00, desc: '4 Burguers à escolha + 4 Batatas Médias + 4 Bebidas', available: true, emoji: '👨‍👩‍👧‍👦' },
  { id: 8, name: 'Batata Frita Pequena', cat: 3, price: 9.00, desc: '150g de batata frita crocante', available: true, emoji: '🍟' },
  { id: 9, name: 'Batata Frita Grande', cat: 3, price: 14.00, desc: '300g de batata frita crocante + molho cheddar', available: true, emoji: '🍟' },
  { id: 10, name: 'Milk Shake Morango', cat: 4, price: 22.00, desc: 'Sorvete + leite + calda artesanal', available: true, emoji: '🍓' },
  { id: 11, name: 'Coca-Cola 350ml', cat: 4, price: 8.00, desc: 'Lata gelada', available: true, emoji: '🥤' },
  { id: 12, name: 'Brownie Quente', cat: 5, price: 18.00, desc: 'Brownie de chocolate com sorvete de creme', available: true, emoji: '🍫' },
]

export default function MenuPage() {
  const [categories] = useState(mockCategories)
  const [products, setProducts] = useState(mockProducts)
  const [activeCat, setActiveCat] = useState(null)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', price: '', desc: '', catId: 1, emoji: '🍔', available: true })

  const filtered = products.filter((p) => {
    const catMatch = activeCat ? p.cat === activeCat : true
    const searchMatch = p.name.toLowerCase().includes(search.toLowerCase())
    return catMatch && searchMatch
  })

  const openCreate = () => {
    setEditProduct(null)
    setForm({ name: '', price: '', desc: '', catId: categories[0]?.id || 1, emoji: '🍔', available: true })
    setModalOpen(true)
  }

  const openEdit = (p) => {
    setEditProduct(p)
    setForm({ name: p.name, price: p.price.toString(), desc: p.desc, catId: p.cat, emoji: p.emoji, available: p.available })
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 600))
    if (editProduct) {
      setProducts((prev) => prev.map((p) => p.id === editProduct.id ? { ...p, ...form, price: parseFloat(form.price), cat: form.catId } : p))
    } else {
      setProducts((prev) => [...prev, { id: Date.now(), ...form, price: parseFloat(form.price), cat: form.catId }])
    }
    setSaving(false)
    setModalOpen(false)
  }

  const handleDelete = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const toggleAvailable = (id) => {
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, available: !p.available } : p))
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Cardápio</h2>
          <p className="text-[#a991c7] text-sm">{products.length} produtos em {categories.length} categorias</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" leftIcon={Plus} onClick={() => {}}>
            Nova Categoria
          </Button>
          <Button variant="primary" size="md" leftIcon={Plus} onClick={openCreate}>
            Novo Produto
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar categories */}
        <div className="flex-shrink-0 w-52 hidden sm:block">
          <Card noPad className="overflow-hidden">
            <div
              className={`px-4 py-3 cursor-pointer transition-colors flex items-center justify-between border-b border-white/[0.05] ${!activeCat ? 'bg-[#FF6B35]/10 text-[#FF6B35]' : 'text-[#a991c7] hover:bg-white/5'}`}
              onClick={() => setActiveCat(null)}
            >
              <span className="text-sm font-medium">Todos</span>
              <span className="text-xs opacity-70">{products.length}</span>
            </div>
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`px-4 py-3 cursor-pointer transition-colors flex items-center justify-between border-b border-white/[0.05] ${activeCat === cat.id ? 'bg-[#FF6B35]/10 text-[#FF6B35]' : 'text-[#a991c7] hover:bg-white/5 hover:text-white'}`}
                onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
              >
                <span className="text-sm flex items-center gap-2">
                  <span>{cat.emoji}</span> {cat.name}
                </span>
                <span className="text-xs opacity-70">{cat.count}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* Products grid */}
        <div className="flex-1 min-w-0">
          {/* Search */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5880]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-[#6b5880] focus:outline-none focus:border-[#FF6B35]/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <div key={p.id} className={`glass rounded-2xl border border-white/[0.06] card-hover p-4 ${!p.available ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'rgba(255,107,53,0.1)' }}>
                    {p.emoji}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleAvailable(p.id)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${p.available ? 'text-green-400 hover:bg-green-500/10' : 'text-[#6b5880] hover:bg-white/5'}`}
                      title={p.available ? 'Desativar' : 'Ativar'}
                    >
                      {p.available ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
                    <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#a991c7] hover:text-white hover:bg-white/10 transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#a991c7] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <h3 className="text-white font-semibold text-sm mb-1">{p.name}</h3>
                <p className="text-[#6b5880] text-xs line-clamp-2 mb-3">{p.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[#FF6B35] font-bold text-lg">{formatCurrency(p.price)}</span>
                  <Badge color={p.available ? 'green' : 'gray'} size="sm">
                    {p.available ? 'Disponível' : 'Indisponível'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editProduct ? 'Editar Produto' : 'Novo Produto'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editProduct ? 'Salvar Alterações' : 'Criar Produto'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#d4bfee]">Emoji</label>
              <input
                value={form.emoji}
                onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                className="w-16 h-10 rounded-xl bg-white/5 border border-white/10 text-center text-xl focus:outline-none focus:border-[#FF6B35]/60"
              />
            </div>
            <Input
              label="Nome do Produto"
              placeholder="Ex: X-Burguer Clássico"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              containerClassName="flex-1"
            />
          </div>

          <Input
            label="Preço (R$)"
            type="number"
            placeholder="0,00"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#d4bfee]">Categoria</label>
            <select
              value={form.catId}
              onChange={(e) => setForm((f) => ({ ...f, catId: Number(e.target.value) }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6B35]/60"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id} style={{ background: '#1A0533' }}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#d4bfee]">Descrição</label>
            <textarea
              value={form.desc}
              onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
              placeholder="Descreva os ingredientes e destaques..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#6b5880] focus:outline-none focus:border-[#FF6B35]/60 resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, available: !f.available }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${form.available ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-gray-500/10 border-gray-500/20 text-gray-400'}`}
            >
              {form.available ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              {form.available ? 'Disponível' : 'Indisponível'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
