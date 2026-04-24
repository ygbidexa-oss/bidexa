'use client'
import { useState, useEffect, useMemo } from 'react'
import { getSoumissions, upsertSoumission, newSoumissionId, newSoumissionNumero } from '@/lib/soumissions-store'
import { getClients } from '@/lib/clients-store'
import { estimations } from '@/lib/mock-data/estimations'
import type { Soumission } from '@/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal, Field, inputCls, selectCls, Btn } from '@/components/ui/Modal'
import Link from 'next/link'
import { ChevronRight, LayoutGrid, List } from 'lucide-react'
import { PageWithAI } from '@/components/layout/PageWithAI'

const statusOrder = ['brouillon', 'en_preparation', 'en_validation', 'deposee', 'gagnee', 'perdue', 'annulee']

const statusLabels: Record<string, string> = {
  brouillon: 'Brouillon', en_preparation: 'En préparation', en_validation: 'En validation',
  deposee: 'Déposée', gagnee: 'Gagnée', perdue: 'Perdue', annulee: 'Annulée',
}

const typeLabels: Record<string, string> = {
  appel_offre_public: 'Appel d\'offre public',
  appel_offre_prive: 'Appel d\'offre privé',
  soumission_directe: 'Soumission directe',
  demande_de_prix: 'Demande de prix',
}

