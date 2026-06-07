import { useState, useEffect } from 'react'
import { Palette, Upload, Loader2, Save, ExternalLink, Star } from 'lucide-react'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { settings as settingsApi, restaurants as restaurantsApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { applyTheme } from '../utils/theme'


const FONT_OPTIONS = ['Inter', 'Roboto', 'Poppins', 'Montserrat', 'Open Sans', 'Lato', 'Nunito', 'Raleway']

export default function AppearancePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // File uploads
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)

  const [form, setForm] = useState({
    primary_color: '#FF6B35',
    secondary_color: '#1A0533',
    background_color: '#0F0F0F',
    button_color: '#FF6B35',
    text_color: '#FFFFFF',
    font_family: 'Inter',
    card_style: 'moderno', // 'simples', 'moderno', 'arredondado'
    border_radius: 'arredondada', // 'quadrada', 'arredondada'
    theme_mode: 'dark', // 'light', 'dark'
    logo: '',
    cover_image: ''
  })

  // Live preview properties
  const updateLivePreview = (theme) => {
    applyTheme(theme)
  }

  useEffect(() => {
    async function loadTheme() {
      try {
        setLoading(true)
        const res = await settingsApi.getAppearance()
        if (res.success) {
          const t = res.data
          const themeData = {
            primary_color: t.primary_color || '#FF6B35',
            secondary_color: t.secondary_color || '#1A0533',
            background_color: t.background_color || '#0F0F0F',
            button_color: t.button_color || '#FF6B35',
            text_color: t.text_color || '#FFFFFF',
            font_family: t.font_family || 'Inter',
            card_style: t.card_style || 'moderno',
            border_radius: t.border_radius || 'arredondada',
            theme_mode: t.theme_mode || 'dark',
            logo: t.logo || '',
            cover_image: t.cover_image || ''
          }
          setForm(themeData)
          if (t.logo) setLogoPreview(t.logo)
          if (t.cover_image) setCoverPreview(t.cover_image)
          updateLivePreview(themeData)
        }
      } catch (err) {
        console.warn('Erro ao carregar tema. Usando simulação padrão.', err)
      } finally {
        setLoading(false)
      }
    }
    loadTheme()
  }, [])

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setLogoPreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleCoverChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setCoverFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setCoverPreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      let currentLogoPath = form.logo
      let currentCoverPath = form.cover_image

      // 1. Upload Logo if selected
      if (logoFile) {
        const formData = new FormData()
        formData.append('logo', logoFile)
        const resLogo = await restaurantsApi.uploadLogo(formData)
        if (resLogo.success) {
          currentLogoPath = resLogo.data.logo
        }
      }

      // 2. Upload Cover Image if selected
      if (coverFile) {
        const formData = new FormData()
        formData.append('cover', coverFile)
        const resCover = await restaurantsApi.uploadCover(formData)
        if (resCover.success) {
          currentCoverPath = resCover.data.cover_image
        }
      }

      // 3. Save Appearance payload
      const payload = {
        ...form,
        logo: currentLogoPath,
        cover_image: currentCoverPath
      }

      const res = await settingsApi.updateAppearance(payload)
      if (res.success) {
        toast.success('Configurações de aparência salvas com sucesso!')
        setForm(payload)
        updateLivePreview(payload)
      }
    } catch (err) {
      console.error(err)
      toast.error('Ocorreu um erro ao salvar as configurações de aparência.')
    } finally {
      setSaving(false)
    }
  }

  // Trigger preview live when colors change in form state
  const handleColorChange = (key, val) => {
    const updated = { ...form, [key]: val }
    setForm(updated)
    updateLivePreview(updated)
  }

  if (loading) {
    return (
      <div className="py-12 flex justify-center text-white">
        <Loader2 className="animate-spin text-[#FF6B35]" size={36} />
      </div>
    )
  }

  const cardRadiusStyle = form.border_radius === 'quadrada' ? 'rounded-none' : 'rounded-2xl'
  const isLight = form.theme_mode === 'light'

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Palette className="text-[#FF6B35]" size={20} />
            Aparência e Design
          </h2>
          <p className="text-[#a991c7] text-sm">Personalize a identidade visual do seu cardápio público e do seu painel</p>
        </div>
        {user?.restaurant?.slug && (
          <a
            href={`/cardapio/${user.restaurant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/5"
          >
            <span>Ver Cardápio Público</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Design Form */}
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-6">
          {/* Logo & Capa Uploads */}
          <Card title="Imagens da Loja" subtitle="Branding e Capa do Cardápio">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Logo */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#d4bfee]">Logotipo da Loja</label>
                <div className="flex items-center gap-4 border border-white/5 rounded-2xl p-4 bg-white/[0.01]">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-800 shrink-0 relative flex items-center justify-center border border-white/10">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">🍔</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1 relative">
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#FF6B35]/15 hover:bg-[#FF6B35]/25 text-[#FF6B35] rounded-xl text-xs font-bold cursor-pointer transition-colors border border-[#FF6B35]/20">
                      <Upload size={12} />
                      <span>Escolher Logo</span>
                      <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                    </label>
                    <p className="text-[10px] text-gray-500">Quadrado, JPG/PNG até 2MB</p>
                  </div>
                </div>
              </div>

              {/* Cover */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#d4bfee]">Imagem de Capa (Banner)</label>
                <div className="flex items-center gap-4 border border-white/5 rounded-2xl p-4 bg-white/[0.01]">
                  <div className="w-20 h-16 rounded-xl overflow-hidden bg-gray-800 shrink-0 relative flex items-center justify-center border border-white/10">
                    {coverPreview ? (
                      <img src={coverPreview} alt="Capa" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">🖼️</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1 relative">
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#FF6B35]/15 hover:bg-[#FF6B35]/25 text-[#FF6B35] rounded-xl text-xs font-bold cursor-pointer transition-colors border border-[#FF6B35]/20">
                      <Upload size={12} />
                      <span>Escolher Capa</span>
                      <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                    </label>
                    <p className="text-[10px] text-gray-500">Banner retangular até 4MB</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Color Palettes */}
          <Card title="Paleta de Cores" subtitle="Escolha as cores principais do seu aplicativo">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Primary */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.01]">
                <div className="text-left">
                  <p className="text-xs font-bold text-white">Cor Principal (primary_color)</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Destaques e links principais</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primary_color}
                    onChange={(e) => handleColorChange('primary_color', e.target.value)}
                    className="w-8 h-8 rounded border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <span className="text-xs text-white uppercase font-mono">{form.primary_color}</span>
                </div>
              </div>

              {/* Secondary */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.01]">
                <div className="text-left">
                  <p className="text-xs font-bold text-white">Cor Secundária (secondary_color)</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Painéis, headers e rodapés</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.secondary_color}
                    onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                    className="w-8 h-8 rounded border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <span className="text-xs text-white uppercase font-mono">{form.secondary_color}</span>
                </div>
              </div>

              {/* Background */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.01]">
                <div className="text-left">
                  <p className="text-xs font-bold text-white">Cor de Fundo (background_color)</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Fundo geral da página</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.background_color}
                    onChange={(e) => handleColorChange('background_color', e.target.value)}
                    className="w-8 h-8 rounded border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <span className="text-xs text-white uppercase font-mono">{form.background_color}</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.01]">
                <div className="text-left">
                  <p className="text-xs font-bold text-white">Cor dos Botões (button_color)</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Preenchimento de botões de ação</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.button_color}
                    onChange={(e) => handleColorChange('button_color', e.target.value)}
                    className="w-8 h-8 rounded border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <span className="text-xs text-white uppercase font-mono">{form.button_color}</span>
                </div>
              </div>

              {/* Text */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.01]">
                <div className="text-left">
                  <p className="text-xs font-bold text-white">Cor dos Textos (text_color)</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Títulos e parágrafos</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.text_color}
                    onChange={(e) => handleColorChange('text_color', e.target.value)}
                    className="w-8 h-8 rounded border-0 cursor-pointer p-0 bg-transparent"
                  />
                  <span className="text-xs text-white uppercase font-mono">{form.text_color}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Typography and radius layouts */}
          <Card title="Layout e Tipografia" subtitle="Ajuste fontes, cantos e o modo visual">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Font Family */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-[#d4bfee]">Fonte Principal (font_family)</label>
                <select
                  value={form.font_family}
                  onChange={(e) => handleColorChange('font_family', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6B35]/60 h-[42px]"
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font} value={font} className="bg-[#1A0533]">{font}</option>
                  ))}
                </select>
              </div>

              {/* Theme Mode */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-[#d4bfee]">Modo de Cores (theme_mode)</label>
                <select
                  value={form.theme_mode}
                  onChange={(e) => handleColorChange('theme_mode', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6B35]/60 h-[42px]"
                >
                  <option value="dark" className="bg-[#1A0533]">Escuro (Recomendado)</option>
                  <option value="light" className="bg-[#1A0533]">Claro</option>
                </select>
              </div>

              {/* Card Style */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-[#d4bfee]">Estilo dos Cards (card_style)</label>
                <select
                  value={form.card_style}
                  onChange={(e) => handleColorChange('card_style', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6B35]/60 h-[42px]"
                >
                  <option value="simples" className="bg-[#1A0533]">Simples (Flat)</option>
                  <option value="moderno" className="bg-[#1A0533]">Moderno (Efeito Vidro/Glow)</option>
                  <option value="arredondado" className="bg-[#1A0533]">Arredondado (Sombras fortes)</option>
                </select>
              </div>

              {/* Border Radius */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-[#d4bfee]">Borda Geral (border_radius)</label>
                <select
                  value={form.border_radius}
                  onChange={(e) => handleColorChange('border_radius', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF6B35]/60 h-[42px]"
                >
                  <option value="quadrada" className="bg-[#1A0533]">Quadrada (cantos retos)</option>
                  <option value="arredondada" className="bg-[#1A0533]">Arredondada (cantos suaves)</option>
                </select>
              </div>
            </div>
          </Card>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={saving}
            leftIcon={Save}
            className="w-full py-3.5 rounded-xl font-bold"
          >
            Salvar Configurações de Aparência
          </Button>
        </form>

        {/* Live Preview Column */}
        <div className="space-y-6">
          <Card title="Pré-visualização Ao Vivo" subtitle="Simulador do Cardápio Digital">
            <div
              className={`border border-white/10 overflow-hidden w-full max-w-sm mx-auto shadow-2xl p-5 ${cardRadiusStyle} transition-all duration-300`}
              style={{
                backgroundColor: isLight ? '#f9f9fb' : form.background_color,
                color: isLight ? '#1f2937' : form.text_color,
                fontFamily: form.font_family
              }}
            >
              {/* Capa */}
              <div className="h-24 bg-gradient-to-r from-orange-400 to-[#FF6B35] rounded-xl flex items-center justify-center relative overflow-hidden text-white mb-8 border border-white/5">
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover Preview" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                ) : (
                  <span className="text-sm font-bold drop-shadow-md">Sua Imagem de Capa</span>
                )}
                <div className="absolute -bottom-6 left-4 border-2 border-gray-900 w-12 h-12 bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center shadow-lg">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span>🍔</span>
                  )}
                </div>
              </div>

              {/* Restaurant details */}
              <div className="text-left mt-2">
                <h5 className="text-lg font-black">{user?.restaurant?.name || 'Seu Restaurante'}</h5>
                <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">Pão Brioche, hambúrguer de 180g, queijo cheddar e molho especial.</p>
              </div>

              {/* Simulated Card Item */}
              <div
                className={`p-3 border mt-5 flex items-center justify-between gap-4 transition-all duration-300 ${
                  form.card_style === 'simples'
                    ? 'border-gray-200/20 bg-transparent'
                    : form.card_style === 'arredondado'
                    ? 'border-transparent bg-white/[0.04] shadow-lg rounded-3xl'
                    : 'border-white/5 bg-white/[0.02] backdrop-blur-md shadow-md rounded-2xl'
                }`}
              >
                <div className="text-left flex-1">
                  <p className="font-bold text-xs">Smash Clássico</p>
                  <p className="text-[9px] text-gray-400 mt-0.5 line-clamp-1">Carne smash grelhada, queijo cheddar, picles.</p>
                  <p className="text-xs font-black mt-2 text-[#FF6B35]" style={{ color: form.primary_color }}>R$ 24,90</p>
                </div>
                <div className="w-10 h-10 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center text-sm shrink-0">
                  🍔
                </div>
              </div>

              {/* Simulated Buttons */}
              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  className={`w-full py-2.5 text-xs text-white font-bold transition-all uppercase tracking-wider ${cardRadiusStyle}`}
                  style={{
                    backgroundColor: form.button_color,
                    boxShadow: `0 4px 14px ${form.button_color}40`
                  }}
                >
                  Adicionar ao Carrinho
                </button>
                <button
                  type="button"
                  className="w-full py-2 text-[10px] font-bold transition-all uppercase tracking-wider text-gray-400 hover:text-white"
                >
                  Ver Opcionais
                </button>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  )
}
