/**
 * Store Documents centralisé — Bidexa
 * Clé localStorage : bidexa_documents
 */

export type DocType = 'contrat' | 'plan' | 'addenda' | 'soumission' | 'facture'
  | 'rapport' | 'estimation' | 'po' | 'assurance' | 'certif' | 'autre'

export type DocScope = 'projet' | 'soumission' | 'estimation' | 'fournisseur' | 'po' | 'facture' | 'entreprise'

export interface DocumentLien {
  type: DocScope
  refId: string
  refLabel: string
  dateCreation: string
}

export interface BidexaDocument {
  id: string
  nom: string
  type: DocType
  description?: string
  version: string
  taille?: string
  uploadePar: string
  createdAt: string
  modifiedAt?: string
  scope: DocScope
  liens: DocumentLien[]
  statut: 'actif' | 'archive' | 'remplace'
  remplacePar?: string
  confidentiel: boolean
  tags: string[]
}

const KEY = 'bidexa_documents'
function uid() { return `doc-${Date.now()}-${Math.random().toString(36).slice(2,6)}` }
function today() { return new Date().toISOString().slice(0,10) }

export function getDocuments(): BidexaDocument[] {
  if (typeof window === 'undefined') return buildSeed()
  try {
    const raw = localStorage.getItem(KEY)
    const stored: BidexaDocument[] = raw ? JSON.parse(raw) : []
    if (stored.length === 0) {
      const seed = buildSeed()
      localStorage.setItem(KEY, JSON.stringify(seed))
      return seed
    }
    return stored
  } catch { return buildSeed() }
}

export function saveDocuments(data: BidexaDocument[]) {
  if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(data))
}

export function upsertDocument(doc: BidexaDocument) {
  const all = getDocuments()
  const idx = all.findIndex(d => d.id === doc.id)
  if (idx >= 0) all[idx] = { ...doc, modifiedAt: today() }
  else all.push(doc)
  saveDocuments(all)
}

export function getDocumentsByLien(type: DocScope, refId: string): BidexaDocument[] {
  return getDocuments().filter(d => d.statut !== 'archive' && d.liens.some(l => l.type === type && l.refId === refId))
}

export function getDocumentsByScope(scope: DocScope): BidexaDocument[] {
  return getDocuments().filter(d => d.scope === scope)
}

export function addLien(docId: string, lien: DocumentLien) {
  const all = getDocuments()
  const idx = all.findIndex(d => d.id === docId)
  if (idx < 0) return
  const already = all[idx].liens.some(l => l.type === lien.type && l.refId === lien.refId)
  if (!already) all[idx].liens.push(lien)
  saveDocuments(all)
}

export function removeLien(docId: string, lienType: DocScope, refId: string) {
  const all = getDocuments()
  const idx = all.findIndex(d => d.id === docId)
  if (idx < 0) return
  all[idx].liens = all[idx].liens.filter(l => !(l.type === lienType && l.refId === refId))
  saveDocuments(all)
}

export function archiverDocument(docId: string) {
  const all = getDocuments()
  const idx = all.findIndex(d => d.id === docId)
  if (idx < 0) return
  all[idx].statut = 'archive'
  all[idx].modifiedAt = today()
  saveDocuments(all)
}

export function remplacerDocument(ancienId: string, nouveauDoc: Omit<BidexaDocument, 'id'>): string {
  const all = getDocuments()
  const ancIdx = all.findIndex(d => d.id === ancienId)
  const newId = uid()
  if (ancIdx >= 0) {
    all[ancIdx].statut = 'remplace'
    all[ancIdx].remplacePar = newId
    all[ancIdx].modifiedAt = today()
  }
  all.push({ ...nouveauDoc, id: newId })
  saveDocuments(all)
  return newId
}

export function searchDocuments(query: string): BidexaDocument[] {
  const q = query.toLowerCase()
  return getDocuments().filter(d =>
    d.nom.toLowerCase().includes(q) ||
    (d.description || '').toLowerCase().includes(q) ||
    d.tags.some(t => t.toLowerCase().includes(q)) ||
    d.uploadePar.toLowerCase().includes(q)
  )
}

