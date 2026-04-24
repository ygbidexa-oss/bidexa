'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { projets as mockProjets } from '@/lib/mock-data/projets'
import { soumissions } from '@/lib/mock-data/soumissions'
import { estimations } from '@/lib/mock-data/estimations'
import { bonsCommande } from '@/lib/mock-data/bons-commande'
import { getPOs } from '@/lib/po-bridge'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal, Field, inputCls, selectCls, Btn } from '@/components/ui/Modal'
import { PageWithAI } from '@/components/layout/PageWithAI'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Pencil, Trash2, CheckSquare, Square, Calendar, User,
  DollarSign, FileText, ClipboardList, BarChart2, Package, Receipt,
  AlertTriangle, BookOpen, Save, ExternalLink, ChevronRight,
  Send, CreditCard, TrendingUp
} from 'lucide-react'
import type { Projet, Tache, OrdrChangement, LigneJournal } from '@/types'
import { upsertFactureSync, removeFactureSync, updateFactureSyncStatut, getFacturesSync } from '@/lib/factures-bridge'
import { calculerTaxes } from '@/lib/entreprise'
import { DocumentsSection } from '@/components/documents/DocumentsSection'

/* ── Types locaux ─────────────────────────────────────────────────────────── */
interface Depense {
  id: string
  date: string
  categorie: string
  description: string
  fournisseur: string
  montant: number
  approuve: boolean
}

interface DocProjet {
  id: string
  nom: string
  type: string
  taille: string
  uploadePar: string
  createdAt: string
}

interface ProjetPlus extends Projet {
  depenses?: Depense[]
  documents?: DocProjet[]
  estimationId?: string
  typeFacturation?: 'forfait' | 'progressif'
  factures?: Facture[]
  budgetLibere?: number
}

interface Facture {
  id: string
  numero: string
  date: string
  description: string
  montant: number
  pctContrat: number          // % du contrat facturé
  pctAvancement: number       // % d'avancement atteint au moment de la facture
  statut: 'brouillon' | 'envoyee' | 'payee' | 'en_retard'
  datePaiement?: string
  notes?: string
}

/* ── Storage ──────────────────────────────────────────────────────────────── */
const PROJ_KEY = 'bidexa_projets'

function loadProjets(): ProjetPlus[] {
  if (typeof window === 'undefined') return mockProjets as ProjetPlus[]
  try {
    const raw = localStorage.getItem(PROJ_KEY)
    return raw ? JSON.parse(raw) : (mockProjets as ProjetPlus[])
  } catch { return mockProjets as ProjetPlus[] }
}
function saveProjets(data: ProjetPlus[]) {
  if (typeof window !== 'undefined') localStorage.setItem(PROJ_KEY, JSON.stringify(data))
}

