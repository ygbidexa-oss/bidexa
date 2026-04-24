/**
 * Pont Bons de Commande ↔ Comptabilité ↔ Projets
 * Clé localStorage : bidexa_po_sync
 *
 * Flux :
 *  1. Acheteur crée PO → statut brouillon (bidexa_po_sync)
 *  2. Approbateur approuve → statut approuve → visible comptabilité comme dépense engagée
 *  3. Envoyé au fournisseur → statut envoye
 *  4. Réception confirmée → statut recu
 *  5. Paiement enregistré → montantPaye augmente
 *  6. Clôture → reliquat (montantTotal - montantPaye) libéré dans bidexa_projets
 */

import { calculerTaxes } from '@/lib/entreprise'

const KEY = 'bidexa_po_sync'

export interface POItem {
  id: string
  description: string
  reference?: string
  quantite: number
  unite: string
  prixUnitaire: number
}

export interface POPaiement {
  id: string
  date: string
  montant: number
  methode: string
  reference?: string
  note?: string
}

export interface POActionLog {
  date: string
  action: string
  par?: string
  note?: string
}

export interface POSync {
  id: string
  numero: string
  projetId: string
  projetTitre: string
  fournisseurId?: string
  fournisseurNom: string
  fournisseurEmail?: string
  dateEmission: string
  dateLivraison?: string
  montantHT: number
  tps: number
  tvq: number
  montantTotal: number
  montantPaye: number
  statut: 'brouillon' | 'approuve' | 'envoye' | 'recu' | 'ferme'
  approbateur?: string
  dateApprobation?: string
  conditionsPaiement: string
  adresseLivraison: string
  contactReception?: string
  conditionsGenerales?: string
  instructionsSpeciales?: string
  items: POItem[]
  paiements: POPaiement[]
  piecesJointes?: string[]
  notes?: string
  log: POActionLog[]
  createdAt: string
}

/* ── Numérotation auto ─────────────────────────────────────────────────────── */
export function genPONumero(): string {
  const all = getPOs()
  const year = new Date().getFullYear()
  const num = all.filter(p => p.numero.includes(String(year))).length + 1
  return `PO-${year}-${String(num).padStart(3, '0')}`
}

/* ── CRUD ──────────────────────────────────────────────────────────────────── */
export function getPOs(): POSync[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    const stored: POSync[] = raw ? JSON.parse(raw) : []
    // Seed avec mock-data si vide
    if (stored.length === 0) {
      const seeds = buildSeedPOs()
      localStorage.setItem(KEY, JSON.stringify(seeds))
      return seeds
    }
    return stored
  } catch { return [] }
}

export function savePOs(data: POSync[]): void {
  if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(data))
}

export function upsertPO(po: POSync): void {
  const all = getPOs()
  const idx = all.findIndex(x => x.id === po.id)
  if (idx >= 0) all[idx] = po
  else all.push(po)
  savePOs(all)
}

export function removePO(id: string): void {
  savePOs(getPOs().filter(p => p.id !== id))
}

export function getPOById(id: string): POSync | undefined {
  return getPOs().find(p => p.id === id)
}

/* ── Calculs ───────────────────────────────────────────────────────────────── */
export function calcPOTotaux(items: POItem[]): { sousTotal: number; tps: number; tvq: number; total: number } {
  const sousTotal = items.reduce((s, it) => s + it.quantite * it.prixUnitaire, 0)
  const taxes = calculerTaxes(sousTotal)
  return { sousTotal, tps: taxes.tps, tvq: taxes.tvq, total: taxes.total }
}

/* ── Workflow statuts ──────────────────────────────────────────────────────── */
export function approvePO(id: string, approbateur: string, note?: string): void {
  const all = getPOs()
  const idx = all.findIndex(p => p.id === id)
  if (idx < 0) return
  all[idx].statut = 'approuve'
  all[idx].approbateur = approbateur
  all[idx].dateApprobation = new Date().toISOString().slice(0, 10)
  all[idx].log = [...(all[idx].log ?? []), {
    date: new Date().toISOString(),
    action: 'Approuvé',
    par: approbateur,
    note,
  }]
  savePOs(all)

  // ── Écriture comptable automatique à l'approbation ──────────────────────
  const po = all[idx]
  try {
    const { genererEcritureDepense } = require('./comptabilite-store') as typeof import('./comptabilite-store')
    genererEcritureDepense({
      id: `dep-po-${po.id}`,
      description: `PO ${po.numero} — ${po.fournisseurNom}`,
      compteId: 'c5300',
      compteCode: '5300',
      compteNom: 'Sous-traitance / Achats',
      montantHT: po.montantHT,
      tps: po.tps,
      tvq: po.tvq,
      montantTotal: po.montantTotal,
      statut: 'approuve',
      date: new Date().toISOString(),
      projetId: po.projetId ?? '',
      fournisseurNom: po.fournisseurNom,
      methode: 'virement',
      createdAt: new Date().toISOString(),
    })
  } catch { /* silently ignore if comptabilite-store unavailable */ }
}

