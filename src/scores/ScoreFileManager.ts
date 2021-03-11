import fs from 'fs'
import path from 'path'
import { Logger } from '../Logger'

const initUserScore = (scores: ScoreData, username: string): ScoreData => {
  if(!scores[username]) scores[username] = {}

  if(!scores[username].points) scores[username].points = 0
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

export const getMonthlyFileName = (date = new Date) => {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
  const directory = path.resolve(__dirname, '../../scores/')
  if(!fs.existsSync(directory)) fs.mkdirSync(directory)
  return `${directory}/monthly/${date.getUTCFullYear()}-${months[date.getUTCMonth()]}.json`
}

export const getTotalFileName = () => {
  const directory = path.resolve(__dirname, '../../scores/')
  if(!fs.existsSync(directory)) fs.mkdirSync(directory)
  return `${directory}/total.json`
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

export const recordGuess = (username: string, pointsEarned: number) => {
  [getMonthlyFileName(), getTotalFileName()].forEach(fileName => {
    const scores = initUserScore(getScoreData(fileName), username)
    scores[username].guesses++
    scores[username].points += pointsEarned
    saveScoreData(fileName, scores)
  });
}

export const recordSubmission = (username: string, pointsEarned: number) => {
  [getMonthlyFileName(), getTotalFileName()].forEach(fileName => {
    const scores = initUserScore(getScoreData(fileName), username)
    scores[username].submissions++
    scores[username].points += pointsEarned
    saveScoreData(fileName, scores)
  });
}

export const recordPoints = (username: string, pointsEarned: number) => {
  [getMonthlyFileName(), getTotalFileName()].forEach(fileName => {
    const scores = initUserScore(getScoreData(fileName), username)
    scores[username].points += pointsEarned
    if(scores[username].points < 0) {
      // this can be used to deduct points too
      scores[username].points = 0
    }
    saveScoreData(fileName, scores)
  });
}

export type ScoreData = {
  [username: string]: UserScores
}

type UserScores = {
  points?: number,
  submissions?: number,
  guesses?: number
}