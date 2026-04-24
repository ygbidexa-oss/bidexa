import { NextResponse } from 'next/server'
import { fournisseurs } from '@/lib/mock-data/fournisseurs'

export async function GET() {
  return NextResponse.json(fournisseurs)
}
