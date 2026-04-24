/**
 * Store Fournisseurs — localStorage : bidexa_fournisseurs
 *
 * Étend le type Fournisseur de base avec :
 *  - Contacts multiples (nom, poste, email, tel, principal)
 *  - Comptes bancaires (institution, transit, compte, IBAN, Swift)
 *  - Conditions commerciales (paiement, devise, remise)
 *  - Documents (certificats, assurances, contrats)
 *  - Notes internes
 *  - Statut actif/inactif
 */

const KEY = 'bidexa_fournisseurs'

export interface FournisseurContact {
  id: string
  nom: string
  poste: string
  email: string
  tel: string
  mobile?: string
  principal: boolean
}

export interface CompteBancaire {
  id: string
  libelle: string           // ex : "Compte opérations", "Compte USD"
  institution: string       // ex : "Banque Nationale"
  transit: string
  noCompte: string
  iban?: string
  swift?: string
  devise: string            // CAD, USD, EUR…
  principal: boolean
}

export interface FournisseurDocument {
  id: string
  type: 'assurance' | 'certificat' | 'contrat' | 'autre'
  titre: string
  dateExpiration?: string
  notes?: string
  uploadedAt: string
}

export interface FournisseurNote {
  id: string
  date: string
  auteur: string
  texte: string
}

export interface FournisseurFull {
  id: string
  nom: string
  categorie: string
  adresse: string
  ville: string
  province: string
  codePostal?: string
  telephone?: string
  email?: string            // email général
  siteWeb?: string
  neq?: string              // Numéro d'entreprise du Québec
  noTPS?: string
  noTVQ?: string
  contacts: FournisseurContact[]
  comptesBancaires: CompteBancaire[]
  documents: FournisseurDocument[]
  notes: FournisseurNote[]
  scorePerformance: number  // 0–100
  scoreQualite?: number
  scorePonctualite?: number
  totalAchats: number       // chiffre d'affaires cumulé
  nombreCommandes: number
  delaiMoyen: number        // jours
  conditionsPaiement: string
  devise: string
  remise?: number           // % remise négociée
  actif: boolean
  favori: boolean
  createdAt: string
  updatedAt?: string
}

