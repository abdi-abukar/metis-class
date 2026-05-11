'use client'
import { useEffect, useRef, useState } from 'react'

type SlideKind =
  | 'title'
  | 'scene'
  | 'argument'
  | 'poem'
  | 'bridge'
  | 'discuss'
  | 'terms'

interface Slide {
  kind: SlideKind
  eyebrow: string
  pollQuestionId: number | null
  pollHint: string | null
}

const SLIDES: Slide[] = [
  { kind: 'title', eyebrow: 'Slide 1 · Title', pollQuestionId: 0, pollHint: 'Prior knowledge check' },
  { kind: 'scene', eyebrow: 'Slide 2 · Setting the scene', pollQuestionId: 1, pollHint: 'One word: the Northwest in 1869 was a place of ___' },
  { kind: 'argument', eyebrow: 'Slide 3 · The argument', pollQuestionId: 2, pollHint: 'Was scrip a fair solution?' },
  { kind: 'poem', eyebrow: 'Slide 4 · A voice from the land', pollQuestionId: 3, pollHint: 'Which line hit hardest?' },
  { kind: 'bridge', eyebrow: 'Slide 5 · From poem to argument', pollQuestionId: null, pollHint: null },
  { kind: 'discuss', eyebrow: "Slide 6 · Let's talk", pollQuestionId: 4, pollHint: "Canada's claim was..." },
  { kind: 'terms', eyebrow: 'Slide 7 · Key terms', pollQuestionId: null, pollHint: null },
]

