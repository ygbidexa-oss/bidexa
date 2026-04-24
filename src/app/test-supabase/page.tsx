'use client'
import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/hooks/useSupabaseAuth'

export default function SupabaseTestPage() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [forfaits, setForfaits] = useState<any[]>([])
  const { user, session, loading: authLoading } = useAuth()

  useEffect(() => {
    testConnection()
  }, [])

  async function testConnection() {
    try {
      // Test 1: Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        setStatus('error')
        setError('Supabase environment variables are missing')
        return
      }

      // Test 2: Try to fetch forfaits (public table)
      const { data, error } = await supabase
        .from('abonnements_config')
        .select('*')

      if (error) {
        setStatus('error')
        setError(`Database error: ${error.message}`)
        return
      }

      setForfaits(data || [])
      setStatus('connected')
    } catch (err: any) {
      setStatus('error')
      setError(err.message || 'Unknown error')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Supabase Connection Test</h1>

        {/* Configuration Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <h2 className="font-semibold text-slate-700 mb-3">Configuration</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Supabase URL:</span>
              <span className="font-mono text-slate-700">{process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Anon Key:</span>
              <span className="font-mono text-slate-700">
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
                  ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 20)}...` 
                  : 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Configured:</span>
              <span className={isSupabaseConfigured() ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                {isSupabaseConfigured() ? 'Yes ✓' : 'No ✗'}
              </span>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <h2 className="font-semibold text-slate-700 mb-3">Connection Status</h2>
          {status === 'loading' && (
            <div className="flex items-center gap-2 text-amber-600">
              <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              Testing connection...
            </div>
          )}
          {status === 'connected' && (
            <div className="text-emerald-600 font-semibold">✓ Connected to Supabase</div>
          )}
          {status === 'error' && (
            <div className="text-red-600">
              <p className="font-semibold">✗ Connection failed</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}
        </div>

        {/* Auth Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <h2 className="font-semibold text-slate-700 mb-3">Authentication</h2>
          {authLoading ? (
            <div className="text-slate-500">Loading auth state...</div>
          ) : user ? (
            <div className="space-y-2 text-sm">
              <div className="text-emerald-600 font-semibold">✓ Authenticated</div>
              <div><span className="text-slate-500">User:</span> {user.prenom} {user.nom} ({user.email})</div>
              <div><span className="text-slate-500">Role:</span> {user.role}</div>
              <div><span className="text-slate-500">Forfait:</span> {user.forfait}</div>
              <div><span className="text-slate-500">Entreprise ID:</span> {user.entrepriseId || 'None'}</div>
            </div>
          ) : (
            <div className="text-slate-500">Not authenticated</div>
          )}
        </div>

        {/* Forfaits Data */}
        {status === 'connected' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-700 mb-3">Forfaits from Database ({forfaits.length})</h2>
            <div className="space-y-3">
              {forfaits.map((forfait) => (
                <div key={forfait.id} className="p-3 bg-slate-50 rounded-lg">
                  <div className="font-semibold text-slate-800">{forfait.nom}</div>
                  <div className="text-sm text-slate-500">{forfait.desc} — {forfait.prix ? `${forfait.prix}$/mois` : 'Sur devis'}</div>
                  <div className="text-xs text-slate-400 mt-1">{forfait.modules?.length || 0} modules — {forfait.ia_jour} req IA/jour</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button 
            onClick={testConnection} 
            className="px-4 py-2 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition"
          >
            Retest Connection
          </button>
          <a 
            href="/login" 
            className="px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-900 transition inline-flex items-center"
          >
            Go to Login
          </a>
        </div>
      </div>
    </div>
  )
}
