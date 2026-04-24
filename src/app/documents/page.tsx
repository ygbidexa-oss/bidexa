'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  getDocuments, upsertDocument, archiverDocument, searchDocuments,
  type BidexaDocument, type DocType, type DocScope,
} from '@/lib/documents-store'
import { Card } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { Modal, Field, inputCls, selectCls, Btn } from '@/components/ui/Modal'
import { PageWithAI } from '@/components/layout/PageWithAI'
import {
  Download, Plus, ChevronDown, ChevronRight, Archive,
  EyeOff, Search,
} from 'lucide-react'

const TYPE_ICONS: Record<string, string> = {
  contrat:'📋', plan:'📐', addenda:'📎', soumission:'📄', facture:'🧾',
  rapport:'📊', estimation:'🔢', po:'🛒', assurance:'🛡️', certif:'✅', autre:'📁',
}
const DOC_TYPES: DocType[] = ['contrat','plan','addenda','soumission','facture','rapport','estimation','po','assurance','certif','autre']
const SCOPES: DocScope[] = ['projet','soumission','estimation','fournisseur','po','facture','entreprise']

const TABS = ['Vue globale','Par projet','Par fournisseur','Entreprise','Archivés'] as const
type Tab = typeof TABS[number]

function fmt(d: string) { return new Date(d + 'T12:00:00').toLocaleDateString('fr-CA') }
function uid() { return `doc-${Date.now()}-${Math.random().toString(36).slice(2,6)}` }

const PROJETS_LABELS: Record<string, string> = {
  p1:'Réfection routière — Aylmer', p2:'Agrandissement entrepôt — Phase 2',
  p3:'Rénovation aqueduc — Masson', p4:'Maintenance HQ', p5:'Rénovation bureau',
  p6:'Réfection pont — Pontiac',
}

const EMPTY_FORM = { nom:'', type:'autre' as DocType, description:'', version:'1.0', taille:'', uploadePar:'', scope:'projet' as DocScope, tags:'', confidentiel:false, refId:'', refLabel:'' }

