import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ShoppingBag, ChevronRight, Info, AlertTriangle, Plus, Minus, X,
  Clock, ArrowLeft, Download, User, Bike, Store, Trash2, Star, Check
} from 'lucide-react'
import { publicApi } from '../services/api'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import { usePWA } from '../contexts/PWAContext'
import { formatImageUrl } from '../utils/helpers'

const DAYS_MAPPING = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo'
}

// Mock fallback data for burger-house when database or backend is offline
const MOCK_RESTAURANT = {
  id: 1,
  name: 'Burger House',
  slug: 'burger-house',
  logo: null,
  cover_image: null,
  is_open: 1,
  delivery_enabled: 1,
  delivery_fee: 5.00,
  min_order_value: 25.00,
  estimated_delivery_time: 45,
  pickup_enabled: 1,
  estimated_pickup_time: 20,
  primary_color: '#FF5A1F',
  secondary_color: '#F97316',
  background_color: '#F8FAFC',
  text_color: '#111827',
  font_family: 'Inter',
  accepts_pix: 1,
  accepts_cash: 1,
  accepts_credit_card: 1,
  accepts_debit_card: 1,
}

const MOCK_MENU = {
  categories: [
    { id: 1, name: 'Burgers', position: 1 },
    { id: 2, name: 'Combos', position: 2 },
    { id: 3, name: 'Bebidas', position: 3 },
  ],
  products: [
    {
      id: 1,
      category_id: 1,
      name: 'Classic Burger',
      description: 'Pão brioche tostado, 180g de carne angus, queijo cheddar, alface americana, tomate e molho especial da casa.',
      price: 28.90,
      promotional_price: null,
      is_available: 1,
      is_featured: 1,
      complements: [
        {
          id: 1,
          name: 'Escolha o ponto da carne',
          is_required: 1,
          min_quantity: 1,
          max_quantity: 1,
          items: [
            { id: 1, name: 'Ao ponto', price: 0.00, max_quantity: 1 },
            { id: 2, name: 'Bem passado', price: 0.00, max_quantity: 1 },
            { id: 3, name: 'Mal passado', price: 0.00, max_quantity: 1 },
          ]
        },
        {
          id: 2,
          name: 'Adicionais',
          is_required: 0,
          min_quantity: 0,
          max_quantity: 3,
          items: [
            { id: 4, name: 'Bacon Extra', price: 4.50, max_quantity: 2 },
            { id: 5, name: 'Cheddar Extra', price: 3.00, max_quantity: 2 },
          ]
        }
      ]
    },
    {
      id: 2,
      category_id: 1,
      name: 'Double Smash',
      description: 'Dois smash burgers de 90g cada, queijo americano duplo, picles artesanal e nosso molho secreto no pão com gergelim.',
      price: 34.90,
      promotional_price: 29.90,
      is_available: 1,
      is_featured: 1,
      complements: []
    },
  ],
}

