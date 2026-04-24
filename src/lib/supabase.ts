import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Debug logging
if (typeof window !== 'undefined') {
  console.log('Supabase URL:', supabaseUrl)
  console.log('Supabase Key exists:', !!supabaseAnonKey)
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    fetch: (...args: Parameters<typeof fetch>) => {
      return fetch(...args).catch(err => {
        console.error('Supabase fetch error:', err)
        throw err
      })
    }
  }
})

// Helper to check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && !!supabaseAnonKey
}

// Database types based on schema
export type Tables = {
  profiles: {
    id: string
    email: string
    prenom: string
    nom: string
    role: 'admin' | 'super_admin' | 'billing_admin' | 'directeur' | 'estimateur' | 'chef_projet' | 'comptable' | 'acheteur'
    entreprise_id: string | null
    modules: string[]
    avatar_url: string | null
    created_at: string
    updated_at: string
  }
  entreprises: {
    id: string
    nom: string
    logo_url: string | null
    adresse: string | null
    ville: string | null
    province: string | null
    code_postal: string | null
    telephone: string | null
    email: string | null
    site_web: string | null
    permis_rbq: string | null
    neq: string | null
    no_tps: string | null
    no_tvq: string | null
    politique: string | null
    couleur_primaire: string
    forfait: 'starter' | 'pro' | 'enterprise'
    statut: 'actif' | 'suspendu' | 'annulé'
    date_debut: string
    date_renouvellement: string
    mrr: number
    ia_extra: number
    modules: string[]
    created_at: string
    updated_at: string
  }
  abonnements_config: {
    id: string
    nom: string
    desc: string
    prix: number | null
    ia_jour: number
    ia_mois: number
    max_utilisateurs: number | null
    modules: string[]
    features: string[]
    highlighted: boolean
    cta: string
    updated_at: string
  }
  factures: {
    id: string
    entreprise_id: string
    date: string
    montant: number
    statut: 'payée' | 'en_attente' | 'en_retard'
    periode: string
    date_echeance: string
    rappels: { date: string; type: 'automatique' | 'manuel'; note?: string }[]
    created_at: string
  }
  usage_ia: {
    id: string
    entreprise_id: string
    date: string
    daily: number
    monthly: number
    updated_at: string
  }
}

// Type helpers for Supabase queries
export type DbResult<T> = T extends PromiseLike<infer U> ? U : never
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? U : never
