import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Clock, User, MapPin, CreditCard, X, Check, Printer, MessageSquare, Phone, Bike, Calendar, AlertTriangle, ChevronRight, HelpCircle, Loader2, Truck, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import { formatCurrency } from '../utils/helpers'
import { orders as ordersApi, drivers as driversApi, settings as settingsApi } from '../services/api'
import toast from 'react-hot-toast'

const statusColors = {
  pending: 'yellow',
  confirmed: 'blue',
  preparing: 'orange',
  ready: 'purple',
  out_for_delivery: 'cyan',
  delivered: 'green',
  picked_up: 'green',
  cancelled: 'red',
}

const statusLabels = {
  pending: 'Aguardando Aprovação',
  confirmed: 'Confirmado',
  preparing: 'Em Preparo',
  ready: 'Pronto',
  out_for_delivery: 'Saiu para Entrega',
  delivered: 'Entregue',
  picked_up: 'Retirado',
  cancelled: 'Cancelado',
}

const paymentLabels = {
  pix: '💠 Pix',
  credit_card: '💳 Cartão de Crédito',
  debit_card: '💳 Cartão de Débito',
  cash: '💵 Dinheiro',
  meal_voucher: '🎫 Vale-refeição',
  online: '🌐 Pagamento Online'
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [drivers, setDrivers] = useState([])
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showPrintMenu, setShowPrintMenu] = useState(false)
  const [messages, setMessages] = useState([])
  const [newMessageText, setNewMessageText] = useState('')
  const [printFormat, setPrintFormat] = useState('ask')

  const loadOrderDetails = async () => {
    try {
      setLoading(true)
      const res = await ordersApi.get(id)
      if (res.success && res.data) {
        setOrder(res.data)
        if (res.data.driver_id) {
          setSelectedDriverId(String(res.data.driver_id))
        }
      } else {
        toast.error('Pedido não localizado.')
        navigate('/dashboard/pedidos')
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao buscar detalhes do pedido.')
      navigate('/dashboard/pedidos')
    } finally {
      setLoading(false)
    }
  }

  const loadDriversList = async () => {
    try {
      const res = await driversApi.list({ limit: 100 })
      if (res.success && res.data) {
        // Filtra apenas entregadores ativos
        setDrivers(res.data.filter(d => d.is_active !== 0))
      }
    } catch (err) {
      console.error('Erro ao buscar entregadores:', err)
    }
  }

  const loadChatMessages = async () => {
    try {
      const res = await ordersApi.getMessages(id)
      if (res.success && res.data) {
        setMessages(res.data)
      }
    } catch (err) {
      console.error('Erro ao carregar chat:', err)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessageText.trim()) return

    try {
      const txt = newMessageText.trim()
      setNewMessageText('')
      const res = await ordersApi.sendMessage(id, txt)
      if (res.success && res.data) {
        setMessages(prev => [...prev, res.data])
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao enviar mensagem.')
    }
  }

  useEffect(() => {
    loadOrderDetails()
    loadDriversList()
    loadChatMessages()

    const fetchPrintSettings = async () => {
      try {
        const res = await settingsApi.get()
        if (res.success && res.data) {
          setPrintFormat(res.data.default_print_format || 'ask')
        }
      } catch (err) {
        console.warn('Erro ao carregar configurações de impressão:', err)
      }
    }
    fetchPrintSettings()

    const interval = setInterval(() => {
      loadChatMessages()
    }, 5000)

    return () => clearInterval(interval)
  }, [id])

  useEffect(() => {
    const container = document.getElementById('chat-messages-container')
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages])

  const handleUpdateStatus = async (newStatus) => {
    setActionLoading(true)
    try {
      const res = await ordersApi.updateStatus(id, newStatus)
      if (res.success) {
        toast.success(`Pedido status alterado para "${statusLabels[newStatus]}"! 🎉`)
        const updated = await ordersApi.get(id)
        if (updated.success) setOrder(updated.data)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar status.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkAsPaid = async () => {
    setActionLoading(true)
    try {
      const res = await ordersApi.markAsPaid(id)
      if (res.success) {
        toast.success('Pedido marcado como pago! 💰')
        const updated = await ordersApi.get(id)
        if (updated.success) setOrder(updated.data)
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Erro ao marcar pedido como pago.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      toast.error('Informe um motivo para o cancelamento.')
      return
    }

    setActionLoading(true)
    try {
      const res = await ordersApi.cancel(id, cancelReason)
      if (res.success) {
        toast.success('Pedido cancelado com sucesso! 🔴')
        setShowCancelModal(false)
        setCancelReason('')
        const updated = await ordersApi.get(id)
        if (updated.success) setOrder(updated.data)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao cancelar o pedido.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAssignDriver = async () => {
    if (!selectedDriverId) {
      toast.error('Selecione um entregador.')
      return
    }

    setActionLoading(true)
    try {
      const res = await ordersApi.assignDriver(id, parseInt(selectedDriverId))
      if (res.success) {
        toast.success('Entregador vinculado ao pedido! 🛵')
        const updated = await ordersApi.get(id)
        if (updated.success) setOrder(updated.data)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao vincular entregador.')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePrint = (size = '80mm') => {
    if (!order) return
    const printWindow = window.open('', '_blank', 'width=600,height=800')
    const restaurantName = user?.restaurant?.name || user?.restaurant_name || 'Nosso Estabelecimento'
    
    const itemsHtml = order.items?.map(i => {
      let opts = []
      if (i.options) {
        try {
          opts = typeof i.options === 'string' ? JSON.parse(i.options) : i.options
        } catch (e) {
          opts = []
        }
      }
      const optsText = Array.isArray(opts) ? opts.map(o => `+ ${o.name}`).join('<br/>') : ''
      return `
        <tr style="border-bottom: 1px dashed #ddd;">
          <td style="text-align: left; padding: 4px 0; vertical-align: top;">
            <strong>${i.quantity}x</strong> ${i.product_name || i.name}
            ${optsText ? `<div style="font-size: 9px; color: #555; margin-left: 8px; font-weight: normal; font-style: italic;">${optsText}</div>` : ''}
            ${i.notes ? `<div style="font-size: 9px; color: #555; margin-left: 8px; font-weight: normal; font-style: italic;">Obs: "${i.notes}"</div>` : ''}
          </td>
          <td style="text-align: right; padding: 4px 0; vertical-align: top; white-space: nowrap;">R$ ${(parseFloat(i.total_price) || 0).toFixed(2)}</td>
        </tr>
      `
    }).join('') || ''

    const is58 = size === '58mm'

    const content = `
      <html>
        <head>
          <title>Comanda - ${order.order_number}</title>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 0; padding: 0; }
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              color: #000;
              background: #fff;
              line-height: 1.3;
              margin: 0;
              padding: ${is58 ? '1mm' : '4mm'};
              width: ${is58 ? '54mm' : '76mm'};
              font-size: ${is58 ? '11px' : '13px'};
              box-sizing: border-box;
            }
            .ticket {
              width: 100%;
            }
            h2 {
              text-align: center;
              margin: 0 0 4px 0;
              font-weight: bold;
              font-size: ${is58 ? '14px' : '18px'};
            }
            .subtitle {
              text-align: center;
              margin: 0 0 6px 0;
              font-size: 10px;
              text-transform: uppercase;
              font-weight: bold;
            }
            .separator {
              border-top: 1px dashed #000;
              margin: 6px 0;
            }
            p {
              margin: 2px 0;
              word-wrap: break-word;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 5px;
            }
            th {
              border-bottom: 1px solid #000;
              text-align: left;
              padding-bottom: 4px;
              font-size: ${is58 ? '10px' : '11px'};
            }
            .total {
              font-weight: bold;
              font-size: ${is58 ? '12px' : '15px'};
            }
            .text-right {
              text-align: right;
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <h2>${restaurantName.toUpperCase()}</h2>
            <div class="subtitle">Comanda de Pedido</div>
            <div class="separator"></div>
            <p><strong>PEDIDO:</strong> #${order.order_number}</p>
            <p><strong>DATA:</strong> ${new Date(order.created_at).toLocaleString('pt-BR')}</p>
            <p><strong>TIPO:</strong> ${order.order_type === 'delivery' ? 'ENTREGA 🛵' : order.order_type === 'pickup' ? 'RETIRADA 🏪' : 'CONSUMO LOCAL 🍽️'}</p>
            <div class="separator"></div>
            <p><strong>CLIENTE:</strong> ${order.customer_name}</p>
            <p><strong>FONE:</strong> ${order.customer_phone || 'Não informado'}</p>
            ${order.order_type === 'delivery' ? `
              <p><strong>ENDEREÇO:</strong> ${order.delivery_address || ''}, N° ${order.delivery_number || ''}</p>
              ${order.delivery_complement ? `<p><strong>COMPL/REF:</strong> ${order.delivery_complement}</p>` : ''}
              <p><strong>BAIRRO:</strong> ${order.delivery_neighborhood || ''} - ${order.delivery_city || ''}/${order.delivery_state || ''}</p>
            ` : ''}
            <div class="separator"></div>
            ${order.notes ? `<p><strong>OBS GERAL:</strong> ${order.notes}</p><div class="separator"></div>` : ''}
            <table>
              <thead>
                <tr>
                  <th style="text-align: left;">Qtd / Item</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <div class="separator"></div>
            <p><strong>SUBTOTAL:</strong> R$ ${(parseFloat(order.subtotal) || 0).toFixed(2)}</p>
            ${order.order_type === 'delivery' ? `<p><strong>TAXA ENTREGA:</strong> R$ ${(parseFloat(order.delivery_fee) || 0).toFixed(2)}</p>` : ''}
            <p class="total"><strong>TOTAL:</strong> R$ ${(parseFloat(order.total) || 0).toFixed(2)}</p>
            <p><strong>PAGAMENTO:</strong> ${(paymentLabels[order.payment_method] || order.payment_method).toUpperCase()}</p>
            <p><strong>STATUS PAGTO:</strong> ${order.payment_status === 'paid' ? 'PAGO' : 'PENDENTE'}</p>
            ${order.change_for ? `<p><strong>TROCO PARA:</strong> R$ ${parseFloat(order.change_for).toFixed(2)}</p>` : ''}
            <div class="separator" style="margin-top: 15px;"></div>
            <p style="text-align: center; font-size: 9px; font-weight: bold;">OBRIGADO PELA PREFERÊNCIA!</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `
    printWindow.document.write(content)
    printWindow.document.close()
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#FF6B35]" size={32} />
          <p className="text-[#a991c7] text-sm">Carregando detalhes do pedido...</p>
        </div>
      </div>
    )
  }

  if (!order) return null

  const getWhatsappLink = (action) => {
    if (!order || !order.customer_phone) return ''
    const clean = order.customer_phone.replace(/\D/g, '')
    const phone = clean.length === 10 || clean.length === 11 ? `55${clean}` : clean
    const restaurantName = user?.restaurant?.name || user?.restaurant_name || 'Nosso Estabelecimento'
    const customerName = order.customer_name
    const orderNumber = order.order_number
    const totalStr = formatCurrency(order.total)
    
    let msg = ''
    switch (action) {
      case 'confirm':
        msg = `Olá, ${customerName}! Seu pedido ${orderNumber} da ${restaurantName} foi confirmado e já está sendo preparado. Status atual: Confirmado. Valor total: ${totalStr}.`
        break
      case 'preparing':
        msg = `Olá, ${customerName}! Seu pedido ${orderNumber} da ${restaurantName} já está em preparo. Status atual: Em preparo. Valor total: ${totalStr}.`
        break
      case 'ready':
        msg = `Olá, ${customerName}! Seu pedido ${orderNumber} da ${restaurantName} está pronto para ${order.order_type === 'delivery' ? 'entrega' : 'retirada'}. Status atual: Pronto. Valor total: ${totalStr}.`
        break
      case 'out_for_delivery':
        msg = `Olá, ${customerName}! Seu pedido ${orderNumber} da ${restaurantName} saiu para entrega. Status atual: Saiu para entrega. Valor total: ${totalStr}.`
        break
      case 'delivered':
        msg = `Olá, ${customerName}! Seu pedido ${orderNumber} da ${restaurantName} foi finalizado. Agradecemos a preferência! Status atual: Finalizado. Valor total: ${totalStr}.`
        break
      default:
        msg = `Olá, ${customerName}! Gostaria de falar sobre o seu pedido ${orderNumber} da ${restaurantName}. Valor total: ${totalStr}.`
    }
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div className="space-y-6 text-left">
      
      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard/pedidos"
          className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Pedido {order.order_number}
            <Badge color={statusColors[order.status]} size="sm">
              {statusLabels[order.status] || order.status}
            </Badge>
          </h2>
          <p className="text-[#a991c7] text-xs mt-0.5">Criado em {new Date(order.created_at).toLocaleString('pt-BR')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Columns (Order items, logs, information) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Order Items Summary */}
          <Card title="Itens do Pedido">
            <div className="divide-y divide-white/5">
              {order.items?.map((item, index) => {
                const opts = item.options ? (typeof item.options === 'string' ? JSON.parse(item.options) : item.options) : []
                return (
                  <div key={index} className="py-4 first:pt-0 last:pb-0 flex justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">
                        <span className="text-[#FF6B35] mr-1.5">{item.quantity}x</span>
                        {item.product_name || item.name}
                      </p>
                      {opts.map((o, idx) => (
                        <p key={idx} className="text-xs text-gray-500 pl-4">+ {o.name} (R$ {parseFloat(o.price || 0).toFixed(2)})</p>
                      ))}
                      {item.notes && (
                        <p className="text-xs italic text-[#a991c7] pl-4 font-medium">Obs: "{item.notes}"</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-white">R$ {parseFloat(item.total_price || 0).toFixed(2)}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Unitário: R$ {parseFloat(item.unit_price || 0).toFixed(2)}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Financial Summary */}
            <div className="border-t border-white/5 pt-4 mt-4 space-y-2.5 text-xs text-gray-400">
              <div className="flex justify-between items-center">
                <span>Subtotal</span>
                <span className="font-semibold text-white">R$ {parseFloat(order.subtotal).toFixed(2)}</span>
              </div>
              {order.order_type === 'delivery' && (
                <div className="flex justify-between items-center">
                  <span>Taxa de entrega</span>
                  <span className="font-semibold text-white">R$ {parseFloat(order.delivery_fee).toFixed(2)}</span>
                </div>
              )}
              {parseFloat(order.discount) > 0 && (
                <div className="flex justify-between items-center text-green-400">
                  <span>Desconto</span>
                  <span className="font-semibold">- R$ {parseFloat(order.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-white/5 pt-3.5 flex justify-between items-center text-white">
                <span className="font-bold text-sm">Total Geral</span>
                <span className="font-black text-lg text-[#FF6B35]">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </Card>

          {/* Chat do Pedido */}
          <Card title="Chat com o Cliente 💬">
            <div className="flex flex-col h-[350px] bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
              {/* Message History */}
              <div 
                className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col no-scrollbar scroll-smooth" 
                id="chat-messages-container"
              >
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <MessageSquare size={32} className="text-gray-600 mb-2 animate-pulse" />
                    <p className="text-xs text-gray-500 italic">Nenhuma mensagem ainda. Digite algo para iniciar a conversa!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMerchant = msg.sender_type === 'merchant'
                    const isSystem = msg.sender_type === 'system'
                    
                    if (isSystem) {
                      return (
                        <div key={msg.id} className="self-center bg-white/[0.04] border border-white/10 px-3 py-1.5 rounded-full text-[10px] text-gray-400 font-semibold max-w-[90%] text-center shadow-sm">
                          {msg.message}
                        </div>
                      )
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed flex flex-col shadow-md ${
                          isMerchant
                            ? 'self-end bg-[#FF6B35] text-white rounded-tr-none'
                            : 'self-start bg-white/10 text-gray-200 rounded-tl-none border border-white/5'
                        }`}
                      >
                        <span className="font-bold text-[9px] text-white/55 mb-1">
                          {isMerchant ? 'Você (Estabelecimento)' : (order.customer_name || 'Cliente')}
                        </span>
                        <span>{msg.message}</span>
                        <span className="text-[8px] text-white/45 self-end mt-1 font-semibold">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Message Input Form */}
              <form onSubmit={handleSendMessage} className="p-3 bg-black/20 border-t border-white/5 flex gap-2">
                <input
                  type="text"
                  placeholder="Digite uma mensagem para o cliente..."
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B35]"
                />
                <Button type="submit" variant="primary" size="sm">
                  Enviar
                </Button>
              </form>
            </div>
          </Card>

          {/* Status logs history */}
          <Card title="Histórico de Status / Auditoria">
            {order.logs?.length === 0 ? (
              <p className="text-xs text-gray-500 italic">Nenhum evento registrado.</p>
            ) : (
              <div className="relative pl-4 space-y-6 py-2 border-l border-white/10 ml-2">
                {order.logs?.map((log, idx) => (
                  <div key={idx} className="relative text-left">
                    <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-full bg-[#1A0533] border-2 border-white/25 flex items-center justify-center" />
                    <div>
                      <p className="text-xs font-extrabold text-white">
                        Status alterado para <span className="text-[#FF6B35]">{statusLabels[log.to_status] || log.to_status}</span>
                      </p>
                      {log.notes && <p className="text-[10px] text-gray-400 mt-0.5">{log.notes}</p>}
                      <span className="text-[9px] text-gray-500 font-semibold block mt-1">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>

        {/* Right Column (Client data, delivery driver, actions) */}
        <div className="space-y-6">
          
          {/* Action buttons card */}
          <Card title="Ações Rápidas">
            <div className="flex flex-col gap-3">
              
              {/* Marcar como Pago (Pix Manual) */}
              {order.payment_method === 'pix' && order.payment_status === 'pending' && (
                <Button
                  variant="success"
                  loading={actionLoading}
                  leftIcon={CheckCircle}
                  onClick={handleMarkAsPaid}
                  fullWidth
                >
                  Marcar como Pago
                </Button>
              )}

              {/* Context Actions */}
              {order.status === 'pending' && (
                <Button
                  variant="success"
                  loading={actionLoading}
                  leftIcon={Check}
                  onClick={() => handleUpdateStatus('confirmed')}
                  fullWidth
                >
                  Aceitar Pedido
                </Button>
              )}

              {order.status === 'confirmed' && (
                <Button
                  variant="primary"
                  loading={actionLoading}
                  leftIcon={Clock}
                  onClick={() => handleUpdateStatus('preparing')}
                  fullWidth
                >
                  Iniciar Preparo
                </Button>
              )}

              {order.status === 'preparing' && (
                <Button
                  variant="primary"
                  loading={actionLoading}
                  leftIcon={Check}
                  onClick={() => handleUpdateStatus('ready')}
                  fullWidth
                >
                  Marcar como Pronto
                </Button>
              )}

              {order.status === 'ready' && (
                <Button
                  variant="primary"
                  loading={actionLoading}
                  leftIcon={Truck}
                  onClick={() => handleUpdateStatus('out_for_delivery')}
                  fullWidth
                >
                  Saiu para Entrega
                </Button>
              )}

              {order.status === 'out_for_delivery' && (
                <Button
                  variant="success"
                  loading={actionLoading}
                  leftIcon={Check}
                  onClick={() => handleUpdateStatus('delivered')}
                  fullWidth
                >
                  Finalizar Pedido
                </Button>
              )}

              {/* Utility actions */}
              {order.status !== 'delivered' && order.status !== 'picked_up' && order.status !== 'cancelled' && (
                <Button
                  variant="danger"
                  leftIcon={X}
                  onClick={() => setShowCancelModal(true)}
                  fullWidth
                >
                  Cancelar Pedido
                </Button>
              )}

              <div className="relative flex w-full">
                <button
                  onClick={() => {
                    if (printFormat === 'ask') {
                      setShowPrintMenu(!showPrintMenu);
                    } else {
                      handlePrint(printFormat);
                    }
                  }}
                  className="flex-1 inline-flex items-center justify-center font-semibold transition-all duration-200 bg-[#FF6B35] hover:bg-[#e84e15] text-white shadow-[0_0_20px_rgba(255,107,53,0.3)] hover:shadow-[0_0_30px_rgba(255,107,53,0.5)] px-4 py-2 text-sm rounded-l-xl gap-2 active:scale-95 border border-[#FF6B35] border-r-0 cursor-pointer"
                >
                  <Printer size={16} className="flex-shrink-0" />
                  <span>Imprimir Recibo {printFormat !== 'ask' ? `(${printFormat})` : ''}</span>
                </button>
                <button
                  onClick={() => setShowPrintMenu(!showPrintMenu)}
                  className="inline-flex items-center justify-center bg-[#FF6B35] hover:bg-[#e84e15] text-white border border-[#FF6B35] px-3 py-2 text-sm rounded-r-xl active:scale-95 cursor-pointer"
                >
                  <ChevronDown size={16} />
                </button>
                {showPrintMenu && (
                  <div className="absolute right-0 left-0 bottom-full mb-2 bg-[#160b29] border border-white/10 rounded-xl py-1 shadow-xl z-50 text-center">
                    <button
                      onClick={() => {
                        handlePrint('58mm')
                        setShowPrintMenu(false)
                      }}
                      className="w-full text-center px-4 py-2.5 text-xs text-white hover:bg-[#FF6B35]/20 font-bold transition-colors border-b border-white/5"
                    >
                      Bobina 58mm (Estreita)
                    </button>
                    <button
                      onClick={() => {
                        handlePrint('80mm')
                        setShowPrintMenu(false)
                      }}
                      className="w-full text-center px-4 py-2.5 text-xs text-white hover:bg-[#FF6B35]/20 font-bold transition-colors"
                    >
                      Bobina 80mm (Larga)
                    </button>
                  </div>
                )}
              </div>

              {order.customer_phone && (
                <div className="border-t border-white/5 pt-4 mt-2 space-y-3">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider text-left">Notificar via WhatsApp</p>
                  <div className="flex flex-col gap-2">
                    <a
                      href={getWhatsappLink('confirm')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center font-medium bg-green-600/15 hover:bg-green-600/25 text-green-400 border border-green-500/20 py-2.5 rounded-xl text-xs gap-2 transition-all active:scale-95 shadow-md"
                    >
                      <MessageSquare size={14} />
                      Confirmar Pedido
                    </a>
                    <a
                      href={getWhatsappLink('preparing')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center font-medium bg-green-600/15 hover:bg-green-600/25 text-green-400 border border-green-500/20 py-2.5 rounded-xl text-xs gap-2 transition-all active:scale-95 shadow-md"
                    >
                      <MessageSquare size={14} />
                      Avisar em Preparo
                    </a>
                    <a
                      href={getWhatsappLink('ready')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center font-medium bg-green-600/15 hover:bg-green-600/25 text-green-400 border border-green-500/20 py-2.5 rounded-xl text-xs gap-2 transition-all active:scale-95 shadow-md"
                    >
                      <MessageSquare size={14} />
                      Avisar Pronto
                    </a>
                    <a
                      href={getWhatsappLink('out_for_delivery')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center font-medium bg-green-600/15 hover:bg-green-600/25 text-green-400 border border-green-500/20 py-2.5 rounded-xl text-xs gap-2 transition-all active:scale-95 shadow-md"
                    >
                      <MessageSquare size={14} />
                      Saiu para Entrega
                    </a>
                    <a
                      href={getWhatsappLink('delivered')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center font-medium bg-green-600/15 hover:bg-green-600/25 text-green-400 border border-green-500/20 py-2.5 rounded-xl text-xs gap-2 transition-all active:scale-95 shadow-md"
                    >
                      <MessageSquare size={14} />
                      Finalizar Pedido
                    </a>
                  </div>
                </div>
              )}

            </div>
          </Card>

          {/* Client Details */}
          <Card title="Dados do Cliente">
            <div className="space-y-3 text-xs leading-relaxed text-gray-300">
              <div className="flex items-center gap-2">
                <User size={14} className="text-gray-500" />
                <span className="font-bold text-white text-sm">{order.customer_name}</span>
              </div>
              
              {order.customer_phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-gray-500" />
                  <span>{order.customer_phone}</span>
                </div>
              )}

              {order.customer_email && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">✉</span>
                  <span>{order.customer_email}</span>
                </div>
              )}

              <div className="border-t border-white/5 pt-3 mt-3 space-y-2">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Endereço de Entrega</span>
                {order.order_type === 'delivery' ? (
                  <div>
                    <p className="text-white font-semibold">{order.delivery_address}, N° {order.delivery_number}</p>
                    {order.delivery_complement && <p className="text-gray-400">Compl/Ref: {order.delivery_complement}</p>}
                    <p>{order.delivery_neighborhood} — {order.delivery_city}/{order.delivery_state}</p>
                    {order.delivery_zip_code && <p className="text-gray-500">CEP: {order.delivery_zip_code}</p>}
                  </div>
                ) : (
                  <p className="text-purple-400 font-extrabold flex items-center gap-1.5 mt-1">
                    <span>🏪</span> Retirada no Balcão
                  </p>
                )}
              </div>

              {order.notes && (
                <div className="border-t border-white/5 pt-3 mt-3">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Observações do Pedido</span>
                  <p className="italic text-amber-400 bg-amber-500/5 p-3.5 rounded-xl border border-amber-500/10 mt-1">
                    "{order.notes}"
                  </p>
                </div>
              )}

              <div className="border-t border-white/5 pt-3 mt-3 flex items-center gap-2">
                <CreditCard size={14} className="text-gray-500" />
                <span>Pagamento: <strong className="text-white">{paymentLabels[order.payment_method] || order.payment_method}</strong></span>
              </div>
              {order.change_for && (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-center">
                  Levar troco para R$ {parseFloat(order.change_for).toFixed(2)}
                </div>
              )}
            </div>
          </Card>

          {/* Delivery driver assignment */}
          {order.order_type === 'delivery' && (
            <Card title="Entregador Vinculado">
              <div className="space-y-4">
                {order.driver_name ? (
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-left space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
                        🛵
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{order.driver_name}</p>
                        <p className="text-gray-400">{order.driver_phone || 'Telefone não informado'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 text-center rounded-2xl bg-amber-500/5 border border-amber-500/10 text-xs text-amber-300">
                    Nenhum entregador vinculado para entrega.
                  </div>
                )}

                {/* Assignment Selector */}
                <div className="flex flex-col gap-2 text-left pt-2 border-t border-white/5">
                  <label className="text-xs font-bold text-gray-400">Vincular/Alterar Entregador</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedDriverId}
                      onChange={(e) => setSelectedDriverId(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B35]"
                    >
                      <option value="" className="bg-[#1A0533] text-gray-500">Selecione...</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id} className="bg-[#1A0533] text-white">
                          {d.name} ({d.vehicle_model || d.vehicle_type || 'Moto'})
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="primary"
                      size="sm"
                      loading={actionLoading}
                      onClick={handleAssignDriver}
                    >
                      Vincular
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

        </div>

      </div>

      {/* Cancel Order Reason Modal */}
      {showCancelModal && (
        <Modal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          title="Cancelar Pedido"
          size="sm"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCancelModal(false)}>
                Voltar
              </Button>
              <Button variant="danger" size="sm" loading={actionLoading} onClick={handleCancelOrder}>
                Confirmar Cancelamento
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-left">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>Atenção: Ao confirmar, o pedido será cancelado definitivamente e o cliente receberá a atualização em seu rastreamento.</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-300">Motivo do Cancelamento</label>
              <textarea
                placeholder="Ex: Estabelecimento sem ingredientes, endereço de entrega fora do raio..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500 focus:bg-white/10 resize-none"
              />
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
