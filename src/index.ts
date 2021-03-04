import yargs from 'yargs'
import { Logger, LogLevel } from './Logger';
import * as RedditBot from './RedditBot';
import WinChecker from './WinChecker';
import processWin from './WinProcessor'
import newPostProcessor from "./NewPostProcessor";

const args = yargs(process.argv.slice(2))
  .option('log-level', {alias: 'll', choices: Object.values(LogLevel), default: LogLevel.INFO})
  .option('read-only', {type: 'boolean', alias: 'r', description: 'block the bot from making real changes to reddit'})
  .option('debug-requests', {type: 'boolean', alias: 'd', description: 'display snoowrap request debugging'})
  .argv

const bot = RedditBot.create({ debug: args['debug-requests'], readOnly: args['read-only'] })
Logger.setup({ file: LogLevel.INFO, console: args['log-level'] })

const processNewSubmissions = async () => {
  const newPosts = await bot.fetchNewSubmissions()
  const processor = newPostProcessor(bot)
  newPosts.forEach(async post => {
    Logger.verbose(`Processing new submission by ${post.author.name}:`)
    Logger.verbose(`"${post.title}" (${post.permalink})`)
    await processor.processNewSubmission(post)
  });
}

const processNewComments = async () => {
  const comments = await bot.fetchNewConfirmations()
  comments.forEach(async comment => {
    Logger.verbose(`Processing new comment by ${comment.author.name}:`)
    Logger.verbose(`"${comment.body.substr(0, 10)}" (${comment.permalink})`)

    const validWin = await WinChecker(bot).isValidWin(comment)
    if(!validWin) {
      Logger.verbose('No win detected, ignoring')
      return
    }

    Logger.info('Win confirmed!')
    await processWin(bot, comment)
  })
}

if(args['read-only']) Logger.warn('Starting in read only mode!')

let running = false
const run = async () => {
  if(running) return Logger.warn("Skipping run as previous is still running (probably hit the rate limit)")
  running = true
  await processNewSubmissions()
  await processNewComments()
  running = false
}

run()
setInterval(run, 15000)