import { useState, useEffect } from 'react'
import { Plus, Edit2, ShieldAlert, User, Mail, Shield, UserCheck, X, ToggleLeft, ToggleRight, Loader2, Key } from 'lucide-react'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import toast from 'react-hot-toast'
import { users as usersApi } from '../services/api'

// Mock fallback
const MOCK_USERS = [
  { id: 1, name: 'Rafael Admin', email: 'admin@burgerhouse.com', phone: '(11) 99999-0000', role: 'dono', status: 'active', created_at: new Date().toISOString() },
  { id: 2, name: 'Maria Gerente', email: 'gerente@burgerhouse.com', phone: '(11) 98888-0000', role: 'gerente', status: 'active', created_at: new Date().toISOString() },
  { id: 3, name: 'Cozinheiro Chef', email: 'cozinha@burgerhouse.com', phone: '(11) 97777-0000', role: 'cozinha', status: 'active', created_at: new Date().toISOString() },
  { id: 4, name: 'Entregador Rápido', email: 'entregador@burgerhouse.com', phone: '(11) 96666-0000', role: 'entregador', status: 'inactive', created_at: new Date().toISOString() },
]

const rolesMap = {
  admin_geral: { label: 'Admin Geral', color: 'purple' },
  dono: { label: 'Proprietário', color: 'orange' },
  gerente: { label: 'Gerente', color: 'blue' },
  atendente: { label: 'Atendente', color: 'cyan' },
  cozinha: { label: 'Cozinha', color: 'yellow' },
  entregador: { label: 'Entregador', color: 'green' },
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'atendente',
    status: 'active'
  })

  const loadUsers = async () => {
    try {
      setLoading(true)
      const res = await usersApi.list()
      if (res.success && res.data) {
        setUsers(res.data)
      }
    } catch (err) {
      console.warn('Erro ao carregar colaboradores do backend, usando mock.', err)
      setUsers(MOCK_USERS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleOpenCreate = () => {
    setEditingUser(null)
    setForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'atendente',
      status: 'active'
    })
    setModalOpen(true)
  }

  const handleOpenEdit = (user) => {
    setEditingUser(user)
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      password: '', // do not display password
      role: user.role,
      status: user.status
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Preencha os campos obrigatórios.')
      return
    }

    setSubmitting(true)
    const data = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      role: form.role,
      status: form.status
    }

    if (form.password) {
      data.password = form.password
    }

    try {
      if (editingUser) {
        const res = await usersApi.update(editingUser.id, data)
        if (res.success) {
          toast.success('Colaborador atualizado com sucesso!')
          loadUsers()
          setModalOpen(false)
        }
      } else {
        if (!form.password) {
          toast.error('A senha é obrigatória para novos colaboradores.')
          setSubmitting(false)
          return
        }
        const res = await usersApi.create(data)
        if (res.success) {
          toast.success('Colaborador cadastrado com sucesso!')
          loadUsers()
          setModalOpen(false)
        }
      }
    } catch (err) {
      console.warn('Erro ao salvar colaborador no backend:', err)
      toast.error(err.message || 'Erro ao salvar colaborador.')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleStatus = async (user) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active'
    try {
      const res = await usersApi.update(user.id, { status: nextStatus })
      if (res.success) {
        toast.success(`Status de ${user.name} alterado!`)
        loadUsers()
      }
    } catch (err) {
      console.warn('Erro ao alterar status:', err)
      toast.error(err.message || 'Erro ao alterar status.')
    }
  }

  return (
    <div className="space-y-6 text-left">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserCheck className="text-[#FF6B35]" size={20} />
            Equipe e Colaboradores
          </h2>
          <p className="text-[#a991c7] text-sm">Gerencie os colaboradores da loja e suas permissões de acesso</p>
        </div>
        <Button variant="primary" size="md" leftIcon={Plus} onClick={handleOpenCreate}>
          Adicionar Colaborador
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
                  {['Colaborador', 'Contato', 'Perfil / Role', 'Status', 'Ações'].map((h) => (
                    <th key={h} className="text-left px-6 py-4 text-[#6b5880] text-xs font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {users.map((colab) => (
                  <tr key={colab.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#FF6B35] font-black">
                          {colab.name.slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white leading-tight">{colab.name}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{colab.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#a991c7] text-xs">{colab.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <Badge color={rolesMap[colab.role]?.color || 'gray'}>
                        {rolesMap[colab.role]?.label || colab.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleStatus(colab)} className="hover:opacity-85 transition-opacity">
                        <Badge color={colab.status === 'active' ? 'green' : colab.status === 'blocked' ? 'red' : 'gray'}>
                          {colab.status === 'active' ? 'Ativo' : colab.status === 'blocked' ? 'Bloqueado' : 'Inativo'}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-6 py-4 flex items-center gap-3">
                      <button
                        onClick={() => handleOpenEdit(colab)}
                        className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal User */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1A0533] border border-white/10 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">
                {editingUser ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Nome do Colaborador"
                placeholder="Ex: Carlos Oliveira"
                value={form.name}
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="E-mail de Acesso"
                  placeholder="carlos@email.com"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                  required
                />
                <Input
                  label="WhatsApp"
                  placeholder="(11) 99999-9999"
                  value={form.phone}
                  onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={editingUser ? 'Senha (Deixe vazio para manter)' : 'Senha de Acesso'}
                  placeholder="Min. 6 caracteres"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                  required={!editingUser}
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#d4bfee]">Perfil / Nível de Acesso</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))}
                    disabled={editingUser && editingUser.role === 'dono'}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6B35]/60 h-[42px] disabled:opacity-50"
                  >
                    {editingUser && editingUser.role === 'dono' && (
                      <option value="dono" className="bg-[#1A0533]">Proprietário (Full)</option>
                    )}
                    <option value="gerente" className="bg-[#1A0533]">Gerente</option>
                    <option value="atendente" className="bg-[#1A0533]">Atendente / Caixa</option>
                    <option value="cozinha" className="bg-[#1A0533]">Cozinha / Preparo</option>
                    <option value="entregador" className="bg-[#1A0533]">Entregador / Delivery</option>
                  </select>
                </div>
              </div>

              {editingUser && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#d4bfee]">Status do Usuário</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
                    disabled={editingUser.role === 'dono'}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6B35]/60 h-[42px] disabled:opacity-50"
                  >
                    <option value="active" className="bg-[#1A0533]">Ativo (Liberado)</option>
                    <option value="inactive" className="bg-[#1A0533]">Inativo (Suspenso)</option>
                    <option value="blocked" className="bg-[#1A0533]">Bloqueado</option>
                  </select>
                </div>
              )}

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
