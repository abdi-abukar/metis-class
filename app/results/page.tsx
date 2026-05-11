'use client'
import { useEffect, useRef, useState } from 'react'

interface Question {
  id: number
  slide: string
  text: string
  type: 'poll' | 'wordcloud'
  options: string[]
}

interface Vote {
  question_id: number
  option_index: number | null
  word: string | null
}

interface StateResp {
  questions: Question[]
  currentQuestionId: number
  votes: Vote[]
}

export default function ResultsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [votesByQ, setVotesByQ] = useState<Record<number, Vote[]>>({})
  const inFlightRef = useRef(false)

  async function poll() {
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      const res = await fetch(`/api/state?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'cache-control': 'no-cache' },
      })
      const data: StateResp = await res.json()
      setQuestions(data.questions)
      setCurrentId(data.currentQuestionId)
      const grouped: Record<number, Vote[]> = {}
      for (const v of data.votes) {
        if (!grouped[v.question_id]) grouped[v.question_id] = []
        grouped[v.question_id].push(v)
      }
      setVotesByQ(grouped)
    } catch {
    } finally {
      inFlightRef.current = false
    }
  }

  useEffect(() => {
    poll()
    const t = setInterval(poll, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-stone-800 mb-6">Live results</h1>
        <div className="space-y-4">
          {questions.map(q => {
            const votes = votesByQ[q.id] || []
            const total = votes.length
            const isLive = q.id === currentId
            return (
              <div
                key={q.id}
                className={`bg-white rounded-2xl border p-5 ${
                  isLive ? 'border-green-400 shadow-sm' : 'border-stone-200 opacity-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {isLive && (
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                  )}
                  <p className="text-xs text-stone-400">Q{q.id + 1} · {q.slide}</p>
                </div>
                <p className="font-semibold text-stone-800 mb-4">{q.text}</p>

                {q.type === 'poll' ? (
                  <div className="space-y-2">
                    {q.options.map((opt, i) => {
                      const count = votes.filter(v => v.option_index === i).length
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-sm text-stone-600 mb-1">
                            <span>{opt}</span>
                            <span>
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {votes.length === 0 ? (
                      <p className="text-stone-400 text-sm">No responses yet</p>
                    ) : (
                      votes.map((v, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-stone-100 rounded-full text-sm text-stone-700"
                        >
                          {v.word}
                        </span>
                      ))
                    )}
                  </div>
                )}

                <p className="text-xs text-stone-400 mt-3">
                  {total} total response{total !== 1 ? 's' : ''}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
