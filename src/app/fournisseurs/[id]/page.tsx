'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageWithAI } from '@/components/layout/PageWithAI'
import { Modal, Field, inputCls, selectCls, Btn } from '@/components/ui/Modal'
import {
  getFournisseurById, upsertFournisseur, addContact, removeContact,
  addCompteBancaire, removeCompteBancaire, addNote, addDocument, calcFournisseurStats,
  type FournisseurFull, type FournisseurContact, type CompteBancaire,
} from '@/lib/fournisseurs-store'
import { getPOs } from '@/lib/po-bridge'
import {
  ArrowLeft, Star, MapPin, Phone, Mail, Globe, Building2, Users, CreditCard,
  FileText, Package, MessageSquare, Pencil, Trash2, Plus, CheckCircle2,
  AlertCircle, TrendingUp, BadgeCheck, Clock, ChevronRight,
} from 'lucide-react'

function fmt(n: number) {
  return n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })
}
function fmtN(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M$`
  if (n >= 1_000) return `${Math.round(n / 1_000)} k$`
  return `${n.toLocaleString()} $`
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 90 ? '#10b981' : score >= 80 ? '#f59e0b' : score >= 70 ? '#f97316' : '#ef4444'
  const r = 30; const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute text-lg font-extrabold" style={{ color }}>{score}</span>
    </div>
  )
}

const TABS = [
  { id: 'apercu',    label: 'Aperçu',          icon: TrendingUp },
  { id: 'contacts',  label: 'Contacts',         icon: Users },
  { id: 'banque',    label: 'Comptes bancaires', icon: CreditCard },
  { id: 'historique',label: 'Historique POs',   icon: Package },
  { id: 'documents', label: 'Documents',        icon: FileText },
  { id: 'notes',     label: 'Notes internes',   icon: MessageSquare },
]

const CONDITIONS_PAIEMENT = ['Net 30 jours','Net 15 jours','Net 45 jours','Net 60 jours','Comptant','50% avance / 50% livraison']

export default function FournisseurDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [f, setF] = useState<FournisseurFull | null>(null)
  const [tab, setTab] = useState('apercu')
  const [toast, setToast] = useState('')

  // Modals
  const [modalEdit, setModalEdit] = useState(false)
  const [modalContact, setModalContact] = useState(false)
  const [modalBanque, setModalBanque] = useState(false)
  const [modalNote, setModalNote] = useState(false)
  const [modalDoc, setModalDoc] = useState(false)
  const [editContactTarget, setEditContactTarget] = useState<FournisseurContact | null>(null)

  // Drafts
  const [editForm, setEditForm] = useState<Partial<FournisseurFull>>({})
  const [contactForm, setContactForm] = useState({ nom: '', poste: '', email: '', tel: '', mobile: '', principal: false })
  const [banqueForm, setBanqueForm] = useState({ libelle: '', institution: '', transit: '', noCompte: '', iban: '', swift: '', devise: 'CAD', principal: false })
  const [noteTexte, setNoteTexte] = useState('')
  const [docForm, setDocForm] = useState<{ type: 'assurance' | 'certificat' | 'contrat' | 'autre'; titre: string; dateExpiration: string; notes: string }>(
    { type: 'assurance', titre: '', dateExpiration: '', notes: '' }
  )

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const load = useCallback(() => { const found = getFournisseurById(id); setF(found ?? null) }, [id])
  useEffect(() => { load() }, [load])

  if (!f) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      <div className="text-center">
        <p className="text-lg font-semibold mb-2">Fournisseur introuvable</p>
        <Link href="/fournisseurs" className="text-sm text-amber-600 hover:underline">← Retour à la liste</Link>
      </div>
    </div>
  )

  const fPOs = getPOs().filter(po => po.fournisseurNom === f.nom)
  const stats = calcFournisseurStats(f.nom)
  const arrerages = stats.arrerages
  const scoreColor = f.scorePerformance >= 90 ? 'text-emerald-600' : f.scorePerformance >= 80 ? 'text-amber-600' : f.scorePerformance >= 70 ? 'text-orange-500' : 'text-red-500'
  const contact = f.contacts.find(c => c.principal) ?? f.contacts[0]

  /* ── Handlers ── */
  function handleToggleFavori() {
    const updated = { ...f!, favori: !f!.favori }
    upsertFournisseur(updated)
    load()
    showToast(updated.favori ? 'Ajouté aux favoris.' : 'Retiré des favoris.')
  }

  function handleToggleActif() {
    const updated = { ...f!, actif: !f!.actif }
    upsertFournisseur(updated)
    load()
    showToast(updated.actif ? 'Fournisseur réactivé.' : 'Fournisseur désactivé.')
  }

  function openEdit() { setEditForm({ ...f! }); setModalEdit(true) }

  function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    upsertFournisseur({ ...f!, ...editForm } as FournisseurFull)
    load()
    setModalEdit(false)
    showToast('Fiche mise à jour.')
  }

  function saveContact(e: React.FormEvent) {
    e.preventDefault()
    if (editContactTarget) {
      const updated: FournisseurFull = {
        ...f!,
        contacts: f!.contacts.map(c => c.id === editContactTarget.id ? { ...c, ...contactForm } : c),
      }
      upsertFournisseur(updated)
    } else {
      addContact(f!.id, { ...contactForm })
    }
    load()
    setModalContact(false)
    setContactForm({ nom: '', poste: '', email: '', tel: '', mobile: '', principal: false })
    setEditContactTarget(null)
    showToast('Contact sauvegardé.')
  }

  function saveBanque(e: React.FormEvent) {
    e.preventDefault()
    addCompteBancaire(f!.id, { ...banqueForm })
    load()
    setModalBanque(false)
    setBanqueForm({ libelle: '', institution: '', transit: '', noCompte: '', iban: '', swift: '', devise: 'CAD', principal: false })
    showToast('Compte bancaire ajouté.')
  }

  function saveNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteTexte.trim()) return
    addNote(f!.id, noteTexte, 'Moi')
    load()
    setModalNote(false)
    setNoteTexte('')
    showToast('Note ajoutée.')
  }

  function saveDoc(e: React.FormEvent) {
    e.preventDefault()
    if (!docForm.titre.trim()) return
    addDocument(f!.id, { ...docForm })
    load()
    setModalDoc(false)
    setDocForm({ type: 'assurance', titre: '', dateExpiration: '', notes: '' })
    showToast('Document ajouté.')
  }

  return (
    <PageWithAI module="fournisseurs" title="Fiche fournisseur">
      {toast && <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">{toast}</div>}

      <div className="space-y-5 overflow-y-auto">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition"><ArrowLeft size={18} /></button>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-extrabold"
              style={{ background: f.favori ? '#C9A84C' : '#0D1B2A', color: f.favori ? '#0D1B2A' : '#C9A84C' }}>
              {f.nom.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-800">{f.nom}</h1>
                {f.favori && <Star size={16} className="text-amber-400 fill-amber-400" />}
                {!f.actif && <Badge status="inactif" />}
              </div>
              <p className="text-sm text-slate-400 mt-0.5">{f.categorie} · {f.ville}, {f.province}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleToggleFavori}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${f.favori ? 'border-amber-300 text-amber-600 bg-amber-50' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              <Star size={13} /> {f.favori ? 'Favori' : 'Ajouter aux favoris'}
            </button>
            <button onClick={handleToggleActif}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${f.actif ? 'border-slate-200 text-slate-500 hover:bg-slate-50' : 'border-emerald-300 text-emerald-600 bg-emerald-50'}`}>
              <CheckCircle2 size={13} /> {f.actif ? 'Désactiver' : 'Réactiver'}
            </button>
            <button onClick={openEdit}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition"
              style={{ background: '#C9A84C' }}>
              <Pencil size={14} /> Modifier
            </button>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-600 mb-1">Volume d'achats</p>
            <p className="text-xl font-extrabold text-amber-700">{fmtN(f.totalAchats)}</p>
            <p className="text-xs text-amber-500 mt-0.5">{f.nombreCommandes} commande{f.nombreCommandes !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-400 mb-1">POs actifs</p>
            <p className="text-xl font-extrabold text-slate-800">{fPOs.filter(p => p.statut !== 'ferme' && p.statut !== 'brouillon').length}</p>
            <p className="text-xs text-slate-400 mt-0.5">{fmtN(stats.totalAchats)} TTC</p>
          </div>
          <div className={`border rounded-xl px-4 py-3 ${arrerages > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
            <p className={`text-xs mb-1 ${arrerages > 0 ? 'text-red-600' : 'text-emerald-600'}`}>Arriérés dus</p>
            <p className={`text-xl font-extrabold ${arrerages > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{fmtN(arrerages)}</p>
            {arrerages > 0 && <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1"><AlertCircle size={11} />Action requise</p>}
          </div>
          <div className="bg-white border border-slate-100 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-400 mb-1">Délai moyen</p>
            <p className="text-xl font-extrabold text-slate-800">{f.delaiMoyen} <span className="text-sm font-normal">jour{f.delaiMoyen !== 1 ? 's' : ''}</span></p>
            <p className="text-xs text-slate-400 mt-0.5">{f.conditionsPaiement}</p>
          </div>
        </div>

        {/* ── Onglets ── */}
        <div className="flex gap-1 flex-wrap border-b border-slate-100 pb-0">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition whitespace-nowrap ${tab === t.id ? 'text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                style={tab === t.id ? { background: '#0D1B2A' } : {}}>
                <Icon size={13} /> {t.label}
              </button>
            )
          })}
        </div>

        {/* ══ APERÇU ══ */}
        {tab === 'apercu' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coordonnées */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><MapPin size={14} /> Coordonnées</h3>
              <div className="space-y-2 text-sm">
                {f.adresse && <div className="flex items-start gap-2 text-slate-600"><MapPin size={14} className="mt-0.5 shrink-0 text-slate-300" /><p>{f.adresse}, {f.ville} {f.province} {f.codePostal}</p></div>}
                {f.telephone && <div className="flex items-center gap-2"><Phone size={14} className="text-slate-300" /><a href={`tel:${f.telephone}`} className="text-slate-600 hover:text-amber-600">{f.telephone}</a></div>}
                {f.email && <div className="flex items-center gap-2"><Mail size={14} className="text-slate-300" /><a href={`mailto:${f.email}`} className="text-amber-600 hover:underline">{f.email}</a></div>}
                {f.siteWeb && <div className="flex items-center gap-2"><Globe size={14} className="text-slate-300" /><a href={`https://${f.siteWeb.replace(/^https?:\/\//,'')}`} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">{f.siteWeb}</a></div>}
              </div>
              {(f.neq || f.noTPS || f.noTVQ) && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-1 text-xs text-slate-400">
                  {f.neq && <p>NEQ : <span className="text-slate-600 font-medium">{f.neq}</span></p>}
                  {f.noTPS && <p>TPS : <span className="text-slate-600 font-medium">{f.noTPS}</span></p>}
                  {f.noTVQ && <p>TVQ : <span className="text-slate-600 font-medium">{f.noTVQ}</span></p>}
                </div>
              )}
            </Card>

            {/* Score performance */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><BadgeCheck size={14} /> Performance</h3>
              <div className="flex items-center gap-6">
                <ScoreRing score={f.scorePerformance} />
                <div className="flex-1 space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">Score global</span><span className={`font-bold ${scoreColor}`}>{f.scorePerformance}/100</span></div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${f.scorePerformance}%`, background: '#C9A84C' }} /></div>
                  </div>
                  {f.scoreQualite !== undefined && (
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">Qualité</span><span className="font-semibold text-slate-600">{f.scoreQualite}/100</span></div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-blue-400" style={{ width: `${f.scoreQualite}%` }} /></div>
                    </div>
                  )}
                  {f.scorePonctualite !== undefined && (
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">Ponctualité</span><span className="font-semibold text-slate-600">{f.scorePonctualite}/100</span></div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${f.scorePonctualite}%` }} /></div>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 p-3 rounded-xl text-xs text-center font-semibold"
                style={{ background: f.scorePerformance >= 90 ? '#d1fae5' : f.scorePerformance >= 80 ? '#fef3c7' : '#fee2e2',
                         color: f.scorePerformance >= 90 ? '#065f46' : f.scorePerformance >= 80 ? '#92400e' : '#991b1b' }}>
                {f.scorePerformance >= 90 ? '⭐ Fournisseur préféré — Excellent' : f.scorePerformance >= 80 ? 'Satisfaisant' : f.scorePerformance >= 70 ? 'Performance à améliorer' : '⚠ À surveiller'}
              </div>
            </Card>

            {/* Conditions commerciales */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Conditions commerciales</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-400 mb-0.5">Paiement</p><p className="font-semibold text-slate-700">{f.conditionsPaiement}</p></div>
                <div><p className="text-xs text-slate-400 mb-0.5">Devise</p><p className="font-semibold text-slate-700">{f.devise}</p></div>
                <div><p className="text-xs text-slate-400 mb-0.5">Remise négociée</p><p className="font-semibold text-slate-700">{f.remise ?? 0}%</p></div>
                <div><p className="text-xs text-slate-400 mb-0.5">Délai livraison moyen</p><p className="font-semibold text-slate-700">{f.delaiMoyen} jour{f.delaiMoyen !== 1 ? 's' : ''}</p></div>
              </div>
            </Card>

            {/* Contact principal rapide */}
            {contact && (
              <Card>
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><Users size={14} /> Contact principal</h3>
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-slate-800">{contact.nom}</p>
                  <p className="text-xs text-slate-400">{contact.poste}</p>
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-amber-600 hover:underline"><Mail size={13} />{contact.email}</a>
                  <a href={`tel:${contact.tel}`} className="flex items-center gap-2 text-slate-500 hover:text-slate-700"><Phone size={13} />{contact.tel}</a>
                  {contact.mobile && <a href={`tel:${contact.mobile}`} className="flex items-center gap-2 text-slate-500 hover:text-slate-700"><Phone size={13} />{contact.mobile} (mobile)</a>}
                </div>
                {f.contacts.length > 1 && (
                  <button onClick={() => setTab('contacts')} className="mt-3 text-xs text-amber-600 hover:underline">
                    + {f.contacts.length - 1} autre{f.contacts.length > 2 ? 's' : ''} contact{f.contacts.length > 2 ? 's' : ''} →
                  </button>
                )}
              </Card>
            )}
          </div>
        )}

        {/* ══ CONTACTS ══ */}
        {tab === 'contacts' && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">{f.contacts.length} contact{f.contacts.length !== 1 ? 's' : ''}</h3>
              <button onClick={() => { setEditContactTarget(null); setContactForm({ nom:'',poste:'',email:'',tel:'',mobile:'',principal:false }); setModalContact(true) }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white hover:opacity-90"
                style={{ background: '#C9A84C' }}>
                <Plus size={13} /> Ajouter un contact
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {f.contacts.map(c => (
                <Card key={c.id}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800">{c.nom}</p>
                        {c.principal && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Principal</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{c.poste}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditContactTarget(c); setContactForm({ nom: c.nom, poste: c.poste, email: c.email, tel: c.tel, mobile: c.mobile ?? '', principal: c.principal }); setModalContact(true) }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><Pencil size={13} /></button>
                      <button onClick={() => { removeContact(f!.id, c.id); load(); showToast('Contact supprimé.') }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-amber-600 hover:underline"><Mail size={13} />{c.email}</a>
                    <a href={`tel:${c.tel}`} className="flex items-center gap-2 text-slate-500 hover:text-slate-700"><Phone size={13} />{c.tel}</a>
                    {c.mobile && <a href={`tel:${c.mobile}`} className="flex items-center gap-2 text-slate-500 hover:text-slate-700"><Phone size={13} />{c.mobile} <span className="text-xs text-slate-400">(mobile)</span></a>}
                  </div>
                </Card>
              ))}
              {f.contacts.length === 0 && <p className="text-sm text-slate-400 py-6">Aucun contact enregistré.</p>}
            </div>
          </>
        )}

        {/* ══ COMPTES BANCAIRES ══ */}
        {tab === 'banque' && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">{f.comptesBancaires.length} compte{f.comptesBancaires.length !== 1 ? 's' : ''} bancaire{f.comptesBancaires.length !== 1 ? 's' : ''}</h3>
              <button onClick={() => setModalBanque(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white hover:opacity-90"
                style={{ background: '#C9A84C' }}>
                <Plus size={13} /> Ajouter un compte
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {f.comptesBancaires.map(cb => (
                <Card key={cb.id}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800">{cb.libelle}</p>
                        {cb.principal && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Principal</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{cb.devise}</p>
                    </div>
                    <button onClick={() => { removeCompteBancaire(f!.id, cb.id); load(); showToast('Compte supprimé.') }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Institution</span><span className="font-semibold text-slate-700">{cb.institution}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Transit</span><span className="font-mono text-slate-600">{cb.transit}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">No compte</span><span className="font-mono text-slate-600">{cb.noCompte}</span></div>
                    {cb.iban && <div className="flex justify-between"><span className="text-slate-400">IBAN</span><span className="font-mono text-slate-600">{cb.iban}</span></div>}
                    {cb.swift && <div className="flex justify-between"><span className="text-slate-400">SWIFT/BIC</span><span className="font-mono text-slate-600">{cb.swift}</span></div>}
                  </div>
                </Card>
              ))}
              {f.comptesBancaires.length === 0 && (
                <div className="md:col-span-2 text-center py-10">
                  <CreditCard size={28} className="mx-auto mb-3 text-slate-200" />
                  <p className="text-sm text-slate-400">Aucun compte bancaire enregistré.</p>
                  <button onClick={() => setModalBanque(true)} className="mt-2 text-xs text-amber-600 hover:underline">Ajouter un compte →</button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══ HISTORIQUE POs ══ */}
        {tab === 'historique' && (() => {
          const totalCA = fPOs.filter(p => p.statut !== 'brouillon').reduce((s, p) => s + p.montantTotal, 0)
          const totalPaye = fPOs.reduce((s, p) => s + p.montantPaye, 0)
          const solde = fPOs.filter(p => p.statut !== 'ferme' && p.statut !== 'brouillon').reduce((s, p) => s + (p.montantTotal - p.montantPaye), 0)
          return (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-amber-600 mb-1">Chiffre d'affaires</p>
                  <p className="text-lg font-extrabold text-amber-700">{fmtN(totalCA)}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-emerald-600 mb-1">Total payé</p>
                  <p className="text-lg font-extrabold text-emerald-700">{fmtN(totalPaye)}</p>
                </div>
                <div className={`border rounded-xl px-4 py-3 ${solde > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                  <p className={`text-xs mb-1 ${solde > 0 ? 'text-red-600' : 'text-slate-400'}`}>Arriéré impayé</p>
                  <p className={`text-lg font-extrabold ${solde > 0 ? 'text-red-700' : 'text-slate-400'}`}>{fmtN(solde)}</p>
                </div>
              </div>
              <Card padding={false}>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">PO #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Projet</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Montant TTC</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Payé</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">Reliquat</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Statut</th>
                    <th className="px-2 py-3"></th>
                  </tr></thead>
                  <tbody>
                    {fPOs.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-sm text-slate-400">Aucun bon de commande trouvé pour ce fournisseur.</td></tr>}
                    {fPOs.map((po, i) => {
                      const reliquat = +(po.montantTotal - po.montantPaye).toFixed(2)
                      return (
                        <tr key={po.id} className={`border-b border-slate-50 hover:bg-slate-50 ${i%2!==0?'bg-slate-50/30':''}`}>
                          <td className="px-5 py-3"><Link href={`/bons-commande/${po.id}`} className="text-amber-600 font-semibold hover:underline">{po.numero}</Link></td>
                          <td className="px-4 py-3 text-xs text-slate-500 truncate max-w-[140px]">{po.projetTitre}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-800">{fmt(po.montantTotal)}</td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-semibold">{fmt(po.montantPaye)}</td>
                          <td className="px-4 py-3 text-right hidden md:table-cell">
                            <span className={reliquat > 0 && po.statut !== 'ferme' && po.statut !== 'brouillon' ? 'text-red-600 font-bold' : 'text-slate-400'}>{fmt(reliquat)}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell">{new Date(po.dateEmission).toLocaleDateString('fr-CA')}</td>
                          <td className="px-4 py-3"><Badge status={po.statut} /></td>
                          <td className="px-2 py-3"><Link href={`/bons-commande/${po.id}`}><ChevronRight size={14} className="text-slate-300" /></Link></td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {fPOs.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50">
                        <td colSpan={2} className="px-5 py-3 text-xs font-bold text-slate-600">Total ({fPOs.length} POs)</td>
                        <td className="px-4 py-3 text-right font-extrabold text-slate-800">{fmt(totalCA)}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-emerald-600">{fmt(totalPaye)}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-red-600 hidden md:table-cell">{fmt(solde)}</td>
                        <td colSpan={3}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </Card>
            </>
          )
        })()}

        {/* ══ DOCUMENTS ══ */}
        {tab === 'documents' && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">{f.documents.length} document{f.documents.length !== 1 ? 's' : ''}</h3>
              <button onClick={() => setModalDoc(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white hover:opacity-90"
                style={{ background: '#C9A84C' }}>
                <Plus size={13} /> Ajouter un document
              </button>
            </div>
            <div className="space-y-3">
              {f.documents.length === 0 && <p className="text-sm text-slate-400 text-center py-10">Aucun document enregistré.</p>}
              {f.documents.map(doc => {
                const expired = doc.dateExpiration && new Date(doc.dateExpiration) < new Date()
                const expireSoon = doc.dateExpiration && !expired && (new Date(doc.dateExpiration).getTime() - Date.now()) < 30 * 86400 * 1000
                return (
                  <Card key={doc.id}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-500 shrink-0">
                          <FileText size={14} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{doc.titre}</p>
                          <p className="text-xs text-slate-400 capitalize">{doc.type}</p>
                          {doc.dateExpiration && (
                            <p className={`text-xs mt-0.5 flex items-center gap-1 ${expired ? 'text-red-500' : expireSoon ? 'text-amber-500' : 'text-slate-400'}`}>
                              <Clock size={11} />
                              Exp. : {new Date(doc.dateExpiration).toLocaleDateString('fr-CA')}
                              {expired && ' — EXPIRÉ'}
                              {expireSoon && ' — bientôt'}
                            </p>
                          )}
                          {doc.notes && <p className="text-xs text-slate-400 mt-0.5">{doc.notes}</p>}
                        </div>
                      </div>
                      <p className="text-xs text-slate-300">{new Date(doc.uploadedAt).toLocaleDateString('fr-CA')}</p>
                    </div>
                  </Card>
                )
              })}
            </div>
          </>
        )}

        {/* ══ NOTES ══ */}
        {tab === 'notes' && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">{f.notes.length} note{f.notes.length !== 1 ? 's' : ''}</h3>
              <button onClick={() => setModalNote(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white hover:opacity-90"
                style={{ background: '#C9A84C' }}>
                <Plus size={13} /> Ajouter une note
              </button>
            </div>
            <div className="space-y-3">
              {f.notes.length === 0 && <p className="text-sm text-slate-400 text-center py-10">Aucune note interne.</p>}
              {[...f.notes].reverse().map(n => (
                <Card key={n.id}>
                  <div className="flex justify-between items-start mb-1.5">
                    <p className="text-xs font-semibold text-slate-600">{n.auteur}</p>
                    <p className="text-xs text-slate-400">{new Date(n.date).toLocaleDateString('fr-CA')}</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{n.texte}</p>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ══ Modal Modifier fournisseur ══ */}
      <Modal open={modalEdit} onClose={() => setModalEdit(false)} title="Modifier le fournisseur" size="lg">
        <form onSubmit={saveEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom" required><input className={inputCls} required value={editForm.nom ?? ''} onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))} /></Field>
            <Field label="Catégorie">
              <select className={selectCls} value={editForm.categorie ?? ''} onChange={e => setEditForm(f => ({ ...f, categorie: e.target.value }))}>
                {['Béton et granulats','Acier et métaux','Électricité','Plomberie et mécanique','Excavation et terrassement','Tuyauterie industrielle','Menuiserie et bois','Location équipements','Isolation et enveloppe','Peinture et revêtements','Menuiserie extérieure','Soudure et métaux ouvrés','Génie civil','Transport et logistique','Signalisation','Géotechnique','Autre'].map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Adresse"><input className={inputCls} value={editForm.adresse ?? ''} onChange={e => setEditForm(f => ({ ...f, adresse: e.target.value }))} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1"><Field label="Ville"><input className={inputCls} value={editForm.ville ?? ''} onChange={e => setEditForm(f => ({ ...f, ville: e.target.value }))} /></Field></div>
            <Field label="Province"><input className={inputCls} value={editForm.province ?? ''} onChange={e => setEditForm(f => ({ ...f, province: e.target.value }))} /></Field>
            <Field label="Code postal"><input className={inputCls} value={editForm.codePostal ?? ''} onChange={e => setEditForm(f => ({ ...f, codePostal: e.target.value }))} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Téléphone"><input className={inputCls} value={editForm.telephone ?? ''} onChange={e => setEditForm(f => ({ ...f, telephone: e.target.value }))} /></Field>
            <Field label="Courriel"><input className={inputCls} type="email" value={editForm.email ?? ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Site web"><input className={inputCls} value={editForm.siteWeb ?? ''} onChange={e => setEditForm(f => ({ ...f, siteWeb: e.target.value }))} /></Field>
            <Field label="NEQ"><input className={inputCls} value={editForm.neq ?? ''} onChange={e => setEditForm(f => ({ ...f, neq: e.target.value }))} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="No TPS"><input className={inputCls} value={editForm.noTPS ?? ''} onChange={e => setEditForm(f => ({ ...f, noTPS: e.target.value }))} /></Field>
            <Field label="No TVQ"><input className={inputCls} value={editForm.noTVQ ?? ''} onChange={e => setEditForm(f => ({ ...f, noTVQ: e.target.value }))} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Conditions paiement">
              <select className={selectCls} value={editForm.conditionsPaiement ?? ''} onChange={e => setEditForm(f => ({ ...f, conditionsPaiement: e.target.value }))}>
                {CONDITIONS_PAIEMENT.map(v => <option key={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Remise (%)">
              <input className={inputCls} type="number" min="0" max="100" step="0.5" value={editForm.remise ?? 0} onChange={e => setEditForm(f => ({ ...f, remise: parseFloat(e.target.value) || 0 }))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Score performance (0–100)">
              <input className={inputCls} type="number" min="0" max="100" value={editForm.scorePerformance ?? 75} onChange={e => setEditForm(f => ({ ...f, scorePerformance: parseInt(e.target.value) || 0 }))} />
            </Field>
            <Field label="Délai moyen livraison (jours)">
              <input className={inputCls} type="number" min="0" value={editForm.delaiMoyen ?? 0} onChange={e => setEditForm(f => ({ ...f, delaiMoyen: parseInt(e.target.value) || 0 }))} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Btn variant="secondary" type="button" onClick={() => setModalEdit(false)}>Annuler</Btn>
            <Btn type="submit">Sauvegarder</Btn>
          </div>
        </form>
      </Modal>

      {/* ══ Modal Contact ══ */}
      <Modal open={modalContact} onClose={() => setModalContact(false)} title={editContactTarget ? 'Modifier le contact' : 'Ajouter un contact'} size="md">
        <form onSubmit={saveContact} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom complet" required><input className={inputCls} required value={contactForm.nom} onChange={e => setContactForm(f => ({ ...f, nom: e.target.value }))} /></Field>
            <Field label="Poste"><input className={inputCls} value={contactForm.poste} onChange={e => setContactForm(f => ({ ...f, poste: e.target.value }))} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Courriel"><input className={inputCls} type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} /></Field>
            <Field label="Téléphone"><input className={inputCls} value={contactForm.tel} onChange={e => setContactForm(f => ({ ...f, tel: e.target.value }))} /></Field>
          </div>
          <Field label="Mobile (optionnel)"><input className={inputCls} value={contactForm.mobile} onChange={e => setContactForm(f => ({ ...f, mobile: e.target.value }))} /></Field>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={contactForm.principal} onChange={e => setContactForm(f => ({ ...f, principal: e.target.checked }))} className="rounded" />
            Contact principal
          </label>
          <div className="flex justify-end gap-2"><Btn variant="secondary" type="button" onClick={() => setModalContact(false)}>Annuler</Btn><Btn type="submit">Sauvegarder</Btn></div>
        </form>
      </Modal>

      {/* ══ Modal Compte bancaire ══ */}
      <Modal open={modalBanque} onClose={() => setModalBanque(false)} title="Ajouter un compte bancaire" size="md">
        <form onSubmit={saveBanque} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Libellé du compte" required><input className={inputCls} required value={banqueForm.libelle} onChange={e => setBanqueForm(f => ({ ...f, libelle: e.target.value }))} placeholder="Compte opérations" /></Field>
            <Field label="Institution financière" required><input className={inputCls} required value={banqueForm.institution} onChange={e => setBanqueForm(f => ({ ...f, institution: e.target.value }))} placeholder="Banque Nationale" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Transit (5 chiffres)"><input className={inputCls} value={banqueForm.transit} onChange={e => setBanqueForm(f => ({ ...f, transit: e.target.value }))} placeholder="00123" /></Field>
            <Field label="Numéro de compte" required><input className={inputCls} required value={banqueForm.noCompte} onChange={e => setBanqueForm(f => ({ ...f, noCompte: e.target.value }))} placeholder="1234567" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="IBAN (optionnel)"><input className={inputCls} value={banqueForm.iban} onChange={e => setBanqueForm(f => ({ ...f, iban: e.target.value }))} /></Field>
            <Field label="SWIFT / BIC (optionnel)"><input className={inputCls} value={banqueForm.swift} onChange={e => setBanqueForm(f => ({ ...f, swift: e.target.value }))} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Devise">
              <select className={selectCls} value={banqueForm.devise} onChange={e => setBanqueForm(f => ({ ...f, devise: e.target.value }))}>
                {['CAD','USD','EUR','GBP'].map(v => <option key={v}>{v}</option>)}
              </select>
            </Field>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={banqueForm.principal} onChange={e => setBanqueForm(f => ({ ...f, principal: e.target.checked }))} className="rounded" />
                Compte principal
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2"><Btn variant="secondary" type="button" onClick={() => setModalBanque(false)}>Annuler</Btn><Btn type="submit">Ajouter</Btn></div>
        </form>
      </Modal>

      {/* ══ Modal Note ══ */}
      <Modal open={modalNote} onClose={() => setModalNote(false)} title="Ajouter une note interne" size="md">
        <form onSubmit={saveNote} className="space-y-3">
          <Field label="Note" required>
            <textarea className={inputCls} rows={5} required value={noteTexte} onChange={e => setNoteTexte(e.target.value)} placeholder="Observation, accord verbal, commentaire de performance..." />
          </Field>
          <div className="flex justify-end gap-2"><Btn variant="secondary" type="button" onClick={() => setModalNote(false)}>Annuler</Btn><Btn type="submit">Ajouter</Btn></div>
        </form>
      </Modal>

      {/* ══ Modal Document ══ */}
      <Modal open={modalDoc} onClose={() => setModalDoc(false)} title="Ajouter un document" size="md">
        <form onSubmit={saveDoc} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Titre" required><input className={inputCls} required value={docForm.titre} onChange={e => setDocForm(f => ({ ...f, titre: e.target.value }))} placeholder="Certificat d'assurance 2024" /></Field>
            <Field label="Type">
              <select className={selectCls} value={docForm.type} onChange={e => setDocForm(f => ({ ...f, type: e.target.value as 'assurance' | 'certificat' | 'contrat' | 'autre' }))}>
                <option value="assurance">Assurance</option>
                <option value="certificat">Certificat</option>
                <option value="contrat">Contrat</option>
                <option value="autre">Autre</option>
              </select>
            </Field>
          </div>
          <Field label="Date d'expiration"><input className={inputCls} type="date" value={docForm.dateExpiration} onChange={e => setDocForm(f => ({ ...f, dateExpiration: e.target.value }))} /></Field>
          <Field label="Notes"><input className={inputCls} value={docForm.notes} onChange={e => setDocForm(f => ({ ...f, notes: e.target.value }))} placeholder="Informations additionnelles..." /></Field>
          <div className="flex justify-end gap-2"><Btn variant="secondary" type="button" onClick={() => setModalDoc(false)}>Annuler</Btn><Btn type="submit">Ajouter</Btn></div>
        </form>
      </Modal>
    </PageWithAI>
  )
}
