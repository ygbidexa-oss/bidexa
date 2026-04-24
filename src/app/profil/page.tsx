'use client'
import { useRef, useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useEntreprise } from '@/hooks/useEntreprise'
import { updateProfile, PERMISSIONS, ALL_MODULES, getUsers, saveUsers, addUser, toggleUserActif, ManagedUser, UserRole } from '@/lib/auth'
import { Card } from '@/components/ui/Card'
import { Modal, Field, inputCls, selectCls, Btn } from '@/components/ui/Modal'
import { Camera, Pencil, Upload, X, Building2, Shield, Lock, Users, Plus, CheckCircle2, Circle, FileText, Trash2, Download } from 'lucide-react'
import { getAuditLog, clearAuditLog, exportAuditCSV, AuditEntry } from '@/lib/audit-log'

const roleLabels: Record<string, string> = {
  admin: 'Administrateur',
  directeur: 'Directeur',
  estimateur: 'Estimateur',
  chef_projet: 'Chargé de projet',
  comptable: 'Comptable',
  acheteur: 'Acheteur',
}
const moduleLabels: Record<string, string> = {
  clients: 'Clients', estimation: 'Estimation', soumissions: 'Soumissions',
  concurrence: 'Concurrence', projets: 'Projets', 'bons-commande': 'Bons de commande',
  fournisseurs: 'Fournisseurs', comptabilite: 'Comptabilité', documents: 'Documents',
  reporting: 'Reporting', ia: 'IA',
}
const forfaitLabels: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Entreprise',
}

function Section({ title, icon, onEdit, children }: {
  title: string; icon: React.ReactNode; onEdit?: () => void; children: React.ReactNode
}) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{icon}</span>
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        </div>
        {onEdit && (
          <button onClick={onEdit} className="flex items-center gap-1 text-xs text-amber-600 hover:underline font-semibold">
            <Pencil size={11} /> Modifier
          </button>
        )}
      </div>
      {children}
    </Card>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 shrink-0">{label}</span>
      <span className="text-xs text-slate-700 font-medium text-right">{value || <span className="italic text-slate-300">Non renseigné</span>}</span>
    </div>
  )
}

