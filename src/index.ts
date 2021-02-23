import { Logger, LogLevel } from './Logger';
import * as RedditBot from './RedditBot';
import WinChecker from './WinChecker';
import processWin from './WinProcessor'

// const bot = RedditBot.create({ debug: true, readOnly: true, startFrom: "t1_gobjgub" })
const bot = RedditBot.create({ debug: false, readOnly: false })
Logger.setup({ file: null, console: LogLevel.SILLY })

bot.fetchNewConfirmations().then(comments => {
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
})