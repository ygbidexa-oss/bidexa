'use client'
import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Sparkles, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { checkAIQuota, incrementAIQuota } from '@/lib/security'
import { logAudit } from '@/lib/audit-log'
import { getCurrentUser } from '@/lib/auth'

interface QuickAction {
  label: string
  prompt: string
}

interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

const MODULE_ACTIONS: Record<string, QuickAction[]> = {
  clients: [
    { label: 'Rédiger fiche client', prompt: 'Rédige un résumé professionnel pour ce client avec ses points clés.' },
    { label: 'Analyser rentabilité', prompt: 'Analyse la rentabilité de ce client et donne un score de fidélité.' },
  ],
  soumissions: [
    { label: 'Résumé AO', prompt: 'Rédige un résumé exécutif de cet appel d\'offres en 5 points.' },
    { label: 'Checklist conformité', prompt: 'Génère une checklist de conformité pour cette soumission.' },
  ],
  estimation: [
    { label: 'Détecter anomalie', prompt: 'Analyse les postes de cette estimation et détecte les anomalies de coûts.' },
    { label: 'Suggérer prix', prompt: 'Suggère un prix compétitif basé sur l\'historique et le marché actuel.' },
  ],
  concurrence: [
    { label: 'Analyser concurrents', prompt: 'Analyse le profil des concurrents et identifie les tendances.' },
    { label: 'Recommander stratégie', prompt: 'Recommande une stratégie de prix pour améliorer le taux de succès.' },
  ],
  projets: [
    { label: 'Résumé avancement', prompt: 'Génère un résumé d\'avancement du projet pour le rapport de direction.' },
    { label: 'Détecter dérive', prompt: 'Analyse le budget vs réel et identifie les dérives à risque.' },
  ],
  'bons-commande': [
    { label: 'Rédiger bon de commande', prompt: 'Rédige un bon de commande structuré pour ce fournisseur.' },
    { label: 'Vérifier fournisseur', prompt: 'Vérifie le profil de ce fournisseur et évalue les risques.' },
  ],
  fournisseurs: [
    { label: 'Analyser performance', prompt: 'Analyse la performance de ce fournisseur sur les 12 derniers mois.' },
    { label: 'Rapport fournisseur', prompt: 'Génère un rapport de performance complet pour ce fournisseur.' },
  ],
  comptabilite: [
    { label: 'Analyser cashflow', prompt: 'Analyse le cashflow des 6 derniers mois et donne des prévisions.' },
    { label: 'Alertes AR', prompt: 'Identifie les comptes à recevoir à risque et suggère des actions.' },
  ],
  documents: [
    { label: 'Résumer document', prompt: 'Résume ce document en 5 points clés accessibles à la direction.' },
    { label: 'Proposer classement', prompt: 'Propose un classement optimal pour ce document dans l\'arborescence.' },
  ],
  reporting: [
    { label: 'Interpréter KPIs', prompt: 'Interprète les KPIs actuels et identifie les points d\'attention.' },
    { label: 'Rédiger rapport direction', prompt: 'Rédige un rapport de direction en format narratif à partir des données.' },
  ],
  ia: [
    { label: 'Résumer capacités', prompt: 'Quelles sont les principales capacités de l\'IA dans Bidexa ?' },
    { label: 'Cas d\'usage avancés', prompt: 'Donne des exemples avancés d\'utilisation de l\'IA pour améliorer la rentabilité.' },
  ],
}

