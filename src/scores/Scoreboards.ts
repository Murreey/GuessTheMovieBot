import fs from 'fs'
import path from 'path'
import Mustache from "mustache";
import { RedditBot } from "../RedditBot";
import { Logger } from '../Logger';
import { DatabaseManager, ScoreboardData, TimeRange } from '../types';

export default (bot: RedditBot, database: DatabaseManager) => ({
  postMonthlyScoreboard: async (month: Date = new Date()): Promise<void> => {
    const lastMonth = startOfMonth(month, -1)
    Logger.verbose(`Generating scoreboard for ${lastMonth.toString()}`)
    const timeRange: TimeRange = {
      from: lastMonth,
      to: startOfMonth(month)
    }

    const rawData = await database.getHighScores(timeRange, 5)

    if([rawData.scores, rawData.guessers, rawData.submitters].some(d => d.length === 0)) {
      Logger.warn(`Failed to post scoreboard, database returned empty data`)
      return
    }

    const scoreboardData: ScoreboardData = {
      points: rawData.scores,
      guesses: rawData.guessers,
      submissions: rawData.submitters,
      month: timeRange.from.toLocaleString('en-GB', { month: 'long' }),
      year: timeRange.from.toLocaleString('en-GB', { year: 'numeric' })
    }

    const postTemplate = fs.readFileSync(path.resolve(__dirname, `../../templates/scoreboard_template.md`), 'utf-8')
    const title = `/r/GuessTheMovie ${scoreboardData.month} ${scoreboardData.year} Leaderboard`
    const body = Mustache.render(postTemplate, scoreboardData)
    Logger.info(`Posting new scoreboard for ${scoreboardData.month} ${scoreboardData.year}!`)
    await bot.createPost(title, body, true)
  }
})

const startOfMonth = (start: Date, offset = 0): Date => {
  return new Date(Date.UTC(start.getFullYear(), start.getMonth() + offset, 1, 0))
}