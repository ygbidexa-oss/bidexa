'use client'
import { useState, useRef, useEffect } from 'react'
import { Search, Bell, LogOut, User, ChevronDown } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

const titles: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
  '/clients': 'Clients & CRM',
  '/soumissions': 'Soumissions & Appels d\'offres',
  '/estimation': 'Estimation',
  '/concurrence': 'Résultats & Concurrence',
  '/projets': 'Gestion de projets',
  '/bons-commande': 'Bons de commande',
  '/fournisseurs': 'Fournisseurs',
  '/comptabilite': 'Comptabilité',
  '/documents': 'Documents',
  '/reporting': 'Reporting & BI',
  '/ia': 'Intelligence Artificielle',
  '/profil': 'Mon profil',
}

const forfaitColors: Record<string, string> = {
  starter: 'bg-slate-100 text-slate-600',
  pro: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-amber-100 text-amber-700',
}
const forfaitLabels: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Entreprise',
}

export function Header() {
  const pathname = usePathname()
  const base = '/' + pathname.split('/')[1]
  const title = titles[base] || 'Bidexa'
  const { user, logout } = useAuth()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleLogout() {
    logout()
    router.replace('/login')
  }

  const initials = user ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase() : 'U'
  const avatarSrc = user?.avatar ?? ''

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 flex-shrink-0">
      <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="Recherche globale..."
            className="pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
          />
        </div>
        {/* Bell */}
        <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
        </button>
        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition">
            {avatarSrc ? (
              <img src={avatarSrc} alt="Avatar" className="w-8 h-8 rounded-full object-cover border-2 border-amber-300 shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: '#C9A84C', color: '#0D1B2A' }}>
                {initials}
              </div>
            )}
            {user && (
              <div className="text-left hidden md:block">
                <div className="text-xs font-semibold text-slate-700 leading-tight">{user.prenom} {user.nom}</div>
                <div className="text-xs text-slate-400 leading-tight">{user.entreprise}</div>
              </div>
            )}
            {user && (
              <span className={`hidden md:inline text-xs font-semibold px-2 py-0.5 rounded-full ${forfaitColors[user.forfait] ?? 'bg-slate-100 text-slate-600'}`}>
                {forfaitLabels[user.forfait]}
              </span>
            )}
            <ChevronDown size={13} className="text-slate-400 hidden md:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50">
              {user && (
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-amber-200 shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: '#0D1B2A', color: '#C9A84C' }}>{initials}</div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{user.prenom} {user.nom}</div>
                    <div className="text-xs text-slate-400 truncate">{user.email}</div>
                  </div>
                </div>
              )}
              <Link href="/profil" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition">
                <User size={14} /> Mon profil
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition">
                <LogOut size={14} /> Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
