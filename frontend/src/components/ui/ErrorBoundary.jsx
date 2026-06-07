import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught frontend error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#1A0533] flex items-center justify-center p-6 text-center text-white font-inter text-left">
          <div className="glass rounded-3xl p-8 border border-white/[0.08] shadow-2xl max-w-md w-full">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Ocorreu um erro inesperado</h2>
            <p className="text-[#a991c7] text-sm mb-6">
              Nosso sistema detectou uma falha de renderização no frontend. Por favor, tente recarregar a página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white rounded-xl font-bold text-sm shadow-lg shadow-[#FF6B35]/20 transition-all"
            >
              Atualizar sistema
            </button>
            {this.state.error && (
              <pre className="mt-4 text-left p-3 bg-black/40 rounded-xl text-[10px] text-red-300 overflow-x-auto max-h-40 font-mono">
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
