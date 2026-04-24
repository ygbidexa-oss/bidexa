import { NextResponse } from 'next/server'
import { clients } from '@/lib/mock-data/clients'

export async function GET() {
  return NextResponse.json(clients)
}
