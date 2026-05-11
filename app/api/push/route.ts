import { NextResponse } from 'next/server'
import { QUESTIONS, store } from '@/lib/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'bad json' }, { status: 400 })

  const { question_id } = body as { question_id?: number }
  if (typeof question_id !== 'number' || !QUESTIONS.find(q => q.id === question_id)) {
    return NextResponse.json({ error: 'bad question_id' }, { status: 400 })
  }

  store.currentQuestionId = question_id
  return NextResponse.json(
    { ok: true, currentQuestionId: store.currentQuestionId },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
