/**
 * Authentification Bidexa — MVP localStorage
 *
 * Sécurité :
 *  - Les mots de passe ne sont jamais stockés en clair
 *  - hashPwd() applique un hash djb2 + sel avant toute écriture
 *  - Le compte admin est initialisé dans localStorage au premier démarrage
 *  - Pour la production : remplacer par un backend avec bcrypt + JWT
 */

export type UserRole = 'super_admin' | 'billing_admin' | 'admin' | 'directeur' | 'estimateur' | 'chef_projet' | 'comptable' | 'acheteur'
export type UserForfait = 'starter' | 'pro' | 'enterprise'

export interface AuthUser {
  id: string
  prenom: string
  nom: string
  email: string
  entreprise: string
  role: UserRole
  forfait: UserForfait
  avatar?: string
}

export interface Session {
  user: AuthUser
  token: string
  expiresAt: number
}

// ── Hash function (djb2 + salt — suffisant pour un MVP localStorage) ──────────
const HASH_SALT = 'bidexa_mvp_salt_v1'

export function hashPwd(password: string): string {
  const str = password + HASH_SALT
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash = hash >>> 0 // force unsigned 32-bit
  }
  return hash.toString(16).padStart(8, '0')
}

// ── Permissions par rôle ─────────────────────────────────────────────────────
export const PERMISSIONS: Record<UserRole, string[]> = {
  super_admin:   ['clients', 'soumissions', 'estimation', 'concurrence', 'projets', 'bons-commande', 'fournisseurs', 'comptabilite', 'documents', 'reporting', 'ia', 'profil', 'super-admin', 'abonnement'],
  billing_admin: ['super-admin', 'profil'],
  admin:         ['clients', 'soumissions', 'estimation', 'concurrence', 'projets', 'bons-commande', 'fournisseurs', 'comptabilite', 'documents', 'reporting', 'ia', 'profil', 'abonnement'],
  directeur: ['clients', 'soumissions', 'estimation', 'concurrence', 'projets', 'comptabilite', 'reporting', 'ia', 'profil'],
  estimateur: ['clients', 'soumissions', 'estimation', 'concurrence', 'documents', 'profil'],
  chef_projet: ['projets', 'bons-commande', 'fournisseurs', 'documents', 'profil'],
  comptable: ['comptabilite', 'bons-commande', 'fournisseurs', 'reporting', 'documents', 'profil'],
  acheteur: ['fournisseurs', 'bons-commande', 'documents', 'profil'],
}

// ── Types internes ───────────────────────────────────────────────────────────
interface StoredUser extends AuthUser {
  passwordHash: string
}

const AUTH_DB_KEY = 'bidexa_auth_users'
const SESSION_KEY = 'bidexa_session'

// ── Bootstrap admin au premier démarrage ────────────────────────────────────
// Le mot de passe initial est hashé et stocké dans localStorage.
// Aucun mot de passe en clair n'est jamais persisté.
function bootstrapAdmin(): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(AUTH_DB_KEY)
    const users: StoredUser[] = raw ? JSON.parse(raw) : []
    const adminIdx = users.findIndex(u => u.email === 'yghan61@gmail.com')
    if (adminIdx === -1) {
      users.push({
        id: 'usr-001',
        prenom: 'Youne',
        nom: 'G.',
        email: 'yghan61@gmail.com',
        passwordHash: hashPwd('Ikramamira2026!'),
        entreprise: 'Bidexa',
        role: 'admin',
        forfait: 'enterprise',
      })
    } else {
      users[adminIdx].role = 'admin'
      users[adminIdx].forfait = 'enterprise'
    }
    // Compte gestionnaire abonnements — accès /super-admin uniquement
    const bidexa2Idx = users.findIndex(u => u.email === 'Bidexa@gmail.com')
    if (bidexa2Idx === -1) {
      users.push({
        id: 'usr-002',
        prenom: 'Bidexa',
        nom: 'Admin',
        email: 'Bidexa@gmail.com',
        passwordHash: hashPwd('Ikramamira2026!'),
        entreprise: 'Bidexa',
        role: 'billing_admin',
        forfait: 'enterprise',
      })
    } else {
      users[bidexa2Idx].role = 'billing_admin'
      users[bidexa2Idx].forfait = 'enterprise'
    }
    localStorage.setItem(AUTH_DB_KEY, JSON.stringify(users))
  } catch { /* silently fail — non-blocking */ }
}

