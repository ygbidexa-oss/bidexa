import { NextResponse } from 'next/server'
import { soumissions } from '@/lib/mock-data/soumissions'

export async function GET() {
  return NextResponse.json(soumissions)
}
