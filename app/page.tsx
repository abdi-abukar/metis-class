'use client'
import { useEffect, useRef, useState } from 'react'

interface Question {
  id: number
  slide: string
  text: string
  type: 'poll' | 'wordcloud'
  options: string[]
}

interface StateResp {
  questions: Question[]
  currentQuestionId: number
}

function getVoterId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('metis_voter_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('metis_voter_id', id)
  }
  return id
}

export default function AudiencePage() {
  const [question, setQuestion] = useState<Question | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [word, setWord] = useState('')
  const [otherMode, setOtherMode] = useState(false)
  const [otherText, setOtherText] = useState('')
  const [pickedOption, setPickedOption] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const voterIdRef = useRef<string>('')
  const lastIdRef = useRef<number | null>(null)
  const inFlightRef = useRef(false)

  useEffect(() => {
    voterIdRef.current = getVoterId()
  }, [])

  async function poll() {
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      const res = await fetch(`/api/state?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'cache-control': 'no-cache' },
      })
      const data: StateResp = await res.json()
      const q = data.questions.find(q => q.id === data.currentQuestionId)
      if (!q) return
      if (lastIdRef.current !== q.id) {
        lastIdRef.current = q.id
        setQuestion(q)
        setSubmitted(false)
        setWord('')
        setOtherMode(false)
        setOtherText('')
        setPickedOption(null)
      } else if (!question) {
        setQuestion(q)
      }
      setLoading(false)
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

  async function sendVote(body: { option_index?: number | null; word?: string | null }) {
    if (!question) return
    await fetch('/api/vote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        voter_id: voterIdRef.current,
        question_id: question.id,
        option_index: body.option_index ?? null,
        word: body.word ?? null,
      }),
    })
  }

  async function castVote(optionIndex: number) {
    if (!question) return
    setPickedOption(optionIndex)
    setSubmitted(true)
    setOtherMode(false)
    await sendVote({ option_index: optionIndex })
  }

  async function castWord(text: string) {
    if (!question || !text.trim()) return
    setPickedOption(null)
    setSubmitted(true)
    await sendVote({ word: text.trim() })
  }

  function changeAnswer() {
    setSubmitted(false)
    setOtherMode(false)
    setOtherText('')
    setWord('')
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-900">
        <p className="text-stone-400 text-lg">Waiting for presenter...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <p className="text-xs text-stone-400 uppercase tracking-widest mb-2">{question?.slide}</p>
        <h1 className="text-xl font-semibold text-stone-800 mb-6">{question?.text}</h1>

        {!submitted ? (
          question?.type === 'poll' ? (
            <div className="grid grid-cols-1 gap-3">
              {!otherMode &&
                question.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => castVote(i)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 transition-colors"
                  >
                    {opt}
                  </button>
                ))}
              {!otherMode ? (
                <button
                  onClick={() => setOtherMode(true)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-dashed border-stone-300 hover:bg-stone-100 text-stone-500 transition-colors"
                >
                  Other (type your own)
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <input
                    autoFocus
                    value={otherText}
                    onChange={e => setOtherText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && castWord(otherText)}
                    placeholder="Type your answer..."
                    maxLength={60}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 text-stone-800 bg-white outline-none focus:border-blue-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOtherMode(false)}
                      className="flex-1 px-4 py-3 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => castWord(otherText)}
                      className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Submit
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={word}
                onChange={e => setWord(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && castWord(word)}
                placeholder="Type your word..."
                maxLength={30}
                className="flex-1 px-4 py-3 rounded-xl border border-stone-200 text-stone-800 bg-white outline-none focus:border-blue-400"
              />
              <button
                onClick={() => castWord(word)}
                className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                Submit
              </button>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-green-700 text-sm">
              Response recorded. Watch the results screen for live tallies.
            </div>
            <button
              onClick={changeAnswer}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-sm"
            >
              Change my answer
            </button>
            {pickedOption !== null && question?.type === 'poll' && (
              <p className="text-xs text-stone-400 text-center">
                You picked: {question.options[pickedOption]}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
