import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Smartphone, Wifi, WifiOff, RefreshCw, Power, QrCode,
  MessageSquare, CheckCircle2, AlertCircle, Clock, Send,
  BarChart3, Loader2, PhoneCall, Zap, Settings, ChevronRight,
  Activity, Shield, Globe, Bot, Sparkles, FlaskConical,
  ToggleLeft, ToggleRight, BrainCircuit, KeyRound, Play
} from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import api from '../services/api'

// ─── API ─────────────────────────────────────────────────────────────────────
const whatsappApi = {
  status:           () => api.get('/whatsapp/status'),
  configStatus:     () => api.get('/whatsapp/config-status'),
  connect:          () => api.post('/whatsapp/connect'),
  disconnect:       () => api.post('/whatsapp/disconnect'),
  reconnect:        () => api.post('/whatsapp/reconnect'),
  qrcode:           () => api.get('/whatsapp/qrcode'),
  send:             (data) => api.post('/whatsapp/send', data),
  logs:             (params) => api.get('/whatsapp/logs', { params }),
  getSettings:      () => api.get('/whatsapp/settings'),
  updateSettings:   (data) => api.put('/whatsapp/settings', data),
  getAISettings:    () => api.get('/whatsapp/ai-settings'),
  updateAISettings: (data) => api.put('/whatsapp/ai-settings', data),
  testAI:           (question) => api.post('/whatsapp/ai-test', { question }),
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    connected:    { label: 'Conectado',     color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400 animate-pulse' },
    connecting:   { label: 'Conectando...', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',     dot: 'bg-amber-400 animate-pulse' },
    disconnected: { label: 'Desconectado',  color: 'text-gray-400 bg-gray-500/10 border-gray-500/20',        dot: 'bg-gray-400' },
    error:        { label: 'Erro',          color: 'text-red-400 bg-red-500/10 border-red-500/20',           dot: 'bg-red-400' },
  }
  const s = map[status] || map.disconnected
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${s.color}`}>
      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

// ─── QR Code Display ─────────────────────────────────────────────────────────
function QrCodePanel({ qrCode, loading, onRefresh, errorMsg, evoConfigured }) {
  const isDemoQr = qrCode?.startsWith('DEMO_QR_') && !evoConfigured
  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="relative">
        <div className="w-64 h-64 bg-white rounded-2xl flex items-center justify-center shadow-2xl border-4 border-[#FF6B35]/30 relative overflow-hidden">
          {loading ? (
            <Loader2 className="animate-spin text-[#FF6B35]" size={40} />
          ) : errorMsg ? (
            <div className="flex flex-col items-center gap-3 p-4 text-center">
              <AlertCircle size={48} className="text-red-500 animate-bounce" />
              <p className="text-red-600 text-xs font-bold leading-snug">Erro na Evolution API:<br /><span className="text-gray-400 font-normal leading-normal">{errorMsg}</span></p>
            </div>
          ) : isDemoQr ? (
            <div className="flex flex-col items-center gap-3 p-4 text-center">
              <QrCode size={64} className="text-[#FF6B35]" />
              <p className="text-gray-600 text-xs font-medium leading-snug">QR Code demo<br /><span className="text-gray-400">(Evolution API não configurada)</span></p>
            </div>
          ) : qrCode ? (
            <img src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} alt="QR Code WhatsApp" className="w-56 h-56 object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-3 text-center p-4">
              <QrCode size={48} className="text-gray-300" />
              <p className="text-gray-400 text-xs">QR Code não disponível</p>
            </div>
          )}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#FF6B35] rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#FF6B35] rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#FF6B35] rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#FF6B35] rounded-br-lg" />
        </div>
        <div className="absolute inset-0 rounded-2xl border-2 border-[#FF6B35]/20 animate-ping pointer-events-none" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-white font-bold text-sm">Como conectar:</p>
        <ol className="text-xs text-[#a991c7] space-y-1 text-left list-none">
          {['Abra o WhatsApp no seu celular', 'Toque em ⋮ Menu → Dispositivos conectados', 'Toque em "Conectar um dispositivo"', 'Aponte a câmera para o QR Code acima'].map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-[#FF6B35]/20 text-[#FF6B35] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
      <Button variant="ghost" size="sm" leftIcon={RefreshCw} onClick={onRefresh} loading={loading}>Atualizar QR Code</Button>
    </div>
  )
}

// ─── Message Log Item ─────────────────────────────────────────────────────────
function LogItem({ log }) {
  const statusMap = {
    sent:    { icon: CheckCircle2, color: 'text-emerald-400' },
    error:   { icon: AlertCircle,  color: 'text-red-400' },
    demo:    { icon: Activity,     color: 'text-amber-400' },
    pending: { icon: Clock,        color: 'text-gray-400' },
  }
  const { icon: Icon, color } = statusMap[log.status] || statusMap.pending
  const eventLabels = {
    manual:               'Manual',
    received:             '📥 Recebido',
    ai_response:          '🤖 IA Respondeu',
    order_pending:        'Pedido Recebido',
    order_confirmed:      'Pedido Confirmado',
    order_preparing:      'Em Preparo',
    order_ready:          'Pronto',
    order_out_for_delivery: 'Saiu p/ Entrega',
    order_delivered:      'Entregue',
    order_cancelled:      'Cancelado',
    outbound:             'Enviado',
  }
  const isAI = log.event_type === 'ai_response'
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl transition-all border ${isAI ? 'bg-violet-500/5 border-violet-500/10 hover:bg-violet-500/10' : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/[0.04]'}`}>
      {isAI ? <Bot size={16} className="shrink-0 mt-0.5 text-violet-400" /> : <Icon size={16} className={`shrink-0 mt-0.5 ${color}`} />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-white">{eventLabels[log.event_type] || log.event_type}</span>
          {log.recipient_phone && (
            <span className="text-[10px] text-[#a991c7] bg-white/5 px-2 py-0.5 rounded-full">+{log.recipient_phone}</span>
          )}
        </div>
        <p className="text-xs text-[#a991c7] mt-0.5 line-clamp-2">{log.message_text}</p>
        {log.error_message && <p className="text-[10px] text-red-400 mt-0.5">{log.error_message}</p>}
      </div>
      <span className="text-[10px] text-gray-500 shrink-0">
        {new Date(log.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}

// ─── AI Chat Bubble ───────────────────────────────────────────────────────────
function ChatBubble({ role, content }) {
  const isUser = role === 'user'
  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5">
          <Bot size={14} className="text-white" />
        </div>
      )}
      <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? 'bg-[#FF6B35] text-white rounded-tr-sm'
          : 'bg-white/[0.07] text-white border border-white/10 rounded-tl-sm'
      }`}>
        {content}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-[#FF6B35]/20 flex items-center justify-center shrink-0 mt-0.5 border border-[#FF6B35]/30">
          <Smartphone size={14} className="text-[#FF6B35]" />
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WhatsAppPage() {
  const [conn, setConn]                 = useState(null)
  const [loading, setLoading]           = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [qrLoading, setQrLoading]       = useState(false)
  const [logs, setLogs]                 = useState([])
  const [logsPage, setLogsPage]         = useState(1)
  const [logsPagination, setLogsPagination] = useState(null)
  const [logsLoading, setLogsLoading]   = useState(false)
  const [activeTab, setActiveTab]       = useState('connection')

  const [msgForm, setMsgForm]     = useState({ phone: '', message: '' })
  const [msgSending, setMsgSending] = useState(false)

  const [wSettings, setWSettings]         = useState(null)
  const [settingsSaving, setSettingsSaving] = useState(false)

  // IA state
  const [aiSettings, setAiSettings]       = useState(null)
  const [aiSaving, setAiSaving]           = useState(false)
  const [aiTestQuestion, setAiTestQuestion] = useState('')
  const [aiTestLoading, setAiTestLoading] = useState(false)
  const [aiTestMessages, setAiTestMessages] = useState([])
  const [aiContextPreview, setAiContextPreview] = useState('')

  // Evolution Config Status and Errors
  const [evoConfig, setEvoConfig]       = useState(null)
  const [errorMsg, setErrorMsg]         = useState(null)

  const pollingRef  = useRef(null)
  const pollingQrRef = useRef(null)
  const chatEndRef  = useRef(null)

  // ─── Load functions ───────────────────────────────────────────────────────
  const loadStatus = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setErrorMsg(null)
      const res = await whatsappApi.status()
      if (res.success) {
        const connData = res.data || {
          status: res.state === 'open' ? 'connected' : (res.state === 'connecting' ? 'connecting' : 'disconnected'),
          phone_number: null,
          profile_name: null,
          qr_code: null
        }
        setConn(connData)
      }
    } catch (e) {
      setErrorMsg(e.message || 'Erro ao carregar status do WhatsApp')
      if (!silent) toast.error('Erro ao carregar status do WhatsApp')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  const loadLogs = useCallback(async (page = 1, currentLogs = []) => {
    try {
      setLogsLoading(true)
      const res = await whatsappApi.logs({ page, limit: 20 })
      if (res.success) {
        setLogs(page === 1 ? res.data : [...currentLogs, ...res.data])
        setLogsPagination(res.pagination)
        setLogsPage(page)
      }
    } catch (e) { } finally {
      setLogsLoading(false)
    }
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      const [settRes, aiRes] = await Promise.all([
        whatsappApi.getSettings(),
        whatsappApi.getAISettings(),
      ])
      if (settRes.success) setWSettings(settRes.data)
      if (aiRes.success)   setAiSettings(aiRes.data)
    } catch (e) { }
  }, [])

  const loadConfigStatus = useCallback(async () => {
    try {
      const res = await whatsappApi.configStatus()
      setEvoConfig(res)
    } catch (e) {
      console.error('Erro ao carregar config status:', e)
    }
  }, [])

  useEffect(() => {
    loadStatus()
    loadConfigStatus()
    loadLogs(1)
    loadSettings()
    // eslint-disable-next-line
  }, [])

  // Polling while connecting
  useEffect(() => {
    if (conn?.status === 'connecting') {
      pollingRef.current = setInterval(() => loadStatus(true), 5000)
    } else {
      clearInterval(pollingRef.current)
    }
    return () => clearInterval(pollingRef.current)
  }, [conn?.status, loadStatus])

  // Polling QR Code while connecting
  useEffect(() => {
    if (conn?.status === 'connecting') {
      pollingQrRef.current = setInterval(async () => {
        try {
          const res = await whatsappApi.qrcode()
          if (res.success && res.data?.qr_code) {
            setConn(prev => {
              if (!prev || prev.status !== 'connecting') return prev;
              return { ...prev, qr_code: res.data.qr_code };
            });
          }
        } catch (e) {
          console.error("Erro ao atualizar QR no polling:", e);
        }
      }, 15000)
    } else {
      clearInterval(pollingQrRef.current)
    }
    return () => clearInterval(pollingQrRef.current)
  }, [conn?.status])

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiTestMessages])

  // ─── Actions ──────────────────────────────────────────────────────────────
  const handleConnect = async () => {
    try {
      setActionLoading(true)
      setQrLoading(true)
      setErrorMsg(null)
      const res = await whatsappApi.connect()
      if (res.success) {
        const connData = res.data || {
          session_name: res.instanceName,
          status: res.status,
          qr_code: res.qrcode
        }
        setConn(connData)
        toast.success('Iniciando conexão...')
      }
    } catch (e) {
      const fullError = e.details ? `${e.message} (Detalhes: ${e.details})` : (e.message || 'Erro ao conectar')
      setErrorMsg(fullError)
      toast.error(fullError)
    } finally {
      setActionLoading(false)
      setQrLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) return
    try {
      setActionLoading(true)
      await whatsappApi.disconnect()
      toast.success('WhatsApp desconectado.')
      await loadStatus()
    } catch (e) { toast.error(e.message || 'Erro ao desconectar') } finally { setActionLoading(false) }
  }

  const handleReconnect = async () => {
    try {
      setActionLoading(true)
      setErrorMsg(null)
      const res = await whatsappApi.reconnect()
      if (res.success) {
        const connData = res.data || {
          session_name: res.instanceName,
          status: res.status,
          qr_code: res.qrcode
        }
        setConn(connData)
        toast.success('Recriando conexão...')
      }
    } catch (e) {
      const fullError = e.details ? `${e.message} (Detalhes: ${e.details})` : (e.message || 'Erro ao recriar conexão')
      setErrorMsg(fullError)
      toast.error(fullError)
    } finally { setActionLoading(false) }
  }

  const handleRefreshQr = async () => {
    try {
      setQrLoading(true)
      setErrorMsg(null)
      const res = await whatsappApi.qrcode()
      if (res.success && res.data?.qr_code) setConn(prev => ({ ...prev, qr_code: res.data.qr_code }))
    } catch (e) {
      const fullError = e.details ? `${e.message} (Detalhes: ${e.details})` : (e.message || 'Erro ao atualizar QR Code')
      setErrorMsg(fullError)
    } finally { setQrLoading(false) }
  }

  const handleSendMessage = async () => {
    if (!msgForm.phone || !msgForm.message) { toast.error('Preencha o telefone e a mensagem.'); return }
    try {
      setMsgSending(true)
      const res = await whatsappApi.send(msgForm)
      toast.success(res.message || 'Mensagem enviada!')
      setMsgForm({ phone: '', message: '' })
      await loadLogs(1)
    } catch (e) { toast.error(e.message || 'Erro ao enviar mensagem') } finally { setMsgSending(false) }
  }

  const handleSaveSettings = async () => {
    try {
      setSettingsSaving(true)
      await whatsappApi.updateSettings(wSettings)
      toast.success('Configurações salvas!')
    } catch (e) { toast.error(e.message || 'Erro ao salvar') } finally { setSettingsSaving(false) }
  }

  const handleSaveAI = async () => {
    try {
      setAiSaving(true)
      const res = await whatsappApi.updateAISettings(aiSettings)
      if (res.success) toast.success('Configurações da IA salvas! 🤖')
    } catch (e) { toast.error(e.message || 'Erro ao salvar IA') } finally { setAiSaving(false) }
  }

  const handleTestAI = async () => {
    if (!aiTestQuestion.trim()) return
    const question = aiTestQuestion.trim()
    setAiTestMessages(prev => [...prev, { role: 'user', content: question }])
    setAiTestQuestion('')
    setAiTestLoading(true)
    try {
      const res = await whatsappApi.testAI(question)
      if (res.success) {
        setAiTestMessages(prev => [...prev, { role: 'assistant', content: res.data.response }])
        if (res.data.context_preview && !aiContextPreview) {
          setAiContextPreview(res.data.context_preview)
        }
      }
    } catch (e) {
      setAiTestMessages(prev => [...prev, { role: 'assistant', content: `❌ Erro: ${e.message}` }])
    } finally {
      setAiTestLoading(false)
    }
  }

  const handleTestKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTestAI() }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#FF6B35]" size={32} />
          <p className="text-[#a991c7] text-sm">Carregando WhatsApp...</p>
        </div>
      </div>
    )
  }

  const isConnected    = conn?.status === 'connected'
  const isConnecting   = conn?.status === 'connecting'
  const isDisconnected = !isConnected && !isConnecting
  const aiEnabled      = aiSettings?.ai_enabled
  const openaiOK       = aiSettings?.openai_configured

  const tabs = [
    { key: 'connection', label: 'Conexão',         icon: Wifi },
    { key: 'ai',         label: 'IA Atendente',    icon: Bot, badge: aiEnabled ? '●' : null },
    { key: 'send',       label: 'Enviar Mensagem', icon: Send },
    { key: 'logs',       label: 'Histórico',       icon: MessageSquare },
    { key: 'settings',   label: 'Configurações',   icon: Settings },
  ]

  return (
    <div className="space-y-6 text-left">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Smartphone size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold text-white">WhatsApp Conectado</h2>
              {aiEnabled && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  <Bot size={10} /> IA Ativa
                </span>
              )}
            </div>
            <p className="text-[#a991c7] text-sm mt-0.5">Conexão, atendimento IA e envio automático de mensagens.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={conn?.status || 'disconnected'} />
          <button onClick={() => loadStatus()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#a991c7] hover:text-white transition-all border border-white/[0.06]" title="Atualizar">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Status',    value: isConnected ? 'Online' : isConnecting ? 'Conectando' : 'Offline', icon: Wifi, color: isConnected ? 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400' : isConnecting ? 'from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400' : 'from-gray-500/20 to-gray-600/10 border-gray-500/20 text-gray-400' },
          { label: 'Número',    value: conn?.phone_number ? `+${conn.phone_number}` : '—', icon: PhoneCall, color: 'from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400' },
          { label: 'Msgs Hoje', value: String(conn?.messages_today ?? 0), icon: BarChart3, color: 'from-[#FF6B35]/20 to-[#FF6B35]/10 border-[#FF6B35]/20 text-[#FF6B35]' },
          { label: 'IA',        value: aiEnabled ? `${aiSettings?.ai_name || 'Ativa'}` : 'Inativa', icon: Bot, color: aiEnabled ? 'from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-400' : 'from-gray-500/20 to-gray-600/10 border-gray-500/20 text-gray-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`glass rounded-2xl p-4 border bg-gradient-to-br ${color} flex flex-col gap-2`}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#a991c7] font-medium">{label}</span>
              <Icon size={14} className="opacity-70" />
            </div>
            <span className="text-sm font-extrabold text-white truncate">{value}</span>
          </div>
        ))}
      </div>

      {/* ── Demo warning ── */}
      {evoConfig && !evoConfig.configured && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <Zap size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200">
            <strong className="text-amber-300 block">Modo Demo — Evolution API não configurada</strong>
            Configure <code className="bg-black/30 px-1 rounded text-xs">EVOLUTION_API_URL</code> e <code className="bg-black/30 px-1 rounded text-xs">EVOLUTION_API_KEY</code> no backend.
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 flex-wrap glass rounded-2xl p-1.5 border border-white/[0.06] w-fit">
        {tabs.map(({ key, label, icon: Icon, badge }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === key ? 'bg-[#FF6B35] text-white shadow-[0_0_12px_rgba(255,107,53,0.3)]' : 'text-[#a991c7] hover:text-white hover:bg-white/5'}`}
          >
            <Icon size={14} />
            {label}
            {badge && key === 'ai' && <span className="text-emerald-400 text-[8px]">{badge}</span>}
          </button>
        ))}
      </div>

      {/* ══════════════ TAB: CONEXÃO ══════════════ */}
      {activeTab === 'connection' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Controle de Sessão">
            <div className="space-y-6">
              {isConnected && (
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center"><CheckCircle2 size={24} className="text-emerald-400" /></div>
                    <div>
                      <p className="text-white font-bold">WhatsApp conectado</p>
                      <p className="text-emerald-400 text-xs">{conn?.profile_name || 'Conta conectada'}</p>
                    </div>
                  </div>
                  {conn?.phone_number && (
                    <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2">
                      <Smartphone size={14} className="text-[#a991c7]" />
                      <span className="text-sm text-white font-mono">+{conn.phone_number}</span>
                    </div>
                  )}
                  {conn?.connected_at && <p className="text-xs text-[#a991c7]">Conectado desde: {new Date(conn.connected_at).toLocaleString('pt-BR')}</p>}
                </div>
              )}
              {isConnecting && (
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <Loader2 size={24} className="text-amber-400 animate-spin" />
                    <div>
                      <p className="text-white font-bold">Aguardando QR Code</p>
                      <p className="text-amber-400 text-xs">Escaneie o QR Code ao lado para conectar</p>
                    </div>
                  </div>
                </div>
              )}
              {isDisconnected && (
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gray-500/10 flex items-center justify-center"><WifiOff size={24} className="text-gray-400" /></div>
                    <div>
                      <p className="text-white font-bold">WhatsApp desconectado</p>
                      <p className="text-[#a991c7] text-xs">Clique em conectar para gerar o QR Code</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-3">
                {isDisconnected && (
                  <Button variant="primary" leftIcon={QrCode} loading={actionLoading} onClick={handleConnect} className="w-full">
                    Conectar WhatsApp
                  </Button>
                )}
                {(isConnecting || isConnected) && (
                  <>
                    <Button variant="ghost" leftIcon={RefreshCw} loading={actionLoading} onClick={handleReconnect} className="w-full">
                      Recriar Conexão
                    </Button>
                    <Button variant="danger" leftIcon={Power} loading={actionLoading} onClick={handleDisconnect} className="w-full">
                      Desconectar
                    </Button>
                  </>
                )}
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center gap-2"><Globe size={14} className="text-[#a991c7]" /><span className="text-xs font-bold text-white">Tecnologia</span></div>
                <p className="text-xs text-[#a991c7] leading-relaxed">Integração via <strong className="text-white">Evolution API</strong> — plataforma multi-tenant estável para SaaS. Cada restaurante tem sua própria sessão isolada.</p>
              </div>
            </div>
          </Card>
          <Card title="QR Code de Conexão">
            {(isConnecting || isDisconnected) ? (
              <QrCodePanel qrCode={conn?.qr_code} loading={qrLoading} onRefresh={handleRefreshQr} errorMsg={errorMsg} evoConfigured={evoConfig?.configured} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 size={32} className="text-emerald-400" /></div>
                <div className="text-center">
                  <p className="text-white font-bold">Sessão ativa!</p>
                  <p className="text-[#a991c7] text-sm mt-1">WhatsApp está conectado e funcionando.</p>
                </div>
                {conn?.last_connection && <p className="text-xs text-gray-500">Última atividade: {new Date(conn.last_connection).toLocaleString('pt-BR')}</p>}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ══════════════ TAB: IA ATENDENTE ══════════════ */}
      {activeTab === 'ai' && aiSettings && (
        <div className="space-y-6">
          {/* Status OpenAI */}
          <div className={`flex items-start gap-3 p-4 rounded-2xl border ${openaiOK ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <KeyRound size={18} className={openaiOK ? 'text-emerald-400' : 'text-red-400'} />
            <div>
              <p className={`text-sm font-bold ${openaiOK ? 'text-emerald-300' : 'text-red-300'}`}>
                {openaiOK ? '✅ OpenAI configurada e pronta' : '❌ OPENAI_API_KEY não configurada'}
              </p>
              <p className="text-xs text-[#a991c7] mt-0.5">
                {openaiOK
                  ? 'A IA está pronta para responder clientes automaticamente via WhatsApp.'
                  : 'Adicione OPENAI_API_KEY=sk-... no arquivo .env do backend e reinicie o servidor.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configurações da IA */}
            <Card title="Configuração do Atendente IA" subtitle="Configure o comportamento da IA de atendimento.">
              <div className="space-y-6">
                {/* Ativar/Desativar IA */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div>
                    <p className="text-sm font-bold text-white">Atendente IA Ativo</p>
                    <p className="text-xs text-[#a991c7] mt-0.5">Responder clientes automaticamente com base no cardápio real.</p>
                  </div>
                  <button onClick={() => setAiSettings(p => ({ ...p, ai_enabled: !p.ai_enabled }))} className="focus:outline-none">
                    {aiSettings.ai_enabled
                      ? <ToggleRight size={44} className="text-violet-400" />
                      : <ToggleLeft size={44} className="text-gray-500" />}
                  </button>
                </div>

                {/* Nome da IA */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-[#d4bfee]">Nome do Atendente</label>
                  <input
                    type="text"
                    value={aiSettings.ai_name || ''}
                    onChange={e => setAiSettings(p => ({ ...p, ai_name: e.target.value }))}
                    placeholder="Ex: Sofia, Max, Assistente"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#6b5880] focus:outline-none focus:border-[#FF6B35]/60 focus:bg-white/10 transition-all"
                  />
                  <span className="text-xs text-[#a991c7]">Este nome aparecerá no início das respostas da IA.</span>
                </div>

                {/* Modelo OpenAI */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-[#d4bfee]">Modelo de IA</label>
                  <select
                    value={aiSettings.ai_model || 'gpt-4o-mini'}
                    onChange={e => setAiSettings(p => ({ ...p, ai_model: e.target.value }))}
                    className="w-full bg-[#160b29] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6B35]/60 transition-all"
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini — Rápido e econômico ⭐ Recomendado</option>
                    <option value="gpt-4o">GPT-4o — Mais inteligente e completo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo — Mais barato</option>
                  </select>
                </div>

                {/* Personalidade */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-[#d4bfee]">Personalidade / Tom</label>
                  <textarea
                    value={aiSettings.ai_personality || ''}
                    onChange={e => setAiSettings(p => ({ ...p, ai_personality: e.target.value }))}
                    placeholder="Ex: Seja simpático, use emojis com moderação e finalize com 'Bom apetite! 🍕'"
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#6b5880] focus:outline-none focus:border-[#FF6B35]/60 focus:bg-white/10 transition-all resize-none"
                  />
                  <span className="text-xs text-[#a991c7]">Instruções adicionais de comportamento para o atendente.</span>
                </div>

                {/* Fallback */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-[#d4bfee]">Mensagem de Fallback</label>
                  <textarea
                    value={aiSettings.ai_fallback_message || ''}
                    onChange={e => setAiSettings(p => ({ ...p, ai_fallback_message: e.target.value }))}
                    placeholder="Desculpe, não consegui processar sua mensagem. Entre em contato pelo telefone do restaurante."
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#6b5880] focus:outline-none focus:border-[#FF6B35]/60 focus:bg-white/10 transition-all resize-none"
                  />
                  <span className="text-xs text-[#a991c7]">Enviada quando a IA não consegue gerar uma resposta.</span>
                </div>

                <Button variant="primary" leftIcon={BrainCircuit} loading={aiSaving} onClick={handleSaveAI}>
                  Salvar Configurações da IA
                </Button>
              </div>
            </Card>

            {/* Painel de Teste */}
            <Card title="Testar Atendente IA" subtitle="Simule perguntas como se fosse um cliente no WhatsApp.">
              <div className="flex flex-col h-full" style={{ minHeight: '400px' }}>
                {/* Regras de segurança */}
                <div className="flex items-start gap-2 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 mb-4">
                  <Shield size={14} className="text-violet-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-violet-300 leading-relaxed">
                    A IA consulta o banco de dados do <strong>seu restaurante</strong> antes de cada resposta.
                    Nunca inventa produtos, preços ou promoções não cadastradas.
                  </p>
                </div>

                {/* Chat area */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-72 pr-1 mb-4">
                  {aiTestMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/20 flex items-center justify-center">
                        <FlaskConical size={24} className="text-violet-400" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">Painel de Teste da IA</p>
                        <p className="text-[#a991c7] text-xs mt-1">Pergunte sobre cardápio, preços, horários, delivery...</p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center mt-2">
                        {['Qual o horário de funcionamento?', 'Tem opção vegetariana?', 'Qual a taxa de entrega?', 'Qual o pedido mínimo?'].map(q => (
                          <button key={q} onClick={() => setAiTestQuestion(q)}
                            className="text-[10px] px-3 py-1.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20 transition-all">
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiTestMessages.map((msg, i) => <ChatBubble key={i} role={msg.role} content={msg.content} />)}
                  {aiTestLoading && (
                    <div className="flex gap-2 justify-start">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                        <Bot size={14} className="text-white" />
                      </div>
                      <div className="bg-white/[0.07] border border-white/10 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input de teste */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiTestQuestion}
                    onChange={e => setAiTestQuestion(e.target.value)}
                    onKeyDown={handleTestKeyDown}
                    placeholder="Digite uma pergunta de teste..."
                    disabled={aiTestLoading}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#6b5880] focus:outline-none focus:border-violet-500/60 focus:bg-white/10 transition-all disabled:opacity-50"
                  />
                  <button
                    onClick={handleTestAI}
                    disabled={!aiTestQuestion.trim() || aiTestLoading}
                    className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all flex items-center gap-2"
                  >
                    {aiTestLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  </button>
                </div>

                {/* Limpar conversa */}
                {aiTestMessages.length > 0 && (
                  <button onClick={() => setAiTestMessages([])} className="text-xs text-[#a991c7] hover:text-white mt-2 transition-all text-center w-full">
                    Limpar conversa de teste
                  </button>
                )}
              </div>
            </Card>
          </div>

          {/* Como a IA funciona */}
          <Card title="Como a IA de Atendimento Funciona">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: '📥', title: 'Recebe a mensagem', desc: 'Cliente envia mensagem no WhatsApp. O webhook da Evolution API entrega ao sistema.' },
                { icon: '🔍', title: 'Consulta o banco', desc: 'A IA busca APENAS dados reais do seu restaurante: produtos disponíveis, preços, horários, taxas.' },
                { icon: '💬', title: 'Responde com precisão', desc: 'GPT-4o Mini gera resposta amigável usando apenas dados reais. Nunca inventa produtos ou preços.' },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <span className="text-2xl">{item.icon}</span>
                  <p className="text-sm font-bold text-white">{item.title}</p>
                  <p className="text-xs text-[#a991c7] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
              <p className="text-xs text-[#a991c7] leading-relaxed">
                <strong className="text-red-400">Regras de segurança aplicadas:</strong> A IA é instruída a nunca inventar produtos, preços ou promoções não cadastradas. Se não souber a resposta, informa honestamente. Histórico de conversa é mantido por 30 minutos e isolado por restaurante.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════ TAB: ENVIAR MENSAGEM ══════════════ */}
      {activeTab === 'send' && (
        <Card title="Enviar Mensagem Avulsa" subtitle="Envie uma mensagem WhatsApp diretamente para um número de telefone.">
          <div className="space-y-6 max-w-xl">
            {!isConnected && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <AlertCircle size={18} className="text-amber-400" />
                <p className="text-amber-300 text-sm">WhatsApp não está conectado. Conecte primeiro para enviar mensagens.</p>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-[#d4bfee]">Número de Telefone</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a991c7] text-sm font-medium">+</span>
                <input type="tel" value={msgForm.phone} onChange={e => setMsgForm(p => ({ ...p, phone: e.target.value }))} placeholder="5511999990000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white placeholder-[#6b5880] focus:outline-none focus:border-[#FF6B35]/60 focus:bg-white/10 transition-all" />
              </div>
              <span className="text-xs text-[#a991c7]">Com DDI e DDD, sem espaços (ex: 5511999990000)</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-[#d4bfee]">Mensagem</label>
              <textarea value={msgForm.message} onChange={e => setMsgForm(p => ({ ...p, message: e.target.value }))} placeholder="Digite sua mensagem aqui..." rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#6b5880] focus:outline-none focus:border-[#FF6B35]/60 focus:bg-white/10 transition-all resize-none" />
              <span className="text-xs text-[#a991c7] text-right">{msgForm.message.length} caracteres</span>
            </div>
            <Button variant="primary" leftIcon={Send} onClick={handleSendMessage} loading={msgSending} disabled={!msgForm.phone || !msgForm.message}>Enviar Mensagem</Button>
          </div>
        </Card>
      )}

      {/* ══════════════ TAB: HISTÓRICO ══════════════ */}
      {activeTab === 'logs' && (
        <Card title="Histórico de Mensagens" subtitle={`Total enviado hoje: ${conn?.messages_today ?? 0} mensagem(s)`}>
          <div className="space-y-2">
            {logsLoading && logs.length === 0 ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#FF6B35]" size={24} /></div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <MessageSquare size={40} className="text-[#a991c7]/30" />
                <p className="text-[#a991c7] text-sm">Nenhuma mensagem ainda.</p>
              </div>
            ) : (
              <>
                {logs.map((log, i) => <LogItem key={i} log={log} />)}
                {logsPagination && logsPage < logsPagination.pages && (
                  <div className="flex justify-center pt-4">
                    <Button variant="ghost" size="sm" loading={logsLoading} onClick={() => loadLogs(logsPage + 1, logs)} rightIcon={ChevronRight}>Carregar mais</Button>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      )}

      {/* ══════════════ TAB: CONFIGURAÇÕES ══════════════ */}
      {activeTab === 'settings' && wSettings && (
        <Card title="Notificações Automáticas" subtitle="Configure quais eventos disparam mensagens automáticas para o cliente.">
          <div className="space-y-8">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div>
                <p className="text-sm font-bold text-white">Notificações Automáticas Ativas</p>
                <p className="text-xs text-[#a991c7] mt-0.5">Enviar mensagens automáticas ao cliente em cada mudança de status do pedido.</p>
              </div>
              <button onClick={() => setWSettings(p => ({ ...p, is_enabled: !p.is_enabled }))} className="focus:outline-none">
                <div className={`w-12 h-6 rounded-full transition-all relative ${wSettings.is_enabled ? 'bg-[#FF6B35]' : 'bg-gray-700'}`}>
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${wSettings.is_enabled ? 'left-7' : 'left-1'}`} />
                </div>
              </button>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#d4bfee] mb-4">Eventos de Notificação</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'notify_new_order',       label: '🆕 Novo Pedido' },
                  { key: 'notify_order_confirmed',  label: '✅ Pedido Confirmado' },
                  { key: 'notify_order_ready',      label: '🎉 Pedido Pronto' },
                  { key: 'notify_out_for_delivery', label: '🛵 Saiu para Entrega' },
                  { key: 'notify_delivered',        label: '🏠 Pedido Entregue' },
                  { key: 'notify_cancelled',        label: '❌ Pedido Cancelado' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 cursor-pointer transition-all">
                    <span className="text-sm text-white">{label}</span>
                    <div onClick={() => setWSettings(p => ({ ...p, [key]: !p[key] }))}
                      className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${wSettings[key] ? 'bg-[#FF6B35]' : 'bg-gray-700'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${wSettings[key] ? 'left-5' : 'left-0.5'}`} />
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#d4bfee] mb-1">Templates de Mensagem</h3>
              <p className="text-xs text-[#a991c7] mb-4">
                Use: <code className="bg-white/5 px-1 rounded text-[10px]">{'{order_number}'}</code>{' '}
                <code className="bg-white/5 px-1 rounded text-[10px]">{'{total}'}</code>{' '}
                <code className="bg-white/5 px-1 rounded text-[10px]">{'{customer_name}'}</code>{' '}
                <code className="bg-white/5 px-1 rounded text-[10px]">{'{estimated_time}'}</code>
              </p>
              <div className="space-y-4">
                {[
                  { key: 'template_new_order',        label: 'Novo Pedido',       placeholder: '🍕 Novo pedido #{order_number} recebido! Total: R$ {total}' },
                  { key: 'template_confirmed',        label: 'Pedido Confirmado', placeholder: '✅ Pedido #{order_number} confirmado! Tempo: {estimated_time} min.' },
                  { key: 'template_ready',            label: 'Pedido Pronto',     placeholder: '🎉 Seu pedido #{order_number} está pronto!' },
                  { key: 'template_out_for_delivery', label: 'Saiu p/ Entrega',   placeholder: '🛵 Seu pedido #{order_number} saiu para entrega!' },
                  { key: 'template_delivered',        label: 'Pedido Entregue',   placeholder: '🏠 Pedido #{order_number} entregue. Obrigado!' },
                  { key: 'template_cancelled',        label: 'Pedido Cancelado',  placeholder: '❌ Seu pedido #{order_number} foi cancelado.' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#a991c7]">{label}</label>
                    <textarea value={wSettings[key] || ''} onChange={e => setWSettings(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder} rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#6b5880] focus:outline-none focus:border-[#FF6B35]/60 focus:bg-white/10 transition-all resize-none" />
                  </div>
                ))}
              </div>
            </div>
            <Button variant="primary" leftIcon={Settings} loading={settingsSaving} onClick={handleSaveSettings}>Salvar Configurações</Button>
          </div>
        </Card>
      )}
    </div>
  )
}
