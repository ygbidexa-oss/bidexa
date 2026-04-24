'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Users, Zap, FileText, TrendingUp, Building2, ShoppingCart,
  Truck, DollarSign, FolderOpen, BarChart2, Bot, Shield,
  X, CheckCircle, ChevronRight,
} from 'lucide-react'

// ── Contenu détaillé de chaque module ─────────────────────────────────────────

const MODULE_DETAILS = [
  {
    id: 'clients',
    icon: <Users size={22} />,
    title: 'Clients CRM',
    tagline: 'Centralisez toutes vos relations clients dans une fiche 360°',
    desc: 'Le module Clients de Bidexa est bien plus qu\'un carnet d\'adresses. C\'est une vue stratégique complète de chaque client — historique, rentabilité, soumissions et facturation — accessible en un seul endroit.',
    features: [
      'Fiche client complète : nom, type (public/privé), secteur, adresse, conditions de paiement',
      'Gestion de contacts multiples par organisation (téléphone, courriel, rôle)',
      'Historique complet de toutes les soumissions liées au client',
      'Historique de tous les projets réalisés et en cours',
      'Analyse de rentabilité : marge réelle, volume d\'affaires, délais de paiement',
      'Score de fidélité calculé automatiquement',
      'Lien direct vers toutes les factures émises',
      'Recherche et filtrage avancés par secteur, type, statut',
    ],
    usecases: [
      'Évaluer la rentabilité d\'un client avant de soumissionner',
      'Retrouver rapidement un contact lors d\'un appel',
      'Analyser le volume annuel d\'affaires par client',
    ],
    color: '#C9A84C',
  },
  {
    id: 'estimation',
    icon: <Zap size={22} />,
    title: 'Estimation',
    tagline: 'Construisez des estimations précises, rapides et traçables',
    desc: 'Le module Estimation est le cœur de Bidexa. Il permet à l\'estimateur de créer un dossier complet d\'estimation avec postes, sous-postes, coûts détaillés et analyse de marge — avant même la création d\'une soumission.',
    features: [
      'Création de dossier estimation lié à un client et un type de projet',
      'Structure par postes et sous-postes (main-d\'œuvre, matériaux, équipement, sous-traitance, frais indirects)',
      'Bibliothèque de prix réutilisable et mise à jour',
      'Simulation de marge : ajustement en temps réel',
      'Versioning — historique de toutes les révisions',
      'Upload de documents (plans, devis, addenda)',
      'Duplication d\'estimation pour projets similaires',
      'IA : suggestion de prix basés sur l\'historique · détection d\'anomalies de coûts',
      'Lien direct vers la soumission générée',
    ],
    usecases: [
      'Préparer un budget détaillé avant de rédiger une soumission',
      'Comparer plusieurs scénarios de marge',
      'Détecter les postes sous-estimés avec l\'IA',
    ],
    color: '#b8956e',
  },
  {
    id: 'soumissions',
    icon: <FileText size={22} />,
    title: 'Soumissions & AO',
    tagline: 'Rédigez des offres professionnelles et conformes en toute confiance',
    desc: 'Le module Soumissions permet à l\'estimateur de formaliser une offre complète en réponse à un appel d\'offres. Il s\'appuie sur l\'estimation existante et ajoute tous les éléments contractuels, légaux et de présentation.',
    features: [
      'Types : appel d\'offre public, privé, soumission directe, demande de prix',
      'Rédaction structurée : description du projet, prix soumis, marge, délais de validité',
      'Informations de l\'entreprise (logo, coordonnées) automatiquement intégrées',
      'Statuts complets : brouillon → préparation → validation → déposée → gagnée/perdue',
      'Checklist de conformité intégrée (documents requis)',
      'Gestion des addenda et révisions',
      'Versioning — toutes les versions conservées',
      'Export PDF professionnel de la soumission',
      'Lien vers le projet si soumission gagnée',
    ],
    usecases: [
      'Produire une soumission conforme en quelques heures',
      'Suivre le statut de chaque dossier en temps réel',
      'Retrouver toutes les versions d\'une offre révisée',
    ],
    color: '#a07a5c',
  },
  {
    id: 'concurrence',
    icon: <TrendingUp size={22} />,
    title: 'Résultats & Concurrence',
    tagline: 'Analysez chaque résultat pour améliorer votre taux de succès',
    desc: 'Après le dépôt d\'une soumission, ce module permet de saisir les résultats d\'ouverture des offres, d\'identifier les concurrents, d\'analyser les écarts de prix et de constituer une base de données stratégique.',
    features: [
      'Saisie des résultats pour chaque soumission déposée',
      'Nom, montant et spécifications de soumission de chaque concurrent',
      'Calcul automatique de l\'écart de prix entre le gagnant et les autres',
      'Identification du rang de votre entreprise',
      'Statistiques : taux de réussite global et par estimateur',
      'Analyse des marges gagnantes vs perdantes',
      'Historique concurrentiel par client et par secteur',
      'IA : prédiction de succès · recommandation de stratégie de prix',
    ],
    usecases: [
      'Comprendre pourquoi une soumission a été perdue',
      'Identifier les concurrents récurrents sur un segment',
      'Ajuster la stratégie de prix pour le prochain appel d\'offres',
    ],
    color: '#7a6b8a',
  },
  {
    id: 'projets',
    icon: <Building2 size={22} />,
    title: 'Gestion de projets',
    tagline: 'Suivez chaque projet du démarrage à la clôture en temps réel',
    desc: 'Créé automatiquement lorsqu\'une soumission est marquée gagnée, le module Projets centralise le budget, les coûts réels, les bons de commande, la facturation et les documents — tout au long de l\'exécution.',
    features: [
      'Création automatique à partir de la soumission gagnée (budget, estimation, documents transférés)',
      'Structure budgétaire détaillée par poste',
      'Suivi budget vs coûts engagés (PO) vs coûts réels',
      'Facturation : coup forfaitaire ou facturation progressive par étape',
      'Transmission automatique des factures à la comptabilité',
      'Lien vers les bons de commande associés',
      'Suivi de l\'avancement et des livrables',
      'Journal de projet et ordres de changement',
      'Gestion des risques et dérive de budget',
      'IA : résumé d\'avancement · détection de dérive budgétaire',
    ],
    usecases: [
      'Voir en temps réel le budget restant sur un projet',
      'Soumettre une facture progressive au client',
      'Comparer les coûts estimés vs réels en fin de projet',
    ],
    color: '#0D1B2A',
  },
  {
    id: 'bons-commande',
    icon: <ShoppingCart size={22} />,
    title: 'Bons de commande',
    tagline: 'Des PO complets, approuvés et traçables du début à la clôture',
    desc: 'Le module Bons de commande (PO) couvre tout le cycle d\'achat : rédaction, approbation, envoi au fournisseur, réception des biens ou services, lien avec la comptabilité et clôture automatique.',
    features: [
      'PO # unique généré automatiquement',
      'Informations complètes : fournisseur, projet, items détaillés, quantités, prix unitaires',
      'Calcul automatique des sous-totaux, TPS, TVQ, total',
      'Conditions de livraison, date prévue, adresse, contact de réception',
      'Conditions générales, garanties, pénalités, pièces jointes',
      'Flux d\'approbation : brouillon → approuvé → envoyé → reçu → fermé',
      'Envoi au fournisseur (email ou PDF)',
      'Intégration automatique en comptabilité comme argent engagé à l\'approbation',
      'Libération du solde non dépensé à la clôture',
      'Historique complet des PO par projet et fournisseur',
    ],
    usecases: [
      'Contrôler les achats avant qu\'ils soient effectués',
      'Suivre le solde engagé vs payé par projet',
      'Fermer un PO et libérer le budget non utilisé',
    ],
    color: '#1a6b4a',
  },
  {
    id: 'fournisseurs',
    icon: <Truck size={22} />,
    title: 'Fournisseurs',
    tagline: 'Une base fournisseurs complète pour des achats maîtrisés',
    desc: 'Le module Fournisseurs centralise toutes les informations de vos partenaires commerciaux : coordonnées, contacts, comptes bancaires, historique d\'achats, évaluation de performance et documents.',
    features: [
      'Fiche complète : nom, catégorie, adresse, contacts multiples',
      'Informations bancaires sécurisées (pour virement)',
      'Historique de tous les bons de commande émis',
      'Chiffre d\'affaires cumulé par fournisseur',
      'Montant arnet (solde dû)',
      'Évaluation de performance : qualité, délais, conformité',
      'Upload de documents : contrats, certifications, assurances',
      'Alerte sur les certifications expirées',
      'IA : analyse de performance · rapport fournisseur complet',
    ],
    usecases: [
      'Retrouver rapidement les coordonnées d\'un fournisseur',
      'Évaluer un fournisseur avant de l\'engager sur un projet',
      'Analyser le volume d\'achats annuel par catégorie',
    ],
    color: '#2a5a8a',
  },
  {
    id: 'comptabilite',
    icon: <DollarSign size={22} />,
    title: 'Comptabilité',
    tagline: 'Une comptabilité de projet intégrée à chaque module',
    desc: 'La comptabilité Bidexa est directement connectée aux projets, PO et factures. Elle gère les comptes clients, fournisseurs, le grand livre, le cashflow et les taxes — sans double saisie.',
    features: [
      'Factures clients : émises depuis le module Projets, visibles ici',
      'Comptes fournisseurs : PO approuvés intégrés automatiquement comme dépenses engagées',
      'Grand livre avec écritures comptables automatiques',
      'Suivi des paiements reçus et à recevoir (AR)',
      'Gestion du cashflow prévisionnel',
      'Taxes TPS/TVQ configurables selon les paramètres de l\'entreprise',
      'Allocation des coûts par projet',
      'Approbation des PO avant comptabilisation',
      'Rapports financiers : bilan, résultats, flux de trésorerie',
      'IA : analyse cashflow · alertes comptes à recevoir à risque',
    ],
    usecases: [
      'Voir en temps réel les sommes dues par chaque client',
      'Rapprocher les PO avec les factures fournisseurs',
      'Générer un rapport financier mensuel en un clic',
    ],
    color: '#1a4a2a',
  },
  {
    id: 'documents',
    icon: <FolderOpen size={22} />,
    title: 'Documents',
    tagline: 'Tous vos documents au bon endroit, accessibles en tout temps',
    desc: 'Le module Documents centralise tous les fichiers de l\'entreprise en les liant automatiquement aux entités concernées : projets, soumissions, estimations, fournisseurs. Plus aucun document égaré.',
    features: [
      'Upload de fichiers (PDF, Word, Excel, images, plans DWG)',
      'Classement automatique : par projet, soumission, estimation, fournisseur, entreprise',
      'Versioning : toutes les versions d\'un document conservées',
      'Liens multi-modules : un document peut être lié à plusieurs entités',
      'Suivi du document à travers les étapes du projet',
      'Recherche globale par nom, type, projet, date',
      'Aperçu intégré (PDF, images)',
      'Contrôle d\'accès par rôle (qui peut voir, modifier, supprimer)',
      'IA : résumé de document · proposition de classement optimal',
    ],
    usecases: [
      'Retrouver un plan de chantier en 3 secondes',
      'Vérifier que tous les documents requis sont déposés avant soumission',
      'Consulter la dernière version d\'un contrat depuis le projet',
    ],
    color: '#6a4a1a',
  },
  {
    id: 'reporting',
    icon: <BarChart2 size={22} />,
    title: 'Reporting BI',
    tagline: 'Des tableaux de bord stratégiques calculés depuis vos données réelles',
    desc: 'Le module Reporting centralise tous les KPIs de l\'entreprise en temps réel. Les graphiques sont alimentés directement par les données des autres modules — aucune saisie manuelle.',
    features: [
      'Dashboard Direction : valeur soumise vs gagnée, taux de succès, projets actifs, marge moyenne',
      'Dashboard Estimation : soumissions en cours, deadlines, performance par estimateur',
      'Dashboard Projet : avancement, budget vs réel, coûts engagés, retard',
      'Dashboard Finance : cashflow, comptes à recevoir, comptes fournisseurs',
      'Graphique valeur soumise vs gagnée par mois',
      'Nombre de projets par client et par secteur',
      'Analyse des marges par type de projet',
      'Export des rapports en CSV',
      'IA : interprétation des KPIs · rédaction de rapport de direction',
    ],
    usecases: [
      'Présenter les résultats mensuels à la direction en 2 minutes',
      'Identifier les projets à risque de dépassement de budget',
      'Comparer les performances des estimateurs',
    ],
    color: '#1a3a6a',
  },
  {
    id: 'ia',
    icon: <Bot size={22} />,
    title: 'Intelligence Artificielle',
    tagline: 'Un assistant IA contextuel dans chacun de vos modules',
    desc: 'L\'IA de Bidexa est intégrée directement dans chaque module — pas un chatbot isolé. Elle comprend le contexte de la page sur laquelle vous travaillez et propose des actions pertinentes.',
    features: [
      'Assistant IA accessible depuis chaque module (panneau latéral droit)',
      'Actions rapides contextuelles selon le module (ex: "Résumé AO", "Détecter anomalie", "Analyser cashflow")',
      'Lecture et résumé de documents PDF d\'appels d\'offres',
      'Suggestion de prix basée sur l\'historique de l\'entreprise',
      'Détection d\'anomalies dans les estimations (taux MO, prix matériaux)',
      'Prédiction du taux de succès d\'une soumission',
      'Rédaction de rapports de direction à partir des données réelles',
      'Quota protégé par forfait : 20 / 100 / 500 req. par jour',
      'Journal d\'audit de toutes les requêtes IA',
    ],
    usecases: [
      'Résumer un AO de 40 pages en 5 points en 30 secondes',
      'Détecter un poste sous-estimé avant de déposer une soumission',
      'Générer un rapport d\'avancement projet pour la direction',
    ],
    color: '#4a1a6a',
  },
  {
    id: 'securite',
    icon: <Shield size={22} />,
    title: 'Sécurité avancée',
    tagline: '7 couches de protection pour vos données et votre accès',
    desc: 'La sécurité de Bidexa n\'est pas un module optionnel — elle est intégrée à chaque couche de l\'application. Connexion, navigation, IA et données sont protégés par des mécanismes indépendants.',
    features: [
      'Headers HTTP : CSP, HSTS, X-Frame-Options, X-XSS-Protection sur toutes les routes',
      'Middleware Next.js : chaque route protégée vérifie la session avant de répondre',
      'Brute-force guard : 5 tentatives → verrouillage 15 min · 8 tentatives → 1h',
      'Token de session sécurisé via crypto.getRandomValues() · durée 8h',
      'Fingerprint de session (User-Agent) pour détecter les usurpations',
      'Quota IA par forfait : protection contre le pillage de l\'API',
      'Sanitisation XSS de toutes les entrées utilisateur',
      'Audit log 500 entrées FIFO : login, logout, IA, PO, changements de rôles',
      'Export CSV du journal d\'audit (admin uniquement)',
      'Cookie SameSite=Strict pour prévenir le CSRF',
    ],
    usecases: [
      'Détecter une tentative de connexion suspecte dans le journal d\'audit',
      'Bloquer automatiquement un compte après trop de tentatives',
      'Vérifier qui a approuvé un bon de commande et quand',
    ],
    color: '#2a1a4a',
  },
]

