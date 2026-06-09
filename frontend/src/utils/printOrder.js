import { formatCurrency } from './helpers'

const esc = (v='') => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))
const parseOptions = (value) => {
  if (!value) return []
  try { return typeof value === 'string' ? JSON.parse(value) : value } catch { return [] }
}
const isDrink = (name='') => /bebida|refrigerante|coca|guaran|suco|água|agua|cerveja|lat(a|ão)|refri|drink|vitamina/i.test(name)

export function printOrderTicket(order, { restaurantName='Restaurante', type='normal', size='80mm' } = {}) {
  if (!order) return
  const is58 = size === '58mm'
  const kitchen = type === 'kitchen'
  const itemsHtml = (order.items || []).map(item => {
    const name = item.product_name || item.name || 'Item'
    const opts = parseOptions(item.options)
    return `<div class="item ${isDrink(name) ? 'drink' : ''}">
      <div class="item-title"><b>${esc(item.quantity || 1)}x</b> ${esc(name)}</div>
      ${opts?.length ? `<div class="opts">${opts.map(o => `+ ${esc(o.name || o.label || o)}`).join('<br>')}</div>` : ''}
      ${item.notes ? `<div class="obs">OBS ITEM: ${esc(item.notes)}</div>` : ''}
      ${!kitchen ? `<div class="price">${formatCurrency(item.total_price || item.total || 0)}</div>` : ''}
    </div>`
  }).join('')

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${kitchen ? 'Cozinha' : 'Pedido'} ${esc(order.order_number)}</title>
  <style>
    @media print { @page { margin:0; size:${is58 ? '58mm auto' : '80mm auto'}; } body{margin:0;} }
    body{font-family:Arial,'Courier New',monospace;color:#000;background:#fff;width:${is58 ? '54mm' : '76mm'};padding:${is58 ? '2mm' : '4mm'};font-size:${is58 ? '11px' : '13px'};line-height:1.25}
    h1{font-size:${is58 ? '15px' : '20px'};text-align:center;margin:0 0 5px;font-weight:900}.center{text-align:center}.sep{border-top:1px dashed #000;margin:7px 0}.label{font-weight:900}.big{font-size:${is58 ? '15px':'20px'};font-weight:900}.item{border-bottom:1px dashed #999;padding:7px 0;position:relative}.item-title{font-size:${is58 ? '13px':'16px'};font-weight:900}.item-title b{font-size:${is58 ? '18px':'24px'}}.opts{margin-left:10px;font-size:${is58 ? '11px':'13px'};font-weight:700}.obs{margin-top:5px;border:2px solid #000;padding:5px;font-weight:900;font-size:${is58 ? '12px':'15px'}}.drink{border:3px solid #000;padding:7px;margin:6px 0}.drink:before{content:'BEBIDA / GELADEIRA';display:block;font-weight:900;font-size:12px;margin-bottom:3px}.price{text-align:right;font-weight:900}.total{font-size:${is58 ? '15px':'20px'};font-weight:900;text-align:right}.warn{border:3px solid #000;padding:7px;margin:7px 0;font-weight:900;font-size:${is58 ? '12px':'15px'}}
  </style></head><body>
    <h1>${kitchen ? 'COZINHA' : esc(restaurantName)}</h1>
    <div class="center big">${esc(order.order_number || ('#'+order.id))}</div>
    <div class="center">${new Date(order.created_at || Date.now()).toLocaleString('pt-BR')}</div>
    <div class="sep"></div>
    <div><span class="label">Cliente:</span> ${esc(order.customer_name || 'Cliente')}</div>
    ${order.table_number || order.table_id ? `<div class="big">MESA: ${esc(order.table_number || order.table_id)}</div>` : ''}
    <div><span class="label">Tipo:</span> ${order.order_type === 'delivery' ? 'Entrega' : order.order_type === 'pickup' ? 'Retirada' : 'Mesa/Local'}</div>
    ${!kitchen && order.customer_phone ? `<div><span class="label">Fone:</span> ${esc(order.customer_phone)}</div>` : ''}
    ${!kitchen && order.delivery_address ? `<div><span class="label">Endereço:</span> ${esc(order.delivery_address)} ${esc(order.delivery_number || '')}</div>` : ''}
    ${order.notes ? `<div class="warn">OBS GERAL: ${esc(order.notes)}</div>` : ''}
    <div class="sep"></div>${itemsHtml}<div class="sep"></div>
    ${!kitchen ? `<div>Subtotal: ${formatCurrency(order.subtotal || 0)}</div><div>Entrega: ${formatCurrency(order.delivery_fee || 0)}</div><div class="total">TOTAL: ${formatCurrency(order.total || 0)}</div><div><span class="label">Pagamento:</span> ${esc(order.payment_method || '')}</div>` : '<div class="center label">CONFERIR OBSERVAÇÕES E BEBIDAS</div>'}
    <script>window.onload=function(){setTimeout(function(){window.print();},250);setTimeout(function(){window.close();},1200)}</script>
  </body></html>`
  const w = window.open('', '_blank', 'width=520,height=800')
  if (!w) return alert('O navegador bloqueou a janela de impressão. Libere pop-ups para este site.')
  w.document.open(); w.document.write(html); w.document.close();
}
