import yargs from 'yargs'
import { Logger, LogLevel } from '../src/Logger'
import * as RedditBot from '../src/RedditBot'
import DatabaseManager from '../src/scores/database/DatabaseManager'
import Scoreboards from '../src/scores/Scoreboards'

const postScoreboard = async (args) => {
  const date = new Date()
  date.setMonth(date.getMonth() - args.month + 1) // +1 because postMonthlyScoreboard removes 1

  console.log(`  Posting scoreboard for ${date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`)
  const bot = RedditBot.create({ debug: args['debug-requests'], readOnly: args['read-only'] })
  await Scoreboards(bot, await DatabaseManager()).postMonthlyScoreboard(date)
}

const args = yargs(process.argv.slice(2))
  .command('post [month]', 'post scoreboard for month, number of months before current month defaulting to 1 (last month)', {
    month: {
      default: 1,
      number: true,
    }
  }, postScoreboard)
  .option('log-level', {alias: 'll', choices: Object.values(LogLevel), default: LogLevel.INFO})
  .option('read-only', {type: 'boolean', alias: 'r', description: 'block the bot from making real changes to reddit'})
  .option('debug-requests', {type: 'boolean', alias: 'd', description: 'display snoowrap request debugging'})
  .demandCommand(1)
  .help()
  .argv

Logger.setup({ file: LogLevel.INFO, console: args['log-level'] })
