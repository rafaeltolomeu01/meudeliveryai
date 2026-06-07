import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import AppLayout from './components/Layout/AppLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import ProductsPage from './pages/ProductsPage'
import ProductFormPage from './pages/ProductFormPage'
import CustomersPage from './pages/CustomersPage'
import DriversPage from './pages/DriversPage'
import DriverFormPage from './pages/DriverFormPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'
import AdminRestaurantDetailPage from './pages/AdminRestaurantDetailPage'
import CozinhaPage from './pages/CozinhaPage'
import EntregadorPage from './pages/EntregadorPage'
import PlansPage from './pages/PlansPage'
import PublicMenuPage from './pages/PublicMenuPage'
import PublicCartPage from './pages/PublicCartPage'
import PublicCheckoutPage from './pages/PublicCheckoutPage'
import PublicOrderTrackingPage from './pages/PublicOrderTrackingPage'
import CategoriesPage from './pages/CategoriesPage'
import ComplementsPage from './pages/ComplementsPage'
import UsersPage from './pages/UsersPage'
import SubscriptionPage from './pages/SubscriptionPage'
import AppearancePage from './pages/AppearancePage'
import WhatsAppPage from './pages/WhatsAppPage'



function PrivateRoute({ children, allowedRoles }) {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A0533] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin-slow" />
          <p className="text-[#a991c7] text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    if (user?.role === 'admin_geral') {
      return <Navigate to="/admin" replace />
    } else if (user?.role === 'cozinha') {
      return <Navigate to="/dashboard/cozinha" replace />
    } else if (user?.role === 'entregador') {
      return <Navigate to="/dashboard/entregador" replace />
    } else {
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/planos" element={<PlansPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Navigate to="/cadastro" replace />} />
      <Route path="/cadastro" element={<RegisterPage />} />
      
      {/* Rotas Públicas do Cardápio Digital */}
      <Route path="/cardapio/:slug" element={<PublicMenuPage />} />
      <Route path="/cardapio/:slug/carrinho" element={<PublicCartPage />} />
      <Route path="/cardapio/:slug/checkout" element={<PublicCheckoutPage />} />
      <Route path="/cardapio/:slug/pedido/:id" element={<PublicOrderTrackingPage />} />
      
      {/* Rota Global de Admin */}
      <Route
        path="/admin"
        element={<Navigate to="/admin/restaurantes" replace />}
      />
      <Route
        path="/admin/restaurantes"
        element={
          <PrivateRoute allowedRoles={['admin_geral']}>
            <AdminPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/restaurantes/:id"
        element={
          <PrivateRoute allowedRoles={['admin_geral']}>
            <AdminRestaurantDetailPage />
          </PrivateRoute>
        }
      />

      {/* Rota Cozinha */}
      <Route
        path="/dashboard/cozinha"
        element={
          <PrivateRoute allowedRoles={['admin_geral', 'cozinha', 'dono', 'gerente']}>
            <CozinhaPage />
          </PrivateRoute>
        }
      />

      {/* Rota Entregador */}
      <Route
        path="/dashboard/entregador"
        element={
          <PrivateRoute allowedRoles={['admin_geral', 'entregador', 'dono', 'gerente']}>
            <EntregadorPage />
          </PrivateRoute>
        }
      />

      {/* Rotas Painel Administrativo do Restaurante */}
      <Route
        path="/"
        element={
          <PrivateRoute allowedRoles={['admin_geral', 'dono', 'gerente', 'atendente']}>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="dashboard/pedidos" element={<OrdersPage />} />
        <Route path="dashboard/pedidos/:id" element={<OrderDetailPage />} />
        <Route path="dashboard/produtos" element={<ProductsPage />} />
        <Route path="dashboard/produtos/novo" element={<ProductFormPage />} />
        <Route path="dashboard/produtos/editar/:id" element={<ProductFormPage />} />
        <Route path="dashboard/clientes" element={<CustomersPage />} />
        <Route path="dashboard/entregadores" element={<DriversPage />} />
        <Route path="dashboard/entregadores/novo" element={<DriverFormPage />} />
        <Route path="dashboard/entregadores/editar/:id" element={<DriverFormPage />} />
        <Route path="dashboard/relatorios" element={<ReportsPage />} />
        <Route path="dashboard/configuracoes" element={<SettingsPage />} />
        <Route path="dashboard/aparencia" element={<AppearancePage />} />
        <Route path="dashboard/categorias" element={<CategoriesPage />} />
        <Route path="dashboard/complementos" element={<ComplementsPage />} />
        <Route path="dashboard/usuarios" element={<UsersPage />} />
        <Route path="dashboard/assinatura" element={<SubscriptionPage />} />
        <Route path="dashboard/whatsapp" element={<WhatsAppPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
