import { NextResponse } from 'next/server'
import { projets } from '@/lib/mock-data/projets'

export async function GET() {
  return NextResponse.json(projets)
}
