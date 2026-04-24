/**
 * Subscriptions Store — Bidexa SaaS
 * Gestion des tenants, abonnements et facturation
 */

export type ForfaitType = 'starter' | 'pro' | 'enterprise'
export type TenantStatut = 'actif' | 'suspendu' | 'annulé'

export interface Facture {
  id: string
  date: string
  montant: number
  statut: 'payée' | 'en_attente' | 'en_retard'
  periode: string
  rappels: { date: string; type: 'manuel' | 'automatique'; note?: string }[]
  dateEcheance?: string
}

export interface Tenant {
  id: string
  entreprise: string
  email: string
  forfait: ForfaitType
  statut: TenantStatut
  dateDebut: string
  dateRenouvellement: string
  mrr: number
  usageIA: { daily: number; monthly: number }
  iaExtra: number          // requêtes IA supplémentaires achetées
  nbUtilisateurs: number
  modules: string[]        // modules autorisés (hérités du forfait)
  paiement: {
    methode: 'carte' | 'virement' | null
    derniers4: string
    expiration: string
    titulaire: string
  }
  factures: Facture[]
  raisonAnnulation?: string
  dateAnnulation?: string
}

export interface ForfaitConfig {
  id: ForfaitType
  nom: string
  prix: number | null
  iaJour: number
  iaMois: number
  maxUtilisateurs: number | null
  features: string[]
  desc: string
  cta: string
  highlighted: boolean
  modules: string[]
}

// ── Labels de modules ─────────────────────────────────────────────────────────

export const ALL_MODULES_LABELS: Record<string, string> = {
  clients:       'Clients & CRM',
  estimation:    'Estimation',
  soumissions:   'Soumissions',
  concurrence:   'Concurrence',
  projets:       'Projets',
  'bons-commande': 'Bons de commande',
  fournisseurs:  'Fournisseurs',
  comptabilite:  'Comptabilité',
  documents:     'Documents',
  reporting:     'Reporting BI',
  ia:            'Intelligence IA',
}

export const ALL_MODULES_LIST = Object.keys(ALL_MODULES_LABELS)

// ── Configs forfaits ──────────────────────────────────────────────────────────

const FORFAITS_STORAGE_KEY = 'bidexa_forfaits_config'

const FORFAITS_DEFAULT: ForfaitConfig[] = [
  {
    id: 'starter',
    nom: 'Starter',
    prix: 49,
    iaJour: 20,
    iaMois: 200,
    maxUtilisateurs: 1,
    features: ['1 utilisateur', 'Clients & CRM', 'Soumissions & AO', 'Estimation de base', 'Documents', 'IA — 20 req/jour · 200/mois', 'Support email'],
    desc: 'Idéal pour les petites équipes',
    cta: 'Commencer',
    highlighted: false,
    modules: ['clients', 'estimation', 'soumissions', 'documents'],
  },
  {
    id: 'pro',
    nom: 'Pro',
    prix: 149,
    iaJour: 100,
    iaMois: 1000,
    maxUtilisateurs: 10,
    features: ['10 utilisateurs', 'Tout Starter inclus', 'Gestion de projets complète', 'Bons de commande & Fournisseurs', 'Comptabilité TPS/TVQ', 'Reporting BI avancé', 'IA — 100 req/jour · 1 000/mois', 'Support prioritaire'],
    desc: 'Pour les entreprises en croissance',
    cta: 'Essayer Pro',
    highlighted: true,
    modules: ['clients', 'estimation', 'soumissions', 'concurrence', 'projets', 'bons-commande', 'fournisseurs', 'comptabilite', 'documents', 'reporting'],
  },
  {
    id: 'enterprise',
    nom: 'Entreprise',
    prix: null,
    iaJour: 500,
    iaMois: 5000,
    maxUtilisateurs: null,
    features: ['Utilisateurs illimités', 'Tout Pro inclus', 'RBAC complet par module', 'Audit trail exportable', 'Sécurité multicouche renforcée', 'IA — 500 req/jour · 5 000/mois', 'Support dédié 24/7'],
    desc: 'Solution sur mesure à grande échelle',
    cta: 'Nous contacter',
    highlighted: false,
    modules: ['clients', 'estimation', 'soumissions', 'concurrence', 'projets', 'bons-commande', 'fournisseurs', 'comptabilite', 'documents', 'reporting', 'ia'],
  },
]