/* ── Utilitaires ──────────────────────────────────────────────────────────── */
function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M$`
  if (n >= 1_000) return `${Math.round(n / 1_000)} k$`
  return `${n.toLocaleString()} $`
}

const TABS = [
  { id: 'apercu',       label: 'Aperçu',              icon: BarChart2 },
  { id: 'taches',       label: 'Tâches',               icon: CheckSquare },
  { id: 'budget',       label: 'Budget',               icon: DollarSign },
  { id: 'facturation',  label: 'Facturation',          icon: CreditCard },
  { id: 'bcs',          label: 'Bons de commande',     icon: Package },
  { id: 'depenses',     label: 'Dépenses',             icon: Receipt },
  { id: 'documents',    label: 'Documents',            icon: FileText },
  { id: 'journal',      label: 'Journal',              icon: BookOpen },
  { id: 'oc',           label: 'Ordres de changement', icon: AlertTriangle },
]

const DEPENSE_CATEGORIES = ['Main-d\'œuvre','Matériaux','Équipement','Sous-traitance','Frais généraux','Transport','Divers']
const MEMBRES_LIST = ['Martin Beaupré','Nadia Fontaine','Émilie Caron','Pascal Roy','Sam Diallo','Alex Tremblay','Lucie Martel','Félix Beaumont']
/* ══════════════════════════════════════════════════════════════════════════ */
export default function ProjetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [projets, setProjets] = useState<ProjetPlus[]>([])
  const [projet, setProjet] = useState<ProjetPlus | null>(null)
  const [tab, setTab] = useState('apercu')
  const [toast, setToast] = useState('')

  /* ── Modals ── */
  const [tacheModal, setTacheModal] = useState(false)
  const [editTache, setEditTache] = useState<Tache | null>(null)
  const [tacheForm, setTacheForm] = useState({ titre:'', responsable:'', debut:'', fin:'', avancement:0, statut:'a_faire' as Tache['statut'] })

  const [depenseModal, setDepenseModal] = useState(false)
  const [depForm, setDepForm] = useState({ date:'', categorie:'Matériaux', description:'', fournisseur:'', montant:'' })

  const [journalModal, setJournalModal] = useState(false)
  const [journalForm, setJournalForm] = useState({ type:'note' as LigneJournal['type'], contenu:'' })

  const [ocModal, setOcModal] = useState(false)
  const [ocForm, setOcForm] = useState({ description:'', montant:'' })

  const [avancModal, setAvancModal] = useState(false)
  const [avancVal, setAvancVal] = useState(0)

  const [editInfoModal, setEditInfoModal] = useState(false)
  const [infoForm, setInfoForm] = useState({ description:'', chargeProjNom:'', dateDebut:'', dateFin:'', statut:'' })

  // ── Facturation ──
  const [factModal, setFactModal] = useState(false)
  const [editFacture, setEditFacture] = useState<Facture | null>(null)
  const [factForm, setFactForm] = useState({
    date: '', description: '', montant: '', pctContrat: '', pctAvancement: '',
    statut: 'brouillon' as Facture['statut'], datePaiement: '', notes: '',
  })
  const [typeFactModal, setTypeFactModal] = useState(false)

  useEffect(() => {
    const data = loadProjets()
    setProjets(data)
    const found = data.find(p => p.id === id)
    if (!found) return

    // Sync statuts depuis le pont comptabilité → projet
    const syncData = getFacturesSync()
    const factures = found.factures ?? []
    let changed = false
    const merged = factures.map(f => {
      const s = syncData.find(x => x.id === f.id)
      if (s && s.statut !== f.statut) { changed = true; return { ...f, statut: s.statut, datePaiement: s.datePaiement ?? f.datePaiement } }
      return f
    })
    if (changed) {
      const updated = { ...found, factures: merged } as ProjetPlus
      const newList = data.map(p => p.id === id ? updated : p)
      saveProjets(newList)
      setProjet(updated)
      setProjets(newList)
    } else {
      setProjet(found)
    }
  }, [id])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  function save(updated: ProjetPlus) {
    const newList = projets.map(p => p.id === id ? updated : p)
    saveProjets(newList)
    setProjets(newList)
    setProjet(updated)
  }
  // safe shorthand — projet is guaranteed non-null after early return
  const p0 = () => projet as ProjetPlus
  // helper functions use p0() which is non-null (we return early above if null)

  if (!projet) return (
    <PageWithAI module="projets" title="Projet">
      <div className="text-center py-20 text-slate-400">Projet introuvable — <Link href="/projets" className="text-amber-600 underline">Retour à la liste</Link></div>
    </PageWithAI>
  )

  /* ── Données liées ── */
  const soumission  = soumissions.find(s => s.id === projet.soumissionId)
  const estimation  = soumission ? estimations.find(e => e.soumissionId === soumission.id) : null
  const projetBCs   = getPOs().filter(po => po.projetId === projet.id)
  const totalBCs    = projetBCs.filter(po => po.statut !== 'brouillon').reduce((a, po) => a + po.montantTotal, 0)
  const totalBCsPaye = projetBCs.reduce((a, po) => a + po.montantPaye, 0)
  const totalBCsReliquat = projetBCs.filter(po => po.statut !== 'ferme' && po.statut !== 'brouillon').reduce((a, po) => a + (po.montantTotal - po.montantPaye), 0)
  const budgetLibere = projet.budgetLibere ?? 0
  const depenses    = projet.depenses ?? []
  const totalDep    = depenses.reduce((a, d) => a + d.montant, 0)
  const ocs         = projet.ordresChangement ?? []
  const ocApprouves = ocs.filter(o => o.statut === 'approuve').reduce((a, o) => a + o.montant, 0)
  const budgetTotal = projet.budgetInitial + ocApprouves
  // POs comptent automatiquement comme dépenses engagées
  const engage      = totalBCs + totalDep + projet.coutEngages
  const restant     = budgetTotal - engage
  const pctBudget   = budgetTotal ? Math.round((engage / budgetTotal) * 100) : 0
  const taches      = projet.taches ?? []
  const tachesDone  = taches.filter(t => t.statut === 'termine').length

  // ── Facturation ──
  const factures     = projet.factures ?? []
  const totalFacture = factures.reduce((a, f) => a + f.montant, 0)
  const totalPaye    = factures.filter(f => f.statut === 'payee').reduce((a, f) => a + f.montant, 0)
  const soldeRestant = budgetTotal - totalFacture
  const pctFacture   = budgetTotal ? Math.round((totalFacture / budgetTotal) * 100) : 0
  const pctEncaisse  = budgetTotal ? Math.round((totalPaye / budgetTotal) * 100) : 0
  const typeFacturation = projet.typeFacturation ?? 'progressif'

  /* ── Helpers tâches ── */
  function openAddTache() { setEditTache(null); setTacheForm({ titre:'', responsable:'', debut:'', fin:'', avancement:0, statut:'a_faire' }); setTacheModal(true) }
  function openEditTache(t: Tache) { setEditTache(t); setTacheForm({ titre:t.titre, responsable:t.responsable, debut:t.debut, fin:t.fin, avancement:t.avancement, statut:t.statut }); setTacheModal(true) }
  function submitTache(e: React.FormEvent) {
    e.preventDefault()
    const base = projet as ProjetPlus
    if (editTache) {
      save({ ...base, taches: base.taches.map(t => t.id === editTache.id ? { ...t, ...tacheForm } : t) })
    } else {
      save({ ...base, taches: [...base.taches, { id:`t-${Date.now()}`, ...tacheForm }] })
    }
    setTacheModal(false); showToast('Tâche sauvegardée.')
  }
  function deleteTache(tid: string) {
    const base = projet as ProjetPlus
    save({ ...base, taches: base.taches.filter(t => t.id !== tid) })
    showToast('Tâche supprimée.')
  }
  function toggleTache(tid: string) {
    const base = projet as ProjetPlus
    save({ ...base, taches: base.taches.map(t => t.id === tid ? { ...t, statut: t.statut === 'termine' ? 'en_cours' : 'termine', avancement: t.statut === 'termine' ? t.avancement : 100 } : t) })
  }

  /* ── Helpers dépenses ── */
  function submitDepense(e: React.FormEvent) {
    e.preventDefault()
    const base = projet as ProjetPlus
    const dep: Depense = { id:`d-${Date.now()}`, date:depForm.date, categorie:depForm.categorie, description:depForm.description, fournisseur:depForm.fournisseur, montant:parseFloat(depForm.montant)||0, approuve:true }
    save({ ...base, depenses:[...(base.depenses??[]), dep] })
    setDepenseModal(false); setDepForm({ date:'', categorie:'Matériaux', description:'', fournisseur:'', montant:'' })
    showToast('Dépense enregistrée.')
  }

  /* ── Helpers journal ── */
  function submitJournal(e: React.FormEvent) {
    e.preventDefault()
    const base = projet as ProjetPlus
    const entry: LigneJournal = { id:`j-${Date.now()}`, date:new Date().toISOString().slice(0,10), auteur:base.chargeProjNom, type:journalForm.type, contenu:journalForm.contenu }
    save({ ...base, journal:[...base.journal, entry] })
    setJournalModal(false); setJournalForm({ type:'note', contenu:'' })
    showToast('Entrée ajoutée au journal.')
  }

  /* ── Helpers OC ── */
  function submitOC(e: React.FormEvent) {
    e.preventDefault()
    const base = projet as ProjetPlus
    const currentOcs = base.ordresChangement ?? []
    const oc: OrdrChangement = { id:`oc-${Date.now()}`, numero:`OC-${(currentOcs.length+1).toString().padStart(2,'0')}`, description:ocForm.description, montant:parseFloat(ocForm.montant)||0, statut:'en_attente', date:new Date().toISOString().slice(0,10) }
    save({ ...base, ordresChangement:[...currentOcs, oc] })
    setOcModal(false); setOcForm({ description:'', montant:'' })
    showToast('Ordre de changement créé.')
  }
  function updateOCStatut(ocId: string, statut: OrdrChangement['statut']) {
    const base = projet as ProjetPlus
    save({ ...base, ordresChangement:(base.ordresChangement??[]).map(o => o.id === ocId ? { ...o, statut } : o) })
  }

  /* ── Mise à jour avancement global ── */
  function submitAvancement(e: React.FormEvent) {
    e.preventDefault()
    save({ ...(projet as ProjetPlus), avancement:avancVal })
    setAvancModal(false); showToast('Avancement mis à jour.')
  }

  /* ── Infos générales ── */
  function openEditInfo() {
    setInfoForm({ description:projet!.description, chargeProjNom:projet!.chargeProjNom, dateDebut:projet!.dateDebut, dateFin:projet!.dateFin, statut:projet!.statut })
    setEditInfoModal(true)
  }
  function submitInfo(e: React.FormEvent) {
    e.preventDefault()
    save({ ...(projet as ProjetPlus), ...infoForm, statut: infoForm.statut as Projet['statut'] })
    setEditInfoModal(false); showToast('Informations mises à jour.')
  }

  const typeColors: Record<string, string> = { note:'bg-blue-50 text-blue-700', changement:'bg-amber-50 text-amber-700', incident:'bg-red-50 text-red-600', avancement:'bg-emerald-50 text-emerald-700' }
  const ocColors: Record<string, string> = { en_attente:'bg-amber-50 text-amber-600 border-amber-200', approuve:'bg-emerald-50 text-emerald-600 border-emerald-200', refuse:'bg-red-50 text-red-500 border-red-200' }

  /* ── Helpers facturation ── */
  function openAddFacture() {
    setEditFacture(null)
    const base = projet as ProjetPlus
    setFactForm({ date: new Date().toISOString().slice(0,10), description: '', montant: '', pctContrat: '', pctAvancement: String(base.avancement), statut: 'brouillon', datePaiement: '', notes: '' })
    setFactModal(true)
  }
  function openEditFacture(f: Facture) {
    setEditFacture(f)
    setFactForm({ date: f.date, description: f.description, montant: String(f.montant), pctContrat: String(f.pctContrat), pctAvancement: String(f.pctAvancement), statut: f.statut, datePaiement: f.datePaiement ?? '', notes: f.notes ?? '' })
    setFactModal(true)
  }
  function submitFacture(e: React.FormEvent) {
    e.preventDefault()
    const base = projet as ProjetPlus
    const existing = base.factures ?? []
    const num = editFacture ? editFacture.numero : `FAC-${base.numero}-${String(existing.length + 1).padStart(2,'0')}`
    const ht   = parseFloat(factForm.montant) || 0
    const { tps, tvq } = calculerTaxes(ht)
    const entry: Facture = {
      id: editFacture?.id ?? `f-${Date.now()}`,
      numero: num,
      date: factForm.date,
      description: factForm.description,
      montant: ht,
      pctContrat: parseFloat(factForm.pctContrat) || 0,
      pctAvancement: parseFloat(factForm.pctAvancement) || 0,
      statut: factForm.statut,
      datePaiement: factForm.datePaiement || undefined,
      notes: factForm.notes || undefined,
    }
    const updated = editFacture
      ? existing.map(f => f.id === editFacture.id ? entry : f)
      : [...existing, entry]
    save({ ...base, factures: updated })

    // ── Sync vers comptabilité ──
    upsertFactureSync({
      id: entry.id,
      projetId: base.id,
      projetNumero: base.numero,
      projetTitre: base.titre,
      clientNom: base.clientNom,
      numero: entry.numero,
      date: entry.date,
      description: entry.description,
      montantHT: ht,
      tps,
      tvq,
      montantTotal: ht + tps + tvq,
      pctContrat: entry.pctContrat,
      pctAvancement: entry.pctAvancement,
      statut: entry.statut,
      datePaiement: entry.datePaiement,
      notes: entry.notes,
    })

    setFactModal(false)
    showToast(editFacture ? 'Facture mise à jour et transmise à la comptabilité.' : 'Facture créée et transmise à la comptabilité.')
  }
  function updateFactureStatut(fid: string, statut: Facture['statut']) {
    const base = projet as ProjetPlus
    const updated = (base.factures ?? []).map(f => f.id === fid
      ? { ...f, statut, datePaiement: statut === 'payee' ? new Date().toISOString().slice(0,10) : f.datePaiement }
      : f)
    save({ ...base, factures: updated })
    updateFactureSyncStatut(fid, statut)
    showToast('Statut mis à jour.')
  }
  function deleteFacture(fid: string) {
    const base = projet as ProjetPlus
    save({ ...base, factures: (base.factures ?? []).filter(f => f.id !== fid) })
    removeFactureSync(fid)
    showToast('Facture supprimée.')
  }
  function setFacturationType(type: 'forfait' | 'progressif') {
    save({ ...(projet as ProjetPlus), typeFacturation: type })
    setTypeFactModal(false)
    showToast(`Mode de facturation : ${type === 'forfait' ? 'forfait' : 'progressif'}.`)
  }

  const factStatutColors: Record<string, string> = {
    brouillon: 'bg-slate-50 text-slate-500 border-slate-200',
    envoyee:   'bg-blue-50 text-blue-600 border-blue-200',
    payee:     'bg-emerald-50 text-emerald-600 border-emerald-200',
    en_retard: 'bg-red-50 text-red-500 border-red-200',
  }
  const factStatutLabels: Record<string, string> = { brouillon:'Brouillon', envoyee:'Envoyée', payee:'Payée', en_retard:'En retard' }

  return (
    <PageWithAI module="projets" title={projet.titre}>
      {toast && <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">{toast}</div>}

      {/* ── En-tête ── */}
      <div className="mb-5">
        <button onClick={() => router.push('/projets')} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-600 transition mb-3">
          <ArrowLeft size={13} /> Retour aux projets
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <span className="text-sm font-mono font-semibold text-amber-600">{projet.numero}</span>
              <Badge status={projet.statut} />
              {soumission && (
                <Link href={`/soumissions/${soumission.id}`}
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 hover:underline">
                  <FileText size={10} /> {soumission.numero}
                </Link>
              )}
              {estimation && (
                <Link href={`/estimation/${estimation.id}`}
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100 hover:underline">
                  <ClipboardList size={10} /> Est. {estimation.titre.slice(0,25)}…
                </Link>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-800">{projet.titre}</h1>
            <p className="text-sm text-slate-500 mt-1">{projet.clientNom} &nbsp;·&nbsp; <User size={11} className="inline" /> {projet.chargeProjNom} &nbsp;·&nbsp; <Calendar size={11} className="inline" /> {new Date(projet.dateDebut).toLocaleDateString('fr-CA')} → {new Date(projet.dateFin).toLocaleDateString('fr-CA')}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={openEditInfo} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
              <Pencil size={12} /> Modifier
            </button>
            <button onClick={() => { setAvancVal(projet.avancement); setAvancModal(true) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background:'#C9A84C' }}>
              <BarChart2 size={12} /> Avancement {projet.avancement}%
            </button>
          </div>
        </div>

        {/* Barre avancement */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-3 bg-slate-100 rounded-full">
            <div className={`h-3 rounded-full transition-all ${projet.avancement>=80?'bg-emerald-400':projet.avancement>=40?'bg-blue-400':'bg-amber-400'}`}
              style={{ width:`${projet.avancement}%` }} />
          </div>
          <span className="text-sm font-bold text-slate-700 w-10">{projet.avancement}%</span>
        </div>

        {/* Mini KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {[
            { label:'Budget contrat', val:fmt(budgetTotal), sub: ocApprouves > 0 ? `dont ${fmt(ocApprouves)} OC` : undefined, color:'text-slate-800' },
            { label:'Coûts engagés', val:fmt(engage), sub:`PO: ${fmt(totalBCs)} · Dép: ${fmt(totalDep)}`, color:pctBudget>90?'text-red-600':pctBudget>70?'text-amber-600':'text-slate-800' },
            { label:'Facturé au client', val:fmt(totalFacture), sub:`${pctFacture}% du contrat`, color:'text-blue-700' },
            { label:'Encaissé', val:fmt(totalPaye), sub:totalFacture > 0 ? `${pctEncaisse}% facturé` : 'En attente', color:totalPaye >= totalFacture && totalFacture > 0 ? 'text-emerald-600' : 'text-slate-800' },
          ].map(k => (
            <div key={k.label} className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
              <p className="text-xs text-slate-400 mb-1">{k.label}</p>
              <p className={`text-base font-bold ${k.color}`}>{k.val}</p>
              {k.sub && <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Onglets ── */}
      <div className="flex gap-1 border-b border-slate-200 mb-5 overflow-x-auto pb-px">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap rounded-t-lg transition ${tab===t.id?'bg-white border border-slate-200 border-b-white text-amber-600 -mb-px':'text-slate-500 hover:text-slate-700'}`}>
              <Icon size={13} />{t.label}
            </button>
          )
        })}
      </div>

      {/* ════ APERÇU ════ */}
      {tab === 'apercu' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Description du projet</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{projet.description || 'Aucune description.'}</p>
            </Card>
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Équipe de projet</h3>
              <div className="flex flex-wrap gap-2">
                {(projet.equipe ?? []).map(m => (
                  <div key={m} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center" style={{ background:'#0D1B2A', color:'#C9A84C' }}>{m[0]}</div>
                    <span className="text-xs text-slate-700">{m}</span>
                    {m === projet.chargeProjNom && <span className="text-xs text-amber-600 font-semibold">CP</span>}
                  </div>
                ))}
              </div>
            </Card>
            {soumission && (
              <Card>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Soumission et estimation d'origine</h3>
                <div className="flex gap-4 flex-wrap">
                  <Link href={`/soumissions/${soumission.id}`}
                    className="flex-1 min-w-[200px] flex items-center justify-between px-4 py-3 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition">
                    <div><p className="text-xs text-blue-400 mb-1">Soumission</p><p className="font-semibold text-blue-700">{soumission.numero}</p><p className="text-xs text-blue-500">{fmt(soumission.prixSoumis)}</p></div>
                    <ExternalLink size={14} className="text-blue-400" />
                  </Link>
                  {estimation && (
                    <Link href={`/estimation/${estimation.id}`}
                      className="flex-1 min-w-[200px] flex items-center justify-between px-4 py-3 bg-purple-50 rounded-xl border border-purple-100 hover:bg-purple-100 transition">
                      <div><p className="text-xs text-purple-400 mb-1">Estimation</p><p className="font-semibold text-purple-700 truncate max-w-[180px]">{estimation.titre}</p><p className="text-xs text-purple-500">Marge {estimation.marge}%</p></div>
                      <ExternalLink size={14} className="text-purple-400" />
                    </Link>
                  )}
                </div>
              </Card>
            )}
          </div>
          <div className="space-y-4">
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Tâches en cours</h3>
              <p className="text-2xl font-bold text-slate-800 mb-1">{tachesDone}/{taches.length}</p>
              <p className="text-xs text-slate-400 mb-3">tâches complétées</p>
              <div className="space-y-2">
                {taches.slice(0,5).map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.statut==='termine'?'bg-emerald-400':t.statut==='en_retard'?'bg-red-400':'bg-amber-400'}`} />
                    <span className={`flex-1 truncate ${t.statut==='termine'?'line-through text-slate-400':'text-slate-700'}`}>{t.titre}</span>
                    <span className="text-slate-400">{t.avancement}%</span>
                  </div>
                ))}
              </div>
              {taches.length > 5 && <button onClick={()=>setTab('taches')} className="text-xs text-amber-600 hover:underline mt-2">Voir toutes les tâches →</button>}
            </Card>
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Bons de commande</h3>
              <p className="text-2xl font-bold text-slate-800 mb-1">{projetBCs.length}</p>
              <p className="text-xs text-slate-400 mb-1">bons de commande</p>
              <p className="text-sm font-semibold text-slate-700">{fmt(totalBCs)} engagé</p>
              <button onClick={()=>setTab('bcs')} className="text-xs text-amber-600 hover:underline mt-2 block">Voir les BCs →</button>
            </Card>
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Utilisation du budget</h3>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-3 bg-slate-100 rounded-full">
                  <div className={`h-3 rounded-full ${pctBudget>90?'bg-red-400':pctBudget>70?'bg-amber-400':'bg-emerald-400'}`} style={{ width:`${Math.min(pctBudget,100)}%` }} />
                </div>
                <span className={`text-sm font-bold ${pctBudget>90?'text-red-500':pctBudget>70?'text-amber-500':'text-emerald-600'}`}>{pctBudget}%</span>
              </div>
              <p className="text-xs text-slate-400">{fmt(engage)} / {fmt(budgetTotal)}</p>
            </Card>
          </div>
        </div>
      )}

      {/* ════ TÂCHES ════ */}
      {tab === 'taches' && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div><h3 className="text-sm font-semibold text-slate-700">Tâches du projet</h3><p className="text-xs text-slate-400 mt-0.5">{tachesDone}/{taches.length} complétées</p></div>
            <button onClick={openAddTache} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background:'#C9A84C' }}>
              <Plus size={12} /> Ajouter une tâche
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {taches.length === 0 && <p className="text-sm text-slate-400 text-center py-10">Aucune tâche. Cliquez sur + Ajouter.</p>}
            {taches.map(t => (
              <div key={t.id} className="px-5 py-4 flex items-start gap-4 hover:bg-slate-50 transition">
                <button onClick={()=>toggleTache(t.id)} className="mt-0.5 text-slate-400 hover:text-emerald-500 transition shrink-0">
                  {t.statut==='termine' ? <CheckSquare size={16} className="text-emerald-500" /> : <Square size={16} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${t.statut==='termine'?'line-through text-slate-400':'text-slate-800'}`}>{t.titre}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                    <span><User size={10} className="inline mr-1" />{t.responsable}</span>
                    <span><Calendar size={10} className="inline mr-1" />{t.debut} → {t.fin}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full max-w-[160px]">
                      <div className={`h-1.5 rounded-full ${t.statut==='termine'?'bg-emerald-400':t.statut==='en_retard'?'bg-red-400':'bg-blue-400'}`} style={{ width:`${t.avancement}%` }} />
                    </div>
                    <span className="text-xs text-slate-500">{t.avancement}%</span>
                    <Badge status={t.statut} />
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={()=>openEditTache(t)} className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition"><Pencil size={12} /></button>
                  <button onClick={()=>deleteTache(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ════ BUDGET ════ */}
      {tab === 'budget' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label:'Budget initial',    val:projet.budgetInitial, color:'text-slate-800' },
              { label:'OC approuvés',      val:ocApprouves,          color:'text-blue-600' },
              { label:'Budget total actuel', val:budgetTotal,        color:'text-slate-800 font-bold' },
              { label:'Restant disponible',  val:restant,            color:restant<0?'text-red-600 font-bold':'text-emerald-600 font-bold' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-xl px-4 py-4 border border-slate-100 shadow-sm">
                <p className="text-xs text-slate-400 mb-1">{k.label}</p>
                <p className={`text-lg ${k.color}`}>{fmt(k.val)}</p>
              </div>
            ))}
          </div>

          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Répartition des coûts engagés</h3>
            <div className="space-y-4">
              {[
                { label:'Bons de commande (POs)', val:totalBCs, note:'Engagements fournisseurs', color:'bg-blue-500' },
                { label:'Dépenses directes saisies', val:totalDep, note:'Coûts saisis manuellement', color:'bg-amber-400' },
                { label:'Autres coûts engagés', val:projet.coutEngages, note:'Imputations diverses', color:'bg-purple-400' },
              ].map(r => {
                const pct = budgetTotal ? Math.round((r.val/budgetTotal)*100) : 0
                return (
                  <div key={r.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <div><span className="text-slate-700 font-medium">{r.label}</span><span className="text-slate-400 ml-2">{r.note}</span></div>
                      <span className="font-semibold text-slate-700">{fmt(r.val)} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full">
                      <div className={`h-2.5 rounded-full ${r.color}`} style={{ width:`${Math.min(pct,100)}%` }} />
                    </div>
                  </div>
                )
              })}
              <div className="pt-3 border-t border-slate-100 flex justify-between text-sm font-semibold">
                <span className="text-slate-600">Total engagé</span>
                <span className={pctBudget>90?'text-red-600':pctBudget>70?'text-amber-600':'text-slate-800'}>{fmt(engage)} ({pctBudget}%)</span>
              </div>
            </div>
          </Card>

          {projetBCs.length > 0 && (
            <Card padding={false}>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Package size={14} className="text-blue-500" />
                <h3 className="text-sm font-semibold text-slate-700">Bons de commande — coûts engagés</h3>
                <span className="ml-auto text-xs text-blue-600 font-semibold">{fmt(totalBCs)}</span>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">Numéro</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500">Fournisseur</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500">Montant</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500">Statut</th>
                </tr></thead>
                <tbody>
                  {projetBCs.map(bc => (
                    <tr key={bc.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-5 py-2.5"><Link href={`/bons-commande/${bc.id}`} className="text-amber-600 hover:underline text-xs font-mono">{bc.numero}</Link></td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">{bc.fournisseurNom}</td>
                      <td className="px-3 py-2.5 text-right text-sm font-semibold text-blue-700">{fmt(bc.montantTotal)}</td>
                      <td className="px-3 py-2.5"><Badge status={bc.statut} /></td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50/50 font-semibold">
                    <td colSpan={2} className="px-5 py-2.5 text-xs text-blue-700">Total POs engagés</td>
                    <td className="px-3 py-2.5 text-right text-sm text-blue-700">{fmt(totalBCs)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* ════ FACTURATION ════ */}
      {tab === 'facturation' && (
        <div className="space-y-4">
          {/* En-tête facturation */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label:'Valeur contrat',   val:fmt(budgetTotal),    color:'text-slate-800', icon:<DollarSign size={16} className="text-slate-400" /> },
              { label:'Total facturé',    val:fmt(totalFacture),   color:'text-blue-700',  icon:<Send size={16} className="text-blue-400" /> },
              { label:'Encaissé (payé)',  val:fmt(totalPaye),      color:'text-emerald-600', icon:<CreditCard size={16} className="text-emerald-400" /> },
              { label:'Solde à facturer', val:fmt(Math.max(0,soldeRestant)), color:soldeRestant < 0 ? 'text-red-600' : 'text-amber-700', icon:<TrendingUp size={16} className="text-amber-400" /> },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-xl px-4 py-4 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">{k.icon}<span className="text-xs text-slate-400">{k.label}</span></div>
                <p className={`text-xl font-bold ${k.color}`}>{k.val}</p>
              </div>
            ))}
          </div>

          {/* Barre de progression facturation */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Progression de la facturation</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mode : <span className="font-semibold text-slate-600">{typeFacturation === 'forfait' ? 'Forfait (facture unique)' : 'Progressif (factures par étapes)'}</span>
                  <button onClick={() => setTypeFactModal(true)} className="ml-2 text-amber-600 hover:underline">Changer</button>
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">Facturé</span><span className="font-semibold text-blue-600">{pctFacture}%</span></div>
                <div className="w-full h-3 bg-slate-100 rounded-full"><div className="h-3 rounded-full bg-blue-400 transition-all" style={{ width:`${Math.min(pctFacture,100)}%` }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">Encaissé</span><span className="font-semibold text-emerald-600">{pctEncaisse}%</span></div>
                <div className="w-full h-3 bg-slate-100 rounded-full"><div className="h-3 rounded-full bg-emerald-400 transition-all" style={{ width:`${Math.min(pctEncaisse,100)}%` }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">Avancement travaux</span><span className="font-semibold text-amber-600">{projet.avancement}%</span></div>
                <div className="w-full h-3 bg-slate-100 rounded-full"><div className="h-3 rounded-full bg-amber-400 transition-all" style={{ width:`${projet.avancement}%` }} /></div>
              </div>
            </div>
          </Card>

          {/* Liste factures */}
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Factures</h3>
                <p className="text-xs text-slate-400 mt-0.5">{factures.length} facture{factures.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={openAddFacture}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background:'#C9A84C' }}>
                <Plus size={12} /> Créer une facture
              </button>
            </div>

            {factures.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CreditCard size={28} className="mx-auto mb-3 text-slate-200" />
                <p className="text-sm">Aucune facture créée.</p>
                <p className="text-xs mt-1">
                  {typeFacturation === 'forfait'
                    ? 'Créez une facture unique pour le montant total du contrat.'
                    : 'Créez des factures progressives selon l\'avancement des travaux.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">Numéro</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">Description</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">Montant</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">% Contrat</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">Avanc.</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">Date</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">Statut</th>
                    <th className="px-3 py-3 w-20"></th>
                  </tr></thead>
                  <tbody>
                    {factures.map(f => (
                      <tr key={f.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                        <td className="px-5 py-3 text-xs font-mono font-semibold text-slate-700">{f.numero}</td>
                        <td className="px-3 py-3 text-xs text-slate-600 max-w-[200px] truncate">{f.description}</td>
                        <td className="px-3 py-3 text-right font-bold text-slate-800">{fmt(f.montant)}</td>
                        <td className="px-3 py-3 text-right text-xs text-slate-500">{f.pctContrat}%</td>
                        <td className="px-3 py-3 text-right text-xs text-slate-500">{f.pctAvancement}%</td>
                        <td className="px-3 py-3 text-xs text-slate-500">{f.date}{f.datePaiement && <><br/><span className="text-emerald-500">Payé: {f.datePaiement}</span></>}</td>
                        <td className="px-3 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${factStatutColors[f.statut]}`}>{factStatutLabels[f.statut]}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            {f.statut === 'brouillon' && (
                              <button onClick={() => updateFactureStatut(f.id,'envoyee')} title="Envoyer" className="p-1.5 rounded text-blue-400 hover:bg-blue-50 hover:text-blue-600 transition"><Send size={12} /></button>
                            )}
                            {f.statut === 'envoyee' && (
                              <button onClick={() => updateFactureStatut(f.id,'payee')} title="Marquer payée" className="p-1.5 rounded text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 transition"><CreditCard size={12} /></button>
                            )}
                            <button onClick={() => openEditFacture(f)} className="p-1.5 rounded text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition"><Pencil size={12} /></button>
                            <button onClick={() => deleteFacture(f.id)} className="p-1.5 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 transition"><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold">
                      <td colSpan={2} className="px-5 py-3 text-xs text-slate-600">Total facturé</td>
                      <td className="px-3 py-3 text-right text-sm text-blue-700">{fmt(totalFacture)}</td>
                      <td colSpan={5} />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Facture unique suggérée pour forfait sans facture */}
            {typeFacturation === 'forfait' && factures.length === 0 && (
              <div className="px-5 py-4 bg-amber-50/40 border-t border-amber-100">
                <p className="text-xs text-amber-700 font-semibold mb-2">Mode forfait — facture suggérée</p>
                <div className="flex items-center justify-between text-xs text-amber-600">
                  <span>Facture unique : {fmt(budgetTotal)} (100% du contrat)</span>
                  <button onClick={() => {
                    setFactForm({ date: new Date().toISOString().slice(0,10), description:`Facturation forfaitaire — ${projet.titre}`, montant: String(budgetTotal), pctContrat:'100', pctAvancement: String(projet.avancement), statut:'brouillon', datePaiement:'', notes:'' })
                    setEditFacture(null); setFactModal(true)
                  }} className="px-3 py-1 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition">
                    Pré-remplir
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ════ BONS DE COMMANDE ════ */}
      {tab === 'bcs' && (
        <>
          {/* KPIs POs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-400 mb-1">POs actifs</p>
              <p className="text-xl font-bold text-slate-800">{projetBCs.filter(p => p.statut !== 'brouillon').length}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <p className="text-xs text-amber-600 mb-1">Engagé TTC</p>
              <p className="text-xl font-bold text-amber-700">{fmt(totalBCs)}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <p className="text-xs text-emerald-600 mb-1">Payé</p>
              <p className="text-xl font-bold text-emerald-700">{fmt(totalBCsPaye)}</p>
            </div>
            <div className={`border rounded-xl px-4 py-3 ${budgetLibere > 0 ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
              <p className={`text-xs mb-1 ${budgetLibere > 0 ? 'text-blue-600' : 'text-slate-400'}`}>Fonds libérés</p>
              <p className={`text-xl font-bold ${budgetLibere > 0 ? 'text-blue-700' : 'text-slate-400'}`}>{fmt(budgetLibere)}</p>
            </div>
          </div>
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div><h3 className="text-sm font-semibold text-slate-700">Bons de commande du projet</h3><p className="text-xs text-slate-400 mt-0.5">{projetBCs.length} PO · {fmt(totalBCs)} engagé</p></div>
              <Link href="/bons-commande" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background:'#C9A84C' }}>
                <Plus size={12} /> Créer un PO
              </Link>
            </div>
            {projetBCs.length === 0 ? (
              <div className="text-center py-12 text-slate-400"><Package size={28} className="mx-auto mb-3 text-slate-200" /><p className="text-sm">Aucun bon de commande pour ce projet.</p><Link href="/bons-commande" className="text-xs text-amber-600 hover:underline mt-1 block">Créer un PO →</Link></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">PO #</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">Fournisseur</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">Engagé TTC</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">Payé</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">Reliquat</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">Statut</th>
                    <th className="px-3 py-3 w-8"></th>
                  </tr></thead>
                  <tbody>
                    {projetBCs.map((po, i) => {
                      const reliquat = +(po.montantTotal - po.montantPaye).toFixed(2)
                      return (
                        <tr key={po.id} className={`border-b border-slate-50 hover:bg-slate-50 transition ${i%2!==0?'bg-slate-50/30':''}`}>
                          <td className="px-5 py-3"><Link href={`/bons-commande/${po.id}`} className="text-amber-600 hover:underline text-xs font-mono font-semibold">{po.numero}</Link></td>
                          <td className="px-3 py-3 text-xs text-slate-700">{po.fournisseurNom}</td>
                          <td className="px-3 py-3 text-right font-semibold text-slate-800">{fmt(po.montantTotal)}</td>
                          <td className="px-3 py-3 text-right text-emerald-600 font-semibold">{fmt(po.montantPaye)}</td>
                          <td className="px-3 py-3 text-right">
                            <span className={reliquat > 0 && po.statut !== 'ferme' && po.statut !== 'brouillon' ? 'text-amber-600 font-semibold' : 'text-slate-400'}>
                              {po.statut === 'ferme' ? <span className="text-emerald-500 text-xs">Libéré</span> : fmt(reliquat)}
                            </span>
                          </td>
                          <td className="px-3 py-3"><Badge status={po.statut} /></td>
                          <td className="px-3 py-3"><Link href={`/bons-commande/${po.id}`}><ChevronRight size={14} className="text-slate-300" /></Link></td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td colSpan={2} className="px-5 py-3 text-xs font-bold text-slate-600">Total</td>
                      <td className="px-3 py-3 text-right font-extrabold text-slate-800">{fmt(totalBCs)}</td>
                      <td className="px-3 py-3 text-right font-extrabold text-emerald-600">{fmt(totalBCsPaye)}</td>
                      <td className="px-3 py-3 text-right font-extrabold text-amber-600">{fmt(totalBCsReliquat)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ════ DÉPENSES ════ */}
      {tab === 'depenses' && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div><h3 className="text-sm font-semibold text-slate-700">Dépenses directes</h3><p className="text-xs text-slate-400 mt-0.5">{depenses.length} entrées · {fmt(totalDep)} total</p></div>
            <button onClick={() => { setDepForm({ date:new Date().toISOString().slice(0,10), categorie:'Matériaux', description:'', fournisseur:'', montant:'' }); setDepenseModal(true) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background:'#C9A84C' }}>
              <Plus size={12} /> Saisir une dépense
            </button>
          </div>
          {depenses.length === 0 ? (
            <div className="text-center py-12 text-slate-400"><Receipt size={28} className="mx-auto mb-3 text-slate-200" /><p className="text-sm">Aucune dépense enregistrée.</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">Date</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">Catégorie</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">Description</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">Fournisseur</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">Montant</th>
              </tr></thead>
              <tbody>
                {depenses.map(d => (
                  <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="px-5 py-3 text-xs text-slate-500">{d.date}</td>
                    <td className="px-3 py-3"><span className="text-xs px-2 py-0.5 bg-slate-100 rounded-full text-slate-600">{d.categorie}</span></td>
                    <td className="px-3 py-3 text-xs text-slate-700">{d.description}</td>
                    <td className="px-3 py-3 text-xs text-slate-500">{d.fournisseur}</td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-800">{fmt(d.montant)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td colSpan={4} className="px-5 py-3 text-xs text-slate-600">Total dépenses</td>
                  <td className="px-3 py-3 text-right text-sm text-slate-800">{fmt(totalDep)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* ════ DOCUMENTS ════ */}
      {tab === 'documents' && (
        <Card>
          <DocumentsSection lienType="projet" refId={projet.id} refLabel={projet.titre} />
        </Card>
      )}

      {/* ════ JOURNAL ════ */}
      {tab === 'journal' && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Journal de projet</h3>
            <button onClick={() => { setJournalForm({ type:'note', contenu:'' }); setJournalModal(true) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background:'#C9A84C' }}>
              <Plus size={12} /> Ajouter une entrée
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {[...projet.journal].reverse().map(j => (
              <div key={j.id} className="px-5 py-4 flex items-start gap-3">
                <div className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 mt-0.5 ${typeColors[j.type] ?? 'bg-slate-50 text-slate-500'}`}>{j.type}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 leading-relaxed">{j.contenu}</p>
                  <p className="text-xs text-slate-400 mt-1">{j.date} · {j.auteur}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ════ ORDRES DE CHANGEMENT ════ */}
      {tab === 'oc' && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div><h3 className="text-sm font-semibold text-slate-700">Ordres de changement</h3><p className="text-xs text-slate-400 mt-0.5">Approuvés : {fmt(ocApprouves)}</p></div>
            <button onClick={() => { setOcForm({ description:'', montant:'' }); setOcModal(true) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background:'#C9A84C' }}>
              <Plus size={12} /> Créer un OC
            </button>
          </div>
          {ocs.length === 0 ? (
            <div className="text-center py-12 text-slate-400"><AlertTriangle size={28} className="mx-auto mb-3 text-slate-200" /><p className="text-sm">Aucun ordre de changement.</p></div>
          ) : (
            <div className="divide-y divide-slate-50">
              {ocs.map(o => (
                <div key={o.id} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-semibold text-slate-600">{o.numero}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${ocColors[o.statut]}`}>{o.statut}</span>
                    </div>
                    <p className="text-sm text-slate-700">{o.description}</p>
                    <p className="text-xs text-slate-400 mt-1">{o.date} · <strong className="text-slate-600">{fmt(o.montant)}</strong></p>
                  </div>
                  {o.statut === 'en_attente' && (
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={()=>updateOCStatut(o.id,'approuve')} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 font-semibold transition">Approuver</button>
                      <button onClick={()=>updateOCStatut(o.id,'refuse')} className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 font-semibold transition">Refuser</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ══ MODALS ══ */}

      {/* Tâche */}
      <Modal open={tacheModal} onClose={()=>setTacheModal(false)} title={editTache?'Modifier la tâche':'Nouvelle tâche'} size="md">
        <form onSubmit={submitTache} className="space-y-4">
          <Field label="Titre de la tâche" required><input className={inputCls} required value={tacheForm.titre} onChange={e=>setTacheForm(f=>({...f,titre:e.target.value}))} placeholder="Ex: Excavation tronçon A" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Responsable" required>
              <select className={selectCls} value={tacheForm.responsable} onChange={e=>setTacheForm(f=>({...f,responsable:e.target.value}))} required>
                <option value="">Sélectionner...</option>
                {(projet.equipe??[]).map(m=><option key={m} value={m}>{m}</option>)}
                {MEMBRES_LIST.filter(m=>!(projet.equipe??[]).includes(m)).map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Statut">
              <select className={selectCls} value={tacheForm.statut} onChange={e=>setTacheForm(f=>({...f,statut:e.target.value as Tache['statut']}))}>
                <option value="a_faire">À faire</option>
                <option value="en_cours">En cours</option>
                <option value="termine">Terminé</option>
                <option value="en_retard">En retard</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date de début" required><input className={inputCls} type="date" required value={tacheForm.debut} onChange={e=>setTacheForm(f=>({...f,debut:e.target.value}))} /></Field>
            <Field label="Date de fin" required><input className={inputCls} type="date" required value={tacheForm.fin} onChange={e=>setTacheForm(f=>({...f,fin:e.target.value}))} /></Field>
          </div>
          <Field label={`Avancement — ${tacheForm.avancement}%`}>
            <input type="range" min={0} max={100} step={5} value={tacheForm.avancement}
              onChange={e=>setTacheForm(f=>({...f,avancement:parseInt(e.target.value)}))}
              className="w-full accent-amber-500" />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Btn type="button" variant="secondary" onClick={()=>setTacheModal(false)}>Annuler</Btn>
            <Btn type="submit">{editTache?'Mettre à jour':'Créer la tâche'}</Btn>
          </div>
        </form>
      </Modal>

      {/* Dépense */}
      <Modal open={depenseModal} onClose={()=>setDepenseModal(false)} title="Saisir une dépense" size="md">
        <form onSubmit={submitDepense} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date" required><input className={inputCls} type="date" required value={depForm.date} onChange={e=>setDepForm(f=>({...f,date:e.target.value}))} /></Field>
            <Field label="Catégorie">
              <select className={selectCls} value={depForm.categorie} onChange={e=>setDepForm(f=>({...f,categorie:e.target.value}))}>
                {DEPENSE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Description" required><input className={inputCls} required value={depForm.description} onChange={e=>setDepForm(f=>({...f,description:e.target.value}))} placeholder="Ex: Achat de ciment — 50 sacs" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fournisseur"><input className={inputCls} value={depForm.fournisseur} onChange={e=>setDepForm(f=>({...f,fournisseur:e.target.value}))} placeholder="Ex: Béton Provincial" /></Field>
            <Field label="Montant ($)" required><input className={inputCls} type="number" min="0" required value={depForm.montant} onChange={e=>setDepForm(f=>({...f,montant:e.target.value}))} placeholder="0.00" /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Btn type="button" variant="secondary" onClick={()=>setDepenseModal(false)}>Annuler</Btn>
            <Btn type="submit">Enregistrer</Btn>
          </div>
        </form>
      </Modal>

      {/* Journal */}
      <Modal open={journalModal} onClose={()=>setJournalModal(false)} title="Entrée au journal" size="md">
        <form onSubmit={submitJournal} className="space-y-4">
          <Field label="Type">
            <select className={selectCls} value={journalForm.type} onChange={e=>setJournalForm(f=>({...f,type:e.target.value as LigneJournal['type']}))}>
              <option value="note">Note</option>
              <option value="avancement">Avancement</option>
              <option value="changement">Changement</option>
              <option value="incident">Incident</option>
            </select>
          </Field>
          <Field label="Contenu" required>
            <textarea className={inputCls} rows={4} required value={journalForm.contenu} onChange={e=>setJournalForm(f=>({...f,contenu:e.target.value}))} placeholder="Décrivez l'entrée..." />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Btn type="button" variant="secondary" onClick={()=>setJournalModal(false)}>Annuler</Btn>
            <Btn type="submit">Ajouter</Btn>
          </div>
        </form>
      </Modal>

      {/* Ordre de changement */}
      <Modal open={ocModal} onClose={()=>setOcModal(false)} title="Nouvel ordre de changement" size="md">
        <form onSubmit={submitOC} className="space-y-4">
          <Field label="Description" required>
            <textarea className={inputCls} rows={3} required value={ocForm.description} onChange={e=>setOcForm(f=>({...f,description:e.target.value}))} placeholder="Décrivez la modification..." />
          </Field>
          <Field label="Montant ($)" required>
            <input className={inputCls} type="number" required value={ocForm.montant} onChange={e=>setOcForm(f=>({...f,montant:e.target.value}))} placeholder="0.00" />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Btn type="button" variant="secondary" onClick={()=>setOcModal(false)}>Annuler</Btn>
            <Btn type="submit">Créer l'OC</Btn>
          </div>
        </form>
      </Modal>

      {/* Avancement global */}
      <Modal open={avancModal} onClose={()=>setAvancModal(false)} title="Mettre à jour l'avancement" size="sm">
        <form onSubmit={submitAvancement} className="space-y-5">
          <Field label={`Avancement global : ${avancVal}%`}>
            <input type="range" min={0} max={100} step={5} value={avancVal}
              onChange={e=>setAvancVal(parseInt(e.target.value))}
              className="w-full accent-amber-500 mt-2" />
            <div className="flex justify-between text-xs text-slate-400 mt-1"><span>0%</span><span>50%</span><span>100%</span></div>
          </Field>
          <div className="flex justify-end gap-2">
            <Btn type="button" variant="secondary" onClick={()=>setAvancModal(false)}>Annuler</Btn>
            <Btn type="submit"><Save size={12} className="inline mr-1" />Enregistrer</Btn>
          </div>
        </form>
      </Modal>

      {/* Modifier infos */}
      <Modal open={editInfoModal} onClose={()=>setEditInfoModal(false)} title="Modifier le projet" size="md">
        <form onSubmit={submitInfo} className="space-y-4">
          <Field label="Statut">
            <select className={selectCls} value={infoForm.statut} onChange={e=>setInfoForm(f=>({...f,statut:e.target.value}))}>
              <option value="planification">Planification</option>
              <option value="en_cours">En cours</option>
              <option value="suspendu">Suspendu</option>
              <option value="termine">Terminé</option>
              <option value="annule">Annulé</option>
            </select>
          </Field>
          <Field label="Chargé de projet">
            <select className={selectCls} value={infoForm.chargeProjNom} onChange={e=>setInfoForm(f=>({...f,chargeProjNom:e.target.value}))}>
              {MEMBRES_LIST.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date de début"><input className={inputCls} type="date" value={infoForm.dateDebut} onChange={e=>setInfoForm(f=>({...f,dateDebut:e.target.value}))} /></Field>
            <Field label="Date de fin"><input className={inputCls} type="date" value={infoForm.dateFin} onChange={e=>setInfoForm(f=>({...f,dateFin:e.target.value}))} /></Field>
          </div>
          <Field label="Description">
            <textarea className={inputCls} rows={4} value={infoForm.description} onChange={e=>setInfoForm(f=>({...f,description:e.target.value}))} />
          </Field>
          <div className="flex justify-end gap-2">
            <Btn type="button" variant="secondary" onClick={()=>setEditInfoModal(false)}>Annuler</Btn>
            <Btn type="submit">Sauvegarder</Btn>
          </div>
        </form>
      </Modal>

      {/* ── Modal Facture ── */}
      <Modal open={factModal} onClose={()=>setFactModal(false)} title={editFacture ? `Modifier — ${editFacture.numero}` : 'Nouvelle facture'} size="md">
        <form onSubmit={submitFacture} className="space-y-4">
          <Field label="Description" required>
            <input className={inputCls} required value={factForm.description}
              onChange={e=>setFactForm(f=>({...f,description:e.target.value}))}
              placeholder={typeFacturation==='forfait'?'Facturation forfaitaire — travaux complétés':'Facturation progressive — travaux période X'} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date de facturation" required>
              <input className={inputCls} type="date" required value={factForm.date} onChange={e=>setFactForm(f=>({...f,date:e.target.value}))} />
            </Field>
            <Field label="Montant ($)" required>
              <input className={inputCls} type="number" min="0" step="0.01" required value={factForm.montant}
                onChange={e=>{
                  const m = parseFloat(e.target.value)||0
                  const pct = budgetTotal ? Math.round((m/budgetTotal)*100) : 0
                  setFactForm(f=>({...f,montant:e.target.value,pctContrat:String(pct)}))
                }} placeholder="0.00" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="% du contrat facturé">
              <div className="flex items-center gap-2">
                <input className={`${inputCls} flex-1`} type="number" min="0" max="100" value={factForm.pctContrat}
                  onChange={e=>{
                    const pct = parseFloat(e.target.value)||0
                    const m = budgetTotal ? Math.round(budgetTotal * pct / 100) : 0
                    setFactForm(f=>({...f,pctContrat:e.target.value,montant:String(m)}))
                  }} placeholder="%" />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </Field>
            <Field label="% avancement travaux">
              <div className="flex items-center gap-2">
                <input className={`${inputCls} flex-1`} type="number" min="0" max="100" value={factForm.pctAvancement}
                  onChange={e=>setFactForm(f=>({...f,pctAvancement:e.target.value}))} placeholder="%" />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </Field>
          </div>
          <Field label="Statut">
            <select className={selectCls} value={factForm.statut} onChange={e=>setFactForm(f=>({...f,statut:e.target.value as Facture['statut']}))}>
              <option value="brouillon">Brouillon</option>
              <option value="envoyee">Envoyée</option>
              <option value="payee">Payée</option>
              <option value="en_retard">En retard</option>
            </select>
          </Field>
          {(factForm.statut === 'payee') && (
            <Field label="Date de paiement">
              <input className={inputCls} type="date" value={factForm.datePaiement} onChange={e=>setFactForm(f=>({...f,datePaiement:e.target.value}))} />
            </Field>
          )}
          <Field label="Notes internes">
            <textarea className={inputCls} rows={2} value={factForm.notes} onChange={e=>setFactForm(f=>({...f,notes:e.target.value}))} placeholder="Conditions de paiement, référence client..." />
          </Field>
          {factForm.montant && (
            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
              Montant : <strong>{fmt(parseFloat(factForm.montant)||0)}</strong> = {factForm.pctContrat}% du contrat ({fmt(budgetTotal)})
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Btn type="button" variant="secondary" onClick={()=>setFactModal(false)}>Annuler</Btn>
            <Btn type="submit">{editFacture ? 'Mettre à jour' : 'Créer la facture'}</Btn>
          </div>
        </form>
      </Modal>

      {/* ── Modal type facturation ── */}
      <Modal open={typeFactModal} onClose={()=>setTypeFactModal(false)} title="Mode de facturation" size="sm">
        <div className="space-y-3 py-2">
          <button onClick={()=>setFacturationType('forfait')}
            className={`w-full text-left px-4 py-4 rounded-xl border-2 transition ${typeFacturation==='forfait'?'border-amber-400 bg-amber-50':'border-slate-100 hover:border-slate-200'}`}>
            <p className="font-semibold text-slate-800 mb-1">Forfait</p>
            <p className="text-xs text-slate-500">Une seule facture pour la totalité du contrat. Idéal pour les projets à prix fixe.</p>
          </button>
          <button onClick={()=>setFacturationType('progressif')}
            className={`w-full text-left px-4 py-4 rounded-xl border-2 transition ${typeFacturation==='progressif'?'border-amber-400 bg-amber-50':'border-slate-100 hover:border-slate-200'}`}>
            <p className="font-semibold text-slate-800 mb-1">Facturation progressive</p>
            <p className="text-xs text-slate-500">Plusieurs factures émises selon l'avancement des travaux (ex: 25%, 50%, 75%, 100%).</p>
          </button>
        </div>
      </Modal>
    </PageWithAI>
  )
}
