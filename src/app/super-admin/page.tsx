'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useSupabaseAuth'
import {
  getTenants, suspendTenant, cancelTenant, upgradePlan, getAllFactures,
  sendRappel, markFacturePayee, sendAllRappelsAuto,
  getSaasPartners, upsertPartner, togglePartner, getInfraCost,
  getPartnerFactures, addPartnerFacture, updatePartnerFacture,
  getTickets, createTicket, updateTicket,
  getCustomPlans, upsertCustomPlan, deleteCustomPlan,
  getForfaitsConfig, upsertForfaitConfig, resetForfaitConfig,
  FORFAITS_CONFIG, ALL_MODULES_LABELS, ALL_MODULES_LIST,
  Tenant, ForfaitType, SaasPartner,
  SupportTicket, PartnerCategorie, TicketPriorite, CustomPlan, ForfaitConfig,
} from '@/lib/subscriptions-store'
import {
  Users, DollarSign, Bot, TrendingDown, ChevronDown,
  CheckCircle, XCircle, AlertTriangle, MoreVertical,
  Building2, Calendar, CreditCard, X, Settings, FileText,
  Server, Headphones, BarChart3, Plus, RefreshCw, Zap,
  TrendingUp, Clock, Bell, Send, Mail, Trash2, Edit, Eye,
} from 'lucide-react'

// ── Helpers ─────────────────────────────────────────────────────────────────

const FORFAIT_COLORS: Record<string, string> = {
  starter: 'bg-slate-100 text-slate-600',
  pro: 'bg-amber-100 text-amber-700',
  enterprise: 'bg-violet-100 text-violet-700',
}

// ── Modal édition forfait ────────────────────────────────────────────────────