export function getForfaitsConfig(): ForfaitConfig[] {
  if (typeof window === 'undefined') return FORFAITS_DEFAULT
  try {
    const raw = localStorage.getItem(FORFAITS_STORAGE_KEY)
    if (!raw) return FORFAITS_DEFAULT
    const stored = JSON.parse(raw) as ForfaitConfig[]
    // Merge: keep stored values but fill missing fields from defaults
    return FORFAITS_DEFAULT.map(def => {
      const found = stored.find(s => s.id === def.id)
      if (!found) return def
      // Preserve default modules if stored record has none (migration guard)
      return {
        ...def,
        ...found,
        modules: (found.modules && found.modules.length > 0) ? found.modules : def.modules,
      }
    })
  } catch { return FORFAITS_DEFAULT }
}

export function upsertForfaitConfig(updated: ForfaitConfig): void {
  if (typeof window === 'undefined') return
  const all = getForfaitsConfig()
  const idx = all.findIndex(f => f.id === updated.id)
  if (idx >= 0) all[idx] = updated
  localStorage.setItem(FORFAITS_STORAGE_KEY, JSON.stringify(all))
}

export function resetForfaitConfig(id: ForfaitType): void {
  if (typeof window === 'undefined') return
  const all = getForfaitsConfig()
  const defVal = FORFAITS_DEFAULT.find(f => f.id === id)
  if (!defVal) return
  const idx = all.findIndex(f => f.id === id)
  if (idx >= 0) all[idx] = defVal
  localStorage.setItem(FORFAITS_STORAGE_KEY, JSON.stringify(all))
}

// Alias pour compatibilité avec le reste de l'app (valeur initiale SSR)
export const FORFAITS_CONFIG: ForfaitConfig[] = FORFAITS_DEFAULT

