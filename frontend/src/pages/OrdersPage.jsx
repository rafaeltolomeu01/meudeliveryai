import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Clock, User, MapPin, CreditCard, Search, X, Check, Printer, MessageSquare, Phone, AlertCircle, ShoppingBag, Loader2, CheckCircle, ChevronDown, Truck } from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { formatCurrency } from '../utils/helpers'
import { orders as ordersApi } from '../services/api'
import toast from 'react-hot-toast'

const COLUMNS = [
  { key: 'pending', label: 'Aguardando aprovação', color: 'yellow' },
  { key: 'preparing', label: 'Em preparo', color: 'orange' },
  { key: 'ready', label: 'Pronto', color: 'purple' },
  { key: 'out_for_delivery', label: 'Saiu para entrega', color: 'cyan' },
  { key: 'delivered', label: 'Finalizado', color: 'green' },
  { key: 'cancelled', label: 'Cancelado', color: 'red' },
]

const paymentLabels = {
  pix: '💠 Pix',
  credit_card: '💳 Cartão de Crédito',
  debit_card: '💳 Cartão de Débito',
  cash: '💵 Dinheiro',
  meal_voucher: '🎫 Vale-refeição',
  online: '🌐 Pagamento Online'
}

const colColors = {
  yellow: 'border-yellow-500/30 bg-yellow-500/5',
  orange: 'border-orange-500/30 bg-orange-500/5',
  purple: 'border-purple-500/30 bg-purple-500/5',
  cyan: 'border-cyan-500/30 bg-cyan-500/5',
  green: 'border-green-500/30 bg-green-500/5',
  red: 'border-red-500/30 bg-red-500/5',
}