function formatMoney(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)} M$`
  if (n >= 1000) return `${Math.round(n / 1000)} k$`
  return n > 0 ? `${n}$` : '—'
}

// Extract unique estimateurs from soumissions (recalculé dynamiquement)
function getUniqueEstimateurs(list: { estimateurId: string; estimateurNom: string }[]) {
  return Array.from(
    new Map(list.map(s => [s.estimateurId, s.estimateurNom])).entries()
  ).map(([id, nom]) => ({ id, nom }))
}

export default function SoumissionsPage() {
  const [soumissions, setSoumissions] = useState(() => getSoumissions())
  const clients = useMemo(() => getClients(), [])
  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [estimateurFilter, setEstimateurFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => { setSoumissions(getSoumissions()) }, [])

  const uniqueEstimateurs = useMemo(() => getUniqueEstimateurs(soumissions), [soumissions])

  // Modal form state
  const [form, setForm] = useState({
    titre: '',
    clientId: '',
    type: '',
    estimateurId: '',
    estimationId: '',   // optionnel — estimation liée
    dateReception: '',
    dateDepot: '',
    description: '',
  })

  // Auto-remplir depuis l'estimation sélectionnée
  function onEstimationSelect(estId: string) {
    const est = estimations.find(e => e.id === estId)
    const client = est ? clients.find(c => c.nom === est.clientNom) : null
    setForm(f => ({
      ...f,
      estimationId: estId,
      titre: est ? est.titre : f.titre,
      clientId: client ? client.id : f.clientId,
    }))
  }

  const filtered = soumissions.filter(s => {
    const matchSearch = !search ||
      s.clientNom.toLowerCase().includes(search.toLowerCase()) ||
      s.titre.toLowerCase().includes(search.toLowerCase()) ||
      s.numero.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || s.statut === statusFilter
    const matchType = !typeFilter || s.type === typeFilter
    const matchEstimateur = !estimateurFilter || s.estimateurId === estimateurFilter
    return matchSearch && matchStatus && matchType && matchEstimateur
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const clientObj = clients.find(c => c.id === form.clientId)
    const newSoumission: Soumission = {
      id: newSoumissionId(),
      numero: newSoumissionNumero(),
      titre: form.titre,
      clientId: form.clientId,
      clientNom: clientObj?.nom ?? form.clientId,
      type: (form.type as Soumission['type']) || 'appel_offre_public',
      estimateurId: form.estimateurId,
      estimateurNom: form.estimateurId,
      dateReception: form.dateReception,
      dateDepot: form.dateDepot,
      description: form.description,
      statut: 'brouillon',
      prixSoumis: 0,
      marge: 0,
      version: 1,
      documents: [],
      checklist: [],
      createdAt: new Date().toISOString(),
    }
    upsertSoumission(newSoumission)
    setSoumissions(getSoumissions())
    setModalOpen(false)
    setForm({ titre: '', clientId: '', type: '', estimateurId: '', estimationId: '', dateReception: '', dateDepot: '', description: '' })
  }

  return (
    <PageWithAI module="soumissions" title="Soumissions & AO">
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Rechercher..."
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/30 w-52"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            {statusOrder.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
          </select>
          <select
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">Tous types</option>
            {Object.entries(typeLabels).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none"
            value={estimateurFilter}
            onChange={e => setEstimateurFilter(e.target.value)}
          >
            <option value="">Tous estimateurs</option>
            {uniqueEstimateurs.map(est => (
              <option key={est.id} value={est.id}>{est.nom}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => setView('list')} className={`px-3 py-2 text-sm ${view === 'list' ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:bg-slate-50'}`}><List size={16} /></button>
            <button onClick={() => setView('kanban')} className={`px-3 py-2 text-sm ${view === 'kanban' ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:bg-slate-50'}`}><LayoutGrid size={16} /></button>
          </div>
          <button
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#C9A84C' }}
            onClick={() => setModalOpen(true)}
          >
            + Nouvelle soumission
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Numéro / Titre</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estimateur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dépôt</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Prix soumis</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Marge</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center text-sm text-slate-400 py-10">Aucune soumission trouvée.</td>
                  </tr>
                ) : (
                  filtered.map((s, i) => (
                    <tr key={s.id} className={`border-b border-slate-50 hover:bg-slate-50 transition ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800">{s.numero}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[220px]">{s.titre}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{s.clientNom}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 capitalize">{s.type.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3.5 text-slate-600">{s.estimateurNom}</td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{new Date(s.dateDepot).toLocaleDateString('fr-CA')}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-800">{formatMoney(s.prixSoumis)}</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={s.marge > 0 ? 'text-emerald-600 font-semibold' : 'text-slate-300'}>{s.marge > 0 ? `${s.marge}%` : '—'}</span>
                      </td>
                      <td className="px-4 py-3.5"><Badge status={s.statut} /></td>
                      <td className="px-4 py-3.5">
                        <Link href={`/soumissions/${s.id}`} className="p-1.5 rounded hover:bg-slate-100 inline-flex text-slate-400"><ChevronRight size={16} /></Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {statusOrder.map(status => {
            const items = filtered.filter(s => s.statut === status)
            return (
              <div key={status} className="flex-shrink-0 w-64">
                <div className="flex items-center gap-2 mb-3">
                  <Badge status={status} />
                  <span className="text-xs text-slate-400">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map(s => (
                    <Link key={s.id} href={`/soumissions/${s.id}`}>
                      <Card className="hover:shadow-md transition cursor-pointer">
                        <p className="text-xs font-semibold text-amber-600">{s.numero}</p>
                        <p className="text-sm font-medium text-slate-800 mt-1 leading-snug">{s.titre}</p>
                        <p className="text-xs text-slate-400 mt-1">{s.clientNom}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-sm font-bold text-slate-700">{formatMoney(s.prixSoumis)}</span>
                          {s.marge > 0 && <span className="text-xs text-emerald-600 font-semibold">{s.marge}%</span>}
                        </div>
                      </Card>
                    </Link>
                  ))}
                  {items.length === 0 && <div className="text-xs text-slate-300 text-center py-6 border-2 border-dashed border-slate-100 rounded-lg">Vide</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New Soumission Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle soumission" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Estimation liée — optionnel, remplit auto titre + client */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
            <Field label="Estimation liée (optionnel — auto-remplit le titre et le client)">
              <select
                className={selectCls}
                value={form.estimationId}
                onChange={e => onEstimationSelect(e.target.value)}
              >
                <option value="">Aucune estimation liée</option>
                {estimations.map(est => (
                  <option key={est.id} value={est.id}>
                    {est.titre} — {est.clientNom} (marge {est.marge}%)
                  </option>
                ))}
              </select>
            </Field>
            {form.estimationId && (() => {
              const est = estimations.find(e => e.id === form.estimationId)
              if (!est) return null
              const total = est.postes.reduce((a, p) => a + p.sousPostes.reduce((b, sp) => b + sp.lignes.reduce((c, l) => c + l.mo + l.materiaux + l.equipement + l.sousTraitance + l.fraisIndirects, 0), 0), 0)
              const avecMarge = Math.round(total * (1 + est.marge / 100))
              return (
                <p className="text-xs text-amber-700 mt-2">
                  Budget estimé : <strong>{avecMarge.toLocaleString('fr-CA')} $</strong> (marge {est.marge}%)
                </p>
              )
            })()}
          </div>

          <Field label="Titre" required>
            <input
              className={inputCls}
              placeholder="Titre de la soumission"
              value={form.titre}
              onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Client" required>
              <select
                className={selectCls}
                value={form.clientId}
                onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                required
              >
                <option value="">Choisir un client...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </Field>
            <Field label="Type d'AO" required>
              <select
                className={selectCls}
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                required
              >
                <option value="">Choisir un type...</option>
                {Object.entries(typeLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Estimateur" required>
            <select
              className={selectCls}
              value={form.estimateurId}
              onChange={e => setForm(f => ({ ...f, estimateurId: e.target.value }))}
              required
            >
              <option value="">Choisir un estimateur...</option>
              {uniqueEstimateurs.map(est => (
                <option key={est.id} value={est.id}>{est.nom}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date de réception">
              <input
                type="date"
                className={inputCls}
                value={form.dateReception}
                onChange={e => setForm(f => ({ ...f, dateReception: e.target.value }))}
              />
            </Field>
            <Field label="Date de dépôt">
              <input
                type="date"
                className={inputCls}
                value={form.dateDepot}
                onChange={e => setForm(f => ({ ...f, dateDepot: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Description du projet..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Btn variant="secondary" type="button" onClick={() => setModalOpen(false)}>Annuler</Btn>
            <Btn type="submit">Créer la soumission</Btn>
          </div>
        </form>
      </Modal>
    </div>
    </PageWithAI>
  )
}
