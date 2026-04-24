'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  getComptesPlan, upsertComptePlan, soldeDuCompte, getEcritures, upsertEcriture, validerEcriture,
  getDepensesDirectes, upsertDepense, soumettrePourApprobation, approuverDepense, rejeterDepense,
  getApprobations, genererEcritureFactureClient, genererEcriturePaiementClient,
  niveauApprobation, libelleNiveau,
  type CompteComptable, type EcritureComptable, type LigneEcriture,
  type DepenseDirecte, type DemandeApprobation,
} from '@/lib/comptabilite-store'
import { getFacturesSync, upsertFactureSync, markFacturePaid, updateFactureSyncStatut, type FactureSync } from '@/lib/factures-bridge'
import { getPOs, addPOPaiement, approvePO, upsertPO, type POSync } from '@/lib/po-bridge'
import { calculerTaxes, getEntreprise } from '@/lib/entreprise'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { KpiCard } from '@/components/ui/KpiCard'
import { Modal, Field, inputCls, selectCls, Btn } from '@/components/ui/Modal'
import { PageWithAI } from '@/components/layout/PageWithAI'
import {
  DollarSign, TrendingUp, CreditCard, AlertCircle, Plus, Pencil,
  CheckCircle2, XCircle, ChevronDown, ChevronRight, Download,
  ThumbsUp, ThumbsDown, BarChart2, Send, Clock, RefreshCw,
} from 'lucide-react'

