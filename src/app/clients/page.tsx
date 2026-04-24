'use client'
import { useState, useEffect } from 'react'
import { getClients, upsertClient, newClientId } from '@/lib/clients-store'
import type { Client, Contact } from '@/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal, Field, inputCls, selectCls, Btn } from '@/components/ui/Modal'
import { Users, Building2, TrendingUp, ChevronRight, MapPin, Search, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { PageWithAI } from '@/components/layout/PageWithAI'

function formatMoney(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)} M$`
  if (n >= 1000) return `${Math.round(n / 1000)} k$`
  return `${n}$`
}

const secteurOptions = ['municipal', 'industriel', 'commercial', 'institutionnel', 'residentiel'] as const
const secteurLabels: Record<string, string> = {
  municipal: 'Municipal', industriel: 'Industriel', commercial: 'Commercial',
  institutionnel: 'Institutionnel', residentiel: 'Résidentiel',
}

const emptyContact = (): Contact => ({ nom: '', poste: '', email: '', tel: '' })
const emptyForm = () => ({
  nom: '', type: '' as '' | 'public' | 'prive',
  secteur: '' as '' | 'municipal' | 'industriel' | 'commercial' | 'institutionnel' | 'residentiel',
  adresse: '', ville: '', province: 'QC', codePostal: '', conditionsPaiement: 'Net 30',
  contacts: [emptyContact()],
})

export default function ClientsPage() {
  const [clientList, setClientList] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterSecteur, setFilterSecteur] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState(emptyForm())

  // Charger depuis localStorage
  useEffect(() => { setClientList(getClients()) }, [])

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 3000)
  }

  const filtered = clientList.filter(c => {
    const matchSearch = !search || c.nom.toLowerCase().includes(search.toLowerCase()) ||
      c.contacts.some(ct => ct.nom.toLowerCase().includes(search.toLowerCase()))
    const matchType = !filterType || c.type === filterType
    const matchSecteur = !filterSecteur || c.secteur === filterSecteur
    return matchSearch && matchType && matchSecteur
  })

  /* ── Contacts dans le formulaire ── */
  function setContact(i: number, field: keyof Contact, val: string) {
    setForm(f => {
      const contacts = [...f.contacts]
      contacts[i] = { ...contacts[i], [field]: val }
      return { ...f, contacts }
    })
  }
  function addContact() {
    setForm(f => ({ ...f, contacts: [...f.contacts, emptyContact()] }))
  }
  function removeContact(i: number) {
    setForm(f => ({ ...f, contacts: f.contacts.filter((_, idx) => idx !== i) }))
  }

  /* ── Soumission du formulaire — ajoute vraiment dans la liste ── */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom || !form.type || !form.secteur) return
    const newClient: Client = {
      id: newClientId(),
      nom: form.nom,
      type: form.type as 'public' | 'prive',
      secteur: form.secteur as Client['secteur'],
      adresse: form.adresse,
      ville: form.ville,
      province: form.province,
      codePostal: form.codePostal,
      conditionsPaiement: form.conditionsPaiement,
      contacts: form.contacts.filter(c => c.nom.trim() !== ''),
      createdAt: new Date().toISOString().slice(0, 10),
      projetsIds: [],
      soumissionsIds: [],
      totalContrats: 0,
      tauxSucces: 0,
      margemoyenne: 0,
    }
    upsertClient(newClient)
    setClientList(getClients())
    setModalOpen(false)
    setForm(emptyForm())
    showToast(`Client « ${newClient.nom} » ajouté avec succès.`)
  }

  return (
    <PageWithAI module="clients" title="Clients & CRM">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="space-y-5 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{clientList.length} client{clientList.length > 1 ? 's' : ''} enregistré{clientList.length > 1 ? 's' : ''}</p>
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition" style={{ background: '#C9A84C', color: '#0D1B2A' }}>
            <Plus size={15} /> Nouveau client
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0"><Building2 size={18} className="text-blue-500" /></div>
            <div><p className="text-xs text-slate-500">Publics</p><p className="text-xl font-bold text-slate-800">{clientList.filter(c => c.type === 'public').length}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0"><Users size={18} className="text-purple-500" /></div>
            <div><p className="text-xs text-slate-500">Privés</p><p className="text-xl font-bold text-slate-800">{clientList.filter(c => c.type === 'prive').length}</p></div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0"><TrendingUp size={18} className="text-emerald-500" /></div>
            <div><p className="text-xs text-slate-500">Volume total</p><p className="text-xl font-bold text-slate-800">{formatMoney(clientList.reduce((a, c) => a + c.totalContrats, 0))}</p></div>
          </Card>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Nom, contact..." className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 w-52" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Tous les types</option>
            <option value="public">Public</option>
            <option value="prive">Privé</option>
          </select>
          <select className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none" value={filterSecteur} onChange={e => setFilterSecteur(e.target.value)}>
            <option value="">Tous les secteurs</option>
            {secteurOptions.map(s => <option key={s} value={s}>{secteurLabels[s]}</option>)}
          </select>
          {(search || filterType || filterSecteur) && (
            <button className="text-xs text-slate-400 hover:text-slate-600 underline" onClick={() => { setSearch(''); setFilterType(''); setFilterSecteur('') }}>Réinitialiser</button>
          )}
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Tableau */}
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Secteur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ville</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact principal</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Volume</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Succès</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Marge</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center text-sm text-slate-400 py-12">Aucun client trouvé.</td></tr>
                ) : filtered.map((c, i) => (
                  <tr key={c.id} className={`border-b border-slate-50 hover:bg-amber-50/30 transition cursor-pointer ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: '#0D1B2A', color: '#C9A84C' }}>
                          {c.nom.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{c.nom}</p>
                          <p className="text-xs text-slate-400">{c.contacts.length} contact{c.contacts.length > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><Badge status={c.type} /></td>
                    <td className="px-4 py-3.5 text-slate-600 capitalize">{secteurLabels[c.secteur] ?? c.secteur}</td>
                    <td className="px-4 py-3.5"><div className="flex items-center gap-1 text-slate-500"><MapPin size={12} />{c.ville}</div></td>
                    <td className="px-4 py-3.5">
                      {c.contacts[0] ? (
                        <div>
                          <p className="text-slate-700 font-medium text-xs">{c.contacts[0].nom}</p>
                          <p className="text-slate-400 text-xs">{c.contacts[0].poste}</p>
                        </div>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-slate-800">{formatMoney(c.totalContrats)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`font-semibold ${c.tauxSucces >= 50 ? 'text-emerald-600' : c.tauxSucces >= 30 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {c.tauxSucces > 0 ? `${c.tauxSucces}%` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right"><span className="font-semibold text-slate-700">{c.margemoyenne > 0 ? `${c.margemoyenne}%` : '—'}</span></td>
                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/clients/${c.id}`} className="p-1.5 rounded-lg hover:bg-slate-100 inline-flex text-slate-400 hover:text-amber-600 transition">
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── MODAL NOUVEAU CLIENT ── */}
        <Modal open={modalOpen} onClose={() => { setModalOpen(false); setForm(emptyForm()) }} title="Nouveau client" size="lg">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Informations générales */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Informations générales</p>
              <div className="space-y-3">
                <Field label="Nom de l'organisation" required>
                  <input className={inputCls} placeholder="Ex. Ville de Québec" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Type" required>
                    <select className={selectCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'public' | 'prive' }))} required>
                      <option value="">Choisir...</option>
                      <option value="public">Public</option>
                      <option value="prive">Privé</option>
                    </select>
                  </Field>
                  <Field label="Secteur" required>
                    <select className={selectCls} value={form.secteur} onChange={e => setForm(f => ({ ...f, secteur: e.target.value as Client['secteur'] }))} required>
                      <option value="">Choisir...</option>
                      {secteurOptions.map(s => <option key={s} value={s}>{secteurLabels[s]}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Adresse">
                  <input className={inputCls} placeholder="123 rue Principale" value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Ville">
                    <input className={inputCls} placeholder="Ville" value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))} />
                  </Field>
                  <Field label="Province">
                    <input className={inputCls} placeholder="QC" value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))} />
                  </Field>
                  <Field label="Code postal">
                    <input className={inputCls} placeholder="G1A 0A1" value={form.codePostal} onChange={e => setForm(f => ({ ...f, codePostal: e.target.value }))} />
                  </Field>
                </div>
                <Field label="Conditions de paiement">
                  <select className={selectCls} value={form.conditionsPaiement} onChange={e => setForm(f => ({ ...f, conditionsPaiement: e.target.value }))}>
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
                {form.contacts.map((contact, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3 relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-500">Contact {i + 1}</span>
                      {form.contacts.length > 1 && (
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
              <Btn variant="secondary" type="button" onClick={() => { setModalOpen(false); setForm(emptyForm()) }}>Annuler</Btn>
              <Btn type="submit">Créer le client</Btn>
            </div>
          </form>
        </Modal>
      </div>
    </PageWithAI>
  )
}
