import type { Facture, Paiement, Depense, LigneCashflow } from '@/types'

export const factures: Facture[] = [
  { id: 'fac01', numero: 'FAC-2024-001', clientId: 'c1', clientNom: 'Ville de Gatineau', projetId: 'p1', projetNom: 'Réfection infrastructures routières — Aylmer', statut: 'partiellement_payee', montantHT: 550000, tps: 27500, tvq: 54872.5, montantTotal: 632372.5, dateEmission: '2024-04-30', dateEcheance: '2024-05-30', notes: 'Facture avancement 30%' },
  { id: 'fac02', numero: 'FAC-2024-002', clientId: 'c2', clientNom: 'Construction Gervais & Fils', projetId: 'p2', projetNom: 'Agrandissement entrepôt — Phase 2', statut: 'payee', montantHT: 194400, tps: 9720, tvq: 19391.76, montantTotal: 223511.76, dateEmission: '2024-04-15', dateEcheance: '2024-05-30', datePaiement: '2024-05-12', notes: 'Avancement fondations + dalle' },
  { id: 'fac03', numero: 'FAC-2024-003', clientId: 'c3', clientNom: 'Hydro-Québec', projetId: 'p4', projetNom: 'Maintenance préventive postes HQ', statut: 'envoyee', montantHT: 195000, tps: 9750, tvq: 19451.25, montantTotal: 224201.25, dateEmission: '2024-05-31', dateEcheance: '2024-07-30', notes: 'Mois 1 — inspections initiales' },
  { id: 'fac04', numero: 'FAC-2024-004', clientId: 'c5', clientNom: 'Municipalité de Pontiac', projetId: 'p6', projetNom: 'Réfection pont — rang du Sauvage', statut: 'payee', montantHT: 116100, tps: 5805, tvq: 11582.37, montantTotal: 133487.37, dateEmission: '2024-05-15', dateEcheance: '2024-06-14', datePaiement: '2024-06-08', notes: 'Avancement 30% — démolition complète' },
  { id: 'fac05', numero: 'FAC-2024-005', clientId: 'c1', clientNom: 'Ville de Gatineau', projetId: 'p1', projetNom: 'Réfection infrastructures routières — Aylmer', statut: 'en_retard', montantHT: 370000, tps: 18500, tvq: 36924.5, montantTotal: 425424.5, dateEmission: '2024-05-31', dateEcheance: '2024-06-30', notes: 'Avancement 50% — réseau aqueduc' },
  { id: 'fac06', numero: 'FAC-2024-006', clientId: 'c7', clientNom: 'Groupe Immobilier Alliance', projetId: 'p5', projetNom: 'Rénovation tour de bureaux — 12 étages', statut: 'brouillon', montantHT: 81000, tps: 4050, tvq: 8083.35, montantTotal: 93133.35, dateEmission: '2024-06-30', dateEcheance: '2024-07-30', notes: 'Mobilisation + plans 5%' },
  { id: 'fac07', numero: 'FAC-2023-021', clientId: 'c1', clientNom: 'Ville de Gatineau', projetId: 'p3', projetNom: 'Aqueduc — secteur Masson-Angers', statut: 'payee', montantHT: 1140000, tps: 57000, tvq: 113741.5, montantTotal: 1310741.5, dateEmission: '2024-02-28', dateEcheance: '2024-03-31', datePaiement: '2024-03-28', notes: 'Facture finale' },
  { id: 'fac08', numero: 'FAC-2024-008', clientId: 'c5', clientNom: 'Municipalité de Pontiac', projetId: 'p6', projetNom: 'Réfection pont — rang du Sauvage', statut: 'envoyee', montantHT: 77400, tps: 3870, tvq: 7718.46, montantTotal: 88988.46, dateEmission: '2024-06-20', dateEcheance: '2024-07-20', notes: 'Avancement 50% — culées réparées' },
]

export const paiements: Paiement[] = [
  { id: 'pay01', factureId: 'fac01', factureNumero: 'FAC-2024-001', clientNom: 'Ville de Gatineau', montant: 316186.25, date: '2024-05-25', methode: 'virement', reference: 'VIR-GAT-20240525' },
  { id: 'pay02', factureId: 'fac02', factureNumero: 'FAC-2024-002', clientNom: 'Construction Gervais & Fils', montant: 223511.76, date: '2024-05-12', methode: 'virement', reference: 'VIR-GER-20240512' },
  { id: 'pay03', factureId: 'fac04', factureNumero: 'FAC-2024-004', clientNom: 'Municipalité de Pontiac', montant: 133487.37, date: '2024-06-08', methode: 'cheque', reference: 'CHQ-7734' },
  { id: 'pay04', factureId: 'fac07', factureNumero: 'FAC-2023-021', clientNom: 'Ville de Gatineau', montant: 1310741.5, date: '2024-03-28', methode: 'virement', reference: 'VIR-GAT-20240328' },
]

