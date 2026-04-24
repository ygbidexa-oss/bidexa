'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal, Field, inputCls, selectCls, Btn } from '@/components/ui/Modal'
import { PageWithAI } from '@/components/layout/PageWithAI'
import {
  getPOById, upsertPO, approvePO, sendPO, receivePO, addPOPaiement, closePO,
  calcPOTotaux, type POSync, type POItem
} from '@/lib/po-bridge'
import { getEntreprise } from '@/lib/entreprise'
import {
  ArrowLeft, CheckCircle, Package, Building2, FileText, Plus, Trash2,
  Send, CreditCard, Lock, ClipboardCheck, Clock, ChevronRight, Pencil
} from 'lucide-react'
import { DocumentsSection } from '@/components/documents/DocumentsSection'

const STATUT_FLOW = ['brouillon', 'approuve', 'envoye', 'recu', 'ferme'] as const
type Statut = typeof STATUT_FLOW[number]

function fmt(n: number) {
  return n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 })
}

export default function BonCommandeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [po, setPo] = useState<POSync | null>(null)
  const [toast, setToast] = useState('')

  // Modals
  const [modalApprouver, setModalApprouver] = useState(false)
  const [modalPaiement, setModalPaiement] = useState(false)
  const [modalCloture, setModalCloture] = useState(false)
  const [modalModifier, setModalModifier] = useState(false)

  // Form approbation
  const [approbateur, setApprobateur] = useState('')
  const [approNote, setApproNote] = useState('')

  // Form paiement
  const [payMontant, setPayMontant] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10))
  const [payMethode, setPayMethode] = useState('virement')
  const [payRef, setPayRef] = useState('')
  const [payNote, setPayNote] = useState('')

  // Form modifier
  const [editItems, setEditItems] = useState<POItem[]>([])
  const [editForm, setEditForm] = useState({ dateLivraison: '', conditionsPaiement: '', adresseLivraison: '', contactReception: '', conditionsGenerales: '', instructionsSpeciales: '' })

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const load = useCallback(() => { const p = getPOById(id); setPo(p ?? null) }, [id])
  useEffect(() => { load() }, [load])

  if (!po) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      <div className="text-center">
        <p className="text-lg font-semibold mb-2">Bon de commande introuvable</p>
        <Link href="/bons-commande" className="text-sm text-amber-600 hover:underline">← Retour à la liste</Link>
      </div>
    </div>
  )

  const entreprise = getEntreprise()
  const totaux = calcPOTotaux(po.items)
  const reliquat = +(po.montantTotal - po.montantPaye).toFixed(2)
  const currentIdx = STATUT_FLOW.indexOf(po.statut as Statut)

  /* ── Actions ── */
  function handleApprouver(e: React.FormEvent) {
    e.preventDefault()
    if (!approbateur.trim()) return
    approvePO(po!.id, approbateur, approNote)
    load()
    setModalApprouver(false)
    showToast('PO approuvé et transmis à la comptabilité.')
  }

  function handleSend() {
    sendPO(po!.id, 'Utilisateur')
    load()
    showToast('PO marqué comme envoyé au fournisseur.')
  }

  function handleReceive() {
    receivePO(po!.id, 'Utilisateur')
    load()
    showToast('Réception confirmée.')
  }

  function handlePaiement(e: React.FormEvent) {
    e.preventDefault()
    const montant = parseFloat(payMontant)
    if (!montant || montant <= 0) return
    addPOPaiement(po!.id, { date: payDate, montant, methode: payMethode, reference: payRef, note: payNote })
    load()
    setModalPaiement(false)
    setPayMontant(''); setPayRef(''); setPayNote('')
    showToast('Paiement enregistré.')
  }

  function handleCloture() {
    closePO(po!.id, 'Utilisateur')
    load()
    setModalCloture(false)
    showToast('PO clôturé. Reliquat libéré dans le projet.')
  }

  function openModifier() {
    setEditItems(po!.items.map(it => ({ ...it })))
    setEditForm({
      dateLivraison: po!.dateLivraison ?? '',
      conditionsPaiement: po!.conditionsPaiement,
      adresseLivraison: po!.adresseLivraison,
      contactReception: po!.contactReception ?? '',
      conditionsGenerales: po!.conditionsGenerales ?? '',
      instructionsSpeciales: po!.instructionsSpeciales ?? '',
    })
    setModalModifier(true)
  }

  function handleSaveModif(e: React.FormEvent) {
    e.preventDefault()
    const { sousTotal, tps, tvq, total } = calcPOTotaux(editItems)
    upsertPO({
      ...po!,
      items: editItems,
      montantHT: sousTotal, tps, tvq, montantTotal: total,
      dateLivraison: editForm.dateLivraison || undefined,
      conditionsPaiement: editForm.conditionsPaiement,
      adresseLivraison: editForm.adresseLivraison,
      contactReception: editForm.contactReception || undefined,
      conditionsGenerales: editForm.conditionsGenerales || undefined,
      instructionsSpeciales: editForm.instructionsSpeciales || undefined,
    })
    load()
    setModalModifier(false)
    showToast('PO mis à jour.')
  }

  function updateEditItem(id: string, field: keyof POItem, value: string | number) {
    setEditItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it))
  }
  function addEditItem() {
    setEditItems(prev => [...prev, { id: `item-${Date.now()}`, description: '', reference: '', quantite: 1, unite: 'unité', prixUnitaire: 0 }])
  }

  return (
    <PageWithAI module="bons-commande" title="Bon de commande">
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="space-y-5 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition">
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-slate-800">{po.numero}</h1>
                <Badge status={po.statut} />
              </div>
              <p className="text-sm text-slate-400 mt-0.5">{po.fournisseurNom} · {po.projetTitre}</p>
            </div>
          </div>
          {/* Boutons d'action selon statut */}
          <div className="flex flex-wrap gap-2">
            {po.statut === 'brouillon' && (
              <>
                <button onClick={openModifier} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                  <Pencil size={14} /> Modifier
                </button>
                <button onClick={() => setModalApprouver(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition"
                  style={{ background: '#C9A84C' }}>
                  <ClipboardCheck size={15} /> Soumettre pour approbation
                </button>
              </>
            )}
            {po.statut === 'approuve' && (
              <button onClick={handleSend}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition"
                style={{ background: '#C9A84C' }}>
                <Send size={15} /> Marquer envoyé au fournisseur
              </button>
            )}
            {po.statut === 'envoye' && (
              <button onClick={handleReceive}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition"
                style={{ background: '#C9A84C' }}>
                <Package size={15} /> Confirmer réception
              </button>
            )}
            {po.statut === 'recu' && (
              <>
                <button onClick={() => setModalCloture(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                  <Lock size={14} /> Clôturer
                </button>
                <button onClick={() => setModalPaiement(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition"
                  style={{ background: '#C9A84C' }}>
                  <CreditCard size={15} /> Enregistrer paiement
                </button>
              </>
            )}
          </div>
        </div>

        {/* Timeline */}
        <Card>
          <div className="flex items-center">
            {STATUT_FLOW.map((s, i) => {
              const done = i <= currentIdx
              return (
                <div key={s} className="flex items-center flex-1 min-w-0">
                  <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg transition whitespace-nowrap ${done ? 'text-white' : 'text-slate-400 bg-slate-50'}`}
                    style={done ? { background: '#0D1B2A' } : {}}>
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${done ? 'bg-amber-400' : 'bg-slate-300'}`} />
                    <span className="capitalize">{s}</span>
                  </div>
                  {i < STATUT_FLOW.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${i < currentIdx ? 'bg-amber-400' : 'bg-slate-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        {/* Parties impliquées */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Acheteur */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Building2 size={14} /> Entreprise acheteuse</h3>
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-slate-800">{entreprise?.nom ?? 'Mon entreprise'}</p>
              {entreprise?.adresse && <p className="text-slate-500">{entreprise.adresse}, {entreprise.ville}</p>}
              {entreprise?.noTPS && <p className="text-xs text-slate-400">TPS : {entreprise.noTPS}</p>}
              {entreprise?.noTVQ && <p className="text-xs text-slate-400">TVQ : {entreprise.noTVQ}</p>}
            </div>
          </Card>
          {/* Fournisseur */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Package size={14} /> Fournisseur</h3>
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-slate-800">{po.fournisseurNom}</p>
              {po.fournisseurEmail && <p className="text-slate-500">{po.fournisseurEmail}</p>}
              <p className="text-xs text-slate-400 mt-1">Projet lié :
                <Link href={`/projets/${po.projetId}`} className="ml-1 text-amber-600 hover:underline font-semibold">{po.projetTitre}</Link>
              </p>
            </div>
          </Card>
        </div>

        {/* Informations générales */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><FileText size={14} /> Informations générales</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-slate-400 mb-0.5">Date émission</p><p className="font-semibold text-slate-700">{new Date(po.dateEmission).toLocaleDateString('fr-CA')}</p></div>
            {po.dateLivraison && <div><p className="text-xs text-slate-400 mb-0.5">Livraison souhaitée</p><p className="font-semibold text-slate-700">{new Date(po.dateLivraison).toLocaleDateString('fr-CA')}</p></div>}
            <div><p className="text-xs text-slate-400 mb-0.5">Conditions paiement</p><p className="font-semibold text-slate-700">{po.conditionsPaiement}</p></div>
            {po.approbateur && <div><p className="text-xs text-slate-400 mb-0.5">Approuvé par</p><p className="font-semibold text-slate-700">{po.approbateur}</p></div>}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-slate-400 mb-0.5">Adresse de livraison</p><p className="text-slate-600">{po.adresseLivraison}</p></div>
            {po.contactReception && <div><p className="text-xs text-slate-400 mb-0.5">Contact réception</p><p className="text-slate-600">{po.contactReception}</p></div>}
          </div>
        </Card>

        {/* Lignes de commande */}
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Package size={15} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">Lignes de commande</h3>
            <span className="ml-auto text-xs text-slate-400">{po.items.length} article(s)</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">Description</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">Référence</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">Qté</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">Unité</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">Prix unit.</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">Sous-total</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((item, i) => (
                <tr key={item.id} className={`border-b border-slate-50 ${i % 2 !== 0 ? 'bg-slate-50/30' : ''}`}>
                  <td className="px-5 py-3 text-slate-700">{item.description}</td>
                  <td className="px-3 py-3 text-xs text-slate-400 hidden md:table-cell">{item.reference || '—'}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{item.quantite.toLocaleString('fr-CA')}</td>
                  <td className="px-3 py-3 text-xs text-slate-500">{item.unite}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{fmt(item.prixUnitaire)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-800">{fmt(item.quantite * item.prixUnitaire)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-100 bg-slate-50">
                <td colSpan={5} className="px-5 py-2.5 text-xs text-right text-slate-500">Sous-total HT</td>
                <td className="px-5 py-2.5 text-right font-semibold text-slate-700">{fmt(totaux.sousTotal)}</td>
              </tr>
              <tr className="bg-slate-50">
                <td colSpan={5} className="px-5 py-2 text-xs text-right text-slate-400">TPS</td>
                <td className="px-5 py-2 text-right text-xs text-slate-500">{fmt(totaux.tps)}</td>
              </tr>
              <tr className="bg-slate-50">
                <td colSpan={5} className="px-5 py-2 text-xs text-right text-slate-400">TVQ</td>
                <td className="px-5 py-2 text-right text-xs text-slate-500">{fmt(totaux.tvq)}</td>
              </tr>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={5} className="px-5 py-3 text-sm font-bold text-slate-700 text-right">Total TTC</td>
                <td className="px-5 py-3 text-right font-extrabold text-slate-900 text-base">{fmt(po.montantTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </Card>

        {/* Résumé financier */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <p className="text-xs text-slate-400 mb-1">Total TTC</p>
            <p className="text-2xl font-extrabold text-slate-900">{fmt(po.montantTotal)}</p>
          </Card>
          <Card>
            <p className="text-xs text-slate-400 mb-1">Payé à ce jour</p>
            <p className="text-2xl font-extrabold text-emerald-600">{fmt(po.montantPaye)}</p>
          </Card>
          <Card>
            <p className="text-xs text-slate-400 mb-1">Reliquat</p>
            <p className={`text-2xl font-extrabold ${reliquat > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{fmt(reliquat)}</p>
            {po.statut === 'ferme' && reliquat > 0 && (
              <p className="text-xs text-emerald-600 mt-1 font-medium">Libéré dans le projet</p>
            )}
          </Card>
        </div>

        {/* Historique paiements */}
        {po.paiements.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><CreditCard size={14} /> Paiements enregistrés</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Date</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Montant</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Méthode</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 hidden md:table-cell">Référence</th>
                </tr>
              </thead>
              <tbody>
                {po.paiements.map(p => (
                  <tr key={p.id} className="border-b border-slate-50">
                    <td className="px-4 py-2 text-slate-600">{new Date(p.date).toLocaleDateString('fr-CA')}</td>
                    <td className="px-4 py-2 text-right font-semibold text-emerald-600">{fmt(p.montant)}</td>
                    <td className="px-4 py-2 text-slate-500">{p.methode}</td>
                    <td className="px-4 py-2 text-xs text-slate-400 hidden md:table-cell">{p.reference || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Conditions générales */}
        {po.conditionsGenerales && (
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Conditions générales</h3>
            <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-wrap">{po.conditionsGenerales}</p>
          </Card>
        )}

        {/* Historique actions */}
        {po.log.length > 0 && (
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Clock size={14} /> Historique</h3>
            <div className="space-y-2">
              {[...po.log].reverse().map((entry, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-700 font-medium">{entry.action}</p>
                    {entry.par && <p className="text-xs text-slate-400">{entry.par}{entry.note ? ` · ${entry.note}` : ''}</p>}
                  </div>
                  <p className="text-xs text-slate-400 shrink-0">{new Date(entry.date).toLocaleDateString('fr-CA')}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Pièces jointes */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><FileText size={14} /> Pièces jointes</h3>
          <DocumentsSection lienType="po" refId={po.id} refLabel={po.numero} />
        </Card>
      </div>

      {/* ══ Modal Approbation ══ */}
      <Modal open={modalApprouver} onClose={() => setModalApprouver(false)} title="Approuver le bon de commande" size="md">
        <form onSubmit={handleApprouver} className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">PO</span><span className="font-semibold">{po.numero}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Fournisseur</span><span className="font-semibold">{po.fournisseurNom}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-2"><span className="text-slate-700 font-bold">Total TTC</span><span className="font-extrabold text-slate-900">{fmt(po.montantTotal)}</span></div>
          </div>
          <Field label="Nom de l'approbateur" required>
            <input className={inputCls} value={approbateur} onChange={e => setApprobateur(e.target.value)} placeholder="Votre nom complet" required />
          </Field>
          <Field label="Commentaire (optionnel)">
            <textarea className={inputCls} rows={2} value={approNote} onChange={e => setApproNote(e.target.value)} placeholder="Conditions particulières..." />
          </Field>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
            L'approbation rendra ce PO visible dans la comptabilité comme dépense engagée.
          </div>
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" type="button" onClick={() => setModalApprouver(false)}>Annuler</Btn>
            <Btn type="submit">Approuver le PO</Btn>
          </div>
        </form>
      </Modal>

      {/* ══ Modal Paiement fournisseur ══ */}
      <Modal open={modalPaiement} onClose={() => setModalPaiement(false)} title="Enregistrer un paiement fournisseur" size="md">
        <form onSubmit={handlePaiement} className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Montant total TTC</span><span className="font-semibold">{fmt(po.montantTotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Déjà payé</span><span className="font-semibold text-emerald-600">{fmt(po.montantPaye)}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-1"><span className="text-slate-700 font-bold">Reliquat</span><span className="font-bold text-amber-600">{fmt(reliquat)}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Montant payé ($)" required>
              <input className={inputCls} type="number" step="0.01" min="0.01" max={reliquat} value={payMontant}
                onChange={e => setPayMontant(e.target.value)} placeholder="0.00" required />
            </Field>
            <Field label="Date du paiement" required>
              <input className={inputCls} type="date" value={payDate} onChange={e => setPayDate(e.target.value)} required />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Méthode de paiement">
              <select className={selectCls} value={payMethode} onChange={e => setPayMethode(e.target.value)}>
                <option value="virement">Virement bancaire</option>
                <option value="cheque">Chèque</option>
                <option value="carte">Carte de crédit</option>
                <option value="especes">Espèces</option>
              </select>
            </Field>
            <Field label="Référence">
              <input className={inputCls} value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="N° transaction..." />
            </Field>
          </div>
          <Field label="Note">
            <input className={inputCls} value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Note facultative..." />
          </Field>
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" type="button" onClick={() => setModalPaiement(false)}>Annuler</Btn>
            <Btn type="submit">Enregistrer</Btn>
          </div>
        </form>
      </Modal>

      {/* ══ Modal Clôture ══ */}
      <Modal open={modalCloture} onClose={() => setModalCloture(false)} title="Clôturer le bon de commande" size="md">
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Montant total TTC</span><span className="font-semibold">{fmt(po.montantTotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Total payé</span><span className="font-semibold text-emerald-600">{fmt(po.montantPaye)}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <span className="font-bold text-slate-700">Reliquat à libérer</span>
              <span className={`font-extrabold text-base ${reliquat > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{fmt(reliquat)}</span>
            </div>
          </div>
          {reliquat > 0 ? (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
              Le reliquat de <strong>{fmt(reliquat)}</strong> sera libéré et réinjecté dans le budget disponible du projet <strong>{po.projetTitre}</strong>.
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-700">
              PO soldé intégralement. Aucun reliquat à libérer.
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" type="button" onClick={() => setModalCloture(false)}>Annuler</Btn>
            <Btn type="button" onClick={handleCloture}>Confirmer la clôture</Btn>
          </div>
        </div>
      </Modal>

      {/* ══ Modal Modifier ══ */}
      <Modal open={modalModifier} onClose={() => setModalModifier(false)} title={`Modifier — ${po.numero}`} size="lg">
        <form onSubmit={handleSaveModif} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date livraison">
              <input className={inputCls} type="date" value={editForm.dateLivraison} onChange={e => setEditForm(f => ({ ...f, dateLivraison: e.target.value }))} />
            </Field>
            <Field label="Conditions paiement">
              <select className={selectCls} value={editForm.conditionsPaiement} onChange={e => setEditForm(f => ({ ...f, conditionsPaiement: e.target.value }))}>
                {['Net 30 jours', 'Net 15 jours', 'Net 45 jours', 'Net 60 jours', 'Comptant à la livraison', '50% avance / 50% livraison'].map(v => <option key={v}>{v}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Adresse livraison">
            <input className={inputCls} value={editForm.adresseLivraison} onChange={e => setEditForm(f => ({ ...f, adresseLivraison: e.target.value }))} />
          </Field>
          {/* Lignes */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-2 py-2 font-semibold text-slate-500">Description</th>
                <th className="text-right px-2 py-2 font-semibold text-slate-500">Qté</th>
                <th className="text-left px-2 py-2 font-semibold text-slate-500">Unité</th>
                <th className="text-right px-2 py-2 font-semibold text-slate-500">Prix unit.</th>
                <th className="text-right px-2 py-2 font-semibold text-slate-500">S-Total</th>
                <th></th>
              </tr></thead>
              <tbody>
                {editItems.map(it => (
                  <tr key={it.id} className="border-b border-slate-50">
                    <td className="px-1 py-1"><input className={inputCls + ' text-xs'} value={it.description} onChange={e => updateEditItem(it.id, 'description', e.target.value)} /></td>
                    <td className="px-1 py-1 w-20"><input className={inputCls + ' text-xs text-right'} type="number" min="0" step="0.01" value={it.quantite} onChange={e => updateEditItem(it.id, 'quantite', parseFloat(e.target.value) || 0)} /></td>
                    <td className="px-1 py-1 w-20">
                      <select className={selectCls + ' text-xs'} value={it.unite} onChange={e => updateEditItem(it.id, 'unite', e.target.value)}>
                        {['unité', 'heure', 'jour', 'semaine', 'm', 'm²', 'm³', 'kg', 't', 'forfait', 'lot'].map(u => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-1 w-24"><input className={inputCls + ' text-xs text-right'} type="number" min="0" step="0.01" value={it.prixUnitaire} onChange={e => updateEditItem(it.id, 'prixUnitaire', parseFloat(e.target.value) || 0)} /></td>
                    <td className="px-2 py-1 text-right font-semibold text-slate-700 whitespace-nowrap">{fmt(it.quantite * it.prixUnitaire)}</td>
                    <td className="px-1 py-1">
                      {editItems.length > 1 && <button type="button" onClick={() => setEditItems(prev => prev.filter(x => x.id !== it.id))} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addEditItem} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-semibold py-1 px-2 rounded hover:bg-amber-50 transition">
            <Plus size={12} /> Ajouter une ligne
          </button>
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" type="button" onClick={() => setModalModifier(false)}>Annuler</Btn>
            <Btn type="submit">Sauvegarder</Btn>
          </div>
        </form>
      </Modal>
    </PageWithAI>
  )
}