function ForfaitEditModal({ config, onClose, onSave }: {
  config: ForfaitConfig; onClose: () => void; onSave: () => void
}) {
  const [form, setForm] = useState<ForfaitConfig>({ ...config })
  const [featuresText, setFeaturesText] = useState(config.features.join('\n'))

  function save() {
    upsertForfaitConfig({
      ...form,
      features: featuresText.split('\n').map(s => s.trim()).filter(Boolean),
    })
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800">Modifier le forfait</h3>
            <p className="text-xs text-slate-400 mt-0.5">Les changements seront visibles sur la landing page après rechargement</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X size={14} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Nom du forfait</label>
            <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Prix / mois ($ — 0 = Sur devis)</label>
            <input type="number" value={form.prix ?? 0} onChange={e => setForm(p => ({ ...p, prix: Number(e.target.value) === 0 ? null : Number(e.target.value) }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Utilisateurs max (0 = illimité)</label>
            <input type="number" value={form.maxUtilisateurs ?? 0} onChange={e => setForm(p => ({ ...p, maxUtilisateurs: Number(e.target.value) === 0 ? null : Number(e.target.value) }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">IA req/jour</label>
            <input type="number" value={form.iaJour} onChange={e => setForm(p => ({ ...p, iaJour: Number(e.target.value) }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">IA req/mois</label>
            <input type="number" value={form.iaMois} onChange={e => setForm(p => ({ ...p, iaMois: Number(e.target.value) }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Description courte (landing page)</label>
            <input value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Texte du bouton CTA</label>
            <input value={form.cta} onChange={e => setForm(p => ({ ...p, cta: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => setForm(p => ({ ...p, highlighted: !p.highlighted }))}
                className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${form.highlighted ? 'bg-amber-400' : 'bg-slate-200'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.highlighted ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <span className="text-xs font-medium text-slate-600">Badge &ldquo;Recommandé&rdquo;</span>
            </label>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Fonctionnalités incluses (une par ligne — affichées sur la landing page)</label>
          <textarea value={featuresText} onChange={e => setFeaturesText(e.target.value)} rows={6}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none font-mono leading-relaxed" />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 mb-2 block">Modules inclus dans ce forfait</label>
          <div className="grid grid-cols-2 gap-2">
            {ALL_MODULES_LIST.map(mod => {
              const checked = form.modules?.includes(mod) ?? false
              return (
                <label key={mod} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition ${checked ? 'border-amber-300 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="checkbox" checked={checked}
                    onChange={() => setForm(p => ({
                      ...p,
                      modules: checked
                        ? (p.modules ?? []).filter(m => m !== mod)
                        : [...(p.modules ?? []), mod],
                    }))}
                    className="accent-amber-500" />
                  <span className="text-xs font-medium text-slate-700">{ALL_MODULES_LABELS[mod]}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={save} className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition">
            Enregistrer &amp; synchroniser
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition">
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
const STATUT_COLORS: Record<string, string> = {
  actif: 'bg-emerald-100 text-emerald-700',
  suspendu: 'bg-amber-100 text-amber-700',
  annulé: 'bg-red-100 text-red-700',
}
const FACTURE_STATUT_COLORS: Record<string, string> = {
  payée: 'bg-emerald-100 text-emerald-700',
  en_attente: 'bg-amber-100 text-amber-700',
  en_retard: 'bg-red-100 text-red-700',
}
const PRIORITE_COLORS: Record<string, string> = {
  basse: 'bg-slate-100 text-slate-500',
  normale: 'bg-blue-100 text-blue-600',
  haute: 'bg-orange-100 text-orange-600',
  urgente: 'bg-red-100 text-red-600',
}
const TICKET_STATUT_COLORS: Record<string, string> = {
  ouvert: 'bg-blue-100 text-blue-700',
  en_cours: 'bg-amber-100 text-amber-700',
  résolu: 'bg-emerald-100 text-emerald-700',
  fermé: 'bg-slate-100 text-slate-500',
}
const CAT_LABELS: Record<PartnerCategorie, string> = {
  base_de_donnees: 'Base de données',
  ia: 'Intelligence IA',
  hebergement: 'Hébergement',
  stockage: 'Stockage',
  autre: 'Autre',
}
const CUSTOM_PLAN_STATUT_COLORS: Record<string, string> = {
  actif: 'bg-emerald-100 text-emerald-700',
  brouillon: 'bg-blue-100 text-blue-600',
  archivé: 'bg-slate-100 text-slate-400',
}

function KpiCard({ icon, label, value, sub, color, alert }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color?: string; alert?: boolean
}) {
  return (
    <div className={`bg-white rounded-2xl p-5 border flex items-start gap-4 ${alert ? 'border-red-200' : 'border-slate-100'}`}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: color ?? '#fef9ec' }}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className={`text-2xl font-extrabold mt-0.5 ${alert ? 'text-red-600' : 'text-slate-800'}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Panel détail tenant ──────────────────────────────────────────────────────

function TenantPanel({ tenant, onClose, onAction }: {
  tenant: Tenant; onClose: () => void; onAction: () => void
}) {
  const cfg = FORFAITS_CONFIG.find(f => f.id === tenant.forfait)!
  const [rappelNote, setRappelNote] = useState('')
  const [showRappelInput, setShowRappelInput] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800">{tenant.entreprise}</h2>
            <p className="text-xs text-slate-400">{tenant.email}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"><X size={15} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUT_COLORS[tenant.statut]}`}>{tenant.statut}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${FORFAIT_COLORS[tenant.forfait]}`}>{cfg.nom}</span>
          </div>
          <div className="space-y-2 text-sm">
            {[
              ['Depuis', tenant.dateDebut],
              ['Renouvellement', tenant.dateRenouvellement],
              ['MRR', tenant.mrr ? `${tenant.mrr} $/mois` : 'Gratuit'],
              ['Utilisateurs', `${tenant.nbUtilisateurs}`],
              ['IA ce mois', `${tenant.usageIA.monthly} / ${cfg.iaMois} req.`],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400">{l}</span>
                <span className="font-semibold text-slate-700">{v}</span>
              </div>
            ))}
          </div>
          {/* Factures + rappels */}
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-2">FACTURES</p>
            {tenant.factures.map(f => (
              <div key={f.id} className="border border-slate-100 rounded-xl p-3 mb-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{f.periode}</p>
                    <p className="text-xs text-slate-400">Échéance : {f.dateEcheance ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">{f.montant} $</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${FACTURE_STATUT_COLORS[f.statut]}`}>{f.statut}</span>
                  </div>
                </div>
                {f.statut !== 'payée' && (
                  <div className="flex gap-2">
                    <button onClick={() => { sendRappel(tenant.id, f.id, 'manuel'); onAction() }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition">
                      <Mail size={11} /> Envoyer rappel
                    </button>
                    <button onClick={() => { markFacturePayee(tenant.id, f.id); onAction() }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition">
                      <CheckCircle size={11} /> Marquer payée
                    </button>
                  </div>
                )}
                {f.rappels && f.rappels.length > 0 && (
                  <div className="text-xs text-slate-400 space-y-0.5 border-t border-slate-50 pt-1">
                    {f.rappels.map((r, i) => (
                      <p key={i}>{r.date} — Rappel {r.type}{r.note ? ` · ${r.note}` : ''}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-2 pt-2">
            <button onClick={() => { suspendTenant(tenant.id); onAction() }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold border border-amber-300 text-amber-700 hover:bg-amber-50 transition">
              {tenant.statut === 'suspendu' ? 'Réactiver le compte' : 'Suspendre le compte'}
            </button>
            {tenant.statut !== 'annulé' && (
              <button onClick={() => { if (confirm('Confirmer l\'annulation ?')) { cancelTenant(tenant.id); onAction() } }}
                className="w-full py-2.5 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition">
                Annuler l&apos;abonnement
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal nouveau ticket ─────────────────────────────────────────────────────

function NewTicketModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({ sujet: '', client: '', email: '', priorite: 'normale' as TicketPriorite, message: '' })
  function submit() {
    if (!form.sujet || !form.client || !form.email) return
    createTicket({ sujet: form.sujet, client: form.client, email: form.email, priorite: form.priorite, statut: 'ouvert', messages: [form.message].filter(Boolean) })
    onSave()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Nouveau ticket de support</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X size={14} /></button>
        </div>
        {[{ label: 'Sujet', key: 'sujet', type: 'text' }, { label: 'Client / Entreprise', key: 'client', type: 'text' }, { label: 'Email', key: 'email', type: 'email' }].map(f => (
          <div key={f.key}>
            <label className="text-xs font-medium text-slate-500 mb-1 block">{f.label}</label>
            <input type={f.type} value={(form as Record<string, string>)[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
          </div>
        ))}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Priorité</label>
          <select value={form.priorite} onChange={e => setForm(p => ({ ...p, priorite: e.target.value as TicketPriorite }))}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
            {['basse', 'normale', 'haute', 'urgente'].map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Message initial</label>
          <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={3}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
        </div>
        <button onClick={submit} className="w-full py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition">Créer le ticket</button>
      </div>
    </div>
  )
}

// ── Modal plan sur mesure ────────────────────────────────────────────────────

function CustomPlanModal({ plan, onClose, onSave }: { plan?: CustomPlan; onClose: () => void; onSave: () => void }) {
  const blank: CustomPlan = { id: `cp-${Date.now().toString(36)}`, nom: '', secteur: '', clientCible: '', prix: 0, iaJour: 50, iaMois: 500, maxUtilisateurs: null, features: [''], statut: 'brouillon', dateCreation: new Date().toISOString().slice(0, 10) }
  const [form, setForm] = useState<CustomPlan>(plan ?? blank)
  const [featuresText, setFeaturesText] = useState((plan?.features ?? ['']).join('\n'))

  function save() {
    if (!form.nom || !form.secteur) return
    upsertCustomPlan({ ...form, features: featuresText.split('\n').map(s => s.trim()).filter(Boolean) })
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between sticky top-0 bg-white pb-2">
          <h3 className="font-bold text-slate-800">{plan ? 'Modifier le plan' : 'Nouveau plan sur mesure'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X size={14} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[{ label: 'Nom du plan', key: 'nom' }, { label: 'Secteur', key: 'secteur' }, { label: 'Client cible', key: 'clientCible' }].map(f => (
            <div key={f.key} className={f.key === 'clientCible' ? 'col-span-2' : ''}>
              <label className="text-xs font-medium text-slate-500 mb-1 block">{f.label}</label>
              <input value={(form as unknown as Record<string, string>)[f.key] ?? ''}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Prix / mois ($)</label>
            <input type="number" value={form.prix} onChange={e => setForm(p => ({ ...p, prix: Number(e.target.value) }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Utilisateurs max (0 = illimité)</label>
            <input type="number" value={form.maxUtilisateurs ?? 0}
              onChange={e => setForm(p => ({ ...p, maxUtilisateurs: Number(e.target.value) === 0 ? null : Number(e.target.value) }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">IA req/jour</label>
            <input type="number" value={form.iaJour} onChange={e => setForm(p => ({ ...p, iaJour: Number(e.target.value) }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">IA req/mois</label>
            <input type="number" value={form.iaMois} onChange={e => setForm(p => ({ ...p, iaMois: Number(e.target.value) }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Statut</label>
            <select value={form.statut} onChange={e => setForm(p => ({ ...p, statut: e.target.value as CustomPlan['statut'] }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
              <option value="brouillon">Brouillon</option>
              <option value="actif">Actif</option>
              <option value="archivé">Archivé</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Fonctionnalités incluses (une par ligne)</label>
          <textarea value={featuresText} onChange={e => setFeaturesText(e.target.value)} rows={5}
            placeholder="CRM clients&#10;Gestion de projets&#10;Facturation&#10;IA 50 req/jour"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none font-mono" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Notes internes</label>
          <textarea value={form.notes ?? ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
        </div>
        <button onClick={save} className="w-full py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition">Enregistrer le plan</button>
      </div>
    </div>
  )
}

// ── Page principale ──────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'abonnements' | 'facturation' | 'partenaires' | 'support' | 'forfaits'

export default function SuperAdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [partners, setPartners] = useState<SaasPartner[]>([])
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [customPlans, setCustomPlans] = useState<CustomPlan[]>([])
  const [forfaitsConfig, setForfaitsConfig] = useState<ForfaitConfig[]>([])
  const [editingForfait, setEditingForfait] = useState<ForfaitConfig | null>(null)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [selected, setSelected] = useState<Tenant | null>(null)
  const [changingForfait, setChangingForfait] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [filterForfait, setFilterForfait] = useState('tous')
  const [filterFacture, setFilterFacture] = useState('tous')
  const [filterTicket, setFilterTicket] = useState('tous')
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [showNewPartner, setShowNewPartner] = useState(false)
  const [editingPlan, setEditingPlan] = useState<CustomPlan | null | 'new'>(null)
  const [newPartner, setNewPartner] = useState<Partial<SaasPartner>>({ statut: 'actif', categorie: 'autre' })
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null)
  const [newPartnerFact, setNewPartnerFact] = useState<Record<string, Partial<{ montant: string; periode: string; notes: string }>>>({})
  const [rappelNote, setRappelNote] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user && user.role !== 'super_admin' && user.role !== 'billing_admin') {
      router.replace('/dashboard'); return
    }
    refresh()
  }, [user, router])

  function refresh() {
    setTenants(getTenants())
    setPartners(getSaasPartners())
    setTickets(getTickets())
    setCustomPlans(getCustomPlans())
    setForfaitsConfig(getForfaitsConfig())
    setSelected(null)
  }
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }
  function doRefresh() { refresh(); showToast('Modification enregistrée.') }

  if (!user || (user.role !== 'super_admin' && user.role !== 'billing_admin')) {
    return <div className="p-10 text-slate-500 text-sm">Accès réservé — Gestionnaire Bidexa.</div>
  }

  const actifs     = tenants.filter(t => t.statut === 'actif')
  const suspendus  = tenants.filter(t => t.statut === 'suspendu')
  const annules    = tenants.filter(t => t.statut === 'annulé')
  const mrr        = actifs.reduce((s, t) => s + t.mrr, 0)
  const totalIA    = tenants.reduce((s, t) => s + t.usageIA.monthly, 0)
  const churnRate  = tenants.length > 0 ? Math.round((annules.length / tenants.length) * 100) : 0
  const infraCost  = getInfraCost()
  const margeNette = mrr - infraCost
  const factures   = getAllFactures()
  const ticketsOuverts = tickets.filter(t => t.statut === 'ouvert' || t.statut === 'en_cours')
  const ticketsUrgents = tickets.filter(t => t.priorite === 'urgente' && (t.statut === 'ouvert' || t.statut === 'en_cours'))
  const alertesRenouvellement = tenants.filter(t => {
    const days = Math.ceil((new Date(t.dateRenouvellement).getTime() - Date.now()) / 86400000)
    return t.statut === 'actif' && days > 0 && days < 7
  })
  const facturesImpayees = factures.filter(f => f.statut !== 'payée')

  const tenantsFiltres = tenants.filter(t =>
    (filterStatut === 'tous' || t.statut === filterStatut) &&
    (filterForfait === 'tous' || t.forfait === filterForfait)
  )
  const facturesFiltrees = factures.filter(f =>
    filterFacture === 'tous' || f.statut === filterFacture
  )
  const ticketsFiltres = tickets.filter(t =>
    filterTicket === 'tous' || t.statut === filterTicket
  )
  const totalEncaisse = factures.filter(f => f.statut === 'payée').reduce((s, f) => s + f.montant, 0)
  const totalAttente  = factures.filter(f => f.statut !== 'payée').reduce((s, f) => s + f.montant, 0)
  const partnerFactures = getPartnerFactures()

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard',   label: 'Dashboard',   icon: <BarChart3 size={14} /> },
    { id: 'abonnements', label: 'Abonnements', icon: <Users size={14} />,    badge: actifs.length },
    { id: 'facturation', label: 'Facturation', icon: <FileText size={14} />, badge: facturesImpayees.length || undefined },
    { id: 'partenaires', label: 'Partenaires', icon: <Server size={14} /> },
    { id: 'support',     label: 'Support',     icon: <Headphones size={14} />, badge: ticketsOuverts.length || undefined },
    { id: 'forfaits',    label: 'Forfaits',    icon: <Settings size={14} /> },
  ]

  return (
    <div className="max-w-7xl space-y-6">
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">{toast}</div>
      )}

      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Super Admin — Bidexa</h1>
          <p className="text-sm text-slate-400 mt-0.5">Gestion des abonnements, partenaires et support client</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refresh} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs text-slate-500 transition">
            <RefreshCw size={13} /> Actualiser
          </button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-violet-200 bg-violet-50">
            <Building2 size={14} className="text-violet-600" />
            <span className="text-xs font-semibold text-violet-700">Gestionnaire Bidexa</span>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition relative ${tab === t.id ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.icon} {t.label}
            {t.badge ? <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ─────────────────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {(alertesRenouvellement.length > 0 || ticketsUrgents.length > 0) && (
            <div className="space-y-2">
              {alertesRenouvellement.map(t => (
                <div key={t.id} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                  <AlertTriangle size={15} />
                  <span><strong>{t.entreprise}</strong> — renouvellement dans {Math.ceil((new Date(t.dateRenouvellement).getTime() - Date.now()) / 86400000)} jours</span>
                </div>
              ))}
              {ticketsUrgents.map(t => (
                <div key={t.id} className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  <AlertTriangle size={15} />
                  <span>Ticket urgent — <strong>{t.client}</strong> : {t.sujet}</span>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={<DollarSign size={20} style={{ color: '#C9A84C' }} />} label="MRR total" value={`${mrr.toLocaleString('fr-CA')} $`} sub={`${actifs.length} abonnements actifs`} color="#fef9ec" />
            <KpiCard icon={<Users size={20} className="text-emerald-600" />} label="Clients actifs" value={`${actifs.length}`} sub={`${suspendus.length} suspendus · ${annules.length} annulés`} color="#f0fdf4" />
            <KpiCard icon={<Bot size={20} className="text-violet-600" />} label="Req. IA ce mois" value={totalIA.toLocaleString('fr-CA')} sub="Tous tenants cumulés" color="#f5f3ff" />
            <KpiCard icon={<TrendingDown size={20} className="text-red-500" />} label="Taux de churn" value={`${churnRate}%`} sub={`${annules.length} annulé(s) / ${tenants.length}`} color="#fff1f2" alert={churnRate > 20} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={<Server size={20} className="text-blue-600" />} label="Coût infra/mois" value={`${infraCost} $`} sub={`${partners.filter(p => p.statut === 'actif').length} partenaires actifs`} color="#eff6ff" />
            <KpiCard icon={<TrendingUp size={20} className="text-emerald-600" />} label="Marge nette" value={`${margeNette} $`} sub={`MRR ${mrr}$ − Infra ${infraCost}$`} color="#f0fdf4" />
            <KpiCard icon={<Headphones size={20} className="text-orange-500" />} label="Tickets ouverts" value={`${ticketsOuverts.length}`} sub={`${ticketsUrgents.length} urgent(s)`} color="#fff7ed" alert={ticketsUrgents.length > 0} />
            <KpiCard icon={<Bell size={20} className="text-amber-500" />} label="Factures impayées" value={`${totalAttente.toLocaleString('fr-CA')} $`} sub={`${facturesImpayees.length} facture(s)`} color="#fef9ec" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><DollarSign size={15} className="text-amber-500" /> Top clients par MRR</h3>
              {actifs.sort((a, b) => b.mrr - a.mrr).slice(0, 5).map((t, i) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-xs flex items-center justify-center text-slate-500 font-bold">{i + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{t.entreprise}</p>
                      <p className="text-xs text-slate-400">{t.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${FORFAIT_COLORS[t.forfait]}`}>{t.forfait}</span>
                    <span className="font-bold text-slate-700 text-sm">{t.mrr > 0 ? `${t.mrr} $` : '—'}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><Server size={15} className="text-blue-500" /> Coûts partenaires actifs</h3>
              {partners.filter(p => p.statut === 'actif').map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{p.nom}</p>
                    <p className="text-xs text-slate-400">{CAT_LABELS[p.categorie]}</p>
                  </div>
                  <span className="font-bold text-slate-700 text-sm">{p.coutMensuel} $/m</span>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between">
                <span className="text-sm font-semibold text-slate-500">Total infra</span>
                <span className="font-extrabold text-blue-600">{infraCost} $/m</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ABONNEMENTS ───────────────────────────────────────────────────── */}
      {tab === 'abonnements' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
              <option value="tous">Tous les statuts</option>
              <option value="actif">Actif</option>
              <option value="suspendu">Suspendu</option>
              <option value="annulé">Annulé</option>
            </select>
            <select value={filterForfait} onChange={e => setFilterForfait(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
              <option value="tous">Tous les forfaits</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <span className="text-xs text-slate-400 ml-auto">{tenantsFiltres.length} résultat(s)</span>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Entreprise', 'Email', 'Forfait', 'Statut', 'MRR', 'IA/mois', 'Renouvellement', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenantsFiltres.map(t => {
                  const cfg = FORFAITS_CONFIG.find(f => f.id === t.forfait)!
                  const daysLeft = Math.ceil((new Date(t.dateRenouvellement).getTime() - Date.now()) / 86400000)
                  return (
                    <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-semibold text-slate-800">{t.entreprise}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{t.email}</td>
                      <td className="px-4 py-3">
                        {changingForfait === t.id ? (
                          <select defaultValue={t.forfait} autoFocus onBlur={() => setChangingForfait(null)}
                            onChange={e => { upgradePlan(t.id, e.target.value as ForfaitType); setChangingForfait(null); doRefresh() }}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none">
                            <option value="starter">Starter — 49$/m</option>
                            <option value="pro">Pro — 149$/m</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                        ) : (
                          <button onClick={() => setChangingForfait(t.id)} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${FORFAIT_COLORS[t.forfait]}`}>
                            {cfg.nom} <ChevronDown size={10} />
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUT_COLORS[t.statut]}`}>{t.statut}</span></td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{t.mrr > 0 ? `${t.mrr} $` : '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{t.usageIA.monthly} / {cfg.iaMois}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className={`font-medium ${daysLeft > 0 && daysLeft < 7 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {t.dateRenouvellement} {daysLeft > 0 && daysLeft < 14 ? `(${daysLeft}j)` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setSelected(t)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="Voir détail"><Eye size={15} /></button>
                          <button onClick={() => { suspendTenant(t.id); doRefresh() }}
                            className={`p-1.5 rounded-lg ${t.statut === 'suspendu' ? 'hover:bg-emerald-50 text-emerald-600' : 'hover:bg-amber-50 text-amber-600'}`}
                            title={t.statut === 'suspendu' ? 'Réactiver' : 'Suspendre'}>
                            {t.statut === 'suspendu' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                          </button>
                          {t.statut !== 'annulé' && (
                            <button onClick={() => { if (confirm('Annuler l\'abonnement ?')) { cancelTenant(t.id); doRefresh() } }}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Annuler">
                              <XCircle size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── FACTURATION ───────────────────────────────────────────────────── */}
      {tab === 'facturation' && (
        <div className="space-y-4">
          {/* Résumé + rappel global */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 col-span-1">
              <CheckCircle size={20} className="text-emerald-600" />
              <div>
                <p className="text-xs text-emerald-600 font-medium">Total encaissé</p>
                <p className="text-xl font-extrabold text-emerald-700">{totalEncaisse.toLocaleString('fr-CA')} $</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 col-span-1">
              <Clock size={20} className="text-amber-600" />
              <div>
                <p className="text-xs text-amber-600 font-medium">En attente / retard</p>
                <p className="text-xl font-extrabold text-amber-700">{totalAttente.toLocaleString('fr-CA')} $</p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 col-span-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium">Rappels automatiques</p>
                <p className="text-sm text-blue-700 mt-0.5">Envoyer un rappel à toutes les factures impayées en une fois</p>
              </div>
              <button onClick={() => {
                const n = sendAllRappelsAuto()
                doRefresh()
                showToast(n > 0 ? `${n} rappel(s) automatique(s) envoyé(s).` : 'Aucun nouveau rappel à envoyer.')
              }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition whitespace-nowrap">
                <Send size={14} /> Envoyer tous les rappels
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select value={filterFacture} onChange={e => setFilterFacture(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
              <option value="tous">Toutes les factures</option>
              <option value="payée">Payées</option>
              <option value="en_attente">En attente</option>
              <option value="en_retard">En retard</option>
            </select>
            <span className="text-xs text-slate-400 ml-auto">{facturesFiltrees.length} facture(s)</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Date', 'Entreprise', 'Période', 'Échéance', 'Montant', 'Statut', 'Rappels', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {facturesFiltrees.map(f => (
                  <tr key={f.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{f.date}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{f.entreprise}</td>
                    <td className="px-4 py-3 text-slate-500">{f.periode}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{f.dateEcheance ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{f.montant} $</td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${FACTURE_STATUT_COLORS[f.statut]}`}>{f.statut}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {f.rappels && f.rappels.length > 0
                        ? <span className="text-blue-500 font-semibold">{f.rappels.length} envoyé(s)</span>
                        : <span>—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {f.statut !== 'payée' && (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => { sendRappel(f.tenantId, f.id, 'manuel', rappelNote[f.id]); doRefresh(); showToast('Rappel manuel envoyé.') }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition">
                            <Mail size={11} /> Rappel
                          </button>
                          <button onClick={() => { markFacturePayee(f.tenantId, f.id); doRefresh() }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition">
                            <CheckCircle size={11} /> Payée
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PARTENAIRES SAAS ──────────────────────────────────────────────── */}
      {tab === 'partenaires' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
              <Server size={16} className="text-blue-600" />
              <span className="text-sm font-semibold text-blue-700">Coût infra total : {infraCost} $/mois</span>
            </div>
            <button onClick={() => setShowNewPartner(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition">
              <Plus size={14} /> Ajouter partenaire
            </button>
          </div>

          {showNewPartner && (
            <div className="bg-white rounded-2xl border border-amber-200 p-5 space-y-3">
              <h4 className="font-semibold text-slate-700">Nouveau partenaire</h4>
              <div className="grid grid-cols-2 gap-3">
                {[{ label: 'Nom', key: 'nom' }, { label: 'Fournisseur', key: 'fournisseur' }].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">{f.label}</label>
                    <input value={(newPartner as Record<string, string>)[f.key] ?? ''}
                      onChange={e => setNewPartner(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Catégorie</label>
                  <select value={newPartner.categorie} onChange={e => setNewPartner(p => ({ ...p, categorie: e.target.value as PartnerCategorie }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                    {(Object.keys(CAT_LABELS) as PartnerCategorie[]).map(k => <option key={k} value={k}>{CAT_LABELS[k]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Coût mensuel ($)</label>
                  <input type="number" value={newPartner.coutMensuel ?? ''}
                    onChange={e => setNewPartner(p => ({ ...p, coutMensuel: Number(e.target.value) }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Notes</label>
                <input value={newPartner.notes ?? ''} onChange={e => setNewPartner(p => ({ ...p, notes: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => {
                  if (!newPartner.nom || !newPartner.fournisseur) return
                  upsertPartner({ id: `p-${Date.now().toString(36)}`, statut: 'actif', dateDebut: new Date().toISOString().slice(0, 10), notes: '', ...newPartner } as SaasPartner)
                  setNewPartner({ statut: 'actif', categorie: 'autre' }); setShowNewPartner(false); doRefresh()
                }} className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition">Enregistrer</button>
                <button onClick={() => setShowNewPartner(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition">Annuler</button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {partners.map(p => {
              const pFacts = partnerFactures.filter(f => f.partnerId === p.id)
              const totalPaye = pFacts.filter(f => f.statut === 'payée').reduce((s, f) => s + f.montant, 0)
              const totalDu = pFacts.filter(f => f.statut !== 'payée').reduce((s, f) => s + f.montant, 0)
              const isExpanded = expandedPartner === p.id
              const nf = newPartnerFact[p.id] ?? {}
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Server size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{p.nom}</p>
                        <p className="text-xs text-slate-400">{p.fournisseur} · {CAT_LABELS[p.categorie]}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden md:block">
                        <p className="text-sm font-bold text-slate-700">{p.coutMensuel} $/mois</p>
                        <p className="text-xs text-slate-400">Payé : {totalPaye} $ · Dû : {totalDu} $</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.statut === 'actif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{p.statut}</span>
                      <button onClick={() => { togglePartner(p.id); doRefresh() }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-500 hover:bg-slate-50 transition">
                        {p.statut === 'actif' ? 'Désactiver' : 'Activer'}
                      </button>
                      <button onClick={() => setExpandedPartner(isExpanded ? null : p.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-200 text-blue-600 hover:bg-blue-50 transition">
                        <FileText size={12} /> {isExpanded ? 'Masquer' : 'Facturation'}
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-5 py-4 space-y-3">
                      <p className="text-xs font-semibold text-slate-500">HISTORIQUE DES FACTURES</p>
                      {pFacts.length === 0 && <p className="text-xs text-slate-400 italic">Aucune facture enregistrée.</p>}
                      {pFacts.map(f => (
                        <div key={f.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                          <div>
                            <p className="text-sm font-medium text-slate-700">{f.periode}</p>
                            {f.notes && <p className="text-xs text-slate-400">{f.notes}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">{f.montant} $</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${FACTURE_STATUT_COLORS[f.statut]}`}>{f.statut}</span>
                            {f.statut !== 'payée' && (
                              <button onClick={() => { updatePartnerFacture(f.id, { statut: 'payée' }); doRefresh() }}
                                className="px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition">
                                Payée
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-2">
                        <input placeholder="Montant ($)" type="number" value={nf.montant ?? ''}
                          onChange={e => setNewPartnerFact(prev => ({ ...prev, [p.id]: { ...nf, montant: e.target.value } }))}
                          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none w-28" />
                        <input placeholder="Période (ex: Mai 2025)" value={nf.periode ?? ''}
                          onChange={e => setNewPartnerFact(prev => ({ ...prev, [p.id]: { ...nf, periode: e.target.value } }))}
                          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none flex-1" />
                        <button onClick={() => {
                          if (!nf.montant || !nf.periode) return
                          addPartnerFacture({ partnerId: p.id, partnerNom: p.nom, date: new Date().toISOString().slice(0, 10), montant: Number(nf.montant), periode: nf.periode, statut: 'en_attente', notes: nf.notes })
                          setNewPartnerFact(prev => ({ ...prev, [p.id]: {} })); doRefresh()
                        }} className="px-3 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition whitespace-nowrap">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── SUPPORT ───────────────────────────────────────────────────────── */}
      {tab === 'support' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <select value={filterTicket} onChange={e => setFilterTicket(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
              <option value="tous">Tous les tickets</option>
              <option value="ouvert">Ouverts</option>
              <option value="en_cours">En cours</option>
              <option value="résolu">Résolus</option>
              <option value="fermé">Fermés</option>
            </select>
            <button onClick={() => setShowNewTicket(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition">
              <Plus size={14} /> Nouveau ticket
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Sujet', 'Client', 'Priorité', 'Statut', 'Date', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ticketsFiltres.map(t => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{t.sujet}</p>
                      {t.assigneA && <p className="text-xs text-slate-400">Assigné : {t.assigneA}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">{t.client}</p>
                      <p className="text-xs text-slate-400">{t.email}</p>
                    </td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PRIORITE_COLORS[t.priorite]}`}>{t.priorite}</span></td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TICKET_STATUT_COLORS[t.statut]}`}>{t.statut}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      <p>{t.dateCreation}</p>
                      {t.dateResolution && <p className="text-emerald-500">Résolu : {t.dateResolution}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {t.statut === 'ouvert' && (
                          <button onClick={() => { updateTicket(t.id, { statut: 'en_cours', assigneA: 'Support Bidexa' }); doRefresh() }}
                            className="px-2 py-1 rounded-lg text-xs font-semibold border border-amber-200 text-amber-600 hover:bg-amber-50 transition">Prendre en charge</button>
                        )}
                        {(t.statut === 'ouvert' || t.statut === 'en_cours') && (
                          <button onClick={() => { updateTicket(t.id, { statut: 'résolu' }); doRefresh() }}
                            className="px-2 py-1 rounded-lg text-xs font-semibold border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition">Résoudre</button>
                        )}
                        {t.statut !== 'fermé' && (
                          <button onClick={() => { updateTicket(t.id, { statut: 'fermé' }); doRefresh() }}
                            className="px-2 py-1 rounded-lg text-xs font-semibold border border-slate-200 text-slate-500 hover:bg-slate-50 transition">Fermer</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── FORFAITS ──────────────────────────────────────────────────────── */}
      {tab === 'forfaits' && (
        <div className="space-y-6">
          {/* Plans standards éditables */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-slate-700">Plans standards</h3>
              <p className="text-xs text-slate-400">Les modifications sont synchronisées automatiquement avec la landing page</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-3">
              {forfaitsConfig.map(cfg => (
                <div key={cfg.id} className={`bg-white rounded-2xl border-2 p-6 space-y-4 relative ${cfg.highlighted ? 'border-amber-300' : 'border-slate-100'}`}>
                  {cfg.highlighted && (
                    <div className="absolute -top-3 left-4 px-3 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: '#C9A84C' }}>
                      Recommandé
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${FORFAIT_COLORS[cfg.id]}`}>{cfg.nom}</span>
                      <p className="text-xs text-slate-400 mt-1">{cfg.desc}</p>
                    </div>
                    <span className="text-2xl font-extrabold text-slate-800">{cfg.prix ? `${cfg.prix} $` : 'Devis'}</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {[
                      ['IA / jour', `${cfg.iaJour} req.`],
                      ['IA / mois', `${cfg.iaMois.toLocaleString('fr-CA')} req.`],
                      ['Utilisateurs', cfg.maxUtilisateurs ? `${cfg.maxUtilisateurs}` : 'Illimité'],
                      ['CTA', cfg.cta],
                      ['Clients actifs', `${tenants.filter(t => t.forfait === cfg.id && t.statut === 'actif').length}`],
                      ['MRR généré', `${tenants.filter(t => t.forfait === cfg.id && t.statut === 'actif').reduce((s, t) => s + t.mrr, 0)} $`],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-400">{l}</span>
                        <span className="font-semibold text-slate-700 truncate ml-2 max-w-[140px]">{v}</span>
                      </div>
                    ))}
                  </div>
                  <ul className="space-y-1">
                    {cfg.features.slice(0, 5).map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                        <CheckCircle size={12} className="text-emerald-500 shrink-0" />{f}
                      </li>
                    ))}
                    {cfg.features.length > 5 && <li className="text-xs text-slate-400">+{cfg.features.length - 5} autres</li>}
                  </ul>
                  {/* Modules inclus */}
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-400 mb-1.5">Modules inclus ({cfg.modules?.length ?? 0}/{ALL_MODULES_LIST.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {ALL_MODULES_LIST.map(mod => {
                        const inc = cfg.modules?.includes(mod)
                        return (
                          <span key={mod} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${inc ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400 line-through'}`}>
                            {ALL_MODULES_LABELS[mod]}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setEditingForfait(cfg)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-amber-300 text-amber-700 text-xs font-semibold hover:bg-amber-50 transition">
                      <Edit size={12} /> Modifier
                    </button>
                    <button onClick={() => {
                      if (confirm('Réinitialiser aux valeurs par défaut ?')) {
                        resetForfaitConfig(cfg.id)
                        doRefresh()
                        showToast('Forfait réinitialisé.')
                      }
                    }} className="px-3 py-2 rounded-xl border border-slate-200 text-slate-400 text-xs hover:bg-slate-50 transition" title="Réinitialiser">
                      <RefreshCw size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Plans sur mesure */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-700">Plans sur mesure</h3>
              <button onClick={() => setEditingPlan('new')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition">
                <Plus size={14} /> Créer un plan
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">Bidexa est un ERP généraliste. Créez des plans adaptés à chaque secteur d&apos;activité (santé, immobilier, logistique, éducation, etc.).</p>
            {customPlans.length === 0 && (
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-8 text-center">
                <p className="text-slate-400 text-sm">Aucun plan sur mesure. Créez-en un pour cibler un secteur spécifique.</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customPlans.map(cp => (
                <div key={cp.id} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800">{cp.nom}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CUSTOM_PLAN_STATUT_COLORS[cp.statut]}`}>{cp.statut}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{cp.secteur} · {cp.clientCible}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingPlan(cp)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Edit size={14} /></button>
                      <button onClick={() => { if (confirm('Supprimer ce plan ?')) { deleteCustomPlan(cp.id); doRefresh() } }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-400">Prix : </span><strong>{cp.prix > 0 ? `${cp.prix} $/m` : 'Sur devis'}</strong></div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-400">IA : </span><strong>{cp.iaJour}/j · {cp.iaMois}/m</strong></div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-400">Users : </span><strong>{cp.maxUtilisateurs ?? 'Illimité'}</strong></div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-400">Créé : </span><strong>{cp.dateCreation}</strong></div>
                  </div>
                  {cp.features.length > 0 && (
                    <ul className="space-y-1">
                      {cp.features.slice(0, 4).map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                          <CheckCircle size={11} className="text-emerald-500 shrink-0" />{f}
                        </li>
                      ))}
                      {cp.features.length > 4 && <li className="text-xs text-slate-400">+{cp.features.length - 4} autres</li>}
                    </ul>
                  )}
                  {cp.notes && <p className="text-xs text-slate-400 italic border-t border-slate-50 pt-2">{cp.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {selected && <TenantPanel tenant={selected} onClose={() => setSelected(null)} onAction={doRefresh} />}
      {showNewTicket && <NewTicketModal onClose={() => setShowNewTicket(false)} onSave={() => { setShowNewTicket(false); doRefresh() }} />}
      {editingForfait && (
        <ForfaitEditModal
          config={editingForfait}
          onClose={() => setEditingForfait(null)}
          onSave={() => { setEditingForfait(null); doRefresh(); showToast('Forfait mis à jour — synchronisé avec la landing page.') }}
        />
      )}
      {editingPlan !== null && (
        <CustomPlanModal
          plan={editingPlan === 'new' ? undefined : editingPlan}
          onClose={() => setEditingPlan(null)}
          onSave={() => { setEditingPlan(null); doRefresh() }}
        />
      )}
    </div>
  )
}
