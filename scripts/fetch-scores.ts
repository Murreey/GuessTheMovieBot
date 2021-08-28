import yargs from 'yargs'
import { Logger, LogLevel } from '../src/Logger';
import DatabaseManager from '../src/scores/DatabaseManager';
import { TimeRange } from '../src/types';

const userScore = async (args) => {
  let range: Partial<TimeRange> = {}
  if(args.from) range.from = new Date(args.from)
  if(args.to) range.to = new Date(args.to)

  const db = await DatabaseManager()
  const score = await db.getUserScore(args.username, range)

  console.log(`  ${args.username} has ${score} points${range.from ? ' from ' + range.from.toUTCString() : ''}${range.to ? ' to ' + range.to.toUTCString() : ''}`)
  console.log('')
}

const highScores = async (args) =>  {
  const range: TimeRange = {
    from: new Date(args.from),
    to: new Date(args.to)
  }

  const db = await DatabaseManager()
  const scores = await db.getHighScores(range)

  console.log(`  High scores from ${range.from.toUTCString()} to ${range.to.toUTCString()}`)
  console.log('  Top Scores:')
  scores.scores.forEach((score, index) => console.log(`  - ${index+1}. ${score.username}: ${score.score}`))
  console.log('')
  console.log('  Top Guessers:')
  scores.guessers.forEach((score, index) => console.log(`  - ${index+1}. ${score.username}: ${score.score}`))
  console.log('')
  console.log('  Top Submitters:')
  scores.submitters.forEach((score, index) => console.log(`  - ${index+1}. ${score.username}: ${score.score}`))
  console.log('')
  console.log('  Fastest Solve:')
  console.log(`  - ${scores?.fastest?.username} on https://redd.it/${scores?.fastest?.postId} in ${scores?.fastest?.time/1000}s`)
  console.log('  Slowest Solve:')
  console.log(`  - ${scores?.slowest?.username} on https://redd.it/${scores?.slowest?.postId} in ${scores?.slowest?.time/1000}s`)
  console.log('')
}

const args = yargs(process.argv.slice(2))
  .command('user <username> [from] [to]', `check user's points total`, {}, userScore)
  .command('highscores <from> <to>', `fetch high scores`, {}, highScores)
  .option('log-level', {alias: 'll', choices: Object.values(LogLevel), default: LogLevel.INFO})
  .option('read-only', {type: 'boolean', alias: 'r', description: 'block the bot from making real changes to reddit'})
  .option('debug-requests', {type: 'boolean', alias: 'd', description: 'display snoowrap request debugging'})
  .demandCommand(1)
  .help()
  .argv

Logger.setup({ file: LogLevel.INFO, console: args['log-level'] })
