import { Logger } from '../Logger'

type QuoteConfig = {
  [name: string]: string[]
}

const config: QuoteConfig = {}

// Simplify movie guesses for naive matching
// Removes anything in brackets, after a question mark, and all punctuation
// So "2001: A Space Odyssey (1968)? I'm sure that's right" becomes "2001aspaceodyssey"
const stripName = (name: string) => name.toLowerCase().trim().replace(/\([^)]*\)/g, '').replace(/\?.*$/g, '').replace(/[\W_]+/g, '')

try {
  require('../../quotes.json').forEach(movie => {
    movie.names.forEach(name => config[stripName(name)] = movie.quotes)
  })
} catch (ex) {
  Logger.error('Failed to load quote config file:')
  Logger.error(ex.stack)
}

export default (commentBody: string): string | undefined => {
  const movie = stripName(commentBody)
  if (config?.[movie]) {
    const quotes = config?.[movie] || []
    return quotes[Math.floor(Math.random() * quotes.length)]
  }
}