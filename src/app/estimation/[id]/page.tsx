'use client'
import { useState, useRef } from 'react'
import { estimations } from '@/lib/mock-data/estimations'
import { soumissions } from '@/lib/mock-data/soumissions'
import { Card } from '@/components/ui/Card'
import { Modal, Field, inputCls, selectCls, Btn } from '@/components/ui/Modal'
import { notFound } from 'next/navigation'
import type { Estimation, Poste, SousPoste, LigneCoût } from '@/types'
import {
  ArrowLeft, ChevronDown, ChevronRight, Plus, Trash2,
  Pencil, FileUp, File, X, Download, Copy, FileText,
} from 'lucide-react'
import Link from 'next/link'

/* ─── Utilitaires ─────────────────────────────────────── */
function fmt(n: number) { return n.toLocaleString('fr-CA') }
function uid() { return `_${Math.random().toString(36).slice(2, 9)}` }

function ligneTotal(l: LigneCoût) {
  return l.mo + l.materiaux + l.equipement + l.sousTraitance + l.fraisIndirects
}
function spTotal(sp: SousPoste) {
  return sp.lignes.reduce((a, l) => a + ligneTotal(l), 0)
}
function posteTotal(p: Poste) {
  return p.sousPostes.reduce((a, sp) => a + spTotal(sp), 0)
}
function estimTotal(e: Estimation) {
  return e.postes.reduce((a, p) => a + posteTotal(p), 0)
}

interface DocFichier {
  id: string
  nom: string
  type: string
  taille: string
  date: string
}

/* ─── Composant ligne éditable ────────────────────────── */
function LigneEditable({
  l, onChange, onDelete,
}: {
  l: LigneCoût
  onChange: (updated: LigneCoût) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ ...l })

  function save() {
    onChange(draft)
    setEditing(false)
  }
  function cancel() {
    setDraft({ ...l })
    setEditing(false)
  }

  const total = ligneTotal(l)
  const draftTotal = ligneTotal(draft)

  const numInput = (field: keyof Omit<LigneCoût, 'id' | 'description'>) => (
    <input
      type="number"
      min={0}
      step={100}
      value={draft[field] as number}
      onChange={e => setDraft(d => ({ ...d, [field]: parseFloat(e.target.value) || 0 }))}
      className="w-24 px-2 py-1 text-right text-xs border border-amber-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-400"
    />
  )

  if (editing) {
    return (
      <>
        <tr className="bg-amber-50/60 border-b border-amber-100">
          <td className="px-4 py-2 pl-14" colSpan={7}>
            <div className="flex flex-col gap-2">
              <input
                className="w-full px-2 py-1 text-sm border border-amber-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-400"
                value={draft.description}
                onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                placeholder="Description..."
              />
              <div className="flex flex-wrap gap-3 items-center text-xs">
                <label className="flex items-center gap-1 text-slate-500">MO {numInput('mo')}</label>
                <label className="flex items-center gap-1 text-slate-500">Matériaux {numInput('materiaux')}</label>
                <label className="flex items-center gap-1 text-slate-500">Équip. {numInput('equipement')}</label>
                <label className="flex items-center gap-1 text-slate-500">S/T {numInput('sousTraitance')}</label>
                <label className="flex items-center gap-1 text-slate-500">Frais ind. {numInput('fraisIndirects')}</label>
                <span className="ml-auto font-bold text-slate-800">{fmt(draftTotal)} $</span>
              </div>
              <div className="flex gap-2">
                <button onClick={save} className="px-3 py-1 text-xs rounded-lg text-white font-semibold" style={{ background: '#C9A84C' }}>Sauvegarder</button>
                <button onClick={cancel} className="px-3 py-1 text-xs rounded-lg border border-slate-200 text-slate-600">Annuler</button>
              </div>
            </div>
          </td>
        </tr>
      </>
    )
  }

  return (
    <tr className="hover:bg-amber-50/30 transition group border-b border-slate-50">
      <td className="px-4 py-2 text-sm text-slate-700 pl-14">
        <span>{l.description}</span>
      </td>
      <td className="px-3 py-2 text-right text-sm text-slate-600">{l.mo > 0 ? fmt(l.mo) : '—'}</td>
      <td className="px-3 py-2 text-right text-sm text-slate-600">{l.materiaux > 0 ? fmt(l.materiaux) : '—'}</td>
      <td className="px-3 py-2 text-right text-sm text-slate-600">{l.equipement > 0 ? fmt(l.equipement) : '—'}</td>
      <td className="px-3 py-2 text-right text-sm text-slate-600">{l.sousTraitance > 0 ? fmt(l.sousTraitance) : '—'}</td>
      <td className="px-3 py-2 text-right text-sm text-slate-600">{l.fraisIndirects > 0 ? fmt(l.fraisIndirects) : '—'}</td>
      <td className="px-3 py-2 text-right text-sm font-semibold text-slate-800">
        <div className="flex items-center justify-end gap-2">
          {fmt(total)}
          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition">
            <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-amber-100 text-slate-400 hover:text-amber-600">
              <Pencil size={12} />
            </button>
            <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}

