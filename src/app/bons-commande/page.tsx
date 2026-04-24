'use client'
import { useState, useEffect, useCallback } from 'react'
import { fournisseurs } from '@/lib/mock-data/fournisseurs'
import { projets as mockProjets } from '@/lib/mock-data/projets'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { KpiCard } from '@/components/ui/KpiCard'
import { PageWithAI } from '@/components/layout/PageWithAI'
import Link from 'next/link'
import { ChevronRight, Plus, Trash2, Package, Clock, CheckCircle2, Archive, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react'
import { Modal, Field, inputCls, selectCls, Btn } from '@/components/ui/Modal'
import {
  getPOs, upsertPO, approvePO, genPONumero, calcPOTotaux,
  type POSync, type POItem
} from '@/lib/po-bridge'
import { getEntreprise } from '@/lib/entreprise'

function fmt(n: number) { return n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 }) }

const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon', approuve: 'Approuvé', envoye: 'Envoyé', recu: 'Reçu', ferme: 'Fermé',
}

const EMPTY_ITEM = (): POItem => ({
  id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  description: '', reference: '', quantite: 1, unite: 'unité', prixUnitaire: 0,
})

export default function BonsCommandePage() {
  const [pos, setPos] = useState<POSync[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [projetFilter, setProjetFilter] = useState('tous')
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [modalApprouver, setModalApprouver] = useState<POSync | null>(null)
  const [modalRejeter, setModalRejeter] = useState<POSync | null>(null)
  const [motifRejet, setMotifRejet] = useState('')
  const [approbateurNom, setApprobateurNom] = useState('Directeur')

  // Formulaire création PO
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    fournisseurId: '', projetId: '',
    dateLivraison: '', conditionsPaiement: 'Net 30 jours',
    adresseLivraison: '', contactReception: '',
    conditionsGenerales: '', instructionsSpeciales: '',
  })
  const [items, setItems] = useState<POItem[]>([EMPTY_ITEM()])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const load = useCallback(() => setPos(getPOs()), [])
  useEffect(() => { load() }, [load])

  function handleApprouver() {
    if (!modalApprouver) return
    approvePO(modalApprouver.id, approbateurNom)
    load(); setModalApprouver(null)
    showToast(`PO ${modalApprouver.numero} approuvé par ${approbateurNom} ✓`)
  }

  function handleRejeter() {
    if (!modalRejeter || !motifRejet.trim()) return
    upsertPO({ ...modalRejeter, statut: 'brouillon', log: [...(modalRejeter.log ?? []), { date: new Date().toISOString(), action: `Rejeté : ${motifRejet}`, par: approbateurNom }] })
    load(); setModalRejeter(null); setMotifRejet('')
    showToast(`PO ${modalRejeter.numero} renvoyé en brouillon.`)
  }

  // Pré-remplir adresse depuis entreprise
  useEffect(() => {
    const ent = getEntreprise()
    if (ent) {
      setForm(f => ({
        ...f,
        adresseLivraison: f.adresseLivraison || `${ent.adresse ?? ''}, ${ent.ville ?? ''} ${ent.province ?? ''}`.trim().replace(/^,\s*/, ''),
        conditionsGenerales: f.conditionsGenerales || (ent.politique ?? ''),
      }))
    }
  }, [modalOpen])

  const totaux = calcPOTotaux(items)
  const fournisseurSel = fournisseurs.find(f => f.id === form.fournisseurId)
  const projetSel = mockProjets.find(p => p.id === form.projetId)

  const filtered = pos.filter(po => {
    const q = search.toLowerCase()
    const matchS = !q || po.numero.toLowerCase().includes(q) || po.fournisseurNom.toLowerCase().includes(q) || po.projetTitre.toLowerCase().includes(q)
    const matchSt = statusFilter === 'tous' || po.statut === statusFilter
    const matchPr = projetFilter === 'tous' || po.projetId === projetFilter
    return matchS && matchSt && matchPr
  })

  const totalEngage = pos.filter(p => p.statut !== 'brouillon').reduce((s, p) => s + p.montantTotal, 0)
  const nbAttente = pos.filter(p => p.statut === 'brouillon').length
  const nbRecu = pos.filter(p => p.statut === 'recu').length
  const nbFerme = pos.filter(p => p.statut === 'ferme').length

  function addItem() {
    setItems(prev => [...prev, EMPTY_ITEM()])
  }
  function removeItem(id: string) {
    setItems(prev => prev.filter(it => it.id !== id))
  }
  function updateItem(id: string, field: keyof POItem, value: string | number) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it))
  }

  function resetForm() {
    setForm({ fournisseurId: '', projetId: '', dateLivraison: '', conditionsPaiement: 'Net 30 jours', adresseLivraison: '', contactReception: '', conditionsGenerales: '', instructionsSpeciales: '' })
    setItems([EMPTY_ITEM()])
    setStep(1)
  }

  function savePO(submitForApproval: boolean) {
    if (!form.fournisseurId || !form.projetId) { showToast('Veuillez sélectionner un fournisseur et un projet.'); return }
    if (items.every(it => !it.description.trim())) { showToast('Ajoutez au moins une ligne de commande.'); return }
    const { sousTotal, tps, tvq, total } = calcPOTotaux(items)
    const po: POSync = {
      id: `po-${Date.now()}`,
      numero: genPONumero(),
      projetId: form.projetId,
      projetTitre: projetSel?.titre ?? '',
      fournisseurId: form.fournisseurId,
      fournisseurNom: fournisseurSel?.nom ?? '',
      fournisseurEmail: fournisseurSel?.contacts?.[0]?.email,
      dateEmission: new Date().toISOString().slice(0, 10),
      dateLivraison: form.dateLivraison || undefined,
      montantHT: sousTotal,
      tps, tvq,
      montantTotal: total,
      montantPaye: 0,
      statut: submitForApproval ? 'approuve' : 'brouillon',
      conditionsPaiement: form.conditionsPaiement,
      adresseLivraison: form.adresseLivraison,
      contactReception: form.contactReception || undefined,
      conditionsGenerales: form.conditionsGenerales || undefined,
      instructionsSpeciales: form.instructionsSpeciales || undefined,
      items,
      paiements: [],
      log: [
        { date: new Date().toISOString(), action: 'PO créé', par: 'Utilisateur' },
        ...(submitForApproval ? [{ date: new Date().toISOString(), action: 'Soumis pour approbation', par: 'Utilisateur' }] : []),
      ],
      createdAt: new Date().toISOString(),
    }
    upsertPO(po)
    load()
    setModalOpen(false)
    resetForm()
    showToast(submitForApproval ? `${po.numero} créé et approuvé !` : `${po.numero} sauvegardé en brouillon.`)
  }

  const uniqueProjets = Array.from(new Map(pos.map(p => [p.projetId, p.projetTitre])).entries())

  return (
    <PageWithAI module="bons-commande" title="Bons de commande">
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
      <div className="space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total engagé" value={fmt(totalEngage)} icon={<Package size={18} />} />
          <KpiCard label="En attente approbation" value={String(nbAttente)} icon={<Clock size={18} />} trend="neutral" trendLabel="Brouillons" />
          <KpiCard label="Reçus — à payer" value={String(nbRecu)} icon={<CheckCircle2 size={18} />} trend={nbRecu > 0 ? 'down' : 'neutral'} trendLabel={nbRecu > 0 ? 'Action requise' : 'OK'} />
          <KpiCard label="Fermés" value={String(nbFerme)} icon={<Archive size={18} />} />
        </div>

        {/* ══ Section approbations en attente ══ */}
        {pos.filter(p => p.statut === 'brouillon').length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
              <AlertCircle size={16} className="text-amber-500" />
              Bons de commande en attente d'approbation ({pos.filter(p => p.statut === 'brouillon').length})
            </div>
            <div className="space-y-2">
              {pos.filter(p => p.statut === 'brouillon').map(po => {
                const niveau = po.montantTotal > 25000 ? { label: '🔴 DG (>25 000 $)', cls: 'bg-red-100 text-red-700' } : po.montantTotal > 5000 ? { label: '🟠 Directeur (5–25 000 $)', cls: 'bg-orange-100 text-orange-700' } : { label: '🟡 Chef département (<5 000 $)', cls: 'bg-yellow-100 text-yellow-700' }
                return (
                  <div key={po.id} className="flex items-center gap-3 bg-white rounded-lg border border-amber-100 px-4 py-3 shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-amber-700">{po.numero}</span>
                        <span className="text-slate-600 text-sm">{po.fournisseurNom}</span>
                        <span className="text-slate-400 text-xs hidden sm:inline">— {po.projetTitre}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="font-bold text-slate-800">{fmt(po.montantTotal)}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${niveau.cls}`}>{niveau.label}</span>
                        <span className="text-xs text-slate-400">{new Date(po.dateEmission).toLocaleDateString('fr-CA')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Link href={`/bons-commande/${po.id}`} className="text-xs text-slate-500 hover:underline border border-slate-200 px-2 py-1 rounded-lg">Voir</Link>
                      <button onClick={() => { setModalRejeter(po); setMotifRejet('') }} className="flex items-center gap-1 text-xs text-red-600 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-50">
                        <ThumbsDown size={12} />Rejeter
                      </button>
                      <button onClick={() => setModalApprouver(po)} className="flex items-center gap-1 text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded-lg">
                        <ThumbsUp size={12} />Approuver
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Barre actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500">{filtered.length} bon{filtered.length > 1 ? 's' : ''} de commande</div>
          <button onClick={() => { resetForm(); setModalOpen(true) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition"
            style={{ background: '#C9A84C' }}>
            <Plus size={15} /> Nouveau PO
          </button>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3">
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className={inputCls + ' max-w-xs'} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls + ' max-w-[180px]'}>
            <option value="tous">Tous statuts</option>
            {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={projetFilter} onChange={e => setProjetFilter(e.target.value)} className={selectCls + ' max-w-[260px]'}>
            <option value="tous">Tous projets</option>
            {uniqueProjets.map(([id, titre]) => <option key={id} value={id}>{titre}</option>)}
          </select>
        </div>

        {/* Table */}
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">PO #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Fournisseur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Projet</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total TTC</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Payé</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Émission</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Statut</th>
                  <th className="px-2 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((po, i) => {
                  const reliquat = po.montantTotal - po.montantPaye
                  return (
                    <tr key={po.id} className={`border-b border-slate-50 hover:bg-amber-50/30 transition ${i % 2 !== 0 ? 'bg-slate-50/30' : ''}`}>
                      <td className="px-5 py-3">
                        <Link href={`/bons-commande/${po.id}`} className="block">
                          <p className="font-semibold text-amber-600">{po.numero}</p>
                          <p className="text-xs text-slate-400">{po.items.length} article{po.items.length > 1 ? 's' : ''}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{po.fournisseurNom}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate hidden md:table-cell">{po.projetTitre}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">{fmt(po.montantTotal)}</td>
                      <td className="px-4 py-3 text-right text-xs hidden lg:table-cell">
                        <span className={reliquat > 0 && po.statut !== 'brouillon' && po.statut !== 'ferme' ? 'text-amber-600 font-semibold' : 'text-slate-400'}>
                          {fmt(po.montantPaye)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">{new Date(po.dateEmission).toLocaleDateString('fr-CA')}</td>
                      <td className="px-4 py-3"><Badge status={po.statut} /></td>
                      <td className="px-2 py-3"><Link href={`/bons-commande/${po.id}`}><ChevronRight size={16} className="text-slate-300" /></Link></td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-10 text-sm text-slate-400">Aucun bon de commande trouvé.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ══ Modal Approuver PO ══ */}
      {modalApprouver && (
        <Modal open onClose={() => setModalApprouver(null)} title={`Approuver — ${modalApprouver.numero}`} size="sm">
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
              <div className="font-semibold text-slate-800">{modalApprouver.fournisseurNom}</div>
              <div className="text-slate-500">{modalApprouver.projetTitre}</div>
              <div className="text-xl font-bold text-slate-800">{fmt(modalApprouver.montantTotal)}</div>
            </div>
            <Field label="Approbateur (votre nom)">
              <input className={inputCls} value={approbateurNom} onChange={e => setApprobateurNom(e.target.value)} placeholder="Nom de l'approbateur" />
            </Field>
            <p className="text-xs text-slate-500">En approuvant, ce PO sera enregistré comme dépense engagée dans la comptabilité.</p>
            <div className="flex justify-end gap-2">
              <Btn variant="secondary" onClick={() => setModalApprouver(null)}>Annuler</Btn>
              <Btn onClick={handleApprouver} disabled={!approbateurNom.trim()}>Confirmer l'approbation</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ Modal Rejeter PO ══ */}
      {modalRejeter && (
        <Modal open onClose={() => setModalRejeter(null)} title={`Rejeter — ${modalRejeter.numero}`} size="sm">
          <div className="space-y-4">
            <div className="bg-red-50 rounded-lg p-3 text-sm">
              <div className="font-semibold text-slate-800">{modalRejeter.fournisseurNom}</div>
              <div className="text-xl font-bold text-red-700">{fmt(modalRejeter.montantTotal)}</div>
            </div>
            <Field label="Motif du rejet (obligatoire)">
              <textarea className={inputCls + ' h-20 resize-none'} value={motifRejet} onChange={e => setMotifRejet(e.target.value)} placeholder="Expliquez la raison du rejet..." />
            </Field>
            <p className="text-xs text-slate-500">Le PO sera remis en statut brouillon pour correction.</p>
            <div className="flex justify-end gap-2">
              <Btn variant="secondary" onClick={() => setModalRejeter(null)}>Annuler</Btn>
              <Btn onClick={handleRejeter} disabled={!motifRejet.trim()}>Confirmer le rejet</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ Modal Nouveau PO ══ */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); resetForm() }} title="Nouveau bon de commande" size="lg">
        {/* Steps nav */}
        <div className="flex gap-1 mb-6">
          {['Général', 'Lignes', 'Finances', 'Conditions'].map((s, i) => (
            <button key={s} onClick={() => setStep(i + 1)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${step === i + 1 ? 'text-white' : 'text-slate-400 bg-slate-50 hover:bg-slate-100'}`}
              style={step === i + 1 ? { background: '#C9A84C' } : {}}>
              {i + 1}. {s}
            </button>
          ))}
        </div>

        {/* Step 1 — Général */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Fournisseur" required>
                <select className={selectCls} value={form.fournisseurId} onChange={e => setForm(f => ({ ...f, fournisseurId: e.target.value }))} required>
                  <option value="">Sélectionner un fournisseur</option>
                  {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </select>
              </Field>
              <Field label="Projet" required>
                <select className={selectCls} value={form.projetId} onChange={e => setForm(f => ({ ...f, projetId: e.target.value }))} required>
                  <option value="">Sélectionner un projet</option>
                  {mockProjets.map(p => <option key={p.id} value={p.id}>{p.titre}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date de livraison souhaitée">
                <input className={inputCls} type="date" value={form.dateLivraison} onChange={e => setForm(f => ({ ...f, dateLivraison: e.target.value }))} />
              </Field>
              <Field label="Conditions de paiement">
                <select className={selectCls} value={form.conditionsPaiement} onChange={e => setForm(f => ({ ...f, conditionsPaiement: e.target.value }))}>
                  <option>Net 30 jours</option>
                  <option>Net 15 jours</option>
                  <option>Net 45 jours</option>
                  <option>Net 60 jours</option>
                  <option>Comptant à la livraison</option>
                  <option>50% avance / 50% livraison</option>
                </select>
              </Field>
            </div>
            <Field label="Adresse de livraison" required>
              <input className={inputCls} value={form.adresseLivraison} onChange={e => setForm(f => ({ ...f, adresseLivraison: e.target.value }))} placeholder="123 rue du Chantier, Gatineau QC" />
            </Field>
            <Field label="Contact pour la réception">
              <input className={inputCls} value={form.contactReception} onChange={e => setForm(f => ({ ...f, contactReception: e.target.value }))} placeholder="Nom et téléphone du responsable réception" />
            </Field>
            {fournisseurSel && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 space-y-0.5">
                <p className="font-semibold">{fournisseurSel.nom}</p>
                <p>{fournisseurSel.adresse}</p>
                {fournisseurSel.contacts?.[0] && <p>{fournisseurSel.contacts[0].nom} · {fournisseurSel.contacts[0].email}</p>}
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Lignes */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Description</th>
                    <th className="text-left px-2 py-2 text-xs font-semibold text-slate-500">Réf.</th>
                    <th className="text-right px-2 py-2 text-xs font-semibold text-slate-500">Qté</th>
                    <th className="text-left px-2 py-2 text-xs font-semibold text-slate-500">Unité</th>
                    <th className="text-right px-2 py-2 text-xs font-semibold text-slate-500">Prix unit.</th>
                    <th className="text-right px-2 py-2 text-xs font-semibold text-slate-500">Sous-total</th>
                    <th className="px-1 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => (
                    <tr key={it.id} className="border-b border-slate-50">
                      <td className="px-1 py-1.5">
                        <input className={inputCls + ' text-xs'} placeholder="Description du produit/service" value={it.description}
                          onChange={e => updateItem(it.id, 'description', e.target.value)} />
                      </td>
                      <td className="px-1 py-1.5 w-20">
                        <input className={inputCls + ' text-xs'} placeholder="Réf." value={it.reference ?? ''}
                          onChange={e => updateItem(it.id, 'reference', e.target.value)} />
                      </td>
                      <td className="px-1 py-1.5 w-20">
                        <input className={inputCls + ' text-xs text-right'} type="number" min="0" step="0.01" value={it.quantite}
                          onChange={e => updateItem(it.id, 'quantite', parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="px-1 py-1.5 w-24">
                        <select className={selectCls + ' text-xs'} value={it.unite}
                          onChange={e => updateItem(it.id, 'unite', e.target.value)}>
                          {['unité', 'heure', 'jour', 'semaine', 'm', 'm²', 'm³', 'kg', 't', 'forfait', 'lot'].map(u => <option key={u}>{u}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1.5 w-28">
                        <input className={inputCls + ' text-xs text-right'} type="number" min="0" step="0.01" value={it.prixUnitaire}
                          onChange={e => updateItem(it.id, 'prixUnitaire', parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="px-2 py-1.5 text-right text-xs font-semibold text-slate-700 w-28 whitespace-nowrap">
                        {fmt(it.quantite * it.prixUnitaire)}
                      </td>
                      <td className="px-1 py-1.5 w-8">
                        {items.length > 1 && (
                          <button onClick={() => removeItem(it.id)} className="text-red-400 hover:text-red-600 transition p-0.5">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addItem} className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-semibold py-1 px-2 rounded-lg hover:bg-amber-50 transition">
              <Plus size={13} /> Ajouter une ligne
            </button>
          </div>
        )}

        {/* Step 3 — Finances */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Résumé financier</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Sous-total HT</span><span className="font-semibold text-slate-700">{fmt(totaux.sousTotal)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">TPS (5%)</span><span className="text-slate-600">{fmt(totaux.tps)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">TVQ (9.975%)</span><span className="text-slate-600">{fmt(totaux.tvq)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="font-bold text-slate-800">Total TTC</span>
                  <span className="font-extrabold text-lg text-slate-900">{fmt(totaux.total)}</span>
                </div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-700">
              <p className="font-semibold mb-1">Info</p>
              <p>Les taux TPS/TVQ sont ceux configurés dans le profil entreprise. Ce montant sera enregistré comme dépense engagée dans la comptabilité dès l'approbation.</p>
            </div>
            <div className="space-y-1 text-xs text-slate-500">
              {items.filter(it => it.description).map(it => (
                <div key={it.id} className="flex justify-between py-1 border-b border-slate-50">
                  <span>{it.description} ({it.quantite} {it.unite})</span>
                  <span className="font-medium text-slate-700">{fmt(it.quantite * it.prixUnitaire)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4 — Conditions */}
        {step === 4 && (
          <div className="space-y-4">
            <Field label="Conditions générales">
              <textarea className={inputCls} rows={4} value={form.conditionsGenerales}
                onChange={e => setForm(f => ({ ...f, conditionsGenerales: e.target.value }))}
                placeholder="Travaux conformes aux plans et devis. Photos exigées après réalisation..." />
            </Field>
            <Field label="Instructions spéciales">
              <textarea className={inputCls} rows={3} value={form.instructionsSpeciales}
                onChange={e => setForm(f => ({ ...f, instructionsSpeciales: e.target.value }))}
                placeholder="Exigences particulières, normes, certifications requises..." />
            </Field>
          </div>
        )}

        {/* Navigation + actions */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
          <div className="flex gap-2">
            {step > 1 && <Btn variant="secondary" type="button" onClick={() => setStep(s => s - 1)}>← Précédent</Btn>}
          </div>
          <div className="flex gap-2">
            {step < 4 && <Btn type="button" onClick={() => setStep(s => s + 1)}>Suivant →</Btn>}
            {step === 4 && (
              <>
                <Btn variant="secondary" type="button" onClick={() => savePO(false)}>Sauvegarder brouillon</Btn>
                <Btn type="button" onClick={() => savePO(true)}>Soumettre & Approuver</Btn>
              </>
            )}
          </div>
        </div>
      </Modal>
    </PageWithAI>
  )
}
