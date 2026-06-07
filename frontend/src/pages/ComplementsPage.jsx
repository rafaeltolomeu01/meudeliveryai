import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Sliders, Save, X, ToggleLeft, ToggleRight, Loader2, ArrowUp, ArrowDown, Settings, Layers } from 'lucide-react'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { complements as complementsApi } from '../services/api'
import toast from 'react-hot-toast'

export default function ComplementsPage() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState(null)
  
  // Group Modal States
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    min_quantity: '0',
    max_quantity: '1',
    is_required: false,
    is_active: true,
    position: '0'
  })

  // Item Modal States
  const [items, setItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [itemForm, setItemForm] = useState({
    name: '',
    price: '0.00',
    max_quantity: '1',
    is_active: true,
    position: '0'
  })

  const [submittingGroup, setSubmittingGroup] = useState(false)
  const [submittingItem, setSubmittingItem] = useState(false)

  const loadGroups = async () => {
    try {
      setLoading(true)
      const res = await complementsApi.listGroups()
      if (res.success && res.data) {
        setGroups(res.data)
        if (res.data.length > 0 && !selectedGroup) {
          setSelectedGroup(res.data[0])
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar grupos de complementos:', err)
      toast.error('Erro ao carregar grupos de complementos.')
    } finally {
      setLoading(false)
    }
  }

  const loadItems = async (groupId) => {
    if (!groupId) return
    try {
      setLoadingItems(true)
      const res = await complementsApi.listItems(groupId)
      if (res.success && res.data) {
        setItems(res.data)
      }
    } catch (err) {
      console.warn('Erro ao carregar itens do grupo:', err)
    } finally {
      setLoadingItems(false)
    }
  }

  useEffect(() => {
    loadGroups()
  }, [])

  useEffect(() => {
    if (selectedGroup) {
      loadItems(selectedGroup.id)
    } else {
      setItems([])
    }
  }, [selectedGroup])

  // Group Handlers
  const handleOpenCreateGroup = () => {
    setEditingGroup(null)
    setGroupForm({
      name: '',
      description: '',
      min_quantity: '0',
      max_quantity: '1',
      is_required: false,
      is_active: true,
      position: String(groups.length + 1)
    })
    setGroupModalOpen(true)
  }

  const handleOpenEditGroup = (group) => {
    setEditingGroup(group)
    setGroupForm({
      name: group.name,
      description: group.description || '',
      min_quantity: String(group.min_quantity || 0),
      max_quantity: String(group.max_quantity || 1),
      is_required: !!group.is_required,
      is_active: !!group.is_active,
      position: String(group.position || 0)
    })
    setGroupModalOpen(true)
  }

  const handleGroupSubmit = async (e) => {
    e.preventDefault()
    if (!groupForm.name.trim()) {
      toast.error('Nome do grupo é obrigatório.')
      return
    }

    setSubmittingGroup(true)
    const data = {
      name: groupForm.name,
      description: groupForm.description,
      min_quantity: parseInt(groupForm.min_quantity) || 0,
      max_quantity: parseInt(groupForm.max_quantity) || 1,
      is_required: groupForm.is_required ? 1 : 0,
      is_active: groupForm.is_active ? 1 : 0,
      position: parseInt(groupForm.position) || 0
    }

    try {
      if (editingGroup) {
        const res = await complementsApi.updateGroup(editingGroup.id, data)
        if (res.success) {
          toast.success('Grupo de complementos atualizado!')
          setGroupModalOpen(false)
          loadGroups()
          // Update selectedGroup reference if it was the one edited
          if (selectedGroup?.id === editingGroup.id) {
            setSelectedGroup({ ...selectedGroup, ...data })
          }
        }
      } else {
        const res = await complementsApi.createGroup(data)
        if (res.success) {
          toast.success('Grupo de complementos criado!')
          setGroupModalOpen(false)
          loadGroups()
        }
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar grupo de complementos.')
    } finally {
      setSubmittingGroup(false)
    }
  }

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`Deseja realmente excluir o grupo "${group.name}"? Isso removerá todos os seus itens.`)) return
    try {
      const res = await complementsApi.deleteGroup(group.id)
      if (res.success) {
        toast.success('Grupo de complementos excluído!')
        if (selectedGroup?.id === group.id) {
          setSelectedGroup(null)
        }
        loadGroups()
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir grupo.')
    }
  }

  // Item Handlers
  const handleOpenCreateItem = () => {
    if (!selectedGroup) return
    setEditingItem(null)
    setItemForm({
      name: '',
      price: '0.00',
      max_quantity: '1',
      is_active: true,
      position: String(items.length + 1)
    })
    setItemModalOpen(true)
  }

  const handleOpenEditItem = (item) => {
    setEditingItem(item)
    setItemForm({
      name: item.name,
      price: parseFloat(item.price || 0).toFixed(2),
      max_quantity: String(item.max_quantity || 1),
      is_active: !!item.is_active,
      position: String(item.position || 0)
    })
    setItemModalOpen(true)
  }

  const handleItemSubmit = async (e) => {
    e.preventDefault()
    if (!itemForm.name.trim()) {
      toast.error('Nome do item é obrigatório.')
      return
    }

    setSubmittingItem(true)
    const data = {
      complement_group_id: selectedGroup.id,
      name: itemForm.name,
      price: parseFloat(itemForm.price) || 0.00,
      max_quantity: parseInt(itemForm.max_quantity) || 1,
      is_active: itemForm.is_active ? 1 : 0,
      position: parseInt(itemForm.position) || 0
    }

    try {
      if (editingItem) {
        const res = await complementsApi.updateItem(editingItem.id, data)
        if (res.success) {
          toast.success('Opção de complemento atualizada!')
          setItemModalOpen(false)
          loadItems(selectedGroup.id)
        }
      } else {
        const res = await complementsApi.createItem(data)
        if (res.success) {
          toast.success('Opção de complemento adicionada!')
          setItemModalOpen(false)
          loadItems(selectedGroup.id)
        }
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar opção de complemento.')
    } finally {
      setSubmittingItem(false)
    }
  }

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Deseja realmente excluir a opção "${item.name}"?`)) return
    try {
      const res = await complementsApi.deleteItem(item.id)
      if (res.success) {
        toast.success('Opção de complemento excluída!')
        loadItems(selectedGroup.id)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir opção.')
    }
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Gestão de Complementos</h2>
          <p className="text-[#a991c7] text-sm">Crie grupos e opções de adicionais estilo iFood.</p>
        </div>
        <Button variant="primary" size="md" leftIcon={Plus} onClick={handleOpenCreateGroup}>
          Novo Grupo
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Groups Column */}
        <div className="lg:col-span-1 space-y-4">
          <Card title="Grupos de Adicionais" subtitle="Selecione um grupo para gerenciar">
            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="animate-spin text-[#FF6B35]" size={28} />
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-12 text-[#6b5880]">
                <Layers size={36} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold">Nenhum grupo cadastrado.</p>
                <Button variant="ghost" size="sm" className="mt-2 text-[#FF6B35]" onClick={handleOpenCreateGroup}>
                  Criar Primeiro
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => {
                  const isSelected = selectedGroup?.id === group.id
                  return (
                    <div
                      key={group.id}
                      onClick={() => setSelectedGroup(group)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#FF6B35]/15 border-[#FF6B35]/30 text-white shadow-[0_0_15px_rgba(255,107,53,0.1)]'
                          : 'bg-white/[0.02] border-white/5 text-[#a991c7] hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="font-extrabold text-sm text-white flex items-center gap-1.5">
                          {group.name}
                          {group.is_required === 1 && (
                            <span className="text-[10px] bg-[#FF6B35]/20 text-[#FF6B35] px-1.5 py-0.5 rounded-full font-bold">
                              Obrigatório
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[#6b5880] truncate max-w-[180px]">
                          {group.description || 'Sem descrição'}
                        </p>
                        <p className="text-[10px] text-[#a991c7]">
                          Min: {group.min_quantity} / Max: {group.max_quantity}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenEditGroup(group) }}
                          className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group) }}
                          className="p-1.5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Option Items Column */}
        <div className="lg:col-span-2">
          {selectedGroup ? (
            <Card
              title={`Opções do Grupo: ${selectedGroup.name}`}
              subtitle={selectedGroup.description || 'Gerencie as opções que o cliente poderá selecionar'}
              action={
                <Button variant="secondary" size="sm" leftIcon={Plus} onClick={handleOpenCreateItem}>
                  Adicionar Opção
                </Button>
              }
            >
              {loadingItems ? (
                <div className="py-16 flex justify-center">
                  <Loader2 className="animate-spin text-[#FF6B35]" size={28} />
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-16 text-[#6b5880]">
                  <Sliders size={40} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold">Nenhuma opção cadastrada neste grupo.</p>
                  <p className="text-xs text-[#a991c7] mt-1">Clique em "Adicionar Opção" acima para começar.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/[0.05]">
                        <th className="px-4 py-3 text-[#6b5880] text-xs font-bold uppercase tracking-wider">Nome</th>
                        <th className="px-4 py-3 text-[#6b5880] text-xs font-bold uppercase tracking-wider">Preço Adicional</th>
                        <th className="px-4 py-3 text-[#6b5880] text-xs font-bold uppercase tracking-wider">Máximo p/ Pedido</th>
                        <th className="px-4 py-3 text-[#6b5880] text-xs font-bold uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right text-[#6b5880] text-xs font-bold uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-b border-white/[0.03] hover:bg-white/[0.01]">
                          <td className="px-4 py-3.5 text-white font-extrabold text-sm">{item.name}</td>
                          <td className="px-4 py-3.5 text-[#a991c7] font-semibold text-sm">
                            {parseFloat(item.price) > 0 ? `+ R$ ${parseFloat(item.price).toFixed(2)}` : 'Grátis'}
                          </td>
                          <td className="px-4 py-3.5 text-white text-xs">{item.max_quantity}x</td>
                          <td className="px-4 py-3.5">
                            <Badge color={item.is_active === 1 ? 'green' : 'red'}>
                              {item.is_active === 1 ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditItem(item)}
                                className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item)}
                                className="p-1.5 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-all"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ) : (
            <div className="h-full glass rounded-3xl border border-white/[0.06] p-12 flex flex-col items-center justify-center text-center text-[#6b5880]">
              <Settings size={48} className="mb-3 opacity-30" />
              <p className="text-sm font-bold">Nenhum Grupo Selecionado</p>
              <p className="text-xs text-[#a991c7] mt-1">Crie ou selecione um grupo à esquerda para ver suas opções.</p>
            </div>
          )}
        </div>
      </div>

      {/* Group Modal */}
      {groupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass rounded-[32px] border border-white/[0.08] w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-6 bg-gradient-to-b from-[#240e3c] to-[#120218]">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-white">
                {editingGroup ? 'Editar Grupo de Complementos' : 'Novo Grupo de Complementos'}
              </h3>
              <button onClick={() => setGroupModalOpen(false)} className="text-[#a991c7] hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGroupSubmit} className="space-y-4">
              <Input
                label="Nome do Grupo (ex: Adicionais, Bebidas, Molhos)"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                placeholder="Insira o nome do grupo"
                required
              />

              <Input
                label="Descrição (ex: Selecione até 4 opções)"
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                placeholder="Insira uma breve instrução"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Quantidade Mínima"
                  type="number"
                  min="0"
                  value={groupForm.min_quantity}
                  onChange={(e) => setGroupForm({ ...groupForm, min_quantity: e.target.value })}
                  required
                />
                <Input
                  label="Quantidade Máxima"
                  type="number"
                  min="1"
                  value={groupForm.max_quantity}
                  onChange={(e) => setGroupForm({ ...groupForm, max_quantity: e.target.value })}
                  required
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                <div>
                  <p className="text-xs font-bold text-white">Este grupo é obrigatório?</p>
                  <p className="text-[10px] text-[#a991c7]">O cliente precisa escolher antes de adicionar ao carrinho.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setGroupForm({ ...groupForm, is_required: !groupForm.is_required })}
                  className="text-[#FF6B35] transition-all"
                >
                  {groupForm.is_required ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-gray-600" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                <div>
                  <p className="text-xs font-bold text-white">Grupo Ativo</p>
                  <p className="text-[10px] text-[#a991c7]">Exibir este grupo no cardápio de produtos.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setGroupForm({ ...groupForm, is_active: !groupForm.is_active })}
                  className="text-green-400 transition-all"
                >
                  {groupForm.is_active ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-gray-600" />}
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <Button variant="secondary" size="md" fullWidth type="button" onClick={() => setGroupModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" size="md" fullWidth type="submit" loading={submittingGroup}>
                  Salvar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass rounded-[32px] border border-white/[0.08] w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-6 bg-gradient-to-b from-[#240e3c] to-[#120218]">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-white">
                {editingItem ? 'Editar Opção de Adicional' : `Adicionar Opção em "${selectedGroup?.name}"`}
              </h3>
              <button onClick={() => setItemModalOpen(false)} className="text-[#a991c7] hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleItemSubmit} className="space-y-4">
              <Input
                label="Nome da Opção (ex: Bacon Extra, Queijo Coalho)"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                placeholder="Insira o nome da opção"
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Preço Adicional (R$)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                  required
                />
                <Input
                  label="Limite por Pedido"
                  type="number"
                  min="1"
                  value={itemForm.max_quantity}
                  onChange={(e) => setItemForm({ ...itemForm, max_quantity: e.target.value })}
                  required
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                <div>
                  <p className="text-xs font-bold text-white">Opção Ativa</p>
                  <p className="text-[10px] text-[#a991c7]">Exibir esta opção no cardápio de produtos.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setItemForm({ ...itemForm, is_active: !itemForm.is_active })}
                  className="text-green-400 transition-all"
                >
                  {itemForm.is_active ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-gray-600" />}
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <Button variant="secondary" size="md" fullWidth type="button" onClick={() => setItemModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" size="md" fullWidth type="submit" loading={submittingItem}>
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
