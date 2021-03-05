import fs from 'fs'
import path from 'path'
import Mustache from "mustache";
import { RedditBot } from "../RedditBot";
import * as fileManager from './ScoreFileManager'
import { ScoreData } from './ScoreFileManager';
import { Logger } from '../Logger';

const generateScoreboardData = (date): ScoreboardData => {
  const fileName = fileManager.getMonthlyFileName(date)
  const rawScores = fileManager.getScoreData(fileName)

  if(!rawScores || Object.keys(rawScores).length === 0) {
    Logger.verbose('Scoreboard file was not found or was empty!')
    Logger.verbose(fileName)
    return null
  }

  return {
    points: sortScores(rawScores, 'points'),
    guesses: sortScores(rawScores, 'guesses'),
    submissions: sortScores(rawScores, 'submissions'),
    month: date.toLocaleString('en-GB', { month: 'long' }),
    year: date.toLocaleString('en-GB', { year: 'numeric' })
  }
}

const sortScores = (rawScores: ScoreData, fieldName: 'points' | 'submissions' | 'guesses'): Score[] => {
  return Object.keys(rawScores).map(key => ({ username: key, score: rawScores[key][fieldName] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
}

export default (bot: RedditBot) => ({
  postScoreboard: async (date = lastMonth()): Promise<void> => {
    Logger.verbose(`Generating scoreboard for ${date.toString()}`)
    const scoreboardData = generateScoreboardData(date)

    if(scoreboardData === null) return

    const postTemplate = fs.readFileSync(path.resolve(__dirname, `../../templates/scoreboard_template.md`), 'utf-8')
    const title = `/r/GuessTheMovie ${scoreboardData.month} ${scoreboardData.year} Leaderboard`
    const body = Mustache.render(postTemplate, scoreboardData)
    Logger.info(`Posting new scoreboard: ${scoreboardData.month} ${scoreboardData.year}`)
    await bot.createPost(title, body, true)
  }
})

const lastMonth = (): Date => {
  const d = new Date()
  // setDate sets the day of the month
  // '0' is the last day of the month before
  d.setDate(0)
  return d
}

type ScoreboardData = {
  points: Score[]
  guesses: Score[]
  submissions: Score[]
  month: string
  year: string
}

type Score = {
  username: string,
  score: number
}