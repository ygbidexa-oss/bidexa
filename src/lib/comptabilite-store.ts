/**
 * Store comptabilité professionnelle — PCGQ simplifié
 * Clés localStorage :
 *   bidexa_plan_comptable      → CompteComptable[]
 *   bidexa_ecritures           → EcritureComptable[]
 *   bidexa_depenses_directes   → DepenseDirecte[]
 *   bidexa_approbations        → DemandeApprobation[]
 */

import { calculerTaxes } from '@/lib/entreprise'

/* ═══════════════════════════ TYPES ═══════════════════════════ */

export interface CompteComptable {
  id: string
  code: string
  nom: string
  categorie: 'actif' | 'passif' | 'capitaux' | 'revenus' | 'depenses'
  sousCategorie: string
  projetId?: string
  projetTitre?: string
  budgetAlloue?: number
  actif: boolean
}

export interface LigneEcriture {
  id: string
  compteId: string
  compteCode: string
  compteNom: string
  debit: number
  credit: number
  description?: string
}

export interface EcritureComptable {
  id: string
  date: string
  numero: string
  description: string
  type: 'facture_client' | 'paiement_client' | 'facture_fournisseur'
      | 'paiement_fournisseur' | 'depense' | 'ajustement' | 'manuel'
  refId?: string
  refNumero?: string
  lignes: LigneEcriture[]
  statut: 'brouillon' | 'valide' | 'annule'
  creePar?: string
  validePar?: string
  createdAt: string
}

export interface DepenseDirecte {
  id: string
  compteId: string
  compteCode: string
  compteNom: string
  description: string
  fournisseurNom?: string
  projetId?: string
  projetTitre?: string
  montantHT: number
  tps: number
  tvq: number
  montantTotal: number
  date: string
  methode: 'virement' | 'cheque' | 'carte' | 'comptant'
  reference?: string
  statut: 'brouillon' | 'soumis' | 'approuve' | 'rejete' | 'paye'
  soumispar?: string
  approbateur?: string
  dateApprobation?: string
  commentaireRejet?: string
  createdAt: string
}

export interface DemandeApprobation {
  id: string
  type: 'depense_directe' | 'po' | 'facture_client' | 'ecriture'
  refId: string
  refNumero: string
  description: string
  montant: number
  projetTitre?: string
  fournisseurNom?: string
  soumispar: string
  datesoumission: string
  statut: 'en_attente' | 'approuve' | 'rejete'
  approbateur?: string
  dateDecision?: string
  commentaire?: string
  niveauApprobation: 1 | 2 | 3
  seuil: number
}

/* ═══════════════════════════ HELPERS ═══════════════════════════ */

