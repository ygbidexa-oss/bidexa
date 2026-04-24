/**
 * Store Soumissions — localStorage : bidexa_soumissions
 *
 * Persistance complète : les données survivent au rechargement.
 * Seed initial = données de mock-data/soumissions.ts au premier démarrage.
 */

import type { Soumission } from '@/types'
import { soumissions as SEED } from '@/lib/mock-data/soumissions'

const KEY = 'bidexa_soumissions'

// ── Lecture / écriture ───────────────────────────────────────────────────────

export function getSoumissions(): Soumission[] {
  if (typeof window === 'undefined') return SEED
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED))
      return SEED
    }
    return JSON.parse(raw) as Soumission[]
  } catch { return SEED }
}

export function saveSoumissions(data: Soumission[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(KEY, JSON.stringify(data))
  }
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

/** Créer ou mettre à jour une soumission (upsert par id) */
export function upsertSoumission(soumission: Soumission): void {
  const all = getSoumissions()
  const idx = all.findIndex(s => s.id === soumission.id)
  if (idx >= 0) all[idx] = soumission
  else all.push(soumission)
  saveSoumissions(all)
}

/** Supprimer une soumission */
export function removeSoumission(id: string): void {
  saveSoumissions(getSoumissions().filter(s => s.id !== id))
}

/** Récupérer une soumission par id */
export function getSoumissionById(id: string): Soumission | undefined {
  return getSoumissions().find(s => s.id === id)
}

/** Changer le statut d'une soumission */
export function updateSoumissionStatut(
  id: string,
  statut: Soumission['statut']
): void {
  const all = getSoumissions()
  const idx = all.findIndex(s => s.id === id)
  if (idx === -1) return
  all[idx] = { ...all[idx], statut }
  saveSoumissions(all)
}

/** Filtrer par statut */
export function getSoumissionsByStatut(statut: Soumission['statut']): Soumission[] {
  return getSoumissions().filter(s => s.statut === statut)
}

/** Filtrer par client */
export function getSoumissionsByClient(clientId: string): Soumission[] {
  return getSoumissions().filter(s => s.clientId === clientId)
}

/** Filtrer par estimateur */
export function getSoumissionsByEstimateur(estimateurId: string): Soumission[] {
  return getSoumissions().filter(s => s.estimateurId === estimateurId)
}

/** Recherche full-text (titre, numéro, clientNom, description) */
export function searchSoumissions(query: string): Soumission[] {
  const q = query.toLowerCase()
  return getSoumissions().filter(s =>
    s.titre.toLowerCase().includes(q) ||
    s.numero.toLowerCase().includes(q) ||
    s.clientNom.toLowerCase().includes(q) ||
    (s.description ?? '').toLowerCase().includes(q)
  )
}

/** Générer un numéro unique pour une nouvelle soumission */
export function newSoumissionNumero(): string {
  const all = getSoumissions()
  const year = new Date().getFullYear()
  const nums = all
    .map(s => parseInt(s.numero.replace(/\D/g, '').slice(-3)))
    .filter(n => !isNaN(n))
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
  return `AO-${year}-${String(next).padStart(3, '0')}`
}

/** Générer un ID unique pour une nouvelle soumission */
export function newSoumissionId(): string {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}