export const depenses: Depense[] = [
  { id: 'dep01', description: 'Excavation tronçon 1 et 2', projetId: 'p1', projetNom: 'Réfection routières — Aylmer', categorie: 'Sous-traitance', montant: 128000, date: '2024-03-18', fournisseurNom: 'Excavations Fortier', bonCommandeId: 'bc01' },
  { id: 'dep02', description: 'Béton structure chaussée', projetId: 'p1', projetNom: 'Réfection routières — Aylmer', categorie: 'Matériaux', montant: 95000, date: '2024-04-15', fournisseurNom: 'Béton Provincial Inc.', bonCommandeId: 'bc02' },
  { id: 'dep03', description: 'Location équipements — mars-avril', projetId: 'p1', projetNom: 'Réfection routières — Aylmer', categorie: 'Équipements', montant: 42000, date: '2024-04-30', fournisseurNom: 'Location Équipements Bouchard', bonCommandeId: 'bc05' },
  { id: 'dep04', description: 'Structure acier entrepôt', projetId: 'p2', projetNom: 'Agrandissement entrepôt — Phase 2', categorie: 'Matériaux', montant: 148000, date: '2024-05-02', fournisseurNom: 'Aciers de construction Demers', bonCommandeId: 'bc03' },
  { id: 'dep05', description: 'Salaires équipe — avril', projetId: 'p1', projetNom: 'Réfection routières — Aylmer', categorie: 'Main-d\'oeuvre', montant: 88000, date: '2024-04-30', fournisseurNom: 'Interne', },
  { id: 'dep06', description: 'Salaires équipe — mai', projetId: 'p1', projetNom: 'Réfection routières — Aylmer', categorie: 'Main-d\'oeuvre', montant: 92000, date: '2024-05-31', fournisseurNom: 'Interne', },
  { id: 'dep07', description: 'Fournitures électriques maintenance', projetId: 'p4', projetNom: 'Maintenance préventive postes HQ', categorie: 'Matériaux', montant: 68000, date: '2024-05-20', fournisseurNom: 'Électrique Marchand & Frères', bonCommandeId: 'bc06' },
  { id: 'dep08', description: 'Démontage tablier pont', projetId: 'p6', projetNom: 'Réfection pont — rang du Sauvage', categorie: 'Sous-traitance', montant: 35000, date: '2024-04-20', fournisseurNom: 'Excavations Fortier', bonCommandeId: 'bc07' },
  { id: 'dep09', description: 'Tablier acier neuf', projetId: 'p6', projetNom: 'Réfection pont — rang du Sauvage', categorie: 'Matériaux', montant: 48000, date: '2024-05-28', fournisseurNom: 'Soudures Industrielles Gagné', bonCommandeId: 'bc08' },
  { id: 'dep10', description: 'Assurances chantier annuelles', projetId: 'p1', projetNom: 'Réfection routières — Aylmer', categorie: 'Frais généraux', montant: 28000, date: '2024-03-01', fournisseurNom: 'Intact Assurances', },
]

export const cashflow: LigneCashflow[] = [
  { mois: 'Jan 2024', entrees: 1310742, sorties: 185000, solde: 1125742, soldeCumulatif: 1125742 },
  { mois: 'Fév 2024', entrees: 0, sorties: 220000, solde: -220000, soldeCumulatif: 905742 },
  { mois: 'Mar 2024', entrees: 0, sorties: 298000, solde: -298000, soldeCumulatif: 607742 },
  { mois: 'Avr 2024', entrees: 316186, sorties: 385000, solde: -68814, soldeCumulatif: 538928 },
  { mois: 'Mai 2024', entrees: 357000, sorties: 442000, solde: -85000, soldeCumulatif: 453928 },
  { mois: 'Jun 2024', entrees: 222476, sorties: 310000, solde: -87524, soldeCumulatif: 366404 },
  { mois: 'Jul 2024', entrees: 425424, sorties: 285000, solde: 140424, soldeCumulatif: 506828 },
  { mois: 'Aoû 2024', entrees: 320000, sorties: 240000, solde: 80000, soldeCumulatif: 586828 },
  { mois: 'Sep 2024', entrees: 410000, sorties: 195000, solde: 215000, soldeCumulatif: 801828 },
  { mois: 'Oct 2024', entrees: 580000, sorties: 165000, solde: 415000, soldeCumulatif: 1216828 },
  { mois: 'Nov 2024', entrees: 220000, sorties: 98000, solde: 122000, soldeCumulatif: 1338828 },
  { mois: 'Déc 2024', entrees: 185000, sorties: 72000, solde: 113000, soldeCumulatif: 1451828 },
]