export default function PresentationPage() {
  const [index, setIndex] = useState(0)
  const [pushed, setPushed] = useState<number | null>(null)
  const [liveId, setLiveId] = useState<number | null>(null)
  const [voteCount, setVoteCount] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const pendingPushRef = useRef<{ id: number; until: number } | null>(null)
  const inFlightRef = useRef(false)
  const slide = SLIDES[index]

  useEffect(() => {
    let alive = true
    async function poll() {
      if (inFlightRef.current) return
      inFlightRef.current = true
      try {
        const res = await fetch(`/api/state?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'cache-control': 'no-cache' },
        })
        const data = await res.json()
        if (!alive) return
        const incoming = data.currentQuestionId
        const pending = pendingPushRef.current
        let liveForVotes = incoming
        if (pending && Date.now() < pending.until && incoming !== pending.id) {
          liveForVotes = pending.id
        } else {
          if (pending && incoming === pending.id) pendingPushRef.current = null
          setLiveId(incoming)
        }
        const total = (data.votes || []).filter(
          (v: { question_id: number }) => v.question_id === liveForVotes,
        ).length
        setVoteCount(total)
      } catch {
      } finally {
        inFlightRef.current = false
      }
    }
    poll()
    const t = setInterval(poll, 1000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  function go(delta: number) {
    setIndex(i => Math.max(0, Math.min(SLIDES.length - 1, i + delta)))
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') go(1)
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1)
      else if (e.key === 'Home') setIndex(0)
      else if (e.key === 'End') setIndex(SLIDES.length - 1)
      else if (e.key === 'p' && slide.pollQuestionId !== null) pushPoll(slide.pollQuestionId)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slide])

  async function pushPoll(id: number) {
    setPushed(id)
    pendingPushRef.current = { id, until: Date.now() + 2000 }
    setLiveId(id)
    const res = await fetch('/api/push', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question_id: id }),
    })
    const data = await res.json().catch(() => null)
    if (data && typeof data.currentQuestionId === 'number') {
      setLiveId(data.currentQuestionId)
      if (data.currentQuestionId === id) pendingPushRef.current = null
    }
    setTimeout(() => setPushed(null), 1800)
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1)
    touchStartX.current = null
  }

  return (
    <main
      className="fixed inset-0 bg-stone-50 text-stone-900 overflow-hidden select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="absolute inset-0 flex items-center">
        <button
          aria-label="Previous slide"
          onClick={() => go(-1)}
          className="hidden md:block absolute left-0 top-0 bottom-0 w-24 z-20 text-stone-300 hover:text-stone-600 hover:bg-stone-100/60 transition-colors"
        >
          ‹
        </button>
        <button
          aria-label="Next slide"
          onClick={() => go(1)}
          className="hidden md:block absolute right-0 top-0 bottom-0 w-24 z-20 text-stone-300 hover:text-stone-600 hover:bg-stone-100/60 transition-colors"
        >
          ›
        </button>

        <div className="w-full h-full flex items-center justify-center px-8 md:px-32 py-16 relative">
          <div className="w-full max-w-5xl relative z-10">
            <SlideBody slide={slide} />
          </div>
        </div>
      </div>

      <div className="absolute top-6 left-8 right-8 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-stone-400 z-30">
        <span>{slide.eyebrow}</span>
        {liveId !== null && (
          <span className="flex items-center gap-2 normal-case tracking-normal">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-stone-600 text-xs font-medium">
              Live · Q{liveId + 1} · {voteCount} vote{voteCount === 1 ? '' : 's'}
            </span>
          </span>
        )}
        <span>
          {index + 1} / {SLIDES.length}
        </span>
      </div>

      <div className="absolute bottom-6 left-8 right-8 flex items-center justify-between gap-4 z-30">
        <div className="text-xs text-stone-400 hidden sm:block">
          ← → arrows · swipe · P to push poll
        </div>
        <div className="flex items-center gap-3">
          {slide.pollQuestionId !== null && (
            <button
              onClick={() => pushPoll(slide.pollQuestionId!)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                pushed === slide.pollQuestionId
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-stone-900 border-stone-900 text-white hover:bg-stone-700'
              }`}
            >
              {pushed === slide.pollQuestionId ? 'Pushed ✓' : `Push poll · ${slide.pollHint}`}
            </button>
          )}
          <div className="flex gap-1">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-8 bg-stone-900' : 'w-1.5 bg-stone-300 hover:bg-stone-500'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

function SlideBody({ slide }: { slide: Slide }) {
  switch (slide.kind) {
    case 'title':
      return <TitleSlide />
    case 'scene':
      return <SceneSlide />
    case 'argument':
      return <ArgumentSlide />
    case 'poem':
      return <PoemSlide />
    case 'bridge':
      return <BridgeSlide />
    case 'discuss':
      return <DiscussSlide />
    case 'terms':
      return <TermsSlide />
  }
}

function MetisInfinity({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 100" className={className} aria-hidden="true">
      <path
        d="M50 50 C 50 25, 75 25, 100 50 S 150 75, 150 50 S 125 25, 100 50 S 50 75, 50 50 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function TitleSlide() {
  return (
    <div className="text-center space-y-10 relative">
      <div className="absolute inset-0 flex items-center justify-center -z-10 pointer-events-none">
        <MetisInfinity className="w-[140%] text-red-600/10" />
      </div>
      <p className="text-xs uppercase tracking-[0.4em] text-stone-500">
        Jean Teillet · pp. 129 to 156
      </p>
      <h1 className="text-6xl md:text-8xl font-bold leading-[0.95] tracking-tight">
        The Northwest
        <br />
        Is Our Mother
      </h1>
      <div className="flex items-center justify-center gap-3 text-stone-400">
        <span className="h-px w-12 bg-stone-300" />
        <MetisInfinity className="w-10 text-stone-900" />
        <span className="h-px w-12 bg-stone-300" />
      </div>
      <p className="text-xl md:text-2xl text-stone-600 max-w-3xl mx-auto leading-snug">
        A nation between worlds: resistance, rights, and the road to Red River.
      </p>
      <div className="pt-8 text-sm text-stone-500">
        HUMA 3000 · Seminar presentation · 10 minutes
      </div>
    </div>
  )
}

function SceneSlide() {
  return (
    <div className="space-y-10 relative">
      <svg
        className="absolute -top-8 right-0 w-32 h-32 text-stone-200"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M50 5 L50 95 M5 50 L95 50" stroke="currentColor" strokeWidth="1" />
        <path d="M50 5 L45 18 L50 14 L55 18 Z" fill="currentColor" />
        <text x="50" y="50" textAnchor="middle" dy=".3em" fontSize="10" fill="currentColor">N</text>
      </svg>
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-stone-500 mb-3">
          Setting the scene
        </p>
        <h2 className="text-4xl md:text-6xl font-bold leading-tight">
          1869. The land was
          <br />
          <span className="text-stone-500">already governed.</span>
        </h2>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <SceneCard icon="place" label="Place" body="The Northwest, a Métis homeland stretching across the prairies." />
        <SceneCard icon="period" label="Period" body="Mid to late 19th century. Political crisis crystallising around Métis land and nationhood." />
        <SceneCard icon="people" label="People" body="Louis Riel, the Métis Nation, and a colonial Canada that refuses to recognise either." />
        <SceneCard icon="lens" label="Lens" body="Teillet writes as a legal historian. She asks not just what happened, but what rights were at stake." />
      </div>
    </div>
  )
}

function ArgumentSlide() {
  return (
    <div className="space-y-10 relative">
      <div className="absolute -left-20 top-0 bottom-0 hidden md:flex flex-col justify-between py-4">
        <span className="h-2 w-12 bg-red-600" />
        <span className="h-2 w-12 bg-stone-900" />
        <span className="h-2 w-12 bg-yellow-500" />
      </div>
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-stone-500 mb-3">
          Teillet&apos;s core claim
        </p>
        <h2 className="text-4xl md:text-5xl font-bold leading-[1.1] max-w-4xl">
          The Métis were not rebels. They were a self governing nation, and colonial Canada chose not to recognise it.
        </h2>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        <Pillar
          num="01"
          tag="Land"
          body="Métis land claims were legally grounded. Scrip was used to dispossess them, not to honour the claim."
        />
        <Pillar
          num="02"
          tag="Nation"
          body="The Métis had functioning political structures. Nationhood was a fact, not a request."
        />
        <Pillar
          num="03"
          tag="Law"
          body="Teillet frames this as a legal failure of Canada, not a historical tragedy."
        />
      </div>
      <p className="text-sm text-stone-500">Teillet, pp. 129 to 156.</p>
    </div>
  )
}

function PoemSlide() {
  return (
    <div className="grid md:grid-cols-[120px_1fr] gap-10 items-center relative">
      <div className="hidden md:flex flex-col gap-2 h-full justify-center">
        <span className="h-full w-2 bg-red-600 rounded-full" />
        <span className="h-full w-2 bg-yellow-500 rounded-full" />
        <span className="h-full w-2 bg-stone-900 rounded-full" />
        <span className="h-full w-2 bg-blue-700 rounded-full" />
        <span className="h-full w-2 bg-green-700 rounded-full" />
      </div>
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-stone-500 mb-4">
          A voice from the land
        </p>
        <div className="space-y-5 text-2xl md:text-3xl leading-snug font-serif text-stone-800">
          <p>
            They said the land was empty.
            <br />
            But we were the land.
          </p>
          <p>
            Our sashes stitched in red and gold,
            <br />
            not decoration. Declaration.
          </p>
          <p>
            Scrip on paper, torn from earth,
            <br />
            a legal sleight of hand, dressed as gift.
          </p>
          <p>
            Riel didn&apos;t make us a nation.
            <br />
            We already were.
          </p>
          <p className="text-stone-900 font-semibold">
            The Northwest is not a backdrop.
            <br />
            It is our mother.
          </p>
        </div>
      </div>
    </div>
  )
}

function BridgeSlide() {
  return (
    <div className="space-y-10 relative">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-stone-500 mb-3">
          From poem to argument
        </p>
        <h2 className="text-4xl md:text-5xl font-bold leading-tight">
          Three lines, three pages from Teillet.
        </h2>
      </div>
      <div className="space-y-6 relative">
        <svg
          className="absolute -left-8 top-0 bottom-0 hidden md:block w-4 text-stone-200"
          viewBox="0 0 10 300"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line x1="5" y1="0" x2="5" y2="300" stroke="currentColor" strokeWidth="1" strokeDasharray="2 6" />
          <circle cx="5" cy="40" r="3" fill="currentColor" />
          <circle cx="5" cy="150" r="3" fill="currentColor" />
          <circle cx="5" cy="260" r="3" fill="currentColor" />
        </svg>
        <BridgeRow
          quote="“We already were.”"
          gloss="Teillet argues Métis political organisation predated any Canadian recognition. Nationhood was never granted, it was always there. (p. 134)"
        />
        <BridgeRow
          quote="“Scrip… dressed as gift.”"
          gloss="Scrip certificates were distributed as compensation for land rights, but Teillet shows they functioned as a mechanism of dispossession. (p. 148)"
        />
        <BridgeRow
          quote="“The Northwest is our mother.”"
          gloss="Teillet's title is not metaphor. It is a legal and spiritual claim to territory that Canadian law refused to acknowledge. (p. 156)"
        />
      </div>
    </div>
  )
}

function DiscussSlide() {
  return (
    <div className="space-y-10 relative">
      <svg
        className="absolute -top-10 -right-6 w-48 h-48 text-stone-100 hidden md:block"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <path
          d="M20 30 Q20 15 35 15 H75 Q90 15 90 30 V55 Q90 70 75 70 H45 L30 85 V70 H35 Q20 70 20 55 Z"
          fill="currentColor"
        />
      </svg>
      <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Let&apos;s talk</p>
      <h2 className="text-4xl md:text-6xl font-bold leading-[1.05] max-w-4xl">
        Legal is not the same as
        <br />
        <span className="text-stone-500">legitimate.</span>
      </h2>
      <div className="grid md:grid-cols-2 gap-6">
        <DiscussRow
          num="01"
          prompt="Who gets to decide when a nation is a nation, and who decided the Métis didn't qualify?"
        />
        <DiscussRow
          num="02"
          prompt="Teillet is a lawyer writing history. How does that shape what she notices and what she argues?"
        />
      </div>
    </div>
  )
}

function TermsSlide() {
  return (
    <div className="space-y-10 relative">
      <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
        <MetisInfinity className="w-40 text-stone-900" />
      </div>
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-stone-500 mb-3">
          Key terms and concepts
        </p>
        <h2 className="text-4xl md:text-5xl font-bold leading-tight">
          Vocabulary you walk away with.
        </h2>
      </div>
      <div className="grid md:grid-cols-2 gap-x-10 gap-y-6">
        <Term
          word="Scrip"
          def="Land certificates issued to Métis. Ostensibly a recognition of rights. In practice, Teillet shows they enabled dispossession."
        />
        <Term
          word="Métis Nation"
          def="A distinct people. Not 'mixed blood', but a nation with its own language (Michif), governance, and territorial claims."
        />
        <Term
          word="Provisional Government"
          def="The political structure established by Riel. Evidence, per Teillet, of existing self governance capacity."
        />
        <Term
          word="Land rights"
          def="The central legal thread. Métis title was never extinguished. Canada's absorption of the Northwest was not a legitimate transfer."
        />
        <Term
          word="Michif"
          def="The Métis language. A grammatical fusion of Cree verbs and French nouns. A linguistic signature of nationhood."
        />
      </div>
      <p className="text-sm text-stone-500">Teillet, pp. 129 to 156.</p>
    </div>
  )
}

function SceneCard({ icon, label, body }: { icon: 'place' | 'period' | 'people' | 'lens'; label: string; body: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 relative overflow-hidden">
      <div className="flex items-center gap-3 mb-3">
        <SceneIcon kind={icon} />
        <p className="text-xs uppercase tracking-[0.25em] text-stone-500">{label}</p>
      </div>
      <p className="text-lg text-stone-800 leading-snug">{body}</p>
    </div>
  )
}

function SceneIcon({ kind }: { kind: 'place' | 'period' | 'people' | 'lens' }) {
  const cls = 'w-5 h-5 text-stone-700'
  if (kind === 'place')
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s7-7 7-13a7 7 0 1 0-14 0c0 6 7 13 7 13z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    )
  if (kind === 'period')
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" strokeLinecap="round" />
      </svg>
    )
  if (kind === 'people')
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3 20c0-3 3-5 6-5s6 2 6 5M14 20c0-2 2-4 4-4s3 1 3 3" strokeLinecap="round" />
      </svg>
    )
  return (
    <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19V5a1 1 0 0 1 1-1h11l4 4v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M8 9h6M8 13h8M8 17h5" strokeLinecap="round" />
    </svg>
  )
}

function Pillar({ num, tag, body }: { num: string; tag: string; body: string }) {
  return (
    <div className="border-t-2 border-stone-900 pt-4 relative">
      <p className="text-xs font-mono text-stone-400 mb-1">{num}</p>
      <p className="text-xs uppercase tracking-[0.3em] text-stone-900 font-semibold mb-2">{tag}</p>
      <p className="text-base text-stone-700 leading-snug">{body}</p>
    </div>
  )
}

function BridgeRow({ quote, gloss }: { quote: string; gloss: string }) {
  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-6 items-start border-b border-stone-200 pb-5">
      <p className="text-xl font-serif italic text-stone-900">{quote}</p>
      <p className="text-base text-stone-600 leading-relaxed">{gloss}</p>
    </div>
  )
}

function DiscussRow({ num, prompt }: { num: string; prompt: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 relative">
      <p className="text-xs font-mono text-stone-400 mb-2">{num}</p>
      <p className="text-xl text-stone-800 leading-snug">{prompt}</p>
    </div>
  )
}

function Term({ word, def }: { word: string; def: string }) {
  return (
    <div className="border-l-2 border-stone-900 pl-4">
      <p className="text-lg font-semibold text-stone-900 mb-1">{word}</p>
      <p className="text-sm text-stone-600 leading-snug">{def}</p>
    </div>
  )
}