export default function OrdersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])

  const getWhatsappLink = (order, action) => {
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
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showPrintMenu, setShowPrintMenu] = useState(false)

  // Drag and drop state and handlers
  const [activeDragCol, setActiveDragCol] = useState(null)

  const handleDragStart = (e, order) => {
    e.dataTransfer.setData('orderId', order.id.toString())
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = async (e, targetColumnKey) => {
    e.preventDefault()
    const orderIdStr = e.dataTransfer.getData('orderId')
    if (!orderIdStr) return
    const orderId = parseInt(orderIdStr)
    
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    let newStatus = targetColumnKey
    if (targetColumnKey === 'preparing') {
      newStatus = order.status === 'pending' ? 'confirmed' : 'preparing'
    } else if (targetColumnKey === 'delivered' && order.order_type === 'pickup') {
      newStatus = 'picked_up'
    }

    if (order.status === newStatus || (order.status === 'confirmed' && newStatus === 'preparing') || (order.status === 'picked_up' && newStatus === 'delivered')) return

    await handleUpdateStatus(order.id, newStatus)
  }

  const loadOrders = async (isPoll = false) => {
    try {
      if (!isPoll) setLoading(true)
      else setPolling(true)

      const res = await ordersApi.list({ limit: 100 })
      if (res.success && res.data) {
        setOrders(res.data)
      }
    } catch (err) {
      console.error('Erro ao buscar pedidos no servidor:', err)
    } finally {
      setLoading(false)
      setPolling(false)
    }
  }

  useEffect(() => {
    loadOrders()
    const timer = setInterval(() => {
      loadOrders(true)
    }, 10000) // Atualiza automaticamente a cada 10 segundos
    return () => clearInterval(timer)
  }, [])

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await ordersApi.updateStatus(orderId, newStatus)
      if (res.success) {
        toast.success(`Pedido status alterado para "${newStatus}"! 🎉`)
        loadOrders(true)
        setSelectedOrder(null)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar status do pedido.')
    }
  }

  const handleMarkAsPaid = async (orderId) => {
    try {
      const res = await ordersApi.markAsPaid(orderId)
      if (res.success) {
        toast.success('Pedido marcado como pago! 💰')
        loadOrders(true)
        setSelectedOrder(prev => prev && prev.id === orderId ? { ...prev, payment_status: 'paid' } : prev)
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Erro ao marcar pedido como pago.')
    }
  }

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      toast.error('Informe um motivo para o cancelamento.')
      return
    }

    try {
      const res = await ordersApi.cancel(selectedOrder.id, cancelReason)
      if (res.success) {
        toast.success('Pedido cancelado com sucesso! 🔴')
        setShowCancelModal(false)
        setCancelReason('')
        loadOrders(true)
        setSelectedOrder(null)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao cancelar o pedido.')
    }
  }

  const handlePrint = (order, size = '80mm') => {
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

  // Agrupamento de pedidos pelas colunas do Kanban
  const getOrdersByColumn = (colKey) => {
    return orders.filter(o => {
      // Filtrar pelo search
      const matchSearch = o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (o.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      if (!matchSearch) return false

      // Mapeamento status -> coluna
      if (colKey === 'pending') return o.status === 'pending'
      if (colKey === 'preparing') return o.status === 'confirmed' || o.status === 'preparing'
      if (colKey === 'ready') return o.status === 'ready'
      if (colKey === 'out_for_delivery') return o.status === 'out_for_delivery'
      if (colKey === 'delivered') return o.status === 'delivered' || o.status === 'picked_up'
      if (colKey === 'cancelled') return o.status === 'cancelled'
      return false
    })
  }

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#FF6B35]" size={32} />
          <p className="text-[#a991c7] text-sm">Carregando painel de pedidos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">Painel de Pedidos</h2>
            {polling && <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-ping" />}
          </div>
          <p className="text-[#a991c7] text-sm mt-0.5">
            {orders.filter(o => o.status !== 'delivered' && o.status !== 'picked_up' && o.status !== 'cancelled').length} pedidos ativos em andamento
          </p>
        </div>
        
        {/* Search */}
        <div className="relative flex-1 sm:w-80 w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5880]" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por N° pedido ou nome do cliente..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-[#6b5880] focus:outline-none focus:border-[#FF6B35]/50 focus:bg-white/10"
          />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 items-start select-none">
        {COLUMNS.map((col) => {
          const colOrders = getOrdersByColumn(col.key)
          const isDraggingOver = activeDragCol === col.key

          return (
            <div
              key={col.key}
              onDragOver={handleDragOver}
              onDragEnter={() => setActiveDragCol(col.key)}
              onDragLeave={() => setActiveDragCol(null)}
              onDrop={(e) => {
                handleDrop(e, col.key)
                setActiveDragCol(null)
              }}
              className={`flex-shrink-0 w-72 sm:w-80 rounded-3xl border ${colColors[col.color]} flex flex-col max-h-[75vh] transition-all duration-200 ${
                isDraggingOver ? 'scale-[1.02] ring-2 ring-[#FF6B35]/50 bg-white/[0.03] border-[#FF6B35]/30 shadow-[0_0_25px_rgba(255,107,53,0.08)]' : ''
              }`}
            >
              {/* Column Title */}
              <div className="p-4 border-b border-white/[0.05] flex items-center justify-between bg-black/10 rounded-t-3xl">
                <Badge color={col.color} dot>{col.label}</Badge>
                <span className="text-[#6b5880] text-xs font-bold bg-white/5 px-2 py-0.5 rounded-full">{colOrders.length}</span>
              </div>

              {/* Cards wrapper */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1 no-scrollbar min-h-[200px]">
                {colOrders.length === 0 && (
                  <div className="text-center py-10 text-[#6b5880] text-xs italic">Nenhum pedido</div>
                )}
                {colOrders.map((order) => {
                  const dateStr = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  
                  return (
                    <div
                      key={order.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, order)}
                      className="glass rounded-2xl p-4 border border-white/[0.06] hover:border-white/10 card-hover cursor-grab active:cursor-grabbing active:opacity-40 space-y-3 relative overflow-hidden transition-all duration-150"
                      onClick={() => setSelectedOrder(order)}
                    >
                      {/* Card Header */}
                      <div className="flex justify-between items-center">
                        <span 
                          className="text-[#FF6B35] font-black text-xs hover:underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/dashboard/pedidos/${order.id}`)
                          }}
                        >
                          {order.order_number}
                        </span>
                        <span className="text-[10px] text-gray-500 font-semibold flex items-center gap-1">
                          <Clock size={11} /> {dateStr}
                        </span>
                      </div>

                      {/* Client info */}
                      <div>
                        <p className="text-white text-xs font-bold leading-none">{order.customer_name}</p>
                        {order.customer_phone && <p className="text-[#a991c7] text-[10px] mt-0.5">{order.customer_phone}</p>}
                      </div>

                      {/* Items preview */}
                      <div className="p-2.5 rounded-xl bg-white/[0.01] border border-white/5 space-y-1">
                        {order.items?.map((item, index) => (
                          <div key={index} className="text-[10px] text-gray-300 leading-tight">
                            <strong className="text-white font-bold">{item.quantity}x</strong> {item.product_name || item.name}
                          </div>
                        ))}
                      </div>

                      {/* Notes / Observações */}
                      {order.notes && (
                        <p className="text-[10px] italic text-[#a991c7] line-clamp-1 bg-amber-500/5 border border-amber-500/10 px-2 py-1 rounded-lg">
                          Obs: "{order.notes}"
                        </p>
                      )}

                      {/* Address for delivery */}
                      {order.order_type === 'delivery' ? (
                        <div className="flex items-start gap-1 text-[10px] text-gray-400 leading-tight">
                          <MapPin size={12} className="text-gray-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{order.delivery_address}, N° {order.delivery_number}</span>
                        </div>
                      ) : (
                        <div className="text-[10px] font-bold text-purple-400">
                          🏪 Retirada no Estabelecimento
                        </div>
                      )}

                      {/* Card Footer */}
                      <div className="flex justify-between items-center border-t border-white/5 pt-2.5 mt-1">
                        <span className="text-white font-black text-sm">{formatCurrency(order.total)}</span>
                        <span className="text-[9px] text-[#a991c7] bg-white/5 px-2 py-0.5 rounded-md font-medium uppercase">
                          {paymentLabels[order.payment_method] || order.payment_method}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => { setSelectedOrder(null); setShowPrintMenu(false); }}
          title={`Detalhes do Pedido ${selectedOrder.order_number}`}
          size="md"
        >
          <div className="space-y-6 text-left">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <Badge color={COLUMNS.find(c => c.key === selectedOrder.status || (selectedOrder.status === 'confirmed' && c.key === 'preparing') || (selectedOrder.status === 'picked_up' && c.key === 'delivered'))?.color || 'gray'} size="md">
                {selectedOrder.status.toUpperCase()}
              </Badge>
              <span className="text-gray-400 text-xs font-semibold">
                Feito às {new Date(selectedOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Actions Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Marcar como Pago (Pix Manual) */}
              {selectedOrder.payment_method === 'pix' && selectedOrder.payment_status === 'pending' && (
                <Button
                  variant="success"
                  size="sm"
                  leftIcon={CheckCircle}
                  onClick={() => handleMarkAsPaid(selectedOrder.id)}
                  className="col-span-2"
                >
                  Marcar como Pago
                </Button>
              )}

              {/* Context Actions */}
              {selectedOrder.status === 'pending' && (
                <Button
                  variant="success"
                  size="sm"
                  leftIcon={Check}
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'confirmed')}
                  className="col-span-2"
                >
                  Aceitar Pedido
                </Button>
              )}

              {selectedOrder.status === 'confirmed' && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={Clock}
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'preparing')}
                  className="col-span-2"
                >
                  Iniciar Preparo
                </Button>
              )}

              {selectedOrder.status === 'preparing' && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={Check}
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'ready')}
                  className="col-span-2"
                >
                  Marcar Pronto
                </Button>
              )}

              {selectedOrder.status === 'ready' && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={Truck}
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'out_for_delivery')}
                  className="col-span-2"
                >
                  Saiu para Entrega
                </Button>
              )}

              {selectedOrder.status === 'out_for_delivery' && (
                <Button
                  variant="success"
                  size="sm"
                  leftIcon={Check}
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')}
                  className="col-span-2"
                >
                  Finalizar Pedido
                </Button>
              )}

              {/* General Actions */}
              {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'picked_up' && selectedOrder.status !== 'cancelled' && (
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={X}
                  onClick={() => setShowCancelModal(true)}
                >
                  Cancelar
                </Button>
              )}

              <div className="relative">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={Printer}
                  rightIcon={ChevronDown}
                  onClick={() => setShowPrintMenu(!showPrintMenu)}
                >
                  Imprimir
                </Button>
                {showPrintMenu && (
                  <div className="absolute right-0 bottom-full mb-2 bg-[#160b29] border border-white/10 rounded-xl py-1 shadow-xl z-50 min-w-[120px] text-left">
                    <button
                      onClick={() => {
                        handlePrint(selectedOrder, '58mm')
                        setShowPrintMenu(false)
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-[#FF6B35]/20 font-bold transition-colors border-b border-white/5"
                    >
                      Bobina 58mm
                    </button>
                    <button
                      onClick={() => {
                        handlePrint(selectedOrder, '80mm')
                        setShowPrintMenu(false)
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-[#FF6B35]/20 font-bold transition-colors"
                    >
                      Bobina 80mm
                    </button>
                  </div>
                )}
              </div>

              {selectedOrder.customer_phone && (
                <a
                  href={`https://wa.me/${selectedOrder.customer_phone.replace(/\D/g, '')}?text=Olá! Gostaria de falar sobre o seu pedido no estabelecimento.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center font-medium bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg text-sm gap-1.5 transition-all active:scale-95"
                >
                  <MessageSquare size={14} />
                  WhatsApp
                </a>
              )}

              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/dashboard/pedidos/${selectedOrder.id}`)}
              >
                Ver Detalhes
              </Button>
            </div>

            {/* Customer & Address Details */}
            <div className="glass rounded-2xl p-4 space-y-3 border border-white/[0.08]">
              <p className="text-[#a991c7] text-[10px] font-bold uppercase tracking-wider">Informações do Cliente</p>
              
              <div className="flex items-center gap-2.5 text-white text-sm">
                <User size={15} className="text-gray-500" />
                <span className="font-bold">{selectedOrder.customer_name}</span>
              </div>
              
              {selectedOrder.customer_phone && (
                <div className="flex items-center gap-2.5 text-gray-300 text-xs">
                  <Phone size={14} className="text-gray-500" />
                  <span>{selectedOrder.customer_phone}</span>
                </div>
              )}

              {selectedOrder.order_type === 'delivery' ? (
                <div className="flex items-start gap-2.5 text-gray-300 text-xs leading-relaxed border-t border-white/5 pt-2.5">
                  <MapPin size={15} className="text-gray-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">Endereço de Entrega:</p>
                    <p className="mt-0.5">{selectedOrder.delivery_address}, N° {selectedOrder.delivery_number}</p>
                    {selectedOrder.delivery_complement && <p className="text-gray-400 font-medium">Compl/Ref: {selectedOrder.delivery_complement}</p>}
                    <p>{selectedOrder.delivery_neighborhood} — {selectedOrder.delivery_city}/{selectedOrder.delivery_state}</p>
                  </div>
                </div>
              ) : (
                <div className="border-t border-white/5 pt-2.5 text-xs text-purple-400 font-extrabold flex items-center gap-2">
                  <span>🏪</span>
                  <span>Este pedido será retirado no balcão pelo cliente.</span>
                </div>
              )}
            </div>

            {selectedOrder.customer_phone && (
              <div className="glass rounded-2xl p-4 border border-white/[0.08] space-y-3 text-left">
                <p className="text-[#a991c7] text-[10px] font-bold uppercase tracking-wider">Notificar via WhatsApp</p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={getWhatsappLink(selectedOrder, 'confirm')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[110px] inline-flex items-center justify-center font-medium bg-green-600/15 hover:bg-green-600/25 text-green-400 border border-green-500/20 py-2 rounded-xl text-[10px] gap-1.5 transition-all active:scale-95"
                  >
                    <MessageSquare size={12} />
                    Confirmar
                  </a>
                  <a
                    href={getWhatsappLink(selectedOrder, 'preparing')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[110px] inline-flex items-center justify-center font-medium bg-green-600/15 hover:bg-green-600/25 text-green-400 border border-green-500/20 py-2 rounded-xl text-[10px] gap-1.5 transition-all active:scale-95"
                  >
                    <MessageSquare size={12} />
                    Em Preparo
                  </a>
                  <a
                    href={getWhatsappLink(selectedOrder, 'ready')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[110px] inline-flex items-center justify-center font-medium bg-green-600/15 hover:bg-green-600/25 text-green-400 border border-green-500/20 py-2 rounded-xl text-[10px] gap-1.5 transition-all active:scale-95"
                  >
                    <MessageSquare size={12} />
                    Pronto
                  </a>
                  <a
                    href={getWhatsappLink(selectedOrder, 'out_for_delivery')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[110px] inline-flex items-center justify-center font-medium bg-green-600/15 hover:bg-green-600/25 text-green-400 border border-green-500/20 py-2 rounded-xl text-[10px] gap-1.5 transition-all active:scale-95"
                  >
                    <MessageSquare size={12} />
                    Saiu Entrega
                  </a>
                  <a
                    href={getWhatsappLink(selectedOrder, 'delivered')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[110px] inline-flex items-center justify-center font-medium bg-green-600/15 hover:bg-green-600/25 text-green-400 border border-green-500/20 py-2 rounded-xl text-[10px] gap-1.5 transition-all active:scale-95"
                  >
                    <MessageSquare size={12} />
                    Finalizar
                  </a>
                </div>
              </div>
            )}

            {/* Items Summary list */}
            <div className="glass rounded-2xl p-4 border border-white/[0.08] space-y-3">
              <p className="text-[#a991c7] text-[10px] font-bold uppercase tracking-wider">Itens do Pedido</p>
              
              <div className="divide-y divide-white/5">
                {selectedOrder.items?.map((item, index) => {
                  const opts = item.options ? JSON.parse(item.options) : []
                  
                  return (
                    <div key={index} className="py-3 first:pt-0 last:pb-0 flex justify-between gap-4 text-xs">
                      <div className="space-y-1">
                        <p className="font-bold text-white">
                          <span className="text-[#FF6B35] mr-1.5">{item.quantity}x</span> 
                          {item.product_name || item.name}
                        </p>
                        {opts.map((o, idx) => (
                          <p key={idx} className="text-[10px] text-gray-500 pl-4">+ {o.name}</p>
                        ))}
                        {item.notes && (
                          <p className="text-[10px] italic text-[#a991c7] pl-4 font-medium">Obs: "{item.notes}"</p>
                        )}
                      </div>
                      <span className="font-semibold text-gray-300 shrink-0">R$ {parseFloat(item.total_price || 0).toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>

              {/* Pricing summary */}
              <div className="border-t border-white/5 pt-3.5 space-y-2 text-xs text-gray-400">
                <div className="flex justify-between items-center">
                  <span>Subtotal</span>
                  <span className="font-semibold text-white">R$ {parseFloat(selectedOrder.subtotal).toFixed(2)}</span>
                </div>
                {selectedOrder.order_type === 'delivery' && (
                  <div className="flex justify-between items-center">
                    <span>Taxa de entrega</span>
                    <span className="font-semibold text-white">R$ {parseFloat(selectedOrder.delivery_fee).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-white/5 pt-3 flex justify-between items-center text-white">
                  <span className="font-bold text-sm">Total</span>
                  <span className="font-black text-base text-[#FF6B35]">{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <CreditCard size={14} className="text-gray-500" />
              <span>Método de pagamento: <strong className="text-white">{paymentLabels[selectedOrder.payment_method] || selectedOrder.payment_method}</strong></span>
              {selectedOrder.change_for && (
                <span className="ml-2 bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-md font-bold">
                  Troco para R$ {parseFloat(selectedOrder.change_for).toFixed(2)}
                </span>
              )}
            </div>

          </div>
        </Modal>
      )}

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
              <Button variant="danger" size="sm" onClick={handleCancelOrder}>
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
