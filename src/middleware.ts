import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Désactivé temporairement pour test Supabase
// TODO: Réactiver avec vérification Supabase

export function middleware(request: NextRequest) {
  // Laisser passer toutes les requêtes pour l'instant
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
