import { Logger, LogLevel } from './Logger';
import * as RedditBot from './RedditBot';
import WinChecker from './WinChecker';
import processWin from './WinProcessor'
import newPostProcessor from "./NewPostProcessor";

// const bot = RedditBot.create({ debug: true, readOnly: true, startFrom: "t1_gobjgub" })
const bot = RedditBot.create({ debug: false, readOnly: false })
Logger.setup({ file: null, console: LogLevel.SILLY })

const processNewComments = async () => {
  const comments = await bot.fetchNewConfirmations()
  comments.slice(0, 1).forEach(async comment => {
    Logger.verbose(`Processing new comment by ${comment.author.name}:`)
    Logger.verbose(`"${comment.body.substr(0, 10)}" (${comment.permalink})`)

    const validWin = await WinChecker(bot).isValidWin(comment)
    if(!validWin) {
      Logger.verbose('No win detected, ignoring')
      // return
    }

    Logger.info('Win confirmed!')
    await processWin(bot, comment)
  })
}

const processNewSubmissions = async () => {
  const newPosts = await bot.fetchNewSubmissions()
  const processor = newPostProcessor(bot)
  newPosts.forEach(async post => {
    Logger.verbose(`Processing new submission by ${post.author.name}:`)
    Logger.verbose(`"${post.title}" (${post.permalink})`)
    await processor.processNewSubmission(post)
  });
}

// processNewComments()
processNewSubmissions()