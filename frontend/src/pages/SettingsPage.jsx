import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Save, Clock, Truck, ShieldAlert, MessageSquare, Phone, ToggleLeft, ToggleRight, Loader2, Info, CreditCard } from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import toast from 'react-hot-toast'
import { settings as settingsApi, restaurants as restaurantApi } from '../services/api'

const tabs = [
  { key: 'general', label: 'Geral & Operação', icon: Phone },
  { key: 'hours', label: 'Horários de Funcionamento', icon: Clock },
  { key: 'delivery', label: 'Delivery & Valores', icon: Truck },
  { key: 'messages', label: 'Mensagens do Cardápio', icon: MessageSquare },
  { key: 'payment', label: 'Formas de Pagamento', icon: CreditCard },
]

const DAYS_MAPPING = {
  monday: { label: 'Segunda-feira', key: 'monday' },
  tuesday: { label: 'Terça-feira', key: 'tuesday' },
  wednesday: { label: 'Quarta-feira', key: 'wednesday' },
  thursday: { label: 'Quinta-feira', key: 'thursday' },
  friday: { label: 'Sexta-feira', key: 'friday' },
  saturday: { label: 'Sábado', key: 'saturday' },
  sunday: { label: 'Domingo', key: 'sunday' }
}

export default function SettingsPage() {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    is_open: false,
    support_phone: '',
    accept_orders_when_closed: false,
    min_order_value: '',
    delivery_fee: '',
    estimated_delivery_time: '',
    welcome_message: '',
    order_confirmed_message: '',
    order_dispatched_message: '',
    whatsapp_number: '',
    auto_accept_orders: false,
  })

  const [paymentForm, setPaymentForm] = useState({
    accepts_cash: true,
    accepts_credit_card: true,
    accepts_debit_card: true,
    accepts_pix: true,
    pix_key_type: 'email',
    pix_key: '',
    pix_receiver_name: '',
    pix_receiver_city: '',
    pix_instructions: '',
  })

  const [hours, setHours] = useState({
    monday: { open: '11:00', close: '23:00', enabled: true },
    tuesday: { open: '11:00', close: '23:00', enabled: true },
    wednesday: { open: '11:00', close: '23:00', enabled: true },
    thursday: { open: '11:00', close: '23:00', enabled: true },
    friday: { open: '11:00', close: '00:00', enabled: true },
    saturday: { open: '11:00', close: '00:00', enabled: true },
    sunday: { open: '12:00', close: '22:00', enabled: false },
  })

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true)
        const res = await settingsApi.get()
        if (res.success && res.data) {
          const d = res.data
          setForm({
            is_open: d.is_open === 1 || d.is_open === true,
            support_phone: d.support_phone || '',
            accept_orders_when_closed: d.accept_orders_when_closed === 1 || d.accept_orders_when_closed === true,
            min_order_value: d.min_order_value !== null ? String(d.min_order_value) : '',
            delivery_fee: d.delivery_fee !== null ? String(d.delivery_fee) : '',
            estimated_delivery_time: d.estimated_delivery_time !== null ? String(d.estimated_delivery_time) : '',
            welcome_message: d.welcome_message || '',
            order_confirmed_message: d.order_confirmed_message || '',
            order_dispatched_message: d.order_dispatched_message || '',
            whatsapp_number: d.whatsapp_number || '',
            auto_accept_orders: d.auto_accept_orders === 1 || d.auto_accept_orders === true,
          })

          if (d.opening_hours) {
            let formattedHours = {}
            if (typeof d.opening_hours === 'object') {
              formattedHours = { ...d.opening_hours }
            } else if (typeof d.opening_hours === 'string') {
              try {
                formattedHours = JSON.parse(d.opening_hours)
              } catch (e) {
                formattedHours = {}
              }
            }

            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            days.forEach(day => {
              if (!formattedHours[day]) {
                formattedHours[day] = { open: '11:00', close: '23:00', enabled: true }
              } else {
                const openVal = formattedHours[day].open || formattedHours[day].from || '11:00'
                const closeVal = formattedHours[day].close || formattedHours[day].to || '23:00'
                const enabledVal = formattedHours[day].enabled !== undefined 
                  ? !!formattedHours[day].enabled 
                  : (formattedHours[day].enabled === undefined ? true : false)
                formattedHours[day] = { open: openVal, close: closeVal, enabled: enabledVal }
              }
            })
            setHours(formattedHours)
          }
        }

        const payRes = await settingsApi.getPayments()
        if (payRes.success && payRes.data) {
          const pd = payRes.data
          setPaymentForm({
            accepts_cash: pd.accepts_cash === 1 || pd.accepts_cash === true,
            accepts_credit_card: pd.accepts_credit_card === 1 || pd.accepts_credit_card === true,
            accepts_debit_card: pd.accepts_debit_card === 1 || pd.accepts_debit_card === true,
            accepts_pix: pd.accepts_pix === 1 || pd.accepts_pix === true,
            pix_key_type: pd.pix_key_type || 'email',
            pix_key: pd.pix_key || '',
            pix_receiver_name: pd.pix_receiver_name || '',
            pix_receiver_city: pd.pix_receiver_city || '',
            pix_instructions: pd.pix_instructions || '',
          })
        }
      } catch (err) {
        console.error('Erro ao carregar configurações do restaurante:', err)
        toast.error('Não foi possível carregar as configurações do servidor.')
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        is_open: form.is_open,
        support_phone: form.support_phone,
        accept_orders_when_closed: form.accept_orders_when_closed,
        min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : 0,
        delivery_fee: form.delivery_fee ? parseFloat(form.delivery_fee) : 0,
        estimated_delivery_time: form.estimated_delivery_time ? parseInt(form.estimated_delivery_time) : 0,
        welcome_message: form.welcome_message,
        order_confirmed_message: form.order_confirmed_message,
        order_dispatched_message: form.order_dispatched_message,
        whatsapp_number: form.whatsapp_number,
        auto_accept_orders: form.auto_accept_orders,
      }

      await settingsApi.update(payload)
      await restaurantApi.updateHours(hours)

      // Salva configurações de pagamento
      const paymentPayload = {
        accepts_cash: paymentForm.accepts_cash,
        accepts_credit_card: paymentForm.accepts_credit_card,
        accepts_debit_card: paymentForm.accepts_debit_card,
        accepts_pix: paymentForm.accepts_pix,
        pix_key: paymentForm.pix_key,
        pix_key_type: paymentForm.pix_key_type,
        pix_receiver_name: paymentForm.pix_receiver_name,
        pix_receiver_city: paymentForm.pix_receiver_city,
        pix_instructions: paymentForm.pix_instructions,
      }
      await settingsApi.updatePayments(paymentPayload)

      toast.success('Configurações salvas com sucesso! 🚀')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Erro ao salvar as configurações.')
    } finally {
      setSaving(false)
    }
  }

  const toggleHour = (dayKey) => {
    setHours(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        enabled: !prev[dayKey].enabled
      }
    }))
  }

  const updateHourTime = (dayKey, field, value) => {
    setHours(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: value
      }
    }))
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#FF6B35]" size={32} />
          <p className="text-[#a991c7] text-sm">Carregando configurações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Configurações Operacionais</h2>
          <p className="text-[#a991c7] text-sm mt-1">Gerencie o funcionamento, taxas, horários e mensagens do seu estabelecimento.</p>
        </div>
        <Button variant="primary" size="md" leftIcon={Save} loading={saving} onClick={handleSave}>
          Salvar Alterações
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap glass rounded-2xl p-1.5 border border-white/[0.06] w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === key
                ? 'bg-[#FF6B35] text-white shadow-[0_0_12px_rgba(255,107,53,0.3)]'
                : 'text-[#a991c7] hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        
        {/* Tab 1: Geral & Operacao */}
        {activeTab === 'general' && (
          <Card title="Geral e Funcionamento">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Status Aberto/Fechado */}
              <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-bold text-white block">Status do Estabelecimento</label>
                    <span className="text-xs text-[#a991c7] mt-0.5">Determine se a loja está aberta ou fechada para receber pedidos agora.</span>
                  </div>
                  <button
                    onClick={() => setForm(p => ({ ...p, is_open: !p.is_open }))}
                    className="focus:outline-none transition-transform active:scale-95"
                  >
                    {form.is_open ? (
                      <ToggleRight size={44} className="text-green-500" />
                    ) : (
                      <ToggleLeft size={44} className="text-red-500" />
                    )}
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${form.is_open ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className={`text-xs font-extrabold uppercase ${form.is_open ? 'text-green-400' : 'text-red-400'}`}>
                    {form.is_open ? 'Aberto' : 'Fechado'}
                  </span>
                </div>
              </div>

              {/* Aceitar pedidos com restaurante fechado */}
              <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-bold text-white block">Aceitar Pedidos Fechado?</label>
                    <span className="text-xs text-[#a991c7] mt-0.5">Permitir que clientes enviem pedidos no cardápio digital mesmo com o restaurante fechado.</span>
                  </div>
                  <button
                    onClick={() => setForm(p => ({ ...p, accept_orders_when_closed: !p.accept_orders_when_closed }))}
                    className="focus:outline-none transition-transform active:scale-95"
                  >
                    {form.accept_orders_when_closed ? (
                      <ToggleRight size={44} className="text-[#FF6B35]" />
                    ) : (
                      <ToggleLeft size={44} className="text-gray-500" />
                    )}
                  </button>
                </div>
                <div className="mt-3">
                  <span className="text-xs font-bold text-gray-400">
                    Modo atual: <strong className="text-white">{form.accept_orders_when_closed ? 'Sim (Permite agendar)' : 'Não (Bloqueia compras)'}</strong>
                  </span>
                </div>
              </div>

              <Input
                label="Telefone de Suporte"
                value={form.support_phone}
                onChange={(e) => setForm(p => ({ ...p, support_phone: e.target.value }))}
                placeholder="(00) 00000-0000"
                hint="Telefone exibido no rastreamento do pedido para suporte ao cliente."
                leftIcon={Phone}
              />

              <Input
                label="WhatsApp Operacional"
                value={form.whatsapp_number}
                onChange={(e) => setForm(p => ({ ...p, whatsapp_number: e.target.value }))}
                placeholder="5500900000000"
                hint="Número com DDI (ex: 55...) para notificações e contatos rápidos."
                leftIcon={Phone}
              />

              <div className="md:col-span-2 flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div>
                  <label className="text-sm font-bold text-white block">Aceitação Automática de Pedidos</label>
                  <span className="text-xs text-[#a991c7] mt-0.5">Aprovar automaticamente os novos pedidos sem necessidade de intervenção manual no painel.</span>
                </div>
                <button
                  onClick={() => setForm(p => ({ ...p, auto_accept_orders: !p.auto_accept_orders }))}
                  className="focus:outline-none transition-transform active:scale-95"
                >
                  {form.auto_accept_orders ? (
                    <ToggleRight size={44} className="text-[#FF6B35]" />
                  ) : (
                    <ToggleLeft size={44} className="text-gray-500" />
                  )}
                </button>
              </div>

            </div>
          </Card>
        )}

        {/* Tab 2: Horarios de Funcionamento */}
        {activeTab === 'hours' && (
          <Card title="Horários de Funcionamento Semanal" subtitle="Configure o expediente de trabalho do restaurante em cada dia da semana.">
            <div className="space-y-4">
              {Object.keys(DAYS_MAPPING).map((dayKey) => {
                const day = DAYS_MAPPING[dayKey]
                const config = hours[dayKey] || { open: '11:00', close: '23:00', enabled: false }

                return (
                  <div
                    key={dayKey}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 transition-all hover:bg-white/[0.03]"
                  >
                    <div className="flex items-center gap-4">
                      {/* Checkbox / Toggle enabled */}
                      <button
                        onClick={() => toggleHour(dayKey)}
                        className={`w-28 py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                          config.enabled
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : 'bg-gray-500/10 border-gray-500/20 text-gray-500'
                        }`}
                      >
                        {day.label}
                      </button>
                      <span className={`text-xs ${config.enabled ? 'text-green-400 font-semibold' : 'text-gray-500 italic'}`}>
                        {config.enabled ? 'Expediente Aberto' : 'Fechado'}
                      </span>
                    </div>

                    {config.enabled ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={config.open}
                          onChange={(e) => updateHourTime(dayKey, 'open', e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF6B35]/60 focus:bg-white/10"
                        />
                        <span className="text-[#a991c7] text-xs font-semibold px-1">até</span>
                        <input
                          type="time"
                          value={config.close}
                          onChange={(e) => updateHourTime(dayKey, 'close', e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF6B35]/60 focus:bg-white/10"
                        />
                      </div>
                    ) : (
                      <span className="text-gray-500 text-xs italic sm:pr-4">Estabelecimento fechado neste dia</span>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Tab 3: Delivery e Valores */}
        {activeTab === 'delivery' && (
          <Card title="Valores e Tempos Operacionais">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <Input
                label="Pedido Mínimo (R$)"
                type="number"
                step="0.01"
                min="0"
                value={form.min_order_value}
                onChange={(e) => setForm(p => ({ ...p, min_order_value: e.target.value }))}
                placeholder="0.00"
                hint="Valor mínimo em produtos no carrinho para permitir checkout."
              />

              <Input
                label="Taxa de Entrega Padrão (R$)"
                type="number"
                step="0.01"
                min="0"
                value={form.delivery_fee}
                onChange={(e) => setForm(p => ({ ...p, delivery_fee: e.target.value }))}
                placeholder="0.00"
                hint="Taxa de frete padrão aplicada a todos os pedidos de delivery."
              />

              <Input
                label="Tempo Médio de Preparo (minutos)"
                type="number"
                min="1"
                value={form.estimated_delivery_time}
                onChange={(e) => setForm(p => ({ ...p, estimated_delivery_time: e.target.value }))}
                placeholder="45"
                hint="Prazo de entrega médio que será exibido aos clientes no cardápio."
              />

              <div className="p-4 rounded-2xl bg-[#FF6B35]/5 border border-[#FF6B35]/15 flex items-start gap-3">
                <Info size={20} className="text-[#FF6B35] shrink-0 mt-0.5" />
                <div className="text-xs text-[#a991c7] leading-relaxed">
                  <strong className="text-white font-bold block mb-1">Dica Operacional:</strong>
                  Mantenha a taxa de entrega e o tempo de preparo alinhados com a sua equipe de motoboys. Você também pode alterar essas configurações a qualquer momento para se adaptar a horários de pico.
                </div>
              </div>

            </div>
          </Card>
        )}

        {/* Tab 4: Mensagens */}
        {activeTab === 'messages' && (
          <Card title="Mensagens Personalizadas do Cliente" subtitle="Configure as mensagens e textos que serão exibidos para o seu cliente final.">
            <div className="space-y-6">
              
              {/* Mensagem de Boas-vindas */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-[#d4bfee]">Mensagem de Boas-vindas</label>
                <span className="text-xs text-[#a991c7] mb-1">Exibida em destaque no topo do cardápio digital do cliente.</span>
                <textarea
                  value={form.welcome_message}
                  onChange={(e) => setForm(p => ({ ...p, welcome_message: e.target.value }))}
                  placeholder="Seja muito bem-vindo ao Burger House! Faça o seu pedido abaixo e aproveite os nossos descontos de hoje!"
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#6b5880] focus:outline-none focus:border-[#FF6B35]/60 focus:bg-white/10 transition-all resize-none"
                />
              </div>

              {/* Mensagem de Pedido Confirmado */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-[#d4bfee]">Mensagem de Pedido Confirmado</label>
                <span className="text-xs text-[#a991c7] mb-1">Substitui a descrição da etapa 'Confirmado' na tela de rastreamento do cliente.</span>
                <textarea
                  value={form.order_confirmed_message}
                  onChange={(e) => setForm(p => ({ ...p, order_confirmed_message: e.target.value }))}
                  placeholder="Seu pedido foi recebido com sucesso! Nossa cozinha já está organizando os ingredientes."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#6b5880] focus:outline-none focus:border-[#FF6B35]/60 focus:bg-white/10 transition-all resize-none"
                />
              </div>

              {/* Mensagem de Pedido saiu para entrega */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-[#d4bfee]">Mensagem de Pedido Saiu para Entrega</label>
                <span className="text-xs text-[#a991c7] mb-1">Substitui a descrição da etapa 'Em Rota' na tela de rastreamento do cliente.</span>
                <textarea
                  value={form.order_dispatched_message}
                  onChange={(e) => setForm(p => ({ ...p, order_dispatched_message: e.target.value }))}
                  placeholder="Excelente notícia! Seu pedido já está com o entregador e a caminho da sua casa."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#6b5880] focus:outline-none focus:border-[#FF6B35]/60 focus:bg-white/10 transition-all resize-none"
                />
              </div>

            </div>
          </Card>
        )}

        {/* Tab 5: Formas de Pagamento */}
        {activeTab === 'payment' && (
          <Card title="Formas de Pagamento Aceitas" subtitle="Gerencie quais meios de pagamento estão disponíveis para seus clientes e configure seus dados Pix.">
            <div className="space-y-6 text-left">
              
              {/* Toggles for payment methods */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* Pix */}
                <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-white block">Aceitar Pix</span>
                      <span className="text-xs text-[#a991c7]">Chave manual no checkout</span>
                    </div>
                    <button
                      onClick={() => setPaymentForm(p => ({ ...p, accepts_pix: !p.accepts_pix }))}
                      className="focus:outline-none transition-transform active:scale-95 animate-none"
                    >
                      {paymentForm.accepts_pix ? (
                        <ToggleRight size={40} className="text-[#FF6B35]" />
                      ) : (
                        <ToggleLeft size={40} className="text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Dinheiro */}
                <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-white block">Dinheiro</span>
                      <span className="text-xs text-[#a991c7]">Pagamento na entrega</span>
                    </div>
                    <button
                      onClick={() => setPaymentForm(p => ({ ...p, accepts_cash: !p.accepts_cash }))}
                      className="focus:outline-none transition-transform active:scale-95 animate-none"
                    >
                      {paymentForm.accepts_cash ? (
                        <ToggleRight size={40} className="text-[#FF6B35]" />
                      ) : (
                        <ToggleLeft size={40} className="text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Cartão de Crédito */}
                <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-white block">Cartão de Crédito</span>
                      <span className="text-xs text-[#a991c7]">Maquininha na entrega</span>
                    </div>
                    <button
                      onClick={() => setPaymentForm(p => ({ ...p, accepts_credit_card: !p.accepts_credit_card }))}
                      className="focus:outline-none transition-transform active:scale-95 animate-none"
                    >
                      {paymentForm.accepts_credit_card ? (
                        <ToggleRight size={40} className="text-[#FF6B35]" />
                      ) : (
                        <ToggleLeft size={40} className="text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Cartão de Débito */}
                <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-white block">Cartão de Débito</span>
                      <span className="text-xs text-[#a991c7]">Maquininha na entrega</span>
                    </div>
                    <button
                      onClick={() => setPaymentForm(p => ({ ...p, accepts_debit_card: !p.accepts_debit_card }))}
                      className="focus:outline-none transition-transform active:scale-95 animate-none"
                    >
                      {paymentForm.accepts_debit_card ? (
                        <ToggleRight size={40} className="text-[#FF6B35]" />
                      ) : (
                        <ToggleLeft size={40} className="text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>

              </div>

              {/* Pix Configuration Fields (Visible only if accepts_pix is true) */}
              {paymentForm.accepts_pix && (
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-6">
                  <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2">Configuração da Chave Pix Manual</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Key Type Select */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-bold text-[#d4bfee]">Tipo da Chave Pix</label>
                      <select
                        value={paymentForm.pix_key_type}
                        onChange={(e) => setPaymentForm(p => ({ ...p, pix_key_type: e.target.value }))}
                        className="w-full bg-[#160b29] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6B35]/60 focus:bg-[#1f0d3a] transition-all"
                      >
                        <option value="cpf">CPF</option>
                        <option value="cnpj">CNPJ</option>
                        <option value="email">E-mail</option>
                        <option value="phone">Celular</option>
                        <option value="random">Chave Aleatória (EVP)</option>
                      </select>
                    </div>

                    {/* Key Input */}
                    <Input
                      label="Chave Pix"
                      value={paymentForm.pix_key}
                      onChange={(e) => setPaymentForm(p => ({ ...p, pix_key: e.target.value }))}
                      placeholder="Sua chave Pix aqui..."
                      hint="Chave Pix que será apresentada para transferência no checkout."
                    />

                    {/* Receiver Name */}
                    <Input
                      label="Nome do Recebedor"
                      value={paymentForm.pix_receiver_name}
                      onChange={(e) => setPaymentForm(p => ({ ...p, pix_receiver_name: e.target.value }))}
                      placeholder="Nome completo do titular da conta..."
                      hint="Nome exibido para conferência no app de banco do cliente."
                    />

                    {/* Receiver City */}
                    <Input
                      label="Cidade"
                      value={paymentForm.pix_receiver_city}
                      onChange={(e) => setPaymentForm(p => ({ ...p, pix_receiver_city: e.target.value }))}
                      placeholder="Cidade da conta Pix..."
                      hint="Cidade cadastrada no banco para o recebimento do Pix."
                    />

                    {/* Instructions */}
                    <div className="md:col-span-2 flex flex-col gap-1.5">
                      <label className="text-sm font-bold text-[#d4bfee]">Mensagem de Instrução</label>
                      <span className="text-xs text-[#a991c7] mb-1">Passo a passo ou orientações para o cliente enviar o comprovante de pagamento Pix.</span>
                      <textarea
                        value={paymentForm.pix_instructions}
                        onChange={(e) => setPaymentForm(p => ({ ...p, pix_instructions: e.target.value }))}
                        placeholder="Ex: Realize a transferência Pix para os dados acima. Após fazer o Pix, envie o comprovante de pagamento no nosso WhatsApp de suporte para iniciarmos a preparação do seu pedido!"
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#6b5880] focus:outline-none focus:border-[#FF6B35]/60 focus:bg-white/10 transition-all resize-none"
                      />
                    </div>

                  </div>
                </div>
              )}

            </div>
          </Card>
        )}

      </div>
    </div>
  )
}
