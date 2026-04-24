/**
 * Test brute-force + login — simulation localStorage (Node.js)
 * Run: node test-bruteforce.mjs
 */

// ── Simuler le navigateur ─────────────────────────────────────────────────────
const store = {}
global.window = {
  crypto: {
    getRandomValues(arr) {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256)
      return arr
    }
  }
}
global.localStorage = {
  getItem: k => store[k] ?? null,
  setItem: (k, v) => { store[k] = v },
  removeItem: k => { delete store[k] },
}
try { Object.defineProperty(global, 'navigator', { value: { userAgent: 'TestAgent/1.0' }, writable: true }) } catch {}
global.document = { cookie: '' }

// ── Reproduire la logique security.ts ────────────────────────────────────────
const HASH_SALT = 'bidexa_mvp_salt_v1'
function hashPwd(password) {
  const str = password + HASH_SALT
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash = hash >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

function attemptKey(email) {
  let h = 0
  for (let i = 0; i < email.length; i++) {
    h = ((h << 5) - h) ^ email.charCodeAt(i)
    h = h >>> 0
  }
  return `bidexa_login_attempts_${h.toString(16)}`
}

function checkBruteForce(email) {
  const raw = localStorage.getItem(attemptKey(email))
  if (!raw) return { allowed: true, remainingAttempts: 5 }
  const data = JSON.parse(raw)
  if (data.lockedUntil && Date.now() < data.lockedUntil) {
    const secsLeft = Math.ceil((data.lockedUntil - Date.now()) / 1000)
    return { allowed: false, lockedUntil: data.lockedUntil, secsLeft }
  }
  if (data.lockedUntil && Date.now() >= data.lockedUntil) {
    localStorage.removeItem(attemptKey(email))
    return { allowed: true, remainingAttempts: 5 }
  }
  const remaining = Math.max(0, 5 - data.count)
  return { allowed: remaining > 0, remainingAttempts: remaining }
}

function recordFailedAttempt(email) {
  const key = attemptKey(email)
  const raw = localStorage.getItem(key)
  const data = raw ? JSON.parse(raw) : { count: 0, firstAttempt: Date.now() }
  data.count += 1
  if (data.count >= 8)      data.lockedUntil = Date.now() + 60 * 60 * 1000  // 1h
  else if (data.count >= 5) data.lockedUntil = Date.now() + 15 * 60 * 1000  // 15 min
  localStorage.setItem(key, JSON.stringify(data))
}

function resetAttempts(email) {
  localStorage.removeItem(attemptKey(email))
}

// ── Simuler login ─────────────────────────────────────────────────────────────
const CORRECT_EMAIL    = 'yghan61@gmail.com'
const CORRECT_PASSWORD = 'Ikramamira2026!'
const STORED_HASH      = hashPwd(CORRECT_PASSWORD)

function login(email, password) {
  const bf = checkBruteForce(email)
  if (!bf.allowed) {
    return { success: false, error: `COMPTE VERROUILLÉ (~${bf.secsLeft}s restantes)`, lockedUntil: bf.lockedUntil }
  }

  const valid = email === CORRECT_EMAIL && hashPwd(password) === STORED_HASH
  if (!valid) {
    recordFailedAttempt(email)
    const bf2 = checkBruteForce(email)
    if (!bf2.allowed) {
      return { success: false, error: `Compte verrouillé 15 min après 5 tentatives.`, lockedUntil: bf2.lockedUntil }
    }
    return { success: false, error: 'Email ou mot de passe incorrect.', remainingAttempts: bf2.remainingAttempts }
  }

  resetAttempts(email)
  return { success: true, user: { email, role: 'admin' } }
}

// ── TESTS ─────────────────────────────────────────────────────────────────────
const GREEN  = '\x1b[32m'
const RED    = '\x1b[31m'
const YELLOW = '\x1b[33m'
const BLUE   = '\x1b[34m'
const RESET  = '\x1b[0m'
const BOLD   = '\x1b[1m'

let passed = 0, failed = 0

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`${GREEN}  ✓ PASS${RESET} ${label}`)
    passed++
  } else {
    console.log(`${RED}  ✗ FAIL${RESET} ${label}${detail ? ` → ${detail}` : ''}`)
    failed++
  }
}

console.log(`\n${BOLD}${BLUE}╔══════════════════════════════════════════════╗${RESET}`)
console.log(`${BOLD}${BLUE}║   BIDEXA — Test Brute-Force & Authentification ║${RESET}`)
console.log(`${BOLD}${BLUE}╚══════════════════════════════════════════════╝${RESET}\n`)