/* ─── Page principale ─────────────────────────────────── */
export default function EstimationDetailPage({ params }: { params: { id: string } }) {
  const original = estimations.find(x => x.id === params.id)
  if (!original) notFound()

  const soumission = soumissions.find(s => s.id === original.soumissionId)

  const [est, setEst] = useState<Estimation>(() => ({
    ...original,
    postes: original.postes.map(p => ({
      ...p,
      sousPostes: p.sousPostes.map(sp => ({
        ...sp,
        lignes: sp.lignes.map(l => ({ ...l })),
      })),
    })),
  }))

  const [openPostes, setOpenPostes] = useState<string[]>(est.postes.map(p => p.id))
  const [marge, setMarge] = useState(original.marge)
  const [toast, setToast] = useState('')

  // Documents
  const [docs, setDocs] = useState<DocFichier[]>([
    { id: 'd1', nom: 'Plans_architecturaux_v2.pdf', type: 'PDF', taille: '4.2 MB', date: '2024-02-10' },
    { id: 'd2', nom: 'Devis_technique.docx', type: 'DOCX', taille: '1.1 MB', date: '2024-02-12' },
  ])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Modals
  const [modalPoste, setModalPoste] = useState(false)
  const [modalSP, setModalSP] = useState<{ open: boolean; posteId: string }>({ open: false, posteId: '' })
  const [modalLigne, setModalLigne] = useState<{ open: boolean; posteId: string; spId: string }>({ open: false, posteId: '', spId: '' })
  const [newNom, setNewNom] = useState('')
  const [newLigne, setNewLigne] = useState<Omit<LigneCoût, 'id'>>({ description: '', mo: 0, materiaux: 0, equipement: 0, sousTraitance: 0, fraisIndirects: 0 })

  const totalBase = estimTotal(est)
  const totalAvecMarge = totalBase * (1 + marge / 100)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  function togglePoste(id: string) {
    setOpenPostes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  /* ── Édition postes ── */
  function addPoste() {
    if (!newNom.trim()) return
    const poste: Poste = { id: uid(), nom: newNom.trim(), sousPostes: [] }
    setEst(e => ({ ...e, postes: [...e.postes, poste] }))
    setOpenPostes(p => [...p, poste.id])
    setNewNom('')
    setModalPoste(false)
    showToast(`Poste « ${poste.nom} » ajouté.`)
  }
  function deletePoste(pId: string) {
    setEst(e => ({ ...e, postes: e.postes.filter(p => p.id !== pId) }))
  }
  function renamePoste(pId: string, nom: string) {
    setEst(e => ({ ...e, postes: e.postes.map(p => p.id === pId ? { ...p, nom } : p) }))
  }

  /* ── Édition sous-postes ── */
  function addSousPoste() {
    if (!newNom.trim()) return
    const sp: SousPoste = { id: uid(), nom: newNom.trim(), lignes: [] }
    setEst(e => ({
      ...e,
      postes: e.postes.map(p =>
        p.id === modalSP.posteId ? { ...p, sousPostes: [...p.sousPostes, sp] } : p
      ),
    }))
    setNewNom('')
    setModalSP({ open: false, posteId: '' })
    showToast(`Sous-poste « ${sp.nom} » ajouté.`)
  }
  function deleteSousPoste(pId: string, spId: string) {
    setEst(e => ({
      ...e,
      postes: e.postes.map(p =>
        p.id === pId ? { ...p, sousPostes: p.sousPostes.filter(sp => sp.id !== spId) } : p
      ),
    }))
  }

  /* ── Édition lignes ── */
  function addLigne() {
    if (!newLigne.description.trim()) return
    const ligne: LigneCoût = { id: uid(), ...newLigne }
    setEst(e => ({
      ...e,
      postes: e.postes.map(p =>
        p.id === modalLigne.posteId
          ? {
              ...p,
              sousPostes: p.sousPostes.map(sp =>
                sp.id === modalLigne.spId ? { ...sp, lignes: [...sp.lignes, ligne] } : sp
              ),
            }
          : p
      ),
    }))
    setNewLigne({ description: '', mo: 0, materiaux: 0, equipement: 0, sousTraitance: 0, fraisIndirects: 0 })
    setModalLigne({ open: false, posteId: '', spId: '' })
    showToast('Ligne ajoutée.')
  }
  function updateLigne(pId: string, spId: string, updated: LigneCoût) {
    setEst(e => ({
      ...e,
      postes: e.postes.map(p =>
        p.id === pId
          ? {
              ...p,
              sousPostes: p.sousPostes.map(sp =>
                sp.id === spId
                  ? { ...sp, lignes: sp.lignes.map(l => l.id === updated.id ? updated : l) }
                  : sp
              ),
            }
          : p
      ),
    }))
  }
  function deleteLigne(pId: string, spId: string, lId: string) {
    setEst(e => ({
      ...e,
      postes: e.postes.map(p =>
        p.id === pId
          ? {
              ...p,
              sousPostes: p.sousPostes.map(sp =>
                sp.id === spId ? { ...sp, lignes: sp.lignes.filter(l => l.id !== lId) } : sp
              ),
            }
          : p
      ),
    }))
  }

  /* ── Documents ── */
  function handleFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(ev.target.files ?? [])
    const newDocs: DocFichier[] = files.map(f => ({
      id: uid(),
      nom: f.name,
      type: f.name.split('.').pop()?.toUpperCase() ?? 'FICHIER',
      taille: f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`,
      date: new Date().toISOString().slice(0, 10),
    }))
    setDocs(d => [...d, ...newDocs])
    showToast(`${files.length} fichier${files.length > 1 ? 's' : ''} ajouté${files.length > 1 ? 's' : ''}.`)
    ev.target.value = ''
  }
  function deleteDoc(id: string) {
    setDocs(d => d.filter(x => x.id !== id))
  }

  const categories = ['MO', 'Matériaux', 'Équipement', 'Sous-traitance', 'Frais ind.']
  const catTotals = est.postes.reduce((acc, p) => {
    p.sousPostes.forEach(sp => sp.lignes.forEach(l => {
      acc[0] += l.mo; acc[1] += l.materiaux; acc[2] += l.equipement
      acc[3] += l.sousTraitance; acc[4] += l.fraisIndirects
    }))
    return acc
  }, [0, 0, 0, 0, 0])

  return (
    <div className="space-y-5 max-w-full">
      {/* Toast */}
      {toast && (
        <div className="fixed z-50 px-5 py-3 bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg" style={{ top: 80, right: 24 }}>
          {toast}
        </div>
      )}

      {/* ── En-tête ── */}
      <div className="flex items-start gap-3 flex-wrap">
        <Link href="/estimation" className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 mt-0.5">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-amber-600 font-semibold">{est.soumissionNumero} · v{est.version}</p>
          <h2 className="text-lg font-bold text-slate-800 leading-tight">{est.titre}</h2>
          {soumission && (
            <p className="text-xs text-slate-400 mt-0.5">
              Client : <span className="text-slate-600">{est.clientNom}</span>
              {est.estimateurNom && <>{' · '}Estimateur : <span className="text-slate-600">{est.estimateurNom}</span></>}
              {soumission.dateDepot && <>{' · '}Dépôt : <span className="text-slate-600">{new Date(soumission.dateDepot).toLocaleDateString('fr-CA')}</span></>}
            </p>
          )}
          {!soumission && (est.clientNom || est.estimateurNom) && (
            <p className="text-xs text-slate-400 mt-0.5">
              {est.clientNom && <>Client : <span className="text-slate-600">{est.clientNom}</span></>}
              {est.estimateurNom && <>{' · '}Estimateur : <span className="text-slate-600">{est.estimateurNom}</span></>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {soumission && (
            <Link href={`/soumissions/${est.soumissionId}`} className="text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
              ← Soumission liée
            </Link>
          )}
          <button
            onClick={() => showToast('Estimation dupliquée.')}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            <Copy size={13} /> Dupliquer
          </button>
          <button
            onClick={() => showToast('Export PDF en cours...')}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg text-white font-semibold transition"
            style={{ background: '#0D1B2A' }}
          >
            <FileText size={13} /> Exporter PDF
          </button>
        </div>
      </div>

      {/* ── KPI par catégorie ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {categories.map((cat, i) => (
          <Card key={cat} className="text-center">
            <p className="text-xs text-slate-400 mb-1">{cat}</p>
            <p className="text-sm font-bold text-slate-800">{fmt(Math.round(catTotals[i]))} $</p>
            <p className="text-xs text-slate-400">{totalBase > 0 ? ((catTotals[i] / totalBase) * 100).toFixed(0) : 0}%</p>
          </Card>
        ))}
      </div>

      {/* ── Corps principal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Tableau d'estimation */}
        <div className="lg:col-span-3 space-y-4">
          <Card padding={false}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Postes d'estimation</h3>
              <button
                onClick={() => { setNewNom(''); setModalPoste(true) }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white font-semibold"
                style={{ background: '#C9A84C', color: '#0D1B2A' }}
              >
                <Plus size={13} /> Ajouter un poste
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-500">MO</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-500">Matériaux</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-500">Équip.</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-500">S/T</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-500">Frais ind.</th>
                    <th className="text-right px-3 py-3 font-semibold text-slate-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {est.postes.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-sm text-slate-400 py-10">
                        Aucun poste — cliquez sur « Ajouter un poste » pour commencer.
                      </td>
                    </tr>
                  )}
                  {est.postes.map(p => {
                    const pTot = posteTotal(p)
                    const isOpen = openPostes.includes(p.id)
                    return (
                      <>
                        {/* Ligne poste */}
                        <tr key={p.id} className="border-b border-slate-200 bg-slate-100/60 group">
                          <td
                            className="px-4 py-2.5 font-semibold text-slate-800 cursor-pointer"
                            onClick={() => togglePoste(p.id)}
                          >
                            <div className="flex items-center gap-2">
                              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              <EditableText
                                value={p.nom}
                                onChange={v => renamePoste(p.id, v)}
                                className="font-semibold text-slate-800"
                              />
                            </div>
                          </td>
                          <td colSpan={5} />
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-bold text-slate-800">{fmt(Math.round(pTot))}</span>
                              <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                                <button
                                  onClick={() => { setNewNom(''); setModalSP({ open: true, posteId: p.id }) }}
                                  className="p-1 rounded hover:bg-amber-100 text-slate-400 hover:text-amber-600"
                                  title="Ajouter sous-poste"
                                >
                                  <Plus size={12} />
                                </button>
                                <button
                                  onClick={() => deletePoste(p.id)}
                                  className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400"
                                  title="Supprimer le poste"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* Sous-postes */}
                        {isOpen && p.sousPostes.map(sp => (
                          <>
                            <tr key={sp.id} className="border-b border-slate-100 bg-slate-50/40 group/sp">
                              <td colSpan={7} className="px-4 py-1.5 pl-8">
                                <div className="flex items-center justify-between">
                                  <EditableText
                                    value={sp.nom}
                                    onChange={v => setEst(e => ({
                                      ...e,
                                      postes: e.postes.map(pp =>
                                        pp.id === p.id ? {
                                          ...pp,
                                          sousPostes: pp.sousPostes.map(s => s.id === sp.id ? { ...s, nom: v } : s),
                                        } : pp
                                      ),
                                    }))}
                                    className="text-xs font-semibold text-slate-500 uppercase tracking-wide"
                                  />
                                  <div className="opacity-0 group-hover/sp:opacity-100 flex gap-1">
                                    <button
                                      onClick={() => { setNewLigne({ description: '', mo: 0, materiaux: 0, equipement: 0, sousTraitance: 0, fraisIndirects: 0 }); setModalLigne({ open: true, posteId: p.id, spId: sp.id }) }}
                                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100"
                                    >
                                      <Plus size={10} /> Ligne
                                    </button>
                                    <button
                                      onClick={() => deleteSousPoste(p.id, sp.id)}
                                      className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                            {sp.lignes.map(l => (
                              <LigneEditable
                                key={l.id}
                                l={l}
                                onChange={updated => updateLigne(p.id, sp.id, updated)}
                                onDelete={() => deleteLigne(p.id, sp.id, l.id)}
                              />
                            ))}
                            {sp.lignes.length === 0 && (
                              <tr>
                                <td colSpan={7} className="pl-14 py-2 text-xs text-slate-300 italic">
                                  Aucune ligne — survolez pour en ajouter.
                                </td>
                              </tr>
                            )}
                          </>
                        ))}

                        {/* Bouton ajouter sous-poste dans le poste ouvert */}
                        {isOpen && (
                          <tr>
                            <td colSpan={7} className="px-4 py-2 pl-8">
                              <button
                                onClick={() => { setNewNom(''); setModalSP({ open: true, posteId: p.id }) }}
                                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-600 transition"
                              >
                                <Plus size={12} /> Ajouter un sous-poste
                              </button>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}

                  {/* Totaux */}
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-800 text-sm">TOTAL DE BASE</td>
                    <td colSpan={5} />
                    <td className="px-3 py-3 text-right font-bold text-slate-800 text-sm">{fmt(Math.round(totalBase))} $</td>
                  </tr>
                  <tr style={{ background: 'rgba(201,168,76,0.08)' }}>
                    <td className="px-4 py-3 font-bold text-sm" style={{ color: '#C9A84C' }}>TOTAL AVEC MARGE ({marge}%)</td>
                    <td colSpan={5} />
                    <td className="px-3 py-3 text-right font-bold text-lg" style={{ color: '#C9A84C' }}>{fmt(Math.round(totalAvecMarge))} $</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* ── Documents ── */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Documents ({docs.length})</h3>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition"
              >
                <FileUp size={13} /> Ajouter des fichiers
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            {docs.length === 0 ? (
              <div
                className="border-2 border-dashed border-slate-200 rounded-xl py-10 flex flex-col items-center gap-2 text-slate-400 cursor-pointer hover:border-amber-300 transition"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp size={28} />
                <p className="text-sm">Glisser-déposer ou cliquer pour ajouter</p>
                <p className="text-xs">PDF, DOCX, DWG, XLSX, etc.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {docs.map(d => (
                  <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 group transition">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                      <File size={14} className="text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{d.nom}</p>
                      <p className="text-xs text-slate-400">{d.type} · {d.taille} · {d.date}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => showToast(`Téléchargement de ${d.nom}...`)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => deleteDoc(d.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-600 mt-2 transition"
                >
                  <Plus size={12} /> Ajouter d'autres fichiers
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* Panneau latéral */}
        <div className="space-y-4">
          {/* Simulation marge */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Simulation marge</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Marge</span><span className="font-bold text-slate-800">{marge}%</span>
                </div>
                <input
                  type="range" min={3} max={30} step={0.5}
                  value={marge}
                  onChange={ev => setMarge(parseFloat(ev.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-xs text-slate-300 mt-0.5"><span>3%</span><span>30%</span></div>
                <button
                  className="mt-2 w-full text-xs px-3 py-2 rounded-lg border border-amber-200 hover:bg-amber-50 transition text-amber-700 font-semibold"
                  onClick={() => showToast(`Marge de ${marge}% sauvegardée.`)}
                >
                  Sauvegarder la marge
                </button>
              </div>
              <div className="pt-3 border-t border-slate-100 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Coût de base</span>
                  <span className="font-semibold">{fmt(Math.round(totalBase))} $</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Marge ({marge}%)</span>
                  <span className="font-semibold text-emerald-600">{fmt(Math.round(totalBase * marge / 100))} $</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-bold text-slate-800">Prix de vente</span>
                  <span className="font-bold text-lg" style={{ color: '#C9A84C' }}>{fmt(Math.round(totalAvecMarge))} $</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Actions rapides */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => setMarge(original.marge)}
                className="w-full text-left text-xs px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-600"
              >
                Réinitialiser la marge ({original.marge}%)
              </button>
              <button
                onClick={() => showToast('Estimation dupliquée.')}
                className="w-full text-left text-xs px-3 py-2 rounded-lg border border-amber-200 hover:bg-amber-50 transition text-amber-700"
              >
                <Copy size={11} className="inline mr-1" /> Dupliquer l'estimation
              </button>
              <button
                onClick={() => showToast('Export PDF en cours...')}
                className="w-full text-xs px-3 py-2 rounded-lg text-white transition font-semibold"
                style={{ background: '#0D1B2A' }}
              >
                <FileText size={11} className="inline mr-1" /> Exporter PDF
              </button>
            </div>
          </Card>

          {/* Infos */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Informations</h3>
            <div className="space-y-2 text-xs text-slate-500">
              <div className="flex justify-between"><span>Version</span><span className="font-semibold text-slate-700">v{est.version}</span></div>
              <div className="flex justify-between"><span>Créée le</span><span className="text-slate-700">{new Date(est.createdAt).toLocaleDateString('fr-CA')}</span></div>
              <div className="flex justify-between"><span>Mise à jour</span><span className="text-slate-700">{new Date(est.updatedAt).toLocaleDateString('fr-CA')}</span></div>
              <div className="flex justify-between"><span>Postes</span><span className="font-semibold text-slate-700">{est.postes.length}</span></div>
              <div className="flex justify-between">
                <span>Lignes</span>
                <span className="font-semibold text-slate-700">
                  {est.postes.reduce((a, p) => a + p.sousPostes.reduce((b, sp) => b + sp.lignes.length, 0), 0)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── MODAL : Nouveau poste ── */}
      <Modal open={modalPoste} onClose={() => setModalPoste(false)} title="Nouveau poste" size="sm">
        <form onSubmit={e => { e.preventDefault(); addPoste() }} className="space-y-4">
          <Field label="Nom du poste" required>
            <input
              className={inputCls}
              placeholder="Ex. Travaux préparatoires"
              value={newNom}
              onChange={e => setNewNom(e.target.value)}
              autoFocus
              required
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Btn variant="secondary" type="button" onClick={() => setModalPoste(false)}>Annuler</Btn>
            <Btn type="submit">Créer le poste</Btn>
          </div>
        </form>
      </Modal>

      {/* ── MODAL : Nouveau sous-poste ── */}
      <Modal open={modalSP.open} onClose={() => setModalSP({ open: false, posteId: '' })} title="Nouveau sous-poste" size="sm">
        <form onSubmit={e => { e.preventDefault(); addSousPoste() }} className="space-y-4">
          <Field label="Nom du sous-poste" required>
            <input
              className={inputCls}
              placeholder="Ex. Signalisation et sécurité"
              value={newNom}
              onChange={e => setNewNom(e.target.value)}
              autoFocus
              required
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Btn variant="secondary" type="button" onClick={() => setModalSP({ open: false, posteId: '' })}>Annuler</Btn>
            <Btn type="submit">Créer le sous-poste</Btn>
          </div>
        </form>
      </Modal>

      {/* ── MODAL : Nouvelle ligne de coût ── */}
      <Modal open={modalLigne.open} onClose={() => setModalLigne({ open: false, posteId: '', spId: '' })} title="Nouvelle ligne de coût" size="md">
        <form onSubmit={e => { e.preventDefault(); addLigne() }} className="space-y-4">
          <Field label="Description" required>
            <input
              className={inputCls}
              placeholder="Ex. Tuyau HDPE DN300 — 4200 ml"
              value={newLigne.description}
              onChange={e => setNewLigne(l => ({ ...l, description: e.target.value }))}
              autoFocus
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {([
              ['Main-d\'œuvre (MO)', 'mo'],
              ['Matériaux', 'materiaux'],
              ['Équipement', 'equipement'],
              ['Sous-traitance', 'sousTraitance'],
              ['Frais indirects', 'fraisIndirects'],
            ] as [string, keyof Omit<LigneCoût, 'id' | 'description'>][]).map(([label, field]) => (
              <Field key={field} label={label}>
                <input
                  type="number"
                  min={0}
                  step={100}
                  className={inputCls}
                  value={newLigne[field]}
                  onChange={e => setNewLigne(l => ({ ...l, [field]: parseFloat(e.target.value) || 0 }))}
                />
              </Field>
            ))}
            <div className="flex items-end pb-1">
              <div className="w-full p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-600 mb-0.5">Total ligne</p>
                <p className="text-lg font-bold text-amber-700">{fmt(ligneTotal(newLigne as LigneCoût))} $</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Btn variant="secondary" type="button" onClick={() => setModalLigne({ open: false, posteId: '', spId: '' })}>Annuler</Btn>
            <Btn type="submit">Ajouter la ligne</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}

/* ── Composant texte éditable au double-clic ── */
function EditableText({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (editing) {
    return (
      <input
        className="bg-white border border-amber-300 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 min-w-0 w-full"
        value={draft}
        autoFocus
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { onChange(draft); setEditing(false) }}
        onKeyDown={e => { if (e.key === 'Enter') { onChange(draft); setEditing(false) } if (e.key === 'Escape') setEditing(false) }}
        onClick={e => e.stopPropagation()}
      />
    )
  }

  return (
    <span
      className={`cursor-text hover:underline decoration-dashed decoration-slate-300 ${className ?? ''}`}
      onDoubleClick={e => { e.stopPropagation(); setDraft(value); setEditing(true) }}
      title="Double-cliquer pour modifier"
    >
      {value}
    </span>
  )
}
