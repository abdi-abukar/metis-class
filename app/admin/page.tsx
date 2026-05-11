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
  voter_id: string
  question_id: number
  option_index: number | null
  word: string | null
}

interface StateResp {
  questions: Question[]
  currentQuestionId: number
  votes: Vote[]
}

export default function AdminPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentId, setCurrentId] = useState<number>(0)
  const [votesByQ, setVotesByQ] = useState<Record<number, Vote[]>>({})
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const pendingPushRef = useRef<{ id: number; until: number } | null>(null)

  async function poll() {
    try {
      const res = await fetch(`/api/state?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'cache-control': 'no-cache' },
      })
      const data: StateResp = await res.json()
      setQuestions(data.questions)
      const pending = pendingPushRef.current
      if (pending && Date.now() < pending.until && data.currentQuestionId !== pending.id) {
        // a poll in flight from before the push: ignore its currentQuestionId
      } else {
        if (pending && data.currentQuestionId === pending.id) pendingPushRef.current = null
        setCurrentId(data.currentQuestionId)
      }
      const grouped: Record<number, Vote[]> = {}
      for (const v of data.votes) {
        if (!grouped[v.question_id]) grouped[v.question_id] = []
        grouped[v.question_id].push(v)
      }
      setVotesByQ(grouped)
    } catch {}
  }

  useEffect(() => {
    poll()
    const t = setInterval(poll, 1000)
    return () => clearInterval(t)
  }, [])

  async function pushQuestion(id: number) {
    pendingPushRef.current = { id, until: Date.now() + 2000 }
    setCurrentId(id)
    const res = await fetch('/api/push', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question_id: id }),
    })
    const data = await res.json().catch(() => null)
    if (data && typeof data.currentQuestionId === 'number') {
      setCurrentId(data.currentQuestionId)
      if (data.currentQuestionId === id) pendingPushRef.current = null
    }
  }

  async function resetAll() {
    if (!confirm('Reset all votes and go back to Q1?')) return
    await fetch('/api/reset', { method: 'POST' })
    poll()
  }

  function toggle(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <main className="min-h-screen bg-stone-950 p-6 text-stone-100">
      <div className="flex items-start justify-between max-w-xl mb-6">
        <div>
          <h1 className="text-white text-2xl font-semibold mb-1">Presenter controls</h1>
          <p className="text-stone-400 text-sm">Tap a question to push it live</p>
        </div>
        <button
          onClick={resetAll}
          className="text-xs text-stone-400 border border-stone-700 px-3 py-1.5 rounded-lg hover:bg-stone-900"
        >
          Reset
        </button>
      </div>

      <div className="space-y-3 max-w-xl">
        {questions.map(q => {
          const votes = votesByQ[q.id] || []
          const isLive = q.id === currentId
          const isOpen = !!expanded[q.id]
          const optionCounts = q.options.map(
            (_, i) => votes.filter(v => v.option_index === i).length,
          )
          const otherVotes = votes.filter(v => v.option_index === null && v.word)

          return (
            <div
              key={q.id}
              className={`rounded-2xl border transition-all ${
                isLive
                  ? 'border-green-500 bg-green-950'
                  : 'border-stone-700 bg-stone-900'
              }`}
            >
              <button
                onClick={() => pushQuestion(q.id)}
                className={`w-full text-left p-4 ${isLive ? 'text-green-300' : 'text-stone-300 hover:bg-stone-800/40'} rounded-t-2xl`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs opacity-60 mb-1">Q{q.id + 1} · {q.slide}</p>
                    <p className="font-medium text-sm leading-snug">{q.text}</p>
                    <p className="text-xs opacity-50 mt-1">{votes.length} response{votes.length !== 1 ? 's' : ''}</p>
                  </div>
                  {isLive && (
                    <span className="shrink-0 mt-1 text-xs bg-green-500 text-green-950 font-semibold px-3 py-1 rounded-full">
                      LIVE
                    </span>
                  )}
                </div>
              </button>

              <div className="border-t border-stone-800 px-4 py-2 flex items-center justify-between">
                <button
                  onClick={e => toggle(q.id, e)}
                  className="text-xs text-stone-400 hover:text-stone-200"
                >
                  {isOpen ? '▾ Hide responses' : '▸ Show responses'}
                </button>
                <span className="text-xs text-stone-500">{votes.length} total</span>
              </div>

              {isOpen && (
                <div className="px-4 pb-4 space-y-2 text-sm">
                  {q.type === 'poll' && (
                    <div className="space-y-1">
                      {q.options.map((opt, i) => (
                        <div
                          key={i}
                          className="flex justify-between text-stone-300 bg-stone-950/60 rounded-lg px-3 py-1.5"
                        >
                          <span className="truncate pr-2">{opt}</span>
                          <span className="text-stone-400 shrink-0">{optionCounts[i]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {(otherVotes.length > 0 || q.type === 'wordcloud') && (
                    <div>
                      <p className="text-xs text-stone-500 mt-2 mb-1">
                        {q.type === 'wordcloud' ? 'Words' : 'Other'}
                      </p>
                      {otherVotes.length === 0 && q.type === 'wordcloud' && votes.length === 0 ? (
                        <p className="text-stone-600 text-xs italic">No responses yet</p>
                      ) : (
                        <ul className="space-y-1">
                          {(q.type === 'wordcloud' ? votes : otherVotes).map((v, i) => (
                            <li
                              key={i}
                              className="bg-stone-950/60 rounded-lg px-3 py-1.5 text-stone-300"
                            >
                              {v.word}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="mt-8 text-stone-600 text-xs">Results at /results · Audience at /</p>
    </main>
  )
}
