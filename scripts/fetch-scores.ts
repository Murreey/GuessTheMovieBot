import yargs from 'yargs'
import { Logger, LogLevel } from '../src/Logger'
import DatabaseManager from '../src/scores/database/DatabaseManager'
import { fastestSolve, getAllScores, getTopGuessers, getTopSubmitters, longestSolve, totalGamesSolved, totalGuessers, totalSubmitters } from '../src/scores/database/queries/high-scores'
import { formatMillisecondsAsTime } from '../src/scores/Scoreboards'
import { TimeRange } from '../src/types'

const userScore = async (args) => {
  let range: Partial<TimeRange> = {}
  if (args.from) range.from = new Date(args.from)
  if (args.to) range.to = new Date(args.to)

  const db = await DatabaseManager()
  const scores = [
    await db.getUserScore(args.username, range),
    await db.getUserGuessCount(args.username, range),
    await db.getUserSubmissionCount(args.username, range)
  ]

  console.log(`  Totals for ${args.username}${range.from ? ' from ' + range.from.toUTCString() : ''}${range.to ? ' to ' + range.to.toUTCString() : ''}:`)
  console.log(`  - ${scores[0]} points`)
  console.log(`  - ${scores[1]} correct guesses`)
  console.log(`  - ${scores[2]} submissions`)
}

const highScores = async (args) => {
  const range: TimeRange = {
    from: new Date(args.from),
    to: new Date(args.to)
  }

  const db = (await DatabaseManager()).db

  console.log(`  High scores from ${range.from.toUTCString()} to ${range.to.toUTCString()}`)
  console.log('')
  console.log(`  Total of ${await totalGamesSolved(db, range)} games solved, posted by ${await totalSubmitters(db, range)} submitters and solved by ${await totalGuessers(db, range)} guessers`)
  console.log('')
  console.log('  Top Scores:')
  await getAllScores(db, range, args.limit).then(scores => scores.forEach((score, index) => console.log(`  - ${index+1}. ${score.username}: ${score.score}`)))
  console.log('')
  console.log('  Top Guessers:')
  await getTopGuessers(db, range, args.limit).then(scores => scores.forEach((score, index) => console.log(`  - ${index+1}. ${score.username}: ${score.score}`)))
  console.log('')
  console.log('  Top Submitters:')
  await getTopSubmitters(db, range, args.limit).then(scores => scores.forEach((score, index) => console.log(`  - ${index+1}. ${score.username}: ${score.score}`)))
  console.log('')
  console.log('  Fastest Solve:')
  const fastest = await fastestSolve(db, range)
  console.log(`  - ${fastest?.username} on https://redd.it/${fastest?.postId} in ${formatMillisecondsAsTime(fastest!.time)}`)
  console.log('  Slowest Solve:')
  const slowest = await longestSolve(db, range)
  console.log(`  - ${slowest?.username} on https://redd.it/${slowest?.postId} in ${formatMillisecondsAsTime(slowest!.time)}`)
  console.log('')
}

const args = yargs(process.argv.slice(2))
  .command('user <username> [from] [to]', 'check user\'s points total', {}, userScore)
  .command('highscores <from> <to>', 'fetch high scores', {}, highScores)
  .option('limit', {alias: 'l', type: 'number', description: 'number of high scores to return', default: 5})
  .option('log-level', {alias: 'll', choices: Object.values(LogLevel), default: LogLevel.INFO})
  .option('read-only', {type: 'boolean', alias: 'r', description: 'block the bot from making real changes to reddit'})
  .option('debug-requests', {type: 'boolean', alias: 'd', description: 'display snoowrap request debugging'})
  .demandCommand(1)
  .help()
  .argv

Logger.setup({ file: LogLevel.INFO, console: args['log-level'] })
