import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Tag, Save, X, ToggleLeft, ToggleRight, Loader2, ArrowUp, ArrowDown } from 'lucide-react'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { categories as categoriesApi } from '../services/api'
import toast from 'react-hot-toast'

// Mock fallback
const MOCK_CATEGORIES = [
  { id: 1, name: 'Burgers', description: 'Hambúrgueres artesanais saborosos', position: 1, is_active: 1 },
  { id: 2, name: 'Combos', description: 'Burgers + Batata + Bebida com desconto', position: 2, is_active: 1 },
  { id: 3, name: 'Bebidas', description: 'Refrigerantes e sucos naturais', position: 3, is_active: 1 },
  { id: 4, name: 'Acompanhamentos', description: 'Batatas e onion rings crocantes', position: 4, is_active: 0 },
]

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    position: '0',
    is_active: true
  })

  const loadCategories = async () => {
    try {
      setLoading(true)
      const res = await categoriesApi.list()
      if (res.success) {
        setCategories(res.data)
      }
    } catch (err) {
      console.warn('Erro ao carregar categorias do backend, usando mock.', err)
      setCategories(MOCK_CATEGORIES)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const handleOpenCreate = () => {
    setEditingCategory(null)
    setForm({
      name: '',
      description: '',
      position: String(categories.length + 1),
      is_active: true
    })
    setModalOpen(true)
  }

  const handleOpenEdit = (category) => {
    setEditingCategory(category)
    setForm({
      name: category.name,
      description: category.description || '',
      position: String(category.position || 0),
      is_active: !!category.is_active
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('O nome da categoria é obrigatório.')
      return
    }

    setSubmitting(true)
    const data = {
      name: form.name,
      description: form.description,
      position: parseInt(form.position) || 0,
      is_active: form.is_active ? 1 : 0
    }

    try {
      if (editingCategory) {
        const res = await categoriesApi.update(editingCategory.id, data)
        if (res.success) {
          toast.success('Categoria atualizada com sucesso!')
          loadCategories()
          setModalOpen(false)
        }
      } else {
        const res = await categoriesApi.create(data)
        if (res.success) {
          toast.success('Categoria criada com sucesso!')
          loadCategories()
          setModalOpen(false)
        }
      }
    } catch (err) {
      console.warn('Erro ao salvar categoria no backend, usando mock local.', err)
      // Local simulation
      if (editingCategory) {
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...data } : c))
        toast.success('Categoria atualizada com sucesso! (Modo Simulação)')
      } else {
        const newCat = {
          id: Date.now(),
          ...data
        }
        setCategories(prev => [...prev, newCat])
        toast.success('Categoria criada com sucesso! (Modo Simulação)')
      }
      setModalOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (category) => {
    const hasProducts = category.product_count > 0
    let message = 'Deseja realmente excluir esta categoria?'
    if (hasProducts) {
      message = `Esta categoria possui ${category.product_count} produto(s) vinculado(s). Ao excluí-la, esses produtos ficarão sem categoria. Tem certeza de que deseja continuar com a exclusão?`
    } else {
      message = `Deseja realmente excluir a categoria "${category.name}"?`
    }
    
    if (!confirm(message)) return
    
    try {
      const res = await categoriesApi.delete(category.id)
      if (res.success) {
        toast.success('Categoria removida com sucesso.')
        loadCategories()
      }
    } catch (err) {
      console.warn('Erro ao deletar categoria no backend, simulando local.', err)
      setCategories(prev => prev.filter(c => c.id !== category.id))
      toast.success('Categoria removida com sucesso. (Modo Simulação)')
    }
  }

  const handleMove = async (index, direction) => {
    const newCategories = [...categories]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    if (targetIndex < 0 || targetIndex >= newCategories.length) return
    
    // Swap position values in state
    const tempPosition = newCategories[index].position
    newCategories[index].position = newCategories[targetIndex].position
    newCategories[targetIndex].position = tempPosition
    
    // Swap array positions
    const temp = newCategories[index]
    newCategories[index] = newCategories[targetIndex]
    newCategories[targetIndex] = temp
    
    // Re-sort to guarantee visual correctness
    newCategories.sort((a, b) => a.position - b.position)
    
    setCategories(newCategories)
    
    try {
      const payload = newCategories.map((c, i) => ({
        id: c.id,
        position: i + 1
      }))
      
      const res = await categoriesApi.reorder(payload)
      if (res.success) {
        toast.success('Nova ordenação das categorias salva!')
        loadCategories()
      }
    } catch (err) {
      console.warn('Erro ao atualizar ordenação de categorias no backend.', err)
      toast.success('Ordem das categorias atualizada! (Simulado)')
    }
  }

  const toggleStatus = async (cat) => {
    const nextStatus = cat.is_active ? 0 : 1
    try {
      const res = await categoriesApi.update(cat.id, { is_active: nextStatus })
      if (res.success) {
        toast.success(`Categoria ${nextStatus ? 'ativada' : 'desativada'}!`)
        loadCategories()
      }
    } catch (err) {
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: nextStatus } : c))
      toast.success(`Categoria ${nextStatus ? 'ativada' : 'desativada'}! (Modo Simulação)`)
    }
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Tag className="text-[#FF6B35]" size={20} />
            Categorias do Cardápio
          </h2>
          <p className="text-[#a991c7] text-sm">Organize seu cardápio criando categorias para seus pratos</p>
        </div>
        <Button variant="primary" size="md" leftIcon={Plus} onClick={handleOpenCreate}>
          Nova Categoria
        </Button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="animate-spin text-[#FF6B35]" size={36} />
        </div>
      ) : (
        <Card noPad>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {['Ordem (sort_order)', 'Nome', 'Descrição', 'Status (status)', 'Ações'].map((h) => (
                    <th key={h} className="text-left px-6 py-4 text-[#6b5880] text-xs font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {categories.map((cat, index) => (
                  <tr key={cat.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-semibold min-w-4 text-center">{cat.position}</span>
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => handleMove(index, 'up')}
                            disabled={index === 0}
                            className="p-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                            title="Mover para Cima"
                          >
                            <ArrowUp size={10} />
                          </button>
                          <button
                            onClick={() => handleMove(index, 'down')}
                            disabled={index === categories.length - 1}
                            className="p-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                            title="Mover para Baixo"
                          >
                            <ArrowDown size={10} />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white text-sm font-medium">{cat.name}</td>
                    <td className="px-6 py-4 text-[#a991c7] text-xs max-w-xs truncate">{cat.description || '-'}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleStatus(cat)} className="hover:opacity-85 transition-opacity">
                        <Badge color={cat.is_active ? 'green' : 'gray'}>
                          {cat.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-6 py-4 flex items-center gap-3">
                      <button
                        onClick={() => handleOpenEdit(cat)}
                        className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 text-xs">
                      Nenhuma categoria cadastrada. Clique em Nova Categoria para começar!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1A0533] border border-white/10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Nome da Categoria"
                placeholder="Ex: Hambúrgueres, Bebidas, Sobremesas"
                value={form.name}
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                required
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#d4bfee]">Descrição</label>
                <textarea
                  placeholder="Ex: Nossos burgers artesanais grelhados na hora"
                  value={form.description}
                  onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6B35]/60 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Posição (sort_order)"
                  type="number"
                  value={form.position}
                  onChange={(e) => setForm(p => ({ ...p, position: e.target.value }))}
                  required
                />
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#d4bfee]">Status (status)</label>
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                    className={`flex items-center gap-2 py-2 px-4 rounded-xl border text-sm font-semibold transition-all ${
                      form.is_active
                        ? 'border-green-500/30 bg-green-500/10 text-green-400'
                        : 'border-white/10 bg-white/5 text-gray-400'
                    }`}
                  >
                    {form.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    <span>{form.is_active ? 'Ativo' : 'Inativo'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={submitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold"
                >
                  Salvar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