const KEY = 'bidexa_tenants'

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED: Tenant[] = [
  {
    id: 'tenant-001',
    entreprise: 'Bidexa',
    email: 'yghan61@gmail.com',
    forfait: 'enterprise',
    statut: 'actif',
    dateDebut: '2024-01-01',
    dateRenouvellement: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10),
    mrr: 0,
    usageIA: { daily: 3, monthly: 87 },
    iaExtra: 0,
    modules: FORFAITS_DEFAULT.find(f => f.id === 'enterprise')?.modules ?? [],
    nbUtilisateurs: 5,
    paiement: { methode: 'virement', derniers4: '', expiration: '', titulaire: 'Youne G.' },
    factures: [
      { id: 'inv-001', date: '2025-04-01', montant: 0, statut: 'payée', periode: 'Avril 2025', rappels: [], dateEcheance: '2025-04-15' },
      { id: 'inv-002', date: '2025-03-01', montant: 0, statut: 'payée', periode: 'Mars 2025', rappels: [], dateEcheance: '2025-03-15' },
    ],
  },
  {
    id: 'tenant-002',
    entreprise: 'Construction GT inc.',
    email: 'marc.tremblay@constructiongt.ca',
    forfait: 'pro',
    statut: 'actif',
    dateDebut: '2024-06-15',
    dateRenouvellement: new Date(new Date().setDate(new Date().getDate() + 12)).toISOString().slice(0, 10),
    mrr: 149,
    usageIA: { daily: 45, monthly: 780 },
    iaExtra: 0,
    modules: FORFAITS_DEFAULT.find(f => f.id === 'pro')?.modules ?? [],
    nbUtilisateurs: 7,
    paiement: { methode: 'carte', derniers4: '4242', expiration: '08/26', titulaire: 'Marc Tremblay' },
    factures: [
      { id: 'inv-003', date: '2025-04-01', montant: 149, statut: 'payée', periode: 'Avril 2025', rappels: [], dateEcheance: '2025-04-15' },
      { id: 'inv-004', date: '2025-03-01', montant: 149, statut: 'payée', periode: 'Mars 2025', rappels: [], dateEcheance: '2025-03-15' },
      { id: 'inv-005', date: '2025-02-01', montant: 149, statut: 'payée', periode: 'Février 2025', rappels: [], dateEcheance: '2025-02-15' },
    ],
  },
  {
    id: 'tenant-003',
    entreprise: 'Infratech Québec',
    email: 'sophie.lavoie@infratech.ca',
    forfait: 'pro',
    statut: 'actif',
    dateDebut: '2024-09-01',
    dateRenouvellement: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().slice(0, 10),
    mrr: 149,
    usageIA: { daily: 92, monthly: 920 },
    iaExtra: 0,
    modules: FORFAITS_DEFAULT.find(f => f.id === 'pro')?.modules ?? [],
    nbUtilisateurs: 9,
    paiement: { methode: 'carte', derniers4: '1234', expiration: '11/25', titulaire: 'Sophie Lavoie' },
    factures: [
      { id: 'inv-006', date: '2025-04-01', montant: 149, statut: 'en_attente', periode: 'Avril 2025', rappels: [{ date: '2025-04-10', type: 'automatique' }], dateEcheance: '2025-04-15' },
      { id: 'inv-007', date: '2025-03-01', montant: 149, statut: 'payée', periode: 'Mars 2025', rappels: [], dateEcheance: '2025-03-15' },
    ],
  },
  {
    id: 'tenant-004',
    entreprise: 'Construction Nordique',
    email: 'kevin.ouellet@nordique.ca',
    forfait: 'starter',
    statut: 'suspendu',
    dateDebut: '2024-11-01',
    dateRenouvellement: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString().slice(0, 10),
    mrr: 49,
    usageIA: { daily: 0, monthly: 0 },
    iaExtra: 0,
    modules: FORFAITS_DEFAULT.find(f => f.id === 'starter')?.modules ?? [],
    nbUtilisateurs: 1,
    paiement: { methode: 'carte', derniers4: '9876', expiration: '03/25', titulaire: 'Kevin Ouellet' },
    factures: [
      { id: 'inv-008', date: '2025-03-01', montant: 49, statut: 'en_retard', periode: 'Mars 2025', rappels: [{ date: '2025-03-16', type: 'automatique' }, { date: '2025-03-23', type: 'manuel', note: 'Appel téléphonique effectué' }], dateEcheance: '2025-03-15' },
      { id: 'inv-009', date: '2025-02-01', montant: 49, statut: 'payée', periode: 'Février 2025', rappels: [], dateEcheance: '2025-02-15' },
    ],
  },
  {
    id: 'tenant-005',
    entreprise: 'Gestion BM',
    email: 'b.morin@gestionbm.ca',
    forfait: 'starter',
    statut: 'annulé',
    dateDebut: '2024-03-01',
    dateRenouvellement: '2025-02-01',
    mrr: 0,
    usageIA: { daily: 0, monthly: 0 },
    iaExtra: 0,
    modules: FORFAITS_DEFAULT.find(f => f.id === 'starter')?.modules ?? [],
    nbUtilisateurs: 1,
    paiement: { methode: null, derniers4: '', expiration: '', titulaire: '' },
    factures: [
      { id: 'inv-010', date: '2025-01-01', montant: 49, statut: 'payée', periode: 'Janvier 2025', rappels: [], dateEcheance: '2025-01-15' },
    ],
    raisonAnnulation: 'Logiciel trop complet pour nos besoins actuels',
    dateAnnulation: '2025-02-01',
  },
]

// ── API ───────────────────────────────────────────────────────────────────────

export function getTenants(): Tenant[] {
  if (typeof window === 'undefined') return SEED
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED))
      return SEED
    }
    return JSON.parse(raw) as Tenant[]
  } catch { return SEED }
}

export function getTenantByEmail(email: string): Tenant | null {
  return getTenants().find(t => t.email.toLowerCase() === email.toLowerCase()) ?? null
}

export function upsertTenant(tenant: Tenant): void {
  if (typeof window === 'undefined') return
  const all = getTenants()
  const idx = all.findIndex(t => t.id === tenant.id)
  if (idx >= 0) all[idx] = tenant
  else all.push(tenant)
  localStorage.setItem(KEY, JSON.stringify(all))
}

/**
 * Crée un tenant à l'inscription.
 * Applique tous les paramètres du forfait choisi (modules, limites IA, etc.)
 */