// Auto-link: when a submission is won, copy its doc links to the project
export function lierDocumentsSoumissionAuProjet(soumissionId: string, projetId: string, projetLabel: string) {
  const docs = getDocumentsByLien('soumission', soumissionId)
  for (const doc of docs) {
    addLien(doc.id, { type: 'projet', refId: projetId, refLabel: projetLabel, dateCreation: today() })
  }
}

function lien(type: DocScope, refId: string, refLabel: string): DocumentLien {
  return { type, refId, refLabel, dateCreation: '2024-01-01' }
}

function buildSeed(): BidexaDocument[] {
  return [
    {
      id: 'doc01', nom: 'Contrat principal — Ville de Gatineau.pdf',
      type: 'contrat', version: '1.0', taille: '2.4 MB', uploadePar: 'Admin',
      createdAt: '2024-03-01', scope: 'projet', statut: 'actif', confidentiel: false,
      tags: ['gatineau', 'contrat', 'aylmer'],
      description: 'Contrat principal pour les travaux de réfection routière',
      liens: [lien('projet','p1','Réfection routière — Aylmer'), lien('soumission','s1','AO-2024-001')],
    },
    {
      id: 'doc02', nom: 'Plans routiers — Aylmer — Rev3.pdf',
      type: 'plan', version: '3.0', taille: '18.7 MB', uploadePar: 'Jean-Baptiste Côté',
      createdAt: '2024-02-10', scope: 'soumission', statut: 'actif', confidentiel: false,
      tags: ['plans', 'aylmer', 'routier'],
      description: 'Plans et devis techniques — révision 3',
      liens: [lien('soumission','s1','AO-2024-001'), lien('projet','p1','Réfection routière — Aylmer'), lien('estimation','e1','Estimation Aylmer')],
    },
    {
      id: 'doc03', nom: 'Addenda #1 — AO-2024-001.pdf',
      type: 'addenda', version: '1.0', taille: '1.2 MB', uploadePar: 'Marie-Josée Langlois',
      createdAt: '2024-02-01', scope: 'soumission', statut: 'actif', confidentiel: false,
      tags: ['addenda', 'ao-2024-001'],
      liens: [lien('soumission','s1','AO-2024-001')],
    },
    {
      id: 'doc04', nom: 'Rapport inspection sol — zone A.pdf',
      type: 'rapport', version: '1.0', taille: '5.8 MB', uploadePar: 'Martin Beaupré',
      createdAt: '2024-04-23', scope: 'projet', statut: 'actif', confidentiel: false,
      tags: ['sol', 'inspection', 'aylmer'],
      liens: [lien('projet','p1','Réfection routière — Aylmer')],
    },
    {
      id: 'doc05', nom: 'FAC-2024-001 — Ville de Gatineau.pdf',
      type: 'facture', version: '1.0', taille: '0.8 MB', uploadePar: 'Comptable',
      createdAt: '2024-04-30', scope: 'facture', statut: 'actif', confidentiel: false,
      tags: ['facture', 'gatineau'],
      liens: [lien('facture','fac001','FAC-2024-001'), lien('projet','p1','Réfection routière — Aylmer')],
    },
    {
      id: 'doc06', nom: 'Soumission AO-2024-001 finale.pdf',
      type: 'soumission', version: '3.0', taille: '4.2 MB', uploadePar: 'Jean-Baptiste Côté',
      createdAt: '2024-02-20', scope: 'soumission', statut: 'actif', confidentiel: false,
      tags: ['soumission', 'ao-2024-001', 'finale'],
      liens: [lien('soumission','s1','AO-2024-001'), lien('projet','p1','Réfection routière — Aylmer')],
    },
    {
      id: 'doc07', nom: 'Contrat Gervais — Agrandissement.pdf',
      type: 'contrat', version: '1.0', taille: '1.9 MB', uploadePar: 'Admin',
      createdAt: '2024-04-01', scope: 'projet', statut: 'actif', confidentiel: false,
      tags: ['gervais', 'agrandissement', 'contrat'],
      liens: [lien('projet','p2','Agrandissement entrepôt — Phase 2'), lien('soumission','s2','AO-2024-002')],
    },
    {
      id: 'doc08', nom: 'Plans entrepôt — Structure acier.pdf',
      type: 'plan', version: '2.0', taille: '8.1 MB', uploadePar: 'Sandra Ouellet',
      createdAt: '2024-02-02', scope: 'soumission', statut: 'actif', confidentiel: false,
      tags: ['plans', 'acier', 'entrepôt'],
      liens: [lien('soumission','s2','AO-2024-002'), lien('estimation','e2','Estimation entrepôt')],
    },
    {
      id: 'doc09', nom: 'Cahier des charges HQ — Maintenance.pdf',
      type: 'plan', version: '1.0', taille: '12.7 MB', uploadePar: 'Sophie Tremblay',
      createdAt: '2024-03-11', scope: 'soumission', statut: 'actif', confidentiel: false,
      tags: ['hq', 'maintenance', 'cahier-charges'],
      liens: [lien('soumission','s3','AO-2024-003')],
    },
    {
      id: 'doc10', nom: 'Contrat HQ — Maintenance 3 ans.pdf',
      type: 'contrat', version: '1.0', taille: '3.5 MB', uploadePar: 'Admin',
      createdAt: '2024-05-01', scope: 'projet', statut: 'actif', confidentiel: true,
      tags: ['hq', 'maintenance', 'contrat'],
      liens: [lien('projet','p4','Maintenance HQ'), lien('soumission','s3','AO-2024-003')],
    },
    {
      id: 'doc11', nom: 'Rapport fin de projet — Aqueduc Masson.pdf',
      type: 'rapport', version: '1.0', taille: '7.2 MB', uploadePar: 'Martin Beaupré',
      createdAt: '2024-02-10', scope: 'projet', statut: 'actif', confidentiel: false,
      tags: ['aqueduc', 'masson', 'rapport-final'],
      liens: [lien('projet','p3','Rénovation aqueduc — Masson')],
    },
    {
      id: 'doc12', nom: 'FAC-2023-021 — Facture finale aqueduc.pdf',
      type: 'facture', version: '1.0', taille: '0.9 MB', uploadePar: 'Comptable',
      createdAt: '2024-02-28', scope: 'facture', statut: 'actif', confidentiel: false,
      tags: ['facture', 'aqueduc'],
      liens: [lien('facture','fac007','FAC-2023-021'), lien('projet','p3','Rénovation aqueduc — Masson')],
    },
    {
      id: 'doc13', nom: 'Plans architecturaux — Centre communautaire.pdf',
      type: 'plan', version: '1.0', taille: '22.4 MB', uploadePar: 'Jean-Baptiste Côté',
      createdAt: '2024-04-02', scope: 'soumission', statut: 'actif', confidentiel: false,
      tags: ['centre-communautaire', 'plans', 'architecture'],
      liens: [lien('soumission','s5','AO-2024-005')],
    },
    {
      id: 'doc14', nom: 'Soumission AO-2024-003 finale.pdf',
      type: 'soumission', version: '1.0', taille: '3.8 MB', uploadePar: 'Jean-Baptiste Côté',
      createdAt: '2024-04-14', scope: 'soumission', statut: 'actif', confidentiel: false,
      tags: ['soumission', 'ao-2024-003'],
      liens: [lien('soumission','s3','AO-2024-003'), lien('projet','p4','Maintenance HQ')],
    },
    {
      id: 'doc15', nom: 'Certificat assurances 2024.pdf',
      type: 'assurance', version: '1.0', taille: '0.5 MB', uploadePar: 'Admin',
      createdAt: '2024-01-15', scope: 'entreprise', statut: 'actif', confidentiel: false,
      tags: ['assurances', 'certificat', '2024'],
      liens: [lien('entreprise','global','Bidexa Construction')],
    },
    {
      id: 'doc16', nom: 'Rapport avancement mai 2024 — Aylmer.pdf',
      type: 'rapport', version: '1.0', taille: '4.1 MB', uploadePar: 'Martin Beaupré',
      createdAt: '2024-05-31', scope: 'projet', statut: 'actif', confidentiel: false,
      tags: ['avancement', 'aylmer', 'mai-2024'],
      liens: [lien('projet','p1','Réfection routière — Aylmer')],
    },
    {
      id: 'doc17', nom: 'Contrat pont Pontiac — Sauvage.pdf',
      type: 'contrat', version: '1.0', taille: '1.7 MB', uploadePar: 'Admin',
      createdAt: '2024-04-15', scope: 'projet', statut: 'actif', confidentiel: false,
      tags: ['pont', 'pontiac'],
      liens: [lien('projet','p6','Réfection pont — Pontiac')],
    },
    {
      id: 'doc18', nom: 'Plans pont — Tablier remplacement.pdf',
      type: 'plan', version: '2.0', taille: '9.3 MB', uploadePar: 'Martin Beaupré',
      createdAt: '2024-03-20', scope: 'projet', statut: 'actif', confidentiel: false,
      tags: ['pont', 'tablier', 'plans'],
      liens: [lien('projet','p6','Réfection pont — Pontiac')],
    },
    // Additional seed docs
    {
      id: 'doc19', nom: 'Politique santé-sécurité 2024.pdf',
      type: 'autre', version: '2.0', taille: '1.1 MB', uploadePar: 'Admin',
      createdAt: '2024-01-10', scope: 'entreprise', statut: 'actif', confidentiel: false,
      tags: ['politique', 'sst', 'entreprise'],
      description: 'Politique de santé et sécurité au travail',
      liens: [lien('entreprise','global','Bidexa Construction')],
    },
    {
      id: 'doc20', nom: 'Licence RBQ — 2024.pdf',
      type: 'certif', version: '1.0', taille: '0.4 MB', uploadePar: 'Admin',
      createdAt: '2024-01-05', scope: 'entreprise', statut: 'actif', confidentiel: false,
      tags: ['rbq', 'licence', 'certification'],
      liens: [lien('entreprise','global','Bidexa Construction')],
    },
    {
      id: 'doc21', nom: 'Estimation détaillée — Réfection Aylmer.xlsx',
      type: 'estimation', version: '3.0', taille: '2.8 MB', uploadePar: 'Jean-Baptiste Côté',
      createdAt: '2024-02-05', scope: 'estimation', statut: 'actif', confidentiel: false,
      tags: ['estimation', 'aylmer', 'detail'],
      liens: [lien('estimation','e1','Estimation Aylmer'), lien('soumission','s1','AO-2024-001')],
    },
    {
      id: 'doc22', nom: 'PO-2024-001 — Excavations Fortier.pdf',
      type: 'po', version: '1.0', taille: '0.6 MB', uploadePar: 'Patrick Blais',
      createdAt: '2024-03-20', scope: 'po', statut: 'actif', confidentiel: false,
      tags: ['po', 'fortier', 'excavation'],
      liens: [lien('po','bc01','PO-2024-001'), lien('fournisseur','f1','Excavations Fortier'), lien('projet','p1','Réfection routière — Aylmer')],
    },
    {
      id: 'doc23', nom: 'Contrat cadre — Aciers Demers.pdf',
      type: 'contrat', version: '1.0', taille: '1.4 MB', uploadePar: 'Admin',
      createdAt: '2024-01-20', scope: 'fournisseur', statut: 'archive', confidentiel: false,
      tags: ['contrat', 'aciers', 'demers'],
      liens: [lien('fournisseur','f2','Aciers Demers')],
    },
  ]
}
