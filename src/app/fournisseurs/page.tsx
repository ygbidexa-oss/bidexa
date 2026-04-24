'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageWithAI } from '@/components/layout/PageWithAI'
import { Modal, Field, inputCls, selectCls, Btn } from '@/components/ui/Modal'
import { Plus, Star, TrendingUp, Package, MapPin, Phone, Mail, AlertCircle } from 'lucide-react'
import {
  getFournisseurs, upsertFournisseur, calcFournisseurStats,
  type FournisseurFull,
} from '@/lib/fournisseurs-store'

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M$`
  if (n >= 1_000) return `${Math.round(n / 1_000)} k$`
  return `${n.toLocaleString()} $`
}

const CATEGORIES = [
  'Béton et granulats','Acier et métaux','Électricité','Plomberie et mécanique',
  'Excavation et terrassement','Tuyauterie industrielle','Menuiserie et bois',
  'Location équipements','Isolation et enveloppe','Peinture et revêtements',
  'Menuiserie extérieure','Soudure et métaux ouvrés','Génie civil','Transport et logistique',
  'Signalisation','Géotechnique','Autre',
]

const STATUTS: Record<string, string> = {
  tous: 'Tous', actif: 'Actifs', inactif: 'Inactifs', favori: 'Favoris',
}

export default function FournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState<FournisseurFull[]>([])
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('toutes')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [sortBy, setSortBy] = useState<'nom' | 'score' | 'achats'>('score')
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState('')

  const [form, setForm] = useState({
    nom: '', categorie: '', adresse: '', ville: '', province: 'QC', codePostal: '',
    telephone: '', email: '', siteWeb: '', neq: '', noTPS: '', noTVQ: '',
    conditionsPaiement: 'Net 30 jours', remise: '0',
    // Premier contact
    contactNom: '', contactPoste: '', contactEmail: '', contactTel: '',
  })

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const load = useCallback(() => setFournisseurs(getFournisseurs()), [])
  useEffect(() => { load() }, [load])

  const filtered = fournisseurs
    .filter(f => {
      const q = search.toLowerCase()
      const matchQ = !q || f.nom.toLowerCase().includes(q) || f.ville.toLowerCase().includes(q) || f.categorie.toLowerCase().includes(q)
      const matchCat = filterCat === 'toutes' || f.categorie === filterCat
      const matchSt = filterStatut === 'tous'
        || (filterStatut === 'actif' && f.actif)
        || (filterStatut === 'inactif' && !f.actif)
        || (filterStatut === 'favori' && f.favori)
      return matchQ && matchCat && matchSt
    })
    .sort((a, b) => {
      if (sortBy === 'score') return b.scorePerformance - a.scorePerformance
      if (sortBy === 'achats') return b.totalAchats - a.totalAchats
      return a.nom.localeCompare(b.nom)
    })

  const totalCA = fournisseurs.filter(f => f.actif).reduce((s, f) => s + f.totalAchats, 0)
  const nbFavoris = fournisseurs.filter(f => f.favori).length
  const nbActifs = fournisseurs.filter(f => f.actif).length

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom.trim() || !form.categorie) return
    const newF: FournisseurFull = {
      id: `f-${Date.now()}`,
      nom: form.nom.trim(),
      categorie: form.categorie,
      adresse: form.adresse,
      ville: form.ville,
      province: form.province,
      codePostal: form.codePostal,
      telephone: form.telephone,
      email: form.email,
      siteWeb: form.siteWeb,
      neq: form.neq,
      noTPS: form.noTPS,
      noTVQ: form.noTVQ,
      contacts: form.contactNom ? [{
        id: `c-${Date.now()}`, nom: form.contactNom, poste: form.contactPoste,
        email: form.contactEmail, tel: form.contactTel, principal: true,
      }] : [],
      comptesBancaires: [],
      documents: [],
      notes: [],
      scorePerformance: 75,
      totalAchats: 0, nombreCommandes: 0, delaiMoyen: 0,
      conditionsPaiement: form.conditionsPaiement,
      devise: 'CAD',
      remise: parseFloat(form.remise) || 0,
      actif: true, favori: false,
      createdAt: new Date().toISOString().slice(0, 10),
    }
    upsertFournisseur(newF)
    load()
    setModalOpen(false)
    setForm({ nom:'',categorie:'',adresse:'',ville:'',province:'QC',codePostal:'',telephone:'',email:'',siteWeb:'',neq:'',noTPS:'',noTVQ:'',conditionsPaiement:'Net 30 jours',remise:'0',contactNom:'',contactPoste:'',contactEmail:'',contactTel:'' })
    showToast(`${newF.nom} ajouté !`)
  }

  const scoreColor = (s: number) => s >= 90 ? 'text-emerald-600' : s >= 80 ? 'text-amber-600' : s >= 70 ? 'text-orange-500' : 'text-red-500'

  return (
    <PageWithAI module="fournisseurs" title="Fournisseurs">
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">{toast}</div>
      )}
      <div className="space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-100 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-400 mb-1">Fournisseurs actifs</p>
            <p className="text-2xl font-extrabold text-slate-800">{nbActifs}</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-600 mb-1">Volume total achats</p>
            <p className="text-2xl font-extrabold text-amber-700">{fmt(totalCA)}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-400 mb-1">Fournisseurs préférés</p>
            <p className="text-2xl font-extrabold text-slate-800">{nbFavoris}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-400 mb-1">Score moyen</p>
            <p className="text-2xl font-extrabold text-slate-800">
              {fournisseurs.length ? Math.round(fournisseurs.reduce((s, f) => s + f.scorePerformance, 0) / fournisseurs.length) : '—'}<span className="text-sm font-normal text-slate-400">/100</span>
            </p>
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">{filtered.length} fournisseur{filtered.length > 1 ? 's' : ''}</p>
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition"
            style={{ background: '#C9A84C' }}>
            <Plus size={15} /> Nouveau fournisseur
          </button>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3">
          <input type="text" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className={inputCls + ' max-w-xs'} />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className={selectCls + ' max-w-[220px]'}>
            <option value="toutes">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} className={selectCls + ' max-w-[160px]'}>
            {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as 'nom' | 'score' | 'achats')} className={selectCls + ' max-w-[160px]'}>
            <option value="score">Trier : Score</option>
            <option value="achats">Trier : Volume</option>
            <option value="nom">Trier : Nom</option>
          </select>
        </div>

        {/* Grille cartes */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(f => {
            const stats = calcFournisseurStats(f.nom)
            const arrerages = stats.arrerages
            const contact = f.contacts.find(c => c.principal) ?? f.contacts[0]
            return (
              <Link key={f.id} href={`/fournisseurs/${f.id}`}>
                <Card className={`hover:shadow-md transition cursor-pointer h-full ${!f.actif ? 'opacity-60' : ''}`}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-extrabold flex-shrink-0"
                        style={{ background: f.favori ? '#C9A84C' : '#0D1B2A', color: f.favori ? '#0D1B2A' : '#C9A84C' }}>
                        {f.nom.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-slate-800 text-sm leading-tight">{f.nom}</h3>
                          {f.favori && <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{f.categorie}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${scoreColor(f.scorePerformance)}`}>{f.scorePerformance}<span className="text-xs font-normal text-slate-400">/100</span></p>
                      {!f.actif && <Badge status="inactif" />}
                    </div>
                  </div>

                  {/* Localisation */}
                  <p className="text-xs text-slate-400 mb-3 flex items-center gap-1"><MapPin size={11} /> {f.ville}, {f.province}</p>

                  {/* Métriques */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-slate-100 mb-3">
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-0.5">Volume</p>
                      <p className="text-sm font-bold text-slate-800">{fmt(f.totalAchats)}</p>
                    </div>
                    <div className="text-center border-x border-slate-100">
                      <p className="text-xs text-slate-400 mb-0.5">Cmd</p>
                      <p className="text-sm font-bold text-slate-800">{f.nombreCommandes}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-0.5">Délai</p>
                      <p className="text-sm font-bold text-slate-800">{f.delaiMoyen}j</p>
                    </div>
                  </div>

                  {/* Arrérages alerte */}
                  {arrerages > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 mb-3">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>Arriéré : <strong>{fmt(arrerages)}</strong></span>
                    </div>
                  )}

                  {/* Contact principal */}
                  {contact && (
                    <div className="text-xs text-slate-500 space-y-0.5">
                      <p className="font-medium text-slate-700">{contact.nom} · {contact.poste}</p>
                      <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-amber-600 hover:underline">
                        <Mail size={11} />{contact.email}
                      </a>
                      <a href={`tel:${contact.tel}`} onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 hover:text-slate-700">
                        <Phone size={11} />{contact.tel}
                      </a>
                    </div>
                  )}
                </Card>
              </Link>
            )
          })}
          {filtered.length === 0 && (
            <p className="col-span-3 text-center text-sm text-slate-400 py-12">Aucun fournisseur trouvé.</p>
          )}
        </div>
      </div>

      {/* ══ Modal nouveau fournisseur ══ */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau fournisseur" size="lg">
        <form onSubmit={handleCreate} className="space-y-5">
          {/* Identité */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Identification</p>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nom de l'entreprise" required>
                  <input className={inputCls} required value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Aciers Dupont inc." />
                </Field>
                <Field label="Catégorie" required>
                  <select className={selectCls} required value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}>
                    <option value="">Sélectionner…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Adresse">
                <input className={inputCls} value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} placeholder="1234 rue Industrielle" />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1"><Field label="Ville"><input className={inputCls} value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))} /></Field></div>
                <Field label="Province"><input className={inputCls} value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))} placeholder="QC" /></Field>
                <Field label="Code postal"><input className={inputCls} value={form.codePostal} onChange={e => setForm(f => ({ ...f, codePostal: e.target.value }))} placeholder="J8P 1A1" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Téléphone"><input className={inputCls} value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} placeholder="819-555-0000" /></Field>
                <Field label="Courriel général"><input className={inputCls} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="info@entreprise.ca" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Site web"><input className={inputCls} value={form.siteWeb} onChange={e => setForm(f => ({ ...f, siteWeb: e.target.value }))} placeholder="www.entreprise.ca" /></Field>
                <Field label="NEQ"><input className={inputCls} value={form.neq} onChange={e => setForm(f => ({ ...f, neq: e.target.value }))} placeholder="1234567890" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="No TPS"><input className={inputCls} value={form.noTPS} onChange={e => setForm(f => ({ ...f, noTPS: e.target.value }))} placeholder="123456789 RT0001" /></Field>
                <Field label="No TVQ"><input className={inputCls} value={form.noTVQ} onChange={e => setForm(f => ({ ...f, noTVQ: e.target.value }))} placeholder="1234567890 TQ0001" /></Field>
              </div>
            </div>
          </div>

          {/* Contact principal */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Contact principal</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nom du contact"><input className={inputCls} value={form.contactNom} onChange={e => setForm(f => ({ ...f, contactNom: e.target.value }))} placeholder="Jean Tremblay" /></Field>
              <Field label="Poste"><input className={inputCls} value={form.contactPoste} onChange={e => setForm(f => ({ ...f, contactPoste: e.target.value }))} placeholder="Directeur des ventes" /></Field>
              <Field label="Courriel contact"><input className={inputCls} type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} /></Field>
              <Field label="Téléphone contact"><input className={inputCls} value={form.contactTel} onChange={e => setForm(f => ({ ...f, contactTel: e.target.value }))} /></Field>
            </div>
          </div>

          {/* Conditions commerciales */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Conditions commerciales</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Conditions de paiement">
                <select className={selectCls} value={form.conditionsPaiement} onChange={e => setForm(f => ({ ...f, conditionsPaiement: e.target.value }))}>
                  {['Net 30 jours','Net 15 jours','Net 45 jours','Net 60 jours','Comptant','50% avance / 50% livraison'].map(v => <option key={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="Remise négociée (%)">
                <input className={inputCls} type="number" min="0" max="100" step="0.5" value={form.remise} onChange={e => setForm(f => ({ ...f, remise: e.target.value }))} />
              </Field>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Btn variant="secondary" type="button" onClick={() => setModalOpen(false)}>Annuler</Btn>
            <Btn type="submit">Créer le fournisseur</Btn>
          </div>
        </form>
      </Modal>
    </PageWithAI>
  )
}