export function createTenantForUser(params: {
  email: string
  entreprise: string
  forfait: ForfaitType
  paiement: Tenant['paiement']
}): Tenant {
  const cfg = getForfaitsConfig().find(f => f.id === params.forfait) ?? getForfaitsConfig()[0]
  const today = new Date().toISOString().slice(0, 10)
  const renouvellement = new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10)
  const tenant: Tenant = {
    id: `tenant-${Date.now()}`,
    entreprise: params.entreprise,
    email: params.email,
    forfait: params.forfait,
    statut: 'actif',
    dateDebut: today,
    dateRenouvellement: renouvellement,
    mrr: cfg.prix ?? 0,
    usageIA: { daily: 0, monthly: 0 },
    iaExtra: 0,
    modules: cfg.modules ?? [],
    nbUtilisateurs: 1,
    paiement: params.paiement,
    factures: cfg.prix ? [{
      id: `inv-${Date.now()}`,
      date: today,
      montant: cfg.prix,
      statut: 'en_attente' as const,
      periode: new Date().toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' }),
      rappels: [],
      dateEcheance: renouvellement,
    }] : [],
  }
  upsertTenant(tenant)
  return tenant
}

/** Ajoute des requêtes IA supplémentaires achetées */
export function addIaExtra(tenantId: string, qty: number): void {
  if (typeof window === 'undefined') return
  const all = getTenants()
  const t = all.find(t => t.id === tenantId)
  if (!t) return
  t.iaExtra = (t.iaExtra ?? 0) + qty
  // Enregistrer une facture pour l'achat
  const prix = qty <= 500 ? 9.99 : qty <= 2000 ? 29.99 : 59.99
  t.factures = t.factures ?? []
  t.factures.push({
    id: `inv-ia-${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    montant: prix,
    statut: 'payée',
    periode: `IA Extra — ${qty} req.`,
    rappels: [],
  })
  localStorage.setItem(KEY, JSON.stringify(all))
}

/** Met à jour le forfait ET les modules associés */
export function upgradePlanWithModules(tenantId: string, forfait: ForfaitType): void {
  if (typeof window === 'undefined') return
  const all = getTenants()
  const t = all.find(t => t.id === tenantId)
  if (!t) return
  const cfg = getForfaitsConfig().find(f => f.id === forfait)!
  t.forfait = forfait
  t.mrr = cfg.prix ?? 0
  t.statut = 'actif'
  t.modules = cfg.modules ?? []
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function suspendTenant(id: string): void {
  const all = getTenants()
  const t = all.find(t => t.id === id)
  if (!t) return
  t.statut = t.statut === 'suspendu' ? 'actif' : 'suspendu'
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function cancelTenant(id: string, raison?: string): void {
  const all = getTenants()
  const t = all.find(t => t.id === id)
  if (!t) return
  t.statut = 'annulé'
  t.mrr = 0
  t.raisonAnnulation = raison
  t.dateAnnulation = new Date().toISOString().slice(0, 10)
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function upgradePlan(id: string, forfait: ForfaitType): void {
  const all = getTenants()
  const t = all.find(t => t.id === id)
  if (!t) return
  const cfg = FORFAITS_CONFIG.find(f => f.id === forfait)!
  t.forfait = forfait
  t.mrr = cfg.prix ?? 0
  t.statut = 'actif'
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function updatePaiement(id: string, paiement: Tenant['paiement']): void {
  const all = getTenants()
  const t = all.find(t => t.id === id)
  if (!t) return
  t.paiement = paiement
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function getMRRTotal(): number {
  return getTenants().filter(t => t.statut === 'actif').reduce((s, t) => s + t.mrr, 0)
}

export function getAllFactures(): (Facture & { entreprise: string; tenantId: string })[] {
  return getTenants().flatMap(t =>
    t.factures.map(f => ({ ...f, entreprise: t.entreprise, tenantId: t.id }))
  ).sort((a, b) => b.date.localeCompare(a.date))
}

export function sendRappel(tenantId: string, factureId: string, type: 'manuel' | 'automatique', note?: string): void {
  if (typeof window === 'undefined') return
  const all = getTenants()
  const tenant = all.find(t => t.id === tenantId)
  if (!tenant) return
  const facture = tenant.factures.find(f => f.id === factureId)
  if (!facture) return
  if (!facture.rappels) facture.rappels = []
  facture.rappels.push({ date: new Date().toISOString().slice(0, 10), type, note })
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function markFacturePayee(tenantId: string, factureId: string): void {
  if (typeof window === 'undefined') return
  const all = getTenants()
  const tenant = all.find(t => t.id === tenantId)
  if (!tenant) return
  const facture = tenant.factures.find(f => f.id === factureId)
  if (!facture) return
  facture.statut = 'payée'
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function sendAllRappelsAuto(): number {
  if (typeof window === 'undefined') return 0
  const all = getTenants()
  let count = 0
  const today = new Date().toISOString().slice(0, 10)
  all.forEach(tenant => {
    tenant.factures.forEach(f => {
      if (f.statut !== 'payée') {
        if (!f.rappels) f.rappels = []
        const alreadyToday = f.rappels.some(r => r.date === today && r.type === 'automatique')
        if (!alreadyToday) {
          f.rappels.push({ date: today, type: 'automatique' })
          count++
        }
      }
    })
  })
  localStorage.setItem(KEY, JSON.stringify(all))
  return count
}

export function updateForfaitConfig(updates: Partial<ForfaitConfig>[]): void {
  updates.forEach(u => {
    const idx = FORFAITS_CONFIG.findIndex(f => f.id === u.id)
    if (idx >= 0) Object.assign(FORFAITS_CONFIG[idx], u)
  })
}

// ── Partenaires SaaS ──────────────────────────────────────────────────────────

export type PartnerCategorie = 'base_de_donnees' | 'ia' | 'hebergement' | 'stockage' | 'autre'

export interface SaasPartner {
  id: string
  nom: string
  categorie: PartnerCategorie
  fournisseur: string
  coutMensuel: number
  statut: 'actif' | 'inactif'
  dateDebut: string
  notes: string
}

const PARTNERS_KEY = 'bidexa_saas_partners'

const SEED_PARTNERS: SaasPartner[] = [
  { id: 'p-001', nom: 'Supabase', categorie: 'base_de_donnees', fournisseur: 'Supabase Inc.', coutMensuel: 25, statut: 'actif', dateDebut: '2024-01-01', notes: 'Base de données PostgreSQL + Auth' },
  { id: 'p-002', nom: 'OpenAI API', categorie: 'ia', fournisseur: 'OpenAI', coutMensuel: 120, statut: 'actif', dateDebut: '2024-01-01', notes: 'GPT-4o pour assistant IA dans les modules' },
  { id: 'p-003', nom: 'Vercel', categorie: 'hebergement', fournisseur: 'Vercel Inc.', coutMensuel: 20, statut: 'actif', dateDebut: '2024-01-01', notes: 'Hébergement Next.js + CDN' },
  { id: 'p-004', nom: 'AWS S3', categorie: 'stockage', fournisseur: 'Amazon Web Services', coutMensuel: 15, statut: 'actif', dateDebut: '2024-03-01', notes: 'Stockage documents et fichiers' },
]

export function getSaasPartners(): SaasPartner[] {
  if (typeof window === 'undefined') return SEED_PARTNERS
  try {
    const raw = localStorage.getItem(PARTNERS_KEY)
    if (!raw) { localStorage.setItem(PARTNERS_KEY, JSON.stringify(SEED_PARTNERS)); return SEED_PARTNERS }
    return JSON.parse(raw) as SaasPartner[]
  } catch { return SEED_PARTNERS }
}

export function upsertPartner(partner: SaasPartner): void {
  if (typeof window === 'undefined') return
  const all = getSaasPartners()
  const idx = all.findIndex(p => p.id === partner.id)
  if (idx >= 0) all[idx] = partner
  else all.push(partner)
  localStorage.setItem(PARTNERS_KEY, JSON.stringify(all))
}

export function togglePartner(id: string): void {
  const all = getSaasPartners()
  const p = all.find(p => p.id === id)
  if (!p) return
  p.statut = p.statut === 'actif' ? 'inactif' : 'actif'
  localStorage.setItem(PARTNERS_KEY, JSON.stringify(all))
}

export function getInfraCost(): number {
  return getSaasPartners().filter(p => p.statut === 'actif').reduce((s, p) => s + p.coutMensuel, 0)
}

// ── Support Tickets ───────────────────────────────────────────────────────────

export type TicketPriorite = 'basse' | 'normale' | 'haute' | 'urgente'
export type TicketStatut = 'ouvert' | 'en_cours' | 'résolu' | 'fermé'

export interface SupportTicket {
  id: string
  sujet: string
  client: string
  email: string
  priorite: TicketPriorite
  statut: TicketStatut
  dateCreation: string
  dateResolution?: string
  messages: string[]
  assigneA?: string
}

const TICKETS_KEY = 'bidexa_support_tickets'

const SEED_TICKETS: SupportTicket[] = [
  { id: 'tkt-001', sujet: 'Impossible de créer une estimation', client: 'Construction GT inc.', email: 'marc.tremblay@constructiongt.ca', priorite: 'haute', statut: 'ouvert', dateCreation: '2025-04-20', messages: ['Je clique sur "Nouvelle estimation" et rien ne se passe.'] },
  { id: 'tkt-002', sujet: 'Erreur lors de l\'export PDF d\'une soumission', client: 'Infratech Québec', email: 'sophie.lavoie@infratech.ca', priorite: 'normale', statut: 'en_cours', dateCreation: '2025-04-19', messages: ['PDF généré vide.', 'On investigue — équipe support'], assigneA: 'Support Bidexa' },
  { id: 'tkt-003', sujet: 'Demande d\'upgrade vers Enterprise', client: 'Construction GT inc.', email: 'marc.tremblay@constructiongt.ca', priorite: 'normale', statut: 'ouvert', dateCreation: '2025-04-18', messages: ['Nous souhaitons passer au plan Enterprise. Pouvez-vous nous envoyer un devis ?'] },
  { id: 'tkt-004', sujet: 'Quota IA épuisé avant la fin du mois', client: 'Infratech Québec', email: 'sophie.lavoie@infratech.ca', priorite: 'urgente', statut: 'ouvert', dateCreation: '2025-04-21', messages: ['Notre quota de 1000 req/mois est épuisé au 21 du mois. On a besoin d\'un accès étendu.'] },
  { id: 'tkt-005', sujet: 'Comment ajouter un deuxième utilisateur ?', client: 'Construction Nordique', email: 'kevin.ouellet@nordique.ca', priorite: 'basse', statut: 'résolu', dateCreation: '2025-04-10', dateResolution: '2025-04-11', messages: ['Comment ajouter un collègue ?', 'Le plan Starter est limité à 1 utilisateur. Veuillez upgrader vers Pro.'] },
  { id: 'tkt-006', sujet: 'Bug affichage tableau de bord mobile', client: 'Construction GT inc.', email: 'marc.tremblay@constructiongt.ca', priorite: 'basse', statut: 'fermé', dateCreation: '2025-04-05', dateResolution: '2025-04-08', messages: ['Tableau de bord illisible sur mobile.', 'Corrigé dans la version 1.2.3.'] },
]

export function getTickets(): SupportTicket[] {
  if (typeof window === 'undefined') return SEED_TICKETS
  try {
    const raw = localStorage.getItem(TICKETS_KEY)
    if (!raw) { localStorage.setItem(TICKETS_KEY, JSON.stringify(SEED_TICKETS)); return SEED_TICKETS }
    return JSON.parse(raw) as SupportTicket[]
  } catch { return SEED_TICKETS }
}

export function createTicket(ticket: Omit<SupportTicket, 'id' | 'dateCreation'>): SupportTicket {
  const all = getTickets()
  const newTicket: SupportTicket = {
    ...ticket,
    id: `tkt-${Date.now().toString(36)}`,
    dateCreation: new Date().toISOString().slice(0, 10),
  }
  all.push(newTicket)
  if (typeof window !== 'undefined') localStorage.setItem(TICKETS_KEY, JSON.stringify(all))
  return newTicket
}

export function updateTicket(id: string, updates: Partial<SupportTicket>): void {
  if (typeof window === 'undefined') return
  const all = getTickets()
  const idx = all.findIndex(t => t.id === id)
  if (idx < 0) return
  all[idx] = { ...all[idx], ...updates }
  if (updates.statut === 'résolu' || updates.statut === 'fermé') {
    all[idx].dateResolution = new Date().toISOString().slice(0, 10)
  }
  localStorage.setItem(TICKETS_KEY, JSON.stringify(all))
}

// ── Facturation partenaires ────────────────────────────────────────────────────

export interface PartnerFacture {
  id: string
  partnerId: string
  partnerNom: string
  date: string
  montant: number
  statut: 'payée' | 'en_attente' | 'en_retard'
  periode: string
  notes?: string
}

const PARTNER_FACTURES_KEY = 'bidexa_partner_factures'

const SEED_PARTNER_FACTURES: PartnerFacture[] = [
  { id: 'pf-001', partnerId: 'p-001', partnerNom: 'Supabase', date: '2025-04-01', montant: 25, statut: 'payée', periode: 'Avril 2025' },
  { id: 'pf-002', partnerId: 'p-002', partnerNom: 'OpenAI API', date: '2025-04-01', montant: 120, statut: 'payée', periode: 'Avril 2025' },
  { id: 'pf-003', partnerId: 'p-003', partnerNom: 'Vercel', date: '2025-04-01', montant: 20, statut: 'en_attente', periode: 'Avril 2025' },
  { id: 'pf-004', partnerId: 'p-004', partnerNom: 'AWS S3', date: '2025-04-01', montant: 15, statut: 'payée', periode: 'Avril 2025' },
  { id: 'pf-005', partnerId: 'p-001', partnerNom: 'Supabase', date: '2025-03-01', montant: 25, statut: 'payée', periode: 'Mars 2025' },
  { id: 'pf-006', partnerId: 'p-002', partnerNom: 'OpenAI API', date: '2025-03-01', montant: 98, statut: 'payée', periode: 'Mars 2025', notes: 'Usage variable selon requêtes IA' },
]

export function getPartnerFactures(partnerId?: string): PartnerFacture[] {
  if (typeof window === 'undefined') return partnerId ? SEED_PARTNER_FACTURES.filter(f => f.partnerId === partnerId) : SEED_PARTNER_FACTURES
  try {
    const raw = localStorage.getItem(PARTNER_FACTURES_KEY)
    const all: PartnerFacture[] = raw ? JSON.parse(raw) : (() => { localStorage.setItem(PARTNER_FACTURES_KEY, JSON.stringify(SEED_PARTNER_FACTURES)); return SEED_PARTNER_FACTURES })()
    return partnerId ? all.filter(f => f.partnerId === partnerId) : all
  } catch { return SEED_PARTNER_FACTURES }
}

export function addPartnerFacture(f: Omit<PartnerFacture, 'id'>): void {
  if (typeof window === 'undefined') return
  const all = getPartnerFactures()
  all.push({ ...f, id: `pf-${Date.now().toString(36)}` })
  localStorage.setItem(PARTNER_FACTURES_KEY, JSON.stringify(all))
}

export function updatePartnerFacture(id: string, updates: Partial<PartnerFacture>): void {
  if (typeof window === 'undefined') return
  const all = getPartnerFactures()
  const idx = all.findIndex(f => f.id === id)
  if (idx < 0) return
  all[idx] = { ...all[idx], ...updates }
  localStorage.setItem(PARTNER_FACTURES_KEY, JSON.stringify(all))
}

// ── Plans sur mesure ──────────────────────────────────────────────────────────

export interface CustomPlan {
  id: string
  nom: string
  secteur: string
  clientCible: string
  prix: number
  iaJour: number
  iaMois: number
  maxUtilisateurs: number | null
  features: string[]
  statut: 'actif' | 'brouillon' | 'archivé'
  dateCreation: string
  notes?: string
}

const CUSTOM_PLANS_KEY = 'bidexa_custom_plans'

const SEED_CUSTOM_PLANS: CustomPlan[] = [
  {
    id: 'cp-001', nom: 'Clinique Pro', secteur: 'Santé', clientCible: 'Cliniques médicales',
    prix: 89, iaJour: 50, iaMois: 500, maxUtilisateurs: 5,
    features: ['CRM patients', 'Gestion rendez-vous', 'Facturation RAMQ', 'Documents médicaux', 'IA 50 req/jour'],
    statut: 'brouillon', dateCreation: '2025-04-15', notes: 'Prototype en discussion avec 2 cliniques'
  },
]

export function getCustomPlans(): CustomPlan[] {
  if (typeof window === 'undefined') return SEED_CUSTOM_PLANS
  try {
    const raw = localStorage.getItem(CUSTOM_PLANS_KEY)
    if (!raw) { localStorage.setItem(CUSTOM_PLANS_KEY, JSON.stringify(SEED_CUSTOM_PLANS)); return SEED_CUSTOM_PLANS }
    return JSON.parse(raw) as CustomPlan[]
  } catch { return SEED_CUSTOM_PLANS }
}

export function upsertCustomPlan(plan: CustomPlan): void {
  if (typeof window === 'undefined') return
  const all = getCustomPlans()
  const idx = all.findIndex(p => p.id === plan.id)
  if (idx >= 0) all[idx] = plan
  else all.push(plan)
  localStorage.setItem(CUSTOM_PLANS_KEY, JSON.stringify(all))
}

export function deleteCustomPlan(id: string): void {
  if (typeof window === 'undefined') return
  const all = getCustomPlans().filter(p => p.id !== id)
  localStorage.setItem(CUSTOM_PLANS_KEY, JSON.stringify(all))
}
