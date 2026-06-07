import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

// Configure axios defaults
axios.defaults.baseURL = '/api/v1'

function formatUserObject(userRaw) {
  if (!userRaw) return null
  if (userRaw.restaurant) return userRaw
  return {
    id: userRaw.id,
    name: userRaw.name,
    email: userRaw.email,
    role: userRaw.role,
    avatar_url: userRaw.avatar_url,
    restaurant: userRaw.restaurant_id ? {
      id: userRaw.restaurant_id,
      name: userRaw.restaurant_name,
      slug: userRaw.restaurant_slug,
      isOpen: userRaw.restaurant_is_open === 1 || userRaw.restaurant_is_open === true || userRaw.restaurant_is_open === '1',
      plan: userRaw.plan || 'starter'
    } : null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('mda_token'))
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user && !!token

  // Set axios auth header
  const setAuthHeader = useCallback((tkn) => {
    if (tkn) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${tkn}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [])

  // Load user from token on startup
  useEffect(() => {
    const storedToken = localStorage.getItem('mda_token')
    const storedUser = localStorage.getItem('mda_user')
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)
        setToken(storedToken)
        setAuthHeader(storedToken)
      } catch {
        localStorage.removeItem('mda_token')
        localStorage.removeItem('mda_user')
      }
    }
    setIsLoading(false)
  }, [setAuthHeader])

  // Axios response interceptor for 401
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout()
          toast.error('Sessão expirada. Faça login novamente.')
        }
        return Promise.reject(error)
      }
    )
    return () => axios.interceptors.response.eject(interceptor)
  }, [])

  const login = async (email, password) => {
    try {
      // Tenta chamar o backend real primeiro
      try {
        const response = await axios.post('/auth/login', { email, password });
        if (response.data?.success) {
          const { token, user } = response.data.data;
          const formattedUser = formatUserObject(user);
          localStorage.setItem('mda_token', token);
          localStorage.setItem('mda_user', JSON.stringify(formattedUser));
          setAuthHeader(token);
          setUser(formattedUser);
          setToken(token);
          toast.success(`Bem-vindo de volta, ${formattedUser.name.split(' ')[0]}! 🎉`);
          return { success: true, user: formattedUser };
        }
      } catch (apiError) {
        if (apiError.code === 'ERR_NETWORK' || apiError.message?.includes('Network Error')) {
          console.warn('Backend offline, usando dados mockados de desenvolvimento.');
        } else {
          throw apiError;
        }
      }

      // Mock login for development depending on email prefix
      let mockRole = 'dono';
      let mockName = 'Rafael Admin';
      let mockRestId = 1;
      let mockRestName = 'Burger Palace';

      if (email.toLowerCase().includes('admin@meudeliveryai.com')) {
        mockRole = 'admin_geral';
        mockName = 'Suporte Geral';
        mockRestId = null;
        mockRestName = null;
      } else if (email.toLowerCase().includes('cozinha')) {
        mockRole = 'cozinha';
        mockName = 'Chef de Cozinha';
      } else if (email.toLowerCase().includes('entregador')) {
        mockRole = 'entregador';
        mockName = 'Entregador Rápido';
      } else if (email.toLowerCase().includes('gerente')) {
        mockRole = 'gerente';
        mockName = 'Maria Gerente';
      }

      const mockUser = {
        id: 1,
        name: mockName,
        email,
        role: mockRole,
        restaurant: mockRestId ? {
          id: mockRestId,
          name: mockRestName,
          type: 'Hamburguer',
          logo: null,
          isOpen: true,
          plan: 'pro',
        } : null,
        avatar: null,
      }
      const mockToken = 'mock_jwt_token_' + Date.now()

      localStorage.setItem('mda_token', mockToken)
      localStorage.setItem('mda_user', JSON.stringify(mockUser))
      setAuthHeader(mockToken)
      setUser(mockUser)
      setToken(mockToken)
      toast.success('Bem-vindo de volta, ' + mockUser.name.split(' ')[0] + '! 🎉')
      return { success: true, user: mockUser }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Erro ao fazer login'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const register = async (data) => {
    try {
      // Tenta chamar o backend real primeiro
      try {
        const payload = {
          restaurant_name: data.restaurantName,
          name: data.adminName,
          email: data.email,
          password: data.password,
          whatsapp: data.whatsapp,
          city: data.city,
          state: data.state
        };
        const response = await axios.post('/auth/register', payload);
        if (response.data?.success) {
          const { token, user } = response.data.data;
          const formattedUser = formatUserObject(user);
          localStorage.setItem('mda_token', token);
          localStorage.setItem('mda_user', JSON.stringify(formattedUser));
          setAuthHeader(token);
          setUser(formattedUser);
          setToken(token);
          toast.success('Conta criada com sucesso! 🚀');
          return { success: true };
        }
      } catch (apiError) {
        if (apiError.code === 'ERR_NETWORK' || apiError.message?.includes('Network Error')) {
          console.warn('Backend offline, usando dados mockados de desenvolvimento.');
        } else {
          throw apiError;
        }
      }

      // Mock register for development
      const mockUser = {
        id: 2,
        name: data.adminName,
        email: data.email,
        role: 'dono',
        restaurant: {
          id: 2,
          name: data.restaurantName,
          type: 'Outro',
          logo: null,
          isOpen: false,
          plan: 'starter',
        },
        avatar: null,
      }
      const mockToken = 'mock_jwt_token_' + Date.now()

      localStorage.setItem('mda_token', mockToken)
      localStorage.setItem('mda_user', JSON.stringify(mockUser))
      setAuthHeader(mockToken)
      setUser(mockUser)
      setToken(mockToken)
      toast.success('Conta criada com sucesso! 🚀')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Erro ao criar conta'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const logout = () => {
    localStorage.removeItem('mda_token')
    localStorage.removeItem('mda_user')
    setAuthHeader(null)
    setUser(null)
    setToken(null)
  }

  const updateUser = (data) => {
    const updatedUser = { ...user, ...data }
    setUser(updatedUser)
    localStorage.setItem('mda_user', JSON.stringify(updatedUser))
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      isAuthenticated,
      login,
      register,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
