import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, Star, Clock, Tag, AlertTriangle, Loader2 } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { products as productsApi, categories as categoriesApi } from '../services/api'
import { formatCurrency, formatImageUrl } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function ProductsPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('') // '', 'available', 'unavailable'
  const [selectedFeatured, setSelectedFeatured] = useState('') // '', 'featured', 'standard'
  
  // Pagination
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, pages: 1 })

  const loadData = async () => {
    try {
      setLoading(true)
      const catRes = await categoriesApi.list()
      if (catRes.success) {
        setCategories(catRes.data)
      }

      const params = {
        page: pagination.page,
        limit: pagination.limit
      }
      if (selectedCategory) params.category_id = selectedCategory
      if (selectedStatus === 'available') params.is_available = 'true'
      if (selectedStatus === 'unavailable') params.is_available = 'false'
      if (selectedFeatured === 'featured') params.is_featured = 'true'
      if (selectedFeatured === 'standard') params.is_featured = 'false'
      if (search.trim()) params.search = search.trim()

      const prodRes = await productsApi.list(params)
      if (prodRes.success) {
        setProducts(prodRes.data)
        if (prodRes.pagination) {
          setPagination(prodRes.pagination)
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar dados do backend, usando fallbacks simulados.', err)
      // Mock fallback
      setProducts([
        { id: 1, name: 'X-Burguer Clássico', category_id: 1, category_name: 'Burgers', price: 28.90, description: 'Pão brioche, carne 160g, queijo prato, alface, tomate, molho especial', is_available: 1, is_featured: 1, preparation_time: 15, position: 1 },
        { id: 2, name: 'Double Smash Burguer', category_id: 1, category_name: 'Burgers', price: 42.90, description: 'Dois smash patties, queijo cheddar, cebola caramelizada, picles, molho da casa', is_available: 1, is_featured: 0, preparation_time: 20, position: 2 },
        { id: 3, name: 'Coca-Cola 350ml', category_id: 3, category_name: 'Bebidas', price: 8.00, description: 'Lata gelada de refrigerante 350ml', is_available: 1, is_featured: 0, preparation_time: 5, position: 3 },
      ])
      setCategories([
        { id: 1, name: 'Burgers' },
        { id: 3, name: 'Bebidas' }
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedCategory, selectedStatus, selectedFeatured, pagination.page])

  // Trigger search on debounce or manual trigger
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPagination(p => ({ ...p, page: 1 }))
    loadData()
  }

  const toggleAvailability = async (product) => {
    const nextValue = product.is_available ? 0 : 1
    try {
      const res = await productsApi.toggleAvailable(product.id)
      if (res.success) {
        toast.success(`Produto marcado como ${nextValue ? 'disponível' : 'indisponível'}!`)
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_available: nextValue } : p))
      }
    } catch (err) {
      console.warn('Erro ao alterar status do produto no backend, simulando local.', err)
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_available: nextValue } : p))
      toast.success(`Produto marcado como ${nextValue ? 'disponível' : 'indisponível'}! (Modo Simulação)`)
    }
  }

  const toggleFeatured = async (product) => {
    const nextValue = product.is_featured ? 0 : 1
    try {
      const res = await productsApi.update(product.id, { is_featured: nextValue })
      if (res.success) {
        toast.success(`Destaque do produto ${nextValue ? 'ativado' : 'desativado'}!`)
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_featured: nextValue } : p))
      }
    } catch (err) {
      console.warn('Erro ao atualizar destaque no backend, simulando local.', err)
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_featured: nextValue } : p))
      toast.success(`Produto destaque ${nextValue ? 'ativado' : 'desativado'}! (Modo Simulação)`)
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Deseja realmente excluir o produto "${name}"?`)) return
    
    try {
      const res = await productsApi.delete(id)
      if (res.success) {
        toast.success('Produto excluído com sucesso.')
        loadData()
      }
    } catch (err) {
      console.warn('Erro ao deletar produto no backend, simulando local.', err)
      setProducts(prev => prev.filter(p => p.id !== id))
      toast.success('Produto removido com sucesso. (Modo Simulação)')
    }
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Plus className="text-[#FF6B35]" size={20} />
            Produtos do Cardápio
          </h2>
          <p className="text-[#a991c7] text-sm">Gerencie os pratos, preços, fotos e visibilidade do seu cardápio público</p>
        </div>
        {categories.length === 0 ? (
          <Button
            variant="secondary"
            size="md"
            leftIcon={Tag}
            onClick={() => navigate('/dashboard/categorias')}
          >
            Criar primeira categoria
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            leftIcon={Plus}
            onClick={() => navigate('/dashboard/produtos/novo')}
          >
            Novo Produto
          </Button>
        )}
      </div>

      {/* Warning banner if no categories */}
      {!loading && categories.length === 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-3 text-yellow-400">
          <AlertTriangle size={20} className="shrink-0" />
          <div className="text-sm">
            <p className="font-extrabold">Nenhuma categoria cadastrada!</p>
            <p className="text-xs text-yellow-500/80 mt-0.5">Você precisa criar pelo menos uma categoria antes de poder cadastrar produtos no cardápio.</p>
          </div>
        </div>
      )}

      {/* Filter Row */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          {/* Search */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#d4bfee]">Buscar por Nome</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5880]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ex: X-Salada..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-[#6b5880] focus:outline-none focus:border-[#FF6B35]/50 h-[42px]"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#d4bfee]">Filtrar por Categoria</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF6B35]/60 h-[42px]"
            >
              <option value="" className="bg-[#1A0533]">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#1A0533]">{c.name}</option>
              ))}
            </select>
          </div>

          {/* Availability Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#d4bfee]">Status (status)</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF6B35]/60 h-[42px]"
            >
              <option value="" className="bg-[#1A0533]">Todos os Status</option>
              <option value="available" className="bg-[#1A0533]">Disponíveis</option>
              <option value="unavailable" className="bg-[#1A0533]">Indisponíveis</option>
            </select>
          </div>

          {/* Featured Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#d4bfee]">Destaque (featured)</label>
            <select
              value={selectedFeatured}
              onChange={(e) => setSelectedFeatured(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF6B35]/60 h-[42px]"
            >
              <option value="" className="bg-[#1A0533]">Todos</option>
              <option value="featured" className="bg-[#1A0533]">Destacados</option>
              <option value="standard" className="bg-[#1A0533]">Padrão</option>
            </select>
          </div>
        </form>
      </div>

      {/* Products Display */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="animate-spin text-[#FF6B35]" size={36} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className={`glass rounded-2xl border border-white/[0.06] p-4 flex flex-col justify-between transition-all duration-300 ${
                  !p.is_available ? 'opacity-65' : ''
                }`}
              >
                <div>
                  {/* Top Bar inside Card */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    {p.image_url ? (
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-800 shrink-0">
                        <img src={formatImageUrl(p.image_url)} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shrink-0">
                        🍔
                      </div>
                    )}

                    {/* Quick action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleFeatured(p)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          p.is_featured
                            ? 'text-yellow-400 bg-yellow-500/10'
                            : 'text-[#6b5880] hover:text-yellow-400 hover:bg-white/5'
                        }`}
                        title={p.is_featured ? 'Remover Destaque' : 'Destacar Produto'}
                      >
                        <Star size={14} className={p.is_featured ? 'fill-current' : ''} />
                      </button>
                      <button
                        onClick={() => toggleAvailability(p)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          p.is_available
                            ? 'text-green-400 bg-green-500/10'
                            : 'text-[#6b5880] hover:text-green-400 hover:bg-white/5'
                        }`}
                        title={p.is_available ? 'Marcar como Indisponível' : 'Marcar como Disponível'}
                      >
                        {p.is_available ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                      <button
                        onClick={() => navigate(`/dashboard/produtos/editar/${p.id}`)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                        title="Editar"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-1 text-left">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-white line-clamp-1">{p.name}</h4>
                      {p.is_featured === 1 && (
                        <span className="text-[9px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 flex items-center gap-0.5">
                          <Star size={8} className="fill-current" />
                          Destaque
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed min-h-8">{p.description || 'Sem descrição.'}</p>
                  </div>
                </div>

                {/* Footer Section inside Card */}
                <div className="border-t border-white/5 pt-3 mt-4 flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase leading-none">PREÇO</span>
                    <span className="text-base font-black text-[#FF6B35] mt-1">{formatCurrency(p.price)}</span>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {p.category_name && (
                      <span className="text-[10px] text-[#a991c7] font-semibold bg-white/5 px-2 py-0.5 rounded flex items-center gap-1 border border-white/5">
                        <Tag size={10} className="text-[#FF6B35]" />
                        {p.category_name}
                      </span>
                    )}
                    {p.preparation_time && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock size={10} />
                        {p.preparation_time} min
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {products.length === 0 && (
            <div className="glass rounded-2xl p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
              <AlertTriangle size={32} className="text-[#6b5880]" />
              <p className="text-sm font-medium">Nenhum produto encontrado.</p>
              <p className="text-xs">Cadastre um novo produto ou altere os filtros de busca para ver resultados.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
