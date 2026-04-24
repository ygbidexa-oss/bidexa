/**
 * Security module — Bidexa MVP
 * Brute-force guard · AI quota · Sanitisation · Token · Session validation
 */

import type { Session } from './auth'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LoginAttempt {
  count: number
  firstAttempt: number
  lockedUntil?: number
}

interface AIQuota {
  dailyCount: number
  monthlyCount: number
  lastReset: string  // YYYY-MM-DD
  monthReset: string // YYYY-MM
}

const QUOTA_LIMITS: Record<string, { daily: number; monthly: number }> = {
  starter:    { daily: 20,  monthly: 200  },
  pro:        { daily: 100, monthly: 1000 },
  enterprise: { daily: 500, monthly: 5000 },
}

// ── Brute-force guard ─────────────────────────────────────────────────────────

function attemptKey(email: string): string {
  // lightweight key derivation (no crypto needed for the key name)
  let h = 0
  for (let i = 0; i < email.length; i++) {
    h = ((h << 5) - h) ^ email.charCodeAt(i)
    h = h >>> 0
  }
  return `bidexa_login_attempts_${h.toString(16)}`
}

export function checkBruteForce(email: string): {
  allowed: boolean
  remainingAttempts?: number
  lockedUntil?: number
} {
  if (typeof window === 'undefined') return { allowed: true }
  try {
    const raw = localStorage.getItem(attemptKey(email))
    if (!raw) return { allowed: true, remainingAttempts: 5 }
    const data: LoginAttempt = JSON.parse(raw)

    if (data.lockedUntil && Date.now() < data.lockedUntil) {
      return { allowed: false, lockedUntil: data.lockedUntil }
    }
    // lock expired — reset
    if (data.lockedUntil && Date.now() >= data.lockedUntil) {
      localStorage.removeItem(attemptKey(email))
      return { allowed: true, remainingAttempts: 5 }
    }

    const remaining = Math.max(0, 5 - data.count)
    return { allowed: remaining > 0, remainingAttempts: remaining }
  } catch {
    return { allowed: true }
  }
}

export function recordFailedAttempt(email: string): void {
  if (typeof window === 'undefined') return
  try {
    const key = attemptKey(email)
    const raw = localStorage.getItem(key)
    const data: LoginAttempt = raw ? JSON.parse(raw) : { count: 0, firstAttempt: Date.now() }
    data.count += 1

    if (data.count >= 8) {
      data.lockedUntil = Date.now() + 60 * 60 * 1000 // 1h
    } else if (data.count >= 5) {
      data.lockedUntil = Date.now() + 15 * 60 * 1000 // 15 min
    }

    localStorage.setItem(key, JSON.stringify(data))
  } catch { /* non-blocking */ }
}

export function resetAttempts(email: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(attemptKey(email))
  } catch { /* non-blocking */ }
}

// ── AI Quota ──────────────────────────────────────────────────────────────────

function quotaKey(userId: string) {
  return `bidexa_ai_quota_${userId}`
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
function thisMonthISO() {
  return new Date().toISOString().slice(0, 7)
}

function getQuota(userId: string): AIQuota {
  if (typeof window === 'undefined') return { dailyCount: 0, monthlyCount: 0, lastReset: todayISO(), monthReset: thisMonthISO() }
  try {
    const raw = localStorage.getItem(quotaKey(userId))
    const q: AIQuota = raw ? JSON.parse(raw) : { dailyCount: 0, monthlyCount: 0, lastReset: todayISO(), monthReset: thisMonthISO() }
    // daily reset
    if (q.lastReset !== todayISO()) {
      q.dailyCount = 0
      q.lastReset = todayISO()
    }
    // monthly reset
    if (q.monthReset !== thisMonthISO()) {
      q.monthlyCount = 0
      q.monthReset = thisMonthISO()
    }
    return q
  } catch {
    return { dailyCount: 0, monthlyCount: 0, lastReset: todayISO(), monthReset: thisMonthISO() }
  }
}

export function checkAIQuota(userId: string, forfait: string): {
  allowed: boolean
  remaining: { daily: number; monthly: number }
  reason?: string
} {
  const limits = QUOTA_LIMITS[forfait] ?? QUOTA_LIMITS['starter']
  const q = getQuota(userId)

  if (q.monthlyCount >= limits.monthly) {
    return { allowed: false, remaining: { daily: 0, monthly: 0 }, reason: 'Quota mensuel atteint' }
  }
  if (q.dailyCount >= limits.daily) {
    return {
      allowed: false,
      remaining: { daily: 0, monthly: limits.monthly - q.monthlyCount },
      reason: `Quota journalier atteint (${q.dailyCount}/${limits.daily}) — réinitialisation à minuit`,
    }
  }

  return {
    allowed: true,
    remaining: {
      daily: limits.daily - q.dailyCount,
      monthly: limits.monthly - q.monthlyCount,
    },
  }
}

export function incrementAIQuota(userId: string): void {
  if (typeof window === 'undefined') return
  try {
    const q = getQuota(userId)
    q.dailyCount += 1
    q.monthlyCount += 1
    localStorage.setItem(quotaKey(userId), JSON.stringify(q))
  } catch { /* non-blocking */ }
}

// ── Sanitisation ──────────────────────────────────────────────────────────────

export function sanitize(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === 'string') return sanitize(obj) as unknown as T
  if (Array.isArray(obj)) return obj.map(sanitizeObject) as unknown as T
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      result[key] = sanitizeObject((obj as Record<string, unknown>)[key])
    }
    return result as T
  }
  return obj
}

// ── Secure token ──────────────────────────────────────────────────────────────

export function generateSecureToken(length = 32): string {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const arr = new Uint8Array(length)
    window.crypto.getRandomValues(arr)
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
  }
  // Fallback (non-browser or test environment)
  return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

// ── Session integrity ─────────────────────────────────────────────────────────

export function validateSessionIntegrity(session: Session): boolean {
  if (!session) return false
  if (!session.token || session.token.length < 8) return false
  if (!session.user?.id) return false
  if (session.expiresAt < Date.now()) return false
  return true
}