const MODULE_RESPONSES: Record<string, Record<string, string>> = {
  clients: {
    'Rédiger fiche client': `**Fiche client — Synthèse exécutive**

**Profil général :** Client de type municipal, secteur infrastructure urbaine. Relation établie depuis 3 ans avec un historique de 4 contrats complétés.

**Points clés :**
- Taux de paiement : 94% dans les délais (net 45)
- Volume d'affaires moyen : 850 k$/an
- Secteurs prioritaires : réfection chaussée, aqueduc, égout
- Contact décisionnel : Direction des travaux publics

**Analyse rentabilité :**
- Marge réelle moyenne : 11,2%
- Satisfaction : Élevée (aucun litige actif)
- Score fidélité : **8,4 / 10**

**Recommandation :** Client stratégique à prioriser. Proposer une rencontre annuelle de bilan.`,

    'Analyser rentabilité': `**Analyse de rentabilité client**

**Score de rentabilité global : 7,8 / 10**

| Critère | Score | Détail |
|---|---|---|
| Marge brute | 8/10 | Moy. 11,2% — au-dessus du seuil cible |
| Délai paiement | 7/10 | Net 45 respecté à 94% |
| Fidélité | 9/10 | 4 contrats consécutifs |
| Complexité | 7/10 | Projets standardisés |

**Recommandation :** Maintenir la relation et proposer un accord-cadre annuel pour sécuriser le volume.`,
  },
  soumissions: {
    'Résumé AO': `**Résumé exécutif — Appel d'offres**

1. **Objet :** Travaux d'infrastructure urbaine en milieu municipal
2. **Valeur estimée :** 850 k$ – 1,2 M$ (fourchette indicative)
3. **Critères de sélection :** Prix (70%) + expérience (20%) + délai (10%)
4. **Points de vigilance :** Clause pénale 500$/jour, visite obligatoire, cautionnement 10%
5. **Avantage compétitif :** Notre historique sur des projets similaires nous positionne favorablement

**Recommandation :** Dossier à prioriser. Probabilité de succès estimée : **62%**`,

    'Checklist conformité': `**Checklist de conformité — Soumission**

**Documents administratifs**
- [x] Formulaire de soumission signé
- [x] Cautionnement de soumission (10%)
- [x] Attestation RBQ valide
- [ ] Références 3 projets similaires (manquant)

**Documents techniques**
- [x] Méthodes de travail
- [x] Organigramme de projet
- [x] Curriculum vitae des responsables
- [ ] Plan qualité (à compléter)

**Conformité administrative**
- [x] Enregistrement SEAO actif
- [x] Attestation Revenu Québec

**Statut : 8/10 — 2 documents à compléter avant dépôt**`,
  },
  estimation: {
    'Détecter anomalie': `**Analyse d'anomalies — Estimation**

**3 anomalies détectées :**

1. **Main-d'œuvre (Critique)** — Poste 3.2 : taux horaire de 42$/h appliqué alors que la convention collective 2024 prévoit 48,50$/h. Écart : +15%.

2. **Matériaux béton (Attention)** — Prix unitaire non mis à jour depuis Q3-2023. Indice actuel +4,1%. Impact estimé : +8 200$.

3. **Sous-traitance électrique (Info)** — Aucun soumissionnaire alternatif. Recommandé : obtenir 2 prix concurrents.

**Impact total corrigé :** +23 400$ (marge réelle : 9,1% vs 12,4% estimée)

**Action recommandée :** Réviser les taux MO et actualiser les prix matériaux avant dépôt.`,

    'Suggérer prix': `**Suggestion de prix — Analyse IA**

**Prix recommandé : 1 142 000 $** (marge 12%)

| Scénario | Prix | Marge | Prob. succès |
|---|---|---|---|
| Agressif | 1 085 000 $ | 8,5% | 72% |
| **Recommandé** | **1 142 000 $** | **12%** | **58%** |
| Conservateur | 1 210 000 $ | 16% | 41% |

Basé sur 3 AO similaires récents et le profil concurrentiel de la région.`,
  },
  concurrence: {
    'Analyser concurrents': `**Analyse concurrentielle**

**Top 3 concurrents identifiés :**

1. **Excavations Gauthier** — 38% de présence sur vos AO. Prix moyen : -3,2% vs votre soumission. Spécialité : travaux d'aqueduc.

2. **Construction Nordique** — 24% de présence. Stratégie : marges très serrées en début d'année fiscale.

3. **Infra-Québec** — 18% de présence. Fort sur les AO > 1M$. Peu actif sur les petits contrats.

**Tendance :** Le marché montre une compression des marges de 1,8 pts sur 12 mois. Recommandation : se différencier sur les délais et la qualité technique.`,

    'Recommander stratégie': `**Stratégie de prix recommandée**

**Objectif :** Passer de 38% à 50% de taux de succès

**Recommandations :**
1. Viser une marge de 10-11% sur les AO publics municipaux (vs 12-13% actuel)
2. Réserver les marges 14%+ pour les clients privés avec relation établie
3. Surveiller Excavations Gauthier : ils acceptent des marges < 8% pour gagner des marchés clés

**Indicateur :** Chaque point de marge sacrifié = +8% de probabilité de succès (régression historique)`,
  },
  projets: {
    'Résumé avancement': `**Rapport d'avancement — Pour la direction**

Le projet progresse conformément au calendrier établi. À date, l'avancement physique est de 62% pour un avancement financier de 58%.

**Faits saillants :**
- Les travaux de terrassement sont complétés à 100%
- La pose de conduites est à 75% (légèrement en avance)
- La main-d'œuvre est dans les limites du budget (+2,1%)

**Points d'attention :**
- Livraison de matériaux prévue S+2 — à surveiller
- Météo défavorable semaine 14 : 3 jours perdus récupérés en heures supplémentaires

**Prévision fin de projet :** Dans les délais, budget à ±3%`,

    'Détecter dérive': `**Analyse de dérive budgétaire**

**Statut global : Attention requise**

| Poste | Budget | Réel | Dérive |
|---|---|---|---|
| Main-d'œuvre | 285 k$ | 198 k$ engagé | +16% projeté |
| Matériaux | 420 k$ | 243 k$ | Dans les limites |
| Sous-traitance | 165 k$ | 189 k$ | **+14,5% (OC #2)** |
| Équipements | 145 k$ | 38 k$ | Sous-consommé |

**Risque principal :** Dépassement MO de ~45 k$ si la cadence actuelle se maintient.
**Action recommandée :** Réviser la planification des ressources avec le chargé de projet.`,
  },
  'bons-commande': {
    'Rédiger bon de commande': `**Bon de commande — Brouillon généré**

**EN-TÊTE**
Entreprise : [Votre entreprise]
Date : ${new Date().toLocaleDateString('fr-CA')}
Projet : [Référence projet]
Fournisseur : [Nom fournisseur]

**DESCRIPTION DES TRAVAUX / FOURNITURES**
| # | Description | Qté | Unité | Prix unit. | Total |
|---|---|---|---|---|---|
| 1 | [Item 1] | | | | |
| 2 | [Item 2] | | | | |

**CONDITIONS**
- Délai de livraison : [à compléter]
- Conditions de paiement : Net 30 jours
- Lieu de livraison : [Chantier / entrepôt]

**Signature requise avant envoi au fournisseur.**`,

    'Vérifier fournisseur': `**Vérification fournisseur — Rapport IA**

**Score global : 7,2 / 10**

| Critère | Score | Détail |
|---|---|---|
| Fiabilité livraison | 8/10 | 91% des livraisons dans les délais |
| Qualité produit | 7/10 | 2 non-conformités sur 18 mois |
| Prix compétitif | 6/10 | +5% vs marché moyen |
| Solidité financière | 8/10 | Entreprise établie, bonne réputation |

**Recommandation :** Fournisseur fiable. Négocier le prix pour aligner sur le marché.`,
  },
  fournisseurs: {
    'Analyser performance': `**Analyse de performance fournisseur — 12 mois**

**Score de performance global : 78 / 100**

**Points forts :**
- Taux de livraison à temps : 91%
- Qualité constante : 96% de conformité
- Communication proactive lors de délais

**Points à améliorer :**
- Délai de réponse aux demandes de prix : 4,2 jours (objectif < 48h)
- Prix légèrement au-dessus du marché (+4,8%)

**Comparaison avec alternatives :**
2 fournisseurs alternatifs identifiés avec des prix inférieurs de 3-6%.

**Recommandation :** Renégocier les tarifs annuels ou diversifier partiellement.`,

    'Rapport fournisseur': `**Rapport complet — Performance fournisseur**

**Période :** Janvier – Décembre 2024

**Volume d'affaires :** 287 450 $ (14 bons de commande)
**Taux de conformité :** 96,4%
**Délai moyen de livraison :** 8,3 jours ouvrables

**Historique des incidents :**
- Fév. 2024 : Livraison partielle (85%) — résolu sous 48h
- Juil. 2024 : Non-conformité qualité béton — crédit émis

**Classement interne :** 2e sur 12 fournisseurs dans sa catégorie

**Recommandation :** Maintenir au statut "Fournisseur préféré". Revoir le contrat annuel.`,
  },
  comptabilite: {
    'Analyser cashflow': `**Analyse cashflow — 6 derniers mois**

**Tendance générale :** Positive avec croissance de 8,3%

**Entrées moyennes :** 485 k$/mois
**Sorties moyennes :** 412 k$/mois
**Solde mensuel moyen :** +73 k$

**Points d'attention :**
- Mois de mars : solde négatif (-42 k$) dû à paiement fournisseur exceptionnel
- Concentration des entrées : 68% proviennent de 3 clients (risque de concentration)
- Prévision T4 : +12% basé sur les facteurs à émettre

**Recommandation :** Maintenir une réserve de 2 mois de charges fixes (≈ 824 k$). Diversifier la base clients.`,

    'Alertes AR': `**Alertes — Comptes à recevoir**

**3 alertes identifiées :**

1. **CRITIQUE — Facture FAC-2024-008** (316 186 $)
   - En retard de 47 jours
   - Client : Ville de Sherbrooke
   - Action : Appel de relance + mise en demeure si non-payé sous 5 jours

2. **ATTENTION — Facture FAC-2024-011** (425 424 $)
   - Échéance dans 12 jours
   - Prévoir relance préventive cette semaine

3. **INFO — Concentration client**
   - 3 clients représentent 72% de l'AR total
   - Recommandation : Diversification facturation

**Total AR à risque : 741 610 $**`,
  },
  documents: {
    'Résumer document': `**Résumé automatique — Document**

**Type détecté :** Contrat / Appel d'offres

**Points clés extraits :**

1. **Parties impliquées :** Donneur d'ouvrage municipal + Entrepreneur général
2. **Objet :** Travaux de génie civil — infrastructure urbaine
3. **Valeur contractuelle :** À compléter lors de l'attribution
4. **Durée :** 90 jours calendriers à compter de l'avis de départ
5. **Clauses importantes :** Pénalité de retard, cautionnement d'exécution 50%, assurance RC 2M$

**Mots-clés :** aqueduc, bitume, inspection, conformité, délai, addenda

**Classification suggérée :** Contrats → Municipaux → 2024`,

    'Proposer classement': `**Proposition de classement — IA**

**Document analysé :** [Document actuel]

**Classement recommandé :**
📁 Documents
  └── 📁 Contrats
    └── 📁 2024
      └── 📁 Municipal
        └── 📄 [Nom document] — v1.0

**Tags suggérés :** #contrat #municipal #2024 #infrastructure

**Liens croisés recommandés :**
- Relier au dossier soumission SOI-2024-019
- Relier au client "Ville de Québec"
- Relier au projet PRJ-2024-003 si attribué`,
  },
  reporting: {
    'Interpréter KPIs': `**Interprétation des KPIs — Analyse IA**

**Performance globale : Bonne (note 7,4/10)**

**Points forts :**
- Taux de succès à 42% (objectif 40%) — dépassé
- Marge moyenne des projets gagnés : 11,8%
- Croissance des soumissions : +23% vs même période N-1

**Points d'attention :**
- Cashflow serré en T1 (ratio liquidité : 1,2x vs objectif 1,5x)
- 2 projets avec dérive budgétaire > 10% (action correctrice requise)
- Délai moyen de recouvrement AR : 52 jours (objectif < 45)

**Recommandation stratégique :** Concentrer les efforts sur l'optimisation des achats (-5% potentiel) et l'accélération du recouvrement.`,

    'Rédiger rapport direction': `**Rapport de direction — ${new Date().toLocaleDateString('fr-CA')}**

**Sommaire exécutif**

La période en cours démontre une performance commerciale solide avec un taux de succès de 42%, dépassant l'objectif corporatif de 40%. La valeur totale des soumissions déposées atteint 4,2 M$, en hausse de 23% comparativement à la même période l'an dernier.

**Faits saillants**
Les projets actifs progressent globalement dans les paramètres établis, bien que deux chantiers nécessitent une attention particulière en raison d'une dérive budgétaire supérieure à 10%. Des mesures correctives ont été initiées.

**Perspectives**
Le pipeline de soumissions pour le prochain trimestre est vigoureux avec 8 dossiers en préparation représentant une valeur potentielle de 6,1 M$.

**Recommandation**
Maintenir le cap stratégique tout en renforçant le contrôle des coûts sur les projets en cours.`,
  },
  ia: {
    'Résumer capacités': `**Capacités IA — Bidexa**

L'assistant IA de Bidexa est intégré dans chaque module pour vous aider à :

**Rédaction automatique**
- Fiches clients, résumés AO, rapports d'avancement, bons de commande

**Analyse et détection**
- Anomalies budgétaires, dérives de projet, risques financiers

**Aide à la décision**
- Suggestion de prix, probabilité de succès, stratégie concurrentielle

**Extraction documentaire**
- Lecture et résumé de PDF d'appels d'offres

Chaque module dispose de boutons d'action rapide adaptés à son contexte.`,

    'Cas d\'usage avancés': `**Cas d'usage avancés — IA Bidexa**

1. **Optimisation du win rate**
Analysez l'historique de 18 mois pour identifier les patterns gagnants par type de client, estimateur et fourchette de prix.

2. **Prévision de cashflow**
Combinez les projets en cours, les soumissions probables et les historiques de paiement pour générer une prévision à 90 jours.

3. **Détection d'anomalies en cascade**
Surveillance automatique : une anomalie sur un bon de commande remonte vers le budget projet et alerte le chargé de projet.

4. **Benchmarking concurrentiel**
Constituez automatiquement une base de données concurrentielles à partir des résultats d'AO publics (SEAO).

5. **Rapport de rentabilité post-projet**
En fin de projet, générez un rapport comparatif estimation vs réel avec recommandations pour les prochains dossiers similaires.`,
  },
}

