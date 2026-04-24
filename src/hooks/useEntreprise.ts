'use client'
import { useState, useEffect } from 'react'
import { getEntreprise, saveEntreprise, ensureDefaultEntreprise, type EntrepriseProfile } from '@/lib/entreprise'

export function useEntreprise() {
  const [entreprise, setEntreprise] = useState<EntrepriseProfile | null>(null)

  useEffect(() => {
    ensureDefaultEntreprise()
    setEntreprise(getEntreprise())
  }, [])

  function update(data: Partial<EntrepriseProfile>) {
    if (!entreprise) return
    const updated = { ...entreprise, ...data }
    saveEntreprise(updated)
    setEntreprise(updated)
  }

  function uploadLogo(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        update({ logo: reader.result as string })
        resolve()
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  return { entreprise, update, uploadLogo }
}
