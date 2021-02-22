import { Logger, LogLevel } from './Logger';
import * as RedditBot from './RedditBot';
import WinChecker from './WinChecker';
import processWin from './WinProcessor'

const bot = RedditBot.create({ debug: true, readOnly: true, startFrom: "t1_gobjgub" })
Logger.setup({ file: null, console: LogLevel.SILLY })

bot.fetchNewConfirmations().then(comments => {
  [comments[0]].forEach(async comment => {
    const valid = await WinChecker(bot).isValidWin(comment)
    Logger.verbose(`Processing new comment by ${comment.author.name}:`)
    Logger.verbose(`"${comment.body.substr(0, 10)}" (${comment.permalink})`)

    if(!valid) {
      Logger.verbose('No win detected, ignoring')
      // return
    }

    Logger.verbose('Win confirmed!')
    await processWin(bot, comment)
  })
})