function getAIResponse(module: string, prompt: string): string {
  const moduleResps = MODULE_RESPONSES[module]
  if (moduleResps) {
    for (const [key, resp] of Object.entries(moduleResps)) {
      if (prompt.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(prompt.slice(0, 20).toLowerCase())) {
        return resp
      }
    }
  }
  return `**Analyse IA — Module ${module}**\n\nJ'ai bien reçu votre demande : "${prompt}"\n\nEn analysant les données disponibles dans ce module, voici mes observations :\n\n- Les indicateurs actuels sont dans des plages acceptables\n- Aucune anomalie critique détectée à ce stade\n- Des optimisations sont possibles sur 2-3 axes identifiés\n\n**Recommandation :** Pour une analyse plus précise, précisez le contexte ou sélectionnez un des boutons d'action rapide ci-dessus.`
}

function renderMD(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []
  let inTable = false
  let inUl = false

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // Apply bold
    line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

    // Detect table row: starts and ends with |
    if (/^\s*\|.+\|\s*$/.test(line)) {
      // Skip separator rows like |---|---|
      if (/^\s*\|[\s\-|:]+\|\s*$/.test(line)) continue

      if (inUl) { out.push('</ul>'); inUl = false }
      if (!inTable) { out.push('<table class="text-xs border-collapse w-full my-1">'); inTable = true }

      const cells = line.split('|').slice(1, -1)
      const isHeader = i === 0 || !/^\s*\|.+\|\s*$/.test(lines[i - 1] ?? '') || /^\s*\|[\s\-|:]+\|\s*$/.test(lines[i + 1] ?? '')
      const tag = isHeader ? 'th' : 'td'
      const cellClass = isHeader
        ? 'border border-slate-200 bg-slate-100 px-2 py-1 font-semibold text-slate-600'
        : 'border border-slate-200 px-2 py-1 text-slate-700'
      out.push('<tr>' + cells.map(c => `<${tag} class="${cellClass}">${c.trim()}</${tag}>`).join('') + '</tr>')
      continue
    }

    // Close table if we were in one
    if (inTable) { out.push('</table>'); inTable = false }

    // Bullet list: line starts with "- "
    if (/^- /.test(line)) {
      if (!inUl) { out.push('<ul class="list-disc list-inside space-y-0.5 my-1">'); inUl = true }
      out.push(`<li>${line.slice(2)}</li>`)
      continue
    }

    // Close ul if open
    if (inUl) { out.push('</ul>'); inUl = false }

    // Empty line → paragraph break
    if (line.trim() === '') {
      out.push('<br/>')
      continue
    }

    out.push(line + '<br/>')
  }

  if (inTable) out.push('</table>')
  if (inUl) out.push('</ul>')

  return out.join('')
}

