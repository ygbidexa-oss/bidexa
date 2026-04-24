'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, FileText, Calculator, TrendingDown,
  FolderKanban, ShoppingCart, Truck, CreditCard, Archive,
  BarChart3, Bot, ChevronRight, Building2, LogOut, CreditCard as SubscriptionIcon,
  ShieldCheck,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/hooks/useSupabaseAuth'
import { useRouter } from 'next/navigation'

const SECTIONS = [
  {
    label: 'Commercial',
    items: [
      { label: 'Dashboard',        href: '/dashboard',      icon: LayoutDashboard },
      { label: 'Clients',          href: '/clients',        icon: Users,        badge: 15 },
      { label: 'Estimation',       href: '/estimation',     icon: Calculator },
      { label: 'Soumissions',      href: '/soumissions',    icon: FileText,     badge: 20 },
      { label: 'Concurrence',      href: '/concurrence',    icon: TrendingDown },
    ],
  },
  {
    label: 'Opérations',
    items: [
      { label: 'Projets',          href: '/projets',        icon: FolderKanban, badge: 8 },
      { label: 'Bons de commande', href: '/bons-commande',  icon: ShoppingCart },
      { label: 'Fournisseurs',     href: '/fournisseurs',   icon: Truck },
    ],
  },
  {
    label: 'Finance & Données',
    items: [
      { label: 'Comptabilité',     href: '/comptabilite',   icon: CreditCard },
      { label: 'Documents',        href: '/documents',      icon: Archive },
      { label: 'Reporting BI',     href: '/reporting',      icon: BarChart3 },
      { label: 'Intelligence IA',  href: '/ia',             icon: Bot },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const router = useRouter()

  function handleLogout() {
    logout()
    router.replace('/login')
  }

  const initials = user ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase() : '?'

  // Determine which module hrefs this user can access
  // admin/super_admin/billing_admin see everything
  // other roles: use modules from user object (Supabase)
  const isFullAccess = !user || ['admin', 'super_admin', 'billing_admin'].includes(user.role)
  const allowedModules = user?.modules || null

  function isModuleAllowed(href: string): boolean {
    if (isFullAccess || !allowedModules || allowedModules.length === 0) return true
    // href is like '/clients', '/bons-commande' etc — strip leading slash
    const mod = href.replace('/', '')
    return allowedModules.includes(mod)
  }

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-screen" style={{ background: '#0D1B2A' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#C9A84C' }}>
          <Building2 size={20} color="#0D1B2A" />
        </div>
        <div>
          <span className="font-bold text-white text-lg leading-none">Bidexa</span>
          <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>ERP Généraliste</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {/* Section Plateforme — super_admin et billing_admin UNIQUEMENT */}
        {(user?.role === 'super_admin' || user?.role === 'billing_admin') && (
          <div className="mb-4">
            <div className="px-3 mb-1">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#C9A84C' }}>
                Gestionnaire Bidexa
              </span>
            </div>
            <Link
              href="/super-admin"
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-all',
                pathname === '/super-admin' || pathname.startsWith('/super-admin/')
                  ? 'text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
              style={pathname === '/super-admin' || pathname.startsWith('/super-admin/')
                ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' } 
                : {}}
            >
              <ShieldCheck size={17} />
              <span className="flex-1">Super Admin</span>
              {(pathname === '/super-admin' || pathname.startsWith('/super-admin/')) && <ChevronRight size={14} />}
            </Link>
          </div>
        )}

        {/* Sections ERP — PAS pour super_admin et billing_admin */}
        {user?.role !== 'super_admin' && user?.role !== 'billing_admin' && SECTIONS.map(section => (
          <div key={section.label}>
            <div className="px-3 mb-1">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#334155' }}>
                {section.label}
              </span>
            </div>
            {section.items.filter(item => isModuleAllowed(item.href)).map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-all group',
                    isActive ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  )}
                  style={isActive ? { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' } : {}}
                >
                  <Icon size={17} />
                  <span className="flex-1">{item.label}</span>
                  {'badge' in item && item.badge && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight size={14} />}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer — utilisateur connecté */}
      <div className="px-3 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {/* Mon abonnement — admin seulement (pas super_admin) */}
        {user?.role === 'admin' && (
          <Link
            href="/abonnement"
            className={clsx(
              'flex items-center gap-2 w-full px-2 py-2 rounded-lg text-xs font-medium transition mb-1',
              pathname === '/abonnement' ? 'text-amber-400 bg-amber-400/10' : 'hover:bg-white/5'
            )}
            style={{ color: pathname === '/abonnement' ? '#C9A84C' : '#64748B' }}
          >
            <SubscriptionIcon size={14} /> Mon abonnement
          </Link>
        )}
        {/* Profil Entreprise — admin seulement (pas super_admin) */}
        {user?.role === 'admin' && (
          <Link
            href="/entreprise"
            className={clsx(
              'flex items-center gap-2 w-full px-2 py-2 rounded-lg text-xs font-medium transition mb-1',
              pathname === '/entreprise' ? 'text-amber-400 bg-amber-400/10' : 'hover:bg-white/5'
            )}
            style={{ color: pathname === '/entreprise' ? '#C9A84C' : '#64748B' }}
          >
            <Building2 size={14} /> Profil entreprise
          </Link>
        )}
        <Link href="/profil" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition group mb-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: '#C9A84C', color: '#0D1B2A' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user ? `${user.prenom} ${user.nom}` : 'Utilisateur'}
            </p>
            <p className="text-xs truncate" style={{ color: '#64748B' }}>
              {user?.email ?? ''}
            </p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-xs font-medium transition hover:bg-red-500/10 hover:text-red-400"
          style={{ color: '#64748B' }}
        >
          <LogOut size={14} /> Déconnexion
        </button>
      </div>
    </aside>
  )
}
