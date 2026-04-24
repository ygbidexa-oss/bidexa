'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  getDocumentsByLien, upsertDocument, addLien, archiverDocument, getDocuments,
  type BidexaDocument, type DocumentLien, type DocScope, type DocType,
} from '@/lib/documents-store'
import { Modal, Field, inputCls, selectCls, Btn } from '@/components/ui/Modal'
import { Plus, Link2, Download, Archive, EyeOff } from 'lucide-react'

const TYPE_ICONS: Record<string, string> = {
  contrat: '📋', plan: '📐', addenda: '📎', soumission: '📄', facture: '🧾',
  rapport: '📊', estimation: '🔢', po: '🛒', assurance: '🛡️', certif: '✅', autre: '📁',
}
const DOC_TYPES: DocType[] = ['contrat','plan','addenda','soumission','facture','rapport','estimation','po','assurance','certif','autre']

interface Props {
  lienType: DocScope
  refId: string
  refLabel: string
  readOnly?: boolean
}

export function DocumentsSection({ lienType, refId, refLabel, readOnly = false }: Props) {
  const [docs, setDocs] = useState<BidexaDocument[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showLink, setShowLink] = useState(false)
  const [linkSearch, setLinkSearch] = useState('')
  const [form, setForm] = useState<{
    nom: string; type: DocType; description: string; version: string; taille: string; uploadePar: string; tags: string; confidentiel: boolean
  }>({ nom: '', type: 'autre', description: '', version: '1.0', taille: '', uploadePar: '', tags: '', confidentiel: false })

  const reload = useCallback(() => setDocs(getDocumentsByLien(lienType, refId)), [lienType, refId])
  useEffect(() => { reload() }, [reload])

  function handleAdd() {
    const doc: BidexaDocument = {
      id: `doc-${Date.now()}`,
      nom: form.nom,
      type: form.type,
      description: form.description || undefined,
      version: form.version,
      taille: form.taille || undefined,
      uploadePar: form.uploadePar || 'Utilisateur',
      createdAt: new Date().toISOString().slice(0, 10),
      scope: lienType,
      statut: 'actif',
      confidentiel: form.confidentiel,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      liens: [{ type: lienType, refId, refLabel, dateCreation: new Date().toISOString().slice(0, 10) }],
    }
    upsertDocument(doc)
    reload()
    setShowAdd(false)
    setForm({ nom: '', type: 'autre', description: '', version: '1.0', taille: '', uploadePar: '', tags: '', confidentiel: false })
  }

  function handleLink(doc: BidexaDocument) {
    addLien(doc.id, { type: lienType, refId, refLabel, dateCreation: new Date().toISOString().slice(0, 10) })
    reload()
    setShowLink(false)
  }

  function handleArchive(docId: string) {
    archiverDocument(docId)
    reload()
  }

  const allDocs = getDocuments().filter(d => d.statut === 'actif' && !d.liens.some(l => l.type === lienType && l.refId === refId))
  const filtered = allDocs.filter(d => !linkSearch || d.nom.toLowerCase().includes(linkSearch.toLowerCase()))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">Documents ({docs.length})</h4>
        {!readOnly && (
          <div className="flex gap-2">
            <button onClick={() => setShowLink(true)} className="flex items-center gap-1 text-xs text-slate-500 border border-slate-200 px-2 py-1 rounded-lg hover:bg-slate-50">
              <Link2 className="w-3 h-3" />Lier existant
            </button>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded-lg">
              <Plus className="w-3 h-3" />Ajouter
            </button>
          </div>
        )}
      </div>

      {docs.length === 0 && (
        <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
          Aucun document lié
        </div>
      )}

      <div className="space-y-2">
        {docs.map(d => (
          <div key={d.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-lg px-3 py-2 hover:bg-slate-50">
            <span className="text-lg flex-shrink-0">{TYPE_ICONS[d.type] ?? '📁'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800 truncate">{d.nom}</span>
                {d.confidentiel && <EyeOff className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                <span className="text-xs text-slate-400 flex-shrink-0">v{d.version}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                {d.taille && <span>{d.taille}</span>}
                <span>{d.uploadePar}</span>
                <span>{new Date(d.createdAt).toLocaleDateString('fr-CA')}</span>
                {d.tags.slice(0,2).map(t => <span key={t} className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">#{t}</span>)}
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Télécharger">
                <Download className="w-3.5 h-3.5" />
              </button>
              {!readOnly && (
                <button onClick={() => handleArchive(d.id)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500" title="Archiver">
                  <Archive className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Ajouter */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Ajouter un document" size="md">
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
          <Field label="Description (optionnel)">
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
          <Field label="Tags (séparés par virgule)">
            <input className={inputCls} value={form.tags} onChange={e => setForm(p => ({...p, tags: e.target.value}))} placeholder="ex: contrat, aylmer, phase-1" />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.confidentiel} onChange={e => setForm(p => ({...p, confidentiel: e.target.checked}))} className="w-4 h-4 rounded" />
            Confidentiel
          </label>
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setShowAdd(false)}>Annuler</Btn>
            <Btn onClick={handleAdd} disabled={!form.nom}>Ajouter</Btn>
          </div>
        </div>
      </Modal>

      {/* Modal Lier existant */}
      <Modal open={showLink} onClose={() => setShowLink(false)} title="Lier un document existant" size="md">
        <div className="space-y-3">
          <input className={inputCls} placeholder="Rechercher..." value={linkSearch} onChange={e => setLinkSearch(e.target.value)} />
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filtered.slice(0, 20).map(d => (
              <div key={d.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer" onClick={() => handleLink(d)}>
                <span>{TYPE_ICONS[d.type] ?? '📁'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.nom}</div>
                  <div className="text-xs text-slate-400">v{d.version} · {d.uploadePar}</div>
                </div>
                <Link2 className="w-3.5 h-3.5 text-indigo-500" />
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center text-slate-400 text-sm py-4">Aucun document trouvé</p>}
          </div>
          <div className="flex justify-end">
            <Btn variant="secondary" onClick={() => setShowLink(false)}>Fermer</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