interface AIAssistantProps {
  module: string
  title?: string
}

export function AIAssistant({ module, title }: AIAssistantProps) {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [quotaInfo, setQuotaInfo] = useState<{ remaining: { daily: number; monthly: number }; allowed: boolean; reason?: string } | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const actions = MODULE_ACTIONS[module] ?? []

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    const user = getCurrentUser()
    if (user) {
      const q = checkAIQuota(user.id, user.forfait)
      setQuotaInfo(q)
    }
  }, [])

  function sendMessage(text: string) {
    if (!text.trim()) return

    const user = getCurrentUser()
    if (user) {
      const q = checkAIQuota(user.id, user.forfait)
      setQuotaInfo(q)
      if (!q.allowed) {
        logAudit('AI_QUOTA_EXCEEDED', q.reason, user.id)
        return
      }
    }

    setInput('')
    const userMsg: AIMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: getAIResponse(module, text) }])
      setLoading(false)
      // Increment quota after successful response
      if (user) {
        incrementAIQuota(user.id)
        logAudit('AI_REQUEST', `Module: ${module}`, user.id)
        const q2 = checkAIQuota(user.id, user.forfait)
        setQuotaInfo(q2)
      }
    }, 700 + Math.random() * 500)
  }

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none shrink-0"
        style={{ background: '#0D1B2A' }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#C9A84C' }}>
            <Bot size={13} color="#0D1B2A" />
          </div>
          <span className="text-xs font-semibold text-white truncate">Assistant IA</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 flex items-center gap-1 shrink-0">
            <Sparkles size={9} /> actif
          </span>
        </div>
        <button className="text-white/60 hover:text-white transition shrink-0">
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {!collapsed && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Module label */}
          <div className="px-4 py-2 border-b border-slate-100 shrink-0">
            <p className="text-xs font-medium text-slate-500">{title ?? module}</p>
          </div>

          {/* Quota banner */}
          {quotaInfo && !quotaInfo.allowed && (
            <div className="mx-3 mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2 shrink-0">
              <AlertTriangle size={13} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700 font-medium">{quotaInfo.reason ?? 'Quota IA atteint'}</p>
            </div>
          )}
          {quotaInfo && quotaInfo.allowed && quotaInfo.remaining.daily <= 5 && (
            <div className="mx-3 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 shrink-0">
              <p className="text-xs text-amber-700">⚠ {quotaInfo.remaining.daily} requête{quotaInfo.remaining.daily > 1 ? 's' : ''} restante{quotaInfo.remaining.daily > 1 ? 's' : ''} aujourd&apos;hui</p>
            </div>
          )}
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6 italic">
                Cliquez sur une action ou posez une question.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${m.role === 'assistant' ? '' : 'bg-slate-200'}`} style={m.role === 'assistant' ? { background: '#C9A84C' } : {}}>
                  <Bot size={11} color={m.role === 'assistant' ? '#0D1B2A' : '#64748b'} />
                </div>
                <div
                  className={`text-xs rounded-xl px-3 py-2 leading-relaxed ${m.role === 'assistant' ? 'bg-slate-50 border border-slate-100 text-slate-700 w-full' : 'text-white max-w-[85%]'}`}
                  style={m.role === 'user' ? { background: '#0D1B2A' } : {}}
                >
                  <div dangerouslySetInnerHTML={{ __html: renderMD(m.content) }} />
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: '#C9A84C' }}><Bot size={11} color="#0D1B2A" /></div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="px-4 pb-3 pt-2 border-t border-slate-100 flex gap-2 shrink-0">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              placeholder={quotaInfo && !quotaInfo.allowed ? 'Quota atteint' : 'Votre question...'}
              disabled={quotaInfo !== null && !quotaInfo.allowed}
              className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-300 transition disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading || (quotaInfo !== null && !quotaInfo.allowed)}
              className="px-3 py-2 rounded-xl disabled:opacity-40 transition shrink-0"
              style={{ background: '#C9A84C' }}
            >
              <Send size={12} color="#0D1B2A" />
            </button>
          </div>
          {/* Quota footer */}
          {quotaInfo && quotaInfo.allowed && (
            <div className="px-4 pb-2 shrink-0">
              <p className="text-xs text-slate-400 text-center">{quotaInfo.remaining.daily} req. restantes aujourd&apos;hui</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