export default function DocumentsPage() {
  const [tab, setTab] = useState<Tab>('Vue globale')
  const [docs, setDocs] = useState<BidexaDocument[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [scopeFilter, setScopeFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editDoc, setEditDoc] = useState<BidexaDocument | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const reload = useCallback(() => setDocs(getDocuments()), [])
  useEffect(() => { reload() }, [reload])
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500) }

  const actifs = docs.filter(d => d.statut === 'actif')
  const archives = docs.filter(d => d.statut !== 'actif')
  const thisMonth = actifs.filter(d => d.createdAt.startsWith(new Date().toISOString().slice(0,7))).length
  const nonClasses = actifs.filter(d => d.liens.length === 0).length

  let filtered = search ? searchDocuments(search) : actifs
  if (typeFilter) filtered = filtered.filter(d => d.type === typeFilter)
  if (scopeFilter) filtered = filtered.filter(d => d.scope === scopeFilter)

  function openAdd(prefill?: Partial<typeof EMPTY_FORM>) {
    setEditDoc(null)
    setForm({ ...EMPTY_FORM, ...prefill })
    setShowAdd(true)
  }

  function openEdit(doc: BidexaDocument) {
    setEditDoc(doc)
    setForm({ nom: doc.nom, type: doc.type, description: doc.description || '', version: doc.version, taille: doc.taille || '', uploadePar: doc.uploadePar, scope: doc.scope, tags: doc.tags.join(', '), confidentiel: doc.confidentiel, refId: '', refLabel: '' })
    setShowAdd(true)
  }

  function handleSave() {
    const id = editDoc?.id || uid()
    const newDoc: BidexaDocument = {
      id,
      nom: form.nom,
      type: form.type,
      description: form.description || undefined,
      version: form.version,
      taille: form.taille || undefined,
      uploadePar: form.uploadePar || 'Utilisateur',
      createdAt: editDoc?.createdAt || new Date().toISOString().slice(0,10),
      scope: form.scope,
      statut: 'actif',
      confidentiel: form.confidentiel,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      liens: editDoc?.liens || (form.refId ? [{ type: form.scope, refId: form.refId, refLabel: form.refLabel, dateCreation: new Date().toISOString().slice(0,10) }] : []),
    }
    upsertDocument(newDoc)
    reload()
    setShowAdd(false)
    showToast(editDoc ? 'Document mis à jour' : 'Document ajouté')
  }

  // Group by projet
  const projetIds = Array.from(new Set(actifs.flatMap(d => d.liens.filter(l => l.type === 'projet').map(l => l.refId))))
  // Group by fournisseur
  const fournisseurIds = Array.from(new Set(actifs.flatMap(d => d.liens.filter(l => l.type === 'fournisseur').map(l => l.refId))))

  const typeGroupLabels: Record<string, string> = { contrat:'Contrats', plan:'Plans & Devis', soumission:'Soumissions', rapport:'Rapports', facture:'Factures', addenda:'Addenda', estimation:'Estimations', po:'Bons de commande', assurance:'Assurances', certif:'Certifications', autre:'Autres' }

  function DocRow({ d }: { d: BidexaDocument }) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 hover:bg-slate-50 group">
        <span className="text-lg flex-shrink-0">{TYPE_ICONS[d.type] ?? '📁'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-800 truncate">{d.nom}</span>
            {d.confidentiel && <EyeOff className="w-3 h-3 text-amber-500" />}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-slate-400">v{d.version}</span>
            {d.taille && <span className="text-xs text-slate-400">{d.taille}</span>}
            <span className="text-xs text-slate-400">{d.uploadePar} · {fmt(d.createdAt)}</span>
            {d.liens.slice(0,2).map(l => (
              <span key={l.refId} className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">{l.refLabel}</span>
            ))}
            {d.liens.length > 2 && <span className="text-xs text-slate-400">+{d.liens.length - 2}</span>}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => openEdit(d)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 text-xs">Modifier</button>
          <button className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Télécharger">
            <Download className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { archiverDocument(d.id); reload(); showToast('Archivé') }} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
            <Archive className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <PageWithAI module="documents" title="Documents">
      {toast && <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">{toast}</div>}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
            <p className="text-sm text-slate-500 mt-0.5">Gestionnaire centralisé — liés aux projets, soumissions, fournisseurs et plus</p>
          </div>
          <button onClick={() => openAdd()} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" />Ajouter un document
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 flex-wrap border-b border-slate-200">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-medium rounded-t-md transition-colors ${tab === t ? 'bg-white border border-b-white border-slate-200 text-indigo-600 -mb-px' : 'text-slate-500 hover:text-slate-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* TAB: Vue globale */}
        {tab === 'Vue globale' && (
          <div className="space-y-5">
            <div className="grid grid-cols-4 gap-4">
              <KpiCard label="Total documents" value={String(actifs.length)} trend="neutral" />
              <KpiCard label="Ajoutés ce mois" value={String(thisMonth)} trend="up" />
              <KpiCard label="Non classés" value={String(nonClasses)} trend={nonClasses > 0 ? 'down' : 'up'} />
              <KpiCard label="Archivés" value={String(archives.length)} trend="neutral" />
            </div>

            {/* Filtres */}
            <div className="flex gap-3 flex-wrap items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
                <input className={inputCls + ' pl-8 w-52'} placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className={selectCls + ' text-sm'} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="">Tous types</option>
                {DOC_TYPES.map(t => <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>)}
              </select>
              <select className={selectCls + ' text-sm'} value={scopeFilter} onChange={e => setScopeFilter(e.target.value)}>
                <option value="">Tous modules</option>
                {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Chips type */}
            <div className="flex gap-2 flex-wrap">
              {DOC_TYPES.map(t => {
                const count = actifs.filter(d => d.type === t).length
                if (!count) return null
                return (
                  <button key={t} onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition ${typeFilter === t ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    {TYPE_ICONS[t]} {t} <span className="font-bold">{count}</span>
                  </button>
                )
              })}
            </div>

            <Card padding={false}>
              <div className="divide-y divide-slate-50">
                {filtered.map(d => <DocRow key={d.id} d={d} />)}
                {filtered.length === 0 && <p className="text-center py-10 text-slate-400 text-sm">Aucun document trouvé</p>}
              </div>
            </Card>
          </div>
        )}

        {/* TAB: Par projet */}
        {tab === 'Par projet' && (
          <div className="space-y-3">
            <button onClick={() => openAdd({ scope: 'projet' })} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
              <Plus className="w-4 h-4" />Ajouter un document de projet
            </button>
            {projetIds.map(pid => {
              const projDocs = actifs.filter(d => d.liens.some(l => l.type === 'projet' && l.refId === pid))
              const label = projDocs[0]?.liens.find(l => l.type === 'projet' && l.refId === pid)?.refLabel || PROJETS_LABELS[pid] || pid
              const isOpen = expanded === pid
              const byType = DOC_TYPES.map(t => ({ t, items: projDocs.filter(d => d.type === t) })).filter(x => x.items.length > 0)
              return (
                <Card key={pid} padding={false}>
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50" onClick={() => setExpanded(isOpen ? null : pid)}>
                    {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    <span className="font-semibold text-slate-800 flex-1">{label}</span>
                    <span className="text-xs text-slate-400">{projDocs.length} document{projDocs.length > 1 ? 's' : ''}</span>
                    <button onClick={e => { e.stopPropagation(); openAdd({ scope: 'projet', refId: pid, refLabel: label }) }} className="ml-2 text-xs text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-lg hover:bg-indigo-50">+ Ajouter</button>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100">
                      {byType.map(({ t, items }) => (
                        <div key={t}>
                          <div className="px-4 py-1.5 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">{TYPE_ICONS[t]} {typeGroupLabels[t]}</div>
                          {items.map(d => <DocRow key={d.id} d={d} />)}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )
            })}
            {projetIds.length === 0 && <p className="text-center py-10 text-slate-400 text-sm">Aucun document de projet</p>}
          </div>
        )}

        {/* TAB: Par fournisseur */}
        {tab === 'Par fournisseur' && (
          <div className="space-y-3">
            {fournisseurIds.map(fid => {
              const fDocs = actifs.filter(d => d.liens.some(l => l.type === 'fournisseur' && l.refId === fid))
              const label = fDocs[0]?.liens.find(l => l.type === 'fournisseur' && l.refId === fid)?.refLabel || fid
              const isOpen = expanded === fid
              return (
                <Card key={fid} padding={false}>
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50" onClick={() => setExpanded(isOpen ? null : fid)}>
                    {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    <span className="font-semibold text-slate-800 flex-1">🏭 {label}</span>
                    <span className="text-xs text-slate-400">{fDocs.length} document{fDocs.length > 1 ? 's' : ''}</span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 divide-y divide-slate-50">
                      {fDocs.map(d => <DocRow key={d.id} d={d} />)}
                    </div>
                  )}
                </Card>
              )
            })}
            {fournisseurIds.length === 0 && <p className="text-center py-10 text-slate-400 text-sm">Aucun document fournisseur</p>}
          </div>
        )}

        {/* TAB: Entreprise */}
        {tab === 'Entreprise' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-500">Certificats, assurances, politiques internes et chartes d&apos;entreprise</p>
              <button onClick={() => openAdd({ scope: 'entreprise', refId: 'global', refLabel: 'Entreprise' })} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm">
                <Plus className="w-4 h-4" />Ajouter
              </button>
            </div>
            <Card padding={false}>
              <div className="divide-y divide-slate-50">
                {actifs.filter(d => d.scope === 'entreprise').map(d => <DocRow key={d.id} d={d} />)}
                {actifs.filter(d => d.scope === 'entreprise').length === 0 && (
                  <p className="text-center py-10 text-slate-400 text-sm">Aucun document d&apos;entreprise</p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* TAB: Archivés */}
        {tab === 'Archivés' && (
          <Card padding={false}>
            <div className="divide-y divide-slate-50">
              {archives.map(d => (
                <div key={d.id} className="flex items-center gap-3 px-4 py-2.5 opacity-60">
                  <span className="text-lg">{TYPE_ICONS[d.type] ?? '📁'}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700 line-through">{d.nom}</div>
                    <div className="text-xs text-slate-400">Archivé · v{d.version} · {d.uploadePar}</div>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{d.statut}</span>
                </div>
              ))}
              {archives.length === 0 && <p className="text-center py-10 text-slate-400 text-sm">Aucun document archivé</p>}
            </div>
          </Card>
        )}
      </div>

      {/* Modal Ajouter/Modifier */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={editDoc ? 'Modifier le document' : 'Ajouter un document'} size="lg">
        <div className="space-y-4">
          <Field label="Nom du fichier">
            <input className={inputCls} value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} placeholder="ex: Contrat_client.pdf" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select className={selectCls} value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value as DocType}))}>
                {DOC_TYPES.map(t => <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>)}
              </select>
            </Field>
            <Field label="Version">
              <input className={inputCls} value={form.version} onChange={e => setForm(p => ({...p, version: e.target.value}))} />
            </Field>
          </div>
          <Field label="Description">
            <input className={inputCls} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Taille (ex: 2.4 MB)">
              <input className={inputCls} value={form.taille} onChange={e => setForm(p => ({...p, taille: e.target.value}))} placeholder="2.4 MB" />
            </Field>
            <Field label="Ajouté par">
              <input className={inputCls} value={form.uploadePar} onChange={e => setForm(p => ({...p, uploadePar: e.target.value}))} />
            </Field>
          </div>
          <Field label="Module principal">
            <select className={selectCls} value={form.scope} onChange={e => setForm(p => ({...p, scope: e.target.value as DocScope}))}>
              {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          {!editDoc && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="ID de référence (optionnel)">
                <input className={inputCls} value={form.refId} onChange={e => setForm(p => ({...p, refId: e.target.value}))} placeholder="ex: p1, s2, bc01" />
              </Field>
              <Field label="Libellé de référence">
                <input className={inputCls} value={form.refLabel} onChange={e => setForm(p => ({...p, refLabel: e.target.value}))} placeholder="ex: Réfection Aylmer" />
              </Field>
            </div>
          )}
          <Field label="Tags (séparés par virgule)">
            <input className={inputCls} value={form.tags} onChange={e => setForm(p => ({...p, tags: e.target.value}))} placeholder="ex: contrat, aylmer, phase-1" />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.confidentiel} onChange={e => setForm(p => ({...p, confidentiel: e.target.checked}))} className="w-4 h-4 rounded" />
            Document confidentiel
          </label>
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setShowAdd(false)}>Annuler</Btn>
            <Btn onClick={handleSave} disabled={!form.nom}>{editDoc ? 'Mettre à jour' : 'Ajouter'}</Btn>
          </div>
        </div>
      </Modal>
    </PageWithAI>
  )
}
