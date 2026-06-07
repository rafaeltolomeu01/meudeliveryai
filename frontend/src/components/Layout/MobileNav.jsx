import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Users, MoreHorizontal } from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Início' },
  { to: '/dashboard/pedidos', icon: ShoppingBag, label: 'Pedidos' },
  { to: '/dashboard/produtos', icon: UtensilsCrossed, label: 'Produtos' },
  { to: '/dashboard/clientes', icon: Users, label: 'Clientes' },
  { to: '/dashboard/configuracoes', icon: MoreHorizontal, label: 'Mais' },
]

export default function MobileNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe"
      style={{ background: 'rgba(15, 2, 32, 0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => [
              'flex-1 flex flex-col items-center gap-1 py-3 px-2 transition-all duration-200',
              isActive ? 'text-[#FF6B35]' : 'text-[#6b5880]',
            ].join(' ')}
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-[#FF6B35]/15' : ''}`}>
                  <Icon size={20} className={isActive ? 'text-[#FF6B35]' : ''} />
                </div>
                <span className={`text-[10px] font-medium leading-none ${isActive ? 'text-[#FF6B35]' : 'text-[#6b5880]'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
