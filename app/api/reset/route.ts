import { NextResponse } from 'next/server'
import { store } from '@/lib/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  store.votes = []
  store.currentQuestionId = 0
  return NextResponse.json({ ok: true })
}