/* ─── Utilitaires ─────────────────────────────────────────────────────────── */
function uid() { return `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

/* ─── CRUD ────────────────────────────────────────────────────────────────── */
export function getFournisseurs(): FournisseurFull[] {
  if (typeof window === 'undefined') return buildSeeds()
  try {
    const raw = localStorage.getItem(KEY)
    const stored: FournisseurFull[] = raw ? JSON.parse(raw) : []
    if (stored.length === 0) {
      const seeds = buildSeeds()
      localStorage.setItem(KEY, JSON.stringify(seeds))
      return seeds
    }
    return stored
  } catch { return buildSeeds() }
}

export function saveFournisseurs(data: FournisseurFull[]): void {
  if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(data))
}

export function getFournisseurById(id: string): FournisseurFull | undefined {
  return getFournisseurs().find(f => f.id === id)
}

export function upsertFournisseur(f: FournisseurFull): void {
  const all = getFournisseurs()
  const idx = all.findIndex(x => x.id === f.id)
  const updated = { ...f, updatedAt: new Date().toISOString() }
  if (idx >= 0) all[idx] = updated
  else all.push(updated)
  saveFournisseurs(all)
}

export function removeFournisseur(id: string): void {
  saveFournisseurs(getFournisseurs().filter(f => f.id !== id))
}

/* ─── Helpers contacts / comptes ──────────────────────────────────────────── */
export function addContact(fId: string, c: Omit<FournisseurContact, 'id'>): void {
  const all = getFournisseurs()
  const idx = all.findIndex(f => f.id === fId)
  if (idx < 0) return
  all[idx].contacts.push({ ...c, id: uid() })
  saveFournisseurs(all)
}

export function removeContact(fId: string, cId: string): void {
  const all = getFournisseurs()
  const idx = all.findIndex(f => f.id === fId)
  if (idx < 0) return
  all[idx].contacts = all[idx].contacts.filter(c => c.id !== cId)
  saveFournisseurs(all)
}

export function addCompteBancaire(fId: string, cb: Omit<CompteBancaire, 'id'>): void {
  const all = getFournisseurs()
  const idx = all.findIndex(f => f.id === fId)
  if (idx < 0) return
  all[idx].comptesBancaires.push({ ...cb, id: uid() })
  saveFournisseurs(all)
}

export function removeCompteBancaire(fId: string, cbId: string): void {
  const all = getFournisseurs()
  const idx = all.findIndex(f => f.id === fId)
  if (idx < 0) return
  all[idx].comptesBancaires = all[idx].comptesBancaires.filter(c => c.id !== cbId)
  saveFournisseurs(all)
}

export function addNote(fId: string, texte: string, auteur: string): void {
  const all = getFournisseurs()
  const idx = all.findIndex(f => f.id === fId)
  if (idx < 0) return
  all[idx].notes.push({ id: uid(), date: new Date().toISOString(), auteur, texte })
  saveFournisseurs(all)
}

export function addDocument(fId: string, doc: Omit<FournisseurDocument, 'id' | 'uploadedAt'>): void {
  const all = getFournisseurs()
  const idx = all.findIndex(f => f.id === fId)
  if (idx < 0) return
  all[idx].documents.push({ ...doc, id: uid(), uploadedAt: new Date().toISOString() })
  saveFournisseurs(all)
}

/* ─── Stats depuis POs ────────────────────────────────────────────────────── */
export function calcFournisseurStats(fNom: string) {
  if (typeof window === 'undefined') return { totalAchats: 0, nombrePOs: 0, montantPaye: 0, arrerages: 0 }
  try {
    const raw = localStorage.getItem('bidexa_po_sync')
    const pos = raw ? JSON.parse(raw) : []
    const fPOs = pos.filter((p: { fournisseurNom: string }) => p.fournisseurNom === fNom)
    const totalAchats = fPOs.filter((p: { statut: string }) => p.statut !== 'brouillon').reduce((s: number, p: { montantTotal: number }) => s + p.montantTotal, 0)
    const montantPaye = fPOs.reduce((s: number, p: { montantPaye: number }) => s + (p.montantPaye ?? 0), 0)
    const arrerages = fPOs
      .filter((p: { statut: string; montantPaye: number; montantTotal: number }) =>
        (p.statut === 'recu' || p.statut === 'envoye') && p.montantPaye < p.montantTotal
      )
      .reduce((s: number, p: { montantTotal: number; montantPaye: number }) => s + (p.montantTotal - p.montantPaye), 0)
    return { totalAchats, nombrePOs: fPOs.length, montantPaye, arrerages }
  } catch { return { totalAchats: 0, nombrePOs: 0, montantPaye: 0, arrerages: 0 } }
}

/* ─── Seed data ───────────────────────────────────────────────────────────── */
function buildSeeds(): FournisseurFull[] {
  const make = (
    id: string, nom: string, categorie: string, adresse: string, ville: string, province: string,
    contacts: Omit<FournisseurContact, 'id'>[],
    score: number, totalAchats: number, nbCmds: number, delai: number,
    extras?: Partial<FournisseurFull>
  ): FournisseurFull => ({
    id, nom, categorie, adresse, ville, province, codePostal: '',
    telephone: contacts[0]?.tel ?? '',
    email: contacts[0]?.email ?? '',
    noTPS: '', noTVQ: '', neq: '', siteWeb: '',
    contacts: contacts.map((c, i) => ({ ...c, id: `${id}-c${i}`, principal: i === 0 })),
    comptesBancaires: [],
    documents: [],
    notes: [],
    scorePerformance: score,
    scoreQualite: score - 2 + Math.floor(Math.random() * 5),
    scorePonctualite: score - 3 + Math.floor(Math.random() * 6),
    totalAchats, nombreCommandes: nbCmds, delaiMoyen: delai,
    conditionsPaiement: 'Net 30 jours', devise: 'CAD', remise: 0,
    actif: true, favori: score >= 90,
    createdAt: '2021-01-01',
    ...extras,
  })

  return [
    make('f1', 'Béton Provincial Inc.', 'Béton et granulats',
      '1280 boul. Industriel', 'Gatineau', 'QC',
      [{ nom: 'Daniel Richer', poste: 'Directeur des ventes', email: 'd.richer@betonprovincial.ca', tel: '819-663-4411', principal: true }],
      88, 485000, 24, 2, { noTPS: '123456789 RT0001', noTVQ: '1234567890 TQ0001', neq: '1168765432', siteWeb: 'betonprovincial.ca',
        comptesBancaires: [{ id: 'f1-cb1', libelle: 'Compte principal', institution: 'Banque Nationale', transit: '06172', noCompte: '0034521', devise: 'CAD', principal: true }] }),

    make('f2', 'Aciers de construction Demers', 'Acier et métaux',
      '3400 rue Industrielle', 'Laval', 'QC',
      [{ nom: 'Louis Demers', poste: 'Propriétaire', email: 'l.demers@aciersdemers.ca', tel: '450-628-7200', principal: true },
       { nom: 'Patricia Demers', poste: 'Comptabilité', email: 'p.demers@aciersdemers.ca', tel: '450-628-7201', mobile: '514-555-0321', principal: false }],
      92, 312000, 18, 5, { favori: true, siteWeb: 'aciersdemers.ca' }),

    make('f3', 'Électrique Marchand & Frères', 'Électricité',
      '820 rue Principale', 'Hull', 'QC',
      [{ nom: 'Vincent Marchand', poste: 'VP opérations', email: 'v.marchand@electricmarchand.ca', tel: '819-777-2233', principal: true }],
      85, 228000, 12, 3),

    make('f4', 'Plomberie Industrielle Savard', 'Plomberie et mécanique',
      '555 rue Savard', 'Québec', 'QC',
      [{ nom: 'Caroline Savard', poste: 'Directrice générale', email: 'c.savard@plombsavard.ca', tel: '418-686-1122', principal: true }],
      79, 178000, 9, 7),

    make('f5', 'Excavations Fortier', 'Excavation et terrassement',
      '125 chemin de la Carrière', 'Pontiac', 'QC',
      [{ nom: 'Gaétan Fortier', poste: 'Propriétaire', email: 'g.fortier@excavfortier.ca', tel: '819-455-2888', principal: true },
       { nom: 'Marc Fortier', poste: 'Chef chantier', email: 'm.fortier@excavfortier.ca', tel: '819-455-2889', principal: false }],
      94, 395000, 21, 1, { favori: true }),

    make('f6', 'Tuyauterie Nord-Est', 'Tuyauterie industrielle',
      '2800 rue de la Rive', 'Lachute', 'QC',
      [{ nom: 'Sylvain Perron', poste: 'Directeur technique', email: 's.perron@tuyauteriene.ca', tel: '450-562-7733', principal: true }],
      81, 142000, 7, 8),

    make('f7', 'Menuiserie Pro Carpentier', 'Menuiserie et bois',
      '440 ave de la Station', 'Wakefield', 'QC',
      [{ nom: 'Jean-Guy Carpentier', poste: 'Maître menuisier', email: 'jg.carpentier@menuiseriecarp.ca', tel: '819-459-2200', principal: true }],
      76, 88000, 6, 4),

    make('f8', 'Location Équipements Bouchard', 'Location équipements',
      '1900 chemin Freeman', 'Gatineau', 'QC',
      [{ nom: 'Denis Bouchard', poste: 'Gestionnaire parc', email: 'd.bouchard@locationbouchard.ca', tel: '819-561-4400', principal: true }],
      90, 267000, 38, 1, { favori: true, remise: 5 }),

    make('f9', 'Isolation Thermax', 'Isolation et enveloppe',
      '3100 boul. des Entreprises', 'Terrebonne', 'QC',
      [{ nom: 'Annie Rousseau', poste: 'Représentante commerciale', email: 'a.rousseau@thermax.ca', tel: '450-492-5500', principal: true }],
      87, 156000, 11, 4),

    make('f10', 'Peinture & Revêtements Lafond', 'Peinture et revêtements',
      '88 rue Lafontaine', 'Ottawa', 'ON',
      [{ nom: 'Michel Lafond', poste: 'Directeur projets', email: 'm.lafond@peinturelafond.ca', tel: '613-744-3322', principal: true }],
      83, 94000, 15, 2),

    make('f11', 'Portes & Fenêtres Fenmaster', 'Menuiserie extérieure',
      '2200 boul. Industriel', 'Brossard', 'QC',
      [{ nom: 'Robert Lepage', poste: 'Directeur des ventes', email: 'r.lepage@fenmaster.ca', tel: '450-462-7890', principal: true }],
      88, 112000, 8, 10),

    make('f12', 'Soudures Industrielles Gagné', 'Soudure et métaux ouvrés',
      '650 rue des Forges', 'Trois-Rivières', 'QC',
      [{ nom: 'Simon Gagné', poste: 'Propriétaire', email: 's.gagne@souduresgagne.ca', tel: '819-374-5566', principal: true }],
      91, 204000, 14, 6, { favori: true }),
  ]
}
