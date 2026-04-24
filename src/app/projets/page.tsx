'use client'
import { useState, useEffect } from 'react'
import { projets as mockProjets } from '@/lib/mock-data/projets'
import { clients } from '@/lib/mock-data/clients'
import { soumissions } from '@/lib/mock-data/soumissions'
import { estimations } from '@/lib/mock-data/estimations'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { KpiCard } from '@/components/ui/KpiCard'
import Link from 'next/link'
import { ChevronRight, Calendar, User, Plus, FolderOpen, TrendingUp, DollarSign } from 'lucide-react'
import { PageWithAI } from '@/components/layout/PageWithAI'
import { Modal, Field, inputCls, selectCls, Btn } from '@/components/ui/Modal'
import type { Projet } from '@/types'

const STORAGE_KEY = 'bidexa_projets'

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M$`
  if (n >= 1_000) return `${Math.round(n / 1_000)} k$`
  return `${n.toLocaleString()} $`
}

function loadProjets(): Projet[] {
  if (typeof window === 'undefined') return mockProjets
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : mockProjets
  } catch { return mockProjets }
}
function saveProjets(data: Projet[]) {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

const soumissionsGagnees = soumissions.filter(s => s.statut === 'gagnee')
const membres = ['Martin Beaupré','Nadia Fontaine','Émilie Caron','Pascal Roy','Sam Diallo','Alex Tremblay','Lucie Martel','Félix Beaumont','Tony Nguyen','Marie-Claude Pion']

export default function ProjetsPage() {
  const [projets, setProjets] = useState<Projet[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [clientFilter, setClientFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({
    titre: '', clientId: '', soumissionId: '', chargeProjet: '',
    equipe: [] as string[], budget: '', dateDebut: '', dateFin: '',
    description: '', statut: 'planification',
  })

  useEffect(() => { setProjets(loadProjets()) }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  function onSoumissionChange(soumId: string) {
    const soum = soumissions.find(s => s.id === soumId)
    if (!soum) { setForm(f => ({ ...f, soumissionId: soumId })); return }
    setForm(f => ({ ...f, soumissionId: soumId, clientId: soum.clientId, titre: soum.titre, budget: String(soum.prixSoumis) }))
  }

  const actifs   = projets.filter(p => p.statut === 'en_cours').length
  const planif   = projets.filter(p => p.statut === 'planification').length
  const termines = projets.filter(p => p.statut === 'termine').length
  const budgetTotal = projets.filter(p => p.statut !== 'annule').reduce((a, p) => a + p.budgetActuel, 0)
  const engageTotal = projets.filter(p => p.statut !== 'annule').reduce((a, p) => a + p.coutEngages, 0)
  const uniqueClients = Array.from(new Set(projets.map(p => p.clientNom))).sort()

  const filtered = projets.filter(p => {
    const q = search.toLowerCase()
    const ms = !q || p.titre.toLowerCase().includes(q) || p.clientNom.toLowerCase().includes(q) || p.numero.toLowerCase().includes(q)
    return ms && (statusFilter === 'tous' || p.statut === statusFilter) && (!clientFilter || p.clientNom === clientFilter)
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const client = clients.find(c => c.id === form.clientId)
    const numero = `PRJ-${new Date().getFullYear()}-${String(projets.length + 1).padStart(3, '0')}`
    const newProjet: Projet = {
      id: `p-${Date.now()}`,
      numero,
      titre: form.titre,
      clientId: form.clientId,
      clientNom: client?.nom ?? '',
      soumissionId: form.soumissionId,
      statut: form.statut as Projet['statut'],
      chargeProjNom: form.chargeProjet,
      budgetInitial: parseFloat(form.budget) || 0,
      budgetActuel:  parseFloat(form.budget) || 0,
      coutEngages: 0,
      avancement: 0,
      dateDebut: form.dateDebut,
      dateFin: form.dateFin,
      description: form.description,
      equipe: form.equipe.length ? form.equipe : [form.chargeProjet],
      taches: [],
      ordresChangement: [],
      journal: [{ id: `j-${Date.now()}`, date: new Date().toISOString().slice(0,10), auteur: form.chargeProjet, type: 'note', contenu: `Projet créé. Démarrage prévu le ${form.dateDebut}.` }],
    }
    const updated = [...projets, newProjet]
    saveProjets(updated)
    setProjets(updated)
    setModalOpen(false)
    setForm({ titre:'', clientId:'', soumissionId:'', chargeProjet:'', equipe:[], budget:'', dateDebut:'', dateFin:'', description:'', statut:'planification' })
    showToast(`Projet ${numero} créé avec succès.`)
  }

  return (
    <PageWithAI module="projets" title="Gestion de projets">
      <div className="space-y-5">
        {toast && <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">{toast}</div>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="En cours"      value={String(actifs)}   sub={`${planif} en planification`} icon={<FolderOpen size={18} color="#3b82f6" />} />
          <KpiCard label="Terminés"      value={String(termines)} sub="projets complétés"            icon={<TrendingUp size={18} color="#10b981" />} />
          <KpiCard label="Budget total"  value={fmt(budgetTotal)} sub="tous projets actifs"          icon={<DollarSign size={18} color="#6366f1" />} />
          <KpiCard label="Coûts engagés" value={fmt(engageTotal)} sub={`${budgetTotal ? Math.round((engageTotal/budgetTotal)*100) : 0}% du budget`} icon={<TrendingUp size={18} color="#f59e0b" />} />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <input type="text" placeholder="Rechercher un projet..." value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition w-56" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition">
            <option value="tous">Tous les statuts</option>
            <option value="en_cours">En cours</option>
            <option value="planification">Planification</option>
            <option value="termine">Terminé</option>
            <option value="suspendu">Suspendu</option>
            <option value="annule">Annulé</option>
          </select>
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition">
            <option value="">Tous les clients</option>
            {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex-1" />
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background:'#C9A84C' }}>
            <Plus size={14} /> Nouveau projet
          </button>
        </div>

        <div className="space-y-3">
          {filtered.map(p => {
            const pctBudget = p.budgetActuel ? Math.round((p.coutEngages / p.budgetActuel) * 100) : 0
            return (
              <Link key={p.id} href={`/projets/${p.id}`}>
                <Card className="hover:shadow-md transition cursor-pointer group">
                  <div className="flex items-start gap-4">
                    <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${p.statut==='en_cours'?'bg-blue-400':p.statut==='planification'?'bg-amber-400':p.statut==='termine'?'bg-emerald-400':'bg-slate-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <p className="text-xs font-semibold text-amber-600 font-mono">{p.numero}</p>
                        <Badge status={p.statut} />
                      </div>
                      <h3 className="font-semibold text-slate-800 group-hover:text-amber-700 transition truncate">{p.titre}</h3>
                      <p className="text-sm text-slate-400 mt-0.5">{p.clientNom}</p>
                      <div className="flex items-center gap-5 mt-3 text-xs text-slate-500 flex-wrap">
                        <div className="flex items-center gap-1.5"><User size={11} />{p.chargeProjNom}</div>
                        <div className="flex items-center gap-1.5"><Calendar size={11} />
                          {new Date(p.dateDebut).toLocaleDateString('fr-CA')} → {new Date(p.dateFin).toLocaleDateString('fr-CA')}
                        </div>
                        {p.equipe.length > 0 && (
                          <div className="flex items-center gap-1">
                            {p.equipe.slice(0,3).map(m => (
                              <div key={m} className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center" style={{ background:'#0D1B2A', color:'#C9A84C' }}>{m[0]}</div>
                            ))}
                            {p.equipe.length > 3 && <span className="text-xs text-slate-400">+{p.equipe.length-3}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right space-y-2 min-w-[200px]">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Avancement</p>
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-28 h-2 bg-slate-100 rounded-full">
                            <div className={`h-2 rounded-full transition-all ${p.avancement>=80?'bg-emerald-400':p.avancement>=40?'bg-blue-400':'bg-amber-400'}`} style={{ width:`${p.avancement}%` }} />
                          </div>
                          <span className="text-sm font-bold text-slate-800 w-8">{p.avancement}%</span>
                        </div>
                      </div>
                      <div className="flex gap-4 justify-end text-xs">
                        <div><p className="text-slate-400">Budget</p><p className="font-semibold text-slate-700">{fmt(p.budgetActuel)}</p></div>
                        <div><p className="text-slate-400">Engagé</p><p className={`font-bold ${pctBudget>90?'text-red-500':pctBudget>70?'text-amber-500':'text-slate-700'}`}>{fmt(p.coutEngages)} <span className="font-normal text-slate-400">({pctBudget}%)</span></p></div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 mt-1 flex-shrink-0 group-hover:text-amber-400 transition" />
                  </div>
                </Card>
              </Link>
            )
          })}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <FolderOpen size={32} className="mx-auto mb-3 text-slate-200" />
              <p className="text-sm">Aucun projet trouvé.</p>
            </div>
          )}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau projet" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Soumission gagnée (optionnel)">
            <select className={selectCls} value={form.soumissionId} onChange={e => onSoumissionChange(e.target.value)}>
              <option value="">Aucune soumission liée</option>
              {soumissionsGagnees.map(s => <option key={s.id} value={s.id}>{s.numero} — {s.clientNom} ({s.prixSoumis.toLocaleString()} $)</option>)}
            </select>
            {form.soumissionId && <p className="text-xs text-emerald-600 mt-1">Titre et budget pré-remplis depuis la soumission.</p>}
          </Field>
          {form.soumissionId && (() => {
            const est = estimations.find(e => e.soumissionId === form.soumissionId)
            return est ? (
              <div className="px-3 py-2 text-xs bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700">
                Estimation liée : <strong>{est.titre}</strong>
              </div>
            ) : null
          })()}
          <Field label="Titre du projet" required>
            <input className={inputCls} required value={form.titre} onChange={e => setForm(f => ({...f, titre:e.target.value}))} placeholder="Ex: Réfection rue Principale" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Client" required>
              <select className={selectCls} value={form.clientId} onChange={e => setForm(f => ({...f, clientId:e.target.value}))} required>
                <option value="">Sélectionner un client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </Field>
            <Field label="Statut initial">
              <select className={selectCls} value={form.statut} onChange={e => setForm(f => ({...f, statut:e.target.value}))}>
                <option value="planification">Planification</option>
                <option value="en_cours">En cours</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Chargé de projet" required>
              <select className={selectCls} value={form.chargeProjet} onChange={e => setForm(f => ({...f, chargeProjet:e.target.value}))} required>
                <option value="">Sélectionner...</option>
                {membres.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Budget ($)" required>
              <input className={inputCls} type="number" min="0" required value={form.budget} onChange={e => setForm(f => ({...f, budget:e.target.value}))} placeholder="0" />
            </Field>
          </div>
          <Field label="Membres de l'équipe">
            <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
              {membres.map(m => (
                <label key={m} className="flex items-center gap-2 cursor-pointer text-xs p-1 rounded hover:bg-slate-50">
                  <input type="checkbox" checked={form.equipe.includes(m)}
                    onChange={e => setForm(f => ({...f, equipe: e.target.checked ? [...f.equipe,m] : f.equipe.filter(x=>x!==m)}))}
                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-400" />
                  <span className="text-slate-700">{m}</span>
                </label>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date de début" required>
              <input className={inputCls} type="date" required value={form.dateDebut} onChange={e => setForm(f => ({...f, dateDebut:e.target.value}))} />
            </Field>
            <Field label="Date de fin prévue" required>
              <input className={inputCls} type="date" required value={form.dateFin} onChange={e => setForm(f => ({...f, dateFin:e.target.value}))} />
            </Field>
          </div>
          <Field label="Description">
            <textarea className={inputCls} rows={3} value={form.description} onChange={e => setForm(f => ({...f, description:e.target.value}))} placeholder="Description du projet, portée des travaux..." />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Btn type="button" variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Btn>
            <Btn type="submit">Créer le projet</Btn>
          </div>
        </form>
      </Modal>
    </PageWithAI>
  )
}