// ── Composant Modal ────────────────────────────────────────────────────────────

function ModuleModal({ mod, onClose }: { mod: typeof MODULE_DETAILS[0]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl px-8 pt-8 pb-5 border-b border-slate-100 z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#fef9ec', color: '#C9A84C' }}>
                {mod.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#0D1B2A' }}>{mod.title}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{mod.tagline}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition shrink-0 mt-0.5"
            >
              <X size={15} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-6">
          {/* Description */}
          <p className="text-slate-600 leading-relaxed text-sm">{mod.desc}</p>

          {/* Fonctionnalités */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full inline-block" style={{ background: '#C9A84C' }} />
              Fonctionnalités incluses
            </h3>
            <ul className="space-y-2">
              {mod.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Cas d'usage */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full inline-block" style={{ background: '#C9A84C' }} />
              Cas d&apos;usage typiques
            </h3>
            <div className="space-y-2">
              {mod.usecases.map((u, i) => (
                <div key={i} className="flex items-start gap-2.5 px-4 py-2.5 rounded-xl text-sm" style={{ background: '#f8fafc' }}>
                  <span className="font-bold shrink-0" style={{ color: '#C9A84C' }}>{i + 1}.</span>
                  <span className="text-slate-600">{u}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white rounded-b-3xl px-8 py-5 border-t border-slate-100 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-400">Disponible dans tous les forfaits Bidexa</p>
          <Link
            href="/register"
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition hover:opacity-90"
            style={{ background: '#0D1B2A' }}
          >
            Essayer gratuitement <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Section Modules ────────────────────────────────────────────────────────────

export function ModulesSection() {
  const [active, setActive] = useState<typeof MODULE_DETAILS[0] | null>(null)

  return (
    <>
      <section id="features" className="py-20" style={{ background: '#f8fafc' }}>
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-2" style={{ color: '#0D1B2A' }}>12 modules interconnectés</h2>
          <p className="text-center text-slate-500 mb-12 text-sm">Tout le cycle de vie d&apos;un projet. Aucun outil externe requis.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {MODULE_DETAILS.map(m => (
              <button
                key={m.id}
                onClick={() => setActive(m)}
                className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-amber-300 hover:shadow-md transition text-left group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition group-hover:scale-110" style={{ background: '#fef9ec', color: '#C9A84C' }}>
                  {m.icon}
                </div>
                <h3 className="font-semibold text-slate-800 mb-1.5 text-sm group-hover:text-amber-700 transition">{m.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{m.desc}</p>
                <span className="inline-flex items-center gap-1 mt-3 text-xs font-semibold" style={{ color: '#C9A84C' }}>
                  En savoir plus <ChevronRight size={11} />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Modal */}
      {active && <ModuleModal mod={active} onClose={() => setActive(null)} />}
    </>
  )
}
