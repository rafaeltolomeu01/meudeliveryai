import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, Upload, Star, CheckCircle, Tag } from 'lucide-react'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { products as productsApi, categories as categoriesApi, complements as complementsApi } from '../services/api'
import toast from 'react-hot-toast'

export default function ProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [categories, setCategories] = useState([])
  const [complementGroups, setComplementGroups] = useState([])
  const [selectedGroups, setSelectedGroups] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    promotional_price: '',
    category_id: '',
    is_available: true,
    is_featured: false,
    preparation_time: '15',
    position: '0',
    image_url: '',
    sku: '',
    track_stock: false,
    stock_quantity: '0'
  })

  useEffect(() => {
    async function init() {
      try {
        // Load categories
        const catRes = await categoriesApi.list()
        if (catRes.success) {
          setCategories(catRes.data)
          // Set default category if creating
          if (!isEdit && catRes.data.length > 0) {
            setForm(f => ({ ...f, category_id: catRes.data[0].id.toString() }))
          }
        }

        // Load complement groups
        const compRes = await complementsApi.listGroups()
        if (compRes.success && compRes.data) {
          setComplementGroups(compRes.data)
        }

        if (isEdit) {
          const prodRes = await productsApi.get(id)
          if (prodRes.success) {
            const p = prodRes.data
            setForm({
              name: p.name || '',
              description: p.description || '',
              price: p.price ? p.price.toString() : '',
              promotional_price: p.promotional_price ? p.promotional_price.toString() : '',
              category_id: p.category_id ? p.category_id.toString() : '',
              is_available: !!p.is_available,
              is_featured: !!p.is_featured,
              preparation_time: p.preparation_time ? p.preparation_time.toString() : '15',
              position: p.position ? p.position.toString() : '0',
              image_url: p.image_url || '',
              sku: p.sku || '',
              track_stock: !!p.track_stock,
              stock_quantity: p.stock_quantity ? p.stock_quantity.toString() : '0'
            })
            if (p.image_url) {
              setImagePreview(p.image_url)
            }
            if (p.complement_group_ids) {
              const groupIds = Array.isArray(p.complement_group_ids)
                ? p.complement_group_ids
                : JSON.parse(p.complement_group_ids || '[]')
              setSelectedGroups(groupIds)
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao inicializar formulário de produto.', err)
        toast.error('Erro ao carregar dados.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id, isEdit])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validações locais
    if (!form.name.trim()) {
      toast.error('O nome do produto é obrigatório.')
      return
    }
    if (!form.category_id) {
      toast.error('O produto precisa ter uma categoria.')
      return
    }
    
    const parsedPrice = parseFloat(form.price)
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error('O preço do produto precisa ser maior que zero.')
      return
    }

    setSubmitting(true)
    const payload = {
      name: form.name,
      description: form.description,
      price: parsedPrice,
      promotional_price: form.promotional_price ? parseFloat(form.promotional_price) : null,
      category_id: parseInt(form.category_id),
      is_available: form.is_available ? 1 : 0,
      is_featured: form.is_featured ? 1 : 0,
      preparation_time: parseInt(form.preparation_time) || 15,
      position: parseInt(form.position) || 0,
      sku: form.sku || null,
      track_stock: form.track_stock ? 1 : 0,
      stock_quantity: form.track_stock ? parseInt(form.stock_quantity) || 0 : null,
      complement_group_ids: selectedGroups
    }

    try {
      let productId = id
      if (isEdit) {
        const res = await productsApi.update(id, payload)
        if (res.success) {
          toast.success('Produto atualizado com sucesso!')
        }
      } else {
        const res = await productsApi.create(payload)
        if (res.success) {
          productId = res.data.id
          toast.success('Produto criado com sucesso!')
        }
      }

      // Upload image if selected
      if (imageFile && productId) {
        const formData = new FormData()
        formData.append('image', imageFile)
        try {
          await productsApi.uploadImage(productId, formData)
          toast.success('Imagem do produto enviada com sucesso!')
        } catch (imgErr) {
          console.warn('Erro ao enviar imagem para o servidor.', imgErr)
          toast.error('O produto foi salvo, mas a imagem não pôde ser enviada.')
        }
      }

      navigate('/dashboard/produtos')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Erro ao salvar o produto.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="py-12 flex justify-center text-white">
        <Loader2 className="animate-spin text-[#FF6B35]" size={36} />
      </div>
    )
  }

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard/produtos')}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">
            {isEdit ? 'Editar Produto' : 'Novo Produto'}
          </h2>
          <p className="text-[#a991c7] text-sm">
            {isEdit ? 'Atualize as informações do produto selecionado' : 'Adicione um novo produto ao cardápio do restaurante'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left column: Fields */}
        <div className="md:col-span-2 space-y-6">
          <Card title="Informações Gerais" subtitle="Nome, categoria e preço do produto">
            <div className="space-y-4">
              <Input
                label="Nome do Produto *"
                placeholder="Ex: X-Salada Especial"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#d4bfee]">Categoria *</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6B35]/60 h-[42px]"
                    required
                  >
                    <option value="" className="bg-[#1A0533]">Selecione uma categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#1A0533]">{c.name}</option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Tempo de Preparo (minutos)"
                  type="number"
                  placeholder="15"
                  value={form.preparation_time}
                  onChange={(e) => setForm(f => ({ ...f, preparation_time: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Preço Base (R$) *"
                  type="number"
                  step="0.01"
                  placeholder="29.90"
                  value={form.price}
                  onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
                  required
                />

                <Input
                  label="Preço Promocional (R$)"
                  type="number"
                  step="0.01"
                  placeholder="Deixe em branco se não houver"
                  value={form.promotional_price}
                  onChange={(e) => setForm(f => ({ ...f, promotional_price: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#d4bfee]">Descrição</label>
                <textarea
                  placeholder="Detalhe os ingredientes, alergênicos e o tamanho do prato..."
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6B35]/60 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Ordem de Exibição (sort_order)"
                  type="number"
                  placeholder="0"
                  value={form.position}
                  onChange={(e) => setForm(f => ({ ...f, position: e.target.value }))}
                />
              </div>

              {/* SKU & Stock Management */}
              <div className="border-t border-white/5 pt-4 mt-4 space-y-4">
                <h4 className="text-sm font-bold text-white">Estoque e SKU</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="SKU (Código do Produto)"
                    placeholder="Ex: HMB-001"
                    value={form.sku}
                    onChange={(e) => setForm(f => ({ ...f, sku: e.target.value }))}
                  />

                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-semibold text-[#d4bfee]">Controlar Estoque?</label>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, track_stock: !f.track_stock }))}
                      className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all ${
                        form.track_stock
                          ? 'border-orange-500/30 bg-orange-500/10 text-orange-400'
                          : 'border-white/10 bg-white/5 text-gray-400'
                      }`}
                    >
                      {form.track_stock ? 'Sim, controlar estoque' : 'Não controlar'}
                    </button>
                  </div>
                </div>

                {form.track_stock && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Quantidade em Estoque"
                      type="number"
                      placeholder="0"
                      value={form.stock_quantity}
                      onChange={(e) => setForm(f => ({ ...f, stock_quantity: e.target.value }))}
                      required
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right column: Image & Settings */}
        <div className="space-y-6">
          {/* Image Upload card */}
          <Card title="Foto do Produto" subtitle="Selecione uma imagem de boa qualidade">
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl p-4 bg-white/[0.01] hover:bg-white/[0.02] transition-colors relative min-h-48 group">
                {imagePreview ? (
                  <div className="w-full h-44 rounded-xl overflow-hidden relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <p className="text-white text-xs font-bold bg-[#FF6B35] px-3 py-1.5 rounded-xl">Alterar Foto</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400">
                      <Upload size={18} />
                    </div>
                    <p className="text-xs text-gray-300 font-semibold">Fazer Upload de Imagem</p>
                    <p className="text-[10px] text-gray-500">PNG, JPG ou WebP de até 5MB</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </Card>

          {/* Complement groups card */}
          <Card title="Complementos / Adicionais" subtitle="Vincule grupos de opcionais a este produto">
            {complementGroups.length === 0 ? (
              <p className="text-xs text-gray-500 italic text-left">
                Nenhum grupo de complementos criado. Vá em "Complementos" para cadastrar adicionais.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {complementGroups.map((group) => {
                  const isChecked = selectedGroups.includes(group.id)
                  return (
                    <label
                      key={group.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 cursor-pointer text-left transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedGroups(prev => prev.filter(id => id !== group.id))
                          } else {
                            setSelectedGroups(prev => [...prev, group.id])
                          }
                        }}
                        className="rounded border-white/10 bg-[#240e3c] text-[#FF6B35] focus:ring-[#FF6B35]/50 w-4 h-4"
                      />
                      <div>
                        <p className="text-xs font-bold text-white leading-none">{group.name}</p>
                        <p className="text-[10px] text-gray-500 mt-1 leading-none">{group.description || 'Sem descrição'}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Visibility and Featured settings */}
          <Card title="Opções de Status" subtitle="Disponibilidade e Destaques">
            <div className="space-y-4">
              {/* Availability */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-left">
                  <p className="text-xs font-bold text-white">Disponibilidade (status)</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Define se o produto aparece no cardápio</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, is_available: !f.is_available }))}
                  className={`flex items-center gap-1.5 py-1 px-3 rounded-lg border text-xs font-semibold transition-all ${
                    form.is_available
                      ? 'border-green-500/30 bg-green-500/10 text-green-400'
                      : 'border-white/10 bg-white/5 text-gray-400'
                  }`}
                >
                  <span>{form.is_available ? 'Disponível' : 'Indisponível'}</span>
                </button>
              </div>

              {/* Featured */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-left">
                  <p className="text-xs font-bold text-white">Destacar (featured)</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Mostra o produto na seção de recomendados</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, is_featured: !f.is_featured }))}
                  className={`flex items-center gap-1.5 py-1 px-3 rounded-lg border text-xs font-semibold transition-all ${
                    form.is_featured
                      ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                      : 'border-white/10 bg-white/5 text-gray-400'
                  }`}
                >
                  <Star size={12} className={form.is_featured ? 'fill-current text-yellow-400' : 'text-gray-400'} />
                  <span>{form.is_featured ? 'Destacado' : 'Padrão'}</span>
                </button>
              </div>
            </div>
          </Card>

          {/* Form Actions */}
          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              leftIcon={Save}
              className="w-full py-3 rounded-xl font-bold"
            >
              Salvar Produto
            </Button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/produtos')}
              className="w-full text-center py-2.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
