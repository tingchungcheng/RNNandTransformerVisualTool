interface ExamplesFile {
  sentences: string[]
}

let cache: string[] | null = null

export async function fetchExamples(): Promise<string[]> {
  if (cache) return cache

  const response = await fetch('/examples.json')
  if (!response.ok) throw new Error('Failed to load examples')

  const data = (await response.json()) as ExamplesFile
  cache = data.sentences.filter((s) => s.trim().length > 0)
  return cache
}

/** Pick a random sentence; avoids repeating the current text when possible. */
export function pickRandomSentence(sentences: string[], current = ''): string {
  if (sentences.length === 0) return ''
  if (sentences.length === 1) return sentences[0]

  const pool = current ? sentences.filter((s) => s !== current) : sentences
  const source = pool.length > 0 ? pool : sentences
  return source[Math.floor(Math.random() * source.length)]
}

export async function loadRandomExample(current = ''): Promise<string> {
  const sentences = await fetchExamples()
  return pickRandomSentence(sentences, current)
}