export function sendPO(id: string, par?: string): void {
  const all = getPOs()
  const idx = all.findIndex(p => p.id === id)
  if (idx < 0) return
  all[idx].statut = 'envoye'
  all[idx].log = [...(all[idx].log ?? []), {
    date: new Date().toISOString(),
    action: 'Envoyé au fournisseur',
    par,
  }]
  savePOs(all)
}

export function receivePO(id: string, par?: string, note?: string): void {
  const all = getPOs()
  const idx = all.findIndex(p => p.id === id)
  if (idx < 0) return
  all[idx].statut = 'recu'
  all[idx].log = [...(all[idx].log ?? []), {
    date: new Date().toISOString(),
    action: 'Réception confirmée',
    par,
    note,
  }]
  savePOs(all)
}

export function addPOPaiement(id: string, paiement: Omit<POPaiement, 'id'>): void {
  const all = getPOs()
  const idx = all.findIndex(p => p.id === id)
  if (idx < 0) return
  const newPay: POPaiement = { ...paiement, id: `pay-${Date.now()}` }
  all[idx].paiements = [...(all[idx].paiements ?? []), newPay]
  all[idx].montantPaye = all[idx].paiements.reduce((s, p) => s + p.montant, 0)
  all[idx].log = [...(all[idx].log ?? []), {
    date: new Date().toISOString(),
    action: `Paiement enregistré : ${paiement.montant.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}`,
    par: paiement.methode,
    note: paiement.reference,
  }]
  savePOs(all)
}

/**
 * Clôture le PO.
 * Si reliquat > 0, l'injecte dans bidexa_projets[projetId].budgetLibere
 */
export function closePO(id: string, par?: string): void {
  const all = getPOs()
  const idx = all.findIndex(p => p.id === id)
  if (idx < 0) return
  const po = all[idx]
  const reliquat = +(po.montantTotal - po.montantPaye).toFixed(2)
  po.statut = 'ferme'
  po.log = [...(po.log ?? []), {
    date: new Date().toISOString(),
    action: `PO clôturé — reliquat libéré : ${reliquat.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}`,
    par,
  }]
  savePOs(all)

  // Libérer le reliquat dans bidexa_projets
  if (reliquat > 0 && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('bidexa_projets')
      if (!raw) return
      const projets = JSON.parse(raw)
      for (const p of projets) {
        if (p.id === po.projetId) {
          p.budgetLibere = (p.budgetLibere ?? 0) + reliquat
          break
        }
      }
      localStorage.setItem('bidexa_projets', JSON.stringify(projets))
    } catch { /* silent */ }
  }
}

