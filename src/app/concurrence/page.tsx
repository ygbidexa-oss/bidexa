'use client'
import { useState, useEffect } from 'react'
import { concurrence as mockConcurrence } from '@/lib/mock-data/concurrence'
import { soumissions } from '@/lib/mock-data/soumissions'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { KpiCard } from '@/components/ui/KpiCard'
import { Modal, Field, inputCls, selectCls, Btn } from '@/components/ui/Modal'
import {
  TrendingUp, TrendingDown, Trophy, Target, Plus, Trash2,
  ChevronDown, ChevronRight, Pencil, BarChart2, Users, DollarSign
} from 'lucide-react'
import { PageWithAI } from '@/components/layout/PageWithAI'
import Link from 'next/link'
import type { ResultatAO } from '@/types'

/* ── Types ─────────────────────────────────────────────────────────────────── */
const STORAGE_KEY = 'bidexa_concurrence'

interface ConcurrentEntry {
  id: string
  nom: string
  prixSoumis: number
  rang: number
  specifications: string
  gagnant: boolean
}

interface ResultatAOPlus extends ResultatAO {
  concurrents?: ConcurrentEntry[]
  commentaire?: string
}

/* ── Utilitaires ────────────────────────────────────────────────────────────── */
function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M$`
  if (n >= 1_000) return `${Math.round(n / 1_000)} k$`
  return `${n.toLocaleString()} $`
}

function ecartPct(notre: number, autre: number): number {
  if (!autre) return 0
  return parseFloat((((notre - autre) / autre) * 100).toFixed(1))
}

function loadResults(): ResultatAOPlus[] {
  if (typeof window === 'undefined') return mockConcurrence as ResultatAOPlus[]
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return mockConcurrence as ResultatAOPlus[]
    return JSON.parse(raw) as ResultatAOPlus[]
  } catch { return mockConcurrence as ResultatAOPlus[] }
}

function saveResults(data: ResultatAOPlus[]) {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

const uniqueEstimateurs = Array.from(new Set(soumissions.map(s => s.estimateurNom))).sort()

/* ── Composant badge écart ──────────────────────────────────────────────────── */
function EcartBadge({ val }: { val: number }) {
  if (val === 0) return <span className="text-slate-300 text-xs">—</span>
  const pos = val > 0
  return (
    <span className={`text-sm font-bold ${pos ? 'text-emerald-600' : 'text-red-500'}`}>
      {pos ? '+' : ''}{val.toFixed(1)}%
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════ */
export default function ConcurrencePage() {
  const [results, setResults] = useState<ResultatAOPlus[]>([])
  const [search, setSearch] = useState('')
  const [filterResultat, setFilterResultat] = useState('')
  const [filterEstimateur, setFilterEstimateur] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  /* ── Modal saisie résultat ── */
  const [addModal, setAddModal] = useState(false)
  const [editTarget, setEditTarget] = useState<ResultatAOPlus | null>(null)
  const [fSoumission, setFSoumission] = useState('')
  const [fResultat, setFResultat] = useState<'gagne' | 'perdu'>('perdu')
  const [fNotrePrix, setFNotrePrix] = useState('')
  const [fCommentaire, setFCommentaire] = useState('')
  const [fConcurrents, setFConcurrents] = useState<ConcurrentEntry[]>([
    { id: '1', nom: '', prixSoumis: 0, rang: 1, specifications: '', gagnant: false },
  ])

  useEffect(() => { setResults(loadResults()) }, [])

  /* ── Calculs statistiques ── */
  const termines = results.filter(r => r.resultat === 'gagne' || r.resultat === 'perdu')
  const gagnes   = results.filter(r => r.resultat === 'gagne')
  const perdus   = results.filter(r => r.resultat === 'perdu')
  const tauxSucces = termines.length ? Math.round((gagnes.length / termines.length) * 100) : 0
  const ecartMoyen = perdus.length
    ? (perdus.reduce((a, r) => a + Math.abs(r.ecartPct), 0) / perdus.length).toFixed(1)
    : '0'

  // Valeur totale soumise
  const totalSoumis = termines.reduce((a, r) => a + r.prixSoumis, 0)

  // Top concurrents (par fréquence de victoire contre nous)
  const concMap: Record<string, { count: number; prixMoyen: number; total: number }> = {}
  perdus.forEach(r => {
    if (!concMap[r.concurrentGagnant]) concMap[r.concurrentGagnant] = { count: 0, prixMoyen: 0, total: 0 }
    concMap[r.concurrentGagnant].count++
    concMap[r.concurrentGagnant].prixMoyen += r.prixGagnant
    concMap[r.concurrentGagnant].total++
  })
  const topConcurrents = Object.entries(concMap)
    .map(([nom, d]) => ({ nom, count: d.count, prixMoyen: d.total ? d.prixMoyen / d.total : 0 }))
    .sort((a, b) => b.count - a.count).slice(0, 6)

  // Performance estimateurs
  const estMap: Record<string, { gagnes: number; total: number; valeur: number }> = {}
  termines.forEach(r => {
    if (!estMap[r.estimateurNom]) estMap[r.estimateurNom] = { gagnes: 0, total: 0, valeur: 0 }
    estMap[r.estimateurNom].total++
    if (r.resultat === 'gagne') { estMap[r.estimateurNom].gagnes++; estMap[r.estimateurNom].valeur += r.prixSoumis }
  })

  /* ── Filtre tableau ── */
  const filtered = termines.filter(r => {
    const q = search.toLowerCase()
    const ms = !q || r.soumissionNumero.toLowerCase().includes(q) || r.clientNom.toLowerCase().includes(q) || r.titre?.toLowerCase().includes(q)
    const me = !filterEstimateur || r.estimateurNom === filterEstimateur
    const mr = !filterResultat || r.resultat === filterResultat
    return ms && me && mr
  })

  /* ── Helpers concurrents dans le formulaire ── */
  function addRow() {
    setFConcurrents(c => [...c, { id: Date.now().toString(), nom: '', prixSoumis: 0, rang: c.length + 1, specifications: '', gagnant: false }])
  }
  function removeRow(id: string) { setFConcurrents(c => c.filter(x => x.id !== id)) }
  function updateRow(id: string, key: keyof ConcurrentEntry, val: string | number | boolean) {
    setFConcurrents(c => c.map(x => x.id === id ? { ...x, [key]: val } : x))
  }
  function setGagnant(id: string, checked: boolean) {
    setFConcurrents(c => c.map(x => ({ ...x, gagnant: x.id === id ? checked : false })))
  }

  /* ── Ouvrir modal (ajout ou édition) ── */
  function openAdd() {
    setEditTarget(null)
    setFSoumission(''); setFResultat('perdu'); setFNotrePrix(''); setFCommentaire('')
    setFConcurrents([{ id: '1', nom: '', prixSoumis: 0, rang: 1, specifications: '', gagnant: false }])
    setAddModal(true)
  }
  function openEdit(r: ResultatAOPlus) {
    setEditTarget(r)
    setFSoumission(r.soumissionId)
    setFResultat(r.resultat === 'gagne' ? 'gagne' : 'perdu')
    setFNotrePrix(String(r.prixSoumis))
    setFCommentaire(r.commentaire ?? '')
    setFConcurrents(r.concurrents?.length
      ? r.concurrents.map(c => ({ ...c }))
      : [{ id: '1', nom: r.concurrentGagnant !== 'Bidexa (nous)' ? r.concurrentGagnant : '', prixSoumis: r.prixGagnant || 0, rang: 1, specifications: (r.raisons ?? []).join('. '), gagnant: r.resultat === 'perdu' }])
    setAddModal(true)
  }

  /* ── Soumission du formulaire ── */
  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const soum = soumissions.find(s => s.id === fSoumission)
    if (!soum) return

    const notrePrix = parseFloat(fNotrePrix) || 0
    const gagnant = fResultat === 'gagne' ? null : (fConcurrents.find(c => c.gagnant) ?? fConcurrents[0])
    const prixGagnant = gagnant ? gagnant.prixSoumis : notrePrix
    const ecart = gagnant ? ecartPct(notrePrix, prixGagnant) : 0
    const rangNous = gagnant ? (fConcurrents.findIndex(c => c.gagnant === true) + 2) : 1

    const entry: ResultatAOPlus = {
      id: editTarget?.id ?? `r-${Date.now()}`,
      soumissionId: soum.id,
      soumissionNumero: soum.numero,
      titre: soum.titre,
      clientNom: soum.clientNom,
      dateDepot: soum.dateDepot,
      resultat: fResultat,
      prixSoumis: notrePrix,
      prixGagnant,
      concurrentGagnant: gagnant ? gagnant.nom : 'Bidexa (nous)',
      rang: rangNous,
      totalSoumissionnaires: fConcurrents.filter(c => c.nom).length + 1,
      ecartPct: ecart,
      estimateurNom: soum.estimateurNom,
      raisons: [],
      concurrents: fConcurrents.filter(c => c.nom),
      commentaire: fCommentaire,
    }

    const updated = editTarget
      ? results.map(r => r.id === editTarget.id ? entry : r)
      : [...results, entry]

    saveResults(updated)
    setResults(updated)
    setAddModal(false)
    setEditTarget(null)
  }

  /* ══════════════════════════════ RENDU ══════════════════════════════════════ */
  return (
    <PageWithAI module="concurrence" title="Résultats & Concurrence">
      <div className="space-y-6">

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="AO analysés"    value={String(termines.length)}   icon={<Target   size={18} color="#6366f1" />} />
          <KpiCard label="Taux de succès" value={`${tauxSucces}%`} sub={`${gagnes.length} gagnés`}  trend="up"   trendLabel="Objectif 45%" icon={<Trophy      size={18} color="#10b981" />} />
          <KpiCard label="Taux d'échec"   value={`${100-tauxSucces}%`} sub={`${perdus.length} perdus`} trend="down" trendLabel="À améliorer"  icon={<TrendingDown size={18} color="#ef4444" />} />
          <KpiCard label="Écart moyen"    value={`-${ecartMoyen}%`} sub="vs concurrent gagnant"      icon={<TrendingUp  size={18} color="#f59e0b" />} />
        </div>

        {/* ── Ligne secondaire KPI ── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center"><DollarSign size={18} className="text-indigo-500" /></div>
              <div>
                <p className="text-xs text-slate-400">Valeur totale soumise</p>
                <p className="text-lg font-bold text-slate-800">{fmt(totalSoumis)}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><BarChart2 size={18} className="text-emerald-500" /></div>
              <div>
                <p className="text-xs text-slate-400">Valeur gagnée</p>
                <p className="text-lg font-bold text-slate-800">{fmt(gagnes.reduce((a, r) => a + r.prixSoumis, 0))}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><Users size={18} className="text-amber-500" /></div>
              <div>
                <p className="text-xs text-slate-400">Concurrents recensés</p>
                <p className="text-lg font-bold text-slate-800">{Object.keys(concMap).length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Corps principal ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Tableau résultats ── */}
          <div className="lg:col-span-2">
            <Card padding={false}>
              {/* En-tête filtres */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-sm font-semibold text-slate-700">Résultats AO</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="search" placeholder="N° ou client..." value={search} onChange={e => setSearch(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 w-36 transition" />
                  <select value={filterResultat} onChange={e => setFilterResultat(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition">
                    <option value="">Tous résultats</option>
                    <option value="gagne">Gagnés</option>
                    <option value="perdu">Perdus</option>
                  </select>
                  <select value={filterEstimateur} onChange={e => setFilterEstimateur(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition">
                    <option value="">Tous estimateurs</option>
                    {uniqueEstimateurs.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  <button onClick={openAdd}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: '#C9A84C' }}>
                    <Plus size={12} /> Saisir un résultat
                  </button>
                </div>
              </div>

              {/* Tableau */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-3 py-3 w-6"></th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">AO / Client</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">Notre prix</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">Prix gagnant</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">Écart</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">Rang</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">Résultat</th>
                      <th className="px-3 py-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => {
                      const soum = soumissions.find(s => s.numero === r.soumissionNumero)
                      const isExpanded = expandedId === r.id
                      const hasConcurrents = (r.concurrents && r.concurrents.length > 0) || (r.raisons && r.raisons.length > 0)

                      return (
                        <>
                          <tr key={r.id} className={`border-b border-slate-50 hover:bg-slate-50/80 transition cursor-pointer ${isExpanded ? 'bg-amber-50/30' : ''}`}
                            onClick={() => setExpandedId(isExpanded ? null : r.id)}>
                            <td className="px-3 py-3 text-center text-slate-400">
                              {isExpanded ? <ChevronDown size={14} className="text-amber-500 mx-auto" /> : <ChevronRight size={14} className="mx-auto" />}
                            </td>
                            <td className="px-3 py-3">
                              {soum
                                ? <Link href={`/soumissions/${soum.id}`} onClick={e => e.stopPropagation()} className="font-medium text-amber-600 hover:underline text-xs block">{r.soumissionNumero}</Link>
                                : <p className="font-medium text-slate-800 text-xs">{r.soumissionNumero}</p>}
                              <p className="text-xs text-slate-400 truncate max-w-[130px]">{r.clientNom}</p>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <span className="text-sm font-semibold text-slate-800">{fmt(r.prixSoumis)}</span>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <span className="text-sm text-slate-600">{r.resultat === 'gagne' ? '—' : fmt(r.prixGagnant)}</span>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <EcartBadge val={r.ecartPct} />
                            </td>
                            <td className="px-3 py-3 text-right">
                              <span className={`text-sm font-bold ${r.rang === 1 ? 'text-amber-500' : 'text-slate-500'}`}>#{r.rang}</span>
                              <span className="text-xs text-slate-400">/{r.totalSoumissionnaires}</span>
                            </td>
                            <td className="px-3 py-3"><Badge status={r.resultat} /></td>
                            <td className="px-3 py-3">
                              <button onClick={e => { e.stopPropagation(); openEdit(r) }}
                                className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-300 hover:text-amber-600 transition">
                                <Pencil size={12} />
                              </button>
                            </td>
                          </tr>

                          {/* ── Panneau détail concurrent ── */}
                          {isExpanded && (
                            <tr key={`${r.id}-exp`}>
                              <td colSpan={8} className="bg-slate-50/60 px-6 py-4 border-b border-slate-100">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                                  Analyse comparative — {r.soumissionNumero}
                                </p>

                                {/* Tableau comparatif */}
                                <div className="rounded-xl border border-slate-200 overflow-hidden mb-3">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-slate-100 border-b border-slate-200">
                                        <th className="text-left px-4 py-2 font-semibold text-slate-500">Soumissionnaire</th>
                                        <th className="text-right px-4 py-2 font-semibold text-slate-500">Montant soumis</th>
                                        <th className="text-right px-4 py-2 font-semibold text-slate-500">Écart vs nous</th>
                                        <th className="text-right px-4 py-2 font-semibold text-slate-500">Rang</th>
                                        <th className="text-left px-4 py-2 font-semibold text-slate-500">Spécifications / Notes</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {/* Ligne : Bidexa */}
                                      <tr className="border-b border-slate-100 bg-amber-50/40">
                                        <td className="px-4 py-2.5 font-semibold text-amber-700">
                                          Bidexa (nous) {r.rang === 1 && <span className="ml-1 text-amber-500">★ Gagnant</span>}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-bold text-slate-800">{fmt(r.prixSoumis)}</td>
                                        <td className="px-4 py-2.5 text-right text-slate-400">—</td>
                                        <td className="px-4 py-2.5 text-right font-bold text-amber-600">#{r.rang}</td>
                                        <td className="px-4 py-2.5 text-slate-400 italic">Notre soumission</td>
                                      </tr>

                                      {/* Concurrents saisis */}
                                      {r.concurrents && r.concurrents.length > 0
                                        ? r.concurrents.filter(c => c.nom).map((c, i) => {
                                            const diff = ecartPct(c.prixSoumis, r.prixSoumis)
                                            return (
                                              <tr key={i} className={`border-b border-slate-100 ${c.gagnant ? 'bg-emerald-50/40' : ''}`}>
                                                <td className="px-4 py-2.5 font-medium text-slate-800">
                                                  {c.nom} {c.gagnant && <span className="ml-1 text-emerald-600 font-semibold">★ Gagnant</span>}
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-semibold text-slate-700">{fmt(c.prixSoumis)}</td>
                                                <td className="px-4 py-2.5 text-right"><EcartBadge val={diff} /></td>
                                                <td className="px-4 py-2.5 text-right text-slate-500">#{c.rang}</td>
                                                <td className="px-4 py-2.5 text-slate-500 max-w-[200px]">{c.specifications || <span className="text-slate-300 italic">—</span>}</td>
                                              </tr>
                                            )
                                          })
                                        : r.concurrentGagnant && r.concurrentGagnant !== 'Bidexa (nous)' && (
                                            <tr className="border-b border-slate-100 bg-emerald-50/30">
                                              <td className="px-4 py-2.5 font-medium text-slate-800">{r.concurrentGagnant} <span className="ml-1 text-emerald-600 font-semibold">★ Gagnant</span></td>
                                              <td className="px-4 py-2.5 text-right font-semibold text-slate-700">{fmt(r.prixGagnant)}</td>
                                              <td className="px-4 py-2.5 text-right"><EcartBadge val={ecartPct(r.prixGagnant, r.prixSoumis)} /></td>
                                              <td className="px-4 py-2.5 text-right text-slate-500">#1</td>
                                              <td className="px-4 py-2.5 text-slate-400 italic text-xs">{(r.raisons ?? []).join(' · ') || '—'}</td>
                                            </tr>
                                          )
                                      }
                                    </tbody>
                                  </table>
                                </div>

                                {/* Commentaire */}
                                {r.commentaire && (
                                  <p className="text-xs text-slate-500 italic bg-white border border-slate-100 rounded-lg px-3 py-2">
                                    <span className="font-semibold text-slate-600">Note : </span>{r.commentaire}
                                  </p>
                                )}
                                {r.raisons && r.raisons.length > 0 && !r.commentaire && (
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    {r.raisons.map((rai, i) => (
                                      <span key={i} className="text-xs px-2 py-0.5 bg-white border border-slate-200 rounded-full text-slate-500">{rai}</span>
                                    ))}
                                  </div>
                                )}

                                <button onClick={() => openEdit(r)}
                                  className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 hover:underline font-semibold">
                                  <Pencil size={11} /> Modifier / ajouter des concurrents
                                </button>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-slate-400">Aucun résultat trouvé</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* ── Panneau droit ── */}
          <div className="space-y-4">
            {/* Top concurrents */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Top concurrents</h3>
              {topConcurrents.length === 0
                ? <p className="text-xs text-slate-400">Aucune donnée disponible</p>
                : <div className="space-y-3">
                    {topConcurrents.map(({ nom, count, prixMoyen }) => (
                      <div key={nom}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-medium text-slate-700 truncate max-w-[140px]">{nom}</span>
                          <span className="text-xs font-bold text-red-500">{count} victoire{count > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
                            <div className="h-1.5 rounded-full bg-red-400 transition-all"
                              style={{ width: `${(count / Math.max(perdus.length, 1)) * 100}%` }} />
                          </div>
                          {prixMoyen > 0 && <span className="text-xs text-slate-400 shrink-0">{fmt(prixMoyen)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </Card>

            {/* Performance estimateurs */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Performance estimateurs</h3>
              <div className="space-y-4">
                {Object.entries(estMap).map(([nom, d]) => {
                  const taux = Math.round((d.gagnes / d.total) * 100)
                  return (
                    <div key={nom}>
                      <div className="flex justify-between mb-1">
                        <div>
                          <span className="text-xs font-semibold text-slate-700">{nom.split(' ')[0]}</span>
                          <span className="text-xs text-slate-400 ml-1">{d.gagnes}/{d.total}</span>
                        </div>
                        <span className={`text-xs font-bold ${taux >= 60 ? 'text-emerald-600' : taux >= 40 ? 'text-amber-600' : 'text-red-500'}`}>{taux}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full">
                          <div className={`h-2 rounded-full transition-all ${taux >= 60 ? 'bg-emerald-400' : taux >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${taux}%` }} />
                        </div>
                      </div>
                      {d.valeur > 0 && <p className="text-xs text-slate-400 mt-0.5">Valeur gagnée : {fmt(d.valeur)}</p>}
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Analyse rapide */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Analyse rapide</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Meilleur taux de succès</span>
                  <span className="font-semibold text-slate-700">
                    {Object.entries(estMap).sort((a, b) => (b[1].gagnes/b[1].total) - (a[1].gagnes/a[1].total))[0]?.[0]?.split(' ')[0] ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Concurrent le + fréquent</span>
                  <span className="font-semibold text-slate-700">{topConcurrents[0]?.nom?.split(' ')[0] ?? '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Écart médian perdu</span>
                  <span className="font-semibold text-red-500">-{ecartMoyen}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">AO avec concurrents saisis</span>
                  <span className="font-semibold text-slate-700">
                    {results.filter(r => r.concurrents && r.concurrents.length > 0).length}/{termines.length}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ══ MODAL SAISIE / ÉDITION RÉSULTAT ══ */}
      <Modal open={addModal} onClose={() => setAddModal(false)}
        title={editTarget ? `Modifier — ${editTarget.soumissionNumero}` : 'Saisir un résultat d\'AO'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">

          <div className="grid grid-cols-2 gap-4">
            <Field label="Soumission" required>
              <select className={selectCls} value={fSoumission} onChange={e => setFSoumission(e.target.value)} required disabled={!!editTarget}>
                <option value="">Sélectionner...</option>
                {soumissions.map(s => <option key={s.id} value={s.id}>{s.numero} — {s.clientNom}</option>)}
              </select>
            </Field>
            <Field label="Notre résultat" required>
              <select className={selectCls} value={fResultat} onChange={e => setFResultat(e.target.value as 'gagne' | 'perdu')} required>
                <option value="gagne">Gagné</option>
                <option value="perdu">Perdu</option>
              </select>
            </Field>
          </div>

          <Field label="Notre prix soumis ($)" required>
            <input className={inputCls} type="number" min={0} required value={fNotrePrix}
              onChange={e => setFNotrePrix(e.target.value)} placeholder="ex. 1250000" />
          </Field>

          {/* ── Concurrents ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-slate-700">Concurrents</p>
                <p className="text-xs text-slate-400">Saisissez chaque soumissionnaire avec ses informations</p>
              </div>
              <button type="button" onClick={addRow}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                <Plus size={11} /> Ajouter
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {fConcurrents.map(c => (
                <div key={c.id} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <input className={`${inputCls} flex-1`} placeholder="Nom du concurrent" value={c.nom}
                      onChange={e => updateRow(c.id, 'nom', e.target.value)} />
                    <input className={`${inputCls} w-32`} type="number" placeholder="Prix ($)" min={0}
                      value={c.prixSoumis || ''} onChange={e => updateRow(c.id, 'prixSoumis', parseFloat(e.target.value) || 0)} />
                    <input className={`${inputCls} w-14`} type="number" placeholder="Rang" min={1}
                      value={c.rang || ''} onChange={e => updateRow(c.id, 'rang', parseInt(e.target.value) || 1)} />
                    <button type="button" onClick={() => removeRow(c.id)}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <textarea className={inputCls} rows={2}
                    placeholder="Spécifications du concurrent : points forts, méthodologie, conditions particulières..."
                    value={c.specifications} onChange={e => updateRow(c.id, 'specifications', e.target.value)} />

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={c.gagnant} onChange={e => setGagnant(c.id, e.target.checked)}
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-400" />
                    <span className="text-xs text-amber-700 font-semibold">Ce concurrent a remporté l'appel d'offres</span>
                  </label>

                  {/* Aperçu écart en temps réel */}
                  {c.prixSoumis > 0 && fNotrePrix && (
                    <div className="text-xs text-slate-400">
                      Écart vs notre prix :{' '}
                      <span className={`font-semibold ${ecartPct(c.prixSoumis, parseFloat(fNotrePrix)) < 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {ecartPct(c.prixSoumis, parseFloat(fNotrePrix)) > 0 ? '+' : ''}
                        {ecartPct(c.prixSoumis, parseFloat(fNotrePrix)).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Field label="Commentaire / Analyse">
            <textarea className={inputCls} rows={2}
              placeholder="Points à retenir pour les prochaines soumissions similaires..."
              value={fCommentaire} onChange={e => setFCommentaire(e.target.value)} />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Btn variant="secondary" type="button" onClick={() => setAddModal(false)}>Annuler</Btn>
            <Btn type="submit">{editTarget ? 'Mettre à jour' : 'Enregistrer le résultat'}</Btn>
          </div>
        </form>
      </Modal>
    </PageWithAI>
  )
}