export default function ProfilPage() {
  const { user, logout } = useAuth()
  const { entreprise, update: updateEnt, uploadLogo } = useEntreprise()

  const avatarRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLInputElement>(null)
  const [toast, setToast] = useState('')
  const [avatar, setAvatar] = useState<string>(user?.avatar ?? '')

  // Audit log (admin only)
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [showAudit, setShowAudit] = useState(false)
  useEffect(() => {
    if (user?.role === 'admin' && showAudit) {
      setAuditEntries(getAuditLog())
    }
  }, [user, showAudit])

  function handleExportAudit() {
    const csv = exportAuditCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `bidexa_audit_${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  function handleClearAudit() {
    if (!confirm('Effacer tout le journal de sécurité ? Cette action est irréversible.')) return
    clearAuditLog()
    setAuditEntries([])
    showToast('Journal effacé.')
  }

  // Modal personnel
  const [modalPerso, setModalPerso] = useState(false)
  const [draftPerso, setDraftPerso] = useState({ prenom: user?.prenom ?? '', nom: user?.nom ?? '' })

  // Modal entreprise (sections)
  const [activeModal, setActiveModal] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [draftEnt, setDraftEnt] = useState<Record<string, any>>({})

  // ── Gestion utilisateurs ──
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [editUser, setEditUser] = useState<ManagedUser | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('estimateur')
  const [editModules, setEditModules] = useState<string[]>([])
  const [inviteModal, setInviteModal] = useState(false)
  const [inviteData, setInviteData] = useState({ prenom: '', nom: '', email: '', role: 'estimateur' as UserRole })
  const [inviteModules, setInviteModules] = useState<string[]>([])
  useEffect(() => { setUsers(getUsers()) }, [])
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  /* ── Photo de profil ── */
  function handleAvatar(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { showToast('Image trop lourde (max 2 MB).'); return }
    const reader = new FileReader()
    reader.onload = () => {
      const b64 = reader.result as string
      setAvatar(b64)
      updateProfile({ avatar: b64 })
      showToast('Photo de profil mise à jour.')
    }
    reader.readAsDataURL(file)
    ev.target.value = ''
  }

  /* ── Infos personnelles ── */
  function savePerso(e: React.FormEvent) {
    e.preventDefault()
    updateProfile({ prenom: draftPerso.prenom, nom: draftPerso.nom })
    setModalPerso(false)
    showToast('Informations personnelles mises à jour.')
  }

  /* ── Entreprise ── */
  function openEntModal(key: string) {
    setDraftEnt({
      nom: entreprise?.nom ?? '',
      slogan: entreprise?.slogan ?? '',
      adresse: entreprise?.adresse ?? '',
      ville: entreprise?.ville ?? '',
      province: entreprise?.province ?? 'QC',
      codePostal: entreprise?.codePostal ?? '',
      telephone: entreprise?.telephone ?? '',
      email: entreprise?.email ?? '',
      siteWeb: entreprise?.siteWeb ?? '',
      permisRBQ: entreprise?.permisRBQ ?? '',
      neq: entreprise?.neq ?? '',
      noTPS: entreprise?.noTPS ?? '',
      noTVQ: entreprise?.noTVQ ?? '',
      tauxTPS: entreprise?.tauxTPS ?? 5,
      tauxTVQ: entreprise?.tauxTVQ ?? 9.975,
      taxesActivees: entreprise?.taxesActivees ?? true,
      politique: entreprise?.politique ?? '',
      couleurPrimaire: entreprise?.couleurPrimaire ?? '#C9A84C',
    })
    setActiveModal(key)
  }
  function saveEnt() {
    updateEnt(draftEnt as Parameters<typeof updateEnt>[0])
    setActiveModal(null)
    showToast('Profil entreprise mis à jour.')
  }

  async function handleLogo(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { showToast('Logo trop lourd (max 2 MB).'); return }
    await uploadLogo(file)
    showToast('Logo entreprise mis à jour.')
    ev.target.value = ''
  }

  const initials = user ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase() : 'U'
  const perms = user ? PERMISSIONS[user.role] : []

  // ── Helpers utilisateurs ──
  function openEditUser(u: ManagedUser) {
    setEditUser(u)
    setEditRole(u.role)
    setEditModules([...u.modules])
  }
  function saveEditUser() {
    if (!editUser) return
    const updated = users.map(u => u.id === editUser.id ? { ...u, role: editRole, modules: editModules } : u)
    saveUsers(updated)
    setUsers(updated)
    setEditUser(null)
    showToast('Utilisateur mis à jour.')
  }
  function doToggleActif(userId: string) {
    toggleUserActif(userId)
    setUsers(getUsers())
    showToast('Statut modifié.')
  }
  function prefillModules(role: UserRole) {
    setEditModules(PERMISSIONS[role].filter(m => m !== 'profil'))
  }
  function handleInviteRole(role: UserRole) {
    setInviteData(d => ({ ...d, role }))
    setInviteModules(PERMISSIONS[role].filter(m => m !== 'profil'))
  }
  function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newUser: ManagedUser = {
      id: `mu-${Date.now()}`,
      prenom: inviteData.prenom,
      nom: inviteData.nom,
      email: inviteData.email,
      role: inviteData.role,
      modules: inviteModules,
      actif: true,
      createdAt: new Date().toISOString().slice(0, 10),
    }
    addUser(newUser)
    setUsers(getUsers())
    setInviteModal(false)
    setInviteData({ prenom: '', nom: '', email: '', role: 'estimateur' })
    setInviteModules([])
    showToast('Utilisateur invité avec succès.')
  }

  return (
    <div className="max-w-5xl space-y-5">
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">{toast}</div>
      )}

      {/* ── PHOTO + NOM ── */}
      <Card>
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative group shrink-0">
            {avatar ? (
              <img src={avatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-amber-300 shadow" />
            ) : (
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold shadow" style={{ background: '#0D1B2A', color: '#C9A84C' }}>
                {initials}
              </div>
            )}
            <button
              onClick={() => avatarRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition text-white"
            >
              <Camera size={20} />
            </button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{user?.prenom} {user?.nom}</h2>
                <p className="text-sm text-slate-500">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">{roleLabels[user?.role ?? '']}</span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">{forfaitLabels[user?.forfait ?? '']} Plan</span>
                  <span className="text-xs text-slate-400">{user?.entreprise}</span>
                </div>
              </div>
              <button onClick={() => { setDraftPerso({ prenom: user?.prenom ?? '', nom: user?.nom ?? '' }); setModalPerso(true) }}
                className="flex items-center gap-1 text-xs text-amber-600 hover:underline font-semibold shrink-0">
                <Pencil size={11} /> Modifier
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button onClick={() => avatarRef.current?.click()}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition">
                <Camera size={12} /> {avatar ? 'Changer la photo' : 'Ajouter une photo de profil'}
              </button>
              {avatar && (
                <button onClick={() => { setAvatar(''); updateProfile({ avatar: '' }); showToast('Photo supprimée.') }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition">
                  <X size={12} /> Supprimer
                </button>
              )}
              <p className="text-xs text-slate-400">PNG, JPG — max 2 MB</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ── PERMISSIONS ── */}
      <Section title="Modules accessibles" icon={<Lock size={15} />}>
        <div className="flex flex-wrap gap-2">
          {perms.map(p => (
            <span key={p} className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 capitalize font-medium">{p}</span>
          ))}
        </div>
      </Section>

      {/* ══ SECTION ENTREPRISE — admin seulement ══ */}
      {user?.role === 'admin' && (
        <>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3">Profil Entreprise</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Logo + Identité */}
          <Card>
            <div className="flex items-start gap-5">
              {/* Logo */}
              <div className="relative group shrink-0">
                {entreprise?.logo ? (
                  <img src={entreprise.logo} alt="Logo" className="w-20 h-20 rounded-xl object-contain border border-slate-200 bg-slate-50" />
                ) : (
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1">
                    <Building2 size={22} className="text-slate-300" />
                    <span className="text-xs text-slate-300">Logo</span>
                  </div>
                )}
                <button onClick={() => logoRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition text-white">
                  <Upload size={18} />
                </button>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
              </div>

              {/* Infos entreprise */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{entreprise?.nom || '—'}</h3>
                    {entreprise?.slogan && <p className="text-sm text-slate-400 italic">{entreprise.slogan}</p>}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                      {entreprise?.telephone && <span>📞 {entreprise.telephone}</span>}
                      {entreprise?.email && <span>✉ {entreprise.email}</span>}
                      {entreprise?.siteWeb && <span>🌐 {entreprise.siteWeb}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {entreprise?.permisRBQ && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono">{entreprise.permisRBQ}</span>}
                      {entreprise?.neq && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono">NEQ {entreprise.neq}</span>}
                    </div>
                  </div>
                  <button onClick={() => openEntModal('identite')}
                    className="flex items-center gap-1 text-xs text-amber-600 hover:underline font-semibold shrink-0">
                    <Pencil size={11} /> Modifier
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => logoRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition">
                    <Upload size={12} /> {entreprise?.logo ? 'Changer le logo' : 'Ajouter un logo'}
                  </button>
                  {entreprise?.logo && (
                    <button onClick={() => { updateEnt({ logo: '' }); showToast('Logo supprimé.') }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition">
                      <X size={12} /> Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coordonnées */}
            <Section title="Coordonnées" icon={<Building2 size={15} />} onEdit={() => openEntModal('coordonnees')}>
              <Row label="Adresse" value={entreprise?.adresse} />
              <Row label="Ville" value={entreprise?.ville} />
              <Row label="Province" value={entreprise?.province} />
              <Row label="Code postal" value={entreprise?.codePostal} />
              <Row label="Téléphone" value={entreprise?.telephone} />
              <Row label="Courriel" value={entreprise?.email} />
              <Row label="Site web" value={entreprise?.siteWeb} />
            </Section>

            {/* Légal & Fiscal */}
            <Section title="Légal & Fiscal" icon={<Shield size={15} />} onEdit={() => openEntModal('legal')}>
              <Row label="No. permis RBQ" value={entreprise?.permisRBQ} />
              <Row label="NEQ" value={entreprise?.neq} />
              <Row label="No. TPS" value={entreprise?.noTPS} />
              <Row label="No. TVQ" value={entreprise?.noTVQ} />
            </Section>
          </div>

          {/* Couleur de marque */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><span className="text-slate-400">🎨</span><h3 className="text-sm font-semibold text-slate-700">Couleur de marque</h3></div>
              <button onClick={() => openEntModal('marque')} className="flex items-center gap-1 text-xs text-amber-600 hover:underline font-semibold"><Pencil size={11} /> Modifier</button>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl border border-slate-200 shadow-sm" style={{ background: entreprise?.couleurPrimaire ?? '#C9A84C' }} />
              <div>
                <p className="text-sm font-mono font-semibold text-slate-700">{entreprise?.couleurPrimaire ?? '#C9A84C'}</p>
                <p className="text-xs text-slate-400">Utilisée dans les documents et soumissions</p>
              </div>
            </div>
          </Card>

          {/* Conditions générales */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Conditions générales par défaut</h3>
              <button onClick={() => openEntModal('politique')} className="flex items-center gap-1 text-xs text-amber-600 hover:underline font-semibold"><Pencil size={11} /> Modifier</button>
            </div>
            {entreprise?.politique
              ? <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{entreprise.politique}</p>
              : <p className="text-sm text-slate-400 italic">Aucune politique définie. Ces conditions s'injectent automatiquement dans vos soumissions.</p>}
          </Card>

          {/* Taxes */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Configuration des taxes</h3>
                <p className="text-xs text-slate-400 mt-0.5">Appliquées automatiquement sur toutes les factures</p>
              </div>
              <button onClick={() => openEntModal('taxes')} className="flex items-center gap-1 text-xs text-amber-600 hover:underline font-semibold"><Pencil size={11} /> Modifier</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Taxes activées</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${entreprise?.taxesActivees !== false ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                  <p className="text-sm font-semibold text-slate-800">{entreprise?.taxesActivees !== false ? 'Oui' : 'Non'}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">TPS</p>
                <p className="text-lg font-bold text-slate-800">{entreprise?.tauxTPS ?? 5}%</p>
                <p className="text-xs text-slate-400">{entreprise?.noTPS || 'N° TPS non configuré'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">TVQ / TVP</p>
                <p className="text-lg font-bold text-slate-800">{entreprise?.tauxTVQ ?? 9.975}%</p>
                <p className="text-xs text-slate-400">{entreprise?.noTVQ || 'N° TVQ non configuré'}</p>
              </div>
            </div>
            {entreprise?.taxesActivees !== false && (
              <div className="mt-3 px-4 py-2.5 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-700">
                Sur une facture de <strong>100 000 $</strong> HT :
                TPS {entreprise?.tauxTPS ?? 5}% = <strong>{((entreprise?.tauxTPS ?? 5) * 1000).toLocaleString()} $</strong> ·
                TVQ {entreprise?.tauxTVQ ?? 9.975}% = <strong>{((entreprise?.tauxTVQ ?? 9.975) * 1000).toLocaleString()} $</strong> ·
                Total TTC = <strong>{(100000 + (entreprise?.tauxTPS ?? 5) * 1000 + (entreprise?.tauxTVQ ?? 9.975) * 1000).toLocaleString()} $</strong>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ══ GESTION UTILISATEURS — admin seulement ══ */}
      {user?.role === 'admin' && (
        <>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3">Gestion des utilisateurs</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <Card padding={false}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={15} className="text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-700">Membres de l'entreprise</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{users.length}</span>
              </div>
              <button
                onClick={() => { setInviteData({ prenom: '', nom: '', email: '', role: 'estimateur' }); setInviteModules(PERMISSIONS.estimateur.filter(m => m !== 'profil')); setInviteModal(true) }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
                style={{ background: '#C9A84C' }}
              >
                <Plus size={12} /> Inviter
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: '#0D1B2A', color: '#C9A84C' }}>
                      {u.prenom[0]}{u.nom[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{u.prenom} {u.nom}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium hidden sm:inline">{roleLabels[u.role]}</span>
                    <div className="flex items-center gap-1">
                      {u.actif
                        ? <><CheckCircle2 size={13} className="text-emerald-500" /><span className="text-xs text-emerald-600 font-medium">Actif</span></>
                        : <><Circle size={13} className="text-slate-300" /><span className="text-xs text-slate-400">Inactif</span></>}
                    </div>
                    <button onClick={() => openEditUser(u)} className="p-1.5 rounded-lg hover:bg-amber-50 hover:text-amber-600 text-slate-400 transition">
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* ══ MODALS ══ */}

      {/* Infos personnelles */}
      <Modal open={modalPerso} onClose={() => setModalPerso(false)} title="Modifier mes informations" size="sm">
        <form onSubmit={savePerso} className="space-y-3">
          <Field label="Prénom" required>
            <input className={inputCls} required value={draftPerso.prenom} onChange={e => setDraftPerso(d => ({ ...d, prenom: e.target.value }))} />
          </Field>
          <Field label="Nom" required>
            <input className={inputCls} required value={draftPerso.nom} onChange={e => setDraftPerso(d => ({ ...d, nom: e.target.value }))} />
          </Field>
          <p className="text-xs text-slate-400">L'email et le rôle ne peuvent être modifiés que par un super-administrateur.</p>
          <div className="flex justify-end gap-2 pt-2"><Btn variant="secondary" type="button" onClick={() => setModalPerso(false)}>Annuler</Btn><Btn type="submit">Sauvegarder</Btn></div>
        </form>
      </Modal>

      {/* Identité entreprise */}
      <Modal open={activeModal === 'identite'} onClose={() => setActiveModal(null)} title="Identité de l'entreprise" size="md">
        <form onSubmit={e => { e.preventDefault(); saveEnt() }} className="space-y-3">
          <Field label="Nom de l'entreprise" required><input className={inputCls} required value={draftEnt.nom ?? ''} onChange={e => setDraftEnt(d => ({ ...d, nom: e.target.value }))} /></Field>
          <Field label="Slogan / Tagline"><input className={inputCls} placeholder="L'excellence en construction..." value={draftEnt.slogan ?? ''} onChange={e => setDraftEnt(d => ({ ...d, slogan: e.target.value }))} /></Field>
          <div className="flex justify-end gap-2 pt-2"><Btn variant="secondary" type="button" onClick={() => setActiveModal(null)}>Annuler</Btn><Btn type="submit">Sauvegarder</Btn></div>
        </form>
      </Modal>

      {/* Coordonnées entreprise */}
      <Modal open={activeModal === 'coordonnees'} onClose={() => setActiveModal(null)} title="Coordonnées de l'entreprise" size="md">
        <form onSubmit={e => { e.preventDefault(); saveEnt() }} className="space-y-3">
          <Field label="Adresse"><input className={inputCls} value={draftEnt.adresse ?? ''} onChange={e => setDraftEnt(d => ({ ...d, adresse: e.target.value }))} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1"><Field label="Ville"><input className={inputCls} value={draftEnt.ville ?? ''} onChange={e => setDraftEnt(d => ({ ...d, ville: e.target.value }))} /></Field></div>
            <Field label="Province"><input className={inputCls} value={draftEnt.province ?? ''} onChange={e => setDraftEnt(d => ({ ...d, province: e.target.value }))} /></Field>
            <Field label="Code postal"><input className={inputCls} value={draftEnt.codePostal ?? ''} onChange={e => setDraftEnt(d => ({ ...d, codePostal: e.target.value }))} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Téléphone"><input className={inputCls} value={draftEnt.telephone ?? ''} onChange={e => setDraftEnt(d => ({ ...d, telephone: e.target.value }))} /></Field>
            <Field label="Courriel"><input type="email" className={inputCls} value={draftEnt.email ?? ''} onChange={e => setDraftEnt(d => ({ ...d, email: e.target.value }))} /></Field>
          </div>
          <Field label="Site web"><input className={inputCls} value={draftEnt.siteWeb ?? ''} onChange={e => setDraftEnt(d => ({ ...d, siteWeb: e.target.value }))} /></Field>
          <div className="flex justify-end gap-2 pt-2"><Btn variant="secondary" type="button" onClick={() => setActiveModal(null)}>Annuler</Btn><Btn type="submit">Sauvegarder</Btn></div>
        </form>
      </Modal>

      {/* Légal */}
      <Modal open={activeModal === 'legal'} onClose={() => setActiveModal(null)} title="Légal & Fiscal" size="md">
        <form onSubmit={e => { e.preventDefault(); saveEnt() }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="No. permis RBQ"><input className={inputCls} placeholder="RBQ 0000-0000-00" value={draftEnt.permisRBQ ?? ''} onChange={e => setDraftEnt(d => ({ ...d, permisRBQ: e.target.value }))} /></Field>
            <Field label="NEQ"><input className={inputCls} value={draftEnt.neq ?? ''} onChange={e => setDraftEnt(d => ({ ...d, neq: e.target.value }))} /></Field>
            <Field label="No. TPS"><input className={inputCls} placeholder="123456789 RT0001" value={draftEnt.noTPS ?? ''} onChange={e => setDraftEnt(d => ({ ...d, noTPS: e.target.value }))} /></Field>
            <Field label="No. TVQ"><input className={inputCls} placeholder="1234567890 TQ0001" value={draftEnt.noTVQ ?? ''} onChange={e => setDraftEnt(d => ({ ...d, noTVQ: e.target.value }))} /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Btn variant="secondary" type="button" onClick={() => setActiveModal(null)}>Annuler</Btn><Btn type="submit">Sauvegarder</Btn></div>
        </form>
      </Modal>

      {/* Couleur */}
      <Modal open={activeModal === 'marque'} onClose={() => setActiveModal(null)} title="Couleur de marque" size="sm">
        <form onSubmit={e => { e.preventDefault(); saveEnt() }} className="space-y-4">
          <Field label="Couleur primaire">
            <div className="flex items-center gap-3">
              <input type="color" value={draftEnt.couleurPrimaire ?? '#C9A84C'} onChange={e => setDraftEnt(d => ({ ...d, couleurPrimaire: e.target.value }))} className="w-12 h-10 rounded-lg cursor-pointer border border-slate-200" />
              <input className={inputCls} value={draftEnt.couleurPrimaire ?? ''} onChange={e => setDraftEnt(d => ({ ...d, couleurPrimaire: e.target.value }))} placeholder="#C9A84C" />
            </div>
          </Field>
          <div className="p-3 rounded-xl text-sm font-bold text-center" style={{ background: draftEnt.couleurPrimaire ?? '#C9A84C', color: '#0D1B2A' }}>Aperçu</div>
          <div className="flex justify-end gap-2"><Btn variant="secondary" type="button" onClick={() => setActiveModal(null)}>Annuler</Btn><Btn type="submit">Sauvegarder</Btn></div>
        </form>
      </Modal>

      {/* Taxes */}
      <Modal open={activeModal === 'taxes'} onClose={() => setActiveModal(null)} title="Configuration des taxes" size="md">
        <form onSubmit={e => { e.preventDefault(); saveEnt() }} className="space-y-5">
          {/* Activation */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <p className="text-sm font-semibold text-slate-700">Activer les taxes sur les factures</p>
              <p className="text-xs text-slate-400 mt-0.5">Si désactivé, les factures n'affichent pas de taxes</p>
            </div>
            <button
              type="button"
              onClick={() => setDraftEnt(d => ({ ...d, taxesActivees: !d.taxesActivees }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${(draftEnt.taxesActivees ?? true) ? 'bg-amber-500' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${(draftEnt.taxesActivees ?? true) ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {(draftEnt.taxesActivees ?? true) && (
            <>
              {/* TPS */}
              <div className="border border-slate-100 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Taxe sur les produits et services (TPS / GST)</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Taux TPS (%)" required>
                    <div className="flex items-center gap-2">
                      <input className={`${inputCls} flex-1`} type="number" step="0.001" min="0" max="100" required
                        value={draftEnt.tauxTPS ?? 5}
                        onChange={e => setDraftEnt(d => ({ ...d, tauxTPS: parseFloat(e.target.value) || 0 }))}
                        placeholder="5" />
                      <span className="text-sm text-slate-400 font-semibold">%</span>
                    </div>
                  </Field>
                  <Field label="Numéro de TPS">
                    <input className={inputCls} value={draftEnt.noTPS ?? ''}
                      onChange={e => setDraftEnt(d => ({ ...d, noTPS: e.target.value }))}
                      placeholder="123456789 RT0001" />
                  </Field>
                </div>
              </div>

              {/* TVQ / TVP */}
              <div className="border border-slate-100 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Taxe de vente du Québec (TVQ) / Taxe provinciale</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Taux TVQ (%)" required>
                    <div className="flex items-center gap-2">
                      <input className={`${inputCls} flex-1`} type="number" step="0.001" min="0" max="100" required
                        value={draftEnt.tauxTVQ ?? 9.975}
                        onChange={e => setDraftEnt(d => ({ ...d, tauxTVQ: parseFloat(e.target.value) || 0 }))}
                        placeholder="9.975" />
                      <span className="text-sm text-slate-400 font-semibold">%</span>
                    </div>
                  </Field>
                  <Field label="Numéro de TVQ">
                    <input className={inputCls} value={draftEnt.noTVQ ?? ''}
                      onChange={e => setDraftEnt(d => ({ ...d, noTVQ: e.target.value }))}
                      placeholder="1234567890 TQ0001" />
                  </Field>
                </div>
              </div>

              {/* Aperçu */}
              {(draftEnt.tauxTPS || draftEnt.tauxTVQ) && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 space-y-1">
                  <p className="font-semibold mb-1">Aperçu — facture de 100 000 $ HT</p>
                  <div className="flex justify-between"><span>TPS {draftEnt.tauxTPS ?? 5}%</span><span className="font-semibold">{((draftEnt.tauxTPS ?? 5) * 1000).toLocaleString('fr-CA')} $</span></div>
                  <div className="flex justify-between"><span>TVQ {draftEnt.tauxTVQ ?? 9.975}%</span><span className="font-semibold">{((draftEnt.tauxTVQ ?? 9.975) * 1000).toLocaleString('fr-CA')} $</span></div>
                  <div className="flex justify-between border-t border-amber-200 pt-1 font-bold">
                    <span>Total TTC</span>
                    <span>{(100000 + (draftEnt.tauxTPS ?? 5) * 1000 + (draftEnt.tauxTVQ ?? 9.975) * 1000).toLocaleString('fr-CA')} $</span>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Btn variant="secondary" type="button" onClick={() => setActiveModal(null)}>Annuler</Btn>
            <Btn type="submit">Sauvegarder</Btn>
          </div>
        </form>
      </Modal>

      {/* Politique */}
      <Modal open={activeModal === 'politique'} onClose={() => setActiveModal(null)} title="Conditions générales" size="lg">
        <form onSubmit={e => { e.preventDefault(); saveEnt() }} className="space-y-3">
          <Field label="Texte des conditions générales">
            <textarea rows={7} className={inputCls} placeholder="Cette soumission est valide pour 60 jours..." value={draftEnt.politique ?? ''} onChange={e => setDraftEnt(d => ({ ...d, politique: e.target.value }))} />
          </Field>
          <p className="text-xs text-slate-400">Ce texte s'injecte automatiquement dans vos soumissions.</p>
          <div className="flex justify-end gap-2 pt-1"><Btn variant="secondary" type="button" onClick={() => setActiveModal(null)}>Annuler</Btn><Btn type="submit">Sauvegarder</Btn></div>
        </form>
      </Modal>

      {/* Modifier utilisateur */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={editUser ? `Modifier — ${editUser.prenom} ${editUser.nom}` : ''} size="md">
        {editUser && (
          <div className="space-y-4">
            <Field label="Rôle">
              <select className={selectCls} value={editRole} onChange={e => setEditRole(e.target.value as UserRole)}>
                {(Object.keys(roleLabels) as UserRole[]).filter(r => r !== 'admin').map(r => (
                  <option key={r} value={r}>{roleLabels[r]}</option>
                ))}
              </select>
            </Field>
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Accès aux modules</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {ALL_MODULES.map(mod => (
                  <label key={mod} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                      checked={editModules.includes(mod)}
                      onChange={e => {
                        if (e.target.checked) setEditModules(m => [...m, mod])
                        else setEditModules(m => m.filter(x => x !== mod))
                      }}
                    />
                    <span className="text-xs text-slate-700">{moduleLabels[mod]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex gap-2">
                <button type="button" onClick={() => prefillModules(editRole)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                  Préremplir depuis le rôle
                </button>
                <button type="button" onClick={() => { doToggleActif(editUser.id); setEditUser(null) }} className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition">
                  {editUser.actif ? 'Désactiver' : 'Réactiver'}
                </button>
              </div>
              <div className="flex gap-2">
                <Btn variant="secondary" type="button" onClick={() => setEditUser(null)}>Annuler</Btn>
                <Btn type="button" onClick={saveEditUser}>Sauvegarder</Btn>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Inviter utilisateur */}
      <Modal open={inviteModal} onClose={() => setInviteModal(false)} title="Inviter un utilisateur" size="md">
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom" required><input className={inputCls} required value={inviteData.prenom} onChange={e => setInviteData(d => ({ ...d, prenom: e.target.value }))} /></Field>
            <Field label="Nom" required><input className={inputCls} required value={inviteData.nom} onChange={e => setInviteData(d => ({ ...d, nom: e.target.value }))} /></Field>
          </div>
          <Field label="Courriel" required><input type="email" className={inputCls} required value={inviteData.email} onChange={e => setInviteData(d => ({ ...d, email: e.target.value }))} /></Field>
          <Field label="Rôle" required>
            <select className={selectCls} value={inviteData.role} onChange={e => handleInviteRole(e.target.value as UserRole)}>
              {(Object.keys(roleLabels) as UserRole[]).filter(r => r !== 'admin').map(r => (
                <option key={r} value={r}>{roleLabels[r]}</option>
              ))}
            </select>
          </Field>
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Modules accessibles</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {ALL_MODULES.map(mod => (
                <label key={mod} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                    checked={inviteModules.includes(mod)}
                    onChange={e => {
                      if (e.target.checked) setInviteModules(m => [...m, mod])
                      else setInviteModules(m => m.filter(x => x !== mod))
                    }}
                  />
                  <span className="text-xs text-slate-700">{moduleLabels[mod]}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="secondary" type="button" onClick={() => setInviteModal(false)}>Annuler</Btn>
            <Btn type="submit">Inviter</Btn>
          </div>
        </form>
      </Modal>

      {/* ── JOURNAL DE SÉCURITÉ (admin only) ── */}
      {user?.role === 'admin' && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Journal de sécurité</h3>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAudit(!showAudit)} className="text-xs text-amber-600 hover:underline font-semibold">
                {showAudit ? 'Masquer' : 'Afficher'}
              </button>
              {showAudit && (
                <>
                  <button onClick={handleExportAudit} className="flex items-center gap-1 text-xs text-slate-600 hover:underline font-medium">
                    <Download size={11} /> Exporter CSV
                  </button>
                  <button onClick={handleClearAudit} className="flex items-center gap-1 text-xs text-red-600 hover:underline font-medium">
                    <Trash2 size={11} /> Effacer
                  </button>
                </>
              )}
            </div>
          </div>
          {showAudit && (
            auditEntries.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">Aucune entrée dans le journal.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 pr-3 text-slate-500 font-semibold">Date</th>
                      <th className="text-left py-2 pr-3 text-slate-500 font-semibold">Action</th>
                      <th className="text-left py-2 pr-3 text-slate-500 font-semibold">Sévérité</th>
                      <th className="text-left py-2 text-slate-500 font-semibold">Détails</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditEntries.slice(0, 100).map(entry => (
                      <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-1.5 pr-3 text-slate-500 whitespace-nowrap font-mono">{entry.timestamp.slice(0, 19).replace('T', ' ')}</td>
                        <td className="py-1.5 pr-3 text-slate-700 font-medium">{entry.action}</td>
                        <td className="py-1.5 pr-3">
                          <span className={`px-1.5 py-0.5 rounded-full font-semibold ${entry.severity === 'critical' ? 'bg-red-100 text-red-700' : entry.severity === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                            {entry.severity}
                          </span>
                        </td>
                        <td className="py-1.5 text-slate-500 max-w-xs truncate">{entry.details ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {auditEntries.length > 100 && (
                  <p className="text-xs text-slate-400 text-center pt-2">{auditEntries.length - 100} entrées supplémentaires — exportez en CSV pour tout voir.</p>
                )}
              </div>
            )
          )}
        </Card>
      )}
    </div>
  )
}
