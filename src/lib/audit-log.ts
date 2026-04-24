/**
 * Audit log — Bidexa MVP
 * Max 500 entrées FIFO, persisté dans localStorage
 */

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'ACCOUNT_LOCKED'
  | 'PASSWORD_CHANGED'
  | 'PO_APPROVED'
  | 'FACTURE_CREATED'
  | 'SOUMISSION_GAGNEE'
  | 'USER_CREATED'
  | 'USER_ROLE_CHANGED'
  | 'AI_REQUEST'
  | 'AI_QUOTA_EXCEEDED'
  | 'DATA_EXPORT'
  | 'UNAUTHORIZED_ACCESS'

export interface AuditEntry {
  id: string
  timestamp: string
  action: AuditAction
  userId?: string
  userEmail?: string
  details?: string
  userAgent?: string
  severity: 'info' | 'warning' | 'critical'
}

const AUDIT_KEY = 'bidexa_audit_log'
const MAX_ENTRIES = 500

const SEVERITY_MAP: Record<AuditAction, AuditEntry['severity']> = {
  LOGIN_SUCCESS:       'info',
  LOGIN_FAILED:        'warning',
  LOGOUT:              'info',
  ACCOUNT_LOCKED:      'critical',
  PASSWORD_CHANGED:    'warning',
  PO_APPROVED:         'info',
  FACTURE_CREATED:     'info',
  SOUMISSION_GAGNEE:   'info',
  USER_CREATED:        'info',
  USER_ROLE_CHANGED:   'warning',
  AI_REQUEST:          'info',
  AI_QUOTA_EXCEEDED:   'warning',
  DATA_EXPORT:         'warning',
  UNAUTHORIZED_ACCESS: 'critical',
}

export function logAudit(action: AuditAction, details?: string, userId?: string): void {
  if (typeof window === 'undefined') return
  try {
    const entries = getAuditLog()
    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      userId,
      details,
      userAgent: navigator.userAgent.slice(0, 120),
      severity: SEVERITY_MAP[action] ?? 'info',
    }
    // Try to get current user email from session
    try {
      const raw = localStorage.getItem('bidexa_session')
      if (raw) {
        const s = JSON.parse(raw)
        entry.userEmail = s?.user?.email
        if (!userId) entry.userId = s?.user?.id
      }
    } catch { /* ok */ }

    entries.unshift(entry)
    // FIFO rotation
    const trimmed = entries.slice(0, MAX_ENTRIES)
    localStorage.setItem(AUDIT_KEY, JSON.stringify(trimmed))
  } catch { /* non-blocking */ }
}

export function getAuditLog(): AuditEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(AUDIT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function clearAuditLog(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUDIT_KEY)
}

export function exportAuditCSV(): string {
  const entries = getAuditLog()
  const header = 'Date,Action,Sévérité,Utilisateur,Email,Détails'
  const rows = entries.map(e =>
    [
      e.timestamp,
      e.action,
      e.severity,
      e.userId ?? '',
      e.userEmail ?? '',
      `"${(e.details ?? '').replace(/"/g, '""')}"`,
    ].join(',')
  )
  return [header, ...rows].join('\n')
}
