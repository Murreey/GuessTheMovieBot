import _ScoreManager from './scores/ScoreManager'
import _DatabaseManager from './scores/database/DatabaseManager'

export interface Config {
  userAgent: string,
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  subreddit: string,
  bot_username: string,
  replyTemplate: string,
  points: {
    [key in WinType]: {
      [key in PointLevel]: number
    }
  },
  linkFlairTemplates: {
    easy: string,
    hard: string,
    meta: string,
    identified: {
      normal: string,
      easy: string,
      hard: string
    }
  }
}

export enum WinType {
  GUESSER = 'guesser',
  SUBMITTER = 'submitter'
}

export enum PointLevel {
  NORMAL = 'normal',
  GOOGLE = 'google'
}

export type TimeRange = {
  from: Date,
  to: Date
}

export type ScoreboardData = {
  points: Score[]
  guesses: Score[]
  submissions: Score[],
  fastest?: SpeedRecord,
  slowest?: SpeedRecord,
  total?: {
    solved: number,
    guessers: number,
    submitters: number
  }
  month: string
  year: string
}

export type Score = {
  username: string,
  score: number
}

export type SpeedRecord = {
  username: string,
  postId: string,
  time: number,
  timeString?: string
}

export type WinComment = {
  postID: string,
  guesser: { name: string, points: number },
  submitter: { name: string, points: number },
  googleUrl?: string,
  quote?: string,
  forced?: boolean
}

export type AsyncReturnType<T extends (...args: any) => any> =
	T extends (...args: any) => Promise<infer U> ? U : T extends (...args: any) => infer U ? U : any

export type ScoreManager = AsyncReturnType<typeof _ScoreManager>
export type DatabaseManager = AsyncReturnType<typeof _DatabaseManager>