// ── Formatters ────────────────────────────────────────────────────────────────
function fmt(n: number) { return n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 }) }
function fmtDate(s: string) { return s ? new Date(s + 'T12:00:00').toLocaleDateString('fr-CA') : '—' }
function today() { return new Date().toISOString().slice(0, 10) }
function uid() { return `x${Date.now()}${Math.random().toString(36).slice(2, 6)}` }
function joursRetard(echeance: string) {
  const diff = Math.floor((new Date().getTime() - new Date(echeance).getTime()) / 86400000)
  return diff
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = ['Tableau de bord','Factures clients','Cptes fournisseurs','Journal écritures','Grand livre','Plan comptable','Approbations','États financiers'] as const
type Tab = typeof TABS[number]

// ── Badge helpers ─────────────────────────────────────────────────────────────
function statutBadgeFac(s: FactureSync['statut'], echeance?: string) {
  if (s === 'payee') return <Badge status="payee" />
  if (s === 'en_retard') { const j = echeance ? joursRetard(echeance) : 0; return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">{j > 0 ? `${j}j retard` : 'En retard'}</span> }
  if (s === 'envoyee') return <Badge status="envoyee" />
  return <Badge status="brouillon" />
}
function badgeNiveau(n: 1 | 2 | 3) {
  if (n === 3) return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">🔴 DG</span>
  if (n === 2) return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">🟠 Directeur</span>
  return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">🟡 Chef</span>
}

export default function ComptabilitePage() {
  const [tab, setTab] = useState<Tab>('Tableau de bord')

  // Data states
  const [factures, setFactures] = useState<FactureSync[]>([])
  const [pos, setPOs] = useState<POSync[]>([])
  const [depenses, setDepenses] = useState<DepenseDirecte[]>([])
  const [approbations, setApprobations] = useState<DemandeApprobation[]>([])
  const [ecritures, setEcritures] = useState<EcritureComptable[]>([])
  const [comptes, setComptes] = useState<CompteComptable[]>([])

  const reload = useCallback(() => {
    setFactures(getFacturesSync())
    setPOs(getPOs())
    setDepenses(getDepensesDirectes())
    setApprobations(getApprobations())
    setEcritures(getEcritures())
    setComptes(getComptesPlan())
  }, [])

  useEffect(() => { reload() }, [reload])

  return (
    <PageWithAI module="Comptabilité">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Comptabilité</h1>
            <p className="text-sm text-slate-500 mt-0.5">Plan comptable PCGQ · Journal des écritures · États financiers</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 flex-wrap border-b border-slate-200 pb-0">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-medium rounded-t-md transition-colors ${tab === t ? 'bg-white border border-b-white border-slate-200 text-indigo-600 -mb-px' : 'text-slate-500 hover:text-slate-700'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="min-h-[400px]">
          {tab === 'Tableau de bord' && <DashboardTab factures={factures} pos={pos} depenses={depenses} approbations={approbations} ecritures={ecritures} />}
          {tab === 'Factures clients' && <FacturesTab factures={factures} reload={reload} />}
          {tab === 'Cptes fournisseurs' && <FournisseursTab pos={pos} depenses={depenses} comptes={comptes} reload={reload} />}
          {tab === 'Journal écritures' && <JournalTab ecritures={ecritures} comptes={comptes} reload={reload} />}
          {tab === 'Grand livre' && <GrandLivreTab ecritures={ecritures} comptes={comptes} />}
          {tab === 'Plan comptable' && <PlanComptableTab comptes={comptes} reload={reload} />}
          {tab === 'Approbations' && <ApprobationsTab approbations={approbations} pos={pos} reload={reload} />}
          {tab === 'États financiers' && <EtatsFinanciersTab factures={factures} pos={pos} depenses={depenses} ecritures={ecritures} comptes={comptes} />}
        </div>
      </div>
    </PageWithAI>
  )
}

// ══════════════════════════════════════════════════════
// TAB 1 — TABLEAU DE BORD
// ══════════════════════════════════════════════════════
function DashboardTab({ factures, pos, depenses, approbations, ecritures }: {
  factures: FactureSync[], pos: POSync[], depenses: DepenseDirecte[],
  approbations: DemandeApprobation[], ecritures: EcritureComptable[]
}) {
  const ar = factures.filter(f => f.statut !== 'payee').reduce((s, f) => s + f.montantTotal, 0)
  const encaisse = factures.filter(f => f.statut === 'payee').reduce((s, f) => s + f.montantTotal, 0)
  const retard = factures.filter(f => f.statut === 'en_retard')
  const ap = pos.filter(p => ['approuve','envoye','recu'].includes(p.statut)).reduce((s, p) => s + (p.montantTotal - p.montantPaye), 0)
  const depTotal = depenses.filter(d => ['approuve','paye'].includes(d.statut)).reduce((s, d) => s + d.montantTotal, 0)
  const attentes = approbations.filter(a => a.statut === 'en_attente')
  const montantAttente = attentes.reduce((s, a) => s + a.montant, 0)

  const revenus = ecritures.filter(e => e.statut === 'valide' && e.type === 'facture_client').reduce((s, e) => {
    return s + e.lignes.filter(l => l.compteCode.startsWith('4')).reduce((a, l) => a + l.credit, 0)
  }, 0)
  const chargesEcritures = ecritures.filter(e => e.statut === 'valide' && ['depense','facture_fournisseur'].includes(e.type)).reduce((s, e) => {
    return s + e.lignes.filter(l => ['5','6','7'].some(p => l.compteCode.startsWith(p))).reduce((a, l) => a + l.debit, 0)
  }, 0)
  const resultat = revenus - chargesEcritures

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Comptes à recevoir" value={fmt(ar)} trend="neutral" />
        <KpiCard label="Encaissé" value={fmt(encaisse)} trend="up" trendLabel="Payées" />
        <KpiCard label="Comptes à payer" value={fmt(ap)} trend="neutral" />
        <KpiCard label="Dépenses engagées" value={fmt(depTotal)} trend="neutral" />
        <KpiCard label="Approbations" value={String(attentes.length)} trend={attentes.length > 0 ? 'down' : 'up'} trendLabel={fmt(montantAttente)} />
        <KpiCard label="Résultat net" value={fmt(resultat)} trend={resultat >= 0 ? 'up' : 'down'} trendLabel={resultat >= 0 ? 'Bénéfice' : 'Perte'} />
      </div>

      {/* Alertes */}
      {(retard.length > 0 || attentes.length > 0) && (
        <Card>
          <div className="p-4 space-y-2">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-500" />Alertes</h3>
            {retard.map(f => (
              <div key={f.id} className="flex items-center gap-2 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-md">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                Facture <strong>{f.numero}</strong> — {f.clientNom} en retard de {joursRetard(f.date)} jours ({fmt(f.montantTotal)})
              </div>
            ))}
            {attentes.slice(0, 3).map(a => (
              <div key={a.id} className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-md">
                <Clock className="w-4 h-4 flex-shrink-0" />
                Approbation niveau {a.niveauApprobation} en attente : <strong>{a.description}</strong> ({fmt(a.montant)})
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Résumé écritures récentes */}
      <Card>
        <div className="p-4">
          <h3 className="font-semibold text-slate-800 mb-3">Écritures récentes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 border-b">{['Date','N°','Description','Type','Débit','Crédit'].map(h => <th key={h} className="pb-2 pr-4 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {ecritures.slice(-8).reverse().map(e => {
                  const debit = e.lignes.reduce((s, l) => s + l.debit, 0)
                  const credit = e.lignes.reduce((s, l) => s + l.credit, 0)
                  return (
                    <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 pr-4">{fmtDate(e.date)}</td>
                      <td className="py-2 pr-4 font-mono text-xs text-slate-600">{e.numero}</td>
                      <td className="py-2 pr-4 max-w-[200px] truncate">{e.description}</td>
                      <td className="py-2 pr-4"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{e.type.replace(/_/g,' ')}</span></td>
                      <td className="py-2 pr-4 text-right">{fmt(debit)}</td>
                      <td className="py-2 text-right">{fmt(credit)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// TAB 2 — FACTURES CLIENTS
// ══════════════════════════════════════════════════════
function FacturesTab({ factures, reload }: { factures: FactureSync[], reload: () => void }) {
  const [showCreate, setShowCreate] = useState(false)
  const [showPaiement, setShowPaiement] = useState<FactureSync | null>(null)
  const [form, setForm] = useState({ clientNom: '', projetTitre: '', description: '', montantHT: '', date: today(), echeance: '', conditions: 'Net 30' })
  const ent = typeof window !== 'undefined' ? getEntreprise() : null
  const taxes = form.montantHT ? calculerTaxes(parseFloat(form.montantHT) || 0) : { tps: 0, tvq: 0, total: 0 }

  const totalHT = factures.reduce((s, f) => s + f.montantHT, 0)
  const totalTPS = factures.reduce((s, f) => s + f.tps, 0)
  const totalTVQ = factures.reduce((s, f) => s + f.tvq, 0)
  const totalTTC = factures.reduce((s, f) => s + f.montantTotal, 0)
  const totalPaye = factures.filter(f => f.statut === 'payee').reduce((s, f) => s + f.montantTotal, 0)
  const totalAR = totalTTC - totalPaye

  function creerFacture() {
    const ht = parseFloat(form.montantHT) || 0
    const { tps, tvq, total } = calculerTaxes(ht)
    const numero = `FAC-${new Date().getFullYear()}-${String(factures.length + 1).padStart(3, '0')}`
    const f: FactureSync = {
      id: uid(), projetId: '', projetNumero: '', projetTitre: form.projetTitre,
      clientNom: form.clientNom, numero, date: form.date,
      description: form.description, montantHT: ht, tps, tvq, montantTotal: total,
      pctContrat: 100, pctAvancement: 100, statut: 'brouillon', notes: form.conditions,
    }
    upsertFactureSync(f)
    genererEcritureFactureClient(f.id, f.numero, f.description, ht, tps, tvq, total, f.date)
    reload(); setShowCreate(false)
    setForm({ clientNom: '', projetTitre: '', description: '', montantHT: '', date: today(), echeance: '', conditions: 'Net 30' })
  }

  function marquerEnvoye(f: FactureSync) { updateFactureSyncStatut(f.id, 'envoyee'); reload() }

  function marquerRetard(f: FactureSync) { updateFactureSyncStatut(f.id, 'en_retard'); reload() }

  function enregistrerPaiement(f: FactureSync, datePaiement: string) {
    markFacturePaid(f.id, datePaiement)
    genererEcriturePaiementClient(f.id, f.numero, f.montantTotal, datePaiement)
    reload(); setShowPaiement(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" />Créer facture
        </button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500 border-b bg-slate-50">{['Numéro','Client','Projet','Date','Montant HT','TPS','TVQ','Total TTC','Statut','Actions'].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {factures.map(f => (
                <tr key={f.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{f.numero}</td>
                  <td className="px-4 py-3">{f.clientNom}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs max-w-[140px] truncate">{f.projetTitre || '—'}</td>
                  <td className="px-4 py-3">{fmtDate(f.date)}</td>
                  <td className="px-4 py-3 text-right">{fmt(f.montantHT)}</td>
                  <td className="px-4 py-3 text-right">{fmt(f.tps)}</td>
                  <td className="px-4 py-3 text-right">{fmt(f.tvq)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{fmt(f.montantTotal)}</td>
                  <td className="px-4 py-3">{statutBadgeFac(f.statut)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {f.statut === 'brouillon' && <button onClick={() => marquerEnvoye(f)} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Send className="w-3 h-3" />Envoyer</button>}
                      {(f.statut === 'envoyee' || f.statut === 'en_retard') && <button onClick={() => setShowPaiement(f)} className="text-xs text-emerald-600 hover:underline flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Paiement</button>}
                      {f.statut === 'envoyee' && <button onClick={() => marquerRetard(f)} className="text-xs text-red-500 hover:underline ml-1">Retard</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-semibold text-sm">
              <tr>
                <td colSpan={4} className="px-4 py-3">Totaux</td>
                <td className="px-4 py-3 text-right">{fmt(totalHT)}</td>
                <td className="px-4 py-3 text-right">{fmt(totalTPS)}</td>
                <td className="px-4 py-3 text-right">{fmt(totalTVQ)}</td>
                <td className="px-4 py-3 text-right">{fmt(totalTTC)}</td>
                <td colSpan={2} className="px-4 py-3 text-right text-slate-600 text-xs">Payé: {fmt(totalPaye)} | À recevoir: {fmt(totalAR)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Modal créer facture */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Créer une facture client" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Client"><input className={inputCls} value={form.clientNom} onChange={e => setForm(p => ({ ...p, clientNom: e.target.value }))} placeholder="Nom du client" /></Field>
            <Field label="Projet (optionnel)"><input className={inputCls} value={form.projetTitre} onChange={e => setForm(p => ({ ...p, projetTitre: e.target.value }))} placeholder="Titre du projet" /></Field>
          </div>
          <Field label="Description"><input className={inputCls} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description des travaux/services" /></Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Montant HT ($)"><input type="number" className={inputCls} value={form.montantHT} onChange={e => setForm(p => ({ ...p, montantHT: e.target.value }))} /></Field>
            <Field label="Date"><input type="date" className={inputCls} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></Field>
            <Field label="Conditions paiement"><select className={selectCls} value={form.conditions} onChange={e => setForm(p => ({ ...p, conditions: e.target.value }))}>{['Net 30','Net 45','Net 60','Sur réception','50% avance'].map(c => <option key={c}>{c}</option>)}</select></Field>
          </div>
          {form.montantHT && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-600">Montant HT</span><span>{fmt(parseFloat(form.montantHT) || 0)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">TPS ({ent?.tauxTPS ?? 5}%)</span><span>{fmt(taxes.tps)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">TVQ ({ent?.tauxTVQ ?? 9.975}%)</span><span>{fmt(taxes.tvq)}</span></div>
              <div className="flex justify-between font-semibold border-t pt-1"><span>Total TTC</span><span>{fmt(taxes.total)}</span></div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="secondary" onClick={() => setShowCreate(false)}>Annuler</Btn>
            <Btn onClick={creerFacture} disabled={!form.clientNom || !form.montantHT}>Créer la facture</Btn>
          </div>
        </div>
      </Modal>

      {/* Modal paiement */}
      {showPaiement && (
        <ModalPaiementFacture facture={showPaiement} onClose={() => setShowPaiement(null)} onSave={enregistrerPaiement} />
      )}
    </div>
  )
}

function ModalPaiementFacture({ facture, onClose, onSave }: { facture: FactureSync, onClose: () => void, onSave: (f: FactureSync, date: string) => void }) {
  const [datePaiement, setDatePaiement] = useState(today())
  return (
    <Modal open onClose={onClose} title={`Enregistrer paiement — ${facture.numero}`} size="sm">
      <div className="space-y-4">
        <div className="bg-indigo-50 rounded-lg p-3 text-sm text-center font-semibold text-indigo-700">{fmt(facture.montantTotal)}</div>
        <Field label="Date de paiement"><input type="date" className={inputCls} value={datePaiement} onChange={e => setDatePaiement(e.target.value)} /></Field>
        <div className="flex justify-end gap-2">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={() => onSave(facture, datePaiement)}>Confirmer paiement</Btn>
        </div>
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════
// TAB 3 — COMPTES FOURNISSEURS
// ══════════════════════════════════════════════════════
function FournisseursTab({ pos, depenses, comptes, reload }: { pos: POSync[], depenses: DepenseDirecte[], comptes: CompteComptable[], reload: () => void }) {
  const [showDep, setShowDep] = useState(false)
  const [showPO, setShowPO] = useState<POSync | null>(null)
  const [showApprouver, setShowApprouver] = useState<DepenseDirecte | null>(null)
  const [formDep, setFormDep] = useState({ compteId: '', description: '', fournisseurNom: '', date: today(), montantHT: '', methode: 'virement' as DepenseDirecte['methode'], reference: '', projetTitre: '' })
  const [formPO, setFormPO] = useState({ montant: '', date: today(), methode: 'virement', reference: '' })

  const depComptes = comptes.filter(c => c.actif && (c.code.startsWith('5') || c.code.startsWith('6')))
  const taxes = formDep.montantHT ? calculerTaxes(parseFloat(formDep.montantHT) || 0) : { tps: 0, tvq: 0, total: 0 }
  const posApprouves = pos.filter(p => ['approuve','envoye','recu'].includes(p.statut))

  const totalEngage = depenses.filter(d => !['brouillon','rejete'].includes(d.statut)).reduce((s, d) => s + d.montantTotal, 0)
  const totalPaye = depenses.filter(d => d.statut === 'paye').reduce((s, d) => s + d.montantTotal, 0)

  function creerDepense() {
    const ht = parseFloat(formDep.montantHT) || 0
    const { tps, tvq, total } = calculerTaxes(ht)
    const compte = comptes.find(c => c.id === formDep.compteId)
    const d: DepenseDirecte = {
      id: uid(), compteId: formDep.compteId, compteCode: compte?.code || '', compteNom: compte?.nom || '',
      description: formDep.description, fournisseurNom: formDep.fournisseurNom, projetTitre: formDep.projetTitre,
      montantHT: ht, tps, tvq, montantTotal: total, date: formDep.date,
      methode: formDep.methode, reference: formDep.reference, statut: 'brouillon', createdAt: new Date().toISOString(),
    }
    upsertDepense(d)
    reload(); setShowDep(false)
    setFormDep({ compteId: '', description: '', fournisseurNom: '', date: today(), montantHT: '', methode: 'virement', reference: '', projetTitre: '' })
  }

  function soumettre(d: DepenseDirecte) { soumettrePourApprobation(d.id, 'Utilisateur'); reload() }

  function payerPO() {
    if (!showPO) return
    const montant = parseFloat(formPO.montant) || 0
    addPOPaiement(showPO.id, { date: formPO.date, montant, methode: formPO.methode, reference: formPO.reference })
    reload(); setShowPO(null)
  }

  function statutDepBadge(s: DepenseDirecte['statut']) {
    const map: Record<string, string> = { brouillon: 'brouillon', soumis: 'soumis', approuve: 'approuve', rejete: 'rejete', paye: 'paye' }
    return <Badge status={map[s] ?? s} />
  }

  return (
    <div className="space-y-6">
      {/* Section A — POs */}
      <Card>
        <div className="p-4">
          <h3 className="font-semibold text-slate-800 mb-3">Bons de commande approuvés</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 border-b bg-slate-50">{['PO #','Fournisseur','Projet','Total TTC','Payé','Reliquat','Statut','Action'].map(h => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {posApprouves.map(p => {
                  const reliquat = p.montantTotal - p.montantPaye
                  return (
                    <tr key={p.id} className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-xs font-semibold">{p.numero}</td>
                      <td className="px-3 py-2">{p.fournisseurNom}</td>
                      <td className="px-3 py-2 text-slate-600 text-xs">{p.projetTitre}</td>
                      <td className="px-3 py-2 text-right">{fmt(p.montantTotal)}</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{fmt(p.montantPaye)}</td>
                      <td className="px-3 py-2 text-right text-amber-600">{fmt(reliquat)}</td>
                      <td className="px-3 py-2"><Badge status={p.statut} /></td>
                      <td className="px-3 py-2">
                        {p.statut === 'recu' && <button onClick={() => setShowPO(p)} className="text-xs text-indigo-600 hover:underline">Payer</button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Section B — Dépenses directes */}
      <Card>
        <div className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-slate-800">Dépenses directes</h3>
            <button onClick={() => setShowDep(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm">
              <Plus className="w-4 h-4" />Nouvelle dépense
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 border-b bg-slate-50">{['Description','Compte','Fournisseur','Date','Montant TTC','Statut','Actions'].map(h => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {depenses.map(d => (
                  <tr key={d.id} className="border-b hover:bg-slate-50">
                    <td className="px-3 py-2 max-w-[180px] truncate">{d.description}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{d.compteCode} — {d.compteNom}</td>
                    <td className="px-3 py-2">{d.fournisseurNom || '—'}</td>
                    <td className="px-3 py-2">{fmtDate(d.date)}</td>
                    <td className="px-3 py-2 text-right font-medium">{fmt(d.montantTotal)}</td>
                    <td className="px-3 py-2">{statutDepBadge(d.statut)}</td>
                    <td className="px-3 py-2">
                      {d.statut === 'brouillon' && <button onClick={() => soumettre(d)} className="text-xs text-amber-600 hover:underline">Soumettre</button>}
                      {d.statut === 'approuve' && <button onClick={() => { upsertDepense({ ...d, statut: 'paye' }); reload() }} className="text-xs text-emerald-600 hover:underline">Marquer payée</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 text-sm font-semibold">
                <tr>
                  <td colSpan={4} className="px-3 py-2">Totaux</td>
                  <td className="px-3 py-2 text-right">{fmt(totalEngage)}</td>
                  <td colSpan={2} className="px-3 py-2 text-right text-slate-600 text-xs">Payé: {fmt(totalPaye)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </Card>

      {/* Modal nouvelle dépense */}
      <Modal open={showDep} onClose={() => setShowDep(false)} title="Nouvelle dépense directe" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Description"><input className={inputCls} value={formDep.description} onChange={e => setFormDep(p => ({ ...p, description: e.target.value }))} /></Field>
            <Field label="Fournisseur"><input className={inputCls} value={formDep.fournisseurNom} onChange={e => setFormDep(p => ({ ...p, fournisseurNom: e.target.value }))} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Compte comptable"><select className={selectCls} value={formDep.compteId} onChange={e => setFormDep(p => ({ ...p, compteId: e.target.value }))}>
              <option value="">— Sélectionner —</option>
              {depComptes.map(c => <option key={c.id} value={c.id}>{c.code} — {c.nom}</option>)}
            </select></Field>
            <Field label="Projet (optionnel)"><input className={inputCls} value={formDep.projetTitre} onChange={e => setFormDep(p => ({ ...p, projetTitre: e.target.value }))} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Montant HT ($)"><input type="number" className={inputCls} value={formDep.montantHT} onChange={e => setFormDep(p => ({ ...p, montantHT: e.target.value }))} /></Field>
            <Field label="Date"><input type="date" className={inputCls} value={formDep.date} onChange={e => setFormDep(p => ({ ...p, date: e.target.value }))} /></Field>
            <Field label="Méthode paiement"><select className={selectCls} value={formDep.methode} onChange={e => setFormDep(p => ({ ...p, methode: e.target.value as DepenseDirecte['methode'] }))}>{['virement','cheque','carte','comptant'].map(m => <option key={m}>{m}</option>)}</select></Field>
          </div>
          <Field label="Référence (optionnel)"><input className={inputCls} value={formDep.reference} onChange={e => setFormDep(p => ({ ...p, reference: e.target.value }))} /></Field>
          {formDep.montantHT && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between"><span>TPS</span><span>{fmt(taxes.tps)}</span></div>
              <div className="flex justify-between"><span>TVQ</span><span>{fmt(taxes.tvq)}</span></div>
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>Total TTC</span>
                <span>{fmt(taxes.total)}</span>
              </div>
              <div className="text-xs text-amber-600 font-medium">Niveau approbation : {libelleNiveau(niveauApprobation(taxes.total))}</div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="secondary" onClick={() => setShowDep(false)}>Annuler</Btn>
            <Btn onClick={creerDepense} disabled={!formDep.compteId || !formDep.description || !formDep.montantHT}>Créer dépense</Btn>
          </div>
        </div>
      </Modal>

      {/* Modal payer PO */}
      {showPO && (
        <Modal open onClose={() => setShowPO(null)} title={`Paiement PO — ${showPO.numero}`} size="sm">
          <div className="space-y-4">
            <div className="text-sm text-slate-600">Reliquat : <span className="font-semibold text-slate-800">{fmt(showPO.montantTotal - showPO.montantPaye)}</span></div>
            <Field label="Montant ($)"><input type="number" className={inputCls} value={formPO.montant} onChange={e => setFormPO(p => ({ ...p, montant: e.target.value }))} /></Field>
            <Field label="Date"><input type="date" className={inputCls} value={formPO.date} onChange={e => setFormPO(p => ({ ...p, date: e.target.value }))} /></Field>
            <Field label="Référence"><input className={inputCls} value={formPO.reference} onChange={e => setFormPO(p => ({ ...p, reference: e.target.value }))} /></Field>
            <div className="flex justify-end gap-2">
              <Btn variant="secondary" onClick={() => setShowPO(null)}>Annuler</Btn>
              <Btn onClick={payerPO} disabled={!formPO.montant}>Enregistrer</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// TAB 4 — JOURNAL DES ÉCRITURES
// ══════════════════════════════════════════════════════
function JournalTab({ ecritures, comptes, reload }: { ecritures: EcritureComptable[], comptes: CompteComptable[], reload: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [lignes, setLignes] = useState<{ compteId: string, debit: string, credit: string, desc: string }[]>([
    { compteId: '', debit: '', credit: '', desc: '' }, { compteId: '', debit: '', credit: '', desc: '' }
  ])
  const [formE, setFormE] = useState({ date: today(), description: '', type: 'manuel' as EcritureComptable['type'] })

  const filtered = ecritures.filter(e => {
    if (filterType && e.type !== filterType) return false
    if (filterDate && e.date < filterDate) return false
    return true
  })

  const totalDebit = lignes.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const totalCredit = lignes.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01

  function saveEcriture() {
    const year = new Date().getFullYear()
    const num = ecritures.filter(e => e.numero.includes(String(year))).length + 1
    const e: EcritureComptable = {
      id: uid(), date: formE.date, numero: `EC-${year}-${String(num).padStart(4,'0')}`,
      description: formE.description, type: formE.type,
      lignes: lignes.filter(l => l.compteId).map(l => {
        const c = comptes.find(x => x.id === l.compteId)
        return { id: uid(), compteId: l.compteId, compteCode: c?.code || '', compteNom: c?.nom || '', debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0, description: l.desc }
      }),
      statut: 'brouillon', creePar: 'Utilisateur', createdAt: new Date().toISOString(),
    }
    upsertEcriture(e); reload(); setShowNew(false)
    setLignes([{ compteId: '', debit: '', credit: '', desc: '' }, { compteId: '', debit: '', credit: '', desc: '' }])
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Type</label>
          <select className={selectCls + ' text-sm'} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Tous</option>
            {['facture_client','paiement_client','facture_fournisseur','paiement_fournisseur','depense','ajustement','manuel'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Depuis</label>
          <input type="date" className={inputCls + ' text-sm'} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm ml-auto">
          <Plus className="w-4 h-4" />Nouvelle écriture manuelle
        </button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500 border-b bg-slate-50">{['','Date','N° Écriture','Description','Type','Débit total','Crédit total','Statut','Action'].map(h => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(e => {
                const td = e.lignes.reduce((s, l) => s + l.debit, 0)
                const tc = e.lignes.reduce((s, l) => s + l.credit, 0)
                return (
                  <>
                    <tr key={e.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                      <td className="px-3 py-2">{expanded === e.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</td>
                      <td className="px-3 py-2">{fmtDate(e.date)}</td>
                      <td className="px-3 py-2 font-mono text-xs font-semibold">{e.numero}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate">{e.description}</td>
                      <td className="px-3 py-2"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{e.type.replace(/_/g,' ')}</span></td>
                      <td className="px-3 py-2 text-right">{fmt(td)}</td>
                      <td className="px-3 py-2 text-right">{fmt(tc)}</td>
                      <td className="px-3 py-2"><Badge status={e.statut} /></td>
                      <td className="px-3 py-2">
                        {e.statut === 'brouillon' && <button onClick={ev => { ev.stopPropagation(); validerEcriture(e.id, 'Comptable'); reload() }} className="text-xs text-emerald-600 hover:underline">Valider</button>}
                      </td>
                    </tr>
                    {expanded === e.id && (
                      <tr key={`${e.id}-exp`} className="bg-slate-50">
                        <td colSpan={9} className="px-6 py-3">
                          <table className="w-full text-xs">
                            <thead><tr className="text-slate-500">{['Compte','Nom','Débit','Crédit','Description'].map(h => <th key={h} className="text-left pb-1 pr-6">{h}</th>)}</tr></thead>
                            <tbody>
                              {e.lignes.map(l => (
                                <tr key={l.id}>
                                  <td className="pr-6 font-mono">{l.compteCode}</td>
                                  <td className="pr-6">{l.compteNom}</td>
                                  <td className="pr-6 text-right">{l.debit > 0 ? fmt(l.debit) : '—'}</td>
                                  <td className="pr-6 text-right">{l.credit > 0 ? fmt(l.credit) : '—'}</td>
                                  <td>{l.description || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal nouvelle écriture manuelle */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nouvelle écriture manuelle" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Date"><input type="date" className={inputCls} value={formE.date} onChange={e => setFormE(p => ({ ...p, date: e.target.value }))} /></Field>
            <Field label="Description"><input className={inputCls} value={formE.description} onChange={e => setFormE(p => ({ ...p, description: e.target.value }))} /></Field>
            <Field label="Type"><select className={selectCls} value={formE.type} onChange={e => setFormE(p => ({ ...p, type: e.target.value as EcritureComptable['type'] }))}>
              {['ajustement','manuel'].map(t => <option key={t} value={t}>{t}</option>)}
            </select></Field>
          </div>
          {/* Lignes */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 border-b">{['Compte','Débit ($)','Crédit ($)','Description',''].map(h => <th key={h} className="pb-1 pr-3 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {lignes.map((l, i) => (
                  <tr key={i}>
                    <td className="pr-2 py-1"><select className={selectCls + ' text-xs'} value={l.compteId} onChange={e => setLignes(p => p.map((x, j) => j === i ? { ...x, compteId: e.target.value } : x))}>
                      <option value="">—</option>
                      {comptes.filter(c => c.actif).sort((a, b) => a.code.localeCompare(b.code)).map(c => <option key={c.id} value={c.id}>{c.code} — {c.nom}</option>)}
                    </select></td>
                    <td className="pr-2 py-1"><input type="number" placeholder="0.00" className={inputCls + ' text-xs w-28'} value={l.debit} onChange={e => setLignes(p => p.map((x, j) => j === i ? { ...x, debit: e.target.value } : x))} /></td>
                    <td className="pr-2 py-1"><input type="number" placeholder="0.00" className={inputCls + ' text-xs w-28'} value={l.credit} onChange={e => setLignes(p => p.map((x, j) => j === i ? { ...x, credit: e.target.value } : x))} /></td>
                    <td className="pr-2 py-1"><input className={inputCls + ' text-xs'} value={l.desc} onChange={e => setLignes(p => p.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))} /></td>
                    <td><button onClick={() => setLignes(p => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><XCircle className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setLignes(p => [...p, { compteId: '', debit: '', credit: '', desc: '' }])} className="text-xs text-indigo-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" />Ajouter ligne</button>
          <div className={`text-sm font-semibold px-3 py-2 rounded-md ${balanced ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            Débit: {fmt(totalDebit)} | Crédit: {fmt(totalCredit)} {balanced ? '✓ Équilibrée' : '✗ Non équilibrée'}
          </div>
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setShowNew(false)}>Annuler</Btn>
            <Btn onClick={saveEcriture} disabled={!balanced || !formE.description || totalDebit === 0}>Enregistrer</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// TAB 5 — GRAND LIVRE
// ══════════════════════════════════════════════════════
function GrandLivreTab({ ecritures, comptes }: { ecritures: EcritureComptable[], comptes: CompteComptable[] }) {
  const [compteId, setCompteId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(today())

  const compte = comptes.find(c => c.id === compteId)

  const mouvements = compteId ? ecritures
    .filter(e => e.statut === 'valide' && (!dateFrom || e.date >= dateFrom) && (!dateTo || e.date <= dateTo))
    .flatMap(e => e.lignes.filter(l => l.compteId === compteId).map(l => ({ date: e.date, description: e.description, ref: e.numero, debit: l.debit, credit: l.credit })))
    .sort((a, b) => a.date.localeCompare(b.date))
  : []

  let solde = 0
  const lignesSolde = mouvements.map(m => {
    const isActifDep = compte && (compte.categorie === 'actif' || compte.categorie === 'depenses')
    solde += isActifDep ? (m.debit - m.credit) : (m.credit - m.debit)
    return { ...m, solde }
  })

  function exportCSV() {
    if (!compte) return
    const rows = [['Date','Description','Réf','Débit','Crédit','Solde'], ...lignesSolde.map(m => [m.date, m.description, m.ref, m.debit, m.credit, m.solde])]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `grand-livre-${compte.code}.csv`; a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-slate-500 block mb-1">Compte</label>
          <select className={selectCls} value={compteId} onChange={e => setCompteId(e.target.value)}>
            <option value="">— Sélectionner un compte —</option>
            {comptes.filter(c => c.actif).sort((a, b) => a.code.localeCompare(b.code)).map(c => <option key={c.id} value={c.id}>{c.code} — {c.nom}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Du</label>
          <input type="date" className={inputCls} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Au</label>
          <input type="date" className={inputCls} value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        {compteId && <button onClick={exportCSV} className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm"><Download className="w-4 h-4" />Export CSV</button>}
      </div>

      {compte && (
        <div className="bg-indigo-50 rounded-lg p-3 flex gap-6 text-sm">
          <div><span className="text-slate-500">Compte : </span><span className="font-semibold">{compte.code} — {compte.nom}</span></div>
          <div><span className="text-slate-500">Catégorie : </span><span className="font-semibold capitalize">{compte.categorie}</span></div>
          <div><span className="text-slate-500">Solde actuel : </span><span className="font-bold text-indigo-700">{fmt(lignesSolde.length > 0 ? lignesSolde[lignesSolde.length - 1].solde : 0)}</span></div>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500 border-b bg-slate-50">{['Date','Description','Référence','Débit','Crédit','Solde'].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {lignesSolde.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">{compteId ? 'Aucun mouvement pour ce compte sur la période' : 'Sélectionnez un compte'}</td></tr>
              )}
              {lignesSolde.map((m, i) => (
                <tr key={i} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-2">{fmtDate(m.date)}</td>
                  <td className="px-4 py-2">{m.description}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-600">{m.ref}</td>
                  <td className="px-4 py-2 text-right">{m.debit > 0 ? fmt(m.debit) : '—'}</td>
                  <td className="px-4 py-2 text-right">{m.credit > 0 ? fmt(m.credit) : '—'}</td>
                  <td className="px-4 py-2 text-right font-semibold">{fmt(m.solde)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// TAB 6 — PLAN COMPTABLE
// ══════════════════════════════════════════════════════
function PlanComptableTab({ comptes, reload }: { comptes: CompteComptable[], reload: () => void }) {
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<CompteComptable | null>(null)
  const [form, setForm] = useState<Partial<CompteComptable>>({ categorie: 'actif', actif: true, sousCategorie: '', code: '', nom: '' })

  const cats: CompteComptable['categorie'][] = ['actif','passif','capitaux','revenus','depenses']
  const catLabels: Record<string, string> = { actif: 'Actif', passif: 'Passif', capitaux: 'Capitaux propres', revenus: 'Revenus', depenses: 'Dépenses' }

  function saveCompte() {
    const c: CompteComptable = { id: editing?.id || uid(), code: form.code || '', nom: form.nom || '', categorie: form.categorie || 'actif', sousCategorie: form.sousCategorie || '', actif: form.actif ?? true, budgetAlloue: form.budgetAlloue, projetId: form.projetId, projetTitre: form.projetTitre }
    upsertComptePlan(c); reload()
    setShowNew(false); setEditing(null); setForm({ categorie: 'actif', actif: true, sousCategorie: '', code: '', nom: '' })
  }

  function editCompte(c: CompteComptable) { setEditing(c); setForm(c); setShowNew(true) }
  function toggleActif(c: CompteComptable) { upsertComptePlan({ ...c, actif: !c.actif }); reload() }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setEditing(null); setForm({ categorie: 'actif', actif: true, sousCategorie: '', code: '', nom: '' }); setShowNew(true) }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm">
          <Plus className="w-4 h-4" />Ajouter un compte
        </button>
      </div>

      {cats.map(cat => {
        const items = comptes.filter(c => c.categorie === cat).sort((a, b) => a.code.localeCompare(b.code))
        if (items.length === 0) return null
        return (
          <Card key={cat}>
            <div className="p-4">
              <h3 className="font-semibold text-slate-800 mb-3">{catLabels[cat]}</h3>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-slate-500 border-b">{['Code','Nom','Sous-catégorie','Budget alloué','Solde actuel','Actif',''].map(h => <th key={h} className="pb-2 pr-4 font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {items.map(c => (
                    <tr key={c.id} className={`border-b hover:bg-slate-50 ${!c.actif ? 'opacity-50' : ''}`}>
                      <td className="py-2 pr-4 font-mono font-semibold">{c.code}</td>
                      <td className="py-2 pr-4">{c.nom}</td>
                      <td className="py-2 pr-4 text-slate-600 text-xs">{c.sousCategorie}</td>
                      <td className="py-2 pr-4 text-right">{c.budgetAlloue ? fmt(c.budgetAlloue) : '—'}</td>
                      <td className="py-2 pr-4 text-right font-semibold">{fmt(soldeDuCompte(c.id))}</td>
                      <td className="py-2 pr-4"><Badge status={c.actif ? 'actif' : 'inactif'} /></td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button onClick={() => editCompte(c)} className="text-xs text-indigo-600 hover:underline flex items-center gap-1"><Pencil className="w-3 h-3" />Modifier</button>
                          <button onClick={() => toggleActif(c)} className="text-xs text-slate-500 hover:underline">{c.actif ? 'Désactiver' : 'Activer'}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      })}

      <Modal open={showNew} onClose={() => setShowNew(false)} title={editing ? 'Modifier le compte' : 'Ajouter un compte'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code"><input className={inputCls} value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="ex: 5999" /></Field>
            <Field label="Catégorie"><select className={selectCls} value={form.categorie} onChange={e => setForm(p => ({ ...p, categorie: e.target.value as CompteComptable['categorie'] }))}>{cats.map(c => <option key={c} value={c}>{catLabels[c]}</option>)}</select></Field>
          </div>
          <Field label="Nom du compte"><input className={inputCls} value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} /></Field>
          <Field label="Sous-catégorie"><input className={inputCls} value={form.sousCategorie} onChange={e => setForm(p => ({ ...p, sousCategorie: e.target.value }))} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Budget alloué ($)"><input type="number" className={inputCls} value={form.budgetAlloue ?? ''} onChange={e => setForm(p => ({ ...p, budgetAlloue: parseFloat(e.target.value) || undefined }))} /></Field>
            <Field label="Projet lié (optionnel)"><input className={inputCls} value={form.projetTitre ?? ''} onChange={e => setForm(p => ({ ...p, projetTitre: e.target.value }))} /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setShowNew(false)}>Annuler</Btn>
            <Btn onClick={saveCompte} disabled={!form.code || !form.nom}>{editing ? 'Mettre à jour' : 'Créer'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// TAB 7 — APPROBATIONS
// ══════════════════════════════════════════════════════
function ApprobationsTab({ approbations, pos, reload }: { approbations: DemandeApprobation[], pos: POSync[], reload: () => void }) {
  const [commentaire, setCommentaire] = useState('')
  const [actionModal, setActionModal] = useState<{ app: DemandeApprobation, type: 'approuver' | 'rejeter' } | null>(null)

  const attente = approbations.filter(a => a.statut === 'en_attente').sort((a, b) => b.niveauApprobation - a.niveauApprobation)
  const historique = approbations.filter(a => a.statut !== 'en_attente').sort((a, b) => (b.dateDecision || '').localeCompare(a.dateDecision || ''))
  const montantAttente = attente.reduce((s, a) => s + a.montant, 0)
  const approuvesSemaine = historique.filter(a => a.statut === 'approuve').length
  const rejetes = historique.filter(a => a.statut === 'rejete').length

  function confirmerAction() {
    if (!actionModal) return
    const { app, type } = actionModal
    if (type === 'approuver') approuverDepense(app.refId, 'Utilisateur', commentaire || undefined)
    else rejeterDepense(app.refId, 'Utilisateur', commentaire)
    reload(); setActionModal(null); setCommentaire('')
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="En attente" value={String(attente.length)} trend={attente.length > 0 ? 'down' : 'up'} />
        <KpiCard label="Montant en attente" value={fmt(montantAttente)} trend="neutral" />
        <KpiCard label="Approuvés" value={String(approuvesSemaine)} trend="up" />
        <KpiCard label="Rejetés" value={String(rejetes)} trend={rejetes > 0 ? 'down' : 'up'} />
      </div>

      {/* En attente */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-3">En attente ({attente.length})</h3>
        {attente.length === 0 && <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">Aucune approbation en attente</div>}
        <div className="space-y-3">
          {attente.map(a => (
            <Card key={a.id}>
              <div className="p-4 flex items-start gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {badgeNiveau(a.niveauApprobation)}
                    <span className="font-semibold text-slate-800">{a.description}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-500">
                    {a.fournisseurNom && <span>Fournisseur : {a.fournisseurNom}</span>}
                    {a.projetTitre && <span>Projet : {a.projetTitre}</span>}
                    <span>Soumis par : {a.soumispar}</span>
                    <span>Le {fmtDate(a.datesoumission)}</span>
                  </div>
                  <div className="text-xs text-slate-500">Requis : {libelleNiveau(a.niveauApprobation)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-slate-800">{fmt(a.montant)}</div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setActionModal({ app: a, type: 'rejeter' })} className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                      <ThumbsDown className="w-3 h-3" />Rejeter
                    </button>
                    <button onClick={() => setActionModal({ app: a, type: 'approuver' })} className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                      <ThumbsUp className="w-3 h-3" />Approuver
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Historique */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-3">Historique</h3>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 border-b bg-slate-50">{['Description','Montant','Statut','Décidé par','Date décision','Commentaire'].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {historique.map(a => (
                  <tr key={a.id} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3 max-w-[180px] truncate">{a.description}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmt(a.montant)}</td>
                    <td className="px-4 py-3"><Badge status={a.statut} /></td>
                    <td className="px-4 py-3">{a.approbateur || '—'}</td>
                    <td className="px-4 py-3">{a.dateDecision ? fmtDate(a.dateDecision) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate">{a.commentaire || '—'}</td>
                  </tr>
                ))}
                {historique.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-400">Aucun historique</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Modal action */}
      {actionModal && (
        <Modal open onClose={() => setActionModal(null)} title={actionModal.type === 'approuver' ? 'Approuver la demande' : 'Rejeter la demande'} size="sm">
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <div className="font-semibold">{actionModal.app.description}</div>
              <div className="text-lg font-bold text-slate-800 mt-1">{fmt(actionModal.app.montant)}</div>
            </div>
            <Field label={actionModal.type === 'rejeter' ? 'Raison du rejet (obligatoire)' : 'Commentaire (optionnel)'}>
              <textarea className={inputCls + ' h-20 resize-none'} value={commentaire} onChange={e => setCommentaire(e.target.value)} />
            </Field>
            <div className="flex justify-end gap-2">
              <Btn variant="secondary" onClick={() => setActionModal(null)}>Annuler</Btn>
              <Btn onClick={confirmerAction} disabled={actionModal.type === 'rejeter' && !commentaire}>
                {actionModal.type === 'approuver' ? 'Confirmer approbation' : 'Confirmer rejet'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// TAB 8 — ÉTATS FINANCIERS
// ══════════════════════════════════════════════════════
function EtatsFinanciersTab({ factures, pos, depenses, ecritures, comptes }: { factures: FactureSync[], pos: POSync[], depenses: DepenseDirecte[], ecritures: EcritureComptable[], comptes: CompteComptable[] }) {
  const [subTab, setSubTab] = useState<'Résultats' | 'Bilan' | 'Cashflow'>('Résultats')

  // Résultats
  const revenuProjet = ecritures.filter(e => e.statut === 'valide' && e.type === 'facture_client').reduce((s, e) => s + e.lignes.filter(l => l.compteCode.startsWith('4')).reduce((a, l) => a + l.credit, 0), 0)
  const revenuService = 0
  const totalRevenus = revenuProjet + revenuService

  const depByCode: Record<string, number> = {}
  for (const e of ecritures.filter(e => e.statut === 'valide')) {
    for (const l of e.lignes) {
      if (['5','6','7'].some(p => l.compteCode.startsWith(p))) {
        depByCode[l.compteCode] = (depByCode[l.compteCode] || 0) + l.debit
      }
    }
  }
  const totalCharges = Object.values(depByCode).reduce((s, v) => s + v, 0)
  const resultatNet = totalRevenus - totalCharges

  // Bilan
  const encaisse = comptes.filter(c => c.code.startsWith('101') || c.code.startsWith('102')).reduce((s, c) => s + soldeDuCompte(c.id), 0)
  const comptesClients = comptes.find(c => c.code === '1100')
  const revARecevoir = comptes.find(c => c.code === '1200')
  const totalActif = encaisse + (comptesClients ? soldeDuCompte(comptesClients.id) : 0) + (revARecevoir ? soldeDuCompte(revARecevoir.id) : 0)

  const cpteFourn = comptes.find(c => c.code === '2000')
  const tpsPayer = comptes.find(c => c.code === '2100')
  const tvqPayer = comptes.find(c => c.code === '2110')
  const totalPassif = (cpteFourn ? soldeDuCompte(cpteFourn.id) : 0) + (tpsPayer ? soldeDuCompte(tpsPayer.id) : 0) + (tvqPayer ? soldeDuCompte(tvqPayer.id) : 0)
  const capitaux = totalActif - totalPassif

  // Cashflow 12 mois
  const now = new Date()
  const cashflowData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    const mois = d.toLocaleDateString('fr-CA', { month: 'short', year: '2-digit' })
    const mm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const entrees = ecritures.filter(e => e.statut === 'valide' && e.type === 'paiement_client' && e.date.startsWith(mm)).reduce((s, e) => s + e.lignes.filter(l => l.compteCode === '1010').reduce((a, l) => a + l.debit, 0), 0)
    const sorties = ecritures.filter(e => e.statut === 'valide' && ['paiement_fournisseur','depense'].includes(e.type) && e.date.startsWith(mm)).reduce((s, e) => s + e.lignes.filter(l => l.compteCode === '1010').reduce((a, l) => a + l.credit, 0), 0)
    return { mois, entrees, sorties, net: entrees - sorties }
  })
  const maxVal = Math.max(...cashflowData.flatMap(d => [d.entrees, d.sorties]), 1)

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        {(['Résultats','Bilan','Cashflow'] as const).map(s => (
          <button key={s} onClick={() => setSubTab(s)} className={`px-4 py-2 text-sm font-medium rounded-lg ${subTab === s ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{s}</button>
        ))}
      </div>

      {subTab === 'Résultats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <div className="p-4">
              <h3 className="font-semibold text-slate-800 mb-4 text-lg">Compte de résultats</h3>
              <div className="space-y-2">
                <div className="font-semibold text-slate-600 text-sm uppercase tracking-wide">Revenus</div>
                <div className="flex justify-between text-sm"><span>Revenus de projets</span><span>{fmt(revenuProjet)}</span></div>
                <div className="flex justify-between text-sm border-t pt-2 font-semibold"><span>Total revenus</span><span>{fmt(totalRevenus)}</span></div>
                <div className="font-semibold text-slate-600 text-sm uppercase tracking-wide mt-4">Charges</div>
                {Object.entries(depByCode).sort((a, b) => a[0].localeCompare(b[0])).map(([code, montant]) => {
                  const c = comptes.find(x => x.code === code)
                  return <div key={code} className="flex justify-between text-sm"><span className="text-slate-600">{code} — {c?.nom || code}</span><span>{fmt(montant)}</span></div>
                })}
                <div className="flex justify-between text-sm border-t pt-2 font-semibold"><span>Total charges</span><span>{fmt(totalCharges)}</span></div>
                <div className={`flex justify-between text-base font-bold border-t-2 pt-3 ${resultatNet >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  <span>Résultat net</span><span>{fmt(resultatNet)}</span>
                </div>
              </div>
            </div>
          </Card>
          <div className="space-y-4">
            <KpiCard label="Revenus totaux" value={fmt(totalRevenus)} trend="up" />
            <KpiCard label="Charges totales" value={fmt(totalCharges)} trend="down" />
            <KpiCard label="Résultat net" value={fmt(resultatNet)} trend={resultatNet >= 0 ? 'up' : 'down'} trendLabel={resultatNet >= 0 ? 'Bénéfice' : 'Perte'} />
          </div>
        </div>
      )}

      {subTab === 'Bilan' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <div className="p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Actif</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Encaisse</span><span>{fmt(encaisse)}</span></div>
                <div className="flex justify-between"><span>Comptes clients</span><span>{fmt(comptesClients ? soldeDuCompte(comptesClients.id) : 0)}</span></div>
                <div className="flex justify-between"><span>Revenus à recevoir</span><span>{fmt(revARecevoir ? soldeDuCompte(revARecevoir.id) : 0)}</span></div>
                <div className="flex justify-between font-semibold border-t pt-2"><span>Total actif</span><span>{fmt(totalActif)}</span></div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Passif & Capitaux</h3>
              <div className="space-y-2 text-sm">
                <div className="font-medium text-slate-500 text-xs uppercase">Passif</div>
                <div className="flex justify-between"><span>Comptes fournisseurs</span><span>{fmt(cpteFourn ? soldeDuCompte(cpteFourn.id) : 0)}</span></div>
                <div className="flex justify-between"><span>TPS à payer</span><span>{fmt(tpsPayer ? soldeDuCompte(tpsPayer.id) : 0)}</span></div>
                <div className="flex justify-between"><span>TVQ à payer</span><span>{fmt(tvqPayer ? soldeDuCompte(tvqPayer.id) : 0)}</span></div>
                <div className="flex justify-between font-semibold border-t pt-2"><span>Total passif</span><span>{fmt(totalPassif)}</span></div>
                <div className="font-medium text-slate-500 text-xs uppercase mt-3">Capitaux propres</div>
                <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Capitaux = Actif − Passif</span><span>{fmt(capitaux)}</span></div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {subTab === 'Cashflow' && (
        <Card>
          <div className="p-4">
            <h3 className="font-semibold text-slate-800 mb-4">Cashflow — 12 derniers mois</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm mb-6">
                <thead><tr className="text-left text-slate-500 border-b">{['Mois','Entrées','Sorties','Solde net'].map(h => <th key={h} className="pb-2 pr-4 font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {cashflowData.map(d => (
                    <tr key={d.mois} className="border-b hover:bg-slate-50">
                      <td className="py-2 pr-4 font-medium">{d.mois}</td>
                      <td className="py-2 pr-4 text-emerald-600">{fmt(d.entrees)}</td>
                      <td className="py-2 pr-4 text-red-500">{fmt(d.sorties)}</td>
                      <td className={`py-2 font-semibold ${d.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(d.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Barres CSS */}
              <div className="space-y-2">
                {cashflowData.map(d => (
                  <div key={d.mois} className="flex items-center gap-3 text-xs">
                    <div className="w-12 text-right text-slate-500">{d.mois}</div>
                    <div className="flex-1 space-y-1">
                      <div className="h-2 rounded-full bg-emerald-100 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(d.entrees / maxVal) * 100}%` }} /></div>
                      <div className="h-2 rounded-full bg-red-100 overflow-hidden"><div className="h-full bg-red-400 rounded-full" style={{ width: `${(d.sorties / maxVal) * 100}%` }} /></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-emerald-500 rounded inline-block" />Entrées</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-red-400 rounded inline-block" />Sorties</span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
