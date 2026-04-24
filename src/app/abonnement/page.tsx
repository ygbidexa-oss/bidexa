'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  getTenantByEmail, cancelTenant, upgradePlanWithModules, updatePaiement,
  addIaExtra, getForfaitsConfig, Tenant, ForfaitType, ForfaitConfig,
} from '@/lib/subscriptions-store'
import { checkAIQuota } from '@/lib/security'
import { updateProfile } from '@/lib/auth'
import {
  CheckCircle, XCircle, Bot, CreditCard, Calendar, Users,
  AlertTriangle, ChevronRight, X, Zap, TrendingDown, Edit, Banknote, BarChart3,
  ShoppingCart, Package, Plus,
} from 'lucide-react'

// ── Composants utilitaires ────────────────────────────────────────────────────

function ProgressBar({ value, max, color = '#C9A84C' }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0)
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : color }} />
    </div>
  )
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-slate-400">{icon}</span>
        <h2 className="font-bold text-slate-800">{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ── Modal Changer forfait ─────────────────────────────────────────────────────

function ChangeForfaitModal({ current, onConfirm, onClose }: {
  current: ForfaitType
  onConfirm: (f: ForfaitType) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<ForfaitType>(current)
  const [forfaits, setForfaits] = useState<ForfaitConfig[]>([])
  useEffect(() => { setForfaits(getForfaitsConfig()) }, [])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-800 text-lg">Changer de forfait</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X size={15} /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {forfaits.map(cfg => (
            <button
              key={cfg.id}
              onClick={() => setSelected(cfg.id)}
              className={`rounded-xl p-4 border-2 text-left transition ${selected === cfg.id ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="font-bold text-slate-800 mb-1">{cfg.nom}</div>
              <div className="text-2xl font-extrabold mb-3" style={{ color: '#C9A84C' }}>
                {cfg.prix ? `${cfg.prix} $/m` : 'Sur devis'}
              </div>
              <ul className="space-y-1.5">
                <li className="text-xs text-slate-500 flex items-center gap-1.5"><Bot size={11} />{cfg.iaJour} req. IA/jour</li>
                <li className="text-xs text-slate-500 flex items-center gap-1.5"><Users size={11} />{cfg.maxUtilisateurs ?? '∞'} utilisateur(s)</li>
                <li className="text-xs text-slate-500 flex items-center gap-1.5"><Package size={11} />{cfg.modules.length} modules inclus</li>
              </ul>
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">Annuler</button>
          <button
            onClick={() => { onConfirm(selected); onClose() }}
            disabled={selected === current}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition hover:opacity-90"
            style={{ background: '#0D1B2A' }}
          >
            Confirmer le changement <ChevronRight size={14} className="inline" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Paiement ────────────────────────────────────────────────────────────

function PaiementModal({ tenant, onSave, onClose }: {
  tenant: Tenant
  onSave: (p: Tenant['paiement']) => void
  onClose: () => void
}) {
  const [methode, setMethode] = useState<'carte' | 'virement'>(tenant.paiement.methode ?? 'carte')
  const [num, setNum] = useState('')
  const [exp, setExp] = useState(tenant.paiement.expiration)
  const [cvv, setCvv] = useState('')
  const [nom, setNom] = useState(tenant.paiement.titulaire)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const derniers4 = methode === 'carte' ? num.replace(/\s/g, '').slice(-4) : ''
    onSave({ methode, derniers4, expiration: exp, titulaire: nom })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-800">Informations de paiement</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X size={15} /></button>
        </div>

        {/* Toggle méthode */}
        <div className="flex gap-2 mb-5">
          {[{ id: 'carte', label: 'Carte bancaire' }, { id: 'virement', label: 'Virement bancaire' }].map(m => (
            <button
              key={m.id}
              onClick={() => setMethode(m.id as 'carte' | 'virement')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition ${methode === m.id ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500'}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nom du titulaire</label>
            <input value={nom} onChange={e => setNom(e.target.value)} required className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300" placeholder="Jean Dupont" />
          </div>

          {methode === 'carte' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Numéro de carte</label>
                <input
                  value={num} onChange={e => setNum(e.target.value)} required
                  maxLength={19} placeholder="1234 5678 9012 3456"
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Expiration</label>
                  <input value={exp} onChange={e => setExp(e.target.value)} required placeholder="MM/AA" maxLength={5} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">CVV</label>
                  <input value={cvv} onChange={e => setCvv(e.target.value)} required placeholder="123" maxLength={4} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 font-mono" />
                </div>
              </div>
            </>
          )}

          {methode === 'virement' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
              <p className="font-semibold mb-1">Coordonnées bancaires Bidexa</p>
              <p>Institution : Banque XYZ</p>
              <p>Transit : 12345 · Institution : 006</p>
              <p>Compte : 0012345678</p>
              <p className="text-xs text-blue-500 mt-2">Indiquez votre # d&apos;entreprise en référence.</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600">Annuler</button>
            <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90" style={{ background: '#0D1B2A' }}>Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal Annulation ──────────────────────────────────────────────────────────

function CancelModal({ onConfirm, onClose }: { onConfirm: (raison: string) => void; onClose: () => void }) {
  const [step, setStep] = useState(1)
  const [raison, setRaison] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        {step === 1 ? (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Annuler votre abonnement ?</h3>
              <p className="text-sm text-slate-500 mt-2">Votre accès sera maintenu jusqu&apos;à la fin de la période en cours. Aucun remboursement ne sera émis.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">Garder mon abonnement</button>
              <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700">Continuer</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-bold text-slate-800 mb-4">Pourquoi annulez-vous ?</h3>
            <textarea
              value={raison} onChange={e => setRaison(e.target.value)}
              placeholder="Votre retour nous aide à améliorer Bidexa..."
              rows={4}
              className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600">Annuler</button>
              <button onClick={() => onConfirm(raison)} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700">Confirmer l&apos;annulation</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function AbonnementPage() {
  const { user } = useAuth()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [forfaits, setForfaits] = useState<ForfaitConfig[]>([])
  const [showForfait, setShowForfait] = useState(false)
  const [showPaiement, setShowPaiement] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (user) setTenant(getTenantByEmail(user.email))
    setForfaits(getForfaitsConfig())
  }, [user])

  function refresh() {
    if (user) setTenant(getTenantByEmail(user.email))
    setForfaits(getForfaitsConfig())
  }
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500) }

  if (!tenant || !user) return (
    <div className="p-10 text-center text-slate-400 text-sm">Chargement de votre abonnement...</div>
  )

  const cfg = forfaits.find(f => f.id === tenant.forfait) ?? forfaits[0]
  if (!cfg) return <div className="p-10 text-center text-slate-400 text-sm">Chargement...</div>

  const quota = checkAIQuota(user.id, tenant.forfait)
  const daysLeft = Math.ceil((new Date(tenant.dateRenouvellement).getTime() - Date.now()) / 86400000)
  const totalIaJour = cfg.iaJour + (tenant.iaExtra ?? 0)
  const totalIaMois = cfg.iaMois + (tenant.iaExtra ?? 0)

  // Usage IA simulé pour les 7 derniers jours
  const iaHistory = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const label = d.toLocaleDateString('fr-CA', { weekday: 'short' })
    const val = i === 6 ? tenant.usageIA.daily : Math.floor(Math.random() * cfg.iaJour)
    return { label, val }
  })
  const maxBar = Math.max(...iaHistory.map(h => h.val), 1)

  // Packages IA Extra
  const IA_PACKAGES = [
    { qty: 500,  prix: 9.99,  label: '500 requêtes',  desc: 'Idéal pour un usage ponctuel' },
    { qty: 2000, prix: 29.99, label: '2 000 requêtes', desc: 'Le plus populaire', popular: true },
    { qty: 5000, prix: 59.99, label: '5 000 requêtes', desc: 'Pour les gros volumes' },
  ]

  return (
    <div className="max-w-4xl space-y-6">
      {toast && <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">{toast}</div>}

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Mon abonnement</h1>
        <p className="text-sm text-slate-400 mt-0.5">Gérez votre forfait, votre utilisation et vos informations de paiement</p>
      </div>

      {/* Bannière annulation */}
      {tenant.statut === 'annulé' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 text-sm">Abonnement annulé</p>
            <p className="text-xs text-red-500 mt-0.5">Votre accès sera actif jusqu&apos;au {tenant.dateRenouvellement}. Aucune future facturation.</p>
          </div>
        </div>
      )}
      {tenant.statut === 'suspendu' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 font-semibold">Compte suspendu — contactez le support pour réactiver.</p>
        </div>
      )}

      {/* ── MON FORFAIT ─────────────────────────────────────────────────────── */}
      <SectionCard title="Mon forfait" icon={<Zap size={17} />}>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Badge forfait */}
          <div className="shrink-0">
            <div className="rounded-2xl p-5 text-center min-w-[140px] border-2 border-amber-300" style={{ background: '#fef9ec' }}>
              <p className="text-xs text-amber-600 font-semibold mb-1">FORFAIT ACTUEL</p>
              <p className="text-2xl font-extrabold" style={{ color: '#0D1B2A' }}>{cfg.nom}</p>
              <p className="text-xl font-bold mt-1" style={{ color: '#C9A84C' }}>{cfg.prix ? `${cfg.prix} $` : 'Devis'}<span className="text-xs text-amber-500">/mois</span></p>
              <p className={`text-xs mt-2 px-2 py-0.5 rounded-full font-semibold inline-block ${tenant.statut === 'actif' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{tenant.statut}</p>
            </div>
          </div>

          {/* Limites + jauges IA */}
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-500 font-medium">IA utilisée aujourd'hui</span>
                <span className="font-semibold text-slate-700">{totalIaJour - (quota.remaining?.daily ?? 0)} / {totalIaJour} req.</span>
              </div>
              <ProgressBar value={totalIaJour - (quota.remaining?.daily ?? 0)} max={totalIaJour} />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-500 font-medium">IA utilisée ce mois</span>
                <span className="font-semibold text-slate-700">{tenant.usageIA.monthly} / {totalIaMois} req.</span>
              </div>
              <ProgressBar value={tenant.usageIA.monthly} max={totalIaMois} />
            </div>
            {(tenant.iaExtra ?? 0) > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50 border border-violet-100 text-xs text-violet-700">
                <Plus size={11} /> {tenant.iaExtra} requêtes supplémentaires achetées incluses
              </div>
            )}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-500 font-medium">Utilisateurs</span>
                <span className="font-semibold text-slate-700">{tenant.nbUtilisateurs} / {cfg.maxUtilisateurs ?? '∞'}</span>
              </div>
              {cfg.maxUtilisateurs && <ProgressBar value={tenant.nbUtilisateurs} max={cfg.maxUtilisateurs} color="#6366f1" />}
            </div>

            {/* Modules inclus dans ce forfait */}
            <div className="pt-2">
              <p className="text-xs font-semibold text-slate-400 mb-2">MODULES INCLUS DANS CE FORFAIT ({cfg.modules?.length ?? 0})</p>
              <div className="grid grid-cols-2 gap-1">
                {['clients','estimation','soumissions','concurrence','projets','bons-commande','fournisseurs','comptabilite','documents','reporting','ia'].map(mod => {
                  const LABELS: Record<string,string> = { clients:'Clients & CRM', estimation:'Estimation', soumissions:'Soumissions', concurrence:'Concurrence', projets:'Projets', 'bons-commande':'Bons de commande', fournisseurs:'Fournisseurs', comptabilite:'Comptabilité', documents:'Documents', reporting:'Reporting BI', ia:'Intelligence IA' }
                  const included = cfg.modules?.includes(mod)
                  return (
                    <div key={mod} className="flex items-center gap-1.5 text-xs">
                      {included ? <CheckCircle size={11} className="text-emerald-500 shrink-0" /> : <XCircle size={11} className="text-slate-200 shrink-0" />}
                      <span className={included ? 'text-slate-600' : 'text-slate-300'}>{LABELS[mod]}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {tenant.statut !== 'annulé' && (
          <button onClick={() => setShowForfait(true)} className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition" style={{ background: '#0D1B2A' }}>
            Changer de forfait <ChevronRight size={14} />
          </button>
        )}
      </SectionCard>

      {/* ── ACHAT REQUÊTES IA SUPPLÉMENTAIRES ── */}
      <div className="bg-gradient-to-br from-violet-50 to-white rounded-2xl border border-violet-100 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Bot size={18} className="text-violet-600" />
          <h2 className="font-bold text-slate-800">Requêtes IA supplémentaires</h2>
        </div>
        <p className="text-sm text-slate-500 mb-5">Besoin de plus de capacité IA ? Achetez des requêtes à la carte, valables jusqu'à la fin de votre abonnement.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {IA_PACKAGES.map(pkg => (
            <div key={pkg.qty} className={`relative rounded-xl border-2 p-5 flex flex-col gap-3 ${pkg.popular ? 'border-violet-400 shadow-lg shadow-violet-100' : 'border-slate-200 bg-white'}`}>
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold text-white bg-violet-500">Populaire</div>
              )}
              <div>
                <p className="font-bold text-slate-800 text-sm">{pkg.label}</p>
                <p className="text-xs text-slate-400">{pkg.desc}</p>
              </div>
              <div className="text-2xl font-extrabold text-violet-600">{pkg.prix} $</div>
              <p className="text-xs text-slate-400">{(pkg.prix / pkg.qty * 1000).toFixed(2)} ¢ / requête</p>
              <button
                onClick={() => {
                  addIaExtra(tenant.id, pkg.qty)
                  refresh()
                  showToast(`${pkg.qty.toLocaleString('fr-CA')} requêtes IA ajoutées à votre compte !`)
                }}
                className="mt-auto py-2 rounded-xl text-sm font-semibold transition hover:opacity-90 flex items-center justify-center gap-1.5"
                style={{ background: pkg.popular ? '#7c3aed' : '#0D1B2A', color: 'white' }}
              >
                <ShoppingCart size={13} /> Acheter
              </button>
            </div>
          ))}
        </div>
        {(tenant.iaExtra ?? 0) > 0 && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-violet-100 text-sm text-violet-800 font-semibold flex items-center gap-2">
            <Zap size={14} /> {(tenant.iaExtra ?? 0).toLocaleString('fr-CA')} requêtes supplémentaires disponibles sur votre compte
          </div>
        )}
      </div>

      {/* ── UTILISATION ─────────────────────────────────────────────────────── */}
      <SectionCard title="Utilisation" icon={<BarChart3 size={17} />}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {[
            { label: 'Req. IA restantes/jour', value: `${quota.remaining?.daily ?? 0}`, icon: <Bot size={16} style={{ color: '#C9A84C' }} /> },
            { label: 'Renouvellement dans', value: daysLeft > 0 ? `${daysLeft} jours` : 'Expiré', icon: <Calendar size={16} className="text-blue-500" /> },
            { label: 'Utilisateurs actifs', value: `${tenant.nbUtilisateurs}`, icon: <Users size={16} className="text-violet-500" /> },
          ].map(item => (
            <div key={item.label} className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
              {item.icon}
              <div>
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="font-bold text-slate-800">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Mini graphique IA 7 jours */}
        <div>
          <p className="text-xs font-semibold text-slate-400 mb-3">REQUÊTES IA — 7 DERNIERS JOURS</p>
          <div className="flex items-end gap-2 h-20">
            {iaHistory.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{ height: `${Math.max(4, Math.round((h.val / maxBar) * 64))}px`, background: i === 6 ? '#C9A84C' : '#e2e8f0' }}
                  title={`${h.val} req.`}
                />
                <span className="text-xs text-slate-400">{h.label}</span>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ── FACTURATION ─────────────────────────────────────────────────────── */}
      <SectionCard title="Facturation" icon={<CreditCard size={17} />}>
        <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-slate-400">Prochaine échéance</p>
            <p className="font-bold text-slate-800">{tenant.dateRenouvellement}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Montant prévu</p>
            <p className="font-bold text-slate-800" style={{ color: '#C9A84C' }}>{cfg.prix ? `${cfg.prix} $` : 'Sur devis'}</p>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {['Période', 'Date', 'Montant', 'Statut'].map(h => (
                <th key={h} className="text-left py-2 text-xs font-semibold text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tenant.factures.map(f => (
              <tr key={f.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="py-2.5 text-slate-700 font-medium">{f.periode}</td>
                <td className="py-2.5 text-slate-400 font-mono text-xs">{f.date}</td>
                <td className="py-2.5 font-semibold text-slate-700">{f.montant} $</td>
                <td className="py-2.5">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${f.statut === 'payée' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {f.statut}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* ── PAIEMENT ────────────────────────────────────────────────────────── */}
      <SectionCard title="Informations de paiement" icon={<Banknote size={17} />}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <CreditCard size={18} className="text-slate-400" />
            </div>
            <div>
              {tenant.paiement.methode === 'carte' ? (
                <>
                  <p className="font-semibold text-slate-800">Carte **** **** **** {tenant.paiement.derniers4}</p>
                  <p className="text-xs text-slate-400">Expire {tenant.paiement.expiration} · {tenant.paiement.titulaire}</p>
                </>
              ) : tenant.paiement.methode === 'virement' ? (
                <p className="font-semibold text-slate-800">Virement bancaire — {tenant.paiement.titulaire}</p>
              ) : (
                <p className="text-sm text-slate-400 italic">Aucune information de paiement enregistrée</p>
              )}
            </div>
          </div>
          <button onClick={() => setShowPaiement(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">
            <Edit size={13} /> Modifier
          </button>
        </div>
      </SectionCard>

      {/* ── ANNULATION ──────────────────────────────────────────────────────── */}
      {tenant.statut !== 'annulé' && (
        <div className="bg-white rounded-2xl border border-red-100 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-1">
                <TrendingDown size={17} className="text-red-400" /> Zone de danger
              </h2>
              <p className="text-sm text-slate-400">L&apos;annulation prend effet à la fin de la période en cours. Toutes vos données seront conservées 30 jours.</p>
            </div>
            <button onClick={() => setShowCancel(true)} className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition">
              Annuler mon abonnement
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showForfait && (
        <ChangeForfaitModal
          current={tenant.forfait}
          onConfirm={f => {
            upgradePlanWithModules(tenant.id, f)
            try {
              const raw = localStorage.getItem('bidexa_session')
              if (raw) { const s = JSON.parse(raw); s.forfait = f; localStorage.setItem('bidexa_session', JSON.stringify(s)) }
            } catch {}
            refresh()
            showToast('Forfait mis à jour ! Modules et quotas IA appliqués.')
          }}
          onClose={() => setShowForfait(false)}
        />
      )}
      {showPaiement && (
        <PaiementModal
          tenant={tenant}
          onSave={p => { updatePaiement(tenant.id, p); refresh(); showToast('Informations de paiement enregistrées.') }}
          onClose={() => setShowPaiement(false)}
        />
      )}
      {showCancel && (
        <CancelModal
          onConfirm={raison => { cancelTenant(tenant.id, raison); refresh(); setShowCancel(false); showToast('Abonnement annulé.') }}
          onClose={() => setShowCancel(false)}
        />
      )}
    </div>
  )
}