function uid() { return `cpt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

export function niveauApprobation(montant: number): 1 | 2 | 3 {
  if (montant > 25000) return 3
  if (montant > 5000) return 2
  return 1
}

export function libelleNiveau(n: 1 | 2 | 3): string {
  if (n === 3) return 'Directeur général'
  if (n === 2) return 'Directeur'
  return 'Chef département'
}

function ecritureNumero(): string {
  const all = getEcritures()
  const year = new Date().getFullYear()
  const num = all.filter(e => e.numero.includes(String(year))).length + 1
  return `EC-${year}-${String(num).padStart(4, '0')}`
}

/* ═══════════════════════════ PLAN COMPTABLE ═══════════════════════════ */

const KEY_PLAN = 'bidexa_plan_comptable'

export function getComptesPlan(): CompteComptable[] {
  if (typeof window === 'undefined') return buildPlanSeed()
  try {
    const raw = localStorage.getItem(KEY_PLAN)
    const stored: CompteComptable[] = raw ? JSON.parse(raw) : []
    if (stored.length === 0) {
      const seeds = buildPlanSeed()
      localStorage.setItem(KEY_PLAN, JSON.stringify(seeds))
      return seeds
    }
    return stored
  } catch { return buildPlanSeed() }
}

export function saveComptesPlan(data: CompteComptable[]): void {
  if (typeof window !== 'undefined') localStorage.setItem(KEY_PLAN, JSON.stringify(data))
}

export function upsertComptePlan(c: CompteComptable): void {
  const all = getComptesPlan()
  const idx = all.findIndex(x => x.id === c.id)
  if (idx >= 0) all[idx] = c; else all.push(c)
  saveComptesPlan(all)
}

export function getComptePlanById(id: string): CompteComptable | undefined {
  return getComptesPlan().find(c => c.id === id)
}

/** Calcule le solde d'un compte à partir des écritures */
export function soldeDuCompte(compteId: string): number {
  const ecritures = getEcritures().filter(e => e.statut === 'valide')
  const compte = getComptePlanById(compteId)
  if (!compte) return 0
  let debit = 0, credit = 0
  for (const e of ecritures) {
    for (const l of e.lignes) {
      if (l.compteId === compteId) {
        debit += l.debit
        credit += l.credit
      }
    }
  }
  // Actif/Dépenses : solde = débit – crédit
  // Passif/Capitaux/Revenus : solde = crédit – débit
  if (compte.categorie === 'actif' || compte.categorie === 'depenses') return debit - credit
  return credit - debit
}

function buildPlanSeed(): CompteComptable[] {
  const mk = (
    id: string, code: string, nom: string,
    categorie: CompteComptable['categorie'], sousCategorie: string,
    budget?: number
  ): CompteComptable => ({ id, code, nom, categorie, sousCategorie, actif: true, budgetAlloue: budget })

  return [
    mk('c1010','1010','Encaisse — Opérations','actif','Encaisse'),
    mk('c1020','1020','Encaisse — Paie','actif','Encaisse'),
    mk('c1100','1100','Comptes clients','actif','Créances'),
    mk('c1200','1200','Revenus à recevoir','actif','Créances'),
    mk('c1500','1500','Immobilisations corporelles','actif','Immobilisations'),
    mk('c1510','1510','Amortissement cumulé','actif','Immobilisations'),
    mk('c2000','2000','Comptes fournisseurs','passif','Dettes d\'exploitation'),
    mk('c2100','2100','TPS à payer','passif','Taxes'),
    mk('c2110','2110','TVQ à payer','passif','Taxes'),
    mk('c2200','2200','Charges à payer','passif','Dettes d\'exploitation'),
    mk('c2500','2500','Emprunts bancaires','passif','Dettes financières'),
    mk('c3000','3000','Capital-actions','capitaux','Capitaux propres'),
    mk('c3100','3100','Bénéfices non répartis','capitaux','Capitaux propres'),
    mk('c4000','4000','Revenus de projets','revenus','Revenus d\'exploitation', 5000000),
    mk('c4100','4100','Revenus de services','revenus','Revenus d\'exploitation', 500000),
    mk('c4200','4200','Autres revenus','revenus','Autres revenus'),
    mk('c5100','5100','Main-d\'œuvre directe','depenses','Coûts directs', 800000),
    mk('c5200','5200','Matériaux et fournitures','depenses','Coûts directs', 1200000),
    mk('c5300','5300','Sous-traitance','depenses','Coûts directs', 1500000),
    mk('c5400','5400','Location équipements','depenses','Coûts directs', 400000),
    mk('c5500','5500','Frais de chantier','depenses','Coûts directs', 150000),
    mk('c6100','6100','Salaires — Administration','depenses','Frais généraux', 350000),
    mk('c6200','6200','Loyer et charges locatives','depenses','Frais généraux', 120000),
    mk('c6300','6300','Assurances','depenses','Frais généraux', 80000),
    mk('c6400','6400','Marketing et publicité','depenses','Frais généraux', 50000),
    mk('c6500','6500','Télécommunications','depenses','Frais généraux', 30000),
    mk('c6600','6600','Frais bancaires','depenses','Frais généraux', 15000),
    mk('c6700','6700','Frais généraux divers','depenses','Frais généraux', 60000),
    mk('c7000','7000','Amortissement','depenses','Amortissement', 80000),
    mk('c7100','7100','Intérêts sur emprunts','depenses','Charges financières', 25000),
  ]
}

/* ═══════════════════════════ ÉCRITURES ═══════════════════════════ */

const KEY_ECR = 'bidexa_ecritures'

export function getEcritures(): EcritureComptable[] {
  if (typeof window === 'undefined') return buildEcrituresSeed()
  try {
    const raw = localStorage.getItem(KEY_ECR)
    const stored: EcritureComptable[] = raw ? JSON.parse(raw) : []
    if (stored.length === 0) {
      const seeds = buildEcrituresSeed()
      localStorage.setItem(KEY_ECR, JSON.stringify(seeds))
      return seeds
    }
    return stored
  } catch { return buildEcrituresSeed() }
}

export function saveEcritures(data: EcritureComptable[]): void {
  if (typeof window !== 'undefined') localStorage.setItem(KEY_ECR, JSON.stringify(data))
}

export function upsertEcriture(e: EcritureComptable): void {
  const all = getEcritures()
  const idx = all.findIndex(x => x.id === e.id)
  if (idx >= 0) all[idx] = e; else all.push(e)
  saveEcritures(all)
}

export function validerEcriture(id: string, validePar: string): void {
  const all = getEcritures()
  const idx = all.findIndex(e => e.id === id)
  if (idx < 0) return
  all[idx].statut = 'valide'
  all[idx].validePar = validePar
  saveEcritures(all)
}

/** Génère et valide une écriture comptable automatique à partir d'une dépense approuvée */
export function genererEcritureDepense(d: DepenseDirecte): void {
  const e: EcritureComptable = {
    id: uid(),
    date: d.date,
    numero: ecritureNumero(),
    description: d.description,
    type: 'depense',
    refId: d.id,
    refNumero: d.reference,
    lignes: [
      { id: uid(), compteId: d.compteId, compteCode: d.compteCode, compteNom: d.compteNom, debit: d.montantHT, credit: 0, description: d.description },
      // TPS/TVQ à RÉCUPÉRER (crédit d'impôt intrant) — comptes d'actif, débités lors d'un achat
      { id: uid(), compteId: 'c1200', compteCode: '1200', compteNom: 'TPS à récupérer', debit: d.tps, credit: 0 },
      { id: uid(), compteId: 'c1210', compteCode: '1210', compteNom: 'TVQ à récupérer', debit: d.tvq, credit: 0 },
      { id: uid(), compteId: 'c2000', compteCode: '2000', compteNom: 'Comptes fournisseurs', debit: 0, credit: d.montantTotal },
    ],
    statut: 'valide',
    creePar: 'Système',
    validePar: d.approbateur,
    createdAt: new Date().toISOString(),
  }
  upsertEcriture(e)
}

export function genererEcritureFactureClient(
  facId: string, facNumero: string, description: string,
  montantHT: number, tps: number, tvq: number, total: number, date: string
): void {
  const e: EcritureComptable = {
    id: uid(),
    date,
    numero: ecritureNumero(),
    description: `Facture client ${facNumero} — ${description}`,
    type: 'facture_client',
    refId: facId,
    refNumero: facNumero,
    lignes: [
      { id: uid(), compteId: 'c1100', compteCode: '1100', compteNom: 'Comptes clients', debit: total, credit: 0 },
      { id: uid(), compteId: 'c4000', compteCode: '4000', compteNom: 'Revenus de projets', debit: 0, credit: montantHT },
      { id: uid(), compteId: 'c2100', compteCode: '2100', compteNom: 'TPS à payer', debit: 0, credit: tps },
      { id: uid(), compteId: 'c2110', compteCode: '2110', compteNom: 'TVQ à payer', debit: 0, credit: tvq },
    ],
    statut: 'valide',
    creePar: 'Système',
    createdAt: new Date().toISOString(),
  }
  upsertEcriture(e)
}

export function genererEcriturePaiementClient(
  facId: string, facNumero: string, montant: number, date: string
): void {
  const e: EcritureComptable = {
    id: uid(),
    date,
    numero: ecritureNumero(),
    description: `Paiement reçu — ${facNumero}`,
    type: 'paiement_client',
    refId: facId,
    refNumero: facNumero,
    lignes: [
      { id: uid(), compteId: 'c1010', compteCode: '1010', compteNom: 'Encaisse — Opérations', debit: montant, credit: 0 },
      { id: uid(), compteId: 'c1100', compteCode: '1100', compteNom: 'Comptes clients', debit: 0, credit: montant },
    ],
    statut: 'valide',
    creePar: 'Système',
    createdAt: new Date().toISOString(),
  }
  upsertEcriture(e)
}

function buildEcrituresSeed(): EcritureComptable[] {
  const mkLigne = (id: string, compteId: string, compteCode: string, compteNom: string, debit: number, credit: number): LigneEcriture =>
    ({ id, compteId, compteCode, compteNom, debit, credit })

  return [
    {
      id: 'ec001', date: '2024-03-15', numero: 'EC-2024-0001',
      description: 'Facture client FAC-2024-001 — Réfection Aylmer phase 1',
      type: 'facture_client', refId: 'fac001', refNumero: 'FAC-2024-001',
      lignes: [
        mkLigne('l1','c1100','1100','Comptes clients',286500,0),
        mkLigne('l2','c4000','4000','Revenus de projets',0,250000),
        mkLigne('l3','c2100','2100','TPS à payer',0,12500),
        mkLigne('l4','c2110','2110','TVQ à payer',0,24975),
      ],
      statut: 'valide', creePar: 'Système', validePar: 'Jean-Luc Côté', createdAt: '2024-03-15T08:00:00',
    },
    {
      id: 'ec002', date: '2024-03-28', numero: 'EC-2024-0002',
      description: 'Paiement reçu — FAC-2024-001',
      type: 'paiement_client', refId: 'fac001', refNumero: 'FAC-2024-001',
      lignes: [
        mkLigne('l5','c1010','1010','Encaisse — Opérations',286500,0),
        mkLigne('l6','c1100','1100','Comptes clients',0,286500),
      ],
      statut: 'valide', creePar: 'Système', validePar: 'Sophie Marchand', createdAt: '2024-03-28T09:00:00',
    },
    {
      id: 'ec003', date: '2024-04-01', numero: 'EC-2024-0003',
      description: 'Excavations Fortier — PO-2024-001',
      type: 'facture_fournisseur', refId: 'bc01', refNumero: 'PO-2024-001',
      lignes: [
        mkLigne('l7','c5300','5300','Sous-traitance',113220,0),
        mkLigne('l8','c2100','2100','TPS à payer',5661,0),
        mkLigne('l9','c2110','2110','TVQ à payer',11295,0),
        mkLigne('l10','c2000','2000','Comptes fournisseurs',0,130176),
      ],
      statut: 'valide', creePar: 'Système', validePar: 'Jean-Luc Côté', createdAt: '2024-04-01T08:00:00',
    },
    {
      id: 'ec004', date: '2024-04-15', numero: 'EC-2024-0004',
      description: 'Paiement fournisseur — PO-2024-001 Excavations Fortier',
      type: 'paiement_fournisseur', refId: 'bc01', refNumero: 'PO-2024-001',
      lignes: [
        mkLigne('l11','c2000','2000','Comptes fournisseurs',128000,0),
        mkLigne('l12','c1010','1010','Encaisse — Opérations',0,128000),
      ],
      statut: 'valide', creePar: 'Système', validePar: 'Sophie Marchand', createdAt: '2024-04-15T10:00:00',
    },
    {
      id: 'ec005', date: '2024-04-30', numero: 'EC-2024-0005',
      description: 'Dépense directe — Loyer bureau avril 2024',
      type: 'depense', refNumero: 'DEP-2024-001',
      lignes: [
        mkLigne('l13','c6200','6200','Loyer et charges locatives',8500,0),
        mkLigne('l14','c2100','2100','TPS à payer',425,0),
        mkLigne('l15','c2110','2110','TVQ à payer',848,0),
        mkLigne('l16','c2000','2000','Comptes fournisseurs',0,9773),
      ],
      statut: 'valide', creePar: 'Système', validePar: 'Sophie Marchand', createdAt: '2024-04-30T08:00:00',
    },
    {
      id: 'ec006', date: '2024-05-01', numero: 'EC-2024-0006',
      description: 'Facture client FAC-2024-002 — Agrandissement entrepôt phase 1',
      type: 'facture_client', refId: 'fac002', refNumero: 'FAC-2024-002',
      lignes: [
        mkLigne('l17','c1100','1100','Comptes clients',344190,0),
        mkLigne('l18','c4000','4000','Revenus de projets',0,300000),
        mkLigne('l19','c2100','2100','TPS à payer',0,15000),
        mkLigne('l20','c2110','2110','TVQ à payer',0,29925),
      ],
      statut: 'valide', creePar: 'Système', validePar: 'Jean-Luc Côté', createdAt: '2024-05-01T08:00:00',
    },
    {
      id: 'ec007', date: '2024-05-10', numero: 'EC-2024-0007',
      description: 'Salaires administration — Mai 2024',
      type: 'depense', refNumero: 'PAY-2024-05',
      lignes: [
        mkLigne('l21','c6100','6100','Salaires — Administration',28000,0),
        mkLigne('l22','c1010','1010','Encaisse — Opérations',0,28000),
      ],
      statut: 'valide', creePar: 'Système', validePar: 'Sophie Marchand', createdAt: '2024-05-10T08:00:00',
    },
    {
      id: 'ec008', date: '2024-05-20', numero: 'EC-2024-0008',
      description: 'Aciers Demers — PO-2024-003',
      type: 'facture_fournisseur', refId: 'bc03', refNumero: 'PO-2024-003',
      lignes: [
        mkLigne('l23','c5200','5200','Matériaux et fournitures',136700,0),
        mkLigne('l24','c2100','2100','TPS à payer',6835,0),
        mkLigne('l25','c2110','2110','TVQ à payer',13636,0),
        mkLigne('l26','c2000','2000','Comptes fournisseurs',0,157171),
      ],
      statut: 'valide', creePar: 'Système', createdAt: '2024-05-20T08:00:00',
    },
    {
      id: 'ec009', date: '2024-06-01', numero: 'EC-2024-0009',
      description: 'Facture client FAC-2024-003 — Maintenance HQ phase 1',
      type: 'facture_client', refId: 'fac003', refNumero: 'FAC-2024-003',
      lignes: [
        mkLigne('l27','c1100','1100','Comptes clients',229300,0),
        mkLigne('l28','c4000','4000','Revenus de projets',0,200000),
        mkLigne('l29','c2100','2100','TPS à payer',0,10000),
        mkLigne('l30','c2110','2110','TVQ à payer',0,19950),
      ],
      statut: 'valide', creePar: 'Système', createdAt: '2024-06-01T08:00:00',
    },
    {
      id: 'ec010', date: '2024-06-15', numero: 'EC-2024-0010',
      description: 'Assurances annuelles 2024',
      type: 'depense', refNumero: 'DEP-2024-010',
      lignes: [
        mkLigne('l31','c6300','6300','Assurances',18400,0),
        mkLigne('l32','c2100','2100','TPS à payer',920,0),
        mkLigne('l33','c2110','2110','TVQ à payer',1836,0),
        mkLigne('l34','c2000','2000','Comptes fournisseurs',0,21156),
      ],
      statut: 'valide', creePar: 'Système', validePar: 'Sophie Marchand', createdAt: '2024-06-15T08:00:00',
    },
    {
      id: 'ec011', date: '2024-06-30', numero: 'EC-2024-0011',
      description: 'Ajustement — Amortissement T2 2024',
      type: 'ajustement',
      lignes: [
        mkLigne('l35','c7000','7000','Amortissement',15000,0),
        mkLigne('l36','c1510','1510','Amortissement cumulé',0,15000),
      ],
      statut: 'valide', creePar: 'Sophie Marchand', validePar: 'Sophie Marchand', createdAt: '2024-06-30T17:00:00',
    },
  ]
}

/* ═══════════════════════════ DÉPENSES DIRECTES ═══════════════════════════ */

const KEY_DEP = 'bidexa_depenses_directes'

export function getDepensesDirectes(): DepenseDirecte[] {
  if (typeof window === 'undefined') return buildDepensesSeed()
  try {
    const raw = localStorage.getItem(KEY_DEP)
    const stored: DepenseDirecte[] = raw ? JSON.parse(raw) : []
    if (stored.length === 0) {
      const seeds = buildDepensesSeed()
      localStorage.setItem(KEY_DEP, JSON.stringify(seeds))
      return seeds
    }
    return stored
  } catch { return buildDepensesSeed() }
}

export function saveDepensesDirectes(data: DepenseDirecte[]): void {
  if (typeof window !== 'undefined') localStorage.setItem(KEY_DEP, JSON.stringify(data))
}

export function upsertDepense(d: DepenseDirecte): void {
  const all = getDepensesDirectes()
  const idx = all.findIndex(x => x.id === d.id)
  if (idx >= 0) all[idx] = d; else all.push(d)
  saveDepensesDirectes(all)
}

export function removeDepense(id: string): void {
  saveDepensesDirectes(getDepensesDirectes().filter(d => d.id !== id))
}

export function soumettrePourApprobation(depId: string, soumispar: string): void {
  const all = getDepensesDirectes()
  const idx = all.findIndex(d => d.id === depId)
  if (idx < 0) return
  all[idx].statut = 'soumis'
  all[idx].soumispar = soumispar
  saveDepensesDirectes(all)

  // Créer la demande d'approbation
  const d = all[idx]
  const niveau = niveauApprobation(d.montantTotal)
  const approbation: DemandeApprobation = {
    id: uid(),
    type: 'depense_directe',
    refId: d.id,
    refNumero: d.reference || d.id,
    description: d.description,
    montant: d.montantTotal,
    projetTitre: d.projetTitre,
    fournisseurNom: d.fournisseurNom,
    soumispar,
    datesoumission: new Date().toISOString().slice(0, 10),
    statut: 'en_attente',
    niveauApprobation: niveau,
    seuil: niveau === 3 ? 25000 : niveau === 2 ? 5000 : 0,
  }
  const approbations = getApprobations()
  approbations.push(approbation)
  saveApprobations(approbations)
}

export function approuverDepense(depId: string, approbateur: string, commentaire?: string): void {
  // Mise à jour dépense
  const deps = getDepensesDirectes()
  const idx = deps.findIndex(d => d.id === depId)
  if (idx >= 0) {
    deps[idx].statut = 'approuve'
    deps[idx].approbateur = approbateur
    deps[idx].dateApprobation = new Date().toISOString().slice(0, 10)
    saveDepensesDirectes(deps)
    // Générer écriture comptable
    genererEcritureDepense(deps[idx])
  }
  // Mise à jour demande approbation
  const apps = getApprobations()
  const ai = apps.findIndex(a => a.refId === depId && a.type === 'depense_directe')
  if (ai >= 0) {
    apps[ai].statut = 'approuve'
    apps[ai].approbateur = approbateur
    apps[ai].dateDecision = new Date().toISOString().slice(0, 10)
    apps[ai].commentaire = commentaire
    saveApprobations(apps)
  }
}

export function rejeterDepense(depId: string, approbateur: string, commentaire: string): void {
  const deps = getDepensesDirectes()
  const idx = deps.findIndex(d => d.id === depId)
  if (idx >= 0) {
    deps[idx].statut = 'rejete'
    deps[idx].commentaireRejet = commentaire
    saveDepensesDirectes(deps)
  }
  const apps = getApprobations()
  const ai = apps.findIndex(a => a.refId === depId && a.type === 'depense_directe')
  if (ai >= 0) {
    apps[ai].statut = 'rejete'
    apps[ai].approbateur = approbateur
    apps[ai].dateDecision = new Date().toISOString().slice(0, 10)
    apps[ai].commentaire = commentaire
    saveApprobations(apps)
  }
}

function buildDepensesSeed(): DepenseDirecte[] {
  const mk = (
    id: string, compteId: string, compteCode: string, compteNom: string,
    description: string, fournisseurNom: string, montantHT: number,
    date: string, methode: DepenseDirecte['methode'],
    statut: DepenseDirecte['statut'],
    projetTitre?: string, reference?: string, approbateur?: string
  ): DepenseDirecte => {
    const { tps, tvq, total } = calculerTaxes(montantHT)
    return {
      id, compteId, compteCode, compteNom, description, fournisseurNom,
      montantHT, tps, tvq, montantTotal: total,
      date, methode, reference, statut,
      soumispar: 'Patrick Blais', approbateur,
      dateApprobation: approbateur ? date : undefined,
      projetTitre,
      createdAt: date + 'T08:00:00',
    }
  }
  return [
    mk('d01','c6200','6200','Loyer et charges locatives','Loyer bureau Gatineau — Juillet 2024','Immobilière Gatineau inc.',8500,'2024-07-01','virement','paye',undefined,'DEP-2024-01','Sophie Marchand'),
    mk('d02','c6100','6100','Salaires — Administration','Salaires admin — Juin 2024','Paie interne',28000,'2024-06-30','virement','paye',undefined,'PAY-2024-06','Sophie Marchand'),
    mk('d03','c5500','5500','Frais de chantier','Fournitures chantier — Réfection Aylmer','Rona Pro',3840,'2024-04-15','carte','approuve','Réfection infrastructures routières — Aylmer','DEP-2024-03','Jean-Luc Côté'),
    mk('d04','c6400','6400','Marketing et publicité','Campagne LinkedIn Q2 2024','LinkedIn Corp.',6200,'2024-04-01','carte','approuve',undefined,'DEP-2024-04','Sophie Marchand'),
    mk('d05','c6500','6500','Télécommunications','Forfaits mobiles — Q2 2024','Telus',2160,'2024-04-01','virement','paye',undefined,'DEP-2024-05','Sophie Marchand'),
    mk('d06','c5400','5400','Location équipements','Location nacelle — Rénovation bureaux','Riwal Canada',12400,'2024-05-20','cheque','soumis','Rénovation tour de bureaux — 12 étages','DEP-2024-06'),
    mk('d07','c6700','6700','Frais généraux divers','Formation BIM — 3 employés','CEGEP outaouais',4500,'2024-06-10','cheque','soumis',undefined,'DEP-2024-07'),
    mk('d08','c5200','5200','Matériaux et fournitures','Matériaux Agrandissement entrepôt — extras','BMR Pro',31600,'2024-05-25','virement','soumis','Agrandissement entrepôt — Phase 2','DEP-2024-08'),
  ]
}

/* ═══════════════════════════ APPROBATIONS ═══════════════════════════ */

const KEY_APP = 'bidexa_approbations'

export function getApprobations(): DemandeApprobation[] {
  if (typeof window === 'undefined') return buildApprobationsSeed()
  try {
    const raw = localStorage.getItem(KEY_APP)
    const stored: DemandeApprobation[] = raw ? JSON.parse(raw) : []
    if (stored.length === 0) {
      const seeds = buildApprobationsSeed()
      localStorage.setItem(KEY_APP, JSON.stringify(seeds))
      return seeds
    }
    return stored
  } catch { return buildApprobationsSeed() }
}

export function saveApprobations(data: DemandeApprobation[]): void {
  if (typeof window !== 'undefined') localStorage.setItem(KEY_APP, JSON.stringify(data))
}

export function upsertApprobation(a: DemandeApprobation): void {
  const all = getApprobations()
  const idx = all.findIndex(x => x.id === a.id)
  if (idx >= 0) all[idx] = a; else all.push(a)
  saveApprobations(all)
}

function buildApprobationsSeed(): DemandeApprobation[] {
  return [
    {
      id: 'app01', type: 'depense_directe', refId: 'd06', refNumero: 'DEP-2024-06',
      description: 'Location nacelle — Rénovation tour de bureaux',
      montant: 14232.30, projetTitre: 'Rénovation tour de bureaux — 12 étages',
      fournisseurNom: 'Riwal Canada', soumispar: 'Patrick Blais',
      datesoumission: '2024-05-20', statut: 'en_attente',
      niveauApprobation: 2, seuil: 5000,
    },
    {
      id: 'app02', type: 'depense_directe', refId: 'd07', refNumero: 'DEP-2024-07',
      description: 'Formation BIM — 3 employés',
      montant: 5161.35, fournisseurNom: 'CEGEP outaouais', soumispar: 'Marie Tremblay',
      datesoumission: '2024-06-10', statut: 'en_attente',
      niveauApprobation: 1, seuil: 0,
    },
    {
      id: 'app03', type: 'depense_directe', refId: 'd08', refNumero: 'DEP-2024-08',
      description: 'Matériaux extras — Agrandissement entrepôt Phase 2',
      montant: 36250.70, projetTitre: 'Agrandissement entrepôt — Phase 2',
      fournisseurNom: 'BMR Pro', soumispar: 'Marie Tremblay',
      datesoumission: '2024-05-25', statut: 'en_attente',
      niveauApprobation: 3, seuil: 25000,
    },
    {
      id: 'app04', type: 'depense_directe', refId: 'd03', refNumero: 'DEP-2024-03',
      description: 'Fournitures chantier — Réfection Aylmer',
      montant: 4404.48, projetTitre: 'Réfection infrastructures routières — Aylmer',
      fournisseurNom: 'Rona Pro', soumispar: 'Patrick Blais',
      datesoumission: '2024-04-15', statut: 'approuve',
      approbateur: 'Jean-Luc Côté', dateDecision: '2024-04-16',
      niveauApprobation: 1, seuil: 0,
    },
    {
      id: 'app05', type: 'depense_directe', refId: 'd04', refNumero: 'DEP-2024-04',
      description: 'Campagne LinkedIn Q2 2024',
      montant: 7112.37, fournisseurNom: 'LinkedIn Corp.', soumispar: 'Marie Tremblay',
      datesoumission: '2024-04-01', statut: 'rejete',
      approbateur: 'Sophie Marchand', dateDecision: '2024-04-02',
      commentaire: 'Budget marketing 2024 épuisé. À soumettre à Q3.',
      niveauApprobation: 2, seuil: 5000,
    },
  ]
}
