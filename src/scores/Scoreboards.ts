import fs from 'fs'
import path from 'path'
import Mustache from 'mustache'
import { RedditBot } from '../RedditBot'
import { Logger } from '../Logger'
import { DatabaseManager, ScoreboardData, TimeRange } from '../types'
import { getConfig } from '../config'

export default (bot: RedditBot, database: DatabaseManager) => ({
  postMonthlyScoreboard: async (month: Date = new Date()): Promise<void> => {
    const lastMonth = startOfMonth(month, -1)
    Logger.verbose(`Generating montly scoreboard for ${lastMonth.toString()}`)
    const timeRange: TimeRange = {
      from: lastMonth,
      to: startOfMonth(month)
    }

    const rawData = await database.getHighScores(timeRange, 5)

    if ([rawData.scores, rawData.guessers, rawData.submitters].some(d => d.length === 0)) {
      Logger.warn('Failed to post scoreboard, database returned empty data')
      return
    }

    const scoreboardData: ScoreboardData = {
      month: timeRange.from.toLocaleString('en-GB', { month: 'long' }),
      year: timeRange.from.toLocaleString('en-GB', { year: 'numeric' }),
      points: rawData.scores,
      guesses: rawData.guessers,
      submissions: rawData.submitters,
      // These should never be undefined if the other 3 arrays have data
      // But still treat them like they could be omitted just in case
      fastest: rawData.fastest && {
        ...rawData.fastest,
        timeString: formatMillisecondsAsTime(rawData.fastest.time),
      },
      slowest: rawData.slowest && {
        ...rawData.slowest,
        timeString: formatMillisecondsAsTime(rawData.slowest.time),
      }
    }

    const postTemplate = fs.readFileSync(path.resolve(__dirname, '../../templates/scoreboard_template.md'), 'utf-8')
    const title = `/r/${getConfig()?.subreddit || ''} ${scoreboardData.month} ${scoreboardData.year} Leaderboard`
    const body = Mustache.render(postTemplate, scoreboardData)
    Logger.info(`Posting new scoreboard for ${scoreboardData.month} ${scoreboardData.year}!`)
    await bot.createPost(title, body, 1)
  },
  postAnnualScoreboard: async (year: Date = new Date()): Promise<void> => {
    // Lots of opportunity for refactoring here
    // Leaving for the future because the 31st is sneaking up fast
    const lastYear = startOfYear(year, -1)
    Logger.verbose(`Generating annual scoreboard for ${lastYear.getFullYear()}`)
    const timeRange: TimeRange = {
      from: lastYear,
      to: startOfYear(year)
    }

    const rawData = await database.getHighScores(timeRange, 20)

    if ([rawData.scores, rawData.guessers, rawData.submitters].some(d => d.length === 0)) {
      Logger.warn('Failed to post scoreboard, database returned empty data')
      return
    }

    const scoreboardData: ScoreboardData = {
      month: timeRange.from.toLocaleString('en-GB', { month: 'long' }),
      year: timeRange.from.toLocaleString('en-GB', { year: 'numeric' }),
      points: rawData.scores,
      guesses: rawData.guessers,
      submissions: rawData.submitters,
      fastest: rawData.fastest && {
        ...rawData.fastest,
        timeString: formatMillisecondsAsTime(rawData.fastest.time),
      },
      slowest: rawData.slowest && {
        ...rawData.slowest,
        timeString: formatMillisecondsAsTime(rawData.slowest.time),
      },
      total: await database.getPostTotals(timeRange)
    }

    const postTemplate = fs.readFileSync(path.resolve(__dirname, '../../templates/annual_scoreboard.md'), 'utf-8')
    const title = `/r/${getConfig()?.subreddit || ''} Year in Review ${scoreboardData.year}!`
    const body = Mustache.render(postTemplate, scoreboardData)
    Logger.info(`Posting new scoreboard for ${scoreboardData.month} ${scoreboardData.year}!`)
    await bot.createPost(title, body, 1)
  }
})

const startOfMonth = (start: Date, offset = 0): Date => new Date(Date.UTC(start.getFullYear(), start.getMonth() + offset, 1, 0))

const startOfYear = (start: Date, offset = 0): Date => new Date(Date.UTC(start.getFullYear() + offset))

export const formatMillisecondsAsTime = (input: number): string =>
  [
    { name: 'second', per: 1000, max: 60 },
    { name: 'minute', per: 60, max: 60 },
    { name: 'hour', per: 60, max: 24 },
    { name: 'day', per: 24 }
  ]
    .map(format => {
      input = Math.floor(input / format.per)
      return [format.name, format.max ? input % format.max : input] as const
    })
    .filter(format => format[1])
    .map(format => `${format[1]} ${format[0]}${format[1] > 1 ? 's' : ''}`)
    .reverse()
    .join(' ') || undefined