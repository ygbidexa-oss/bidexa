'use client'
import { useRef, useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useEntreprise } from '@/hooks/useEntreprise'
import { Card } from '@/components/ui/Card'
import { Modal, Field, inputCls, Btn } from '@/components/ui/Modal'
import {
  Building2, Pencil, Upload, X, Shield, Lock,
  Users, Plus, Trash2, CheckCircle, XCircle, AlertCircle,
} from 'lucide-react'
import {
  getUsers, saveUsers, ManagedUser, UserRole, addUser,
  toggleUserActif, removeUser,
} from '@/lib/auth'
import { getForfaitsConfig, ALL_MODULES_LABELS, ALL_MODULES_LIST } from '@/lib/subscriptions-store'

const ROLES_LABELS: Record<UserRole, string> = {
  super_admin:  'Super Admin',
  billing_admin:'Billing Admin',
  admin:        'Administrateur',
  directeur:    'Directeur',
  estimateur:   'Estimateur',
  chef_projet:  'Chargé de projet',
  comptable:    'Comptable',
  acheteur:     'Acheteur',
}

const ASSIGNABLE_ROLES: UserRole[] = ['directeur', 'estimateur', 'chef_projet', 'comptable', 'acheteur']

function Section({ title, icon, onEdit, children }: {
  title: string; icon: React.ReactNode; onEdit: () => void; children: React.ReactNode
}) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{icon}</span>
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        </div>
        <button onClick={onEdit} className="flex items-center gap-1 text-xs text-amber-600 hover:underline font-semibold">
          <Pencil size={11} /> Modifier
        </button>
      </div>
      {children}
    </Card>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 shrink-0">{label}</span>
      <span className="text-xs text-slate-700 font-medium text-right">{value || <span className="text-slate-300 italic">Non renseigné</span>}</span>
    </div>
  )
}

