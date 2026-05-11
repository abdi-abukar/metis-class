import { NextResponse } from 'next/server'
import { QUESTIONS, store } from '@/lib/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(
    {
      questions: QUESTIONS,
      currentQuestionId: store.currentQuestionId,
      votes: store.votes,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    },
  )
}
