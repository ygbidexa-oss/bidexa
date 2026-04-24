'use client'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AuthGuard } from '@/components/auth/AuthGuard'

const PUBLIC_ROUTES = ['/', '/login', '/register']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = PUBLIC_ROUTES.includes(pathname)

  if (isPublic) {
    return <>{children}</>
  }

  return (
    <AuthGuard>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 flex flex-col">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
