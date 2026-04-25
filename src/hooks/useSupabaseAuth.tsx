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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: string }>
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event)
      setSession(session)
      
      if (session?.user) {
        await loadUserProfile(session.user)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load user profile from database
  async function loadUserProfile(authUser: User): Promise<StoredUser | null> {
    console.log('Loading profile for user:', authUser.id)
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profileError) {
        console.error('Error loading profile:', profileError)
        return null
      }

      if (!profile) {
        console.error('No profile found for user:', authUser.id)
        return null
      }

      let entreprise = null
      if (profile.entreprise_id) {
        const { data: entData, error: entError } = await supabase
          .from('entreprises')
          .select('id, nom, forfait, modules, statut')
          .eq('id', profile.entreprise_id)
          .single()
        
        if (!entError && entData) {
          entreprise = entData
        }
      }

      const userData: StoredUser = {
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
      return userData
    } catch (error) {
      console.error('Error in loadUserProfile:', error)
      return null
    }
  }

  // Login function - retourne le rôle pour la redirection
  async function login(email: string, password: string): Promise<{ success: boolean; error?: string; role?: string }> {
    try {
      console.log('Attempting login for:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        console.error('Login error:', error)
        return { success: false, error: error.message }
      }

      if (data.user) {
        console.log('Login successful for:', data.user.email)
        console.log('User metadata:', data.user.user_metadata)
        
        // Essayer de charger le profil avec timeout
        let userRole = data.user.user_metadata?.role
        
        if (!userRole) {
          // Si pas dans metadata, charger depuis la DB avec timeout
          console.log('Loading profile from DB...')
          try {
            const userData = await Promise.race([
              loadUserProfile(data.user),
              new Promise<null>((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 5000)
              )
            ])
            if (userData) {
              userRole = userData.role
              console.log('Role from DB:', userRole)
            }
          } catch (timeoutErr) {
            console.log('Profile loading timeout, using fallback')
          }
        }
        
        // Fallback si toujours pas de rôle
        if (!userRole) {
          userRole = 'admin'
          console.log('Using fallback role:', userRole)
        }
        
        console.log('Final role for redirection:', userRole)
        return { success: true, role: userRole }
      }

      return { success: false, error: 'Unknown error' }
    } catch (error: any) {
      console.error('Login exception:', error)
      return { success: false, error: error.message || 'Login failed' }
    }
  }

  // Logout function
  async function logout(): Promise<void> {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      // Redirection vers login
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('Logout error:', error)
      // Force redirect même en cas d'erreur
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
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
      const { data: forfaitConfig, error: forfaitError } = await supabase
        .from('abonnements_config')
        .select('*')
        .eq('id', data.forfait)
        .single()

      if (forfaitError || !forfaitConfig) {
        return { success: false, error: 'Invalid subscription plan' }
      }

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
      }

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
