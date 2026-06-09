import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { PWAProvider } from './contexts/PWAContext'
import ErrorBoundary from './components/ui/ErrorBoundary'
import App from './App'
import './index.css';
import './meudeliveryai-light-overrides.css';
import './utils/forceIfoodTheme';
import './styles/ifood-real-admin.css';
import './styles/mda-final-public-fixes.css';
import './styles/mda-fix-public-text-chat.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 1000 * 20,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <PWAProvider>
              <App />
              <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
            </PWAProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      await reg.update()
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' })
          }
        })
      })
    } catch (err) {
      console.error('[PWA] Falha ao registrar Service Worker:', err)
    }
  })
}
