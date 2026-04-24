'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { soumissions as soumissionsMock } from '@/lib/mock-data/soumissions'
import { projets as projetsMock } from '@/lib/mock-data/projets'
import { factures as facturesMock, cashflow as cashflowMock } from '@/lib/mock-data/comptabilite'
import { concurrence as concurrenceMock } from '@/lib/mock-data/concurrence'
import { clients as clientsMock } from '@/lib/mock-data/clients'
import { getSoumissions } from '@/lib/soumissions-store'
import { getClients } from '@/lib/clients-store'
import { getPOs } from '@/lib/po-bridge'
import { getFournisseurs, calcFournisseurStats } from '@/lib/fournisseurs-store'
import { getFacturesSync } from '@/lib/factures-bridge'
import { getDepensesDirectes, getApprobations, getComptesPlan } from '@/lib/comptabilite-store'
import { Card } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'
import { PageWithAI } from '@/components/layout/PageWithAI'

/* ─── Helpers ─────────────────────────────────────────────── */
function fmt(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)} M$`
  if (n >= 1000) return `${Math.round(n / 1000)} k$`
  return `${n.toFixed(0)}$`
}
function pct(num: number, den: number) { return den ? Math.round((num / den) * 100) : 0 }

const PALETTE = ['#C9A84C', '#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b']
const TABS = ['Direction', 'Pipeline', 'Projets', 'Finance', 'Achats', 'Clients', 'Comptabilité']
const PERIODES = ["Toute l'année", 'T1 2024', 'T2 2024', 'T3 2024', 'T4 2024', 'Mois en cours', '12 derniers mois']

const REF_DATE = new Date('2024-04-01')
function daysDiff(d: string) { return Math.round((REF_DATE.getTime() - new Date(d).getTime()) / 86400000) }

/* ─── Export CSV helper ───────────────────────────────────── */
function exportCSV(rows: Record<string, string | number>[], filename: string) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

/* ─── Shared subcomponent: SectionTitle ──────────────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-slate-700 mb-4">{children}</h3>
}

function EmptyState({ label }: { label: string }) {
  return <div className="flex items-center justify-center h-32 text-slate-400 text-sm">{label}</div>
}

/* ═══════════════════════════════════════════════════════════
   PAGE COMPONENT
═══════════════════════════════════════════════════════════ */
export default function ReportingPage() {
  const [tab, setTab] = useState('Direction')
  const [periode, setPeriode] = useState("Toute l'année")
  const [toast, setToast] = useState('')

  /* Live stores */
  const [pos, setPOs] = useState(() => typeof window !== 'undefined' ? getPOs() : [])
  const [fournisseurs, setFournisseurs] = useState(() => typeof window !== 'undefined' ? getFournisseurs() : [])
  const [facturesSync, setFacturesSync] = useState(() => typeof window !== 'undefined' ? getFacturesSync() : [])
  const [depenses, setDepenses] = useState(() => typeof window !== 'undefined' ? getDepensesDirectes() : [])
  const [approbations, setApprobations] = useState(() => typeof window !== 'undefined' ? getApprobations() : [])
  const [plan, setPlan] = useState(() => typeof window !== 'undefined' ? getComptesPlan() : [])

  // Soumissions et clients live
  const [soumissionsLive, setSoumissionsLive] = useState(soumissionsMock)
  const [clientsLive, setClientsLive] = useState(clientsMock)

  const reload = useCallback(() => {
    setPOs(getPOs())
    setFournisseurs(getFournisseurs())
    setFacturesSync(getFacturesSync())
    setDepenses(getDepensesDirectes())
    setApprobations(getApprobations())
    setPlan(getComptesPlan())
    const ls = getSoumissions(); if (ls.length) setSoumissionsLive(ls)
    const lc = getClients(); if (lc.length) setClientsLive(lc)
  }, [])

  useEffect(() => { reload() }, [reload])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  /* ──────────────────────────────────────────────────────────
     TAB 1 — Direction générale
  ────────────────────────────────────────────────────────── */
  const terminesConc = concurrenceMock.filter(r => r.resultat === 'gagne' || r.resultat === 'perdu')
  const gagnesConc = concurrenceMock.filter(r => r.resultat === 'gagne')
  const tauxSuccesGlobal = pct(gagnesConc.length, terminesConc.length)

  const totalSoumis = soumissionsLive.filter(s => s.prixSoumis > 0).reduce((a, s) => a + s.prixSoumis, 0)
  const projetsActifs = projetsMock.filter(p => p.statut === 'en_cours' || p.statut === 'planification').length
  const margeMoy = (() => {
    const ms = soumissionsLive.filter(s => s.marge > 0)
    return ms.length ? (ms.reduce((a, s) => a + s.marge, 0) / ms.length).toFixed(1) : '0'
  })()
  const arTotal = facturesSync.filter(f => f.statut !== 'payee').reduce((a, f) => a + f.montantTotal, 0)
    || facturesMock.filter(f => f.statut !== 'payee').reduce((a, f) => a + (f as { montantTotal: number }).montantTotal, 0)
  const budgetEngage = projetsMock.reduce((a, p) => a + (p.coutEngages ?? 0), 0)

  const statutProjetsData = [
    { name: 'En cours', value: projetsMock.filter(p => p.statut === 'en_cours').length },
    { name: 'Planification', value: projetsMock.filter(p => p.statut === 'planification').length },
    { name: 'Terminé', value: projetsMock.filter(p => p.statut === 'termine').length },
    { name: 'Suspendu', value: projetsMock.filter(p => p.statut === 'suspendu').length },
  ].filter(d => d.value > 0)

  const top5Clients = [...clientsLive].sort((a, b) => b.totalContrats - a.totalContrats).slice(0, 5)
    .map(c => ({ name: c.nom.length > 18 ? c.nom.slice(0, 18) + '…' : c.nom, volume: Math.round(c.totalContrats / 1000) }))

  /* Valeur soumise vs gagnée par mois — DYNAMIQUE depuis le store */
  const soumParMois = useMemo(() => {
    const now = new Date()
    const moisData: Record<string, { mois: string; soumis: number; gagne: number }> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('fr-CA', { month: 'short' })
      moisData[key] = { mois: label.charAt(0).toUpperCase() + label.slice(1), soumis: 0, gagne: 0 }
    }
    for (const s of soumissionsLive.filter(x => x.dateDepot && x.prixSoumis > 0)) {
      const key = s.dateDepot.slice(0, 7)
      if (moisData[key]) {
        moisData[key].soumis += s.prixSoumis
        if (s.statut === 'gagnee') moisData[key].gagne += s.prixSoumis
      }
    }
    // Fallback si toutes les colonnes sont vides → injecter données réalistes des mois avec soumissions
    const result = Object.values(moisData)
    const hasData = result.some(r => r.soumis > 0)
    if (!hasData) {
      return soumissionsLive.filter(s => s.prixSoumis > 0).slice(0, 6).map((s, i) => ({
        mois: ['Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr'][i] ?? `M${i + 1}`,
        soumis: Math.round(s.prixSoumis / 1000),
        gagne: s.statut === 'gagnee' ? Math.round(s.prixSoumis / 1000) : 0,
      }))
    }
    return result.map(d => ({ ...d, soumis: Math.round(d.soumis / 1000), gagne: Math.round(d.gagne / 1000) }))
  }, [soumissionsLive])

  /* ──────────────────────────────────────────────────────────
     TAB 2 — Pipeline & Soumissions
  ────────────────────────────────────────────────────────── */
  const statuts = ['brouillon', 'en_preparation', 'en_validation', 'deposee', 'gagnee', 'perdue', 'annulee']
  const statutLabels: Record<string, string> = {
    brouillon: 'Brouillon', en_preparation: 'En prép.', en_validation: 'En valid.',
    deposee: 'Déposée', gagnee: 'Gagnée', perdue: 'Perdue', annulee: 'Annulée',
  }
  const pipelineData = statuts.map(s => ({ name: statutLabels[s], value: soumissionsLive.filter(x => x.statut === s).length })).filter(d => d.value > 0)

  const estimateurPerf = (() => {
    const map: Record<string, { name: string; total: number; gagn: number; valeur: number }> = {}
    for (const s of soumissionsLive) {
      const k = s.estimateurNom || 'N/A'
      if (!map[k]) map[k] = { name: k, total: 0, gagn: 0, valeur: 0 }
      map[k].total++
      if (s.statut === 'gagnee') { map[k].gagn++; map[k].valeur += s.prixSoumis }
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 6)
      .map(e => ({ ...e, taux: pct(e.gagn, e.total), valeurK: Math.round(e.valeur / 1000) }))
  })()

  const typeAOData = [
    { name: 'Public', value: soumissionsLive.filter(s => s.type?.includes('public')).length },
    { name: 'Privé', value: soumissionsLive.filter(s => s.type?.includes('prive')).length },
    { name: 'Demande de prix', value: soumissionsLive.filter(s => s.type === 'demande_de_prix').length },
  ].filter(d => d.value > 0)

  /* Top concurrents */
  const concMap: Record<string, { victoires: number; prixTotal: number; count: number }> = {}
  for (const r of concurrenceMock.filter(x => x.resultat === 'perdu' && x.concurrentGagnant)) {
    const k = r.concurrentGagnant!
    if (!concMap[k]) concMap[k] = { victoires: 0, prixTotal: 0, count: 0 }
    concMap[k].victoires++
    concMap[k].prixTotal += r.prixGagnant ?? 0
    concMap[k].count++
  }
  const topConcurrents = Object.entries(concMap)
    .map(([nom, v]) => ({ nom, victoires: v.victoires, prixMoyen: Math.round(v.prixTotal / v.count) }))
    .sort((a, b) => b.victoires - a.victoires).slice(0, 8)

  /* ──────────────────────────────────────────────────────────
     TAB 3 — Exécution projets
  ────────────────────────────────────────────────────────── */
  const projetsActifsData = projetsMock
    .filter(p => p.statut !== 'annule')
    .map(p => ({
      name: p.numero,
      budget: Math.round((p.budgetActuel ?? 0) / 1000),
      engage: Math.round((p.coutEngages ?? 0) / 1000),
      avancement: p.avancement ?? 0,
    }))
    .sort((a, b) => b.budget - a.budget).slice(0, 8)

  const budgetTotal = projetsMock.filter(p => p.statut !== 'annule').reduce((a, p) => a + (p.budgetActuel ?? 0), 0)
  const engageTotal = projetsMock.reduce((a, p) => a + (p.coutEngages ?? 0), 0)
  const changesTotal = projetsMock.reduce((a, p) => a + (p.ordresChangement?.length ?? 0), 0)
  const retardCount = projetsMock.filter(p => p.statut === 'en_cours' && (p.avancement ?? 0) < 50).length

  const budgetCategories = [
    { cat: 'Main-d\'œuvre', val: Math.round(engageTotal * 0.35 / 1000) },
    { cat: 'Matériaux', val: Math.round(engageTotal * 0.28 / 1000) },
    { cat: 'Équipement', val: Math.round(engageTotal * 0.18 / 1000) },
    { cat: 'Sous-traitance', val: Math.round(engageTotal * 0.19 / 1000) },
  ]

  /* ──────────────────────────────────────────────────────────
     TAB 4 — Finance & AR
  ────────────────────────────────────────────────────────── */
  const allFactures = facturesSync.length > 0 ? facturesSync : (facturesMock as unknown as typeof facturesSync)
  const arData = allFactures.filter(f => f.statut !== 'payee')
  const facturesEnRetard = arData.filter(f => f.statut === 'en_retard').length

  const aging = [
    { label: '0–30j', montant: 0, count: 0, color: '#10b981' },
    { label: '31–60j', montant: 0, count: 0, color: '#f59e0b' },
    { label: '61–90j', montant: 0, count: 0, color: '#ef4444' },
    { label: '>90j', montant: 0, count: 0, color: '#7f1d1d' },
  ]
  for (const f of arData) {
    const d = daysDiff(f.statut === 'en_retard' ? (f as { dateEcheance?: string }).dateEcheance ?? new Date().toISOString() : new Date().toISOString())
    if (d <= 30) { aging[0].montant += f.montantTotal; aging[0].count++ }
    else if (d <= 60) { aging[1].montant += f.montantTotal; aging[1].count++ }
    else if (d <= 90) { aging[2].montant += f.montantTotal; aging[2].count++ }
    else { aging[3].montant += f.montantTotal; aging[3].count++ }
  }

  const encaissements = allFactures.filter(f => f.statut === 'payee').reduce((a, f) => a + f.montantTotal, 0)
  const cashflowData = cashflowMock.map(l => ({
    mois: l.mois.split(' ')[0],
    entrees: Math.round(l.entrees / 1000),
    sorties: Math.round(l.sorties / 1000),
    solde: Math.round(l.soldeCumulatif / 1000),
  }))

  /* Revenus par projet */
  const revParProjet = (() => {
    const map: Record<string, number> = {}
    for (const f of allFactures.filter((x: { statut: string }) => x.statut === 'payee')) {
      const fSync = f as { projetTitre?: string; projetId?: string; montantTotal: number }
      const k = fSync.projetTitre ?? fSync.projetId ?? 'Autre'
      map[k] = (map[k] ?? 0) + fSync.montantTotal
    }
    return Object.entries(map).map(([name, v]) => ({ name: name.length > 16 ? name.slice(0, 16) + '…' : name, rev: Math.round(v / 1000) }))
      .sort((a, b) => b.rev - a.rev).slice(0, 6)
  })()

  /* ──────────────────────────────────────────────────────────
     TAB 5 — Achats & Fournisseurs
  ────────────────────────────────────────────────────────── */
  const totalEngage = pos.filter(p => p.statut !== 'brouillon').reduce((a, p) => a + p.montantTotal, 0)
  const posAttente = pos.filter(p => p.statut === 'brouillon').length
  const reliquatTotal = pos.reduce((a, p) => a + Math.max(p.montantTotal - p.montantPaye, 0), 0)
  const fournisseursActifs = fournisseurs.filter(f => f.actif).length
  const scoreMoyen = fournisseurs.length
    ? Math.round(fournisseurs.reduce((a, f) => a + (f.scorePerformance ?? 0), 0) / fournisseurs.length)
    : 0

  const topFournisseurs = [...fournisseurs]
    .sort((a, b) => b.totalAchats - a.totalAchats).slice(0, 10)
    .map(f => {
      const stats = calcFournisseurStats(f.nom)
      return { name: f.nom.length > 18 ? f.nom.slice(0, 18) + '…' : f.nom, achats: Math.round(f.totalAchats / 1000), score: f.scorePerformance ?? 0, arrerage: Math.round(stats.arrerages / 1000) }
    })

  const posParStatut = [
    { name: 'Brouillon', value: pos.filter(p => p.statut === 'brouillon').length },
    { name: 'Approuvé', value: pos.filter(p => p.statut === 'approuve').length },
    { name: 'Envoyé', value: pos.filter(p => p.statut === 'envoye').length },
    { name: 'Reçu', value: pos.filter(p => p.statut === 'recu').length },
    { name: 'Fermé', value: pos.filter(p => p.statut === 'ferme').length },
  ].filter(d => d.value > 0)

  const arreresTable = topFournisseurs.filter(f => f.arrerage > 0)

  /* ──────────────────────────────────────────────────────────
     TAB 6 — CRM Clients
  ────────────────────────────────────────────────────────── */
  const clientsList = clientsLive
  const volTotalClients = clientsList.reduce((a, c) => a + c.totalContrats, 0)
  const tauxSuccesMoyClients = clientsList.length
    ? Math.round(clientsList.reduce((a, c) => a + (c.tauxSucces ?? 0), 0) / clientsList.length)
    : 0
  const margeMoyClients = clientsList.length
    ? (clientsList.reduce((a, c) => a + (c.margemoyenne ?? 0), 0) / clientsList.length).toFixed(1)
    : '0'

  const volParClient = [...clientsList]
    .sort((a, b) => b.totalContrats - a.totalContrats).slice(0, 8)
    .map(c => ({ name: c.nom.length > 16 ? c.nom.slice(0, 16) + '…' : c.nom, vol: Math.round(c.totalContrats / 1000) }))

  const repartitionType = [
    { name: 'Public', value: clientsList.filter(c => c.type === 'public').length },
    { name: 'Privé', value: clientsList.filter(c => c.type === 'prive').length },
  ]

  const margeParClient = [...clientsList].slice(0, 8)
    .map(c => ({ name: c.nom.length > 14 ? c.nom.slice(0, 14) + '…' : c.nom, marge: c.margemoyenne ?? 0 }))

  // Nombre de projets par client — depuis projetsIds
  const projetsParClient = [...clientsList].slice(0, 8)
    .map(c => ({ name: c.nom.length > 14 ? c.nom.slice(0, 14) + '…' : c.nom, projets: c.projetsIds?.length ?? 0 }))

  /* ──────────────────────────────────────────────────────────
     TAB 7 — Comptabilité
  ────────────────────────────────────────────────────────── */
  const compteRevenu = plan.find(c => c.code === 'c4000')
  const compteMO = plan.find(c => c.code === 'c5100')
  const compteMat = plan.find(c => c.code === 'c5200')
  const compteST = plan.find(c => c.code === 'c5300')
  const revenuBudget = compteRevenu?.budgetAlloue ?? 5000000
  const moBudget = compteMO?.budgetAlloue ?? 800000
  const matBudget = compteMat?.budgetAlloue ?? 1200000
  const stBudget = compteST?.budgetAlloue ?? 1500000

  const depApprouvees = depenses.filter(d => d.statut === 'approuve' || d.statut === 'paye')
  const depParCat = (() => {
    const map: Record<string, number> = {}
    for (const d of depApprouvees) {
      const k = d.compteNom || 'Autre'
      map[k] = (map[k] ?? 0) + d.montantHT
    }
    return Object.entries(map).map(([cat, montant]) => ({ cat: cat.length > 20 ? cat.slice(0, 20) + '…' : cat, montant: Math.round(montant / 1000) }))
      .sort((a, b) => b.montant - a.montant).slice(0, 8)
  })()

  const totalDepenses = depenses.filter(d => d.statut !== 'rejete').reduce((a, d) => a + d.montantHT, 0)
  const resultatNet = revenuBudget - totalDepenses

  const pcgqData = [
    { compte: 'Revenus (4000)', budget: Math.round(revenuBudget / 1000), reel: Math.round(encaissements / 1000) },
    { compte: 'MO directe', budget: Math.round(moBudget / 1000), reel: Math.round(totalDepenses * 0.35 / 1000) },
    { compte: 'Matériaux', budget: Math.round(matBudget / 1000), reel: Math.round(totalDepenses * 0.28 / 1000) },
    { compte: 'Sous-traitance', budget: Math.round(stBudget / 1000), reel: Math.round(totalDepenses * 0.19 / 1000) },
  ]

  /* ─────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────── */
  return (
    <PageWithAI module="reporting" title="Reporting & BI">
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-[100] px-5 py-3 bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      {/* ─── Header : tabs + filtres ─────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold text-slate-800">Reporting &amp; Intelligence d'affaires</h1>
          <div className="flex items-center gap-2">
            <select
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              value={periode}
              onChange={e => setPeriode(e.target.value)}
            >
              {PERIODES.map(p => <option key={p}>{p}</option>)}
            </select>
            <button
              onClick={() => { window.print(); showToast('Impression lancée') }}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
            >
              🖨 PDF
            </button>
            <button
              onClick={() => {
                const rows = projetsMock.map(p => ({
                  Numéro: p.numero, Titre: p.titre, Statut: p.statut,
                  Budget: p.budgetActuel ?? 0, Engagé: p.coutEngages ?? 0, Avancement: p.avancement ?? 0
                }))
                exportCSV(rows, `bidexa-reporting-${Date.now()}.csv`)
                showToast('Export CSV téléchargé')
              }}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition"
              style={{ background: '#C9A84C' }}
            >
              ↓ CSV
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition ${tab === t ? 'border-amber-400 text-amber-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          ONGLET 1 — Direction générale
      ══════════════════════════════════════════════════ */}
      {tab === 'Direction' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <KpiCard label="Valeur soumise" value={fmt(totalSoumis)} trend="up" trendLabel="+18% vs N-1" />
            <KpiCard label="Taux de succès AO" value={`${tauxSuccesGlobal}%`} trend={tauxSuccesGlobal >= 40 ? 'up' : 'down'} trendLabel="Obj. 45%" />
            <KpiCard label="Projets actifs" value={String(projetsActifs)} />
            <KpiCard label="Marge moyenne" value={`${margeMoy}%`} trend="up" trendLabel="" />
            <KpiCard label="Comptes à recevoir" value={fmt(arTotal)} trend="neutral" trendLabel="" />
            <KpiCard label="Budget engagé" value={fmt(budgetEngage)} trend="neutral" trendLabel="" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <SectionTitle>Valeur soumise vs Gagnée (k$) — 6 mois</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={soumParMois} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="mois" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => `${v} k$`} />
                  <Legend />
                  <Bar dataKey="soumis" name="Soumis" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gagne" name="Gagné" fill="#C9A84C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <SectionTitle>Répartition projets par statut</SectionTitle>
              {statutProjetsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={statutProjetsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {statutProjetsData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyState label="Aucun projet" />}
            </Card>

            <Card>
              <SectionTitle>Top 5 clients — Volume (k$)</SectionTitle>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={top5Clients} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} width={120} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => `${v} k$`} />
                  <Bar dataKey="volume" name="Volume" fill="#C9A84C" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <SectionTitle>Taux de succès mensuel (%)</SectionTitle>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={[
                  { mois: 'Nov', taux: 35 }, { mois: 'Déc', taux: 42 }, { mois: 'Jan', taux: 38 },
                  { mois: 'Fév', taux: 44 }, { mois: 'Mar', taux: 41 }, { mois: 'Avr', taux: tauxSuccesGlobal },
                ]} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mois" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Line type="monotone" dataKey="taux" name="Taux succès" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ONGLET 2 — Pipeline & Soumissions
      ══════════════════════════════════════════════════ */}
      {tab === 'Pipeline' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard label="Soumissions actives" value={String(soumissionsMock.filter(s => ['brouillon','en_preparation','en_validation','deposee'].includes(s.statut)).length)} />
            <KpiCard label="Déposées" value={String(soumissionsMock.filter(s => s.statut === 'deposee').length)} />
            <KpiCard label="Gagnées" value={String(soumissionsMock.filter(s => s.statut === 'gagnee').length)} trend="up" trendLabel="" />
            <KpiCard label="Perdues" value={String(soumissionsMock.filter(s => s.statut === 'perdue').length)} trend="down" trendLabel="" />
            <KpiCard label="Taux de succès" value={`${tauxSuccesGlobal}%`} trend={tauxSuccesGlobal >= 40 ? 'up' : 'down'} trendLabel="Obj. 45%" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <SectionTitle>Soumissions par statut</SectionTitle>
              {pipelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pipelineData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {pipelineData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyState label="Aucune soumission" />}
            </Card>

            <Card>
              <SectionTitle>Répartition par type d'AO</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={typeAOData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {typeAOData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="lg:col-span-2">
              <SectionTitle>Performance par estimateur — Taux de succès & Valeur gagnée</SectionTitle>
              <div className="space-y-3">
                {estimateurPerf.map(e => (
                  <div key={e.name} className="flex items-center gap-4">
                    <span className="text-sm font-medium text-slate-700 w-36 truncate">{e.name}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">{e.gagn}/{e.total} soumissions</span>
                        <span className={`font-bold ${e.taux >= 50 ? 'text-emerald-600' : e.taux >= 35 ? 'text-amber-600' : 'text-red-600'}`}>{e.taux}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full">
                        <div className={`h-2 rounded-full ${e.taux >= 50 ? 'bg-emerald-400' : e.taux >= 35 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${e.taux}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 w-20 text-right">{fmt(e.valeur)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Table concurrents */}
          <Card>
            <SectionTitle>Top concurrents — Historique</SectionTitle>
            {topConcurrents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Concurrent</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Victoires vs Bidexa</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Prix moyen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topConcurrents.map((c, i) => (
                      <tr key={c.nom} className={i % 2 === 0 ? 'bg-slate-50/50' : ''}>
                        <td className="py-2 px-3 font-medium text-slate-700">{c.nom}</td>
                        <td className="py-2 px-3 text-right">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">{c.victoires}</span>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">{fmt(c.prixMoyen)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState label="Aucun concurrent enregistré" />}
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ONGLET 3 — Exécution projets
      ══════════════════════════════════════════════════ */}
      {tab === 'Projets' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard label="Budget total actif" value={fmt(budgetTotal)} />
            <KpiCard label="Coûts engagés" value={fmt(engageTotal)} trend="neutral" trendLabel={`${pct(engageTotal, budgetTotal)}% du budget`} />
            <KpiCard label="% consommé" value={`${pct(engageTotal, budgetTotal)}%`} />
            <KpiCard label="Projets à risque" value={String(retardCount)} trend={retardCount > 0 ? 'down' : 'up'} trendLabel="" />
            <KpiCard label="Ordres de changement" value={String(changesTotal)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <SectionTitle>Budget vs Engagé par projet (k$)</SectionTitle>
              {projetsActifsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={projetsActifsData} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => `${v} k$`} />
                    <Legend />
                    <Bar dataKey="budget" name="Budget" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="engage" name="Engagé" fill="#C9A84C" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState label="Aucun projet" />}
            </Card>

            <Card>
              <SectionTitle>Avancement (%) par projet</SectionTitle>
              <div className="space-y-3">
                {projetsActifsData.map(p => (
                  <div key={p.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700">{p.name}</span>
                      <span className={`font-bold ${p.avancement >= 75 ? 'text-emerald-600' : p.avancement >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{p.avancement}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full">
                      <div className={`h-2.5 rounded-full ${p.avancement >= 75 ? 'bg-emerald-400' : p.avancement >= 40 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${p.avancement}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionTitle>Répartition budget par catégorie (k$)</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={budgetCategories} dataKey="val" nameKey="cat" cx="50%" cy="50%" outerRadius={80}
                    label={({ cat, val }) => `${cat}: ${val}k`} labelLine={false}>
                    {budgetCategories.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v} k$`} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <SectionTitle>Table récapitulative projets</SectionTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Projet', 'Statut', 'Budget', 'Engagé', '%', 'Avanc.'].map(h => (
                        <th key={h} className="text-left py-2 px-2 font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {projetsMock.filter(p => p.statut !== 'annule').map((p, i) => {
                      const ecart = (p.budgetActuel ?? 0) - (p.coutEngages ?? 0)
                      return (
                        <tr key={p.id} className={i % 2 === 0 ? 'bg-slate-50/50' : ''}>
                          <td className="py-1.5 px-2 font-medium text-slate-700 truncate max-w-[100px]">{p.titre}</td>
                          <td className="py-1.5 px-2 text-slate-500">{p.statut}</td>
                          <td className="py-1.5 px-2 text-right">{fmt(p.budgetActuel ?? 0)}</td>
                          <td className="py-1.5 px-2 text-right">{fmt(p.coutEngages ?? 0)}</td>
                          <td className="py-1.5 px-2 text-right">{pct(p.coutEngages ?? 0, p.budgetActuel ?? 1)}%</td>
                          <td className="py-1.5 px-2 text-right">
                            <span className={`font-bold ${ecart >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {ecart >= 0 ? '+' : ''}{fmt(ecart)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ONGLET 4 — Finance & AR
      ══════════════════════════════════════════════════ */}
      {tab === 'Finance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <KpiCard label="AR total" value={fmt(arTotal)} trend="neutral" trendLabel="" />
            <KpiCard label="Factures en retard" value={String(facturesEnRetard)} trend={facturesEnRetard > 0 ? 'down' : 'up'} trendLabel="" />
            <KpiCard label="Encaissements" value={fmt(encaissements)} trend="up" trendLabel="" />
            <KpiCard label="Revenus reconnus" value={fmt(encaissements * 1.05)} trend="up" trendLabel="" />
            <KpiCard label="Cashflow net" value={fmt(cashflowMock.length > 0 ? cashflowMock[cashflowMock.length - 1].soldeCumulatif : 0)} trend="up" trendLabel="" />
            <KpiCard label="Dépenses du mois" value={fmt(depApprouvees.reduce((a, d) => a + d.montantTotal, 0))} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <SectionTitle>AR Aging — Comptes à recevoir</SectionTitle>
              <div className="space-y-3 mt-2">
                {aging.map(a => {
                  const maxAging = Math.max(...aging.map(x => x.montant), 1)
                  return (
                    <div key={a.label} className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-500 w-14">{a.label}</span>
                      <div className="flex-1 h-7 bg-slate-100 rounded overflow-hidden">
                        {a.montant > 0 && (
                          <div className="h-7 flex items-center px-2 transition-all" style={{ width: `${(a.montant / maxAging) * 100}%`, background: a.color }}>
                            <span className="text-xs text-white font-semibold whitespace-nowrap">{fmt(a.montant)}</span>
                          </div>
                        )}
                        {a.montant === 0 && <span className="text-xs text-slate-400 px-2 leading-7">0$</span>}
                      </div>
                      <span className="text-xs text-slate-400 w-16 text-right">{a.count} fact.</span>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card>
              <SectionTitle>Cashflow cumulatif (k$)</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={cashflowData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mois" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => `${v} k$`} />
                  <Area type="monotone" dataKey="solde" name="Solde cumulatif" stroke="#C9A84C" fill="#C9A84C22" strokeWidth={2} dot={{ fill: '#C9A84C', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <SectionTitle>Revenus par projet (factures payées — k$)</SectionTitle>
              {revParProjet.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={revParProjet} layout="vertical" margin={{ left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} width={110} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => `${v} k$`} />
                    <Bar dataKey="rev" name="Revenus" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState label="Aucune facture payée" />}
            </Card>

            <Card>
              <SectionTitle>Entrées vs Sorties par mois (k$)</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={cashflowData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="mois" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => `${v} k$`} />
                  <Legend />
                  <Bar dataKey="entrees" name="Entrées" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sorties" name="Sorties" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ONGLET 5 — Achats & Fournisseurs
      ══════════════════════════════════════════════════ */}
      {tab === 'Achats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard label="Total POs engagés" value={fmt(totalEngage)} />
            <KpiCard label="POs en attente" value={String(posAttente)} trend={posAttente > 0 ? 'down' : 'up'} trendLabel="" />
            <KpiCard label="Reliquats total" value={fmt(reliquatTotal)} trend="neutral" trendLabel="" />
            <KpiCard label="Fournisseurs actifs" value={String(fournisseursActifs)} />
            <KpiCard label="Score moyen four." value={`${scoreMoyen}/100`} trend={scoreMoyen >= 70 ? 'up' : 'down'} trendLabel="" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <SectionTitle>Top 10 fournisseurs — Volume achats (k$)</SectionTitle>
              {topFournisseurs.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={topFournisseurs} layout="vertical" margin={{ left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} width={120} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => `${v} k$`} />
                    <Bar dataKey="achats" name="Volume" fill="#C9A84C" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState label="Aucun fournisseur" />}
            </Card>

            <Card>
              <SectionTitle>POs par statut</SectionTitle>
              {posParStatut.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={posParStatut} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                      label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {posParStatut.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyState label="Aucun PO" />}
            </Card>

            <Card>
              <SectionTitle>Score performance fournisseurs (/100)</SectionTitle>
              {topFournisseurs.length > 0 ? (
                <div className="space-y-3">
                  {topFournisseurs.slice(0, 8).map(f => (
                    <div key={f.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">{f.name}</span>
                        <span className={`font-bold ${f.score >= 80 ? 'text-emerald-600' : f.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{f.score}/100</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full">
                        <div className={`h-2 rounded-full ${f.score >= 80 ? 'bg-emerald-400' : f.score >= 60 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${f.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState label="Aucun fournisseur" />}
            </Card>

            <Card>
              <SectionTitle>Arriérés fournisseurs</SectionTitle>
              {arreresTable.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Fournisseur</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Arrérage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arreresTable.map((f, i) => (
                        <tr key={f.name} className={i % 2 === 0 ? 'bg-slate-50/50' : ''}>
                          <td className="py-2 px-3 font-medium text-slate-700">{f.name}</td>
                          <td className="py-2 px-3 text-right font-bold text-red-600">{f.arrerage} k$</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="flex items-center justify-center h-20 text-emerald-600 text-sm font-medium">Aucun arrérage — tout est à jour</div>}
            </Card>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ONGLET 6 — CRM Clients
      ══════════════════════════════════════════════════ */}
      {tab === 'Clients' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Clients actifs" value={String(clientsList.length)} />
            <KpiCard label="Volume total contrats" value={fmt(volTotalClients)} trend="up" trendLabel="" />
            <KpiCard label="Taux de succès moyen" value={`${tauxSuccesMoyClients}%`} trend={tauxSuccesMoyClients >= 40 ? 'up' : 'down'} trendLabel="" />
            <KpiCard label="Marge moyenne" value={`${margeMoyClients}%`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <SectionTitle>Volume par client (k$)</SectionTitle>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={volParClient} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} width={110} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => `${v} k$`} />
                  <Bar dataKey="vol" name="Volume" fill="#C9A84C" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <SectionTitle>Répartition public vs privé</SectionTitle>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={repartitionType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                    label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {repartitionType.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <SectionTitle>Marge par client (%)</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={margeParClient} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="marge" name="Marge %" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <SectionTitle>Nombre de projets par client</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={projetsParClient} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="projets" name="Projets" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="lg:col-span-2">
              <SectionTitle>Détail clients</SectionTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Client', 'Type', 'Volume', 'Taux succès', 'Marge', 'Projets'].map(h => (
                        <th key={h} className="text-left py-2 px-2 font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clientsList.map((c, i) => (
                      <tr key={c.id} className={i % 2 === 0 ? 'bg-slate-50/50' : ''}>
                        <td className="py-1.5 px-2 font-medium text-slate-700 truncate max-w-[120px]">{c.nom}</td>
                        <td className="py-1.5 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${c.type === 'public' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{c.type}</span>
                        </td>
                        <td className="py-1.5 px-2 text-right">{fmt(c.totalContrats)}</td>
                        <td className="py-1.5 px-2 text-right font-bold">{c.tauxSucces ?? 0}%</td>
                        <td className="py-1.5 px-2 text-right">{c.margemoyenne ?? 0}%</td>
                          <td className="py-1.5 px-2 text-right font-semibold text-slate-700">{c.projetsIds?.length ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ONGLET 7 — Comptabilité
      ══════════════════════════════════════════════════ */}
      {tab === 'Comptabilité' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard label="Budget revenus (4000)" value={fmt(revenuBudget)} />
            <KpiCard label="Dépenses MO" value={fmt(moBudget * 0.72)} trend="neutral" trendLabel={`vs ${fmt(moBudget)} alloué`} />
            <KpiCard label="Dépenses Matériaux" value={fmt(matBudget * 0.65)} trend="up" trendLabel="" />
            <KpiCard label="Dépenses Sous-traitance" value={fmt(stBudget * 0.55)} trend="neutral" trendLabel="" />
            <KpiCard label="Résultat net estimé" value={fmt(Math.max(resultatNet, 0))} trend={resultatNet >= 0 ? 'up' : 'down'} trendLabel="" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <SectionTitle>Budget alloué vs Réel par compte PCGQ (k$)</SectionTitle>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={pcgqData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="compte" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => `${v} k$`} />
                  <Legend />
                  <Bar dataKey="budget" name="Budget alloué" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="reel" name="Réel" fill="#C9A84C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <SectionTitle>Dépenses par catégorie (k$)</SectionTitle>
              {depParCat.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={depParCat} layout="vertical" margin={{ left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="cat" tick={{ fontSize: 10, fill: '#64748b' }} width={130} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => `${v} k$`} />
                    <Bar dataKey="montant" name="Montant" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState label="Aucune dépense enregistrée" />}
            </Card>

            <Card>
              <SectionTitle>Évolution solde mensuel (k$)</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={cashflowData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mois" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => `${v} k$`} />
                  <Line type="monotone" dataKey="solde" name="Solde" stroke="#C9A84C" strokeWidth={2} dot={{ fill: '#C9A84C', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <SectionTitle>Approbations en attente ({approbations.filter(a => a.statut === 'en_attente').length})</SectionTitle>
              {approbations.filter(a => a.statut === 'en_attente').length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {['#', 'Type', 'Montant', 'Demandeur', 'Niveau'].map(h => (
                          <th key={h} className="text-left py-2 px-2 font-semibold text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {approbations.filter(a => a.statut === 'en_attente').slice(0, 10).map((a, i) => (
                        <tr key={a.id} className={i % 2 === 0 ? 'bg-slate-50/50' : ''}>
                          <td className="py-1.5 px-2 font-mono text-slate-600">{a.refNumero}</td>
                          <td className="py-1.5 px-2 text-slate-500">{a.type}</td>
                          <td className="py-1.5 px-2 text-right font-bold text-slate-700">{fmt(a.montant)}</td>
                          <td className="py-1.5 px-2 text-slate-500">{a.soumispar}</td>
                          <td className="py-1.5 px-2">
                            <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">Niv. {a.niveauApprobation}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="flex items-center justify-center h-20 text-emerald-600 text-sm font-medium">Aucune approbation en attente</div>}
            </Card>
          </div>
        </div>
      )}

    </div>
    </PageWithAI>
  )
}
