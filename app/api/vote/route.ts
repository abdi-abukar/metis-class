import { NextResponse } from 'next/server'
import { QUESTIONS, store } from '@/lib/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'bad json' }, { status: 400 })

  const { voter_id, question_id, option_index, word } = body as {
    voter_id?: string
    question_id?: number
    option_index?: number | null
    word?: string | null
  }

  if (typeof voter_id !== 'string' || !voter_id) {
    return NextResponse.json({ error: 'bad voter_id' }, { status: 400 })
  }
  if (typeof question_id !== 'number' || !QUESTIONS.find(q => q.id === question_id)) {
    return NextResponse.json({ error: 'bad question_id' }, { status: 400 })
  }

  const next = {
    voter_id,
    question_id,
    option_index: typeof option_index === 'number' ? option_index : null,
    word: typeof word === 'string' && word.trim() ? word.trim().slice(0, 60) : null,
  }

  const idx = store.votes.findIndex(
    v => v.voter_id === voter_id && v.question_id === question_id,
  )
  if (idx >= 0) store.votes[idx] = next
  else store.votes.push(next)

  return NextResponse.json({ ok: true })
}
