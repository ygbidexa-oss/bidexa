'use client'
import { useState, useRef } from 'react'
import { getSoumissions, upsertSoumission } from '@/lib/soumissions-store'
import { lierDocumentsSoumissionAuProjet } from '@/lib/documents-store'
import { estimations } from '@/lib/mock-data/estimations'
import { projets } from '@/lib/mock-data/projets'
import { useEntreprise } from '@/hooks/useEntreprise'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal, Field, inputCls, selectCls, Btn } from '@/components/ui/Modal'
import { notFound } from 'next/navigation'
import {
  ArrowLeft, CheckCircle, Circle, ChevronDown, Pencil, Plus,
  Trash2, FileUp, File, X, Download, FileText, Check,
} from 'lucide-react'
import Link from 'next/link'
import { DocumentsSection } from '@/components/documents/DocumentsSection'

/* ─────────────── Utilitaires ─────────────────────────────── */
function fmt(n: number) { return n.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function uid() { return `_${Math.random().toString(36).slice(2, 9)}` }

const typeLabels: Record<string, string> = {
  appel_offre_public: 'Appel d\'offre public',
  appel_offre_prive: 'Appel d\'offre privé',
  soumission_directe: 'Soumission directe',
  demande_de_prix: 'Demande de prix',
}
const statutOptions = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'en_preparation', label: 'En préparation' },
  { value: 'en_validation', label: 'En validation' },
  { value: 'deposee', label: 'Déposée' },
  { value: 'gagnee', label: 'Gagnée' },
  { value: 'perdue', label: 'Perdue' },
  { value: 'annulee', label: 'Annulée' },
]

interface LignePrix { id: string; poste: string; montant: number; unite: string; notes: string }
interface DocJoint { id: string; nom: string; type: string; taille: string; date: string }

