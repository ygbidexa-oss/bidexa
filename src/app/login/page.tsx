'use client'
import { useState, FormEvent, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, AlertTriangle, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const { user, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  // Si déjà connecté, rediriger
  useEffect(() => {
    if (user?.role && window.location.pathname === '/login') {
      const targetPath = (user.role === 'super_admin' || user.role === 'billing_admin') 
        ? '/super-admin' 
        : '/dashboard'
      console.log('Already logged in, redirecting to', targetPath)
      window.location.href = targetPath
    }
  }, [user])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('Submitting login form...')
      const result = await login(email, password)
      console.log('Login result:', result)
      
      if (result.success && result.role) {
        console.log('Login successful, role:', result.role)
        // Redirection immédiate basée sur le rôle retourné
        const targetPath = (result.role === 'super_admin' || result.role === 'billing_admin') 
          ? '/super-admin' 
          : '/dashboard'
        console.log('Redirecting to', targetPath)
        window.location.href = targetPath
      } else if (!result.success) {
        console.log('Login failed:', result.error)
        setError(result.error || 'Erreur de connexion')
        setLoading(false)
      } else {
        console.log('Login success but no role')
        setError('Erreur: rôle non déterminé')
        setLoading(false)
      }
    } catch (err: any) {
      console.error('Submit error:', err)
      setError(err.message || 'Erreur de connexion')
      setLoading(false)
    }
  }

  async function handleResetPassword() {
    if (!email) {
      setError('Veuillez entrer votre adresse courriel')
      return
    }
    
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    
    if (error) {
      setError(error.message)
    } else {
      setResetSent(true)
      setError('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base" style={{ background: '#0D1B2A', color: '#C9A84C' }}>B</div>
            <span className="font-bold text-xl" style={{ color: '#0D1B2A' }}>Bidexa</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-slate-800">Connexion à votre espace</h1>
          <p className="text-sm text-slate-500 mt-1">Bienvenue de retour !</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-4">
          {/* Reset sent message */}
          {resetSent && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3">
              ✅ Un lien de réinitialisation a été envoyé à votre adresse courriel.
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-start gap-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <div><p>{error}</p></div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Adresse courriel</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="vous@exemple.ca"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600">Mot de passe</label>
              <button
                type="button"
                onClick={handleResetPassword}
                className="text-xs text-amber-600 hover:underline"
                disabled={loading}
              >
                Mot de passe oublié ?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: '#0D1B2A' }}
          >
            {loading ? 'Vérification...' : <>Se connecter <ArrowRight size={16} /></>}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5">
          Pas encore de compte ?{' '}
          <Link href="/register" className="font-semibold hover:underline" style={{ color: '#C9A84C' }}>Créer un compte</Link>
        </p>
      </div>
    </div>
  )
}
