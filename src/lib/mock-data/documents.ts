import type { Document } from '@/types'

export const documents: Document[] = [
  { id: 'doc01', nom: 'Contrat principal — Ville de Gatineau.pdf', type: 'contrat', moduleRef: 'projet', moduleId: 'p1', version: '1.0', taille: '2.4 MB', createdAt: '2024-03-01', uploadePar: 'Admin' },
  { id: 'doc02', nom: 'Plans routiers — Aylmer — Rev3.pdf', type: 'plan', moduleRef: 'soumission', moduleId: 's1', version: '3.0', taille: '18.7 MB', createdAt: '2024-02-10', uploadePar: 'Jean-Baptiste Côté' },
  { id: 'doc03', nom: 'Addenda #1 — AO-2024-001.pdf', type: 'addenda', moduleRef: 'soumission', moduleId: 's1', version: '1.0', taille: '1.2 MB', createdAt: '2024-02-01', uploadePar: 'Marie-Josée Langlois' },
  { id: 'doc04', nom: 'Rapport inspection sol — zone A.pdf', type: 'rapport', moduleRef: 'projet', moduleId: 'p1', version: '1.0', taille: '5.8 MB', createdAt: '2024-04-23', uploadePar: 'Martin Beaupré' },
  { id: 'doc05', nom: 'FAC-2024-001 — Ville de Gatineau.pdf', type: 'facture', moduleRef: 'comptabilite', moduleId: 'fac01', version: '1.0', taille: '0.8 MB', createdAt: '2024-04-30', uploadePar: 'Comptable' },
  { id: 'doc06', nom: 'Soumission AO-2024-001 finale.pdf', type: 'soumission', moduleRef: 'soumission', moduleId: 's1', version: '3.0', taille: '4.2 MB', createdAt: '2024-02-20', uploadePar: 'Jean-Baptiste Côté' },
  { id: 'doc07', nom: 'Contrat Gervais — Agrandissement.pdf', type: 'contrat', moduleRef: 'projet', moduleId: 'p2', version: '1.0', taille: '1.9 MB', createdAt: '2024-04-01', uploadePar: 'Admin' },
  { id: 'doc08', nom: 'Plans entrepôt — Structure acier.pdf', type: 'plan', moduleRef: 'soumission', moduleId: 's2', version: '2.0', taille: '8.1 MB', createdAt: '2024-02-02', uploadePar: 'Sandra Ouellet' },
  { id: 'doc09', nom: 'Cahier des charges HQ — Maintenance.pdf', type: 'plan', moduleRef: 'soumission', moduleId: 's3', version: '1.0', taille: '12.7 MB', createdAt: '2024-03-11', uploadePar: 'Sophie Tremblay' },
  { id: 'doc10', nom: 'Contrat HQ — Maintenance 3 ans.pdf', type: 'contrat', moduleRef: 'projet', moduleId: 'p4', version: '1.0', taille: '3.5 MB', createdAt: '2024-05-01', uploadePar: 'Admin' },
  { id: 'doc11', nom: 'Rapport fin de projet — Aqueduc Masson.pdf', type: 'rapport', moduleRef: 'projet', moduleId: 'p3', version: '1.0', taille: '7.2 MB', createdAt: '2024-02-10', uploadePar: 'Martin Beaupré' },
  { id: 'doc12', nom: 'FAC-2023-021 — Facture finale aqueduc.pdf', type: 'facture', moduleRef: 'comptabilite', moduleId: 'fac07', version: '1.0', taille: '0.9 MB', createdAt: '2024-02-28', uploadePar: 'Comptable' },
  { id: 'doc13', nom: 'Plans architecturaux — Centre communautaire.pdf', type: 'plan', moduleRef: 'soumission', moduleId: 's5', version: '1.0', taille: '22.4 MB', createdAt: '2024-04-02', uploadePar: 'Jean-Baptiste Côté' },
  { id: 'doc14', nom: 'Soumission AO-2024-003 finale.pdf', type: 'soumission', moduleRef: 'soumission', moduleId: 's3', version: '1.0', taille: '3.8 MB', createdAt: '2024-04-14', uploadePar: 'Jean-Baptiste Côté' },
  { id: 'doc15', nom: 'Certificat assurances 2024.pdf', type: 'autre', moduleRef: 'global', moduleId: 'global', version: '1.0', taille: '0.5 MB', createdAt: '2024-01-15', uploadePar: 'Admin' },
  { id: 'doc16', nom: 'Rapport avancement mai 2024 — Aylmer.pdf', type: 'rapport', moduleRef: 'projet', moduleId: 'p1', version: '1.0', taille: '4.1 MB', createdAt: '2024-05-31', uploadePar: 'Martin Beaupré' },
  { id: 'doc17', nom: 'Contrat pont Pontiac — Sauvage.pdf', type: 'contrat', moduleRef: 'projet', moduleId: 'p6', version: '1.0', taille: '1.7 MB', createdAt: '2024-04-15', uploadePar: 'Admin' },
  { id: 'doc18', nom: 'Plans pont — Tablier remplacement.pdf', type: 'plan', moduleRef: 'projet', moduleId: 'p6', version: '2.0', taille: '9.3 MB', createdAt: '2024-03-20', uploadePar: 'Martin Beaupré' },
]
