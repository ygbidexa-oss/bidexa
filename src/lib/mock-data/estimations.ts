import type { Estimation } from '@/types'

export const estimations: Estimation[] = [
  {
    id: 'e1',
    soumissionId: 's1',
    soumissionNumero: 'AO-2024-001',
    clientNom: 'Ville de Gatineau',
    titre: 'Réfection infrastructures routières — Aylmer',
    typeProjet: 'Infrastructure routière',
    estimateurNom: 'Jean-Baptiste Côté',
    version: 3,
    marge: 11.5,
    createdAt: '2024-01-20',
    updatedAt: '2024-02-18',
    postes: [
      {
        id: 'p1',
        nom: 'Travaux préparatoires',
        sousPostes: [
          {
            id: 'sp1',
            nom: 'Signalisation et sécurité',
            lignes: [
              { id: 'l1', description: 'Signalisation temporaire', mo: 8000, materiaux: 12000, equipement: 5000, sousTraitance: 0, fraisIndirects: 1500 },
              { id: 'l2', description: 'Clôtures et barrières', mo: 2500, materiaux: 4500, equipement: 0, sousTraitance: 0, fraisIndirects: 500 },
            ],
          },
          {
            id: 'sp2',
            nom: 'Démolition / excavation',
            lignes: [
              { id: 'l3', description: 'Démolition chaussée existante', mo: 35000, materiaux: 0, equipement: 85000, sousTraitance: 0, fraisIndirects: 8000 },
              { id: 'l4', description: 'Excavation et transport matériaux', mo: 28000, materiaux: 0, equipement: 65000, sousTraitance: 0, fraisIndirects: 6000 },
            ],
          },
        ],
      },
      {
        id: 'p2',
        nom: 'Infrastructures souterraines',
        sousPostes: [
          {
            id: 'sp3',
            nom: 'Réseau aqueduc',
            lignes: [
              { id: 'l5', description: 'Tuyau HDPE DN300 — 4200 ml', mo: 95000, materiaux: 320000, equipement: 45000, sousTraitance: 0, fraisIndirects: 18000 },
              { id: 'l6', description: 'Regards, vannes et accessoires', mo: 25000, materiaux: 85000, equipement: 12000, sousTraitance: 0, fraisIndirects: 8000 },
            ],
          },
          {
            id: 'sp4',
            nom: 'Réseau égout',
            lignes: [
              { id: 'l7', description: 'Tuyau PVC DN375 — 4200 ml', mo: 88000, materiaux: 275000, equipement: 40000, sousTraitance: 0, fraisIndirects: 15000 },
              { id: 'l8', description: "Regards d'égout et branchements", mo: 32000, materiaux: 68000, equipement: 15000, sousTraitance: 0, fraisIndirects: 7000 },
            ],
          },
        ],
      },
      {
        id: 'p3',
        nom: 'Chaussée',
        sousPostes: [
          {
            id: 'sp5',
            nom: 'Structure de chaussée',
            lignes: [
              { id: 'l9', description: 'Remblayage et compactage', mo: 42000, materiaux: 95000, equipement: 35000, sousTraitance: 0, fraisIndirects: 10000 },
              { id: 'l10', description: 'Granulat MG-20 — base', mo: 28000, materiaux: 145000, equipement: 22000, sousTraitance: 0, fraisIndirects: 12000 },
              { id: 'l11', description: 'Enrobé bitumineux — 2 couches', mo: 45000, materiaux: 185000, equipement: 65000, sousTraitance: 0, fraisIndirects: 18000 },
            ],
          },
        ],
      },
      {
        id: 'p4',
        nom: 'Frais généraux de chantier',
        sousPostes: [
          {
            id: 'sp6',
            nom: 'Frais de chantier',
            lignes: [
              { id: 'l12', description: 'Supervision et gérance chantier', mo: 68000, materiaux: 0, equipement: 0, sousTraitance: 0, fraisIndirects: 0 },
              { id: 'l13', description: 'Assurances et cautionnements', mo: 0, materiaux: 0, equipement: 0, sousTraitance: 0, fraisIndirects: 28000 },
              { id: 'l14', description: 'Contrôle qualité / laboratoire', mo: 0, materiaux: 0, equipement: 0, sousTraitance: 22000, fraisIndirects: 5000 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'e2',
    soumissionId: 's2',
    soumissionNumero: 'AO-2024-002',
    clientNom: 'Construction Gervais & Fils',
    titre: 'Agrandissement entrepôt — Phase 2',
    typeProjet: 'Bâtiment commercial',
    estimateurNom: 'Sophie Marchand',
    version: 2,
    marge: 14.2,
    createdAt: '2024-02-05',
    updatedAt: '2024-02-25',
    postes: [
      {
        id: 'p1',
        nom: 'Structure',
        sousPostes: [
          {
            id: 'sp1',
            nom: 'Fondations',
            lignes: [
              { id: 'l1', description: 'Semelles et pieux', mo: 22000, materiaux: 45000, equipement: 18000, sousTraitance: 0, fraisIndirects: 5000 },
              { id: 'l2', description: 'Dalle de plancher 200mm', mo: 18000, materiaux: 62000, equipement: 8000, sousTraitance: 0, fraisIndirects: 4000 },
            ],
          },
          {
            id: 'sp2',
            nom: 'Charpente acier',
            lignes: [
              { id: 'l3', description: 'Structure acier galvanisé', mo: 35000, materiaux: 148000, equipement: 25000, sousTraitance: 0, fraisIndirects: 12000 },
              { id: 'l4', description: 'Boulonnerie et connecteurs', mo: 5000, materiaux: 18000, equipement: 2000, sousTraitance: 0, fraisIndirects: 1500 },
            ],
          },
        ],
      },
      {
        id: 'p2',
        nom: 'Enveloppe',
        sousPostes: [
          {
            id: 'sp3',
            nom: 'Murs et toiture',
            lignes: [
              { id: 'l5', description: 'Panneaux muraux sandwich', mo: 28000, materiaux: 95000, equipement: 12000, sousTraitance: 0, fraisIndirects: 8000 },
              { id: 'l6', description: 'Toiture membrane TPO', mo: 22000, materiaux: 58000, equipement: 8000, sousTraitance: 0, fraisIndirects: 6000 },
              { id: 'l7', description: 'Portes sectionnelles industrielles x4', mo: 8000, materiaux: 42000, equipement: 3000, sousTraitance: 0, fraisIndirects: 3000 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'e5',
    soumissionId: 's5',
    soumissionNumero: 'AO-2024-005',
    clientNom: 'Ville de Gatineau',
    titre: 'Rénovation centre communautaire — Hull',
    typeProjet: 'Bâtiment institutionnel',
    estimateurNom: 'Étienne Blais',
    version: 1,
    marge: 12.0,
    createdAt: '2024-04-05',
    updatedAt: '2024-04-25',
    postes: [
      {
        id: 'p1',
        nom: 'Démolition sélective',
        sousPostes: [
          {
            id: 'sp1',
            nom: 'Démolition intérieure',
            lignes: [
              { id: 'l1', description: 'Démolition cloisons', mo: 28000, materiaux: 0, equipement: 12000, sousTraitance: 0, fraisIndirects: 3000 },
              { id: 'l2', description: 'Démolition faux-planchers', mo: 15000, materiaux: 0, equipement: 5000, sousTraitance: 0, fraisIndirects: 2000 },
            ],
          },
        ],
      },
      {
        id: 'p2',
        nom: 'Structure et maçonnerie',
        sousPostes: [
          {
            id: 'sp2',
            nom: 'Réparations structurales',
            lignes: [
              { id: 'l3', description: 'Réparation poutres béton', mo: 42000, materiaux: 25000, equipement: 15000, sousTraitance: 0, fraisIndirects: 6000 },
            ],
          },
        ],
      },
      {
        id: 'p3',
        nom: 'Mécanique et électricité',
        sousPostes: [
          {
            id: 'sp3',
            nom: 'Plomberie',
            lignes: [
              { id: 'l4', description: 'Remplacement distribution eau', mo: 35000, materiaux: 48000, equipement: 8000, sousTraitance: 0, fraisIndirects: 6000 },
            ],
          },
          {
            id: 'sp4',
            nom: 'Électricité',
            lignes: [
              { id: 'l5', description: 'Tableau principal + distribution', mo: 0, materiaux: 0, equipement: 0, sousTraitance: 185000, fraisIndirects: 12000 },
              { id: 'l6', description: 'Éclairage LED — 2800 m²', mo: 0, materiaux: 0, equipement: 0, sousTraitance: 95000, fraisIndirects: 7000 },
            ],
          },
        ],
      },
    ],
  },
]
