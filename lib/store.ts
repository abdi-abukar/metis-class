export interface Question {
  id: number
  slide: string
  text: string
  type: 'poll' | 'wordcloud'
  options: string[]
}

export interface Vote {
  voter_id: string
  question_id: number
  option_index: number | null
  word: string | null
}

export const QUESTIONS: Question[] = [
  {
    id: 0,
    slide: 'Before we begin',
    text: 'What do you already know about the Métis Nation?',
    type: 'poll',
    options: ['Nothing, total blank', 'A little bit', 'Quite a bit', "I'm Métis myself"],
  },
  {
    id: 1,
    slide: 'Slide 2 · Setting the scene',
    text: 'One word: the Northwest in 1869 was a place of ___',
    type: 'wordcloud',
    options: [],
  },
  {
    id: 2,
    slide: 'Slide 3 · The argument',
    text: 'Was scrip a fair solution to Métis land rights?',
    type: 'poll',
    options: ['Yes, it was reasonable', 'No, it was dispossession', "It's complicated"],
  },
  {
    id: 3,
    slide: 'Slide 4 · After the poem',
    text: 'Which line from the poem hit you hardest?',
    type: 'poll',
    options: [
      'The land does not forget',
      'They called it scrip, we called it theft',
      'A nation unnamed is a nation erased',
    ],
  },
  {
    id: 4,
    slide: 'Slide 6 · Closing discussion',
    text: "Canada's claim to the Northwest in 1870 was...",
    type: 'poll',
    options: ['Legitimate', 'Illegitimate', 'Still contested today', 'Complicated, it depends'],
  },
]

type GlobalStore = {
  votes: Vote[]
  currentQuestionId: number
}

const g = globalThis as unknown as { __metisStore?: GlobalStore }
if (!g.__metisStore) {
  g.__metisStore = { votes: [], currentQuestionId: 0 }
}

export const store = g.__metisStore
