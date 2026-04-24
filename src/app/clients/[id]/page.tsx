'use client'
import { useState } from 'react'
import { clients as allClients } from '@/lib/mock-data/clients'
import { soumissions } from '@/lib/mock-data/soumissions'
import { projets } from '@/lib/mock-data/projets'
import { factures } from '@/lib/mock-data/comptabilite'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal, Field, inputCls, selectCls, Btn } from '@/components/ui/Modal'
import { notFound } from 'next/navigation'
import type { Client, Contact, ClientType, ClientSector } from '@/types'
import { Mail, Phone, MapPin, Building2, ArrowLeft, Pencil, FilePlus, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

function formatMoney(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(2)} M$`
  if (n >= 1000) return `${Math.round(n / 1000)} k$`
  return `${n}$`
}

const secteurOptions: ClientSector[] = ['municipal', 'industriel', 'commercial', 'institutionnel', 'residentiel']
const secteurLabels: Record<string, string> = {
  municipal: 'Municipal', industriel: 'Industriel', commercial: 'Commercial',
  institutionnel: 'Institutionnel', residentiel: 'Résidentiel',
}
const emptyContact = (): Contact => ({ nom: '', poste: '', email: '', tel: '' })

export default function ClientFichePage({ params }: { params: { id: string } }) {
  const original = allClients.find(c => c.id === params.id)
  if (!original) notFound()

  // Local state so edits are reflected immediately on the page
  const [client, setClient] = useState<Client>({ ...original, contacts: [...original.contacts] })
  const [editOpen, setEditOpen] = useState(false)
  const [toast, setToast] = useState('')

  // Edit form state — mirrors client fields
  const [editForm, setEditForm] = useState({
    nom: client.nom,
    type: client.type as ClientType,
    secteur: client.secteur as ClientSector,
    adresse: client.adresse,
    ville: client.ville,
    province: client.province,
    codePostal: client.codePostal ?? '',
    conditionsPaiement: client.conditionsPaiement,
    contacts: client.contacts.map(c => ({ ...c })),
  })

  function openEdit() {
    setEditForm({
      nom: client.nom,
      type: client.type,
      secteur: client.secteur,
      adresse: client.adresse,
      ville: client.ville,
      province: client.province,
      codePostal: client.codePostal ?? '',
      conditionsPaiement: client.conditionsPaiement,
      contacts: client.contacts.map(c => ({ ...c })),
    })
    setEditOpen(true)
  }

  /* ── Contact helpers ── */
  function setContact(i: number, field: keyof Contact, val: string) {
    setEditForm(f => {
      const contacts = [...f.contacts]
      contacts[i] = { ...contacts[i], [field]: val }
      return { ...f, contacts }
    })
  }
  function addContact() {
    setEditForm(f => ({ ...f, contacts: [...f.contacts, emptyContact()] }))
  }
  function removeContact(i: number) {
    setEditForm(f => ({ ...f, contacts: f.contacts.filter((_, idx) => idx !== i) }))
  }

  /* ── Save ── */
  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setClient(prev => ({
      ...prev,
      nom: editForm.nom,
      type: editForm.type,
      secteur: editForm.secteur,
      adresse: editForm.adresse,
      ville: editForm.ville,
      province: editForm.province,
      codePostal: editForm.codePostal,
      conditionsPaiement: editForm.conditionsPaiement,
      contacts: editForm.contacts.filter(c => c.nom.trim() !== ''),
    }))
    setEditOpen(false)
    setToast('Modifications enregistrées.')
    setTimeout(() => setToast(''), 3000)
  }

  const clientSoumissions = soumissions.filter(s => s.clientId === client.id)
  const clientProjets = projets.filter(p => p.clientId === client.id)
  const clientFactures = factures
    .filter(f => f.clientNom === original.nom)
    .sort((a, b) => b.dateEmission.localeCompare(a.dateEmission))
    .slice(0, 5)

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/clients" className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-800">{client.nom}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge status={client.type} />
            <span className="text-xs text-slate-400 capitalize">{secteurLabels[client.secteur] ?? client.secteur}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <Pencil size={14} /> Modifier
          </button>
          <Link
            href={`/soumissions?client=${client.id}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white transition"
            style={{ background: '#C9A84C', color: '#0D1B2A' }}
          >
            <FilePlus size={14} /> Nouvelle soumission
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="space-y-4">
          {/* Coordonnées */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Coordonnées</h3>
              <button onClick={openEdit} className="text-xs text-amber-600 hover:underline flex items-center gap-1">
                <Pencil size={11} /> Modifier
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2 text-slate-600">
                <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
                <span>
                  {client.adresse && <>{client.adresse}<br /></>}
                  {client.ville}{client.province ? `, ${client.province}` : ''}{client.codePostal ? ` ${client.codePostal}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Building2 size={14} className="text-slate-400" />
                <span>Paiement : {client.conditionsPaiement}</span>
              </div>
            </div>
          </Card>

          {/* Contacts */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Contacts ({client.contacts.length})</h3>
              <button onClick={openEdit} className="text-xs text-amber-600 hover:underline flex items-center gap-1">
                <Pencil size={11} /> Modifier
              </button>
            </div>
            {client.contacts.length === 0 ? (
              <p className="text-xs text-slate-400">Aucun contact enregistré.</p>
            ) : (
              <div className="space-y-3">
                {client.contacts.map((contact, i) => (
                  <div key={i} className="pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                    <p className="font-semibold text-slate-800 text-sm">{contact.nom}</p>
                    <p className="text-xs text-slate-400 mb-1">{contact.poste}</p>
                    <div className="flex flex-col gap-1">
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                          <Mail size={11} />{contact.email}
                        </a>
                      )}
                      {contact.tel && (
                        <a href={`tel:${contact.tel}`} className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Phone size={11} />{contact.tel}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Performance */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Volume total contrats</span>
                <span className="text-sm font-bold text-slate-800">{formatMoney(client.totalContrats)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Taux de succès</span>
                <span className={`text-sm font-bold ${client.tauxSucces >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {client.tauxSucces > 0 ? `${client.tauxSucces}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Marge moyenne</span>
                <span className="text-sm font-bold text-slate-700">{client.margemoyenne > 0 ? `${client.margemoyenne}%` : '—'}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Soumissions */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Soumissions ({clientSoumissions.length})</h3>
              <Link href={`/soumissions?client=${client.id}`} className="text-xs text-amber-600 hover:underline">Voir tout →</Link>
            </div>
            {clientSoumissions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Aucune soumission</p>
            ) : (
              <div className="space-y-2">
                {clientSoumissions.map(s => (
                  <Link key={s.id} href={`/soumissions/${s.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{s.titre}</p>
                        <p className="text-xs text-slate-400">{s.numero} · {s.estimateurNom}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {s.prixSoumis > 0 && <span className="text-sm font-semibold text-slate-700">{formatMoney(s.prixSoumis)}</span>}
                        <Badge status={s.statut} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Projets */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Projets ({clientProjets.length})</h3>
              <Link href={`/projets?client=${client.id}`} className="text-xs text-amber-600 hover:underline">Voir tout →</Link>
            </div>
            {clientProjets.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Aucun projet</p>
            ) : (
              <div className="space-y-2">
                {clientProjets.map(p => (
                  <Link key={p.id} href={`/projets/${p.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{p.titre}</p>
                        <p className="text-xs text-slate-400">{p.numero} · {p.chargeProjNom}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-slate-400">{p.avancement}%</p>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1">
                            <div className="h-1.5 rounded-full bg-amber-400" style={{ width: `${p.avancement}%` }} />
                          </div>
                        </div>
                        <Badge status={p.statut} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Historique de facturation */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Historique de facturation</h3>
            {clientFactures.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Aucune facture.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Numéro</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Montant</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Échéance</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientFactures.map((f, i) => (
                      <tr key={f.id} className={`border-b border-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                        <td className="px-3 py-2.5 font-medium text-slate-800">{f.numero}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-700">{formatMoney(f.montantTotal)}</td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs">{new Date(f.dateEcheance).toLocaleDateString('fr-CA')}</td>
                        <td className="px-3 py-2.5"><Badge status={f.statut} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── MODAL MODIFIER CLIENT ── */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Modifier — ${client.nom}`} size="lg">
        <form onSubmit={handleSave} className="space-y-5">

          {/* Informations générales */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Informations générales</p>
            <div className="space-y-3">
              <Field label="Nom de l'organisation" required>
                <input className={inputCls} value={editForm.nom} onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))} required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type" required>
                  <select className={selectCls} value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value as ClientType }))} required>
                    <option value="public">Public</option>
                    <option value="prive">Privé</option>
                  </select>
                </Field>
                <Field label="Secteur" required>
                  <select className={selectCls} value={editForm.secteur} onChange={e => setEditForm(f => ({ ...f, secteur: e.target.value as ClientSector }))} required>
                    {secteurOptions.map(s => <option key={s} value={s}>{secteurLabels[s]}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Adresse">
                <input className={inputCls} placeholder="123 rue Principale" value={editForm.adresse} onChange={e => setEditForm(f => ({ ...f, adresse: e.target.value }))} />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Ville">
                  <input className={inputCls} value={editForm.ville} onChange={e => setEditForm(f => ({ ...f, ville: e.target.value }))} />
                </Field>
                <Field label="Province">
                  <input className={inputCls} value={editForm.province} onChange={e => setEditForm(f => ({ ...f, province: e.target.value }))} />
                </Field>
                <Field label="Code postal">
                  <input className={inputCls} placeholder="G1A 0A1" value={editForm.codePostal} onChange={e => setEditForm(f => ({ ...f, codePostal: e.target.value }))} />
                </Field>
              </div>
              <Field label="Conditions de paiement">
                <select className={selectCls} value={editForm.conditionsPaiement} onChange={e => setEditForm(f => ({ ...f, conditionsPaiement: e.target.value }))}>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 45">Net 45</option>
                  <option value="Net 60">Net 60</option>
                  <option value="À la livraison">À la livraison</option>
                  <option value="Autre">Autre</option>
                </select>
              </Field>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Contacts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contacts de l'organisation</p>
              <button type="button" onClick={addContact} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50 transition">
                <Plus size={12} /> Ajouter un contact
              </button>
            </div>
            <div className="space-y-3">
              {editForm.contacts.map((contact, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Contact {i + 1}</span>
                    {editForm.contacts.length > 1 && (
                      <button type="button" onClick={() => removeContact(i)} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Nom complet" required={i === 0}>
                      <input className={inputCls} placeholder="Marie Tremblay" value={contact.nom} onChange={e => setContact(i, 'nom', e.target.value)} required={i === 0} />
                    </Field>
                    <Field label="Poste / Titre">
                      <input className={inputCls} placeholder="Directeur des travaux" value={contact.poste} onChange={e => setContact(i, 'poste', e.target.value)} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Courriel">
                      <input type="email" className={inputCls} placeholder="contact@exemple.ca" value={contact.email} onChange={e => setContact(i, 'email', e.target.value)} />
                    </Field>
                    <Field label="Téléphone">
                      <input type="tel" className={inputCls} placeholder="418 555-0100" value={contact.tel} onChange={e => setContact(i, 'tel', e.target.value)} />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Btn variant="secondary" type="button" onClick={() => setEditOpen(false)}>Annuler</Btn>
            <Btn type="submit">Enregistrer les modifications</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
