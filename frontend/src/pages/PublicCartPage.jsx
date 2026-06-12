import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Trash2, ShoppingBag, Plus, Minus, ArrowLeft, ChevronRight, Bike, Store, AlertTriangle } from 'lucide-react'
import { publicApi } from '../services/api'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'

// Mock fallback for burger-house when offline
const MOCK_RESTAURANT = {
  name: 'Burger House',
  slug: 'burger-house',
  delivery_fee: 5.00,
  min_order_value: 25.00,
  primary_color: '#FF6B35',
  background_color: '#0F0F0F',
  text_color: '#FFFFFF',
  font_family: 'Inter',
  pickup_enabled: 1,
  delivery_enabled: 1
}

export default function PublicCartPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [orderType, setOrderType] = useState('delivery') // 'delivery' | 'pickup'

  useEffect(() => {
    async function loadRestaurant() {
      try {
        const res = await publicApi.getRestaurant(slug)
        if (res.success) setRestaurant(res.data)
      } catch (err) {
        console.warn('Erro ao carregar restaurante público, usando mock.', err)
        if (slug === 'burger-house') {
          setRestaurant(MOCK_RESTAURANT)
        }
      } finally {
        setLoading(false)
      }
    }
    loadRestaurant()
  }, [slug])

  // Load cart and orderType preference
  useEffect(() => {
    const savedCart = localStorage.getItem(`mda_cart_${slug}`)
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch {
        setCart([])
      }
    }

    const savedType = localStorage.getItem(`mda_order_type_${slug}`)
    if (savedType) {
      setOrderType(savedType)
    }
  }, [slug])
  const saveCart = (newCart) => {
    setCart(newCart)
    localStorage.setItem(`mda_cart_${slug}`, JSON.stringify(newCart))
  }

  const updateQuantity = (itemId, amount) => {
    const newCart = cart.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, item.quantity + amount)
        // Recalculate item total
        const unitPrice = item.unit_price
        return {
          ...item,
          quantity: newQty,
          total_price: unitPrice * newQty
        }
      }
      return item
    })
    saveCart(newCart)
  }

  const removeItem = (itemId) => {
    const newCart = cart.filter(item => item.id !== itemId)
    saveCart(newCart)
    toast.success('Produto removido do carrinho.')
  }

  const handleOrderTypeChange = (type) => {
    setOrderType(type)
    localStorage.setItem(`mda_order_type_${slug}`, type)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-slate-200 border-t-[#FF5A1F] rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-semibold">Carregando seu carrinho...</p>
        </div>
      </div>
    )
  }

  const primaryColor = restaurant?.primary_color || '#FF5A1F'
  const buttonColor = primaryColor
  const buttonRadiusClass = restaurant?.border_radius === 'quadrada' ? 'rounded-none' : 'rounded-2xl'
  const borderRadiusClass = restaurant?.border_radius === 'quadrada' ? 'rounded-none' : 'rounded-3xl'

  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0)
  const deliveryFee = orderType === 'delivery' ? parseFloat(restaurant?.delivery_fee || 0) : 0
  const total = subtotal + deliveryFee
  const minOrderVal = parseFloat(restaurant?.min_order_value || 0)

  const isBelowMinOrder = subtotal < minOrderVal

  return (
    <div className="min-h-screen flex flex-col justify-between font-inter pb-12 bg-[#F8FAFC] text-[#111827] text-left">
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6">
        
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(`/cardapio/${slug}`)}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Cardápio</span>
          </button>
          <span className="text-slate-900 font-extrabold text-base tracking-tight">Seu Carrinho</span>
          <div className="w-6" /> {/* spacer */}
        </div>

        {/* Empty state */}
        {cart.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8">
            <div className="w-20 h-20 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-6">
              <ShoppingBag size={36} />
            </div>
            <h2 className="text-lg font-black text-slate-900 mb-2">Seu carrinho está vazio</h2>
            <p className="text-slate-500 text-sm max-w-xs mb-8">Navegue pelo nosso cardápio e adicione seus itens favoritos!</p>
            <Button
              onClick={() => navigate(`/cardapio/${slug}`)}
              className={`px-8 py-3.5 ${buttonRadiusClass} font-extrabold text-xs uppercase tracking-wider text-white shadow-md hover:opacity-95 transition-all`}
              style={{ backgroundColor: buttonColor }}
            >
              Ver Cardápio
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Delivery/Pickup Selector */}
            <div className={`grid grid-cols-2 p-1 bg-slate-100 border border-slate-200/60 ${buttonRadiusClass}`}>
              <button
                onClick={() => handleOrderTypeChange('delivery')}
                disabled={!restaurant.delivery_enabled}
                className={`flex items-center justify-center gap-2 py-3 ${buttonRadiusClass} text-xs font-bold transition-all ${
                  orderType === 'delivery'
                    ? 'text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 disabled:opacity-30'
                }`}
                style={orderType === 'delivery' ? { backgroundColor: buttonColor } : {}}
              >
                <Bike size={16} />
                <span>Delivery</span>
              </button>
              <button
                onClick={() => handleOrderTypeChange('pickup')}
                disabled={!restaurant.pickup_enabled}
                className={`flex items-center justify-center gap-2 py-3 ${buttonRadiusClass} text-xs font-bold transition-all ${
                  orderType === 'pickup'
                    ? 'text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 disabled:opacity-30'
                }`}
                style={orderType === 'pickup' ? { backgroundColor: buttonColor } : {}}
              >
                <Store size={16} />
                <span>Retirada</span>
              </button>
            </div>

            {/* Cart Items List */}
            <div className={`divide-y divide-slate-100 bg-white border border-slate-200/80 p-6 shadow-sm ${borderRadiusClass}`}>
              {cart.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="flex-1 text-left">
                    <h3 className="text-sm font-extrabold text-slate-900 leading-tight">{item.name}</h3>
                    
                    {/* Options Details */}
                    {item.optionsDetails?.length > 0 && (
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                        {item.optionsDetails.map(o => o.name).join(', ')}
                      </p>
                    )}

                    {/* Notes */}
                    {item.notes && (
                      <p className="text-[10px] italic text-slate-500 mt-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg">
                        Obs: "{item.notes}"
                      </p>
                    )}

                    <span className="text-xs font-bold text-slate-400 mt-2.5 inline-block">
                      R$ {item.unit_price.toFixed(2)}
                    </span>
                  </div>

                  {/* Quantity controls and removal */}
                  <div className="flex flex-col items-end justify-between gap-3 shrink-0 self-stretch">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-all"
                    >
                      <Trash2 size={15} />
                    </button>

                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 transition-colors"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="px-2.5 font-bold text-xs text-slate-900 min-w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 transition-colors"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Closed / Blocking Order Warning */}
            {(!restaurant?.is_open || restaurant?.is_open === 0) && (!restaurant?.accept_orders_when_closed || restaurant?.accept_orders_when_closed === 0) && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-left flex items-start gap-3">
                <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-extrabold text-rose-950">Estamos fechados no momento</h4>
                  <p className="text-[10px] text-rose-700 mt-0.5">
                    O estabelecimento está fechado no momento e não está aceitando novos pedidos. A finalização está suspensa.
                  </p>
                </div>
              </div>
            )}

            {/* Minimum Order Value Warning */}
            {isBelowMinOrder && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-extrabold text-amber-950">Pedido mínimo não atingido</h4>
                  <p className="text-[10px] text-amber-700 mt-0.5">
                    O restaurante exige um valor mínimo de **R$ {minOrderVal.toFixed(2)}** em itens para aceitar pedidos. Adicione mais R$ {(minOrderVal - subtotal).toFixed(2)} ao carrinho.
                  </p>
                </div>
              </div>
            )}

            {/* Pricing Summary */}
            <div className={`bg-white border border-slate-200/80 p-6 space-y-4 text-sm shadow-sm ${borderRadiusClass}`}>
              <div className="flex justify-between items-center text-slate-500 font-medium">
                <span>Subtotal</span>
                <span className="font-bold text-slate-950">R$ {subtotal.toFixed(2)}</span>
              </div>
              {orderType === 'delivery' && (
                <div className="flex justify-between items-center text-slate-500 font-medium">
                  <span>Taxa de entrega</span>
                  <span className="font-bold text-slate-950">R$ {deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-slate-900">
                <span className="font-black text-slate-900 text-base">Total</span>
                <span className="font-black text-xl" style={{ color: primaryColor }}>
                  R$ {total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={() => navigate(`/cardapio/${slug}/checkout`)}
                disabled={isBelowMinOrder || ((!restaurant?.is_open || restaurant?.is_open === 0) && (!restaurant?.accept_orders_when_closed || restaurant?.accept_orders_when_closed === 0))}
                className={`w-full py-4 ${buttonRadiusClass} font-extrabold text-xs uppercase tracking-wider text-white shadow-md flex items-center justify-center gap-2`}
                style={{ backgroundColor: buttonColor }}
              >
                Avançar para Checkout
                <ChevronRight size={15} />
              </Button>
              
              <button
                onClick={() => navigate(`/cardapio/${slug}`)}
                className={`w-full py-3.5 ${buttonRadiusClass} font-bold text-xs uppercase tracking-wider text-slate-600 hover:text-slate-950 border border-slate-200 bg-white hover:bg-slate-50 transition-all`}
              >
                Adicionar mais itens
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
