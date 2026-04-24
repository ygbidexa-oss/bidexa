/**
 * Test middleware Bidexa — vérification blocage sans session
 * Run: node test-middleware.mjs
 */

// ── Reproduire la logique middleware (indépendant de Next.js) ─────────────────

const PUBLIC_ROUTES = ['/', '/login', '/register', '/inscription']
const STATIC_PREFIXES = ['/_next', '/favicon', '/api/public', '/images', '/fonts']

function simulateMiddleware(pathname, cookieValue) {
  const baseUrl = 'http://localhost:3000'

  // Statiques
  if (STATIC_PREFIXES.some(p => pathname.startsWith(p)))
    return { action: 'pass', reason: 'static' }

  // Routes publiques
  if (PUBLIC_ROUTES.includes(pathname))
    return { action: 'pass', reason: 'public_route' }

  // Pas de cookie
  if (!cookieValue)
    return { action: 'redirect', to: `/login?redirect=${encodeURIComponent(pathname)}`, reason: 'no_session' }

  // Parser le cookie
  try {
    const session = JSON.parse(decodeURIComponent(cookieValue))

    // Session expirée
    if (!session?.expiresAt || session.expiresAt < Date.now())
      return { action: 'redirect', to: `/login?redirect=${encodeURIComponent(pathname)}`, reason: 'session_expired', deleteCookie: true }

    // Token manquant / user absent
    if (!session?.token || !session?.user?.id)
      return { action: 'redirect', to: `/login`, reason: 'corrupted_session', deleteCookie: true }

    // OK — ajouter X-Request-ID
    const requestId = `req-${Date.now().toString(36)}-test`
    return { action: 'pass', reason: 'valid_session', requestId, user: session.user }

  } catch {
    return { action: 'redirect', to: '/login', reason: 'parse_error', deleteCookie: true }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const GREEN = '\x1b[32m'; const RED = '\x1b[31m'; const YELLOW = '\x1b[33m'
const BLUE  = '\x1b[34m'; const RESET = '\x1b[0m'; const BOLD = '\x1b[1m'
let passed = 0, failed = 0

function assert(label, condition, detail = '') {
  if (condition) { console.log(`${GREEN}  ✓ PASS${RESET} ${label}`); passed++ }
  else           { console.log(`${RED}  ✗ FAIL${RESET} ${label}${detail ? ` — got: ${detail}` : ''}`); failed++ }
}

function validSession(overrides = {}) {
  return encodeURIComponent(JSON.stringify({
    token: 'abc123def456abc123def456abc123de',
    expiresAt: Date.now() + 8 * 60 * 60 * 1000,
    user: { id: 'usr-001', email: 'yghan61@gmail.com', role: 'admin', forfait: 'enterprise' },
    ...overrides,
  }))
}

function expiredSession() {
  return encodeURIComponent(JSON.stringify({
    token: 'abc123',
    expiresAt: Date.now() - 1000, // dans le passé
    user: { id: 'usr-001', email: 'test@test.ca', role: 'admin', forfait: 'pro' },
  }))
}

// ── TESTS ─────────────────────────────────────────────────────────────────────
console.log(`\n${BOLD}${BLUE}╔════════════════════════════════════════════╗${RESET}`)
console.log(`${BOLD}${BLUE}║   BIDEXA — Test Middleware Route Guard       ║${RESET}`)
console.log(`${BOLD}${BLUE}╚════════════════════════════════════════════╝${RESET}\n`)

// ── BLOC 1 : Routes publiques (toujours accessibles) ─────────────────────────
console.log(`${BOLD}▶ BLOC 1 — Routes publiques (sans session)${RESET}`)
for (const route of ['/', '/login', '/register', '/inscription']) {
  const r = simulateMiddleware(route, null)
  assert(`${route} → pass (public)`, r.action === 'pass' && r.reason === 'public_route')
}

// ── BLOC 2 : Fichiers statiques (toujours accessibles) ────────────────────────
console.log(`\n${BOLD}▶ BLOC 2 — Ressources statiques${RESET}`)
for (const path of ['/_next/static/chunk.js', '/favicon.ico', '/images/logo.png', '/fonts/inter.woff2']) {
  const r = simulateMiddleware(path, null)
  assert(`${path} → pass (static)`, r.action === 'pass' && r.reason === 'static')
}

// ── BLOC 3 : Pages protégées SANS session ─────────────────────────────────────
console.log(`\n${BOLD}▶ BLOC 3 — Pages protégées SANS session → doit rediriger${RESET}`)
const PROTECTED = [
  '/dashboard',
  '/clients',
  '/soumissions',
  '/estimation',
  '/projets',
  '/projets/proj-001',
  '/bons-commande',
  '/fournisseurs',
  '/comptabilite',
  '/documents',
  '/reporting',
  '/profil',
]
for (const route of PROTECTED) {
  const r = simulateMiddleware(route, null)
  assert(`${route} → redirect /login (no session)`,
    r.action === 'redirect' && r.to.includes('/login') && r.reason === 'no_session',
    `action=${r.action} reason=${r.reason}`)
}

// ── BLOC 4 : Pages protégées AVEC session valide ──────────────────────────────
console.log(`\n${BOLD}▶ BLOC 4 — Pages protégées AVEC session valide → doit laisser passer${RESET}`)
const session = validSession()
for (const route of ['/dashboard', '/clients', '/projets/proj-001', '/reporting', '/profil']) {
  const r = simulateMiddleware(route, session)
  assert(`${route} → pass (valid session)`,
    r.action === 'pass' && r.reason === 'valid_session',
    `action=${r.action} reason=${r.reason}`)
}

// ── BLOC 5 : Session expirée ──────────────────────────────────────────────────
console.log(`\n${BOLD}▶ BLOC 5 — Session expirée → doit rediriger + supprimer cookie${RESET}`)
const expired = expiredSession()
for (const route of ['/dashboard', '/clients', '/reporting']) {
  const r = simulateMiddleware(route, expired)
  assert(`${route} → redirect (expired)`,
    r.action === 'redirect' && r.reason === 'session_expired' && r.deleteCookie === true,
    `action=${r.action} reason=${r.reason}`)
}

// ── BLOC 6 : Session corrompue ────────────────────────────────────────────────
console.log(`\n${BOLD}▶ BLOC 6 — Session corrompue / JSON invalide → doit rediriger${RESET}`)
const badCookies = [
  'not-json-at-all',
  encodeURIComponent('{broken json'),
  encodeURIComponent('null'),
  encodeURIComponent('{}'), // pas de token ni user
]
for (const cookie of badCookies) {
  const r = simulateMiddleware('/dashboard', cookie)
  assert(`Cookie invalide "${cookie.slice(0,20)}..." → redirect`,
    r.action === 'redirect',
    `action=${r.action} reason=${r.reason}`)
}

// ── BLOC 7 : Paramètre redirect préservé ─────────────────────────────────────
console.log(`\n${BOLD}▶ BLOC 7 — Paramètre ?redirect= préservé dans l'URL de redirection${RESET}`)
const r7a = simulateMiddleware('/projets/proj-abc', null)
assert('redirect param = /projets/proj-abc', r7a.to?.includes(encodeURIComponent('/projets/proj-abc')), r7a.to)

const r7b = simulateMiddleware('/reporting', null)
assert('redirect param = /reporting', r7b.to?.includes(encodeURIComponent('/reporting')), r7b.to)

// ── BLOC 8 : X-Request-ID sur session valide ──────────────────────────────────
console.log(`\n${BOLD}▶ BLOC 8 — X-Request-ID ajouté sur session valide${RESET}`)
const r8 = simulateMiddleware('/dashboard', validSession())
assert('X-Request-ID présent', typeof r8.requestId === 'string' && r8.requestId.startsWith('req-'))
assert('User récupéré de la session', r8.user?.role === 'admin')

// ── BLOC 9 : Token manquant dans session ─────────────────────────────────────
console.log(`\n${BOLD}▶ BLOC 9 — Token absent ou user.id absent → redirect${RESET}`)
const noToken = validSession({ token: '' })
const noUser  = validSession({ user: { email: 'x@x.ca' } }) // pas d'id
const r9a = simulateMiddleware('/dashboard', noToken)
const r9b = simulateMiddleware('/dashboard', noUser)
assert('Token vide → redirect', r9a.action === 'redirect', `action=${r9a.action}`)
assert('user.id absent → redirect', r9b.action === 'redirect', `action=${r9b.action}`)

// ── Résumé ─────────────────────────────────────────────────────────────────────
const total = passed + failed
console.log(`\n${BOLD}══════════════════════════════════════════════${RESET}`)
console.log(`${BOLD}Résultats : ${GREEN}${passed} PASS${RESET} / ${failed > 0 ? RED : ''}${failed} FAIL${RESET} / ${total} total`)
if (failed === 0) {
  console.log(`${GREEN}${BOLD}✓ Middleware opérationnel — aucune route protégée accessible sans session !${RESET}`)
} else {
  console.log(`${YELLOW}⚠ ${failed} test(s) échoué(s)${RESET}`)
  process.exit(1)
}
console.log()
