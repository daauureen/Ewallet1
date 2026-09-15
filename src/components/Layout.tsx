import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet as WalletIcon,
  PiggyBank,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';

const navItems = [
  { to: '/dashboard', label: 'Главная', icon: LayoutDashboard },
  { to: '/transactions', label: 'Транзакции', icon: ArrowLeftRight },
  { to: '/wallets', label: 'Кошельки', icon: WalletIcon },
  { to: '/budgets', label: 'Бюджеты', icon: PiggyBank },
  { to: '/settings', label: 'Настройки', icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 fixed h-screen">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-200">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-600">
            <WalletIcon className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900">Кошелёк</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-slate-200">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-600 text-sm font-semibold">
              {(profile?.full_name?.[0] || 'U').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {profile?.full_name || 'Пользователь'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Выйти
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600">
              <WalletIcon className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base text-slate-900">Кошелёк</span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-black/30" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute top-14 left-0 right-0 bg-white border-b border-slate-200 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="px-3 py-3 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              ))}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full"
              >
                <LogOut className="w-5 h-5" />
                Выйти
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-64 pt-14 md:pt-0 min-h-screen">
        <div className="px-4 py-6 md:px-8 md:py-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
