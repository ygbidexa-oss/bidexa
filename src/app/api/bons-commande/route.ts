import { NextResponse } from 'next/server'
import { bonsCommande } from '@/lib/mock-data/bons-commande'

export async function GET() {
  return NextResponse.json(bonsCommande)
}