export default function PublicMenuPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isInstallable, installApp } = usePWA()
  const [restaurant, setRestaurant] = useState(null)
  const [menu, setMenu] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeCategory, setActiveCategory] = useState(null)
  const [showHoursModal, setShowHoursModal] = useState(false)
  
  // Cart state
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [orderType, setOrderType] = useState('delivery') // 'delivery' | 'pickup'

  // Product Detail Modal state
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [modalQuantity, setModalQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState({}) // { group_id: { item_id: qty } }
  const [itemNotes, setItemNotes] = useState('')

  // Load restaurant & menu
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const restRes = await publicApi.getRestaurant(slug)
        const menuRes = await publicApi.getMenu(slug)
        
        if (restRes.success) setRestaurant(restRes.data)
        if (menuRes.success) setMenu(menuRes.data)
      } catch (err) {
        console.warn('Erro ao conectar com API pública, usando dados demo.', err)
        if (slug === 'burger-house' || slug === 'demo') {
          setRestaurant(MOCK_RESTAURANT)
          setMenu(MOCK_MENU)
          setActiveCategory(MOCK_MENU.categories[0].id)
        } else {
          setError('Restaurante não encontrado ou fora do ar.')
        }
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [slug])

  // Load cart on start
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

  const handleOrderTypeChange = (type) => {
    setOrderType(type)
    localStorage.setItem(`mda_order_type_${slug}`, type)
  }

  const updateCartQuantity = (itemId, amount) => {
    const newCart = cart.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, item.quantity + amount)
        return {
          ...item,
          quantity: newQty,
          total_price: item.unit_price * newQty
        }
      }
      return item
    })
    saveCart(newCart)
  }

  const removeCartItem = (itemId) => {
    const newCart = cart.filter(item => item.id !== itemId)
    saveCart(newCart)
    toast.success('Produto removido do carrinho.')
  }

  const handleOpenProduct = (product) => {
    if (product.is_available === 0) {
      toast.error('Este produto está indisponível no momento.')
      return
    }
    setSelectedProduct(product)
    setModalQuantity(1)
    setItemNotes('')
    
    // Initialize default required complement selections
    const defaults = {}
    const comps = product.complements || []
    comps.forEach(group => {
      defaults[group.id] = {}
      if (group.is_required && group.min_quantity === 1 && group.items && group.items.length > 0) {
        // Pre-select first item
        defaults[group.id][group.items[0].id] = 1
      }
    })
    setSelectedOptions(defaults)
  }

  const handleAdjustItemQuantity = (groupId, item, change) => {
    const group = selectedProduct.complements.find(g => g.id === groupId)
    if (!group) return

    setSelectedOptions(prev => {
      const groupSelections = { ...(prev[groupId] || {}) }
      const currentQty = groupSelections[item.id] || 0
      const newQty = currentQty + change

      const otherItemsQty = Object.entries(groupSelections)
        .filter(([id]) => parseInt(id) !== item.id)
        .reduce((sum, [, qty]) => sum + qty, 0)

      if (newQty <= 0) {
        delete groupSelections[item.id]
      } else {
        const isGroupBeverage = /bebida|refrigerante|coca|guaran|suco|água|agua|refri|drink|lat(a|ão)|cerveja/i.test(group.name);
        const isItemBeverage = isGroupBeverage || /bebida|refrigerante|coca|guaran|suco|água|agua|refri|drink|lat(a|ão)|cerveja/i.test(item.name);
        
        const effectiveGroupMaxQty = isGroupBeverage ? 99 : group.max_quantity;
        const effectiveItemMaxQty = isItemBeverage ? 99 : item.max_quantity;

        if (otherItemsQty + newQty > effectiveGroupMaxQty) {
          toast.error(`Você pode selecionar no máximo ${effectiveGroupMaxQty} itens no grupo "${group.name}".`)
          return prev
        }
        if (newQty > effectiveItemMaxQty) {
          toast.error(`Você pode selecionar no máximo ${effectiveItemMaxQty}x do item "${item.name}".`)
          return prev
        }
        groupSelections[item.id] = newQty
      }

      return {
        ...prev,
        [groupId]: groupSelections
      }
    })
  }

  const handleToggleItemSelection = (groupId, item, isSingleSelect) => {
    const group = selectedProduct.complements.find(g => g.id === groupId)
    if (!group) return

    setSelectedOptions(prev => {
      const groupSelections = { ...(prev[groupId] || {}) }
      const isSelected = !!groupSelections[item.id]

      if (isSingleSelect) {
        return {
          ...prev,
          [groupId]: { [item.id]: 1 }
        }
      } else {
        if (isSelected) {
          delete groupSelections[item.id]
        } else {
          const totalQtySelected = Object.values(groupSelections).reduce((sum, q) => sum + q, 0)
          if (totalQtySelected + 1 > group.max_quantity) {
            toast.error(`Você pode selecionar no máximo ${group.max_quantity} itens no grupo "${group.name}".`)
            return prev
          }
          groupSelections[item.id] = 1
        }
        return {
          ...prev,
          [groupId]: groupSelections
        }
      }
    })
  }

  const getModalTotalPrice = () => {
    if (!selectedProduct) return 0
    let extraPrice = 0
    const comps = selectedProduct.complements || []
    comps.forEach(group => {
      const selections = selectedOptions[group.id] || {}
      Object.entries(selections).forEach(([itemId, qty]) => {
        const item = group.items.find(i => i.id === parseInt(itemId))
        if (item) {
          extraPrice += parseFloat(item.price || 0) * qty
        }
      })
    })
    const basePrice = parseFloat(selectedProduct.promotional_price || selectedProduct.price || 0)
    return (basePrice + extraPrice) * modalQuantity
  }

  const handleAddToCart = () => {
    const missingRequired = []
    const chosenOptionsIds = []
    const chosenOptionsDetails = []
    let extraPrice = 0

    selectedProduct.complements?.forEach(group => {
      const selections = selectedOptions[group.id] || {}
      const totalQty = Object.values(selections).reduce((sum, q) => sum + q, 0)

      if (group.is_required && totalQty < group.min_quantity) {
        missingRequired.push(`${group.name} (mínimo ${group.min_quantity})`)
      }

      Object.entries(selections).forEach(([itemId, qty]) => {
        const item = group.items.find(i => i.id === parseInt(itemId))
        if (item) {
          extraPrice += parseFloat(item.price || 0) * qty
          chosenOptionsIds.push(item.id)
          chosenOptionsDetails.push({
            id: item.id,
            name: qty > 1 ? `${qty}x ${item.name}` : item.name,
            price: item.price,
            quantity: qty,
            group_name: group.name
          })
        }
      })
    })

    if (missingRequired.length > 0) {
      toast.error(`Escolha as opções obrigatórias: ${missingRequired.join(', ')}`)
      return
    }

    const unitPrice = parseFloat(selectedProduct.promotional_price || selectedProduct.price)
    const finalUnitPrice = unitPrice + extraPrice
    const itemTotal = finalUnitPrice * modalQuantity

    const existingIndex = cart.findIndex(item => {
      if (item.product_id !== selectedProduct.id) return false
      if ((item.notes || '').trim() !== (itemNotes || '').trim()) return false

      const itemOpts = [...(item.options || [])].sort()
      const newOpts = [...chosenOptionsIds].sort()
      if (itemOpts.length !== newOpts.length) return false
      return itemOpts.every((val, index) => val === newOpts[index])
    })

    let newCart
    if (existingIndex > -1) {
      newCart = [...cart]
      newCart[existingIndex].quantity += modalQuantity
      newCart[existingIndex].total_price = newCart[existingIndex].unit_price * newCart[existingIndex].quantity
    } else {
      const cartItem = {
        id: Date.now() + Math.random(),
        product_id: selectedProduct.id,
        name: selectedProduct.name,
        quantity: modalQuantity,
        unit_price: finalUnitPrice,
        total_price: itemTotal,
        options: chosenOptionsIds,
        optionsDetails: chosenOptionsDetails,
        notes: itemNotes
      }
      newCart = [...cart, cartItem]
    }

    saveCart(newCart)
    setSelectedProduct(null)
    toast.success('Produto adicionado ao carrinho! 🛒')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-slate-200 border-t-[#FF5A1F] rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-semibold">Carregando cardápio...</p>
        </div>
      </div>
    )
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#F8FAFC]">
        <AlertTriangle size={48} className="mb-4 text-[#FF5A1F]" />
        <h2 className="text-xl font-black text-slate-900 mb-2">Ops! Ocorreu um erro</h2>
        <p className="text-slate-500 text-sm max-w-sm mb-6">{error || 'Restaurante não encontrado.'}</p>
        <Link to="/" className="text-sm font-extrabold px-6 py-3 rounded-2xl text-white bg-[#FF5A1F] hover:bg-[#e04f1a] transition-all shadow-md">
          Voltar para Início
        </Link>
      </div>
    )
  }

  const primaryColor = restaurant.primary_color || '#FF5A1F'
  const buttonColor = primaryColor
  const buttonRadiusClass = restaurant.border_radius === 'quadrada' ? 'rounded-none' : 'rounded-xl'
  const borderRadiusClass = restaurant.border_radius === 'quadrada' ? 'rounded-none' : 'rounded-3xl'

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartSubtotal = cart.reduce((sum, item) => sum + item.total_price, 0)
  const deliveryFee = orderType === 'delivery' ? parseFloat(restaurant.delivery_fee || 0) : 0
  const cartTotal = cartSubtotal + deliveryFee
  const isBelowMinOrder = cartSubtotal < parseFloat(restaurant.min_order_value || 0)

  return (
    <div className="min-h-screen pb-24 bg-[#F8FAFC] text-[#111827] font-inter text-left">
      
      {/* 1. STICKY HEADER */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm transition-all">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all">
              <ArrowLeft size={18} />
            </Link>
            <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
              {restaurant.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isInstallable && (
              <button
                onClick={installApp}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-[#FF5A1F] hover:opacity-95 shadow-sm"
              >
                <Download size={12} />
                <span>Instalar</span>
              </button>
            )}
            <Link
              to={`/cardapio/${slug}/minha-conta`}
              className="p-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded-xl transition-all"
              title="Minha Conta"
            >
              <User size={18} />
            </Link>
            <button
              onClick={() => setIsCartOpen(true)}
              className="p-2 bg-[#FF5A1F]/10 hover:bg-[#FF5A1F]/20 text-[#FF5A1F] rounded-xl transition-all relative"
              title="Ver Carrinho"
            >
              <ShoppingBag size={18} />
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#FF5A1F] text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO COVER BANNER */}
      <div className="h-44 sm:h-56 relative w-full overflow-hidden bg-slate-200 border-b border-slate-100">
        {restaurant.cover_image ? (
          <img src={formatImageUrl(restaurant.cover_image)} alt="Capa" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-slate-200 to-slate-100 flex items-center justify-center opacity-65">
            <ShoppingBag size={48} className="text-slate-300" />
          </div>
        )}
      </div>

      {/* 3. RESTAURANT OPERATIONAL CARD */}
      <div className="max-w-4xl mx-auto px-4 relative -mt-16 sm:-mt-20 mb-8 z-10">
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-lg flex flex-col md:flex-row md:items-end gap-5">
          {/* Logo Circular */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white bg-slate-100 shadow-md overflow-hidden shrink-0 -mt-16 md:mt-0 mx-auto md:mx-0 flex items-center justify-center">
            {restaurant.logo ? (
              <img src={formatImageUrl(restaurant.logo)} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-black text-white text-3xl" style={{ background: `linear-gradient(135deg, ${primaryColor}, #111827)` }}>
                {restaurant.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Info Side */}
          <div className="flex-grow text-center md:text-left space-y-2">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{restaurant.name}</h1>
              {restaurant.welcome_message && (
                <p className="text-xs text-slate-500 italic mt-1 max-w-lg">
                  "{restaurant.welcome_message}"
                </p>
              )}
            </div>

            {/* Badges / Stats grid */}
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-x-4 gap-y-2 mt-3 text-xs text-slate-500 font-bold">
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-[#FF5A1F]" />
                {restaurant.estimated_delivery_time || 45} min
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 hidden md:inline-block" />
              <span>
                Entrega: R$ {(parseFloat(restaurant.delivery_fee) || 0).toFixed(2)}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 hidden md:inline-block" />
              <span>
                Mínimo: R$ {(parseFloat(restaurant.min_order_value) || 25).toFixed(2)}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 hidden md:inline-block" />
              <button
                onClick={() => setShowHoursModal(true)}
                className="flex items-center gap-1 hover:underline text-[#FF5A1F] font-extrabold"
              >
                <Clock size={12} />
                Ver Horários
              </button>
            </div>
          </div>

          {/* Status Open/Closed Badge */}
          <div className="shrink-0 flex items-center justify-center md:justify-end">
            <span
              className={`text-xs font-black px-4 py-2 rounded-full text-white shadow-sm uppercase tracking-wider ${
                restaurant.is_open ? 'bg-green-500' : 'bg-red-500'
              }`}
            >
              {restaurant.is_open ? 'Loja Aberta' : 'Fechada'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. CLOSED NOTICE BANNER */}
      {(!restaurant.is_open || restaurant.is_open === 0) && (!restaurant.accept_orders_when_closed || restaurant.accept_orders_when_closed === 0) && (
        <div className="max-w-4xl mx-auto px-4 mb-8">
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-left flex items-start gap-3">
            <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-sm font-extrabold text-rose-950">Estamos fechados no momento</h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Não estamos recebendo pedidos no momento. Você pode navegar pelos produtos, mas a finalização de compras está indisponível.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5. FEATURED PRODUCTS (DESTAQUES) */}
      {(() => {
        const featuredProducts = menu?.products?.filter(p => p.is_featured === 1 || p.is_featured === true || p.is_featured === '1' || p.is_featured === 'true') || []
        if (featuredProducts.length === 0) return null

        return (
          <div className="max-w-4xl mx-auto px-4 mb-8 text-left">
            <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-[#FF5A1F]" />
              Destaques da Casa
            </h2>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 scroll-smooth snap-x">
              {featuredProducts.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => handleOpenProduct(prod)}
                  className="w-60 shrink-0 snap-start p-4 cursor-pointer bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {prod.image_url ? (
                      <div className="w-full h-32 rounded-2xl overflow-hidden bg-slate-50 mb-3 relative">
                        <img src={formatImageUrl(prod.image_url)} alt={prod.name} className="w-full h-full object-cover" />
                        {prod.is_available === 0 && (
                          <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-[10px] font-black text-slate-500">INDISPONÍVEL</div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-32 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 relative">
                        <ShoppingBag size={20} className="text-slate-300" />
                        {prod.is_available === 0 && (
                          <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-[10px] font-black text-slate-500">INDISPONÍVEL</div>
                        )}
                      </div>
                    )}
                    <h3 className="font-extrabold text-slate-900 text-sm line-clamp-1">{prod.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{prod.description}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      {prod.promotional_price ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm text-[#FF5A1F]">
                            R$ {parseFloat(prod.promotional_price).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400 line-through">
                            R$ {parseFloat(prod.price).toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-black text-sm text-slate-900">
                          R$ {parseFloat(prod.price).toFixed(2)}
                        </span>
                      )}
                    </div>
                    {prod.is_available !== 0 && (
                      <button
                        className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-white bg-[#FF5A1F] hover:bg-[#e04f1a]"
                      >
                        + ADD
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* 6. MENU CATEGORIES BAR (STICKY BELOW HEADER) */}
      {menu?.categories?.length > 0 && (
        <div className="sticky top-[69px] z-30 shadow-sm border-b border-slate-200 bg-white/95 backdrop-blur-md py-3">
          <div className="max-w-4xl mx-auto px-4 flex items-center gap-2.5 overflow-x-auto no-scrollbar scroll-smooth">
            <button
              onClick={() => {
                setActiveCategory(null)
              }}
              className={`px-4 py-2.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                activeCategory === null
                  ? 'text-white bg-[#FF5A1F] shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
              }`}
            >
              Todos
            </button>
            {menu.categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id)
                  const el = document.getElementById(`category-${cat.id}`)
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
                className={`px-4 py-2.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                  activeCategory === cat.id
                    ? 'text-white bg-[#FF5A1F] shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 7. PRODUCTS LIST BY CATEGORY */}
      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-10">
        {menu?.categories
          ?.filter((cat) => activeCategory === null || activeCategory === cat.id)
          ?.map((cat) => {
          const catProducts = menu.products.filter(p => p.category_id === cat.id)
          if (catProducts.length === 0) return null

          return (
            <section key={cat.id} id={`category-${cat.id}`} className="scroll-mt-28 text-left">
              <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-[#FF5A1F]" />
                {cat.name}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {catProducts.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => handleOpenProduct(prod)}
                    className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 flex justify-between gap-4 cursor-pointer"
                  >
                    {/* Left Details */}
                    <div className="flex-1 flex flex-col justify-between text-left">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">{prod.name}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{prod.description}</p>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        {prod.promotional_price ? (
                          <>
                            <span className="font-black text-sm sm:text-base text-[#FF5A1F]">
                              R$ {parseFloat(prod.promotional_price).toFixed(2)}
                            </span>
                            <span className="text-xs text-slate-400 line-through">
                              R$ {parseFloat(prod.price).toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span className="font-black text-sm sm:text-base text-slate-900">
                            R$ {parseFloat(prod.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Product Image & Float ADD Button */}
                    <div className="relative shrink-0 self-center">
                      {prod.image_url ? (
                        <img src={formatImageUrl(prod.image_url)} alt={prod.name} className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-slate-100 shadow-sm" />
                      ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center shadow-sm">
                          <ShoppingBag size={20} className="text-slate-300" />
                        </div>
                      )}
                      {prod.is_available === 0 ? (
                        <span className="absolute inset-0 bg-white/70 flex items-center justify-center text-[10px] font-black text-slate-500 rounded-2xl">Indisponível</span>
                      ) : (
                        <button
                          type="button"
                          className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-white border border-slate-200 shadow-md text-[10px] font-black uppercase text-[#FF5A1F] px-3.5 py-1.5 rounded-full hover:bg-slate-50 transition-all flex items-center gap-1 min-w-[64px] justify-center"
                          style={{ color: primaryColor }}
                        >
                          + ADD
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {/* 8. FLOATING BOTTOM CART BAR (MOBILE/DESKTOP INLINE TRIGGER) */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-6 left-0 right-0 z-40 px-4 animate-slide-up">
          <div className="max-w-xl mx-auto bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FF5A1F]/10 text-[#FF5A1F]">
                <ShoppingBag size={18} />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sacola ({cartItemCount} itens)</span>
                <span className="text-base font-black text-slate-900">R$ {cartSubtotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="px-6 py-3 rounded-xl text-xs font-black text-white bg-[#FF5A1F] hover:bg-[#e04f1a] transition-all uppercase tracking-wider flex items-center gap-1.5 shadow-md"
            >
              <span>Ver Sacola</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 9. CART INTEGRATED DRAWER & BOTTOM SHEET */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay */}
          <div
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 animate-fade-in"
          />

          {/* Drawer Wrapper (Desktop slide left / Mobile bottom sheet) */}
          <div className="fixed z-50 flex flex-col justify-between bg-white text-[#111827] shadow-2xl border-slate-200
            md:top-0 md:right-0 md:h-full md:w-full md:max-w-[420px] md:animate-slide-left
            bottom-0 left-0 right-0 max-h-[85vh] rounded-t-[32px] md:rounded-none border-t md:border-t-0 md:border-l animate-slide-up"
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="text-[#FF5A1F]" size={20} />
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Sua Sacola</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 uppercase">
                  {cartItemCount} itens
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 divide-y divide-slate-100 no-scrollbar">
              {cart.map((item, idx) => (
                <div key={item.id} className={`flex items-start justify-between gap-4 ${idx > 0 ? 'pt-4' : ''}`}>
                  <div className="flex-1 text-left">
                    <h4 className="text-sm font-extrabold text-slate-900 leading-tight">{item.name}</h4>
                    {item.optionsDetails?.length > 0 && (
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                        {item.optionsDetails.map(o => o.name).join(', ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-[10px] italic text-slate-400 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        Obs: "{item.notes}"
                      </p>
                    )}
                    <span className="text-xs font-bold text-slate-500 mt-2 inline-block">
                      R$ {item.unit_price.toFixed(2)}
                    </span>
                  </div>

                  {/* Quantity Controls & Remove */}
                  <div className="flex flex-col items-end justify-between gap-3 shrink-0 self-stretch">
                    <button
                      onClick={() => removeCartItem(item.id)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      title="Remover item"
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      <button
                        onClick={() => updateCartQuantity(item.id, -1)}
                        className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-200/50 transition-colors"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="px-2 font-black text-xs text-slate-800 min-w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.id, 1)}
                        className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-200/50 transition-colors"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Delivery/Pickup Selector */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/60 rounded-xl">
                <button
                  onClick={() => handleOrderTypeChange('delivery')}
                  disabled={!restaurant.delivery_enabled}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    orderType === 'delivery'
                      ? 'text-white bg-[#FF5A1F] shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 disabled:opacity-30'
                  }`}
                >
                  <Bike size={14} />
                  <span>Entrega</span>
                </button>
                <button
                  onClick={() => handleOrderTypeChange('pickup')}
                  disabled={!restaurant.pickup_enabled}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    orderType === 'pickup'
                      ? 'text-white bg-[#FF5A1F] shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 disabled:opacity-30'
                  }`}
                >
                  <Store size={14} />
                  <span>Retirada</span>
                </button>
              </div>
            </div>

            {/* Warnings & Closed Notification */}
            <div className="px-6 space-y-2 bg-slate-50">
              {(!restaurant?.is_open || restaurant?.is_open === 0) && (!restaurant?.accept_orders_when_closed || restaurant?.accept_orders_when_closed === 0) && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-2.5 text-left">
                  <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-[11px] font-bold text-rose-950">Estabelecimento Fechado</h5>
                    <p className="text-[10px] text-rose-700 mt-0.5">Pedidos desativados no momento.</p>
                  </div>
                </div>
              )}

              {isBelowMinOrder && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2.5 text-left">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-[11px] font-bold text-amber-950">Mínimo não atingido</h5>
                    <p className="text-[10px] text-amber-700 mt-0.5">
                      Faltam R$ {(parseFloat(restaurant.min_order_value || 0) - cartSubtotal).toFixed(2)} para o mínimo.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Total Pricing Summary & Action */}
            <div className="p-6 border-t border-slate-100 bg-white space-y-4">
              <div className="space-y-2 text-sm text-slate-500 font-medium">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-slate-800 font-semibold">R$ {cartSubtotal.toFixed(2)}</span>
                </div>
                {orderType === 'delivery' && (
                  <div className="flex justify-between">
                    <span>Taxa de entrega</span>
                    <span className="text-slate-800 font-semibold">R$ {deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-slate-100 pt-3 flex justify-between text-slate-900">
                  <span className="font-extrabold text-base">Total</span>
                  <span className="font-black text-xl text-[#FF5A1F]">R$ {cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-2">
                <Button
                  onClick={() => navigate(`/cardapio/${slug}/checkout`)}
                  disabled={isBelowMinOrder || ((!restaurant?.is_open || restaurant?.is_open === 0) && (!restaurant?.accept_orders_when_closed || restaurant?.accept_orders_when_closed === 0))}
                  className="w-full py-4 rounded-xl font-bold bg-[#FF5A1F] text-white uppercase text-xs tracking-wider flex items-center justify-center gap-1.5 shadow-md"
                >
                  <span>Ir para o Checkout</span>
                  <ChevronRight size={14} />
                </Button>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-3 rounded-xl font-extrabold text-xs text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 transition-colors uppercase tracking-wider"
                >
                  Adicionar mais itens
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. PRODUCT COMPLEMENTS DETAIL MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200/60 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col justify-between">
            {/* Scrollable details */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {selectedProduct.image_url && (
                <div className="w-full h-48 sm:h-56 -mx-6 -mt-6 mb-6 overflow-hidden bg-slate-100 relative">
                  <img src={formatImageUrl(selectedProduct.image_url)} alt={selectedProduct.name} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Modal header */}
              <div className="flex justify-between items-start gap-4">
                <div className="text-left">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">{selectedProduct.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{selectedProduct.description}</p>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-950 transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Price block */}
              <div className="text-left py-3 border-y border-slate-100 flex items-center gap-3">
                {selectedProduct.promotional_price ? (
                  <>
                    <span className="text-2xl font-black text-[#FF5A1F]">
                      R$ {parseFloat(selectedProduct.promotional_price).toFixed(2)}
                    </span>
                    <span className="text-xs sm:text-sm text-slate-400 line-through">
                      R$ {parseFloat(selectedProduct.price).toFixed(2)}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-black text-slate-950">
                    R$ {parseFloat(selectedProduct.price).toFixed(2)}
                  </span>
                )}
              </div>

              {/* Complements groups */}
              {selectedProduct.complements?.length > 0 && (
                <div className="space-y-6 text-left">
                  {selectedProduct.complements.map((group) => {
                    const isRequired = group.is_required === 1
                    const isGroupBeverage = /bebida|refrigerante|coca|guaran|suco|água|agua|refri|drink|lat(a|ão)|cerveja/i.test(group.name);
                    const isSingleSelect = group.max_quantity === 1 && !isGroupBeverage
                    const selections = selectedOptions[group.id] || {}
                    const totalSelected = Object.values(selections).reduce((sum, q) => sum + q, 0)
                    
                    return (
                      <div key={group.id} className="space-y-3">
                        <div className="flex justify-between items-center bg-slate-50 border border-slate-200/60 p-3 rounded-2xl">
                          <div>
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight">{group.name}</h4>
                            {group.description && (
                              <p className="text-[10px] text-slate-500 mt-0.5">{group.description}</p>
                            )}
                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                              {isSingleSelect 
                                ? 'Escolha 1 opção' 
                                : isGroupBeverage
                                  ? `Escolha a quantidade desejada (${totalSelected})`
                                  : `Selecione até ${group.max_quantity} opções (${totalSelected}/${group.max_quantity})`
                              }
                            </p>
                          </div>
                          {isRequired && (
                            <span className="text-[8px] sm:text-[9px] bg-[#FF5A1F]/10 text-[#FF5A1F] border border-[#FF5A1F]/20 font-black px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
                              Obrigatório
                            </span>
                          )}
                        </div>

                        <div className="divide-y divide-slate-100">
                          {group.items?.map((item) => {
                            const quantitySelected = selections[item.id] || 0
                            const isSelected = quantitySelected > 0
                            const isItemBeverage = isGroupBeverage || /bebida|refrigerante|coca|guaran|suco|água|agua|refri|drink|lat(a|ão)|cerveja/i.test(item.name);
                            const itemCanMultiply = item.max_quantity > 1 || isItemBeverage

                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between py-3 group first:pt-1 last:pb-1"
                              >
                                <div className="flex items-center gap-3 text-left">
                                  {isSingleSelect ? (
                                    <input
                                      type="radio"
                                      name={`group_${group.id}`}
                                      checked={isSelected}
                                      onChange={() => handleToggleItemSelection(group.id, item, true)}
                                      className="accent-[#FF5A1F] h-4.5 w-4.5 cursor-pointer shrink-0"
                                      style={{ accentColor: primaryColor }}
                                    />
                                  ) : !itemCanMultiply ? (
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleItemSelection(group.id, item, false)}
                                      className="accent-[#FF5A1F] rounded h-4.5 w-4.5 cursor-pointer shrink-0"
                                      style={{ accentColor: primaryColor }}
                                    />
                                  ) : null}

                                  <div className="text-left">
                                    <p className="text-xs font-bold text-slate-800 group-hover:text-slate-950 transition-colors leading-normal">{item.name}</p>
                                    {item.price > 0 && (
                                      <p className="text-[10px] text-[#FF5A1F] font-bold mt-0.5">+ R$ {parseFloat(item.price).toFixed(2)}</p>
                                    )}
                                  </div>
                                </div>

                                {itemCanMultiply && !isSingleSelect ? (
                                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleAdjustItemQuantity(group.id, item, -1)}
                                      className="px-2 py-1 text-slate-400 hover:text-slate-900 transition-colors"
                                    >
                                      <Minus size={10} />
                                    </button>
                                    <span className="px-2 text-xs font-extrabold text-slate-800 min-w-5 text-center">
                                      {quantitySelected}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleAdjustItemQuantity(group.id, item, 1)}
                                      className="px-2 py-1 text-slate-400 hover:text-slate-900 transition-colors"
                                    >
                                      <Plus size={10} />
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Special Instructions Notes text area */}
              <div className="space-y-2 text-left">
                <h4 className="text-sm font-extrabold text-slate-900">Instruções especiais</h4>
                <textarea
                  placeholder="Ex: Tirar cebola, maionese à parte, ponto bem passado..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-[#FF5A1F] transition-colors resize-none h-20"
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Modal action bar footer */}
            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden shrink-0 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setModalQuantity(q => Math.max(1, q - 1))}
                  className="px-3.5 py-2.5 text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="px-4 py-2 font-black text-sm text-slate-900 min-w-8 text-center">{modalQuantity}</span>
                <button
                  type="button"
                  onClick={() => setModalQuantity(q => q + 1)}
                  className="px-3.5 py-2.5 text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>

              <Button
                onClick={handleAddToCart}
                className="flex-1 py-3.5 rounded-xl font-bold bg-[#FF5A1F] text-white flex items-center justify-center gap-2 shadow-md uppercase text-xs tracking-wider"
              >
                <span>Adicionar</span>
                <span>•</span>
                <span>
                  R$ {getModalTotalPrice().toFixed(2)}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 11. OPENING HOURS LIST MODAL */}
      {showHoursModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6 relative text-left animate-slide-up">
            <button
              onClick={() => setShowHoursModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X size={16} />
            </button>
            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2 tracking-tight">
              <Clock size={18} className="text-[#FF5A1F]" />
              Horários de Funcionamento
            </h3>
            <div className="space-y-2.5 divide-y divide-slate-100">
              {Object.entries(DAYS_MAPPING).map(([key, label]) => {
                const h = restaurant.opening_hours?.[key]
                return (
                  <div key={key} className="flex justify-between items-center py-2.5 text-xs text-slate-700 font-semibold first:pt-0">
                    <span className="text-slate-500">{label}</span>
                    <span className="text-slate-900 font-bold">
                      {h?.enabled ? `${h.open} às ${h.close}` : <span className="text-red-500">Fechado</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
