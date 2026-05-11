import { NextResponse } from 'next/server'
import { QUESTIONS, store } from '@/lib/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    questions: QUESTIONS,
    currentQuestionId: store.currentQuestionId,
    votes: store.votes,
  })
}