function getStoredUsers(): StoredUser[] {
  if (typeof window === 'undefined') return []
  bootstrapAdmin()
  try {
    const raw = localStorage.getItem(AUTH_DB_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveStoredUsers(users: StoredUser[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_DB_KEY, JSON.stringify(users))
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function generateToken(): string {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const arr = new Uint8Array(32)
    window.crypto.getRandomValues(arr)
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Session duration: 8h (MVP — configurable per forfait in production)
const SESSION_DURATION_MS = 1000 * 60 * 60 * 8

// ── API publique ─────────────────────────────────────────────────────────────
export function login(email: string, password: string): { success: true; user: AuthUser } | { success: false; error: string; lockedUntil?: number; remainingAttempts?: number } {
  // Dynamic import to avoid circular deps with security.ts
  let checkBF: typeof import('./security').checkBruteForce | null = null
  let recordFail: typeof import('./security').recordFailedAttempt | null = null
  let resetAtt: typeof import('./security').resetAttempts | null = null
  let logAuditFn: typeof import('./audit-log').logAudit | null = null

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sec = require('./security') as typeof import('./security')
    checkBF = sec.checkBruteForce
    recordFail = sec.recordFailedAttempt
    resetAtt = sec.resetAttempts
  } catch { /* security module optional */ }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const audit = require('./audit-log') as typeof import('./audit-log')
    logAuditFn = audit.logAudit
  } catch { /* audit optional */ }

  // Brute-force check
  if (checkBF) {
    const bf = checkBF(email)
    if (!bf.allowed) {
      logAuditFn?.('ACCOUNT_LOCKED', `Email: ${email}`)
      return { success: false, error: 'Compte temporairement verrouillé. Réessayez plus tard.', lockedUntil: bf.lockedUntil }
    }
  }

  const users = getStoredUsers()
  const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === hashPwd(password))

  if (!found) {
    recordFail?.(email)
    logAuditFn?.('LOGIN_FAILED', `Email: ${email}`)
    // Check remaining after recording
    if (checkBF) {
      const bf2 = checkBF(email)
      if (!bf2.allowed) {
        return { success: false, error: 'Compte verrouillé pendant 15 minutes après trop de tentatives.', lockedUntil: bf2.lockedUntil }
      }
      return { success: false, error: 'Email ou mot de passe incorrect.', remainingAttempts: bf2.remainingAttempts }
    }
    return { success: false, error: 'Email ou mot de passe incorrect.' }
  }

  resetAtt?.(email)
  const { passwordHash: _pw, ...user } = found

  // Session fingerprint (first 80 chars of user-agent)
  const fingerprint = typeof window !== 'undefined' ? navigator.userAgent.slice(0, 80) : ''

  const session: Session & { fingerprint?: string } = {
    user,
    token: generateToken(),
    expiresAt: Date.now() + SESSION_DURATION_MS,
    fingerprint,
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    // Also set a cookie so the middleware can read it
    document.cookie = `bidexa_session=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=${SESSION_DURATION_MS / 1000}; SameSite=Strict`
  }
  logAuditFn?.('LOGIN_SUCCESS', `Email: ${email}`, user.id)
  return { success: true, user }
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const audit = require('./audit-log') as typeof import('./audit-log')
      audit.logAudit('LOGOUT')
    } catch { /* non-blocking */ }
    localStorage.removeItem(SESSION_KEY)
    document.cookie = 'bidexa_session=; path=/; max-age=0; SameSite=Strict'
  }
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session: Session = JSON.parse(raw)
    if (session.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session.user
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null
}

export function updateProfile(updates: Partial<Pick<AuthUser, 'prenom' | 'nom' | 'avatar'>>): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return false
    const session: Session = JSON.parse(raw)
    session.user = { ...session.user, ...updates }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return true
  } catch { return false }
}

