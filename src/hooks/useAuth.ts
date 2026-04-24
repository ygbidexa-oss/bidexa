'use client'
import { useState, useEffect, useCallback } from 'react'
import { login as authLogin, logout as authLogout, getCurrentUser, type AuthUser } from '@/lib/auth'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setUser(getCurrentUser())
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = authLogin(email, password)
    if (result.success) setUser(result.user)
    return result
  }, [])

  const logout = useCallback(() => {
    authLogout()
    setUser(null)
  }, [])

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  }
}