/* ── Seed mock data ────────────────────────────────────────────────────────── */
function buildSeedPOs(): POSync[] {
  const make = (
    id: string, numero: string, projetId: string, projetTitre: string,
    fournisseurNom: string, statut: POSync['statut'],
    items: POItem[], montantPaye: number,
    dateEmission: string, dateLivraison?: string,
    approbateur?: string
  ): POSync => {
    const { sousTotal, tps, tvq, total } = calcPOTotaux(items)
    const paiements: POPaiement[] = montantPaye > 0
      ? [{ id: `pay-seed-${id}`, date: dateEmission, montant: montantPaye, methode: 'virement', reference: 'VIR-SEED' }]
      : []
    const log: POActionLog[] = [{ date: dateEmission + 'T08:00:00', action: 'PO créé', par: 'Système' }]
    if (approbateur) log.push({ date: dateEmission + 'T10:00:00', action: 'Approuvé', par: approbateur })
    return {
      id, numero, projetId, projetTitre,
      fournisseurNom, dateEmission, dateLivraison,
      montantHT: sousTotal, tps, tvq, montantTotal: total, montantPaye,
      statut,
      approbateur: approbateur ?? undefined,
      dateApprobation: approbateur ? dateEmission : undefined,
      conditionsPaiement: 'Net 30 jours',
      adresseLivraison: '123 rue du Chantier, Gatineau QC J8P 1A1',
      conditionsGenerales: 'Travaux conformes aux plans et devis. Photos exigées après travaux.',
      items, paiements, log,
      createdAt: dateEmission + 'T07:00:00',
    }
  }

  return [
    make('bc01', 'PO-2024-001', 'p1', 'Réfection infrastructures routières — Aylmer',
      'Excavations Fortier', 'ferme',
      [
        { id: 'i1', description: 'Excavation et transport déblais', quantite: 4200, unite: 'm³', prixUnitaire: 28 },
        { id: 'i2', description: 'Remblayage sélectif', quantite: 2800, unite: 'm³', prixUnitaire: 11.43 },
      ], 128000, '2024-03-05', '2024-03-18', 'Jean-Luc Côté'),

    make('bc02', 'PO-2024-002', 'p1', 'Réfection infrastructures routières — Aylmer',
      'Béton Provincial Inc.', 'ferme',
      [{ id: 'i1', description: 'Béton 35 MPa livré chantier', quantite: 380, unite: 'm³', prixUnitaire: 250 }],
      95000, '2024-04-01', '2024-04-15', 'Jean-Luc Côté'),

    make('bc03', 'PO-2024-003', 'p2', 'Agrandissement entrepôt — Phase 2',
      'Aciers de construction Demers', 'recu',
      [
        { id: 'i1', description: 'Poutrelles IPE 200', quantite: 85, unite: 'unité', prixUnitaire: 980 },
        { id: 'i2', description: 'Colonnes HEB 200', quantite: 24, unite: 'unité', prixUnitaire: 1450 },
        { id: 'i3', description: 'Boulonnerie et plaques', quantite: 1, unite: 'forfait', prixUnitaire: 18080 },
      ], 0, '2024-04-10', '2024-05-02', 'Patrick Blais'),

    make('bc04', 'PO-2024-004', 'p2', 'Agrandissement entrepôt — Phase 2',
      'Isolation Thermax', 'approuve',
      [
        { id: 'i1', description: 'Membrane TPO 60 mil', quantite: 1200, unite: 'm²', prixUnitaire: 32 },
        { id: 'i2', description: 'Isolant rigide RSI-3.5', quantite: 1200, unite: 'm²', prixUnitaire: 16.33 },
      ], 0, '2024-05-15', undefined, 'Patrick Blais'),

    make('bc05', 'PO-2024-005', 'p1', 'Réfection infrastructures routières — Aylmer',
      'Location Équipements Bouchard', 'ferme',
      [
        { id: 'i1', description: 'Excavatrice 30T — 8 sem.', quantite: 8, unite: 'semaine', prixUnitaire: 3800 },
        { id: 'i2', description: 'Compacteur vibrant — 8 sem.', quantite: 8, unite: 'semaine', prixUnitaire: 1450 },
      ], 42000, '2024-03-01', '2024-03-02', 'Jean-Luc Côté'),

    make('bc06', 'PO-2024-006', 'p4', 'Maintenance préventive postes HQ',
      'Électrique Marchand & Frères', 'envoye',
      [
        { id: 'i1', description: 'Disjoncteurs MT 24 kV', quantite: 12, unite: 'unité', prixUnitaire: 4200 },
        { id: 'i2', description: 'Câbles HV 35 kV', quantite: 850, unite: 'm', prixUnitaire: 18 },
        { id: 'i3', description: 'Accessoires et consommables', quantite: 1, unite: 'forfait', prixUnitaire: 12700 },
      ], 0, '2024-05-05', undefined, 'Patrick Blais'),

    make('bc09', 'PO-2024-007', 'p5', 'Rénovation tour de bureaux — 12 étages',
      'Peinture & Revêtements Lafond', 'brouillon',
      [{ id: 'i1', description: 'Peinture murs et plafonds', quantite: 14400, unite: 'm²', prixUnitaire: 5.9 }],
      0, '2024-06-01'),

    make('bc10', 'PO-2024-008', 'p5', 'Rénovation tour de bureaux — 12 étages',
      'Menuiserie Pro Carpentier', 'brouillon',
      [
        { id: 'i1', description: 'Cloisons amovibles modulaires', quantite: 48, unite: 'section', prixUnitaire: 950 },
        { id: 'i2', description: 'Portes de bureau pleines', quantite: 48, unite: 'unité', prixUnitaire: 342 },
      ], 0, '2024-06-01'),
  ]
}
