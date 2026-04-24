'use client'
import { useState, useEffect } from 'react'
import { KpiCard } from '@/components/ui/KpiCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { soumissions as soumissionsMock } from '@/lib/mock-data/soumissions'
import { projets as projetsMock } from '@/lib/mock-data/projets'
import { factures as facturesMock } from '@/lib/mock-data/comptabilite'
import { concurrence as concurrenceMock } from '@/lib/mock-data/concurrence'
import { getSoumissions } from '@/lib/soumissions-store'
import { getFacturesSync } from '@/lib/factures-bridge'
import type { Soumission } from '@/types'
import {
  DollarSign, TrendingUp, FolderKanban, Percent,
  Clock, AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { CashflowChart } from '@/components/dashboard/CashflowChart'
import { PipelineChart } from '@/components/dashboard/PipelineChart'

function formatMoney(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)} M$`
  if (n >= 1000) return `${Math.round(n / 1000)} k$`
  return `${n}$`
}

export default function DashboardPage() {
  // Données live depuis les stores localStorage (fallback sur mock si vide)
  const [soumissions, setSoumissions] = useState<Soumission[]>(soumissionsMock)
  const [factures, setFactures] = useState(facturesMock)

  useEffect(() => {
    const liveSoumissions = getSoumissions()
    if (liveSoumissions.length > 0) setSoumissions(liveSoumissions)
    const liveFactures = getFacturesSync()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (liveFactures.length > 0) setFactures(liveFactures as any)
  }, [])

  // projets et concurrence restent sur le store mock (pas encore de store localStorage dédié)
  const projets = projetsMock
  const concurrence = concurrenceMock
  const totalSoumis = soumissions.filter(s => s.prixSoumis > 0).reduce((a, s) => a + s.prixSoumis, 0)
  const termines = concurrence.filter(r => r.resultat === 'gagne' || r.resultat === 'perdu')
  const gagnes = concurrence.filter(r => r.resultat === 'gagne')
  const tauxSucces = termines.length ? Math.round((gagnes.length / termines.length) * 100) : 0
  const projetsActifs = projets.filter(p => p.statut === 'en_cours' || p.statut === 'planification').length
  const projetsEnCours = projets.filter(p => p.statut === 'en_cours').length
  const marges = soumissions.filter(s => s.marge > 0).map(s => s.marge)
  const margeMoy = marges.length ? (marges.reduce((a, b) => a + b, 0) / marges.length).toFixed(1) : 0
  const facturesOuvertes = factures.filter(f => f.statut !== 'payee' && f.statut !== 'brouillon')
  const ar = facturesOuvertes.reduce((a, f) => a + f.montantTotal, 0)
  const facturesEnRetard = facturesOuvertes.filter(f => f.statut === 'en_retard').length
  const budgetEnCours = projets.filter(p => p.statut === 'en_cours').reduce((a, p) => a + p.budgetActuel, 0)

  // KPI derived subtitles
  const soumissionsEnCours = soumissions.filter(s =>
    ['en_preparation', 'en_validation', 'brouillon', 'deposee'].includes(s.statut)
  ).length
  const soumissionsDeposees = soumissions.filter(s => s.statut === 'deposee').length

  const deadlines = soumissions
    .filter(s => ['en_preparation', 'en_validation', 'brouillon'].includes(s.statut) && s.dateDepot)
    .sort((a, b) => a.dateDepot.localeCompare(b.dateDepot))
    .slice(0, 5)

  // Dynamic recent activity built from mock data
  type ActivityType = 'success' | 'warning' | 'info'
  interface Activity {
    action: string
    detail: string
    date: string
    type: ActivityType
  }

  const activityItems: Activity[] = []

  // Soumissions gagnées
  soumissions
    .filter(s => s.statut === 'gagnee')
    .sort((a, b) => b.dateDepot.localeCompare(a.dateDepot))
    .slice(0, 2)
    .forEach(s => {
      activityItems.push({
        action: 'Soumission gagnée',
        detail: `${s.numero} — ${s.clientNom}`,
        date: s.dateDepot,
        type: 'success',
      })
    })

  // Soumissions perdues
  soumissions
    .filter(s => s.statut === 'perdue')
    .sort((a, b) => b.dateDepot.localeCompare(a.dateDepot))
    .slice(0, 1)
    .forEach(s => {
      activityItems.push({
        action: 'Soumission perdue',
        detail: `${s.numero} — ${s.clientNom}`,
        date: s.dateDepot,
        type: 'warning',
      })
    })

  // Projets démarrés récemment (en_cours with dateDebut)
  projets
    .filter(p => p.statut === 'en_cours' && p.dateDebut)
    .sort((a, b) => b.dateDebut.localeCompare(a.dateDebut))
    .slice(0, 2)
    .forEach(p => {
      activityItems.push({
        action: 'Projet démarré',
        detail: `${p.numero} — ${p.clientNom}`,
        date: p.dateDebut,
        type: 'info',
      })
    })

  // Factures émises récemment
  factures
    .filter(f => f.statut === 'payee' || f.statut === 'envoyee' || f.statut === 'partiellement_payee')
    .sort((a, b) => b.dateEmission.localeCompare(a.dateEmission))
    .slice(0, 1)
    .forEach(f => {
      activityItems.push({
        action: f.statut === 'payee' ? 'Paiement reçu' : 'Facture émise',
        detail: `${f.numero} — ${formatMoney(f.montantTotal)}`,
        date: f.datePaiement ?? f.dateEmission,
        type: f.statut === 'payee' ? 'success' : 'info',
      })
    })

  // Sort all by date desc and take top 5
  const recentActivity = activityItems
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  return (
    <div className="space-y-6 overflow-y-auto flex-1">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          label="Valeur soumise"
          value={formatMoney(totalSoumis)}
          sub={`${soumissionsEnCours} soumissions actives`}
          trend="up"
          trendLabel="+18% vs an dernier"
          icon={<DollarSign size={18} color="#C9A84C" />}
          accent
        />
        <KpiCard
          label="Taux de succès"
          value={`${Math.round((gagnes.length / Math.max(termines.length, 1)) * 100)}%`}
          sub={`${gagnes.length}/${termines.length} AO terminés`}
          trend="up"
          trendLabel="+5% vs an dernier"
          icon={<TrendingUp size={18} color="#3b82f6" />}
        />
        <KpiCard
          label="Projets actifs"
          value={String(projetsActifs)}
          sub={`dont ${projetsEnCours} en cours`}
          icon={<FolderKanban size={18} color="#8b5cf6" />}
        />
        <KpiCard
          label="Marge moyenne"
          value={`${margeMoy}%`}
          sub={`sur ${marges.length} soumissions déposées`}
          trend="neutral"
          trendLabel="Stable"
          icon={<Percent size={18} color="#10b981" />}
        />
        <KpiCard
          label="Budget en cours"
          value={formatMoney(budgetEnCours)}
          sub={`${projetsEnCours} projets actifs`}
          icon={<DollarSign size={18} color="#f59e0b" />}
        />
        <KpiCard
          label="Comptes à recevoir"
          value={formatMoney(ar)}
          sub={`${facturesOuvertes.length} factures ouvertes`}
          trend={facturesEnRetard > 0 ? 'down' : 'neutral'}
          trendLabel={facturesEnRetard > 0 ? `${facturesEnRetard} en retard` : 'À jour'}
          icon={<AlertCircle size={18} color="#ef4444" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Pipeline soumissions — par statut</h3>
          <PipelineChart />
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Cashflow 2024 (en k$)</h3>
          <CashflowChart />
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Deadlines */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Soumissions — Deadlines à venir</h3>
            <Link href="/soumissions" className="text-xs text-amber-600 hover:underline">Voir tout →</Link>
          </div>
          <div className="space-y-2">
            {deadlines.map(s => (
              <Link key={s.id} href={`/soumissions/${s.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition cursor-pointer">
                  <Clock size={15} className="text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{s.titre}</p>
                    <p className="text-xs text-slate-400">{s.clientNom}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge status={s.statut} />
                    <p className="text-xs text-slate-400 mt-1">{new Date(s.dateDepot).toLocaleDateString('fr-CA')}</p>
                  </div>
                </div>
              </Link>
            ))}
            {deadlines.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Aucune deadline imminente</p>}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Activité récente</h3>
          </div>
          <div className="space-y-3">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.type === 'success' ? 'bg-emerald-500' : a.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{a.action}</p>
                  <p className="text-xs text-slate-400 truncate">{a.detail}</p>
                </div>
                <p className="text-xs text-slate-400 flex-shrink-0">{new Date(a.date).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
