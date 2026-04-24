'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { estimations as initialEstimations } from '@/lib/mock-data/estimations'
import { clients } from '@/lib/mock-data/clients'
import type { Estimation } from '@/types'
import { Card } from '@/components/ui/Card'
import { Modal, Field, inputCls, selectCls, Btn } from '@/components/ui/Modal'
import Link from 'next/link'
import { Calculator, Search } from 'lucide-react'
import { PageWithAI } from '@/components/layout/PageWithAI'

function totalPoste(p: { sousPostes: { lignes: { mo: number; materiaux: number; equipement: number; sousTraitance: number; fraisIndirects: number }[] }[] }) {
  return p.sousPostes.reduce((a, sp) => a + sp.lignes.reduce((b, l) => b + l.mo + l.materiaux + l.equipement + l.sousTraitance + l.fraisIndirects, 0), 0)
}
function totalEstimation(e: Estimation) {
  return e.postes.reduce((a, p) => a + totalPoste(p), 0)
}
function formatMoney(n: number) { return n.toLocaleString('fr-CA') + ' $' }
function uid() { return `est-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }

const estimateurs = ['Jean-Baptiste Côté', 'Sophie Marchand', 'Étienne Blais', 'Marie-Ève Gagné', 'Patrice Rousseau']
const typesProjet = [
  'Infrastructure routière', 'Bâtiment commercial', 'Bâtiment institutionnel',
  'Résidentiel', 'Industriel', 'Mécanique / Électrique', 'Génie civil', 'Autre',
]

const emptyForm = () => ({
  titre: '',
  clientNom: '',
  clientId: '',
  typeProjet: '',
  estimateurNom: '',
  margeDefaut: '12',
  version: '1',
  dateDepotPrevu: '',
  description: '',
  notes: '',
})

export default function EstimationPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [estimationList, setEstimationList] = useState<Estimation[]>(initialEstimations)
  const [createModal, setCreateModal] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState(emptyForm())

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 3000)
  }

  // Sélection client depuis la liste → auto-remplit le nom
  function onClientSelect(clientId: string) {
    const c = clients.find(x => x.id === clientId)
    setForm(f => ({ ...f, clientId, clientNom: c?.nom ?? '' }))
  }

  const filteredEstimations = estimationList.filter(e => {
    const q = search.toLowerCase()
    return (
      e.titre.toLowerCase().includes(q) ||
      e.clientNom.toLowerCase().includes(q) ||
      (e.soumissionNumero ?? '').toLowerCase().includes(q)
    )
  })

  function openCreate() {
    setForm(emptyForm())
    setCreateModal(true)
  }

  function handleCreate(ev: React.FormEvent) {
    ev.preventDefault()
    if (!form.titre || !form.clientNom) return
    const newEst: Estimation = {
      id: uid(),
      clientNom: form.clientNom,
      titre: form.titre,
      typeProjet: form.typeProjet || undefined,
      estimateurNom: form.estimateurNom || undefined,
      version: parseInt(form.version) || 1,
      marge: parseFloat(form.margeDefaut) || 12,
      postes: [],
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    }
    setEstimationList(prev => [newEst, ...prev])
    setCreateModal(false)
    setForm(emptyForm())
    showToast(`Dossier « ${newEst.titre} » créé.`)
    router.push(`/estimation/${newEst.id}`)
  }

  return (
    <PageWithAI module="estimation" title="Estimation">
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">{toast}</div>
      )}
      <div className="space-y-5">
        {/* Barre haute */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Rechercher par titre, client ou numéro..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 w-72"
            />
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-500">{filteredEstimations.length} estimation{filteredEstimations.length !== 1 ? 's' : ''}</p>
            <button
              className="px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition"
              style={{ background: '#C9A84C', color: '#0D1B2A' }}
              onClick={openCreate}
            >
              + Nouvelle estimation
            </button>
          </div>
        </div>

        {/* Grille estimations */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEstimations.map(e => {
            const total = totalEstimation(e)
            const avecMarge = total * (1 + e.marge / 100)
            return (
              <Link key={e.id} href={`/estimation/${e.id}`}>
                <Card className="hover:shadow-md transition cursor-pointer h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      {e.soumissionNumero && (
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-amber-600">{e.soumissionNumero}</p>
                          {e.soumissionId && (
                            <Link
                              href={`/soumissions/${e.soumissionId}`}
                              onClick={ev => ev.stopPropagation()}
                              className="text-xs text-blue-600 hover:underline font-medium"
                            >
                              Voir soumission →
                            </Link>
                          )}
                        </div>
                      )}
                      <h3 className="text-sm font-bold text-slate-800 mt-0.5 leading-snug">{e.titre}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{e.clientNom}</p>
                    </div>
                    <Calculator size={18} className="text-slate-300 shrink-0 mt-0.5" />
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Version</span>
                      <span className="font-medium text-slate-700">v{e.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Coût de base</span>
                      <span className="font-semibold text-slate-800">{formatMoney(Math.round(total))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Marge ({e.marge}%)</span>
                      <span className="font-bold text-emerald-600">{formatMoney(Math.round(avecMarge))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Postes</span>
                      <span className="text-slate-600">{e.postes.length}</span>
                    </div>
                    {e.typeProjet && (
                      <div className="flex justify-between">
                        <span>Type</span>
                        <span className="text-slate-600">{e.typeProjet}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            )
          })}

          {filteredEstimations.length === 0 && (
            <div className="col-span-3 text-center text-slate-400 py-16 text-sm">
              Aucune estimation trouvée.
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL CRÉER ESTIMATION ── */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Créer un dossier d'estimation" size="lg">
        <form onSubmit={handleCreate} className="space-y-5">

          {/* Section 1 — Projet */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Projet</p>
            <div className="space-y-3">
              <Field label="Titre du projet d'estimation" required>
                <input
                  className={inputCls}
                  placeholder="Ex. Réfection infrastructures routières — Secteur Nord"
                  value={form.titre}
                  onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                  required
                  autoFocus
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Client" required>
                  <select
                    className={selectCls}
                    value={form.clientId}
                    onChange={e => onClientSelect(e.target.value)}
                    required
                  >
                    <option value="">Sélectionner un client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                    <option value="__autre">Autre (saisir manuellement)</option>
                  </select>
                </Field>
                {/* Saisie manuelle si "Autre" */}
                {form.clientId === '__autre' && (
                  <Field label="Nom du client" required>
                    <input
                      className={inputCls}
                      placeholder="Nom du client"
                      value={form.clientNom}
                      onChange={e => setForm(f => ({ ...f, clientNom: e.target.value }))}
                      required
                    />
                  </Field>
                )}
                <Field label="Type de projet">
                  <select
                    className={selectCls}
                    value={form.typeProjet}
                    onChange={e => setForm(f => ({ ...f, typeProjet: e.target.value }))}
                  >
                    <option value="">Choisir...</option>
                    {typesProjet.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Description / portée des travaux">
                <textarea
                  className={inputCls}
                  rows={3}
                  placeholder="Décrire la portée des travaux, contraintes, spécificités..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </Field>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2 — Paramètres */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Paramètres d'estimation</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Estimateur responsable">
                <select
                  className={selectCls}
                  value={form.estimateurNom}
                  onChange={e => setForm(f => ({ ...f, estimateurNom: e.target.value }))}
                >
                  <option value="">Choisir...</option>
                  {estimateurs.map(est => <option key={est} value={est}>{est}</option>)}
                </select>
              </Field>
              <Field label="Date de dépôt prévue">
                <input
                  type="date"
                  className={inputCls}
                  value={form.dateDepotPrevu}
                  onChange={e => setForm(f => ({ ...f, dateDepotPrevu: e.target.value }))}
                />
              </Field>
              <Field label="Marge cible (%)">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    className={inputCls}
                    value={form.margeDefaut}
                    onChange={e => setForm(f => ({ ...f, margeDefaut: e.target.value }))}
                  />
                </div>
              </Field>
              <Field label="Version initiale">
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  value={form.version}
                  onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Notes internes">
                <textarea
                  className={inputCls}
                  rows={2}
                  placeholder="Hypothèses de base, contraintes, sources de prix..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </Field>
            </div>
          </div>

          {/* Résumé avant création */}
          {form.titre && form.clientNom && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-slate-800 mb-1">Résumé du dossier à créer</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span><span className="text-slate-400">Projet :</span> {form.titre}</span>
                <span><span className="text-slate-400">Client :</span> {form.clientNom}</span>
                {form.estimateurNom && <span><span className="text-slate-400">Estimateur :</span> {form.estimateurNom}</span>}
                <span><span className="text-slate-400">Marge cible :</span> {form.margeDefaut}%</span>
                <span><span className="text-slate-400">Version :</span> v{form.version}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1 border-t border-slate-100">
            <Btn variant="secondary" type="button" onClick={() => setCreateModal(false)}>Annuler</Btn>
            <Btn type="submit">Créer le dossier d'estimation</Btn>
          </div>
        </form>
      </Modal>
    </PageWithAI>
  )
}
