import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Trash2, ShoppingBag, Plus, Minus, ArrowLeft, ChevronRight, Bike, Store, AlertTriangle } from 'lucide-react'
import { publicApi } from '../services/api'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import { applyTheme, removeTheme } from '../utils/theme'

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

  // Apply visual theme from database dynamically
  useEffect(() => {
    if (restaurant) {
      applyTheme(restaurant)
    }
    return () => {
      removeTheme()
    }
  }, [restaurant])

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--theme-bg, #0F0F0F)' }}>
        <div className="text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--theme-primary, #FF6B35)', borderTopColor: 'transparent' }} />
          <p className="text-gray-400 text-sm font-medium">Carregando seu carrinho...</p>
        </div>
      </div>
    )
  }

  const primaryColor = restaurant?.primary_color || '#FF6B35'
  const bgColor = restaurant?.background_color || '#0F0F0F'
  const buttonColor = restaurant?.button_color || primaryColor
  const buttonRadiusClass = restaurant?.border_radius === 'quadrada' ? 'rounded-none' : 'rounded-xl'
  const borderRadiusClass = restaurant?.border_radius === 'quadrada' ? 'rounded-none' : 'rounded-3xl'

  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0)
  const deliveryFee = orderType === 'delivery' ? parseFloat(restaurant?.delivery_fee || 0) : 0
  const total = subtotal + deliveryFee
  const minOrderVal = parseFloat(restaurant?.min_order_value || 0)

  const isBelowMinOrder = subtotal < minOrderVal

  return (
    <div className="min-h-screen flex flex-col justify-between font-inter pb-12" style={{ backgroundColor: bgColor, color: restaurant?.text_color || '#FFFFFF' }}>
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6">
        
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(`/cardapio/${slug}`)}
            className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Cardápio</span>
          </button>
          <span className="text-white font-extrabold text-base">Seu Carrinho</span>
          <div className="w-6" /> {/* spacer */}
        </div>

        {/* Empty state */}
        {cart.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center text-gray-600 mb-6">
              <ShoppingBag size={36} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Seu carrinho está vazio</h2>
            <p className="text-gray-400 text-sm max-w-xs mb-8">Navegue pelo nosso cardápio e adicione seus itens favoritos!</p>
            <Button
              onClick={() => navigate(`/cardapio/${slug}`)}
              className={`px-8 py-3 ${buttonRadiusClass} font-extrabold text-xs uppercase tracking-wider text-white shadow-lg`}
              style={{ backgroundColor: buttonColor }}
            >
              Ver Cardápio
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Delivery/Pickup Selector */}
            <div className={`grid grid-cols-2 p-1.5 bg-white/[0.02] border border-white/5 ${buttonRadiusClass}`}>
              <button
                onClick={() => handleOrderTypeChange('delivery')}
                disabled={!restaurant.delivery_enabled}
                className={`flex items-center justify-center gap-2 py-3 ${buttonRadiusClass} text-xs font-bold transition-all ${
                  orderType === 'delivery'
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white disabled:opacity-30'
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
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white disabled:opacity-30'
                }`}
                style={orderType === 'pickup' ? { backgroundColor: buttonColor } : {}}
              >
                <Store size={16} />
                <span>Retirada</span>
              </button>
            </div>

            {/* Cart Items List */}
            <div className={`divide-y divide-white/5 bg-white/[0.02] border border-white/5 p-5 space-y-4 ${borderRadiusClass}`}>
              {cart.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="flex-1 text-left">
                    <h3 className="text-sm font-bold text-white leading-tight">{item.name}</h3>
                    
                    {/* Options Details */}
                    {item.optionsDetails?.length > 0 && (
                      <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                        {item.optionsDetails.map(o => o.name).join(', ')}
                      </p>
                    )}

                    {/* Notes */}
                    {item.notes && (
                      <p className="text-[10px] italic text-gray-500 mt-1.5 bg-white/[0.02] border border-white/5 px-2.5 py-1.5 rounded-lg">
                        Obs: "{item.notes}"
                      </p>
                    )}

                    <span className="text-xs font-bold text-gray-400 mt-2.5 inline-block">
                      R$ {item.unit_price.toFixed(2)}
                    </span>
                  </div>

                  {/* Quantity controls and removal */}
                  <div className="flex flex-col items-end justify-between gap-3 shrink-0 self-stretch">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 rounded-lg text-gray-500 hover:text-red-500 hover:bg-white/5 transition-all"
                    >
                      <Trash2 size={15} />
                    </button>

                    <div className="flex items-center border border-white/10 rounded-lg overflow-hidden bg-white/5">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="px-2.5 font-bold text-xs text-white min-w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
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
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-left flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Estabelecimento Fechado</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    O estabelecimento está fechado no momento e não está aceitando novos pedidos. A finalização está suspensa.
                  </p>
                </div>
              </div>
            )}

            {/* Minimum Order Value Warning */}
            {isBelowMinOrder && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Pedido mínimo não atingido</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    O restaurante exige um valor mínimo de **R$ {minOrderVal.toFixed(2)}** em itens para aceitar pedidos. Adicione mais R$ {(minOrderVal - subtotal).toFixed(2)} ao carrinho.
                  </p>
                </div>
              </div>
            )}

            {/* Pricing Summary */}
            <div className={`bg-white/[0.02] border border-white/5 p-5 space-y-3.5 text-sm ${borderRadiusClass}`}>
              <div className="flex justify-between items-center text-gray-400">
                <span>Subtotal</span>
                <span className="font-semibold text-white">R$ {subtotal.toFixed(2)}</span>
              </div>
              {orderType === 'delivery' && (
                <div className="flex justify-between items-center text-gray-400">
                  <span>Taxa de entrega</span>
                  <span className="font-semibold text-white">R$ {deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-white/5 pt-3.5 flex justify-between items-center text-white">
                <span className="font-bold text-base">Total</span>
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
                className={`w-full py-4 ${buttonRadiusClass} font-extrabold text-xs uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2`}
                style={{ backgroundColor: buttonColor }}
              >
                Avançar para Checkout
                <ChevronRight size={15} />
              </Button>
              
              <button
                onClick={() => navigate(`/cardapio/${slug}`)}
                className={`w-full py-3.5 ${buttonRadiusClass} font-bold text-xs uppercase tracking-wider text-gray-400 hover:text-white border border-white/10 bg-white/5 hover:bg-white/[0.08] transition-all`}
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