export default function EntreprisePage() {
  const { user } = useAuth()
  const { entreprise, update, uploadLogo } = useEntreprise()
  const logoRef = useRef<HTMLInputElement>(null)
  const [toast, setToast] = useState('')
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})

  // Team state
  const [teamUsers, setTeamUsers] = useState<ManagedUser[]>([])
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null)
  const [newUserDraft, setNewUserDraft] = useState({ prenom: '', nom: '', email: '', role: 'estimateur' as UserRole })
  const [forfaitModules, setForfaitModules] = useState<string[]>([])

  useEffect(() => {
    setTeamUsers(getUsers())
    const configs = getForfaitsConfig()
    const f = configs.find(c => c.id === user?.forfait) ?? configs[configs.length - 1]
    setForfaitModules(f?.modules ?? ALL_MODULES_LIST)
  }, [user])

  function refreshTeam() { setTeamUsers(getUsers()) }

  // Accès admin uniquement
  if (user && user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <Lock size={28} className="text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-700">Accès réservé à l'administrateur</h2>
        <p className="text-sm text-slate-400 text-center max-w-xs">
          Seul l'administrateur de l'entreprise peut consulter et modifier le profil d'entreprise.
        </p>
      </div>
    )
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  function openModal(key: string) {
    setDraft({
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
      politique: entreprise?.politique ?? '',
      couleurPrimaire: entreprise?.couleurPrimaire ?? '#C9A84C',
    })
    setActiveModal(key)
  }

  function saveModal() {
    update(draft as Parameters<typeof update>[0])
    setActiveModal(null)
    showToast('Profil entreprise mis à jour.')
  }

  async function handleLogo(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { showToast('Logo trop lourd (max 2 MB).'); return }
    await uploadLogo(file)
    showToast('Logo mis à jour.')
    ev.target.value = ''
  }

  // Team helpers
  function openEditUser(mu: ManagedUser) {
    setSelectedUser({ ...mu })
    setActiveModal('editUser')
  }

  function saveUserModules() {
    if (!selectedUser) return
    const users = getUsers()
    const idx = users.findIndex(u => u.id === selectedUser.id)
    if (idx !== -1) {
      users[idx].role = selectedUser.role
      users[idx].modules = selectedUser.modules
      saveUsers(users)
      refreshTeam()
      showToast('Accès de l\'utilisateur mis à jour.')
    }
    setActiveModal(null)
  }

  function toggleModule(mod: string) {
    if (!selectedUser) return
    const mods = selectedUser.modules.includes(mod)
      ? selectedUser.modules.filter(m => m !== mod)
      : [...selectedUser.modules, mod]
    setSelectedUser({ ...selectedUser, modules: mods })
  }

  function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    const nu: ManagedUser = {
      id: `mu-${Date.now()}`,
      prenom: newUserDraft.prenom,
      nom: newUserDraft.nom,
      email: newUserDraft.email,
      role: newUserDraft.role,
      modules: [],
      actif: true,
      createdAt: new Date().toISOString().split('T')[0],
    }
    addUser(nu)
    refreshTeam()
    setNewUserDraft({ prenom: '', nom: '', email: '', role: 'estimateur' })
    setActiveModal(null)
    showToast('Utilisateur ajouté.')
  }

  function handleToggleActif(id: string) {
    toggleUserActif(id)
    refreshTeam()
  }

  function handleRemove(id: string) {
    if (!confirm('Supprimer cet utilisateur ?')) return
    removeUser(id)
    refreshTeam()
    showToast('Utilisateur supprimé.')
  }

  const ent = entreprise

  return (
    <div className="max-w-4xl space-y-5">
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg">{toast}</div>
      )}

      {/* En-tête */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <Shield size={20} className="text-amber-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800">Profil entreprise</h1>
          <p className="text-xs text-slate-400">Visible uniquement par l'administrateur · Données utilisées dans tous les documents</p>
        </div>
      </div>

      {/* Carte identité + logo */}
      <Card>
        <div className="flex items-start gap-6">
          {/* Logo */}
          <div className="relative group shrink-0">
            {ent?.logo ? (
              <img src={ent.logo} alt="Logo" className="w-20 h-20 rounded-xl object-contain border border-slate-200 bg-slate-50" />
            ) : (
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                <Building2 size={28} className="text-slate-300" />
              </div>
            )}
            <button
              onClick={() => logoRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition text-white"
            >
              <Upload size={18} />
            </button>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
          </div>

          {/* Infos principales */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{ent?.nom || '—'}</h2>
                {ent?.slogan && <p className="text-sm text-slate-500 mt-0.5 italic">{ent.slogan}</p>}
              </div>
              <button onClick={() => openModal('identite')} className="flex items-center gap-1 text-xs text-amber-600 hover:underline font-semibold shrink-0">
                <Pencil size={11} /> Modifier
              </button>
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
              {ent?.telephone && <span>📞 {ent.telephone}</span>}
              {ent?.email && <span>✉ {ent.email}</span>}
              {ent?.siteWeb && <span>🌐 {ent.siteWeb}</span>}
            </div>
            <div className="mt-2 flex gap-2 flex-wrap">
              {ent?.permisRBQ && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono">{ent.permisRBQ}</span>
              )}
              {ent?.neq && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono">NEQ {ent.neq}</span>
              )}
            </div>
          </div>
        </div>

        {/* Bouton changer logo */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
          <button onClick={() => logoRef.current?.click()} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition">
            <Upload size={12} /> {ent?.logo ? 'Changer le logo' : 'Téléverser un logo'}
          </button>
          {ent?.logo && (
            <button onClick={() => { update({ logo: '' }); showToast('Logo supprimé.') }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition">
              <X size={12} /> Supprimer
            </button>
          )}
          <p className="text-xs text-slate-400 ml-1">PNG, JPG — max 2 MB</p>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Coordonnées */}
        <Section title="Coordonnées" icon={<Building2 size={15} />} onEdit={() => openModal('coordonnees')}>
          <Row label="Adresse" value={ent?.adresse} />
          <Row label="Ville" value={ent?.ville} />
          <Row label="Province" value={ent?.province} />
          <Row label="Code postal" value={ent?.codePostal} />
          <Row label="Téléphone" value={ent?.telephone} />
          <Row label="Courriel" value={ent?.email} />
          <Row label="Site web" value={ent?.siteWeb} />
        </Section>

        {/* Légal & Fiscal */}
        <Section title="Légal & Fiscal" icon={<Shield size={15} />} onEdit={() => openModal('legal')}>
          <Row label="No. permis RBQ" value={ent?.permisRBQ} />
          <Row label="NEQ" value={ent?.neq} />
          <Row label="No. TPS" value={ent?.noTPS} />
          <Row label="No. TVQ" value={ent?.noTVQ} />
        </Section>
      </div>

      {/* Couleur de marque */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Couleur de marque</h3>
          <button onClick={() => openModal('marque')} className="flex items-center gap-1 text-xs text-amber-600 hover:underline font-semibold">
            <Pencil size={11} /> Modifier
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl border border-slate-200 shadow-sm" style={{ background: ent?.couleurPrimaire ?? '#C9A84C' }} />
          <div>
            <p className="text-sm font-mono font-semibold text-slate-700">{ent?.couleurPrimaire ?? '#C9A84C'}</p>
            <p className="text-xs text-slate-400">Utilisée dans les documents et l'interface</p>
          </div>
        </div>
      </Card>

      {/* Politique / conditions */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Conditions générales par défaut</h3>
          <button onClick={() => openModal('politique')} className="flex items-center gap-1 text-xs text-amber-600 hover:underline font-semibold">
            <Pencil size={11} /> Modifier
          </button>
        </div>
        {ent?.politique ? (
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{ent.politique}</p>
        ) : (
          <p className="text-sm text-slate-400 italic">Aucune politique définie. Cliquez sur Modifier pour rédiger les conditions générales qui s'injecteront automatiquement dans vos soumissions.</p>
        )}
      </Card>

      {/* ══ SECTION ÉQUIPE ══ */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">Gestion de l'équipe</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold border border-amber-100">
              Forfait {user?.forfait?.charAt(0).toUpperCase()}{user?.forfait?.slice(1)}
            </span>
          </div>
          <button
            onClick={() => setActiveModal('addUser')}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 font-semibold transition"
          >
            <Plus size={12} /> Ajouter
          </button>
        </div>

        {/* Info forfait modules */}
        <div className="mb-4 p-3 rounded-xl border border-amber-100 bg-amber-50 flex items-start gap-2">
          <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Seuls les modules inclus dans votre forfait peuvent être assignés à l'équipe.
            Les modules grisés ne sont pas disponibles dans votre plan actuel.
          </p>
        </div>

        {teamUsers.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6 italic">Aucun utilisateur dans l'équipe.</p>
        ) : (
          <div className="space-y-2">
            {teamUsers.map(mu => (
              <div key={mu.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">
                  {mu.prenom[0]}{mu.nom[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700">{mu.prenom} {mu.nom}</p>
                  <p className="text-xs text-slate-400">{mu.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{ROLES_LABELS[mu.role] ?? mu.role}</span>
                  <span className="text-xs text-slate-400">{mu.modules.length} module{mu.modules.length !== 1 ? 's' : ''}</span>
                  <button
                    onClick={() => handleToggleActif(mu.id)}
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${mu.actif ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}
                  >
                    {mu.actif ? 'Actif' : 'Inactif'}
                  </button>
                  <button onClick={() => openEditUser(mu)} className="text-xs text-amber-600 hover:underline font-semibold">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => handleRemove(mu.id)} className="text-xs text-red-400 hover:text-red-600">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Dernière mise à jour */}
      {ent?.updatedAt && (
        <p className="text-xs text-slate-400 text-right">Dernière mise à jour : {new Date(ent.updatedAt).toLocaleString('fr-CA')}</p>
      )}

      {/* ══ MODALS ══ */}

      {/* Identité */}
      <Modal open={activeModal === 'identite'} onClose={() => setActiveModal(null)} title="Modifier — Identité" size="md">
        <form onSubmit={e => { e.preventDefault(); saveModal() }} className="space-y-3">
          <Field label="Nom de l'entreprise" required>
            <input className={inputCls} required value={draft.nom ?? ''} onChange={e => setDraft(d => ({ ...d, nom: e.target.value }))} />
          </Field>
          <Field label="Slogan / Tagline">
            <input className={inputCls} placeholder="L'excellence en construction..." value={draft.slogan ?? ''} onChange={e => setDraft(d => ({ ...d, slogan: e.target.value }))} />
          </Field>
          <div className="flex justify-end gap-2 pt-2"><Btn variant="secondary" type="button" onClick={() => setActiveModal(null)}>Annuler</Btn><Btn type="submit">Sauvegarder</Btn></div>
        </form>
      </Modal>

      {/* Coordonnées */}
      <Modal open={activeModal === 'coordonnees'} onClose={() => setActiveModal(null)} title="Modifier — Coordonnées" size="md">
        <form onSubmit={e => { e.preventDefault(); saveModal() }} className="space-y-3">
          <Field label="Adresse"><input className={inputCls} value={draft.adresse ?? ''} onChange={e => setDraft(d => ({ ...d, adresse: e.target.value }))} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1"><Field label="Ville"><input className={inputCls} value={draft.ville ?? ''} onChange={e => setDraft(d => ({ ...d, ville: e.target.value }))} /></Field></div>
            <Field label="Province"><input className={inputCls} value={draft.province ?? ''} onChange={e => setDraft(d => ({ ...d, province: e.target.value }))} /></Field>
            <Field label="Code postal"><input className={inputCls} value={draft.codePostal ?? ''} onChange={e => setDraft(d => ({ ...d, codePostal: e.target.value }))} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Téléphone"><input className={inputCls} value={draft.telephone ?? ''} onChange={e => setDraft(d => ({ ...d, telephone: e.target.value }))} /></Field>
            <Field label="Courriel"><input type="email" className={inputCls} value={draft.email ?? ''} onChange={e => setDraft(d => ({ ...d, email: e.target.value }))} /></Field>
          </div>
          <Field label="Site web"><input className={inputCls} value={draft.siteWeb ?? ''} onChange={e => setDraft(d => ({ ...d, siteWeb: e.target.value }))} /></Field>
          <div className="flex justify-end gap-2 pt-2"><Btn variant="secondary" type="button" onClick={() => setActiveModal(null)}>Annuler</Btn><Btn type="submit">Sauvegarder</Btn></div>
        </form>
      </Modal>

      {/* Légal */}
      <Modal open={activeModal === 'legal'} onClose={() => setActiveModal(null)} title="Modifier — Légal & Fiscal" size="md">
        <form onSubmit={e => { e.preventDefault(); saveModal() }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="No. permis RBQ"><input className={inputCls} placeholder="RBQ 0000-0000-00" value={draft.permisRBQ ?? ''} onChange={e => setDraft(d => ({ ...d, permisRBQ: e.target.value }))} /></Field>
            <Field label="NEQ"><input className={inputCls} placeholder="2265432189" value={draft.neq ?? ''} onChange={e => setDraft(d => ({ ...d, neq: e.target.value }))} /></Field>
            <Field label="No. TPS"><input className={inputCls} placeholder="123456789 RT0001" value={draft.noTPS ?? ''} onChange={e => setDraft(d => ({ ...d, noTPS: e.target.value }))} /></Field>
            <Field label="No. TVQ"><input className={inputCls} placeholder="1234567890 TQ0001" value={draft.noTVQ ?? ''} onChange={e => setDraft(d => ({ ...d, noTVQ: e.target.value }))} /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Btn variant="secondary" type="button" onClick={() => setActiveModal(null)}>Annuler</Btn><Btn type="submit">Sauvegarder</Btn></div>
        </form>
      </Modal>

      {/* Marque */}
      <Modal open={activeModal === 'marque'} onClose={() => setActiveModal(null)} title="Modifier — Couleur de marque" size="sm">
        <form onSubmit={e => { e.preventDefault(); saveModal() }} className="space-y-4">
          <Field label="Couleur primaire (hex)">
            <div className="flex items-center gap-3">
              <input type="color" value={draft.couleurPrimaire ?? '#C9A84C'} onChange={e => setDraft(d => ({ ...d, couleurPrimaire: e.target.value }))} className="w-12 h-10 rounded-lg cursor-pointer border border-slate-200" />
              <input className={inputCls} value={draft.couleurPrimaire ?? ''} onChange={e => setDraft(d => ({ ...d, couleurPrimaire: e.target.value }))} placeholder="#C9A84C" />
            </div>
          </Field>
          <div className="p-3 rounded-xl text-white text-sm font-semibold text-center" style={{ background: draft.couleurPrimaire ?? '#C9A84C', color: '#0D1B2A' }}>
            Aperçu de la couleur
          </div>
          <div className="flex justify-end gap-2 pt-1"><Btn variant="secondary" type="button" onClick={() => setActiveModal(null)}>Annuler</Btn><Btn type="submit">Sauvegarder</Btn></div>
        </form>
      </Modal>

      {/* Politique */}
      <Modal open={activeModal === 'politique'} onClose={() => setActiveModal(null)} title="Modifier — Conditions générales" size="lg">
        <form onSubmit={e => { e.preventDefault(); saveModal() }} className="space-y-3">
          <Field label="Conditions générales par défaut">
            <textarea rows={8} className={inputCls} placeholder="Ex. Cette soumission est valide pour une période de 60 jours. Les prix indiqués incluent tous les travaux décrits, la main-d'œuvre, les matériaux et les frais généraux..." value={draft.politique ?? ''} onChange={e => setDraft(d => ({ ...d, politique: e.target.value }))} />
          </Field>
          <p className="text-xs text-slate-400">Ce texte sera injecté automatiquement dans la section « Conditions générales » de vos soumissions.</p>
          <div className="flex justify-end gap-2 pt-1"><Btn variant="secondary" type="button" onClick={() => setActiveModal(null)}>Annuler</Btn><Btn type="submit">Sauvegarder</Btn></div>
        </form>
      </Modal>

      {/* ══ Modal Ajouter utilisateur ══ */}
      <Modal open={activeModal === 'addUser'} onClose={() => setActiveModal(null)} title="Ajouter un membre d'équipe" size="md">
        <form onSubmit={handleAddUser} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom" required>
              <input className={inputCls} required value={newUserDraft.prenom} onChange={e => setNewUserDraft(d => ({ ...d, prenom: e.target.value }))} />
            </Field>
            <Field label="Nom" required>
              <input className={inputCls} required value={newUserDraft.nom} onChange={e => setNewUserDraft(d => ({ ...d, nom: e.target.value }))} />
            </Field>
          </div>
          <Field label="Courriel" required>
            <input type="email" className={inputCls} required value={newUserDraft.email} onChange={e => setNewUserDraft(d => ({ ...d, email: e.target.value }))} />
          </Field>
          <Field label="Rôle">
            <select className={inputCls} value={newUserDraft.role} onChange={e => setNewUserDraft(d => ({ ...d, role: e.target.value as UserRole }))}>
              {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{ROLES_LABELS[r]}</option>)}
            </select>
          </Field>
          <p className="text-xs text-slate-400">Les modules seront configurés après la création.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="secondary" type="button" onClick={() => setActiveModal(null)}>Annuler</Btn>
            <Btn type="submit">Créer</Btn>
          </div>
        </form>
      </Modal>

      {/* ══ Modal Modifier accès modules ══ */}
      <Modal open={activeModal === 'editUser'} onClose={() => setActiveModal(null)} title={`Accès — ${selectedUser?.prenom} ${selectedUser?.nom}`} size="md">
        {selectedUser && (
          <div className="space-y-4">
            {/* Rôle */}
            <Field label="Rôle">
              <select
                className={inputCls}
                value={selectedUser.role}
                onChange={e => setSelectedUser({ ...selectedUser, role: e.target.value as UserRole })}
              >
                {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{ROLES_LABELS[r]}</option>)}
              </select>
            </Field>

            {/* Modules */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Modules accessibles</p>
              <div className="grid grid-cols-2 gap-2">
                {ALL_MODULES_LIST.map(mod => {
                  const inForfait = forfaitModules.includes(mod)
                  const checked = selectedUser.modules.includes(mod)
                  return (
                    <label
                      key={mod}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                        !inForfait
                          ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                          : checked
                            ? 'border-amber-300 bg-amber-50'
                            : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!inForfait}
                        onChange={() => inForfait && toggleModule(mod)}
                        className="accent-amber-500"
                      />
                      <span className="text-xs text-slate-700 flex-1">{ALL_MODULES_LABELS[mod]}</span>
                      {!inForfait && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-400 text-[10px]">
                          {user?.forfait === 'starter' ? 'Pro requis' : 'Enterprise requis'}
                        </span>
                      )}
                      {inForfait && checked && <CheckCircle size={12} className="text-emerald-500 shrink-0" />}
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Btn variant="secondary" type="button" onClick={() => setActiveModal(null)}>Annuler</Btn>
              <Btn type="button" onClick={saveUserModules}>Sauvegarder</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
