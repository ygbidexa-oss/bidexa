/**
 * Store Clients — localStorage : bidexa_clients
 *
 * Persistance complète : les données survivent au rechargement.
 * Seed initial = données de mock-data/clients.ts au premier démarrage.
 */

import type { Client } from '@/types'
import { clients as SEED } from '@/lib/mock-data/clients'

const KEY = 'bidexa_clients'

// ── Lecture / écriture ───────────────────────────────────────────────────────

export function getClients(): Client[] {
  if (typeof window === 'undefined') return SEED
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED))
      return SEED
    }
    return JSON.parse(raw) as Client[]
  } catch { return SEED }
}

export function saveClients(data: Client[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(KEY, JSON.stringify(data))
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

/** Créer ou mettre à jour un client (upsert par id) */
export function upsertClient(client: Client): void {
  const all = getClients()
  const idx = all.findIndex(c => c.id === client.id)
  if (idx >= 0) all[idx] = client
  else all.push(client)
  saveClients(all)
}

/** Supprimer un client */
export function removeClient(id: string): void {
  saveClients(getClients().filter(c => c.id !== id))
}

/** Récupérer un client par id */
export function getClientById(id: string): Client | undefined {
  return getClients().find(c => c.id === id)
}

/** Recherche full-text (nom, ville, secteur, contacts) */
export function searchClients(query: string): Client[] {
  const q = query.toLowerCase()
  return getClients().filter(c =>
    c.nom.toLowerCase().includes(q) ||
    c.ville?.toLowerCase().includes(q) ||
    c.secteur?.toLowerCase().includes(q) ||
    c.contacts?.some(ct => ct.nom.toLowerCase().includes(q) || ct.email.toLowerCase().includes(q))
  )
}

/** Lier un projet à un client */
export function linkProjetToClient(clientId: string, projetId: string): void {
  const all = getClients()
  const idx = all.findIndex(c => c.id === clientId)
  if (idx === -1) return
  const ids = all[idx].projetsIds ?? []
  if (!ids.includes(projetId)) {
    all[idx].projetsIds = [...ids, projetId]
    saveClients(all)
  }
}

/** Lier une soumission à un client */
export function linkSoumissionToClient(clientId: string, soumissionId: string): void {
  const all = getClients()
  const idx = all.findIndex(c => c.id === clientId)
  if (idx === -1) return
  const ids = all[idx].soumissionsIds ?? []
  if (!ids.includes(soumissionId)) {
    all[idx].soumissionsIds = [...ids, soumissionId]
    saveClients(all)
  }
}

/** Mettre à jour les stats d'un client (totalContrats, tauxSucces, margemoyenne) */
export function updateClientStats(
  clientId: string,
  stats: Partial<Pick<Client, 'totalContrats' | 'tauxSucces' | 'margemoyenne'>>
): void {
  const all = getClients()
  const idx = all.findIndex(c => c.id === clientId)
  if (idx === -1) return
  all[idx] = { ...all[idx], ...stats }
  saveClients(all)
}

/** Générer un ID unique pour un nouveau client */
export function newClientId(): string {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}
