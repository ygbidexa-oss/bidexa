/**
 * Pont de synchronisation Projets ↔ Comptabilité
 * Clé localStorage partagée : bidexa_factures_sync
 *
 * Flux :
 *  1. CP crée/modifie une facture dans /projets/[id] → écrit ici
 *  2. Comptable voit la facture dans /comptabilite → peut marquer payée
 *  3. Statut "payee" écrit ici + dans bidexa_projets → CP voit le paiement
 */

const KEY = 'bidexa_factures_sync'

export interface FactureSync {
  id: string               // même ID que dans ProjetPlus.factures
  projetId: string
  projetNumero: string
  projetTitre: string
  clientNom: string
  numero: string
  date: string
  description: string
  montantHT: number
  tps: number
  tvq: number
  montantTotal: number
  pctContrat: number
  pctAvancement: number
  statut: 'brouillon' | 'envoyee' | 'payee' | 'en_retard'
  datePaiement?: string
  notes?: string
}

export function getFacturesSync(): FactureSync[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveFacturesSync(data: FactureSync[]): void {
  if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(data))
}

/** Upsert : ajoute ou remplace la facture dans le pont */
export function upsertFactureSync(f: FactureSync): void {
  const all = getFacturesSync()
  const idx = all.findIndex(x => x.id === f.id)
  if (idx >= 0) all[idx] = f
  else all.push(f)
  saveFacturesSync(all)
}

/** Supprime une facture du pont */
export function removeFactureSync(id: string): void {
  saveFacturesSync(getFacturesSync().filter(f => f.id !== id))
}

/** Marque payée dans le pont ET met à jour bidexa_projets */
export function markFacturePaid(id: string, datePaiement: string, methode?: string): void {
  // 1. Mettre à jour le pont
  const all = getFacturesSync()
  const idx = all.findIndex(f => f.id === id)
  if (idx >= 0) {
    all[idx].statut = 'payee'
    all[idx].datePaiement = datePaiement
    saveFacturesSync(all)
  }

  // 2. Répercuter dans bidexa_projets
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem('bidexa_projets')
    if (!raw) return
    const projets = JSON.parse(raw)
    let changed = false
    for (const p of projets) {
      if (!p.factures) continue
      for (const f of p.factures) {
        if (f.id === id) {
          f.statut = 'payee'
          f.datePaiement = datePaiement
          changed = true
        }
      }
    }
    if (changed) localStorage.setItem('bidexa_projets', JSON.stringify(projets))
  } catch { /* silent */ }
}

/** Met à jour le statut dans le pont ET dans bidexa_projets */
export function updateFactureSyncStatut(id: string, statut: FactureSync['statut']): void {
  const all = getFacturesSync()
  const idx = all.findIndex(f => f.id === id)
  if (idx >= 0) {
    all[idx].statut = statut
    saveFacturesSync(all)
  }
  // Répercuter dans les projets
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem('bidexa_projets')
    if (!raw) return
    const projets = JSON.parse(raw)
    let changed = false
    for (const p of projets) {
      if (!p.factures) continue
      for (const f of p.factures) {
        if (f.id === id) { f.statut = statut; changed = true }
      }
    }
    if (changed) localStorage.setItem('bidexa_projets', JSON.stringify(projets))
  } catch { /* silent */ }
}