// ── TEST 1 : Connexion valide ─────────────────────────────────────────────────
console.log(`${BOLD}▶ TEST 1 — Connexion valide${RESET}`)
const t1 = login(CORRECT_EMAIL, CORRECT_PASSWORD)
assert('Connexion réussie avec email + mdp correct', t1.success === true)
assert('User retourné avec le bon email', t1.user?.email === CORRECT_EMAIL)

// ── TEST 2 : Mauvais mot de passe ─────────────────────────────────────────────
console.log(`\n${BOLD}▶ TEST 2 — Mauvais mot de passe${RESET}`)
const t2 = login(CORRECT_EMAIL, 'mauvaismdp')
assert('Echec avec mauvais mdp',  t2.success === false)
assert('Message d\'erreur présent', t2.error.includes('incorrect'))
assert('Tentatives restantes = 4', t2.remainingAttempts === 4, `reçu: ${t2.remainingAttempts}`)

// ── TEST 3 : Montée en charge brute-force ─────────────────────────────────────
console.log(`\n${BOLD}▶ TEST 3 — 4 tentatives supplémentaires → verrouillage${RESET}`)
let lastResult
for (let i = 2; i <= 5; i++) {
  lastResult = login(CORRECT_EMAIL, `wrong${i}`)
  const remaining = 5 - i
  if (i < 5) {
    assert(`Tentative ${i} — ${remaining} restante(s)`, lastResult.remainingAttempts === remaining, `reçu: ${lastResult.remainingAttempts}`)
  }
}
// Après la 5e tentative échouée → verrouillage
assert('Compte verrouillé à la 5e tentative', lastResult.success === false && (lastResult.error.includes('verrouil') || lastResult.lockedUntil))

// ── TEST 4 : Tentative pendant le verrouillage ────────────────────────────────
console.log(`\n${BOLD}▶ TEST 4 — Tentatives pendant le verrouillage${RESET}`)
const t4a = login(CORRECT_EMAIL, CORRECT_PASSWORD) // même le bon mdp est bloqué
assert('Bon mdp refusé pendant verrouillage', t4a.success === false)
assert('Message verrouillage affiché',         t4a.error.includes('verrouil') || t4a.error.includes('VERROUILLÉ'))

const t4b = login(CORRECT_EMAIL, 'wrong')
assert('Mauvais mdp refusé pendant verrouillage', t4b.success === false)

// ── TEST 5 : Connexion mauvais email ──────────────────────────────────────────
console.log(`\n${BOLD}▶ TEST 5 — Email inexistant${RESET}`)
const t5 = login('inconnu@test.ca', 'anypassword')
assert('Email inconnu → échec', t5.success === false)
assert('4 tentatives restantes sur ce nouvel email', t5.remainingAttempts === 4, `reçu: ${t5.remainingAttempts}`)

// ── TEST 6 : Hash déterministe ────────────────────────────────────────────────
console.log(`\n${BOLD}▶ TEST 6 — Hash déterministe (anti-collision basique)${RESET}`)
const h1 = hashPwd('Ikramamira2026!')
const h2 = hashPwd('Ikramamira2026!')
const h3 = hashPwd('Ikramamira2026?')  // 1 char différent
assert('Même mdp → même hash',        h1 === h2)
assert('Mdp différent → hash différent', h1 !== h3)
assert('Hash non vide et 8 hex chars',    /^[0-9a-f]{8}$/.test(h1), `hash: ${h1}`)

// ── TEST 7 : Reset après succès ───────────────────────────────────────────────
console.log(`\n${BOLD}▶ TEST 7 — Reset compteur après succès (email différent non verrouillé)${RESET}`)
const freshEmail = 'fresh@test.ca'
login(freshEmail, 'wrong1')
login(freshEmail, 'wrong2')
const beforeReset = checkBruteForce(freshEmail)
assert('Compteur actif avant reset', beforeReset.remainingAttempts === 3)
resetAttempts(freshEmail)
const afterReset = checkBruteForce(freshEmail)
assert('Compteur remis à zéro après reset', afterReset.remainingAttempts === 5, `reçu: ${afterReset.remainingAttempts}`)

// ── Résumé ────────────────────────────────────────────────────────────────────
const total = passed + failed
console.log(`\n${BOLD}══════════════════════════════════════${RESET}`)
console.log(`${BOLD}Résultats : ${GREEN}${passed} PASS${RESET} / ${failed > 0 ? RED : ''}${failed} FAIL${RESET} / ${total} total`)
if (failed === 0) {
  console.log(`${GREEN}${BOLD}✓ Tous les tests passent — brute-force opérationnel !${RESET}`)
} else {
  console.log(`${YELLOW}⚠ ${failed} test(s) échoué(s) — voir détails ci-dessus${RESET}`)
  process.exit(1)
}
console.log()
