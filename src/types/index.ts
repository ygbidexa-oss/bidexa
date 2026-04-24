// ===== CORE ENTITIES =====

export type ClientType = 'public' | 'prive'
export type ClientSector = 'municipal' | 'industriel' | 'commercial' | 'institutionnel' | 'residentiel'

export interface Contact {
  nom: string
  poste: string
  email: string
  tel: string
}

export interface Client {
  id: string
  nom: string
  type: ClientType
  secteur: ClientSector
  adresse: string
  ville: string
  province: string
  codePostal: string
  conditionsPaiement: string
  contacts: Contact[]
  createdAt: string
  projetsIds: string[]
  soumissionsIds: string[]
  totalContrats: number
  tauxSucces: number
  margemoyenne: number
}

// ===== SOUMISSIONS =====

export type SoumissionStatut =
  | 'brouillon'
  | 'en_preparation'
  | 'en_validation'
  | 'deposee'
  | 'gagnee'
  | 'perdue'
  | 'annulee'

export type SoumissionType =
  | 'appel_offre_public'
  | 'appel_offre_prive'
  | 'soumission_directe'
  | 'demande_de_prix'

export interface Document {
  id: string
  nom: string
  type: 'contrat' | 'plan' | 'facture' | 'soumission' | 'rapport' | 'addenda' | 'autre'
  moduleRef: string
  moduleId: string
  version: string
  taille: string
  createdAt: string
  uploadePar: string
}

export interface Soumission {
  id: string
  numero: string
  titre: string
  clientId: string
  clientNom: string
  type: SoumissionType
  statut: SoumissionStatut
  estimateurId: string
  estimateurNom: string
  dateReception: string
  dateDepot: string
  prixSoumis: number
  marge: number
  version: number
  description: string
  documents: Document[]
  checklist: ChecklistItem[]
  createdAt: string
}

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
}

// ===== ESTIMATION =====

export interface LigneCoût {
  id: string
  description: string
  mo: number
  materiaux: number
  equipement: number
  sousTraitance: number
  fraisIndirects: number
}

export interface SousPoste {
  id: string
  nom: string
  lignes: LigneCoût[]
}

export interface Poste {
  id: string
  nom: string
  sousPostes: SousPoste[]
}

export interface Estimation {
  id: string
  soumissionId?: string
  soumissionNumero?: string
  clientNom: string
  titre: string
  typeProjet?: string
  estimateurNom?: string
  version: number
  marge: number
  postes: Poste[]
  createdAt: string
  updatedAt: string
}

// ===== CONCURRENCE =====

export interface ResultatAO {
  id: string
  soumissionId: string
  soumissionNumero: string
  titre: string
  clientNom: string
  dateDepot: string
  resultat: 'gagne' | 'perdu'
  prixSoumis: number
  prixGagnant: number
  concurrentGagnant: string
  rang: number
  totalSoumissionnaires: number
  ecartPct: number
  estimateurNom: string
  raisons: string[]
}

// ===== PROJETS =====

export type ProjetStatut = 'planification' | 'en_cours' | 'suspendu' | 'termine' | 'annule'

export interface Tache {
  id: string
  titre: string
  responsable: string
  debut: string
  fin: string
  avancement: number
  statut: 'a_faire' | 'en_cours' | 'termine' | 'en_retard'
}

export interface OrdrChangement {
  id: string
  numero: string
  description: string
  montant: number
  statut: 'en_attente' | 'approuve' | 'refuse'
  date: string
}

export interface LigneJournal {
  id: string
  date: string
  auteur: string
  type: 'note' | 'changement' | 'incident' | 'avancement'
  contenu: string
}

export interface Projet {
  id: string
  numero: string
  titre: string
  clientId: string
  clientNom: string
  soumissionId: string
  statut: ProjetStatut
  chargeProjNom: string
  budgetInitial: number
  budgetActuel: number
  coutEngages: number
  avancement: number
  dateDebut: string
  dateFin: string
  description: string
  taches: Tache[]
  ordresChangement: OrdrChangement[]
  journal: LigneJournal[]
  equipe: string[]
}

// ===== FOURNISSEURS =====

export interface Fournisseur {
  id: string
  nom: string
  categorie: string
  adresse: string
  ville: string
  contacts: Contact[]
  scorePerformance: number
  totalAchats: number
  nombreCommandes: number
  delaiMoyen: number
  createdAt: string
}

// ===== BONS DE COMMANDE =====

export type BonCommandeStatut = 'brouillon' | 'approuve' | 'envoye' | 'recu' | 'ferme'

export interface ItemBC {
  id: string
  description: string
  quantite: number
  unite: string
  prixUnitaire: number
}

export interface BonCommande {
  id: string
  numero: string
  fournisseurId: string
  fournisseurNom: string
  projetId: string
  projetNom: string
  statut: BonCommandeStatut
  items: ItemBC[]
  montantTotal: number
  dateCreation: string
  dateReception?: string
  notes: string
}

// ===== COMPTABILITE =====

export type FactureStatut = 'brouillon' | 'envoyee' | 'partiellement_payee' | 'payee' | 'en_retard'

export interface Facture {
  id: string
  numero: string
  clientId: string
  clientNom: string
  projetId: string
  projetNom: string
  statut: FactureStatut
  montantHT: number
  tps: number
  tvq: number
  montantTotal: number
  dateEmission: string
  dateEcheance: string
  datePaiement?: string
  notes: string
}

export interface Paiement {
  id: string
  factureId: string
  factureNumero: string
  clientNom: string
  montant: number
  date: string
  methode: 'virement' | 'cheque' | 'carte'
  reference: string
}

export interface Depense {
  id: string
  description: string
  projetId: string
  projetNom: string
  categorie: string
  montant: number
  date: string
  fournisseurNom: string
  bonCommandeId?: string
}

export interface LigneCashflow {
  mois: string
  entrees: number
  sorties: number
  solde: number
  soldeCumulatif: number
}

// ===== IA =====

export interface MessageIA {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}
