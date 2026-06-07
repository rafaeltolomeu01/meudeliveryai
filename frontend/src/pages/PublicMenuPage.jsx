import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, ChevronRight, Info, AlertTriangle, Plus, Minus, X, Clock, HelpCircle, ArrowLeft, Download } from 'lucide-react'
import { publicApi } from '../services/api'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import { applyTheme, removeTheme } from '../utils/theme'
import { usePWA } from '../contexts/PWAContext'

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
  primary_color: '#FF6B35',
  secondary_color: '#1A0533',
  background_color: '#0F0F0F',
  text_color: '#FFFFFF',
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
      options: [
        { id: 1, product_id: 1, group_name: 'Escolha o ponto da carne', name: 'Mal passado', price: 0.00, is_required: 1, min_quantity: 1, max_quantity: 1 },
        { id: 2, product_id: 1, group_name: 'Escolha o ponto da carne', name: 'Ao ponto', price: 0.00, is_required: 1, min_quantity: 1, max_quantity: 1 },
        { id: 3, product_id: 1, group_name: 'Escolha o ponto da carne', name: 'Bem passado', price: 0.00, is_required: 1, min_quantity: 1, max_quantity: 1 },
        { id: 4, product_id: 1, group_name: 'Adicionais', name: 'Bacon Extra', price: 4.50, is_required: 0, min_quantity: 0, max_quantity: 1 },
        { id: 5, product_id: 1, group_name: 'Adicionais', name: 'Queijo Cheddar Extra', price: 3.00, is_required: 0, min_quantity: 0, max_quantity: 1 },
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
      options: [
        { id: 6, product_id: 2, group_name: 'Adicionais', name: 'Bacon Extra', price: 4.50, is_required: 0, min_quantity: 0, max_quantity: 1 },
      ]
    },
    {
      id: 6,
      category_id: 2,
      name: 'Combo Classic',
      description: 'Classic Burger + Batata Frita Individual + Refrigerante Lata (Coca-Cola ou Guaraná).',
      price: 45.90,
      promotional_price: null,
      is_available: 1,
      is_featured: 1,
      options: [
        { id: 7, product_id: 6, group_name: 'Escolha a bebida', name: 'Coca-Cola', price: 0.00, is_required: 1, min_quantity: 1, max_quantity: 1 },
        { id: 8, product_id: 6, group_name: 'Escolha a bebida', name: 'Guaraná Antarctica', price: 0.00, is_required: 1, min_quantity: 1, max_quantity: 1 },
        { id: 9, product_id: 6, group_name: 'Escolha a batata', name: 'Batata Tradicional', price: 0.00, is_required: 1, min_quantity: 1, max_quantity: 1 },
        { id: 10, product_id: 6, group_name: 'Escolha a batata', name: 'Batata Rústica (+ R$ 3,00)', price: 3.00, is_required: 1, min_quantity: 1, max_quantity: 1 },
      ]
    },
    {
      id: 8,
      category_id: 3,
      name: 'Coca-Cola Lata',
      description: 'Lata de 350ml trincando de gelada.',
      price: 6.00,
      promotional_price: null,
      is_available: 1,
      is_featured: 0,
      options: []
    },
    {
      id: 9,
      category_id: 3,
      name: 'Suco Natural de Laranja',
      description: 'Suco natural feito na hora de 400ml.',
      price: 9.90,
      promotional_price: null,
      is_available: 1,
      is_featured: 0,
      options: []
    }
  ]
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
  
  // Product Detail Modal state
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [modalQuantity, setModalQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState({}) // { group_name: [optId1, optId2] } or { group_name: optId }
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
        
        if (menuRes.data?.categories?.length > 0) {
          setActiveCategory(menuRes.data.categories[0].id)
        }
      } catch (err) {
        console.warn('Erro ao conectar com API pública, usando dados demo.', err)
        // Fallback to mock data for demo purposes (like burger-house)
        if (slug === 'burger-house') {
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

  const handleOpenProduct = (product) => {
    setSelectedProduct(product)
    setModalQuantity(1)
    setItemNotes('')
    
    // Initialize default required options
    const defaults = {}
    product.options?.forEach(opt => {
      if (opt.is_required) {
        // If single select is expected
        if (opt.max_quantity === 1) {
          if (!defaults[opt.group_name]) {
            defaults[opt.group_name] = opt.id
          }
        } else {
          // Multiselect
          if (!defaults[opt.group_name]) defaults[opt.group_name] = []
          defaults[opt.group_name].push(opt.id)
        }
      }
    })
    setSelectedOptions(defaults)
  }

  const handleOptionChange = (groupName, option, isSingleSelect) => {
    if (isSingleSelect) {
      setSelectedOptions(prev => ({
        ...prev,
        [groupName]: option.id
      }))
    } else {
      setSelectedOptions(prev => {
        const current = prev[groupName] || []
        if (current.includes(option.id)) {
          return {
            ...prev,
            [groupName]: current.filter(id => id !== option.id)
          }
        } else {
          return {
            ...prev,
            [groupName]: [...current, option.id]
          }
        }
      })
    }
  }

  const handleAddToCart = () => {
    // Validate required options
    const missingRequired = []
    const groups = {}
    
    selectedProduct.options?.forEach(opt => {
      if (!groups[opt.group_name]) {
        groups[opt.group_name] = {
          is_required: opt.is_required,
          name: opt.group_name,
          min: opt.min_quantity,
          max: opt.max_quantity,
        }
      }
    })

    Object.values(groups).forEach(g => {
      if (g.is_required) {
        const selected = selectedOptions[g.name]
        if (!selected || (Array.isArray(selected) && selected.length < g.min)) {
          missingRequired.push(g.name)
        }
      }
    })

    if (missingRequired.length > 0) {
      toast.error(`Escolha as opções obrigatórias: ${missingRequired.join(', ')}`)
      return
    }

    // Prepare item options structure
    const chosenOptionsIds = []
    const chosenOptionsDetails = []
    let extraPrice = 0

    Object.keys(selectedOptions).forEach(groupName => {
      const val = selectedOptions[groupName]
      if (Array.isArray(val)) {
        val.forEach(id => {
          const opt = selectedProduct.options.find(o => o.id === id)
          if (opt) {
            chosenOptionsIds.push(id)
            chosenOptionsDetails.push(opt)
            extraPrice += parseFloat(opt.price || 0)
          }
        })
      } else if (val) {
        const opt = selectedProduct.options.find(o => o.id === val)
        if (opt) {
          chosenOptionsIds.push(val)
          chosenOptionsDetails.push(opt)
          extraPrice += parseFloat(opt.price || 0)
        }
      }
    })

    const unitPrice = parseFloat(selectedProduct.promotional_price || selectedProduct.price)
    const finalUnitPrice = unitPrice + extraPrice
    const itemTotal = finalUnitPrice * modalQuantity

    // Check if an identical item is already in the cart to avoid incorrect duplicates
    const existingIndex = cart.findIndex(item => {
      if (item.product_id !== selectedProduct.id) return false;
      if ((item.notes || '').trim() !== (itemNotes || '').trim()) return false;
      
      const itemOpts = [...(item.options || [])].sort();
      const newOpts = [...chosenOptionsIds].sort();
      if (itemOpts.length !== newOpts.length) return false;
      return itemOpts.every((val, index) => val === newOpts[index]);
    });

    let newCart;
    if (existingIndex > -1) {
      newCart = [...cart];
      newCart[existingIndex].quantity += modalQuantity;
      newCart[existingIndex].total_price = newCart[existingIndex].unit_price * newCart[existingIndex].quantity;
    } else {
      const cartItem = {
        id: Date.now() + Math.random(), // unique reference for item in cart
        product_id: selectedProduct.id,
        name: selectedProduct.name,
        quantity: modalQuantity,
        unit_price: finalUnitPrice,
        total_price: itemTotal,
        options: chosenOptionsIds,
        optionsDetails: chosenOptionsDetails,
        notes: itemNotes,
      };
      newCart = [...cart, cartItem];
    }

    saveCart(newCart)
    setSelectedProduct(null)
    toast.success('Produto adicionado ao carrinho! 🛒')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--theme-bg, #0F0F0F)' }}>
        <div className="text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--theme-primary, #FF6B35)', borderTopColor: 'transparent' }} />
          <p className="text-gray-400 text-sm font-medium">Carregando cardápio...</p>
        </div>
      </div>
    )
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: 'var(--theme-bg, #0F0F0F)' }}>
        <AlertTriangle size={48} className="mb-4" style={{ color: 'var(--theme-primary, #FF6B35)' }} />
        <h2 className="text-xl font-bold text-white mb-2">Ops! Ocorreu um erro</h2>
        <p className="text-gray-400 text-sm max-w-sm mb-6">{error || 'Restaurante não encontrado.'}</p>
        <Link to="/" className="text-sm font-semibold px-6 py-2.5 rounded-xl text-white" style={{ backgroundColor: 'var(--theme-primary, #FF6B35)' }}>
          Voltar para Início
        </Link>
      </div>
    )
  }

  const primaryColor = restaurant.primary_color || '#FF6B35'
  const bgColor = restaurant.background_color || '#0F0F0F'
  const secondaryColor = restaurant.secondary_color || '#1A0533'

  const borderRadiusClass = restaurant.border_radius === 'quadrada' ? 'rounded-none' : 'rounded-2xl'
  const buttonRadiusClass = restaurant.border_radius === 'quadrada' ? 'rounded-none' : 'rounded-xl'
  
  const cardStyleClass = restaurant.card_style === 'simples'
    ? (restaurant.theme_mode === 'light' ? 'border-gray-200 bg-transparent hover:bg-gray-50' : 'border-white/5 bg-transparent hover:bg-white/[0.02]')
    : restaurant.card_style === 'arredondado'
    ? (restaurant.theme_mode === 'light' 
        ? `border-transparent bg-gray-100 shadow-md ${restaurant.border_radius === 'quadrada' ? 'rounded-none' : 'rounded-3xl'} hover:bg-gray-200/80` 
        : `border-transparent bg-white/[0.04] shadow-lg ${restaurant.border_radius === 'quadrada' ? 'rounded-none' : 'rounded-3xl'} hover:bg-white/[0.06]`)
    : (restaurant.theme_mode === 'light'
        ? `border-gray-200/80 bg-white/70 backdrop-blur-md shadow-sm ${borderRadiusClass} hover:bg-gray-50/90`
        : `border-white/10 bg-white/[0.02] backdrop-blur-md shadow-md ${borderRadiusClass} hover:bg-white/[0.04]`) // moderno


  // Cart totals
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartSubtotal = cart.reduce((sum, item) => sum + item.total_price, 0)

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: bgColor, color: restaurant.text_color || '#FFFFFF', fontFamily: restaurant.font_family || 'Inter' }}>
      
      {/* Header Banner */}
      <div className="h-44 sm:h-56 relative w-full overflow-hidden bg-gradient-to-r from-gray-900 to-black">
        {restaurant.cover_image ? (
          <img src={restaurant.cover_image} alt="Capa" className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,rgba(255,107,53,0.15),transparent)]" />
        )}
        
        {/* Back Link to Landing */}
        <Link to="/" className="absolute top-4 left-4 bg-black/40 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full hover:bg-black/60 transition-all z-10 flex items-center gap-1">
          <ArrowLeft size={12} />
          <span>SaaS Home</span>
        </Link>

        {/* PWA Install Button */}
        {isInstallable && (
          <button
            onClick={installApp}
            className="absolute top-4 left-36 hover:opacity-90 text-white text-xs px-3 py-1.5 rounded-full transition-all z-10 flex items-center gap-1 shadow-md animate-pulse font-bold"
            style={{ backgroundColor: primaryColor }}
          >
            <Download size={12} />
            <span>Instalar App</span>
          </button>
        )}

        {/* Operational status badge */}
        <div className="absolute top-4 right-4 z-10">
          <span
            className={`text-xs font-bold px-3.5 py-1.5 rounded-full text-white shadow-md uppercase tracking-wider ${
              restaurant.is_open ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {restaurant.is_open ? 'Aberto' : 'Fechado'}
          </span>
        </div>
      </div>

      {/* Restaurant Info */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative -mt-16 sm:-mt-20 mb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
          {/* Logo */}
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-4 border-[#0F0F0F] bg-gray-800 shadow-xl shrink-0">
            {restaurant.logo ? (
              <img src={restaurant.logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-black text-white text-4xl" style={{ background: `linear-gradient(135deg, ${primaryColor}, #000)` }}>
                {restaurant.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="mb-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{restaurant.name}</h1>
            
            {restaurant.welcome_message && (
              <p className="text-xs text-[#a991c7] mt-1.5 italic max-w-lg">
                "{restaurant.welcome_message}"
              </p>
            )}
            
            {/* Badges / Operational Stats */}
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-x-4 gap-y-1.5 mt-2.5 text-xs text-gray-400 font-medium">
              <span className="flex items-center gap-1">
                <Clock size={14} className="text-[#FF6B35]" />
                {restaurant.estimated_delivery_time || 45} min
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-600 hidden sm:inline-block" />
              <span>
                Entrega: R$ {(parseFloat(restaurant.delivery_fee) || 0).toFixed(2)}
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-600 hidden sm:inline-block" />
              <span>
                Pedido Mínimo: R$ {(parseFloat(restaurant.min_order_value) || 25).toFixed(2)}
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-600 hidden sm:inline-block" />
              <button
                onClick={() => setShowHoursModal(true)}
                className="flex items-center gap-1 hover:underline font-bold"
                style={{ color: primaryColor }}
              >
                <Clock size={12} />
                Ver Horários
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Closed Notice Banner */}
      {(!restaurant.is_open || restaurant.is_open === 0) && (!restaurant.accept_orders_when_closed || restaurant.accept_orders_when_closed === 0) && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-8">
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-left flex items-start gap-3">
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-sm font-bold text-white">Estabelecimento Fechado</h4>
              <p className="text-xs text-gray-400 mt-1">
                Não estamos recebendo pedidos no momento. Você pode navegar pelos produtos, mas a finalização de pedidos está suspensa.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Featured Products Section */}
      {(() => {
        const featuredProducts = menu?.products?.filter(p => p.is_featured === 1 || p.is_featured === true || p.is_featured === '1' || p.is_featured === 'true') || []
        if (featuredProducts.length === 0) return null

        return (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-8 text-left">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }} />
              Destaques da Casa
            </h2>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 scroll-smooth snap-x">
              {featuredProducts.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => handleOpenProduct(prod)}
                  className={`w-64 shrink-0 snap-start p-4 cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between ${cardStyleClass}`}
                >
                  <div>
                    {prod.image_url ? (
                      <div className="w-full h-32 rounded-xl overflow-hidden bg-gray-800 mb-3">
                        <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-full h-32 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-3">
                        <ShoppingBag size={20} className="text-gray-600" />
                      </div>
                    )}
                    <h3 className="font-bold text-white text-sm line-clamp-1">{prod.name}</h3>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{prod.description}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      {prod.promotional_price ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm" style={{ color: primaryColor }}>
                            R$ {parseFloat(prod.promotional_price).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-gray-500 line-through">
                            R$ {parseFloat(prod.price).toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-extrabold text-sm text-white">
                          R$ {parseFloat(prod.price).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <button
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold text-white flex items-center gap-1 hover:opacity-90 transition-opacity`}
                      style={{ backgroundColor: buttonColor }}
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Menu Categories Bar (Sticky) */}
      {menu?.categories?.length > 0 && (
        <div className="sticky top-0 z-30 shadow-md backdrop-blur-md border-y border-white/5 py-3" style={{ backgroundColor: `${bgColor}F0` }}>
          <div className="max-w-4xl mx-auto px-4 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            {menu.categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id)
                  const el = document.getElementById(`category-${cat.id}`)
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
                className={`px-4 py-2 ${buttonRadiusClass} text-xs font-bold shrink-0 transition-all ${
                  activeCategory === cat.id
                    ? 'text-white'
                    : 'bg-white/[0.03] text-gray-400 hover:text-white'
                }`}
                style={activeCategory === cat.id ? { backgroundColor: primaryColor } : {}}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu List */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-8 space-y-10">
        {menu?.categories?.map((cat) => {
          const catProducts = menu.products.filter(p => p.category_id === cat.id)
          if (catProducts.length === 0) return null

          return (
            <section key={cat.id} id={`category-${cat.id}`} className="scroll-mt-20">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }} />
                {cat.name}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {catProducts.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => handleOpenProduct(prod)}
                    className={`p-4 transition-all flex justify-between gap-4 cursor-pointer ${cardStyleClass}`}
                  >
                    <div className="flex-1 flex flex-col justify-between text-left">
                      <div>
                        <h3 className="font-bold text-white text-base">{prod.name}</h3>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{prod.description}</p>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        {prod.promotional_price ? (
                          <>
                            <span className="font-extrabold text-sm" style={{ color: primaryColor }}>
                              R$ {parseFloat(prod.promotional_price).toFixed(2)}
                            </span>
                            <span className="text-xs text-gray-500 line-through">
                              R$ {parseFloat(prod.price).toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span className="font-extrabold text-sm text-white">
                            R$ {parseFloat(prod.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Product Image */}
                    {prod.image_url ? (
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-800 shrink-0 self-center">
                        <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center shrink-0 self-center">
                        <ShoppingBag size={20} className="text-gray-600" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {/* Floating Bottom Cart Badge */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 z-40 px-4 animate-slide-up">
          <div
            className="max-w-xl mx-auto rounded-2xl p-4 flex items-center justify-between shadow-2xl backdrop-blur-md text-white border border-white/10"
            style={{ background: 'linear-gradient(135deg, rgba(26,5,51,0.95), rgba(15,15,15,0.95))' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center relative"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <ShoppingBag size={18} style={{ color: primaryColor }} />
                <span className="absolute -top-1.5 -right-1.5 bg-[#FF6B35] text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                  {cartItemCount}
                </span>
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400 font-semibold">Subtotal</p>
                <p className="text-base font-extrabold">R$ {cartSubtotal.toFixed(2)}</p>
              </div>
            </div>

            <button
              onClick={() => navigate(`/cardapio/${slug}/carrinho`)}
              className={`px-6 py-2.5 ${buttonRadiusClass} text-xs font-extrabold text-white flex items-center gap-1 bg-[#FF6B35] hover:opacity-90 shadow-md transition-all uppercase tracking-wider`}
              style={{ backgroundColor: buttonColor }}
            >
              Ver Carrinho
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1A0533] border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col justify-between">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
              <div className="flex justify-between items-start gap-4">
                <div className="text-left">
                  <h3 className="text-xl font-extrabold text-white leading-tight">{selectedProduct.name}</h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{selectedProduct.description}</p>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Price Tag */}
              <div className="text-left py-2 border-y border-white/5 flex items-center gap-3">
                {selectedProduct.promotional_price ? (
                  <>
                    <span className="text-2xl font-black" style={{ color: primaryColor }}>
                      R$ {parseFloat(selectedProduct.promotional_price).toFixed(2)}
                    </span>
                    <span className="text-sm text-gray-500 line-through">
                      R$ {parseFloat(selectedProduct.price).toFixed(2)}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-black text-white">
                    R$ {parseFloat(selectedProduct.price).toFixed(2)}
                  </span>
                )}
              </div>

              {/* Options list */}
              {selectedProduct.options?.length > 0 && (
                <div className="space-y-6 text-left">
                  {/* Group options by group_name */}
                  {Object.entries(
                    selectedProduct.options.reduce((acc, opt) => {
                      if (!acc[opt.group_name]) acc[opt.group_name] = []
                      acc[opt.group_name].push(opt)
                      return acc
                    }, {})
                  ).map(([groupName, opts]) => {
                    const isRequired = opts[0].is_required
                    const isSingleSelect = opts[0].max_quantity === 1
                    
                    return (
                      <div key={groupName} className="space-y-3">
                        <div className="flex justify-between items-center bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                          <div>
                            <h4 className="text-sm font-bold text-white">{groupName}</h4>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {isSingleSelect ? 'Escolha 1 opção' : `Escolha de ${opts[0].min_quantity} a ${opts[0].max_quantity} opções`}
                            </p>
                          </div>
                          {isRequired && (
                            <span className="text-[10px] bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/20 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                              Obrigatório
                            </span>
                          )}
                        </div>

                        <div className="divide-y divide-white/5">
                          {opts.map((opt) => {
                            const isSelected = isSingleSelect
                              ? selectedOptions[groupName] === opt.id
                              : (selectedOptions[groupName] || []).includes(opt.id)

                            return (
                              <label
                                key={opt.id}
                                className="flex items-center justify-between py-3 cursor-pointer group"
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type={isSingleSelect ? 'radio' : 'checkbox'}
                                    name={groupName}
                                    checked={isSelected}
                                    onChange={() => handleOptionChange(groupName, opt, isSingleSelect)}
                                    className="accent-[#FF6B35] h-4.5 w-4.5"
                                    style={{ accentColor: primaryColor }}
                                  />
                                  <span className="text-xs text-gray-300 group-hover:text-white transition-colors">{opt.name}</span>
                                </div>
                                {opt.price > 0 && (
                                  <span className="text-xs text-gray-400 font-semibold">+ R$ {parseFloat(opt.price).toFixed(2)}</span>
                                )}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Special Instructions / Notes */}
              <div className="space-y-2 text-left">
                <h4 className="text-sm font-bold text-white">Instruções especiais</h4>
                <textarea
                  placeholder="Ex: Tirar cebola, maionese à parte, ponto bem passado..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-[#FF6B35] transition-colors resize-none h-20"
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Modal Action Bar */}
            <div className="p-4 sm:p-6 border-t border-white/5 bg-black/20 flex items-center justify-between gap-4">
              {/* Quantity Controls */}
              <div className="flex items-center border border-white/10 rounded-xl overflow-hidden shrink-0">
                <button
                  onClick={() => setModalQuantity(q => Math.max(1, q - 1))}
                  className="px-3.5 py-2.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="px-4 py-2 font-extrabold text-sm text-white min-w-10 text-center">{modalQuantity}</span>
                <button
                  onClick={() => setModalQuantity(q => q + 1)}
                  className="px-3.5 py-2.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Add button */}
              <Button
                onClick={handleAddToCart}
                className={`flex-1 py-3.5 ${buttonRadiusClass} font-extrabold text-xs uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2`}
                style={{ backgroundColor: buttonColor }}
              >
                Adicionar
                <span>•</span>
                <span>
                  R$ {((parseFloat(selectedProduct.promotional_price || selectedProduct.price) + 
                    Object.keys(selectedOptions).reduce((sum, g) => {
                      const val = selectedOptions[g]
                      if (Array.isArray(val)) {
                        return sum + val.reduce((s, id) => s + parseFloat(selectedProduct.options.find(o => o.id === id)?.price || 0), 0)
                      } else if (val) {
                        return sum + parseFloat(selectedProduct.options.find(o => o.id === val)?.price || 0)
                      }
                      return sum
                    }, 0)) * modalQuantity).toFixed(2)}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Horários Modal */}
      {showHoursModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1A0533] border border-white/10 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6 relative text-left animate-slide-up">
            <button
              onClick={() => setShowHoursModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
            <h3 className="text-lg font-extrabold text-white mb-4 flex items-center gap-2">
              <Clock size={18} className="text-[#FF6B35]" style={{ color: primaryColor }} />
              Horários de Funcionamento
            </h3>
            <div className="space-y-2.5 divide-y divide-white/5">
              {Object.entries(DAYS_MAPPING).map(([key, label]) => {
                const h = restaurant.opening_hours?.[key]
                return (
                  <div key={key} className="flex justify-between items-center py-2 text-xs">
                    <span className="text-gray-300 font-semibold">{label}</span>
                    <span className="text-white">
                      {h?.enabled ? `${h.open} às ${h.close}` : <span className="text-red-400 font-medium">Fechado</span>}
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

