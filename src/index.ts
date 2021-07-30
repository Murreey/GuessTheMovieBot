import yargs from 'yargs'
import * as scheduler from 'node-cron';
import { Logger, LogLevel } from './Logger';
import * as RedditBot from './RedditBot';
import WinChecker from './WinChecker';
import processWin from './WinProcessor'
import newPostProcessor from "./NewPostProcessor";
import CommandProcessor, { COMMAND_PREFIX } from './commands/CommandProcessor';
import Scoreboards from './scores/Scoreboards';
import ScoreManager from './scores/ScoreManager';
import DatabaseManager from './scores/DatabaseManager';

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
  const processor = newPostProcessor(bot)
  for(const post of newPosts) {
    Logger.verbose(`Processing new submission by ${post.author.name}:`)
    Logger.verbose(`"${post.title}" (${post.permalink})`)
    await processor.processNewSubmission(post)
  }
}

const processNewComments = async () => {
  const scoreManager = await ScoreManager(bot, await databaseManager)
  const comments = await bot.fetchNewConfirmations()
  for(const comment of comments) {
    Logger.verbose(`Processing new comment by ${comment.author.name}:`)
    Logger.verbose(`"${comment.body.substr(0, 10)}" (${comment.permalink})`)

    const validWin = await WinChecker(bot, scoreManager).isValidWin(comment)
    if(!validWin) {
      Logger.verbose('No win detected, ignoring')
      Logger.verbose("")
      return
    }

    Logger.info(`"${comment.body.substr(0, 10)}" (${comment.permalink})`)
    Logger.info('Win confirmed!')
    await processWin(bot, scoreManager)(comment)
    Logger.info("")
  }
}

const processNewReports = async () => {
  const scoreManager = await ScoreManager(bot, await databaseManager)
  const reportedComments = await bot.fetchNewReports()
  for(const comment of reportedComments) {
    for(const report of comment.mod_reports) {
      if(report[0] && report[0].trim().startsWith(COMMAND_PREFIX)) {
        Logger.verbose(`Processing new report '${report[0]}' on ${comment.name}`)
        await CommandProcessor(bot, scoreManager, comment, report[0])
      }
    }
  }
}

if(args['read-only']) Logger.warn('Starting in read only mode!')

let running = false
const run = async () => {
  if(running) return Logger.verbose("Skipping run as previous is still running (probably hit the rate limit)")
  running = true
  await processNewSubmissions()
  await processNewComments()
  await processNewReports()
  running = false
}

scheduler.schedule("1 0 1 * *", async () => {
  running = true
  await Scoreboards(bot).postScoreboard()
  running = false
})

run()
setInterval(run, 15000)
