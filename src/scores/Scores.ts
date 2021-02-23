import { getConfig } from '../config'

export const getScores = (foundOnGoogle = false): Scores => {
  const config = getConfig()
  const googled = foundOnGoogle ? 'google' : 'normal'

  return {
    guesser: config?.points?.guesser?.[googled] ?? 6,
    submitter: config?.points?.submitter?.[googled] ?? 3
  }
}

export type Scores = {
  guesser: number,
  submitter: number
}