'use client'
import { useEffect, useState, createContext, useContext, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export type UserRole = 
  | 'super_admin' | 'billing_admin' | 'admin' 
  | 'directeur' | 'estimateur' | 'chef_projet' 
  | 'comptable' | 'acheteur'

export interface StoredUser {
  id: string
  email: string
  prenom: string
  nom: string
  role: UserRole
  forfait: 'starter' | 'pro' | 'enterprise'
  entrepriseId: string | null
  modules: string[]
  avatarUrl: string | null
}

interface AuthContextType {
  user: StoredUser | null
  session: Session | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  register: (data: {
    prenom: string
    nom: string
    email: string
    password: string
    entreprise: string
    forfait: 'starter' | 'pro' | 'enterprise'
  }) => Promise<{ success: boolean; error?: string }>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        
        if (session?.user) {
          await loadUserProfile(session.user)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event)
      setSession(session)
      
      if (session?.user) {
        await loadUserProfile(session.user)
      } else {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Load user profile from database
  async function loadUserProfile(authUser: User): Promise<void> {
    console.log('Loading profile for user:', authUser.id)
    try {
      // First, get the profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      console.log('Profile query result:', { profile: !!profile, error: profileError?.message })

      if (profileError) {
        console.error('Error loading profile:', profileError)
        return
      }

      if (!profile) {
        console.error('No profile found for user:', authUser.id)
        return
      }

      console.log('Profile loaded:', profile)

      // Then, get entreprise info if exists
      let entreprise = null
      if (profile.entreprise_id) {
        const { data: entData, error: entError } = await supabase
          .from('entreprises')
          .select('id, nom, forfait, modules, statut')
          .eq('id', profile.entreprise_id)
          .single()
        
        console.log('Entreprise query result:', { entreprise: !!entData, error: entError?.message })
        
        if (!entError && entData) {
          entreprise = entData
        }
      }

      const userData = {
        id: authUser.id,
        email: authUser.email!,
        prenom: profile.prenom,
        nom: profile.nom,
        role: profile.role,
        forfait: entreprise?.forfait || 'starter',
        entrepriseId: profile.entreprise_id,
        modules: profile.modules || entreprise?.modules || [],
        avatarUrl: profile.avatar_url,
      }

      console.log('Setting user data:', userData)
      setUser(userData)
      // Pas de redirection automatique - l'utilisateur cliquera sur le bouton
    } catch (error) {
      console.error('Error in loadUserProfile:', error)
    }
  }

  // Login function
  async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Attempting login for:', email)
      console.log('Supabase client exists:', !!supabase)
      console.log('Supabase auth exists:', !!supabase.auth)
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })

      console.log('Login response:', { data: !!data, error: error?.message })

      if (error) {
        console.error('Login error:', error)
        return { success: false, error: error.message }
      }

      if (data.user) {
        console.log('Login successful, loading profile...')
        await loadUserProfile(data.user)
        // Force redirect after successful login
        window.location.href = '/dashboard'
      }

      return { success: true }
    } catch (error: any) {
      console.error('Login exception:', error)
      return { success: false, error: error.message || 'Login failed' }
    }
  }

  // Logout function
  async function logout(): Promise<void> {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  // Register function
  async function register(data: {
    prenom: string
    nom: string
    email: string
    password: string
    entreprise: string
    forfait: 'starter' | 'pro' | 'enterprise'
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Step 1: Get forfait config
      const { data: forfaitConfig, error: forfaitError } = await supabase
        .from('abonnements_config')
        .select('*')
        .eq('id', data.forfait)
        .single()

      if (forfaitError || !forfaitConfig) {
        return { success: false, error: 'Invalid subscription plan' }
      }

      // Step 2: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            prenom: data.prenom,
            nom: data.nom,
            role: 'admin',
          },
        },
      })

      if (authError) {
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        return { success: false, error: 'User creation failed' }
      }

      // Step 3: Create entreprise
      const dateRenouvellement = new Date()
      dateRenouvellement.setMonth(dateRenouvellement.getMonth() + 1)

      const { data: entreprise, error: entError } = await supabase
        .from('entreprises')
        .insert({
          nom: data.entreprise,
          email: data.email,
          forfait: data.forfait,
          statut: 'actif',
          date_debut: new Date().toISOString().split('T')[0],
          date_renouvellement: dateRenouvellement.toISOString().split('T')[0],
          mrr: forfaitConfig.prix || 0,
          modules: forfaitConfig.modules || [],
        })
        .select()
        .single()

      if (entError) {
        console.error('Error creating entreprise:', entError)
        // Don't fail - user can update later
      }

      // Step 4: Update profile with entreprise
      if (entreprise) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            entreprise_id: entreprise.id,
            modules: forfaitConfig.modules || [],
          })
          .eq('id', authData.user.id)

        if (profileError) {
          console.error('Error updating profile:', profileError)
        }
      }

      return { success: true }
    } catch (error: any) {
      console.error('Registration error:', error)
      return { success: false, error: error.message || 'Registration failed' }
    }
  }

  // Refresh user data
  async function refreshUser(): Promise<void> {
    if (session?.user) {
      await loadUserProfile(session.user)
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, login, logout, register, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
