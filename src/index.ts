import yargs from 'yargs'
import * as scheduler from 'node-cron'
import { Logger, LogLevel } from './Logger'
import * as RedditBot from './RedditBot'
import WinChecker from './WinChecker'
import processWin from './WinProcessor'
import newPostProcessor from './NewPostProcessor'
import CommandProcessor from './commands/CommandProcessor'
import Scoreboards from './scores/Scoreboards'
import ScoreManager from './scores/ScoreManager'
import DatabaseManager from './scores/database/DatabaseManager'

const args = yargs(process.argv.slice(2))
  .option('log-level', {alias: 'll', choices: Object.values(LogLevel), default: LogLevel.INFO})
  .option('read-only', {type: 'boolean', alias: 'r', description: 'block the bot from making real changes to reddit'})
  .option('debug-requests', {type: 'boolean', alias: 'd', description: 'display snoowrap request debugging'})
  .argv

Logger.setup({ file: LogLevel.INFO, console: args['log-level'] })

const bot = RedditBot.create({ debug: args['debug-requests'], readOnly: args['read-only'] })
const databaseManager = DatabaseManager()

const processNewSubmissions = async () => {
  const newPosts = await bot.fetchNewSubmissions()
  const processor = newPostProcessor(bot, await databaseManager)
  for (const post of newPosts) {
    try {
      Logger.verbose(`Processing new submission by ${post.author.name}:`)
      Logger.verbose(`"${post.title}" (${post.permalink})`)
      await processor.processNewSubmission(post)
    } catch (ex) {
      Logger.error(`Failed to process new post ${post?.id}!`)
      Logger.error(ex.stack)
    }
  }
}

const processNewComments = async () => {
  const scoreManager = await ScoreManager(bot, await databaseManager)
  const comments = await bot.fetchNewComments()
  for (const comment of comments) {
    try {
      Logger.verbose(`Processing new comment by ${comment.author.name}:`)
      Logger.verbose(`"${comment.body?.substr(0, 14)?.trim()}" (${bot.shortlink(comment)})`)

      const validWin = await WinChecker(bot, scoreManager).isValidWin(comment)
      if (!validWin) {
        Logger.verbose('No win detected, ignoring')
        continue
      }

      Logger.info('Win confirmed!')
      Logger.info(`"${comment.body.substr(0, 10)}" (${bot.shortlink(comment)})`)
      await processWin(bot, scoreManager)(comment)
    } catch (ex) {
      Logger.error(`Failed to process comment ${bot.shortlink(comment)}!`)
      Logger.error(ex.stack)
    }
  }
}

const processNewReports = async () => {
  const scoreManager = await ScoreManager(bot, await databaseManager)
  const reportedComments = await bot.fetchNewReports()
  const processor = CommandProcessor(bot, scoreManager)
  for (const comment of reportedComments) {
    try {
      for (const report of comment.mod_reports) {
        Logger.verbose(`Processing new report '${report[0]}' on ${bot.shortlink(comment)}`)
        await processor(comment, report[0])
      }
    } catch (ex) {
      Logger.error(`Failed to process reports on comment ${comment?.id}!`)
      Logger.error(ex.stack)
    }
  }
}

if (args['read-only']) Logger.warn('Starting in read only mode!')

let running = false
const run = async () => {
  if (running) return Logger.verbose('Skipping run as previous is still running (probably hit the rate limit)')

  running = true

  try {
    await processNewReports()
    await processNewSubmissions()
    await processNewComments()
  } catch (ex) {
    Logger.error('Run failed for some reason:')
    Logger.error(ex.stack)
  }

  Logger.debug(`${bot.rateLimit().requestsRemaining} requests till rate limit, resets at ${bot.rateLimit().resetsAt}`)
  running = false
}

scheduler.schedule('1 0 1 * *', async () => {
  running = true
  try {
    await Scoreboards(bot, await databaseManager).postMonthlyScoreboard()
  } catch (ex) {
    Logger.error('Error posting scoreboard!')
    Logger.error(ex.stack)
  }
  running = false
})

run()
setInterval(run, 10000)
