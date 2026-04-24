'use client'
import { useState, useRef, FormEvent, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { register, login, type UserForfait } from '@/lib/auth'
import { initEntreprise } from '@/lib/entreprise'
import { createTenantForUser, getForfaitsConfig, ForfaitConfig } from '@/lib/subscriptions-store'
import {
  Eye, EyeOff, CheckCircle, Building2, ChevronRight,
  Upload, X, Bot, Users, CreditCard, Lock,
} from 'lucide-react'

const inputCls = 'w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition'

export default function RegisterPage() {
  const router = useRouter()
  const logoRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [forfaits, setForfaits] = useState<ForfaitConfig[]>([])

  useEffect(() => { setForfaits(getForfaitsConfig()) }, [])

  // Étape 1 — Compte
  const [compte, setCompte] = useState({
    prenom: '', nom: '', email: '', password: '', confirm: '',
    forfait: 'pro' as UserForfait,
  })

  // Étape 2 — Entreprise
  const [ent, setEnt] = useState({
    nom: '', logo: '', logoNom: '',
    adresse: '', ville: '', province: 'QC', codePostal: '',
    telephone: '', email: '', siteWeb: '',
    permisRBQ: '', neq: '', noTPS: '', noTVQ: '', politique: '',
  })

  // Étape 3 — Paiement
  const [paiement, setPaiement] = useState({
    methode: 'carte' as 'carte' | 'virement',
    num: '', exp: '', cvv: '', titulaire: '',
  })

  function setC(k: string, v: string) { setCompte(f => ({ ...f, [k]: v })) }
  function setE(k: string, v: string) { setEnt(f => ({ ...f, [k]: v })) }
  function setP(k: string, v: string) { setPaiement(f => ({ ...f, [k]: v })) }

  const selectedForfait = forfaits.find(f => f.id === compte.forfait)

  /* ── Étape 1 ── */
  function handleStep1(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (compte.password !== compte.confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (compte.password.length < 8) { setError('Minimum 8 caractères.'); return }
    if (!ent.nom) setEnt(f => ({ ...f, nom: compte.prenom + ' ' + compte.nom }))
    setStep(2)
  }

  /* ── Logo upload ── */
  function handleLogo(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Logo trop lourd (max 2 MB).'); return }
    const reader = new FileReader()
    reader.onload = () => setEnt(f => ({ ...f, logo: reader.result as string, logoNom: file.name }))
    reader.readAsDataURL(file)
    ev.target.value = ''
  }

  /* ── Étape 2 → 3 ── */
  function handleStep2(e: FormEvent) {
    e.preventDefault()
    if (!ent.nom.trim()) { setError("Le nom de l'entreprise est requis."); return }
    setError('')
    // Si forfait gratuit/Enterprise sans prix → passer paiement optionnel
    setStep(3)
  }

  /* ── Étape 3 — Soumission finale ── */
  async function handleStep3(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 1) Créer le compte utilisateur
    const result = register({
      prenom: compte.prenom,
      nom: compte.nom,
      email: compte.email,
      password: compte.password,
      entreprise: ent.nom,
      forfait: compte.forfait,
    })
    if (!result.success) { setError(result.error); setLoading(false); return }

    // 2) Sauvegarder le profil entreprise
    initEntreprise(ent.nom, {
      logo: ent.logo,
      adresse: ent.adresse,
      ville: ent.ville,
      province: ent.province,
      codePostal: ent.codePostal,
      telephone: ent.telephone,
      email: ent.email || compte.email,
      siteWeb: ent.siteWeb,
      permisRBQ: ent.permisRBQ,
      neq: ent.neq,
      noTPS: ent.noTPS,
      noTVQ: ent.noTVQ,
      politique: ent.politique,
    })

    // 3) Créer le tenant avec tous les paramètres du forfait
    createTenantForUser({
      email: compte.email,
      entreprise: ent.nom,
      forfait: compte.forfait,
      paiement: {
        methode: paiement.titulaire ? paiement.methode : null,
        derniers4: paiement.methode === 'carte' ? paiement.num.replace(/\s/g, '').slice(-4) : '',
        expiration: paiement.exp,
        titulaire: paiement.titulaire,
      },
    })

    // 4) Auto-login → rediriger vers le dashboard
    const loginResult = login(compte.email, compte.password)
    setLoading(false)
    if (loginResult.success) {
      setSuccess(true)
      setTimeout(() => router.replace('/dashboard'), 1500)
    } else {
      setSuccess(true)
      setTimeout(() => router.replace('/login'), 1800)
    }
  }

  /* ── Succès ── */
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Compte créé avec succès !</h2>
          <p className="text-sm text-slate-500">Redirection vers votre espace Bidexa...</p>
        </div>
      </div>
    )
  }

  const STEPS = ['Votre compte', 'Profil entreprise', 'Paiement']

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base" style={{ background: '#0D1B2A', color: '#C9A84C' }}>B</div>
            <span className="font-bold text-xl" style={{ color: '#0D1B2A' }}>Bidexa</span>
          </Link>
        </div>

        {/* Indicateur d'étapes */}
        <div className="flex items-center gap-2 mb-6 px-2">
          {STEPS.map((label, i) => {
            const n = i + 1
            const done = step > n
            const active = step === n
            return (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${done || active ? 'text-[#0D1B2A]' : 'border-2 border-slate-200 text-slate-400'}`}
                  style={done || active ? { background: '#C9A84C' } : {}}>
                  {done ? <CheckCircle size={14} /> : n}
                </div>
                <span className={`text-xs font-medium ${active ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
                {n < 3 && <ChevronRight size={12} className="text-slate-300 ml-auto" />}
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}

          {/* ══ ÉTAPE 1 — Compte ══ */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <h1 className="text-xl font-bold text-slate-800 mb-1">Créer votre compte</h1>
              <p className="text-sm text-slate-500 mb-4">Commencez gratuitement — sans engagement</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prénom *</label>
                  <input required value={compte.prenom} onChange={e => setC('prenom', e.target.value)} placeholder="Jean" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nom *</label>
                  <input required value={compte.nom} onChange={e => setC('nom', e.target.value)} placeholder="Tremblay" className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Adresse courriel *</label>
                <input type="email" required value={compte.email} onChange={e => setC('email', e.target.value)} placeholder="vous@entreprise.ca" className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mot de passe * (min 8 caractères)</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} required value={compte.password} onChange={e => setC('password', e.target.value)} placeholder="••••••••" className={inputCls + ' pr-10'} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirmer le mot de passe *</label>
                <input type="password" required value={compte.confirm} onChange={e => setC('confirm', e.target.value)} placeholder="••••••••" className={inputCls} />
              </div>

              {/* Choix forfait */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Choisir votre forfait *</label>
                <div className="grid grid-cols-1 gap-3">
                  {forfaits.map(f => (
                    <button key={f.id} type="button" onClick={() => setC('forfait', f.id)}
                      className={`border-2 rounded-xl p-4 text-left transition ${compte.forfait === f.id ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-bold ${compte.forfait === f.id ? 'text-amber-700' : 'text-slate-700'}`}>{f.nom}</span>
                        <span className="text-base font-extrabold" style={{ color: '#C9A84C' }}>{f.prix ? `${f.prix} $/mois` : 'Sur devis'}</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-2">{f.desc}</p>
                      <div className="flex gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Bot size={11} />{f.iaJour} req. IA/jour</span>
                        <span className="flex items-center gap-1"><Users size={11} />{f.maxUtilisateurs ?? '∞'} utilisateur(s)</span>
                        <span className="flex items-center gap-1"><CheckCircle size={11} className="text-emerald-500" />{f.modules.length} modules</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full py-3 rounded-xl font-semibold text-sm transition hover:opacity-90 flex items-center justify-center gap-2 mt-2" style={{ background: '#0D1B2A', color: 'white' }}>
                Continuer <ChevronRight size={16} />
              </button>
            </form>
          )}

          {/* ══ ÉTAPE 2 — Profil entreprise ══ */}
          {step === 2 && (
            <form onSubmit={handleStep2} className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-slate-800 mb-1">Profil de votre entreprise</h1>
                <p className="text-sm text-slate-500">Ces informations apparaîtront sur vos documents. Modifiables à tout moment.</p>
              </div>

              {/* Logo */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Logo de l'entreprise</label>
                <div className="flex items-center gap-4">
                  {ent.logo ? (
                    <div className="relative group">
                      <img src={ent.logo} alt="Logo" className="w-16 h-16 rounded-xl object-contain border border-slate-200 bg-slate-50" />
                      <button type="button" onClick={() => setEnt(f => ({ ...f, logo: '', logoNom: '' }))}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50">
                      <Building2 size={24} className="text-slate-300" />
                    </div>
                  )}
                  <div>
                    <button type="button" onClick={() => logoRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition">
                      <Upload size={14} /> {ent.logo ? 'Changer' : 'Téléverser un logo'}
                    </button>
                    <p className="text-xs text-slate-400 mt-1">PNG, JPG — max 2 MB</p>
                  </div>
                  <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nom de l'entreprise *</label>
                <input required value={ent.nom} onChange={e => setE('nom', e.target.value)} placeholder="Construction XYZ inc." className={inputCls} />
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Coordonnées</p>
                <input value={ent.adresse} onChange={e => setE('adresse', e.target.value)} placeholder="Adresse" className={inputCls} />
                <div className="grid grid-cols-3 gap-3">
                  <input value={ent.ville} onChange={e => setE('ville', e.target.value)} placeholder="Ville" className={inputCls} />
                  <input value={ent.province} onChange={e => setE('province', e.target.value)} placeholder="Province" className={inputCls} />
                  <input value={ent.codePostal} onChange={e => setE('codePostal', e.target.value)} placeholder="Code postal" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="tel" value={ent.telephone} onChange={e => setE('telephone', e.target.value)} placeholder="Téléphone" className={inputCls} />
                  <input type="email" value={ent.email} onChange={e => setE('email', e.target.value)} placeholder="Courriel entreprise" className={inputCls} />
                </div>
                <input value={ent.siteWeb} onChange={e => setE('siteWeb', e.target.value)} placeholder="Site web" className={inputCls} />
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Légal & Fiscal <span className="normal-case font-normal">(optionnel)</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <input value={ent.permisRBQ} onChange={e => setE('permisRBQ', e.target.value)} placeholder="RBQ 0000-0000-00" className={inputCls} />
                  <input value={ent.neq} onChange={e => setE('neq', e.target.value)} placeholder="NEQ" className={inputCls} />
                  <input value={ent.noTPS} onChange={e => setE('noTPS', e.target.value)} placeholder="No. TPS" className={inputCls} />
                  <input value={ent.noTVQ} onChange={e => setE('noTVQ', e.target.value)} placeholder="No. TVQ" className={inputCls} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setStep(1); setError('') }} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Retour</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition hover:opacity-90" style={{ background: '#0D1B2A', color: 'white' }}>
                  Continuer vers le paiement <ChevronRight size={14} className="inline" />
                </button>
              </div>
            </form>
          )}

          {/* ══ ÉTAPE 3 — Paiement ══ */}
          {step === 3 && (
            <form onSubmit={handleStep3} className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-slate-800 mb-1">Informations de paiement</h1>
                <p className="text-sm text-slate-500">Vos données sont chiffrées et sécurisées.</p>
              </div>

              {/* Récapitulatif forfait */}
              {selectedForfait && (
                <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-600 font-semibold">FORFAIT SÉLECTIONNÉ</p>
                    <p className="font-bold text-slate-800">{selectedForfait.nom}</p>
                    <p className="text-xs text-slate-500">{selectedForfait.modules.length} modules · {selectedForfait.iaJour} req. IA/jour</p>
                  </div>
                  <p className="text-2xl font-extrabold" style={{ color: '#C9A84C' }}>
                    {selectedForfait.prix ? `${selectedForfait.prix} $` : 'Devis'}
                    {selectedForfait.prix && <span className="text-xs text-amber-500">/mois</span>}
                  </p>
                </div>
              )}

              {/* Toggle méthode */}
              <div className="flex gap-2">
                {[{ id: 'carte', label: 'Carte bancaire' }, { id: 'virement', label: 'Virement bancaire' }].map(m => (
                  <button key={m.id} type="button" onClick={() => setP('methode', m.id)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition ${paiement.methode === m.id ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    {m.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nom du titulaire</label>
                <input value={paiement.titulaire} onChange={e => setP('titulaire', e.target.value)} placeholder="Jean Tremblay" className={inputCls} />
              </div>

              {paiement.methode === 'carte' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Numéro de carte</label>
                    <input value={paiement.num} onChange={e => setP('num', e.target.value)} maxLength={19} placeholder="1234 5678 9012 3456" className={inputCls + ' font-mono'} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Expiration</label>
                      <input value={paiement.exp} onChange={e => setP('exp', e.target.value)} placeholder="MM/AA" maxLength={5} className={inputCls + ' font-mono'} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">CVV</label>
                      <input value={paiement.cvv} onChange={e => setP('cvv', e.target.value)} placeholder="123" maxLength={4} className={inputCls + ' font-mono'} />
                    </div>
                  </div>
                </>
              )}

              {paiement.methode === 'virement' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                  <p className="font-semibold mb-1">Coordonnées bancaires Bidexa</p>
                  <p>Institution : Banque XYZ · Transit : 12345 · Institution : 006</p>
                  <p>Compte : 0012345678</p>
                  <p className="text-xs text-blue-500 mt-1">Indiquez votre # d'entreprise en référence.</p>
                </div>
              )}

              {/* Sécurité */}
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Lock size={12} /> Vos informations sont chiffrées SSL — jamais partagées
              </div>

              {/* Bouton passer */}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setStep(2); setError('') }} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Retour</button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2" style={{ background: '#0D1B2A', color: 'white' }}>
                  <CreditCard size={15} />
                  {loading ? 'Création en cours...' : selectedForfait?.prix ? `Activer — ${selectedForfait.prix} $/mois` : 'Créer mon espace Bidexa'}
                </button>
              </div>

              {selectedForfait?.prix && (
                <button type="button" onClick={handleStep3} disabled={loading} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
                  Passer le paiement pour l'instant — ajouter plus tard
                </button>
              )}
            </form>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          Déjà un compte ?{' '}
          <Link href="/login" className="font-semibold hover:underline" style={{ color: '#C9A84C' }}>Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