/* ─────────────── Composant section éditable ─────────────── */
function Section({
  title, onEdit, children,
}: { title: string; onEdit?: () => void; children: React.ReactNode }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</h3>
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1 text-xs text-amber-600 hover:underline font-semibold"
          >
            <Pencil size={11} /> Modifier
          </button>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

/* ─────────────── Page principale ────────────────────────── */
export default function SoumissionDetailPage({ params }: { params: { id: string } }) {
  const s = getSoumissions().find(x => x.id === params.id)
  if (!s) notFound()

  const { entreprise } = useEntreprise()
  const projet = projets.find(p => p.soumissionId === s.id)
  const estLiee = estimations.find(e => e.soumissionId === s.id)

  /* ── État global de l'offre — initialisé depuis le profil entreprise ── */
  const [offre, setOffre] = useState({
    entrepriseNom: entreprise?.nom ?? 'Mon Entreprise',
    entrepriseAdresse: entreprise ? `${entreprise.adresse}, ${entreprise.ville}, ${entreprise.province}  ${entreprise.codePostal}`.trim().replace(/^,\s*/, '') : '',
    entrepriseTel: entreprise?.telephone ?? '',
    entrepriseEmail: entreprise?.email ?? '',
    entreprisePermis: entreprise?.permisRBQ ?? '',
    objetDescription: s.titre,
    description: s.description ?? '',
    portee: '',
    tps: true,
    tvq: true,
    dateDebut: '',
    dureeJours: '',
    validiteJours: '60',
    modePaiement: 'Net 30',
    cautionnement: false,
    garantieAns: '1',
    signataireNom: '',
    signatairePoste: 'Estimateur principal',
    dateSignature: new Date().toISOString().slice(0, 10),
  })

  const [lignesPrix, setLignesPrix] = useState<LignePrix[]>([
    { id: uid(), poste: 'Travaux préparatoires', montant: 0, unite: 'forfait', notes: '' },
  ])
  const [docs, setDocs] = useState<DocJoint[]>([])
  const [checklist, setChecklist] = useState(s.checklist.map(i => ({ ...i })))
  const [statut, setStatut] = useState(s.statut)
  const [statutMenu, setStatutMenu] = useState(false)
  const [toast, setToast] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Modals
  const [modalEntreprise, setModalEntreprise] = useState(false)
  const [modalObjet, setModalObjet] = useState(false)
  const [modalDescription, setModalDescription] = useState(false)
  const [modalDelais, setModalDelais] = useState(false)
  const [modalConditions, setModalConditions] = useState(false)
  const [modalSignature, setModalSignature] = useState(false)

  // Drafts pour les modals
  const [draft, setDraft] = useState({ ...offre })

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }
  function openModal(setter: (v: boolean) => void) { setDraft({ ...offre }); setter(true) }
  function saveModal(setter: (v: boolean) => void) { setOffre({ ...draft }); setter(false); showToast('Section mise à jour.') }

  /* ── Calculs prix ── */
  const sousTotal = lignesPrix.reduce((a, l) => a + (l.montant || 0), 0)
  const tpsAmt = offre.tps ? sousTotal * 0.05 : 0
  const tvqAmt = offre.tvq ? sousTotal * 0.09975 : 0
  const totalTTC = sousTotal + tpsAmt + tvqAmt

  /* ── Lignes prix ── */
  function addLigne() {
    setLignesPrix(l => [...l, { id: uid(), poste: '', montant: 0, unite: 'forfait', notes: '' }])
  }
  function updateLigne(id: string, field: keyof LignePrix, val: string | number) {
    setLignesPrix(l => l.map(x => x.id === id ? { ...x, [field]: val } : x))
  }
  function deleteLigne(id: string) {
    setLignesPrix(l => l.filter(x => x.id !== id))
  }
  function importFromEstimation() {
    if (!estLiee) return
    const nouvelles: LignePrix[] = estLiee.postes.map(p => ({
      id: uid(),
      poste: p.nom,
      montant: Math.round(p.sousPostes.reduce((a, sp) =>
        a + sp.lignes.reduce((b, l) => b + l.mo + l.materiaux + l.equipement + l.sousTraitance + l.fraisIndirects, 0), 0
      ) * (1 + estLiee.marge / 100)),
      unite: 'forfait',
      notes: '',
    }))
    setLignesPrix(nouvelles)
    showToast(`${nouvelles.length} postes importés depuis l'estimation.`)
  }

  /* ── Documents ── */
  function handleFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(ev.target.files ?? [])
    setDocs(d => [...d, ...files.map(f => ({
      id: uid(),
      nom: f.name,
      type: f.name.split('.').pop()?.toUpperCase() ?? 'FICHIER',
      taille: f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`,
      date: new Date().toISOString().slice(0, 10),
    }))])
    showToast(`${files.length} fichier${files.length > 1 ? 's' : ''} ajouté${files.length > 1 ? 's' : ''}.`)
    ev.target.value = ''
  }

  const checkDone = checklist.filter(c => c.done).length

  /* ── Durée → date fin ── */
  function computeDateFin(debut: string, duree: string) {
    if (!debut || !duree) return ''
    const d = new Date(debut)
    d.setDate(d.getDate() + parseInt(duree))
    return d.toISOString().slice(0, 10)
  }
  const dateFinPrevue = computeDateFin(offre.dateDebut, offre.dureeJours)

  return (
    <div className="space-y-4 max-w-6xl">
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* ── En-tête page ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/soumissions" className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-slate-800">{s.numero}</h2>
            <Badge status={statut} />
            <span className="text-xs text-slate-400">{typeLabels[s.type]}</span>
          </div>
          <p className="text-sm text-slate-500 truncate">{s.titre}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Statut dropdown */}
          <div className="relative">
            <button
              onClick={() => setStatutMenu(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Statut <ChevronDown size={13} />
            </button>
            {statutMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-100 rounded-xl shadow-xl z-30">
                {statutOptions.map(opt => (
                  <button
                    key={opt.value}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-amber-50 transition first:rounded-t-xl last:rounded-b-xl ${statut === opt.value ? 'font-bold text-amber-600' : 'text-slate-700'}`}
                    onClick={() => {
                        const newStatut = opt.value as typeof s.statut
                        setStatut(newStatut)
                        // Persister le changement de statut
                        upsertSoumission({ ...s, statut: newStatut })
                        // Lier les documents à la soumission vers le projet si gagné
                        if (newStatut === 'gagnee' && projet) {
                          lierDocumentsSoumissionAuProjet(s.id, projet.id, s.titre)
                        }
                        setStatutMenu(false)
                        showToast(`Statut → ${opt.label}`)
                      }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => showToast('Soumission dupliquée.')}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            Dupliquer
          </button>

          <button
            onClick={() => showToast('Génération PDF en cours… Dans un vrai environnement, le PDF serait téléchargé automatiquement.')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition"
            style={{ background: '#0D1B2A' }}
          >
            <FileText size={14} /> Exporter PDF
          </button>

          {statut === 'gagnee' && (
            <Link
              href={projet ? `/projets/${projet.id}` : '/projets'}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: '#C9A84C', color: '#0D1B2A' }}
            >
              Voir le projet →
            </Link>
          )}
        </div>
      </div>

      {/* ── Corps 2 colonnes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* ── Colonne gauche ── */}
        <div className="space-y-4">
          {/* Infos de base */}
          <Card>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Infos</h3>
            <div className="space-y-2 text-xs">
              <Row label="Client" value={s.clientNom} bold />
              <Row label="Estimateur" value={s.estimateurNom} />
              <Row label="Réception" value={new Date(s.dateReception).toLocaleDateString('fr-CA')} />
              <Row label="Dépôt" value={new Date(s.dateDepot).toLocaleDateString('fr-CA')} bold />
              <Row label="Prix soumis" value={s.prixSoumis > 0 ? `${s.prixSoumis.toLocaleString('fr-CA')} $` : '—'} bold />
              <Row label="Marge" value={s.marge > 0 ? `${s.marge}%` : '—'} />
              <Row label="Version" value={`v${s.version}`} />
              {estLiee && (
                <div className="pt-2 mt-2 border-t border-slate-100">
                  <Link href={`/estimation/${estLiee.id}`} className="text-amber-600 hover:underline font-semibold">
                    → Estimation liée
                  </Link>
                </div>
              )}
            </div>
          </Card>

          {/* Checklist */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Checklist</h3>
              <span className="text-xs text-slate-400">{checkDone}/{checklist.length}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full mb-3">
              <div className="h-1.5 rounded-full bg-emerald-400 transition-all" style={{ width: `${checklist.length > 0 ? (checkDone / checklist.length) * 100 : 0}%` }} />
            </div>
            {checklist.map(item => (
              <button
                key={item.id}
                className="flex items-center gap-2 text-xs w-full text-left hover:bg-slate-50 rounded px-1 py-1 transition"
                onClick={() => setChecklist(prev => prev.map(i => i.id === item.id ? { ...i, done: !i.done } : i))}
              >
                {item.done
                  ? <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                  : <Circle size={14} className="text-slate-300 shrink-0" />}
                <span className={item.done ? 'line-through text-slate-400' : 'text-slate-600'}>{item.label}</span>
              </button>
            ))}
          </Card>

          {/* Validité */}
          <Card>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Validité de l'offre</h3>
            <p className="text-2xl font-bold text-slate-800">{offre.validiteJours} <span className="text-sm font-normal text-slate-400">jours</span></p>
            <p className="text-xs text-slate-400 mt-1">Mode paiement : {offre.modePaiement}</p>
            <p className="text-xs text-slate-400">Garantie : {offre.garantieAns} an{parseInt(offre.garantieAns) > 1 ? 's' : ''}</p>
            <p className="text-xs text-slate-400">Cautionnement : {offre.cautionnement ? 'Oui' : 'Non'}</p>
          </Card>
        </div>

        {/* ── Colonne droite — document de l'offre ── */}
        <div className="lg:col-span-3 space-y-3">

          {/* 1. En-tête entreprise */}
          <Section title="1. En-tête de l'entreprise soumissionnaire" onEdit={() => openModal(setModalEntreprise)}>
            <div className="flex items-start gap-6">
              {entreprise?.logo ? (
                <img src={entreprise.logo} alt="Logo" className="w-16 h-16 rounded-xl object-contain border border-slate-200 bg-slate-50 shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black shrink-0" style={{ background: '#0D1B2A', color: '#C9A84C' }}>
                  {offre.entrepriseNom.charAt(0)}
                </div>
              )}
              <div className="space-y-0.5 text-sm">
                <p className="font-bold text-slate-800 text-base">{offre.entrepriseNom}</p>
                <p className="text-slate-500">{offre.entrepriseAdresse}</p>
                <p className="text-slate-500">Tél. : {offre.entrepriseTel}</p>
                <p className="text-slate-500">Courriel : {offre.entrepriseEmail}</p>
                <p className="text-xs text-slate-400 mt-1">Permis : {offre.entreprisePermis}</p>
              </div>
            </div>
          </Section>

          {/* 2. Objet de l'offre */}
          <Section title="2. Objet de l'offre" onEdit={() => openModal(setModalObjet)}>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
              <Row label="Appel d'offres" value={s.numero} bold />
              <Row label="Client donneur d'ordre" value={s.clientNom} bold />
              <Row label="Type" value={typeLabels[s.type]} />
              <Row label="Date de dépôt" value={new Date(s.dateDepot).toLocaleDateString('fr-CA')} />
              <div className="col-span-2 pt-2">
                <p className="text-slate-500 text-xs mb-0.5">Objet de la soumission</p>
                <p className="text-slate-800 font-semibold">{offre.objetDescription}</p>
              </div>
            </div>
          </Section>

          {/* 3. Description & portée */}
          <Section title="3. Description & portée des travaux" onEdit={() => openModal(setModalDescription)}>
            {offre.description ? (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{offre.description}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">Cliquez sur Modifier pour rédiger la description et la portée des travaux...</p>
            )}
            {offre.portee && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Portée détaillée</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{offre.portee}</p>
              </div>
            )}
          </Section>

          {/* 4. Tableau des prix */}
          <Section title="4. Tableau des prix">
            <div className="space-y-3">
              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={addLigne}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition"
                >
                  <Plus size={12} /> Ajouter une ligne
                </button>
                {estLiee && (
                  <button
                    onClick={importFromEstimation}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition"
                  >
                    <Download size={12} /> Importer depuis l'estimation ({estLiee.postes.length} postes)
                  </button>
                )}
              </div>

              {/* Lignes */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wide">
                      <th className="text-left py-2 pr-3 w-1/2">Description du poste / item</th>
                      <th className="text-right py-2 px-2 w-28">Montant ($)</th>
                      <th className="text-left py-2 px-2 w-24">Unité</th>
                      <th className="text-left py-2 px-2">Notes</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {lignesPrix.map((l, i) => (
                      <tr key={l.id} className={`border-b border-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                        <td className="py-1.5 pr-3">
                          <input
                            className="w-full bg-transparent text-slate-800 text-sm border-0 border-b border-transparent focus:border-amber-300 focus:outline-none px-0 py-0.5"
                            value={l.poste}
                            placeholder="Description..."
                            onChange={e => updateLigne(l.id, 'poste', e.target.value)}
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            min={0}
                            step={100}
                            className="w-full bg-transparent text-right text-slate-800 font-semibold text-sm border-0 border-b border-transparent focus:border-amber-300 focus:outline-none px-0 py-0.5"
                            value={l.montant || ''}
                            placeholder="0"
                            onChange={e => updateLigne(l.id, 'montant', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <select
                            className="w-full bg-transparent text-xs text-slate-500 border-0 focus:outline-none"
                            value={l.unite}
                            onChange={e => updateLigne(l.id, 'unite', e.target.value)}
                          >
                            <option value="forfait">forfait</option>
                            <option value="m²">m²</option>
                            <option value="m³">m³</option>
                            <option value="ml">ml</option>
                            <option value="heure">heure</option>
                            <option value="unité">unité</option>
                          </select>
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            className="w-full bg-transparent text-xs text-slate-400 border-0 border-b border-transparent focus:border-amber-300 focus:outline-none px-0 py-0.5"
                            value={l.notes}
                            placeholder="Notes optionnelles..."
                            onChange={e => updateLigne(l.id, 'notes', e.target.value)}
                          />
                        </td>
                        <td className="py-1.5 pl-1">
                          <button onClick={() => deleteLigne(l.id)} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition">
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totaux */}
              <div className="border-t border-slate-200 pt-3 space-y-1.5 max-w-xs ml-auto text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total</span>
                  <span className="font-semibold">{fmt(sousTotal)} $</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={offre.tps} onChange={e => setOffre(o => ({ ...o, tps: e.target.checked }))} className="accent-amber-500" />
                    TPS (5%)
                  </label>
                  <span>{fmt(tpsAmt)} $</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={offre.tvq} onChange={e => setOffre(o => ({ ...o, tvq: e.target.checked }))} className="accent-amber-500" />
                    TVQ (9,975%)
                  </label>
                  <span>{fmt(tvqAmt)} $</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800 text-base border-t border-slate-300 pt-2 mt-1">
                  <span>Total TTC</span>
                  <span style={{ color: '#C9A84C' }}>{fmt(totalTTC)} $</span>
                </div>
              </div>
            </div>
          </Section>

          {/* 5. Délais */}
          <Section title="5. Délais & calendrier d'exécution" onEdit={() => openModal(setModalDelais)}>
            {!offre.dateDebut && !offre.dureeJours ? (
              <p className="text-sm text-slate-400 italic">Cliquez sur Modifier pour saisir les délais d'exécution...</p>
            ) : (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Début prévu</p>
                  <p className="font-semibold text-slate-800">{offre.dateDebut ? new Date(offre.dateDebut).toLocaleDateString('fr-CA') : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Durée</p>
                  <p className="font-semibold text-slate-800">{offre.dureeJours ? `${offre.dureeJours} jours` : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Fin prévue</p>
                  <p className="font-semibold text-slate-800">{dateFinPrevue ? new Date(dateFinPrevue).toLocaleDateString('fr-CA') : '—'}</p>
                </div>
              </div>
            )}
          </Section>

          {/* 6. Conditions générales */}
          <Section title="6. Conditions générales" onEdit={() => openModal(setModalConditions)}>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <Row label="Validité de l'offre" value={`${offre.validiteJours} jours`} />
              <Row label="Mode de paiement" value={offre.modePaiement} />
              <Row label="Cautionnement" value={offre.cautionnement ? 'Requis' : 'Non requis'} />
              <Row label="Garantie de parfait achèvement" value={`${offre.garantieAns} an${parseInt(offre.garantieAns) > 1 ? 's' : ''}`} />
              <div className="col-span-2 mt-1 p-3 rounded-lg bg-slate-50 text-xs text-slate-500 leading-relaxed">
                Cette soumission est valide pour une période de {offre.validiteJours} jours à compter de la date de dépôt.
                Les prix indiqués incluent tous les travaux décrits, les matériaux, la main-d'œuvre, l'équipement et les frais généraux.
                Les taxes applicables sont indiquées séparément.
              </div>
            </div>
          </Section>

          {/* 7. Documents joints */}
          <Section title="7. Documents joints">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition"
                >
                  <FileUp size={12} /> Ajouter des fichiers
                </button>
                <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFile} />
              </div>
              {docs.length === 0 ? (
                <div
                  className="border-2 border-dashed border-slate-200 rounded-xl py-8 flex flex-col items-center gap-2 text-slate-400 cursor-pointer hover:border-amber-300 transition text-center"
                  onClick={() => fileRef.current?.click()}
                >
                  <FileUp size={22} />
                  <p className="text-xs">Cliquez ou glissez pour ajouter des documents<br />(plans, devis, addenda, cautionnements…)</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {docs.map(d => (
                    <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 group transition">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                        <File size={13} className="text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{d.nom}</p>
                        <p className="text-xs text-slate-400">{d.type} · {d.taille} · {d.date}</p>
                      </div>
                      <button onClick={() => setDocs(x => x.filter(i => i.id !== d.id))} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => fileRef.current?.click()} className="text-xs text-slate-400 hover:text-amber-600 flex items-center gap-1 mt-1 transition">
                    <Plus size={11} /> Ajouter d'autres fichiers
                  </button>
                </div>
              )}
            </div>
          </Section>

          {/* Documents centralisés */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Documents liés à cette soumission</h3>
            </div>
            <div className="p-4">
              <DocumentsSection lienType="soumission" refId={s.id} refLabel={s.numero} />
            </div>
          </div>

          {/* 8. Signature */}
          <Section title="8. Signature & engagement" onEdit={() => openModal(setModalSignature)}>
            <div className="flex items-end gap-12 flex-wrap">
              <div>
                <p className="text-xs text-slate-400 mb-1">Signataire autorisé</p>
                {offre.signataireNom ? (
                  <>
                    <p className="font-bold text-slate-800">{offre.signataireNom}</p>
                    <p className="text-xs text-slate-500">{offre.signatairePoste}</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 italic">Non complété</p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Date de signature</p>
                <p className="font-semibold text-slate-800">{new Date(offre.dateSignature).toLocaleDateString('fr-CA')}</p>
              </div>
              <div className="flex-1 min-w-48">
                <p className="text-xs text-slate-400 mb-1">Signature</p>
                <div className="h-10 border-b-2 border-slate-300" />
              </div>
              <div className="flex-1 min-w-48">
                <p className="text-xs text-slate-400 mb-1">Cachet de l'entreprise</p>
                <div className="h-10 border-b-2 border-slate-300" />
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400 leading-relaxed">
              Je soussigné(e), dûment autorisé(e) à engager <strong>{offre.entrepriseNom}</strong>, déclare que les
              renseignements fournis dans cette soumission sont exacts et que l'entreprise s'engage à exécuter les
              travaux décrits aux conditions et prix mentionnés ci-dessus.
            </p>
          </Section>
        </div>
      </div>

      {/* ══ MODALS ══ */}

      {/* Entreprise */}
      <Modal open={modalEntreprise} onClose={() => setModalEntreprise(false)} title="Modifier — En-tête entreprise" size="md">
        <form onSubmit={e => { e.preventDefault(); saveModal(setModalEntreprise) }} className="space-y-3">
          <Field label="Nom de l'entreprise"><input className={inputCls} value={draft.entrepriseNom} onChange={e => setDraft(d => ({ ...d, entrepriseNom: e.target.value }))} /></Field>
          <Field label="Adresse complète"><input className={inputCls} value={draft.entrepriseAdresse} onChange={e => setDraft(d => ({ ...d, entrepriseAdresse: e.target.value }))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Téléphone"><input className={inputCls} value={draft.entrepriseTel} onChange={e => setDraft(d => ({ ...d, entrepriseTel: e.target.value }))} /></Field>
            <Field label="Courriel"><input type="email" className={inputCls} value={draft.entrepriseEmail} onChange={e => setDraft(d => ({ ...d, entrepriseEmail: e.target.value }))} /></Field>
          </div>
          <Field label="No. permis / licence (ex. RBQ)"><input className={inputCls} value={draft.entreprisePermis} onChange={e => setDraft(d => ({ ...d, entreprisePermis: e.target.value }))} /></Field>
          <div className="flex justify-end gap-2 pt-2"><Btn variant="secondary" type="button" onClick={() => setModalEntreprise(false)}>Annuler</Btn><Btn type="submit">Sauvegarder</Btn></div>
        </form>
      </Modal>

      {/* Objet */}
      <Modal open={modalObjet} onClose={() => setModalObjet(false)} title="Modifier — Objet de l'offre" size="md">
        <form onSubmit={e => { e.preventDefault(); saveModal(setModalObjet) }} className="space-y-3">
          <Field label="Titre / Objet de la soumission"><input className={inputCls} value={draft.objetDescription} onChange={e => setDraft(d => ({ ...d, objetDescription: e.target.value }))} /></Field>
          <div className="flex justify-end gap-2 pt-2"><Btn variant="secondary" type="button" onClick={() => setModalObjet(false)}>Annuler</Btn><Btn type="submit">Sauvegarder</Btn></div>
        </form>
      </Modal>

      {/* Description */}
      <Modal open={modalDescription} onClose={() => setModalDescription(false)} title="Modifier — Description & portée" size="lg">
        <form onSubmit={e => { e.preventDefault(); saveModal(setModalDescription) }} className="space-y-3">
          <Field label="Description générale des travaux">
            <textarea rows={5} className={inputCls} placeholder="Décrivez les travaux proposés, les méthodes, les matériaux..." value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
          </Field>
          <Field label="Portée détaillée (inclusions / exclusions)">
            <textarea rows={5} className={inputCls} placeholder="Précisez les travaux inclus, ceux exclus, les hypothèses, les limites de la prestation..." value={draft.portee} onChange={e => setDraft(d => ({ ...d, portee: e.target.value }))} />
          </Field>
          <div className="flex justify-end gap-2 pt-2"><Btn variant="secondary" type="button" onClick={() => setModalDescription(false)}>Annuler</Btn><Btn type="submit">Sauvegarder</Btn></div>
        </form>
      </Modal>

      {/* Délais */}
      <Modal open={modalDelais} onClose={() => setModalDelais(false)} title="Modifier — Délais d'exécution" size="sm">
        <form onSubmit={e => { e.preventDefault(); saveModal(setModalDelais) }} className="space-y-3">
          <Field label="Date de début prévue"><input type="date" className={inputCls} value={draft.dateDebut} onChange={e => setDraft(d => ({ ...d, dateDebut: e.target.value }))} /></Field>
          <Field label="Durée en jours calendriers"><input type="number" min={1} className={inputCls} placeholder="90" value={draft.dureeJours} onChange={e => setDraft(d => ({ ...d, dureeJours: e.target.value }))} /></Field>
          {draft.dateDebut && draft.dureeJours && (
            <p className="text-xs text-amber-600 font-semibold">Fin prévue : {new Date(computeDateFin(draft.dateDebut, draft.dureeJours)).toLocaleDateString('fr-CA')}</p>
          )}
          <div className="flex justify-end gap-2 pt-2"><Btn variant="secondary" type="button" onClick={() => setModalDelais(false)}>Annuler</Btn><Btn type="submit">Sauvegarder</Btn></div>
        </form>
      </Modal>

      {/* Conditions */}
      <Modal open={modalConditions} onClose={() => setModalConditions(false)} title="Modifier — Conditions générales" size="md">
        <form onSubmit={e => { e.preventDefault(); saveModal(setModalConditions) }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Validité de l'offre (jours)"><input type="number" min={1} className={inputCls} value={draft.validiteJours} onChange={e => setDraft(d => ({ ...d, validiteJours: e.target.value }))} /></Field>
            <Field label="Mode de paiement">
              <select className={selectCls} value={draft.modePaiement} onChange={e => setDraft(d => ({ ...d, modePaiement: e.target.value }))}>
                <option>Net 30</option><option>Net 45</option><option>Net 60</option>
                <option>À la livraison</option><option>Progrès mensuel</option>
              </select>
            </Field>
            <Field label="Garantie de parfait achèvement (ans)"><input type="number" min={0} className={inputCls} value={draft.garantieAns} onChange={e => setDraft(d => ({ ...d, garantieAns: e.target.value }))} /></Field>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={draft.cautionnement} onChange={e => setDraft(d => ({ ...d, cautionnement: e.target.checked }))} className="accent-amber-500 w-4 h-4" />
                Cautionnement requis
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Btn variant="secondary" type="button" onClick={() => setModalConditions(false)}>Annuler</Btn><Btn type="submit">Sauvegarder</Btn></div>
        </form>
      </Modal>

      {/* Signature */}
      <Modal open={modalSignature} onClose={() => setModalSignature(false)} title="Modifier — Signature" size="sm">
        <form onSubmit={e => { e.preventDefault(); saveModal(setModalSignature) }} className="space-y-3">
          <Field label="Nom du signataire"><input className={inputCls} placeholder="Jean-Baptiste Côté" value={draft.signataireNom} onChange={e => setDraft(d => ({ ...d, signataireNom: e.target.value }))} /></Field>
          <Field label="Titre / Poste"><input className={inputCls} value={draft.signatairePoste} onChange={e => setDraft(d => ({ ...d, signatairePoste: e.target.value }))} /></Field>
          <Field label="Date de signature"><input type="date" className={inputCls} value={draft.dateSignature} onChange={e => setDraft(d => ({ ...d, dateSignature: e.target.value }))} /></Field>
          <div className="flex justify-end gap-2 pt-2"><Btn variant="secondary" type="button" onClick={() => setModalSignature(false)}>Annuler</Btn><Btn type="submit">Sauvegarder</Btn></div>
        </form>
      </Modal>
    </div>
  )
}

/* ─── Petit composant Row ─── */
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className={`text-right ${bold ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{value}</span>
    </div>
  )
}