export function changePassword(email: string, currentPassword: string, newPassword: string): boolean {
  const users = getStoredUsers()
  const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === hashPwd(currentPassword))
  if (idx === -1) return false
  users[idx].passwordHash = hashPwd(newPassword)
  saveStoredUsers(users)
  return true
}

// ── Gestion des utilisateurs de l'entreprise ─────────────────────────────────
export const ALL_MODULES = [
  'clients', 'estimation', 'soumissions', 'concurrence',
  'projets', 'bons-commande', 'fournisseurs',
  'comptabilite', 'documents', 'reporting', 'ia',
] as const

export interface ManagedUser {
  id: string
  prenom: string
  nom: string
  email: string
  role: UserRole
  modules: string[]
  actif: boolean
  createdAt: string
}

const USERS_KEY = 'bidexa_users'

const DEFAULT_USERS: ManagedUser[] = [
  { id: 'mu-001', prenom: 'Marie', nom: 'Tremblay', email: 'marie.tremblay@bidexa.ca', role: 'estimateur', modules: ['clients', 'estimation', 'soumissions', 'concurrence', 'documents'], actif: true, createdAt: '2024-01-10' },
  { id: 'mu-002', prenom: 'Jean-Luc', nom: 'Côté', email: 'jl.cote@bidexa.ca', role: 'chef_projet', modules: ['projets', 'bons-commande', 'fournisseurs', 'documents'], actif: true, createdAt: '2024-01-15' },
  { id: 'mu-003', prenom: 'Sophie', nom: 'Marchand', email: 'sophie.marchand@bidexa.ca', role: 'comptable', modules: ['comptabilite', 'bons-commande', 'fournisseurs', 'reporting', 'documents'], actif: true, createdAt: '2024-02-01' },
  { id: 'mu-004', prenom: 'Patrick', nom: 'Blais', email: 'patrick.blais@bidexa.ca', role: 'acheteur', modules: ['fournisseurs', 'bons-commande', 'documents'], actif: false, createdAt: '2024-03-05' },
]

export function getUsers(): ManagedUser[] {
  if (typeof window === 'undefined') return DEFAULT_USERS
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) {
      localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS))
      return DEFAULT_USERS
    }
    return JSON.parse(raw) as ManagedUser[]
  } catch { return DEFAULT_USERS }
}

export function saveUsers(users: ManagedUser[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function addUser(user: ManagedUser): void {
  const users = getUsers()
  users.push(user)
  saveUsers(users)
}

export function updateUserRole(userId: string, role: UserRole): void {
  const users = getUsers()
  const idx = users.findIndex(u => u.id === userId)
  if (idx !== -1) { users[idx].role = role; saveUsers(users) }
}

export function updateUserModules(userId: string, modules: string[]): void {
  const users = getUsers()
  const idx = users.findIndex(u => u.id === userId)
  if (idx !== -1) { users[idx].modules = modules; saveUsers(users) }
}

export function toggleUserActif(userId: string): void {
  const users = getUsers()
  const idx = users.findIndex(u => u.id === userId)
  if (idx !== -1) { users[idx].actif = !users[idx].actif; saveUsers(users) }
}

export function removeUser(userId: string): void {
  const users = getUsers().filter(u => u.id !== userId)
  saveUsers(users)
}

// ── Inscription ──────────────────────────────────────────────────────────────
export function register(data: {
  prenom: string
  nom: string
  email: string
  password: string
  entreprise: string
  forfait: UserForfait
}): { success: true } | { success: false; error: string } {
  const users = getStoredUsers()
  const exists = users.find(u => u.email.toLowerCase() === data.email.toLowerCase())
  if (exists) return { success: false, error: 'Cet email est déjà utilisé.' }

  const newUser: StoredUser = {
    id: `usr-${Date.now()}`,
    prenom: data.prenom,
    nom: data.nom,
    email: data.email,
    passwordHash: hashPwd(data.password),
    entreprise: data.entreprise,
    role: 'admin',
    forfait: data.forfait,
  }
  users.push(newUser)
  saveStoredUsers(users)
  return { success: true }
}
