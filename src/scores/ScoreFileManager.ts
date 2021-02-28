import fs from 'fs'
import path from 'path'
import { Logger } from '../Logger'

const initUserScore = (scores: ScoreData, username: string): ScoreData => {
  if(!scores[username]) {
    scores[username] = {
      points: 0,
      total: 0,
      submissions: 0,
      guesses: 0
    }
  }

  if(!scores[username].points) scores[username].points = 0
  if(!scores[username].total) scores[username].total = 0
  if(!scores[username].guesses) scores[username].guesses = 0
  if(!scores[username].submissions) scores[username].submissions = 0

  return scores
}

const saveScoreData = (fileName: string, newData: ScoreData) => {
  if(!fs.existsSync(fileName)) {
    Logger.verbose(`Created new score file ${fileName}`)
    fs.openSync(fileName, 'w')
  }

  fs.writeFileSync(fileName, JSON.stringify(newData, null, 2))
  Logger.verbose(`Saving file ${fileName}...`)
}

export const getFileName = (date = new Date) => {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
  const directory = path.resolve(__dirname, '../../scores/')
  if(!fs.existsSync(directory)) fs.mkdirSync(directory)
  return `${directory}/${date.getUTCFullYear()}-${months[date.getUTCMonth()]}.json`
}

export const getScoreData = (fileName: string): ScoreData => {
  if(!fs.existsSync(fileName)) {
    Logger.verbose(`Created new score file ${fileName}`)
    fs.openSync(fileName, 'w')
  }

  const data = fs.readFileSync(fileName, "utf8")
  Logger.verbose(`Loaded scores from ${fileName}`)
  try {
    return JSON.parse(data) ?? {}
  } catch (ex) {
    return {}
  }
}

export const recordGuess = (username: string, pointsEarned: number, totalPoints: number) => {
  const fileName = getFileName()
  const scores = initUserScore(getScoreData(fileName), username)
  scores[username].guesses++
  scores[username].points += pointsEarned
  scores[username].total = totalPoints
  saveScoreData(fileName, scores)
}

export const recordSubmission = (username: string, pointsEarned: number, totalPoints: number) => {
  const fileName = getFileName()
  const scores = initUserScore(getScoreData(fileName), username)
  scores[username].submissions++
  scores[username].points += pointsEarned
  scores[username].total = totalPoints
  saveScoreData(fileName, scores)
}

export type ScoreData = {
  [username: string]: UserScores
}

type UserScores = {
  points?: number,
  total?: number,
  submissions?: number,
  guesses?: number
}